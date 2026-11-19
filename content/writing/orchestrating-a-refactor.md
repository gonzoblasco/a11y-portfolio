---
title: "Orchestrating a 10,000-line refactor"
slug: "orchestrating-a-refactor"
date: "2026-08-28"
lang: "en"
kind: "note"
summary: "A 10,000-line monolith became a modular app through a staged agent pipeline: planning, execution, cross-review by a different model, and verification. The public API did not change."
tags: ["engineering", "ai", "refactoring", "architecture", "agents"]
source: "linkedin"
---

Refactoring 10,000 lines of monolithic code is not a writing problem, it is an orchestration problem.

I recently finished the modular restructuring of a macOS cleaning app. The challenge was not just moving files, but guaranteeing the original behavior stayed intact while the architecture became something maintainable and testable.

## The process: an A/B pipeline and differentiated reasoning

Instead of using AI as an autocomplete chat, I used an orchestrated agent system:

1. Planning (Kanam, MAX): analysis of the monolithic structure and design of the route and module map. The orchestrator defines the strategy before a single line is written.
2. Execution (Agent A, HIGH): implementation of the modularization, separating routes, utility libraries and business logic.
3. Cross-review (Agent B, HIGH): a second agent, running a different model, reviews the first agent's code. This step is critical. It catches scope hallucinations and syntax errors that the first agent ignores because of tunnel vision.
4. Final verification: endpoint validation and unit tests over the most critical modules, security and paths.

## The why: system over tool

Many developers use AI to generate functions. Here we used it to manage complexity.

Separating the thinking phase (MAX) from the execution phase (HIGH), and adding a cross-review layer on top, sharply lowers the risk of introducing bugs during a massive refactor. It is not about writing faster. It is about reducing the error rate on deep structural changes.

Result:

- From 3 giant files to a professional modular structure.
- 27 unit tests proving the security rules did not change.
- Zero changes to the public API, keeping full compatibility with the frontend.

AI does not replace the engineer, but it redefines the scale of what a single engineer can refactor in one session.
