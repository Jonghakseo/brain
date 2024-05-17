export type Chat = {
  type: 'ai' | 'user';
  createdAt: number;
  content: {
    text?: string;
    image?: { base64: string; w?: number; h?: number; kb: number };
  };
};
