import '../styles/globals.css';

function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <h2 style={{ position: 'absolute', bottom: 0, padding: '.5em' }}>
        Wanna share your bot code? Upload to Github with #gpn-tron
      </h2>
    </>
  );
}

export default App;
