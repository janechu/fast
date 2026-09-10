import { Binding, type BindingDirective } from "../binding/binding.js";
import type {
    DeclarativeDOMSchedulerPonyfill,
    DeclarativeSignalsPonyfill,
} from "../declarative/ponyfills.js";
import type { DOMPolicy } from "../dom-policy.js";
import type { Callable } from "../interfaces.js";
import type { Subscriber } from "../observation/notifier.js";
import {
    type Expression,
    type ExpressionController,
    type ExpressionNotifier,
    type ExpressionObserver,
    Observable,
} from "../observation/observable.js";
import { signalComputed } from "./signal-computed.js";
import { signalEffect } from "./signal-effect.js";
import { signalState } from "./signal-state.js";

export { ComputedSignal, signalComputed } from "./signal-computed.js";
export { SignalEffect, signalEffect } from "./signal-effect.js";
export { StateSignal, signalState } from "./signal-state.js";

class ScheduledExpressionObserver<TSource, TReturn, TParent>
    implements ExpressionObserver<TSource, TReturn, TParent>, Subscriber
{
    public target!: Node;
    public controller!: ExpressionController<TSource, TParent>;
    private readonly notifier: ExpressionNotifier<TSource, TReturn, TParent>;

    public constructor(
        expression: Expression<TSource, TReturn, TParent>,
        private readonly subscriber: Subscriber,
        private readonly scheduler: DeclarativeDOMSchedulerPonyfill,
        isVolatile: boolean,
        private readonly directive: BindingDirective,
    ) {
        this.notifier = Observable.binding(expression, this, isVolatile);
    }

    public bind(controller: ExpressionController<TSource, TParent>): TReturn {
        this.controller = controller;

        if (this.target === void 0) {
            const viewController = controller as any;
            this.target =
                viewController.targets?.[(this.directive as any).targetNodeId] ??
                (controller.source instanceof Node ? controller.source : document);
        }

        return this.notifier.bind(controller);
    }

    public handleChange(): void {
        this.scheduler.enqueue(this.target, this as Callable);
    }

    public call(): void {
        if (this.controller?.isBound) {
            this.subscriber.handleChange(this.notifier.subject, this);
        }
    }
}

class SignalsBinding<TSource, TReturn, TParent> extends Binding<
    TSource,
    TReturn,
    TParent
> {
    public constructor(
        expression: Expression<TSource, TReturn, TParent>,
        private readonly scheduler: DeclarativeDOMSchedulerPonyfill,
        policy?: DOMPolicy,
        isVolatile = Observable.isVolatileBinding(expression),
    ) {
        super(expression, policy, isVolatile);
    }

    public createObserver(
        subscriber: Subscriber,
        directive: BindingDirective,
    ): ExpressionObserver<TSource, TReturn, TParent> {
        return new ScheduledExpressionObserver(
            this.evaluate,
            subscriber,
            this.scheduler,
            this.isVolatile,
            directive,
        );
    }
}

class SignalsPonyfill implements DeclarativeSignalsPonyfill {
    public readonly kind = "signals";

    public state<T>(value: T) {
        return signalState(value);
    }

    public computed<T>(compute: () => T) {
        return signalComputed(compute);
    }

    public effect(
        target: Node,
        callback: () => void,
        scheduler: DeclarativeDOMSchedulerPonyfill,
    ) {
        return signalEffect(target, callback, scheduler);
    }

    public binding<TSource = any, TReturn = any, TParent = any>(
        expression: Expression<TSource, TReturn, TParent>,
        scheduler: DeclarativeDOMSchedulerPonyfill,
        policy?: DOMPolicy,
        isVolatile?: boolean,
    ): Binding<TSource, TReturn, TParent> {
        return new SignalsBinding(expression, scheduler, policy, isVolatile);
    }
}

/**
 * Creates a Signals-compatible declarative dependency adapter.
 * @public
 */
export function signals(): DeclarativeSignalsPonyfill {
    return new SignalsPonyfill();
}
