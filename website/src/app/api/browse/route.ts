import { type NextRequest } from "next/server";

const PROXY_PATH = "/api/browse?url=";

const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,    // link-local / AWS metadata
  /^fc00:/i,
  /^fe80:/i,
  /\.local$/i,
  /\.internal$/i,
];

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_PATTERNS.some((p) => p.test(hostname));
}

function resolveUrl(href: string, base: URL): string | null {
  href = href.trim();
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("javascript:") ||
    href.startsWith("data:") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return null; // leave as-is
  }
  try {
    const abs = new URL(href, base);
    if (abs.protocol !== "http:" && abs.protocol !== "https:") return null;
    return PROXY_PATH + encodeURIComponent(abs.href);
  } catch {
    return null;
  }
}

function rewriteAttr(html: string, base: URL, attr: string): string {
  const re = new RegExp(`(\\s${attr}\\s*=\\s*)"([^"]*)"`, "gi");
  const re2 = new RegExp(`(\\s${attr}\\s*=\\s*)'([^']*)'`, "gi");
  const rewrite = (_: string, prefix: string, url: string): string => {
    const r = resolveUrl(url, base);
    return r ? `${prefix}"${r}"` : `${prefix}"${url}"`;
  };
  return html.replace(re, rewrite).replace(re2, (_: string, p: string, u: string) => {
    const r = resolveUrl(u, base);
    return r ? `${p}'${r}'` : `${p}'${u}'`;
  });
}

function rewriteSrcset(html: string, base: URL): string {
  return html.replace(/(\ssrcset\s*=\s*)"([^"]*)"/gi, (_: string, prefix: string, val: string) => {
    const rewritten = val.replace(/([^\s,][^\s,]*)\s*(\d+[wx])?/g, (m: string, url: string, desc?: string) => {
      const r = resolveUrl(url.trim(), base);
      return (r ?? url.trim()) + (desc ? " " + desc : "");
    });
    return `${prefix}"${rewritten}"`;
  });
}

function rewriteCssUrls(css: string, base: URL): string {
  return css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (_: string, q: string, url: string) => {
    const r = resolveUrl(url, base);
    return r ? `url(${q}${r}${q})` : `url(${q}${url}${q})`;
  });
}

const NAV_BAR = (currentUrl: string) => `
<div id="_kn_bar" style="position:fixed;top:0;left:0;right:0;z-index:2147483647;background:rgba(0,0,0,0.95);border-bottom:1px solid rgba(255,0,0,0.3);padding:6px 12px;display:flex;align-items:center;gap:8px;font-family:ui-monospace,monospace;box-shadow:0 2px 16px rgba(255,0,0,0.12);">
  <a href="/browse" style="color:#ff0000;font-size:10px;font-weight:900;letter-spacing:0.1em;text-decoration:none;white-space:nowrap;text-shadow:0 0 10px rgba(255,0,0,0.5);">KN</a>
  <span style="color:rgba(0,255,255,0.3);font-size:10px;">|</span>
  <input id="_kn_url" type="text" value="${currentUrl.replace(/"/g, "&quot;")}" style="flex:1;min-width:0;background:#030305;border:1px solid rgba(0,255,255,0.25);color:#e5e7eb;padding:4px 8px;font-size:10px;border-radius:3px;outline:none;" placeholder="Enter URL…" onkeydown="if(event.key==='Enter')_knGo()">
  <button onclick="_knGo()" style="background:transparent;border:1px solid rgba(0,255,255,0.4);color:#00ffff;padding:4px 10px;font-size:10px;cursor:pointer;border-radius:3px;white-space:nowrap;letter-spacing:0.05em;">GO</button>
  <button onclick="history.back()" style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:#6b7280;padding:4px 8px;font-size:10px;cursor:pointer;border-radius:3px;">←</button>
  <button onclick="history.forward()" style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:#6b7280;padding:4px 8px;font-size:10px;cursor:pointer;border-radius:3px;">→</button>
</div>
<style>#_kn_bar *{box-sizing:border-box;}body{margin-top:40px!important;padding-top:0!important;}</style>
<script>
function _knGo(){
  var u=document.getElementById('_kn_url').value.trim();
  if(!u)return;
  if(!/^https?:\\/\\//.test(u))u='https://'+u;
  window.location.href='/api/browse?url='+encodeURIComponent(u);
}
// Intercept fetch to route through proxy
(function(){
  var PP='/api/browse?url=';
  var oFetch=window.fetch;
  window.fetch=function(r,o){
    if(typeof r==='string'&&/^https?:\\/\\//.test(r))r=PP+encodeURIComponent(r);
    return oFetch.call(this,r,o);
  };
  var oOpen=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(m,u){
    if(typeof u==='string'&&/^https?:\\/\\//.test(u))u=PP+encodeURIComponent(u);
    return oOpen.apply(this,arguments);
  };
  // Update URL bar on navigation
  var obs=new MutationObserver(function(){
    var el=document.getElementById('_kn_url');
    if(el){var u=new URLSearchParams(location.search).get('url');if(u)el.value=u;}
  });
  obs.observe(document,'subtree'&&{subtree:true,childList:true});
})();
</script>`;

