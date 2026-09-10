import { attr } from "@microsoft/fast-element/attr.js";
import { declarativeTemplate } from "@microsoft/fast-element/declarative.js";
import { FASTElement } from "@microsoft/fast-element/fast-element.js";
import { observerMap } from "@microsoft/fast-element/observer-map.js";
import { declarativeParts } from "@microsoft/fast-element/ponyfills/declarative-parts.js";
import { domScheduler } from "@microsoft/fast-element/ponyfills/dom-scheduler.js";
import { signals } from "@microsoft/fast-element/ponyfills/signals.js";

export class ChatCard extends FASTElement {
    @attr
    public heading?: string;
}

ChatCard.define(
    {
        name: "chat-card",
        template: declarativeTemplate({
            ponyfills: [declarativeParts(), signals(), domScheduler()],
        }),
    },
    [observerMap()],
);
