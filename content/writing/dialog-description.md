---
title: "The dialog description that never arrived"
slug: "dialog-description"
date: "2026-10-22"
lang: "en"
kind: "note"
category: "accessibility"
summary: "Carbon's ComposedModal forwarded only aria-labelledby, so screen reader users got a title and nothing about what the modal was for. The PR adds aria-describedby, and review caught a test that proved nothing."
tags: ["accessibility", "aria", "dialog", "carbon", "open-source"]
repo: "carbon-design-system/carbon"
pr: 22887
source: "linkedin"
source_url: "https://www.linkedin.com/posts/gonzalo-blasco_accessibility-a11y-carbon-share-7519182890929160192-QjBO/"
---

I just merged a PR into Carbon Design System that adds native support for the `aria-describedby` prop on the `ComposedModal` component. The change closes #21342, a known accessibility gap where screen reader users could not programmatically associate a description with a modal dialog.

What was missing? The modal only forwarded `aria-labelledby`. Without `aria-describedby`, developers could not give the dialog a concise, contextual description, and assistive technology users got the title with nothing about what the modal was for.

How we fixed it: a new optional `aria-describedby` prop, wired through so that when the `enable-dialog-element` feature flag is on the attribute lands on the native `<dialog>` element, and otherwise falls back to the `div[role="dialog"]` container.

The review process was the interesting part. The maintainer pushed back on three things, and the first one is the one I keep coming back to: my first test referenced a `description-modal-id` element without rendering it, so it asserted the attribute was present on the dialog but proved nothing about whether the description actually existed in the page. The fix was to render the element alongside the modal. The other two were about not leaking implementation details: a reference to the internal `cds--modal-container` class in a comment, and documenting the new prop properly instead of leaving it implicit.

And then the maintainer asked whether the review comments had actually been addressed, when some of them had not. That was worth hearing.

The PR landed with a test that renders the description element and asserts the attribute reaches the native `<dialog>` when the flag is on, plus the `div[role="dialog"]` fallback.

If your dialog has a title but no description, that is a gap your users cannot see either.

PR: https://github.com/carbon-design-system/carbon/pull/22887
