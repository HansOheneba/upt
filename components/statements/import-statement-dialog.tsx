"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { isDemoPath } from "@/lib/demo-mode";
import {
  Check,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  TriangleAlert,
  Upload,
} from "lucide-react";

import { uploadStatementAction } from "@/app/actions/statement-import";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

const STATEMENT_ACCEPT =
  ".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const PROCESS_STEPS = [
  "File uploaded",
  "Extracting transactions",
  "Checking transaction data",
  "Preparing review",
] as const;

type ImportPhase = "form" | "uploading" | "processing";

type FileRejection = {
  title: string;
  detail: string;
};

type ImportStatementDialogProps = {
  clientId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function displayFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  return cleaned || "Statement";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    const kilobytes = bytes / 1024;
    return `${kilobytes >= 10 ? kilobytes.toFixed(0) : kilobytes.toFixed(1)} KB`;
  }

  const megabytes = bytes / (1024 * 1024);
  return `${megabytes >= 10 ? megabytes.toFixed(0) : megabytes.toFixed(1)} MB`;
}

function isSupportedStatement(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (
    name.endsWith(".csv") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".pdf")
  ) {
    return true;
  }

  return (
    type.includes("csv") ||
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type.includes("pdf")
  );
}

function statementTypeLabel(file: File): string {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf") || file.type.toLowerCase().includes("pdf")) {
    return "PDF";
  }

  if (name.endsWith(".csv")) {
    return "CSV";
  }

  if (name.endsWith(".xls")) {
    return "XLS";
  }

  if (name.endsWith(".xlsx")) {
    return "XLSX";
  }

  if (file.type.toLowerCase().includes("csv")) {
    return "CSV";
  }

  return "XLSX";
}

function validateStatementFile(file: File): FileRejection | null {
  if (file.size === 0) {
    return {
      title: "This file is empty.",
      detail: "Choose a statement that contains transactions.",
    };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      title: "File is too large.",
      detail: "Maximum file size is 15 MB.",
    };
  }

  if (!isSupportedStatement(file)) {
    return {
      title: "This file type isn't supported.",
      detail: "Please upload a CSV, XLSX, XLS, or PDF.",
    };
  }

  return null;
}

function assignInputFile(input: HTMLInputElement, file: File | null) {
  if (!file) {
    input.value = "";
    return;
  }

  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
}

function stepStatus(
  index: number,
  activeStep: number,
): "done" | "current" | "upcoming" {
  if (index < activeStep) {
    return "done";
  }

  if (index === activeStep) {
    return "current";
  }

  return "upcoming";
}

function StatementFileGlyph({ file }: { file: File }) {
  const label = statementTypeLabel(file);
  const Icon = label === "XLS" || label === "XLSX" ? FileSpreadsheet : FileText;

  return <Icon className="size-4" aria-hidden />;
}

