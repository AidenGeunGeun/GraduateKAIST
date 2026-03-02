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
import { StatusHero } from "@/app/components/dashboard/StatusHero";
import { WarningsPanel } from "@/app/components/dashboard/WarningsPanel";
import { AdSlot } from "@/app/components/shared/AdSlot";
import { Footer } from "@/app/components/shared/Footer";
import { AnalyzeButton } from "@/app/components/upload/AnalyzeButton";
import { AdmissionYearSelector } from "@/app/components/upload/AdmissionYearSelector";
import { FileUpload } from "@/app/components/upload/FileUpload";
import { PrivacyBadge } from "@/app/components/upload/PrivacyBadge";
import { TrackSelector } from "@/app/components/upload/TrackSelector";
import { applyTrackModification, getRequirements } from "@/domain/configs/requirements";
import { Semester } from "@/domain/models/Semester";
import { Transcript } from "@/domain/models/Transcript";
import { AuTracker as AuTrackerService } from "@/domain/services/AuTracker";
import { GpaCalculator } from "@/domain/services/GpaCalculator";
import { HssDistributionChecker } from "@/domain/services/HssDistributionChecker";
import { RequirementAnalyzer } from "@/domain/services/RequirementAnalyzer";
import type { AnalysisResult, AuResult, HssResult, TrackType } from "@/domain/types";

interface DashboardState {
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
}

const PARSE_ERROR_MESSAGE =
  "엑셀 파일을 읽을 수 없습니다. ERP 성적조회에서 다운로드한 파일인지 확인해주세요.";
const ANALYSIS_ERROR_MESSAGE = "분석 중 오류가 발생했습니다. 다시 시도해주세요.";

function sectionStyle(delay: number): CSSProperties {
  return { "--delay": `${delay}ms` } as CSSProperties;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<TrackType>("심화전공");
  const [admissionYear, setAdmissionYear] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(false);

  const canAnalyze = selectedFile !== null && admissionYear !== null && !loading;

  const handleAnalyze = async () => {
    if (!selectedFile || !admissionYear) {
      return;
    }

    setLoading(true);
    setAnalyzeError(null);
    analyticsTrack("analysis_started", {
      track: selectedTrack,
      admissionYear,
    });

    try {
      const { ExcelTranscriptParser } = await import("@/infrastructure/excel-parser/ExcelTranscriptParser");
      const parser = new ExcelTranscriptParser();
      const buffer = await selectedFile.arrayBuffer();
      let records;

      try {
        records = parser.parse(buffer);
      } catch (_error) {
        throw new Error("PARSE_ERROR");
      }

      if (records.length === 0) {
        throw new Error("PARSE_ERROR");
      }

      const transcript = Transcript.from(records);
      const baseRequirementSet = getRequirements(admissionYear);
      const requirementSet = applyTrackModification(baseRequirementSet, selectedTrack);
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

      const informationalNotices = [
        "공통학사요람 기준입니다. 학과별 세부 요건은 학과 이수요건을 참조하세요.",
        "윤리및안전, 영어능력 졸업요건은 별도 시스템에서 확인하세요.",
      ];

      if (requirementSet.hasHssCoreTypeRequirement) {
        informationalNotices.push("인선 핵심/융합/일반 유형 구분은 성적표에서 확인할 수 없습니다.");
      }

      if (admissionYear === 2025) {
        informationalNotices.push(
          "2025학번 인성/리더십 I/II + III/IV 분배 요건은 성적표만으로 확인할 수 없습니다.",
        );
      }

      setDashboard({
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
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.";
      if (message === "PARSE_ERROR") {
        setAnalyzeError(PARSE_ERROR_MESSAGE);
      } else {
        setAnalyzeError(ANALYSIS_ERROR_MESSAGE);
      }
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
                공통학사요람만 지원합니다.
              </div>

              <FileUpload file={selectedFile} error={fileError} onSelectFile={handleFileSelect} />

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
