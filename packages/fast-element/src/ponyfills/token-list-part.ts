import type { DeclarativeTokenListPartPonyfill } from "../declarative/ponyfills.js";
import { PartBase } from "./part.js";

/**
 * FAST's independently measurable DOMTokenList-target extension.
 * @public
 */
export class TokenListPart extends PartBase<any> {
    private readonly tokens = new Set<string>();

    public constructor(
        public readonly element: Element,
        public readonly propertyName: string,
    ) {
        super();
    }

    protected commitValue(value: any): void {
        const tokenList = (this.element as any)[this.propertyName] as DOMTokenList;
        const next = new Set(
            value == null || value === "" ? [] : String(value).split(/\s+/),
        );

        for (const token of this.tokens) {
            if (!next.has(token)) {
                tokenList.remove(token);
                this.tokens.delete(token);
            }
        }

        for (const token of next) {
            if (token !== "" && !this.tokens.has(token)) {
                tokenList.add(token);
                this.tokens.add(token);
            }
        }
    }
}

class TokenListPartPonyfill implements DeclarativeTokenListPartPonyfill {
    public readonly kind = "token-list-part";

    public create(element: Element, propertyName: string): TokenListPart {
        return new TokenListPart(element, propertyName);
    }
}

/**
 * Creates FAST's independently composable token-list-part extension.
 * @public
 */
export function tokenListParts(): DeclarativeTokenListPartPonyfill {
    return new TokenListPartPonyfill();
}
