"use strict";

const metatests = require("metatests");
const { existsSync } = require("node:fs");
const { readFile, rm, rmdir } = require("node:fs/promises");
const { MetaScheduler } = require("../metascheduler");
const { sleep, dateToEvery } = require("../src/utils");
const crypto = require("crypto");

metatests.test("Should create date task", async (test) => {
  const delay = 2000;
  const now = Date.now();
  const correction = 1000;

  const data = {
    testFileName: `test${crypto.randomBytes(16).toString("hex")}.txt`,
    testString: "TEST",
    tasksPath: `tasks${crypto.randomBytes(16).toString("hex")}`,
  };

  const m = new MetaScheduler({
    quantity: 2,
    tasksPath: data.tasksPath,
    workerData: {
      data,
    },
    dependencies: ["require"],
    timeout: 2000,
  });

  await m.start();

  const task = async () => {
    const { writeFile } = require("node:fs/promises");
    await writeFile(data.testFileName, data.testString);
  };

  m.schedule({
    method: task,
    every: dateToEvery(new Date(now + delay)),
  });

  await sleep(delay + correction);

  const value = await readFile(data.testFileName, { encoding: "utf-8" });

  await m.stop();

  await rm(data.testFileName);

  await rmdir(data.tasksPath);

  test.strictSame(value, data.testString);
  test.end();
});

metatests.test("Should timeout task", async (test) => {
  const delay = 1000;
  const now = Date.now();
  const correction = 3000;

  const data = {
    testFileName: `test${crypto.randomBytes(16).toString("hex")}.txt`,
    testString: "TEST",
    tasksPath: `tasks${crypto.randomBytes(16).toString("hex")}`,
  };

  const m = new MetaScheduler({
    quantity: 2,
    tasksPath: data.tasksPath,
    workerData: {
      data,
    },
    dependencies: ["require", "setTimeout", "console"],
    timeout: 2000,
  });

  await m.start();

  const task = async () => {
    const { writeFile } = require("node:fs/promises");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await writeFile(data.testFileName, data.testString);
  };

  m.schedule({
    method: task,
    every: dateToEvery(new Date(now + delay)),
  });

  await sleep(delay + correction);

  const isFileCreated = existsSync(data.testFileName);

  await m.stop();

  await rmdir(data.tasksPath);

  test.assert(!isFileCreated);
  test.end();
});

metatests.test("Should cancel task", async (test) => {
  const delay = 1000;
  const now = Date.now();
  const correction = 1000;

  const data = {
    testFileName: `test${crypto.randomBytes(16).toString("hex")}.txt`,
    testString: "TEST",
    tasksPath: `tasks${crypto.randomBytes(16).toString("hex")}`,
  };

  const m = new MetaScheduler({
    quantity: 2,
    tasksPath: data.tasksPath,
    workerData: {
      data,
    },
    dependencies: ["require"],
    timeout: 2000,
  });

  await m.start();

  const task = async () => {
    const { writeFile } = require("node:fs/promises");
    await writeFile(data.testFileName, data.testString);
  };

  const id = await m.schedule({
    method: task,
    every: dateToEvery(new Date(now + delay)),
  });

  await m.cancel(id);

  await sleep(delay + correction);

  const isFileCreated = existsSync(data.testFileName);

  await m.stop();

  await rmdir(data.tasksPath);

  test.assert(!isFileCreated);
  test.end();
});

metatests.test("Should create every task", async (test) => {
  const every = {
    ss: 1,
  };
  const delay = 3500;

  const data = {
    testFileName: `test${crypto.randomBytes(16).toString("hex")}.txt`,
    tasksPath: `tasks${crypto.randomBytes(16).toString("hex")}`,
  };

  const m = new MetaScheduler({
    quantity: 2,
    tasksPath: data.tasksPath,
    workerData: {
      data,
    },
    dependencies: ["require"],
    timeout: 2000,
    debug: true,
  });

  await m.start();

  const task = async () => {
    const { writeFile, readFile } = require("node:fs/promises");
    const { existsSync } = require("node:fs");
    const isFileExists = existsSync(data.testFileName);
    let counter = 0;
    if (isFileExists) {
      counter = Number(await readFile(data.testFileName));
    }
    await writeFile(data.testFileName, String(counter + 1));
  };

  const id = await m.schedule({
    method: task,
    every,
  });

  await sleep(delay);

  const value = await readFile(data.testFileName, { encoding: "utf-8" });

  await m.cancel(id);

  await m.stop();

  await rm(data.testFileName);

  await rmdir(data.tasksPath);

  test.strictSame(value, "3");
  test.end();
});

// // should install pg to work with test properly
// // metatests.test('Should get from db', async (test) => {
// //   const delay = 1000;
// //   const now = Date.now();
// //   const correction = 1000;

// //   const data = {
// //     testFileName: `test${crypto.randomBytes(16).toString('hex')}.txt`,
// //     testString: 'TEST',
// //     tasksPath: `tasks${crypto.randomBytes(16).toString('hex')}`,
// //   };

