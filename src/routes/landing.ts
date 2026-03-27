import type { Request, Response } from 'express';

export function renderLanding(_req: Request, res: Response) {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Claim Intel — Evidence That Thinks Across Cases</title>
<meta name="description" content="The first legal intelligence platform where claims emerge from evidence, evolve with every intake, and compound with attorney feedback.">
<meta property="og:title" content="Claim Intel — Evidence That Thinks Across Cases">
<meta property="og:description" content="Claims emerge from evidence. Cross-case pattern detection. Sovereign infrastructure. Built by Cere Network.">
<meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23c47a4a'/><text x='16' y='22' text-anchor='middle' font-size='18' font-weight='bold' fill='white'>CI</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&display=swap" rel="stylesheet">
<style>
:root {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Cormorant Garamond", ui-serif, Georgia, serif;
  --color-paper: #F7F5F0;
  --color-ink: #141414;
  --color-accent: #E05D3A;
  --color-olive: #6B705C;
  --color-surface: #EFECE5;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }

body {
  font-family: var(--font-sans);
  background-color: var(--color-paper);
  color: var(--color-ink);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

::selection { background: var(--color-ink); color: var(--color-paper); }

.serif { font-family: var(--font-serif); }
a { color: inherit; text-decoration: none; }

/* ===== NAV ===== */
nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 48px; height: 72px;
  background: rgba(247,245,240,0.8);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(20,20,20,0.05);
}
.nav-logo { font-size: 20px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
.nav-links { display: flex; align-items: center; gap: 48px; }
.nav-links a {
  font-size: 10px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase;
  opacity: 0.5; transition: opacity 0.3s;
}
.nav-links a:hover { opacity: 1; }
.nav-pill {
  border: 1px solid rgba(20,20,20,0.2); border-radius: 100px;
  padding: 10px 24px; font-size: 11px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.1em;
  background: transparent; cursor: pointer; color: var(--color-ink);
  transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
  display: inline-flex; align-items: center; gap: 8px;
}
.nav-pill:hover { border-color: var(--color-ink); }

.pulse-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--color-accent);
  animation: pulse 2s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(224,93,58,0.8);
  display: inline-block; flex-shrink: 0;
}
@keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.5); } }

.micro-label {
  font-size: 10px; text-transform: uppercase;
  letter-spacing: 0.15em; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
}

.horizontal-line { height: 1px; background-color: var(--color-ink); opacity: 0.1; }

/* ===== HERO ===== */
.hero {
  position: relative; min-height: 100vh;
  padding: 160px 48px 80px; display: flex; flex-direction: column; justify-content: flex-end;
}
.hero-content { max-width: 1400px; margin: 0 auto; width: 100%; z-index: 10; }
.hero-top {
  display: flex; justify-content: space-between; align-items: flex-end;
  padding-bottom: 48px; margin-bottom: 32px;
  border-bottom: 1px solid rgba(20,20,20,0.1); gap: 48px;
}
.hero h1 {
  font-family: var(--font-serif);
  font-size: clamp(56px, 9vw, 120px); line-height: 0.85;
  font-weight: 300; letter-spacing: -0.02em; max-width: 900px;
}
.hero h1 em { font-style: italic; color: var(--color-olive); position: relative; }
.hero h1 em .pulse-dot { position: absolute; top: 0; right: -12px; width: 8px; height: 8px; }
.hero-sidebar { max-width: 280px; flex-shrink: 0; }
.hero-sidebar p { font-size: 14px; color: rgba(20,20,20,0.65); font-weight: 400; line-height: 1.7; }
.hero-footer {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 10px; font-weight: 600; letter-spacing: 0.2em;
  text-transform: uppercase; color: rgba(20,20,20,0.5);
}
.hero-bg {
  position: absolute; top: 0; right: 0; width: 66%;
  height: 90vh; z-index: 0; overflow: hidden; opacity: 0.5;
  pointer-events: none;
}
.hero-bg img { width: 100%; height: 100%; object-fit: cover; mix-blend-mode: multiply; }
.hero-bg .fade-r { position: absolute; inset: 0; background: linear-gradient(to right, var(--color-paper), rgba(247,245,240,0.5), transparent); }
.hero-bg .fade-b { position: absolute; inset: 0; background: linear-gradient(to top, var(--color-paper), transparent); }

/* ===== SECTIONS ===== */
.section-surface { background: var(--color-surface); }
.section-dark { background: var(--color-ink); color: var(--color-paper); }

.section-h2 {
  font-family: var(--font-serif);
  font-size: clamp(40px, 5vw, 72px); line-height: 0.9;
  font-weight: 300; max-width: 800px;
}
.section-h2 em { font-style: italic; color: var(--color-olive); }

