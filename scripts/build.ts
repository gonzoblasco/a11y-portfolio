/**
 * Static site generator for a11y-portfolio.
 *
 * Reads content/writing/*.md, renders with Bun's built-in markdown,
 * and writes plain HTML to the repository root. No dependencies.
 *
 * Bilingual pairs: two files that share the same `pair` key and differ in
 * `lang` are treated as translations of each other. Each page links to its
 * counterpart and declares hreflang alternates so search engines do not treat
 * them as duplicates.
 *
 * Run: bun scripts/build.ts
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// A CSS-only change is invisible to anyone with the file cached (Pages sets
// max-age=600). Versioning the URL makes every deploy self-invalidating.
const STYLE_VERSION = createHash("sha1")
  .update(readFileSync(new URL("../style.css", import.meta.url)))
  .digest("hex")
  .slice(0, 10);

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
  translation_of?: string;
  pair?: string;
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
  if (/<script\b/i.test(html)) {
    fail("rendered markdown contains a raw script tag");
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
  translation_of: meta.translation_of as string | undefined,
      pair: (meta.pair as string) || undefined,
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

// Index translations by pair key before rendering: the index needs to know
// whether an entry has a counterpart, not only the article page itself.
const pairs = new Map<string, Article[]>();
for (const article of articles) {
  if (!article.pair) continue;
  const list = pairs.get(article.pair) || [];
  list.push(article);
  pairs.set(article.pair, list);
}
for (const [key, list] of pairs) {
  if (list.length > 2) fail(`pair "${key}" has ${list.length} articles; expected at most 2`);
  if (new Set(list.map((a) => a.lang)).size !== list.length) {
    fail(`pair "${key}" has two articles in the same language`);
  }
}

// One row per piece, not per page: a translation is a view of the same piece.
const listed = articles.filter((article) => !article.original_lang);


/* ---------- layout ---------- */

