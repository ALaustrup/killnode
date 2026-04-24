import "./style.css";

const $ = (sel: string) => document.querySelector(sel) as HTMLElement;
const $$ = (sel: string) => Array.from(document.querySelectorAll(sel)) as HTMLElement[];

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

// ── State ────────────────────────────────────────────────────────────────────

let torActive = false;
let bootstrapValue = 0;
let bootstrapInterval: ReturnType<typeof setInterval> | null = null;
let circuitInterval: ReturnType<typeof setInterval> | null = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => null);
}

// ── Mount ────────────────────────────────────────────────────────────────────

function mount() {
  const root = $("#app");
  root.innerHTML = "";

  // Toast
  const toast = el("div", "toast");
  toast.style.display = "none";
  document.body.append(toast);

  const unsubToast = window.killnode.onToast((msg) => {
    toast.textContent = msg;
    toast.style.display = "block";
    setTimeout(() => (toast.style.display = "none"), 5000);
  });

  // ── Header ────────────────────────────────────────────────────────────────
  const header = el("header", "top");
  const brand = el("div", "brand");
  brand.innerHTML = '<span class="kill">KILL</span><span class="node">NODE</span>';
  const torPill = el("div", "status-pill off", "TOR · OFFLINE");
  const circuitPill = el("div", "status-pill off circuit-pill", "0 circuits");
  circuitPill.style.display = "none";
  const headerRight = el("div", "row");
  headerRight.append(circuitPill, torPill);
  header.append(brand, headerRight);

  // ── Grid ──────────────────────────────────────────────────────────────────
  const grid = el("div", "grid");

  // ═══════════════════════════════════════════════════════════════════════════
  // CARD 1 — Tor Orchestrator
  // ═══════════════════════════════════════════════════════════════════════════
  const torCard = el("section", "card");
  torCard.append(el("h2", "", "Tor Orchestrator"));
  torCard.append(
    el(
      "p",
      "hint",
      "Manages the Tor process, exit policy, circuit rotation, and Pluggable Transports. All mesh traffic routes through Tor when active."
    )
  );

  // Control row
  const ctrlRow = el("div", "row");
  const startBtn = el("button", "btn", "Activate") as HTMLButtonElement;
  const stopBtn = el("button", "btn", "Stop") as HTMLButtonElement;
  const newIdentBtn = el("button", "btn", "New Identity") as HTMLButtonElement;
  const browseBtn = el("button", "btn", "Browse…") as HTMLButtonElement;
  ctrlRow.append(startBtn, stopBtn, newIdentBtn, browseBtn);
  torCard.append(ctrlRow);

  // Custom path input
  const pathInput = el("input", "") as HTMLInputElement;
  pathInput.type = "text";
  pathInput.placeholder = "Custom Tor binary path (optional)";
  pathInput.style.cssText = "width:100%;margin-top:0.45rem;";
  torCard.append(pathInput);

  // Bootstrap progress bar
  const progressWrap = el("div", "progress-wrap");
  progressWrap.style.display = "none";
  const progressBar = el("div", "progress-bar");
  progressBar.style.width = "0%";
  const progressLabel = el("span", "progress-label", "Bootstrapping… 0%");
  progressWrap.append(progressBar, progressLabel);
  torCard.append(progressWrap);

  // Status line
  const torStatusLine = el("div", "log", "");
  torCard.append(torStatusLine);

  // Divider
  const div1 = el("hr", "divider");
  torCard.append(div1);

  // Ghost mode + exit region
  const ghostRow = el("div", "row");
  const ghostCb = el("input", "") as HTMLInputElement;
  ghostCb.type = "checkbox";
  const ghostLabel = el("label", "toggle");
  ghostLabel.append(ghostCb, document.createTextNode(" Ghost mode"));
  ghostRow.append(ghostLabel);

  ghostRow.append(el("span", "muted-label", "Exit:"));
  const locSelect = el("select", "") as HTMLSelectElement;
  [
    ["none", "Any exit"],
    ["us", "Americas"],
    ["eu", "Europe"],
    ["asia", "Asia"],
    ["kali", "EU strict"],
  ].forEach(([v, t]) => {
    const o = el("option", "");
    o.value = v;
    o.textContent = t;
    locSelect.append(o);
  });
  ghostRow.append(locSelect);
  torCard.append(ghostRow);

  // Bridges toggle + textarea
  const bridgeRow = el("div", "row");
  const bridgeCb = el("input", "") as HTMLInputElement;
  bridgeCb.type = "checkbox";
  const bridgeLabel = el("label", "toggle");
  bridgeLabel.append(bridgeCb, document.createTextNode(" Bridges (obfs4 / lyrebird)"));
  bridgeRow.append(bridgeLabel);
  torCard.append(bridgeRow);

  const bridgeArea = el("textarea", "bridge-area") as HTMLTextAreaElement;
  bridgeArea.placeholder =
    "Paste obfs4 bridge lines here, one per line.\nGet bridges from bridges.torproject.org";
  bridgeArea.rows = 3;
  bridgeArea.style.display = "none";
  torCard.append(bridgeArea);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARD 2 — Proxy Mesh
  // ═══════════════════════════════════════════════════════════════════════════
  const proxyCard = el("section", "card");
  proxyCard.append(el("h2", "", "Proxy Mesh"));
  proxyCard.append(
    el(
      "p",
      "hint",
      "Point any HTTP client or SOCKS5-capable application at these local addresses to route traffic through Tor."
    )
  );

  function proxyRow(label: string, addr: string, port: number) {
    const row = el("div", "proxy-row");
    const addrSpan = el("span", "proxy-addr", `${addr}:${port}`);
    const labelSpan = el("span", "proxy-label", label);
    const copyBtn = el("button", "btn btn-sm", "Copy") as HTMLButtonElement;
    copyBtn.addEventListener("click", () => copyToClipboard(`${addr}:${port}`));
    row.append(labelSpan, addrSpan, copyBtn);
    return row;
  }

  const proxyBody = el("div", "proxy-body");
  proxyBody.append(
    proxyRow("HTTP", "127.0.0.1", 9742),
    proxyRow("SOCKS5", "127.0.0.1", 9741),
    proxyRow("Tor SOCKS", "127.0.0.1", 9050)
  );
  proxyCard.append(proxyBody);

  const sessionStatus = el("div", "session-status", "Session: not proxied");
  proxyCard.append(sessionStatus);

  const proxyLog = el("div", "log", "");
  proxyCard.append(proxyLog);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARD 3 — Neural Killswitch
  // ═══════════════════════════════════════════════════════════════════════════
  const killCard = el("section", "card");
  killCard.append(el("h2", "", "Neural Killswitch"));
  killCard.append(
    el(
      "p",
      "hint",
      "Ordered teardown: proxy mesh → Tor → OS-level interface severance. Requires elevated privileges for the final step."
    )
  );

  const killRow = el("div", "row");
  const killBtn = el("button", "btn btn-red", "FIRE KILLSWITCH") as HTMLButtonElement;
  killRow.append(killBtn);
  killCard.append(killRow);

  // Dead-man timer selector
  const deadManRow = el("div", "row");
  deadManRow.style.marginTop = "0.65rem";
  deadManRow.append(el("span", "muted-label", "Dead-man:"));
  const deadManSelect = el("select", "") as HTMLSelectElement;
  [
    ["0", "off"],
    ["30", "30 s"],
    ["60", "60 s"],
    ["120", "120 s"],
    ["300", "5 min"],
  ].forEach(([v, t]) => {
    const o = el("option", "");
    o.value = v;
    o.textContent = t;
    deadManSelect.append(o);
  });
  deadManRow.append(deadManSelect);
  deadManRow.append(
    el(
      "span",
      "hint",
      "Auto-fires if Tor disconnects unexpectedly within N seconds."
    )
  );
  killCard.append(deadManRow);

  const restoreBtn = el("button", "btn", "Restore hint") as HTMLButtonElement;
  restoreBtn.style.marginTop = "0.5rem";
  killCard.append(restoreBtn);

  const killLog = el("div", "log", "");
  killCard.append(killLog);

  // ── Footer ────────────────────────────────────────────────────────────────
  const foot = el("footer", "note");
  foot.innerHTML =
    'KillNode · Three-pillar privacy: Tor Orchestration · Proxy Mesh · Neural Killswitch · ' +
    '<span class="tag-danger">Read LEGAL_AND_ETHICS.md before deployment.</span>';

  grid.append(torCard, proxyCard, killCard);
  root.append(header, grid, foot);

  // ── Load saved settings ───────────────────────────────────────────────────
  void window.killnode.settingsGet().then((s) => {
    if (s.torCustomPath) pathInput.value = s.torCustomPath;
    if (s.ghostMode) ghostCb.checked = true;
    if (s.locationCode) locSelect.value = s.locationCode;
    if (s.bridgeEnabled) {
      bridgeCb.checked = true;
      bridgeArea.style.display = "block";
    }
    if (s.bridgeLines) bridgeArea.value = s.bridgeLines;
    if (s.deadManSeconds) deadManSelect.value = s.deadManSeconds;
  });

  // ── Initial Tor status ────────────────────────────────────────────────────
  void syncTorStatus();

  // ── Polling intervals ─────────────────────────────────────────────────────
  function startPolling() {
    if (!bootstrapInterval) {
      bootstrapInterval = setInterval(pollBootstrap, 800);
    }
    if (!circuitInterval) {
      circuitInterval = setInterval(pollCircuits, 5000);
    }
  }

  function stopPolling() {
    if (bootstrapInterval) {
      clearInterval(bootstrapInterval);
      bootstrapInterval = null;
    }
    if (circuitInterval) {
      clearInterval(circuitInterval);
      circuitInterval = null;
    }
  }

  async function pollBootstrap() {
    if (!torActive) return;
    const { progress, circuits } = await window.killnode.torBootstrap();
    bootstrapValue = progress;
    updateBootstrapUI(progress, circuits);
    if (progress >= 100) {
      progressWrap.style.display = "none";
    }
  }

  async function pollCircuits() {
    if (!torActive) return;
    const { circuits } = await window.killnode.torBootstrap();
    updateCircuitPill(circuits);
  }

  function updateBootstrapUI(progress: number, circuits: number) {
    progressBar.style.width = `${progress}%`;
    progressLabel.textContent = `Bootstrapping… ${progress}%`;
    updateCircuitPill(circuits);
  }

  function updateCircuitPill(circuits: number) {
    circuitPill.textContent = `${circuits} circuit${circuits === 1 ? "" : "s"}`;
    circuitPill.style.display = circuits > 0 ? "inline-flex" : "none";
    circuitPill.className = "status-pill circuit-pill" + (circuits > 0 ? "" : " off");
  }

  async function syncTorStatus() {
    const { running } = await window.killnode.torStatus();
    torActive = running;
    updateTorPill(running);
    if (running) {
      startPolling();
      void pollBootstrap();
    } else {
      stopPolling();
      updateCircuitPill(0);
    }
  }

  function updateTorPill(running: boolean) {
    torPill.textContent = running ? "TOR · ACTIVE" : "TOR · OFFLINE";
    torPill.className = "status-pill" + (running ? "" : " off");
    newIdentBtn.disabled = !running;
    stopBtn.disabled = !running;
    startBtn.disabled = running;
  }

  // ── Proxy status ──────────────────────────────────────────────────────────
  async function refreshProxyStatus() {
    try {
      const ps = await window.killnode.proxyStatus();
      sessionStatus.textContent = ps.sessionProxied ? "Session: proxied ✓" : "Session: not proxied";
      sessionStatus.className = "session-status" + (ps.sessionProxied ? " proxied" : "");
    } catch {
      sessionStatus.textContent = "Session: status unknown";
    }
  }

  setInterval(() => void syncTorStatus(), 8000);

  // ── Push notifications from main process ──────────────────────────────────
  const unsubStatusPush = window.killnode.onTorStatusPush((s) => {
    torActive = s.running;
    updateTorPill(s.running);
    if (!s.running) {
      stopPolling();
      updateCircuitPill(0);
      progressWrap.style.display = "none";
    }
  });

  const unsubDeadMan = window.killnode.onDeadManFired(() => {
    killLog.textContent = "Dead-man timer fired — network severed.";
    updateTorPill(false);
    stopPolling();
  });

  const unsubDirty = window.killnode.onDirtyShutdown(() => {
    torStatusLine.textContent = "⚠ Unclean shutdown detected. Verify your network is clean.";
  });

  // ── Event listeners ───────────────────────────────────────────────────────

  newIdentBtn.disabled = true;
  stopBtn.disabled = true;

  browseBtn.addEventListener("click", async () => {
    const p = await window.killnode.pickTorBinary();
    if (p) {
      pathInput.value = p;
      await window.killnode.settingsSet({ torCustomPath: p });
    }
  });

  pathInput.addEventListener("change", async () => {
    await window.killnode.settingsSet({ torCustomPath: pathInput.value.trim() || undefined });
  });

  ghostCb.addEventListener("change", async () => {
    await window.killnode.settingsSet({ ghostMode: ghostCb.checked });
  });

  locSelect.addEventListener("change", async () => {
    await window.killnode.settingsSet({ locationCode: locSelect.value });
  });

  bridgeCb.addEventListener("change", async () => {
    bridgeArea.style.display = bridgeCb.checked ? "block" : "none";
    await window.killnode.settingsSet({ bridgeEnabled: bridgeCb.checked });
  });

  bridgeArea.addEventListener("change", async () => {
    await window.killnode.settingsSet({ bridgeLines: bridgeArea.value.trim() });
  });

  deadManSelect.addEventListener("change", async () => {
    await window.killnode.settingsSet({ deadManSeconds: deadManSelect.value });
  });

  startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    torStatusLine.textContent = "";
    progressWrap.style.display = "block";
    progressBar.style.width = "0%";
    progressLabel.textContent = "Bootstrapping… 0%";

    // Poll bootstrap while waiting
    const poll = setInterval(async () => {
      const { progress, circuits } = await window.killnode.torBootstrap();
      progressBar.style.width = `${progress}%`;
      progressLabel.textContent = `Bootstrapping… ${progress}%`;
      updateCircuitPill(circuits);
    }, 800);

    const r = await window.killnode.torStart();
    clearInterval(poll);

    torStatusLine.textContent = r.message;

    if (r.ok) {
      torActive = true;
      updateTorPill(true);
      progressWrap.style.display = "none";
      await refreshProxyStatus();
      startPolling();
      void pollBootstrap();
      const ps = await window.killnode.proxyStatus().catch(() => null);
      if (ps) {
        proxyLog.textContent = `HTTP :${ps.httpPort} · SOCKS :${ps.socksPort} · Tor :${ps.torSocks}`;
      }
    } else {
      progressWrap.style.display = "none";
      startBtn.disabled = false;
    }
  });

  stopBtn.addEventListener("click", async () => {
    stopBtn.disabled = true;
    const r = await window.killnode.torStop();
    torStatusLine.textContent = r.message;
    torActive = false;
    updateTorPill(false);
    stopPolling();
    updateCircuitPill(0);
    await refreshProxyStatus();
    stopBtn.disabled = false;
  });

  newIdentBtn.addEventListener("click", async () => {
    newIdentBtn.disabled = true;
    const r = await window.killnode.torNewIdent();
    torStatusLine.textContent = r.message;
    setTimeout(() => {
      newIdentBtn.disabled = !torActive;
    }, 2000);
  });

  killBtn.addEventListener("click", async () => {
    killBtn.disabled = true;
    const r = await window.killnode.killswitch();
    killLog.textContent = r.message;
    if (r.ok) {
      torActive = false;
      updateTorPill(false);
      stopPolling();
      updateCircuitPill(0);
    }
    killBtn.disabled = false;
  });

  restoreBtn.addEventListener("click", async () => {
    killLog.textContent = await window.killnode.restoreHint();
  });

  window.addEventListener(
    "beforeunload",
    () => {
      unsubToast();
      unsubStatusPush();
      unsubDeadMan();
      unsubDirty();
      stopPolling();
    },
    { once: true }
  );
}

mount();