/* ===== SPLIT LAYOUT ===== */
.split { display: grid; grid-template-columns: 5fr 7fr; gap: 96px; }
.split-sticky { position: sticky; top: 128px; align-self: start; }

/* ===== PAIN POINTS ===== */
.pain-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px; }
.pain-item h3 { font-size: 14px; font-weight: 500; margin-bottom: 12px; }
.pain-item p { font-size: 14px; color: rgba(20,20,20,0.65); font-weight: 400; line-height: 1.7; }

/* ===== BALL IMAGE ===== */
.ball-container {
  width: 100%; aspect-ratio: 16/9;
  background: rgba(20,20,20,0.05); border-radius: 16px;
  overflow: hidden; position: relative; margin-top: 48px;
}
.ball-container img { width: 100%; height: 100%; object-fit: cover; mix-blend-mode: multiply; opacity: 0.9; }
.ball-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.ball-ring {
  width: 96px; height: 96px; border-radius: 50%;
  border: 1px solid rgba(247,245,240,0.2);
  backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
}

/* ===== GRID-BORDERS (Feature Grid) ===== */
.grid-borders {
  display: grid; gap: 1px;
  background-color: rgba(20,20,20,0.1);
  border: 1px solid rgba(20,20,20,0.1);
  margin-top: 64px;
}
.grid-borders.cols-4 { grid-template-columns: repeat(4, 1fr); }
.grid-borders > * { background-color: var(--color-paper); }
.feature-cell { padding: 48px; display: flex; flex-direction: column; position: relative; overflow: hidden; }
.feature-cell .feat-icon {
  width: 40px; height: 40px; border-radius: 50%;
  border: 1px solid rgba(20,20,20,0.1);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 24px; font-size: 16px;
}
.feature-cell h4 { font-size: 16px; font-weight: 500; margin-bottom: 16px; }
.feature-cell p { font-size: 14px; color: rgba(20,20,20,0.55); font-weight: 400; line-height: 1.7; margin-top: auto; }
.feature-cell .mouse-glow { position: absolute; inset: 0; opacity: 0; transition: opacity 0.5s; pointer-events: none; }
.feature-cell:hover .mouse-glow { opacity: 1; }

