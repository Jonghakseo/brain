import OpenAI from 'openai';
import { billingInfoStorage, settingStorage, type Chat } from '@chrome-extension-boilerplate/shared';
import type {
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletion,
  ChatCompletionMessageParam,
} from 'openai/resources';

type ChatWithoutCreatedAt = Omit<Chat, 'createdAt'>;

export class LLM {
  client: OpenAI;
  model: OpenAI.Chat.ChatModel;

  constructor(key: string) {
    this.model = 'gpt-4o-2024-05-13';
    this.client = new OpenAI({ apiKey: key });
  }

  private async setUsage(usage: ChatCompletion['usage']) {
    const { completion_tokens, prompt_tokens } = usage;
    await billingInfoStorage.addInputTokens(prompt_tokens);
    await billingInfoStorage.addOutputTokens(completion_tokens);
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
        content.push({ type: 'image_url', image_url: { url: chat.content.image } });
      }
      return { role: 'user', content };
    }
    if (chat.type === 'ai') {
      return { role: 'assistant', content: chat.content.text };
    }
  }

  private async createChatCompletion(messages: ChatCompletionMessageParam[]) {
    const { presencePenalty, frequencyPenalty, topP, temperature, maxTokens } = await settingStorage.get();
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
    });
    res.usage && this.setUsage(res.usage);
    return res.choices.at(0).message.content;
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
