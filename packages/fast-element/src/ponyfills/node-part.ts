import type { DeclarativeNodePartPonyfill } from "../declarative/ponyfills.js";
import { PartBase } from "./part.js";

/**
 * A DOM Part that updates one node's textual value.
 * @public
 */
export class NodePart extends PartBase<any> {
    public constructor(public readonly node: Node) {
        super();
    }

    protected commitValue(value: any): void {
        this.node.nodeValue = value == null ? "" : String(value);
    }
}

class NodePartPonyfill implements DeclarativeNodePartPonyfill {
    public readonly kind = "node-part";

    public create(node: Node): NodePart {
        return new NodePart(node);
    }
}

/**
 * Creates the independently composable NodePart capability.
 * @public
 */
export function nodeParts(): DeclarativeNodePartPonyfill {
    return new NodePartPonyfill();
}
