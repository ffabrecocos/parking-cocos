"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/profile";

export function OnboardingForm({
  initialName,
  initialPlates,
}: {
  initialName: string;
  initialPlates: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [plateInput, setPlateInput] = useState("");
  const [plates, setPlates] = useState<string[]>(initialPlates);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addPlate() {
    const value = plateInput.trim().toUpperCase();
    if (!value || plates.includes(value)) return;
    setPlates([...plates, value]);
    setPlateInput("");
  }

  function removePlate(plate: string) {
    setPlates(plates.filter((p) => p !== plate));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateProfile(name, plates);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="full_name">Nombre y apellido</label>
        <input
          id="full_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Juan Pérez"
          autoComplete="name"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="plate">Patentes</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="plate"
            value={plateInput}
            onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
            placeholder="ABC123"
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
        <p className="field__hint">Enter para agregar otra patente</p>
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

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: 12 }}>{error}</p>
      )}

      <button type="submit" className="btn btn--cocos" disabled={pending}>
        {pending ? "Guardando…" : "Continuar"}
      </button>
    </form>
  );
}
