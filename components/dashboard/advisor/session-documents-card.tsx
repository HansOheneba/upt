"use client";

import * as React from "react";
import {
  FileText,
  FileBarChart2,
  BookOpen,
  Paperclip,
  Download,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DashCard,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/dashboard/dash-card";
import type { DocumentCategory, SessionDocument } from "./types";
import { DOCUMENT_CATEGORY_LABELS } from "./types";

const PRIMARY = "var(--brand-primary)";
const ACCENT = "var(--brand-accent)";

const DOC_ICONS: Record<DocumentCategory, React.ReactNode> = {
  identity: <Paperclip className="h-4 w-4" />,
  statement: <FileText className="h-4 w-4" />,
  tax: <FileText className="h-4 w-4" />,
  contract: <Paperclip className="h-4 w-4" />,
  report: <FileBarChart2 className="h-4 w-4" />,
  plan: <BookOpen className="h-4 w-4" />,
  review: <FileText className="h-4 w-4" />,
  other: <Paperclip className="h-4 w-4" />,
};

const ACCEPT = ".pdf,.jpeg,.jpg,.png,.webp,.docx";
const MAX_BYTES = 15 * 1024 * 1024;

type Props = {
  documents: SessionDocument[];
  canMutate?: boolean;
  uploading?: boolean;
  onDownload?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpload?: (file: File, title: string, category: DocumentCategory) => void;
};

export function SessionDocumentsCard({
  documents,
  canMutate = false,
  uploading = false,
  onDownload,
  onDelete,
  onUpload,
}: Props) {
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<DocumentCategory>("other");
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [fileKey, setFileKey] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!file) {
      setPendingFile(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError("File is over 15MB.");
      setPendingFile(null);
      e.target.value = "";
      return;
    }
    setPendingFile(file);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  }

  function handleUpload() {
    if (!pendingFile || !onUpload) return;
    onUpload(pendingFile, title.trim(), category);
    setPendingFile(null);
    setTitle("");
    setCategory("other");
    setFileKey((k) => k + 1);
  }

  return (
    <DashCard>
      <CardHeader>
        <CardTitle className="text-base" style={{ color: PRIMARY }}>
          Documents and deliverables
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Reports and files from you and your RM.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {canMutate && onUpload && (
          <div className="rounded-xl border border-dashed border-muted/60 p-3 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                key={fileKey}
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                onChange={handleFileChange}
                className="text-xs"
              />
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as DocumentCategory)}
              >
                <SelectTrigger size="sm" className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(
                      DOCUMENT_CATEGORY_LABELS,
                    ) as DocumentCategory[]
                  ).map((key) => (
                    <SelectItem key={key} value={key}>
                      {DOCUMENT_CATEGORY_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="text-sm"
              />
              <Button
                size="sm"
                className="gap-1.5 text-xs h-9 shrink-0 text-white"
                style={{ backgroundColor: PRIMARY }}
                disabled={!pendingFile || uploading}
                onClick={handleUpload}
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
            {fileError && (
              <p className="text-xs text-destructive">{fileError}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              PDF, JPEG, PNG, WebP, or DOCX. Max 15MB.
            </p>
          </div>
        )}

        {documents.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-muted/60 py-10 text-center">
            <FileText className="mb-3 size-7 text-muted-foreground" />
            <p className="text-sm font-medium">Share a file with your advisor</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Statements, reports, and plans from you and your relationship manager live here.
            </p>
            {canMutate && onUpload ? (
              <Button
                type="button"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3.5" />
                Upload a file
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-muted/30">
            {documents.map((doc) => {
              const label = DOCUMENT_CATEGORY_LABELS[doc.type];
              const icon = DOC_ICONS[doc.type];
              const uploader =
                doc.uploadedBy === "client" ? "You" : "RM";
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--brand-accent) 10%, transparent)",
                      color: ACCENT,
                    }}
                  >
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="text-[10px] rounded-full h-4 px-1.5"
                      >
                        {label}
                      </Badge>
                      {doc.uploadedBy && (
                        <span className="text-xs text-muted-foreground">
                          {uploader}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {doc.dateLabel}
                      </span>
                      {doc.sizeLabel && (
                        <span className="text-xs text-muted-foreground/60">
                          {doc.sizeLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {onDownload && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 hover:bg-muted/30"
                      aria-label={`Download ${doc.name}`}
                      onClick={() => onDownload(doc.id)}
                    >
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                  {onDelete && doc.uploadedBy === "client" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 hover:bg-muted/30"
                      aria-label={`Delete ${doc.name}`}
                      onClick={() => onDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </DashCard>
  );
}
