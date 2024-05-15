import Layout from '@src/components/Layout';
import ChattingForm from '@src/components/ChattingForm';
import { Chat, conversationStorage, sendToBackground, useStorage } from '@chrome-extension-boilerplate/shared';
import { useCallback, useDeferredValue } from 'react';

export default function Home() {
  const { chats } = useStorage(conversationStorage);
  const deferredChats = useDeferredValue(chats);

  const sendChat = useCallback(
    async (content: Chat['content']) => {
      await conversationStorage.saveUserChat(content);
      const responseText = await sendToBackground('Chat', { content, history: deferredChats });
      await conversationStorage.saveAIChat(responseText);
    },
    [deferredChats],
  );

  return (
    <Layout>
      <ChattingForm chats={deferredChats} sendChat={sendChat} />
    </Layout>
  );
}
