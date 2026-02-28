import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate as admin', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Username').fill('admin');
    await page.getByPlaceholder('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('/', { timeout: 60000 });
    await expect(page.getByText('Dashboard').first()).toBeVisible();

    await page.context().storageState({ path: authFile });
});
