import Layout from '@src/components/Layout';
import ChattingForm from '@src/components/ChattingForm';
import { Chat, conversationStorage, sendToBackground, useStorage } from '@chrome-extension-boilerplate/shared';
import { useCallback, useDeferredValue, useEffect, useState } from 'react';

export default function Home() {
  useForceRenderWhenMounted();
  const { chats } = useStorage(conversationStorage);
  const deferredChats = useDeferredValue(chats);

  const sendChat = useCallback(async (content: Chat['content']) => {
    const { chats: history } = await conversationStorage.get();
    await conversationStorage.saveUserChat(content);
    await sendToBackground('Chat', { content, history });
  }, []);

  return (
    <Layout>
      <ChattingForm chats={deferredChats} sendChat={sendChat} />
    </Layout>
  );
}

// for fix markdown syntax highlighting bug
const useForceRenderWhenMounted = () => {
  const [, forceRender] = useState(0);
  useEffect(() => {
    forceRender(prev => prev + 1);
  }, []);
};
