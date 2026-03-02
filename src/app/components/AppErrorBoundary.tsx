"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorType: "parse" | "analysis" | "generic";
}

function classifyError(error: Error): AppErrorBoundaryState["errorType"] {
  const message = error.message.toLowerCase();
  if (message.includes("parse") || message.includes("xlsx") || message.includes("excel")) {
    return "parse";
  }
  if (message.includes("analysis") || message.includes("analyze")) {
    return "analysis";
  }
  return "generic";
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorType: "generic",
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorType: classifyError(error),
    };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // no-op: user-facing fallback is sufficient for this client-only app
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorType: "generic" });
    this.props.onReset();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message =
      this.state.errorType === "parse"
        ? "엑셀 파일을 읽을 수 없습니다. ERP 성적조회에서 다운로드한 파일인지 확인해주세요."
        : this.state.errorType === "analysis"
          ? "분석 중 오류가 발생했습니다. 다시 시도해주세요."
          : "예기치 않은 오류가 발생했습니다.";

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8">
        <section className="w-full rounded-2xl border border-danger/40 bg-danger/10 p-5 text-sm text-text sm:p-6">
          <h2 className="text-base font-semibold text-danger">오류가 발생했습니다</h2>
          <p className="mt-2 text-text">{message}</p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text hover:bg-surface-soft"
          >
            다시 시도
          </button>
        </section>
      </div>
    );
  }
}
