import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applySharedAuthBridgeFromUrl } from './lib/sharedAuthBridge';

async function bootstrap() {
  await applySharedAuthBridgeFromUrl();
  createRoot(document.getElementById('root')!).render(<App />);
}

void bootstrap();
