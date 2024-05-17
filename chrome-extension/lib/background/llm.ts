import OpenAI from 'openai';
import {
  billingInfoStorage,
  type Chat,
  conversationStorage,
  settingStorage,
  toolsStorage,
  LOADING_PLACEHOLDER,
  calculateImageFileSize,
} from '@chrome-extension-boilerplate/shared';
import type {
  ChatCompletion,
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';
import { billingTools, etcTools, settingTools, urlTools, screenTools } from '@lib/background/tools';
import { RunnableTools } from 'openai/lib/RunnableFunction';
import { Screen } from '@lib/background/program/Screen';

type ChatWithoutCreatedAt = Omit<Chat, 'createdAt'>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_TOOLS: RunnableTools<any[]> = [
  ...billingTools,
  ...settingTools,
  ...urlTools,
  ...screenTools,
  ...etcTools,
  // TODO: this function is unstable
  // ...domTools
];

chrome.runtime.onInstalled.addListener(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  void toolsStorage.registerTools(ALL_TOOLS);
});

export class LLM {
  client: OpenAI;
  model: OpenAI.Chat.ChatModel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools = ALL_TOOLS;
  scheduledMessageContent: Chat['content'] | null = null;

  constructor(key: string) {
    this.model = 'gpt-4o-2024-05-13';
    this.client = new OpenAI({ apiKey: key });
  }

  private async setUsage(usage: ChatCompletion['usage']) {
    const { completion_tokens, prompt_tokens } = usage ?? {};
    prompt_tokens && (await billingInfoStorage.addInputTokens(prompt_tokens));
    completion_tokens && (await billingInfoStorage.addOutputTokens(completion_tokens));
  }

  private convertChatToOpenAIFormat(
    chat: ChatWithoutCreatedAt,
  ): ChatCompletionAssistantMessageParam | ChatCompletionUserMessageParam {
    if (chat.type === 'user') {
      const content: ChatCompletionUserMessageParam['content'] = [];
      if (chat.content.text) {
        content.push({ type: 'text', text: chat.content.text });
      }
      if (chat.content.image) {
        content.push({
          type: 'text',
          text: `This Image's width:${chat.content.image.w} height:${chat.content.image.h}`,
        });
        content.push({ type: 'image_url', image_url: { url: chat.content.image.base64 } });
      }
      return { role: 'user', content };
    }
    return { role: 'assistant', content: chat.content.text };
  }

  private async createChatCompletion(messages: ChatCompletionMessageParam[]) {
    const { openaiConfig, extensionConfig } = await settingStorage.get();
    const { forgetChatAfter } = extensionConfig;
    const { presencePenalty, frequencyPenalty, topP, temperature, maxTokens } = openaiConfig;
    let text = '';
    const createdAt = await conversationStorage.startAIChat();
    const activateTools = await toolsStorage.getActivatedTools();

    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: openaiConfig.systemPrompt,
    };

    const stream = this.client.beta.chat.completions
      .runTools({
        model: this.model,
        messages: [systemMessage, ...messages.slice(-forgetChatAfter)],
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stream: true,
        stream_options: { include_usage: true },
        tools: this.tools.filter(tool => activateTools.some(activateTool => activateTool.name === tool.function.name)),
      })
      .on('connect', async () => {})
      .on('functionCall', functionCall => {
        conversationStorage.updateAIChat(createdAt, text + LOADING_PLACEHOLDER);
        console.log('functionCall', functionCall);
        if (functionCall.name === 'captureRequest') {
          this.scheduleScreenCaptureMessage();
        }
      })
      .on('functionCallResult', functionCallResult => console.log('functionCallResult', functionCallResult))
      .on('message', message => console.log('message', message))
      .on('error', error => {
        stream.abort();
        throw error;
      })
      .on('content', content => {
        text += content;
        conversationStorage.updateAIChat(createdAt, text);
      });

    const result = await stream.finalChatCompletion();

    if (result.usage) {
      void this.setUsage(result.usage);
    }

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
    if (messageContent) {
      await conversationStorage.saveUserChat(messageContent);
      await this.chatCompletionWithHistory(messageContent, history);
    }
  }

  async chatCompletion(chatContent: Chat['content']) {
    return this.createChatCompletion([this.convertChatToOpenAIFormat({ type: 'user', content: chatContent })]);
  }

  async chatCompletionWithHistory(chatContent: Chat['content'], history: Chat[]) {
    const historyMessages = history.map(chat => {
      return this.convertChatToOpenAIFormat(chat);
    });

    const messages = [...historyMessages, this.convertChatToOpenAIFormat({ type: 'user', content: chatContent })];

    const res = await this.createChatCompletion(messages);

    await this.flushScheduledMessageContent([
      ...history,
      { type: 'user', content: chatContent, createdAt: res.createdAt },
    ]);

    return res;
  }
}
