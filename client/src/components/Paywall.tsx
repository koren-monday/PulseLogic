import { useState, useEffect } from 'react';
import { X, Crown, Check, Loader2, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
  hasActiveSubscription,
  isPurchasesAvailable,
} from '../services/purchases';
import type { PurchasesOfferings, CustomerInfo, PurchasesPackage } from '../services/purchases';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribed?: () => void;
}

const PRO_FEATURES = [
  '10 LLM analyses per day',
  'Daily health snapshots',
  'Full report history',
  'Advanced AI model access',
  'Up to 360 days of data',
  'Priority support',
];

export function Paywall({ isOpen, onClose, onSubscribed }: PaywallProps) {
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Load offerings on mount
  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      if (!isPurchasesAvailable()) {
        setError('Subscriptions are only available in the app');
        setIsLoading(false);
        return;
      }

      try {
        const [offeringsResult, customerInfoResult] = await Promise.all([
          getOfferings(),
          getCustomerInfo(),
        ]);

        setOfferings(offeringsResult);
        setCustomerInfo(customerInfoResult);

        // Select first package by default
        if (offeringsResult?.current?.availablePackages?.length) {
          setSelectedPackage(offeringsResult.current.availablePackages[0].identifier);
        }

        // Already subscribed?
        if (hasActiveSubscription(customerInfoResult)) {
          onSubscribed?.();
        }
      } catch (err) {
        setError('Failed to load subscription options');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isOpen, onSubscribed]);

  const handlePurchase = async () => {
    if (!selectedPackage || !offerings?.current) return;

    const pkg = offerings.current.availablePackages.find(
      (p: PurchasesPackage) => p.identifier === selectedPackage
    );
    if (!pkg) return;

    setIsPurchasing(true);
    setError(null);

    try {
      const info = await purchasePackage(pkg);
      if (info && hasActiveSubscription(info)) {
        setCustomerInfo(info);
        onSubscribed?.();
        onClose();
      }
    } catch (err) {
      setError('Purchase failed. Please try again.');
      console.error(err);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setError(null);

    try {
      const info = await restorePurchases();
      if (info && hasActiveSubscription(info)) {
        setCustomerInfo(info);
        onSubscribed?.();
        onClose();
      } else {
        setError('No previous purchases found');
      }
    } catch (err) {
      setError('Failed to restore purchases');
      console.error(err);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatPrice = (pkg: PurchasesPackage): string => {
    return pkg.product.priceString;
  };

  const formatPeriod = (pkg: PurchasesPackage): string => {
    const type = pkg.packageType;
    if (type === 'MONTHLY') return '/month';
    if (type === 'ANNUAL') return '/year';
    return '';
  };

  if (!isOpen) return null;

  // Already subscribed
  if (hasActiveSubscription(customerInfo)) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-bold">You're a Pro!</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-slate-300 mb-6">
            Thank you for your subscription! You have access to all Pro features.
          </p>

          <button onClick={onClose} className="btn-primary w-full">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">Upgrade to Pro</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
              <p className="text-slate-400">Loading options...</p>
            </div>
          ) : error && !offerings ? (
            <div className="flex flex-col items-center py-8 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
              <p className="text-red-400 mb-4">{error}</p>
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Features */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Pro Features
                </h3>
                <ul className="space-y-2">
                  {PRO_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-slate-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Package Selection */}
              {offerings?.current?.availablePackages && (
                <div className="space-y-3 mb-6">
                  {offerings.current.availablePackages.map((pkg: PurchasesPackage) => (
                    <button
                      key={pkg.identifier}
                      onClick={() => setSelectedPackage(pkg.identifier)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        selectedPackage === pkg.identifier
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">
                            {pkg.packageType === 'ANNUAL' ? 'Annual' : 'Monthly'}
                          </p>
                          {pkg.packageType === 'ANNUAL' && (
                            <p className="text-sm text-green-400">Save ~17%</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatPrice(pkg)}</p>
                          <p className="text-sm text-slate-400">{formatPeriod(pkg)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={!selectedPackage || isPurchasing}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    Subscribe
                  </>
                )}
              </button>

              {/* Restore */}
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="w-full mt-3 py-2 text-slate-400 hover:text-white flex items-center justify-center gap-2"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Restore Purchases
                  </>
                )}
              </button>

              {/* Terms */}
              <p className="text-xs text-slate-500 text-center mt-4">
                Payment will be charged to your Google Play account. Subscription
                automatically renews unless cancelled at least 24 hours before the
                end of the current period.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
