import { BaseStorage, createStorage, StorageType } from './base';

type Tool = {
  name: string;
  description: string;
  isActivated: boolean;
};

type Tools = Tool[];

type ToolsStorage = BaseStorage<Tools> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerTools: (zodFunctions: any[]) => Promise<void>;
  activateTool: (name: string) => Promise<void>;
  deactivateTool: (name: string) => Promise<void>;
  hasTool: (name: string) => Promise<boolean>;
  getTools: () => Promise<Tools>;
  getActivatedTools: () => Promise<Tools>;
};

const storage = createStorage<Tools>('tools-storage-key', [], {
  storageType: StorageType.Local,
  liveUpdate: true,
});

export const toolsStorage: ToolsStorage = {
  ...storage,
  registerTools: async zodFunctions => {
    const tools: Tools = zodFunctions.map(zodFunction => ({
      // openai RunnableToolFunction
      ...zodFunction.function,
      isActivated: true,
    }));
    await storage.set(tools);
  },
  activateTool: async name => {
    await storage.set(prev => {
      return prev.map(t => {
        if (t.name === name) {
          return { ...t, isActivated: true };
        }
        return t;
      });
    });
  },
  deactivateTool: async tool => {
    await storage.set(prev => {
      return prev.map(t => {
        if (t.name === tool) {
          return { ...t, isActivated: false };
        }
        return t;
      });
    });
  },
  getTools: async () => {
    return storage.get();
  },
  getActivatedTools: async () => {
    return (await storage.get()).filter(t => t.isActivated);
  },
  hasTool: async name => {
    const tools = await storage.get();
    return tools.some(t => t.name === name);
  },
};
