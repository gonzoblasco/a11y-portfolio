---
title: "When a HoverCard calls itself a dialog"
slug: "hovercard-dialog-semantics"
date: "2026-08-25"
lang: "en"
kind: "note"
summary: "A labelled HoverCard trigger described itself with aria-describedby, so screen reader users heard the dialog's contents as a description instead of learning that a dialog opens. The fix is the right popup contract."
tags: ["accessibility", "aria", "hovercard", "react", "open-source"]
repo: "facebook/astryx"
pr: 5419
source: "linkedin"
---

I just got a PR merged into astryx, Meta's React component library, that fixes a subtle accessibility bug in `HoverCard`.

The problem: when a HoverCard had a label, the trigger used `aria-describedby` to point at the dialog. That flattens structured content into a plain-text description, so a screen reader user on the trigger heard the dialog's contents read as a description instead of being told "this opens a dialog".

The fix uses the correct popup contract when a label is present:

- `aria-haspopup="dialog"` on the trigger
- `aria-controls` pointing at the layer id
- `aria-expanded` synced to the open state

I also exposed `id` and `isOpen` from `useHoverCard` so consumers can wire `aria-controls` / `aria-expanded` themselves, and kept `describedBy` as a deprecated alias for backwards compatibility.

One decision worth noting: I considered `aria-details`, but support across screen readers is still inconsistent. `aria-haspopup="dialog"` plus `aria-expanded` is the most broadly supported contract for a non-modal dialog opener.

38 tests passing. Typecheck and build green. The review process was solid: three inline comments, all addressed.

PR: https://github.com/facebook/astryx/pull/5419

I have a follow-up in review fixing the same class of dropped accessibility attributes in `List` and `TreeList`.