function nav(root: string, current: string): string {
  const items: Array<[string, string, string]> = [
    ["Writing", `${root}writing/`, "writing"],
    ["Work", `${root}writing/preflight.html`, "preflight"],
    ["About", `${root}about/`, "about"],
    ["Profile", `${root}profile/`, "profile"],
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
  alternates?: Array<{ lang: string; href: string }>;
}): string {
  const { root, current, title, description, canonical, body, bodyClass = "", ogType = "website", lang = "en", alternates = [] } = options;
  const canonicalTag = canonical ? `\n  <link rel="canonical" href="${canonical}" />` : "";
  const ogUrl = canonical ? `\n  <meta property="og:url" content="${canonical}" />` : "";
  const alternateTags = alternates
    .map((alt) => `\n  <link rel="alternate" hreflang="${alt.lang}" href="${alt.href}" />`)
    .join("");
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="author" content="Gonzalo Blasco" />${canonicalTag}
${alternateTags}
  <meta property="og:site_name" content="${SITE}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />${ogUrl}
  <meta name="twitter:card" content="summary" />
  <link rel="alternate" type="application/atom+xml" href="${root}feed.xml" title="Gonzalo Blasco" />
  <link rel="stylesheet" href="${root}style.css?v=${STYLE_VERSION}" />
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

function langBadge(article: Article, hrefPrefix: string): string {
  const other = counterpart(article);
  if (!other) return "";
  const label = other.lang === "es" ? "en español" : "in English";
  return ` <a class="badge" href="${hrefPrefix}${other.slug}.html" hreflang="${other.lang}" lang="${other.lang}">${label}</a>`;
}

function entryRow(article: Article, root: string): string {
  return `<li>
  <div class="row">
    <span class="date"><time datetime="${article.date}">${formatMonthYear(article.date)}</time></span>
    <span class="title" id="entry-${article.slug}"><a href="${root}writing/${article.slug}.html">${escapeHtml(article.title)}</a>${langBadge(article, `${root}writing/`)}</span>
    <span class="excerpt">${escapeHtml(article.summary)}</span>
  </div>
</li>`;
}

function indexRow(article: Article, hrefPrefix: string): string {
  return `<li>
  <div class="row">
    <span class="date"><time datetime="${article.date}">${formatShortDate(article.date)}</time></span>
    <span class="title" id="entry-${article.slug}"><a href="${hrefPrefix}${article.slug}.html">${escapeHtml(article.title)}</a>${langBadge(article, hrefPrefix)}</span>
    <span class="excerpt">${escapeHtml(article.summary)}</span>
  </div>
</li>`;
}

function categoryNav(options: {
  allHref: string;
  hrefPrefix: string;
  current?: CategorySlug;
}): string {
  const { allHref, hrefPrefix, current } = options;
  const items = [
    `<li><a href="${allHref}"${current ? "" : ' aria-current="page"'}>All <span class="count">${listed.length}</span></a></li>`,
    ...(Object.entries(CATEGORIES) as Array<[CategorySlug, { label: string }]>).map(([slug, meta]) => {
      const count = listed.filter((article) => article.category === slug).length;
      if (count === 0) return "";
      return `<li><a href="${hrefPrefix}${slug}/"${current === slug ? ' aria-current="page"' : ""}>${meta.label} <span class="count">${count}</span></a></li>`;
    }),
  ].filter(Boolean);
  return `<nav class="categories" aria-label="Categories"><ul>${items.join("")}</ul></nav>`;
}

function homeEntries(): string {
  return listed
    .slice(0, 3)
    .map((article) => entryRow(article, "./"))
    .join("\n");
}

/* ---------- pages ---------- */

const homeBody = `<main id="main" tabindex="-1">
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
      <h3><a href="./writing/preflight.html">Preflight</a></h3>
      <p>A pre-launch accessibility gate for AI-built websites. It loads a page in a browser, reads what a screen reader actually announces, and returns a repair prompt your builder can execute.</p>
      <p><a href="./writing/how-preflight-works.html">See how it works</a></p>
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

const years = [...new Set(listed.map((article) => article.date.slice(0, 4)))].sort((a, b) => (a < b ? 1 : -1));

const writingGroups = years
  .map((year) => {
    const rows = listed
      .filter((article) => article.date.startsWith(year))
      .map((article) => indexRow(article, "./"))
      .join("\n");
    return `<h2 class="year">${year}</h2>\n<ul class="index-list">\n${rows}\n</ul>`;
  })
  .join("\n");

const writingBody = `<main id="main" tabindex="-1">
  <div class="wrap">
    <header class="page-head">
      <p class="kicker">Writing</p>
      <h1>Notes on what a screen reader says.</h1>
      <p class="lede">${listed.length} pieces, accessibility first: what a screen reader announces, plus testing and engineering work behind it. Some are also on LinkedIn; this is the canonical copy.</p>
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
  const items = listed.filter((article) => article.category === slug);
  if (items.length === 0) continue;

  const rows = items.map((article) => indexRow(article, "../../")).join("\n");
  const categoryBody = `<main id="main" tabindex="-1">
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

function counterpart(article: Article): Article | undefined {
  if (!article.pair) return undefined;
  return (pairs.get(article.pair) || []).find((a) => a.slug !== article.slug);
}

// A translation whose pair key does not resolve would silently lose its
// hreflang and its switch, and the build would stay green. Fail instead.
for (const article of articles) {
  if (article.pair && !counterpart(article)) {
    fail(`pair "${article.pair}" has only one article; "${article.slug}" points at nothing`);
  }
}

function alternatesFor(article: Article): Array<{ lang: string; href: string }> {
  const other = counterpart(article);
  if (!other) return [];
  // x-default points at the original version so search engines serve one
  // canonical target to users whose language matches neither variant.
  const original = article.original_lang ? other : article;
  return [
    { lang: article.lang, href: `${BASE}/writing/${article.slug}.html` },
    { lang: other.lang, href: `${BASE}/writing/${other.slug}.html` },
    { lang: "x-default", href: `${BASE}/writing/${original.slug}.html` },
  ];
}

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

  // Bilingual pair: a visible switch to the counterpart, labelled in the
  // target language so the reader knows what they will get.
  const other = counterpart(article);
  const translationLink = other
    ? `<a class="translation-switch" href="${other.slug}.html" hreflang="${other.lang}" lang="${other.lang}">${
        other.lang === "es" ? "Leer en español" : "Read in English"
      } <span aria-hidden="true">→</span></a>`
    : "";

  const articleBody = `<main id="main" tabindex="-1">
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
      ${translationLink ? `<p class="translation">${translationLink}</p>` : ""}
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
      current: article.slug === "preflight" ? "preflight" : "writing",
      title: `${article.title} — Gonzalo Blasco`,
      description: article.summary || `${article.title}, by Gonzalo Blasco.`,
      canonical: `${BASE}/writing/${article.slug}.html`,
      body: articleBody,
      ogType: "article",
      lang: article.lang,
      alternates: alternatesFor(article),
    })
  );
}

/* about */

