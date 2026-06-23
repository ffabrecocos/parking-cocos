"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserProfile } from "@/app/actions/admin";
import type { AdminUserRow } from "@/types/database";

export function AdminUsersClient({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [plateInput, setPlateInput] = useState("");
  const [plates, setPlates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setUsers(initialUsers), [initialUsers]);

  function startEdit(user: AdminUserRow) {
    setEditId(user.id);
    setName(user.full_name ?? "");
    setPlates(user.license_plates ?? []);
    setPlateInput("");
    setError(null);
  }

  function cancelEdit() {
    setEditId(null);
    setError(null);
  }

  function addPlate() {
    const value = plateInput.trim().toUpperCase();
    if (!value || plates.includes(value)) return;
    setPlates([...plates, value]);
    setPlateInput("");
  }

  function removePlate(plate: string) {
    setPlates(plates.filter((p) => p !== plate));
  }

  function handleSave() {
    if (!editId) return;
    startTransition(async () => {
      const result = await updateUserProfile(editId, name, plates);
      if (result.error) {
        setError(result.error);
        return;
      }
      cancelEdit();
      router.refresh();
    });
  }

  const editingUser = users.find((u) => u.id === editId);

  return (
    <>
      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: 12 }}>{error}</p>
      )}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Patentes</th>
              <th>Cochera</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.full_name ?? "—"}</td>
                <td>{user.email ?? "—"}</td>
                <td>{user.license_plates?.join(", ") || "—"}</td>
                <td>
                  {user.active_spot
                    ? `Piso ${user.active_spot.floor} · N° ${user.active_spot.spot_number}`
                    : "—"}
                </td>
                <td>
                  <button type="button" className="action-link" onClick={() => startEdit(user)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="panel">
          <div className="panel__title">Editar usuario</div>
          <div className="field">
            <label>Email (solo lectura)</label>
            <input value={editingUser.email ?? ""} readOnly disabled />
          </div>
          <div className="field">
            <label htmlFor="user_name">Nombre</label>
            <input id="user_name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="user_plate">Patentes</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="user_plate"
                value={plateInput}
                onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPlate();
                  }
                }}
              />
              <button type="button" className="btn btn--ghost btn--sm" onClick={addPlate}>
                Agregar
              </button>
            </div>
            {plates.length > 0 && (
              <div className="chips">
                {plates.map((plate) => (
                  <span key={plate} className="chip">
                    {plate}
                    <button type="button" onClick={() => removePlate(plate)} aria-label={`Quitar ${plate}`}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn--cocos btn--sm" onClick={handleSave} disabled={pending}>
              Guardar
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={cancelEdit}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
