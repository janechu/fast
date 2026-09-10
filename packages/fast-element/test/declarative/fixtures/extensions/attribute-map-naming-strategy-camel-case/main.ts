import { attr } from "@microsoft/fast-element/attr.js";
import { declarativeTemplate } from "@microsoft/fast-element/declarative.js";
import { FASTElement } from "@microsoft/fast-element/fast-element.js";
import { enableHydration } from "@microsoft/fast-element/hydration.js";
import { declarativeParts } from "@microsoft/fast-element/ponyfills/declarative-parts.js";
import { domScheduler } from "@microsoft/fast-element/ponyfills/dom-scheduler.js";
import { signals } from "@microsoft/fast-element/ponyfills/signals.js";

class TestCamelCase extends FASTElement {
    @attr({ attribute: "foo-bar" })
    fooBar: string = "";
}
TestCamelCase.define({
    name: "test-camel-case",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});

class TestCamelCaseMulti extends FASTElement {
    @attr({ attribute: "my-custom-prop" })
    myCustomProp: string = "";
}
TestCamelCaseMulti.define({
    name: "test-camel-case-multi",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});

class TestCamelCaseNoDash extends FASTElement {
    @attr
    label: string = "";
}
TestCamelCaseNoDash.define({
    name: "test-camel-case-no-dash",
    template: declarativeTemplate({
        ponyfills: [declarativeParts(), signals(), domScheduler()],
    }),
});

const hydration = enableHydration();
void hydration.whenHydrated().then(() => {
    (window as any).hydrationCompleted = true;
});
