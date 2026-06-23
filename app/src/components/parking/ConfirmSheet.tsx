"use client";

type Props = {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  confirmVariant = "primary",
  pending,
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop open"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-sheet">
        <div className="modal-sheet__handle" />
        <h2 className="modal-sheet__title">{title}</h2>
        <p className="modal-sheet__body">{body}</p>
        <div className="modal-sheet__actions">
          <button
            type="button"
            className={`btn ${confirmVariant === "danger" ? "btn--danger" : "btn--cocos"}`}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "…" : confirmLabel}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
