"use client";

import { useEffect } from "react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-10">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="card relative w-full max-w-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost !px-2"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
