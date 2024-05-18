import { z } from 'zod';
import { zodFunction } from './zodFunction';
import { settingStorage, toolsStorage } from '@chrome-extension-boilerplate/shared';

async function getAiConfig() {
  const { llmConfig } = await settingStorage.get();
  return llmConfig;
}

const UpdateAiConfigSchema = z.object({
  maxTokens: z.number().min(1).max(4096),
  topP: z.number().min(0).max(1),
  temperature: z.number().min(0).max(2),
});

async function updateAiConfig(params: z.infer<typeof UpdateAiConfigSchema>) {
  for await (const key of Object.keys(params)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await settingStorage.updateLLMConfig(key, params[key]);
  }
  const { llmConfig } = await settingStorage.get();
  return llmConfig;
}

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

export const settingTools = [
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
  zodFunction({
    function: getAiConfig,
    schema: z.object({}),
    description: 'Get This AI(LLM) config',
  }),
  zodFunction({
    function: updateAiConfig,
    schema: UpdateAiConfigSchema,
    description: 'Update AI(LLM) config and return the updated config',
  }),
];
