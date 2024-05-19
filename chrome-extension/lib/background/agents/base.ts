import { ChatCompletion, ChatCompletionMessage, ChatCompletionMessageParam } from 'openai/resources';
import { LLMConfig } from '@chrome-extension-boilerplate/shared';
import { RunnableTools } from 'openai/lib/RunnableFunction';
import { ChatCompletionRunner } from 'openai/lib/ChatCompletionRunner';

export abstract class BaseLLM {
  name: string = 'BaseLLM';
  model: string | undefined;
  config: LLMConfig | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: RunnableTools<any[]> = [];
  toolChoice: 'required' | 'auto' | 'none' = 'auto';
  isJson: boolean = false;
  useAnyCall: boolean = true;

  abstract saveUsage(usage: unknown): Promise<void>;

  abstract log(...args: Parameters<typeof console.log>): void;

  abstract createChatCompletionWithTools(params: {
    messages: ChatCompletionMessageParam[];
    onContent?: (delta: string) => void;
    onFunctionCall?: (functionCall: ChatCompletionMessage['function_call']) => void;
    onFunctionCallResult?: (functionCallResult: string) => void;
    onMessage?: (message: ChatCompletionMessageParam) => void;
    onError?: (error: Error) => void;
    onEnd?: (runner?: ChatCompletionRunner) => void;
  }): Promise<ChatCompletion>;

  abstract createChatCompletionStreamWithTools(params: {
    messages: ChatCompletionMessageParam[];
    onContent?: (delta: string) => void;
    onConnect?: () => void;
    onFunctionCall?: (functionCall: ChatCompletionMessage['function_call']) => void;
    onFunctionCallResult?: (functionCallResult: string) => void;
    onMessage?: (message: ChatCompletionMessageParam) => void;
    onError?: (error: Error) => void;
  }): Promise<ChatCompletion>;
}
