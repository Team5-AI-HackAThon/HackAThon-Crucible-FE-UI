import type { SupabaseClient } from "@supabase/supabase-js";

export type IndustryRow = { id: string; name: string; slug: string };

export async function fetchIndustries(supabase: SupabaseClient): Promise<IndustryRow[]> {
  const { data, error } = await supabase.from("industries").select("id,name,slug").order("sort_order");
  if (error) {
    console.error("industries", error);
    return [];
  }
  return data ?? [];
}

export async function fetchFounderProject(supabase: SupabaseClient, founderId: string) {
  const { data } = await supabase
    .from("projects")
    .select("id,name,hq_city,one_line_pitch")
    .eq("founder_id", founderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export function founderNeedsOnboarding(project: {
  name: string | null;
  one_line_pitch: string | null;
} | null): boolean {
  if (!project) return true;
  if (!project.name?.trim()) return true;
  if (!project.one_line_pitch?.trim()) return true;
  return false;
}
