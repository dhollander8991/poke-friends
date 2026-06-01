import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the built web client (Phaser/WebGL) into a native iOS/Android
 * app — reusing 100% of the game code. Build the client first (`pnpm build`),
 * then `pnpm cap:sync` and open the native project.
 *
 * For live-reload during development against the Vite dev server, set
 * CAP_SERVER_URL=http://<your-LAN-ip>:5173 before running cap:sync.
 */
const devUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.pokefriends.app',
  appName: "Poke'friends",
  webDir: 'client/dist',
  backgroundColor: '#24100a',
  ...(devUrl
    ? { server: { url: devUrl, cleartext: true } }
    : {}),
  plugins: {
    SplashScreen: {
      backgroundColor: '#24100a',
      showSpinner: false,
      launchAutoHide: true,
    },
  },
};

export default config;
