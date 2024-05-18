import { z } from 'zod';
import { zodFunction } from './zodFunction';
import { settingStorage, toolsStorage } from '@chrome-extension-boilerplate/shared';

const getMyTools = async () => {
  return toolsStorage.getTools();
};

const ToggleToolsActivationParams = z.object({
  toolNames: z.array(z.string()).min(1),
  isActive: z.boolean(),
});

const toggleToolsActivation = async (params: z.infer<typeof ToggleToolsActivationParams>) => {
  try {
    for (const name of params.toolNames) {
      if (params.isActive) {
        await toolsStorage.activateTool(name);
      } else {
        await toolsStorage.deactivateTool(name);
      }
    }
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
};

export const toolManagingTools = [
  zodFunction({
    function: getMyTools,
    schema: z.object({}),
    description: 'Get all tools for this extension',
  }),
  zodFunction({
    function: toggleToolsActivation,
    schema: ToggleToolsActivationParams,
    description: 'Toggle activation of a tool',
  }),
];
