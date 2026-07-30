"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createProperty,
  updateProperty,
  archiveProperty,
  createEnvironment,
  renameEnvironment,
  deleteEnvironment,
} from "@/lib/actions/properties";
import type { Environment, Property } from "@/lib/types";

export function PropertiesClient({
  properties,
  environments,
  canWrite,
}: {
  properties: Property[];
  environments: Environment[];
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [addingEnvTo, setAddingEnvTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function envsFor(propertyId: string) {
    return environments.filter((e) => e.property_id === propertyId);
  }

  function runAction(fn: () => Promise<{ error: string | null }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.error) {
          setError(result.error);
          return;
        }
        onDone?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  }

  return (
    <div>
      {canWrite && (
        <div className="mb-4">
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Nueva propiedad
          </button>
        </div>
      )}

      {properties.length === 0 ? (
        <EmptyState
          title="Aún no tienes propiedades"
          description="Registra tu primera propiedad familiar para empezar a llevar el control."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <div key={property.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--color-ink)]">
                    {property.name}
                  </h3>
                  {property.address && (
                    <p className="text-xs text-[var(--color-muted)]">
                      {property.address}
                    </p>
                  )}
                  {!property.is_active && (
                    <span className="badge mt-1 bg-[var(--color-subtle)] text-[var(--color-muted)]">
                      Archivada
                    </span>
                  )}
                </div>
                {canWrite && (
                  <button
                    className="btn-ghost !px-2 text-xs"
                    onClick={() => setEditing(property)}
                  >
                    Editar
                  </button>
                )}
              </div>

              <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-muted)]">
                    Ambientes
                  </span>
                  {canWrite && (
                    <button
                      className="text-xs font-medium text-[var(--color-accent)]"
                      onClick={() => setAddingEnvTo(property.id)}
                    >
                      + Agregar
                    </button>
                  )}
                </div>
                {envsFor(property.id).length === 0 ? (
                  <p className="text-xs text-[var(--color-muted)]">Sin ambientes.</p>
                ) : (
                  <ul className="space-y-1">
                    {envsFor(property.id).map((env) => (
                      <EnvironmentRow
                        key={env.id}
                        environment={env}
                        canWrite={canWrite}
                        onRename={(name) =>
                          runAction(() => renameEnvironment(env.id, name))
                        }
                        onDelete={() =>
                          runAction(() => deleteEnvironment(env.id))
                        }
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {creating && (
        <Modal title="Nueva propiedad" onClose={() => setCreating(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              runAction(() => createProperty(fd), () => setCreating(false));
            }}
          >
            <div>
              <label className="label">Nombre</label>
              <input className="input" name="name" required placeholder="Casa Playa" />
            </div>
            <div>
              <label className="label">Dirección (opcional)</label>
              <input className="input" name="address" />
            </div>
            <button className="btn-primary w-full" disabled={pending}>
              Guardar
            </button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Editar propiedad" onClose={() => setEditing(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              runAction(
                () => updateProperty(editing.id, fd),
                () => setEditing(null)
              );
            }}
          >
            <div>
              <label className="label">Nombre</label>
              <input className="input" name="name" required defaultValue={editing.name} />
            </div>
            <div>
              <label className="label">Dirección (opcional)</label>
              <input className="input" name="address" defaultValue={editing.address ?? ""} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={pending}>
                Guardar
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={pending}
                onClick={() =>
                  runAction(
                    () => archiveProperty(editing.id, !editing.is_active),
                    () => setEditing(null)
                  )
                }
              >
                {editing.is_active ? "Archivar" : "Reactivar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {addingEnvTo && (
        <Modal title="Nuevo ambiente" onClose={() => setAddingEnvTo(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              runAction(
                () => createEnvironment(addingEnvTo, fd),
                () => setAddingEnvTo(null)
              );
            }}
          >
            <div>
              <label className="label">Nombre</label>
              <input
                className="input"
                name="name"
                required
                placeholder="Suite, Habitación A…"
              />
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

function EnvironmentRow({
  environment,
  canWrite,
  onRename,
  onDelete,
}: {
  environment: Environment;
  canWrite: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(environment.name);

  if (editingName) {
    return (
      <li className="flex items-center gap-1">
        <input
          className="input py-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <button
          className="text-xs font-medium text-[var(--color-accent)]"
          onClick={() => {
            onRename(name);
            setEditingName(false);
          }}
        >
          OK
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between text-sm">
      <span>{environment.name}</span>
      {canWrite && (
        <span className="flex gap-2 text-xs text-[var(--color-muted)]">
          <button onClick={() => setEditingName(true)}>Renombrar</button>
          <button onClick={onDelete} className="text-[var(--color-danger)]">
            Eliminar
          </button>
        </span>
      )}
    </li>
  );
}
