import { BaseStorage, createStorage, StorageType } from './base';

type BillingInfo = {
  totalPrice: number;
  totalToken: number;
  tokenUsageInfo: {
    input: number;
    output: number;
  };
};

type BillingInfoStorage = BaseStorage<BillingInfo> & {
  addInputTokens: (token: number) => Promise<void>;
  addOutputTokens: (token: number) => Promise<void>;
  reset: () => Promise<void>;
};

const storage = createStorage<BillingInfo>(
  'billing-storage-key',
  { totalPrice: 0, totalToken: 0, tokenUsageInfo: { input: 0, output: 0 } },
  {
    storageType: StorageType.Local,
    liveUpdate: true,
  },
);

export const billingInfoStorage: BillingInfoStorage = {
  ...storage,
  reset: async () => {
    await storage.set({ totalPrice: 0, totalToken: 0, tokenUsageInfo: { input: 0, output: 0 } });
  },
  addInputTokens: async tokens => {
    await storage.set(prev => ({
      totalPrice: prev.totalPrice + calculateInputTokenPrice(tokens),
      totalToken: prev.totalToken + tokens,
      tokenUsageInfo: {
        ...prev.tokenUsageInfo,
        input: prev.tokenUsageInfo.input + tokens,
      },
    }));
  },
  addOutputTokens: async tokens => {
    await storage.set(prev => ({
      totalPrice: prev.totalPrice + calculateOutputTokenPrice(tokens),
      totalToken: prev.totalToken + tokens,
      tokenUsageInfo: {
        ...prev.tokenUsageInfo,
        output: prev.tokenUsageInfo.output + tokens,
      },
    }));
  },
};

function calculateInputTokenPrice(token: number) {
  return token * 0.005 * 0.001; // US$0.005 /1K tokens
}

function calculateOutputTokenPrice(token: number) {
  return token * 0.015 * 0.001; // US$0.015 /1K tokens
}
