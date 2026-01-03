import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

export type { CustomerInfo, PurchasesOfferings, PurchasesPackage };

const REVENUECAT_PUBLIC_KEY = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY;

let isInitialized = false;

/**
 * Initialize RevenueCat SDK.
 * Only works on native platforms (Android/iOS).
 */
export async function initializePurchases(): Promise<boolean> {
  if (isInitialized) return true;

  // Only initialize on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('RevenueCat: Skipping initialization on web platform');
    return false;
  }

  if (!REVENUECAT_PUBLIC_KEY) {
    console.warn('RevenueCat: Missing VITE_REVENUECAT_PUBLIC_KEY');
    return false;
  }

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({
      apiKey: REVENUECAT_PUBLIC_KEY,
    });
    isInitialized = true;
    console.log('RevenueCat: Initialized successfully');
    return true;
  } catch (error) {
    console.error('RevenueCat: Initialization failed', error);
    return false;
  }
}

/**
 * Login to RevenueCat with Firebase UID.
 * This links the user's purchases to their account.
 */
export async function loginToPurchases(firebaseUid: string): Promise<CustomerInfo | null> {
  if (!isInitialized) {
    console.warn('RevenueCat: Not initialized, skipping login');
    return null;
  }

  try {
    const { customerInfo } = await Purchases.logIn({ appUserID: firebaseUid });
    console.log('RevenueCat: Logged in as', firebaseUid);
    return customerInfo;
  } catch (error) {
    console.error('RevenueCat: Login failed', error);
    return null;
  }
}

/**
 * Logout from RevenueCat.
 */
export async function logoutFromPurchases(): Promise<void> {
  if (!isInitialized) return;

  try {
    await Purchases.logOut();
    console.log('RevenueCat: Logged out');
  } catch (error) {
    console.error('RevenueCat: Logout failed', error);
  }
}

/**
 * Get available subscription offerings.
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!isInitialized) {
    console.warn('RevenueCat: Not initialized, cannot get offerings');
    return null;
  }

  try {
    const result = await Purchases.getOfferings();
    // The result itself is the offerings object
    return result as unknown as PurchasesOfferings;
  } catch (error) {
    console.error('RevenueCat: Failed to get offerings', error);
    return null;
  }
}

/**
 * Purchase a subscription package.
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  if (!isInitialized) {
    throw new Error('RevenueCat not initialized');
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return customerInfo;
  } catch (error: unknown) {
    // Check if user cancelled
    const err = error as { userCancelled?: boolean; message?: string };
    if (err.userCancelled) {
      console.log('RevenueCat: Purchase cancelled by user');
      return null;
    }
    console.error('RevenueCat: Purchase failed', error);
    throw error;
  }
}

/**
 * Restore previous purchases.
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isInitialized) {
    console.warn('RevenueCat: Not initialized, cannot restore purchases');
    return null;
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('RevenueCat: Restore failed', error);
    throw error;
  }
}

/**
 * Get current customer info (subscription status).
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isInitialized) {
    return null;
  }

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('RevenueCat: Failed to get customer info', error);
    return null;
  }
}

/**
 * Check if user has an active pro subscription.
 */
export function hasActiveSubscription(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;

  // Check for active entitlements
  const entitlements = customerInfo.entitlements?.active;
  if (!entitlements) return false;

  // Check for 'pro' or 'premium' entitlement
  return 'pro' in entitlements || 'premium' in entitlements;
}

/**
 * Check if RevenueCat is available (native platform + configured).
 */
export function isPurchasesAvailable(): boolean {
  return Capacitor.isNativePlatform() && !!REVENUECAT_PUBLIC_KEY;
}
