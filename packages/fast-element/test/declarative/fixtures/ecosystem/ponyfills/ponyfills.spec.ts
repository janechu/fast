import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
    await page.goto("/fixtures/ecosystem/ponyfills/");
    await page.waitForFunction(() => (window as any).ponyfillTestAPI !== undefined);
});

test("parts stage values until commit", async ({ page }) => {
    const result = await page.evaluate(() => {
        const { AttributePart, NodePart, PropertyPart, TokenListPart } = (
            window as any
        ).ponyfillTestAPI;
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

test("DOM scheduler drains remaining work before surfacing errors", async ({
    page,
}) => {
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

test("Signals clean up failed computed values and effects", async ({ page }) => {
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

        try {
            computed.get();
        } catch {}

        const computedValue = computed.get();
        let effectRuns = 0;

        try {
            signalAPI.effect(
                document.body,
                () => {
                    effectRuns++;
                    state.get();
                    throw new Error("expected effect failure");
                },
                scheduler,
            );
        } catch {}

        state.set(2);
        await scheduler.next();

        return { computedRuns, computedValue, effectRuns };
    });

    expect(result).toEqual({
        computedRuns: 2,
        computedValue: 1,
        effectRuns: 1,
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
