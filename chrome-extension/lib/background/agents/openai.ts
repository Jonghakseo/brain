import OpenAI, { AzureOpenAI } from 'openai';
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
import { anyCall } from '@lib/background/tool';

const getAzureApiVersion = (model: Model) => {
  switch (model) {
    case 'gpt-4o':
      return '2024-02-01';
    case 'gpt-4o-mini':
      return '2023-03-15-preview';
    default:
      return '2024-02-01';
  }
};

type Model = Extract<ChatModel, 'gpt-4o' | 'gpt-4-turbo' | 'gpt-3.5-turbo'> | 'gpt-4o-mini';
export class OpenAILLM implements BaseLLM {
  name: string = 'OpenAILLM';
  client: OpenAI | AzureOpenAI;
  model: Model;
  config: Omit<LLMConfig, 'model'> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: RunnableTools<any[]> = [];
  toolChoice: 'required' | 'auto' | 'none' = 'auto';
  isJson = false;
  useAnyCall = true;
  abortController = new AbortController();
  platform: 'openai' | 'azure-openai' = 'openai';

  constructor(model: Model) {
    this.model = model;
    const azureApiKey = process.env.AZURE_OPENAI_KEY as string;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT as string;
    if (azureApiKey && azureEndpoint) {
      this.platform = 'azure-openai';
      this.client = new AzureOpenAI({
        apiKey: azureApiKey,
        endpoint: azureEndpoint,
        apiVersion: getAzureApiVersion(model),
      });
    } else {
      this.platform = 'openai';
      const openaiApiKey = process.env.OPENAI_KEY as string;
      this.client = new OpenAI({ apiKey: openaiApiKey });
    }
  }

  log(...args: Parameters<typeof console.log>) {
    try {
      console.log(`[${this.name + ' ' + this.model}] `, ...args);
    } catch (e) {
      console.warn('Error in openai log', e);
    }
  }

  makeSystemMessage(systemPrompt: string): ChatCompletionSystemMessageParam {
    const invalidToolMessage =
      '**[IMPORTANT!!] => IF YOU RECEIVED A MESSAGE START WITH"INVALID TOOL CALL" YOU CAN CALL THAT TOOL VIA "executeTool" FUNCTION.**\n' +
      '**[IMPORTANT!!] => IF YOU WANT TO SEE SPECIFIC TOOL INPUT, YOU CAN USE "checkToolDetailInput" FUNCTION.**\n';
    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: systemPrompt + this.useAnyCall ? invalidToolMessage : '',
    };
    return systemMessage;
  }

  async saveUsage(usage: ChatCompletion['usage']) {
    const { completion_tokens, prompt_tokens } = usage ?? {};
    prompt_tokens && (await billingInfoStorage.addInputTokens(prompt_tokens, this.model));
    completion_tokens && (await billingInfoStorage.addOutputTokens(completion_tokens, this.model));
  }

  async createChatCompletion({
    messages,
    n,
    onMessage,
    onContent,
    onError,
  }: {
    messages: ChatCompletionMessageParam[];
    n?: number;
    onContent?: (delta: string) => void;
    onConnect?: (runner?: ChatCompletionRunner) => void;
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

    const systemMessage: ChatCompletionSystemMessageParam = this.makeSystemMessage(systemPrompt);
    try {
      const result = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: [systemMessage, ...messages],
          n,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          response_format: {
            type: this.isJson ? 'json_object' : 'text',
          },
        },
        { signal: this.abortController.signal },
      );

      if (result.usage) {
        await this.saveUsage(result.usage);
      }

      for (const choice of result.choices) {
        onMessage?.(choice.message);
        onContent?.(choice.message.content ?? '');
        this.log('message - createChatCompletion', choice.message.content);
      }

      return result;
    } catch (e) {
      if (e instanceof Error) {
        onError?.(e);
      }
      throw e;
    }
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
    // FIXME: temporary fix for empty tool usage
    if (this.tools.length === 0) {
      // TODO: make stream
      return this.createChatCompletion({ messages, onMessage, onContent, onError });
    }
    if (!this.config) {
      throw new Error('config is not set');
    }
    const { systemPrompt, topP, temperature, maxTokens } = this.config;
    const systemMessage: ChatCompletionSystemMessageParam = this.makeSystemMessage(systemPrompt);

    const runner = this.client.beta.chat.completions.runTools(
      {
        model: this.model,
        messages: [systemMessage, ...messages],
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        tools: this.useAnyCall ? this.tools.concat(anyCall) : this.tools,
        tool_choice: this.toolChoice,
        response_format: {
          type: this.isJson ? 'json_object' : 'text',
        },
      },
      { signal: this.abortController.signal },
    );
    runner
      .on('connect', () => {
        this.log('connected');
        onConnect?.(runner);
      })
      .on('message', message => {
        onMessage?.(message);
      })
      .on('end', () => {
        this.log('end');
        onEnd?.(runner);
      })
      .on('error', error => {
        this.log('error', error);
        onError?.(error);
      })
      .on('content', contentDelta => onContent?.(contentDelta))
      .on('functionCall', functionCall => {
        this.log('functionCall', functionCall);
        onFunctionCall?.(functionCall);
      })
      .on('functionCallResult', functionCallResult => {
        try {
          this.log('functionCallResult', { response: JSON.parse(functionCallResult) });
        } catch {
          this.log('functionCallResult', { response: functionCallResult });
        }
        onFunctionCallResult?.(functionCallResult);
      })
      .on('totalUsage', async usage => {
        this.log('SAVE USAGE', usage);
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
    onContent?: (delta: string) => void;
    onConnect?: () => void;
    onFunctionCall?: (functionCall: ChatCompletionMessage['function_call']) => void;
    onFunctionCallResult?: (functionCallResult: string) => void;
    onMessage?: (message: ChatCompletionMessageParam) => void;
    onError?: (error: Error) => void;
  }) {
    if (!this.config) {
      throw new Error('config is not set');
    }
    // FIXME: temporary fix for empty tool usage
    if (this.tools.length === 0) {
      // TODO: make stream
      return this.createChatCompletion({ messages, onMessage, onContent, onError, onConnect });
    }
    const { topP, temperature, maxTokens, systemPrompt } = this.config;

    const systemMessage: ChatCompletionSystemMessageParam = this.makeSystemMessage(systemPrompt);
    const isOpenai = this.platform === 'openai';
    const stream = this.client.beta.chat.completions
      .runTools({
        model: this.model,
        messages: [systemMessage, ...messages],
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        stream: true,
        ...(isOpenai && { stream_options: { include_usage: true } }),
        tools: this.useAnyCall ? this.tools.concat(anyCall) : this.tools,
        tool_choice: this.toolChoice,
        response_format: {
          type: this.isJson ? 'json_object' : 'text',
        },
      })
      .on('connect', () => {
        this.log('connected');
        onConnect?.();
      })
      .on('functionCall', functionCall => {
        this.log('functionCall', functionCall);
        onFunctionCall?.(functionCall);
      })
      .on('functionCallResult', functionCallResult => {
        try {
          this.log('functionCallResult', { response: JSON.parse(functionCallResult) });
        } catch {
          this.log('functionCallResult', { response: functionCallResult });
        }
        onFunctionCallResult?.(functionCallResult);
      })
      .on('message', message => {
        this.log('message', message);
        onMessage?.(message);
      })
      .on('error', error => {
        this.log('error', error);
        onError?.(error);
      })
      .on('content', contentDelta => onContent?.(contentDelta));

    const result = await stream.finalChatCompletion();

    if (result.usage) {
      void this.saveUsage(result.usage);
    }

    return result;
  }
}
