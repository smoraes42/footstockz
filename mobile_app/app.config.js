const fs = require('fs');
const path = require('path');

let apiUrl = 'http://10.0.2.2:5001'; // Default for local Android Emulator

try {
  // Read the .env file from the parent directory
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envConfig = {};
    
    // Simple manual parser for .env
    envContent.split('\n').forEach(line => {
      // Match Key=Value pairs
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let key = match[1];
        let value = match[2] || '';
        // Remove quotes and trailing comments/spaces if any
        value = value.replace(/(^['"]|['"]$)/g, '').split(' #')[0].trim();
        envConfig[key] = value;
      }
    });

    // Use ORIGIN from .env, stripping any trailing slash
    // If you want to switch back to local backend testing, you can comment this out or check envConfig.MODE
    if (envConfig.ORIGIN) {
      apiUrl = envConfig.ORIGIN.replace(/\/$/, '');
    }
  }
} catch (error) {
  console.warn('Warning: Could not parse ../.env file. Using default API URL.', error);
}

module.exports = {
  expo: {
    name: "mobile_app",
    slug: "mobile_app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mobileapp",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      predictiveBackGestureEnabled: false
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-secure-store"
    ],
    experiments: {
      "typedRoutes": true
    },
    extra: {
      apiUrl: apiUrl
    }
  }
};
