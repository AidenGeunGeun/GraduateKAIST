"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { track as analyticsTrack } from "@vercel/analytics";

import { AppErrorBoundary } from "@/app/components/AppErrorBoundary";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { ADMISSION_YEARS } from "@/app/components/data";
import { AuTracker } from "@/app/components/dashboard/AuTracker";
import { CategoryGrid } from "@/app/components/dashboard/CategoryGrid";
import { CourseListTable } from "@/app/components/dashboard/CourseListTable";
import { GpaSection } from "@/app/components/dashboard/GpaSection";
import { ProgramRequirementSection } from "@/app/components/dashboard/ProgramRequirementSection";
import { StatusHero } from "@/app/components/dashboard/StatusHero";
import { WarningsPanel } from "@/app/components/dashboard/WarningsPanel";
import { AdSlot } from "@/app/components/shared/AdSlot";
import { Badge } from "@/app/components/shared/Badge";
import { Footer } from "@/app/components/shared/Footer";
import { AnalyzeButton } from "@/app/components/upload/AnalyzeButton";
import { AdmissionYearSelector } from "@/app/components/upload/AdmissionYearSelector";
import { DepartmentSelector } from "@/app/components/upload/DepartmentSelector";
import { FileUpload } from "@/app/components/upload/FileUpload";
import { PrivacyBadge } from "@/app/components/upload/PrivacyBadge";
import { TrackSelector } from "@/app/components/upload/TrackSelector";
import {
  buildPlannerRequirementSet,
  getDepartmentLabel,
  getProgramSupport,
  getSupportedDepartments,
} from "@/domain/configs/planner";
import { Semester } from "@/domain/models/Semester";
import { Transcript } from "@/domain/models/Transcript";
import { AuTracker as AuTrackerService } from "@/domain/services/AuTracker";
import { GpaCalculator } from "@/domain/services/GpaCalculator";
import { HssDistributionChecker } from "@/domain/services/HssDistributionChecker";
import { RequirementAnalyzer } from "@/domain/services/RequirementAnalyzer";
import type {
  AnalysisResult,
  AuResult,
  DepartmentSelection,
  HssResult,
  ParseWarning,
  TrackType,
} from "@/domain/types";

interface DashboardState {
  department: DepartmentSelection;
  track: TrackType;
  admissionYear: number;
  analysisResult: AnalysisResult;
  transcript: Transcript;
  cumulativeGpa: number;
  semesterTrend: Array<{ label: string; gpa: number }>;
  auResult: AuResult;
  hssResult: HssResult;
  currentGpaCredits: number;
  informationalNotices: string[];
  parseWarnings: ParseWarning[];
  parseSummary: {
    totalRowsScanned: number;
    rowsParsed: number;
    rowsSkipped: number;
  };
}

const ANALYSIS_ERROR_MESSAGE = "분석 중 오류가 발생했습니다. 다시 시도해주세요.";

