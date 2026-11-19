---
title: "Counting items across sections"
slug: "posinset-across-sections"
date: "2026-09-09"
lang: "en"
kind: "note"
category: "accessibility"
summary: "A test-only PR locks in that aria-posinset stays global across menu sections. The first version flattened the fixture, went green and tested nothing; the corrected one renders the real sections."
tags: ["accessibility", "aria", "testing", "react-spectrum", "open-source"]
repo: "adobe/react-spectrum"
pr: 10554
source: "linkedin"
---

A green test is not evidence. It is a claim with a check next to it, and the check only covers the code the fixture actually reaches.

Most accessibility work produces that kind of test by accident. The fix is real, the assertion is real, and the fixture quietly walks around the part that was broken.

This is the story of one of mine.

## First, the announcement

In January, tomsontom filed [issue #9556](https://github.com/adobe/react-spectrum/issues/9556) against the Picker sections example. The first item in the popup, Chocolate, reported `aria-posinset=2` while the list reported `aria-setsize=6`.

Two numbers, one object, no agreement. The first option in a menu is item one. A screen reader was saying "2 of 6" before the user had moved.

The cause was a mismatch between two attributes computed from different sources. `aria-setsize` used the global item count. `aria-posinset` came from `item.index`, which restarts at zero inside each section. The numbering started over in every group while the total stayed global.

What that sounds like is worse than a wrong number. A reader moves into the second group and hears "1 of 6" for an item that is actually item four. The position is the only cue about how far through the list you are, so the list reads as two short lists instead of one long one.

The fix landed in [PR #10487](https://github.com/adobe/react-spectrum/pull/10487). A shared helper, `getPosInSet`, counts items globally and ignores section headers. It went into both `useOption` and `useMenuItem`, because the same pattern lived in the listbox and the menu.

After that, the values were correct. Nothing kept them correct.

## A test that only guards what it renders

My next PR was test-only: [test: add regression for global aria-posinset across sections](https://github.com/adobe/react-spectrum/pull/10554). One file, 102 lines added, 2 removed. The idea was simple. Render a menu with two sections and four items, assert that the positions are 1, 2, 3 and 4, and assert that `aria-setsize` says 4.

My first version passed.

It also never built a section. The helper I wrote to create the mock flattened the groups into a plain list of items, so the hook received four siblings and no group structure at all. The section code never ran. The section branch that had caused the bug in the first place was not in the test.

With a flat list, index and position are the same number. Four items produce 1, 2, 3, 4 whether the logic is right or wrong, because there is no section to restart anything. The test agreed with itself.

snowystinger reviewed it and wrote one line: "The test isn't rendering the sections." Then, in the same comment, the part that stung: "while that shouldn't affect the posinset, it's incomplete."

That is exactly right, and it is the reason the review mattered more than the test. The numbers were correct. The coverage was zero.

## What a real fixture looks like

The corrected helper renders each section the way the component does. A `role="presentation"` wrapper holds a `role="group"` inside it, and the group is labelled by its section heading through `aria-labelledby`.

The assertions changed shape too. Before checking any number, the test verifies that both groups exist and that each one is labelled by its own heading. The DOM structure is part of the regression, not a stage set for it.

Then the positions are checked, and then `aria-setsize`, and then that the two agree. Five assertions in `useMenu.test.tsx`, all passing, full lint clean.

Asserting the structure first is not ceremony. If the groups disappear, the position check should fail for that reason and not for an unrelated one. The failure message then says which part broke.

The difference between the two versions is one helper function. The difference in what they cover is the entire bug.

## The part I did not fix

The second review asked for two more things. The heading span needed to render `node.rendered`, matching the real `MenuSection`, so the visible text and the labelling come from the same source. That was a small change.

The other request was to move the test up a level, to react-aria-components with a real `Virtualizer`. I tried. I found something I did not expect: with the virtualizer in the tree, `aria-posinset` resets per section in the rendered output. The second section starts again at 1 instead of continuing at 3.

The hook contract holds. The layout path does not carry it through.

That is a separate bug with a separate fix, and folding it into a test-only PR would have muddied both. I kept the test at the hook level, where the original contract was verified, and left the virtualizer behavior as a note on the PR. It has no follow-up issue yet, and that is a loose end I am aware of.

## How to tell a test is decoration

There is a cheap check, and it takes a minute. Break the thing the test claims to protect, and run it. If the test stays green, the test is describing the fixture, not the behavior.

The other check is structural. Read the setup and ask which lines of production code it can reach. A test that builds its own simplified world can only fail when that world breaks, and the real one is usually somewhere else.

A number in an assertion is not proof of anything on its own. It is proof when the structure that produces the number is also in the test. Otherwise it is a coincidence with good formatting.

The PR is merged. Four items, two sections, positions 1 through 4, matching a set size of 4. That took five assertions and one honest review.
