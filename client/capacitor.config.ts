import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pulselogic.app',
  appName: 'PulseLogic',
  webDir: 'dist',
  server: {
    // In production, the app loads from bundled assets
    // In development, you can set a live URL for hot reload
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true, // Allow HTTP requests from HTTPS app
    captureInput: true,
    webContentsDebuggingEnabled: true, // Enable Chrome DevTools debugging
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a', // slate-900
      showSpinner: true,
      spinnerStyle: 'small',
      spinnerColor: '#00AEEF', // garmin-blue
      splashFullScreen: true,
      splashImmersive: true,
    },
    App: {
      // Android back button is handled in code
    },
  },
};

export default config;
