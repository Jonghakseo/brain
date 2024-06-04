import {
  Content,
  FunctionCallingMode,
  GenerativeModel,
  GoogleGenerativeAI,
  InlineDataPart,
  Part,
  TextPart,
  Tool,
  ToolConfig,
  UsageMetadata,
} from '@google/generative-ai';
import { ChatCompletion, ChatCompletionMessage, ChatCompletionMessageParam } from 'openai/resources';
import { BaseLLM } from '@lib/background/agents/base';
import { billingInfoStorage, LLMConfig } from '@chrome-extension-boilerplate/shared';
import { RunnableTools } from 'openai/lib/RunnableFunction';
import { splitArrayByIndex } from '@lib/background/agents/converters';

export class GoogleLLM implements BaseLLM {
  name = 'GoogleLLM';
  model: 'gemini-1.5-flash';
  sdk: GoogleGenerativeAI;
  config: Omit<LLMConfig, 'model'> | null = null;
  client: GenerativeModel | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: RunnableTools<any[]> = [];
  toolChoice: 'required' | 'auto' = 'required';
  isJson = false;
  useAnyCall = false;
  abortController = new AbortController();

  constructor(model: 'gemini-1.5-flash') {
    this.model = model;
    this.sdk = new GoogleGenerativeAI(String(process.env.GOOGLEAI_KEY));
  }
  log(...args: Parameters<typeof console.log>) {
    try {
      console.log(`[${this.name}] `, ...args);
    } catch (e) {
      console.warn('Error in google log', e);
    }
  }

  async createChatCompletionStreamWithTools({
    messages,
    onMessage,
    onContent: _onContent,
    onError,
    onConnect,
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

    const onContent = (delta: string) => {
      if (this.abortController.signal.aborted) {
        throw new Error('aborted');
      }
      _onContent?.(delta);
    };

    const { temperature, maxTokens, topP, systemPrompt } = this.config;

    this.client = this.sdk.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature,
        topP,
        maxOutputTokens: maxTokens,
      },
      systemInstruction: systemPrompt,
    });

    const contents = messages.map(this.convertMessageToContent);
    // const tools: Tool[] = this.tools.map(tool => {
    //   return {
    //     functionDeclarations: [
    //       {
    //         name: tool.function.name,
    //         description: tool.function.description,
    //         parameters: removeSomeFields(tool.function.parameters),
    //       },
    //     ],
    //   } as Tool;
    // });
    const tools: Tool[] = [
      {
        functionDeclarations: this.tools.map(tool => {
          return {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
          };
        }),
      } as Tool,
    ];

    const isRequired = this.toolChoice === 'required';
    const toolConfig: ToolConfig = {
      functionCallingConfig: {
        allowedFunctionNames: isRequired ? this.tools.map(tool => String(tool.function.name)) : undefined,
        mode: isRequired ? FunctionCallingMode.ANY : FunctionCallingMode.AUTO,
      },
    };
    const [_history] = splitArrayByIndex(contents, contents.length - 1);
    const [firstContent, ...restHistory] = _history;

    const history = (() => {
      // If the first message is from the model, google throws an error
      if (firstContent?.role === 'model') {
        return restHistory;
      }
      return _history;
    })();

    const lastMessage = contents.at(-1);
    const chatSession = this.client.startChat({
      tools,
      toolConfig,
      history,
    });

    try {
      console.log(`[${this.name}] ` + 'connected');
      onConnect?.();
      const result = await chatSession.sendMessageStream(lastMessage?.parts ?? []);

      const response = await result.response;
      if (response.usageMetadata) {
        await this.saveUsage(response.usageMetadata);
      }
      const call = response.functionCalls()?.at(0);

      if (call) {
        console.log(`[${this.name}] ` + 'functionCall', call);
        onFunctionCall?.({
          name: call.name,
          arguments: call.args.toString(),
        });

        const apiResponse = await this.tools
          .find(tool => tool.function.name === call.name)
          // eslint-disable-next-line
          // @ts-ignore
          ?.function?.function(call.args);
        onFunctionCallResult?.(JSON.stringify(apiResponse));
        console.log(`[${this.name}] ` + 'functionCallResult', apiResponse);

        const secondResult = await chatSession.sendMessage([
          {
            functionResponse: {
              name: call.name,
              // eslint-disable-next-line
              // @ts-ignore
              response: { apiResponse },
            },
          },
        ]);

        const text = secondResult.response.text();
        onContent?.(text);

        console.log(`[${this.name}] ` + 'message', text);
        onMessage?.({ role: 'assistant', content: text });
        // FIXME: temporary type error fix
        return secondResult as unknown as ChatCompletion;
      }

      let text = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        onContent?.(chunkText);
        text += chunkText;
      }
      console.log(`[${this.name}] ` + 'message', text);
      onMessage?.({ role: 'assistant', content: text });
      // FIXME: temporary type error fix
      return result as unknown as ChatCompletion;
    } catch (e) {
      if (e instanceof Error) {
        console.warn(`[${this.name}] ` + 'error', e);
        onError?.(e);
      }
      throw e;
    }
  }

  private convertMessageToContent(message: ChatCompletionMessageParam): Content {
    const content: Part[] =
      typeof message.content === 'string'
        ? [{ text: message.content } as TextPart]
        : (message.content ?? []).map(content => {
            switch (content.type) {
              case 'image_url':
                return {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: content.image_url.url?.replace('data:image/jpeg;base64,', '') ?? '',
                  },
                } as InlineDataPart;
              case 'text':
                return { text: content.text } as TextPart;
            }
          });
    switch (message.role) {
      case 'assistant':
        return { role: 'model', parts: content };
      case 'user':
        return { role: 'user', parts: content };
      default:
        return { role: 'user', parts: content };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createChatCompletionWithTools(_: {
    messages: ChatCompletionMessageParam[];
    onContent?: (delta: string, snapshot: string) => void;
    onConnect?: () => void;
    onFunctionCall?: (functionCall: ChatCompletionMessage['function_call']) => void;
    onFunctionCallResult?: (functionCallResult: string) => void;
    onMessage?: (message: ChatCompletionMessageParam) => void;
    onError?: (error: Error) => void;
  }): Promise<never> {
    throw new Error('Method not implemented.');
  }

  async saveUsage(usage: UsageMetadata): Promise<void> {
    await billingInfoStorage.addInputTokens(usage.promptTokenCount, 'gemini');
    await billingInfoStorage.addOutputTokens(usage.candidatesTokenCount, 'gemini');
  }
}
