import type { DeclarativeSignal } from "../declarative/ponyfills.js";
import {
    evaluateWithSignals,
    type SignalDependency,
    SignalDependencySet,
    type SignalSubscriber,
    trackSignal,
} from "./signal-runtime.js";

/**
 * A lazily evaluated computed signal.
 * @public
 */
export class ComputedSignal<T>
    extends SignalDependencySet
    implements DeclarativeSignal<T>, SignalSubscriber
{
    private current: T;
    private error: unknown;
    private hasError = false;
    private dirty = true;
    private readonly dependencies = new Set<SignalDependency>();

    public constructor(private readonly compute: () => T) {
        super();
    }

    public get(): T {
        trackSignal(this);

        if (this.dirty) {
            this.clearDependencies();

            try {
                this.current = evaluateWithSignals(this, this.compute);
                this.hasError = false;
            } catch (error) {
                this.error = error;
                this.hasError = true;
            } finally {
                this.dirty = false;
            }
        }

        if (this.hasError) {
            throw this.error;
        }

        return this.current;
    }

    public invalidate(): void {
        if (!this.dirty) {
            this.dirty = true;
            this.notify();
        }
    }

    public track(dependency: SignalDependency): void {
        this.dependencies.add(dependency);
    }

    private clearDependencies(): void {
        for (const dependency of this.dependencies) {
            dependency.unsubscribe(this);
        }

        this.dependencies.clear();
    }
}

/**
 * Creates an independently importable computed signal.
 * @public
 */
export function signalComputed<T>(compute: () => T): ComputedSignal<T> {
    return new ComputedSignal(compute);
}
