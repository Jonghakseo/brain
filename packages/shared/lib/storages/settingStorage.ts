import { BaseStorage, createStorage, StorageType } from './base';

type Setting = {
  llmConfig: {
    systemPrompt: string;
    maxTokens: number;
    topP: number;
    temperature: number;
  };
  extensionConfig: {
    autoCapture: boolean;
    autoToolSelection: boolean;
    autoSelectModel: boolean;
    captureQuality: number;
    detailAnalyzeImage: boolean;
    forgetChatAfter: number;
    visibleChatAfterLine: boolean;
    useLatestImage: boolean;
  };
};

export type LLMConfig = Setting['llmConfig'];

type ThemeStorage = BaseStorage<Setting> & {
  updateLLMConfig: <K extends keyof Setting['llmConfig']>(
    settingKey: K,
    value: Setting['llmConfig'][K],
  ) => Promise<void>;
  updateExtensionConfig: <K extends keyof Setting['extensionConfig']>(
    settingKey: K,
    value: Setting['extensionConfig'][K],
  ) => Promise<void>;
};

const storage = createStorage<Setting>(
  'settings',
  {
    llmConfig: {
      systemPrompt: 'You are chrome browser AI assistant.',
      maxTokens: 300,
      topP: 1,
      temperature: 0.7,
    },
    extensionConfig: {
      autoCapture: false,
      autoToolSelection: false,
      autoSelectModel: false,
      detailAnalyzeImage: true,
      useLatestImage: true,
      visibleChatAfterLine: true,
      captureQuality: 25,
      forgetChatAfter: 10,
    },
  },
  {
    storageType: StorageType.Local,
    liveUpdate: true,
  },
);

export const settingStorage: ThemeStorage = {
  ...storage,
  updateLLMConfig: async (settingKey, value) => {
    await storage.set(currentSetting => {
      return {
        ...currentSetting,
        llmConfig: {
          ...currentSetting.llmConfig,
          [settingKey]: value,
        },
      };
    });
  },
  updateExtensionConfig: async (settingKey, value) => {
    await storage.set(currentSetting => {
      return {
        ...currentSetting,
        extensionConfig: {
          ...currentSetting.extensionConfig,
          [settingKey]: value,
        },
      };
    });
  },
};
