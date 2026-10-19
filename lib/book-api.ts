// lib/book-api.ts
//
// Typed client.* book-collaboration usecases. Names match the UAT Postman
// collection. Never send clientId. Never call admin.*.

import {
  ApiRequestError,
  isNoAdvisorError,
  proxyCall,
  proxyUpload,
} from "@/lib/dashboard-api";

export { ApiRequestError, isNoAdvisorError };

// ── Shared ─────────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | "requested"
  | "upcoming"
  | "completed"
  | "cancelled";

export type AppointmentType =
  | "review"
  | "annual_review"
  | "quarterly_check_in"
  | "onboarding"
  | "goal_check_in"
  | "portfolio_update";

export type AppointmentDuration = 15 | 30 | 45 | 60 | 75;

export type TaskStatus = "open" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type TaskCategory = "financial" | "documents" | "goals" | "other";

export type DocumentCategory =
  | "identity"
  | "statement"
  | "tax"
  | "contract"
  | "report"
  | "plan"
  | "review"
  | "other";

export type DocumentUploader = "advisor" | "client";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type MessageAuthor = "client" | "advisor" | "note";

interface Envelope<T> {
  success?: boolean;
  status?: number | string;
  data?: T;
  message?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function unwrap<T>(res: unknown): T {
  const rec = asRecord(res);
  if (rec && "data" in rec) return rec.data as T;
  return res as T;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function strArr(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function withQuery(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    usp.set(key, String(value));
  }
  const q = usp.toString();
  return q ? `${path}?${q}` : path;
}

function idOf(rec: Record<string, unknown>, key: string): string {
  return str(rec[key]) ?? str(rec.id) ?? "";
}

export const CONFLICT_COPY = {
  noAdvisor: "You haven't been assigned an RM yet. One is on the way.",
  noSessionsRemaining:
    "You cannot book another session right now. Contact your RM if you need help.",
  slotNotInOverlap:
    "That time isn't in both calendars. Request a time instead.",
} as const;

export function conflictCopyFor(
  kind: "request" | "create",
  err: unknown,
): string {
  if (isNoAdvisorError(err)) return CONFLICT_COPY.noAdvisor;
  if (kind === "request") return CONFLICT_COPY.noSessionsRemaining;
  return CONFLICT_COPY.slotNotInOverlap;
}

export function isConflict(err: unknown): boolean {
  return err instanceof ApiRequestError && err.status === 409;
}

// ── Advisory overview ──────────────────────────────────────────────────────

export interface AdvisoryEntitlement {
  planYear: string;
  included: number;
  used: number;
  remaining: number;
}

export interface SessionLog {
  title: string;
  tags: string[];
  advisorAssessment: string;
  discussionPoints: string[];
  recommendations: { title: string }[];
  sessionNotes: string;
}

export interface ProgressMetricSnapshot {
  key: string;
  label: string;
  value: number;
  previous: number | null;
  unit: string;
  currency?: string;
}

export interface AdvisoryAppointment {
  appointmentId: string;
  type: AppointmentType;
  title?: string;
  scheduledAt: string | null;
  durationMinutes: number;
  status: AppointmentStatus;
  advisorName?: string;
}

export interface AdvisoryLastSession extends AdvisoryAppointment {
  log: SessionLog;
  progress: { metrics: ProgressMetricSnapshot[] };
}

export interface ClientTask {
  taskId: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueAt: string | null;
  status: TaskStatus;
}

export interface ClientDocument {
  documentId: string;
  title: string;
  category: DocumentCategory;
  uploadedBy: DocumentUploader;
  sessionId?: string;
  downloadUrl?: string;
  createdAt: string;
  sizeBytes?: number;
}

export interface AdvisoryOverview {
  entitlement: AdvisoryEntitlement;
  nextSession: AdvisoryAppointment | null;
  lastSession: AdvisoryLastSession | null;
  history: AdvisoryLastSession[];
  actions: ClientTask[];
  documents: ClientDocument[];
  advisorName?: string;
}

const APPOINTMENT_TYPES: AppointmentType[] = [
  "review",
  "annual_review",
  "quarterly_check_in",
  "onboarding",
  "goal_check_in",
  "portfolio_update",
];

function asAppointmentType(value: unknown): AppointmentType {
  return APPOINTMENT_TYPES.includes(value as AppointmentType)
    ? (value as AppointmentType)
    : "review";
}

function asAppointmentStatus(value: unknown): AppointmentStatus {
  if (
    value === "requested" ||
    value === "upcoming" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "upcoming";
}

function asTaskStatus(value: unknown): TaskStatus {
  return value === "done" ? "done" : "open";
}

function asTaskPriority(value: unknown): TaskPriority {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

function asTaskCategory(value: unknown): TaskCategory {
  if (
    value === "financial" ||
    value === "documents" ||
    value === "goals" ||
    value === "other"
  ) {
    return value;
  }
  return "other";
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "identity",
  "statement",
  "tax",
  "contract",
  "report",
  "plan",
  "review",
  "other",
];

function asDocumentCategory(value: unknown): DocumentCategory {
  return DOCUMENT_CATEGORIES.includes(value as DocumentCategory)
    ? (value as DocumentCategory)
    : "other";
}

function parseRecommendations(value: unknown): { title: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return { title: item };
      const rec = asRecord(item);
      const title = rec ? str(rec.title) : undefined;
      return title ? { title } : null;
    })
    .filter((item): item is { title: string } => item !== null);
}

function parseLog(value: unknown): SessionLog {
  const rec = asRecord(value) ?? {};
  return {
    title: str(rec.title) ?? "",
    tags: strArr(rec.tags),
    advisorAssessment: str(rec.advisorAssessment) ?? "",
    discussionPoints: strArr(rec.discussionPoints),
    recommendations: parseRecommendations(rec.recommendations),
    sessionNotes: str(rec.sessionNotes) ?? "",
  };
}

function parseMetrics(value: unknown): ProgressMetricSnapshot[] {
  const rec = asRecord(value);
  const list: unknown[] = Array.isArray(value)
    ? value
    : rec && Array.isArray(rec.metrics)
      ? rec.metrics
      : [];
  const metrics: ProgressMetricSnapshot[] = [];
  for (const item of list) {
    const m = asRecord(item);
    if (!m) continue;
    const valueNum = num(m.value);
    if (valueNum === undefined) continue;
    const snapshot: ProgressMetricSnapshot = {
      key: str(m.key) ?? str(m.label) ?? "",
      label: str(m.label) ?? str(m.key) ?? "",
      value: valueNum,
      previous: num(m.previous) ?? null,
      unit: str(m.unit) ?? "",
    };
    const currency = str(m.currency);
    if (currency) snapshot.currency = currency;
    metrics.push(snapshot);
  }
  return metrics;
}

function parseAppointment(value: unknown): AdvisoryAppointment | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const appointmentId = idOf(rec, "appointmentId");
  if (!appointmentId) return null;
  const duration = num(rec.durationMinutes) ?? 60;
  return {
    appointmentId,
    type: asAppointmentType(rec.type),
    title: str(rec.title),
    scheduledAt: str(rec.scheduledAt) ?? null,
    durationMinutes: duration,
    status: asAppointmentStatus(rec.status),
    advisorName: str(rec.advisorName) ?? str(asRecord(rec.advisor)?.name),
  };
}

function parseLastSession(value: unknown): AdvisoryLastSession | null {
  const base = parseAppointment(value);
  if (!base) return null;
  const rec = asRecord(value) ?? {};
  const log = parseLog(rec.log);
  const progressRaw = rec.progress;
  return {
    ...base,
    log,
    progress: { metrics: parseMetrics(progressRaw) },
  };
}

function parseTask(value: unknown): ClientTask | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const taskId = idOf(rec, "taskId");
  const title = str(rec.title);
  if (!taskId || !title) return null;
  return {
    taskId,
    title,
    category: asTaskCategory(rec.category),
    priority: asTaskPriority(rec.priority),
    dueAt: str(rec.dueAt) ?? null,
    status: asTaskStatus(rec.status),
  };
}

