import { BaseStorage, createStorage, StorageType } from './base';

type Store = {
  memory: Memory;
};

export type Memory = { [id: string]: string };

type MemoryStorage = BaseStorage<Store> & {
  queryMemory: (searchText: string) => Promise<Memory>;
  addMemory: (content: string) => Promise<void>;
  removeMemory: (id: string) => Promise<void>;
  updateMemory: (id: string, memory: string) => Promise<void>;
};

const storage = createStorage<Store>(
  'memory-storage',
  {
    memory: {},
  },
  {
    storageType: StorageType.Local,
    liveUpdate: true,
  },
);

export const memoryStorage: MemoryStorage = {
  ...storage,
  queryMemory: async searchText => {
    //* find memory by searchText
    const { memory } = await storage.get();
    return Object.entries(memory).reduce((acc, [id, value]) => {
      if (value.includes(searchText)) {
        acc[id] = value;
      }
      return acc;
    }, {} as Memory);
  },
  addMemory: async content => {
    const { memory: memories } = await storage.get();
    const id = Object.keys(memories).length;
    await storage.set({ memory: { ...memories, [id]: content } });
  },
  removeMemory: async id => {
    const { memory: memories } = await storage.get();
    delete memories[id];
    await storage.set({ memory: memories });
  },
  updateMemory: async (id, content) => {
    const { memory: memories } = await storage.get();
    await storage.set({ memory: { ...memories, [id]: content } });
  },
};
