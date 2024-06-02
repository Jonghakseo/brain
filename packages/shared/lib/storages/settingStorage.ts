import { BaseStorage, createStorage, StorageType } from './base';

type Setting = {
  llmConfig: {
    model: 'gemini-1.5-flash' | 'gpt-4o' | 'gpt-3.5-turbo';
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
    useDictionaryReplace: boolean;
  };
};

export type LLMConfig = Setting['llmConfig'];
export type ExtensionConfig = Setting['extensionConfig'];

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
      model: 'gpt-4o',
      systemPrompt:
        '너는 크롬 브라우저의 AI 어시스턴트이고, Chrome 브라우저의 API를 사용할 수 있어. 편하게 말하고 되도록이면 한국어를 써줘',
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
      /**@deprecated */
      useDictionaryReplace: true,
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
