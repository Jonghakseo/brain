export type Chat = {
  type: 'ai' | 'user';
  createdAt: number;
  content: {
    text?: string;
    image?: string;
  };
};
