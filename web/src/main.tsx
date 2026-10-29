import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/patrick-hand/latin.css';
import '@fontsource/patrick-hand/latin-ext.css';
import '@fontsource/patrick-hand/vietnamese.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