function sectionStyle(delay: number): CSSProperties {
  return { "--delay": `${delay}ms` } as CSSProperties;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentSelection | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<TrackType>("심화전공");
  const [admissionYear, setAdmissionYear] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(false);

  const canAnalyze = selectedFile !== null && admissionYear !== null && selectedDepartment !== null && !loading;
  const supportPreview =
    selectedDepartment !== null && admissionYear !== null
      ? getProgramSupport({ department: selectedDepartment, admissionYear, track: selectedTrack })
      : null;
  const departmentOptions = getSupportedDepartments();

  const handleAnalyze = async () => {
    if (!selectedFile || !admissionYear || !selectedDepartment) {
      return;
    }

    setLoading(true);
    setAnalyzeError(null);
    analyticsTrack("analysis_started", {
      department: selectedDepartment,
      track: selectedTrack,
      admissionYear,
    });

    try {
      const { ExcelTranscriptParser } = await import("@/infrastructure/excel-parser/ExcelTranscriptParser");
      const parser = new ExcelTranscriptParser();
      const buffer = await selectedFile.arrayBuffer();
      const parseResult = parser.parse(buffer);

      if (parseResult.records.length === 0) {
        if (parseResult.warnings.length > 0) {
          setAnalyzeError(parseResult.warnings[0].message);
        } else {
          setAnalyzeError("유효한 과목 데이터를 찾을 수 없습니다.");
        }
        setDashboard(null);
        return;
      }

      const transcript = Transcript.from(parseResult.records);
      const requirementSet = buildPlannerRequirementSet({
        department: selectedDepartment,
        admissionYear,
        track: selectedTrack,
      });
      const analysisResult = RequirementAnalyzer.analyze(transcript, requirementSet);
      const cumulativeGpa = GpaCalculator.calculateCumulative(transcript);
      const semesterTrend = [...GpaCalculator.calculateBySemester(transcript).entries()]
        .filter(([semester]) => !semester.isPreEnrollment)
        .sort(([a], [b]) => Semester.compare(a, b))
        .map(([semester, gpa]) => ({ label: semester.toString(), gpa }));
      const { auResult } = AuTrackerService.track(
        transcript.auRecords(),
        requirementSet.auCategories,
        admissionYear < 2023,
      );
      const hssRecords = transcript
        .earnedRecords()
        .filter((record) => record.credits > 0 && record.category.value.startsWith("인선_"));
      const hssResult = HssDistributionChecker.check(hssRecords, requirementSet.isDualMajor);
      const currentGpaCredits = transcript.gpaRecords().reduce((sum, record) => sum + record.credits, 0);

      const informationalNotices =
        analysisResult.programSupport?.status === "supported"
          ? [
              "학사요람 기준 분석 결과입니다. 최종 졸업 판정은 학과 또는 학사팀에 확인하세요.",
              ...analysisResult.programSupport.knownLimitations,
              "윤리및안전, 영어능력 졸업요건은 별도 시스템에서 확인하세요.",
            ]
          : [
              analysisResult.programSupport?.message ??
                "공통 졸업요건만 분석합니다. 학과별 전공 요건은 학과에 직접 확인하세요.",
              "윤리및안전, 영어능력 졸업요건은 별도 시스템에서 확인하세요.",
            ];

      if (requirementSet.hasHssCoreTypeRequirement) {
        informationalNotices.push("인선 핵심/융합/일반 유형 구분은 성적표에 나오지 않아 자동 확인이 안 됩니다.");
      }

      if (admissionYear === 2025) {
        informationalNotices.push(
          "2025학번은 인성/리더십을 I·II 중 1개, III·IV 중 1개 이수해야 하지만 성적표만으로는 구분이 안 됩니다.",
        );
      }

      setDashboard({
        department: selectedDepartment,
        track: selectedTrack,
        admissionYear,
        analysisResult,
        transcript,
        cumulativeGpa,
        semesterTrend,
        auResult,
        hssResult,
        currentGpaCredits,
        informationalNotices,
        parseWarnings: parseResult.warnings,
        parseSummary: {
          totalRowsScanned: parseResult.totalRowsScanned,
          rowsParsed: parseResult.rowsParsed,
          rowsSkipped: parseResult.rowsSkipped,
        },
      });
    } catch (_error) {
      setAnalyzeError(ANALYSIS_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File | null, error: string | null) => {
    setSelectedFile(file);
    setFileError(error);
    if (file && !error) {
      setAnalyzeError(null);
      analyticsTrack("file_uploaded");
    }
  };

  const handleTrackChange = (nextTrack: TrackType) => {
    setSelectedTrack(nextTrack);
    analyticsTrack("track_selected", { track: nextTrack });
  };

  const resetToUpload = () => {
    setDashboard(null);
    setSelectedFile(null);
    setSelectedDepartment(null);
    setSelectedTrack("심화전공");
    setAdmissionYear(null);
    setFileError(null);
    setAnalyzeError(null);
  };

  if (!dashboard) {
    return (
      <AppErrorBoundary onReset={resetToUpload}>
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8">
          <main className="view-enter flex flex-1 items-center">
            <section className="w-full space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-text">KAIST 졸업요건 분석기</h1>
                  <p className="mt-1 text-xs text-text-muted">
                    성적 파일을 올리고 졸업 진행 상황을 한눈에 확인하세요.
                  </p>
                </div>
                <ThemeToggle />
              </div>

              <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      supportPreview === null
                        ? "neutral"
                        : supportPreview.status === "supported"
                          ? "supported"
                          : supportPreview.status === "partial"
                            ? "partial"
                            : supportPreview.status === "common-only"
                              ? "neutral"
                              : "danger"
                    }
                  >
                    {supportPreview?.title ?? "지원 범위"}
                  </Badge>
                  <span className="text-text">
                    {supportPreview?.message ?? "AE, ME, CS, EE 학과의 전공 분석을 지원합니다. 기타 학과는 공통 요건만 확인합니다."}
                  </span>
                </div>
              </div>

              <FileUpload file={selectedFile} error={fileError} onSelectFile={handleFileSelect} />

              <DepartmentSelector
                value={selectedDepartment}
                options={departmentOptions}
                onChange={setSelectedDepartment}
              />

              <TrackSelector value={selectedTrack} onChange={handleTrackChange} />

              <AdmissionYearSelector
                years={ADMISSION_YEARS}
                value={admissionYear}
                onChange={setAdmissionYear}
              />

              <PrivacyBadge />

              {analyzeError ? (
                <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-text">
                  <p className="text-danger">{analyzeError}</p>
                  <button
                    type="button"
                    onClick={resetToUpload}
                    className="mt-2 inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-text hover:bg-surface-soft"
                  >
                    다시 시도
                  </button>
                </div>
              ) : null}

              {loading ? (
                <div className="flex items-center gap-2 text-xs text-text-muted" role="status" aria-live="polite">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-accent" />
                  파일 분석 중...
                </div>
              ) : null}

              <AnalyzeButton disabled={!canAnalyze} loading={loading} onClick={handleAnalyze} />
            </section>
          </main>
          <Footer />
        </div>
      </AppErrorBoundary>
    );
  }

  const remainingCredits = Math.max(
    dashboard.analysisResult.totalCreditsRequired - dashboard.analysisResult.totalCreditsEarned,
    0,
  );

  return (
    <AppErrorBoundary onReset={resetToUpload}>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:py-6">
        <main className="view-enter flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={resetToUpload}
              className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text hover:bg-surface-soft"
            >
              ← 다시 분석하기
            </button>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>{getDepartmentLabel(dashboard.department)}</span>
              <span>·</span>
              <span>{dashboard.track}</span>
              <span>·</span>
              <span>{dashboard.admissionYear}학번 기준</span>
              <ThemeToggle />
            </div>
          </div>

          <div className="mb-4 section-stagger" style={sectionStyle(0)}>
            <AdSlot slot="between" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
              {dashboard.parseWarnings.length > 0 ? (
                <div className="section-stagger" style={sectionStyle(0)}>
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-medium">
                      총 {dashboard.parseSummary.totalRowsScanned}행 중 {dashboard.parseSummary.rowsParsed}개 과목 인식 (
                      {dashboard.parseSummary.rowsSkipped}개 건너뜀)
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer">세부 경고 {dashboard.parseWarnings.length}건 보기</summary>
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        {dashboard.parseWarnings.map((warning, index) => (
                          <li key={`${warning.row}-${index}`}>{warning.message}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                </div>
              ) : null}
              <div className="section-stagger" style={sectionStyle(0)}>
                <StatusHero
                  earned={dashboard.analysisResult.totalCreditsEarned}
                  required={dashboard.analysisResult.totalCreditsRequired}
                  gpa={dashboard.cumulativeGpa}
                  status={dashboard.analysisResult.overallStatus}
                />
              </div>
              <div className="section-stagger" style={sectionStyle(70)}>
                <AuTracker auResult={dashboard.auResult} />
              </div>
              <div className="section-stagger" style={sectionStyle(140)}>
                <WarningsPanel
                  warnings={dashboard.analysisResult.warnings}
                  informationalNotices={dashboard.informationalNotices}
                />
              </div>
              <div className="section-stagger hidden lg:block" style={sectionStyle(210)}>
                <AdSlot slot="sidebar" />
              </div>
            </aside>

            <section className="space-y-4">
              <div className="section-stagger" style={sectionStyle(0)}>
                <CategoryGrid
                  categories={dashboard.analysisResult.categories}
                  auResult={dashboard.auResult}
                  hssResult={dashboard.hssResult}
                  totalCreditsEarned={dashboard.analysisResult.totalCreditsEarned}
                  totalCreditsRequired={dashboard.analysisResult.totalCreditsRequired}
                />
              </div>

              <div className="section-stagger" style={sectionStyle(70)}>
                <GpaSection
                  cumulativeGpa={dashboard.cumulativeGpa}
                  semesterTrend={dashboard.semesterTrend}
                  currentGpaCredits={dashboard.currentGpaCredits}
                  remainingCredits={remainingCredits}
                />
              </div>

              <div className="section-stagger" style={sectionStyle(110)}>
                <ProgramRequirementSection
                  support={dashboard.analysisResult.programSupport}
                  analysis={dashboard.analysisResult.programAnalysis}
                />
              </div>

              <div className="section-stagger" style={sectionStyle(140)}>
                <CourseListTable records={dashboard.transcript.records} />
              </div>

              <div className="section-stagger lg:hidden" style={sectionStyle(210)}>
                <AdSlot slot="sidebar" />
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </AppErrorBoundary>
  );
}
