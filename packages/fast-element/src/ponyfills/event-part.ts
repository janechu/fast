import type { DeclarativeEventPartPonyfill } from "../declarative/ponyfills.js";
import { PartBase } from "./part.js";

/**
 * FAST's independently measurable event-target extension to DOM Parts.
 * @public
 */
export class EventPart extends PartBase<EventListenerOrEventListenerObject | null> {
    private listener: EventListenerOrEventListenerObject | null = null;

    public constructor(
        public readonly element: Element,
        public readonly eventType: string,
        public readonly options?: AddEventListenerOptions | boolean,
    ) {
        super();
    }

    protected commitValue(
        value: EventListenerOrEventListenerObject | null,
    ): void {
        if (this.listener !== null) {
            this.element.removeEventListener(
                this.eventType,
                this.listener,
                this.options,
            );
        }

        this.listener = value;

        if (value !== null) {
            this.element.addEventListener(this.eventType, value, this.options);
        }
    }
}

class EventPartPonyfill implements DeclarativeEventPartPonyfill {
    public readonly kind = "event-part";

    public create(
        element: Element,
        eventType: string,
        options?: AddEventListenerOptions | boolean,
    ): EventPart {
        return new EventPart(element, eventType, options);
    }
}

/**
 * Creates FAST's independently composable event-part extension.
 * @public
 */
export function eventParts(): DeclarativeEventPartPonyfill {
    return new EventPartPonyfill();
}
