import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lndmn.wellium',
  appName: 'wellium',
  webDir: 'dist',
  // server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false
    },
    StatusBar: {
      overlaysWebView: false,    // push webview below status bar
      style: 'DARK',
      backgroundColor: '#000000'
    }
  }
};

export default config;
