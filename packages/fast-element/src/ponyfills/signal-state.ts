import type { DeclarativeStateSignal } from "../declarative/ponyfills.js";
import { SignalDependencySet, trackSignal } from "./signal-runtime.js";

/**
 * A minimal writable signal matching the lower-level State primitive.
 * @public
 */
export class StateSignal<T> extends SignalDependencySet
    implements DeclarativeStateSignal<T>
{
    public constructor(private current: T) {
        super();
    }

    public get(): T {
        trackSignal(this);
        return this.current;
    }

    public set(value: T): void {
        if (!Object.is(this.current, value)) {
            this.current = value;
            this.notify();
        }
    }
}

/**
 * Creates an independently importable writable signal.
 * @public
 */
export function signalState<T>(value: T): StateSignal<T> {
    return new StateSignal(value);
}
