---
title: "aria-orientation belongs to the role owner"
slug: "aria-orientation-role-owners"
date: "2026-08-24"
lang: "en"
kind: "note"
category: "accessibility"
summary: "A Combobox grid carried aria-orientation, an attribute the grid role does not support, so screen readers got contradictory navigation cues. Moving it to the elements that own the role fixed it."
tags: ["accessibility", "aria", "aria-orientation", "combobox", "open-source"]
repo: "mui/base-ui"
pr: 5551
source: "linkedin"
---

The hardest accessibility bug to spot is not the one that breaks the screen reader. It is the one that confuses it with invalid information.

A few days ago I merged a fix in MUI Base UI that illustrates the point: a misplaced `aria-orientation`.

## The problem

In a Combobox with a grid, the component emitted `aria-orientation="horizontal"` directly on the element with `role="grid"`. The problem: the `grid` role does not support `aria-orientation`. It is a valid attribute in HTML, but invalid for that ARIA role.

The result was not a crash or a visible error. It was something worse: screen readers received contradictory information about how to navigate the component, silently degrading the experience for assistive technology users.

## The fix

The fix moved `aria-orientation` to the elements that actually own the role, the ones that do support the attribute, and omitted it on `grid` and `presentation`. Seven files, 69 lines added, 4 removed, with regression tests to make sure keyboard navigation was preserved.

## Why it matters

Accessibility is not just adding an `aria-label`. It is understanding the ARIA contract: which attributes are valid for each role, and how screen readers interpret that information. An invalid attribute does not always break the app, but it always degrades someone's experience.

When accessibility is treated as an engineering discipline, with regression tests, role validation and peer review, subtle bugs like this one get caught before they reach production.

PR: https://github.com/mui/base-ui/pull/5551
