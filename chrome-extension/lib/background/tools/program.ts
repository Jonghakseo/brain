import { z } from 'zod';
import { zodFunction } from './zodFunction';
import { programStorage } from '@chrome-extension-boilerplate/shared';
import { OpenAILLM } from '@lib/background/agents/openai';
import { LLM } from '@lib/background/llm';

async function getUserMadeMacroPrograms() {
  const { programs } = await programStorage.get();
  return { programs };
}

const RunProgramParams = z.object({
  programId: z.string(),
});

async function runProgram(params: z.infer<typeof RunProgramParams>) {
  try {
    const baseLLM = new OpenAILLM();
    const llm = new LLM(baseLLM);
    void llm.runProgram(params.programId);
    return { success: true, message: 'Program is running' };
  } catch (e) {
    return { success: false, message: (e as Error).message };
  }
}

export const programTools = [
  zodFunction({
    function: getUserMadeMacroPrograms,
    schema: z.object({}),
    description: 'Get user made macro programs. This is a tool for customizing the extension.',
  }),
  zodFunction({
    function: runProgram,
    schema: RunProgramParams,
    description: 'Run the program with the given programId',
  }),
];
