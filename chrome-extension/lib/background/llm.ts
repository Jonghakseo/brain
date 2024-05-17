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
  urlTools,
} from '@lib/background/tools';
import { Screen } from '@lib/background/program/Screen';
import { BaseLLM } from '@lib/background/agents/base';
import { ToolSelector } from '@lib/background/agents/toolSelector';

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
    ...addCategoryIntoTools(settingTools)('Config'),
    ...addCategoryIntoTools(urlTools)('History & Bookmark'),
    ...addCategoryIntoTools(tabsTools)('Tab Manage & Navigation'),
    ...addCategoryIntoTools(screenTools)('Search & Screen Capture'),
    ...addCategoryIntoTools(searchTools)('Search & Screen Capture'),
    ...addCategoryIntoTools(etcTools)('funny tools'),
    ...addCategoryIntoTools(billingTools)('OpenAI Usage'),
    // ...addCategoryIntoTools(domTools)('dom'),
  ]);
});

export class LLM extends BaseLLM {
  skipAutoToolsSelection = false;
  scheduledMessageContent: Chat['content'] | null = null;

  constructor(key: string) {
    super(key);
  }

  private makeUserChat(content: Chat['content']) {
    return { type: 'user', content, createdAt: Date.now() };
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

  private async createChatCompletionStream(messages: ChatCompletionMessageParam[]) {
    const { openaiConfig, extensionConfig } = await settingStorage.get();
    const { forgetChatAfter, autoToolSelection } = extensionConfig;

    this.setConfig(openaiConfig);

    const createdAt = await conversationStorage.startAIChat();

    if (autoToolSelection && !this.skipAutoToolsSelection) {
      try {
        conversationStorage.updateAIChat(createdAt, `Selecting tools... ${LOADING_PLACEHOLDER}`);
        const selector = new ToolSelector(this.client.apiKey);
        await selector.selectTool(messages);
      } catch (e) {
        console.warn('Error in autoToolSelection', e);
      }
    }

    const activateTools = await toolsStorage.getActivatedTools();
    this.tools = ALL_TOOLS.filter(tool => activateTools.some(activateTool => activateTool.name === tool.function.name));

    let text = '';
    const result = await this.createChatCompletionStreamWithTools({
      messages: [...messages.slice(-forgetChatAfter)],
      onContent: delta => {
        text += delta;
        conversationStorage.updateAIChat(createdAt, text);
      },
      onFunctionCall: functionCall => {
        const functionName = camelCaseToSentence(functionCall.name);
        conversationStorage.updateAIChat(
          createdAt,
          text ? `${text}\n${functionName}...` : functionName + '  ' + LOADING_PLACEHOLDER,
        );
        if (functionCall.name === 'captureRequest') {
          this.scheduleScreenCaptureMessage();
        }
      },
    });

    return {
      createdAt,
      content: result.choices.at(0)?.message.content,
    };
  }

  async scheduleScreenCaptureMessage() {
    const base64 = await Screen.capture();
    const kb = calculateImageFileSize(base64);
    this.scheduledMessageContent = { image: { base64, kb } };
  }

  async flushScheduledMessageContent(history: Chat[]) {
    const messageContent = this.scheduledMessageContent;
    this.scheduledMessageContent = null;
    this.skipAutoToolsSelection = true;
    if (messageContent) {
      await conversationStorage.saveUserChat(messageContent);
      await this.chatCompletionWithHistory(messageContent, history);
    }
    this.skipAutoToolsSelection = false;
  }

  async chatCompletion(chatContent: Chat['content']) {
    const message = this.convertChatToOpenAIFormat(this.makeUserChat(chatContent));
    return this.createChatCompletionStream([message]);
  }

  async chatCompletionWithHistory(chatContent: Chat['content'], history: Chat[]) {
    const historyMessages = history.map(this.convertChatToOpenAIFormat);
    const newMessage = this.convertChatToOpenAIFormat(this.makeUserChat(chatContent));
    await this.createChatCompletionStream([...historyMessages, newMessage]);

    await this.flushScheduledMessageContent([...history, this.makeUserChat(chatContent)]);
  }
}
