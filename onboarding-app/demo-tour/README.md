# Product tour video

Recorded against the web app in **demo mode** (`vite --mode demo`), which swaps the connector
services for fictional in-memory data (`src/demo/`). No real candidates, tenant IDs or URLs appear.

```bash
# 1. app in demo mode
cd onboarding-app && npx vite --mode demo --port 5180 --strictPort
# 2. tooling (once, outside the app): npm i playwright ffmpeg-static && npx playwright install ffmpeg ; pip install numpy
node tour.mjs            # records demo-video/onboarding-tour.webm, prints TRIM
node cards.mjs           # title.png / end.png
node watermark.mjs       # PowerTech watermark.png
python music.py <sec> music.wav   # original ambient track (synthesised, royalty-free)
```

Then assemble with ffmpeg: title (4s) → tour (trimmed) → end (5s) with 0.6s crossfades,
watermark bottom-left at 85% opacity, music as AAC 192k — see the session notes for the exact filter graph.
Uses Microsoft Edge (`channel: 'msedge'`), so no Chromium download is needed.
