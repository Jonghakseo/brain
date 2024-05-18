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

type BillingInfoStorage = BaseStorage<BillingInfo> & {
  addInputTokens: (token: number, isGPT3?: boolean) => Promise<void>;
  addOutputTokens: (token: number, isGPT3?: boolean) => Promise<void>;
  reset: () => Promise<void>;
};

const storage = createStorage<BillingInfo>(
  'billing-storage',
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
  addInputTokens: async (tokens, isGPT3) => {
    await storage.set(prev => ({
      totalPrice: prev.totalPrice + calculateInputTokenPrice(tokens, isGPT3),
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
  addOutputTokens: async (tokens, isGPT3) => {
    await storage.set(prev => ({
      totalPrice: prev.totalPrice + calculateOutputTokenPrice(tokens, isGPT3),
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

function calculateInputTokenPrice(token: number, isGPT3?: boolean) {
  if (isGPT3) {
    return token * 0.0005 * 0.001; // US$0.0005 /1K tokens
  }
  return token * 0.005 * 0.001; // US$0.005 /1K tokens
}

function calculateOutputTokenPrice(token: number, isGPT3?: boolean) {
  if (isGPT3) {
    return token * 0.0015 * 0.001; // US$0.0015 /1K tokens
  }
  return token * 0.015 * 0.001; // US$0.015 /1K tokens
}
