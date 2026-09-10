/**
 * Core APIs for building standards-based Web Components with FAST Element.
 * @packageDocumentation
 */

// Binding
export { Binding, type BindingDirective } from "./binding/binding.js";
export { normalizeBinding } from "./binding/normalize.js";
export { oneTime } from "./binding/one-time.js";
export { listener, oneWay } from "./binding/one-way.js";
export { Signal, signal } from "./binding/signal.js";
export {
    type TwoWayBindingOptions,
    TwoWaySettings,
    twoWay,
} from "./binding/two-way.js";
// Components
export {
    AttributeConfiguration,
    AttributeDefinition,
    type AttributeMode,
    attr,
    booleanConverter,
    type DecoratorAttributeConfiguration,
    nullableBooleanConverter,
    nullableNumberConverter,
    type ValueConverter,
} from "./components/attributes.js";
export type { ElementControllerStrategy } from "./components/element-controller.js";
export {
    ElementController,
    Stages,
} from "./components/element-controller.js";
export type {
    FASTElementExtension,
    FASTElementTemplateResolver,
    PartialFASTElementDefinition,
    ShadowRootOptions,
    TypeDefinition,
    TypeRegistry,
} from "./components/fast-definitions.js";
export { FASTElementDefinition } from "./components/fast-definitions.js";
export {
    customElement,
    FASTElement,
    type FASTElementConstructor,
} from "./components/fast-element.js";
export {
    type FASTElementRegistry,
    fastElementRegistry,
} from "./components/fast-element-registry.js";
export { enableDebug } from "./debug.js";
export { DOM, DOMAspect, type DOMSink } from "./dom.js";
export {
    type DOMAspectGuards,
    type DOMElementGuards,
    type DOMGuards,
    DOMPolicy,
    type DOMPolicyOptions,
    type DOMSinkGuards,
} from "./dom-policy.js";
export type {
    Callable,
    Class,
    Constructable,
    Disposable,
    TrustedTypesPolicy,
} from "./interfaces.js";
export {
    ArrayObserver,
    type LengthObserver,
    lengthOf,
    Sort,
    type SortObserver,
    Splice,
    SpliceStrategy,
    SpliceStrategySupport,
    sortedCount,
} from "./observation/arrays.js";
// Observation
export {
    type Notifier,
    PropertyChangeNotifier,
    type Subscriber,
    SubscriberSet,
} from "./observation/notifier.js";
export type {
    Accessor,
    Expression,
    ExpressionController,
    ExpressionNotifier,
    ExpressionObserver,
    ObservationRecord,
} from "./observation/observable.js";
export {
    ExecutionContext,
    Observable,
    observable,
    SourceLifetime,
} from "./observation/observable.js";
export { type UpdateQueue, Updates } from "./observation/update-queue.js";
export { volatile } from "./observation/volatile.js";
export { emptyArray, FAST } from "./platform.js";
export {
    type AccessCachedPath,
    type CachedPath,
    type CachedPathCommon,
    type CachedPathMap,
    type ChildrenMap,
    type DefaultCachedPath,
    type EventCachedPath,
    type JSONSchema,
    type JSONSchemaCommon,
    type JSONSchemaDefinition,
    type RegisterPathConfig,
    type RepeatCachedPath,
    Schema,
    schemaRegistry,
} from "./schema.js";
export * from "./state/exports.js";
// Styles
export { type CSSTemplateTag, type CSSValue, css } from "./styles/css.js";
export {
    CSSDirective,
    type CSSDirectiveDefinition,
    cssDirective,
} from "./styles/css-directive.js";
export type {
    ComposableStyles,
    ConstructibleStyleStrategy,
} from "./styles/element-styles.js";
export { ElementStyles } from "./styles/element-styles.js";
export type { HostBehavior, HostController } from "./styles/host.js";
export type { StyleStrategy, StyleTarget } from "./styles/style-strategy.js";
// Declarative runtime extension contracts
export type {
    ViewBehavior,
    ViewBehaviorFactory,
    ViewBehaviorTargets,
    ViewController,
} from "./templating/html-directive.js";
export type {
    CaptureType,
    ElementViewTemplate,
    HTMLTemplateCompilationResult,
    SyntheticViewTemplate,
} from "./templating/template.js";
export type {
    ElementView,
    SyntheticView,
    View,
} from "./templating/view.js";
export * from "./utilities.js";
