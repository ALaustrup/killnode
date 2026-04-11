import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { NeuralLogo } from "@/components/neural-logo";
import { Button } from "@/components/ui/button";
import { AdminLogoutButton } from "@/components/admin-logout-button";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await getSession();
  if (!ok) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="flex items-center justify-between border-b border-neon-red/20 px-4 py-3 md:px-6">
        <Link href="/admin" className="flex items-center gap-2 font-display text-sm tracking-widest">
          <NeuralLogo className="h-8 w-8" />
          <span>
            ADMIN <span className="text-neon-red">{"//"}</span>
          </span>
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Site</Link>
          </Button>
          <AdminLogoutButton />
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">{children}</div>
    </div>
  );
}