function rewriteHtml(html: string, targetUrl: string): string {
  const base = new URL(targetUrl);

  // Remove existing <base> tags
  html = html.replace(/<base[^>]*>/gi, "");

  // Rewrite URL-bearing attributes
  for (const attr of ["href", "src", "action", "data", "poster"]) {
    html = rewriteAttr(html, base, attr);
  }

  // Rewrite srcset
  html = rewriteSrcset(html, base);

  // Rewrite inline CSS url()
  html = html.replace(
    /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_: string, open: string, css: string, close: string) =>
      open + rewriteCssUrls(css, base) + close
  );

  // Rewrite style attributes containing url()
  html = html.replace(/(\sstyle\s*=\s*)"([^"]*)"/gi, (_: string, p: string, val: string) => {
    return `${p}"${rewriteCssUrls(val, base)}"`;
  });

  // Rewrite meta refresh
  html = html.replace(
    /(<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]+content\s*=\s*["'])([^"']*)(['"])/gi,
    (_: string, pre: string, content: string, post: string) => {
      const rewritten = content.replace(/(url=)(.+)/i, (_2: string, prefix: string, url: string) => {
        const r = resolveUrl(url.replace(/['"]/g, ""), base);
        return r ? prefix + r : prefix + url;
      });
      return pre + rewritten + post;
    }
  );

  // Inject navigation bar
  const nav = NAV_BAR(targetUrl);
  if (/<body[^>]*>/i.test(html)) {
    html = html.replace(/(<body[^>]*>)/i, `$1${nav}`);
  } else {
    html = nav + html;
  }

  return html;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return new Response(
      `<!doctype html><html><head><meta charset=utf-8><title>KillNode Proxy</title>
       <style>body{background:#000;color:#e5e7eb;font-family:monospace;padding:2rem;}</style>
       </head><body>
       <h1 style="color:#ff0000">Missing URL</h1>
       <p>Usage: <code>/api/browse?url=https://example.com</code></p>
       <p><a href="/browse" style="color:#00ffff">← Back to proxy browser</a></p>
       </body></html>`,
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return new Response("Only http/https URLs are supported", { status: 400 });
  }

  if (isBlockedHost(targetUrl.hostname)) {
    return new Response("Blocked host", { status: 403 });
  }

  let response: Response;
  try {
    response = await fetch(targetUrl.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
      },
      redirect: "follow",
      // 10s timeout
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      `<!doctype html><html><head><meta charset=utf-8><title>Proxy Error</title>
       <style>body{background:#000;color:#e5e7eb;font-family:monospace;padding:2rem;}</style>
       </head><body>
       <h1 style="color:#ff0000">Proxy Error</h1>
       <p>${msg}</p>
       <p><a href="/browse" style="color:#00ffff">← Back</a></p>
       </body></html>`,
      { status: 502, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const contentType = response.headers.get("content-type") ?? "application/octet-stream";

  // For HTML responses: rewrite URLs and inject nav bar
  if (contentType.includes("text/html")) {
    const text = await response.text();
    const rewritten = rewriteHtml(text, targetUrl.href);

    return new Response(rewritten, {
      status: response.status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Permissive CSP for the proxy frame — all resources are proxied through our origin
        "content-security-policy":
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors 'self';",
        "x-frame-options": "SAMEORIGIN",
        "cache-control": "no-store",
      },
    });
  }

  // For CSS: rewrite url() references
  if (contentType.includes("text/css")) {
    const text = await response.text();
    const base = new URL(targetUrl.href);
    return new Response(rewriteCssUrls(text, base), {
      status: response.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
        "content-security-policy": "default-src 'self' 'unsafe-inline' data:; frame-ancestors 'self';",
      },
    });
  }

  // All other content types: pass through transparently (images, fonts, scripts, etc.)
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: response.status,
    headers: {
      "content-type": contentType,
      "cache-control": response.headers.get("cache-control") ?? "no-store",
      "content-security-policy": "frame-ancestors 'self';",
    },
  });
}
