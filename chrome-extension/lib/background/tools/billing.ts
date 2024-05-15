import { z } from 'zod';
import { zodFunction } from './zodFunction';
import { billingInfoStorage } from '@chrome-extension-boilerplate/shared';

function getBillingInfo() {
  return billingInfoStorage.get();
}
export const billingTools = [
  zodFunction({
    function: getBillingInfo,
    schema: z.object({}),
    description: 'Get billing info with token usage',
  }),
];
