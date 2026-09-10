import type { Part } from "./part.js";

/**
 * A small commit group for batching independently created parts.
 * @public
 */
export class PartGroup {
    public readonly parts: readonly Part[];
    private committing = false;

    public constructor(parts: readonly Part[]) {
        this.parts = Object.freeze(Array.from(parts));

        if (new Set(this.parts).size !== this.parts.length) {
            throw new TypeError("Part groups cannot contain duplicate parts.");
        }
    }

    public commit(): void {
        if (this.committing) {
            throw new DOMException(
                "Part group commit is already in progress.",
                "InvalidStateError",
            );
        }

        this.committing = true;
        const errors: unknown[] = [];

        try {
            for (const part of this.parts) {
                try {
                    part.commit();
                } catch (error) {
                    errors.push(error);
                }
            }
        } finally {
            this.committing = false;
        }

        if (errors.length > 0) {
            const AggregateErrorConstructor = (globalThis as any).AggregateError;

            if (AggregateErrorConstructor instanceof Function) {
                throw new AggregateErrorConstructor(
                    errors,
                    "One or more Part commits failed.",
                );
            }

            const error = new Error("One or more Part commits failed.") as Error & {
                errors: readonly unknown[];
            };
            error.name = "AggregateError";
            error.errors = errors;
            throw error;
        }
    }
}
