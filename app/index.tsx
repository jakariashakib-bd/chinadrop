import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  BackHandler,
  Platform,
  RefreshControl,
  ScrollView,
  Dimensions,
  Text,
  TouchableOpacity,
  Animated as RNAnimated,
  ActivityIndicator,
  Linking,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import type { NetInfoState } from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// Conditionally import WebView only on native platforms
let WebView: React.ComponentType<any> | null = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebView = require("react-native-webview").WebView;
}

const WEBSITE_URL = "https://chinadropbd.com/";
const BRAND_RED = "#E53935";
const BRAND_ORANGE = "#FF5722";
const CHARCOAL = "#212121";

// JavaScript to inject into WebView for better UX (native only)
const INJECTED_JS = `
  (function() {
    // Disable long press context menu for native feel
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    // Add viewport meta if missing
    if (!document.querySelector('meta[name="viewport"]')) {
      var meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }

    // Smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';

    true;
  })();
`;

export default function MainScreen() {
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const insets = useSafeAreaInsets();
  const [canGoBack, setCanGoBack] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(WEBSITE_URL);

  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const progressOpacity = useRef(new RNAnimated.Value(1)).current;

  const isWeb = Platform.OS === "web";

  // Network connectivity monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
      if (connected && hasError) {
        setHasError(false);
        if (isWeb) {
          // Reload iframe on web
          if (iframeRef.current) {
            iframeRef.current.src = currentUrl;
          }
        } else {
          webViewRef.current?.reload();
        }
      }
    });
    return () => unsubscribe();
  }, [hasError, isWeb, currentUrl]);

  // Android hardware back button (native only)
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [canGoBack]);

  // Progress bar animation
  useEffect(() => {
    RNAnimated.timing(progressAnim, {
      toValue: loadProgress,
      duration: 200,
      useNativeDriver: false,
    }).start();

    if (loadProgress >= 1) {
      RNAnimated.timing(progressOpacity, {
        toValue: 0,
        duration: 300,
        delay: 200,
        useNativeDriver: false,
      }).start();
    } else {
      progressOpacity.setValue(1);
    }
  }, [loadProgress, progressAnim, progressOpacity]);

  const onNavigationStateChange = useCallback((navState: { canGoBack: boolean; url: string }) => {
    setCanGoBack(navState.canGoBack);
    setCurrentUrl(navState.url);
  }, []);

  const onLoadProgress = useCallback((event: { nativeEvent: { progress: number } }) => {
    setLoadProgress(event.nativeEvent.progress);
  }, []);

  const onLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const onLoadEnd = useCallback(() => {
    setIsLoading(false);
    setRefreshing(false);
  }, []);

  const onError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    setRefreshing(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (isWeb) {
      if (iframeRef.current) {
        iframeRef.current.src = currentUrl;
      }
      setRefreshing(false);
    } else {
      webViewRef.current?.reload();
    }
  }, [isWeb, currentUrl]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    if (isWeb) {
      if (iframeRef.current) {
        iframeRef.current.src = currentUrl;
      }
    } else {
      webViewRef.current?.reload();
    }
  }, [isWeb, currentUrl]);

  const handleShouldStartLoadWithRequest = useCallback((request: { url: string }) => {
    const { url } = request;
    // Allow internal navigation
    if (url.startsWith("https://chinadropbd.com") || url.startsWith("http://chinadropbd.com")) {
      return true;
    }
    // Allow common payment/auth redirects
    if (
      url.includes("bkash") ||
      url.includes("nagad") ||
      url.includes("sslcommerz") ||
      url.includes("stripe") ||
      url.includes("paypal") ||
      url.includes("facebook") ||
      url.includes("google") ||
      url.includes("accounts.google")
    ) {
      return true;
    }
    // Open external links in browser
    if (url.startsWith("http://") || url.startsWith("https://")) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    // Handle tel:, mailto:, etc.
    if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("whatsapp:")) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // Handle iframe load events for web
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setRefreshing(false);
    setLoadProgress(1);
  }, []);

  const handleIframeError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    setRefreshing(false);
  }, []);

  // Offline / error screen
  if (isConnected === false || hasError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <View style={styles.offlineContainer}>
          <View style={styles.offlineIconContainer}>
            <MaterialCommunityIcons
              name="wifi-off"
              size={80}
              color={BRAND_RED}
            />
          </View>
          <Text style={styles.offlineTitle}>
            {isConnected === false ? "No Internet Connection" : "Something Went Wrong"}
          </Text>
          <Text style={styles.offlineSubtitle}>
            {isConnected === false
              ? "Please check your network settings and try again."
              : "We couldn't load the page. Please try again."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <View style={styles.offlineBrandContainer}>
            <Text style={styles.offlineBrandText}>China Drop</Text>
          </View>
        </View>
      </View>
    );
  }

  // Web platform: render iframe
  if (isWeb) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />

        {/* Progress bar */}
        <RNAnimated.View
          style={[
            styles.progressBarContainer,
            { opacity: progressOpacity },
          ]}
        >
          <RNAnimated.View
            style={[
              styles.progressBar,
              { width: progressWidth },
            ]}
          />
        </RNAnimated.View>

        {/* Iframe for web */}
        <View style={styles.scrollView}>
          {React.createElement("iframe", {
            ref: iframeRef,
            src: currentUrl,
            onLoad: handleIframeLoad,
            onError: handleIframeError,
            style: {
              flex: 1,
              width: "100%",
              height: "100%",
              border: "none",
              backgroundColor: "#FFFFFF",
            },
            allow: "geolocation; camera; microphone; payment",
            sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation",
          })}
        </View>

        {/* Loading overlay for initial load */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={BRAND_RED} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      </View>
    );
  }

  // Native platform: render WebView
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* Progress bar */}
      <RNAnimated.View
        style={[
          styles.progressBarContainer,
          { opacity: progressOpacity },
        ]}
      >
        <RNAnimated.View
          style={[
            styles.progressBar,
            { width: progressWidth },
          ]}
        />
      </RNAnimated.View>

      {/* WebView with pull-to-refresh */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BRAND_RED, BRAND_ORANGE]}
            tintColor={BRAND_RED}
            progressBackgroundColor="#FFFFFF"
          />
        }
        style={styles.scrollView}
      >
        {WebView ? (
          <WebView
            ref={webViewRef}
            source={{ uri: currentUrl }}
            style={styles.webView}
            onNavigationStateChange={onNavigationStateChange}
            onLoadProgress={onLoadProgress}
            onLoadStart={onLoadStart}
            onLoadEnd={onLoadEnd}
            onError={onError}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            injectedJavaScript={INJECTED_JS}
            // Core settings
            javaScriptEnabled={true}
            domStorageEnabled={true}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            // Media
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo={true}
            // File handling
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            // Performance
            cacheEnabled={true}
            cacheMode="LOAD_DEFAULT"
            // UX
            startInLoadingState={false}
            scalesPageToFit={true}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            // User agent
            applicationNameForUserAgent="ChinaDropApp/1.0"
            // Scroll settings for pull-to-refresh compatibility
            nestedScrollEnabled={true}
            scrollEnabled={true}
            // Mixed content for legacy pages
            mixedContentMode="compatibility"
            // Geolocation
            geolocationEnabled={true}
            // Text zoom
            textZoom={100}
          />
        ) : (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={BRAND_RED} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      </ScrollView>

      {/* Loading overlay for initial load */}
      {isLoading && loadProgress < 0.3 && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={BRAND_RED} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  webView: {
    flex: 1,
    height: Dimensions.get("window").height,
    backgroundColor: "#FFFFFF",
  },
  // Progress bar
  progressBarContainer: {
    height: 3,
    backgroundColor: "#F5F5F5",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  progressBar: {
    height: 3,
    backgroundColor: BRAND_RED,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#757575",
    fontWeight: "500",
  },
  // Offline screen
  offlineContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 40,
  },
  offlineIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  offlineTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: CHARCOAL,
    textAlign: "center",
    marginBottom: 12,
  },
  offlineSubtitle: {
    fontSize: 15,
    color: "#757575",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_RED,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 3,
    shadowColor: BRAND_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  offlineBrandContainer: {
    position: "absolute",
    bottom: 50,
  },
  offlineBrandText: {
    fontSize: 14,
    color: "#E0E0E0",
    fontWeight: "600",
    letterSpacing: 2,
  },
});
