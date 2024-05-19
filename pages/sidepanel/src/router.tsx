import { createHashRouter, type RouteObject } from 'react-router-dom';
import Chat from '@src/pages/Chat';
import Billing from '@src/pages/Billing';
import Setting from '@src/pages/Setting';
import Tools from '@src/pages/Tools';
import Programs from '@src/pages/Programs';

export const routeObjects: RouteObject[] = [
  {
    path: '/',
    element: <Chat />,
  },
  {
    path: '/billing',
    element: <Billing />,
  },
  {
    path: '/setting',
    element: <Setting />,
  },
  {
    path: '/tools',
    element: <Tools />,
  },
  {
    path: '/programs',
    element: <Programs />,
  },
];

const router = createHashRouter(routeObjects);

export default router;
