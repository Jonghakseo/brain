import { BaseStorage, createStorage, StorageType } from './base';
import { Chat } from '../message';

type Conversation = {
  chats: Chat[];
};

type ConversationStorage = BaseStorage<Conversation> & {
  save: (chat: Chat) => Promise<Chat[]>;
  saveUserChat: (content: Chat['content']) => Promise<void>;
  saveAIChat: (text: string) => Promise<void>;
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
  saveAIChat: async text => {
    await storage.set(prev => ({
      ...prev,
      chats: [...prev.chats, { type: 'ai', createdAt: Date.now(), content: { text } }],
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
