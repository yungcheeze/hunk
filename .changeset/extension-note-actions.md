---
"hunkdiff": minor
---

Extension commands can now show a checkbox in the Extensions menu with `checked: () => boolean`, and can appear on the active note's action row beside reply, edit and delete with `noteAction: "<label>"`. Extension API 33 adds `ctx.selection.activeNoteId`, the saved note those actions address; TypeScript authors constructing `ExtensionReviewSelection` must add the field.
