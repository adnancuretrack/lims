import { test, expect } from '@playwright/test';

test.describe('Master Data Configuration', () => {
    const timestamp = Date.now();
    const clientCode = `E2E-CLI-${timestamp}`;
    const clientName = `E2E Client ${timestamp}`;
    const methodCode = `E2E-MET-${timestamp}`;
    const productName = `E2E-PROD-${timestamp}`;

    test('should configure a full master data set (Client, Method, Product, Links)', async ({ page }) => {
        test.setTimeout(240000); // 4 minutes

        // 1. Create Client
        await page.goto('/clients');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Create Client' }).click();
        await page.waitForSelector('.ant-modal-content', { state: 'visible', timeout: 30000 });

        await page.getByLabel('Client Code').fill(clientCode);
        await page.getByLabel('Client Name').fill(clientName);
        await page.getByLabel('Contact Person').fill('E2E Tester');
        await page.getByRole('button', { name: 'OK' }).click();

        await expect(page.getByText('Client created successfully')).toBeVisible({ timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // 2. Create Test Method
        await page.goto('/test-methods');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Add Test Method' }).click();
        await page.waitForSelector('.ant-modal-content', { state: 'visible', timeout: 30000 });

        await page.getByLabel('Method Code').fill(methodCode);
        await page.getByLabel('Method Name').fill(`Method ${timestamp}`);
        await page.getByLabel('Unit').fill('mg/L');
        await page.getByRole('button', { name: 'OK' }).click();

        await expect(page.getByText('Method created successfully')).toBeVisible({ timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // 3. Create Product
        await page.goto('/products');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Create Product' }).click();
        await page.waitForSelector('.ant-modal-content', { state: 'visible', timeout: 30000 });

        await page.getByLabel('Product Code').fill(clientCode.replace('CLI', 'PROD')); // Unique
        await page.getByLabel('Product Name').fill(productName);
        await page.getByLabel('Category').fill('General');
        await page.getByRole('button', { name: 'OK' }).click();

        await expect(page.getByText('Product created successfully')).toBeVisible({ timeout: 30000 });
        await page.waitForLoadState('networkidle');

        // 4. Link Product and Method
        // Here we search for our product and click its Configure button
        await page.getByPlaceholder('Search').fill(productName);
        await page.waitForTimeout(1000); // Wait for search debounce

        await page.getByRole('button', { name: 'Configure' }).first().click();
        await page.waitForSelector('.ant-modal-content', { state: 'visible', timeout: 30000 });

        await page.getByLabel('Add Test Method').click();
        await page.waitForSelector('.ant-select-item-option-content', { timeout: 30000 });
        await page.locator('.ant-select-item-option-content').getByText(methodCode).click();

        await page.getByRole('button', { name: 'Add' }).click();
        await expect(page.getByText('Method linked successfully')).toBeVisible({ timeout: 30000 });
    });
});
