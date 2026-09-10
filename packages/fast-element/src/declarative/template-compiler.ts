import { Binding } from "../binding/binding.js";
import { oneTime } from "../binding/one-time.js";
import type { DOMPolicy } from "../dom-policy.js";
import { isFunction } from "../interfaces.js";
import type { Expression } from "../observation/observable.js";
import type { CompilationBindingFactory } from "../templating/compiler.js";
import {
    type AddViewBehaviorFactory,
    type Aspected,
    type CompiledViewBehaviorFactory,
    HTMLDirective,
    type HTMLDirectiveDefinition,
    type ViewBehaviorFactory,
} from "../templating/html-directive.js";
import { nextId } from "../templating/markup.js";
import { ViewTemplate } from "../templating/template.js";
import { PartBindingDirective } from "./part-binding-directive.js";
import type { DeclarativePonyfillRuntime } from "./ponyfills.js";

const lastAttributeNameRegex =
    /([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F "'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;

function createHTML(
    value: HTMLDirective,
    previousString: string,
    add: AddViewBehaviorFactory,
    definition: HTMLDirectiveDefinition = HTMLDirective.getForInstance(value)!,
): string {
    if (definition.aspected) {
        const match = lastAttributeNameRegex.exec(previousString);

        if (match !== null) {
            HTMLDirective.assignAspect(value as unknown as Aspected, match[2]);
        }
    }

    return value.createHTML(add);
}

/**
 * Compiles FAST's declarative syntax over independently supplied low-level parts.
 * @internal
 */
export function compileDeclarativeTemplate<TSource = any, TParent = any>(
    strings: string[],
    values: any[],
    runtime: DeclarativePonyfillRuntime,
    policy?: DOMPolicy,
): ViewTemplate<TSource, TParent> {
    let html = "";
    const factories: Record<string, ViewBehaviorFactory> = Object.create(null);
    const add = (factory: CompiledViewBehaviorFactory): string => {
        const id = factory.id ?? (factory.id = nextId());
        factories[id] = factory;
        return id;
    };
    const bindingFactory: CompilationBindingFactory = (
        expression,
        bindingPolicy,
        isVolatile,
    ) =>
        new PartBindingDirective(
            runtime.signals.binding(
                expression,
                runtime.scheduler,
                bindingPolicy,
                isVolatile,
            ),
            runtime,
        );

    for (let i = 0, ii = strings.length - 1; i < ii; ++i) {
        const currentString = strings[i];
        let currentValue = values[i];
        let definition: HTMLDirectiveDefinition | undefined;

        html += currentString;

        if (isFunction(currentValue)) {
            currentValue = bindingFactory(
                currentValue as Expression<TSource, any, TParent>,
            );
        } else if (currentValue instanceof Binding) {
            currentValue = new PartBindingDirective(currentValue, runtime);
        } else if (!(definition = HTMLDirective.getForInstance(currentValue))) {
            const staticValue = currentValue;
            currentValue = new PartBindingDirective(
                oneTime(() => staticValue),
                runtime,
            );
        }

        html += createHTML(
            currentValue as HTMLDirective,
            currentString,
            add,
            definition,
        );
    }

    return new ViewTemplate<TSource, TParent>(
        html + strings[strings.length - 1],
        factories,
        policy,
        bindingFactory,
    );
}
