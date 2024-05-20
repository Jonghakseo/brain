import { BaseStorage, createStorage, StorageType } from './base';
import { Chat } from '../message';

export type ConversationLoadingPlaceholder = '++LOADING++';

export const LOADING_PLACEHOLDER: ConversationLoadingPlaceholder = '++LOADING++';
export const DONE_PLACEHOLDER = '++DONE++';
export const SAVE_PLACEHOLDER = '++SAVE++';

type Conversation = {
  chats: Chat[];
};

type ConversationStorage = BaseStorage<Conversation> & {
  save: (chat: Chat) => Promise<Chat[]>;
  saveUserChat: (content: Chat['content']) => Promise<void>;
  startAIChat: () => Promise<number>;
  updateAIChat: (createdAt: number, text: string) => Promise<void>;
  updateLastAIChat: (text: string | ((prev: string) => string)) => Promise<void>;
  getLastAIChat: () => Promise<Chat | undefined>;
  deleteChat: (createdAt: number) => Promise<void>;
  reset: () => Promise<void>;
  removeAllPlaceholder: (type: 'loading', to?: string) => Promise<void>;
};

const storage = createStorage<Conversation>(
  'conversations',
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
      chats: [...prev.chats, { type: 'ai', createdAt, content: { text: LOADING_PLACEHOLDER } }],
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
  deleteChat: async createdAt => {
    await storage.set(prev => ({
      ...prev,
      chats: prev.chats.filter(chat => chat.createdAt !== createdAt),
    }));
  },
  updateLastAIChat: async textOrUpdate => {
    await storage.set(prev => {
      const lastAIChatIndex = prev.chats
        .map((chat, index) => ({ chat, index }))
        .filter(({ chat }) => chat.type === 'ai')
        .map(({ index }) => index)
        .pop();
      if (lastAIChatIndex === undefined) {
        return prev;
      }
      const lastAIChat = prev.chats[lastAIChatIndex];
      const updatedText =
        typeof textOrUpdate === 'function' ? textOrUpdate(lastAIChat.content.text ?? '') : textOrUpdate;
      return {
        ...prev,
        chats: [
          ...prev.chats.slice(0, lastAIChatIndex),
          { ...lastAIChat, content: { text: updatedText } },
          ...prev.chats.slice(lastAIChatIndex + 1),
        ],
      };
    });
  },
  getLastAIChat: async () => {
    const { chats } = await storage.get();
    const lastAIChat = chats
      .map((chat, index) => ({ chat, index }))
      .filter(({ chat }) => chat.type === 'ai')
      .map(({ chat }) => chat)
      .pop();
    return lastAIChat;
  },
  removeAllPlaceholder: async (type, to = '') => {
    if (type === 'loading') {
      await storage.set(prev => ({
        ...prev,
        chats: prev.chats?.map(chat => {
          if (chat.content.text?.includes(LOADING_PLACEHOLDER)) {
            return { ...chat, content: { text: chat.content.text.replace(LOADING_PLACEHOLDER, to) } };
          }
          return chat;
        }),
      }));
    }
  },
};
