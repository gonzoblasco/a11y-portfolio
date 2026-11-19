---
title: "Focus after the step changed"
slug: "focus-after-step-change"
date: "2026-09-14"
lang: "en"
kind: "note"
category: "accessibility"
summary: "Pressing Next in CreateFullPage sent focus to the skip link: the helper looked for an inert attribute the component never set. One querySelector for the visible step class fixed it, and a focus assertion that had never existed."
tags: ["accessibility", "focus-management", "keyboard", "ibm-products", "open-source"]
repo: "carbon-design-system/ibm-products"
pr: 9878
source: "linkedin"
---

The bug report said focus was lost. It was not. It was delivered, with confidence, to the one element that undoes the step you just took.

A keyboard user presses Next in a multi-step form and expects to land inside the step that just appeared. In `CreateFullPage`, focus went to the "Skip to main content" link at the top of the page instead.

Picture the screen reader announcement. The user activates Next, the form swaps content, and what they hear is a link at the top of the document whose only job is to jump past the navigation. Nothing announces the new step. Nothing says the form moved on.

A keyboard-only user pays in keystrokes. From the skip link, the way back to the form is tab, tab, tab through everything above it. The user who cannot see the page has no way to learn the new step ever rendered, and the announcement actively tells them they are at the beginning.

Same bug, two bills.

## The step that was never inert

A helper called `getActiveStep()` walked every step in the DOM and returned the first one whose ancestor chain carried no `[inert]` attribute. In the abstract the logic is sound: the visible step is the one that is not inert.

`CreateFullPageStep` never sets `inert`. It hides the inactive steps with a class, `__step--hidden-step`, which is `display: none`, and marks the active one with `__step--visible-step`. So the walk returned the first step in DOM order every time, whichever step was actually active.

The hook then did a reasonable thing with the wrong container. `getFocusableElement` queried it for `button, input, select, textarea, a[href]`, took the first enabled match, and called `.focus()` after a 10 ms wait.

That wait mattered later. `TearsheetShell` needs a timer to claim focus during a stack change, so the focus call never runs on the same tick as the render.

The element it found was real. `querySelectorAll` finds elements inside a `display: none` subtree without complaint. `.focus()` on one of them is a browser no-op.

Find the wrong step, find a genuine input inside it, ask the browser to focus something it cannot focus, get silence. Focus stayed on the Next button or fell to `<body>`, and the next tab stop collected it.

## Why the tests were green

The file had 27 tests before mine. Not one of them read `document.activeElement`. They asserted that step two became visible, that `onNext` was called, that the progress indicator moved. The state was covered, the side effect was not.

The helper was also right just often enough to hide. When the active step is the first in DOM order, "the first step without `inert`" and "the visible step" are the same element. Any test that stayed on step one, or supplied a working `firstFocusElement` selector, got the correct answer by accident.

And the bug lived behind a timer. Even a test that watched focus would have needed to wait for it. Async with no assertion is invisible twice.

This is the part I did not appreciate until the test failed: a green suite does not mean the behavior was checked. It means the assertions that exist passed. Focus management was simply not among them.

## Query the thing itself

The fix is one line, and it is not clever. Stop inferring visibility and read the class the component already writes.

```js
const getActiveStep = () => {
  return document.querySelector(`${blockClass}__step--visible-step`);
};
```

The visible-step class is how the component decides what a user sees. Reading it back is not a shortcut around the abstraction, it is the same source of truth the render already trusts. It is also one query instead of a walk up every ancestor of every step.

There is a trap in that selector worth naming. `blockClass` already ends in `__step`, so appending `__step--visible-step` produces `...__step__step--visible-step`. I left the doubled form in a comment in the hook so the next person does not tidy it away.

I kept the `isNotContainedInInert` check. `useCreateComponentFocus` is shared with `CreateTearsheet`, whose steps do set `inert` on the outer element as well as the visible class. Both paths still resolve, and I put that blast radius in the PR description before review rather than after.

The regression test renders two steps with real inputs, clicks Next, and asserts that `document.activeElement` is the input inside the visible step, and is not the skip link, and is not the body. It fails on `main` with a `waitFor` timeout. The suite went to 28 of 28.

## The deprecation review

The first review approved the change and told me the component is on the deprecation list. There is an example pattern in StackBlitz now, and the advice was to copy that into the application and maintain the fix there.

That is a fair argument in a roadmap sense, and it is not the one that settles this. The bug is live on the published package for everyone in the range the issue tested, 2.44 through 2.80. The change is one line in a shared hook plus a test, with no new API surface. Someone who upgrades today gets working focus without migrating first.

I said that in the thread and offered to open a separate PR against the example if the pattern turned out to carry the same step-change logic. Two maintainers approved it and it merged on 14 September.

## The rule

A helper that decides what is visible has to read what the component actually writes. An attribute nobody sets is not a weak signal, it is a constant, and a constant will return the first element forever without ever throwing.

The second rule is about the test. If the behavior is focus, assert on `document.activeElement`. A test that only checks which step carries the visible class will stay green while every keyboard user lands on the skip link to start over.
