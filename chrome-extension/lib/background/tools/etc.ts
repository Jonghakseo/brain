import { getCurrentTab } from '@lib/background/tools/getCurrentTab';
import { delay, PartyEffectMessage } from '@chrome-extension-boilerplate/shared';
import { zodFunction } from '@lib/background/tools/zodFunction';
import { z } from 'zod';

async function showPartyFirecrackers() {
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

async function getCurrentDate() {
  return { dataString: new Date().toDateString(), dateNow: Date.now() };
}

const DelayParams = z.object({
  ms: z.number().optional(),
});

async function delayMs(params: z.infer<typeof DelayParams>) {
  await delay(params.ms ?? 500);
  const dateInfo = await getCurrentDate();
  return {
    success: true,
    ...dateInfo,
  };
}

export const etcTools = [
  zodFunction({
    function: showPartyFirecrackers,
    schema: z.object({}),
    description: 'Show Firecrackers into the current tab. :)',
  }),
  zodFunction({
    function: getCurrentDate,
    schema: z.object({}),
    description: 'Get the current date and time. text and timestamp.',
  }),
  zodFunction({
    function: delayMs,
    schema: DelayParams,
    description: 'Delay for a page loading before screen capture.',
  }),
];
