---
title: "The dialog description that never arrived"
slug: "dialog-description"
date: "2026-10-22"
lang: "en"
kind: "note"
category: "accessibility"
summary: "Carbon's ComposedModal forwarded a title but no description, so screen readers announced a dialog with no clear purpose. The PR added aria-describedby, and review caught a test that proved only the attribute."
tags: ["accessibility", "aria", "dialog", "carbon", "open-source"]
repo: "carbon-design-system/carbon"
pr: 22887
source: "linkedin"
source_url: "https://www.linkedin.com/posts/gonzalo-blasco_accessibility-a11y-carbon-share-7519182890929160192-QjBO/"
---

A dialog opens and the screen reader says its title. Then nothing.

No sentence about what the dialog wants, what happens if the user continues, or what they are agreeing to. Just a name, and a decision to make without context.

## A name is not a description

A label answers which thing this is. A description answers why it is here and what it will do. In ARIA they are two attributes with two jobs: `aria-labelledby` points at the title, `aria-describedby` points at the sentence that follows it.

Most dialogs in a design system get the first and skip the second. The title is visible, so someone wires it up. The body text is visible too, but nobody connects it to the dialog element, so it stays text on a screen.

A sighted user reads it in passing. A screen reader user hears the name and then goes hunting through the dialog for the rest.

That hunt is the bug. It is not a missing attribute in a validator's sense. It is a dialog that names itself and explains nothing.

The description was sitting in the dialog the whole time. The problem was never absence. It was attachment: the sentence existed on screen and was not part of the thing that receives focus.

## The escape hatch was closed too

Carbon's `ComposedModal` carried that gap for months. Issue #21342, opened in January 2026 against `@carbon/react` 1.93.0, described it without drama: the component supported `aria-label` and `aria-labelledby`, and not `aria-describedby`.

The usual workaround for a missing prop is to pass the attribute anyway and let the rest spread carry it. That door was shut. `ComposedModal` spread its remaining props onto the outer wrapper, not onto the element carrying `role="dialog"`. The attribute would land on a `div` that no assistive technology treats as the dialog.

The reporter also named the inconsistency. The plain `Modal` already handled this through its `alert` prop, wiring `aria-describedby` to the modal body. The composed variant, the one with a header, a body and a footer, had no equivalent. A confirmation dialog built out of it could be perfect in every other respect and still say only its title.

So I opened a pull request with an optional prop, forwarded to both render paths: the native `<dialog>` element when `enable-dialog-element` is on, and `div[role="dialog"]` when it is not.

## The test that proved forwarding

The first review asked for a test. Fair. The change added a code path and shipped no coverage for it.

I added two. One covered the fallback `div[role="dialog"]`, following the pattern of the existing `aria-label` tests. One covered the native dialog behind the feature flag. Both ran across the three `ComposedModal` variants in the suite.

I reported 118 tests green.

Then adamalston read the test instead of the badge.

The test referenced `description-modal-id` without rendering that element. It checked that the attribute arrived on the dialog. It never checked that anything on the page was being described.

That is the original bug, restated one layer down. `aria-describedby` is an id reference, and nothing validates the target. A dialog can point at an element that was never rendered and the DOM will accept it without complaint. The test asserted the part that already worked and never touched the part that mattered.

A green check told me the attribute was forwarded. It could not tell me the dialog had a description. Those are different claims and I had been treating them as the same one.

## The branch I broke

While applying that feedback, I force pushed a broken state. The test file ended up with corrupted JSX, and the changes I described in a comment were not actually in the branch. adamalston noticed before I did: "Uh? Did you review your changes before requesting another review?"

He was right, and the answer was no. I had described the fix from memory of the diff, not from the file.

I rebuilt the branch, rendered the description element next to the modal, and let the test ask for the accessible description instead of an attribute. The `ComposedModal` suite passed at 142 tests.

The same review had two smaller points. The JSDoc mentioned `cds--modal-container`, an internal class name, and read as if the prop only applied to the `div` path. It now says "Specify the accessible description for the modal." On the final pass he caught a `propTypes` comment that did not match the interface, marked resolved without being addressed.

The merged change is 63 added lines and one removed across three files. The prop stays optional and does the only thing it can:

```jsx
<ComposedModal aria-describedby="delete-note">
  ...
  <p id="delete-note">This removes the workspace. It cannot be undone.</p>
</ComposedModal>
```

The component does not invent a description. It cannot know what the modal is for. It just stops dropping the sentence the caller already wrote.

## The rule

Render both ends of a relationship before you assert it. A test for an id reference that never renders the target is a test of the plumbing, and plumbing that ends in a wall looks identical from the valve.

And a name is not a description. One says what opened. The other says what it will do. A dialog with a title and no description is a sentence missing its verb: the user hears the subject and has to guess the rest.
