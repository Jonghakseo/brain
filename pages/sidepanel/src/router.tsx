import { createHashRouter } from 'react-router-dom';
import Home from '@src/pages/Home';
import Billing from '@src/pages/Billing';
import Setting from '@src/pages/Setting';

const router = createHashRouter([
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
]);

export default router;
