"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/admin";

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
      <nav className="seg-control" style={{ flex: 1, marginBottom: 0 }}>
        <Link href="/spots" className={pathname.startsWith("/spots") ? "active" : ""}>
          Cocheras
        </Link>
        <Link href="/users" className={pathname.startsWith("/users") ? "active" : ""}>
          Usuarios
        </Link>
      </nav>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => signOut().then(() => (window.location.href = "/login"))}
      >
        Salir
      </button>
    </div>
  );
}
