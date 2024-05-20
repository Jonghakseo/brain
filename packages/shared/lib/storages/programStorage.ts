import { BaseStorage, createStorage, StorageType } from './base';

type Store = {
  programs: Program[];
  runners: Runner[];
};

export type Runner = {
  id: string;
  status: 'idle' | 'running' | 'error';
  runningProgramId?: string;
};

export type Program = {
  id: string;
  name: string;
  steps: Array<{ id: string | number; tools?: string[]; whatToDo: string }>;
  isPinned: boolean;
  useRecord?: boolean;
  __records?: {
    createdAt?: number;
    history?: unknown[];
    isUseful?: boolean;
  };
};

type ProgramStorage = BaseStorage<Store> & {
  createProgram: (program: Program) => Promise<void>;
  callProgram: (params: { programId: string; runnerId: string }) => Promise<void>;
  getProgram: (id: string) => Promise<Program>;
  finishProgram: (params: { programId: string; runnerId: string }) => Promise<void>;
  updateProgram: (id: string, program: Partial<Program>) => Promise<void>;
  removeProgram: (id: string) => Promise<void>;
};

const storage = createStorage<Store>(
  'programStorage',
  {
    runners: [],
    programs: [],
  },
  {
    storageType: StorageType.Local,
    liveUpdate: true,
  },
);

export const programStorage: ProgramStorage = {
  ...storage,
  createProgram: async program => {
    await storage.set(currentStore => {
      currentStore.programs.push(program);
      return currentStore;
    });
  },
  callProgram: async ({ programId, runnerId }) => {
    const { runners, programs } = await storage.get();
    const program = programs.find(p => p.id === programId);
    if (!program) {
      throw new Error(`Program with id ${programId} not found`);
    }
    const runnerIndex = runners.findIndex(r => r.id === runnerId);
    if (runnerIndex === -1) {
      throw new Error(`Runner with id ${runnerId} not found`);
    }
    await storage.set(currentStore => {
      currentStore.runners[runnerIndex].status = 'running';
      currentStore.runners[runnerIndex].runningProgramId = programId;
      return currentStore;
    });
  },
  finishProgram: async ({ programId, runnerId }) => {
    const { runners, programs } = await storage.get();
    const program = programs.find(p => p.id === programId);
    if (!program) {
      throw new Error(`Program with id ${programId} not found`);
    }
    const runnerIndex = runners.findIndex(r => r.id === runnerId);
    if (runnerIndex === -1) {
      throw new Error(`Runner with id ${runnerId} not found`);
    }
    await storage.set(currentStore => {
      currentStore.runners[runnerIndex].status = 'idle';
      currentStore.runners[runnerIndex].runningProgramId = undefined;
      return currentStore;
    });
  },
  updateProgram: async (id, program) => {
    await storage.set(currentStore => {
      const index = currentStore.programs.findIndex(p => p.id === id);
      if (index === -1) {
        return currentStore;
      }
      return {
        ...currentStore,
        programs: currentStore.programs.map((p, i) => (i === index ? { ...p, ...program } : p)),
      };
    });
  },
  removeProgram: async id => {
    await storage.set(currentStore => {
      return {
        ...currentStore,
        programs: currentStore.programs.filter(p => p.id !== id),
      };
    });
  },
  getProgram: async id => {
    const { programs } = await storage.get();
    const program = programs.find(p => p.id === id);
    if (!program) {
      throw new Error(`Program with id ${id} not found`);
    }
    return program;
  },
};
