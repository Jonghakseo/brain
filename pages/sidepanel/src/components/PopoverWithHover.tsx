import { useState } from 'react';
import { Popover, PopoverContent, PopoverHandler, PopoverProps } from '@material-tailwind/react';

type PopoverWithHoverProps = {
  children: React.ReactNode;
  content: React.ReactNode;
  contentClassName?: string;
  placement?: PopoverProps['placement'];
  disabled?: boolean;
};

export default function PopoverWithHover({
  children,
  content,
  placement,
  disabled,
  contentClassName,
}: PopoverWithHoverProps) {
  const [open, setOpen] = useState(false);

  const triggers = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <Popover open={open} handler={setOpen} placement={placement}>
      <PopoverHandler>
        <div {...triggers}>{children}</div>
      </PopoverHandler>
      <PopoverContent className={`z-50 py-1 px-2 ${contentClassName}`}>{content}</PopoverContent>
    </Popover>
  );
}
