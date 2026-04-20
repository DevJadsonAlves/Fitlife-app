import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface AuditEventInput {
  action: string;
  scope?: string;
  metadata?: Record<string, unknown>;
}

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

function isSupabaseLikeError(value: unknown): value is SupabaseLikeError {
  return Boolean(value && typeof value === "object");
}

function isIgnorableAuditError(value: unknown): boolean {
  if (!isSupabaseLikeError(value)) return false;

  // 42P01 = relation does not exist (table not created yet)
  // 42501 = permission denied (RLS/policy missing)
  return value.code === "42P01" || value.code === "42501";
}

export async function logAuditEvent({
  action,
  scope = "app",
  metadata = {},
}: AuditEventInput): Promise<void> {
  if (!isSupabaseConfigured || !action.trim()) return;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("audit_events").insert({
      user_id: user.id,
      action,
      scope,
      metadata,
    });

    if (error) throw error;
  } catch (error) {
    if (!isIgnorableAuditError(error)) {
      console.warn("Falha ao registrar evento de auditoria:", error);
    }
  }
}
