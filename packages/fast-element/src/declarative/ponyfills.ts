import type { Binding } from "../binding/binding.js";
import type { DOMPolicy } from "../dom-policy.js";
import type { Callable } from "../interfaces.js";
import type { Expression } from "../observation/observable.js";
import type { Part } from "../ponyfills/part.js";

/**
 * Schedules a binding effect relative to its target node.
 * @public
 */
export interface DeclarativeDOMSchedulerPonyfill {
    readonly kind: "dom-scheduler";
    enqueue(target: Node, task: Callable): void;
    cancel(task: Callable): void;
    flush(): void;
    next(): Promise<void>;
}

/**
 * Creates reactive bindings for declarative expressions.
 * @public
 */
export interface DeclarativeSignalsPonyfill {
    readonly kind: "signals";
    state<T>(value: T): DeclarativeStateSignal<T>;
    computed<T>(compute: () => T): DeclarativeSignal<T>;
    effect(
        target: Node,
        callback: () => void,
        scheduler: DeclarativeDOMSchedulerPonyfill,
    ): DeclarativeSignalEffect;
    binding<TSource = any, TReturn = any, TParent = any>(
        expression: Expression<TSource, TReturn, TParent>,
        scheduler: DeclarativeDOMSchedulerPonyfill,
        policy?: DOMPolicy,
        isVolatile?: boolean,
    ): Binding<TSource, TReturn, TParent>;
}

/**
 * A read-only reactive value.
 * @public
 */
export interface DeclarativeSignal<T> {
    get(): T;
}

/**
 * A writable reactive value.
 * @public
 */
export interface DeclarativeStateSignal<T> extends DeclarativeSignal<T> {
    set(value: T): void;
}

/**
 * A disposable reactive effect.
 * @public
 */
export interface DeclarativeSignalEffect {
    dispose(): void;
}

/**
 * Creates parts that update a single DOM node.
 * @public
 */
export interface DeclarativeNodePartPonyfill {
    readonly kind: "node-part";
    create(node: Node): Part;
}

/**
 * Creates parts that update an element attribute.
 * @public
 */
export interface DeclarativeAttributePartPonyfill {
    readonly kind: "attribute-part";
    create(
        element: Element,
        qualifiedName: string,
        namespace?: string | null,
        booleanMode?: boolean,
    ): Part;
}

/**
 * Creates parts that own a mutable child-node range.
 * @public
 */
export interface DeclarativeChildNodePartPonyfill {
    readonly kind: "child-node-part";
    create(
        parentNode: Node,
        previousSibling?: Node | null,
        nextSibling?: Node | null,
    ): Part;
}

/**
 * Creates FAST's property-target extension to DOM Parts.
 * @public
 */
export interface DeclarativePropertyPartPonyfill {
    readonly kind: "property-part";
    create(node: Node, propertyName: string): Part;
}

/**
 * Creates FAST's event-target extension to DOM Parts.
 * @public
 */
export interface DeclarativeEventPartPonyfill {
    readonly kind: "event-part";
    create(
        element: Element,
        eventType: string,
        options?: AddEventListenerOptions | boolean,
    ): Part;
}

/**
 * Creates FAST's token-list extension to DOM Parts.
 * @public
 */
export interface DeclarativeTokenListPartPonyfill {
    readonly kind: "token-list-part";
    create(element: Element, propertyName: string): Part;
}

/**
 * Creates FAST's view-composition extension to DOM Parts.
 * @public
 */
export interface DeclarativeViewPartPonyfill {
    readonly kind: "view-part";
    create(target: Node, controller: any, targetNodeId: string): Part;
}

/**
 * Groups independently importable ponyfills without adding another runtime layer.
 * @public
 */
export interface DeclarativePonyfillGroup {
    readonly kind: "ponyfill-group";
    readonly ponyfills: readonly DeclarativePonyfill[];
}

/**
 * A low-level capability accepted by {@link declarativeTemplate}.
 * @public
 */
export type DeclarativePonyfill =
    | DeclarativeDOMSchedulerPonyfill
    | DeclarativeSignalsPonyfill
    | DeclarativeNodePartPonyfill
    | DeclarativeAttributePartPonyfill
    | DeclarativeChildNodePartPonyfill
    | DeclarativePropertyPartPonyfill
    | DeclarativeEventPartPonyfill
    | DeclarativeTokenListPartPonyfill
    | DeclarativeViewPartPonyfill
    | DeclarativePonyfillGroup;

/**
 * Options for configuring declarative template platform ponyfills.
 * @public
 */
export interface DeclarativeTemplateOptions {
    ponyfills: readonly DeclarativePonyfill[];
}

/**
 * The validated capabilities used by a declarative template.
 * @public
 */
export interface DeclarativePonyfillRuntime {
    readonly scheduler: DeclarativeDOMSchedulerPonyfill;
    readonly signals: DeclarativeSignalsPonyfill;
    readonly nodePart?: DeclarativeNodePartPonyfill;
    readonly attributePart?: DeclarativeAttributePartPonyfill;
    readonly childNodePart?: DeclarativeChildNodePartPonyfill;
    readonly propertyPart?: DeclarativePropertyPartPonyfill;
    readonly eventPart?: DeclarativeEventPartPonyfill;
    readonly tokenListPart?: DeclarativeTokenListPartPonyfill;
    readonly viewPart?: DeclarativeViewPartPonyfill;
}

function flattenPonyfills(
    ponyfills: readonly DeclarativePonyfill[],
    result: Exclude<DeclarativePonyfill, DeclarativePonyfillGroup>[],
): void {
    for (const ponyfill of ponyfills) {
        if (ponyfill.kind === "ponyfill-group") {
            flattenPonyfills(ponyfill.ponyfills, result);
        } else {
            result.push(ponyfill);
        }
    }
}

/**
 * Validates and composes the ponyfills used by a declarative template.
 * @internal
 */
export function composeDeclarativePonyfills(
    options: DeclarativeTemplateOptions,
): DeclarativePonyfillRuntime {
    if (!options || !Array.isArray(options.ponyfills)) {
        throw new Error("declarativeTemplate requires an explicit ponyfills array.");
    }

    const flattened: Exclude<DeclarativePonyfill, DeclarativePonyfillGroup>[] = [];
    const capabilities = Object.create(null);
    flattenPonyfills(options.ponyfills, flattened);

    for (const ponyfill of flattened) {
        if (capabilities[ponyfill.kind]) {
            throw new Error(
                `Only one ${ponyfill.kind} ponyfill can be configured per template.`,
            );
        }

        capabilities[ponyfill.kind] = ponyfill;
    }

    if (!capabilities.signals || !capabilities["dom-scheduler"]) {
        throw new Error(
            "declarativeTemplate requires Signals and DOM scheduler ponyfills.",
        );
    }

    return Object.freeze({
        scheduler: capabilities["dom-scheduler"],
        signals: capabilities.signals,
        nodePart: capabilities["node-part"],
        attributePart: capabilities["attribute-part"],
        childNodePart: capabilities["child-node-part"],
        propertyPart: capabilities["property-part"],
        eventPart: capabilities["event-part"],
        tokenListPart: capabilities["token-list-part"],
        viewPart: capabilities["view-part"],
    });
}
