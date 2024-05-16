import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useEffect, useState } from 'react';
import { Button, IconButton, Spinner } from '@material-tailwind/react';
import ImageViewModal from '@src/components/ImageViewModal';
import remarkGfm from 'remark-gfm';
import { Chat } from '@chrome-extension-boilerplate/shared';

type ChatBoxProps = {
  className?: string;
  image?: Chat['content']['image'];
  text?: Chat['content']['text'];
};

export default function ChatBox({ className = '', image, text }: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);

  // for fix markdown syntax highlighting bug
  useForceRenderWhenMounted();

  return (
    <div className={`${className ?? ''} flex flex-row gap-2 relative`}>
      {image && (
        <Button
          variant="outlined"
          className="rounded-md relative flex items-center !border-0 !p-0"
          onClick={() => setIsOpen(true)}>
          <img src={image.base64} className="h-16 w-fit rounded-md" alt="screen capture" />
        </Button>
      )}
      {image && <ImageViewModal image={image} isOpen={isOpen} onClose={() => setIsOpen(false)} />}
      {!image && !text && <Spinner color="indigo" className="h-5 w-5" />}
      <Markdown
        className="whitespace-normal max-w-full"
        remarkPlugins={[remarkGfm]}
        components={{
          a({ children, ...rest }) {
            return (
              <a target="_blank" className="text-blue-500 underline" {...rest}>
                {children}
              </a>
            );
          },
          code(props) {
            // eslint-disable-next-line
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');

            return match ? (
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              <div className="relative" {...rest}>
                <SyntaxHighlighter PreTag="div" language={match[1]} className="rounded-md">
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
                <CopyToClipboardIconButton copyText={String(children)} />
              </div>
            ) : (
              <code {...rest} className={className}>
                {children}
              </code>
            );
          },
        }}>
        {text}
      </Markdown>
    </div>
  );
}

const useForceRenderWhenMounted = () => {
  const [, forceRender] = useState(0);
  useEffect(() => {
    forceRender(prev => prev + 1);
  }, []);
};

function CopyToClipboardIconButton({ copyText }: { copyText: string }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(copyText);
  };

  return (
    <IconButton variant="text" className="rounded-full !absolute right-1 bottom-1" size="sm" onClick={copyToClipboard}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-3 h-3" fill="gray">
        <path d="M192 0c-41.8 0-77.4 26.7-90.5 64H64C28.7 64 0 92.7 0 128V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64H282.5C269.4 26.7 233.8 0 192 0zm0 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64zM112 192H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z" />
      </svg>
    </IconButton>
  );
}