function parseDocument(value: unknown): ClientDocument | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const documentId = idOf(rec, "documentId");
  if (!documentId) return null;
  const uploadedBy: DocumentUploader =
    rec.uploadedBy === "client" ? "client" : "advisor";
  return {
    documentId,
    title: str(rec.title) ?? str(rec.name) ?? "Untitled",
    category: asDocumentCategory(rec.category ?? rec.type),
    uploadedBy,
    sessionId: str(rec.sessionId),
    downloadUrl: str(rec.downloadUrl),
    createdAt: str(rec.createdAt) ?? str(rec.uploadedAt) ?? "",
    sizeBytes: num(rec.sizeBytes) ?? num(rec.size),
  };
}

function parseOverview(raw: unknown): AdvisoryOverview {
  const rec = asRecord(raw) ?? {};
  const entitlementRec = asRecord(rec.entitlement) ?? {};
  const included = num(entitlementRec.included) ?? 0;
  const used = num(entitlementRec.used) ?? 0;
  const remaining =
    num(entitlementRec.remaining) ?? Math.max(0, included - used);
  const advisorRec = asRecord(rec.advisor);
  const historyRaw = Array.isArray(rec.history) ? rec.history : [];
  const actionsRaw = Array.isArray(rec.actions) ? rec.actions : [];
  const docsRaw = Array.isArray(rec.documents) ? rec.documents : [];

  return {
    entitlement: {
      planYear: str(entitlementRec.planYear) ?? "",
      included,
      used,
      remaining,
    },
    nextSession: parseAppointment(rec.nextSession),
    lastSession: parseLastSession(rec.lastSession),
    history: historyRaw
      .map(parseLastSession)
      .filter((item): item is AdvisoryLastSession => item !== null),
    actions: actionsRaw
      .map(parseTask)
      .filter((item): item is ClientTask => item !== null),
    documents: docsRaw
      .map(parseDocument)
      .filter((item): item is ClientDocument => item !== null),
    advisorName: str(rec.advisorName) ?? str(advisorRec?.name),
  };
}

