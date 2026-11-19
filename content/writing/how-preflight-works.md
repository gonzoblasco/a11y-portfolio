---
title: "What happens during a Preflight scan"
slug: "how-preflight-works"
date: "2026-11-18"
lang: "en"
kind: "essay"
category: "engineering"
summary: "A URL goes in, a real browser renders the page, axe reads the rules, a virtual screen reader walks the accessibility tree, a score refuses to be green while someone is blocked, and a fix prompt comes out."
tags: ["accessibility", "preflight", "architecture", "screen-readers", "browser"]
---

A scan looks like one action: paste a URL, wait, read a report. Underneath it is a sequence of measurements, and each one exists because a simpler version produced a wrong answer.

This is what happens between the URL and the fix prompt.

## 1. The URL is checked before anything opens

The first job is deciding whether the scanner should touch the address at all.

A public scan refuses private hosts on the literal address and again after DNS resolution. That second check matters: a hostname can resolve to `127.0.0.1` or a link-local address, and a scanner that follows it becomes a free port scanner for anyone who can call it. The local CLI is different by design. It accepts `localhost` and private addresses, because the person running it and the machine being scanned are the same. Pass `--public-only` if you want the strict behavior locally.

Only then does a browser open.

## 2. A real browser renders the page

Preflight launches Chrome, not an HTML parser. It uses the installed Chrome channel rather than the bundled headless shell, because the accessibility tree of the shell is not the tree users run.

The context is fixed on purpose: 1366 by 900, device scale 1, `prefers-reduced-motion: reduce`, `en-US`. A scan that changes viewport or locale between runs is not comparable to the next one. Navigation has a 20 second timeout and the whole scan has a 45 second budget. A page that hangs fails visibly instead of holding a worker.

The page loads with `domcontentloaded`, then waits for `load` with a cap, because scanning a skeleton produces findings that belong to the skeleton.

## 3. Animations are frozen, then the page is allowed to settle

This is the step most tools skip, and it is the source of the false positives that make a score untrustworthy.

Entrance animations are a measured problem. A live React SPA produced three contrast failures that were the page sampled mid-fade at roughly 52 percent opacity. `prefers-reduced-motion` alone does not fix it, because libraries such as framer-motion animate inline styles and never consult the media query.

Preflight does two things in order. It freezes every animation and transition at its end state, then samples the page until two consecutive visual samples agree. The first is a belt, the second is suspenders. Only then does analysis start.

The result is deterministic: the same page produces the same findings on every run. Without that, a score is not evidence.

## 4. axe reads the rules

The engine runs axe-core on the stable page, across the rules that apply to the rendered state. That is the mechanical layer: contrast, roles, allowed attributes, names, landmark structure, and the rest of the rule set a mature checker already knows.

Axe is necessary and not sufficient. It answers whether the markup declares the right things. It cannot answer what a person hears when the component is used. The next step is for that question.

## 5. A virtual screen reader walks the accessibility tree

The page HTML is passed to a virtual screen reader, which walks the tree and records what it announces, in order. Every phrase becomes part of a transcript. A role announced with no name is marked and explained in plain language.

This is the observation no attribute linter can produce. It is also bounded: the transcript reflects what the DOM declares, not how VoiceOver or NVDA times a specific announcement in a specific browser. The report says so.

Content behind interaction is only read if it is open on load. A modal that appears after a click is not in the scan, because the scan does not click.

## 6. Findings become plain language

Each axe violation is mapped to a rule with three pieces: what the rule means, what the person experiences, and what to change. When a rule has no dedicated copy, a fallback keeps the finding instead of dropping it.

Each finding keeps its nodes: selector, HTML, failure summary. That is what makes the next step possible. A finding without a location is a lecture; a finding with a selector is a repair.

Findings are read twice, and only the ones present in both reads are reported. A consent banner caught mid-mount is a transient state, not a defect of the page.

## 7. The score refuses to be green while someone is blocked

The score is computed once, in one place, from the findings. The surfaces do not recompute it.

The rule is simple to say and hard to implement honestly: a page with 92 findings fixed and one unusable checkout does not get an A. Blocking defects cap the score. `92/100 but checkout is broken` is how a tool gets uninstalled, because the number and the experience disagree.

## 8. The fix prompt is built from the finding, not from a template

For each finding and each node, the engine builds a step: where the problem is, what to change, the measured cause, and the announcement the reader must produce afterwards.

Two details make it more than a list. The target is inferred from the selector, so the instruction names a component or a shared source instead of a DOM path. And failures that share a cause are grouped under one key, so a CSS variable used in two places produces one repair, not two.

The last line of every step is the contract: re-run Preflight and confirm the rule reports no failing elements. That is what lets a builder verify its own work instead of guessing "looks good to me".

## 9. The loop closes by scanning again

A report is not the end of the process. The repair prompt is applied, the page is scanned again, and the new score and transcript are the evidence. The README reports a live product repaired from 49/100 F to 100/100 A this way, with every step verified by re-scanning the deployed URL.

That is the difference between a thermometer and a gate. A thermometer tells you the temperature. A gate tells you whether the thing can ship, and what to do before it does.

## What it deliberately does not do

It does not certify. Automated checks catch roughly a third of accessibility defects, and every report says so.

It does not crawl. One URL per scan, by design.

It does not fix your code. It measures, explains, and hands you the instruction. Editing the project is the builder's job.

It does not replace a person with a keyboard and a real screen reader. It narrows where that person should look.

## One engine, several surfaces

The same engine runs behind the CLI, the GitHub Action, the web report and the MCP server. The MCP tools are read-only by design, so a hosted builder can call them without an approval prompt. The score, the rule copy and the limits travel with every observation. A surface that recomputes the score is a bug, not a feature.

The point of the architecture is not elegance. It is that the thing you run locally and the thing a builder calls remotely cannot disagree about what the page says.
