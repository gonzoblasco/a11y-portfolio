---
title: "Sortable headers are not toggle buttons"
slug: "sortable-headers"
date: "2026-10-07"
lang: "en"
kind: "note"
category: "accessibility"
summary: "A sortable Datagrid header announced itself as a toggle button, because aria-pressed competed with aria-sort and won. Removing the attribute let the sort direction reach the user again."
tags: ["accessibility", "aria", "aria-sort", "datagrid", "screen-readers"]
repo: "carbon-design-system/ibm-products"
pr: 9879
source: "linkedin"
---

Sorting a column is one action with three outcomes. The control that did it was announcing two states, and neither of them was the sort.

The table was a Datagrid with sortable columns. I tabbed to the first sortable header and pressed Enter. An arrow appeared, the rows moved, the order changed on screen. VoiceOver said "toggle button, not pressed".

I activated it again. The arrow flipped to the other direction, the rows reversed, and the announcement came out in the same shape. Pressed or not pressed. Nothing about up or down.

A blind user sorting that table has no way to know whether the list is now A to Z or Z to A. The rows are in a different order and the only feedback is the absence of a state that never meant anything.

The header cell was already saying the right thing. `aria-sort` lives on the `columnheader` element and carries `ascending`, `descending` or `none`. The problem was the thing in the tab order. The focusable element was the button inside the cell, and the button had its own role and its own state, and that is what got read.

## Pressed is not sorted

`aria-pressed` does not describe a button. It assigns one. The moment a button carries it, the element is a toggle button, and assistive technology reports it as a two-state control with an on and an off.

Sorting is not two states. It is three: ascending, descending, and neither. Even in the best case, mapping three outcomes onto a boolean throws information away.

In practice it was worse than that. `false` meant "this column is not the sorted one", which a listener hears as "the toggle is off", not as "this table is sorted by something else".

The value came from a helper called `getAriaPressedValue`. It took the column, read `isSorted`, and returned `'true'` or `'false'`. Four lines, defensive null check, correct TypeScript, and the wrong question.

## Why nothing caught it

Issue #9839 came in from someone using macOS VoiceOver, with the IBM Equal Access checker listed as the automated tool. That combination is the whole lesson. The automated checker ran, and the markup was valid.

A `button` may carry `aria-pressed`. Nothing in the rules says a sortable header may not.

A linter can tell you whether a role allows an attribute. It cannot tell you whether the resulting announcement describes the thing on screen. Between valid and usable there is a gap, and only a person with a screen reader stands in it.

The test suite had the same blind spot from the other side. All 47 tests in `Datagrid.test.jsx` passed, and they were testing sorting: click the header, assert the row order changed, click again, assert it reversed. Those tests prove the sort works. None of them asked what the sort sounds like.

The behavior was covered. The announcement was not.

## The fix was a deletion

I removed `aria-pressed` from the `Button` in `useSortableColumns`, and deleted `getAriaPressedValue` with it. The sort state stayed where it already was, on `aria-sort` in the columnheader, computed by `getAriaSortValue` in `DatagridHeaderRow`. Two files, 24 lines added, 11 removed, most of the additions being a comment that points at the issue.

What made me confident this was the right shape rather than a guess: the core `@carbon/react` DataTable does not put `aria-pressed` on its sort trigger at all. Its `TableHeader` leaves the state on `aria-sort`. Datagrid was the outlier, not the reference. The fix was not a new convention, it was deleting an extra one.

The regression test reads the first row, collects the columnheaders, finds the button inside each sortable one, and asserts `getAttribute('aria-pressed')` is null. On `main` the same assertion finds `"false"` and fails. Merged on October 7, after one dismissed review and two approvals.

## The hole I left

The assertions sit inside an `async` callback passed to `Array.from(...).map`. Nothing awaits that array. A failed expectation there does not surface as a named failing assertion, it surfaces as an unhandled rejection somewhere else in the output. The test can go red without telling you which column broke.

I found it rereading the diff, later than I would like. The habit that would have caught it is the one I keep relearning: assert on the element that carries the semantics, and make the failure point at it. Same rule as the test, applied one level up.

There is a second limit, and no test fixes it. An absence assertion proves the attribute is gone. It cannot prove the direction is announced.

That check is a person, headphones on, sorting a table. It was a person who found this in the first place, which is the right order of events and the wrong one to rely on.

## The rule

`aria-pressed` is a role assignment wearing the costume of a state. Set it and the control is a toggle, no matter what else the markup says.

When two attributes describe the same thing, put the state on the element that carries the meaning, not on the element that happens to receive the click. The header cell carries the column. The button carries the action. `aria-sort` belongs to the column.

And the cheapest fix is often a deletion. Nothing was added to make this table announce correctly. One attribute and one helper stopped being there, and the semantics that were already present became the only thing left to hear.
