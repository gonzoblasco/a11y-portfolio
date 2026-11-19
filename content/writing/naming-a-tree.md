---
title: "Naming a tree"
slug: "naming-a-tree"
date: "2026-08-26"
lang: "en"
kind: "note"
summary: "TreeList dropped every rest prop, so a headerless tree could not be named at all. Naming it correctly came down to three decisions and three review rounds that each caught a real gap."
tags: ["accessibility", "aria", "treelist", "accessible-name", "open-source"]
repo: "facebook/astryx"
pr: 5493
source: "linkedin"
---

A follow-up I had in review, fixing the same class of dropped accessibility attributes in `List` and `TreeList`, just landed in astryx.

The bug: `TreeList` destructured a fixed set of props with no rest spread, so every `BaseProps` attribute (`aria-*`, `role`, `tabIndex`, `id`, event handlers) was silently dropped before reaching the DOM. A tree without a visible header could not be named at all: a screen reader announced an unnamed tree, and nothing said which tree it was.

The fix was more than "add `...restProps`". Three decisions shaped it:

1. `aria-label` and `aria-labelledby` land on the `<ul role="tree">` itself, not the wrapping `<div>`. A tree is named where the tree role is, not on a layout node that does nothing semantically.
2. A visible header keeps naming the tree. When `header` is rendered, the generated header id wins over any caller `aria-labelledby`, so assistive tech hears the same name the user sees. A caller label only applies on the headerless path.
3. The contract `role="tree"` is written after the rest spread. A consumer passing `role="listbox"` can no longer clobber the semantic role that makes the tree a tree.

The review process was the sharpest part: three rounds, and each one caught a real gap. First the wrong target element, then the precedence rule I had gotten backwards. Getting an accessible name right is genuinely harder than it looks, because it is about who you label and when the visible label should win.

Five regression tests, 81 passing. And the `List` half is handled separately by the maintainers, no duplicated work.

PR: https://github.com/facebook/astryx/pull/5493
