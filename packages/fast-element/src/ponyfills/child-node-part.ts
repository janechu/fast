import type { DeclarativeChildNodePartPonyfill } from "../declarative/ponyfills.js";
import { PartBase } from "./part.js";

function collectValue(nodes: Array<Node | string>, value: any): void {
    if (value == null) {
        return;
    }

    if (value instanceof Node) {
        if (value instanceof ShadowRoot) {
            throw new DOMException(
                "ChildNodePart cannot insert a ShadowRoot.",
                "HierarchyRequestError",
            );
        }

        if (value.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            for (const child of Array.from(value.childNodes)) {
                collectValue(nodes, child);
            }

            return;
        }

        if (
            value.nodeType === Node.ATTRIBUTE_NODE ||
            value.nodeType === Node.DOCUMENT_NODE ||
            value.nodeType === Node.DOCUMENT_TYPE_NODE
        ) {
            throw new DOMException(
                "ChildNodePart cannot insert this node type.",
                "HierarchyRequestError",
            );
        }

        nodes.push(value);
        return;
    }

    if (typeof value !== "string" && value[Symbol.iterator] instanceof Function) {
        for (const item of value) {
            collectValue(nodes, item);
        }
        return;
    }

    nodes.push(String(value));
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
            (nextSibling !== null && nextSibling.parentNode !== parentNode) ||
            !this.hasValidBoundaries()
        ) {
            throw new Error("ChildNodePart boundaries must belong to its parent node.");
        }
    }

    protected commitValue(value: any): void {
        const nodes: Array<Node | string> = [];
        collectValue(nodes, value);

        const currentNodes = this.getCurrentNodes();

        if (currentNodes === null) {
            throw new Error("ChildNodePart boundaries no longer describe a valid range.");
        }

        const document =
            this.parentNode instanceof Document
                ? this.parentNode
                : this.parentNode.ownerDocument;

        if (document === null) {
            throw new Error("ChildNodePart parent must belong to a document.");
        }

        const desiredNodes = nodes.map(node =>
            typeof node === "string" ? document.createTextNode(node) : node,
        );
        this.preflightNodes(desiredNodes, currentNodes);
        let current =
            this.previousSibling === null
                ? this.parentNode.firstChild
                : this.previousSibling.nextSibling;

        for (const node of desiredNodes) {
            if (node === current) {
                current = current.nextSibling;
                continue;
            }

            const moveBefore = (this.parentNode as any).moveBefore;

            if (node.parentNode === this.parentNode && moveBefore instanceof Function) {
                moveBefore.call(this.parentNode, node, current);
            } else {
                this.parentNode.insertBefore(node, current);
            }
        }

        while (current !== this.nextSibling) {
            const next = current!.nextSibling;
            this.parentNode.removeChild(current!);
            current = next;
        }
    }

    private hasValidBoundaries(): boolean {
        return this.getCurrentNodes() !== null;
    }

    private getCurrentNodes(): Node[] | null {
        if (
            (this.previousSibling !== null &&
                this.previousSibling.parentNode !== this.parentNode) ||
            (this.nextSibling !== null && this.nextSibling.parentNode !== this.parentNode)
        ) {
            return null;
        }

        const nodes: Node[] = [];
        let current =
            this.previousSibling === null
                ? this.parentNode.firstChild
                : this.previousSibling.nextSibling;

        while (current !== null && current !== this.nextSibling) {
            nodes.push(current);
            current = current.nextSibling;
        }

        return current === this.nextSibling ? nodes : null;
    }

    private preflightNodes(nodes: Node[], currentNodes: Node[]): void {
        const uniqueNodes = new Set(nodes);

        if (uniqueNodes.size !== nodes.length) {
            throw new DOMException(
                "ChildNodePart cannot insert the same node more than once.",
                "HierarchyRequestError",
            );
        }

        for (const node of nodes) {
            if (
                node === this.previousSibling ||
                node === this.nextSibling ||
                node === this.parentNode ||
                node.contains(this.parentNode)
            ) {
                throw new DOMException(
                    "ChildNodePart replacement would invalidate its boundaries.",
                    "HierarchyRequestError",
                );
            }
        }

        if (!(this.parentNode instanceof Document)) {
            return;
        }

        const removedNodes = new Set(currentNodes);

        for (const node of nodes) {
            if (node.parentNode === this.parentNode) {
                removedNodes.add(node);
            }
        }

        const remainingNodes: Node[] = Array.from(this.parentNode.childNodes).filter(
            node => !removedNodes.has(node),
        );
        const insertionIndex =
            this.nextSibling === null
                ? remainingNodes.length
                : remainingNodes.indexOf(this.nextSibling);
        const finalNodes = [
            ...remainingNodes.slice(0, insertionIndex),
            ...nodes,
            ...remainingNodes.slice(insertionIndex),
        ];
        let elementIndex = -1;
        let documentTypeIndex = -1;

        for (let index = 0; index < finalNodes.length; index++) {
            switch (finalNodes[index].nodeType) {
                case Node.ELEMENT_NODE:
                    if (elementIndex !== -1) {
                        this.throwInvalidDocumentContent();
                    }

                    elementIndex = index;
                    break;
                case Node.DOCUMENT_TYPE_NODE:
                    if (documentTypeIndex !== -1) {
                        this.throwInvalidDocumentContent();
                    }

                    documentTypeIndex = index;
                    break;
                case Node.COMMENT_NODE:
                case Node.PROCESSING_INSTRUCTION_NODE:
                    break;
                default:
                    this.throwInvalidDocumentContent();
            }
        }

        if (
            documentTypeIndex !== -1 &&
            elementIndex !== -1 &&
            documentTypeIndex > elementIndex
        ) {
            this.throwInvalidDocumentContent();
        }
    }

    private throwInvalidDocumentContent(): never {
        throw new DOMException(
            "ChildNodePart replacement is not valid Document content.",
            "HierarchyRequestError",
        );
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
