type Every = {
  YY: number;
  MM: number;
  DD: number;
  wd: number;
  dd: number;
  hh: number;
  mm: number;
  ss: number;
  ms: number;
};

export type Task = {
  id: string;
  persistent: boolean;
  method: (...args: any) => any;
  every: Every;
};

export type TaskTemplate = Omit<Task, "id"> & {
  persistent?: boolean;
};

export interface Storage {
  init: () => Promise<void>;
  create: (task: Task) => Promise<string>;
  delete: (id: string) => Promise<void>;
  getAll: () => Promise<Task[]>;
}

export class MetaScheduler {
  constructor(args: {
    workerData?: Record<string, unknown>;
    quantity?: number;
    dependencies?: string[];
    tasksPath?: string;
    tickDelay?: number;
    timeout?: number;
    debug?: boolean;
    storage?: Storage;
  });
  schedule(taskTemplate: TaskTemplate): Promise<string>;
  cancel(id: string): Promise<void>;
  stop(): Promise<void>;
}
