import { Chat, sendToBackground } from '@chrome-extension-boilerplate/shared';
import { memo, useRef, useState } from 'react';
import { IconButton, Spinner, Textarea } from '@material-tailwind/react';

type ChatSendAreaProps = {
  loading: boolean;
  onSend: (input: Chat['content']) => void;
};

function ChatSendArea({ onSend, loading }: ChatSendAreaProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [text, setText] = useState('');

  const resetImage = () => {
    setImageUrl(undefined);
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const captureScreen = async () => {
    const base64 = await sendToBackground('ScreenCapture');
    setImageUrl(base64);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (!e.metaKey && e.key === 'Enter') {
      formRef.current?.requestSubmit();
      e.preventDefault();
    }
  };

  const sendMessage = () => {
    onSend({ text, image: imageUrl });
    setText('');
    resetImage();
  };

  return (
    <form
      ref={formRef}
      onSubmit={e => {
        e.preventDefault();
        sendMessage();
      }}
      className="flex w-full flex-row items-center gap-2 rounded-[24px] border border-gray-900/10 bg-gray-900/5 p-2">
      <div className="flex flex-col">
        <IconButton variant="text" className="rounded-full" onClick={captureScreen}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-5 w-5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
        </IconButton>
        {imageUrl && (
          <IconButton onClick={resetImage} variant="text" className="rounded-full flex items-center content-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconButton>
        )}
      </div>
      {imageUrl && (
        <div className="rounded-md relative flex shrink-0 items-center">
          <img src={imageUrl} className="h-12 w-fit rounded-md" alt="screen capture" />
        </div>
      )}
      <Textarea
        rows={1}
        resize={false}
        onChange={onChange}
        onKeyDown={onKeyDown}
        value={text}
        placeholder="Your Message"
        className="min-h-full !border-0 transition-all"
        containerProps={{ className: 'grid h-full  min-w-[120px]' }}
        labelProps={{ className: 'before:content-none after:content-none' }}
      />
      <div className="shrink-0">
        {loading ? (
          <Spinner color="indigo" className="h-5 w-5" />
        ) : (
          <IconButton disabled={!imageUrl && !text} variant="text" className="rounded-full" onClick={sendMessage}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              className="h-5 w-5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </IconButton>
        )}
      </div>
    </form>
  );
}

export default memo(ChatSendArea);