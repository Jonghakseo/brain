import OpenAI from 'openai';
import {
  ChatCompletion,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatModel,
} from 'openai/resources';
import { billingInfoStorage, LLMConfig } from '@chrome-extension-boilerplate/shared';
import { RunnableTools } from 'openai/lib/RunnableFunction';
import { ChatCompletionRunner } from 'openai/lib/ChatCompletionRunner';
import { BaseLLM } from '@lib/background/agents/base';

export class OpenAiLLM implements BaseLLM {
  name: string = 'OpenAiLLM';
  client: OpenAI;
  model: Extract<ChatModel, 'gpt-4o' | 'gpt-3.5-turbo'>;
  config: LLMConfig | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: RunnableTools<any[]> = [];
  toolChoice: 'required' | 'auto' = 'auto';
  isJson = false;

  constructor() {
    this.model = 'gpt-4o';
    const apiKey = process.env.OPENAI_KEY as string;
    this.client = new OpenAI({ apiKey });
  }

  async saveUsage(usage: ChatCompletion['usage']) {
    const { completion_tokens, prompt_tokens } = usage ?? {};
    prompt_tokens && (await billingInfoStorage.addInputTokens(prompt_tokens, this.model));
    completion_tokens && (await billingInfoStorage.addOutputTokens(completion_tokens, this.model));
  }

  async createChatCompletion({ messages, n }: { messages: ChatCompletionMessageParam[]; n?: number }) {
    if (!this.config) {
      throw new Error('config is not set');
    }
    const { systemPrompt, topP, temperature, maxTokens } = this.config;

    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: systemPrompt,
    };

    const result = await this.client.chat.completions.create({
      model: this.model,
      messages: [systemMessage, ...messages],
      n,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      response_format: {
        type: this.isJson ? 'json_object' : 'text',
      },
    });

    if (result.usage) {
      await this.saveUsage(result.usage);
    }

    for (const choice of result.choices) {
      console.log(`[${this.name}] ` + 'message', choice.message.content);
    }

    return result;
  }

  async createChatCompletionWithTools({
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
    onContent?: (delta: string) => void;
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
    const { systemPrompt, topP, temperature, maxTokens } = this.config;
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
      .on('content', contentDelta => onContent?.(contentDelta))
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

  async createChatCompletionStreamWithTools({
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
    const { topP, temperature, maxTokens, systemPrompt } = this.config;

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
}