/* ===== VIDEO PLACEHOLDER ===== */
.video-section {
  padding: 96px 48px; display: flex; justify-content: center; align-items: center;
  background: var(--color-surface);
}
.video-box {
  width: 100%; max-width: 960px; aspect-ratio: 16/9;
  background: rgba(20,20,20,0.05); border-radius: 16px;
  border: 1px solid rgba(20,20,20,0.1); position: relative;
  overflow: hidden; cursor: pointer;
}
.video-box::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(20,20,20,0.15), transparent);
}
.video-play {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  width: 80px; height: 80px; border-radius: 50%;
  background: var(--color-accent); z-index: 2;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 30px rgba(224,93,58,0.4);
  transition: transform 0.5s cubic-bezier(0.16,1,0.3,1);
}
.video-box:hover .video-play { transform: translate(-50%,-50%) scale(1.1); }
.video-play svg { fill: #fff; margin-left: 4px; }
.video-label {
  position: absolute; bottom: 24px; left: 32px; z-index: 2;
  font-size: 14px; font-weight: 500; color: rgba(20,20,20,0.6);
}


/* ===== STATS BAR ===== */
.stats-bar {
  display: flex; justify-content: center; gap: 80px;
  padding: 80px 48px; border-top: 1px solid rgba(20,20,20,0.1);
  border-bottom: 1px solid rgba(20,20,20,0.1);
}
.stat { text-align: center; }
.stat-num {
  font-family: var(--font-serif); font-size: 72px;
  font-weight: 400; line-height: 1; color: var(--color-accent);
  text-shadow: 0 2px 20px rgba(224,93,58,0.15);
}
.stat-label {
  font-size: 10px; font-weight: 600; letter-spacing: 0.15em;
  text-transform: uppercase; color: rgba(20,20,20,0.4); margin-top: 8px;
}


/* ===== TEMPLATES (Dark Section) ===== */
.templates-layout {
  display: flex; gap: 96px; padding: 120px 48px;
  max-width: 1400px; margin: 0 auto; position: relative; z-index: 10;
}
.templates-left { width: 33%; flex-shrink: 0; }
.templates-right { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 48px 64px; }
.template-card { display: flex; flex-direction: column; cursor: default; }
.template-card .horizontal-line { background-color: var(--color-paper); opacity: 0.2; margin-bottom: 32px; transition: all 0.5s; }
.template-card:hover .horizontal-line { background-color: var(--color-accent); opacity: 1; }
.template-card .card-inner { display: flex; gap: 24px; }
.template-card .num {
  font-size: 12px; font-weight: 500; letter-spacing: 0.2em;
  color: rgba(247,245,240,0.4); margin-top: 8px;
}
.template-card h4 {
  font-family: var(--font-serif); font-size: clamp(28px, 3vw, 40px);
  font-weight: 300; margin-bottom: 16px; transition: color 0.5s;
}
.template-card:hover h4 { color: var(--color-accent); }
.template-card p { font-size: 14px; color: rgba(247,245,240,0.6); font-weight: 300; line-height: 1.7; }

.dark-bg-image { position: absolute; inset: 0; opacity: 0.2; pointer-events: none; overflow: hidden; }
.dark-bg-image img { width: 100%; height: 100%; object-fit: cover; mix-blend-mode: screen; }
.dark-bg-image .fade { position: absolute; inset: 0; background: linear-gradient(to bottom, var(--color-ink), transparent, var(--color-ink)); }

/* ===== PROOF SECTION ===== */
.proof-section {
  position: relative; overflow: hidden;
  padding: 120px 48px; border-top: 1px solid rgba(20,20,20,0.1);
  border-bottom: 1px solid rgba(20,20,20,0.1);
  background: var(--color-surface);
}
.proof-glow-1 {
  position: absolute; top: 50%; left: 25%; transform: translateY(-50%);
  width: 800px; height: 800px; background: var(--color-accent);
  border-radius: 50%; filter: blur(140px); z-index: 0;
  opacity: 0.15; pointer-events: none; mix-blend-mode: multiply;
}
.proof-glow-2 {
  position: absolute; top: 0; right: 25%;
  width: 400px; height: 400px; background: var(--color-accent);
  border-radius: 50%; filter: blur(100px); z-index: 0;
  opacity: 0.08; pointer-events: none; mix-blend-mode: multiply;
}
.proof-content { max-width: 1400px; margin: 0 auto; position: relative; z-index: 10; }
.proof-content p {
  font-size: 16px; color: rgba(20,20,20,0.65); font-weight: 400;
  line-height: 1.8; max-width: 640px; margin-bottom: 16px;
}
.proof-content p.strong { color: var(--color-ink); font-weight: 500; }

/* ===== CTA ===== */
.cta-section { position: relative; padding: 180px 48px; text-align: center; overflow: hidden; }
.cta-section h2 { font-size: clamp(48px, 6vw, 80px); }
.cta-glow {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  width: 600px; height: 600px; background: var(--color-accent);
  border-radius: 50%; filter: blur(120px); opacity: 0.12;
  pointer-events: none; mix-blend-mode: multiply;
}
.cta-section .bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.cta-section .bg img { width: 100%; height: 100%; object-fit: cover; opacity: 0.25; mix-blend-mode: multiply; }
.cta-section .bg .fade { position: absolute; inset: 0; background: linear-gradient(to top, var(--color-paper), transparent, var(--color-paper)); }
.cta-section p {
  font-size: 16px; color: rgba(20,20,20,0.65); font-weight: 400;
  max-width: 540px; margin: 24px auto 48px; line-height: 1.7;
}

/* ===== FOOTER ===== */
footer { padding: 48px; border-top: 1px solid rgba(20,20,20,0.1); }
.footer-top {
  display: flex; justify-content: space-between; align-items: flex-start;
  max-width: 1400px; margin: 0 auto; gap: 48px;
}
.footer-brand { font-size: 28px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
.footer-links {
  display: flex; gap: 64px;
  font-size: 10px; font-weight: 600; letter-spacing: 0.2em;
  text-transform: uppercase; color: rgba(20,20,20,0.5);
}
.footer-links a { display: block; margin-bottom: 16px; transition: color 0.3s; }
.footer-links a:hover { color: var(--color-ink); }
.footer-bottom {
  max-width: 1400px; margin: 64px auto 0;
  padding-top: 32px; border-top: 1px solid rgba(20,20,20,0.1);
  display: flex; justify-content: space-between;
  font-size: 10px; font-weight: 500; letter-spacing: 0.15em;
  text-transform: uppercase; color: rgba(20,20,20,0.4);
}

/* ===== SCROLL REVEAL ===== */
.reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1); }
.reveal.visible { opacity: 1; transform: translateY(0); }
.reveal-d1 { transition-delay: 0.12s; }
.reveal-d2 { transition-delay: 0.24s; }
.reveal-d3 { transition-delay: 0.36s; }

