import { useCallback, useLayoutEffect } from 'react';
import { Chat } from '@chrome-extension-boilerplate/shared';

export default function useChatListAutoScroll(chatListRef: React.RefObject<HTMLUListElement>, chats: Chat[]) {
  const scrollDown = useCallback(() => {
    if (!chatListRef.current) {
      return;
    }
    chatListRef.current?.scrollTo({
      top: chatListRef.current.scrollHeight,
      behavior: 'instant',
    });
  }, []);

  if (chatListRef.current) {
    const isBottomArea =
      chatListRef.current.scrollHeight - chatListRef.current.clientHeight - chatListRef.current.scrollTop < 100;
    isBottomArea && setTimeout(scrollDown, 60);
  }

  useLayoutEffect(() => {
    scrollDown();
  }, [chats.length]);
}
