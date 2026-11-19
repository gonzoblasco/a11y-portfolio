/**
 * Static site generator for a11y-portfolio.
 *
 * Reads content/writing/*.md, renders with Bun's built-in markdown,
 * and writes plain HTML to the repository root. No dependencies.
 *
 * Run: bun scripts/build.ts
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";

const ROOT = process.cwd();
const BASE = "https://gonzoblasco.github.io/a11y-portfolio";
const SITE = "Gonzalo Blasco";
const EMAIL = "gonzoblasco@icloud.com";
const GITHUB = "https://github.com/gonzoblasco";
const LINKEDIN = "https://www.linkedin.com/in/gonzalo-blasco";
const PREFLIGHT_REPO = "https://github.com/gonzoblasco/preflight-a11y";

const CATEGORIES = {
  accessibility: {
    label: "Accessibility",
    description:
      "What assistive technology actually announces, and the fixes behind it.",
  },
  testing: {
    label: "Testing",
    description:
      "Where tests run, what they can see, and the bugs they miss.",
  },
  engineering: {
    label: "Engineering",
    description:
      "Architecture, refactors and the tools we build with.",
  },
  "field-notes": {
    label: "Field notes",
    description:
      "What we learn outside the code: exercises, challenges and process.",
  },
} as const;

type CategorySlug = keyof typeof CATEGORIES;

type Meta = {
  title: string;
  slug: string;
  date: string;
  lang: string;
  kind: string;
  category: CategorySlug;
  summary: string;
  tags: string[];
  repo?: string;
  pr?: string;
  source?: string;
  source_url?: string;
  original_lang?: string;
};

type Article = Meta & { body: string; html: string; words: number };

function fail(message: string): never {
  console.error(`build: ${message}`);
  process.exit(1);
}

function parseFrontMatter(raw: string, file: string): { meta: Record<string, string | string[]>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) fail(`${file}: missing front-matter block`);

  const meta: Record<string, string | string[]> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      meta[key] = inner
        ? inner
            .split(",")
            .map((part) => part.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean)
        : [];
      continue;
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }

  return { meta, content: raw.slice(match[0].length) };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function addHeadingIds(html: string): string {
  const taken = new Set<string>();
  return html.replace(/<h([23])>(.*?)<\/h\1>/g, (_full, level, inner) => {
    const text = inner.replace(/<[^>]+>/g, "");
    const base = slugifyHeading(text) || "section";
    let id = base;
    let n = 2;
    while (taken.has(id)) {
      id = `${base}-${n}`;
      n += 1;
    }
    taken.add(id);
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

function makeKeyboardScrollable(html: string): string {
  let index = 0;
  return html.replace(/<pre>/g, () => {
    index += 1;
    const label = index === 1 ? "Code sample" : `Code sample ${index}`;
    return `<pre tabindex="0" role="region" aria-label="${label}">`;
  });
}

function renderMarkdown(markdown: string): string {
  const html = makeKeyboardScrollable(addHeadingIds(Bun.markdown.html(markdown)));
  if (/<script\b/i.test(html) || /\son[a-z]+\s*=/i.test(html)) {
    fail("rendered markdown contains raw script or inline event handlers");
  }
  return html.replace(
    /<p>PR: (https?:\/\/[^<\s]+)<\/p>/g,
    '<p>PR: <a href="$1">$1</a></p>'
  );
}

function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) fail(`invalid date: ${iso}`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatMonthYear(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) fail(`invalid date: ${iso}`);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function formatLongDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) fail(`invalid date: ${iso}`);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function readingTime(words: number): number {
  return Math.max(1, Math.round(words / 220));
}

function ensureDir(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function writeFile(path: string, contents: string) {
  ensureDir(dirname(join(ROOT, path)));
  writeFileSync(join(ROOT, path), contents, "utf8");
}

/* ---------- content ---------- */

const writingDir = join(ROOT, "content", "writing");
if (!existsSync(writingDir)) fail("content/writing does not exist");

