# Migrating to declarative ponyfill templating

This proof removes imperative template authoring from the public
`@microsoft/fast-element` surface.

## Replace tagged templates

- Move component templates from the `html` tagged template literal to authored
  `<f-template name="...">` markup.
- Remove imports from `html.js`, `render.js`, `repeat.js`, `when.js`,
  `children.js`, `ref.js`, and `slotted.js`.
- Define elements with `declarativeTemplate({ ponyfills })`.

```ts
import { declarativeTemplate } from "@microsoft/fast-element/declarative.js";
import { declarativeParts } from "@microsoft/fast-element/ponyfills/declarative-parts.js";
import { domScheduler } from "@microsoft/fast-element/ponyfills/dom-scheduler.js";
import { signals } from "@microsoft/fast-element/ponyfills/signals.js";

MyElement.define({
    name: "my-element",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});
```

## Select lower-level capabilities

Applications can replace `declarativeParts()` with individual DOM part and FAST
extension paths when they need a smaller or experimentally different runtime.
Writable signals, computed signals, effects, and the scheduler also have
independent export paths.
