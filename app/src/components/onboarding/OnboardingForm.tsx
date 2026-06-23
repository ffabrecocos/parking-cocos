"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/profile";

const MIN_PLATE_LENGTH = 6;

function normalizePlate(value: string) {
  return value.trim().toUpperCase();
}

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

  const normalizedInput = normalizePlate(plateInput);
  const inputIsValid = normalizedInput.length >= MIN_PLATE_LENGTH;
  const canProceed = name.trim().length > 0 && (plates.length > 0 || inputIsValid);

  function platesForSubmit() {
    if (inputIsValid && !plates.includes(normalizedInput)) {
      return [...plates, normalizedInput];
    }
    return plates;
  }

  function addAnotherPlate() {
    if (!inputIsValid || plates.includes(normalizedInput)) {
      return;
    }
    setPlates([...plates, normalizedInput]);
    setPlateInput("");
    setError(null);
  }

  function removePlate(plate: string) {
    setPlates(plates.filter((p) => p !== plate));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canProceed) return;

    const finalPlates = platesForSubmit();
    if (finalPlates.length === 0) {
      setError("Ingresá una patente de al menos 6 caracteres");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateProfile(name, finalPlates);
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
        <label htmlFor="plate">Patente</label>
        <input
          id="plate"
          value={plateInput}
          onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
          placeholder="ABC123"
          autoComplete="off"
        />
        <p className="field__hint">Mínimo 6 caracteres</p>
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
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          style={{ marginTop: 12, width: "auto" }}
          onClick={addAnotherPlate}
          disabled={!inputIsValid || plates.includes(normalizedInput)}
        >
          Agregar otra patente
        </button>
      </div>

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: 12 }}>{error}</p>
      )}

      <button type="submit" className="btn btn--cocos" disabled={pending || !canProceed}>
        {pending ? "Guardando…" : "Continuar"}
      </button>
    </form>
  );
}
