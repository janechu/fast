import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
    await page.goto("/fixtures/ecosystem/ponyfills/");
    await page.waitForFunction(() => (window as any).ponyfillTestAPI !== undefined);
});

test("parts stage values until commit", async ({ page }) => {
    const result = await page.evaluate(() => {
        const { AttributePart, NodePart, PropertyPart, TokenListPart } = (window as any)
            .ponyfillTestAPI;
        const text = document.createTextNode("before");
        const element = document.createElement("input");
        const nodePart = new NodePart(text);
        const attributePart = new AttributePart(element, "aria-label");
        const qualifiedAttributePart = new AttributePart(element, "xlink:href");
        const propertyPart = new PropertyPart(element, "value");
        const tokenListPart = new TokenListPart(element, "classList");

        nodePart.value = "after";
        attributePart.value = "label";
        qualifiedAttributePart.value = "#icon";
        propertyPart.value = "property";
        tokenListPart.value = "one two";

        const staged = {
            text: text.data,
            attribute: element.getAttribute("aria-label"),
            qualifiedAttribute: element.getAttribute("xlink:href"),
            property: element.value,
            tokens: element.className,
        };

        new (window as any).ponyfillTestAPI.PartGroup([
            nodePart,
            attributePart,
            qualifiedAttributePart,
            propertyPart,
            tokenListPart,
        ]).commit();

        return {
            staged,
            committed: {
                text: text.data,
                attribute: element.getAttribute("aria-label"),
                qualifiedAttribute: element.getAttribute("xlink:href"),
                property: element.value,
                tokens: element.className,
            },
        };
    });

    expect(result.staged).toEqual({
        text: "before",
        attribute: null,
        qualifiedAttribute: null,
        property: "",
        tokens: "",
    });
    expect(result.committed).toEqual({
        text: "after",
        attribute: "label",
        qualifiedAttribute: "#icon",
        property: "property",
        tokens: "one two",
    });
});

test("failed and recursive Part commits preserve the staged value", async ({ page }) => {
    const result = await page.evaluate(() => {
        const { PartBase } = (window as any).ponyfillTestAPI;

        class TestPart extends PartBase {
            public commits: string[] = [];

            protected commitValue(value: string): void {
                this.commits.push(value);

                if (value === "fail") {
                    throw new Error("expected commit failure");
                }

                if (value === "recurse") {
                    this.commit();
                }
            }
        }

        const part = new TestPart();
        part.value = "fail";
        let failedMessage = "";

        try {
            part.commit();
        } catch (error) {
            failedMessage = (error as Error).message;
        }

        const stagedAfterFailure = part.value;
        part.value = "success";
        part.commit();
        part.value = "recurse";
        let recursiveMessage = "";

        try {
            part.commit();
        } catch (error) {
            recursiveMessage = (error as Error).message;
        }

        return {
            commits: part.commits,
            failedMessage,
            recursiveMessage,
            stagedAfterFailure,
            stagedAfterReentrancy: part.value,
        };
    });

    expect(result).toEqual({
        commits: ["fail", "success", "recurse"],
        failedMessage: "expected commit failure",
        recursiveMessage: "Part commit is already in progress.",
        stagedAfterFailure: "fail",
        stagedAfterReentrancy: "recurse",
    });
});

test("ChildNodePart owns only its bounded sibling range", async ({ page }) => {
    const text = await page.evaluate(() => {
        const { ChildNodePart } = (window as any).ponyfillTestAPI;
        const parent = document.createElement("div");
        const start = document.createComment("start");
        const old = document.createTextNode("old");
        const end = document.createComment("end");
        parent.append(start, old, end, document.createTextNode("outside"));

        const part = new ChildNodePart(parent, start, end);
        part.value = ["new", document.createElement("span")];
        part.commit();

        return parent.textContent;
    });

    expect(text).toBe("newoutside");
});

