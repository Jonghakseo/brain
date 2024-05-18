import { BaseLLM } from '@lib/background/agents/base';
import { toolsStorage } from '@chrome-extension-boilerplate/shared';
import { zodFunction } from '@lib/background/tools';
import { z } from 'zod';
import { ChatCompletionMessageParam, ChatCompletionUserMessageParam } from 'openai/resources';

export class ToolSelector extends BaseLLM {
  name = 'ToolSelector';

  constructor(key: string) {
    super(key);
    this.toolChoice = 'required';
    this.model = 'gpt-3.5-turbo-0125';
    // this.model = 'gpt-4o-2024-05-13';
    this.setConfig({
      temperature: 0.2,
      topP: 0.2,
      maxTokens: 2000,
      frequencyPenalty: 0,
      presencePenalty: 0,
      systemPrompt:
        'You are a tool selector assistant. Please activate the necessary tools perfectly. Think step by step.',
    });
  }

  async selectTool(messages: ChatCompletionMessageParam[]) {
    const allTools = await toolsStorage.getTools();
    const initialActivatingTools = await toolsStorage.getActivatedTools();
    await toolsStorage.deactivateAllTools();

    const toolsByCategory = allTools.reduce<
      { name: string; isActivated: false; abilities: { name: string; desc: string }[] }[]
    >((acc, tool) => {
      const category = acc.find(c => c.name === tool.category);
      if (category) {
        category.abilities.push({ name: tool.name, desc: tool.description });
      } else {
        acc.push({
          name: tool.category ?? 'Uncategorized',
          isActivated: false,
          abilities: [{ name: tool.name, desc: tool.description }],
        });
      }
      return acc;
    }, []);

    const toolNames = toolsByCategory.map(({ name }) => name) as [string, ...string[]];
    const BulkActivateToolsParam = z.object({
      names: z.array(z.enum(toolNames)).min(1).max(3),
    });

    async function bulkActivateTools(params: z.infer<typeof BulkActivateToolsParam>) {
      for (const categoryName of params.names) {
        await toolsStorage.toggleAllByCategory(categoryName, true);
      }
      throw new Error('You can call once.');

      return {};
    }

    this.tools = [
      zodFunction({
        function: bulkActivateTools,
        schema: BulkActivateToolsParam,
        description:
          'Activate multiple tools. You can pass multiple names. (ex. ["Config", "Search & Screen Capture"])',
      }),
    ];

    const messagesWithText = this.replaceImageMessages(messages);

    const lastMyMessage = messagesWithText.at(-1);
    if (lastMyMessage === undefined) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const request = (lastMyMessage as ChatCompletionUserMessageParam).content.at(0).text;
    if (request === undefined) {
      return;
    }

    const selectableToolsText = JSON.stringify(toolsByCategory, null, 2);

    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        for (const initialActivatingTool of initialActivatingTools) {
          await toolsStorage.activateTool(initialActivatingTool.name);
        }
        reject('Tool Selector Timeout');
      }, 5000);

      try {
        this.createChatCompletionWithTools({
          messages: [
            ...messagesWithText.slice(0, -1),
            {
              role: 'user',
              content: `If I type "${request}" in the last chat, and that is a request, Activate tools to handle that request (IF NEEDED!). OR NOT, JUST ANSWER "NO"\n\n'''json\n${selectableToolsText}'''\n\n`,
            },
          ],
          onEnd: () => {
            clearTimeout(timeoutId);
            resolve();
          },
          onError: () => {
            clearTimeout(timeoutId);
            resolve();
          },
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}
