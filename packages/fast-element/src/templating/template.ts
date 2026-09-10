import type { DOMPolicy } from "../dom-policy.js";
import { Message } from "../interfaces.js";
import { FAST, makeSerializationNoop } from "../platform.js";
import { type CompilationBindingFactory, Compiler } from "./compiler.js";
import type {
    CompiledViewBehaviorFactory,
    ViewBehaviorFactory,
} from "./html-directive.js";
import type { ElementView, HTMLView, SyntheticView } from "./view.js";

/**
 * A template capable of creating views specifically for rendering custom elements.
 * @public
 */
export interface ElementViewTemplate<TSource = any, TParent = any> {
    /**
     * Creates an ElementView instance based on this template definition.
     * @param hostBindingTarget - The element that host behaviors will be bound to.
     */
    create(hostBindingTarget: Element): ElementView<TSource, TParent>;

    /**
     * Creates an HTMLView from this template, binds it to the source, and then appends it to the host.
     * @param source - The data source to bind the template to.
     * @param host - The Element where the template will be rendered.
     * @param hostBindingTarget - An HTML element to target the host bindings at if different from the
     * host that the template is being attached to.
     */
    render(
        source: TSource,
        host: Node,
        hostBindingTarget?: Element,
    ): ElementView<TSource, TParent>;
}

/**
 * A template capable of hydrating an element view from existing DOM nodes.
 * @beta
 */
export interface HydratableElementViewTemplate<TSource = any, TParent = any>
    extends ElementViewTemplate<TSource, TParent> {
    hydrate(
        firstChild: Node,
        lastChild: Node,
        hostBindingTarget?: Element,
    ): ElementView<TSource, TParent>;
}

/**
 * A marker interface used to capture types when interpolating Directive helpers
 * into templates.
 * @public
 */
// biome-ignore lint/correctness/noUnusedVariables: Type parameters carry template source and parent inference.
export interface CaptureType<TSource = any, TParent = any> {}

/**
 * A template capable of rendering views not specifically connected to custom elements.
 * @public
 */
export interface SyntheticViewTemplate<TSource = any, TParent = any> {
    /**
     * Creates a SyntheticView instance based on this template definition.
     */
    create(): SyntheticView<TSource, TParent>;
}

/**
 * A template capable of hydrating a synthetic view from existing DOM nodes.
 * @beta
 */
export interface HydratableSyntheticViewTemplate<TSource = any, TParent = any>
    extends SyntheticViewTemplate {
    hydrate(firstChild: Node, lastChild: Node): SyntheticView<TSource, TParent>;
}

/**
 * The result of a template compilation operation.
 * @public
 */
export interface HTMLTemplateCompilationResult<TSource = any, TParent = any> {
    /**
     * Creates a view instance.
     * @param hostBindingTarget - The host binding target for the view.
     */
    createView(hostBindingTarget?: Element): HTMLView<TSource, TParent>;

    readonly factories: CompiledViewBehaviorFactory[];
}

/**
 * A template capable of creating HTMLView instances or rendering directly to DOM.
 * @public
 */
export class ViewTemplate<TSource = any, TParent = any>
    implements
        ElementViewTemplate<TSource, TParent>,
        SyntheticViewTemplate<TSource, TParent>
{
    private result: HTMLTemplateCompilationResult<TSource, TParent> | null = null;
    /**
     * The html representing what this template will
     * instantiate, including placeholders for directives.
     */
    public readonly html: string | HTMLTemplateElement;

    /**
     * The directives that will be connected to placeholders in the html.
     */
    public readonly factories: Record<string, ViewBehaviorFactory>;

    /**
     * Creates an instance of ViewTemplate.
     * @param html - The html representing what this template will instantiate, including placeholders for directives.
     * @param factories - The directives that will be connected to placeholders in the html.
     * @param policy - The security policy to use when compiling this template.
     */
    public constructor(
        html: string | HTMLTemplateElement,
        factories: Record<string, ViewBehaviorFactory> = {},
        private policy?: DOMPolicy,
        private bindingFactory?: CompilationBindingFactory,
    ) {
        this.html = html;
        this.factories = factories;
    }

    /**
     * @internal
     */
    public compile() {
        if (this.result === null) {
            this.result = Compiler.compile<TSource, TParent>(
                this.html,
                this.factories,
                this.policy,
                this.bindingFactory,
            );
        }

        return this.result;
    }

    /**
     * Sets the DOMPolicy for this template.
     * @param policy - The policy to associated with this template.
     * @returns The modified template instance.
     * @remarks
     * The DOMPolicy can only be set once for a template and cannot be
     * set after the template is compiled.
     */
    public withPolicy(policy: DOMPolicy): this {
        if (this.result) {
            throw FAST.error(Message.cannotSetTemplatePolicyAfterCompilation);
        }

        if (this.policy) {
            throw FAST.error(Message.onlySetTemplatePolicyOnce);
        }

        this.policy = policy;
        return this;
    }

    /**
     * Creates an HTMLView from this template, binds it to the source, and then appends it to the host.
     * @param source - The data source to bind the template to.
     * @param host - The Element where the template will be rendered.
     * @param hostBindingTarget - An HTML element to target the host bindings at if different from the
     * host that the template is being attached to.
     */
    public render(
        source: TSource,
        host: Node,
        hostBindingTarget?: Element,
    ): HTMLView<TSource, TParent> {
        const view = this.create(hostBindingTarget);
        view.bind(source);
        view.appendTo(host);
        return view;
    }

    /**
     * Creates an HTMLView instance based on this template definition.
     * @param hostBindingTarget - The element that host behaviors will be bound to.
     */
    public create(hostBindingTarget?: Element): HTMLView<TSource, TParent> {
        return this.compile().createView(hostBindingTarget);
    }
}

makeSerializationNoop(ViewTemplate);
