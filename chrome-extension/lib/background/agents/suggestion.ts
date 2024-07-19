import { OpenAILLM } from '@lib/background/agents/openai';
import type { ChatCompletionSystemMessageParam } from 'openai/resources';
import { Chat } from '@chrome-extension-boilerplate/shared';
import { convertChatToOpenAIFormat, replaceImageMessages } from '@lib/background/agents/converters';

export class SuggestionLLM extends OpenAILLM {
  name = 'SuggestionLLM';
  isJson = true;

  constructor() {
    super('gpt-4o-mini');
  }

  makeSystemMessage(systemPrompt: string): ChatCompletionSystemMessageParam {
    return {
      role: 'system',
      content: systemPrompt,
    };
  }

  async chatSuggest({ text, history }: { text: string; history: Chat[] }) {
    this.config = {
      temperature: 0.2,
      topP: 0.7,
      maxTokens: 3000,
      systemPrompt: 'You are a thoughtful and well-grounded suggestion maker.',
    };

    const historyWithoutImage = replaceImageMessages(history.map(chat => convertChatToOpenAIFormat(chat)));
    const res = await this.createChatCompletion({
      n: 1,
      messages: [
        ...historyWithoutImage,
        {
          role: 'user',
          content: `Suggest the rest of the sentence by inference to complete it. Before text is "${text}". 
          For example, After 'hello', say 'world'. 
          You should suggest a sentence that makes sense. Please respond with JSON format. -> {"after": "world"}
          If it's already a complete sentence, return an empty string. -> {"after": ""}
          `,
        },
      ],
    });

    const content = res.choices.at(0)?.message.content ?? '';

    if (!content) {
      return '';
    }

    const json = JSON.parse(content);
    console.log('Suggest response', json);
    return json.after || '';
  }
}
