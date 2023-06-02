"use strict";

const { ThreadPool } = require("./src/pool");
const crypto = require("crypto");
const { sleep, checkTaskReady } = require("./src/utils");
const { parseEvery } = require("metautil");
const { FileStorage } = require("./src/storage");
const MAX_QUEUE_TIME_RANGE = 1000 * 60 * 60 * 24;
const TICK_DELAY = 100;

class MetaScheduler {
  constructor({
    workerData,
    quantity,
    dependencies,
    tasksPath,
    tickDelay = TICK_DELAY,
    timeout,
    debug = false,
    storage = new FileStorage({ tasksPath }),
  } = {}) {
    this.pool = new ThreadPool({
      workerData,
      quantity,
      dependencies,
      timeout,
      debug,
    });
    this.storage = storage;
    this.tickDelay = tickDelay;
    this.queue = [];
    this.debug = debug;
    this.finished = false;
  }

  async start() {
    await this.storage.init();
    const tasks = await this.storage.getAll();
    const expiredTasks = tasks.filter((task) =>
      task.every.YY > -1
        ? checkTaskReady(task.every, new Date(), this.tickDelay)
        : false
    );
    const expiredIds = expiredTasks.map(({ id }) => id);
    await Promise.all(expiredIds.map((id) => this.storage.delete(id)));
    const validTasks = tasks.filter(({ id }) => !expiredIds.includes(id));
    this.queue.push(...validTasks);
    process.on("SIGINT", async () => {
      this.finished = true;
      await this.pool.shutdown();
    });
    this.loop();
  }

  async stop() {
    this.finished = true;
    await this.pool.shutdown();
  }

  async loop() {
    const startTime = Date.now();
    while (!this.finished) {
      await sleep(this.tickDelay);
      if (this.debug) {
        console.log(`Time passed ${(Date.now() - startTime) / 1000}`);
      }
      this.queue = this.queue.filter(Boolean);
      for (let i = 0; i < this.queue.length; i++) {
        this.handle(this.queue[i], i);
      }
    }
  }

  async handle({ id, method, every, persistent }, index) {
    if (!checkTaskReady(every, new Date(), this.tickDelay)) return;
    if (every.YY) {
      this.queue[index] = null;
      if (persistent) this.storage.delete(id);
    }
    this.pool.post(method);
  }

  async cancel(id) {
    const task = this.queue.find((task) => task.id);
    if (!task) return;
    this.queue = this.queue.filter((task) => task.id !== id);
    if (task.persistent) await this.storage.delete(id);
  }

  prepareTask({ persistent = true, every, method }) {
    return {
      id: crypto.randomBytes(16).toString("hex"),
      persistent,
      method: method.toString(),
      every: typeof every === "string" ? parseEvery(every) : every,
    };
  }

  async schedule(task) {
    const preparedTask = this.prepareTask(task);
    if (preparedTask.persistent) {
      await this.storage.create(preparedTask);
    }
    this.queue.push(preparedTask);
    return preparedTask.id;
  }
}

module.exports = { MetaScheduler };
