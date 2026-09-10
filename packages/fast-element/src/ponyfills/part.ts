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
    private committing = false;
    private assignmentGeneration = 0;

    public get value(): T {
        return this.pending ? this.pendingValue : this.committedValue;
    }

    public set value(value: T) {
        this.pendingValue = value;
        this.pending = true;
        this.assignmentGeneration++;
    }

    public commit(): void {
        if (this.committing) {
            throw new DOMException(
                "Part commit is already in progress.",
                "InvalidStateError",
            );
        }

        if (!this.pending) {
            return;
        }

        const generation = this.assignmentGeneration;
        const value = this.pendingValue;
        this.committing = true;

        try {
            this.commitValue(value);
            this.committedValue = value;

            if (this.assignmentGeneration === generation) {
                this.pending = false;
            }
        } finally {
            this.committing = false;
        }
    }

    protected abstract commitValue(value: T): void;
}
