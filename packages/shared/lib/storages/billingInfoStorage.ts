import { BaseStorage, createStorage, StorageType } from './base';

type BillingInfo = {
  totalPrice: number;
  totalToken: number;
  tokenUsageInfo: {
    input: number;
    output: number;
  };
  requestCount: {
    total: number;
    input: number;
    output: number;
  };
};

type Model = 'gpt-3.5-turbo' | 'gpt-4o' | 'gemini' | 'gpt-4o-mini' | 'gpt-4-turbo';

type BillingInfoStorage = BaseStorage<BillingInfo> & {
  addInputTokens: (token: number, model: Model) => Promise<void>;
  addOutputTokens: (token: number, model: Model) => Promise<void>;
  reset: () => Promise<void>;
};

const storage = createStorage<BillingInfo>(
  'billings',
  {
    totalPrice: 0,
    totalToken: 0,
    tokenUsageInfo: { input: 0, output: 0 },
    requestCount: { total: 0, input: 0, output: 0 },
  },
  {
    storageType: StorageType.Local,
    liveUpdate: true,
  },
);
export const billingInfoStorage: BillingInfoStorage = {
  ...storage,
  reset: async () => {
    await storage.set({
      totalPrice: 0,
      totalToken: 0,
      tokenUsageInfo: { input: 0, output: 0 },
      requestCount: { total: 0, input: 0, output: 0 },
    });
  },
  addInputTokens: async (tokens, model) => {
    await storage.set(prev => ({
      totalPrice: prev.totalPrice + calculateInputTokenPrice(tokens, model),
      totalToken: prev.totalToken + tokens,
      tokenUsageInfo: {
        ...prev.tokenUsageInfo,
        input: prev.tokenUsageInfo.input + tokens,
      },
      requestCount: {
        ...prev.requestCount,
        total: prev.requestCount.total + 1,
        input: prev.requestCount.input + 1,
      },
    }));
  },
  addOutputTokens: async (tokens, model) => {
    await storage.set(prev => ({
      totalPrice: prev.totalPrice + calculateOutputTokenPrice(tokens, model),
      totalToken: prev.totalToken + tokens,
      tokenUsageInfo: {
        ...prev.tokenUsageInfo,
        output: prev.tokenUsageInfo.output + tokens,
      },
      requestCount: {
        ...prev.requestCount,
        total: prev.requestCount.total + 1,
        output: prev.requestCount.output + 1,
      },
    }));
  },
};

function calculateInputTokenPrice(token: number, model: Model) {
  switch (model) {
    case 'gpt-3.5-turbo':
      return token * 0.0005 * 0.001; // US$0.0005 /1K tokens
    case 'gpt-4o':
      return token * 0.005 * 0.001; // US$0.005 /1K tokens
    case 'gemini':
      return 0; // Free
    case 'gpt-4-turbo':
      return token * 0.01 * 0.001; // US$0.01 /1K tokens
    case 'gpt-4o-mini':
      return token * 0.00015 * 0.001; // US$0.00015 /1K tokens
  }
}

function calculateOutputTokenPrice(token: number, model: Model) {
  switch (model) {
    case 'gpt-3.5-turbo':
      return token * 0.0015 * 0.001; // US$0.0015 /1K tokens
    case 'gpt-4o':
      return token * 0.015 * 0.001; // US$0.015 /1K tokens
    case 'gemini':
      return 0; // Free
    case 'gpt-4o-mini':
      return token * 0.0006 * 0.001; // US$0.0006 /1K tokens
    case 'gpt-4-turbo':
      return token * 0.03 * 0.001; // US$0.03 /1K tokens
  }
}
