import { BaseStorage, createStorage, StorageType } from './base';

type Tool = {
  category?: string;
  name: string;
  description: string;
  isActivated: boolean;
};

type Tools = Tool[];

type ToolsStorage = BaseStorage<Tools> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerTools: (maybeZodFunctions: any[]) => Promise<void>;
  activateTool: (name: string) => Promise<void>;
  deactivateTool: (name: string) => Promise<void>;
  hasTool: (name: string) => Promise<boolean>;
  getTools: () => Promise<Tools>;
  getActivatedTools: () => Promise<Tools>;
  deactivateAllTools: () => Promise<void>;
  toggleAllByCategory: (category: string, isActive: boolean) => Promise<void>;
};

const storage = createStorage<Tools>('tools', [], {
  storageType: StorageType.Local,
  liveUpdate: true,
});

export const toolsStorage: ToolsStorage = {
  ...storage,
  registerTools: async maybeZodFunctions => {
    const newTools: Tools = maybeZodFunctions.map(maybeZodFunction => ({
      // openai RunnableToolFunction
      ...maybeZodFunction.function,
      category: maybeZodFunction.category,
      isActivated: false,
    }));
    await storage.set(prev => {
      if (!prev) {
        return newTools;
      }
      const tools: Tools = [];
      newTools.forEach(newTool => {
        // if the tool is not already in the list, add it
        if (!prev.some(t => t.name === newTool.name)) {
          tools.push(newTool);
        } else {
          // if the tool is already in the list, update it
          tools.push(prev.find(t => t.name === newTool.name) as Tool);
        }
      });
      return tools;
    });
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
  deactivateAllTools: async () => {
    await storage.set(prev => {
      return prev.map(t => {
        return { ...t, isActivated: false };
      });
    });
  },
  toggleAllByCategory: async (category, isActive) => {
    await storage.set(prev => {
      return prev.map(t => {
        if (t.category === category) {
          return { ...t, isActivated: isActive };
        }
        return t;
      });
    });
  },
};
