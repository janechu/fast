/**
 * A staged mutable location in a DOM tree.
 * @public
 */
export interface Part<T = any> {
    value: T;
    commit(): void;
}

/**
 * Shared staged-value behavior for independently shippable DOM part primitives.
 * @public
 */
export abstract class PartBase<T = any> implements Part<T> {
    private committedValue: T;
    private pendingValue: T;
    private pending = false;

    public get value(): T {
        return this.pending ? this.pendingValue : this.committedValue;
    }

    public set value(value: T) {
        this.pendingValue = value;
        this.pending = true;
    }

    public commit(): void {
        if (!this.pending) {
            return;
        }

        this.pending = false;
        this.committedValue = this.pendingValue;
        this.commitValue(this.committedValue);
    }

    protected abstract commitValue(value: T): void;
}
