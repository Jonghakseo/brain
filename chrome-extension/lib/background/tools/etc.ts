import { getCurrentTab } from '@lib/background/tools/getCurrentTab';
import { PartyEffectMessage } from '@chrome-extension-boilerplate/shared';
import { zodFunction } from '@lib/background/tools/zodFunction';
import { z } from 'zod';

async function partyFirecrackers() {
  const tab = await getCurrentTab();
  if (!tab?.id) {
    return { success: false };
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: 'partyEffect' } as PartyEffectMessage);
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}
export const etcTools = [
  zodFunction({
    function: partyFirecrackers,
    schema: z.object({}),
    description: 'Show Firecrackers into the current tab. :)',
  }),
];
