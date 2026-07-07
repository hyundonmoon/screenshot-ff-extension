# Element Screenshot — Firefox Extension

A minimal Firefox WebExtension to capture screenshots of DOM elements. Click the toolbar button, select an element (hover to preview, click to select), then press "Capture" or Enter to save a PNG.

Files
- manifest.json — extension metadata (MV2)
- background.js — handles screen capture and messaging
- content-script.js — element selection UI and cropping logic
- popup.html / popup.js / popup.css — optional popup UI (currently not required for direct toolbar flow)
- icons/ — placeholder SVG icons

Development
- Install web-ext: `npm install -g web-ext` (or use `npx web-ext`)
- Run locally: `npx web-ext run --source-dir=. --start-url="https://example.com"`
- Lint: `npx web-ext lint`
- Build XPI: `npx web-ext build --overwrite-dest`

Notes
- Uses Manifest V2 for broad Firefox compatibility. To move to MV3, update manifest and background worker logic.
- Privacy: screenshots are captured locally and not sent to external servers.

License
MIT