test("ChildNodePart preserves its full-parent compatibility form", async ({ page }) => {
    const text = await page.evaluate(() => {
        const { ChildNodePart } = (window as any).ponyfillTestAPI;
        const parent = document.createElement("div");
        parent.textContent = "old";
        const part = new ChildNodePart(parent);
        part.value = "new";
        part.commit();
        return parent.textContent;
    });

    expect(text).toBe("new");
});

test("ChildNodePart validates replacement values before clearing its range", async ({
    page,
}) => {
    const result = await page.evaluate(() => {
        const { ChildNodePart } = (window as any).ponyfillTestAPI;
        const parent = document.createElement("div");
        const start = document.createComment("start");
        const old = document.createTextNode("old");
        const end = document.createComment("end");
        parent.append(start, old, end);
        const part = new ChildNodePart(parent, start, end);
        const value = {
            *[Symbol.iterator]() {
                yield "new";
                throw new Error("expected conversion failure");
            },
        };
        part.value = value;
        let message = "";

        try {
            part.commit();
        } catch (error) {
            message = (error as Error).message;
        }

        part.value = [end];
        let boundaryName = "";

        try {
            part.commit();
        } catch (error) {
            boundaryName = (error as DOMException).name;
        }

        part.value = [parent];
        let cycleName = "";

        try {
            part.commit();
        } catch (error) {
            cycleName = (error as DOMException).name;
        }

        return {
            boundaryName,
            cycleName,
            message,
            staged: part.value[0] === parent,
            text: parent.textContent,
        };
    });

    expect(result).toEqual({
        boundaryName: "HierarchyRequestError",
        cycleName: "HierarchyRequestError",
        message: "expected conversion failure",
        staged: true,
        text: "old",
    });
});

test("EventPart replaces and removes its listener", async ({ page }) => {
    const count = await page.evaluate(() => {
        const { EventPart } = (window as any).ponyfillTestAPI;
        const button = document.createElement("button");
        const part = new EventPart(button, "click");
        let count = 0;
        const first = () => (count += 1);
        const second = () => (count += 10);

        part.value = first;
        part.commit();
        button.click();
        part.value = second;
        part.commit();
        button.click();
        part.value = null;
        part.commit();
        button.click();
        return count;
    });

    expect(count).toBe(11);
});

test("EventPart snapshots options and supports once, abort, and disposal", async ({
    page,
}) => {
    const result = await page.evaluate(() => {
        const { EventPart } = (window as any).ponyfillTestAPI;
        const button = document.createElement("button");
        const mutableOptions = { capture: false };
        const stable = new EventPart(button, "click", mutableOptions);
        let stableCount = 0;
        stable.value = () => stableCount++;
        stable.commit();
        mutableOptions.capture = true;
        stable.dispose();
        button.click();
        const disposedValue = stable.value;
        stable.value = undefined;
        stable.commit();

        const once = new EventPart(button, "click", { once: true });
        let onceCount = 0;
        const onceListener = () => onceCount++;
        once.value = onceListener;
        once.commit();
        button.click();
        button.click();
        once.value = onceListener;
        once.commit();
        button.click();

        const controller = new AbortController();
        const aborted = new EventPart(button, "click", {
            signal: controller.signal,
        });
        aborted.value = () => void 0;
        aborted.commit();
        controller.abort();
        aborted.value = () => void 0;
        let abortName = "";

        try {
            aborted.commit();
        } catch (error) {
            abortName = (error as DOMException).name;
        }

        return {
            abortName,
            abortedValueType: typeof aborted.value,
            capture: stable.capture,
            disposedValue,
            once: once.once,
            onceCount,
            stableCount,
        };
    });

    expect(result).toEqual({
        abortName: "InvalidStateError",
        abortedValueType: "function",
        capture: false,
        disposedValue: null,
        once: true,
        onceCount: 2,
        stableCount: 0,
    });
});

