import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { App } from 'antd';

import { AppProvider } from './Providers/Configuration.tsx';
import MainContext from './App.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Transient tarmoq xatolari (DNS flake, brief timeout) uchun 3 marta retry,
      // lekin 4xx (client xato) larda retry qilmaymiz — bu user xatosi.
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) =>
        Math.min(1000 * 2 ** attemptIndex, 10_000),
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <App>
        <MainContext />
      </App>
    </AppProvider>
  </QueryClientProvider>
);
