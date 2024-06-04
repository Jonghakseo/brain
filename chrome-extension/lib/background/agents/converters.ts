import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';
import type { Chat } from '@chrome-extension-boilerplate/shared';

export function replaceImageMessages(
  messages: ChatCompletionMessageParam[],
  replaceContent: ChatCompletionUserMessageParam['content'][number] = {
    type: 'text',
    text: `This is an image.`,
  },
) {
  return messages.map(message => {
    if (message.role === 'user') {
      return {
        ...message,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        content: (message as ChatCompletionUserMessageParam).content.map(content => {
          if (content.type === 'image_url') {
            return replaceContent;
          }
          return content;
        }),
      };
    }
    return message;
  });
}

export function replaceUserChatTextMessage(messages: ChatCompletionMessageParam[], replace: (prev: string) => string) {
  return messages.map(message => {
    if (message.role === 'user') {
      return {
        ...message,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        content: (message as ChatCompletionUserMessageParam).content.map(content => {
          if (content.type === 'image_url') {
            return content;
          }
          return {
            type: 'text',
            text: replace(content.text),
          };
        }),
      };
    }
    return message;
  });
}

export function splitArrayByIndex<T>(array: T[], index: number) {
  return [array.slice(0, index), array.slice(index)] as const;
}

export function convertChatToOpenAIFormat(
  chat: Chat,
  imageDetail?: boolean,
): ChatCompletionAssistantMessageParam | ChatCompletionUserMessageParam {
  const detail = imageDetail ? 'high' : 'auto';
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
