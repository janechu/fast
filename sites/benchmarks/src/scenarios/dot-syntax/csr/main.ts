import { declarativeTemplate } from "@microsoft/fast-element/declarative.js";
import { observerMap } from "@microsoft/fast-element/observer-map.js";
import { declarativeParts } from "@microsoft/fast-element/ponyfills/declarative-parts.js";
import { domScheduler } from "@microsoft/fast-element/ponyfills/dom-scheduler.js";
import { signals } from "@microsoft/fast-element/ponyfills/signals.js";
import { runBenchmark } from "../../harness.js";
import { BenchElement } from "../element.js";

BenchElement.define(
    {
        name: "dot-syntax-bench-element",
        template: declarativeTemplate({
            ponyfills: [declarativeParts(), signals(), domScheduler()],
        }),
    },
    [observerMap()],
);

await customElements.whenDefined("dot-syntax-bench-element");

runBenchmark(() => document.createElement("dot-syntax-bench-element"));
