import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";

export default async function Home() {
  const session = await getSessionContext();

  if (!session) redirect("/login");
  if (session.memberships.length === 0) redirect("/onboarding");
  redirect("/dashboard");
}
