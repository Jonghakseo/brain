import OpenAI from 'openai';
import {
  ChatCompletion,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatModel,
} from 'openai/resources';
import { billingInfoStorage, OpenAIConfig } from '@chrome-extension-boilerplate/shared';
import { RunnableTools } from 'openai/lib/RunnableFunction';

export class BaseLLM {
  client: OpenAI;
  model: ChatModel;
  config: OpenAIConfig | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: RunnableTools<any[]> = [];
  toolChoice: 'required' | 'auto' = 'auto';

  constructor(key: string) {
    this.model = 'gpt-4o-2024-05-13';
    this.client = new OpenAI({ apiKey: key });
  }

  private async saveUsage(usage: ChatCompletion['usage']) {
    const { completion_tokens, prompt_tokens } = usage ?? {};
    prompt_tokens && (await billingInfoStorage.addInputTokens(prompt_tokens));
    completion_tokens && (await billingInfoStorage.addOutputTokens(completion_tokens));
  }

  protected setConfig(config: OpenAIConfig) {
    this.config = config;
  }
  protected async createChatCompletionWithTools(messages: ChatCompletionMessageParam[]) {
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
    });
    runner
      .on('functionCall', functionCall => {
        console.log('functionCall', functionCall);
      })
      .on('functionCallResult', functionCallResult => {
        console.log('functionCallResult', functionCallResult);
      });
    const result = await runner.finalChatCompletion();

    if (result.usage) {
      void this.saveUsage(result.usage);
    }

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
      })
      .on('connect', () => {
        console.log('connected');
        onConnect?.();
      })
      .on('functionCall', functionCall => {
        console.log('functionCall', functionCall);
        onFunctionCall?.(functionCall);
      })
      .on('functionCallResult', functionCallResult => {
        console.log('functionCallResult', functionCallResult);
        onFunctionCallResult?.(functionCallResult);
      })
      .on('message', message => {
        console.log('message', message);
        onMessage?.(message);
      })
      .on('error', error => {
        console.error('error', error);
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
}
