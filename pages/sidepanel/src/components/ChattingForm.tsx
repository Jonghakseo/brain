import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, CardBody } from '@material-tailwind/react';
import { Chat, conversationStorage } from '@chrome-extension-boilerplate/shared';
import ChatBox from '@src/components/ChatBox';
import ChatProfile from '@src/components/ChatProfile';
import ChatSendArea from '@src/components/ChatSendArea';
import useChatListAutoScroll from '@src/hooks/useChatListAutoScroll';

type ChattingFormProps = {
  chats: Chat[];
  sendChat: (content: Chat['content']) => Promise<void>;
};

export default function ChattingForm({ chats, sendChat }: ChattingFormProps) {
  const chatListRef = useRef<HTMLUListElement>(null);
  const [loading, setLoading] = useState(false);

  useChatListAutoScroll(chatListRef, chats);
  // FIXME: This is hacky way to fix chatbox markdown rendering [Object] bug
  useForceRerenderWhenMounted();

  const handleSendChatMessage = useCallback(
    async (content: Chat['content']) => {
      setLoading(true);
      await sendChat(content);
      setLoading(false);
    },
    [sendChat],
  );

  return (
    <div className="flex flex-col gap-2 max-h-full h-full">
      <ResetButton />
      <ul
        ref={chatListRef}
        className="border rounded-[24px] border-gray-900/10 flex-grow p-5 flex flex-col gap-4 overflow-y-scroll overflow-x-hidden relative">
        <li className="flex flex-row gap-4 items-start">
          <Card className="w-auto max-w-[90%]">
            <CardBody className="p-4 text-pretty">
              <ChatBox text="Hello! I'm your browser assistant. How can I help you?" />
            </CardBody>
          </Card>
          <ChatProfile type="ai" />
        </li>
        {chats.map(chat => {
          const isUser = chat.type === 'user';
          return (
            <li key={chat.createdAt} className="flex flex-row gap-4 items-start">
              {!isUser && <ChatProfile type="ai" />}
              <Card className={'w-auto max-w-[90%]' + (isUser ? ' ml-auto' : '')}>
                <CardBody className="p-4 text-pretty">
                  <ChatBox text={chat.content.text} image={chat.content.image} />
                </CardBody>
              </Card>
              {isUser && <ChatProfile type="user" />}
            </li>
          );
        })}
      </ul>
      <div className="mt-auto">
        <ChatSendArea onSend={handleSendChatMessage} loading={loading} />
      </div>
    </div>
  );
}

function ResetButton() {
  return (
    <Button
      size="sm"
      variant="gradient"
      className="!fixed right-1 top-12 z-10 flex items-center gap-3"
      onClick={() => conversationStorage.reset()}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="h-4 w-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    </Button>
  );
}

function useForceRerenderWhenMounted() {
  const [, setTick] = useState(0);
  useEffect(() => {
    setTimeout(() => setTick(tick => tick + 1), 10);
  }, []);
}
