// Reads Gemini's "Usage limits" page (gemini.google.com/.../usage).
// NOTE: patterns were written from a real screenshot, not tested live yet.
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
    // Matches "Resets at 2:10 PM" or "Resets Oct 16 at 11:10 PM"
    const m = block.match(/Resets[^\n]{0,60}/i);
    return m ? m[0].trim() : null;
  }

  function scrapeGeminiUsage() {
    const text = document.body.innerText;
    if (!text.includes("Current usage") && !text.includes("Weekly limit")) {
      return null; // Usage page isn't open right now.
    }

    const result = {};

    const currentBlock = extractBlock(text, "Current usage", ["Weekly limit"]);
    if (currentBlock) {
      result.current = {
        usedPct: parseUsedPct(currentBlock),
        resetsLabel: parseResetsLabel(currentBlock),
        updatedAt: ns.nowISO(),
      };
    }

    const weeklyBlock = extractBlock(text, "Weekly limit", ["Learn more", "\n\n"]);
    if (weeklyBlock) {
      result.weekly = {
        usedPct: parseUsedPct(weeklyBlock),
        resetsLabel: parseResetsLabel(weeklyBlock),
        updatedAt: ns.nowISO(),
      };
    }

    return Object.keys(result).length ? result : null;
  }

  function trySave() {
    const data = scrapeGeminiUsage();
    if (data) {
      ns.mergePlatform("gemini", data);
    }
  }

  const observer = new MutationObserver(() => trySave());
  observer.observe(document.body, { childList: true, subtree: true });

  trySave();
})();
