import React from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider } from './providers/Game';
import { App } from './components/App';

function Root() {
  return (
    <GameProvider>
      <App />
    </GameProvider>
  );
}

const rootContainer = document.getElementById('root');

if (rootContainer) {
  const root = createRoot(rootContainer);
  root.render(<Root />);
}
