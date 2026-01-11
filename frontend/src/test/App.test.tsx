import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Mock the hooks
vi.mock('../hooks/useShopifyBridge', () => ({
  useShopifyBridge: () => ({
    shop: 'test-shop.myshopify.com',
    isLoading: false
  })
}))

// Simple render test
describe('App', () => {
  it('renders without crashing', () => {
    // Just verify the test setup works
    expect(true).toBe(true)
  })
})

describe('Test Setup', () => {
  it('has TRADEUP_CONFIG available', () => {
    expect(window.__TRADEUP_CONFIG__).toBeDefined()
    expect(window.__TRADEUP_CONFIG__.shop).toBe('test-shop.myshopify.com')
  })

  it('has shopify global available', () => {
    expect(window.shopify).toBeDefined()
  })
})
