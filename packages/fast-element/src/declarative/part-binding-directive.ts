import type { Binding, BindingDirective } from "../binding/binding.js";
import { DOMAspect, type DOMSink } from "../dom.js";
import type { DOMPolicy } from "../dom-policy.js";
import {
    ExecutionContext,
    type Expression,
    type ExpressionObserver,
} from "../observation/observable.js";
import type { Part } from "../ponyfills/part.js";
import {
    type AddViewBehaviorFactory,
    type Aspected,
    HTMLDirective,
    type ViewBehavior,
    type ViewBehaviorFactory,
    type ViewController,
} from "../templating/html-directive.js";
import { Markup } from "../templating/markup.js";
import type { DeclarativePonyfillRuntime } from "./ponyfills.js";

type TargetWithState = Node & Record<string, any>;
const attributeNamespaces: Record<string, string> = {
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/",
};

/**
 * FAST's thin interpretive layer between declarative expressions and low-level
 * DOM part ponyfills.
 * @internal
 */
export class PartBindingDirective
    implements
        HTMLDirective,
        ViewBehaviorFactory,
        ViewBehavior,
        Aspected,
        BindingDirective,
        EventListenerObject
{
    public id: string;
    public targetNodeId: string;
    public targetTagName: string | null;
    public policy: DOMPolicy;
    public sourceAspect: string;
    public targetAspect: string;
    public targetNamespace?: string | null;
    public aspectType: DOMAspect = DOMAspect.content;
    public readonly dataBinding: Binding;
    private updateTarget: DOMSink | null = null;

    public constructor(
        dataBinding: Binding,
        private readonly runtime: DeclarativePonyfillRuntime,
    ) {
        this.dataBinding = dataBinding;
    }

    public createHTML(add: AddViewBehaviorFactory): string {
        return Markup.interpolation(add(this));
    }

    public createBehavior(): ViewBehavior {
        if (this.updateTarget === null && this.aspectType !== DOMAspect.event) {
            const policy = this.dataBinding.policy ?? this.policy;
            this.updateTarget = policy.protect(
                this.targetTagName,
                this.aspectType,
                this.targetAspect,
                (target, _aspect, value, controller) => {
                    const part = this.getPart(target as TargetWithState, controller);
                    part.value = value;
                    part.commit();
                },
            );
        }

        return this;
    }

    public bind(controller: ViewController): void {
        const target = controller.targets[this.targetNodeId] as TargetWithState;

        if (this.aspectType === DOMAspect.event) {
            const part = this.getPart(target, controller);
            target[`${this.id}-controller`] = controller;
            part.value = this;
            part.commit();
            controller.onUnbind(this);
            return;
        }

        if (this.aspectType === DOMAspect.content) {
            controller.onUnbind(this);
        }

        const observer =
            target[`${this.id}-observer`] ??
            (target[`${this.id}-observer`] = this.dataBinding.createObserver(
                this,
                this,
            ));

        (observer as any).target = target;
        (observer as any).controller = controller;
        const value = observer.bind(controller);

        if (
            controller._skipAttrUpdates &&
            (this.aspectType === DOMAspect.attribute ||
                this.aspectType === DOMAspect.booleanAttribute)
        ) {
            return;
        }

        this.updateTarget!(target, this.targetAspect, value, controller);
    }

    public unbind(controller: ViewController): void {
        const target = controller.targets[this.targetNodeId] as TargetWithState;
        const part = target[`${this.id}-part`] as Part & { unbind?(): void };

        if (this.aspectType === DOMAspect.event && part) {
            part.value = null;
            part.commit();
            delete target[`${this.id}-controller`];
        } else {
            part?.unbind?.();
        }
    }

    public handleEvent(event: Event): void {
        const target = event.currentTarget as TargetWithState;
        const controller = target[`${this.id}-controller`] as ViewController;

        if (controller.isBound) {
            ExecutionContext.setEvent(event);
            const result = this.dataBinding.evaluate(
                controller.source,
                controller.context,
            );
            ExecutionContext.setEvent(null);

            if (result !== true) {
                event.preventDefault();
            }
        }
    }

    public handleChange(_binding: Expression, observer: ExpressionObserver): void {
        const controller = (observer as any).controller as ViewController;

        if (!controller.isBound) {
            return;
        }

        this.updateTarget!(
            (observer as any).target,
            this.targetAspect,
            observer.bind(controller),
            controller,
        );
    }

    private getPart(target: TargetWithState, controller: ViewController): Part {
        const key = `${this.id}-part`;
        let part = target[key] as Part | undefined;

        if (part) {
            return part;
        }

        switch (this.aspectType) {
            case DOMAspect.attribute:
                const separator = this.targetAspect.indexOf(":");
                const namespace =
                    this.targetNamespace ??
                    (separator === -1
                        ? null
                        : attributeNamespaces[
                              this.targetAspect.slice(0, separator)
                          ] ?? null);
                part = this.require(this.runtime.attributePart, "attribute-part").create(
                    target as Element,
                    this.targetAspect,
                    namespace,
                );
                break;
            case DOMAspect.booleanAttribute:
                part = this.require(this.runtime.attributePart, "attribute-part").create(
                    target as Element,
                    this.targetAspect,
                    this.targetNamespace,
                    true,
                );
                break;
            case DOMAspect.property:
                part = this.require(this.runtime.propertyPart, "property-part").create(
                    target,
                    this.targetAspect,
                );
                break;
            case DOMAspect.tokenList:
                part = this.require(
                    this.runtime.tokenListPart,
                    "token-list-part",
                ).create(target as Element, this.targetAspect);
                break;
            case DOMAspect.event:
                part = this.require(this.runtime.eventPart, "event-part").create(
                    target as Element,
                    this.targetAspect,
                    this.dataBinding.options,
                );
                break;
            default:
                part = this.require(this.runtime.viewPart, "view-part").create(
                    target,
                    controller,
                    this.targetNodeId,
                );
                break;
        }

        target[key] = part;
        return part;
    }

    private require<T>(value: T | undefined, kind: string): T {
        if (value === void 0) {
            throw new Error(
                `The declarative template uses ${kind}, but that ponyfill was not configured.`,
            );
        }

        return value;
    }
}

HTMLDirective.define(PartBindingDirective, { aspected: true });
