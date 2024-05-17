import { zodFunction } from '@lib/background/tools/zodFunction';
import { z } from 'zod';
import { delay } from '@chrome-extension-boilerplate/shared';

const SearchByTextParams = z.object({
  searchText: z.string(),
  position: z.enum(['CURRENT_TAB', 'NEW_TAB', 'NEW_WINDOW']).default('NEW_TAB').optional(),
});

async function searchByGoogle({ searchText, position = 'CURRENT_TAB' }: z.infer<typeof SearchByTextParams>) {
  try {
    await chrome.search.query({ text: searchText, disposition: position });
    await delay(1000); // wait for 1 second for the search to complete.
    return { success: true, message: 'Search completed. Now you can request me to capture the screen!' };
  } catch (e) {
    console.error(e);
    return { success: false, error: (e as Error).message };
  }
}

export const searchTools = [
  zodFunction({
    function: searchByGoogle,
    schema: SearchByTextParams,
    description: 'Search the web with the given text. You can get info by screen capture after searching.',
  }),
];
