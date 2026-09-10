import type { DeclarativeAttributePartPonyfill } from "../declarative/ponyfills.js";
import { PartBase } from "./part.js";

/**
 * A DOM Part that updates one content attribute.
 * @public
 */
export class AttributePart extends PartBase<any> {
    public readonly prefix: string | null;
    public readonly localName: string;
    public readonly namespaceURI: string | null;

    public constructor(
        public readonly element: Element,
        public readonly qualifiedName: string,
        namespace: string | null = null,
        private readonly booleanMode = false,
    ) {
        super();
        const separator = qualifiedName.indexOf(":");
        this.prefix = separator === -1 ? null : qualifiedName.slice(0, separator);
        this.localName =
            separator === -1 ? qualifiedName : qualifiedName.slice(separator + 1);
        this.namespaceURI = namespace;
    }

    protected commitValue(value: any): void {
        const shouldRemove =
            value == null || (this.booleanMode && value !== true);

        if (shouldRemove) {
            this.namespaceURI === null
                ? this.element.removeAttribute(this.qualifiedName)
                : this.element.removeAttributeNS(this.namespaceURI, this.localName);
            return;
        }

        const serialized = this.booleanMode ? "" : String(value);

        this.namespaceURI === null
            ? this.element.setAttribute(this.qualifiedName, serialized)
            : this.element.setAttributeNS(
                  this.namespaceURI,
                  this.prefix === null
                      ? this.localName
                      : `${this.prefix}:${this.localName}`,
                  serialized,
              );
    }
}

class AttributePartPonyfill implements DeclarativeAttributePartPonyfill {
    public readonly kind = "attribute-part";

    public create(
        element: Element,
        qualifiedName: string,
        namespace: string | null = null,
        booleanMode = false,
    ): AttributePart {
        return new AttributePart(element, qualifiedName, namespace, booleanMode);
    }
}

/**
 * Creates the independently composable AttributePart capability.
 * @public
 */
export function attributeParts(): DeclarativeAttributePartPonyfill {
    return new AttributePartPonyfill();
}
