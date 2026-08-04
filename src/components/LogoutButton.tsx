import { signOut } from "@/app/(auth)/actions";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
      >
        Log out
      </button>
    </form>
  );
}
