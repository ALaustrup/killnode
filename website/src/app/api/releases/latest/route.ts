import { NextResponse } from "next/server";

export const revalidate = 120;

export async function GET() {
  const owner = process.env.GITHUB_REPO_OWNER ?? "Alaustrup";
  const repo = process.env.GITHUB_REPO_NAME ?? "killnode";
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "User-Agent": "KillNode-Website",
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "GitHub API error", status: res.status },
      { status: 502 }
    );
  }

  const data = (await res.json()) as {
    tag_name?: string;
    name?: string;
    published_at?: string;
    html_url?: string;
    assets?: { name: string; browser_download_url: string; size: number }[];
  };

  const assets = (data.assets ?? []).map((a) => ({
    name: a.name,
    url: a.browser_download_url,
    size: a.size,
  }));

  return NextResponse.json({
    tag: data.tag_name ?? "",
    name: data.name ?? "",
    publishedAt: data.published_at ?? "",
    htmlUrl: data.html_url ?? "",
    assets,
  });
}
