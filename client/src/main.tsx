import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen } from '@capacitor/splash-screen';
import { initializePurchases } from './services/purchases';
import './index.css';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize app services
async function initializeApp() {
  // Initialize RevenueCat for in-app purchases
  await initializePurchases();

  // Hide splash screen after initialization
  await SplashScreen.hide();
}

// Start initialization
initializeApp().catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
