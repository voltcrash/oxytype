import type { Redis } from "ioredis";
import {
  type BulkJobOptions,
  type JobsOptions,
  Queue,
  type QueueOptions,
} from "bullmq";

export class MonkeyQueue<T> {
  private jobQueue: Queue | undefined;
  public readonly queueName: string;
  private queueOpts: Omit<QueueOptions, "connection">;

  constructor(queueName: string, queueOpts: Omit<QueueOptions, "connection">) {
    this.queueName = queueName;
    this.queueOpts = queueOpts;
  }

  init(redisConnection?: Redis): void {
    if (this.jobQueue !== undefined || !redisConnection) {
      return;
    }

    this.jobQueue = new Queue(this.queueName, {
      ...this.queueOpts,
      connection: redisConnection,
    });
  }

  async add(taskName: string, task: T, jobOpts?: JobsOptions): Promise<void> {
    if (this.jobQueue === undefined) {
      return;
    }

    await this.jobQueue.add(taskName, task, jobOpts);
  }

  async getJobCounts(): Promise<Record<string, number>> {
    if (this.jobQueue === undefined) {
      return {};
    }

    return await this.jobQueue.getJobCounts();
  }

  async addBulk(
    tasks: { name: string; data: T; opts?: BulkJobOptions }[],
  ): Promise<void> {
    if (this.jobQueue === undefined) {
      return;
    }

    await this.jobQueue.addBulk(tasks);
  }
}
