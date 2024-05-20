import {
  calculateImageFileSize,
  type Chat,
  conversationStorage,
  DONE_PLACEHOLDER,
  LOADING_PLACEHOLDER,
  programStorage,
  SAVE_PLACEHOLDER,
  settingStorage,
  toolsStorage,
} from '@chrome-extension-boilerplate/shared';
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';
import { Screen } from '@lib/background/program/Screen';
import { ToolSelector } from '@lib/background/agents/toolSelector';
import { BaseLLM } from '@lib/background/agents/base';
import { replaceImageMessages, splitArrayByIndex } from '@lib/background/agents/converters';
import { ExtensionConfig } from '@chrome-extension-boilerplate/shared/dist/lib/storages/settingStorage';
import { ALL_TOOLS, anyCall, toolManagingTools } from '@lib/background/tool';

const camelCaseToSentence = (camelCase: string) => {
  return camelCase.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

export class LLM {
  llm: BaseLLM;
  skipAutoToolsSelection = false;
  scheduledMessageContent: Chat['content'] | null = null;
  extensionConfig: ExtensionConfig | null = null;

  constructor(llm: BaseLLM) {
    this.llm = llm;
  }

  async runProgram(programId: string) {
    const { llmConfig, extensionConfig } = await settingStorage.get();
    const program = await programStorage.getProgram(programId);
    if (program.steps.length === 0) {
      throw new Error('Program has no steps');
    }

    // FIXME: temporary disabled record prompt
    const recordPrompt = '';
    // const recordPrompt = program.__records?.isUseful
    //   ? `This is previous record. It's useful for you. Please check it.\nBut, It just a old record. You should do it new.\n
    //   \n${JSON.stringify(program.__records.history, null, 1)}`
    //   : '';

    const initialPrompt = `You're a Chrome browser automation extension.
    Look at this json structure, and let's try do it. Step by step.
    
    \`\`\`json
    ${JSON.stringify(program.steps, null, 2)}
    \`\`\`
    ${recordPrompt}
    `;

    this.llm.config = {
      ...llmConfig,
      maxTokens: 4000,
      topP: 0.2,
      temperature: 0.2,
      systemPrompt: "You're a Chrome browser automation extension.",
    };
    this.extensionConfig = {
      ...extensionConfig,
      autoToolSelection: false,
    };

    const history: ChatCompletionMessageParam[] = [];
    history.push(this.convertChatToOpenAIFormat(makeUserChat({ text: initialPrompt })));

    const throttledUpdateAIChat = getThrottledUpdateAIChat();

    const createChat = async (chat: Chat, toolNames: string[]) => {
      this.llm.useAnyCall = false; // prevent any call
      this.llm.tools = ALL_TOOLS.filter(tool => toolNames.includes(tool.function?.name ?? 'NONE'));
      const createdAt = await conversationStorage.startAIChat();
      history.push(this.convertChatToOpenAIFormat(chat));
      if (this.extensionConfig?.autoToolSelection) {
        const useLowModel = await this.determineUseLowModel(history);
        this.llm.model = useLowModel ? 'gpt-3.5-turbo' : 'gpt-4o';
      }
      this.llm.log('STEPS TOOL', this.llm.tools);
      let functionName: string | null = null;
      let functionNameRaw: string | null = null;
      const response = await this.llm.createChatCompletionStreamWithTools({
        messages: history,
        onFunctionCall: functionCall => {
          if (!functionCall?.name || functionCall.name === anyCall.function.name) {
            return;
          }
          functionNameRaw = functionCall.name;
          functionName = camelCaseToSentence(functionCall.name);
          throttledUpdateAIChat(createdAt, `${functionName} ${LOADING_PLACEHOLDER}`);
          if (
            functionCall.name === 'captureRequest' ||
            functionCall.arguments?.includes('"toolName":"captureRequest"')
          ) {
            this.scheduleScreenCaptureMessage();
          }
        },
        onFunctionCallResult: functionCallResult => {
          if (functionNameRaw) {
            history.push({
              role: 'function',
              name: functionNameRaw,
              content: functionCallResult,
            });
          }
        },
      });
      const responseText = response.choices.at(0)?.message.content ?? 'NONE';
      history.push(this.convertChatToOpenAIFormat(makeAssistantChat({ text: `DONE` })));
      await this.flushScheduledMessageContent(async chat => {
        await createChat(chat, toolNames);
      });
      if (functionName) {
        throttledUpdateAIChat(createdAt, `${functionName} ${DONE_PLACEHOLDER}`);
      } else {
        throttledUpdateAIChat(createdAt, DONE_PLACEHOLDER);
      }
      return responseText;
    };

    function* keepAsking() {
      const stepsForProgram = program.steps.map((step, index) => {
        const stepIndex = index + 1;
        const toolText = (step.tools?.length ?? 0) > 0 ? `You can use ${step.tools?.join(', ')} tools. ` : '';
        return {
          stepIndex,
          tools: step.tools,
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
        const response = createChat(makeUserChat({ text: step.prompt }), step.tools ?? []);
        yield { response, step };
      }
    }

    const lastMessage = {
      createdAt: -1,
      text: '',
    };
    const stepByStep = keepAsking();
    try {
      for (const chat of stepByStep) {
        const { step, response } = chat;
        lastMessage.text = await response;
        const isLastStep = step.stepIndex === program.steps.length;
        if (isLastStep) {
          lastMessage.createdAt = await conversationStorage.startAIChat();
        }
      }
    } finally {
      await programStorage.updateProgram(programId, { __records: { createdAt: Date.now(), history } });
      if (lastMessage.createdAt !== -1) {
        await conversationStorage.updateAIChat(
          lastMessage.createdAt,
          lastMessage.text + '\n\n' + SAVE_PLACEHOLDER + programId + '\n',
        );
        await conversationStorage.removeAllPlaceholder('loading', DONE_PLACEHOLDER);
      }
    }
    return history;
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
    let record = await this.createChatCompletionStream([...historyMessages, newMessage]);

    // Flush scheduled message content
    await this.flushScheduledMessageContent(async pendingChat => {
      record = await this.chatCompletionWithHistory(pendingChat['content'], history);
    });
    return record;
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
      const detectedTools = await this.autoToolDetection(messages);
      this.llm.tools = detectedTools ?? this.llm.tools;
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

    console.log('LLM::ACTIVATED TOOLS', this.llm.tools.map(tool => tool.function.name).join(', '));
    const throttledUpdateAIChat = getThrottledUpdateAIChat();
    let text = '';
    await this.llm.createChatCompletionStreamWithTools({
      messages,
      onContent: delta => {
        text += delta;
        throttledUpdateAIChat(createdAt, text);
      },
      onFunctionCall: functionCall => {
        if (!functionCall?.name || functionCall.name === anyCall.function.name) {
          return;
        }
        const functionName = camelCaseToSentence(functionCall.name);
        throttledUpdateAIChat(
          createdAt,
          text ? `${text}\n${functionName}...` : `${functionName}` + '  ' + LOADING_PLACEHOLDER,
        );
        if (functionCall.name === 'captureRequest' || functionCall.arguments?.includes('"toolName":"captureRequest"')) {
          this.scheduleScreenCaptureMessage();
        }
      },
    });
    messages.push(this.convertChatToOpenAIFormat(makeAssistantChat({ text })));
    return {
      messages,
      createdAt,
    };
  }

  private convertChatToOpenAIFormat(chat: Chat): ChatCompletionAssistantMessageParam | ChatCompletionUserMessageParam {
    const detail = this.extensionConfig?.detailAnalyzeImage ? 'high' : 'auto';
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
    const activateTools = this.llm.tools.map(tool => tool.function.name);
    // check has too many tools
    if (activateTools.length > 10) {
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
      const detectedTools = await selector.selectTool(messages.slice(-10));
      return ALL_TOOLS.filter(tool => detectedTools.includes(tool.function.name ?? 'NONE'));
    } catch (e) {
      console.warn('Error in AutoToolDetection', e);
      return;
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
