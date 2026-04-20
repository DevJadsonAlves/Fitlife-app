import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const LOCAL_ERROR_LOG_KEY = "fitlife_client_error_log";
const MAX_LOCAL_ERRORS = 50;

export interface ClientErrorEvent {
  id: string;
  source: string;
  message: string;
  stack?: string;
  createdAt: string;
  path: string;
  userAgent: string;
  context: Record<string, unknown>;
}

type SupabaseLikeError = {
  code?: string;
};

function isSupabaseLikeError(value: unknown): value is SupabaseLikeError {
  return Boolean(value && typeof value === "object");
}

function isIgnorableError(value: unknown): boolean {
  if (!isSupabaseLikeError(value)) return false;
  return value.code === "42P01" || value.code === "42501";
}

function buildEvent(
  rawError: unknown,
  source: string,
  context: Record<string, unknown> = {}
): ClientErrorEvent {
  const error =
    rawError instanceof Error ? rawError : new Error(String(rawError));
  const now = new Date().toISOString();

  return {
    id: `err_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
    source,
    message: error.message,
    stack: error.stack,
    createdAt: now,
    path:
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/",
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    context,
  };
}

function readLocalClientErrors(): ClientErrorEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(LOCAL_ERROR_LOG_KEY) || "[]"
    ) as ClientErrorEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalClientErrors(events: ClientErrorEvent[]): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(LOCAL_ERROR_LOG_KEY, JSON.stringify(events));
}

function appendLocalError(event: ClientErrorEvent): void {
  const current = readLocalClientErrors();
  const next = [event, ...current].slice(0, MAX_LOCAL_ERRORS);
  writeLocalClientErrors(next);
}

async function sendErrorToSupabase(event: ClientErrorEvent): Promise<void> {
  if (!isSupabaseConfigured) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("client_error_events").insert({
    user_id: user.id,
    source: event.source,
    message: event.message,
    stack: event.stack,
    path: event.path,
    user_agent: event.userAgent,
    context: event.context,
    created_at: event.createdAt,
  });

  if (error) throw error;
}

export function getLocalClientErrors(): ClientErrorEvent[] {
  return readLocalClientErrors();
}

export async function reportClientError(
  rawError: unknown,
  source = "runtime",
  context: Record<string, unknown> = {}
): Promise<void> {
  const event = buildEvent(rawError, source, context);
  appendLocalError(event);

  console.error("[FitLife][ClientError]", {
    source: event.source,
    message: event.message,
    context: event.context,
  });

  try {
    await sendErrorToSupabase(event);
  } catch (error) {
    if (!isIgnorableError(error)) {
      console.warn("Falha ao enviar erro para observabilidade:", error);
    }
  }
}

export function installGlobalErrorHandlers(): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onWindowError = (event: ErrorEvent) => {
    void reportClientError(
      event.error || new Error(event.message),
      "window.error",
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    void reportClientError(
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason)),
      "window.unhandledrejection"
    );
  };

  window.addEventListener("error", onWindowError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  return () => {
    window.removeEventListener("error", onWindowError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
}
