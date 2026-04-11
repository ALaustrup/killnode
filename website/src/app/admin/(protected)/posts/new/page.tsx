import Link from "next/link";
import { PostEditorForm } from "@/components/post-editor-form";

export const metadata = { title: "New post" };

export default function AdminNewPostPage() {
  return (
    <div>
      <Link href="/admin" className="inline-flex items-center gap-1 font-mono text-xs text-neon-cyan hover:underline">
        ← Dashboard
      </Link>
      <div className="mt-4">
        <h1 className="font-display text-2xl font-bold text-white">New post</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Separate paragraphs with blank lines. Use <code className="font-mono text-neon-cyan/80">**bold**</code>,{" "}
          <code className="font-mono text-neon-cyan/80">`inline code`</code>,{" "}
          <code className="font-mono text-neon-cyan/80">[link](url)</code>,{" "}
          <code className="font-mono text-neon-cyan/80">## Heading</code>.
        </p>
      </div>
      <PostEditorForm mode="create" />
    </div>
  );
}
