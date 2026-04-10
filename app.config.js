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
    // Runtime version as a literal string (required for bare workflow).
    // Bump this whenever you change native code; JS-only updates can
    // use the same runtimeVersion and stream via `eas update`.
    runtimeVersion: "1.0.0",
    updates: {
      url: "https://u.expo.dev/10983464-0e42-4b2e-b720-e031c5e34712"
    },
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anonymous.ConnectCare",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "ConnectCare needs your location to find resources near you.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "ConnectCare needs your location to find resources near you."
      }
    },
    android: {
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
      eas: {
        projectId: "10983464-0e42-4b2e-b720-e031c5e34712"
      }
    }
  }
};
