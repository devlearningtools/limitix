(function () {
  const ns = window.Limitix;

  function hasData(platformData) {
    if (!platformData) return false;
    // Any saved metric field (session/week/monthly/current/weekly) with a
    // real percentage counts as "this platform is already set up".
    return Object.values(platformData).some((metric) => metric && metric.usedPct != null);
  }

  function markDone(btn) {
    btn.classList.add("done");
    const action = btn.querySelector(".platform-action");
    if (action) action.textContent = "Tracking ✓";
  }

  // Reflect real saved state on load, not just "was this button clicked in
  // this page view" -- so reopening this page later (e.g. via the popup's
  // "Setup guide" button) shows what's actually been captured.
  ns.getAll().then((all) => {
    document.querySelectorAll(".platform-btn").forEach((btn) => {
      const platform = btn.getAttribute("data-platform");
      if (hasData(all[platform])) markDone(btn);
    });
  });

  document.querySelectorAll(".platform-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-url");
      chrome.tabs.create({ url });
      // Optimistic immediate feedback; markDone() above will confirm with
      // real data the next time this page loads.
      if (!btn.classList.contains("done")) {
        const action = btn.querySelector(".platform-action");
        if (action) action.textContent = "Opened ✓";
      }
    });
  });
})();
