import { test, expect } from '@playwright/test';

test.describe('Happy Path: Sample Lifecycle', () => {
    test('should complete a full sample lifecycle from registration to authorization', async ({ page }) => {
        // 1. Navigate to Sample Registration
        await page.goto('/samples/register');
        await expect(page.getByText('Orchestrate New Job')).toBeVisible();

        // 2. Register a new Job/Sample
        // Select Client
        await page.locator('.ant-select-selection-search-input').first().click();
        await page.getByText('Saudi Aramco').first().click();

        // Select Priority
        await page.getByLabel('Priority').click();
        await page.getByText('Normal', { exact: true }).click();

        // Select Product for the first sample
        await page.getByPlaceholder('Product').click();
        await page.getByText('Diesel Fuel').first().click();

        // Fill description
        await page.getByPlaceholder('Description').fill('E2E Test Sample');

        // Click Register
        await page.getByRole('button', { name: 'Register Job' }).click();

        // Wait for success and redirection to /samples
        await expect(page).toHaveURL(/.*samples/);
        await expect(page.getByText('Samples registered successfully')).toBeVisible();

        // 3. Get the Sample Number from the list (first row)
        const sampleNumber = await page.locator('table tbody tr').first().locator('td').first().textContent();
        if (!sampleNumber) throw new Error('Could not find sample number in the list');
        console.log(`Working with sample: ${sampleNumber}`);

        // 4. Receive the Sample
        await page.click('text=Sample Intake');
        await page.getByPlaceholder('Scan or enter Sample Number').fill(sampleNumber);
        await page.keyboard.press('Enter');

        await expect(page.getByText(sampleNumber)).toBeVisible();
        await page.getByLabel('Condition').click();
        await page.getByText('GOOD').click();
        await page.getByRole('button', { name: 'Receive Sample', exact: true }).click();

        await expect(page.getByText(/received successfully/)).toBeVisible();

        // 5. Enter Results (Analysis)
        await page.click('text=Analysis');
        // Wait for queue to load and select the sample
        await page.getByRole('cell', { name: sampleNumber }).click();

        await page.getByLabel('Result').fill('0.850'); // Density value
        await page.getByRole('button', { name: 'Save' }).click();

        await expect(page.getByText('Result saved')).toBeVisible();

        // 6. Review & Authorize
        await page.click('text=Review');
        await page.getByRole('cell', { name: sampleNumber }).click();

        await page.getByRole('button', { name: 'Authorize Sample' }).click();
        // Modal confirmation
        await page.getByRole('button', { name: 'Authorize', exact: true }).click();

        await expect(page.getByText(/authorized successfully/)).toBeVisible();

        // 7. Verify Reports
        await page.click('text=Reports');
        // Search for the sample in reports if needed or just look at the list
        await expect(page.getByText(sampleNumber)).toBeVisible();
        // Verify that the sample in reports is clickable or has a download button
        // (Assuming the report page shows authorized samples)
    });
});
