"use client";

import { useRef, useState } from "react";

interface FileUploadProps {
  file: File | null;
  error: string | null;
  onSelectFile: (file: File | null, error: string | null) => void;
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLS_MIME = "application/vnd.ms-excel";

function isExcelFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  const extensionMatch = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
  const mimeMatch = [XLSX_MIME, XLS_MIME, ""].includes(file.type);
  return extensionMatch && mimeMatch;
}

export function FileUpload({ file, error, onSelectFile }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleIncomingFile = (incoming: File | undefined) => {
    if (!incoming) {
      return;
    }
    if (!isExcelFile(incoming)) {
      onSelectFile(null, "엑셀 파일(.xlsx 또는 .xls)만 업로드 가능합니다");
      return;
    }
    onSelectFile(incoming, null);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(event) => handleIncomingFile(event.target.files?.[0])}
      />
      <button
        type="button"
        aria-label="성적 엑셀 파일 업로드 영역. 클릭하거나 파일을 드래그하여 업로드하세요"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleIncomingFile(event.dataTransfer.files?.[0]);
        }}
        className={`w-full rounded-xl border border-dashed p-6 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          dragging ? "border-accent bg-accent/10" : "border-border bg-surface"
        }`}
      >
        <p className="text-sm font-semibold text-text">성적 엑셀 파일을 드래그하거나 클릭하여 업로드하세요</p>
        <p className="mt-2 text-xs text-text-muted">.xlsx / .xls 파일 (ERP 성적조회 다운로드)</p>
        {file ? <p className="mt-4 text-xs text-accent">선택된 파일: {file.name}</p> : null}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function isValidUploadFile(file: File | null): boolean {
  if (!file) {
    return false;
  }
  return isExcelFile(file);
}
