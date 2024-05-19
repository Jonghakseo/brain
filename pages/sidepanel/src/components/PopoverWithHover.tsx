import { useState } from 'react';
import { Popover, PopoverContent, PopoverHandler } from '@material-tailwind/react';

type PopoverWithHoverProps = {
  children: React.ReactNode;
  content: React.ReactNode;
};

export default function PopoverWithHover({ children, content }: PopoverWithHoverProps) {
  const [open, setOpen] = useState(false);

  const triggers = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
  };

  return (
    <Popover open={open} handler={setOpen}>
      <PopoverHandler>
        <div {...triggers}>{children}</div>
      </PopoverHandler>
      <PopoverContent className="z-50">{content}</PopoverContent>
    </Popover>
  );
}
