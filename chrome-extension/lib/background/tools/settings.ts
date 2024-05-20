import { z } from 'zod';
import { zodFunction } from './zodFunction';
import { settingStorage, toolsStorage } from '@chrome-extension-boilerplate/shared';

async function getAIConfig() {
  const { llmConfig } = await settingStorage.get();
  return llmConfig;
}

const UpdateAIConfigSchema = z.object({
  maxTokens: z.number().min(1).max(4096).optional(),
  topP: z.number().min(0).max(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

async function updateAIConfig(params: z.infer<typeof UpdateAIConfigSchema>) {
  for await (const key of Object.keys(params)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await settingStorage.updateLLMConfig(key, params[key]);
  }
  const { llmConfig } = await settingStorage.get();
  return llmConfig;
}

export const settingTools = [
  zodFunction({
    function: getAIConfig,
    schema: z.object({}),
    description: 'Get This AI(LLM) config',
  }),
  zodFunction({
    function: updateAIConfig,
    schema: UpdateAIConfigSchema,
    description: 'Update AI(LLM) config and return the updated config',
  }),
];
