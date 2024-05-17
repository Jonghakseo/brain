import Layout from '@src/components/Layout';
import ChattingForm from '@src/components/ChattingForm';
import { Chat, conversationStorage, sendToBackground, useStorage } from '@chrome-extension-boilerplate/shared';
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
      console.warn(e);
      console.warn(JSON.stringify(e));
    }
  }, []);

  return (
    <Layout>
      <ChattingForm chats={deferredChats} sendChat={sendChat} />
    </Layout>
  );
}
