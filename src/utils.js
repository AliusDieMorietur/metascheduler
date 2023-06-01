'use strict';

const DURATION_UNITS = {
  hh: 60 * 60 * 1000, // hours
  mm: 60 * 1000, // minutes
  ss: 1000, // seconds
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const WORKER_EVENTS = {
  SUCCESS: 'success',
  ERROR: 'error',
};

const TICK_DELAY = 100;

const checkTaskReady = (every, date = new Date(), tickDelay = TICK_DELAY) => {
  const absoluteFields = ['YY', 'MM', 'wd', 'DD', 'hh', 'mm', 'ss', 'ms'];
  const now = {
    YY: date.getUTCFullYear(),
    MM: date.getUTCMonth() + 1,
    DD: date.getUTCDate(),
    wd: date.getUTCDay() + 1,
    hh: date.getUTCHours(),
    mm: date.getUTCMinutes(),
    ss: date.getUTCSeconds(),
    ms: date.getUTCMilliseconds(),
  };
  if (every.YY > -1) {
    for (const field of absoluteFields) {
      const value = every[field];
      const nowValue = now[field];
      if (value > -1) {
        if (value < nowValue) return true;
        if (value > nowValue) return false;
      }
    }
  }
  const everyFields = ['hh', 'mm', 'ss', 'ms'];
  if (every.wd > -1) {
    if (every.MM !== now.MM) return false;
    if (every.wd !== now.wd) return false;
    for (const field of everyFields) {
      const value = every[field];
      const nowValue = now[field];
      if (value > -1 && value < nowValue) return true;
    }
  }
  if (every.MM > -1 && every.MM !== now.MM) return false;
  if (every.MM > -1 && every.wd !== now.wd) return false;
  const everyMs = everyFields.reduce(
    (acc, cur) =>
      every[cur] && every[cur] !== -1
        ? acc + every[cur] * DURATION_UNITS[cur]
        : acc,
    0,
  );
  const nowMs = Number(date);

  return nowMs % everyMs < tickDelay;
};

const dateToEvery = (date = new Date()) => ({
  YY: date.getUTCFullYear(),
  MM: date.getUTCMonth() + 1,
  DD: date.getUTCDate(),
  wd: date.getUTCDay() + 1,
  hh: date.getUTCHours(),
  mm: date.getUTCMinutes(),
  ss: date.getUTCSeconds(),
  ms: date.getUTCMilliseconds(),
});

module.exports = { sleep, WORKER_EVENTS, checkTaskReady, dateToEvery };
