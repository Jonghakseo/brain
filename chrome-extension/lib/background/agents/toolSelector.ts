import { BaseLLM } from '@lib/background/agents/base';
import { toolsStorage } from '@chrome-extension-boilerplate/shared';
import { zodFunction } from '@lib/background/tools';
import { z } from 'zod';
import { ChatCompletionMessageParam, ChatCompletionUserMessageParam } from 'openai/resources';

export class ToolSelector extends BaseLLM {
  constructor(key: string) {
    super(key);
    this.toolChoice = 'required';
    this.model = 'gpt-3.5-turbo-0125';
    // this.model = 'gpt-4o-2024-05-13';
    this.setConfig({
      temperature: 0.2,
      topP: 1,
      maxTokens: 3000,
      frequencyPenalty: 0,
      presencePenalty: 0,
      systemPrompt: 'You are a tool selector assistant.',
    });
  }

  async selectTool(messages: ChatCompletionMessageParam[]) {
    await toolsStorage.deactivateAllTools();
    const allTools = await toolsStorage.getTools();

    const toolsByCategory = allTools.reduce<{ name: string; methods: { name: string; description: string } }[]>(
      (acc, tool) => {
        const category = acc.find(c => c.name === tool.category);
        if (category) {
          category.methods.push({ name: tool.name, description: tool.description });
        } else {
          acc.push({ name: tool.category, methods: [{ name: tool.name, description: tool.description }] });
        }
        return acc;
      },
      [],
    );

    const ActivateToolsParam = z.object({
      names: z.array(z.enum(toolsByCategory.map(({ name }) => name))).nonempty(),
    });

    let isFirstCall = true;
    async function activateTools(params: z.infer<typeof ActivateToolsParam>) {
      if (!isFirstCall) {
        // FIXME: This is a hack to prevent selecting tools multiple times. The problem is cannot count token usage for selection tools.
        throw new Error('You can call once.');
      }
      isFirstCall = false;
      for (const categoryName of params.names) {
        await toolsStorage.toggleAllByCategory(categoryName, true);
      }

      return { status: 'DONE' };
    }

    async function getSelectableTools() {
      return { tools: toolsByCategory };
    }

    this.tools = [
      zodFunction({
        function: getSelectableTools,
        schema: z.object({}),
        description: 'Get all selectable tools.',
      }),
      zodFunction({
        function: activateTools,
        schema: ActivateToolsParam,
        description: 'Activate tools.',
      }),
    ];

    const messagesWithText = replaceImages(messages);

    const lastMyMessage = messagesWithText.at(-1);
    if (lastMyMessage === undefined) {
      return;
    }
    const request = (lastMyMessage as ChatCompletionUserMessageParam).content.at(0)?.text;
    if (request === undefined) {
      return;
    }

    const res = await this.createChatCompletionWithTools([
      ...messagesWithText.slice(0, -1).slice(-10),
      {
        role: 'user',
        content: `If I type "${request}" in the last chat, and that is a request, Activate tools to handle that request. OR NOT, JUST ANSWER "NO"`,
      },
    ]);
    console.log(res);
    console.log('Selected Tools: ', await toolsStorage.getActivatedTools());
  }
}

function replaceImages(messages: ChatCompletionMessageParam[]) {
  return messages.map(message => {
    if (message.role === 'user') {
      return {
        ...message,
        content: (message as ChatCompletionUserMessageParam).content.map(content => {
          if (content.type === 'image_url') {
            return {
              type: 'text',
              text: `This is an image.`,
            };
          }
          return content;
        }),
      };
    }
    return message;
  });
}
