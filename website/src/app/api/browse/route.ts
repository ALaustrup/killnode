import { type NextRequest } from "next/server";

const PROXY_PATH = "/api/browse?url=";

const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fe80:/i,
  /\.local$/i,
  /\.internal$/i,
];

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_PATTERNS.some((p) => p.test(hostname));
}

function resolveProxyUrl(href: string, base: URL): string | null {
  href = href.trim();
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("javascript:") ||
    href.startsWith("data:") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return null;
  }
  // Already a proxy URL — leave as-is
  if (href.startsWith(PROXY_PATH) || href.startsWith("/api/browse")) {
    return null;
  }
  try {
    const abs = new URL(href, base);
    if (abs.protocol !== "http:" && abs.protocol !== "https:") return null;
    return PROXY_PATH + encodeURIComponent(abs.href);
  } catch {
    return null;
  }
}

/** Rewrite a single attribute across the whole HTML string */
function rewriteAttr(html: string, base: URL, attr: string): string {
  // Double-quoted
  const dq = new RegExp(`([ \\t\\r\\n]${attr}[ \\t]*=[ \\t]*)"([^"]*)"`, "gi");
  html = html.replace(dq, (_: string, prefix: string, url: string) => {
    const r = resolveProxyUrl(url, base);
    return r ? `${prefix}"${r}"` : `${prefix}"${url}"`;
  });
  // Single-quoted
  const sq = new RegExp(`([ \\t\\r\\n]${attr}[ \\t]*=[ \\t]*)'([^']*)'`, "gi");
  html = html.replace(sq, (_: string, prefix: string, url: string) => {
    const r = resolveProxyUrl(url, base);
    return r ? `${prefix}'${r}'` : `${prefix}'${url}'`;
  });
  return html;
}

/** Rewrite srcset="url1 size, url2 size" */
function rewriteSrcset(html: string, base: URL): string {
  return html.replace(
    /([ \t\r\n]srcset[ \t]*=[ \t]*)"([^"]*)"/gi,
    (_: string, prefix: string, val: string) => {
      const parts = val.split(",").map((entry) => {
        const trimmed = entry.trim();
        const m = trimmed.match(/^(\S+)(\s+.*)$/);
        const url = m ? m[1] : trimmed;
        const desc = m ? m[2] : "";
        const r = resolveProxyUrl(url, base);
        return (r ?? url) + desc;
      });
      return `${prefix}"${parts.join(", ")}"`;
    }
  );
}

/** Rewrite CSS url() inside a CSS text blob */
function rewriteCssUrls(css: string, base: URL): string {
  // Handle url("..."), url('...'), url(...)
  return css.replace(
    /url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi,
    (_: string, q: string, url: string) => {
      const r = resolveProxyUrl(url, base);
      return r ? `url(${q}${r}${q})` : `url(${q}${url}${q})`;
    }
  );
}

