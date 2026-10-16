// Reads ChatGPT's Settings -> Usage panel. Unlike Claude/Gemini, ChatGPT's
// panel shows "% remaining" rather than "% used" -- converted to usedPct
// here so storage/badge code can treat all three platforms the same way.
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

  function parseUsedPctFromRemaining(block) {
    const m = block.match(/(\d{1,3})%\s*remaining/i);
    if (!m) return null;
    return 100 - parseInt(m[1], 10);
  }

  function parseResetsLabel(block) {
    // Matches "Resets in 30d 0h"
    const m = block.match(/Resets[^\n]{0,60}/i);
    return m ? m[0].trim() : null;
  }

  function scrapeChatGptUsage() {
    const text = document.body.innerText;
    if (!text.includes("Monthly usage limit") && !text.includes("Plan limits")) {
      return null; // Usage panel isn't open right now.
    }

    const block = extractBlock(text, "Monthly usage limit", ["Usage limit resets", "Available"]);
    if (!block) return null;

    return {
      monthly: {
        usedPct: parseUsedPctFromRemaining(block),
        resetsLabel: parseResetsLabel(block),
        updatedAt: ns.nowISO(),
      },
    };
  }

  function trySave() {
    const data = scrapeChatGptUsage();
    if (data) {
      ns.mergePlatform("chatgpt", data);
    }
  }

  const observer = new MutationObserver(() => trySave());
  observer.observe(document.body, { childList: true, subtree: true });

  trySave();
})();
