import { attr } from "@microsoft/fast-element/attr.js";
import { declarativeTemplate } from "@microsoft/fast-element/declarative.js";
import { FASTElement } from "@microsoft/fast-element/fast-element.js";
import { observable } from "@microsoft/fast-element/observable.js";
import { declarativeParts } from "@microsoft/fast-element/ponyfills/declarative-parts.js";
import { domScheduler } from "@microsoft/fast-element/ponyfills/dom-scheduler.js";
import { signals } from "@microsoft/fast-element/ponyfills/signals.js";

class BasicElement extends FASTElement {
    @attr
    greeting: string = "Hello";
}

const basicDefinition = BasicElement.define({
    name: "basic-element",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});

class CounterElement extends FASTElement {
    @observable
    count: number = 0;

    increment() {
        this.count++;
    }
}

const counterDefinition = CounterElement.define({
    name: "counter-element",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});

void Promise.all([basicDefinition, counterDefinition]).then(() => {
    (window as any).allDefined = true;
});