const aboutBody = `<main id="main" tabindex="-1">
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

        <p>That is also the thesis behind <a href="../writing/preflight.html">Preflight</a>: a linter can tell you whether the attributes are present. It cannot tell you what a blind person hears when they use the component. The second question requires running the page, in a browser, with assistive technology attached.</p>

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

/* profile: the professional record, in both languages */

type Role = {
  period: string;
  title: string;
  org: string;
  bullets: string[];
};

const rolesEn: Role[] = [
  {
    period: "2025 — present",
    title: "Freelance software engineer",
    org: "Independent",
    bullets: [
      "SoporteML: a multi-tenant CRM with AI-assisted replies for Mercado Libre sellers. Unified question inbox, retrieval-assisted suggestions with pgvector, an autopilot with confidence guardrails, team roles and Stripe billing. React, Vite, TypeScript, Supabase.",
      "Designed the product's own design system: semantic tokens for color, type, spacing, radius, shadow, focus ring and states, with WCAG AA as the criterion of the system.",
      "Built and maintains an MCP companion server that reports what a screen reader announces for a fragment of HTML.",
    ],
  },
  {
    period: "2021 — 2025",
    title: "Senior Frontend Engineer, Accessibility Lead",
    org: "EY (Ernst & Young)",
    bullets: [
      "Audited and remediated 50+ enterprise React components to WCAG 2.2 AA in EY Motif: keyboard navigation, screen reader support, focus management and contrast, verified with Axe DevTools, Lighthouse, JAWS and NVDA.",
      "Accessibility reference for several product teams: reviewed components in Storybook before implementation, defined component-level standards and wrote the technical requirements embedded in UI stories.",
      "Led a team of three engineers building an AI financial-intelligence platform in Next.js, from architecture to production.",
      "Worked inside a cross-regional matrix team (US / India) across several SDLC phases in parallel agile squads.",
    ],
  },
  {
    period: "2020 — 2021",
    title: "Frontend Engineer",
    org: "Super7ui",
    bullets: [
      "Global streaming product. Accessibility was a central function of the role: 200+ fixes verified with screen readers, including JAWS.",
    ],
  },
  {
    period: "2016 — 2019",
    title: "Frontend Developer",
    org: "Minutentag / EULAS",
    bullets: [
      "E-commerce at scale. Reviewed components in Storybook and wrote the technical accessibility requirements.",
    ],
  },
];

function timeline(roles: Role[], lang: string): string {
  return roles
    .map(
      (role) => `<article class="role" lang="${lang}">
        <p class="role-period">${role.period}</p>
        <h2>${escapeHtml(role.title)}</h2>
        <p class="role-org">${escapeHtml(role.org)}</p>
        <ul>
${role.bullets.map((b) => `          <li>${escapeHtml(b)}</li>`).join("\n")}
        </ul>
      </article>`
    )
    .join("\n");
}

const profileBody = `<main id="main" tabindex="-1">
  <div class="wrap">
    <header class="page-head">
      <p class="kicker">Profile</p>
      <h1>Ten years of software, five of them in accessibility.</h1>
      <p class="lede">Software engineer based in Buenos Aires, working remotely. The through-line is behaviour: what a user interface actually does once assistive technology is attached, not what the markup claims.</p>
    </header>

    <div class="page-body">
      <div class="prose-col prose">
        <h2>Experience</h2>
        ${timeline(rolesEn, "en")}

        <h2>Open source</h2>
        <p>Twelve merged pull requests across design systems: Adobe React Spectrum, IBM Carbon, IBM Products, Meta Astryx, MUI Base UI, MUI Material UI and shadcn/ui. The fixes are usually small and structural — an ARIA contract, a focus path, an announcement that competes with one the platform already makes.</p>

        <h2>Tools</h2>
        <p>TypeScript, React, Next.js, Node.js, PostgreSQL and Supabase, Playwright, Vitest, Biome, Tailwind, Storybook, Zod, Docker, GitHub Actions. Local model inference with Ollama; Python for tooling and evaluation.</p>

        <h2>Languages</h2>
        <p>Spanish native; English B2+ (working proficiency, currently studying toward C1).</p>
      </div>

      <aside class="side-col" aria-label="Contact and links">
        <h2>Contact</h2>
        <ul>
          <li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
          <li><a href="${GITHUB}">github.com/gonzoblasco</a></li>
          <li><a href="${LINKEDIN}">linkedin.com/in/gonzalo-blasco</a></li>
        </ul>
        <h2>At a glance</h2>
        <ul>
          <li>Buenos Aires, GMT-3</li>
          <li>Remote, LATAM or US EST overlap</li>
          <li>Freelance since 2025</li>
        </ul>
        <h2>Elsewhere</h2>
        <ul>
          <li><a href="../about/">About the accessibility work</a></li>
          <li><a href="../writing/">Writing</a></li>
        </ul>
      </aside>
    </div>
  </div>
</main>`;

writeFile(
  "profile/index.html",
  page({
    root: "../",
    current: "profile",
    title: "Profile — Gonzalo Blasco",
    description:
      "Software engineer, ten years building software and five in accessibility roles. Experience at EY, Super7ui and Minutentag, twelve merged pull requests in design systems.",
    canonical: `${BASE}/profile/`,
    body: profileBody,
  })
);

/* preflight: keep the old URL, point it at the product article */

writeFile(
  "preflight/index.html",
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preflight moved — Gonzalo Blasco</title>
  <meta name="robots" content="noindex" />
  <link rel="canonical" href="${BASE}/writing/preflight.html" />
  <meta http-equiv="refresh" content="0; url=../writing/preflight.html" />
  <link rel="stylesheet" href="../style.css?v=${STYLE_VERSION}" />
</head>
<body>
  <main id="main" class="wrap redirect">
    <h1>Preflight moved</h1>
    <p>Preflight now lives in the writing section. <a href="../writing/preflight.html">Continue to Preflight</a>.</p>
  </main>
</body>
</html>`
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

const feedOriginals = articles.filter((a) => !a.original_lang);
const feedUpdated = new Date(`${feedOriginals[0].date}T12:00:00Z`).toISOString();
const feedEntries = feedOriginals
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
  { loc: `${BASE}/profile/` },
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
console.log(`Home, writing index, about, profile, preflight, 404, feed, sitemap, robots.`);
