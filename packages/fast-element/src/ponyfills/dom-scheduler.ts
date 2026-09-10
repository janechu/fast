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

function compareTasks(left: ScheduledTask, right: ScheduledTask): number {
    if (left.target === right.target) {
        return left.order - right.order;
    }

    if (left.target.contains(right.target)) {
        return -1;
    }

    if (right.target.contains(left.target)) {
        return 1;
    }

    const position = left.target.compareDocumentPosition(right.target);

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
    private readonly tasks = new Map<Callable, ScheduledTask>();
    private readonly waiters: Array<() => void> = [];
    private order = 0;
    private pending = false;
    private processing = false;

    public constructor(private readonly usePlatformQueue: boolean) {}

    public enqueue(target: Node, task: Callable): void {
        if (!this.tasks.has(task)) {
            this.tasks.set(task, { target, task, order: this.order++ });
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
                const batch = Array.from(this.tasks.values()).sort(compareTasks);
                this.tasks.clear();

                for (const entry of batch) {
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
