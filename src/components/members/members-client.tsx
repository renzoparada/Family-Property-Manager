"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/format";
import { inviteMember, updateMemberRole, removeMember } from "@/lib/actions/members";
import type { MemberRole, OrganizationMember } from "@/lib/types";

const ROLE_LABEL: Record<MemberRole, string> = {
  admin: "Administrador",
  socio: "Socio",
  contador: "Contador",
  invitado: "Invitado (solo lectura)",
};

export function MembersClient({
  members,
  currentUserId,
}: {
  members: OrganizationMember[];
  currentUserId: string;
}) {
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runAction(fn: () => Promise<void>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        onDone?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  }

  return (
    <div>
      <div className="mb-4">
        <button className="btn-primary" onClick={() => setInviting(true)}>
          + Agregar miembro
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>WhatsApp</th>
              <th>Rol</th>
              <th>Desde</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.profile?.full_name ?? "—"}</td>
                <td>{m.profile?.email ?? "—"}</td>
                <td>{m.profile?.whatsapp ?? "—"}</td>
                <td>
                  <select
                    className="input py-1"
                    value={m.role}
                    disabled={pending}
                    onChange={(e) =>
                      runAction(() => updateMemberRole(m.id, e.target.value as MemberRole))
                    }
                  >
                    {Object.entries(ROLE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{formatDate(m.created_at)}</td>
                <td>
                  {m.user_id !== currentUserId && (
                    <button
                      className="btn-ghost !px-2 text-xs text-[var(--color-danger)]"
                      disabled={pending}
                      onClick={() => runAction(() => removeMember(m.id))}
                    >
                      Quitar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inviting && (
        <Modal title="Agregar miembro" onClose={() => setInviting(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              runAction(() => inviteMember(fd), () => setInviting(false));
            }}
          >
            <div>
              <label className="label">Correo</label>
              <input className="input" type="email" name="email" required />
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                La persona debe haberse registrado antes en Family Property Manager con este correo.
              </p>
            </div>
            <div>
              <label className="label">Rol</label>
              <select className="input" name="role" defaultValue="socio">
                {Object.entries(ROLE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary w-full" disabled={pending}>
              Agregar
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