export type OverviewResult =
  | { kind: "ok"; overview: AdvisoryOverview }
  | { kind: "no_advisor" };

export async function fetchAdvisoryOverview(
  planYear?: string,
): Promise<OverviewResult> {
  try {
    const res = await proxyCall<Envelope<unknown>>(
      withQuery("client.advisory.overview", { planYear }),
    );
    return { kind: "ok", overview: parseOverview(unwrap(res)) };
  } catch (err) {
    if (isNoAdvisorError(err)) return { kind: "no_advisor" };
    throw err;
  }
}

// ── Messages ───────────────────────────────────────────────────────────────

export interface ThreadMessage {
  messageId: string;
  author: MessageAuthor;
  body: string;
  createdAt: string;
}

export interface MessageThread {
  threadId?: string;
  items: ThreadMessage[];
  page: number;
  pageSize: number;
  total?: number;
}

function parseMessage(value: unknown): ThreadMessage | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const authorRaw = str(rec.author);
  const author: MessageAuthor =
    authorRaw === "advisor" || authorRaw === "note" ? authorRaw : "client";
  const body = str(rec.body);
  if (!body) return null;
  return {
    messageId: idOf(rec, "messageId"),
    author,
    body,
    createdAt: str(rec.createdAt) ?? "",
  };
}

function parseThread(raw: unknown, page: number, pageSize: number): MessageThread {
  const rec = asRecord(raw) ?? {};
  const nested = asRecord(rec.thread);
  const itemsRaw = Array.isArray(rec.items)
    ? rec.items
    : Array.isArray(rec.messages)
      ? rec.messages
      : nested && Array.isArray(nested.items)
        ? nested.items
        : Array.isArray(raw)
          ? raw
          : [];
  const items = itemsRaw
    .map(parseMessage)
    .filter((item): item is ThreadMessage => item !== null)
    .filter((item) => item.author !== "note");
  return {
    threadId: str(rec.threadId) ?? str(nested?.threadId),
    items,
    page: num(rec.page) ?? page,
    pageSize: num(rec.pageSize) ?? pageSize,
    total: num(rec.total),
  };
}

