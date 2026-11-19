---
title: "When a HoverCard calls itself a dialog"
slug: "hovercard-dialog-semantics"
date: "2026-08-25"
lang: "en"
kind: "note"
category: "accessibility"
summary: "A labelled HoverCard trigger described itself with aria-describedby, so screen reader users heard the card's contents as a description instead of learning that a dialog opens. The fix is the popup contract, with two review catches along the way."
tags: ["accessibility", "aria", "hovercard", "react", "open-source"]
repo: "facebook/astryx"
pr: 5419
source: "linkedin"
---

A HoverCard with a label was a dialog that never said so. The trigger pointed at it with `aria-describedby`, so the first thing a screen reader user heard about the card was its contents, flattened into a description of the button.

The report was issue 5049, and the fix is PR 5419, merged in August. One component, four files. The interesting part is not the list of attributes. It is the difference between describing a thing and opening one.

## The trigger that described the card

The reproduction in the issue is short:

```tsx
<HoverCard
  label="Profile actions"
  content={<Button onClick={handleFollow}>Follow</Button>}>
  <button type="button">Jane Doe</button>
</HoverCard>
```

Focus the trigger, "Jane Doe". The card renders `role="dialog"` with `aria-label="Profile actions"`. The trigger carries `aria-describedby` pointing at that layer.

So the screen reader reads the button's name, then reads the dialog's content as its description. Structure collapses into a string. What the person does not hear is that a dialog opens.

Two costs follow. The user cannot tell there is anything to open, because a description does not invite interaction. And the content they did hear arrives before they asked for it, with no region to navigate, no boundary, no way to move inside it. The card can contain a button, links, anything focusable. A non-modal dialog is the right model for that. A description is the model for one supplementary sentence.

The lazy context layer work made it worse. While the card is closed, the layer is not in the DOM at all, only an inert `<template>` marker carrying the id. The trigger's `aria-describedby` pointed there too. Closed, the trigger referenced an empty sentinel. Open, the same attribute pointed at a dialog with focusable content. One attribute, two meanings, and neither of them "a popup opens here".

## Why nothing caught it

Every check passed. The attribute is valid, the id resolves, the props type accepts the value, React renders what the component asked for.

The automated accessibility audit on the pull request reported no violations. That is the gap worth naming. Audits check that relationships exist and attributes are allowed in a role. A trigger correctly described by a dialog breaks no rule. It is a wrong model written in legal ARIA.

A diff review does not catch it either unless the reviewer holds the screen reader model in their head. The new markup looks more complete than the old one: there is a describedby, a role, a label. Complete and wrong are compatible. That is why the fix needed an argument about semantics, not a lint rule.

## The contract

Two relationships, two jobs.

`aria-describedby` says: here is more text about this control. It is a string, flattened, read in place, before the person decides to go anywhere.

`aria-haspopup="dialog"` says: this control opens a dialog. `aria-expanded` says whether it is open now. `aria-controls` points at the element being controlled, and only while that element exists.

The fix applies the second contract when there is a label:

- `aria-haspopup="dialog"` on the trigger
- `aria-expanded` synced to the open state
- `aria-controls` set to the layer id only while the card is open, cleared or restored when it closes

That last condition came from matching what `DateInput` already does in the same library. An `aria-controls` that names an id missing from the DOM is a reference to nothing. Nothing crashes, no audit flags it, and assistive technology gets an unreliable map of the page.

I also exposed `id` and `isOpen` from `useHoverCard`, so a consumer driving the hook directly can wire the same contract, and kept `describedBy` as a deprecated alias of `id` so existing call sites keep working.

Then the case the fix does not cover. With no label, the card renders `role="group"` and the trigger keeps `aria-describedby`. `aria-haspopup="dialog"` over an unnamed group would promise a dialog and deliver something else. The naming decision for unlabelled rich cards is still open in 5049. I left it there rather than guess a default.

`aria-details` was the other candidate and I did not use it. Screen reader support is still uneven, and the attribute is built for pointing at a larger body of content, not at an interactive surface that opens and closes. `aria-haspopup` plus `aria-expanded` is the contract more assistive technology actually implements for a non-modal dialog opener.

## The review, and the third bug

cixzhang's first review requested changes, and both objections were correct.

The hook example in the docs put `aria-haspopup="dialog"` on a trigger whose card had no label. In Chrome the button announced "has dialog popup" and then opened an unnamed group. My own change had produced the exact mismatch I was fixing, inside the code I wrote to demonstrate it. Passing `label: 'Alex Morgan'` in the example closed that hole.

The second was worse. On the labelled path I wrote the trigger's `aria-haspopup`, `aria-controls` and `aria-expanded`, then removed them on cleanup. Wrap a menu button in a labelled HoverCard and its menu semantics disappear, silently, with nothing left to say they were there. Fifteen lines below, the no-label branch merged with existing values and restored them. One branch had the right pattern and I did not carry it across.

The rewrite reads the trigger's existing attributes, merges `aria-controls` with the layer id, and restores all three on cleanup. I added a test that wraps a menu button, with its own popup attributes, inside a labelled HoverCard.

There was a third problem I found while fixing those two. `aria-controls` pointed at the layer id even when the layer was not in the DOM. I gated it on the open state, the way `DateInput` does.

The final diff is 168 additions and 10 deletions across four files, with 38 tests in `HoverCard.test.tsx`, typecheck and build passing. The reviewer verified in Chrome that a menu trigger keeps its own semantics and gets them back after cleanup, then merged.

## The rule

A control that opens something has to say that before it says what is inside.

Describing and opening are different promises and one attribute cannot carry both. If the thing on the other side is a navigable region, the trigger owes the user a relationship and a state, not a paragraph of somebody else's content read out of turn.

And when two branches of the same effect touch the same attributes, both merge and restore. One branch that overwrites is enough to make the component own semantics it did not create.

The follow-up went after a different version of the same problem in `List` and `TreeList`: attributes that never reached the DOM at all.
