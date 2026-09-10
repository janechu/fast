import type { DeclarativeEventPartPonyfill } from "../declarative/ponyfills.js";
import { PartBase } from "./part.js";

/**
 * FAST's independently measurable event-target extension to DOM Parts.
 * @public
 */
export class EventPart extends PartBase<
    EventListenerOrEventListenerObject | null | undefined
> {
    private registeredListener: EventListener | null = null;
    private readonly abortListener = () => this.dispose();
    public readonly capture: boolean;
    public readonly passive: boolean;
    public readonly once: boolean;
    public readonly signal: AbortSignal | null;
    public readonly options: AddEventListenerOptions;

    public constructor(
        public readonly element: EventTarget,
        public readonly eventType: string,
        options?: AddEventListenerOptions | boolean,
    ) {
        super();
        this.capture = typeof options === "boolean" ? options : options?.capture === true;
        this.passive = typeof options === "object" && options.passive === true;
        this.once = typeof options === "object" && options.once === true;
        this.signal =
            typeof options === "object" && options.signal ? options.signal : null;
        this.options = Object.freeze({
            capture: this.capture,
            passive: this.passive,
            once: this.once,
            ...(this.signal === null ? null : { signal: this.signal }),
        });
    }

    protected commitValue(
        value: EventListenerOrEventListenerObject | null | undefined,
    ): void {
        this.removeRegistration();

        if (value == null) {
            return;
        }

        if (this.signal?.aborted) {
            throw new DOMException(
                "Cannot register a listener with an aborted signal.",
                "InvalidStateError",
            );
        }

        const registeredListener = (event: Event) => {
            if (this.once) {
                this.registeredListener = null;
                this.signal?.removeEventListener("abort", this.abortListener);
            }

            typeof value === "function"
                ? value.call(this.element, event)
                : value.handleEvent(event);
        };

        this.registeredListener = registeredListener;
        this.element.addEventListener(this.eventType, registeredListener, this.options);
        this.signal?.addEventListener("abort", this.abortListener, {
            once: true,
        });
    }

    public dispose(): void {
        this.value = null;
        this.commit();
    }

    private removeRegistration(): void {
        if (this.registeredListener === null) {
            return;
        }

        this.element.removeEventListener(
            this.eventType,
            this.registeredListener,
            this.capture,
        );
        this.signal?.removeEventListener("abort", this.abortListener);
        this.registeredListener = null;
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
