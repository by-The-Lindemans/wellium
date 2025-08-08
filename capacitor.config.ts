import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lndmn.wellium',
  appName: 'wellium',
  webDir: 'dist',
  // server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      //launchAutoHide: true
    }
  }
};

export default config;
