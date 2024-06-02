import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, CardBody, IconButton } from '@material-tailwind/react';
import { Chat, conversationStorage, settingStorage, useStorage } from '@chrome-extension-boilerplate/shared';
import ChatBox from '@src/components/ChatBox';
import ChatProfile from '@src/components/ChatProfile';
import ChatSendArea from '@src/components/ChatSendArea';
import useChatListAutoScroll from '@src/hooks/useChatListAutoScroll';

type ChattingFormProps = {
  chats: Chat[];
  sendChat: (content: Chat['content']) => Promise<void>;
};

function ChattingForm({ chats, sendChat }: ChattingFormProps) {
  const chatListRef = useRef<HTMLUListElement>(null);
  const [loading, setLoading] = useState(false);
  const {
    extensionConfig: { forgetChatAfter, visibleChatAfterLine },
  } = useStorage(settingStorage);

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
          <ChatProfile type="ai" />
          <Card className="w-auto max-w-[90%]">
            <CardBody className="p-4 text-pretty">
              <ChatBox createdAt={-1} text="Hello! I'm your browser assistant. How can I help you?" />
            </CardBody>
          </Card>
        </li>
        {chats.map((chat, index) => {
          const isUser = chat.type === 'user';
          const showForgetGuideLine = visibleChatAfterLine && index === chats.length - forgetChatAfter;
          return (
            <Fragment key={chat.createdAt}>
              {showForgetGuideLine && <ForgetGuideline forgetChatAfter={forgetChatAfter} />}
              <li className="flex flex-row gap-4 items-start">
                {!isUser && <ChatProfile type="ai" createdAt={chat.createdAt} />}
                <Card className={'w-auto max-w-[90%]' + (isUser ? ' ml-auto' : '')}>
                  <CardBody className="p-4 text-pretty">
                    <ChatBox createdAt={chat.createdAt} text={chat.content.text} image={chat.content.image} />
                  </CardBody>
                </Card>
                {isUser && <ChatProfile type="user" />}
              </li>
            </Fragment>
          );
        })}
      </ul>
      <div className="mt-auto">
        <ChatSendArea onSend={handleSendChatMessage} loading={loading} />
      </div>
    </div>
  );
}

export default ChattingForm;

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

function ForgetGuideline({ forgetChatAfter }: { forgetChatAfter: number }) {
  const deleteBeforeThis = () => {
    void conversationStorage.set(prev => {
      return { ...prev, chats: prev.chats.slice(-forgetChatAfter) };
    });
  };

  return (
    <div className="flex items-center gap-2 py-1">
      <hr className="flex-grow border-gray-900/10" />
      <IconButton
        size="sm"
        variant="text"
        color="indigo"
        className="w-5 h-5 rounded-sm"
        onClick={() => settingStorage.updateExtensionConfig('forgetChatAfter', forgetChatAfter + 1)}>
        ↑
      </IconButton>
      <hr className="flex-grow border-gray-900/10" />
      <Button
        size="sm"
        color="black"
        variant="text"
        className="py-0.5 px-1 runded-sm text-xs"
        onClick={deleteBeforeThis}>
        delete until now
      </Button>
      <hr className="flex-grow border-gray-900/10" />
      <IconButton
        size="sm"
        variant="text"
        color="indigo"
        className="w-5 h-5 rounded-sm"
        onClick={() => settingStorage.updateExtensionConfig('forgetChatAfter', Math.max(forgetChatAfter - 1, 1))}>
        ↓
      </IconButton>
      <hr className="flex-grow border-gray-900/10" />
    </div>
  );
}

function useForceRerenderWhenMounted() {
  const [, setTick] = useState(0);
  useEffect(() => {
    setTimeout(() => setTick(tick => tick + 1), 10);
  }, []);
}
