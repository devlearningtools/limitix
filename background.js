const ONBOARDED_KEY = "limitixOnboarded";
const REFRESH_ALARM = "limitixRefresh";
const REFRESH_PERIOD_MINUTES = 30;

// Deployed at https://limitix.devlearningtools.com/goodbye as of this
// writing, so this now actually shows something on uninstall.
chrome.runtime.setUninstallURL("https://limitix.devlearningtools.com/goodbye");

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install") return;

  // Belt-and-suspenders: during unpacked-extension development Chrome can
  // fire onInstalled with reason "install" more than once (e.g. after a
  // manifest change), so track whether onboarding was already shown rather
  // than trusting the event alone -- real end users only ever see this on
  // their actual first install either way.
  chrome.storage.local.get([ONBOARDED_KEY], (result) => {
    if (result[ONBOARDED_KEY]) return;
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding/welcome.html") });
    chrome.storage.local.set({ [ONBOARDED_KEY]: true });
  });

  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_PERIOD_MINUTES });
});

// In case the service worker was restarted (Chrome tears these down when
// idle) without a fresh onInstalled firing, make sure the alarm still
// exists -- chrome.alarms.create with the same name is a no-op if it does.
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_PERIOD_MINUTES });
});

// Usage pages are client-rendered (React/similar); their numbers only exist
// after the page's own JS runs and calls Claude/ChatGPT/Gemini's internal
// APIs. A plain background fetch() of the URL would only return the empty
// app shell, not the usage data -- so getting fresh data without the user
// manually opening the page requires actually loading it, briefly, the same
// way a real tab would.
//
// Two approaches were tried and failed before this one, both confirmed by
// live testing, kept here so this isn't re-attempted later:
//   1. A new window with state: "minimized" -- no errors anywhere, but data
//      never updated. Chrome throttles JS execution in minimized windows
//      enough that the page's own React app never finished fetching/
//      rendering before the window closed.
//   2. A new window positioned off-screen (large negative left/top) to
//      dodge that throttling -- chrome.windows.create itself rejected it:
//      "Bounds must be at least 50% within visible screen space" (a Chrome
//      guard against exactly this kind of hidden-window trick).
//
// What actually works: a background TAB (chrome.tabs.create, active:
// false) in the user's current window, instead of a separate window. No
// position/bounds involved, so no validation error, and Chrome's
// background-tab throttling (clamping repeated timers) is much lighter
// than minimized-window throttling and doesn't block a one-time page
// load + fetch + render. The user sees a new tab briefly appear in their
// tab strip without being switched to it, which is a fair tradeoff for
// something that actually works.
const REFRESH_URL_BY_PLATFORM = {
  claude: "https://claude.ai/settings/usage",
  chatgpt: "https://chatgpt.com/settings/usage?tab=overview",
  gemini: "https://gemini.google.com/usage",
};

const OPEN_STAGGER_MS = 3000;
const CLOSE_AFTER_MS = 12000;

function refreshInBackground(url) {
  chrome.tabs.create({ url, active: false }, (tab) => {
    if (!tab) return;
    setTimeout(() => {
      chrome.tabs.remove(tab.id, () => void chrome.runtime.lastError);
    }, CLOSE_AFTER_MS);
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== REFRESH_ALARM) return;
  Object.values(REFRESH_URL_BY_PLATFORM).forEach((url, i) => {
    setTimeout(() => refreshInBackground(url), i * OPEN_STAGGER_MS);
  });
});

// Event-based refresh: content-scripts/send-detector.js notices the user
// pressed Enter (near-universal "send" shortcut across these chat UIs) and
// messages here, so the badge catches up shortly after a message actually
// changes usage, instead of waiting for the REFRESH_ALARM's 30-minute
// cycle. send-detector.js already throttles per-tab (90s); this guards per
// platform across all tabs/windows, in case more than one tab on the same
// platform is open.
const EVENT_REFRESH_MIN_GAP_MS = 60 * 1000;
const lastEventRefreshAt = {};

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "limitixMessageSent") return;

  const platform = message.platform;
  const url = REFRESH_URL_BY_PLATFORM[platform];
  if (!url) return;

  const now = Date.now();
  if (now - (lastEventRefreshAt[platform] || 0) < EVENT_REFRESH_MIN_GAP_MS) return;
  lastEventRefreshAt[platform] = now;

  refreshInBackground(url);
});
