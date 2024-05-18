import {
  calculateImageFileSize,
  type Chat,
  conversationStorage,
  LOADING_PLACEHOLDER,
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
    ...addCategoryIntoTools(etcTools)('Funny tools'),
    ...addCategoryIntoTools(billingTools)('OpenAI Usage'),
    // ...addCategoryIntoTools(domTools)('dom'),
  ]);
});

export class LLM {
  llm: BaseLLM;
  skipAutoToolsSelection = false;
  scheduledMessageContent: Chat['content'] | null = null;
  persistTools = [...toolManagingTools];

  constructor(llm: BaseLLM) {
    this.llm = llm;
  }

  async chatCompletion(chatContent: Chat['content']) {
    const message = this.convertChatToOpenAIFormat(makeUserChat(chatContent));
    return this.createChatCompletionStream([message]);
  }

  async chatCompletionWithHistory(chatContent: Chat['content'], history: Chat[]) {
    // Convert chat to OpenAI format
    const historyMessages = history.map(this.convertChatToOpenAIFormat);
    // Make new user message
    const newMessage = this.convertChatToOpenAIFormat(makeUserChat(chatContent));
    // Create chat completion stream
    await this.createChatCompletionStream([...historyMessages, newMessage]);

    // Flush scheduled message content
    if (this.scheduledMessageContent) {
      await this.flushScheduledMessageContent([...history, makeUserChat(chatContent)]);
    }
  }

  private async createChatCompletionStream(_messages: ChatCompletionMessageParam[]) {
    const { llmConfig, extensionConfig } = await settingStorage.get();
    const { forgetChatAfter, autoSelectModel, useLatestImage, autoToolSelection } = extensionConfig;

    let messages = _messages.slice(-forgetChatAfter);

    this.llm.config = llmConfig;

    const createdAt = await conversationStorage.startAIChat();

    // Auto tool detection for reduce openai token usage
    if (autoToolSelection) {
      await this.autoToolDetection(messages);
    }

    // Set tools by activate status. It depends on auto tool detection or user toggle
    await this.setThisToolsByActivate();

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
    const throttledUpdateAIChat = makeThrottle(conversationStorage.updateAIChat, 32);
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
        conversationStorage.updateAIChat(
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
    if (chat.type === 'user') {
      const content: ChatCompletionUserMessageParam['content'] = [];
      if (chat.content.text) {
        content.push({ type: 'text', text: chat.content.text });
      }
      if (chat.content.image) {
        content.push({ type: 'image_url', image_url: { url: chat.content.image.base64 } });
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
    const activateTools = await toolsStorage.getActivatedTools();
    const hasImageTool = activateTools.some(tool => tool.name === 'captureRequest');
    if (hasImageTool) {
      return false;
    }
    if (activateTools.length > this.persistTools.length + 2) {
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
      ...this.persistTools,
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

  private async flushScheduledMessageContent(history: Chat[]) {
    if (!this.scheduledMessageContent) {
      throw new Error('No scheduled message content');
    }
    const messageContent = this.scheduledMessageContent;
    this.scheduledMessageContent = null;
    this.skipAutoToolsSelection = true;
    await conversationStorage.saveUserChat(messageContent);
    const chat = await conversationStorage.getLastAIChat();
    chat && (await conversationStorage.deleteChat(chat.createdAt));
    await this.chatCompletionWithHistory(messageContent, history);
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
