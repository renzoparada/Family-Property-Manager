"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Attachment } from "@/lib/types";

export function useAttachments(entityType: string, entityId: string | undefined) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    if (!entityId) return;
    createClient()
      .from("attachments")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .then(({ data }) => setAttachments((data as Attachment[]) ?? []));
  }, [entityType, entityId]);

  return [attachments, setAttachments] as const;
}
