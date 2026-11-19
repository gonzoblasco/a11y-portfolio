---
title: "The bug jsdom could not see"
slug: "the-bug-jsdom-could-not-see"
date: "2026-11-03"
lang: "en"
kind: "note"
category: "testing"
pair: "bug-jsdom-could-not-see"
summary: "A shadcn/ui PR sat for three months while 61 jsdom tests passed. jsdom does not fire scroll events for programmatic scrolls, so it could not see the spacer collapse the fix introduced. Browser tests found that and two more bugs."
tags: ["accessibility", "focus", "testing", "react", "open-source"]
repo: "shadcn-ui/ui"
pr: 11465
source: "linkedin"
---

A PR I opened in August merged on November 2. For most of that time, 61 tests passed and the code was wrong.

Not in a corner nobody visits. `MessageScroller` is the primitive behind the streaming chat example, the one where a reply types itself into the page while you watch. The bug lived in the second after you scroll.

## A scroll during the answer

When a user message anchors near the top of the viewport, the component reserves room below it: a tail spacer, sized so the reply has somewhere to grow without pushing the page. As chunks arrive, the spacer is consumed and the reader stays where they are. That is the whole design.

Then the reader scrolls. Up, usually, to re-read the question. A manual scroll releases the anchor, and from that moment the spacer has no owner.

With `autoScroll` on, follow mode re-arms on the next commit and `scrollToEnd` drives the spacer to zero in a single frame. The reserved room collapses and the viewport jumps to the live edge while the reply is still three lines tall. With `autoScroll` off, nothing re-arms, the spacer freezes at its current height, and a dead gap sits under the reply. The answer can grow to fill the screen and the gap does not move.

Same gesture, two failures, one cause. Scrolling to read while an answer arrives destroys the room reserved for the answer.

## The test that could not fail

`reconcileFollowMode` had a branch that re-armed `following-bottom` whenever `autoScroll` was on and the scroll was not at the end. It excluded two modes, `settling-jump` and `anchored-to-message`. It did not exclude `free-scrolling`, the mode a turn sits in after the reader grabs the scroll.

The second half is geometry. `scrollable.end` is measured against `contentBottom`, and `contentBottom` does not include the tail spacer. A reader parked inside the spacer reads as being at the end, so their own gesture flipped them back into following. The next chunk called `scrollToEnd` and one frame later the room was gone.

The other gap was simpler: a released spacer was never drained. `scrollToEnd` consumed it on the follow path, and nothing else touched it.

I wrote the fix and a regression test. The suite went to 61 passing, typecheck clean, and I opened the PR.

## The first review

daltino read the drain logic the next day and asked one question: what happens if the stream stops before the spacer reaches zero? The guard I had added, `spacerHeight === 0`, would then block follow mode from ever re-arming. The test only exercised the happy path where the stream runs long enough to drain the room.

That reading was right, and the edge case was the interesting one. A stream is not a promise. It can end mid sentence, mid drain, with a few pixels of reserved room left and no further resize to consume it.

I pulled the drain into `drainReleasedSpacer` and ran it from two places: `handleResize` when the reply grows into the room, and `syncAfterScroll` when the reader moves. A scroll to the real bottom then finishes the job, because the bottom includes the spacer. I added the test that cuts the stream.

At that point the code did what I thought it should do. It still was not mergeable.

## What jsdom cannot see

shadcn reviewed on September 2 and named the thing no test in my suite could have named: `syncAfterScroll` runs on every scroll event, including the programmatic one that places an anchored turn. In a real browser with `autoScroll` on, every anchored turn got yanked to the bottom. The exact bug the PR existed to fix, reintroduced by its own fix.

The 61 tests passed because jsdom does not fire scroll events for programmatic scrolls. The handler never ran. The test was not weak or badly written. It was measuring a page where the event does not happen.

Two smaller problems sat in the same function. On resize, a reader who had scrolled up past the spacer zone produced `consumed` equal to zero, so the spacer collapsed and `scrollToEnd` yanked them out of the transcript they were reading. On scroll, the drain subtracted an absolute overlap on every event instead of a delta, so inertial scrolling over-drained and cascaded into a jump.

The revision skipped `anchored-to-message`, `settling-jump` and the programmatic scroll flag. It recomputed the room from absolute geometry on every event, `max(0, contentBottom + spacerHeight - (scrollTop + clientHeight))`, so repeated events converge instead of compounding. It returned early when the reader was above the spacer zone, and handed off to `scrollToEnd` only at the real bottom, where the spacer is zero by construction. Then two browser tests with `autoScroll` on: one asserts that placing an anchored turn does not yank, the other that a manual scroll drains the spacer without moving the reader and that scrolling to the bottom re-engages following.

jsdom passed 51 of 51. Browser mode passed 48 of 48.

## What green means

I got the diagnosis wrong too, before any of this. On August 3, sandengocka described both changes in the issue thread with the reasoning intact. I answered that `main` already covered it in #11106. It did not.

That fix ran while the turn was still `anchored-to-message`; this bug lives in what happens after a manual scroll knocks the turn out of that mode. I went back through the code, confirmed their reading, and wrote the PR on top of it.

A green suite is a statement about an environment, not about the product. jsdom is honest about the DOM and silent about what a browser does while it scrolls, and the gap between those two is exactly where a spacer, a scroll event and a single frame can ruin a reading experience.

Test where the bug lives. Three months, four files, 346 added lines for one deleted one, and what unblocked it was a test that a different runtime could actually run.
