import { declarativeTemplate } from "@microsoft/fast-element/declarative.js";
import {
    EventPart,
    PropertyPart,
    TokenListPart,
} from "@microsoft/fast-element/ponyfills/declarative-parts.js";
import {
    AttributePart,
    ChildNodePart,
    NodePart,
    PartBase,
    PartGroup,
} from "@microsoft/fast-element/ponyfills/dom-parts.js";
import { domScheduler } from "@microsoft/fast-element/ponyfills/dom-scheduler.js";
import { signals } from "@microsoft/fast-element/ponyfills/signals.js";

(window as any).ponyfillTestAPI = {
    AttributePart,
    ChildNodePart,
    EventPart,
    NodePart,
    PartBase,
    PartGroup,
    PropertyPart,
    TokenListPart,
    declarativeTemplate,
    domScheduler,
    signals,
};
