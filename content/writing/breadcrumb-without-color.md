---
title: "A breadcrumb that does not rely on color"
slug: "breadcrumb-without-color"
date: "2026-08-24"
lang: "en"
kind: "note"
category: "accessibility"
summary: "Astryx told the current page in its breadcrumb from the links only by color, failing WCAG 1.4.1. The fix was one line of font weight, three weeks and a cleanup rebase away from merge."
tags: ["accessibility", "wcag", "use-of-color", "react", "open-source"]
repo: "facebook/astryx"
pr: 4605
source: "linkedin"
---

Some fixes are invisible. This one is a single line of CSS that took three weeks to land, and it is the kind of change that makes the web a little more usable for people who do not see color the way most of us do.

A few weeks ago I opened an issue on astryx (Facebook's open-source React component library): the current page in the breadcrumb trail was distinguished from the links *only by color*. A link is `--color-text-secondary`, the current page is `--color-text-primary`. If you cannot perceive that color difference (color blindness, low vision, a high-contrast display), the breadcrumb silently fails WCAG 2.1 SC 1.4.1 (Use of Color). You would have no idea where you are in the site.

The fix sounds trivial: add `font-weight: var(--font-weight-semibold)` to the current item's style, on top of the `aria-current="page"` that was already there for screen readers. Now the current page reads as current by weight, not just by color.

But the interesting part is what happened between the issue and the merge.

My first version of the PR was a mess. I had accidentally let unrelated commits from a color-contrast branch leak into it. A reviewer would have been right to close it. So I rebased onto `main`, cleaned the scope down to exactly one change, and re-verified everything: 25/25 tests, lint clean, package boundaries clean.

Then something genuinely cool happened. astryx runs a nightly "component auditor" that found the same bug I had filed, and explicitly deferred it to my PR rather than landing a color-only patch that would have conflicted with the proper fix. The audit cited my open PR as the right way to solve it.

That is the part I love about open source: the system itself pointed at the correct fix. The maintainer who reviewed it said it was "the fix the Breadcrumbs audit pointed at."

Merged the same day: one line of CSS, three weeks of patience, and a breadcrumb that now tells you where you are, even if you cannot see the difference between two grays.

If you build UI, go check your breadcrumbs. If the current item is only distinguished by color, you have the same bug I had.
