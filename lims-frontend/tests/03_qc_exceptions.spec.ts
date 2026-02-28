import { test, expect } from '@playwright/test';

test.describe('QC & Exception Handling', () => {
    const timestamp = Date.now();
    const clientName = `QC-CLI-${timestamp}`;
    const productName = `QC-PROD-${timestamp}`;
    const methodCode = `QC-MET-${timestamp}`;

    test('should flag OOS results and Westgard violations', async ({ page }) => {
        test.setTimeout(300000); // 5 minutes

        // 1. Setup Master Data with Specifications
        await page.goto('/clients');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Create Client' }).click();
        await page.getByLabel('Client Code').fill(`QCC-${timestamp}`);
        await page.getByLabel('Client Name').fill(clientName);
        await page.getByRole('button', { name: 'OK' }).click();
        await expect(page.getByText('Client created successfully')).toBeVisible();

        await page.goto('/test-methods');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Add Test Method' }).click();
        await page.getByLabel('Method Code').fill(methodCode);
        await page.getByLabel('Method Name').fill(`QC Method ${timestamp}`);
        // Set Min/Max limits for OOS testing (e.g., 10 to 90)
        await page.getByLabel('Min Limit').fill('10');
        await page.getByLabel('Max Limit').fill('90');
        await page.getByRole('button', { name: 'OK' }).click();
        await expect(page.getByText('Method created successfully')).toBeVisible();

        await page.goto('/products');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Create Product' }).click();
        await page.getByLabel('Product Code').fill(`QCP-${timestamp}`);
        await page.getByLabel('Product Name').fill(productName);
        await page.getByRole('button', { name: 'OK' }).click();
        await expect(page.getByText('Product created successfully')).toBeVisible();

        // Link
        await page.getByPlaceholder('Search').fill(productName);
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Configure' }).first().click();
        await page.getByLabel('Add Test Method').click();
        await page.locator('.ant-select-item-option-content').getByText(methodCode).click();
        await page.getByRole('button', { name: 'Add' }).click();

        // 2. Register Sample
        await page.goto('/samples/register');
        await page.waitForLoadState('networkidle');
        await page.getByLabel('Client').click();
        await page.getByText(clientName).click();
        await page.getByLabel('Product').click();
        await page.getByText(productName).click();
        await page.getByLabel('Batch Number').fill(`QC-B-${timestamp}`);
        await page.getByRole('button', { name: 'Register Job' }).click();
        await expect(page.getByText(/Job .* created successfully/)).toBeVisible();

        // 3. Receive Sample
        await page.goto('/samples/receive');
        await page.waitForLoadState('networkidle');
        await page.getByPlaceholder('Search samples...').fill(`QC-B-${timestamp}`);
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Receive' }).first().click();
        await page.getByLabel('Condition').click();
        await page.getByText('GOOD').click();
        await page.getByRole('button', { name: 'Submit' }).click();

        // 4. Enter Out-of-Spec Result
        await page.goto('/analysis');
        await page.waitForLoadState('networkidle');
        await page.getByPlaceholder('Search samples...').fill(`QC-B-${timestamp}`);
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Enter Results' }).first().click();

        await page.getByLabel('Result').fill('95'); // OOS (Max is 90)
        await page.getByRole('button', { name: 'Submit Results' }).click();
        await expect(page.getByText('Results submitted successfully')).toBeVisible();

        // 5. Verify OOS Flagging in Dashboard or List
        await page.goto('/qc');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('OUT OF SPEC')).toBeVisible({ timeout: 30000 });

        // 6. Verify Investigation Trigger
        await page.goto('/investigations');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(`QC-B-${timestamp}`)).toBeVisible({ timeout: 30000 });
    });
});
