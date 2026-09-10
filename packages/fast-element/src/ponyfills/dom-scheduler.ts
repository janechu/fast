import type { DeclarativeDOMSchedulerPonyfill } from "../declarative/ponyfills.js";
import type { Callable } from "../interfaces.js";
import { Updates } from "../observation/update-queue.js";

interface ScheduledTask {
    readonly target: Node;
    readonly task: Callable;
    readonly order: number;
}

function invoke(task: Callable): void {
    (task as any).call();
}

function getShadowIncludingPath(node: Node): Node[] {
    const path: Node[] = [];
    let current: Node | null = node;

    while (current !== null) {
        path.push(current);

        if (current.parentNode !== null) {
            current = current.parentNode;
        } else {
            const root = current.getRootNode();
            current = root instanceof ShadowRoot ? root.host : null;
        }
    }

    return path.reverse();
}

function compareTasks(left: ScheduledTask, right: ScheduledTask): number {
    if (left.target === right.target) {
        return left.order - right.order;
    }

    const leftPath = getShadowIncludingPath(left.target);
    const rightPath = getShadowIncludingPath(right.target);

    if (leftPath[0] !== rightPath[0]) {
        return left.order - right.order;
    }

    const sharedLength = Math.min(leftPath.length, rightPath.length);
    let index = 0;

    while (index < sharedLength && leftPath[index] === rightPath[index]) {
        index++;
    }

    if (index === leftPath.length) {
        return -1;
    }

    if (index === rightPath.length) {
        return 1;
    }

    const leftBranch = leftPath[index];
    const rightBranch = rightPath[index];

    if (leftBranch instanceof ShadowRoot) {
        return -1;
    }

    if (rightBranch instanceof ShadowRoot) {
        return 1;
    }

    const position = leftBranch.compareDocumentPosition(rightBranch);

    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
    }

    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
    }

    return left.order - right.order;
}

class DOMSchedulerPonyfill implements DeclarativeDOMSchedulerPonyfill {
    public readonly kind = "dom-scheduler";
    private readonly tasks = new Map<Callable, Map<Node, ScheduledTask>>();
    private readonly waiters: Array<() => void> = [];
    private order = 0;
    private pending = false;
    private processing = false;

    public constructor(private readonly usePlatformQueue: boolean) {}

    public enqueue(target: Node, task: Callable): void {
        let targets = this.tasks.get(task);

        if (targets === void 0) {
            targets = new Map();
            this.tasks.set(task, targets);
        }

        if (!targets.has(target)) {
            targets.set(target, { target, task, order: this.order++ });
        }

        if (!this.pending && !this.processing) {
            this.pending = true;
            this.requestFlush();
        }
    }

    public cancel(task: Callable): void {
        this.tasks.delete(task);
    }

    public next(): Promise<void> {
        return new Promise(resolve => {
            this.waiters.push(resolve);

            if (!this.pending && !this.processing) {
                this.pending = true;
                this.requestFlush();
            }
        });
    }

    public flush(): void {
        if (this.processing) {
            return;
        }

        this.pending = false;
        this.processing = true;
        let processed = 0;
        let firstError: unknown;

        try {
            drain: while (this.tasks.size > 0) {
                const batch: ScheduledTask[] = [];

                for (const targets of this.tasks.values()) {
                    batch.push(...targets.values());
                }

                this.tasks.clear();

                while (batch.length > 0) {
                    batch.sort(compareTasks);
                    const entry = batch.shift()!;

                    try {
                        invoke(entry.task);
                    } catch (error) {
                        firstError ??= error;
                    }

                    if (++processed > 10000) {
                        this.tasks.clear();
                        firstError ??= new Error(
                            "Declarative DOM scheduler exceeded its flush limit.",
                        );
                        break drain;
                    }
                }
            }

            if (firstError !== void 0) {
                throw firstError;
            }
        } finally {
            this.processing = false;

            for (const resolve of this.waiters.splice(0)) {
                resolve();
            }
        }
    }

    public call(): void {
        this.flush();
    }

    private requestFlush(): void {
        if (!this.usePlatformQueue) {
            Updates.enqueue(this as Callable);
            return;
        }

        const platformScheduler = (globalThis as any).scheduler;

        if (platformScheduler?.postTask) {
            platformScheduler.postTask(() => this.flush(), {
                priority: "user-visible",
            });
        } else {
            queueMicrotask(() => this.flush());
        }
    }
}

/**
 * Options for the DOM scheduler ponyfill.
 * @public
 */
export interface DOMSchedulerOptions {
    /**
     * Uses `scheduler.postTask()` or a microtask directly instead of preserving
     * ordering with FAST's current observable update queue.
     */
    platformQueue?: boolean;
}

/**
 * Creates a tree-aware DOM effect scheduler ponyfill.
 * @param options - Controls integration with the current FAST update queue.
 * @public
 */
export function domScheduler(
    options: DOMSchedulerOptions = {},
): DeclarativeDOMSchedulerPonyfill {
    return new DOMSchedulerPonyfill(options.platformQueue === true);
}
