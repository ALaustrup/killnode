import Link from "next/link";
import { PostEditorForm } from "@/components/post-editor-form";

export default function AdminNewPostPage() {
  return (
    <div>
      <Link href="/admin" className="font-mono text-xs text-neon-cyan hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">New post</h1>
      <PostEditorForm mode="create" />
    </div>
  );
}
