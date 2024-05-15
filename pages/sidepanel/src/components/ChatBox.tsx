import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useState } from 'react';
import { Button } from '@material-tailwind/react';
import ImageViewModal from '@src/components/ImageViewModal';
import remarkGfm from 'remark-gfm';

type ChatBoxProps = {
  className?: string;
  image?: string;
  message?: string;
};

export default function ChatBox({ className = '', image, message }: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`${className ?? ''} flex flex-row gap-2`}>
      {image && (
        <Button
          variant="outlined"
          className="rounded-md relative flex items-center !border-0 !p-0"
          onClick={() => setIsOpen(true)}>
          <img src={image} className="h-16 w-fit rounded-md" alt="screen capture" />
        </Button>
      )}
      {image && <ImageViewModal image={image} isOpen={isOpen} onClose={() => setIsOpen(false)} />}
      <Markdown
        className="whitespace-normal max-w-full"
        remarkPlugins={[remarkGfm]}
        components={{
          a(props) {
            return <a target="_blank" {...props} className="text-blue-500 underline" />;
          },
          code(props) {
            // eslint-disable-next-line
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            return match ? (
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              <SyntaxHighlighter {...rest} PreTag="div" className="rounded-md" language={match[1]}>
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code {...rest} className={className}>
                {children}
              </code>
            );
          },
        }}>
        {message}
      </Markdown>
    </div>
  );
}
