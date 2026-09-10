import { attributeMap } from "@microsoft/fast-element/attribute-map.js";
import { declarativeTemplate } from "@microsoft/fast-element/declarative.js";
import { FASTElement } from "@microsoft/fast-element/fast-element.js";
import { declarativeParts } from "@microsoft/fast-element/ponyfills/declarative-parts.js";
import { domScheduler } from "@microsoft/fast-element/ponyfills/dom-scheduler.js";
import { signals } from "@microsoft/fast-element/ponyfills/signals.js";

class NamingStrategyTestElement extends FASTElement {}

NamingStrategyTestElement.define(
    {
        name: "naming-strategy-test",
        template: declarativeTemplate({
            ponyfills: [declarativeParts(), signals(), domScheduler()],
        }),
    },
    [
        attributeMap({
            "attribute-name-strategy": "camelCase",
        }),
    ],
);

class NamingStrategyNoDashTestElement extends FASTElement {}

NamingStrategyNoDashTestElement.define(
    {
        name: "naming-strategy-no-dash-test",
        template: declarativeTemplate({
            ponyfills: [declarativeParts(), signals(), domScheduler()],
        }),
    },
    [
        attributeMap({
            "attribute-name-strategy": "camelCase",
        }),
    ],
);
