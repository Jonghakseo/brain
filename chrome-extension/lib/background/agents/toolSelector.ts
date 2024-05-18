import { toolsStorage } from '@chrome-extension-boilerplate/shared';
import { ChatCompletionMessageParam, ChatCompletionUserMessageParam } from 'openai/resources';
import { OpenAiLLM } from '@lib/background/agents/openai';
import { replaceImageMessages } from '@lib/background/agents/converters';

export class ToolSelector extends OpenAiLLM {
  name = 'ToolSelector';

  constructor() {
    super();
    this.toolChoice = 'required';
    this.model = 'gpt-3.5-turbo';
    // this.model = 'gpt-4o';
    this.isJson = true;
    this.config = {
      temperature: 0.7,
      topP: 1,
      maxTokens: 2000,
      systemPrompt: 'You are a TOOL SELECTOR',
    };
  }

  async selectTool(messages: ChatCompletionMessageParam[]) {
    const allTools = await toolsStorage.getTools();
    const allToolsNameAndDescription = allTools.map(tool => ({ name: tool.name, description: tool.description }));
    // const initialActivatingTools = await toolsStorage.getActivatedTools();
    await toolsStorage.deactivateAllTools();

    const messagesWithText = replaceImageMessages(messages);

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

    const selectableToolsText = JSON.stringify(allToolsNameAndDescription, null, 2);

    const result = await this.createChatCompletion({
      n: 5,
      messages: [
        ...messagesWithText.slice(0, -1),
        {
          role: 'user',
          content: `If I type ["${request}"] in the last chat, and it's a request, print out what tool I should use. Please tell me the necessary tools perfectly. Think carefully.
# REQUEST
|> ${request}

---

# EXAMPLES
\`\`\`json
// Request: "Hi. How are you?"
{
  "isNeed": false,
  "activateTools": [],
  "reason": "This request doesn't need any tools."
}
// Request: "It's boring."
{
  "isNeed": false,
  "activateTools": [partyFirecrackers],
  "reason": "This request doesn't need other tools. But you can use partyFirecrackers."
}
// Request: "I want to open github.com and looking for some new interesting repositories."
{
  "isNeed": true,
  "activateTools": [getCurrentTabInfo, getTabsInfo, navigateTab, captureRequest],
  "reason": "This request needs to move or open a new tab. and also need to capture the screen."
} 
\`\`\`

# TOOL LIST

\`\`\`json\n${selectableToolsText}\n\n\`\`\``,
        },
      ],
    });

    const results = result.choices.reduce<Record<string, number>>((acc, choice) => {
      if (choice.message.content) {
        try {
          const content = JSON.parse(choice.message.content) as { isNeed: boolean; activateTools: string[] };
          if (content.isNeed && content.activateTools?.length > 0) {
            content.activateTools.forEach(toolName => {
              acc[toolName] = (acc[toolName] ?? 0) + 1;
            });
          }
        } catch {
          return acc;
        }
      }
      return acc;
    }, {});

    console.log('ToolSelector results:', results);
    for (const [name, number] of Object.entries(results)) {
      // If more than half of the votes are for a tool, activate it.
      if (number > Object.keys(results).length / 2) {
        await toolsStorage.activateTool(name);
      }
    }
  }
}
