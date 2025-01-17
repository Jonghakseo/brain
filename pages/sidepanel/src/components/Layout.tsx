import { List, ListItem, Typography } from '@material-tailwind/react';
import { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { routeObjects } from '@src/router';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();

  const listItems = routeObjects.map(routeObject => {
    const { path: _path } = routeObject;
    if (!_path) {
      throw new Error('Path is required');
    }
    const name = _path === '/' ? 'Chat' : _path.slice(1).charAt(0).toUpperCase() + _path.slice(2);
    const path = _path.replace('/', '#');

    return { name, href: path, isActive: pathname === _path };
  });

  return (
    <main className="flex flex-col w-full h-full max-h-full max-w-full p-4 !pt-0 gap-2">
      <List className="mt-0 mb-0 flex-row p-1 grow-0 sticky top-0 pt-4 z-10 bg-white">
        {listItems.map(({ name, href, isActive }) => (
          <Typography key={name} as="a" href={href} variant="small" color="blue-gray" className="font-medium">
            <ListItem className={`flex items-center gap-2 py-2 pr-4 ${isActive ? '!text-blue-500' : ''}`}>
              {name}
            </ListItem>
          </Typography>
        ))}
      </List>
      <section className="grow max-h-[calc(100%-62px)]">{children}</section>
    </main>
  );
}
