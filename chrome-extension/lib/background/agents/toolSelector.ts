import { BaseLLM } from '@lib/background/agents/base';
import { toolsStorage } from '@chrome-extension-boilerplate/shared';
import { zodFunction } from '@lib/background/tools';
import { z } from 'zod';
import { ChatCompletionMessageParam } from 'openai/resources';

export class ToolSelector extends BaseLLM {
  constructor(key: string) {
    super(key);
    this.toolChoice = 'required';
    this.setConfig({
      temperature: 0.2,
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
      tools: z.array(z.enum(toolCategories)).min(2),
    });

    async function selectTools(params: z.infer<typeof SelectToolsParam>) {
      const { tools } = params;
      const toolsInCategory = allTools.filter(tool => tools.includes(tool.category));
      for (const tool of toolsInCategory) {
        await toolsStorage.activateTool(tool.name);
      }
      // FIXME: This is a hack to prevent selecting tools multiple times. The problem is cannot count token usage for selection tools.
      throw new Error('You can only select tools once.');
    }

    async function getSelectableTools() {
      return { tools: toolCategories };
    }

    this.tools = [
      zodFunction({
        function: getSelectableTools,
        schema: z.object({}),
        description: 'Get all selectable tools.',
      }),
      zodFunction({
        function: selectTools,
        schema: SelectToolsParam,
        description: 'Select useful tools for the job.',
      }),
    ];

    const res = await this.createChatCompletionWithTools([
      ...messages.slice(-5),
      {
        role: 'user',
        content:
          'Is the last chat from me a request? If so, Select tools to handle that request. OR NOT, JUST ANSWER { status: "NO" }\n\n' +
          'Just Select, Not Call',
      },
    ]);
    console.log(res);
    console.log('Selected Tools: ', await toolsStorage.getActivatedTools());
  }
}
