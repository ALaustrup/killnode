import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";
import { PostEditorForm } from "@/components/post-editor-form";

type Props = { params: Promise<{ slug: string }> };

export default async function AdminEditPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div>
      <Link href="/admin" className="font-mono text-xs text-neon-cyan hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Edit post</h1>
      <PostEditorForm mode="edit" initial={post} />
    </div>
  );
}
