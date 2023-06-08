import '../styles/globals.css';
import { GameProvider } from '../providers/Game'

function App({ Component, pageProps }) {
  return (
    <GameProvider>
      <Component {...pageProps} />
    </GameProvider>
  );
}

export default App;
