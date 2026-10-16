// Triggers an event-based usage refresh instead of waiting for the
// 30-minute timer, so the badge reflects reality shortly after it
// actually changes (a new message sent), not on an arbitrary clock.
//
// Deliberately not tied to a specific send-button selector (fragile,
// would need live DOM access per platform to get right) -- Enter-to-send
// (Shift+Enter for a newline) is the near-universal convention across
// Claude, ChatGPT, and Gemini's chat UIs, so a plain Enter keydown is used
// as the "a message was probably just sent" signal instead. A false
// positive (Enter pressed somewhere else) just causes one extra,
// invisible background refresh -- harmless, not a correctness issue.
(function () {
  function platformForHost() {
    const host = location.hostname;
    if (host.includes("claude.ai")) return "claude";
    if (host.includes("chatgpt.com")) return "chatgpt";
    if (host.includes("gemini.google.com")) return "gemini";
    return null;
  }

  const platform = platformForHost();
  if (!platform) return;

  const MIN_GAP_MS = 90 * 1000; // don't spam a refresh on every keystroke burst
  let lastTriggeredAt = 0;

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter" || e.shiftKey) return;

      const now = Date.now();
      if (now - lastTriggeredAt < MIN_GAP_MS) return;
      lastTriggeredAt = now;

      // Give the platform's own backend a few seconds to actually process
      // the message and update its usage counters before refreshing.
      setTimeout(() => {
        try {
          chrome.runtime.sendMessage({ type: "limitixMessageSent", platform });
        } catch (err) {
          // Extension context invalidated (stale tab after a reload during
          // development) -- harmless, see shared/storage.js for the same
          // guard pattern.
        }
      }, 8000);
    },
    true
  );
})();
