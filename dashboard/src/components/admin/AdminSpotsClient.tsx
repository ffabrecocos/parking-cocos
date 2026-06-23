"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  adminMarkSpot,
  adminReleaseSpot,
  adminUpdateOccupancy,
  deleteSpot,
  resetDay,
  upsertSpot,
} from "@/app/actions/admin";
import {
  isAdminMarkedOccupancy,
  occupancyDisplayName,
  occupancyDisplayPlate,
} from "@/lib/occupancy-display";
import type { AdminSpotRow, AdminSpotUserOption } from "@/types/database";

type Props = {
  initialSpots: AdminSpotRow[];
  users: AdminSpotUserOption[];
};

export function AdminSpotsClient({ initialSpots, users }: Props) {
  const router = useRouter();
  const [spots, setSpots] = useState(initialSpots);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [floor, setFloor] = useState("1");
  const [spotNumber, setSpotNumber] = useState("");
  const [occupantUserId, setOccupantUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayPlate, setDisplayPlate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editingSpot = spots.find((s) => s.id === editId) ?? null;
  const editingOcc = editingSpot?.active_occupancy ?? null;

  useEffect(() => setSpots(initialSpots), [initialSpots]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-spots")
      .on("postgres_changes", { event: "*", schema: "public", table: "occupancies" }, () =>
        router.refresh()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "parking_spots" }, () =>
        router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const floors = [...new Set(spots.map((s) => s.floor))].sort((a, b) => a - b);

  function resetOccupancyFields(occ: AdminSpotRow["active_occupancy"]) {
    setOccupantUserId(occ?.user_id ?? "");
    setDisplayName(occ?.display_name ?? "");
    setDisplayPlate(occ?.display_plate ?? "");
  }

  function startEdit(spot: AdminSpotRow) {
    setCreating(false);
    setEditId(spot.id);
    setFloor(String(spot.floor));
    setSpotNumber(String(spot.spot_number));
    resetOccupancyFields(spot.active_occupancy);
    setError(null);
  }

  function startCreate() {
    setEditId(null);
    setCreating(true);
    setFloor("1");
    setSpotNumber("");
    resetOccupancyFields(null);
    setError(null);
  }

  function cancelForm() {
    setEditId(null);
    setCreating(false);
    setError(null);
  }

  function handleSaveSpot() {
    const f = parseInt(floor, 10);
    const n = parseInt(spotNumber, 10);
    if (!f || !n) {
      setError("Piso y número requeridos");
      return;
    }

    startTransition(async () => {
      const result = await upsertSpot({
        id: editId ?? undefined,
        floor: f,
        spot_number: n,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (creating) {
        cancelForm();
      }
      router.refresh();
    });
  }

  function handleMarkOrUpdateOccupancy() {
    if (!editId) return;

    startTransition(async () => {
      const payload = {
        spotId: editId,
        userId: occupantUserId || null,
        displayName,
        displayPlate,
      };

      const result = editingOcc?.marked_by_admin
        ? await adminUpdateOccupancy(payload)
        : await adminMarkSpot(payload);

      if (result.error) {
        setError(result.error);
        return;
      }
      cancelForm();
      router.refresh();
    });
  }

  function handleRelease(spotId: string) {
    startTransition(async () => {
      const result = await adminReleaseSpot(spotId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete(spotId: string) {
    if (!confirm("¿Eliminar esta cochera?")) return;
    startTransition(async () => {
      const result = await deleteSpot(spotId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleResetDay() {
    if (!confirm("¿Resetear todas las cocheras del día?")) return;
    startTransition(async () => {
      const result = await resetDay();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <>
      <div className="admin-toolbar">
        <button
          type="button"
          className="btn btn--cocos admin-toolbar__cta"
          onClick={handleResetDay}
          disabled={pending}
        >
          Reset del día
        </button>
        <button type="button" className="btn btn--text btn--sm" onClick={startCreate}>
          + Nueva cochera
        </button>
      </div>

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: 12 }}>{error}</p>
      )}

      {(creating || editId) && (
        <div className="panel">
          <div className="panel__title">
            {creating ? "Nueva cochera" : `Editar cochera · Piso ${editingSpot?.floor} N° ${editingSpot?.spot_number}`}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ flex: "1 1 120px", marginBottom: 0 }}>
              <label htmlFor="floor">Piso</label>
              <input
                id="floor"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                type="number"
                min={1}
              />
            </div>
            <div className="field" style={{ flex: "1 1 120px", marginBottom: 0 }}>
              <label htmlFor="spot_number">N°</label>
              <input
                id="spot_number"
                value={spotNumber}
                onChange={(e) => setSpotNumber(e.target.value)}
                type="number"
                min={1}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" className="btn btn--cocos btn--sm" onClick={handleSaveSpot} disabled={pending}>
              Guardar cochera
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={cancelForm}>
              Cancelar
            </button>
          </div>

          {editId && !creating && (
            <div className="panel__section">
              <div className="panel__subtitle">Ocupación</div>

              {editingOcc && !editingOcc.marked_by_admin ? (
                <p className="panel__hint">
                  Ocupada por <strong>{occupancyDisplayName(editingOcc)}</strong>. Usá{" "}
                  <strong>Liberar</strong> en la tabla para liberarla.
                </p>
              ) : (
                <>
                  <p className="panel__hint">
                    Marcá la cochera como ocupada. Si no elegís usuario ni nombre, se mostrará como{" "}
                    <strong>Marcada por admin</strong>.
                  </p>

                  <div className="field">
                    <label htmlFor="occupant_user">Usuario (opcional)</label>
                    <select
                      id="occupant_user"
                      value={occupantUserId}
                      onChange={(e) => setOccupantUserId(e.target.value)}
                    >
                      <option value="">Sin usuario</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name ?? user.email ?? user.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div className="field" style={{ flex: "1 1 180px", marginBottom: 0 }}>
                      <label htmlFor="display_name">Nombre (opcional)</label>
                      <input
                        id="display_name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Marcada por admin"
                      />
                    </div>
                    <div className="field" style={{ flex: "1 1 120px", marginBottom: 0 }}>
                      <label htmlFor="display_plate">Patente (opcional)</label>
                      <input
                        id="display_plate"
                        value={displayPlate}
                        onChange={(e) => setDisplayPlate(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btn--cocos btn--sm"
                      onClick={handleMarkOrUpdateOccupancy}
                      disabled={pending}
                    >
                      {editingOcc?.marked_by_admin ? "Guardar ocupación" : "Marcar ocupada"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="admin-sections-grid">
        {floors.map((floorNum) => {
          const floorSpots = spots.filter((s) => s.floor === floorNum);
          return (
            <section key={floorNum} className="admin-section">
              <h2 className="admin-section__title">Piso {floorNum}</h2>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Estado</th>
                      <th>Usuario</th>
                      <th>Patente</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {floorSpots.map((spot) => {
                      const occ = spot.active_occupancy;
                      const adminMarked = occ ? isAdminMarkedOccupancy(occ) : false;
                      return (
                        <tr key={spot.id}>
                          <td>{spot.spot_number}</td>
                          <td>
                            {occ ? (
                              <span className={`tag ${adminMarked ? "tag--admin" : "tag--gray"}`}>
                                {adminMarked ? "Admin" : "Ocupada"}
                              </span>
                            ) : (
                              <span className="tag tag--green">Libre</span>
                            )}
                          </td>
                          <td>{occ ? occupancyDisplayName(occ) : "—"}</td>
                          <td>{occ ? occupancyDisplayPlate(occ) : "—"}</td>
                          <td>
                            <div className="row-actions">
                              {occ && (
                                <>
                                  <button
                                    type="button"
                                    className="action-link"
                                    onClick={() => handleRelease(spot.id)}
                                  >
                                    Liberar
                                  </button>
                                  <span className="row-actions__sep" aria-hidden>
                                    ·
                                  </span>
                                </>
                              )}
                              <button type="button" className="action-link" onClick={() => startEdit(spot)}>
                                Editar
                              </button>
                              {!occ && (
                                <>
                                  <span className="row-actions__sep" aria-hidden>
                                    ·
                                  </span>
                                  <button
                                    type="button"
                                    className="action-link action-link--muted"
                                    onClick={() => handleDelete(spot.id)}
                                  >
                                    Eliminar
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
