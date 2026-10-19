import "server-only";

import { cookies } from "next/headers";

import {
  authorizeStatementClient,
  DEMO_CLIENT_ID,
} from "@/lib/statements/access";
import { priorFingerprintSet } from "@/lib/statements/fingerprint";
import { readStatementLedger } from "@/lib/statements/store";
import type { StatementImport } from "@/lib/statements/types";
import { SESSION_TOKEN_COOKIE } from "@/lib/onboarding/token";

async function viewerIds(): Promise<string[]> {
  const jar = await cookies();
  const token = jar.get(SESSION_TOKEN_COOKIE)?.value;
  const ids: string[] = [];

  if (token) {
    const authorized = await authorizeStatementClient("");
    if (authorized.ok) {
      ids.push(authorized.actor.userId);
    }
  }

  if (!ids.includes(DEMO_CLIENT_ID)) {
    ids.push(DEMO_CLIENT_ID);
  }

  return ids;
}

export async function findOwnedStatementImport(importId: string): Promise<{
  clientId: string;
  statementImport: StatementImport;
} | null> {
  for (const clientId of await viewerIds()) {
    const ledger = await readStatementLedger(clientId);
    const statementImport = ledger.imports.find(
      (item) => item.id === importId && item.clientId === clientId,
    );

    if (statementImport) {
      return { clientId, statementImport };
    }
  }

  return null;
}

export async function loadStatementReview(importId: string): Promise<{
  clientId: string;
  statementImport: StatementImport;
  priorFingerprints: string[];
} | null> {
  for (const clientId of await viewerIds()) {
    const ledger = await readStatementLedger(clientId);
    const statementImport = ledger.imports.find(
      (item) => item.id === importId && item.clientId === clientId,
    );

    if (!statementImport) {
      continue;
    }

    return {
      clientId,
      statementImport,
      priorFingerprints: [
        ...priorFingerprintSet(ledger.imports, clientId, importId),
      ],
    };
  }

  return null;
}
