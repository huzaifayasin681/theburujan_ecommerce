import { test, expect } from '@playwright/test';

test('homepage loads and displays hero', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Burujan/i);
  await expect(page.locator('h1').first()).toBeVisible();
});

test('navigation contains shop link', async ({ page }) => {
  await page.goto('/');
  const shopLink = page.locator('nav a:has-text("Shop")');
  await expect(shopLink).toBeVisible();
});

test('cart page empty state', async ({ page }) => {
  await page.goto('/cart');
  await expect(page.locator('text=Your cart is empty')).toBeVisible();
});
