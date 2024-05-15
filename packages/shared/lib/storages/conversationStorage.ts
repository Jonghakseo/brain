import { BaseStorage, createStorage, StorageType } from './base';
import { Chat } from '../message';

type Conversation = {
  chats: Chat[];
};

type ConversationStorage = BaseStorage<Conversation> & {
  save: (chat: Chat) => Promise<Chat[]>;
  saveUserChat: (content: Chat['content']) => Promise<void>;
  startAIChat: () => Promise<number>;
  updateAIChat: (createAt: number, text: string) => Promise<void>;
  reset: () => Promise<void>;
};

const storage = createStorage<Conversation>(
  'conversation-storage-key',
  { chats: [] },
  {
    storageType: StorageType.Local,
    liveUpdate: true,
  },
);

export const conversationStorage: ConversationStorage = {
  ...storage,
  save: async chat => {
    await storage.set(prev => ({
      ...prev,
      chats: [...prev.chats, chat],
    }));
    const { chats } = await storage.get();
    return chats;
  },
  startAIChat: async () => {
    const createdAt = Date.now();
    await storage.set(prev => ({
      ...prev,
      chats: [...prev.chats, { type: 'ai', createdAt, content: { text: '' } }],
    }));
    return createdAt;
  },
  updateAIChat: async (createdAt, text) => {
    await storage.set(prev => ({
      ...prev,
      chats: prev.chats.map(chat => (chat.createdAt === createdAt ? { ...chat, content: { text } } : chat)),
    }));
  },
  saveUserChat: async content => {
    await storage.set(prev => ({
      ...prev,
      chats: [...prev.chats, { type: 'user', createdAt: Date.now(), content }],
    }));
  },
  reset: async () => {
    await storage.set({ chats: [] });
  },
};
