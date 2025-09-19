import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SubscriptionProvider } from '@/hooks/useSubscription'

createRoot(document.getElementById("root")!).render(
  <SubscriptionProvider>
    <App />
  </SubscriptionProvider>
);