const articles: Article[] = readdirSync(writingDir)
  .filter((file) => file.endsWith(".md"))
  .map((file) => {
    const raw = readFileSync(join(writingDir, file), "utf8");
    const { meta, content } = parseFrontMatter(raw, file);

    for (const key of ["title", "slug", "date", "lang", "kind", "category"]) {
      if (!meta[key] || typeof meta[key] !== "string") fail(`${file}: missing required key "${key}"`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date as string)) fail(`${file}: date must be YYYY-MM-DD`);
    const parsedDate = new Date(`${meta.date}T12:00:00Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== meta.date) {
      fail(`${file}: invalid calendar date "${meta.date}"`);
    }
    if (!["en", "es"].includes(meta.lang as string)) fail(`${file}: lang must be en or es`);
    if (!["essay", "note"].includes(meta.kind as string)) fail(`${file}: kind must be essay or note`);
    if (!(meta.category as string in CATEGORIES)) {
      fail(`${file}: category must be one of ${Object.keys(CATEGORIES).join(", ")}`);
    }

    const words = content.split(/\s+/).filter(Boolean).length;
    return {
      title: meta.title as string,
      slug: meta.slug as string,
      date: meta.date as string,
      lang: meta.lang as string,
      kind: meta.kind as string,
      category: meta.category as CategorySlug,
      summary: (meta.summary as string) || "",
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      repo: meta.repo as string | undefined,
      pr: meta.pr as string | undefined,
      source: meta.source as string | undefined,
      source_url: meta.source_url as string | undefined,
      original_lang: meta.original_lang as string | undefined,
      body: content,
      html: renderMarkdown(content),
      words,
    };
  });

if (articles.length === 0) fail("no articles found");
const slugs = new Set<string>();
for (const article of articles) {
  if (slugs.has(article.slug)) fail(`duplicate slug "${article.slug}"`);
  slugs.add(article.slug);
}
articles.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

/* ---------- layout ---------- */

function nav(root: string, current: string): string {
  const items: Array<[string, string, string]> = [
    ["Writing", `${root}writing/`, "writing"],
    ["Work", `${root}preflight/`, "preflight"],
    ["About", `${root}about/`, "about"],
  ];
  return `<nav aria-label="Sections"><ul>${items
    .map(([label, href, key]) => `<li><a href="${href}"${current === key ? ' aria-current="page"' : ""}>${label}</a></li>`)
    .join("")}</ul></nav>`;
}

function header(root: string, current: string, chromeLang = "en"): string {
  return `<header class="site"${chromeLang !== "en" ? ' lang="en"' : ""}>
  <div class="wrap head">
    <a class="wordmark" href="${root}">Gonzalo Blasco</a>
    ${nav(root, current)}
  </div>
</header>`;
}

function footer(root: string, chromeLang = "en"): string {
  return `<footer class="site"${chromeLang !== "en" ? ' lang="en"' : ""}>
  <div class="wrap">
    <span>Gonzalo Blasco · Buenos Aires</span>
    <span><a href="mailto:${EMAIL}">${EMAIL}</a> · <a href="${GITHUB}">GitHub</a> · <a href="${LINKEDIN}">LinkedIn</a></span>
  </div>
</footer>`;
}

function page(options: {
  root: string;
  current: string;
  title: string;
  description: string;
  canonical?: string;
  body: string;
  bodyClass?: string;
  ogType?: string;
  lang?: string;
}): string {
  const { root, current, title, description, canonical, body, bodyClass = "", ogType = "website", lang = "en" } = options;
  const canonicalTag = canonical ? `\n  <link rel="canonical" href="${canonical}" />` : "";
  const ogUrl = canonical ? `\n  <meta property="og:url" content="${canonical}" />` : "";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="author" content="Gonzalo Blasco" />${canonicalTag}
  <meta property="og:site_name" content="${SITE}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />${ogUrl}
  <meta name="twitter:card" content="summary" />
  <link rel="alternate" type="application/atom+xml" href="${root}feed.xml" title="Gonzalo Blasco" />
  <link rel="stylesheet" href="${root}style.css" />
  <link rel="preload" href="${root}assets/fonts/fraunces-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="${root}assets/fonts/newsreader-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="${root}assets/fonts/ibm-plex-mono-400.woff2" as="font" type="font/woff2" crossorigin />
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
<a class="skip" href="#main">Skip to content</a>
${header(root, current, lang)}
${body}
${footer(root, lang)}
</body>
</html>
`;
}

/* ---------- fragments ---------- */

function entryRow(article: Article, root: string): string {
  const badge = article.lang === "es" ? '<span class="badge" lang="es">En español</span>' : "";
  return `<li>
  <a href="${root}writing/${article.slug}.html" aria-labelledby="entry-${article.slug}">
    <span class="date"><time datetime="${article.date}">${formatMonthYear(article.date)}</time></span>
    <span class="title" id="entry-${article.slug}">${escapeHtml(article.title)}${badge}</span>
    <span class="excerpt">${escapeHtml(article.summary)}</span>
  </a>
</li>`;
}

function indexRow(article: Article, hrefPrefix: string): string {
  const badge = article.lang === "es" ? '<span class="badge" lang="es">En español</span>' : "";
  return `<li>
  <a href="${hrefPrefix}${article.slug}.html" aria-labelledby="entry-${article.slug}">
    <span class="date"><time datetime="${article.date}">${formatShortDate(article.date)}</time></span>
    <span class="title" id="entry-${article.slug}">${escapeHtml(article.title)}${badge}</span>
    <span class="excerpt">${escapeHtml(article.summary)}</span>
  </a>
</li>`;
}

function categoryNav(options: {
  allHref: string;
  hrefPrefix: string;
  current?: CategorySlug;
}): string {
  const { allHref, hrefPrefix, current } = options;
  const items = [
    `<li><a href="${allHref}"${current ? "" : ' aria-current="page"'}>All <span class="count">${articles.length}</span></a></li>`,
    ...(Object.entries(CATEGORIES) as Array<[CategorySlug, { label: string }]>).map(([slug, meta]) => {
      const count = articles.filter((article) => article.category === slug).length;
      if (count === 0) return "";
      return `<li><a href="${hrefPrefix}${slug}/"${current === slug ? ' aria-current="page"' : ""}>${meta.label} <span class="count">${count}</span></a></li>`;
    }),
  ].filter(Boolean);
  return `<nav class="categories" aria-label="Categories"><ul>${items.join("")}</ul></nav>`;
}

function homeEntries(): string {
  return articles
    .slice(0, 3)
    .map((article) => entryRow(article, "./"))
    .join("\n");
}

/* ---------- pages ---------- */

const homeBody = `<main id="main">
  <section class="hero wrap" aria-labelledby="title">
    <div class="hero-main">
      <p class="kicker">Accessibility engineering · Buenos Aires</p>
      <h1 id="title">What a screen reader <em>actually</em> says.</h1>
      <p class="lede">I fix what assistive technology announces, not what the markup declares. Twelve merged pull requests across React Spectrum, Carbon, Astryx, MUI and shadcn/ui.</p>
      <p class="actions"><a class="cta" href="./writing/">Read the notes</a> <a href="mailto:${EMAIL}">Get in touch</a></p>
    </div>
    <div class="note">
      <p class="label">Currently</p>
      <p>Preflight, a pre-launch accessibility gate. It reads the accessibility output a screen reader consumes and returns a repair prompt a builder can execute.</p>
    </div>
  </section>

  <section class="section wrap" aria-labelledby="writing">
    <div class="section-head">
      <h2 id="writing"><span>01</span> Writing</h2>
      <a href="./writing/">All notes</a>
    </div>
    <ul class="entries">
${homeEntries()}
    </ul>
    ${categoryNav({ allHref: "./writing/", hrefPrefix: "./writing/category/" })}
  </section>

  <section class="work wrap" aria-labelledby="work">
    <h2 id="work"><span>02</span> Work</h2>
    <div class="work-body">
      <h3>Preflight</h3>
      <p>A pre-launch accessibility gate for AI-built websites. It loads a page in a browser, reads what a screen reader actually announces, and returns a repair prompt your builder can execute.</p>
      <p><a href="./preflight/">See how it works</a></p>
    </div>
    <dl class="work-meta">
      <dt>Merged</dt><dd>12 PRs</dd>
      <dt>Repos</dt><dd>React Spectrum · Carbon · Astryx · MUI · shadcn/ui</dd>
      <dt>Focus</dt><dd>ARIA contracts, focus management, announcements</dd>
    </dl>
  </section>
</main>`;

writeFile(
  "index.html",
  page({
    root: "./",
    current: "",
    title: "Gonzalo Blasco — Accessibility engineer",
    description:
      "Accessibility engineer. I fix what assistive technology announces, not what the markup declares. Twelve merged pull requests across React Spectrum, Carbon, Astryx, MUI and shadcn/ui.",
    canonical: `${BASE}/`,
    body: homeBody,
  })
);

/* writing index */

const years = [...new Set(articles.map((article) => article.date.slice(0, 4)))].sort((a, b) => (a < b ? 1 : -1));

const writingGroups = years
  .map((year) => {
    const rows = articles
      .filter((article) => article.date.startsWith(year))
      .map((article) => indexRow(article, "./"))
      .join("\n");
    return `<h2 class="year">${year}</h2>\n<ul class="index-list">\n${rows}\n</ul>`;
  })
  .join("\n");

const writingBody = `<main id="main">
  <div class="wrap">
    <header class="page-head">
      <p class="kicker">Writing</p>
      <h1>Notes on what a screen reader says.</h1>
      <p class="lede">${articles.length} pieces, accessibility first: what a screen reader announces, plus testing and engineering work behind it. Some are also on LinkedIn; this is the canonical copy.</p>
      ${categoryNav({ allHref: "./", hrefPrefix: "./category/" })}
    </header>
    ${writingGroups}
  </div>
</main>`;

writeFile(
  "writing/index.html",
  page({
    root: "../",
    current: "writing",
    title: "Writing — Gonzalo Blasco",
    description: "Essays and notes on accessibility, screen readers and the fixes behind merged pull requests.",
    canonical: `${BASE}/writing/`,
    body: writingBody,
  })
);

/* category pages */

for (const [slug, meta] of Object.entries(CATEGORIES) as Array<
  [CategorySlug, { label: string; description: string }]
>) {
  const items = articles.filter((article) => article.category === slug);
  if (items.length === 0) continue;

  const rows = items.map((article) => indexRow(article, "../../")).join("\n");
  const categoryBody = `<main id="main">
  <div class="wrap">
    <header class="page-head">
      <p class="kicker">Writing / Category</p>
      <h1>${meta.label}</h1>
      <p class="lede">${meta.description}</p>
      ${categoryNav({ allHref: "../../", hrefPrefix: "../", current: slug })}
    </header>
    <ul class="index-list">
${rows}
    </ul>
  </div>
</main>`;

  writeFile(
    `writing/category/${slug}/index.html`,
    page({
      root: "../../../",
      current: "writing",
      title: `${meta.label} — Writing — Gonzalo Blasco`,
      description: meta.description,
      canonical: `${BASE}/writing/category/${slug}/`,
      body: categoryBody,
    })
  );
}

/* articles */

for (const article of articles) {
  const root = "../";
  const isSpanish = article.lang === "es";
  const kindLabel = article.kind === "essay" ? "Essay" : "Note";
  const minutes = readingTime(article.words);

  const sourceLine = article.source === "linkedin"
    ? article.source_url
      ? `<span>Originally published on <a href="${article.source_url}">LinkedIn</a></span>`
      : "<span>Originally published on LinkedIn</span>"
    : "";

  const prLine =
    article.repo && article.pr
      ? `<span>PR <a href="https://github.com/${article.repo}/pull/${article.pr}">${article.repo}#${article.pr}</a></span>`
      : "";

  const articleBody = `<main id="main">
  <article class="article wrap">
    <header class="article-head">
      <p class="kicker"${isSpanish ? ' lang="en"' : ""}><a href="./">Writing</a> <span aria-hidden="true">/</span> <time datetime="${article.date}">${formatMonthYear(article.date)}</time>${isSpanish ? '<span class="badge" lang="es">En español</span>' : ""}</p>
      <h1${isSpanish ? ' lang="es"' : ""}>${escapeHtml(article.title)}</h1>
      ${article.summary ? `<p class="lede"${isSpanish ? ' lang="es"' : ""}>${escapeHtml(article.summary)}</p>` : ""}
      <p class="article-meta"${isSpanish ? ' lang="en"' : ""}>
        <span>${CATEGORIES[article.category].label}</span>
        <span>${kindLabel}</span>
        <span>${minutes} min read</span>
        <span><time datetime="${article.date}">${formatLongDate(article.date)}</time></span>
        ${sourceLine}
      </p>
    </header>
    <div class="prose"${isSpanish ? ' lang="es"' : ""}>
${article.html}
    </div>
    <footer class="article-foot"${isSpanish ? ' lang="en"' : ""}>
      ${prLine || "<span></span>"}
      <a href="./">Back to all notes</a>
    </footer>
  </article>
</main>`;

  writeFile(
    `writing/${article.slug}.html`,
    page({
      root,
      current: "writing",
      title: `${article.title} — Gonzalo Blasco`,
      description: article.summary || `${article.title}, by Gonzalo Blasco.`,
      canonical: `${BASE}/writing/${article.slug}.html`,
      body: articleBody,
      ogType: "article",
      lang: article.lang,
    })
  );
}

/* about */

const aboutBody = `<main id="main">
  <div class="wrap">
    <header class="page-head">
      <p class="kicker">About</p>
      <h1>Accessibility is a runtime property.</h1>
      <p class="lede">I am a software engineer focused on how assistive technology actually behaves, not on how the markup is supposed to behave.</p>
    </header>

    <div class="page-body">
      <div class="prose-col prose">
        <p>I have spent ten years building software and the last five working on accessibility inside product teams. At EY I was a Senior Frontend Engineer and Accessibility Lead from 2021 to 2025. Since 2025 I have worked as a freelance engineer, including a multi-tenant CRM with AI-assisted replies for Mercado Libre sellers.</p>

        <p>My open source work is mostly in design systems: twelve merged pull requests across Adobe React Spectrum, IBM Carbon, IBM Products, Meta Astryx, MUI Base UI, MUI Material UI and shadcn/ui. The fixes are usually small and structural: an ARIA contract, a focus path, an announcement that competes with the one the platform already makes.</p>

        <p>That is also the thesis behind <a href="../preflight/">Preflight</a>: a linter can tell you whether the attributes are present. It cannot tell you what a blind person hears when they use the component. The second question requires running the page, in a browser, with assistive technology attached.</p>

        <p>I live in Buenos Aires and work remotely. I write in English, and occasionally in Spanish for the local market.</p>
      </div>

      <aside class="side-col" aria-label="Contact and links">
        <h2>Contact</h2>
        <ul>
          <li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
          <li><a href="${GITHUB}">github.com/gonzoblasco</a></li>
          <li><a href="${LINKEDIN}">linkedin.com/in/gonzalo-blasco</a></li>
        </ul>
        <h2>Currently</h2>
        <ul>
          <li>Freelance software engineer</li>
          <li>Building Preflight</li>
          <li>Buenos Aires, GMT-3</li>
        </ul>
        <h2>Selected work</h2>
        <ul>
          <li>React Spectrum, Carbon, Astryx, MUI, shadcn/ui</li>
          <li>SoporteML: CRM with RAG-assisted replies</li>
        </ul>
      </aside>
    </div>
  </div>
</main>`;

writeFile(
  "about/index.html",
  page({
    root: "../",
    current: "about",
    title: "About — Gonzalo Blasco",
    description:
      "Software engineer focused on accessibility. Ten years building software, five in accessibility roles, twelve merged pull requests in design systems.",
    canonical: `${BASE}/about/`,
    body: aboutBody,
  })
);

/* preflight */

const preflightBody = `<main id="main">
  <div class="wrap">
    <header class="page-head">
      <p class="kicker">Product</p>
      <h1>Preflight</h1>
      <p class="lede">Your AI built the site. This proves it works, and tells the builder how to fix it.</p>
    </header>

    <div class="page-body">
      <div class="prose-col prose">
        <p>A pre-launch accessibility gate that reads your page the way a screen reader consumes it, then hands back a repair prompt your AI builder can execute.</p>

        <h2>What it shows you</h2>
        <p>Every attribute a linter checks can be present and the page can still be unusable. Preflight walks the page and records what is announced, in order, including the gaps:</p>

        <pre class="example" tabindex="0" role="region" aria-label="Example screen reader transcript">  1  document
  2  image                        <span class="problem">&lt;- an image with no name</span>
  3  link, Pricing
  4  button                       <span class="problem">&lt;- a button with no name</span>
  5  heading, Ship your landing page in minutes, level 1
  6  image                        <span class="problem">&lt;- another one</span></pre>

        <h2>How it works</h2>
        <ol class="steps">
          <li>
            <div>
              <h3>The transcript</h3>
              <p>The page is walked with a screen reader and every phrase it speaks is recorded, in order. A role announced with no name is marked and explained in plain language.</p>
            </div>
          </li>
          <li>
            <div>
              <h3>The verdict</h3>
              <p>One score that refuses to be green while someone is blocked. A page with 92 findings fixed and one unusable checkout does not get an A.</p>
            </div>
          </li>
          <li>
            <div>
              <h3>The fix prompt</h3>
              <p>An ordered prompt, ready to paste into the tool that generated the page. Every step names the element, the change, and the announcement the reader must produce afterwards.</p>
            </div>
          </li>
        </ol>

        <p>It does not certify anything, it does not crawl, and it does not edit your code. Automated checks catch roughly a third of accessibility defects; every report says so.</p>

        <p><a class="cta" href="mailto:${EMAIL}?subject=Preflight%20scan">Request a scan</a></p>
      </div>

      <aside class="side-col" aria-label="Preflight details">
        <h2>Status</h2>
        <ul>
          <li>Open source, local-first</li>
          <li>One URL per scan</li>
          <li>Runs in CI with exit codes</li>
        </ul>
        <h2>Repository</h2>
        <ul>
          <li><a href="${PREFLIGHT_REPO}">github.com/gonzoblasco/preflight-a11y</a></li>
        </ul>
        <h2>Scope</h2>
        <ul>
          <li>AI-built sites</li>
          <li>Pre-launch checks</li>
          <li>Repair prompts, not certifications</li>
        </ul>
      </aside>
    </div>
  </div>
</main>`;

writeFile(
  "preflight/index.html",
  page({
    root: "../",
    current: "preflight",
    title: "Preflight — Gonzalo Blasco",
    description:
      "A pre-launch accessibility gate that reads what a screen reader actually announces and returns a repair prompt your AI builder can execute.",
    canonical: `${BASE}/preflight/`,
    body: preflightBody,
  })
);

/* 404 */

writeFile(
  "404.html",
  page({
    root: "/a11y-portfolio/",
    current: "",
    title: "Page not found — Gonzalo Blasco",
    description: "That page does not exist.",
    body: `<main id="main" class="notfound wrap">
  <p class="kicker" aria-hidden="true">404</p>
  <h1>Page not found</h1>
  <p>That page does not exist. The notes are still here.</p>
  <p><a class="cta" href="./writing/">Read the notes</a></p>
</main>`,
  })
);

/* feed */

const feedUpdated = new Date(`${articles[0].date}T12:00:00Z`).toISOString();
const feedEntries = articles
  .map(
    (article) => `  <entry>
    <title>${escapeHtml(article.title)}</title>
    <id>${BASE}/writing/${article.slug}.html</id>
    <link href="${BASE}/writing/${article.slug}.html" />
    <category term="${article.category}" />
    <updated>${new Date(`${article.date}T12:00:00Z`).toISOString()}</updated>
    <summary>${escapeHtml(article.summary)}</summary>
    <content type="html">${escapeHtml(article.html)}</content>
  </entry>`
  )
  .join("\n");

const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Gonzalo Blasco — Writing</title>
  <subtitle>Notes on accessibility, screen readers and the fixes behind merged pull requests.</subtitle>
  <id>${BASE}/</id>
  <link href="${BASE}/writing/" />
  <link rel="self" href="${BASE}/feed.xml" />
  <updated>${feedUpdated}</updated>
  <author>
    <name>Gonzalo Blasco</name>
    <uri>${BASE}/</uri>
  </author>
${feedEntries}
</feed>
`;

writeFile("feed.xml", feed);

/* sitemap */

const urls: Array<{ loc: string; lastmod?: string }> = [
  { loc: `${BASE}/` },
  { loc: `${BASE}/writing/` },
  { loc: `${BASE}/about/` },
  { loc: `${BASE}/preflight/` },
  ...(Object.keys(CATEGORIES) as CategorySlug[])
    .filter((slug) => articles.some((article) => article.category === slug))
    .map((slug) => ({ loc: `${BASE}/writing/category/${slug}/` })),
  ...articles.map((article) => ({ loc: `${BASE}/writing/${article.slug}.html`, lastmod: article.date })),
];

writeFile(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, lastmod }) => `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
  </url>`
  )
  .join("\n")}
</urlset>
`
);

writeFile(
  "robots.txt",
  `User-agent: *
Allow: /

Sitemap: ${BASE}/sitemap.xml
`
);

console.log(`Built ${articles.length} articles.`);
console.log(`Home, writing index, about, preflight, 404, feed, sitemap, robots.`);
