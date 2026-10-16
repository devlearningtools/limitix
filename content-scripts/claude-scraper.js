// Reads Claude's own "Your usage" settings panel (Settings -> Usage) and
// saves whatever it finds to local storage. Pure text-pattern matching
// against document.body.innerText, deliberately not tied to CSS class
// names, since Claude's UI can restyle without changing its wording.
// NOTE: patterns were written from a real screenshot of the panel but
// have not yet been tested against the live DOM. Adjust the regexes in
// `extractBlock` below if Claude's exact wording changes.
(function () {
  const ns = window.Limitix;

  function extractBlock(text, startLabel, endLabels) {
    const startIdx = text.indexOf(startLabel);
    if (startIdx === -1) return null;
    const afterStart = text.slice(startIdx + startLabel.length);
    let endIdx = afterStart.length;
    for (const label of endLabels) {
      const idx = afterStart.indexOf(label);
      if (idx !== -1 && idx < endIdx) endIdx = idx;
    }
    return afterStart.slice(0, endIdx);
  }

  function parseUsedPct(block) {
    const m = block.match(/(\d{1,3})%\s*used/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function parseResetsLabel(block) {
    // Matches "Resets at 3:10 PM" or "Resets Friday 6:30 PM"
    const m = block.match(/Resets[^\n]{0,60}/i);
    return m ? m[0].trim() : null;
  }

  function scrapeClaudeUsage() {
    const text = document.body.innerText;
    if (!text.includes("Current session") && !text.includes("This week")) {
      return null; // Usage panel isn't open right now.
    }
    console.log("[Limitix] usage panel detected, parsing...");

    const result = {};

    const sessionBlock = extractBlock(text, "Current session", ["This week", "Limit resets"]);
    console.log("[Limitix] sessionBlock:", JSON.stringify(sessionBlock));
    if (sessionBlock) {
      result.session = {
        usedPct: parseUsedPct(sessionBlock),
        resetsLabel: parseResetsLabel(sessionBlock),
        updatedAt: ns.nowISO(),
      };
    }

    const weekBlock = extractBlock(text, "This week", ["Limit resets", "Usage credits"]);
    console.log("[Limitix] weekBlock:", JSON.stringify(weekBlock));
    if (weekBlock) {
      result.week = {
        usedPct: parseUsedPct(weekBlock),
        resetsLabel: parseResetsLabel(weekBlock),
        updatedAt: ns.nowISO(),
      };
    }

    console.log("[Limitix] parsed result:", result);
    return Object.keys(result).length ? result : null;
  }

  let lastRunAt = 0;
  function trySave() {
    // MutationObserver can fire dozens of times a second on a busy SPA;
    // throttle so we're not re-scanning document.body.innerText constantly.
    const now = Date.now();
    if (now - lastRunAt < 500) return;
    lastRunAt = now;

    const data = scrapeClaudeUsage();
    if (data) {
      ns.mergePlatform("claude", data).then(() => {
        console.log("[Limitix] saved claude data:", data);
      });
    }
  }

  console.log("[Limitix] claude-scraper.js loaded on", location.href);

  // Usage panel is a client-side overlay, not a distinct URL, so watch for
  // DOM changes rather than relying on navigation events.
  const observer = new MutationObserver(() => trySave());
  observer.observe(document.body, { childList: true, subtree: true });

  // Also check once on load, in case the panel is already open (e.g. a
  // direct link to the usage view).
  trySave();
})();
