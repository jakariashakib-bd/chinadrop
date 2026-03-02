import { useEffect, useState, useCallback } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  View,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";

// Safely prevent auto-hide - may throw on web
try {
  SplashScreen.preventAutoHideAsync();
} catch {
  // Ignore on platforms where splash screen is not available
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.6);
  const splashOpacity = useSharedValue(1);

  const finishSplash = useCallback(() => {
    setSplashDone(true);
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // ignore
      }
      setAppReady(true);
    }
    prepare();
  }, []);

  useEffect(() => {
    if (appReady) {
      // Fade-in and scale-up the logo
      logoOpacity.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
      logoScale.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.back(1.2)),
      });

      // After showing the logo, fade out the splash
      splashOpacity.value = withDelay(
        1800,
        withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) {
            runOnJS(finishSplash)();
          }
        })
      );
    }
  }, [appReady, finishSplash, logoOpacity, logoScale, splashOpacity]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const splashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>

      {!splashDone && (
        <Animated.View
          style={[styles.splashContainer, splashAnimatedStyle]}
          pointerEvents="none"
        >
          <View style={styles.splashContent}>
            <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
              <Image
                source={require("@/assets/images/china-drop-logo.png")}
                style={styles.splashLogo}
                resizeMode="contain"
              />
              <View style={styles.brandTextContainer}>
                <Animated.Text style={[styles.brandName]}>
                  China Drop
                </Animated.Text>
                <Animated.Text style={[styles.brandTagline]}>
                  Your Wholesale Partner
                </Animated.Text>
              </View>
            </Animated.View>
          </View>
          <View style={styles.splashFooter}>
            <Animated.Text style={styles.footerText}>
              Powered by ChinaDrop BD
            </Animated.Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  splashContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  splashLogo: {
    width: 160,
    height: 160,
    borderRadius: 32,
  },
  brandTextContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  brandName: {
    fontSize: 36,
    fontWeight: "800",
    color: "#E53935",
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: "500",
    color: "#757575",
    marginTop: 6,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  splashFooter: {
    paddingBottom: Platform.OS === "android" ? 40 : 50,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#BDBDBD",
    letterSpacing: 1,
  },
});
