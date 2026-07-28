"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Attachment } from "@/lib/types";

export function AttachmentUploader({
  organizationId,
  entityType,
  entityId,
  attachments,
  onChange,
}: {
  organizationId: string;
  entityType: string;
  entityId: string;
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const uploaded: Attachment[] = [];
      for (const file of Array.from(files)) {
        const path = `${organizationId}/${entityType}/${entityId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(path, file);
        if (uploadError) {
          setError(uploadError.message);
          continue;
        }
        const { data, error: insertError } = await supabase
          .from("attachments")
          .insert({
            organization_id: organizationId,
            entity_type: entityType,
            entity_id: entityId,
            file_path: path,
            file_name: file.name,
            file_type: file.type,
            uploaded_by: user?.id,
          })
          .select()
          .single();
        if (insertError) {
          setError(insertError.message);
          continue;
        }
        if (data) uploaded.push(data as Attachment);
      }
      if (uploaded.length) onChange([...attachments, ...uploaded]);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  async function handleRemove(att: Attachment) {
    const supabase = createClient();
    await supabase.storage.from("attachments").remove([att.file_path]);
    await supabase.from("attachments").delete().eq("id", att.id);
    onChange(attachments.filter((a) => a.id !== att.id));
  }

  async function handleView(att: Attachment) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("attachments")
      .createSignedUrl(att.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div>
      <label className="label">Adjuntos (fotos, facturas, comprobantes, PDF)</label>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,video/*,audio/*"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={pending}
        className="input"
      />
      {error && <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>}
      {attachments.length > 0 && (
        <ul className="mt-2 space-y-1">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center justify-between rounded-md bg-[var(--color-subtle)] px-2 py-1 text-xs"
            >
              <button
                type="button"
                onClick={() => handleView(att)}
                className="truncate text-left underline decoration-dotted"
              >
                {att.file_name}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(att)}
                className="ml-2 text-[var(--color-danger)]"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
