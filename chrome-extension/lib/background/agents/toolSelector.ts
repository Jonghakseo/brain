import { BaseLLM } from '@lib/background/agents/base';
import { toolsStorage } from '@chrome-extension-boilerplate/shared';
import { zodFunction } from '@lib/background/tools';
import { z } from 'zod';
import { ChatCompletionMessageParam } from 'openai/resources';

export class ToolSelector extends BaseLLM {
  constructor(key: string) {
    super(key);
    this.toolChoice = 'auto';
    this.setConfig({
      temperature: 0.3,
      topP: 1,
      maxTokens: 200,
      frequencyPenalty: 0,
      presencePenalty: 0,
      systemPrompt: 'You are a tool selector assistant.',
    });
  }

  async selectTool(messages: ChatCompletionMessageParam[]) {
    await toolsStorage.deactivateAllTools();
    const allTools = await toolsStorage.getTools();
    const toolCategories = allTools.reduce<string[]>((acc, tool) => {
      if (!acc.includes(tool.category)) {
        return [...acc, tool.category];
      }
      return acc;
    }, []);

    const SelectToolsParam = z.object({
      tools: z.array(z.enum(toolCategories)),
    });

    async function selectTools(params: z.infer<typeof SelectToolsParam>) {
      const { tools } = params;
      const toolsInCategory = allTools.filter(tool => tools.includes(tool.category));
      for (const tool of toolsInCategory) {
        await toolsStorage.activateTool(tool.name);
      }
      return { status: 'OK' };
    }

    this.tools = [
      zodFunction({
        function: selectTools,
        schema: SelectToolsParam,
        description: 'Select useful tools for the job.',
      }),
    ];

    const res = await this.createChatCompletionWithTools([
      ...messages,
      {
        role: 'user',
        content:
          'Is the last chat from me a request? If so, PLEASE! PICK! the best tools to handle that request. OR NOT, JUST ANSWER "NO"',
      },
    ]);
    await toolsStorage.activateTool('getCurrentTabInfo');
    console.log(res);
    console.log('Selected Tools: ', await toolsStorage.getActivatedTools());
  }
}
