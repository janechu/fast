import type { DeclarativePonyfillGroup } from "../declarative/ponyfills.js";
import { attributeParts } from "./attribute-part.js";
import { childNodeParts } from "./child-node-part.js";
import { nodeParts } from "./node-part.js";

export { AttributePart, attributeParts } from "./attribute-part.js";
export { ChildNodePart, childNodeParts } from "./child-node-part.js";
export { NodePart, nodeParts } from "./node-part.js";
export type { Part } from "./part.js";
export { PartBase } from "./part.js";
export { PartGroup } from "./part-group.js";

/**
 * Groups only the low-level primitives described by the DOM Parts proposal.
 * @public
 */
export function domParts(): DeclarativePonyfillGroup {
    return {
        kind: "ponyfill-group",
        ponyfills: [
            nodeParts(),
            attributeParts(),
            childNodeParts(),
        ],
    };
}
