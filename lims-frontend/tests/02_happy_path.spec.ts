import { test, expect } from '@playwright/test';

test.describe('Core Sample Lifecycle (Happy Path)', () => {
    const timestamp = Date.now();
    const clientName = `HP-CLI-${timestamp}`;
    const productName = `HP-PROD-${timestamp}`;
    const methodCode = `HP-MET-${timestamp}`;
    const jobPoolName = `HP-JOB-${timestamp}`;

    test('should complete a full sample lifecycle', async ({ page }) => {
        test.setTimeout(300000); // 5 minutes for the full lifecycle

        // 1. Setup Master Data (Fast-tracked for Happy Path)
        await page.goto('/clients');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Create Client' }).click();
        await page.getByLabel('Client Code').fill(`HPC-${timestamp}`);
        await page.getByLabel('Client Name').fill(clientName);
        await page.getByRole('button', { name: 'OK' }).click();
        await expect(page.getByText('Client created successfully')).toBeVisible({ timeout: 15000 });

        await page.goto('/test-methods');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Add Test Method' }).click();
        await page.getByLabel('Method Code').fill(methodCode);
        await page.getByLabel('Method Name').fill(`Method ${timestamp}`);
        await page.getByRole('button', { name: 'OK' }).click();
        await expect(page.getByText('Method created successfully')).toBeVisible({ timeout: 15000 });

        await page.goto('/products');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Create Product' }).click();
        await page.getByLabel('Product Code').fill(`HPP-${timestamp}`);
        await page.getByLabel('Product Name').fill(productName);
        await page.getByRole('button', { name: 'OK' }).click();
        await expect(page.getByText('Product created successfully')).toBeVisible({ timeout: 15000 });

        // Link Product & Method
        await page.getByPlaceholder('Search').fill(productName);
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Configure' }).first().click();
        await page.getByLabel('Add Test Method').click();
        await page.locator('.ant-select-item-option-content').getByText(methodCode).click();
        await page.getByRole('button', { name: 'Add' }).click();
        await expect(page.getByText('Method linked successfully')).toBeVisible({ timeout: 15000 });

        // 2. Job Registration
        await page.goto('/samples/register');
        await page.waitForLoadState('networkidle');
        await page.getByLabel('Client').click();
        await page.waitForSelector('.ant-select-item-option-content');
        await page.getByText(clientName).click();
        await page.getByLabel('Product').click();
        await page.waitForSelector('.ant-select-item-option-content');
        await page.getByText(productName).click();
        await page.getByLabel('Batch Number').fill(`B-${timestamp}`);
        await page.getByRole('button', { name: 'Register Job' }).click();
        await expect(page.getByText(/Job .* created successfully/)).toBeVisible({ timeout: 30000 });

        // 3. Sample Receipt
        await page.goto('/samples/receive');
        await page.waitForLoadState('networkidle');
        await page.getByPlaceholder('Search samples...').fill(`B-${timestamp}`);
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Receive' }).first().click();
        await page.getByLabel('Condition').click();
        await page.getByText('GOOD').click();
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(page.getByText('Sample received successfully')).toBeVisible({ timeout: 15000 });

        // 4. Result Entry (Analysis)
        await page.goto('/analysis');
        await page.waitForLoadState('networkidle');
        await page.getByPlaceholder('Search samples...').fill(`B-${timestamp}`);
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Enter Results' }).first().click();
        await page.getByLabel('Result').fill('50');
        await page.getByRole('button', { name: 'Submit Results' }).click();
        await expect(page.getByText('Results submitted successfully')).toBeVisible({ timeout: 15000 });

        // 5. Review & Authorization
        await page.goto('/review');
        await page.waitForLoadState('networkidle');
        await page.getByPlaceholder('Search samples...').fill(`B-${timestamp}`);
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Authorize' }).first().click();
        await page.getByRole('button', { name: 'Authorize Sample' }).click();
        await expect(page.getByText('Sample authorized successfully')).toBeVisible({ timeout: 15000 });

        // 6. Reports View
        await page.goto('/reports');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(`B-${timestamp}`)).toBeVisible({ timeout: 30000 });
    });
});
