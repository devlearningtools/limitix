# Limitix

> The free Chrome extension that tells you your AI usage before the platform tells you *"You've reached your limit."*

<p>
  <img alt="Website" src="https://img.shields.io/badge/website-limitix.devlearningtools.com-F0A94E?style=for-the-badge">
  <img alt="Manifest" src="https://img.shields.io/badge/manifest-V3-blue?style=for-the-badge">
  <img alt="Open Source" src="https://img.shields.io/badge/open%20source-yes-brightgreen?style=for-the-badge">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-orange?style=for-the-badge">
</p>
<p>
  <img alt="Privacy" src="https://img.shields.io/badge/privacy-100%25%20local-brightgreen?style=for-the-badge">
  <img alt="Status" src="https://img.shields.io/badge/status-in%20development-blueviolet?style=for-the-badge">
</p>

Built by [DevLearningTools](https://devlearningtools.com).

## AI platforms are part of your daily work now. But none of them put this on screen:

- How close you are to your limit
- Exactly when it resets
- Whether it's worth starting one more long task right now

Limitix reads what each platform's own Settings page already knows, and keeps it visible — without you going and checking it yourself every time.

## Supported AI platforms

| Platform | Status |
| --- | --- |
| Claude | ✅ Supported |
| ChatGPT | ✅ Supported |
| Gemini | ✅ Supported |

## What Limitix does

| Feature | Claude | ChatGPT | Gemini |
| --- | --- | --- | --- |
| Usage % + reset time | ✅ | ✅ | ✅ |
| Floating on-page badge | ✅ | ✅ | ✅ |
| Background auto-refresh (every 30 min) | ✅ | ✅ | ✅ |
| Event-based refresh (shortly after you send a message) | ✅ | ✅ | ✅ |
| 100% local, no account | ✅ | ✅ | ✅ |

Unlike some similar tools, every platform here gets the same real treatment — none is a second-class estimate. See **How it works** below for why.

## How it works

Limitix never calls any internal/undocumented API. It reads the plain text already visible on each platform's own Settings → Usage page (percentage used, reset time), and saves it to `chrome.storage.local` — on your device only. A floating badge on the chat page, and the extension popup, show that saved data, kept fresh by:

- A background refresh every 30 minutes (a minimized, unfocused window — invisible to you)
- An event-based refresh a few seconds after you send a message, so it doesn't lag behind a fixed timer

This is deliberately different from reverse-engineering a platform's private API: it's slower to update than true real-time, but it can't break silently when an undocumented endpoint changes, and it never touches anything beyond the page you'd already be looking at yourself.

- No account, no API key, no sign-up
- No backend, no analytics, no data ever leaves the browser
- Open source, MIT licensed

## Project structure

```
limitix/
├── manifest.json              Manifest V3 config
├── background.js              onInstalled, setUninstallURL, 30-min alarm, event-refresh listener
├── shared/storage.js          chrome.storage.local helpers, shared by all scripts
├── content-scripts/
│   ├── claude-scraper.js      Reads Claude's "Your usage" panel
│   ├── chatgpt-scraper.js     Reads ChatGPT's "Usage" settings page
│   ├── gemini-scraper.js      Reads Gemini's "Usage limits" page
│   ├── badge.js                Floating on-page badge (Shadow DOM)
│   └── send-detector.js        Detects a sent message, triggers an event-based refresh
├── popup/                      Extension toolbar popup
├── onboarding/welcome.html     Shown once, on first install
├── privacy/privacy.html        Privacy policy, bundled copy
├── goodbye/goodbye.html        Shown on uninstall (bundled copy)
├── icons/                      Extension icons (16/32/48/128)
└── web/                        Public static site, deployed to limitix.devlearningtools.com
    ├── index.html              Landing page
    ├── privacy/index.html      Public Privacy Policy (required by Chrome Web Store)
    └── goodbye/index.html      Public goodbye page (required by setUninstallURL)
```

## Local development

1. Open `chrome://extensions`, enable **Developer mode**.
2. Click **Load unpacked**, select this folder (`limitix/`).
3. Open Claude, ChatGPT, or Gemini, navigate to Settings → Usage once.
4. Click the extension icon to see the popup, or look for the floating badge on the chat page.

Content scripts log diagnostic output prefixed `[Limitix]` to the page console.

## Status

Not yet published to the Chrome Web Store. The public site (`web/`) needs redeploying — see open items in the repo before submission.

## License

[MIT](LICENSE)
