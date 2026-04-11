"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { NeuralLogo } from "@/components/neural-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/admin";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Login failed");
        return;
      }
      router.replace(from.startsWith("/admin") ? from : "/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-2 text-center">
        <NeuralLogo className="h-16 w-16" />
        <span className="font-display text-sm tracking-[0.2em] text-muted-foreground">KILLNODE</span>
      </Link>
      <Card className="w-full max-w-md border-neon-red/30">
        <CardHeader>
          <CardTitle className="font-display text-neon-cyan">Operator login</CardTitle>
          <CardDescription>Restricted area. Authorized use only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Username</Label>
              <Input
                id="user"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass">Password</Label>
              <Input
                id="pass"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-neon-red">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Authenticating…" : "Enter console"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-8 max-w-md text-center text-xs text-muted-foreground">
        Default demo: <code className="text-neon-cyan">admin</code> /{" "}
        <code className="text-neon-red">killnode2026</code> — override with{" "}
        <code className="font-mono">ADMIN_USERNAME</code> and{" "}
        <code className="font-mono">ADMIN_PASSWORD</code>.
      </p>
    </main>
  );
}
