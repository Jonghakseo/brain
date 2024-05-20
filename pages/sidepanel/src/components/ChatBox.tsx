import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useState } from 'react';
import { Button, IconButton, Spinner, Typography } from '@material-tailwind/react';
import ImageViewModal from '@src/components/ImageViewModal';
import remarkGfm from 'remark-gfm';
import { Chat, DONE_PLACEHOLDER, LOADING_PLACEHOLDER, SAVE_PLACEHOLDER } from '@chrome-extension-boilerplate/shared';

type ChatBoxProps = {
  className?: string;
  createdAt: Chat['createdAt'];
  image?: Chat['content']['image'];
  text?: Chat['content']['text'];
};

export default function ChatBox({ createdAt, className = '', image, text }: ChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);

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
      {image && <ImageViewModal createdAt={createdAt} image={image} isOpen={isOpen} onClose={() => setIsOpen(false)} />}
      <Markdown
        className="whitespace-normal node break-words max-w-full"
        remarkPlugins={[remarkGfm]}
        components={{
          ...headerHandlers,
          ...tableHandlers,
          a({ children, ...rest }) {
            return (
              <a target="_blank" className="text-blue-500 underline" {...rest}>
                {children}
              </a>
            );
          },
          // eslint-disable-next-line
          p({ children, node, ...rest }) {
            if (typeof children !== 'string') {
              return <p {...rest}>{children}</p>;
            }
            if (children.includes(LOADING_PLACEHOLDER)) {
              // eslint-disable-next-line
              const [before, after] = children.split(LOADING_PLACEHOLDER);
              return (
                <p {...rest}>
                  {before}
                  <Spinner color="indigo" className="h-4 w-4 inline" />
                  {after}
                </p>
              );
            }
            if (children.includes(DONE_PLACEHOLDER)) {
              // eslint-disable-next-line
              const [before, after] = children.split(DONE_PLACEHOLDER);
              return (
                <p {...rest}>
                  {before}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    className="w-4 h-4 inline text-green-500"
                    fill="currentColor">
                    <path d="M464.5 123.5l-23.8-23.8c-4.7-4.7-12.3-4.7-17 0L192 350.1l-96.7-96.7c-4.7-4.7-12.3-4.7-17 0l-23.8 23.8c-4.7 4.7-4.7 12.3 0 17l119.5 119.5c4.7 4.7 12.3 4.7 17 0l279.5-279.5c4.7-4.7 4.7-12.3 0-17z" />
                  </svg>
                  {after}
                </p>
              );
            }
            if (children.includes(SAVE_PLACEHOLDER)) {
              // eslint-disable-next-line
              const [before, programId] = children.split(SAVE_PLACEHOLDER);
              return (
                <div {...rest}>
                  {before}
                  {/*<div*/}
                  {/*  className="inline text-green-600 text-xs cursor-pointer"*/}
                  {/*  onClick={() => markProgramRecordIsUseful(programId)}>*/}
                  {/*  <IconButton variant="text" className="w-5 h-5 inline text-green-600">*/}
                  {/*    <svg*/}
                  {/*      xmlns="http://www.w3.org/2000/svg"*/}
                  {/*      viewBox="0 0 16 16"*/}
                  {/*      fill="currentColor"*/}
                  {/*      className="w-4 h-4">*/}
                  {/*      <path d="M3.75 2a.75.75 0 0 0-.75.75v10.5a.75.75 0 0 0 1.28.53L8 10.06l3.72 3.72a.75.75 0 0 0 1.28-.53V2.75a.75.75 0 0 0-.75-.75h-8.5Z" />*/}
                  {/*    </svg>*/}
                  {/*  </IconButton>*/}
                  {/*  Save this Record*/}
                  {/*</div>*/}
                </div>
              );
            }
            return <p {...rest}>{children}</p>;
          },
          // eslint-disable-next-line
          img({ src, alt, node, ...rest }) {
            if (!src?.startsWith('http')) {
              return null;
            }
            return <img src={src} alt={alt} {...rest} />;
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
              <code {...rest} className={`${className} whitespace-pre-wrap text-gray-800 rounded-sm bg-gray-200`}>
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

const headerHandlers = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].reduce((handlerObj, header) => {
  // eslint-disable-next-line
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handlerObj[header] = ({ children, node, ...rest }) => (
    // eslint-disable-next-line
    // @ts-ignore
    <Typography as={header} className="font-semibold" {...rest}>
      {children}
    </Typography>
  );
  return handlerObj;
}, {});

const tableHandlers = ['table', 'td', 'th', 'tr'].reduce((handlerObj, table) => {
  // eslint-disable-next-line
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handlerObj[table] = ({ children, node, ...rest }) => {
    const T = table as unknown as React.ElementType;
    // eslint-disable-next-line
    // @ts-ignore
    return (
      <T style={{ borderWidth: 'initial' }} className="p-1" {...rest}>
        {children}
      </T>
    );
  };
  return handlerObj;
}, {});

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

// const markProgramRecordIsUseful = async (programId: string) => {
//   const program = await programStorage.getProgram(programId);
//   await programStorage.updateProgram(programId, { __records: { ...program.__records, isUseful: true } });
// };
