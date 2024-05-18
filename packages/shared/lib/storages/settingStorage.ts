import { BaseStorage, createStorage, StorageType } from './base';

type Setting = {
  openaiConfig: {
    systemPrompt: string;
    frequencyPenalty: number;
    presencePenalty: number;
    maxTokens: number;
    topP: number;
    temperature: number;
  };
  extensionConfig: {
    autoCapture: boolean;
    autoToolSelection: boolean;
    autoSelectModel: boolean;
    captureQuality: number;
    forgetChatAfter: number;
    useLatestImage: boolean;
  };
};

export type OpenAIConfig = Setting['openaiConfig'];

type ThemeStorage = BaseStorage<Setting> & {
  updateOpenAIConfig: <K extends keyof Setting['openaiConfig']>(
    settingKey: K,
    value: Setting['openaiConfig'][K],
  ) => Promise<void>;
  updateExtensionConfig: <K extends keyof Setting['extensionConfig']>(
    settingKey: K,
    value: Setting['extensionConfig'][K],
  ) => Promise<void>;
};

const storage = createStorage<Setting>(
  'setting',
  {
    openaiConfig: {
      systemPrompt: 'You are chrome browser OpenAI assistant.',
      frequencyPenalty: 0,
      presencePenalty: 0,
      maxTokens: 300,
      topP: 1,
      temperature: 0.7,
    },
    extensionConfig: {
      autoCapture: false,
      autoToolSelection: false,
      autoSelectModel: false,
      useLatestImage: true,
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
  updateOpenAIConfig: async (settingKey, value) => {
    await storage.set(currentSetting => {
      return {
        ...currentSetting,
        openaiConfig: {
          ...currentSetting.openaiConfig,
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