test("TokenListPart preserves tokens it did not introduce", async ({ page }) => {
    const result = await page.evaluate(() => {
        const { TokenListPart } = (window as any).ponyfillTestAPI;
        const element = document.createElement("div");
        element.classList.add("external");
        const part = new TokenListPart(element, "classList");
        part.value = "external owned";
        part.commit();
        element.classList.remove("owned");
        part.value = "external owned";
        part.commit();
        const restored = element.classList.contains("owned");
        part.value = "";
        part.commit();
        return { className: element.className, restored };
    });

    expect(result).toEqual({
        className: "external",
        restored: true,
    });
});

test("PartGroup drains failures and rejects recursive commits", async ({ page }) => {
    const result = await page.evaluate(() => {
        const { PartBase, PartGroup } = (window as any).ponyfillTestAPI;
        const calls: string[] = [];

        class TestPart extends PartBase {
            public constructor(
                private readonly name: string,
                private readonly action?: () => void,
            ) {
                super();
            }

            protected commitValue(): void {
                calls.push(this.name);
                this.action?.();
            }
        }

        const bad = new TestPart("bad", () => {
            throw new Error("bad");
        });
        const good = new TestPart("good");
        bad.value = null;
        good.value = null;
        let errors: string[] = [];

        try {
            new PartGroup([bad, good]).commit();
        } catch (error) {
            errors = (error as AggregateError).errors.map(
                item => (item as Error).message,
            );
        }

        let group: InstanceType<typeof PartGroup>;
        const recursive = new TestPart("recursive", () => group.commit());
        recursive.value = null;
        group = new PartGroup([recursive]);
        let recursiveMessage = "";

        try {
            group.commit();
        } catch (error) {
            recursiveMessage = (error as AggregateError).errors[0].message;
        }

        return { calls, errors, recursiveMessage };
    });

    expect(result).toEqual({
        calls: ["bad", "good", "recursive"],
        errors: ["bad"],
        recursiveMessage: "Part group commit is already in progress.",
    });
});

test("DOM scheduler deduplicates and orders ancestors before descendants", async ({
    page,
}) => {
    const result = await page.evaluate(async () => {
        const { domScheduler } = (window as any).ponyfillTestAPI;
        const scheduler = domScheduler();
        const parent = document.createElement("div");
        const child = document.createElement("span");
        parent.append(child);
        document.body.append(parent);
        const calls: string[] = [];
        const childTask = { call: () => calls.push("child") };
        const cancelledTask = { call: () => calls.push("cancelled") };
        const parentTask = { call: () => calls.push("parent") };

        scheduler.enqueue(child, childTask);
        scheduler.enqueue(child, childTask);
        scheduler.enqueue(parent, parentTask);
        scheduler.enqueue(child, cancelledTask);
        scheduler.cancel(cancelledTask);
        await scheduler.next();
        return calls;
    });

    expect(result).toEqual(["parent", "child"]);
});

test("DOM scheduler deduplicates by target and callback", async ({ page }) => {
    const calls = await page.evaluate(() => {
        const { domScheduler } = (window as any).ponyfillTestAPI;
        const scheduler = domScheduler();
        const first = document.createElement("div");
        const second = document.createElement("div");
        document.body.append(first, second);
        const calls: string[] = [];
        const task = { call: () => calls.push("run") };
        scheduler.enqueue(first, task);
        scheduler.enqueue(second, task);
        scheduler.flush();
        return calls;
    });

    expect(calls).toEqual(["run", "run"]);
});

test("DOM scheduler reorders remaining work after topology changes", async ({ page }) => {
    const calls = await page.evaluate(() => {
        const { domScheduler } = (window as any).ponyfillTestAPI;
        const scheduler = domScheduler();
        const parent = document.createElement("div");
        const first = document.createElement("div");
        const second = document.createElement("div");
        parent.append(first, second);
        document.body.append(parent);
        const calls: string[] = [];

        scheduler.enqueue(first, () => calls.push("first"));
        scheduler.enqueue(second, () => calls.push("second"));
        scheduler.enqueue(parent, () => {
            calls.push("parent");
            parent.append(first);
        });
        scheduler.flush();
        return calls;
    });

    expect(calls).toEqual(["parent", "second", "first"]);
});

