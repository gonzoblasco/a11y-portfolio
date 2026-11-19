---
title: "A breadcrumb that does not rely on color"
slug: "breadcrumb-without-color"
date: "2026-08-24"
lang: "en"
kind: "note"
category: "accessibility"
summary: "Astryx marked the current breadcrumb item with a slightly darker gray and nothing else, failing WCAG 1.4.1. The fix was one font-weight declaration, and the trade was a few pixels of width."
tags: ["accessibility", "wcag", "use-of-color", "react", "open-source"]
repo: "facebook/astryx"
pr: 4605
source: "linkedin"
---

A breadcrumb is a map. If the only thing marking your position on that map is a shade of gray, then for some people the map has no dot on it.

I spent three weeks of calendar time on two lines in a style object. One of them was the fix.

## Two grays

In Astryx, the links in a breadcrumb trail render in `--color-text-secondary`. The current page renders in `--color-text-primary`. Same font, same size, same row, same separator between items. The only thing telling "you can go here" apart from "you are here" was a small step in luminance.

Most people read that step without noticing they read it. A cue that works for almost everyone stops looking like a cue.

For a person with low vision, or a lens that has yellowed, or a laptop screen at noon on a terrace, the two grays compress toward each other. The step becomes a rumor. And in forced-colors mode the browser replaces author colors outright, so both items resolve to the same system color and the distinction disappears completely. Not reduced. Gone.

Here is the part that took me a while to name correctly. Screen reader users were fine. `aria-current="page"` was already on the current item, and assistive technology announced it as the current page. The semantic layer was correct. The failure lived entirely in the visual layer, and only for the people who depend on that layer without getting the color part of it. An accessibility attribute did not save a visual-only cue, because it was never meant to.

## Why nothing caught it

The accessibility audit that runs on every pull request reported, on mine, "No accessibility violations detected." That was true and useless at the same time.

Tools like axe measure contrast ratio between text and background. Both grays pass, because both are readable text on a light surface. Neither one is a contrast violation. The question in WCAG 1.4.1 is different: is color the only visual means of conveying this information? That is a question about a pair of states and what distinguishes them, not about a single ratio. No linter reads that intent, and no automated pass can answer it.

The issue had been open since July 27, filed by chris-gds, labeled an accessibility bug and tracked in the program tracker. Its body names the exposure plainly: products built on the design system fail standard audits, with legal weight under the ADA and the European Accessibility Act, and it is marked High / Blocker. I did not find that by being clever. I found the two tokens while reading the component, and the report was already there with a screenshot and a severity label.

Severity labels do not merge code. That is the whole distance between a filed bug and a fixed one.

## One declaration, three weeks

The fix is `font-weight: var(--font-weight-semibold)` on the shared `current` style. Value 600. Because the style object is shared, it covers both the default variant and the supporting variant, which is the one the audit was pointing at.

The `aria-current="page"` stayed exactly where it was. I did not touch it, and I did not need to. The visual channel got a second signal, and the announcement channel kept the signal it already had.

Two lines added, one removed, one file changed. That is the entire product.

The first version of my pull request deserved to be closed.

My branch carried commits from separate color-contrast work, which had its own pull request open. Unrelated changes had leaked in, and a reviewer looking at that diff would have had no way to know which part was the breadcrumb fix and which part belonged somewhere else. Scope is the first thing a reviewer reads.

So I rebased onto `main`, cut the branch down to exactly one change, and re-verified the whole surface: 25 of 25 tests in the Breadcrumbs suite, lint clean, `check:sync` clean, package boundaries clean. All of that was already green before, and none of it had caught the bug. I ran it anyway, because after a rebase the only thing you own is the evidence.

Then the repository did something I did not expect. The Breadcrumbs audit, a separate piece of work with its own findings, hit the same problem as finding B8 and explicitly deferred it to my open pull request instead of landing a color-only patch that would have collided with the proper fix. The audit named the issue, named the PR, and named the approach: semibold weight on the shared `current` style.

A queue of audits is not usually a friend to a contributor. This one was.

## What the weight costs

cixzhang approved it with one nit that I kept: semibold runs about four pixels wider, so long labels wrap sooner.

That is the honest price of the fix, and it is small enough to pay. Every non-color cue costs something. An underline would fight the link underline in the same row and blur the affordance instead of sharpening it. A border would put a box around plain text and invent a container the design does not have. An icon would require a new asset, a decision about which glyph means "current", and a translation of that glyph for every locale. Weight was the channel already present in the type system, and it costs layout instead of vocabulary.

It also raises the current item's visual rank, which is the direction you want. The place you are should not read as the quietest thing in the row.

What it does not do is make the breadcrumb better for screen readers, because that part was never broken. And if the loaded font has no 600 cut, the browser synthesizes one or picks the nearest weight, and the cue gets thinner than the declaration promises. A second channel is still a channel, not a guarantee.

## The rule

Desaturate the component and look at it. If the states collapse into one, you never had a second channel. You had color and a story about color.

That test takes a screenshot and ten seconds, and it catches the class of bug that ships under a green audit. It is not a substitute for testing with assistive technology. It is the test that asks whether the thing is visible at all to someone who is not you.

The merge landed at 00:48 on August 24, twenty four days after I opened the PR. Two lines in the diff, three weeks in the calendar, and a trail that still points at you when the colors go away.