/* ===== RESPONSIVE ===== */
@media (max-width: 1024px) {
  nav { padding: 0 24px; }
  .hero, .templates-layout, .proof-section, .cta-section { padding-left: 24px; padding-right: 24px; }
  .split { grid-template-columns: 1fr; gap: 48px; }
  .split-sticky { position: static; }
  .grid-borders.cols-4 { grid-template-columns: repeat(2, 1fr); }
  .templates-layout { flex-direction: column; gap: 48px; }
  .templates-left { width: 100%; }
  .hero-top { flex-direction: column; align-items: flex-start; }
  .hero-sidebar { max-width: 100%; }
  .hero-bg { width: 100%; opacity: 0.2; }
  .stats-bar { flex-wrap: wrap; gap: 40px; padding: 60px 24px; }
  .compare-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .hero h1 { font-size: 48px; }
  .grid-borders.cols-4 { grid-template-columns: 1fr; }
  .templates-right { grid-template-columns: 1fr; }
  .pain-cols { grid-template-columns: 1fr; }
  .nav-links { display: none; }
  .footer-links { flex-direction: column; gap: 32px; }
}
</style>
</head>
<body>

<!-- NAV -->
<nav>
  <div class="nav-logo">Claim Intel</div>
  <div class="nav-links">
    <a href="#problem">Problem</a>
    <a href="#platform">Platform</a>
    <a href="#architecture">Infrastructure</a>
    <a href="#proof">Proof</a>
    <a href="/document">Live Demo</a>
  </div>
  <a href="/document" class="nav-pill">
    <span class="pulse-dot"></span>
    Live Demo
  </a>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hero-content">
    <div class="hero-top">
      <h1 class="reveal">
        Your evidence should<br>
        <em>think across cases<span class="pulse-dot"></span></em>
      </h1>
      <div class="hero-sidebar reveal reveal-d1">
        <div class="micro-label" style="margin-bottom:16px;color:rgba(20,20,20,0.5)">
          <span class="pulse-dot"></span>
          <span>Your Infrastructure. Your Data. Always.</span>
        </div>
        <p>The first legal AI built to connect the dots. Automatically links evidence to claims, detects cross-case patterns, and routes action items &mdash; so you never miss a connection. Runs entirely on your infrastructure. No cloud vendor ever sees your privileged data.</p>
        <a href="/document" class="nav-pill" style="width:100%;justify-content:center;margin-top:32px;padding:14px 24px">
          See the Live Demo &rarr;
        </a>
      </div>
    </div>
    <div class="hero-footer reveal reveal-d2">
      <div>Built by Cere</div>
      <div>Sovereign AI Infrastructure</div>
      <div>Scroll to explore</div>
    </div>
  </div>
  <div class="hero-bg">
    <img src="/assets/Hero.jpeg" alt="">
    <div class="fade-r"></div>
    <div class="fade-b"></div>
  </div>
</section>

<!-- STATS -->
<div class="stats-bar">
  <div style="width:100%;text-align:center;margin-bottom:12px" class="reveal">
    <div class="micro-label" style="justify-content:center;color:rgba(20,20,20,0.4);margin-bottom:0">
      Battle-tested on a single, massive fraud case
    </div>
  </div>
</div>
<div class="stats-bar reveal" style="border-top:none;padding-top:0">
  <div class="stat">
    <div class="stat-num" data-count="18">0</div>
    <div class="stat-label">Crime Categories</div>
  </div>
  <div class="stat">
    <div class="stat-num" data-count="7">0</div>
    <div class="stat-label">Active Proceedings</div>
  </div>
  <div class="stat">
    <div class="stat-num" data-count="58">0</div>
    <div class="stat-label">$M+ in Claims</div>
  </div>
  <div class="stat">
    <div class="stat-num" data-count="15">0</div>
    <div class="stat-label">Seconds to Analyze</div>
  </div>
</div>

