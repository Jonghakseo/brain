import Layout from '@src/components/Layout';
import ChattingForm from '@src/components/ChattingForm';
import {
  Chat,
  conversationStorage,
  LOADING_PLACEHOLDER,
  sendToBackground,
  useStorage,
} from '@chrome-extension-boilerplate/shared';
import { useCallback, useDeferredValue, useEffect } from 'react';
import ProgramBadges from '@src/components/ProgramBadges';

export default function Chat() {
  const { chats } = useStorage(conversationStorage);

  useEffect(() => {
    void conversationStorage.removeAllPlaceholder('loading');
  }, []);

  const deferredChats = useDeferredValue(chats);

  const sendChat = useCallback(async (content: Chat['content']) => {
    try {
      const { chats: history } = await conversationStorage.get();
      await conversationStorage.saveUserChat(content);
      await sendToBackground('Chat', { content, history });
    } catch (e) {
      console.warn(JSON.stringify(e, null, 2));
      const message =
        // eslint-disable-next-line
        (e as Error)?.message || (e as any)?.error?.message || (e as any)?.response?.candidates[0]['finishReason'];
      const errorTemplate = 'ERROR!\n```shell\n' + message + '\n```';
      void conversationStorage.updateLastAIChat(prev => {
        return prev.replaceAll(LOADING_PLACEHOLDER, '') + '\n' + errorTemplate;
      });
    }
  }, []);

  return (
    <Layout>
      <ProgramBadges />
      <ChattingForm chats={deferredChats} sendChat={sendChat} />
    </Layout>
  );
}
