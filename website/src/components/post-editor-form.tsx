"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { BlogPost } from "@/lib/posts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props =
  | { mode: "create"; initial?: undefined }
  | { mode: "edit"; initial: BlogPost };

export function PostEditorForm(props: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(props.initial?.title ?? "");
  const [slug, setSlug] = useState(props.initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(props.initial?.excerpt ?? "");
  const [content, setContent] = useState(props.initial?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (props.mode === "create") {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title,
            excerpt,
            content,
            ...(slug.trim() ? { slug: slug.trim() } : {}),
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(j.error || "Save failed");
          return;
        }
        router.replace("/admin");
        router.refresh();
        return;
      }
      const res = await fetch(`/api/posts/${encodeURIComponent(props.initial.slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          excerpt,
          content,
          slug: slug.trim() || props.initial.slug,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || "Save failed");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (props.mode !== "edit") return;
    if (!confirm("Delete this post permanently?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(props.initial.slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Delete failed");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug (optional)</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="auto from title if empty on create"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={14}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Lightweight markup: separate paragraphs with a blank line; use **bold** for emphasis; lines starting
          with &gt; for quotes.
        </p>
      </div>
      {error && <p className="text-sm text-neon-red">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </Button>
        {props.mode === "edit" && (
          <Button type="button" variant="destructive" disabled={loading} onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
