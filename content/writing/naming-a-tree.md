---
title: "Naming a tree"
slug: "naming-a-tree"
date: "2026-08-26"
lang: "en"
kind: "note"
category: "accessibility"
summary: "TreeList accepted every BaseProps attribute and dropped it before the DOM, so a headerless tree could not be named. The fix was three precedence rules and a test that asserted on the element carrying the role."
tags: ["accessibility", "aria", "treelist", "accessible-name", "open-source"]
repo: "facebook/astryx"
pr: 5493
source: "linkedin"
---

A tree without a name is not a tree to a screen reader. It is a shape that opens and closes and never says what it contains.

Last August I merged a fix in Astryx for exactly that. The report looked small: `TreeList` accepted the same `BaseProps` as every other component in the library, TypeScript checked the prop, and the tree was still unnamed. The component destructured a fixed set of props with no rest spread, so `aria-*`, `role`, `tabIndex`, `id` and event handlers were dropped before the DOM. The pull request has the shortest reproduction I know:

```tsx
render(<TreeList items={items} aria-label="File tree" />);

// <div class="astryx-tree-list ...">
//   <ul role="tree">
// aria-label -> null
```

The accessibility cost is the sharp one. A tree is named where the tree role is. When the component had a visible `header`, it generated an id and wired `aria-labelledby` to it. When it did not, there was no naming path. A screen reader announced "tree" and nothing else. In a file explorer with two trees, a blind user cannot tell which one they are in, and the only way to find out is to open one and listen to what falls out.

The type was the contract, and the type was lying.

## Why nothing caught it

TypeScript accepted the prop because `TreeListProps` extends `BaseProps`. The header of that type says it keeps `aria-*`, `role`, `tabIndex`, `id` and event handlers. Nothing warned at runtime: React does not know that `aria-label` disappeared between the props object and the `<ul>`.

The accessibility audit on the pull request itself reported no violations. The tree was still unnamed. An unnamed `tree` is not a missing required attribute; it is a valid tree that happens to be unusable. That is the gap. A linter can tell you whether a role allows an attribute. It cannot tell you whether the thing has a name a person can use.

The first test I wrote made the same mistake. It asserted on `container.firstElementChild`, the layout `<div>` that received the spread. The test went green. The `<ul role="tree">` still had nothing.

## The first review

cixzhang's first review was precise: "The tree still can't be named." `aria-label` landed on the wrapper div, not on the `<ul>` that carries `role="tree"`. The screenshot of Chromium's accessibility tree showed the tree with an empty name. My test was asserting on the div I had changed, not on the element that carries the role.

There was a second problem in the same review. I had spread `...restProps` after `role="tree"`, so a consumer could pass `role="listbox"` and displace the contract. The role that makes a tree a tree was optional by accident. The convention in the repo is the opposite: contract props go after the spread, so the component wins. `ListItem` and `Kbd`, in the same directory, already spread their rest props. `TreeList` and `List` were the exceptions, and the issue listed ten more components with the same shape. One omission copied.

I had it backwards in two places at once: the spread order and the test target.

## The second review

The next version pulled `aria-label` and `aria-labelledby` out of the rest and put them on the `<ul role="tree">`. It also wrote `role="tree"` after the spread. The tree could be named. The role was stable.

Then cixzhang asked for one more thing: when `TreeList` renders a visible `header`, the generated header id should keep naming the tree. My version let a caller `aria-labelledby` replace it, so assistive technology could hear a different name than the one on screen. That is a quiet failure. The visible label and the announced label diverge, and the person reading the screen and the person listening to it are no longer in the same document.

The fix was a precedence rule: if a visible header exists, its id wins; a caller label only applies on the headerless path. I added tests for both paths and asserted on `getByRole('tree')`, not on the wrapper. The List half was left to the maintainers so the same work was not done twice.

What the fix did not do is invent a default name. "Tree" is not a name; it is the role said twice. The component cannot know what the tree contains. It had to expose the name the caller already had, and then get out of the way.

## The rule

Name the element that carries the role. Test the element that carries the role. A wrapper is not the thing.

A visible label outranks a programmatic one, because the two have to describe the same object. And a contract prop belongs after the spread: the component owns the semantics that make it what it is.

The lesson of the ten other components is not that ten components are broken. It is that a missing convention propagates: one omission gets copied, and every copy looks correct in review because the type says it is. The fix is not a patch per component. It is the house pattern, written down and tested where the role lives.

Five regression tests, and the tree has a name now. That is the whole product.
