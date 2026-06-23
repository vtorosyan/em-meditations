#!/usr/bin/env node
/*
 * Static site generator for "EM Meditations".
 * Zero dependencies. Reads the markdown content in this repo and emits a
 * self-contained static site into ./docs (ready for GitHub Pages).
 *
 *   node build.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "docs");
const SITE_TITLE = "EM Meditations";
const SITE_DESC =
  "Stoic meditations and reflections for Engineering Managers navigating leadership, technology, and human dynamics.";

/* ------------------------------------------------------------------ *
 * Minimal, tailored Markdown -> HTML converter.
 * Handles exactly the constructs used in this content: headings,
 * paragraphs, bold/italic, links, ordered & unordered lists, blockquotes,
 * horizontal rules and hard line breaks.
 * ------------------------------------------------------------------ */

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Inline formatting: links, bold, italic, code.
function inline(text, linkRewriter) {
  let out = escapeHtml(text);

  // Inline code (rare, but safe to support).
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);

  // Links: [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const url = linkRewriter ? linkRewriter(href) : href;
    const ext = /^https?:\/\//.test(url);
    const attrs = ext ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${url}"${attrs}>${label}</a>`;
  });

  // Bold then italic (bold first so ** isn't eaten by *).
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Hard line break: two trailing spaces.
  out = out.replace(/ {2,}$/g, "<br>");

  return out;
}

function mdToHtml(md, linkRewriter) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;

  const flushParagraph = (buf) => {
    if (!buf.length) return;
    const joined = buf
      .map((l) => inline(l.replace(/ {2,}$/, "  "), linkRewriter))
      .join("\n");
    html.push(`<p>${joined}</p>`);
    buf.length = 0;
  };

  let para = [];

  while (i < lines.length) {
    let line = lines[i];
    const trimmed = line.trim();

    // Blank line ends a paragraph.
    if (trimmed === "") {
      flushParagraph(para);
      i++;
      continue;
    }

    // Horizontal rule.
    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      flushParagraph(para);
      html.push("<hr>");
      i++;
      continue;
    }

    // Headings.
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushParagraph(para);
      const level = h[1].length;
      html.push(`<h${level}>${inline(h[2].trim(), linkRewriter)}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote.
    if (/^>\s?/.test(trimmed)) {
      flushParagraph(para);
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      html.push(
        `<blockquote>${inline(quote.join(" "), linkRewriter)}</blockquote>`
      );
      continue;
    }

    // Unordered list.
    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph(para);
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      html.push(
        "<ul>" +
          items.map((it) => `<li>${inline(it, linkRewriter)}</li>`).join("") +
          "</ul>"
      );
      continue;
    }

    // Ordered list.
    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph(para);
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      html.push(
        "<ol>" +
          items.map((it) => `<li>${inline(it, linkRewriter)}</li>`).join("") +
          "</ol>"
      );
      continue;
    }

    // Default: accumulate paragraph text (preserve trailing 2 spaces).
    para.push(line.replace(/\s+$/, line.endsWith("  ") ? "  " : ""));
    i++;
  }
  flushParagraph(para);

  return html.join("\n");
}

/* ------------------------------------------------------------------ *
 * Page layout
 * ------------------------------------------------------------------ */

function layout({ title, body, description, activeNav, depth }) {
  const base = depth === 1 ? "../" : "";
  const pageTitle = title === SITE_TITLE ? title : `${title} · ${SITE_TITLE}`;
  const navLink = (href, label, key) =>
    `<a href="${base}${href}"${
      activeNav === key ? ' class="active"' : ""
    }>${label}</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${escapeHtml(description || SITE_DESC)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}assets/style.css">
</head>
<body data-base="${base}">
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${base}index.html">
      <span class="brand-mark">&#x25C8;</span>
      <span class="brand-text">EM&nbsp;Meditations</span>
    </a>
    <nav class="site-nav">
      ${navLink("index.html", "Meditations", "home")}
      ${navLink("themes.html", "Themes", "themes")}
      ${navLink("about.html", "About", "about")}
      <button id="random-btn" class="random-btn" type="button" title="Read a random meditation">&#x2726; Surprise me</button>
      <button id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode" title="Toggle theme">&#9789;</button>
    </nav>
  </div>
</header>
<main id="main" class="wrap">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p>Not lessons — meditations. Not a manual, but a mirror.</p>
    <p class="muted">✍️ Words written by a human, from lived experience — not generated by AI. Site built with AI.</p>
    <p class="muted">Inspired by <em>The Daily Stoic</em>. More writing at <a href="https://vtorosyan.github.io/" target="_blank" rel="noopener noreferrer">vtorosyan.github.io</a>.</p>
  </div>
</footer>
<script src="${base}assets/app.js"></script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ *
 * Content parsing helpers
 * ------------------------------------------------------------------ */

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), "utf8");
}

