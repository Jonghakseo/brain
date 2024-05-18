import OpenAI from 'openai';
import {
  ChatCompletion,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  ChatModel,
} from 'openai/resources';
import { billingInfoStorage, OpenAIConfig } from '@chrome-extension-boilerplate/shared';
import { RunnableTools } from 'openai/lib/RunnableFunction';
import { ChatCompletionRunner } from 'openai/lib/ChatCompletionRunner';

export class BaseLLM {
  name: string = 'BaseLLM';
  client: OpenAI;
  model: ChatModel;
  config: OpenAIConfig | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: RunnableTools<any[]> = [];
  toolChoice: 'required' | 'auto' = 'auto';
  isJson = false;

  constructor(key: string) {
    this.model = 'gpt-4o-2024-05-13';
    this.client = new OpenAI({ apiKey: key });
  }

  private async saveUsage(usage: ChatCompletion['usage']) {
    const { completion_tokens, prompt_tokens } = usage ?? {};
    const isGPT3 = this.model === 'gpt-3.5-turbo-0125';
    prompt_tokens && (await billingInfoStorage.addInputTokens(prompt_tokens, isGPT3));
    completion_tokens && (await billingInfoStorage.addOutputTokens(completion_tokens, isGPT3));
  }

  protected setConfig(config: OpenAIConfig) {
    this.config = config;
  }
  protected async createChatCompletionWithTools({
    messages,
    onMessage,
    onConnect,
    onContent,
    onError,
    onFunctionCall,
    onFunctionCallResult,
    onEnd,
  }: {
    messages: ChatCompletionMessageParam[];
    onContent?: (delta: string, snapshot: string) => void;
    onConnect?: (runner: ChatCompletionRunner) => void;
    onFunctionCall?: (functionCall: ChatCompletionMessage['function_call']) => void;
    onFunctionCallResult?: (functionCallResult: string) => void;
    onMessage?: (message: ChatCompletionMessageParam) => void;
    onError?: (error: Error) => void;
    onEnd?: (runner: ChatCompletionRunner) => void;
  }) {
    if (!this.config) {
      throw new Error('config is not set');
    }
    const { systemPrompt, topP, temperature, maxTokens, presencePenalty, frequencyPenalty } = this.config;
    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: systemPrompt,
    };
    const runner = this.client.beta.chat.completions.runTools({
      model: this.model,
      messages: [systemMessage, ...messages],
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      tools: this.tools,
      tool_choice: this.toolChoice,
      response_format: {
        type: this.isJson ? 'json_object' : 'text',
      },
    });
    runner
      .on('connect', () => {
        console.log(`[${this.name}] ` + 'connected');
        onConnect?.(runner);
      })
      .on('message', message => {
        onMessage?.(message);
      })
      .on('end', () => {
        console.log(`[${this.name}] ` + 'end');
        onEnd?.(runner);
      })
      .on('error', error => {
        console.warn(`[${this.name}] ` + 'error', error);
        onError?.(error);
      })
      .on('content', (contentDelta, contentSnapshot) => onContent?.(contentDelta, contentSnapshot))
      .on('functionCall', functionCall => {
        console.log(`[${this.name}] ` + 'functionCall', functionCall);
        onFunctionCall?.(functionCall);
      })
      .on('functionCallResult', functionCallResult => {
        console.log(`[${this.name}] ` + 'functionCallResult', functionCallResult);
        onFunctionCallResult?.(functionCallResult);
      })
      .on('totalUsage', async usage => {
        console.log(`[${this.name}] ` + 'SAVE USAGE', usage);
        await this.saveUsage(usage);
      });

    const result = await runner.finalChatCompletion();
    return result;
  }

  protected async createChatCompletionStreamWithTools({
    messages,
    onMessage,
    onConnect,
    onContent,
    onError,
    onFunctionCall,
    onFunctionCallResult,
  }: {
    messages: ChatCompletionMessageParam[];
    onContent?: (delta: string, snapshot: string) => void;
    onConnect?: () => void;
    onFunctionCall?: (functionCall: ChatCompletionMessage['function_call']) => void;
    onFunctionCallResult?: (functionCallResult: string) => void;
    onMessage?: (message: ChatCompletionMessageParam) => void;
    onError?: (error: Error) => void;
  }) {
    if (!this.config) {
      throw new Error('config is not set');
    }
    const { presencePenalty, frequencyPenalty, topP, temperature, maxTokens, systemPrompt } = this.config;

    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: systemPrompt,
    };
    const stream = this.client.beta.chat.completions
      .runTools({
        model: this.model,
        messages: [systemMessage, ...messages],
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stream: true,
        stream_options: { include_usage: true },
        tools: this.tools,
        tool_choice: this.toolChoice,
        response_format: {
          type: this.isJson ? 'json_object' : 'text',
        },
      })
      .on('connect', () => {
        console.log(`[${this.name}] ` + 'connected');
        onConnect?.();
      })
      .on('functionCall', functionCall => {
        console.log(`[${this.name}] ` + 'functionCall', functionCall);
        onFunctionCall?.(functionCall);
      })
      .on('functionCallResult', functionCallResult => {
        console.log(`[${this.name}] ` + 'functionCallResult', functionCallResult);
        onFunctionCallResult?.(functionCallResult);
      })
      .on('message', message => {
        console.log(`[${this.name}] ` + 'message', message);
        onMessage?.(message);
      })
      .on('error', error => {
        console.warn(`[${this.name}] ` + 'error', error);
        stream.abort();
        onError?.(error);
      })
      .on('content', (contentDelta, contentSnapshot) => onContent?.(contentDelta, contentSnapshot));

    const result = await stream.finalChatCompletion();

    if (result.usage) {
      void this.saveUsage(result.usage);
    }

    return result;
  }

  protected replaceImageMessages(
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

  protected findLastImageMessageIndex(messages: ChatCompletionMessageParam[]) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && messages[i].content.some(content => content.type === 'image_url')) {
        return i;
      }
    }
    return -1;
  }
}
