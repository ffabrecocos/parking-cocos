"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions/parking";
import { useParkingOffline } from "@/hooks/useParkingOffline";
import type { Profile, SpotWithOccupancy } from "@/types/database";
import { ConfirmSheet } from "@/components/parking/ConfirmSheet";

type Props = {
  userId: string;
  profile: Profile;
  spots: SpotWithOccupancy[];
  mySpot: SpotWithOccupancy | null;
};

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function primaryPlate(profile: Profile | null) {
  return profile?.license_plates?.[0] ?? "—";
}

export function ParkingView({ userId, profile, spots: initialSpots, mySpot: initialMySpot }: Props) {
  const router = useRouter();
  const [spots, setSpots] = useState(initialSpots);
  const [mySpot, setMySpot] = useState(initialMySpot);
  const [sheet, setSheet] = useState<{
    type: "claim" | "release";
    spot: SpotWithOccupancy;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    isOnline,
    isSyncing,
    hasPending,
    syncError,
    displaySpots,
    displayMySpot,
    queueAction,
  } = useParkingOffline({ userId, profile, spots, mySpot });

  const refresh = useCallback(() => router.refresh(), [router]);

  useEffect(() => {
    setSpots(initialSpots);
    setMySpot(initialMySpot);
  }, [initialSpots, initialMySpot]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("parking-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "occupancies" },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parking_spots" },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const floors = [...new Set(displaySpots.map((s) => s.floor))].sort((a, b) => a - b);
  const visibleError = error ?? syncError;

  function handleConfirm() {
    if (!sheet) return;
    setError(null);
    startTransition(async () => {
      const result = await queueAction(sheet.type, sheet.spot.id);

      if (result.offline) {
        setSheet(null);
        return;
      }

      if (result.failure) {
        setError(result.failure.message);
        return;
      }

      setSheet(null);
    });
  }

  return (
    <>
      <header className="parking-header">
        <div className="parking-header__bar">
          <button
            type="button"
            className="avatar"
            onClick={() => signOut().then(() => router.push("/login"))}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            {initials(profile.full_name)}
          </button>
          <div className="parking-header__logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cocos-logo.png" alt="Cocos" className="parking-header__logo" />
          </div>
          <button type="button" className="icon-btn" onClick={refresh} aria-label="Actualizar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </div>
        <h1 className="parking-header__heading">Cocheras</h1>
        <p className="parking-header__sub">Elegí tu lugar al llegar</p>
      </header>

      <main className="parking-body">
        {!isOnline && (
          <div className="sync-banner sync-banner--offline" role="status">
            Sin señal. Tu cochera se guarda en el teléfono y se sincroniza cuando vuelva internet.
          </div>
        )}
        {isOnline && hasPending && (
          <div className="sync-banner sync-banner--pending" role="status">
            {isSyncing
              ? "Sincronizando tu cochera…"
              : "Cochera pendiente de sincronizar. Reintentando automáticamente."}
          </div>
        )}

        {displayMySpot ? (
          <section
            className={`my-spot${hasPending ? " my-spot--pending" : ""}`}
            aria-label="Tu cochera actual"
          >
            <div className="my-spot__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 17h14v-5H5v5zM7 11l2-4h6l2 4" />
                <circle cx="7.5" cy="17" r="1.5" />
                <circle cx="16.5" cy="17" r="1.5" />
              </svg>
            </div>
            <div>
              <div className="my-spot__label">Tu cochera</div>
              <div className="my-spot__value">
                Piso {displayMySpot.floor} · N° {displayMySpot.spot_number}
              </div>
              <div className="my-spot__plate">{primaryPlate(profile)}</div>
              {hasPending && <div className="my-spot__pending">Pendiente de sincronizar</div>}
            </div>
          </section>
        ) : (
          <section className="my-spot my-spot--empty" aria-label="Sin cochera">
            <div className="my-spot__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <div>
              <div className="my-spot__label">Sin cochera</div>
              <div className="my-spot__value">Tocá una disponible para ocupar</div>
            </div>
          </section>
        )}

        {visibleError && (
          <p style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: 12 }}>
            {visibleError}
          </p>
        )}

        {floors.map((floor) => {
          const floorSpots = displaySpots.filter((s) => s.floor === floor);
          const freeCount = floorSpots.filter((s) => !s.active_occupancy).length;

          return (
            <section key={floor} className="floor-section">
              <div className="floor-section__head">
                <h2 className="floor-section__title">Piso {floor}</h2>
                <span className="floor-section__count">
                  {freeCount} libre{freeCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="spot-list">
                {floorSpots.map((spot) => {
                  const occ = spot.active_occupancy;
                  const isMine = occ?.user_id === userId;
                  const isFree = !occ;
                  const isOccupied = !!occ && !isMine;

                  if (isFree) {
                    return (
                      <button
                        key={spot.id}
                        type="button"
                        className="spot-card spot-card--free"
                        onClick={() => setSheet({ type: "claim", spot })}
                      >
                        <SpotCardContent spot={spot} status="free" />
                      </button>
                    );
                  }

                  if (isMine) {
                    return (
                      <button
                        key={spot.id}
                        type="button"
                        className="spot-card spot-card--mine"
                        onClick={() => setSheet({ type: "release", spot })}
                      >
                        <SpotCardContent
                          spot={spot}
                          status="mine"
                          name={profile.full_name}
                          plate={primaryPlate(profile)}
                        />
                      </button>
                    );
                  }

                  return (
                    <article key={spot.id} className="spot-card spot-card--occupied">
                      <SpotCardContent
                        spot={spot}
                        status="occupied"
                        name={occ?.profile?.full_name ?? "Ocupada"}
                        plate={primaryPlate(occ?.profile ?? null)}
                      />
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {sheet && (
        <ConfirmSheet
          open={!!sheet}
          title={sheet.type === "claim" ? "Ocupar cochera" : "Liberar cochera"}
          body={
            sheet.type === "claim" ? (
              <>
                ¿Confirmás la cochera{" "}
                <strong>
                  Piso {sheet.spot.floor} · N° {sheet.spot.spot_number}
                </strong>
                ?
              </>
            ) : (
              <>
                ¿Liberás la cochera{" "}
                <strong>
                  Piso {sheet.spot.floor} · N° {sheet.spot.spot_number}
                </strong>
                ?
              </>
            )
          }
          confirmLabel={sheet.type === "claim" ? "Ocupar" : "Liberar"}
          confirmVariant={sheet.type === "release" ? "danger" : "primary"}
          pending={pending}
          onConfirm={handleConfirm}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

function SpotCardContent({
  spot,
  status,
  name,
  plate,
}: {
  spot: SpotWithOccupancy;
  status: "free" | "occupied" | "mine";
  name?: string | null;
  plate?: string;
}) {
  return (
    <>
      <div className="spot-card__num">{spot.spot_number}</div>
      <div className="spot-card__body">
        {status === "free" && (
          <>
            <div className="spot-card__status spot-card__status--free">Disponible</div>
            <div className="spot-card__empty">Tocá para ocupar</div>
          </>
        )}
        {status === "occupied" && (
          <>
            <div className="spot-card__status spot-card__status--taken">Ocupada</div>
            <div className="spot-card__name">{name}</div>
            <div className="spot-card__plate">{plate}</div>
          </>
        )}
        {status === "mine" && (
          <>
            <div className="spot-card__status spot-card__status--mine">Tu cochera</div>
            <div className="spot-card__name">{name}</div>
            <div className="spot-card__plate">{plate}</div>
          </>
        )}
      </div>
      <div
        className={`spot-card__indicator ${
          status === "free"
            ? "spot-card__indicator--free"
            : status === "mine"
              ? "spot-card__indicator--mine"
              : "spot-card__indicator--on"
        }`}
      >
        {status !== "free" && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    </>
  );
}
