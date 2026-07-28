import { createBrowserClient } from "@supabase/ssr";

// Note: we intentionally don't pass the Database generic here. Our
// hand-written types (src/lib/types.ts) don't include the Relationships
// metadata postgrest-js needs to type-check `.select()` strings, which
// made every query resolve to `never`. Query results are cast to our
// domain types at the call site instead (see e.g. `as Property[]`).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
