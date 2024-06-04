import { OpenAILLM } from '@lib/background/agents/openai';
import type { ChatCompletionSystemMessageParam } from 'openai/resources';
import { Chat } from '@chrome-extension-boilerplate/shared';
import { convertChatToOpenAIFormat, replaceImageMessages } from '@lib/background/agents/converters';

export class SuggestionLLM extends OpenAILLM {
  name = 'SuggestionLLM';
  isJson = true;

  constructor() {
    super('gpt-3.5-turbo');
  }

  makeSystemMessage(systemPrompt: string): ChatCompletionSystemMessageParam {
    return {
      role: 'system',
      content: systemPrompt,
    };
  }

  async chatSuggest({ text, history }: { text: string; history: Chat[] }) {
    this.config = {
      temperature: 0.6,
      topP: 0.4,
      maxTokens: 2000,
      systemPrompt: 'You are a thoughtful and well-grounded suggestion maker.',
    };

    const historyWithoutImage = replaceImageMessages(history.map(chat => convertChatToOpenAIFormat(chat)));
    const res = await this.createChatCompletion({
      n: 1,
      messages: [
        ...historyWithoutImage,
        {
          role: 'user',
          content: `Suggest sentence of word After "${text}". For example, After 'hello', say 'world'. 
          You should suggest a sentence that makes sense. Please respond with JSON format. -> {"after": "world"}`,
        },
      ],
    });

    return res.choices.at(0)?.message.content ?? '';
  }
}
