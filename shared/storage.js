// Shared storage helpers, loaded before each platform's scraper/badge script.
// Exposes a single global namespace so the other content scripts (loaded as
// plain classic scripts, not ES modules) can call into it directly.
window.Limitix = window.Limitix || {};

(function (ns) {
  const STORAGE_KEY = "limitixUsage";

  // Shape saved in chrome.storage.local:
  // {
  //   claude: { session: { usedPct, resetsLabel, updatedAt }, week: { usedPct, resetsLabel, updatedAt } },
  //   chatgpt: { monthly: { usedPct, resetsLabel, updatedAt } },
  //   gemini: { current: { usedPct, resetsLabel, updatedAt }, weekly: { usedPct, resetsLabel, updatedAt } }
  // }

  // True once the extension has been reloaded/updated while this content
  // script's page was already open -- chrome.* calls then throw "Extension
  // context invalidated". Harmless in that situation (only happens during
  // development, when reloading the extension without also reloading the
  // open tab), but worth failing quietly instead of spamming the console.
  function isContextValid() {
    return typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id;
  }

  ns.getAll = function () {
    if (!isContextValid()) return Promise.resolve({});
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
          if (chrome.runtime.lastError) {
            resolve({});
            return;
          }
          resolve(result[STORAGE_KEY] || {});
        });
      } catch (err) {
        resolve({});
      }
    });
  };

  // Merges `patch` (e.g. { claude: { session: {...} } }) into the saved data
  // one level deep per platform, so saving `chatgpt` data never wipes out
  // whatever was last saved for `claude` or `gemini`.
  ns.mergePlatform = function (platform, data) {
    if (!isContextValid()) return Promise.resolve();
    return ns.getAll().then((all) => {
      const next = Object.assign({}, all);
      next[platform] = Object.assign({}, next[platform], data);
      return new Promise((resolve) => {
        try {
          chrome.storage.local.set({ [STORAGE_KEY]: next }, resolve);
        } catch (err) {
          resolve();
        }
      });
    });
  };

  ns.nowISO = function () {
    return new Date().toISOString();
  };

  // "3 min ago" / "2 hr ago" / "just now" style relative label.
  ns.relativeTime = function (isoString) {
    if (!isoString) return "never";
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.round(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  ns.thresholdColor = function (usedPct) {
    if (usedPct == null) return "#888";
    if (usedPct >= 90) return "#e05555";
    if (usedPct >= 75) return "#e0a855";
    return "#4caf7d";
  };
})(window.Limitix);
