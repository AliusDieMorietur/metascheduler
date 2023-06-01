'use strict';

const DEFAULT_THREADS_QUANTITY = 10;

const threads = require('worker_threads');
const { WORKER_EVENTS } = require('./utils');
const { Worker } = threads;

class ThreadPool {
  constructor({
    quantity,
    timeout,
    workerData,
    dependencies = [],
    debug = false,
  } = {}) {
    this.dependencies = dependencies;
    this.workerData = workerData;
    this.quantity = quantity ?? DEFAULT_THREADS_QUANTITY;
    this.timeout = timeout || Infinity;
    this.debug = debug;
    this.queue = [];
    this.workers = {};
    this.free = Object.keys(this.workers);
    for (let i = 0; i < this.quantity; i++) {
      this.addWorker();
    }
  }

  addWorker() {
    const worker = new Worker(
      `
      'use strict';
      const vm = require('node:vm');
      const { parentPort, workerData, threadId } 
        = require('node:worker_threads');
      
      const context = {
        ...workerData,
        ${this.dependencies.join(',')}
      };
      
      vm.createContext(context);
      
      parentPort.on('message', async (msg) => {
        let timer = null;
        const script = new vm.Script(msg);
        const fn = script.runInContext(context);
        if (${this.timeout} !== Infinity) {
          timer = setTimeout(() => {
            timer = null;
            throw new Error('Task is timed out');
          }, ${this.timeout});
        }
        await fn();
        if (timer) clearTimeout(timer);
        timer = null;
        parentPort.postMessage({ 
          event: '${WORKER_EVENTS.SUCCESS}', 
          payload: { 
            threadId
          } 
        });
      });`,
      { workerData: this.workerData, eval: true },
    );

    worker.on('message', (message) => {
      if (this.debug) {
        console.log(`Finish from worker ${worker.threadId}`);
      }
      if (!message.event) return;
      if (message.event === WORKER_EVENTS.SUCCESS) {
        this.release(worker.threadId);
        this.takeNext();
      }
    });

    worker.on('error', (error) => {
      if (this.debug) {
        console.log(`Finish from worker ${worker.threadId}`);
      }
      console.log(error);
      delete this.workers[worker.threadId];
      this.addWorker();
      this.takeNext();
    });
    this.workers[worker.threadId] = worker;
    this.free.push(worker.threadId);
    return worker;
  }

  takeNext() {
    if (this.queue.length === 0) return;
    const task = this.queue.shift();
    const id = this.free.shift();
    const worker = this.workers[id];
    if (!worker) {
      this.queue.unshift(task);
      return;
    }
    if (this.debug) {
      console.log(`Post to worker #${id}`);
    }
    worker.postMessage(task);
  }

  release(id) {
    this.free.push(id);
  }

  post(message) {
    if (this.free.length === 0) {
      this.queue.push(message);
      return;
    }
    const id = this.free.shift();
    const worker = this.workers[id];
    if (this.debug) {
      console.log(`Post to worker #${id}`);
    }
    worker.postMessage(message);
  }

  shutdown() {
    return Promise.all(
      Object.values(this.workers).map(async (worker) => {
        const id = worker.threadId;
        await worker.terminate();
        console.log(`Worker #${id} was terminated`);
      }),
    );
  }
}

module.exports = { ThreadPool };