<!-- THE REALITY / PROBLEM -->
<section id="problem" class="section-surface" style="padding:120px 0">
  <div style="max-width:1400px;margin:0 auto;padding:0 48px">
    <div class="split">
      <div class="split-sticky">
        <div class="micro-label reveal" style="margin-bottom:24px;color:rgba(20,20,20,0.5)">The Problem</div>
        <h2 class="section-h2 reveal reveal-d1">
          Every legal AI optimizes the output.<br>
          <em>The value lives in the input.</em>
        </h2>
      </div>
      <div style="display:flex;flex-direction:column;gap:64px;padding-top:48px">
        <div class="reveal" style="font-size:24px;font-weight:300;line-height:1.5;font-family:var(--font-serif)">
          &ldquo;Harvey drafts better. Relativity reviews faster. CoCounsel researches smarter. But none of them understand the <em>process</em> &mdash; the judgment calls an attorney makes when building a case.&rdquo;
        </div>
        <div class="pain-cols reveal reveal-d1">
          <div class="pain-item">
            <div class="horizontal-line" style="margin-bottom:24px"></div>
            <h3>The Manual Tax</h3>
            <p>Cross-referencing one email against 18 claims, 7 cases, and 19 exhibits. Manually. 2 hours. Every time.</p>
          </div>
          <div class="pain-item">
            <div class="horizontal-line" style="margin-bottom:24px"></div>
            <h3>Zero Cross-Case Detection</h3>
            <p>Every legal AI operates within a single matter. None detects that evidence in Case A connects to Case B.</p>
          </div>
        </div>
        <div class="ball-container reveal reveal-d2">
          <img src="/assets/Ball.jpeg" alt="">
          <div class="ball-overlay">
            <div class="ball-ring">
              <span class="pulse-dot" style="width:8px;height:8px;box-shadow:0 0 15px rgba(224,93,58,0.8)"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- PLATFORM -->
<section id="platform" style="padding:120px 48px">
  <div style="max-width:1400px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:64px;gap:32px;flex-wrap:wrap">
      <div>
        <div class="micro-label reveal" style="margin-bottom:24px;color:rgba(20,20,20,0.5)">
          The <span style="color:var(--color-accent);letter-spacing:0.2em">CLAIM INTEL</span> Architecture
        </div>
        <h2 class="section-h2 reveal reveal-d1">
          A knowledge graph that gets<br>
          <em>sharper</em> with every cycle.
        </h2>
      </div>
      <p class="reveal reveal-d2" style="font-size:14px;color:rgba(20,20,20,0.65);font-weight:400;max-width:340px;line-height:1.7">
        Claims emerge from evidence, evolve with feedback, and compound across cases. The infrastructure that powers legal intelligence.
      </p>
    </div>

    <div class="grid-borders cols-4 reveal">
      <div class="feature-cell" onmousemove="moveGlow(event,this)" onmouseleave="hideGlow(this)">
        <div class="mouse-glow"></div>
        <div class="feat-icon">&#x21E9;</div>
        <h4>Evidence Arrives</h4>
        <p>Email, forensic report, court filing, blockchain transaction. Any source. Structured signals extracted automatically.</p>
      </div>
      <div class="feature-cell" onmousemove="moveGlow(event,this)" onmouseleave="hideGlow(this)">
        <div class="mouse-glow"></div>
        <div class="feat-icon">&#x2726;</div>
        <h4>Claims Emerge</h4>
        <p>AI proposes claims from evidence. Each claim has legal elements: what's proven, what's partial, what's missing.</p>
      </div>
      <div class="feature-cell" onmousemove="moveGlow(event,this)" onmouseleave="hideGlow(this)">
        <div class="mouse-glow"></div>
        <div class="feat-icon">&#x21C4;</div>
        <h4>Cases Cross-Reference</h4>
        <p>One email impacts 4 proceedings in 3 jurisdictions. Action items route to the right attorney with SLA countdowns.</p>
      </div>
      <div class="feature-cell" onmousemove="moveGlow(event,this)" onmouseleave="hideGlow(this)">
        <div class="mouse-glow"></div>
        <div class="feat-icon">&#x2B06;</div>
        <h4>Intelligence Compounds</h4>
        <p>Attorney feedback updates claim weights. Every assessment makes the next scoring smarter. The system learns how you practice.</p>
      </div>
    </div>

  </div>
</section>

<!-- VIDEO PLACEHOLDER -->
<section class="video-section reveal">
  <div class="video-box" onclick="window.location='/document'">
    <div class="video-play">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
    </div>
    <div class="video-label">Platform Demonstration &mdash; Live on Real Case Data</div>
  </div>
</section>

