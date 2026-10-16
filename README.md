# Limitix

See your Claude, ChatGPT, and Gemini usage limits and reset times without digging through Settings every time. Free Chrome extension, 100% local, no account needed.

Built by [DevLearningTools](https://devlearningtools.com).

## How it works

Limitix never calls any internal/undocumented API. It reads the plain text already visible on each platform's own Settings → Usage page (percentage used, reset time), and saves it to `chrome.storage.local` — on your device only. A small badge on the chat page, and the extension popup, show that last-saved data until you next open that Usage page.

- No account, no API key, no sign-up
- No backend, no analytics, no data ever leaves the browser
- Supports Claude, ChatGPT, and Gemini

## Project structure

```
limitix/
├── manifest.json              Manifest V3 config
├── background.js              onInstalled (onboarding) + setUninstallURL (goodbye page)
├── shared/storage.js          chrome.storage.local helpers, shared by all scripts
├── content-scripts/
│   ├── claude-scraper.js      Reads Claude's "Your usage" panel
│   ├── chatgpt-scraper.js     Reads ChatGPT's "Usage" settings page
│   ├── gemini-scraper.js      Reads Gemini's "Usage limits" page
│   └── badge.js                Floating on-page badge (Shadow DOM)
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

Not yet published to the Chrome Web Store. `web/` is not yet deployed — `background.js`'s `setUninstallURL` and the Privacy Policy links point to `https://limitix.devlearningtools.com`, which doesn't resolve until that deploy happens.
