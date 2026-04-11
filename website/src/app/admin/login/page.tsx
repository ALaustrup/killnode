import { Suspense } from "react";
import { AdminLoginClient } from "./admin-login-client";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black text-sm text-muted-foreground">
          Loading…
        </main>
      }
    >
      <AdminLoginClient />
    </Suspense>
  );
}
