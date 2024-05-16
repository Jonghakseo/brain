import OpenAI from 'openai';
import {
  billingInfoStorage,
  type Chat,
  conversationStorage,
  settingStorage,
} from '@chrome-extension-boilerplate/shared';
import type {
  ChatCompletion,
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';
import { domTools, settingTools, billingTools, urlTools } from '@lib/background/tools';

type ChatWithoutCreatedAt = Omit<Chat, 'createdAt'>;

export class LLM {
  client: OpenAI;
  model: OpenAI.Chat.ChatModel;

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

    const stream = this.client.beta.chat.completions
      .runTools({
        model: this.model,
        messages: messages.slice(-forgetChatAfter),
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stream: true,
        stream_options: { include_usage: true },
        tools: [...billingTools, ...settingTools, ...urlTools, ...domTools],
      })
      .on('connect', async () => {})
      .on('functionCall', usage => console.log('functionCall', usage))
      .on('functionCallResult', usage => console.log('functionCallResult', usage))
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

    result.usage && this.setUsage(result.usage);

    return result.choices.at(0)?.message.content;
  }

  async chatCompletion(chatContent: Chat['content']) {
    return this.createChatCompletion([this.convertChatToOpenAIFormat({ type: 'user', content: chatContent })]);
  }
  async chatCompletionWithHistory(chatContent: Chat['content'], history: Chat[]) {
    const messages = history.map(chat => {
      return this.convertChatToOpenAIFormat(chat);
    });

    return this.createChatCompletion([
      ...messages,
      this.convertChatToOpenAIFormat({ type: 'user', content: chatContent }),
    ]);
  }
}
