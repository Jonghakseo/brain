import {
  calculateImageFileSize,
  type Chat,
  conversationStorage,
  LOADING_PLACEHOLDER,
  programStorage,
  settingStorage,
  toolsStorage,
} from '@chrome-extension-boilerplate/shared';
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';
import {
  billingTools,
  etcTools,
  programTools,
  screenTools,
  searchTools,
  settingTools,
  tabsTools,
  toolManagingTools,
  urlTools,
} from '@lib/background/tools';
import { Screen } from '@lib/background/program/Screen';
import { ToolSelector } from '@lib/background/agents/toolSelector';
import { BaseLLM } from '@lib/background/agents/base';
import { replaceImageMessages, splitArrayByIndex } from '@lib/background/agents/converters';
import { ExtensionConfig } from '@chrome-extension-boilerplate/shared/dist/lib/storages/settingStorage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_TOOLS = [
  ...billingTools,
  ...settingTools,
  ...urlTools,
  ...screenTools,
  ...etcTools,
  ...tabsTools,
  // TODO: this function is unstable
  // ...domTools,
];

const camelCaseToSentence = (camelCase: string) => {
  return camelCase.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

chrome.runtime.onInstalled.addListener(() => {
  const addCategoryIntoTools =
    <T>(tools: T[]) =>
    (categoryName: string) => {
      return tools.map(tool => ({ ...tool, category: categoryName })) as T & { category: string }[];
    };

  // Resister all tools when the extension is installed
  void toolsStorage.registerTools([
    ...addCategoryIntoTools(toolManagingTools)('Config'),
    ...addCategoryIntoTools(settingTools)('Config'),
    ...addCategoryIntoTools(urlTools)('History & Bookmark'),
    ...addCategoryIntoTools(tabsTools)('Tab Manage & Navigation'),
    ...addCategoryIntoTools(screenTools)('Search & Screen Capture'),
    ...addCategoryIntoTools(searchTools)('Search & Screen Capture'),
    ...addCategoryIntoTools(programTools)('Programs & Macros'),
    ...addCategoryIntoTools(etcTools)('ETC tools'),
    ...addCategoryIntoTools(billingTools)('OpenAI Usage'),
    // ...addCategoryIntoTools(domTools)('dom'),
  ]);
});

export class LLM {
  llm: BaseLLM;
  skipAutoToolsSelection = false;
  scheduledMessageContent: Chat['content'] | null = null;
  extensionConfig: ExtensionConfig | null = null;

  constructor(llm: BaseLLM) {
    this.llm = llm;
  }

  //   async generateProgram(programId: string) {
  //     const program = await programStorage.getProgram(programId);
  //     this.llm.tools = ALL_TOOLS;
  //     this.llm.model = 'gpt-3.5-turbo';
  //     this.llm.config = {
  //       maxTokens: 1000,
  //       topP: 0.5,
  //       temperature: 0.1,
  //       systemPrompt: "You're a logical programmer.",
  //     };
  //     this.llm.toolChoice = 'none';
  //     const history: ChatCompletionMessageParam[] = [];
  //
  //     const fewShot = [
  //       `
  // If i call this program(${program.name}), it will be like this. "${program.description}"\n
  // How can i make a program logic? Just tell me a plan not execute code. slice it into steps.
  // like this.
  //
  // \`\`\`json
  // {
  //   "steps": [
  //     {
  //       "step": 1,
  //       "tool": "getCurrentTabInfo",  // -> REQUIRED
  //       "description": "This is the first step."
  //     },
  //     {
  //       "step": 2,
  //       "tool": "navigateTab", // -> REQUIRED
  //       "description": "This is the second step."
  //     }
  //   ]
  // }
  // \`\`\
  // `,
  //     ];
  //
  //     const createChat = async (text: string) => {
  //       history.push(this.convertChatToOpenAIFormat(makeUserChat({ text })));
  //       const response = await this.llm.createChatCompletionWithTools({
  //         messages: history,
  //       });
  //       const responseText = response.choices.at(0)?.message.content;
  //       if (typeof responseText !== 'string') {
  //         throw new Error('Response text is not string');
  //       }
  //       history.push(this.convertChatToOpenAIFormat(makeAssistantChat({ text: responseText })));
  //       return responseText;
  //     };
  //
  //     function* keepAsking() {
  //       let MAX_RETRY = 4;
  //       while (fewShot.length > 0 && MAX_RETRY > 0) {
  //         MAX_RETRY--;
  //         const remain = fewShot.shift();
  //         yield createChat(remain ?? '');
  //       }
  //     }
  //
  //     const chatGenerator = keepAsking();
  //     const generatedProgramStructure = z.object({
  //       steps: z.array(
  //         z.object({
  //           step: z.number().or(z.string()),
  //           tool: z.enum(ALL_TOOLS.map(tool => tool.function.name) as [string, ...string[]]),
  //         }),
  //       ),
  //     });
  //
  //     let generatedProgram: z.infer<typeof generatedProgramStructure> | null = null;
  //     for (const chat of chatGenerator) {
  //       const answer = await chat;
  //       console.log('history', history);
  //       console.log('answer', answer);
  //       const jsonPart = answer.match(/```json\n([\s\S]+)\n```/);
  //       if (!jsonPart) {
  //         continue;
  //       }
  //       try {
  //         const jsonObj = JSON.parse(jsonPart[1]);
  //         const { success, error } = generatedProgramStructure.safeParse(jsonObj);
  //         if (success) {
  //           generatedProgram = jsonObj;
  //           break;
  //         } else {
  //           fewShot.push(`This is zodError, please fix your answer.\n${error?.toString()}`);
  //         }
  //       } catch (e) {
  //         fewShot.push('Error in JSON parse, please fix it.');
  //         generatedProgram = null;
  //       }
  //     }
  //     if (generatedProgram) {
  //       await programStorage.updateProgram(programId, { __generated: generatedProgram });
  //     }
  //     return generatedProgram;
  //   }

  async runProgram(programId: string) {
    const { llmConfig, extensionConfig } = await settingStorage.get();
    const program = await programStorage.getProgram(programId);
    if (program.steps.length === 0) {
      throw new Error('Program has no steps');
    }
    const initialPrompt = `You're a Chrome browser automation extension.
    Look at this json structure, and let's try do it. Step by step.
    
    \`\`\`json
    ${JSON.stringify(program.steps, null, 2)}
    \`\`\`
    `;

    this.llm.config = {
      ...llmConfig,
      maxTokens: 4000,
      topP: 0.1,
      temperature: 0.1,
      systemPrompt: "You're a Chrome browser automation extension.",
    };
    this.extensionConfig = {
      ...extensionConfig,
      autoToolSelection: false,
      autoSelectModel: true,
    };

    const createdAt = await conversationStorage.startAIChat();
    const history: ChatCompletionMessageParam[] = [];
    history.push(this.convertChatToOpenAIFormat(makeUserChat({ text: initialPrompt })));

    const throttledUpdateAIChat = getThrottledUpdateAIChat();

    const createChat = async (chat: Chat, toolName: string) => {
      history.push(this.convertChatToOpenAIFormat(chat));
      const useLowModel = await this.determineUseLowModel(history);
      this.llm.model = useLowModel ? 'gpt-3.5-turbo' : 'gpt-4o';
      this.llm.tools = ALL_TOOLS.filter(tool => tool.function?.name === toolName);
      const response = await this.llm.createChatCompletionWithTools({
        messages: history,
        onFunctionCall: functionCall => {
          if (!functionCall?.name) {
            return;
          }
          const functionName = camelCaseToSentence(functionCall.name);
          throttledUpdateAIChat(createdAt, `${functionName} ${LOADING_PLACEHOLDER}`);
          if (functionCall.name === 'captureRequest') {
            this.scheduleScreenCaptureMessage();
          }
        },
      });
      const responseText = response.choices.at(0)?.message.content ?? 'None';
      history.push(this.convertChatToOpenAIFormat(makeAssistantChat({ text: responseText })));
      await this.flushScheduledMessageContent(async chat => {
        await createChat(chat, toolName);
      });

      return responseText;
    };

    function* keepAsking() {
      const stepsForProgram = program.steps.map((step, index) => {
        const stepIndex = index + 1;
        const toolText = step.tool ? `You can use ${step.tool} tool. ` : '';
        return {
          stepIndex,
          tool: step.tool,
          prompt: `This is step #${stepIndex}. ${toolText} for ${step.whatToDo}.
          Your answer will be used by next step. so, please write it with detail information.
          `,
        };
      });
      while (stepsForProgram.length > 0) {
        const step = stepsForProgram.shift();
        if (!step) {
          break;
        }
        const response = createChat(makeUserChat({ text: step.prompt }), step.tool);
        yield { response, step };
      }
    }

    let text = '';
    const stepByStep = keepAsking();
    try {
      for (const chat of stepByStep) {
        const { response, step } = chat;
        const responseText = await response;
        text += `\n# Step ${step.stepIndex}\n${responseText}`;
      }
    } finally {
      throttledUpdateAIChat(createdAt, text);
      console.log('HISTORY', history);
    }
  }

  async chatCompletionWithHistory(chatContent: Chat['content'], history: Chat[]) {
    const { llmConfig, extensionConfig } = await settingStorage.get();
    this.llm.config = llmConfig;
    this.extensionConfig = extensionConfig;

    // Set tools by activate status. It depends on auto tool detection or user toggle
    await this.setThisToolsByActivate();

    // Convert chat to OpenAI format
    const historyMessages = history.map(this.convertChatToOpenAIFormat.bind(this));
    // Make new user message
    const newMessage = this.convertChatToOpenAIFormat(makeUserChat(chatContent));
    // Create chat completion stream
    await this.createChatCompletionStream([...historyMessages, newMessage]);

    // Flush scheduled message content
    await this.flushScheduledMessageContent(async chat => {
      await this.chatCompletionWithHistory(chat['content'], history);
    });
  }

  private async createChatCompletionStream(_messages: ChatCompletionMessageParam[]) {
    if (!this.extensionConfig) {
      throw new Error('Extension config is not set');
    }
    const { forgetChatAfter, autoSelectModel, useLatestImage, autoToolSelection } = this.extensionConfig;

    let messages = _messages.slice(-forgetChatAfter);

    const createdAt = await conversationStorage.startAIChat();

    // Auto tool detection for reduce openai token usage
    if (autoToolSelection) {
      await this.autoToolDetection(messages);
    }

    // Auto select model by messages. It depends on autoSelectModel setting
    if (autoSelectModel) {
      const useLowModel = await this.determineUseLowModel(messages);
      this.llm.model = useLowModel ? 'gpt-3.5-turbo' : 'gpt-4o';
    }

    // Remove all images except last image
    if (useLatestImage) {
      messages = await this.getMessagesWithoutImagesExceptLast(messages);
    }

    console.log('ACTIVATED TOOLS', this.llm.tools.map(tool => tool.function.name).join(', '));
    const throttledUpdateAIChat = getThrottledUpdateAIChat();
    let text = '';
    await this.llm.createChatCompletionStreamWithTools({
      messages,
      onContent: delta => {
        text += delta;
        throttledUpdateAIChat(createdAt, text);
      },
      onFunctionCall: functionCall => {
        if (!functionCall?.name) {
          return;
        }
        const functionName = camelCaseToSentence(functionCall.name);
        throttledUpdateAIChat(
          createdAt,
          text ? `${text}\n${functionName}...` : `${functionName}` + '  ' + LOADING_PLACEHOLDER,
        );
        if (functionCall.name === 'captureRequest') {
          this.scheduleScreenCaptureMessage();
        }
      },
    });

    return {
      createdAt,
    };
  }

  private convertChatToOpenAIFormat(chat: Chat): ChatCompletionAssistantMessageParam | ChatCompletionUserMessageParam {
    const detail = this.extensionConfig?.detailAnalyzeImage ? 'auto' : 'low';
    if (chat.type === 'user') {
      const content: ChatCompletionUserMessageParam['content'] = [];
      if (chat.content.text) {
        content.push({ type: 'text', text: chat.content.text });
      }
      if (chat.content.image) {
        content.push({
          type: 'image_url',
          image_url: {
            url: chat.content.image.base64,
            detail,
          },
        });
        if (chat.content.image.w && chat.content.image.h) {
          content.push({
            type: 'text',
            text: `This Image's width:${chat.content.image.w} height:${chat.content.image.h}`,
          });
        }
      }
      return { role: 'user', content };
    }
    return { role: 'assistant', content: chat.content.text };
  }

  private async determineUseLowModel(messages: ChatCompletionMessageParam[]) {
    // check has image into messages
    const hasImage = messages.some(message => {
      // eslint-disable-next-line
      // @ts-ignore
      return message.role === 'user' && message.content.some(content => content.type === 'image_url');
    });
    if (hasImage) {
      return false;
    }
    // check has screen capture tool into active tools
    const activateTools = this.llm.tools.map(tool => tool.function.name);
    if (activateTools.length > 5) {
      return false;
    }
    return true;
  }

  private async autoToolDetection(messages: ChatCompletionMessageParam[]) {
    if (this.skipAutoToolsSelection) {
      return;
    }
    try {
      const selector = new ToolSelector();
      // Max 10 messages for auto tool detection
      await selector.selectTool(messages.slice(-10));
    } catch (e) {
      console.warn('Error in AutoToolDetection', e);
    }
  }

  private async setThisToolsByActivate() {
    const activateTools = await toolsStorage.getActivatedTools();
    this.llm.tools = [
      ...toolManagingTools,
      ...ALL_TOOLS.filter(tool => activateTools.some(activateTool => activateTool.name === tool.function.name)),
    ];
  }

  private async getMessagesWithoutImagesExceptLast(messages: ChatCompletionMessageParam[]) {
    const lastImageMessageIndex = this.findLastImageMessageIndex(messages);
    if (lastImageMessageIndex === -1) {
      return messages;
    }
    const [before, after] = splitArrayByIndex(messages, lastImageMessageIndex);
    return [...replaceImageMessages(before), ...after];
  }

  private async scheduleScreenCaptureMessage() {
    const base64 = await Screen.capture();
    const kb = calculateImageFileSize(base64);
    this.scheduledMessageContent = { image: { base64, kb } };
  }

  private async flushScheduledMessageContent(flush: (chat: Chat) => Promise<void>) {
    if (!this.scheduledMessageContent) {
      return;
    }
    const messageContent = this.scheduledMessageContent;
    this.scheduledMessageContent = null;
    this.skipAutoToolsSelection = true;
    await conversationStorage.saveUserChat(messageContent);
    // const chat = await conversationStorage.getLastAIChat();
    // chat && (await conversationStorage.deleteChat(chat.createdAt));
    // await this.chatCompletionWithHistory(messageContent, history);
    await flush(makeUserChat(messageContent));
    this.skipAutoToolsSelection = false;
  }

  findLastImageMessageIndex(messages: ChatCompletionMessageParam[]) {
    for (let i = messages.length - 1; i >= 0; i--) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (messages[i].role === 'user' && messages[i].content.some(content => content.type === 'image_url')) {
        return i;
      }
    }
    return -1;
  }
}

function makeUserChat(content: Chat['content']) {
  return { type: 'user', content, createdAt: Date.now() } as const;
}

function makeAssistantChat(content: Chat['content']) {
  return { type: 'ai', content, createdAt: Date.now() } as const;
}

const getThrottledUpdateAIChat = (ms?: number) => {
  return makeThrottle(conversationStorage.updateAIChat, ms ?? 32);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeThrottle = <T extends (...args: any[]) => any>(fn: T, ms: number) => {
  let id: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (id) {
      clearTimeout(id);
    }
    id = setTimeout(() => {
      id = null;
      fn(...args);
    }, ms);
  };
};
