import { getCurrentTab } from '@lib/background/tools/getCurrentTab';
import { zodFunction } from '@lib/background/tools/zodFunction';
import { z } from 'zod';

async function captureRequest() {
  const tab = await getCurrentTab();
  if (!tab?.id) {
    return { status: 'fail', reason: 'No active tab' };
  }
  return { status: 'success', message: 'Wait a second...' };
}
export const screenTools = [
  zodFunction({
    function: captureRequest,
    schema: z.object({}),
    description: 'Request a screen capture. You may get a screenshot of the current tab.',
  }),
];
