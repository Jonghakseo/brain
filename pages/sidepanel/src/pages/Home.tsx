import Layout from '@src/components/Layout';
import ChattingForm from '@src/components/ChattingForm';
import {
  Chat,
  conversationStorage,
  LOADING_PLACEHOLDER,
  sendToBackground,
  useStorage,
} from '@chrome-extension-boilerplate/shared';
import { useCallback, useDeferredValue } from 'react';

export default function Home() {
  const { chats } = useStorage(conversationStorage);
  const deferredChats = useDeferredValue(chats);

  const sendChat = useCallback(async (content: Chat['content']) => {
    try {
      const { chats: history } = await conversationStorage.get();
      await conversationStorage.saveUserChat(content);
      await sendToBackground('Chat', { content, history });
    } catch (e) {
      console.warn(JSON.stringify(e, null, 2));
      // eslint-disable-next-line
      const message = (e as Error).message || (e as any).error.message;
      const errorTemplate = 'ERROR!\n```shell\n' + message + '\n```';
      void conversationStorage.updateLastAIChat(prev => {
        return prev.replaceAll(LOADING_PLACEHOLDER, '') + '\n' + errorTemplate;
      });
    }
  }, []);

  return (
    <Layout>
      <ChattingForm chats={deferredChats} sendChat={sendChat} />
    </Layout>
  );
}
