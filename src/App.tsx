import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import { routes } from './Router';
import { useApp } from './Providers/Configuration';
import { ConfigProvider } from 'antd';
import { getAntdTheme } from './theme/colors';

const App = () => {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const splashAlreadyShown = sessionStorage.getItem('splashShown') === 'true';
    if (!splashAlreadyShown) {
      setShowSplash(true);
    }
  }, []);
  const { theme: darkOrLight } = useApp();
  return (
    <>
      <AnimatePresence mode="sync">
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        <ConfigProvider
          theme={getAntdTheme(darkOrLight)}
        >
          {!showSplash && (
            <RouterProvider router={createBrowserRouter(routes)} />
          )}
        </ConfigProvider>
      </AnimatePresence>
    </>
  );
};

export default App;
