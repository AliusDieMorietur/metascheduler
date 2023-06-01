'use strict';

const { existsSync, mkdirSync } = require('node:fs');
const { readdir, readFile, writeFile, rm } = require('node:fs/promises');
const path = require('node:path');

const TASKS_PATH = './tasks';

class FileStorage {
  constructor({ tasksPath = TASKS_PATH } = {}) {
    this.tasksPath = tasksPath;
  }

  async init() {
    if (existsSync(this.tasksPath)) return;
    mkdirSync(this.tasksPath);
  }

  async create(task) {
    const fileName = `${task.id}.json`;
    const filePath = path.join(this.tasksPath, fileName);
    return writeFile(filePath, JSON.stringify(task));
  }

  async delete(id) {
    const fileName = `${id}.json`;
    const filePath = path.join(this.tasksPath, fileName);
    return rm(filePath);
  }

  async getAll() {
    const tasksFiles = await readdir(this.tasksPath);
    return Promise.all(
      tasksFiles.map((taskFile) =>
        readFile(path.join(this.tasksPath, taskFile)).then(JSON.parse),
      ),
    );
  }
}

module.exports = { FileStorage };
