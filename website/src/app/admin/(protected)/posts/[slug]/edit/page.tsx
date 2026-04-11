import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";
import { PostEditorForm } from "@/components/post-editor-form";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return { title: post ? `Edit · ${post.title}` : "Edit post" };
}

export default async function AdminEditPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin" className="inline-flex items-center gap-1 font-mono text-xs text-neon-cyan hover:underline">
          ← Dashboard
        </Link>
        <Link
          href={`/blog/${post.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-muted-foreground hover:text-neon-cyan"
        >
          /blog/{post.slug} ↗
        </Link>
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Edit post</h1>
      <PostEditorForm mode="edit" initial={post} />
    </div>
  );
}
