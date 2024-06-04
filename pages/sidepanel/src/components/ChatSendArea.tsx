import {
  calculateImageFileSize,
  Chat,
  conversationStorage,
  sendToBackground,
  settingStorage,
  useStorage,
} from '@chrome-extension-boilerplate/shared';
import { memo, useEffect, useRef, useState } from 'react';
import { Button, IconButton, Spinner, Textarea } from '@material-tailwind/react';
import PopoverWithHover from '@src/components/PopoverWithHover';

type ChatSendAreaProps = {
  loading: boolean;
  onSend: (input: Chat['content']) => void;
};

function ChatSendArea({ onSend, loading }: ChatSendAreaProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [text, setText] = useState('');
  const { extensionConfig } = useStorage(settingStorage);
  const { autoCapture } = extensionConfig;

  useEffect(() => {
    if (!autoCapture) {
      return;
    }

    const id = setInterval(async () => {
      if (!loading) {
        const base64 = await sendToBackground('ScreenCapture');
        setImageUrl(base64);
      }
    }, 500);

    return () => clearInterval(id);
  }, [autoCapture]);

  const resetImage = () => {
    setImageUrl(undefined);
    imageRef.current!.value = '';
  };

  const resetInput = () => {
    setText('');
    resetImage();
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    debouncedSuggest.cancel();
    setText(e.target.value);
  };

  const captureScreen = async () => {
    if (autoCapture) {
      return;
    }
    const base64 = await sendToBackground('ScreenCapture');
    setImageUrl(base64);
  };

  const onChangeImageInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await new Promise<string | undefined>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      setImageUrl(base64);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (e.shiftKey || e.metaKey) {
      return;
    }
    switch (e.key) {
      case 'Enter': {
        formRef.current?.requestSubmit();
        e.preventDefault();
        return;
      }
      case 'Tab': {
        debouncedSuggest.call('Suggest', text).then(text => {
          setText(prev => prev + text);
        });
        e.preventDefault();
        return;
      }
    }
  };

  const sendMessage = async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    try {
      const base64 = autoCapture ? await sendToBackground('ScreenCapture') : imageUrl;
      if (base64) {
        const kb = calculateImageFileSize(base64);
        const { width: w, height: h } = await calculateImageSize(base64);
        onSend({ text, image: { base64, kb, w, h } });
      } else {
        onSend({ text });
      }
    } finally {
      loadingRef.current = false;
      resetInput();
    }
  };

  const abortChat = async () => {
    try {
      await sendToBackground('Abort');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={e => {
        e.preventDefault();
        if (loading) {
          return;
        }
        void sendMessage();
      }}
      className="flex w-full flex-row items-center gap-2 rounded-[24px] border border-gray-900/10 bg-gray-900/5 p-2 relative">
      {/*<Button*/}
      {/*  size="sm"*/}
      {/*  variant="gradient"*/}
      {/*  color="red"*/}
      {/*  className="top-[-12px] z-10 flex items-center gap-3 !absolute left-[50%] transform translate-x-[-50%]"*/}
      {/*  onClick={abortChat}>*/}
      {/*  <svg*/}
      {/*    xmlns="http://www.w3.org/2000/svg"*/}
      {/*    fill="none"*/}
      {/*    viewBox="0 0 24 24"*/}
      {/*    strokeWidth={2}*/}
      {/*    stroke="currentColor"*/}
      {/*    className="h-4 w-4">*/}
      {/*    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />*/}
      {/*  </svg>*/}
      {/*</Button>*/}
      <div className="flex flex-col">
        <PopoverWithHover
          contentClassName="!left-2"
          content={<div className="p-1 text-sm">{autoCapture ? 'Auto Capture is enabled' : 'Capture screen'}</div>}>
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
        </PopoverWithHover>
        {autoCapture || (
          <PopoverWithHover contentClassName="!left-2" content={<div className="p-1 text-sm">Upload Image</div>}>
            <input type="file" accept="image/*" className="hidden" ref={imageRef} onChange={onChangeImageInput} />
            <IconButton
              variant="text"
              className="rounded-full"
              onClick={async () => {
                imageRef.current?.click();
              }}>
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
                  d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15"
                />
              </svg>
            </IconButton>
          </PopoverWithHover>
        )}
      </div>
      {imageUrl && (
        <div className="rounded-md relative flex shrink-0 items-center">
          <img src={imageUrl} className="h-12 w-fit rounded-md" alt="screen capture" />
          {autoCapture || (
            <IconButton
              onClick={resetImage}
              variant="text"
              size="sm"
              className="rounded-full flex items-center content-center !absolute left-[50%] transform translate-x-[-50%] !bg-white !bg-opacity-60">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="h-3 w-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </IconButton>
          )}
        </div>
      )}
      <Textarea
        rows={2}
        resize={false}
        onChange={onChange}
        onKeyDown={onKeyDown}
        value={text}
        placeholder="Your Message (Tab: Suggest)"
        className="min-h-full !border-0 transition-all"
        containerProps={{ className: 'grid h-full  min-w-[120px]' }}
        labelProps={{ className: 'before:content-none after:content-none' }}
      />
      <div className="shrink-0 invisible sm:visible">
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

const calculateImageSize = (base64Image: string) => {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.src = base64Image;
    image.onload = () => {
      resolve({ width: image.width / window.devicePixelRatio, height: image.height / window.devicePixelRatio });
    };
    image.onerror = reject;
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debounce = <F extends (...args: any[]) => any>(fn: F, delay: number) => {
  let timeout: number;
  const cancel = () => clearTimeout(timeout);
  return {
    cancel,
    call: (...args: Parameters<F>) => {
      return new Promise((resolve, reject) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => {
          try {
            resolve(fn(...args));
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    },
  };
};

const debouncedSuggest = debounce(sendToBackground, 500);
