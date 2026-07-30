import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext();

  if (!session) redirect("/login");
  if (session.memberships.length === 0) redirect("/onboarding");

  return (
    <AppShell
      role={session.activeRole}
      memberships={session.memberships}
      activeOrgId={session.activeOrgId}
      userEmail={session.email}
    >
      {children}
    </AppShell>
  );
}
