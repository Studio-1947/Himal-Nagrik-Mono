import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8f63d28d994d4e5698021047f301a1f3',
  appName: 'Darjeeling Taxi',
  webDir: 'dist',
  server: {
    url: 'https://8f63d28d-994d-4e56-9802-1047f301a1f3.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#fbbf24',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#fbbf24'
    }
  }
};

export default config;