/** Rewrite @import "..." and @import url("...") in CSS */
function rewriteCssImports(css: string, base: URL): string {
  return css.replace(
    /@import\s+(?:url\()?(['"]?)([^)'"\s;]+)\1\)?/gi,
    (_: string, q: string, url: string) => {
      const r = resolveProxyUrl(url, base);
      return r ? `@import ${q}${r}${q}` : `@import ${q}${url}${q}`;
    }
  );
}

/** Build the injected navigation bar + comprehensive JS interceptor */
function buildInjectedScript(currentUrl: string, baseOrigin: string): string {
  const escapedUrl = currentUrl.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const escapedOrigin = baseOrigin.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const pp = PROXY_PATH;

  return `
<div id="_kn_bar" style="position:fixed;top:0;left:0;right:0;z-index:2147483647;background:rgba(0,0,0,0.96);border-bottom:1px solid rgba(255,0,60,0.25);padding:6px 10px;display:flex;align-items:center;gap:7px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:10px;box-shadow:0 1px 20px rgba(255,0,60,0.08);">
  <a href="/browse" style="color:#ff0000;font-weight:900;letter-spacing:0.1em;text-decoration:none;white-space:nowrap;flex-shrink:0;text-shadow:0 0 8px rgba(255,0,0,0.4);" title="KillNode Proxy Browser">KN</a>
  <span style="color:rgba(0,255,255,0.2);flex-shrink:0;">|</span>
  <div style="flex:1;position:relative;min-width:0;">
    <input id="_kn_url" type="text" value="${escapedUrl.replace(/"/g, "&quot;")}"
      style="width:100%;background:#060608;border:1px solid rgba(0,255,255,0.2);color:#e5e7eb;padding:4px 8px;font-size:10px;border-radius:3px;outline:none;box-sizing:border-box;font-family:inherit;"
      placeholder="Enter URL…"
      onfocus="this.style.borderColor='rgba(0,255,255,0.5)'"
      onblur="this.style.borderColor='rgba(0,255,255,0.2)'"
      onkeydown="if(event.key==='Enter'){event.preventDefault();_knGo();}">
  </div>
  <button onclick="_knGo()" style="background:transparent;border:1px solid rgba(0,255,255,0.35);color:#00ffff;padding:3px 10px;cursor:pointer;border-radius:3px;white-space:nowrap;letter-spacing:0.08em;flex-shrink:0;font-family:inherit;font-size:10px;" onmouseover="this.style.background='rgba(0,255,255,0.08)'" onmouseout="this.style.background='transparent'">GO</button>
  <button onclick="history.back()" style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:#6b7280;padding:3px 7px;cursor:pointer;border-radius:3px;flex-shrink:0;font-family:inherit;font-size:10px;" title="Back">←</button>
  <button onclick="history.forward()" style="background:transparent;border:1px solid rgba(255,255,255,0.1);color:#6b7280;padding:3px 7px;cursor:pointer;border-radius:3px;flex-shrink:0;font-family:inherit;font-size:10px;" title="Forward">→</button>
</div>
<style>*{box-sizing:border-box}html,body{margin-top:40px!important;padding-top:0!important;}#_kn_bar *{box-sizing:border-box;}</style>
<script>
(function(){
  var PP='${pp}';
  var BASE='${escapedOrigin}';

  function _proxyUrl(url){
    if(!url||typeof url!=='string')return url;
    url=url.trim();
    if(/^(#|javascript:|data:|mailto:|tel:|blob:)/.test(url))return url;
    if(url.indexOf('/api/browse')===0||url.indexOf(PP)===0)return url;
    try{
      var abs=new URL(url,BASE);
      if(abs.protocol!=='http:'&&abs.protocol!=='https:')return url;
      return PP+encodeURIComponent(abs.href);
    }catch(e){return url;}
  }

  function _knGo(){
    var el=document.getElementById('_kn_url');
    if(!el)return;
    var u=el.value.trim();
    if(!u)return;
    if(!/^https?:\\/\\//.test(u))u='https://'+u;
    window.location.href=PP+encodeURIComponent(u);
  }
  window._knGo=_knGo;

  /* ── Patch fetch ── */
  var _oFetch=window.fetch;
  window.fetch=function(r,o){
    if(typeof r==='string')r=_proxyUrl(r);
    else if(r&&r.url)try{r=new Request(_proxyUrl(r.url),r);}catch(e){}
    return _oFetch.call(this,r,o);
  };

  /* ── Patch XMLHttpRequest ── */
  var _oOpen=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(m,u){
    if(typeof u==='string')u=_proxyUrl(u);
    var args=Array.prototype.slice.call(arguments);
    args[1]=u;
    return _oOpen.apply(this,args);
  };

  /* ── Patch img.src setter ── */
  try{
    var _imgDesc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
    if(_imgDesc&&_imgDesc.set){
      Object.defineProperty(HTMLImageElement.prototype,'src',{
        get:_imgDesc.get,
        set:function(v){_imgDesc.set.call(this,_proxyUrl(v));},
        configurable:true
      });
    }
  }catch(e){}

  /* ── Patch HTMLElement.setAttribute ── */
  var _oSetAttr=Element.prototype.setAttribute;
  Element.prototype.setAttribute=function(n,v){
    if(typeof v==='string'&&(n==='src'||n==='href'||n==='action'||n==='data'||n==='poster'||n==='data-src'||n==='data-lazy-src'||n==='data-original'))
      v=_proxyUrl(v);
    return _oSetAttr.call(this,n,v);
  };

  /* ── Patch window.open ── */
  var _oWOpen=window.open;
  window.open=function(u,n,f){
    if(typeof u==='string')u=_proxyUrl(u);
    return _oWOpen.call(this,u,n,f);
  };

  /* ── Intercept form submit ── */
  document.addEventListener('submit',function(e){
    var f=e.target;
    if(f&&f.action){var p=_proxyUrl(f.action);if(p!==f.action)f.action=p;}
  },true);

  /* ── MutationObserver: catch dynamic DOM mutations ── */
  var _ATTRS=['src','href','action','data','poster','data-src','data-lazy-src','data-original','background'];
  function _rewriteNode(node){
    if(node.nodeType!==1)return;
    for(var i=0;i<_ATTRS.length;i++){
      var a=_ATTRS[i];
      if(node.hasAttribute&&node.hasAttribute(a)){
        var v=node.getAttribute(a);
        var p=_proxyUrl(v);
        if(p&&p!==v)_oSetAttr.call(node,a,p);
      }
    }
    var c=node.children;
    if(c){for(var j=0;j<c.length;j++)_rewriteNode(c[j]);}
  }

  new MutationObserver(function(muts){
    for(var i=0;i<muts.length;i++){
      var m=muts[i];
      if(m.type==='attributes'){
        var v2=m.target.getAttribute(m.attributeName);
        var p2=_proxyUrl(v2);
        if(p2&&p2!==v2)_oSetAttr.call(m.target,m.attributeName,p2);
      }else{
        for(var j=0;j<m.addedNodes.length;j++)_rewriteNode(m.addedNodes[j]);
      }
    }
  }).observe(document.documentElement,{
    childList:true,subtree:true,
    attributes:true,
    attributeFilter:_ATTRS
  });

  /* ── Update URL bar on popstate / history ── */
  function _syncBar(){
    var el=document.getElementById('_kn_url');
    if(!el)return;
    var u=new URLSearchParams(location.search).get('url');
    if(u)el.value=u;
  }
  window.addEventListener('popstate',_syncBar);
})();
</script>`;
}

function rewriteHtml(html: string, targetUrl: string): string {
  const base = new URL(targetUrl);

  // Strip existing <base> tags (they confuse relative URL resolution)
  html = html.replace(/<base[^>]*>/gi, "");

  // Rewrite standard URL attributes
  for (const attr of ["href", "src", "action", "data", "poster"]) {
    html = rewriteAttr(html, base, attr);
  }

  // Rewrite lazy-loading data-* attributes
  for (const attr of ["data-src", "data-lazy-src", "data-original", "data-bg", "data-lazy"]) {
    // These use hyphens, need slightly different regex
    const dq = new RegExp(
      `([ \\t\\r\\n]${attr.replace(/-/g, "\\-")}[ \\t]*=[ \\t]*)"([^"]*)"`,
      "gi"
    );
    html = html.replace(dq, (_: string, prefix: string, url: string) => {
      const r = resolveProxyUrl(url, base);
      return r ? `${prefix}"${r}"` : `${prefix}"${url}"`;
    });
  }

  // Rewrite srcset
  html = rewriteSrcset(html, base);

  // Rewrite inline CSS url() inside <style> blocks
  html = html.replace(
    /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_: string, open: string, css: string, close: string) =>
      open + rewriteCssImports(rewriteCssUrls(css, base), base) + close
  );

  // Rewrite style="" attributes
  html = html.replace(/([ \t\r\n]style[ \t]*=[ \t]*)"([^"]*)"/gi, (_: string, p: string, v: string) =>
    `${p}"${rewriteCssUrls(v, base)}"`
  );

  // Rewrite meta refresh
  html = html.replace(
    /(<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]+content\s*=\s*["'])([^"']*)(['"])/gi,
    (_: string, pre: string, content: string, post: string) => {
      const rewritten = content.replace(/(url=)(.+)/i, (_2: string, prefix2: string, url: string) => {
        const r = resolveProxyUrl(url.replace(/['"]/g, ""), base);
        return r ? prefix2 + r : prefix2 + url;
      });
      return pre + rewritten + post;
    }
  );

  // Remove X-Frame-Options and restrictive CSP from any meta http-equiv tags
  html = html.replace(
    /<meta[^>]+http-equiv\s*=\s*["']?(?:content-security-policy|x-frame-options)["']?[^>]*>/gi,
    ""
  );

  // Inject the interceptor + nav bar right after <body> (or at document start if no body tag)
  const nav = buildInjectedScript(targetUrl, base.origin);
  if (/<body[^>]*>/i.test(html)) {
    html = html.replace(/(<body[^>]*>)/i, `$1\n${nav}\n`);
  } else {
    html = nav + "\n" + html;
  }

  return html;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return new Response(
      `<!doctype html><html><head><meta charset=utf-8><title>KillNode Proxy</title>
       <style>body{background:#000;color:#e5e7eb;font-family:ui-monospace,monospace;padding:2rem;}</style>
       </head><body>
       <h2 style="color:#ff0000;font-size:1rem;letter-spacing:0.1em;">KILLNODE PROXY</h2>
       <p style="color:#6b7280;font-size:0.8rem;">Usage: <code style="color:#00ffff">/api/browse?url=https://example.com</code></p>
       <p style="margin-top:1rem;"><a href="/browse" style="color:#00ffff;font-size:0.8rem;">← Back to proxy browser</a></p>
       </body></html>`,
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  // Normalise — add https:// if missing
  let normalised = rawUrl.trim();
  if (!/^https?:\/\//i.test(normalised)) normalised = "https://" + normalised;

  let targetUrl: URL;
  try {
    targetUrl = new URL(normalised);
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
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      `<!doctype html><html><head><meta charset=utf-8><title>Proxy Error</title>
       <style>body{background:#000;color:#e5e7eb;font-family:ui-monospace,monospace;padding:2rem;}</style>
       </head><body>
       <h2 style="color:#ff0000;font-size:1rem;letter-spacing:0.1em;">PROXY ERROR</h2>
       <p style="color:#6b7280;font-size:0.8rem;">Could not reach <code style="color:#e5e7eb">${targetUrl.href}</code></p>
       <p style="color:#ff0000;font-size:0.75rem;margin-top:0.5rem;">${msg}</p>
       <p style="margin-top:1.5rem;"><a href="/browse" style="color:#00ffff;font-size:0.8rem;">← Back</a></p>
       </body></html>`,
      { status: 502, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const rawContentType = response.headers.get("content-type") ?? "";
  const isHtml = rawContentType.includes("text/html");
  const isCss = rawContentType.includes("text/css");

  // Resolve the final URL after any server-side redirects
  const finalUrl = response.url || targetUrl.href;
  const finalBase = new URL(finalUrl);

  if (isHtml) {
    const text = await response.text();
    const rewritten = rewriteHtml(text, finalBase.href);

    const proxyHeaders = new Headers({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, no-cache",
      // Override security headers: this page is navigated to directly, not in a frame.
      // The permissive CSP allows all resources that have been rewritten through the proxy.
      "content-security-policy":
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors 'none';",
      "x-frame-options": "DENY",
      "x-content-type-options": "nosniff",
    });

    return new Response(rewritten, { status: response.status, headers: proxyHeaders });
  }

  if (isCss) {
    const text = await response.text();
    const finalCss = rewriteCssImports(rewriteCssUrls(text, finalBase), finalBase);
    return new Response(finalCss, {
      status: response.status,
      headers: {
        "content-type": rawContentType,
        "cache-control": "no-store",
        "content-security-policy": "default-src * 'unsafe-inline' data:; frame-ancestors 'none';",
      },
    });
  }

  // All other content (images, fonts, scripts, JSON, etc.) — pass through
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: response.status,
    headers: {
      "content-type": rawContentType,
      "cache-control": response.headers.get("cache-control") ?? "public, max-age=3600",
      "content-security-policy": "frame-ancestors 'none';",
    },
  });
}
