"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  adminReleaseSpot,
  deleteSpot,
  resetDay,
  upsertSpot,
} from "@/app/actions/admin";
import type { AdminSpotRow } from "@/types/database";

export function AdminSpotsClient({ initialSpots }: { initialSpots: AdminSpotRow[] }) {
  const router = useRouter();
  const [spots, setSpots] = useState(initialSpots);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [floor, setFloor] = useState("1");
  const [spotNumber, setSpotNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  function startEdit(spot: AdminSpotRow) {
    setCreating(false);
    setEditId(spot.id);
    setFloor(String(spot.floor));
    setSpotNumber(String(spot.spot_number));
    setError(null);
  }

  function startCreate() {
    setEditId(null);
    setCreating(true);
    setFloor("1");
    setSpotNumber("");
    setError(null);
  }

  function cancelForm() {
    setEditId(null);
    setCreating(false);
    setError(null);
  }

  function handleSave() {
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
          <div className="panel__title">{editId ? "Editar cochera" : "Nueva cochera"}</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ flex: "1 1 120px", marginBottom: 0 }}>
              <label htmlFor="floor">Piso</label>
              <input id="floor" value={floor} onChange={(e) => setFloor(e.target.value)} type="number" min={1} />
            </div>
            <div className="field" style={{ flex: "1 1 120px", marginBottom: 0 }}>
              <label htmlFor="spot_number">N°</label>
              <input id="spot_number" value={spotNumber} onChange={(e) => setSpotNumber(e.target.value)} type="number" min={1} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="button" className="btn btn--cocos btn--sm" onClick={handleSave} disabled={pending}>
              Guardar
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={cancelForm}>
              Cancelar
            </button>
          </div>
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
                    const plate = occ?.profile?.license_plates?.[0] ?? "—";
                    return (
                      <tr key={spot.id}>
                        <td>{spot.spot_number}</td>
                        <td>
                          {occ ? (
                            <span className="tag tag--gray">Ocupada</span>
                          ) : (
                            <span className="tag tag--green">Libre</span>
                          )}
                        </td>
                        <td>{occ?.profile?.full_name ?? "—"}</td>
                        <td>{plate}</td>
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
