import { expect, test } from '@playwright/test';

/*
 * The chat in the corner (ADR-054, ADR-055). The end-to-end stack has no Gemini key, so the chat
 * shows what every visitor sees without the AI assistant: quick answers and TERAN's channels, and
 * never a field for a name or a phone number (the owner's word of 2026-10-23).
 */
test.describe('Chat', () => {
  test('opens on quick answers and TERAN’s channels, asking for no name or phone', async ({
    page,
  }) => {
    await page.goto('/en');
    const launcher = page.getByRole('button', { name: 'Chat with us' });
    await launcher.click();
    const chat = page.getByRole('dialog', { name: 'TERAN chat' });
    await expect(chat).toBeVisible();
    await expect(chat.getByRole('textbox')).toHaveCount(0);
    await expect(chat.getByRole('link', { name: 'Contact page' })).toHaveAttribute(
      'href',
      '/en/contact',
    );

    await chat.getByRole('button', { name: 'Delivery' }).click();
    await expect(chat.getByRole('link', { name: 'More about delivery' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(chat).toBeHidden();
    await expect(launcher).toBeFocused();
  });
});