export async function fetchMessageThread(
  page = 1,
  pageSize = 50,
): Promise<MessageThread> {
  const res = await proxyCall<Envelope<unknown>>(
    withQuery("client.messages.thread.get", { page, pageSize }),
  );
  return parseThread(unwrap(res), page, pageSize);
}

export async function sendMessage(body: string): Promise<ThreadMessage | null> {
  const res = await proxyCall<Envelope<unknown>>(
    "client.messages.send",
    "POST",
    { body },
  );
  return parseMessage(unwrap(res));
}

export async function markThreadRead(): Promise<void> {
  await proxyCall("client.messages.thread.mark-read", "POST", {});
}

// ── Tasks ──────────────────────────────────────────────────────────────────

function parseTaskList(raw: unknown): ClientTask[] {
  const rec = asRecord(raw);
  const list = Array.isArray(raw)
    ? raw
    : rec && Array.isArray(rec.tasks)
      ? rec.tasks
      : rec && Array.isArray(rec.items)
        ? rec.items
        : [];
  return list
    .map(parseTask)
    .filter((item): item is ClientTask => item !== null);
}

export async function fetchTasks(
  status: "all" | "open" | "done" = "all",
): Promise<ClientTask[]> {
  const res = await proxyCall<Envelope<unknown>>(
    withQuery("client.tasks.find", { status }),
  );
  return parseTaskList(unwrap(res));
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<ClientTask | null> {
  const res = await proxyCall<Envelope<unknown>>(
    "client.tasks.update-status",
    "PUT",
    { taskId, status },
  );
  return parseTask(unwrap(res));
}

// ── Documents ──────────────────────────────────────────────────────────────

function parseDocumentList(raw: unknown): ClientDocument[] {
  const rec = asRecord(raw);
  const list = Array.isArray(raw)
    ? raw
    : rec && Array.isArray(rec.documents)
      ? rec.documents
      : rec && Array.isArray(rec.items)
        ? rec.items
        : [];
  return list
    .map(parseDocument)
    .filter((item): item is ClientDocument => item !== null);
}

export async function fetchDocuments(
  category: DocumentCategory | "all" = "all",
): Promise<ClientDocument[]> {
  const res = await proxyCall<Envelope<unknown>>(
    withQuery("client.documents.find", { category }),
  );
  return parseDocumentList(unwrap(res));
}

export async function uploadDocument(input: {
  file: File;
  title?: string;
  category?: DocumentCategory;
}): Promise<ClientDocument | null> {
  const form = new FormData();
  form.append("path", "client.documents.upload");
  form.append("file", input.file);
  if (input.title) form.append("title", input.title);
  if (input.category) form.append("category", input.category);
  const res = await proxyUpload<Envelope<unknown>>(form);
  return parseDocument(unwrap(res));
}

export async function deleteDocument(documentId: string): Promise<void> {
  await proxyCall(
    withQuery("client.documents.delete", { documentId }),
    "DELETE",
  );
}

export async function freshDownloadUrl(
  documentId: string,
): Promise<string | null> {
  const docs = await fetchDocuments("all");
  const match = docs.find((d) => d.documentId === documentId);
  return match?.downloadUrl ?? null;
}

// ── Availability ───────────────────────────────────────────────────────────

export interface ClientAvailability {
  timezone: string;
  hoursStart: string;
  hoursEnd: string;
  daysAvailable: Weekday[];
}

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function parseAvailability(raw: unknown): ClientAvailability {
  const rec = asRecord(raw) ?? {};
  const daysRaw = Array.isArray(rec.daysAvailable) ? rec.daysAvailable : [];
  const daysAvailable = daysRaw.filter((d): d is Weekday =>
    WEEKDAYS.includes(d as Weekday),
  );
  return {
    timezone: str(rec.timezone) ?? "UTC",
    hoursStart: str(rec.hoursStart) ?? "09:00",
    hoursEnd: str(rec.hoursEnd) ?? "17:00",
    daysAvailable:
      daysAvailable.length > 0
        ? daysAvailable
        : ["mon", "tue", "wed", "thu", "fri"],
  };
}

export async function fetchAvailability(): Promise<ClientAvailability> {
  const res = await proxyCall<Envelope<unknown>>("client.availability.get");
  return parseAvailability(unwrap(res));
}

export async function updateAvailability(
  payload: ClientAvailability,
): Promise<ClientAvailability> {
  const res = await proxyCall<Envelope<unknown>>(
    "client.availability.update",
    "PUT",
    payload,
  );
  return parseAvailability(unwrap(res));
}

// ── Slots ──────────────────────────────────────────────────────────────────

export interface AppointmentSlot {
  start: string;
  end?: string;
}

function parseSlots(raw: unknown): AppointmentSlot[] {
  const rec = asRecord(raw);
  const list = Array.isArray(raw)
    ? raw
    : rec && Array.isArray(rec.slots)
      ? rec.slots
      : rec && Array.isArray(rec.items)
        ? rec.items
        : [];
  return list
    .map((item) => {
      if (typeof item === "string") return { start: item };
      const s = asRecord(item);
      if (!s) return null;
      const start = str(s.start) ?? str(s.scheduledAt);
      if (!start) return null;
      return { start, end: str(s.end) };
    })
    .filter((item): item is AppointmentSlot => item !== null);
}

export async function fetchAppointmentSlots(input: {
  from: string;
  to: string;
  durationMinutes: AppointmentDuration;
}): Promise<AppointmentSlot[]> {
  const res = await proxyCall<Envelope<unknown>>(
    withQuery("client.appointments.slots.find", {
      from: input.from,
      to: input.to,
      durationMinutes: input.durationMinutes,
    }),
  );
  return parseSlots(unwrap(res));
}

// ── Appointments ───────────────────────────────────────────────────────────

export interface AppointmentRequestInput {
  type: AppointmentType;
  title?: string;
  message: string;
  scheduledAt: string;
  durationMinutes: AppointmentDuration;
}

export async function fetchAppointments(
  status: AppointmentStatus | "all" = "all",
): Promise<AdvisoryAppointment[]> {
  const res = await proxyCall<Envelope<unknown>>(
    withQuery("client.appointments.find", { status }),
  );
  const raw = unwrap(res);
  const rec = asRecord(raw);
  const list = Array.isArray(raw)
    ? raw
    : rec && Array.isArray(rec.appointments)
      ? rec.appointments
      : rec && Array.isArray(rec.items)
        ? rec.items
        : [];
  return list
    .map(parseAppointment)
    .filter((item): item is AdvisoryAppointment => item !== null);
}

export async function requestAppointment(
  input: AppointmentRequestInput,
): Promise<AdvisoryAppointment | null> {
  const body: Record<string, unknown> = {
    type: input.type,
    durationMinutes: input.durationMinutes,
    scheduledAt: input.scheduledAt,
  };
  if (input.title) body.title = input.title;
  body.message = input.message;
  const res = await proxyCall<Envelope<unknown>>(
    "client.appointments.request",
    "POST",
    body,
  );
  return parseAppointment(unwrap(res));
}

/**
 * @deprecated Do not use from the client portal. Instant book conflicts with
 * mutual agreement scheduling. Use requestAppointment + accept flow instead.
 */
export async function createAppointment(input: {
  type: AppointmentType;
  scheduledAt: string;
  durationMinutes: AppointmentDuration;
  title?: string;
}): Promise<AdvisoryAppointment | null> {
  const body: Record<string, unknown> = {
    type: input.type,
    scheduledAt: input.scheduledAt,
    durationMinutes: input.durationMinutes,
  };
  if (input.title) body.title = input.title;
  const res = await proxyCall<Envelope<unknown>>(
    "client.appointments.create",
    "POST",
    body,
  );
  return parseAppointment(unwrap(res));
}

export async function cancelAppointment(appointmentId: string): Promise<void> {
  await proxyCall("client.appointments.cancel", "PUT", { appointmentId });
}