<!-- BUILT FOR (Dark Section) -->
<section class="section-dark" style="position:relative;overflow:hidden">
  <div class="dark-bg-image">
    <img src="/assets/Ball ring.jpeg" alt="">
    <div class="fade"></div>
  </div>
  <div class="templates-layout">
    <div class="templates-left">
      <div class="micro-label reveal" style="color:var(--color-accent);margin-bottom:24px">
        <span class="pulse-dot"></span>
        <span style="letter-spacing:0.2em">Built For</span>
      </div>
      <h2 class="section-h2 reveal reveal-d1" style="color:var(--color-paper)">
        Attorneys who handle cases<br>
        <em style="color:var(--color-accent)">too complex for spreadsheets.</em>
      </h2>
      <p class="reveal reveal-d2" style="font-size:14px;color:rgba(247,245,240,0.5);font-weight:400;line-height:1.7;margin-top:24px;max-width:360px">
        If your cases span multiple jurisdictions, involve dozens of entities, and require months of evidence compilation &mdash; this is for you.
      </p>
    </div>
    <div class="templates-right">
      <div class="template-card reveal">
        <div class="horizontal-line"></div>
        <div class="card-inner">
          <div class="num">01</div>
          <div>
            <h4>Whistleblower &amp; Qui Tam</h4>
            <p>SEC, CFTC, and False Claims Act submissions require exhaustive evidence packaging. The system structures your evidence into regulator-ready claim packages with element-level proof chains.</p>
          </div>
        </div>
      </div>
      <div class="template-card reveal reveal-d1">
        <div class="horizontal-line"></div>
        <div class="card-inner">
          <div class="num">02</div>
          <div>
            <h4>Crypto &amp; Financial Fraud</h4>
            <p>On-chain transactions, off-chain communications, multi-victim coordination. The only platform that connects blockchain forensics to legal claim elements across cases and jurisdictions.</p>
          </div>
        </div>
      </div>
      <div class="template-card reveal reveal-d2">
        <div class="horizontal-line"></div>
        <div class="card-inner">
          <div class="num">03</div>
          <div>
            <h4>Multi-Jurisdictional Litigation</h4>
            <p>7 cases, 4 jurisdictions, 5 law firms. One piece of evidence impacts all of them. Cross-case implications detected automatically and routed with filing-deadline SLAs.</p>
          </div>
        </div>
      </div>
      <div class="template-card reveal reveal-d3">
        <div class="horizontal-line"></div>
        <div class="card-inner">
          <div class="num">04</div>
          <div>
            <h4>Securities &amp; SEC Enforcement</h4>
            <p>Broker-dealer violations, unregistered offerings, insider trading patterns. Build airtight regulatory submissions with automated element tracking across overlapping proceedings.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ARCHITECTURE (Own Section) -->
<section id="architecture" style="padding:120px 48px;border-top:1px solid rgba(20,20,20,0.1)">
  <div style="max-width:1400px;margin:0 auto">
    <div class="split">
      <div class="split-sticky">
        <div class="micro-label reveal" style="margin-bottom:24px;color:rgba(20,20,20,0.5)">Infrastructure</div>
        <h2 class="section-h2 reveal reveal-d1">
          Privilege-safe<br>
          <em>by design.</em>
        </h2>
        <p class="reveal reveal-d2" style="font-size:14px;color:rgba(20,20,20,0.65);font-weight:400;line-height:1.7;margin-top:24px;max-width:360px">
          Built for attorneys who can't afford privilege waiver risk. Every byte of evidence stays on infrastructure you control.
        </p>
      </div>
      <div style="display:flex;flex-direction:column;gap:40px;padding-top:24px">
        <div class="reveal">
          <div class="horizontal-line" style="margin-bottom:24px"></div>
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">On-Premise or Private Cloud</h3>
          <p style="font-size:14px;color:rgba(20,20,20,0.65);font-weight:400;line-height:1.7">Deploy on your own servers or a dedicated cloud instance. No shared tenancy. No data commingling. Your environment, your rules.</p>
        </div>
        <div class="reveal reveal-d1">
          <div class="horizontal-line" style="margin-bottom:24px"></div>
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Per-Case Encryption</h3>
          <p style="font-size:14px;color:rgba(20,20,20,0.65);font-weight:400;line-height:1.7">Every case gets its own encryption keys. Cryptographic access controls ensure that only authorized attorneys can see case data. Ethical walls enforced by math, not policy.</p>
        </div>
        <div class="reveal reveal-d2">
          <div class="horizontal-line" style="margin-bottom:24px"></div>
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Court-Admissible Audit Trails</h3>
          <p style="font-size:14px;color:rgba(20,20,20,0.65);font-weight:400;line-height:1.7">Content-addressed storage proves evidence hasn't been altered. Append-only version history creates a tamper-proof chain of custody for every document, claim, and assessment.</p>
        </div>
        <div class="reveal reveal-d3">
          <div class="horizontal-line" style="margin-bottom:24px"></div>
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Zero Data Exposure</h3>
          <p style="font-size:14px;color:rgba(20,20,20,0.65);font-weight:400;line-height:1.7">No cloud vendor, no AI provider, no third party ever sees your privileged communications. The AI runs locally &mdash; your models, your inference, your data.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- DUAL STREAM VALIDATION -->
