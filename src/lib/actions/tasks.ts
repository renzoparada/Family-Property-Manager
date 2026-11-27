"use server";

import { revalidatePath } from "next/cache";
import { requireWriteContext, str, safeAction, type ActionResult } from "@/lib/actions/util";
import type { TaskPriority, TaskStatus } from "@/lib/types";

export async function createTask(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase, orgId, userId } = await requireWriteContext();

    const title = str(formData.get("title"));
    if (!title) throw new Error("Escribe un título para la tarea.");

    const { error } = await supabase.from("tasks").insert({
      organization_id: orgId,
      property_id: str(formData.get("property_id")),
      title,
      description: str(formData.get("description")),
      status: (str(formData.get("status")) ?? "pendiente") as TaskStatus,
      priority: (str(formData.get("priority")) ?? "media") as TaskPriority,
      assigned_to: str(formData.get("assigned_to")),
      due_date: str(formData.get("due_date")),
      created_by: userId,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/tasks");
    return { error: null };
  });
}

export async function updateTask(taskId: string, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();

    const title = str(formData.get("title"));
    if (!title) throw new Error("Escribe un título para la tarea.");

    const { error } = await supabase
      .from("tasks")
      .update({
        property_id: str(formData.get("property_id")),
        title,
        description: str(formData.get("description")),
        status: (str(formData.get("status")) ?? "pendiente") as TaskStatus,
        priority: (str(formData.get("priority")) ?? "media") as TaskPriority,
        assigned_to: str(formData.get("assigned_to")),
        due_date: str(formData.get("due_date")),
      })
      .eq("id", taskId);
    if (error) throw new Error(error.message);

    revalidatePath("/tasks");
    return { error: null };
  });
}

export async function setTaskStatus(taskId: string, status: TaskStatus): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (error) throw new Error(error.message);
    revalidatePath("/tasks");
    return { error: null };
  });
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  return safeAction(async () => {
    const { supabase } = await requireWriteContext();
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) throw new Error(error.message);
    revalidatePath("/tasks");
    return { error: null };
  });
}
