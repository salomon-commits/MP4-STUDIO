const { test, expect } = require('@playwright/test');

test('loads the MP4 STUDIO interface and conversion controls', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveTitle(/MP4 Studio/i);
  await expect(page.getByRole('heading', { name: /Vos vidéos/i })).toBeVisible();
  await expect(page.getByLabel('Qualité vidéo')).toBeVisible();
  await expect(page.getByLabel('Résolution maximale')).toBeVisible();
  await expect(page.getByLabel('Audio')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Convertir en MP4' })).toBeDisabled();
  expect(pageErrors).toEqual([]);
});

test('adds a supported video and ignores an identical duplicate', async ({ page }) => {
  await page.goto('/');
  const file = {
    name: 'sample.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('not-a-real-video')
  };

  await page.locator('#files').setInputFiles([file]);
  await expect(page.locator('#count')).toHaveText('1 fichier');
  await expect(page.getByText('sample.mp4')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Convertir en MP4' })).toBeEnabled();

  await page.locator('#files').setInputFiles([file]);
  await expect(page.locator('#count')).toHaveText('1 fichier');
});

test('marks empty and unsupported files as errors instead of converting them', async ({ page }) => {
  await page.goto('/');
  await page.locator('#files').setInputFiles([
    { name: 'empty.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(0) },
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }
  ]);

  await expect(page.locator('#count')).toHaveText('2 fichiers');
  await expect(page.getByText('Fichier vide ou illisible.')).toBeVisible();
  await expect(page.getByText('Type de fichier non reconnu comme vidéo.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Convertir en MP4' })).toBeDisabled();
});
