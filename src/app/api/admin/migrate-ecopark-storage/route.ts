import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ONE-TIME migration: physically moves the 8 ECOPARK receipt photos from
// the old "Robore" org's storage folder to the new "EcoPark Aguas
// Calientes" org's folder, and updates their attachments rows to match.
// Everything else in this split (organizations, memberships, properties,
// needs, expenses, transactions, accounts) was already migrated via direct
// SQL — only the Storage object move needs live app network access, which
// the admin session running this request already has.
//
// Delete this route after a successful run.

const OLD_ORG = "18eca5c1-6285-4eba-842b-944a1e8c5509";
const NEW_ORG = "88ff1438-f967-4855-8134-b6bdb144e9aa";
const RENZO_USER_ID = "b4f1d81b-bc65-425f-b35c-3210c7197f81";

const FILES: { attachmentId: string; oldPath: string }[] = [
  {
    attachmentId: "f7a2c0c2-5534-4736-8ac1-386054733fc0",
    oldPath: `${OLD_ORG}/expense/15f4f8cc-a894-4894-899d-a01361ba073e/1793832218035-IMG_5961.HEIC`,
  },
  {
    attachmentId: "2f7d027b-6c03-4862-98be-6eaad2d89c86",
    oldPath: `${OLD_ORG}/expense/fcaeb01f-9001-43fa-b477-f223cdebd114/1793832617380-IMG_5962.HEIC`,
  },
  {
    attachmentId: "3b63a260-e9ab-4ce0-8986-9aed9bc199d3",
    oldPath: `${OLD_ORG}/expense/e1fe1e0d-c0aa-4b17-af05-3fd4b8c6fa61/1793832699903-IMG_5962.HEIC`,
  },
  {
    attachmentId: "a4847e03-c40b-4dfb-8386-d1b2dee3dbb7",
    oldPath: `${OLD_ORG}/expense/48c24516-cb71-4e38-b9d6-7997c93c9bf4/1793832773201-IMG_5962.HEIC`,
  },
  {
    attachmentId: "8a90a5d7-49d5-4457-806e-9494c786ec3e",
    oldPath: `${OLD_ORG}/expense/1ca18c86-291d-4824-9e21-68f2afff721e/1793832828875-IMG_5962.HEIC`,
  },
  {
    attachmentId: "02507e0d-7ac2-4565-a7e6-52d6fcc35844",
    oldPath: `${OLD_ORG}/expense/2484e8b3-f783-4f28-9aa9-b859ce6385ff/1793832919982-IMG_5962.HEIC`,
  },
  {
    attachmentId: "fac84c65-c3f7-47e2-a253-bb752148db7c",
    oldPath: `${OLD_ORG}/expense/156a9bad-d66b-4522-9629-acfdde848aef/1793832974387-IMG_5962.HEIC`,
  },
  {
    attachmentId: "e32a9b3e-1a22-4b94-9276-5cc76f97b854",
    oldPath: `${OLD_ORG}/expense/0c791e89-156d-462f-91bc-e1676fd2437e/1793833031189-IMG_5962.HEIC`,
  },
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== RENZO_USER_ID) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const results: { attachmentId: string; oldPath: string; newPath: string; ok: boolean; error?: string }[] = [];

  for (const f of FILES) {
    const newPath = f.oldPath.replace(OLD_ORG, NEW_ORG);
    const { error: moveError } = await supabase.storage.from("attachments").move(f.oldPath, newPath);
    if (moveError) {
      results.push({ ...f, newPath, ok: false, error: moveError.message });
      continue;
    }
    const { error: updateError } = await supabase
      .from("attachments")
      .update({ organization_id: NEW_ORG, file_path: newPath })
      .eq("id", f.attachmentId);
    results.push({ ...f, newPath, ok: !updateError, error: updateError?.message });
  }

  return NextResponse.json({ results });
}
