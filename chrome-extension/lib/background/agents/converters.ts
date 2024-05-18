import type { ChatCompletionMessageParam, ChatCompletionUserMessageParam } from 'openai/resources';

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

export function splitArrayByIndex<T>(array: T[], index: number) {
  return [array.slice(0, index), array.slice(index)] as const;
}
