---
title: "Orchestrating a 10,000-line refactor"
slug: "orchestrating-a-refactor"
date: "2026-08-28"
lang: "en"
kind: "note"
category: "engineering"
summary: "A 10,000-line macOS app spread across three giant files became a modular structure through four stages kept apart: planning, execution, cross-review by a different model, and verification. The public API never moved."
tags: ["engineering", "ai", "refactoring", "architecture", "agents"]
source: "linkedin"
---

Refactoring 10,000 lines of monolithic code is not a writing problem. It is an orchestration problem.

The code did not need to be smarter. It needed to move without breaking anything that depended on it.

## Three files, one surface

The app was a macOS cleaner. Ten thousand lines lived in three giant files, with routes, utility code and business logic interleaved. A change to a path rule meant scrolling past the route table to find it, and the route table was the thing most likely to break.

The hard constraint was external. The frontend called the app through a public API, and that API could not move. A modular structure that renamed a response field would have forced a second refactor on the client. So the job had one non-negotiable: the surface stays identical while the inside is rebuilt.

That constraint changed the shape of the work. The task was not "improve this code". It was "prove the behavior did not change while the code around it did". Those are different jobs, and the second one is mostly verification.

## Separating the plan from the typing

I ran this as a pipeline instead of a chat. Four stages, each with a different job and a different amount of room to improvise.

Planning ran at MAX. The output was not code. It was a map: which routes exist, which utilities they share, where the business logic belongs, and in what order to move things so the app never sat in a half state. Writing that map first is the step I would have skipped working alone in an editor. In a chat, the plan lives in the conversation and evaporates when the context does.

Execution ran at HIGH, against the map. Agent A moved the routes out, pulled the utility libraries apart from the business logic, and kept the public handlers pointing at the same shapes. Its mandate was narrow: follow the plan, do not redesign.

That narrowness matters. An executor allowed to improve things while it moves them is doing two refactors at once, and only one of them is being checked.

## The reviewer that did not write the code

The third stage is the one I would keep if I could keep only one. A second agent, on a different model, read Agent A's output.

Different model is the point, not a detail. An agent reviewing its own work grades its own assumptions. It re-reads the plan it just followed and finds the plan reasonable. A model that never saw the reasoning has to reconstruct intent from the diff, and that is exactly where the gaps show.

The review caught two kinds of problem. Scope hallucination: code that solved a problem nobody assigned, or a piece that moved when the plan had deliberately left it alone. And syntax-level errors the executor had stopped seeing, the way a typo disappears in a paragraph you have read too many times.

None of it is magic. A reviewer without the plan can also invent objections. What it reliably does is read the code as a stranger, and a stranger does not inherit your tunnel vision.

## What the numbers prove

The last stage was verification, and it was narrower than the review. Endpoint validation, plus unit tests over the modules carrying the security rules and the path handling. The final count was 27 tests.

I want to be precise about what 27 means. It is not coverage. It is 27 assertions that the security rules behave as they did before the split, written against the modules where a silent change would have been expensive. The tests prove what they assert. They do not prove the refactor is correct everywhere, and I would not claim that from a number.

The result I care about more is that the public API did not change. Routes, payload shapes and responses stayed where the frontend expected them. That is not a metric. It is a constraint that held for the whole job.

Three files became modules separated by responsibility: routes apart from utilities, utilities apart from business logic. Smaller files are the visible part. The useful part is that the next change has an obvious place to go.

## The rule

A refactor is not finished when the files are smaller. It is finished when the contract is unchanged and something can prove it.

The pipeline is how I got there, not the story. Plan at high reasoning, execute against a written map, review with a model that did not write the code, then verify the part where a mistake would cost the most. Each stage catches a different failure, which is why collapsing them into one long conversation undoes the point.

What changed for me is scale, not speed. I did not type 10,000 lines faster. I could hold a structure that size long enough to finish it, because the thinking, the moving and the checking were in separate hands.
