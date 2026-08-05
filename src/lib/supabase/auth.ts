import { cache } from "react";
import { createClient } from "./server";
import type { Profile } from "@/types/database";

/**
 * Deduped per-request: layout.tsx and page.tsx both need the authed user,
 * but React's cache() ensures this only hits Supabase once per request
 * instead of once per component.
 */
export const getAuthedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getAuthedProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single();
  return data as Pick<Profile, "full_name" | "role"> | null;
});
