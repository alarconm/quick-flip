import '@testing-library/jest-dom'

// Mock window.__TRADEUP_CONFIG__ for tests
Object.defineProperty(window, '__TRADEUP_CONFIG__', {
  value: {
    shop: 'test-shop.myshopify.com',
    host: 'dGVzdC1zaG9w',
    apiKey: 'test-api-key',
    appUrl: 'http://localhost:5000'
  },
  writable: true
})

// Mock shopify global for App Bridge
Object.defineProperty(window, 'shopify', {
  value: {
    config: {
      shop: 'test-shop.myshopify.com',
      apiKey: 'test-api-key'
    },
    environment: {
      embedded: false
    },
    idToken: () => Promise.resolve('test-token')
  },
  writable: true
})
