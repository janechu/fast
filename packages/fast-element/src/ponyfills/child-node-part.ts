import type { DeclarativeChildNodePartPonyfill } from "../declarative/ponyfills.js";
import { PartBase } from "./part.js";

function appendValue(fragment: DocumentFragment, value: any): void {
    if (value == null) {
        return;
    }

    if (value instanceof Node) {
        fragment.append(value);
        return;
    }

    if (
        typeof value !== "string" &&
        value[Symbol.iterator] instanceof Function
    ) {
        for (const item of value) {
            appendValue(fragment, item);
        }
        return;
    }

    fragment.append(document.createTextNode(String(value)));
}

/**
 * A DOM Part that owns the children between two sibling boundaries.
 * @public
 */
export class ChildNodePart extends PartBase<any> {
    public constructor(
        public readonly parentNode: Node,
        public readonly previousSibling: Node | null = null,
        public readonly nextSibling: Node | null = null,
    ) {
        super();

        if (
            (previousSibling !== null && previousSibling.parentNode !== parentNode) ||
            (nextSibling !== null && nextSibling.parentNode !== parentNode)
        ) {
            throw new Error("ChildNodePart boundaries must belong to its parent node.");
        }
    }

    protected commitValue(value: any): void {
        let current = this.previousSibling
            ? this.previousSibling.nextSibling
            : this.parentNode.firstChild;

        while (current !== this.nextSibling) {
            if (current === null) {
                throw new Error("ChildNodePart boundaries no longer describe a valid range.");
            }

            const next = current.nextSibling;
            this.parentNode.removeChild(current);
            current = next;
        }

        const fragment = document.createDocumentFragment();
        appendValue(fragment, value);
        this.parentNode.insertBefore(fragment, this.nextSibling);
    }
}

class ChildNodePartPonyfill implements DeclarativeChildNodePartPonyfill {
    public readonly kind = "child-node-part";

    public create(
        parentNode: Node,
        previousSibling: Node | null = null,
        nextSibling: Node | null = null,
    ): ChildNodePart {
        return new ChildNodePart(parentNode, previousSibling, nextSibling);
    }
}

/**
 * Creates the independently composable ChildNodePart capability.
 * @public
 */
export function childNodeParts(): DeclarativeChildNodePartPonyfill {
    return new ChildNodePartPonyfill();
}
