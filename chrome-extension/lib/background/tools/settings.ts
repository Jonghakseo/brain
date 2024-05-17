import { z } from 'zod';
import { zodFunction } from './zodFunction';
import { settingStorage, toolsStorage } from '@chrome-extension-boilerplate/shared';

async function getOpenAiConfig() {
  const { openaiConfig } = await settingStorage.get();
  return openaiConfig;
}

const UpdateOpenAiConfigSchema = z.object({
  frequencyPenalty: z.number().min(0).max(2),
  presencePenalty: z.number().min(0).max(2),
  maxTokens: z.number().min(1).max(4096),
  topP: z.number().min(0).max(1),
  temperature: z.number().min(0).max(2),
});

async function updateOpenAiConfig(params: z.infer<typeof UpdateOpenAiConfigSchema>) {
  for await (const key of Object.keys(params)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await settingStorage.updateOpenAIConfig(key, params[key]);
  }
  const { openaiConfig } = await settingStorage.get();
  return openaiConfig;
}

const getMyTools = async () => {
  return toolsStorage.getTools();
};

const ToggleToolsActivationParams = z.object({
  toolNames: z.array(z.string()),
  isActive: z.boolean(),
});

const toggleToolsActivation = async (params: z.infer<typeof ToggleToolsActivationParams>) => {
  try {
    for (const name of params.toolNames) {
      if (param.isActive) {
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
    function: getOpenAiConfig,
    schema: z.object({}),
    description: 'Get This OpenAI(LLM) config',
  }),
  zodFunction({
    function: updateOpenAiConfig,
    schema: UpdateOpenAiConfigSchema,
    description: 'Update OpenAI(LLM) config and return the updated config',
  }),
];
