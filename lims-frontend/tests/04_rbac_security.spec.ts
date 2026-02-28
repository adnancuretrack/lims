import { test, expect } from '@playwright/test';

test.describe('RBAC & Security Enforcement', () => {
    const timestamp = Date.now();
    const analystUser = `e2e_analyst_${timestamp}`;
    const analystPass = 'analyst123';

    test('should enforce role-based access control', async ({ page }) => {
        test.setTimeout(240000); // 4 minutes

        // 1. Create Analyst User as Admin
        await page.goto('/admin/users');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Add User' }).click();
        await page.waitForSelector('.ant-modal-content', { state: 'visible', timeout: 30000 });

        await page.getByLabel('Username').fill(analystUser);
        await page.getByLabel('Password', { exact: true }).fill(analystPass);
        await page.getByLabel('Display Name').fill(`E2E Analyst ${timestamp}`);
        await page.getByLabel('Email').fill(`analyst-${timestamp}@example.com`);

        await page.getByLabel('Roles').click();
        await page.waitForSelector('.ant-select-item-option-content', { timeout: 30000 });
        await page.getByText('ANALYST', { exact: true }).click();
        await page.keyboard.press('Escape'); // Close dropdown

        await page.getByRole('button', { name: 'OK' }).click();
        await expect(page.getByText('User created successfully')).toBeVisible({ timeout: 15000 });

        // 2. Logout Admin
        await page.locator('.ant-dropdown-trigger').click();
        await page.getByText('Logout').click();
        await page.waitForURL(/.*login/);

        // 3. Login as Analyst
        await page.getByPlaceholder('Username').fill(analystUser);
        await page.getByPlaceholder('Password').fill(analystPass);
        await page.getByRole('button', { name: 'Log in' }).click();
        await page.waitForURL(/.*\//); // Should go to dashboard
        await page.waitForLoadState('networkidle');

        // 4. Verify restricted Sidebar Items are HIDDEN
        await expect(page.getByRole('menuitem', { name: 'Clients' })).not.toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Products' })).not.toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Test Methods' })).not.toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Admin' })).not.toBeVisible();

        // 5. Verify Deep Link Protection (Redirect to Home)
        await page.goto('/clients');
        await page.waitForLoadState('networkidle');
        const urlAfterRedirect = page.url();
        expect(urlAfterRedirect).not.toContain('/clients'); // Should have been redirected

        // 6. Verify accessible items (e.g., Samples, Analysis)
        await expect(page.getByRole('menuitem', { name: 'Samples' })).toBeVisible();
        // Analysis menu is shown if role is ANALYST or ADMIN
        await expect(page.getByRole('menuitem', { name: 'Analysis' })).toBeVisible();
    });
});
