import { enableDebug } from "@microsoft/fast-element/debug.js";
import { declarativeTemplate } from "@microsoft/fast-element/declarative.js";
import { FASTElement } from "@microsoft/fast-element/fast-element.js";
import { declarativeParts } from "@microsoft/fast-element/ponyfills/declarative-parts.js";
import { domScheduler } from "@microsoft/fast-element/ponyfills/dom-scheduler.js";
import { signals } from "@microsoft/fast-element/ponyfills/signals.js";

enableDebug();

class TestElementNoTemplate extends FASTElement {}
TestElementNoTemplate.define({
    name: "test-element-no-template",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});

class TestElementMultipleTemplates extends FASTElement {}
TestElementMultipleTemplates.define({
    name: "test-element-multiple-templates",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});
