import type { Part } from "./part.js";

/**
 * A small commit group for batching independently created parts.
 * @public
 */
export class PartGroup {
    public readonly parts: readonly Part[];

    public constructor(parts: readonly Part[]) {
        this.parts = Object.freeze(Array.from(parts));
    }

    public commit(): void {
        for (const part of this.parts) {
            part.commit();
        }
    }
}