<section id="dual-stream" style="padding:120px 48px;border-top:1px solid rgba(20,20,20,0.1)">
  <div style="max-width:1400px;margin:0 auto">
    <div class="split">
      <div class="split-sticky">
        <div class="micro-label reveal" style="margin-bottom:24px;color:rgba(20,20,20,0.5)">
          <span class="pulse-dot"></span>
          <span>Dual Stream Validation</span>
        </div>
        <h2 class="section-h2 reveal reveal-d1">
          AI and attorneys evaluate<br>
          <em>the same evidence.</em>
        </h2>
        <p class="reveal reveal-d2" style="font-size:14px;color:rgba(20,20,20,0.65);font-weight:400;line-height:1.7;margin-top:24px;max-width:360px">
          Two independent streams. One shared truth. The AI extracts signals and scores claims. The attorney assesses impact and admissibility. Side-by-side comparison reveals where they converge &mdash; and where human judgment adds what AI cannot.
        </p>
      </div>
      <div style="display:flex;flex-direction:column;gap:40px;padding-top:24px">
        <div class="reveal">
          <div class="horizontal-line" style="margin-bottom:24px"></div>
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Independent Parallel Assessment</h3>
          <p style="font-size:14px;color:rgba(20,20,20,0.65);font-weight:400;line-height:1.7">AI and attorneys evaluate the same evidence independently. Stream A extracts entities, scores claims, and detects cross-case impacts. Stream B captures attorney judgment: impact rating, admissibility, and strategic notes. Neither stream sees the other until comparison.</p>
        </div>
        <div class="reveal reveal-d1">
          <div class="horizontal-line" style="margin-bottom:24px"></div>
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Side-by-Side Comparison</h3>
          <p style="font-size:14px;color:rgba(20,20,20,0.65);font-weight:400;line-height:1.7">When both streams complete, a comparison view reveals agreement percentage, delta indicators where scores diverge, and the specific signals each stream captured. AI excels at cross-case pattern detection. Attorneys add nuance on admissibility and strategic weight.</p>
        </div>
        <div class="reveal reveal-d2">
          <div class="horizontal-line" style="margin-bottom:24px"></div>
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Feedback-Driven Distillation</h3>
          <p style="font-size:14px;color:rgba(20,20,20,0.65);font-weight:400;line-height:1.7">When an attorney confirms or overrides an AI score, the distillation agent adjusts claim weights. These weight shifts compound over time &mdash; the system learns how your firm practices law. Every assessment makes the next scoring cycle smarter.</p>
        </div>
        <div class="reveal reveal-d3">
          <div class="horizontal-line" style="margin-bottom:24px"></div>
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Per-Case Cryptographic Namespace</h3>
          <p style="font-size:14px;color:rgba(20,20,20,0.65);font-weight:400;line-height:1.7">Each case gets its own cryptographic namespace with isolated encryption keys. Ethical walls enforced by math, not policy. Stream data from Case A is physically inaccessible from Case B &mdash; even to the AI itself.</p>
        </div>
      </div>
    </div>

    <!-- Visual comparison mockup -->
    <div class="reveal" style="margin-top:64px;display:grid;grid-template-columns:1fr 80px 1fr;gap:0;border:1px solid rgba(20,20,20,0.1);border-radius:16px;overflow:hidden">
      <div style="padding:32px;background:rgba(90,138,138,0.04)">
        <div style="font-size:10px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:rgba(20,20,20,0.4);margin-bottom:16px">Stream A &mdash; AI Pipeline</div>
        <div style="font-size:24px;font-weight:300;font-family:var(--font-serif);margin-bottom:16px;line-height:1.2">vivian-theft <span style="color:var(--color-accent)">0.95</span></div>
        <div style="font-size:14px;color:rgba(20,20,20,0.55);line-height:1.7">
          Entities extracted: 4<br>
          Cross-case impacts: 3<br>
          Confidence: 92%<br>
          Processing time: 2.3s
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;background:rgba(20,20,20,0.03)">
        <div style="text-align:center">
          <div style="font-family:var(--font-serif);font-size:28px;font-weight:400;color:var(--color-accent)">94%</div>
          <div style="font-size:8px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:rgba(20,20,20,0.4);margin-top:4px">Agreement</div>
        </div>
      </div>
      <div style="padding:32px;background:rgba(196,122,74,0.04)">
        <div style="font-size:10px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:rgba(20,20,20,0.4);margin-bottom:16px">Stream B &mdash; Attorney</div>
        <div style="font-size:24px;font-weight:300;font-family:var(--font-serif);margin-bottom:16px;line-height:1.2">Impact: <span style="color:var(--color-accent)">9/10</span></div>
        <div style="font-size:14px;color:rgba(20,20,20,0.55);line-height:1.7">
          Useful: Yes<br>
          Admissible: Yes<br>
          Priority: Critical<br>
          Weight drift: +28.6%
        </div>
      </div>
    </div>

  </div>
