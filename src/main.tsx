import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 🔒 SECURITY: Disable console logs in production to prevent data exposure
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  // Keep console.warn and console.error for critical issues only
}

createRoot(document.getElementById("root")!).render(<App />);
