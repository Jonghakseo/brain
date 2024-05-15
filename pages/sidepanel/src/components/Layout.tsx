import { List, ListItem, Typography } from '@material-tailwind/react';
import { ReactNode } from 'react';
import { useLocation } from 'react-router';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();

  const listItems = [
    { name: 'Chat', href: '#', isActive: pathname === '/' },
    { name: 'Billing', href: '#billing', isActive: pathname === '/billing' },
    { name: 'Setting', href: '#setting', isActive: pathname === '/setting' },
  ];

  return (
    <main className="flex flex-col w-full h-full max-h-full max-w-full p-4 gap-2">
      <List className="mt-0 mb-0 flex-row p-1 grow-0">
        {listItems.map(({ name, href, isActive }) => (
          <Typography key={name} as="a" href={href} variant="small" color="blue-gray" className="font-medium">
            <ListItem className={`flex items-center gap-2 py-2 pr-4 ${isActive ? '!text-blue-500' : ''}`}>
              {name}
            </ListItem>
          </Typography>
        ))}
      </List>
      <section className="grow max-h-[calc(100%-50px)]">{children}</section>
    </main>
  );
}
