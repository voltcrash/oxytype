import { encode, statement } from "../db/client";
import { stage } from "../db/mutation";
import { newId } from "../utils/id";
type JobOptions = {
  jobId?: string;
  delay?: number;
  backoff?: unknown;
  attempts?: number;
};
/** Durable delivery outbox. Cron publishes committed rows to Cloudflare Queues. */
export class MonkeyQueue<T> {
  public readonly queueName: string;
  constructor(
    queueName: string,
    _options?: { defaultJobOptions?: Record<string, unknown> },
  ) {
    this.queueName = queueName;
  }
  init(_connection?: unknown): void {
    /* Bindings are invocation scoped. */
  }
  async add(taskName: string, task: T, options?: JobOptions): Promise<void> {
    const id = options?.jobId ?? newId();
    if (options?.delay !== undefined) {
      await stage(
        statement(
          "INSERT INTO scheduled_jobs(id,type,due_at,data) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING",
          id,
          taskName,
          Date.now() + Math.max(0, options.delay),
          encode(task),
        ),
      );
    } else {
      await stage(
        statement(
          "INSERT INTO outbox(id,type,created_at,data) VALUES(?,?,?,?) ON CONFLICT(id) DO NOTHING",
          id,
          this.queueName,
          Date.now(),
          encode(task),
        ),
      );
    }
  }
  async getJobCounts(): Promise<Record<string, number>> {
    return {
      pending:
        (await statement(
          "SELECT count(*) AS count FROM outbox WHERE type=? AND completed_at IS NULL",
          this.queueName,
        ).first<number>("count")) ?? 0,
    };
  }
  async addBulk(
    tasks: { name: string; data: T; opts?: JobOptions }[],
  ): Promise<void> {
    for (const task of tasks) await this.add(task.name, task.data, task.opts);
  }
}