// //   const m = new MetaScheduler({
// //     quantity: 2,
// //     tasksPath: data.tasksPath,
// //     workerData: {
// //       data,
// //     },
// //     dependencies: ['require', 'console'],
// //     timeout: 2000,
// //   });

// // await m.start();

// //   const task = async () => {
// //     const { writeFile } = require('node:fs/promises');
// //     // eslint-disable-next-line import/no-unresolved
// //     const { Pool } = require('pg');
// //     const pool = new Pool({
// //       host: 'localhost',
// //       port: 5432,
// //       database: 'handy',
// //       user: 'postgres',
// //       password: 'postgres_password',
// //     });

// //     const s = await pool
// //       .query('SELECT $1::text as text', [data.testString])
// //       .then((res) => res.rows[0].text);

// //     await writeFile(data.testFileName, s);
// //   };

// //   m.schedule({
// //     method: task,
// //     every: dateToEvery(new Date(now + delay)),
// //   });

// //   await sleep(delay + correction);

// //   const value = await readFile(data.testFileName, { encoding: 'utf-8' });

// //   await m.stop();

// //   await rm(data.testFileName);

// //   await rmdir(data.tasksPath);

// //   test.strictSame(value, data.testString);
// //   test.end();
// // });

metatests.test("Should handle multiple task simultaneously", async (test) => {
  const every = { ss: 1 };
  const delay1 = 1000;
  const delay2 = 2000;
  const delay3 = 3000;
  const now = Date.now();
  const sleepDelay = 4500;

  const data = {
    testFileName1: `test${crypto.randomBytes(16).toString("hex")}.txt`,
    testFileName2: `test${crypto.randomBytes(16).toString("hex")}.txt`,
    testFileName3: `test${crypto.randomBytes(16).toString("hex")}.txt`,
    testFileName4: `test${crypto.randomBytes(16).toString("hex")}.txt`,
    testFileName5: `test${crypto.randomBytes(16).toString("hex")}.txt`,
    testFileName6: `test${crypto.randomBytes(16).toString("hex")}.txt`,
    testString: "TEST",
    tasksPath: `tasks${crypto.randomBytes(16).toString("hex")}`,
  };

  const m = new MetaScheduler({
    quantity: 2,
    tasksPath: data.tasksPath,
    workerData: {
      data,
    },
    dependencies: ["require"],
    timeout: 2000,
    debug: true,
  });

  await m.start();

  const task1 = async () => {
    const { writeFile } = require("node:fs/promises");
    await writeFile(data.testFileName1, String(data.testString));
  };

  const task2 = async () => {
    const { writeFile } = require("node:fs/promises");
    await writeFile(data.testFileName2, String(data.testString));
  };

  const task3 = async () => {
    const { writeFile } = require("node:fs/promises");
    await writeFile(data.testFileName3, String(data.testString));
  };

  const task4 = async () => {
    const { writeFile } = require("node:fs/promises");
    await writeFile(data.testFileName4, String(data.testString));
  };

  const task5 = async () => {
    const { writeFile } = require("node:fs/promises");
    await writeFile(data.testFileName5, String(data.testString));
  };

  const task6 = async () => {
    const { writeFile } = require("node:fs/promises");
    await writeFile(data.testFileName6, String(data.testString));
  };

  const id1 = await m.schedule({
    method: task1,
    every,
  });

  const id2 = await m.schedule({
    method: task2,
    every,
  });

  const id3 = await m.schedule({
    method: task3,
    every,
  });

  m.schedule({
    method: task4,
    every: dateToEvery(new Date(now + delay1)),
  });

  m.schedule({
    method: task5,
    every: dateToEvery(new Date(now + delay2)),
  });

  m.schedule({
    method: task6,
    every: dateToEvery(new Date(now + delay3)),
  });

  await sleep(sleepDelay);

  await m.cancel(id1);
  await m.cancel(id2);
  await m.cancel(id3);

  await m.stop();

  const value1 = await readFile(data.testFileName1, { encoding: "utf-8" });
  const value2 = await readFile(data.testFileName2, { encoding: "utf-8" });
  const value3 = await readFile(data.testFileName3, { encoding: "utf-8" });
  const value4 = await readFile(data.testFileName4, { encoding: "utf-8" });
  const value5 = await readFile(data.testFileName5, { encoding: "utf-8" });
  const value6 = await readFile(data.testFileName6, { encoding: "utf-8" });

  test.strictSame(value1, data.testString);
  test.strictSame(value2, data.testString);
  test.strictSame(value3, data.testString);
  test.strictSame(value4, data.testString);
  test.strictSame(value5, data.testString);
  test.strictSame(value6, data.testString);

  await rmdir(data.tasksPath);
  await rm(data.testFileName1);
  await rm(data.testFileName2);
  await rm(data.testFileName3);
  await rm(data.testFileName4);
  await rm(data.testFileName5);
  await rm(data.testFileName6);

  test.end();
});
