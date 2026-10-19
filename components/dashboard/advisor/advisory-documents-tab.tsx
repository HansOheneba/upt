"use client";

import { motion } from "framer-motion";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { SessionDocumentsCard } from "./session-documents-card";
import type { DocumentCategory, SessionDocument } from "./types";

const itemVariant = {
  hidden: { opacity: 0, transform: "translateY(8px)" },
  show: {
    opacity: 1,
    transform: "translateY(0px)",
    transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const },
  },
};

type Props = {
  documents: SessionDocument[];
  canMutate?: boolean;
  uploading?: boolean;
  onDownload?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpload?: (file: File, title: string, category: DocumentCategory) => void;
};

export function AdvisoryDocumentsTab({
  documents,
  canMutate = false,
  uploading = false,
  onDownload,
  onDelete,
  onUpload,
}: Props) {
  return (
    <motion.div
      variants={itemVariant}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <p className={dashboardTheme.sectionLabel}>Documents</p>
      <SessionDocumentsCard
        documents={documents}
        canMutate={canMutate}
        uploading={uploading}
        onDownload={onDownload}
        onDelete={onDelete}
        onUpload={onUpload}
      />
    </motion.div>
  );
}
