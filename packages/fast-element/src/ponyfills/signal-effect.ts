import type {
    DeclarativeDOMSchedulerPonyfill,
    DeclarativeSignalEffect,
} from "../declarative/ponyfills.js";
import type { Callable } from "../interfaces.js";
import {
    evaluateWithSignals,
    type SignalDependency,
    type SignalSubscriber,
} from "./signal-runtime.js";

/**
 * A target-owned signal effect whose invalidations are delegated to the DOM
 * scheduler capability.
 * @public
 */
export class SignalEffect implements DeclarativeSignalEffect, SignalSubscriber {
    private disposed = false;
    private readonly dependencies = new Set<SignalDependency>();

    public constructor(
        public readonly target: Node,
        private readonly callback: () => void,
        private readonly scheduler: DeclarativeDOMSchedulerPonyfill,
    ) {
        try {
            this.call();
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    public invalidate(): void {
        if (!this.disposed) {
            this.scheduler.enqueue(this.target, this as Callable);
        }
    }

    public call(): void {
        if (!this.disposed) {
            this.clearDependencies();
            evaluateWithSignals(this, this.callback);
        }
    }

    public track(dependency: SignalDependency): void {
        this.dependencies.add(dependency);
    }

    public dispose(): void {
        this.disposed = true;
        this.scheduler.cancel(this as Callable);
        this.clearDependencies();
    }

    private clearDependencies(): void {
        for (const dependency of this.dependencies) {
            dependency.unsubscribe(this);
        }

        this.dependencies.clear();
    }
}

/**
 * Creates an independently importable DOM-owned signal effect.
 * @public
 */
export function signalEffect(
    target: Node,
    callback: () => void,
    scheduler: DeclarativeDOMSchedulerPonyfill,
): SignalEffect {
    return new SignalEffect(target, callback, scheduler);
}
