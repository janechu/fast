import { attr } from "@microsoft/fast-element/attr.js";
import { declarativeTemplate } from "@microsoft/fast-element/declarative.js";
import { FASTElement } from "@microsoft/fast-element/fast-element.js";
import { enableHydration } from "@microsoft/fast-element/hydration.js";
import { observable } from "@microsoft/fast-element/observable.js";
import { declarativeParts } from "@microsoft/fast-element/ponyfills/declarative-parts.js";
import { domScheduler } from "@microsoft/fast-element/ponyfills/dom-scheduler.js";
import { signals } from "@microsoft/fast-element/ponyfills/signals.js";

class TestElement extends FASTElement {
    @attr
    type: string = "radio";
}
TestElement.define({
    name: "test-element",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});

class TestElementProperty extends FASTElement {
    @observable
    isEnabled: boolean = false;
}
TestElementProperty.define({
    name: "test-element-property",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});

class TestElementExpression extends FASTElement {
    @attr({ attribute: "active-group" })
    activeGroup: string = "";

    @attr({ attribute: "current-group" })
    currentGroup: string = "";
}
TestElementExpression.define({
    name: "test-element-expression",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});

class TestElementNamespacedAttribute extends FASTElement {
    @attr
    href: string = "#icon";
}
TestElementNamespacedAttribute.define({
    name: "test-element-namespaced-attribute",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});

const hydration = enableHydration();
void hydration.whenHydrated().then(() => {
    (window as any).hydrationCompleted = true;
});
