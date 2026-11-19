# a11y-portfolio

Personal site and blog: [gonzoblasco.github.io/a11y-portfolio](https://gonzoblasco.github.io/a11y-portfolio/)

Notes on what screen readers actually announce, and the fixes behind the merged pull requests.

## Structure

```
content/writing/*.md      source of truth for every article
scripts/build.ts          static generator (Bun, no dependencies)
style.css                 design system and page styles
assets/fonts/             self-hosted WOFF2 files
index.html                generated
writing/index.html        generated
writing/<slug>.html       generated (one per article)
about/index.html          generated
preflight/index.html      generated
404.html                  generated
feed.xml                  generated
sitemap.xml               generated
robots.txt                generated
```

## Build

```bash
bun scripts/build.ts
```

The generator reads the markdown files, parses their front matter, renders the body with
`Bun.markdown`, and writes every page. It exits non-zero if an article is missing `title`, `slug`,
`date`, `lang` or `kind`, or if a date is not `YYYY-MM-DD`.

Requires Bun 1.4.2 or newer. There are no npm dependencies.

## Front matter

```yaml
---
title: "The Quieter Announcement"
slug: "the-quieter-announcement"
date: "2026-11-17"
lang: "en"
kind: "essay"
summary: "One or two sentences used as the excerpt and meta description."
tags: ["accessibility", "screen-readers"]
repo: "adobe/react-spectrum"   # optional
pr: 10503                      # optional
source: "linkedin"             # optional
source_url: "https://..."       # optional
---
```

`canonical` is computed by the build from the slug. The live URL of the existing article,
`writing/the-quieter-announcement.html`, is preserved.

## Deploy

Push the generated files to `main`. GitHub Pages serves the repository root.

## Accessibility of this site

The site is meant to survive the same test it argues for:

- landmarks, one `h1` per page, skip link;
- visible `:focus-visible` styles on links, buttons and code blocks;
- AA contrast on every text pair; measurements live in `.knowledge/IMPLEMENTATION-NOTES.md`;
- code blocks scrollable by keyboard (`pre[tabindex="0"]` with `role="region"` and a label);
- no JavaScript required;
- `prefers-reduced-motion` respected.

## Fonts

Fraunces, Newsreader and IBM Plex Mono are self-hosted from `assets/fonts/` (latin subsets). They
are licensed under the SIL Open Font License. See `assets/fonts/LICENSE.md`. There are no requests
to Google Fonts at runtime.
