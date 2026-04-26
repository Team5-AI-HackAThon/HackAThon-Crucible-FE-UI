import type { SupabaseClient } from "@supabase/supabase-js";

export type InboxThreadMessage = {
  id?: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  sender_role?: string;
};

export type InboxPreview = {
  conversationId: string;
  counterpartyName: string;
  projectLabel: string | null;
  /** When this thread is tied to a project, richer card-style context for the expanded view. */
  threadProjectSummary: { title: string; detail: string } | null;
  preview: string;
  timeLabel: string;
  unread: boolean;
  avatarLetter: string;
  /** Populated from `conversations.chat_json` when present, otherwise from `messages`. */
  threadMessages: InboxThreadMessage[];
};

function profileLabel(full_name: string | null, email: string | null): string {
  const n = full_name?.trim();
  if (n) return n;
  if (email) return email.split("@")[0] ?? "?";
  return "?";
}

type ProjectRow = {
  id: string;
  name: string;
  metadata: Record<string, unknown> | null;
  project_stages: { name: string } | null | { name: string }[];
};

function stageLineFromProject(p: ProjectRow): string {
  const st = p.project_stages;
  const row = Array.isArray(st) ? st[0] : st;
  if (row?.name?.trim()) return row.name.trim();
  const meta = p.metadata;
  const m = meta && typeof meta.stage === "string" ? meta.stage.trim() : "";
  return m || "—";
}

function raiseLineFromMeta(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "—";
  const keys = ["raise", "funding", "round_size", "raise_label"] as const;
  for (const k of keys) {
    const v = metadata[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return `$${v}M`;
  }
  return "—";
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 0) return "now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function parseChatJsonMessages(raw: unknown): InboxThreadMessage[] {
  if (raw == null || typeof raw !== "object") return [];
  const messages = (raw as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return [];
  const out: InboxThreadMessage[] = [];
  for (const item of messages) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const sender_id = typeof o.sender_id === "string" ? o.sender_id : "";
    const body = typeof o.body === "string" ? o.body : "";
    const created_at = typeof o.created_at === "string" ? o.created_at : "";
    if (!sender_id || !body || !created_at) continue;
    const read_at =
      o.read_at === null || o.read_at === undefined
        ? null
        : typeof o.read_at === "string"
          ? o.read_at
          : null;
    const id = typeof o.id === "string" ? o.id : undefined;
    const sender_role = typeof o.sender_role === "string" ? o.sender_role : undefined;
    out.push({ id, sender_id, body, created_at, read_at, sender_role });
  }
  return out;
}

function threadMessageDedupeKey(m: InboxThreadMessage): string {
  const id = m.id?.trim();
  if (id) return `id:${id}`;
  return `${m.sender_id}|${m.created_at}|${m.body}`;
}

/** Prefer DB messages when both exist (e.g. demo `chat_json` + live sends); merge and sort by time. */
function mergeJsonAndDbThreadMessages(
  jsonMsgs: InboxThreadMessage[],
  dbMsgs: InboxThreadMessage[],
): InboxThreadMessage[] {
  if (jsonMsgs.length === 0) return dbMsgs;
  if (dbMsgs.length === 0) return jsonMsgs;
  const seen = new Set<string>();
  const merged: InboxThreadMessage[] = [];
  for (const m of jsonMsgs) {
    const k = threadMessageDedupeKey(m);
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(m);
    }
  }
  for (const m of dbMsgs) {
    const k = threadMessageDedupeKey(m);
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(m);
    }
  }
  merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return merged;
}

/** Conversations the user participates in, with last message preview and counterparty display name. */
export async function fetchInboxPreviews(supabase: SupabaseClient, userId: string): Promise<InboxPreview[]> {
  const { data: convs, error: e1 } = await supabase
    .from("conversations")
    .select("id, founder_id, vc_id, project_id, last_message_at, created_at, chat_json")
    .or(`founder_id.eq.${userId},vc_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (e1) throw e1;
  if (!convs?.length) return [];

  const convIds = convs.map((c) => c.id);
  const projectIds = [...new Set(convs.map((c) => c.project_id).filter(Boolean))] as string[];
  const otherIds = [...new Set(convs.map((c) => (c.founder_id === userId ? c.vc_id : c.founder_id)))];

  const { data: profiles, error: ep } = await supabase.from("profiles").select("id, full_name, email").in("id", otherIds);
  if (ep) throw ep;
  /** Without `profiles_select_messaging_partners` RLS, this may be empty — still return threads. */
  const profileRows = profiles ?? [];

  let projects: ProjectRow[] = [];
  if (projectIds.length > 0) {
    const { data: pr, error: epr } = await supabase
      .from("projects")
      .select("id, name, metadata, project_stages ( name )")
      .in("id", projectIds);
    if (epr) throw epr;
    projects = (pr ?? []) as ProjectRow[];
  }

  const { data: msgs, error: em } = await supabase
    .from("messages")
    .select("id, conversation_id, body, created_at, sender_id, read_at")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: true });
  if (em) throw em;

  const profileMap = new Map(profileRows.map((p) => [p.id, p]));
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));
  const projectSummaryMap = new Map(
    projects.map((p) => {
      const detail = [stageLineFromProject(p), raiseLineFromMeta(p.metadata)].join(" · ");
      return [p.id, { title: p.name, detail }] as const;
    }),
  );

  const messagesByConv = new Map<string, InboxThreadMessage[]>();
  for (const m of msgs ?? []) {
    const arr = messagesByConv.get(m.conversation_id) ?? [];
    arr.push({
      id: typeof m.id === "string" ? m.id : undefined,
      sender_id: m.sender_id,
      body: m.body,
      created_at: m.created_at,
      read_at: m.read_at,
    });
    messagesByConv.set(m.conversation_id, arr);
  }

  return convs.map((c) => {
    const otherId = c.founder_id === userId ? c.vc_id : c.founder_id;
    const p = profileMap.get(otherId);
    const counterpartyName = p ? profileLabel(p.full_name, p.email) : "Unknown";
    const projectName = c.project_id ? projectMap.get(c.project_id) : null;
    const threadProjectSummary = c.project_id ? projectSummaryMap.get(c.project_id) ?? null : null;
    const fromJson = parseChatJsonMessages(c.chat_json);
    const fromDb = messagesByConv.get(c.id) ?? [];
    const threadMessages = mergeJsonAndDbThreadMessages(fromJson, fromDb);
    const last = threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : null;
    const preview = last?.body ?? "No messages yet";
    const ts = last?.created_at ?? c.last_message_at ?? c.created_at;
    const unread = Boolean(last && last.sender_id !== userId && last.read_at == null);
    const letter = counterpartyName.charAt(0).toUpperCase();
    return {
      conversationId: c.id,
      counterpartyName,
      projectLabel: projectName ?? null,
      threadProjectSummary,
      preview,
      timeLabel: formatRelative(ts),
      unread,
      avatarLetter: letter,
      threadMessages,
    };
  });
}
