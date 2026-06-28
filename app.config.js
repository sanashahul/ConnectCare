import 'dotenv/config';

export default {
  expo: {
    name: "ConnectCare",
    slug: "ConnectCare",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.sanashahul.connectcare",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "ConnectCare needs your location to find resources near you.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "ConnectCare needs your location to find resources near you."
      }
    },
    android: {
      package: "com.sanashahul.connectcare",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "ConnectCare needs your location to find resources near you."
        }
      ]
    ],
    extra: {
      groqApiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY,
      adzunaAppId: process.env.EXPO_PUBLIC_ADZUNA_APP_ID,
      adzunaAppKey: process.env.EXPO_PUBLIC_ADZUNA_APP_KEY,
    }
  }
};
