import { useState, useEffect } from 'react';

interface ShopifyBridgeState {
  shop: string | null;
  isEmbedded: boolean;
  isLoading: boolean;
}

/**
 * Hook to handle Shopify App Bridge initialization and shop context.
 * Detects if running embedded in Shopify admin or standalone.
 */
export function useShopifyBridge(): ShopifyBridgeState {
  const [state, setState] = useState<ShopifyBridgeState>({
    shop: null,
    isEmbedded: false,
    isLoading: true,
  });

  useEffect(() => {
    // Get shop from URL params or local storage
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop');

    // Check if embedded in Shopify admin
    const isEmbedded = window.top !== window.self;

    // Try to get shop from various sources
    let shop = shopParam;

    if (!shop) {
      // Try local storage for returning users
      shop = localStorage.getItem('tradeup_shop');
    }

    if (shop) {
      localStorage.setItem('tradeup_shop', shop);
    }

    setState({
      shop,
      isEmbedded,
      isLoading: false,
    });
  }, []);

  return state;
}

/**
 * Get API base URL based on environment.
 */
export function getApiUrl(): string {
  const isDev = import.meta.env.DEV;
  return isDev
    ? 'http://localhost:5000/api'
    : (import.meta.env.VITE_API_URL || '/api');
}

/**
 * Get tenant ID from shop domain.
 */
export function getTenantParam(shop: string | null): string {
  if (!shop) return '';
  return `?shop=${encodeURIComponent(shop)}`;
}
