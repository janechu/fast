import { declarativeTemplate } from "@microsoft/fast-element/declarative.js";
import { enableHydration } from "@microsoft/fast-element/hydration.js";
import { declarativeParts } from "@microsoft/fast-element/ponyfills/declarative-parts.js";
import { domScheduler } from "@microsoft/fast-element/ponyfills/dom-scheduler.js";
import { signals } from "@microsoft/fast-element/ponyfills/signals.js";
import { signalDone } from "../../harness.js";
import { BenchElement } from "../element.js";

BenchElement.define({
    name: "attr-reflect-bench-element",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});

performance.mark("bench-start");

const hydration = enableHydration();
void hydration.whenHydrated().then(() => {
    performance.mark("bench-end");
    signalDone();
});
