// Renders the 1920x1080 title and end cards as PNGs (same design as the tour overlay).
import { chromium } from 'playwright';

const base = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:1920px;height:1080px;overflow:hidden}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;color:#fff;
  font-family:'Segoe UI Variable Display','Segoe UI',sans-serif;
  background:radial-gradient(1200px 600px at 20% 10%,rgba(79,70,229,.55),transparent 60%),
             radial-gradient(900px 500px at 85% 90%,rgba(219,39,119,.4),transparent 60%),#0b0d17}
.logo{width:104px;height:104px;border-radius:30px;display:grid;place-items:center;font-size:56px;
  background:linear-gradient(135deg,#4f46e5,#7c3aed 55%,#db2777);box-shadow:0 20px 60px rgba(124,58,237,.6)}
h1{margin:0;font-size:84px;font-weight:800;letter-spacing:-.03em;background:linear-gradient(90deg,#fff,#c4b5fd);-webkit-background-clip:text;color:transparent;padding-bottom:6px}
p{margin:0;font-size:32px;color:#c7cbe0}
.chips{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;max-width:1500px;margin-top:12px}
.chips span{padding:11px 24px;border-radius:999px;font-size:23px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15)}
.cta{margin-top:18px;font-size:26px;color:#e9d5ff}
</style></head><body>`;

const cards = {
  'title.png': `${base}<div class="logo">⚡</div><h1>Employee Onboarding</h1>
    <p>Resume → Interviews → Offer → Day one</p>
    <div class="chips"><span>Power Apps</span><span>Power Automate</span><span>AI Builder</span><span>DocuSign</span><span>SharePoint</span></div></body></html>`,
  'end.png': `${base}<div class="logo">⚡</div><h1>Built on Microsoft Power Platform</h1>
    <p>Web app · Mobile app · Cloud flows — one solution</p>
    <div class="chips"><span>Power Apps code apps (React)</span><span>Expo mobile app</span><span>Power Automate</span><span>AI Builder</span><span>DocuSign</span><span>SharePoint</span><span>Outlook</span></div>
    <div class="cta">👍 Like · 🔔 Subscribe to PowerTech for more Power Platform builds</div></body></html>`,
};

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [file, html] of Object.entries(cards)) {
  await page.setContent(html);
  await page.screenshot({ path: file });
}
await browser.close();
console.log('cards rendered');
