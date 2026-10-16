// Floating badge shown on the main chat pages (not just the usage panel),
// so the last-known usage numbers stay visible without reopening Settings.
// Uses a Shadow DOM root so the host page's CSS can never leak in or get
// overridden by it.
(function () {
  const ns = window.Limitix;

  const BADGE_CSS = `
    :host { all: initial; }
    .limitix-badge {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1c1c1c;
      color: #f2f2f2;
      border: 1px solid #333;
      border-radius: 10px;
      padding: 8px 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.3;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      cursor: default;
      user-select: none;
    }
    .limitix-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .limitix-text { display: flex; flex-direction: column; }
    .limitix-pct { font-weight: 600; }
    .limitix-sub { color: #a0a0a0; font-size: 11px; }
  `;

  function platformForHost() {
    const host = location.hostname;
    if (host.includes("claude.ai")) return "claude";
    if (host.includes("chatgpt.com")) return "chatgpt";
    if (host.includes("gemini.google.com")) return "gemini";
    return null;
  }

  // Picks the single most relevant number to show in the small badge,
  // preferring the shorter-cycle one (session/current over week/monthly)
  // since that's usually the one closest to running out.
  function pickPrimary(platform, data) {
    if (!data) return null;
    if (platform === "claude") return data.session || data.week || null;
    if (platform === "chatgpt") return data.monthly || null;
    if (platform === "gemini") return data.current || data.weekly || null;
    return null;
  }

  function buildBadge(root, platform, primary) {
    root.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "limitix-badge";

    if (!primary || primary.usedPct == null) {
      wrap.innerHTML = `
        <div class="limitix-dot" style="background:#888"></div>
        <div class="limitix-text">
          <div class="limitix-pct">Limitix</div>
          <div class="limitix-sub">Open Settings &rarr; Usage once</div>
        </div>
      `;
      root.appendChild(wrap);
      return;
    }

    const color = ns.thresholdColor(primary.usedPct);
    const relTime = ns.relativeTime(primary.updatedAt);

    wrap.innerHTML = `
      <div class="limitix-dot" style="background:${color}"></div>
      <div class="limitix-text">
        <div class="limitix-pct">${primary.usedPct}% used</div>
        <div class="limitix-sub">${primary.resetsLabel || ""} &middot; ${relTime}</div>
      </div>
    `;
    root.appendChild(wrap);
  }

  function init() {
    const platform = platformForHost();
    if (!platform) return;

    const host = document.createElement("div");
    host.id = "limitix-badge-host";
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });

    // Inlined rather than linked: a shadow root doesn't inherit page-level
    // stylesheets, and linking an extension file here would additionally
    // require listing it in web_accessible_resources for no real benefit.
    const style = document.createElement("style");
    style.textContent = BADGE_CSS;
    shadow.appendChild(style);

    const root = document.createElement("div");
    shadow.appendChild(root);

    function refresh() {
      ns.getAll().then((all) => {
        const primary = pickPrimary(platform, all[platform]);
        buildBadge(root, platform, primary);
      });
    }

    refresh();
    // Storage changes (a scraper just saved fresh data) should update the
    // badge immediately without waiting for the next poll.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.limitixUsage) refresh();
    });
    // Also refresh periodically so "X min ago" stays accurate even with no
    // new data.
    setInterval(refresh, 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
