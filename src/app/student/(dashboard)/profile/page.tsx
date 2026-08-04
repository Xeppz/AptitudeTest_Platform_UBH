import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import { updateFullName } from "./actions";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile | null;

  return (
    <div className="max-w-md">
      <p className="text-2xl font-semibold text-slate-900">Profile</p>
      <p className="mt-1 text-sm text-slate-500">Your account details.</p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <form action={updateFullName} className="flex flex-col gap-4">
          <div>
            <label htmlFor="fullName" className="block text-sm text-slate-700">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              defaultValue={profile?.full_name}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Email</label>
            <p className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              {profile?.email}
            </p>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Role</label>
            <p className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm capitalize text-slate-500">
              {profile?.role}
            </p>
          </div>
          <button
            type="submit"
            className="mt-1 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save changes
          </button>
        </form>
      </div>
    </div>
  );
}
