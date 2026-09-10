import type { DeclarativePropertyPartPonyfill } from "../declarative/ponyfills.js";
import { PartBase } from "./part.js";

/**
 * FAST's independently measurable property-target extension to DOM Parts.
 * @public
 */
export class PropertyPart extends PartBase<any> {
    public constructor(
        public readonly node: Node,
        public readonly propertyName: string,
    ) {
        super();
    }

    protected commitValue(value: any): void {
        (this.node as any)[this.propertyName] = value;
    }
}

class PropertyPartPonyfill implements DeclarativePropertyPartPonyfill {
    public readonly kind = "property-part";

    public create(node: Node, propertyName: string): PropertyPart {
        return new PropertyPart(node, propertyName);
    }
}

/**
 * Creates FAST's independently composable property-part extension.
 * @public
 */
export function propertyParts(): DeclarativePropertyPartPonyfill {
    return new PropertyPartPonyfill();
}
