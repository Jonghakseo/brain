import { BaseStorage, createStorage, StorageType } from '@lib/storages/base';

type Setting = {
  openaiConfig: {
    frequencyPenalty: number;
    presencePenalty: number;
    maxTokens: number;
    topP: number;
    temperature: number;
  };
  extensionConfig: {
    captureQuality: number;
  };
};

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
      frequencyPenalty: 0,
      presencePenalty: 0,
      maxTokens: 300,
      topP: 1,
      temperature: 0.7,
    },
    extensionConfig: {
      captureQuality: 25,
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
