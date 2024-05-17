import { createHashRouter, type RouteObject } from 'react-router-dom';
import Home from '@src/pages/Home';
import Billing from '@src/pages/Billing';
import Setting from '@src/pages/Setting';
import Tools from '@src/pages/Tools';

export const routeObjects: RouteObject[] = [
  {
    path: '/',
    element: <Home />,
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
];

const router = createHashRouter(routeObjects);

export default router;
