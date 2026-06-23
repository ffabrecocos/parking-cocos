"use client";

import { signOut } from "@/app/actions/admin";

export function SignOutButton() {
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      style={{ marginTop: 12 }}
      onClick={() => signOut().then(() => window.location.reload())}
    >
      Cerrar sesión
    </button>
  );
}
