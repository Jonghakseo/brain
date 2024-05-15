import { createRoot } from 'react-dom/client';
import '@src/index.css';
import { RouterProvider } from 'react-router-dom';
import router from '@src/router';

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);

  root.render(<RouterProvider router={router} />);
}

init();
