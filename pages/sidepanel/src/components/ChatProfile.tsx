import { Avatar } from '@material-tailwind/react';
import PopoverWithHover from '@src/components/PopoverWithHover';
import { conversationStorage } from '@chrome-extension-boilerplate/shared';

type ChatProfileProps = {
  type: 'user' | 'ai';
  createdAt?: number;
};
export default function ChatProfile({ type, createdAt }: ChatProfileProps) {
  const isAi = type === 'ai';
  const src = isAi
    ? 'https://docs.material-tailwind.com/img/face-3.jpg'
    : 'https://docs.material-tailwind.com/img/face-2.jpg';

  const copyContent = async () => {
    const { chats } = await conversationStorage.get();
    const text = chats.find(chat => chat.createdAt === createdAt)?.content.text;
    await navigator.clipboard.writeText(text ?? '');
  };

  //todo copy, delete, edit
  return (
    <PopoverWithHover content="You can copy on click!" placement="bottom-end" disabled={!isAi}>
      <Avatar
        className={`shrink-0 mt-2 ${createdAt ? 'cursor-pointer' : ''}`}
        size="sm"
        src={src}
        alt="avatar"
        onClick={copyContent}
      />
    </PopoverWithHover>
  );
}