function ProcessingSteps({
  activeStep,
  finished,
}: {
  activeStep: number;
  finished: boolean;
}) {
  return (
    <div className="px-4 py-4 text-left sm:px-5">
      <p className="text-sm font-medium text-foreground">
        {finished ? "Statement uploaded" : "Processing statement"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {finished
          ? "Preparing transactions for review."
          : "We're extracting and preparing transactions for review."}
      </p>
      <ol className="mt-4 grid gap-2.5" aria-label="Import progress">
        {PROCESS_STEPS.map((label, index) => {
          const status = stepStatus(index, activeStep);

          return (
            <li key={label} className="flex items-center gap-2.5 text-sm">
              <span
                className="flex size-4 shrink-0 items-center justify-center"
                aria-hidden
              >
                {status === "done" ? (
                  <Check className="size-3.5 text-success" />
                ) : status === "current" ? (
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              <span className="sr-only">
                {status === "done"
                  ? "Completed: "
                  : status === "current"
                    ? "In progress: "
                    : "Pending: "}
              </span>
              <span
                className={
                  status === "upcoming"
                    ? "text-muted-foreground"
                    : "text-foreground"
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ImportStatementDialog({
  clientId,
  open: openProp,
  onOpenChange,
}: ImportStatementDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const dragDepth = useRef(0);
  const activeStepRef = useRef(0);
  const importIdRef = useRef<string | null>(null);
  const navigatedRef = useRef(false);
  const phaseRef = useRef<ImportPhase>("form");
  const shouldFocusUpload = useRef(false);

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    onOpenChange?.(next);
    if (openProp === undefined) {
      setUncontrolledOpen(next);
    }
  }
  const [file, setFile] = useState<File | null>(null);
  const [rejection, setRejection] = useState<FileRejection | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ImportPhase>("form");
  const [activeStep, setActiveStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const busy = phase === "uploading" || phase === "processing";
  const finished = activeStep >= PROCESS_STEPS.length;
  const fileName = file ? displayFileName(file.name) : "";

  function reset() {
    setFile(null);
    setRejection(null);
    setServerError(null);
    setPhase("form");
    setActiveStep(0);
    setDragOver(false);
    activeStepRef.current = 0;
    importIdRef.current = null;
    navigatedRef.current = false;
    dragDepth.current = 0;
    shouldFocusUpload.current = false;
    phaseRef.current = "form";

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function requestClose() {
    if (phaseRef.current === "uploading" || phaseRef.current === "processing") {
      return;
    }

    setOpen(false);
    reset();
  }

  function openPicker() {
    const input = inputRef.current;

    if (!input || phaseRef.current !== "form") {
      return;
    }

    input.value = "";
    input.click();
  }

  function rememberFile(next: File) {
    shouldFocusUpload.current = true;
    setFile(next);
    setRejection(null);
    setServerError(null);

    if (inputRef.current) {
      assignInputFile(inputRef.current, next);
    }
  }

  function acceptFile(next: File | undefined) {
    if (!next || phaseRef.current !== "form") {
      return;
    }

    const problem = validateStatementFile(next);

    if (problem) {
      setRejection(problem);
      setServerError(null);

      if (inputRef.current) {
        assignInputFile(inputRef.current, file);
      }

      return;
    }

    rememberFile(next);
  }

  function clearFile() {
    setFile(null);
    setRejection(null);
    setServerError(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0]);
  }

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current += 1;

    if (phaseRef.current === "form") {
      setDragOver(true);
    }
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = phaseRef.current === "form" ? "copy" : "none";
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current -= 1;

    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragOver(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || phaseRef.current !== "form") {
      return;
    }

    const problem = validateStatementFile(file);

    if (problem) {
      setRejection(problem);
      return;
    }

    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("file", file);

    activeStepRef.current = 1;
    setActiveStep(1);
    setRejection(null);
    setServerError(null);
    setPhase("uploading");

    startTransition(async () => {
      const result = await uploadStatementAction(formData);

      if (!result.ok) {
        setPhase("form");
        setActiveStep(0);
        activeStepRef.current = 0;
        setServerError(result.message);
        return;
      }

      importIdRef.current = result.importId;
      setPhase("processing");
    });
  }

  useEffect(() => {
    if (!shouldFocusUpload.current || !file || phase !== "form") {
      return;
    }

    shouldFocusUpload.current = false;
    uploadButtonRef.current?.focus();
  }, [file, phase]);

  useEffect(() => {
    if (phase !== "uploading") {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveStep((current) => {
        const next = current < 2 ? current + 1 : current;
        activeStepRef.current = next;
        return next;
      });
    }, 800);

    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "processing") {
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    const advance = (step: number) => {
      if (cancelled) {
        return;
      }

      activeStepRef.current = step;
      setActiveStep(step);

      if (step < PROCESS_STEPS.length) {
        timers.push(window.setTimeout(() => advance(step + 1), 260));
        return;
      }

      timers.push(
        window.setTimeout(() => {
          if (cancelled || navigatedRef.current) {
            return;
          }

          const importId = importIdRef.current;

          if (!importId) {
            return;
          }

          navigatedRef.current = true;
          const base = isDemoPath(pathname) ? "/dashboard/demo" : "/dashboard";
          router.push(`${base}/cash-flow/imports/${importId}`);
        }, 360),
      );
    };

    advance(Math.min(activeStepRef.current + 1, PROCESS_STEPS.length));

    return () => {
      cancelled = true;

      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [phase, pathname, router]);

  const showProgress = phase === "uploading" || phase === "processing";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOpen(true);
          return;
        }

        requestClose();
      }}
    >
      {openProp === undefined ? (
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="secondary">
            Import statement
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent
        className="gap-5 sm:max-w-md"
        showCloseButton={!busy}
        onPointerDownOutside={(event) => {
          if (busy) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (busy) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="gap-1.5 pr-8">
          <DialogTitle>Import statement</DialogTitle>
          <DialogDescription>
            Upload a bank statement to bring your transactions into cash flow.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={STATEMENT_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-label="Statement file"
            onChange={onInputChange}
          />

          <div
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            aria-busy={busy}
            aria-invalid={rejection !== null || undefined}
            className={cn(
              "min-h-40 rounded-lg border transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
              dragOver
                ? "border-solid border-primary bg-surface-brand"
                : showProgress
                  ? "border-solid border-border bg-surface-muted"
                  : serverError
                    ? "border-solid border-destructive/25 bg-destructive/5"
                    : "border-dashed border-border bg-surface-muted hover:border-foreground/20 hover:bg-muted",
            )}
          >
            {showProgress ? (
              <ProcessingSteps activeStep={activeStep} finished={finished} />
            ) : serverError ? (
              <div role="alert" className="px-4 py-4 sm:px-5">
                <span className="flex size-8 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                  <TriangleAlert className="size-4" aria-hidden />
                </span>
                <p className="mt-3 text-sm font-medium text-foreground">
                  We couldn&apos;t read this statement
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {serverError}
                </p>
                {file ? (
                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    {fileName}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    clearFile();
                    openPicker();
                  }}
                >
                  Choose another file
                </Button>
              </div>
            ) : dragOver ? (
              <div className="flex min-h-40 items-center justify-center px-5">
                <p className="text-sm font-medium text-foreground">
                  Drop your statement here
                </p>
              </div>
            ) : file ? (
              <div className="animate-in fade-in-0 px-4 py-5 text-center duration-200 sm:px-5">
                <span className="mx-auto flex size-8 items-center justify-center rounded-md bg-background text-primary ring-1 ring-foreground/10">
                  <StatementFileGlyph file={file} />
                </span>
                <p className="mt-3 text-xs text-muted-foreground">
                  Statement ready to upload
                </p>
                <p
                  className="mt-1 truncate text-sm font-medium text-foreground"
                  title={fileName.length > 36 ? fileName : undefined}
                >
                  {fileName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {statementTypeLabel(file)} · {formatFileSize(file.size)}
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openPicker}
                  >
                    Change file
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={openPicker}
                className="flex min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg px-4 py-6 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-foreground/10">
                  <Upload className="size-4" aria-hidden />
                </span>
                <span className="mt-3 text-sm font-medium text-foreground">
                  Drop your statement here
                </span>
                <span className="mt-1 text-sm text-muted-foreground">
                  or click to browse your files
                </span>
                <span className="mt-3 text-xs text-muted-foreground">
                  CSV · XLSX · XLS · PDF · Max 15 MB
                </span>
              </button>
            )}
            <p className="sr-only" aria-live="polite">
              {showProgress
                ? finished
                  ? "Statement uploaded. Preparing transactions for review."
                  : `${PROCESS_STEPS[Math.min(activeStep, PROCESS_STEPS.length - 1)]}.`
                : file && !rejection
                  ? `${fileName} ready to upload.`
                  : ""}
            </p>
          </div>

          {rejection ? (
            <div role="alert" className="grid gap-0.5">
              <p className="text-sm font-medium text-destructive">
                {rejection.title}
              </p>
              <p className="text-sm text-muted-foreground">{rejection.detail}</p>
            </div>
          ) : null}

          {showProgress || serverError ? null : (
            <p className="flex gap-2 text-xs leading-5 text-muted-foreground">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                Statements are securely processed. <br /> Transactions remain in
                review until confirmed.
              </span>
            </p>
          )}

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={requestClose}
            >
              Cancel
            </Button>
            <Button
              ref={uploadButtonRef}
              type="submit"
              className="w-full sm:w-auto"
              disabled={!file || busy}
              aria-busy={busy}
            >
              {busy ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  {phase === "processing" ? "Processing..." : "Uploading..."}
                </>
              ) : (
                "Upload statement"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
