---
title: "aria-orientation belongs to the role owner"
slug: "aria-orientation-role-owners"
date: "2026-08-24"
lang: "en"
kind: "note"
category: "accessibility"
summary: "A Combobox with grid rendered aria-orientation on role=grid, which does not support it. The attribute moved to the components that assign the role; the keyboard hook kept only the behavior."
tags: ["accessibility", "aria", "aria-orientation", "combobox", "open-source"]
repo: "mui/base-ui"
pr: 5551
source: "linkedin"
---

A missing attribute is easy to catch. Nothing renders, a test fails, someone fills the hole. The expensive bug is the attribute that renders in the wrong place, where it is valid HTML, valid TypeScript, and still a contradiction.

In August I merged mui/base-ui #5551 for one of those. A Combobox with `grid` enabled rendered this:

```html
<div role="grid" aria-orientation="horizontal">
```

Both halves are legal on their own. Together they describe two different widgets.

The reproduction was the official emoji picker in the Autocomplete grid example: open the list, inspect the element, find `role="grid"` and `aria-orientation="horizontal"` on the same node, run axe. Nothing looked broken. The picker opened, the arrows moved, the emoji inserted.

## Two instructions at once

`role="grid"` is a two-dimensional structure. It has rows and columns, and arrow keys move through both axes. `aria-orientation="horizontal"` says the widget runs along a single line. A person navigating with a screen reader hears position by row and column, then gets an attribute claiming the thing is a strip.

That is the difference between a bug that removes information and one that adds noise. A missing label leaves a silence you can notice. A contradiction leaves a sentence that sounds complete and is wrong, and the person on the other end has no way to tell which half to trust.

The spec resolves the conflict by dropping the attribute. WAI-ARIA 1.2 requires user agents to ignore non-global properties on roles that do not support them, so `grid` never receives `aria-orientation`. That is not a repair. The component published an intent it could not express, the intent vanished at the accessibility tree, and the keyboard kept working because the keyboard logic never read the attribute in the first place.

Axe found it as an `aria-allowed-attr` violation, reported against the official Autocomplete grid example on v1.7.0, with axe-core 4.10.2. A tool caught it. The component's own suite did not, because no test asked which element carried the role.

## Why the type said yes

`aria-orientation` is a valid prop on any React element. TypeScript checks the name and the value, `"horizontal" | "vertical" | undefined`. It cannot check the role of the node the prop reaches, because at the point of the check there is no node.

The attribute was assembled inside `useListNavigation`, returned in a props object, and spread later onto whichever element ended up with the role. In the source, the attribute and the role never meet. They only meet in the DOM, and only a tool that inspects the rendered tree sees them together.

The type was doing its job. It was checking the wrong contract.

## One variable, two jobs

The root cause was a coupling. `AriaCombobox` passed `orientation: grid ? 'horizontal' : undefined` into `useListNavigation`, and the hook exposed any orientation other than `'both'` as `aria-orientation`. The hook genuinely needed `horizontal`: it drives ArrowLeft and ArrowRight inside a grid. It then treated that keyboard requirement as a reason to publish ARIA.

That is the wrong owner. A navigation hook knows how keys should move. It does not know what role its consumer will render, and it should not guess.

Three public components sit on that hook. The Combobox, the Menu and the Select each pass an orientation and each render a different role. One emission, three roles, and only one of them rejects the attribute outright. The other two accept it and do not need it.

So the fix took the emission out of the hook, two deleted lines, and moved the attribute to the components that assign the final role. `MenuRoot` renders `aria-orientation="horizontal"` only when the menu is horizontal, because `menu` is implicitly vertical. `SelectPopup` dropped a dead `'aria-orientation': undefined` from its presentation branch. Grid and listbox get nothing: a grid is two-dimensional, a listbox is implicitly vertical, and saying either out loud adds nothing.

Seven files, 69 lines added, 4 removed. Three of those additions are production code. The other 66 are tests: the Combobox grid and listbox, the generic hook, a horizontal and a vertical menu, a select listbox.

The ratio is the honest one. The change is small and the proof is not.

The tests query by role, `getByRole('grid')` and `getByRole('listbox')`, then assert the attribute is absent. Not by container, not by test id. That is the check that was missing: an assertion about the node a screen reader will actually read, in place of an assertion about the node the props happened to reach.

## The third time

The issue pointed at two earlier fixes of the same shape: #4355 for Navigation Menu, #4628 for Toggle Group. Same invalid attribute, different component, same hook underneath.

That is the part I kept returning to. Each fix was correct where it landed, and the generator stayed. As long as the shared hook emitted the attribute, every new consumer inherited the bug, and every reviewer had to notice it again on a different component. A patch per component is a tax paid forever.

What would have prevented the third one is a convention, not a fix: ARIA that depends on a role belongs to the component that assigns the role. Hooks return behavior. Components publish semantics. Once that line is drawn, the question "does this role support this attribute" has an obvious place to be answered.

## The rule

An attribute is not valid in the abstract. It is valid for a role, on an element. When the thing that decides the role is not the thing that decides the attribute, the contract has no owner, and no type will tell you.

Read the attribute from the element that carries the role, not from the props object that produced it.
