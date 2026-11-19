---
title: "The bug jsdom could not see"
slug: "the-bug-jsdom-could-not-see"
date: "2026-11-03"
lang: "en"
kind: "note"
category: "testing"
summary: "A shadcn/ui PR sat for three months because its tests ran in jsdom, which does not fire scroll events for programmatic scrolls. Browser tests found that bug and two more in the same function."
tags: ["accessibility", "focus", "testing", "react", "open-source"]
repo: "shadcn-ui/ui"
pr: 11465
source: "linkedin"
---

A PR I opened in August merged yesterday. Three months. And what unblocked it was not the code: it was a test that could not see the bug.

The bug: in a chat with streaming and anchored scroll, if you scroll while the answer is being written, the space reserved below the message breaks. With autoScroll on, the view jumps to the bottom even though the answer is still short. With autoScroll off, you are left with a dead gap at the bottom that never resolves.

In both cases, a completely normal action, scrolling to read, destroys the view.

The fix had two parts: gate the re-arming of follow mode on the spacer being at zero, and drain that spacer when the anchor is released, so the answer fills it without moving the reader.

The tests passed. 61 tests, all green. And the PR was not mergeable.

The reason came from shadcn in review, and it was the best review I got this year: the tests ran in jsdom, and jsdom does not fire scroll events for programmatic scrolls. Without that, the test cannot see that the drain broke exactly what the PR was meant to fix. In a real browser, every anchored turn shot to the bottom.

Green in CI does not mean correct. It means that environment did not see the problem.

I added browser-mode tests. And there it was: besides that one, there were two more bugs in the same function. One was the drain math, which accumulated error under inertial scroll. daltino also counted: in August he raised the case of the stream that cuts out with the spacer half-drained.

The lesson is not "test better". It is more specific: when the bug lives in scroll, geometry or timing, the test has to run where the bug exists. jsdom is excellent for the DOM. For what happens while the browser scrolls, it is blind by design.

PR: https://github.com/shadcn-ui/ui/pull/11465
