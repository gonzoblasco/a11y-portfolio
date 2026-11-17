# a11y-portfolio

Static site: https://gonzoblasco.github.io/a11y-portfolio/

Notes on what screen readers actually announce, and the fixes behind the merged pull requests.

## Structure

- `index.html`
- `writing/the-quieter-announcement.html`
- `style.css`

No build step, no JavaScript, no external fonts. Served by GitHub Pages from `main` at the
repository root.

## Accessibility of this site

The site is meant to survive the same test it argues for, so it is built with landmarks, one `h1`
per page, a skip link, visible focus styles, AA contrast, and keyboard scrollable code blocks
(`pre[tabindex="0"]`).

## Deploy

Push to `main`. Pages rebuilds automatically.
