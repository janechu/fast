export interface SignalDependency {
    subscribe(subscriber: SignalSubscriber): void;
    unsubscribe(subscriber: SignalSubscriber): void;
}

export interface SignalSubscriber {
    invalidate(): void;
    track(dependency: SignalDependency): void;
}

let activeSubscriber: SignalSubscriber | undefined;

export function trackSignal(dependency: SignalDependency): void {
    if (activeSubscriber !== void 0) {
        dependency.subscribe(activeSubscriber);
        activeSubscriber.track(dependency);
    }
}

export function evaluateWithSignals<T>(
    subscriber: SignalSubscriber,
    callback: () => T,
): T {
    const previous = activeSubscriber;
    activeSubscriber = subscriber;

    try {
        return callback();
    } finally {
        activeSubscriber = previous;
    }
}

export abstract class SignalDependencySet implements SignalDependency {
    private readonly subscribers = new Set<SignalSubscriber>();

    public subscribe(subscriber: SignalSubscriber): void {
        this.subscribers.add(subscriber);
    }

    public unsubscribe(subscriber: SignalSubscriber): void {
        this.subscribers.delete(subscriber);
    }

    protected notify(): void {
        for (const subscriber of Array.from(this.subscribers)) {
            subscriber.invalidate();
        }
    }
}
