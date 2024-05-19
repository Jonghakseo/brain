import { z } from 'zod';
import { zodFunction } from './zodFunction';
import { programStorage } from '@chrome-extension-boilerplate/shared';

function getUserMadeMacroPrograms() {
  return programStorage.get();
}

export const programTools = [
  zodFunction({
    function: getUserMadeMacroPrograms,
    schema: z.object({}),
    description: 'Get user made macro programs. This is a tool for customizing the extension.',
  }),
];
