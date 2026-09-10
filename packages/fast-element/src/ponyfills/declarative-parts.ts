import type { DeclarativePonyfillGroup } from "../declarative/ponyfills.js";
import { domParts } from "./dom-parts.js";
import { eventParts } from "./event-part.js";
import { propertyParts } from "./property-part.js";
import { tokenListParts } from "./token-list-part.js";
import { viewParts } from "./view-part.js";

export { EventPart, eventParts } from "./event-part.js";
export { PropertyPart, propertyParts } from "./property-part.js";
export { TokenListPart, tokenListParts } from "./token-list-part.js";
export { ViewPart, viewParts } from "./view-part.js";

/**
 * Groups DOM Parts proposal primitives with FAST's separately exported
 * declarative target extensions.
 * @public
 */
export function declarativeParts(): DeclarativePonyfillGroup {
    return {
        kind: "ponyfill-group",
        ponyfills: [
            domParts(),
            propertyParts(),
            eventParts(),
            tokenListParts(),
            viewParts(),
        ],
    };
}
