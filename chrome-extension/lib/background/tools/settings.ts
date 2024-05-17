import { z } from 'zod';
import { zodFunction } from './zodFunction';
import { settingStorage, toolsStorage } from '@chrome-extension-boilerplate/shared';

async function getOpenAIConfig() {
  const { openaiConfig } = await settingStorage.get();
  return openaiConfig;
}

const UpdateOpenAIConfigSchema = z.object({
  frequencyPenalty: z.number().min(0).max(2),
  presencePenalty: z.number().min(0).max(2),
  maxTokens: z.number().min(1).max(4096),
  topP: z.number().min(0).max(1),
  temperature: z.number().min(0).max(2),
});

async function updateOpenAIConfig(params: z.infer<typeof UpdateOpenAIConfigSchema>) {
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

const ToggleToolsActivationParamas = z.object({
  toolName: z.string(),
  isActive: z.boolean(),
});

const toggleToolsActivation = async (params: z.infer<typeof ToggleToolsActivationParamas>) => {
  try {
    if (params.isActive) {
      await toolsStorage.activateTool(params.toolName);
    } else {
      await toolsStorage.deactivateTool(params.toolName);
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
    schema: ToggleToolsActivationParamas,
    description: 'Toggle activation of a tool',
  }),
  zodFunction({
    function: getOpenAIConfig,
    schema: z.object({}),
    description: 'Get This OpenAI(LLM) config',
  }),
  zodFunction({
    function: updateOpenAIConfig,
    schema: UpdateOpenAIConfigSchema,
    description: 'Update OpenAI(LLM) config and return the updated config',
  }),
];
