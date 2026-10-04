// Scripted product tour of the Employee Onboarding web app (demo mode, fictional data).
// Records a 1920x1080 video with an on-screen cursor, captions and title cards.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const URL = 'http://localhost:5180/';
const OUT = 'C:/Users/navan/OneDrive/Desktop/Flows/demo-video';
const W = 1920;
const H = 1080;

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.webm')) rmSync(join(OUT, f));

// Overlay: fake cursor + click ripple + caption pill + title cards. Injected before the app loads.
const OVERLAY = `
(() => {
  const css = \`
  #tour-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;
    transform:translate(-100px,-100px);filter:drop-shadow(0 3px 6px rgba(0,0,0,.55));transition:opacity .2s}
  .tour-ripple{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;z-index:2147483646;pointer-events:none;
    border:3px solid rgba(196,181,253,.95);box-shadow:0 0 24px rgba(168,85,247,.9);animation:tourRipple .55s ease-out forwards}
  @keyframes tourRipple{from{transform:scale(.3);opacity:1}to{transform:scale(1.6);opacity:0}}
  #tour-caption{position:fixed;left:50%;bottom:56px;transform:translate(-50%,20px);opacity:0;z-index:2147483645;pointer-events:none;
    display:flex;align-items:center;gap:16px;padding:16px 30px 16px 18px;border-radius:999px;
    background:rgba(13,14,28,.82);backdrop-filter:blur(18px);border:1px solid rgba(167,139,250,.45);
    box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 40px rgba(124,58,237,.35);
    font:600 26px 'Segoe UI Variable Display','Segoe UI',sans-serif;color:#fff;white-space:nowrap;transition:all .45s cubic-bezier(.22,1,.36,1)}
  #tour-caption.on{opacity:1;transform:translate(-50%,0)}
  #tour-caption .n{display:grid;place-items:center;min-width:44px;height:44px;border-radius:50%;font-size:18px;
    background:linear-gradient(135deg,#4f46e5,#7c3aed 55%,#db2777)}
  #tour-caption .s{font-weight:400;font-size:19px;color:#c7cbe0;margin-left:4px}
  #tour-card{position:fixed;inset:0;z-index:2147483644;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;
    background:radial-gradient(1200px 600px at 20% 10%,rgba(79,70,229,.55),transparent 60%),radial-gradient(900px 500px at 85% 90%,rgba(219,39,119,.4),transparent 60%),#0b0d17;
    color:#fff;font-family:'Segoe UI Variable Display','Segoe UI',sans-serif;opacity:0;pointer-events:none;transition:opacity .6s}
  #tour-card.on{opacity:1}
  #tour-card .logo{width:96px;height:96px;border-radius:28px;display:grid;place-items:center;font-size:52px;
    background:linear-gradient(135deg,#4f46e5,#7c3aed 55%,#db2777);box-shadow:0 20px 60px rgba(124,58,237,.6)}
  #tour-card h1{margin:0;font-size:76px;font-weight:800;letter-spacing:-.03em;background:linear-gradient(90deg,#fff,#c4b5fd);-webkit-background-clip:text;color:transparent}
  #tour-card p{margin:0;font-size:30px;color:#c7cbe0}
  #tour-card .chips{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;max-width:1400px;margin-top:10px}
  #tour-card .chips span{padding:10px 22px;border-radius:999px;font-size:22px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)}
  \`;
  const add = () => {
    if (document.getElementById('tour-cursor')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const c = document.createElement('div'); c.id = 'tour-cursor';
    c.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 11.2-6.6.9 3.8 7.4-2.9 1.5-3.8-7.5L4 20z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    const cap = document.createElement('div'); cap.id = 'tour-caption'; document.body.appendChild(cap);
    const card = document.createElement('div'); card.id = 'tour-card'; document.body.appendChild(card);
    addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)'; }, true);
    addEventListener('mousedown', (e) => {
      const r = document.createElement('div'); r.className = 'tour-ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
      document.body.appendChild(r); setTimeout(() => r.remove(), 600);
    }, true);
  };
  window.__tour = {
    caption(n, text, sub) {
      const cap = document.getElementById('tour-caption');
      if (!text) { cap.classList.remove('on'); return; }
      cap.innerHTML = (n ? '<span class="n">' + n + '</span>' : '') + '<span>' + text + (sub ? '<span class="s"> · ' + sub + '</span>' : '') + '</span>';
      cap.classList.add('on');
    },
    card(html) {
      const card = document.getElementById('tour-card');
      if (!html) { card.classList.remove('on'); return; }
      card.innerHTML = html; card.classList.add('on');
    },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
})();
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'msedge', headless: true });
{
  const warm = await browser.newContext({ viewport: { width: W, height: H } });
  const wp = await warm.newPage();
  await wp.goto(URL);
  await wp.waitForSelector('.kpi', { timeout: 60000 });
  await sleep(2250); // let any Vite re-optimisation reload settle
  await wp.reload();
  await wp.waitForSelector('.kpi', { timeout: 60000 });
  await warm.close();
}
const t0 = Date.now();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: OUT, size: { width: W, height: H } },
  reducedMotion: 'no-preference',
  colorScheme: 'dark',
});
await context.addInitScript(() => {
  try {
    localStorage.setItem('onb-theme', 'dark');
    localStorage.setItem('onb-sidebar', 'open');
  } catch {}
});
await context.addInitScript(OVERLAY);
const page = await context.newPage();

const caption = (n, text, sub) => page.evaluate(([a, b, c]) => window.__tour.caption(a, b, c), [n, text, sub]);
const card = (html) => page.evaluate((h) => window.__tour.card(h), html);

async function moveTo(locator, { steps = 14, dx = 0.5, dy = 0.5 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  if (!b) throw new Error('No box for locator');
  const x = b.x + b.width * dx;
  const y = b.y + b.height * dy;
  await page.mouse.move(x, y, { steps });
  return { x, y };
}
async function click(locator, opts) {
  const { x, y } = await moveTo(locator, opts);
  await sleep(120);
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
  await sleep(100);
  return { x, y };
}
async function typeSlow(text, delay = 70) {
  for (const ch of text) await page.keyboard.type(ch, { delay });
}
async function smoothScroll(selector, to, ms = 1400) {
  await page.evaluate(
    ([sel, target, dur]) =>
      new Promise((res) => {
        const el = document.querySelector(sel);
        const start = el.scrollTop;
        const end = target === 'bottom' ? el.scrollHeight - el.clientHeight : target;
        const t0 = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          el.scrollTop = start + (end - start) * e;
          p < 1 ? requestAnimationFrame(step) : res();
        };
        requestAnimationFrame(step);
      }),
    [selector, to, ms],
  );
}

// ---------------------------------------------------------------- TOUR
await page.goto(URL);
await page.waitForSelector('.kpi', { timeout: 30000 });
await page.mouse.move(W / 2, H / 2);
const trimStart = (Date.now() - t0) / 1000;
await sleep(600);

// 1 — Dashboard
await caption(1, 'Live hiring dashboard', 'KPIs · funnel · pipeline mix');
await sleep(2400);
await moveTo(page.locator('.kpi').nth(3));
await sleep(900);
await moveTo(page.locator('.funnel'));
await sleep(900);
await smoothScroll('.main', 'bottom', 1300);
await caption(1, 'Today’s interviews & what needs action', 'plus upcoming joiners');
await sleep(1950);
await smoothScroll('.main', 0, 1200);
await sleep(400);

// 2 — Command palette
await caption(2, 'Ctrl + K — jump to anything');
await moveTo(page.locator('.search-pill'));
await sleep(500);
await page.keyboard.press('Control+K');
await sleep(900);
await typeSlow('arjun', 90);
await sleep(825);
await page.keyboard.press('Enter');
await page.waitForSelector('.profile-hero');

// 3 — Candidate journey
await caption(3, 'Every candidate’s journey at a glance', 'Resume → Tech 1 → Tech 2 → HR → Offer');
await sleep(2400);
await click(page.getByRole('tab', { name: /^Interviews/ }));
await caption(3, 'Interview feedback & ratings', 'Tech 1 · Tech 2 · HR');
await sleep(1950);
await click(page.getByRole('tab', { name: 'Offer' }));
await caption(3, 'Offer with full salary breakup', 'Basic · HRA · PF · Gratuity · Variable');
await sleep(2400);

// 4 — Drag & drop pipeline → send offer
await click(page.locator('.nav-item', { hasText: 'Candidates' }));
await page.waitForSelector('.kanban');
await caption(4, 'Drag & drop hiring pipeline');
await sleep(1200);
const cardLoc = page.locator('.kcard-btn', { hasText: 'Arjun Rao' });
const target = page.locator('section.kcol').filter({ hasText: 'Offer out' });
const from = await moveTo(cardLoc, { dy: 0.3 });
await sleep(300);
await page.mouse.down();
await sleep(150);
const tb = await target.boundingBox();
await page.mouse.move(from.x + 30, from.y + 10, { steps: 6 });
await page.mouse.move(tb.x + tb.width / 2, tb.y + 140, { steps: 26 });
await sleep(700);
await page.mouse.up();
await page.waitForSelector('[role="dialog"]');
await caption(4, 'Drop on “Offer out” to send the offer', 'via DocuSign e-signature');
await sleep(1350);
await click(page.getByRole('dialog').getByRole('button', { name: 'Send offer' }));
await sleep(1950);

// 5 — AI resume auto-fill
await click(page.locator('.cta'));
await page.waitForSelector('.dropzone');
await caption(5, 'Upload a resume — AI fills the profile', 'AI Builder OCR + prompt');
await sleep(1125);
await moveTo(page.locator('.dropzone'));
await page.locator('input[type=file]').setInputFiles({
  name: 'Neha_Kapoor_Resume.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n% demo resume\n'),
});
await sleep(3225);
await caption(5, 'Fields filled by AI glow until reviewed', 'manual entry if AI is unavailable');
await smoothScroll('.main', 560, 1500);
await sleep(1650);
await smoothScroll('.main', 'bottom', 1500);
await caption(5, 'CTC → automatic salary breakup');
const ctc = page.getByLabel('Annual CTC (₹)');
await click(ctc);
await typeSlow('2800000', 45);
await sleep(400);
await click(page.getByRole('button', { name: 'Calculate breakup' }));
await sleep(1650);
await click(page.getByRole('button', { name: 'Create candidate' }));
await page.waitForSelector('.profile-hero');
await sleep(1650);

// 6 — Interviews
await click(page.locator('.nav-item', { hasText: 'Interviews' }));
await caption(6, 'Interview agenda with Teams links');
await sleep(1650);
await click(page.getByRole('tab', { name: /Awaiting feedback/ }));
await caption(6, 'Record feedback in seconds');
await sleep(900);
await click(page.getByRole('button', { name: 'Result' }).first());
await sleep(900);
await click(page.locator('button[aria-label="5 stars"]'));
await click(page.locator('.fui-DrawerBody textarea'));
await typeSlow('Strong Power Platform skills, great communicator.', 16);
await sleep(500);
await click(page.getByRole('button', { name: 'Save result' }));
await sleep(1800);

// 7 — Onboarding
await click(page.locator('.nav-item', { hasText: 'Onboarding' }));
await caption(7, 'Day-one readiness for every new joiner');
await sleep(1800);
await click(page.locator('.joiner', { hasText: 'Aditya Sharma' }));
await page.waitForSelector('.task-group');
await sleep(900);
await caption(7, 'Tick off the checklist…');
const lastTask = page.locator('.task-group li:not(.done)').first();
await click(lastTask.locator('label'));
await sleep(1125);
await caption(7, '…and celebrate a fully onboarded hire 🎉');
await click(page.getByRole('button', { name: 'Mark as onboarded' }));
await sleep(2700);

// 8 — Light theme (stay on the joiner page — it repaints instantly)
await caption(8, 'Dark & light themes');
await click(page.locator('button[aria-label="Light theme"]'));
await sleep(2600);
await caption(null);
await sleep(700);

const video = page.video();
await context.close();
await browser.close();
const raw = await video.path();
const dest = join(OUT, 'onboarding-tour.webm');
renameSync(raw, dest);
writeFileSync(join(OUT, 'README.txt'), 'Recorded in demo mode with fictional data. No real candidate or tenant data.\n');
console.log('VIDEO', dest);
console.log('TRIM', trimStart.toFixed(2));