test("DOM scheduler drains remaining work before surfacing errors", async ({ page }) => {
    const result = await page.evaluate(() => {
        const { domScheduler } = (window as any).ponyfillTestAPI;
        const scheduler = domScheduler();
        const values: string[] = [];

        scheduler.enqueue(document.body, () => {
            values.push("bad");
            throw new Error("expected scheduler failure");
        });
        scheduler.enqueue(document.body, () => values.push("good"));

        let message = "";

        try {
            scheduler.flush();
        } catch (error) {
            message = (error as Error).message;
        }

        return { values, message };
    });

    expect(result).toEqual({
        values: ["bad", "good"],
        message: "expected scheduler failure",
    });
});

test("Signals state, computed values, and effects compose independently", async ({
    page,
}) => {
    const values = await page.evaluate(async () => {
        const { domScheduler, signals } = (window as any).ponyfillTestAPI;
        const scheduler = domScheduler();
        const signalAPI = signals();
        const state = signalAPI.state(1);
        const computed = signalAPI.computed(() => state.get() * 2);
        const values: number[] = [];
        const effect = signalAPI.effect(
            document.body,
            () => values.push(computed.get()),
            scheduler,
        );

        state.set(2);
        state.set(2);
        await scheduler.next();
        effect.dispose();
        state.set(3);
        await scheduler.next();
        return values;
    });

    expect(values).toEqual([2, 4]);
});

test("Signals cache computed errors and retain failed effect dependencies", async ({
    page,
}) => {
    const result = await page.evaluate(async () => {
        const { domScheduler, signals } = (window as any).ponyfillTestAPI;
        const scheduler = domScheduler();
        const signalAPI = signals();
        const state = signalAPI.state(1);
        let computedRuns = 0;
        const computed = signalAPI.computed(() => {
            state.get();
            computedRuns++;

            if (computedRuns === 1) {
                throw new Error("expected computed failure");
            }

            return state.get();
        });

        const computedErrors: string[] = [];

        for (let index = 0; index < 2; index++) {
            try {
                computed.get();
            } catch (error) {
                computedErrors.push((error as Error).message);
            }
        }

        state.set(2);
        const computedValue = computed.get();
        let effectRuns = 0;
        const effect = signalAPI.effect(
            document.body,
            () => {
                effectRuns++;
                state.get();

                if (effectRuns === 2) {
                    throw new Error("expected effect failure");
                }
            },
            scheduler,
        );

        state.set(3);

        try {
            scheduler.flush();
        } catch {}

        state.set(4);
        scheduler.flush();
        effect.dispose();

        return { computedErrors, computedRuns, computedValue, effectRuns };
    });

    expect(result).toEqual({
        computedErrors: ["expected computed failure", "expected computed failure"],
        computedRuns: 2,
        computedValue: 2,
        effectRuns: 3,
    });
});

test("declarativeTemplate rejects missing and duplicate required capabilities", async ({
    page,
}) => {
    const messages = await page.evaluate(() => {
        const { declarativeTemplate, domScheduler, signals } = (window as any)
            .ponyfillTestAPI;
        const capture = (callback: () => void) => {
            try {
                callback();
                return "";
            } catch (error) {
                return (error as Error).message;
            }
        };

        return [
            capture(() => declarativeTemplate({ ponyfills: [] })),
            capture(() =>
                declarativeTemplate({
                    ponyfills: [signals(), signals(), domScheduler()],
                }),
            ),
        ];
    });

    expect(messages[0]).toContain("Signals and DOM scheduler");
    expect(messages[1]).toContain("Only one signals");
});
