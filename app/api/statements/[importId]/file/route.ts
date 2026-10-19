import { NextResponse } from "next/server";

import { findOwnedStatementImport } from "@/lib/statements/load";
import { readStatementFile } from "@/lib/statements/store";

const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv",
  pdf: "application/pdf",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

type RouteContext = {
  params: Promise<{ importId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { importId } = await context.params;
  const owned = await findOwnedStatementImport(importId);

  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { clientId, statementImport } = owned;

  const extension =
    /\.([a-z0-9]+)$/i.exec(statementImport.fileName)?.[1]?.toLowerCase() ||
    statementImport.fileType;
  const bytes = await readStatementFile(clientId, importId, extension);

  if (!bytes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${statementImport.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
