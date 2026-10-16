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
// way a real tab would. Done here in a small, unfocused window positioned
// off-screen so none of this is visible, then closed once the content-script
// scraper (injected
// automatically, matching content_scripts in manifest.json) has had time to
// read the page and save to storage.
const REFRESH_URL_BY_PLATFORM = {
  claude: "https://claude.ai/settings/usage",
  chatgpt: "https://chatgpt.com/settings/usage?tab=overview",
  gemini: "https://gemini.google.com/usage",
};

const OPEN_STAGGER_MS = 3000;
const CLOSE_AFTER_MS = 12000;

// IMPORTANT: state: "minimized" was tried first and confirmed (by live
// testing) to silently fail -- Chrome throttles JS execution in minimized
// windows aggressively enough that the page's own React app never finishes
// fetching/rendering usage data before the window closes, so the content
// script's scraper finds nothing to save. A small window positioned off
// the visible screen area avoids that throttling (Chrome still treats it
// as "visible" since it isn't minimized), while being effectively
// invisible to the user since it renders off-screen.
function refreshInBackground(url) {
  chrome.windows.create(
    {
      url,
      focused: false,
      type: "popup",
      width: 400,
      height: 300,
      left: -2000,
      top: -2000,
    },
    (win) => {
      if (!win) return;
      setTimeout(() => {
        chrome.windows.remove(win.id, () => void chrome.runtime.lastError);
      }, CLOSE_AFTER_MS);
    }
  );
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
