import "./style.css";

const $ = (sel: string) => document.querySelector(sel) as HTMLElement;

function el(tag: string, className?: string, text?: string) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

async function refreshTorStatus(pill: HTMLElement) {
  const s = await window.killnode.torStatus();
  pill.textContent = s.running ? "TOR · ACTIVE" : "TOR · OFFLINE";
  pill.className = "status-pill" + (s.running ? "" : " off");
}

function mount() {
  const root = $("#app");
  root.innerHTML = "";

  const header = el("header", "top");
  const brand = el("div", "brand");
  brand.innerHTML = '<span class="kill">KILL</span><span class="node">NODE</span>';
  const pill = el("div", "status-pill off", "TOR · …");
  header.append(brand, pill);

  const grid = el("div", "grid");

  /* Tor */
  const torCard = el("section", "card");
  torCard.append(el("h2", "", "Tor relay"));
  torCard.append(
    el(
      "p",
      "hint",
      "One-click start spawns your tor binary with SOCKS (default 9050) and a ControlPort cookie. Bundle Tor under resources/tor or pick a system binary."
    )
  );
  const torRow = el("div", "row");
  const startBtn = el("button", "btn", "Activate Tor") as HTMLButtonElement;
  const stopBtn = el("button", "btn", "Stop") as HTMLButtonElement;
  const browseBtn = el("button", "btn", "Browse…") as HTMLButtonElement;
  torRow.append(startBtn, stopBtn, browseBtn);
  const torPathInput = document.createElement("input");
  torPathInput.type = "text";
  torPathInput.placeholder = "Custom tor path (optional)";
  torPathInput.style.flex = "1";
  torPathInput.style.minWidth = "200px";
  torRow.append(torPathInput);
  torCard.append(torRow);
  const torLog = el("div", "log", "");
  torCard.append(torLog);

  /* Ghost + location */
  const ghostCard = el("section", "card");
  ghostCard.append(el("h2", "", "Ghost mode"));
  ghostCard.append(
    el(
      "p",
      "hint",
      "Enables Tor with faster circuit rotation (MaxCircuitDirtiness). Pair with your own rotating proxy list via HTTP_PROXY in the shell / system (documented in USAGE.md)."
    )
  );
  const ghostRow = el("div", "row");
  const ghostLabel = el("label", "toggle");
  const ghostCb = document.createElement("input");
  ghostCb.type = "checkbox";
  ghostLabel.append(ghostCb, document.createTextNode(" Ghost mode (Tor + aggressive rotation)"));
  ghostRow.append(ghostLabel);
  ghostCard.append(ghostRow);
  const locRow = el("div", "row");
  locRow.append(el("span", "", "Exit region hint"));
  const locSelect = document.createElement("select");
  [["none", "Any exit"], ["us", "Americas"], ["eu", "Europe"], ["asia", "Asia"], ["kali", "EU strict"]].forEach(
    ([v, t]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      locSelect.append(o);
    }
  );
  locRow.append(locSelect);
  ghostCard.append(locRow);
  const proxyInput = document.createElement("input");
  proxyInput.type = "text";
  proxyInput.placeholder = "Rotating proxy URL (reference / optional)";
  proxyInput.style.marginTop = "0.5rem";
  proxyInput.style.width = "100%";
  ghostCard.append(proxyInput);

  /* Killswitch */
  const killCard = el("section", "card");
  killCard.append(el("h2", "", "Neural killswitch"));
  killCard.append(
    el(
      "p",
      "hint",
      "Host-level network sever. Requires elevated privileges on most systems. Only use on hardware you own or are explicitly authorized to isolate."
    )
  );
  const killBtn = el("button", "btn btn-red", "NEURAL KILLSWITCH") as HTMLButtonElement;
  const restoreBtn = el("button", "btn", "Restore hint") as HTMLButtonElement;
  const killRow = el("div", "row");
  killRow.append(killBtn, restoreBtn);
  killCard.append(killRow);
  const killLog = el("div", "log", "");
  killCard.append(killLog);

  /* Onion */
  const onionCard = el("section", "card");
  onionCard.append(el("h2", "", "Onion link"));
  onionCard.append(
    el(
      "p",
      "hint",
      "Generates a simulated v3-style .onion URL for clipboard/testing workflows. Real hidden services require Tor HS configuration — see docs."
    )
  );
  const genBtn = el("button", "btn", "Generate & copy") as HTMLButtonElement;
  const onionRow = el("div", "row");
  onionRow.append(genBtn);
  onionCard.append(onionRow);
  const onionBox = el("div", "onion-box", "—");
  onionCard.append(onionBox);
  let onionTimer: ReturnType<typeof setTimeout> | null = null;

  const foot = el("footer", "note");
  foot.innerHTML =
    'KillNode desktop. Ethical use only — read <a data-href="https://github.com/Alaustrup/killnode">LEGAL_AND_ETHICS.md</a>. Tor is a third-party project.';

  grid.append(torCard, ghostCard, killCard, onionCard);
  root.append(header, grid, foot);

  foot.querySelector("a")?.addEventListener("click", (e) => {
    e.preventDefault();
    const href = (e.target as HTMLAnchorElement).dataset.href;
    if (href) void window.killnode.openExternal(href);
  });

  void window.killnode.settingsGet().then((s) => {
    ghostCb.checked = !!s.ghostMode;
    if (s.locationCode) locSelect.value = s.locationCode;
    if (s.torCustomPath) torPathInput.value = s.torCustomPath;
    if (s.proxyRotationUrl) proxyInput.value = s.proxyRotationUrl;
  });

  void refreshTorStatus(pill);
  setInterval(() => void refreshTorStatus(pill), 4000);

  browseBtn.addEventListener("click", async () => {
    const p = await window.killnode.pickTorBinary();
    if (p) {
      torPathInput.value = p;
      await window.killnode.settingsSet({ torCustomPath: p });
    }
  });

  torPathInput.addEventListener("change", async () => {
    await window.killnode.settingsSet({ torCustomPath: torPathInput.value.trim() || undefined });
  });

  ghostCb.addEventListener("change", async () => {
    await window.killnode.settingsSet({ ghostMode: ghostCb.checked });
  });

  locSelect.addEventListener("change", async () => {
    await window.killnode.settingsSet({ locationCode: locSelect.value });
  });

  proxyInput.addEventListener("change", async () => {
    await window.killnode.settingsSet({ proxyRotationUrl: proxyInput.value.trim() || undefined });
  });

  startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    torLog.textContent = "";
    const r = await window.killnode.torStart();
    torLog.textContent = r.message;
    startBtn.disabled = false;
    void refreshTorStatus(pill);
  });

  stopBtn.addEventListener("click", async () => {
    const r = await window.killnode.torStop();
    torLog.textContent = r.message;
    void refreshTorStatus(pill);
  });

  killBtn.addEventListener("click", async () => {
    killBtn.disabled = true;
    const r = await window.killnode.killswitch();
    killLog.textContent = r.message;
    killBtn.disabled = false;
  });

  restoreBtn.addEventListener("click", async () => {
    killLog.textContent = await window.killnode.restoreHint();
  });

  genBtn.addEventListener("click", async () => {
    if (onionTimer) clearTimeout(onionTimer);
    onionBox.classList.remove("dead");
    const { url, simulated } = await window.killnode.onionGenerate();
    onionBox.textContent = url + (simulated ? "  (simulated)" : "");
    await navigator.clipboard.writeText(url);
    onionTimer = setTimeout(() => {
      onionBox.textContent = "— scrubbed —";
      onionBox.classList.add("dead");
    }, 60_000);
  });
}

mount();
