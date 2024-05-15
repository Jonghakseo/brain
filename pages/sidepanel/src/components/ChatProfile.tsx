import { Avatar } from '@material-tailwind/react';

type ChatProfileProps = {
  type: 'user' | 'ai';
};
export default function ChatProfile({ type }: ChatProfileProps) {
  const src =
    type === 'user'
      ? 'https://docs.material-tailwind.com/img/face-2.jpg'
      : 'https://docs.material-tailwind.com/img/face-3.jpg';
  return <Avatar className="shrink-0 mt-2" size="sm" src={src} alt="avatar" />;
}
