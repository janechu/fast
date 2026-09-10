import { isHydratable } from "../components/hydration.js";
import type { DeclarativeViewPartPonyfill } from "../declarative/ponyfills.js";
import type { ExecutionContext } from "../observation/observable.js";
import type {
    ContentTemplate,
    ContentView,
} from "../templating/html-binding-directive.js";
import type { ViewController } from "../templating/html-directive.js";
import { HydrationStage } from "../templating/hydration-view.js";
import { removeNodeSequence } from "../templating/view.js";
import { PartBase } from "./part.js";

type ComposableView = ContentView & {
    isComposed?: boolean;
    needsBindOnly?: boolean;
};

type ContentTarget = Node & {
    $fastView?: ComposableView;
    $fastTemplate?: ContentTemplate;
};

function isContentTemplate(value: any): value is ContentTemplate {
    return value?.create instanceof Function;
}

/**
 * FAST's view-composition extension for content that can alternate between
 * primitive node values and nested declarative templates.
 * @public
 */
export class ViewPart extends PartBase<any> {
    public constructor(
        public readonly target: ContentTarget,
        private readonly controller: ViewController,
        private readonly targetNodeId: string,
    ) {
        super();
    }

    public unbind(): void {
        const view = this.target.$fastView;

        if (view?.isComposed) {
            view.unbind();
            view.needsBindOnly = true;
        }
    }

    protected commitValue(value: any): void {
        value ??= "";

        if (isContentTemplate(value)) {
            this.commitTemplate(value);
        } else {
            this.commitPrimitive(value);
        }
    }

    private commitTemplate(template: ContentTemplate): void {
        const target = this.target;
        const controller = this.controller;
        target.textContent = "";
        let view = target.$fastView;

        if (view === void 0) {
            if (
                isHydratable(controller) &&
                isHydratable(template) &&
                controller.bindingViewBoundaries[this.targetNodeId] !== undefined &&
                controller.hydrationStage !== HydrationStage.hydrated
            ) {
                const boundaries = controller.bindingViewBoundaries[this.targetNodeId];
                view = template.hydrate(boundaries.first, boundaries.last);
            } else {
                view = template.create();
            }
        } else if (target.$fastTemplate !== template) {
            if (view.isComposed) {
                view.remove();
                view.unbind();
            }

            view = template.create();
        }

        if (!view.isComposed) {
            view.isComposed = true;
            view.bind(controller.source, controller.context as ExecutionContext);
            view.insertBefore(target);
            target.$fastView = view;
            target.$fastTemplate = template;
        } else if (view.needsBindOnly) {
            view.needsBindOnly = false;
            view.bind(controller.source, controller.context as ExecutionContext);
        }
    }

    private commitPrimitive(value: any): void {
        const target = this.target;
        const controller = this.controller;
        const view = target.$fastView;

        if (view?.isComposed) {
            view.isComposed = false;
            view.remove();

            if (view.needsBindOnly) {
                view.needsBindOnly = false;
            } else {
                view.unbind();
            }
        }

        if (
            view === void 0 &&
            isHydratable(controller) &&
            controller.hydrationStage !== HydrationStage.hydrated
        ) {
            const boundaries = controller.bindingViewBoundaries[this.targetNodeId];

            if (boundaries !== void 0) {
                removeNodeSequence(boundaries.first, boundaries.last);
                delete controller.bindingViewBoundaries[this.targetNodeId];
            }
        }

        target.textContent = value;
    }
}

class ViewPartPonyfill implements DeclarativeViewPartPonyfill {
    public readonly kind = "view-part";

    public create(
        target: Node,
        controller: ViewController,
        targetNodeId: string,
    ): ViewPart {
        return new ViewPart(target, controller, targetNodeId);
    }
}

/**
 * Creates FAST's independently composable view-part extension.
 * @public
 */
export function viewParts(): DeclarativeViewPartPonyfill {
    return new ViewPartPonyfill();
}
