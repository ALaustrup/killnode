import "./style.css";

type TorrentTelemetry = {
  infoHash: string;
  name: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  downloaded: number;
  uploaded: number;
  ratio: number;
  numPeers: number;
  done: boolean;
};

const $ = (sel: string) => document.querySelector(sel) as HTMLElement;

function el(tag: string, className?: string, text?: string) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function formatRate(n: number) {
  if (n < 1024) return `${n.toFixed(0)} B/s`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB/s`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB/s`;
}

async function refreshTorStatus(pill: HTMLElement) {
  const s = await window.killnode.torStatus();
  pill.textContent = s.running ? "TOR · ACTIVE" : "TOR · OFFLINE";
  pill.className = "status-pill" + (s.running ? "" : " off");
}

function mount() {
  const root = $("#app");
  root.innerHTML = "";

  const toast = el("div", "toast");
  toast.style.display = "none";
  document.body.append(toast);

  const unsubToast = window.killnode.onToast((msg) => {
    toast.textContent = msg;
    toast.style.display = "block";
    setTimeout(() => {
      toast.style.display = "none";
    }, 4500);
  });

  const header = el("header", "top");
  const brand = el("div", "brand");
  brand.innerHTML = '<span class="kill">KILL</span><span class="node">NODE</span>';
  const pill = el("div", "status-pill off", "TOR · …");
  header.append(brand, pill);

  const grid = el("div", "grid");

  /* Tor + proxy */
  const torCard = el("section", "card");
  torCard.append(el("h2", "", "Tor · proxy mesh"));
  torCard.append(
    el(
      "p",
      "hint",
      "Tor exposes SOCKS (default 9050). Local HTTP :9742 uses proxy-chain into that SOCKS port; :9741 is a SOCKS ingress gateway into the same Tor SOCKS. Electron’s session proxy is applied only after Tor accepts TCP and the HTTP bridge is listening. Peer wire still uses TCP; run only on authorized networks."
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
  const proxyLog = el("div", "log", "");
  torCard.append(proxyLog);

  /* Ghost + obfuscation */
  const ghostCard = el("section", "card");
  ghostCard.append(el("h2", "", "Ghost / obfuscation"));
  ghostCard.append(
    el(
      "p",
      "hint",
      "Ghost tightens Tor circuit rotation. Shadowsocks / V2Ray binaries are operator-supplied and chained before the local Tor hop when enabled."
    )
  );
  const ghostRow = el("div", "row");
  const ghostCb = document.createElement("input");
  ghostCb.type = "checkbox";
  const ghostLabel = el("label", "toggle");
  ghostLabel.append(ghostCb, document.createTextNode(" Ghost mode"));
  ghostRow.append(ghostLabel);
  const obfCb = document.createElement("input");
  obfCb.type = "checkbox";
  const obfLabel = el("label", "toggle");
  obfLabel.append(obfCb, document.createTextNode(" Spawn SS / V2Ray children"));
  ghostRow.append(obfLabel);
  ghostCard.append(ghostRow);
  const locRow = el("div", "row");
  locRow.append(el("span", "", "Exit hint"));
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

  /* Torrent */
  const torrentCard = el("section", "card");
  torrentCard.append(el("h2", "", "Secure swam telemetry"));
  torrentCard.append(
    el(
      "p",
      "hint",
      "WebTorrent runs in the main process with HTTP proxying toward Tor when active. This is not a perfect anonymity layer — treat it as censored transport with reduced clearnet exposure."
    )
  );
  const magnetRow = el("div", "row");
  const magnetInput = document.createElement("input");
  magnetInput.type = "text";
  magnetInput.placeholder = "magnet:?xt=urn:btih:…";
  magnetInput.style.flex = "1";
  magnetInput.style.minWidth = "220px";
  const addMagnetBtn = el("button", "btn", "Add magnet") as HTMLButtonElement;
  const seedBtn = el("button", "btn", "Seed files…") as HTMLButtonElement;
  magnetRow.append(magnetInput, addMagnetBtn, seedBtn);
  torrentCard.append(magnetRow);
  const drop = el("div", "dropzone", "Drop files to generate a swarm (seeding)");
  torrentCard.append(drop);
  const tableWrap = el("div", "");
  const tbl = document.createElement("table");
  tbl.className = "telemetry";
  tbl.innerHTML = `<thead><tr><th>Name</th><th class="tag-data">↓</th><th class="tag-data">↑</th><th>Peers</th><th class="tag-danger">Ratio</th><th></th></tr></thead><tbody></tbody>`;
  tableWrap.append(tbl);
  torrentCard.append(tableWrap);
  const tbody = tbl.querySelector("tbody")!;

  /* Killswitch */
  const killCard = el("section", "card");
  killCard.append(el("h2", "", "Neural killswitch"));
  killCard.append(
    el(
      "p",
      "hint",
      "Terminates torrent engine, local proxies, obfuscation children, Tor, then executes host-level interface severance."
    )
  );
  const killRow = el("div", "row");
  const killBtn = el("button", "btn btn-red", "NEURAL KILLSWITCH") as HTMLButtonElement;
  const restoreBtn = el("button", "btn", "Restore hint") as HTMLButtonElement;
  killRow.append(killBtn, restoreBtn);
  killCard.append(killRow);
  const killLog = el("div", "log", "");
  killCard.append(killLog);

  /* Onion */
  const onionCard = el("section", "card");
  onionCard.append(el("h2", "", "Onion synth"));
  onionCard.append(
    el(
      "p",
      "hint",
      "Simulated v3-style onion string for clipboard workflows. Hidden services still require real Tor HS configuration."
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
    'KillNode desktop · <span class="tag-danger">Blood telemetry</span> / <span class="tag-data">Cyan data plane</span> · Read LEGAL_AND_ETHICS.md before deployment.';

  grid.append(torCard, ghostCard, torrentCard, killCard, onionCard);
  root.append(header, grid, foot);

  void window.killnode.settingsGet().then((s) => {
    ghostCb.checked = !!s.ghostMode;
    obfCb.checked = !!s.obfuscationEnabled;
    if (s.locationCode) locSelect.value = s.locationCode;
    if (s.torCustomPath) torPathInput.value = s.torCustomPath;
  });

  void refreshTorStatus(pill);
  setInterval(() => void refreshTorStatus(pill), 4000);

  const renderRows = (rows: TorrentTelemetry[]) => {
    tbody.innerHTML = "";
    for (const r of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.name}</td><td class="tag-data">${formatRate(r.downloadSpeed)}</td><td class="tag-data">${formatRate(r.uploadSpeed)}</td><td class="tag-data">${r.numPeers}</td><td class="tag-danger">${r.ratio.toFixed(2)}</td><td></td>`;
      const rm = el("button", "btn", "Drop") as HTMLButtonElement;
      rm.addEventListener("click", async () => {
        await window.killnode.torrentRemove(r.infoHash);
      });
      tr.lastElementChild!.append(rm);
      tbody.append(tr);
    }
  };

  const unsubTel = window.killnode.onTelemetry((rows) => renderRows(rows));
  void window.killnode.torrentTelemetry().then(renderRows);

  window.addEventListener(
    "beforeunload",
    () => {
      unsubTel();
      unsubToast();
    },
    { once: true }
  );

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

  obfCb.addEventListener("change", async () => {
    await window.killnode.settingsSet({ obfuscationEnabled: obfCb.checked });
  });

  locSelect.addEventListener("change", async () => {
    await window.killnode.settingsSet({ locationCode: locSelect.value });
  });

  startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    proxyLog.textContent = "";
    const r = await window.killnode.torStart();
    proxyLog.textContent = r.message;
    try {
      const ps = await window.killnode.proxyStatus();
      proxyLog.textContent += `\nHTTP bridge :${ps.httpPort} · SOCKS ingress :${ps.socksPort} · Tor SOCKS :${ps.torSocks}`;
    } catch {
      /* ignore */
    }
    startBtn.disabled = false;
    void refreshTorStatus(pill);
  });

  stopBtn.addEventListener("click", async () => {
    const r = await window.killnode.torStop();
    proxyLog.textContent = r.message;
    void refreshTorStatus(pill);
  });

  addMagnetBtn.addEventListener("click", async () => {
    const uri = magnetInput.value.trim();
    if (!uri.startsWith("magnet:")) {
      proxyLog.textContent = "Paste a magnet URI.";
      return;
    }
    const r = await window.killnode.torrentAdd(uri);
    proxyLog.textContent = r.message;
  });

  seedBtn.addEventListener("click", async () => {
    const paths = await window.killnode.pickSeedFiles();
    if (!paths.length) return;
    const r = await window.killnode.torrentSeed(paths);
    proxyLog.textContent = r.message;
  });

  ;["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      drop.classList.add("drag");
    })
  );
  drop.addEventListener("dragleave", (e) => {
    e.preventDefault();
    drop.classList.remove("drag");
  });
  drop.addEventListener("drop", async (e) => {
    e.preventDefault();
    drop.classList.remove("drag");
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    const paths = window.killnode.pathsFromDroppedFiles(Array.from(files));
    const r = await window.killnode.torrentSeed(paths);
    proxyLog.textContent = r.message;
  });

  killBtn.addEventListener("click", async () => {
    killBtn.disabled = true;
    const r = await window.killnode.killswitch();
    killLog.textContent = r.message;
    killBtn.disabled = false;
    void refreshTorStatus(pill);
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