// Parse a meditation file into metadata + html body.
function parseMeditation(file) {
  const raw = read(path.join("meditations", file));
  const lines = raw.split("\n");

  // Title from first H1, e.g. "# 001: The Freedom of No Opinion"
  const titleLine = lines.find((l) => /^#\s+/.test(l)) || "";
  const fullTitle = titleLine.replace(/^#\s+/, "").trim();
  const numMatch = fullTitle.match(/^(\d+)\s*:\s*(.*)$/);
  const number = numMatch ? numMatch[1] : "";
  const shortTitle = numMatch ? numMatch[2] : fullTitle;

  // Date and Theme lines: "*Date: 2026-06-16*" / "*Theme: ...*"
  const dateMatch = raw.match(/\*Date:\s*([^*]+)\*/);
  const themeMatch = raw.match(/\*Theme:\s*([^*]+)\*/);
  const date = dateMatch ? dateMatch[1].trim() : "";
  const theme = themeMatch ? themeMatch[1].trim() : "";

  // Quote: first italic line under "## Today's Quote"
  let quote = "";
  let quoteAttr = "";
  const qm = raw.match(/##\s*Today.?s Quote\s*\n+\s*\*"?([^*]+?)"?\*\s*-?\s*(.*)/);
  if (qm) {
    quote = qm[1].replace(/^["']|["']$/g, "").trim();
    quoteAttr = qm[2].trim();
  }

  // Build body HTML but drop the leading H1 + the date/theme meta lines
  // (we render those in a styled header instead).
  let bodyMd = raw;
  // remove first H1 line
  bodyMd = bodyMd.replace(/^#\s+.*\n/, "");
  // remove the Date/Theme meta block (consecutive *...* lines at top)
  bodyMd = bodyMd.replace(/^\s*\*Date:[^\n]*\n(?:\s*\*Theme:[^\n]*\n)?/, "");

  const linkRewriter = (href) => rewriteLink(href, 1);
  const bodyHtml = mdToHtml(bodyMd, linkRewriter);

  return {
    file,
    slug: file.replace(/\.md$/, ".html"),
    number,
    fullTitle,
    shortTitle,
    date,
    theme,
    quote,
    quoteAttr,
    bodyHtml,
  };
}

// Rewrite internal .md links to .html, adjusting for output depth.
// depth 0 = root pages (index/themes/about), depth 1 = meditation pages.
function rewriteLink(href, depth) {
  if (/^https?:\/\//.test(href)) return href;
  let h = href;
  // strip anchor
  let anchor = "";
  const ai = h.indexOf("#");
  if (ai >= 0) {
    anchor = h.slice(ai);
    h = h.slice(0, ai);
  }
  h = h.replace(/\.md$/, ".html");

  // Normalise from a meditation page (depth 1).
  if (depth === 1) {
    if (h.startsWith("meditations/")) {
      h = h.replace(/^meditations\//, ""); // sibling file
    } else if (h === "index.html" || h === "themes.html" || h === "about.html") {
      h = "../" + h;
    } else if (h === "README.html") {
      h = "../about.html";
    }
  } else {
    if (h === "README.html") h = "about.html";
  }
  return h + anchor;
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function write(rel, contents) {
  const full = path.join(OUT, rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, contents);
  console.log("  ✓", rel);
}

function build() {
  console.log("Building EM Meditations site → docs/");

  // Clean output (preserve nothing stale).
  fs.rmSync(OUT, { recursive: true, force: true });
  ensureDir(OUT);

  // Collect meditations in numeric order.
  const files = fs
    .readdirSync(path.join(ROOT, "meditations"))
    .filter((f) => f.endsWith(".md"))
    .sort();
  const meditations = files.map(parseMeditation);

  // Assets. Inject the meditation list (paths relative to site root) so the
  // "Surprise me" button can pick one client-side.
  const medList = meditations.map((m) => `meditations/${m.slug}`);
  write("assets/style.css", CSS);
  write(
    "assets/app.js",
    APP_JS.replace("__MEDITATIONS__", JSON.stringify(medList))
  );
  write(".nojekyll", "");

  /* ---- Home / index ---- */
  buildHome(meditations);

  /* ---- Themes ---- */
  buildThemes(meditations);

  /* ---- About ---- */
  buildAbout();

  /* ---- Each meditation ---- */
  meditations.forEach((m, idx) => {
    buildMeditation(m, meditations[idx - 1], meditations[idx + 1]);
  });

  console.log(`\nDone. ${meditations.length} meditations + 3 pages.`);
  console.log("Preview:  npx serve docs   (or open docs/index.html)");
}

function buildHome(meditations) {
  const intro = `
    <section class="hero">
      <p class="kicker">Stoic reflections for engineering leaders</p>
      <h1>EM Meditations</h1>
      <p class="lede">${escapeHtml(SITE_DESC)}</p>
      <p class="hero-note">📚 Not lessons — meditations.&nbsp;&nbsp;🛠️ Not a manual, but a mirror.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#all">Browse all</a>
        <button id="hero-random" class="btn btn-outline" type="button">&#x2726; Read a random meditation</button>
      </div>
    </section>`;

  const cards = meditations
    .slice()
    .reverse()
    .map(
      (m) => `
      <a class="card" href="meditations/${m.slug}">
        <div class="card-top">
          <span class="card-num">№ ${m.number}</span>
          <span class="tag">${escapeHtml(m.theme)}</span>
        </div>
        <h3>${escapeHtml(m.shortTitle)}</h3>
        ${
          m.quote
            ? `<p class="card-quote">“${escapeHtml(
                truncate(m.quote, 130)
              )}”</p>`
            : ""
        }
        <span class="card-meta">${escapeHtml(m.date)}</span>
      </a>`
    )
    .join("\n");

  const body = `${intro}
    <section id="all">
      <div class="section-head">
        <h2>All meditations</h2>
        <a class="ghost-link" href="themes.html">Browse by theme →</a>
      </div>
      <div class="card-grid">
${cards}
      </div>
    </section>`;

  write(
    "index.html",
    layout({ title: SITE_TITLE, body, activeNav: "home", depth: 0 })
  );
}

function buildThemes(meditations) {
  // Group by theme, preserving first-seen order.
  const groups = new Map();
  meditations.forEach((m) => {
    const key = m.theme || "Uncategorised";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  });

  const sections = [...groups.entries()]
    .map(
      ([theme, items]) => `
      <section class="theme-block">
        <h2>${escapeHtml(theme)}</h2>
        <ul class="theme-list">
${items
  .map(
    (m) =>
      `          <li><a href="meditations/${m.slug}"><span class="li-num">${m.number}</span> ${escapeHtml(
        m.shortTitle
      )}</a></li>`
  )
  .join("\n")}
        </ul>
      </section>`
    )
    .join("\n");

  const body = `
    <section class="page-head">
      <p class="kicker">Find what fits your moment</p>
      <h1>Themes</h1>
      <p class="lede">Meditations grouped by common engineering-management challenges and Stoic principles.</p>
    </section>
    <div class="themes">
${sections}
    </div>`;

  write(
    "themes.html",
    layout({
      title: "Themes",
      body,
      description: "Browse EM Meditations by theme.",
      activeNav: "themes",
      depth: 0,
    })
  );
}

function buildAbout() {
  let md = read("README.md");
  // Drop the leading "# EM Meditations" title (rendered in page head).
  md = md.replace(/^#\s+EM Meditations\s*\n/, "");
  const bodyHtml = mdToHtml(md, (href) => rewriteLink(href, 0));

  const body = `
    <section class="page-head">
      <p class="kicker">About this project</p>
      <h1>Why this exists</h1>
    </section>
    <div class="note">
      <p class="note-title">✍️ Written by a human</p>
      <p>Every meditation here is purely my own personal experience and reflection — none of it is written or generated by AI. It's honest, first-hand, and sometimes unpolished, on purpose.</p>
      <p>The <em>website</em>, though, is built by AI — the words are mine, the code and design that present them were generated with AI assistance.</p>
      <p>If you'd like to read more of my writing, you'll find my blog at <a href="https://vtorosyan.github.io/" target="_blank" rel="noopener noreferrer">vtorosyan.github.io</a>.</p>
    </div>
    <article class="prose">
${bodyHtml}
    </article>`;

  write(
    "about.html",
    layout({
      title: "About",
      body,
      description: "About the EM Meditations project.",
      activeNav: "about",
      depth: 0,
    })
  );
}

function buildMeditation(m, prev, next) {
  const nav = `
    <nav class="med-nav">
      ${
        prev
          ? `<a class="prev" href="${prev.slug}"><span>← Previous</span><strong>${escapeHtml(
              prev.shortTitle
            )}</strong></a>`
          : `<span></span>`
      }
      ${
        next
          ? `<a class="next" href="${next.slug}"><span>Next →</span><strong>${escapeHtml(
              next.shortTitle
            )}</strong></a>`
          : `<span></span>`
      }
    </nav>`;

  const body = `
    <article class="meditation">
      <header class="med-header">
        <a class="back-link" href="../index.html">← All meditations</a>
        <p class="med-number">Meditation № ${m.number}</p>
        <h1>${escapeHtml(m.shortTitle)}</h1>
        <p class="med-meta">
          <span class="tag">${escapeHtml(m.theme)}</span>
          <span class="dot">·</span>
          <time>${escapeHtml(m.date)}</time>
        </p>
      </header>
      <div class="prose">
${m.bodyHtml}
      </div>
    </article>
${nav}`;

  write(
    path.join("meditations", m.slug),
    layout({
      title: `${m.number}: ${m.shortTitle}`,
      body,
      description: m.quote ? truncate(m.quote, 150) : SITE_DESC,
      activeNav: "home",
      depth: 1,
    })
  );
}

function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

/* ------------------------------------------------------------------ *
 * Assets
 * ------------------------------------------------------------------ */

const CSS = `:root{
  --bg:#ffffff;
  --bg-elev:#fcfbf9;
  --ink:#3a362f;
  --ink-soft:#736b60;
  --muted:#b3aa9c;
  --line:#f1ece4;
  --accent:#bb8557;
  --accent-soft:#d4a576;
  --quote:#8a7e6c;
  --shadow:0 1px 2px rgba(60,46,30,.02),0 6px 20px rgba(60,46,30,.03);
  --radius:14px;
  --maxw:760px;
  --maxw-wide:1040px;
}
[data-theme="dark"]{
  --bg:#1a1714;
  --bg-elev:#221e1a;
  --ink:#ece5da;
  --ink-soft:#c3b8a8;
  --muted:#8f8474;
  --line:#352f28;
  --accent:#cf9a64;
  --accent-soft:#e0b483;
  --quote:#c8bba6;
  --shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px rgba(0,0,0,.35);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;
  background:var(--bg);
  color:var(--ink);
  font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-size:18px;
  line-height:1.7;
  -webkit-font-smoothing:antialiased;
  transition:background .3s ease,color .3s ease;
}
.wrap{max-width:var(--maxw-wide);margin:0 auto;padding:0 24px}
main.wrap{max-width:var(--maxw-wide)}
.skip-link{position:absolute;left:-999px}
.skip-link:focus{left:8px;top:8px;background:var(--bg-elev);padding:8px 12px;border-radius:8px;z-index:10}

/* Header */
.site-header{
  position:sticky;top:0;z-index:20;
  background:color-mix(in srgb,var(--bg) 88%,transparent);
  backdrop-filter:saturate(140%) blur(10px);
  border-bottom:1px solid var(--line);
}
.header-inner{display:flex;align-items:center;justify-content:space-between;height:64px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-weight:600}
.brand-mark{color:var(--accent);font-size:20px}
.brand-text{font-family:"Cormorant Garamond",serif;font-size:24px;letter-spacing:.3px}
.site-nav{display:flex;align-items:center;gap:6px}
.site-nav a{
  text-decoration:none;color:var(--ink-soft);font-size:15px;font-weight:500;
  padding:8px 12px;border-radius:8px;transition:background .2s,color .2s;
}
.site-nav a:hover{color:var(--ink);background:color-mix(in srgb,var(--accent) 12%,transparent)}
.site-nav a.active{color:var(--accent)}
.theme-toggle{
  border:1px solid var(--line);background:var(--bg-elev);color:var(--ink);
  width:36px;height:36px;border-radius:9px;cursor:pointer;font-size:16px;
  display:grid;place-items:center;transition:transform .2s,border-color .2s;
}
.theme-toggle:hover{transform:rotate(-15deg);border-color:var(--accent-soft)}
.random-btn{
  border:1px solid var(--line);background:var(--bg-elev);color:var(--ink-soft);
  font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;
  padding:8px 13px;border-radius:9px;transition:color .2s,border-color .2s,background .2s;
}
.random-btn:hover{color:var(--accent);border-color:var(--accent-soft);background:color-mix(in srgb,var(--accent) 8%,transparent)}

/* Hero buttons */
.hero-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:30px}
.btn{
  display:inline-flex;align-items:center;gap:8px;font-family:inherit;font-size:16px;
  font-weight:600;cursor:pointer;text-decoration:none;padding:13px 24px;border-radius:11px;
  border:1px solid transparent;transition:transform .2s,background .2s,border-color .2s,color .2s;
}
.btn:hover{transform:translateY(-2px)}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:var(--accent-soft)}
.btn-outline{background:transparent;border-color:var(--accent-soft);color:var(--accent)}
.btn-outline:hover{background:color-mix(in srgb,var(--accent) 10%,transparent)}

/* Hero */
.hero{padding:72px 0 40px;text-align:center;max-width:var(--maxw);margin:0 auto}
.kicker{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:600;margin:0 0 14px}
.hero h1{
  font-family:"Cormorant Garamond",serif;font-weight:600;
  font-size:clamp(44px,8vw,76px);line-height:1.02;margin:0 0 18px;letter-spacing:-.5px;
}
.lede{font-size:20px;color:var(--ink-soft);max-width:600px;margin:0 auto 22px}
.hero-note{color:var(--muted);font-size:16px;margin:0}

/* Page head */
.page-head{padding:60px 0 30px;max-width:var(--maxw);margin:0 auto;text-align:center}
.page-head h1{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:clamp(38px,6vw,58px);margin:0 0 14px;letter-spacing:-.4px}

.section-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin:24px 0 22px;flex-wrap:wrap}
.section-head h2{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:34px;margin:0}
.ghost-link{color:var(--accent);text-decoration:none;font-weight:500;font-size:15px}
.ghost-link:hover{text-decoration:underline}

/* Cards */
.card-grid{
  display:grid;gap:20px;padding-bottom:60px;
  grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
}
.card{
  display:flex;flex-direction:column;
  background:var(--bg-elev);border:1px solid var(--line);border-radius:var(--radius);
  padding:24px;text-decoration:none;color:var(--ink);
  box-shadow:var(--shadow);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease;
}
.card:hover{transform:translateY(-4px);border-color:var(--accent-soft);box-shadow:0 10px 30px rgba(60,46,30,.08)}
.card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:10px}
.card-num{font-family:"Cormorant Garamond",serif;font-size:20px;color:var(--muted);font-weight:500}
.card h3{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:26px;line-height:1.12;margin:0 0 12px}
.card-quote{color:var(--quote);font-style:italic;font-size:16px;margin:0 0 16px;flex:1}
.card-meta{color:var(--muted);font-size:13px;margin-top:auto}
.tag{
  display:inline-block;font-size:12px;font-weight:600;letter-spacing:.03em;
  color:var(--accent);background:color-mix(in srgb,var(--accent) 13%,transparent);
  padding:4px 10px;border-radius:999px;white-space:nowrap;
}

/* Themes */
.themes{max-width:var(--maxw);margin:0 auto;padding-bottom:60px}
.theme-block{margin-bottom:40px}
.theme-block h2{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:30px;margin:0 0 6px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.theme-list{list-style:none;margin:14px 0 0;padding:0}
.theme-list li{margin:0}
.theme-list a{
  display:flex;align-items:center;gap:14px;text-decoration:none;color:var(--ink);
  padding:12px 12px;border-radius:10px;transition:background .15s,color .15s;
}
.theme-list a:hover{background:color-mix(in srgb,var(--accent) 9%,transparent);color:var(--accent)}
.li-num{font-family:"Cormorant Garamond",serif;color:var(--muted);font-size:18px;min-width:34px}

/* Meditation page */
.meditation{max-width:var(--maxw);margin:0 auto;padding-top:40px}
.med-header{text-align:center;margin-bottom:34px}
.back-link{display:inline-block;color:var(--muted);text-decoration:none;font-size:14px;margin-bottom:24px}
.back-link:hover{color:var(--accent)}
.med-number{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:600;margin:0 0 10px}
.med-header h1{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:clamp(36px,6vw,54px);line-height:1.05;margin:0 0 16px;letter-spacing:-.4px}
.med-meta{display:flex;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:14px;margin:0}
.med-meta .dot{color:var(--line)}

/* Prose */
.prose{max-width:var(--maxw);margin:0 auto}
.prose h2{
  font-family:"Cormorant Garamond",serif;font-weight:600;font-size:30px;
  margin:46px 0 14px;padding-top:10px;
}
.prose h3{
  font-weight:600;font-size:18px;letter-spacing:.02em;color:var(--accent);
  margin:32px 0 10px;text-transform:uppercase;font-size:14px;letter-spacing:.1em;
}
.prose p{margin:0 0 20px;color:var(--ink-soft)}
.prose strong{color:var(--ink);font-weight:600}
.prose ul,.prose ol{margin:0 0 22px;padding-left:24px;color:var(--ink-soft)}
.prose li{margin:0 0 8px}
.prose a{color:var(--accent);text-decoration:underline;text-underline-offset:2px}
.prose hr{border:none;border-top:1px solid var(--line);margin:36px 0}

/* The opening quote (first blockquote-styled italic paragraph in "Today's Quote") */
.prose h2 + p em{
  display:block;font-family:"Cormorant Garamond",serif;font-style:italic;
  font-size:26px;line-height:1.4;color:var(--quote);
}
.prose blockquote{
  border-left:3px solid var(--accent-soft);margin:24px 0;padding:6px 0 6px 22px;
  font-family:"Cormorant Garamond",serif;font-style:italic;font-size:24px;color:var(--quote);
}

/* Prev/next nav */
.med-nav{
  max-width:var(--maxw);margin:56px auto 70px;display:grid;
  grid-template-columns:1fr 1fr;gap:16px;
}
.med-nav a{
  display:flex;flex-direction:column;gap:4px;text-decoration:none;
  background:var(--bg-elev);border:1px solid var(--line);border-radius:var(--radius);
  padding:18px 20px;color:var(--ink);transition:border-color .2s,transform .2s;
}
.med-nav a:hover{border-color:var(--accent-soft);transform:translateY(-2px)}
.med-nav a span{font-size:13px;color:var(--muted)}
.med-nav a strong{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:19px}
.med-nav .next{text-align:right;align-items:flex-end}

/* Callout note */
.note{
  max-width:var(--maxw);margin:0 auto 14px;
  background:color-mix(in srgb,var(--accent) 7%,var(--bg-elev));
  border:1px solid color-mix(in srgb,var(--accent) 22%,var(--line));
  border-radius:var(--radius);padding:22px 26px;
}
.note-title{font-weight:600;color:var(--accent);margin:0 0 8px}
.note p{margin:0 0 10px;color:var(--ink-soft)}
.note p:last-child{margin-bottom:0}
.note a{color:var(--accent);text-decoration:underline;text-underline-offset:2px}

/* About prose */
article.prose h2{font-size:28px}

/* Footer */
.site-footer{border-top:1px solid var(--line);margin-top:40px;padding:40px 0;text-align:center}
.site-footer p{margin:0 0 6px;color:var(--ink-soft)}
.site-footer .muted{color:var(--muted);font-size:14px}
.muted{color:var(--muted)}

@media (max-width:640px){
  body{font-size:17px}
  .hero{padding:48px 0 28px}
  .med-nav{grid-template-columns:1fr}
  .med-nav .next{text-align:left;align-items:flex-start}
  .site-nav a{padding:8px 9px;font-size:14px}
  .random-btn{display:none}
}
`;

const APP_JS = `(function(){
  var root=document.documentElement;
  var key="em-meditations-theme";
  function apply(t){
    if(t==="dark"){root.setAttribute("data-theme","dark");}
    else{root.removeAttribute("data-theme");}
  }
  var saved=null;
  try{saved=localStorage.getItem(key);}catch(e){}
  if(!saved){
    saved=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  }
  apply(saved);
  var btn=document.getElementById("theme-toggle");
  function setIcon(){if(btn){btn.innerHTML=root.getAttribute("data-theme")==="dark"?"\\u2600":"\\u263D";}}
  setIcon();
  if(btn){
    btn.addEventListener("click",function(){
      var next=root.getAttribute("data-theme")==="dark"?"light":"dark";
      apply(next);setIcon();
      try{localStorage.setItem(key,next);}catch(e){}
    });
  }

  /* "Surprise me" — jump to a random meditation. */
  var MEDITATIONS=__MEDITATIONS__;
  var base=(document.body&&document.body.getAttribute("data-base"))||"";
  function currentPath(){
    var p=location.pathname.split("/").pop()||"";
    return p;
  }
  function gotoRandom(){
    if(!MEDITATIONS.length)return;
    var here=currentPath();
    var pool=MEDITATIONS.filter(function(m){return m.split("/").pop()!==here;});
    if(!pool.length)pool=MEDITATIONS;
    var pick=pool[Math.floor(Math.random()*pool.length)];
    location.href=base+pick;
  }
  ["random-btn","hero-random"].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.addEventListener("click",gotoRandom);
  });
})();`;

build();
