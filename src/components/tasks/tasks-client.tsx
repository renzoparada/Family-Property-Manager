"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { formatDate } from "@/lib/format";
import { createTask, updateTask, deleteTask, setTaskStatus } from "@/lib/actions/tasks";
import type { OrganizationMember, Property, Task, TaskPriority, TaskStatus } from "@/lib/types";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "pendiente", label: "Pendientes" },
  { status: "en_proceso", label: "En proceso" },
  { status: "en_obs", label: "En OBS" },
  { status: "finalizado", label: "Finalizados" },
];

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  alta: "bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
  media: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  baja: "bg-[var(--color-muted)]/15 text-[var(--color-muted)]",
};

export function TasksClient({
  tasks,
  properties,
  members,
  canWrite,
}: {
  tasks: Task[];
  properties: Property[];
  members: OrganizationMember[];
  canWrite: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (propertyFilter ? tasks.filter((t) => t.property_id === propertyFilter) : tasks),
    [tasks, propertyFilter]
  );

  function propertyName(id: string | null) {
    return properties.find((p) => p.id === id)?.name ?? null;
  }

  function memberName(id: string | null) {
    const m = members.find((m) => m.user_id === id);
    return m?.profile?.full_name || m?.profile?.email || null;
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

  function moveTask(task: Task, status: TaskStatus) {
    if (status === task.status) return;
    runAction(() => setTaskStatus(task.id, status));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {canWrite && (
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Nueva tarea
          </button>
        )}
        <select className="input !w-auto" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}>
          <option value="">Todas las propiedades</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = filtered.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="min-w-0">
              <h3 className="mb-2 flex items-center justify-between text-sm font-semibold text-[var(--color-ink)]">
                {col.label}
                <span className="text-xs font-normal text-[var(--color-muted)]">{colTasks.length}</span>
              </h3>
              <div className="space-y-2">
                {colTasks.length === 0 && (
                  <p className="rounded-md border border-dashed border-[var(--color-border)] p-3 text-center text-xs text-[var(--color-muted)]">
                    Sin tareas
                  </p>
                )}
                {colTasks.map((t) => (
                  <div key={t.id} className="card min-w-0 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        className="min-w-0 flex-1 text-left font-medium break-words text-[var(--color-ink)]"
                        onClick={() => setEditing(t)}
                      >
                        {t.title}
                      </button>
                      <span className={`badge shrink-0 ${PRIORITY_STYLE[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-[var(--color-muted)]">
                      {propertyName(t.property_id) && <span>{propertyName(t.property_id)}</span>}
                      {memberName(t.assigned_to) && <span>· {memberName(t.assigned_to)}</span>}
                      {t.due_date && <span>· vence {formatDate(t.due_date)}</span>}
                    </div>
                    {canWrite && (
                      <>
                        <label className="mt-2 block text-[10px] uppercase text-[var(--color-muted)]">Mover a</label>
                        <select
                          className="input !h-7 w-full min-w-0 py-0 text-xs"
                          value={t.status}
                          disabled={pending}
                          onChange={(e) => moveTask(t, e.target.value as TaskStatus)}
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.status} value={c.status}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {creating && (
        <TaskForm
          title="Nueva tarea"
          properties={properties}
          members={members}
          onClose={() => setCreating(false)}
          onSubmit={(fd) => runAction(() => createTask(fd), () => setCreating(false))}
          pending={pending}
        />
      )}

      {editing && (
        <TaskForm
          title="Editar tarea"
          properties={properties}
          members={members}
          task={editing}
          onClose={() => setEditing(null)}
          onSubmit={(fd) => runAction(() => updateTask(editing.id, fd), () => setEditing(null))}
          onDelete={canWrite ? () => runAction(() => deleteTask(editing.id), () => setEditing(null)) : undefined}
          pending={pending}
        />
      )}
    </div>
  );
}

function TaskForm({
  title,
  properties,
  members,
  task,
  onClose,
  onSubmit,
  onDelete,
  pending,
}: {
  title: string;
  properties: Property[];
  members: OrganizationMember[];
  task?: Task;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
      >
        <div>
          <label className="label">Título</label>
          <input className="input" name="title" required defaultValue={task?.title ?? ""} placeholder="Ej. Arreglar foco de la entrada" />
        </div>

        <div>
          <label className="label">Descripción (opcional)</label>
          <textarea className="input" name="description" rows={2} defaultValue={task?.description ?? ""} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Propiedad (opcional)</label>
            <select className="input" name="property_id" defaultValue={task?.property_id ?? ""}>
              <option value="">—</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Asignado a</label>
            <select className="input" name="assigned_to" defaultValue={task?.assigned_to ?? ""}>
              <option value="">—</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.profile?.email || "Miembro"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Estado</label>
            <select className="input" name="status" defaultValue={task?.status ?? "pendiente"}>
              {COLUMNS.map((c) => (
                <option key={c.status} value={c.status}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Prioridad</label>
            <select className="input" name="priority" defaultValue={task?.priority ?? "media"}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div>
            <label className="label">Vence (opcional)</label>
            <input className="input" type="date" name="due_date" defaultValue={task?.due_date ?? ""} />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button className="btn-primary flex-1" disabled={pending}>
            Guardar
          </button>
          {onDelete && (
            <button type="button" className="btn-secondary text-[var(--color-danger)]" onClick={onDelete} disabled={pending}>
              Eliminar
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
