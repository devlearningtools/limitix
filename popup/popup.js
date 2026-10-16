(function () {
  const ns = window.Limitix;

  const PLATFORM_CONFIG = [
    {
      key: "claude",
      label: "Claude",
      metrics: [
        { field: "session", label: "Current session" },
        { field: "week", label: "This week" },
      ],
    },
    {
      key: "chatgpt",
      label: "ChatGPT",
      metrics: [{ field: "monthly", label: "Monthly limit" }],
    },
    {
      key: "gemini",
      label: "Gemini",
      metrics: [
        { field: "current", label: "Current usage" },
        { field: "weekly", label: "Weekly limit" },
      ],
    },
  ];

  function metricRow(metricLabel, metricData) {
    const row = document.createElement("div");
    row.className = "limitix-metric-row";

    if (!metricData || metricData.usedPct == null) {
      row.innerHTML = `
        <span class="limitix-metric-dot" style="background:#555"></span>
        <span class="limitix-metric-label">${metricLabel}</span>
        <span class="limitix-metric-value" style="color:#666">no data yet</span>
      `;
      return row;
    }

    const color = ns.thresholdColor(metricData.usedPct);
    row.innerHTML = `
      <span class="limitix-metric-dot" style="background:${color}"></span>
      <span class="limitix-metric-label">${metricLabel} &middot; ${metricData.resetsLabel || ""}</span>
      <span class="limitix-metric-value" style="color:${color}">${metricData.usedPct}%</span>
    `;
    return row;
  }

  function render(all) {
    const container = document.getElementById("platforms");
    container.innerHTML = "";

    PLATFORM_CONFIG.forEach((platform) => {
      const block = document.createElement("div");
      block.className = "limitix-platform";

      const name = document.createElement("div");
      name.className = "limitix-platform-name";
      name.textContent = platform.label;
      block.appendChild(name);

      const platformData = all[platform.key];
      let hasAny = false;

      platform.metrics.forEach((m) => {
        const metricData = platformData ? platformData[m.field] : null;
        if (metricData) hasAny = true;
        block.appendChild(metricRow(m.label, metricData));
      });

      if (!hasAny) {
        const hint = document.createElement("div");
        hint.className = "limitix-empty";
        hint.textContent = "Open Settings → Usage on " + platform.label + " once to start tracking.";
        block.appendChild(hint);
      }

      container.appendChild(block);
    });
  }

  ns.getAll().then(render);

  document.getElementById("guideBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding/welcome.html") });
  });

  document.getElementById("privacyLink").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: "https://limitix.devlearningtools.com/privacy" });
  });
})();
