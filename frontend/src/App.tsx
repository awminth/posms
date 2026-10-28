import React from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { POSProvider } from './context/POSContext';
import { POSApp } from './POSApp';

export default function App() {
  return (
    <LanguageProvider>
      <POSProvider>
        <POSApp />
      </POSProvider>
    </LanguageProvider>
  );
}