</section>

<!-- PROOF -->
<section id="proof" class="proof-section">
  <div class="proof-glow-1"></div>
  <div class="proof-glow-2"></div>
  <div class="proof-content">
    <div class="micro-label reveal" style="margin-bottom:24px;color:rgba(20,20,20,0.5)">
      <span class="pulse-dot"></span>
      <span>Proof</span>
    </div>
    <h2 class="section-h2 reveal reveal-d1" style="margin-bottom:48px">
      We didn't build this in a lab.<br>
      <em>We built it because we needed it.</em>
    </h2>
    <p class="reveal reveal-d2">We're actively litigating a multi-jurisdictional fraud case: 18 crime categories, 7 active proceedings across 4 jurisdictions (NDCA, Dubai, Delaware, BVI). 8+ victims. $267M maximum recovery including RICO treble damages. 40+ exhibits catalogued. A living litigation command center.</p>
    <p class="reveal reveal-d2">When our lead counsel sent an email about a CEO confirming he never authorized a RICO lawsuit, we needed to know instantly: which of our 18 claims does this strengthen? Which 4 cases does it impact? Which 5 attorneys need to act, and by when?</p>
    <p class="strong reveal reveal-d3">No tool could do this. So we built one. Then we realized: every law firm dealing with complex fraud needs exactly the same thing.</p>
  </div>
</section>

<!-- CTA -->
<section class="cta-section">
  <div class="bg">
    <img src="/assets/Partner.jpeg" alt="">
    <div class="fade"></div>
  </div>
  <div class="cta-glow"></div>
  <div style="position:relative;z-index:10">
    <div class="micro-label reveal" style="justify-content:center;margin-bottom:32px;color:rgba(20,20,20,0.5)">
      <span class="pulse-dot"></span>
      <span>Live Demo</span>
    </div>
    <h2 class="section-h2 reveal reveal-d1" style="text-align:center;margin:0 auto">
      See it work on<br>a <em>real case.</em>
    </h2>
    <p class="reveal reveal-d2">Watch Rocky's actual email arrive and ripple across 18 claims, 7 cases, and 5 attorneys in 15 seconds.</p>
    <a href="/document" class="nav-pill reveal reveal-d3" style="background:var(--color-accent);color:#fff;border-color:var(--color-accent);box-shadow:0 0 20px rgba(224,93,58,0.3);padding:14px 32px">
      Open the Live Demo &rarr;
    </a>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="footer-top">
    <div class="footer-brand">Claim Intel</div>
    <div class="footer-links">
      <div>
        <a href="/document">Live Demo</a>
        <a href="/document">Document View</a>
      </div>
      <div>
        <a href="#platform">Platform</a>
        <a href="#proof">Proof</a>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <div>&copy; 2026 Cere. All rights reserved.</div>
    <div>Sovereign AI Infrastructure for Legal Evidence</div>
  </div>
</footer>

<script>
// Scroll reveal — fire early, fallback after 3s
(function(){
  const els=document.querySelectorAll('.reveal');
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')});
  },{threshold:0.05,rootMargin:'0px 0px 80px 0px'});
  els.forEach(el=>io.observe(el));
  setTimeout(()=>els.forEach(el=>el.classList.add('visible')),3000);
})();

// Animated counters
(function(){
  const counters=document.querySelectorAll('[data-count]');
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting&&!e.target.dataset.animated){
        e.target.dataset.animated='1';
        const target=parseInt(e.target.dataset.count);
        const start=performance.now();
        const duration=1400;
        function tick(now){
          const p=Math.min((now-start)/duration,1);
          const ease=1-Math.pow(1-p,3);
          e.target.textContent=Math.round(target*ease);
          if(p<1)requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
    });
  },{threshold:0.3});
  counters.forEach(c=>io.observe(c));
})();

// Mouse-follow glow on feature cells
function moveGlow(e,el){
  const r=el.getBoundingClientRect();
  const x=e.clientX-r.left, y=e.clientY-r.top;
  const glow=el.querySelector('.mouse-glow');
  if(glow) glow.style.background='radial-gradient(circle 200px at '+x+'px '+y+'px, rgba(20,20,20,0.04), transparent)';
}
function hideGlow(el){
  const glow=el.querySelector('.mouse-glow');
  if(glow) glow.style.background='none';
}

// Smooth anchor links
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const t=document.querySelector(a.getAttribute('href'));
    if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'})}
  });
});
</script>

</body>
</html>`);
}
