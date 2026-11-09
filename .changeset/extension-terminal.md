---
"hunkdiff": minor
---

Extension commands can now hand the terminal to a program with `ctx.terminal.runSuspended(command)`: Hunk suspends its interface, runs the program in the same pane and redraws when it exits, as open-in-editor does. Extension API 34 adds `ctx.terminal`; TypeScript authors constructing `ExtensionCommandContext` must add the field.
