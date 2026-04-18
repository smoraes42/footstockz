/**
 * Central configuration for the mobile app.
 * Set API_URL in app.json under expo.extra.apiUrl, or override here for local dev.
 *
 * Common values:
 *   - Android emulator: http://10.0.2.2:5001
 *   - iOS simulator / physical device (same WiFi): http://<your-machine-ip>:5001
 *   - Production: https://api.yourdomain.com
 */
import Constants from 'expo-constants';

export const API_URL: string =
    (Constants.expoConfig?.extra?.apiUrl as string) ?? 'http://10.0.2.2:5001';
