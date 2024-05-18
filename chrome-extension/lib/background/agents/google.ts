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
import { ChatCompletionMessage, ChatCompletionMessageParam } from 'openai/resources';
import { BaseLLM } from '@lib/background/agents/base';
import { billingInfoStorage, LLMConfig } from '@chrome-extension-boilerplate/shared';
import { RunnableTools } from 'openai/lib/RunnableFunction';
import { splitArrayByIndex } from '@lib/background/agents/converters';

export class GoogleLLM implements BaseLLM {
  name = 'GoogleLLM';
  model: string | undefined;
  sdk: GoogleGenerativeAI;
  config: LLMConfig | null = null;
  client: GenerativeModel | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: RunnableTools<any[]> = [];
  toolChoice: 'required' | 'auto' = 'required';

  constructor() {
    this.sdk = new GoogleGenerativeAI(String(process.env.GOOGLEAI_KEY));
  }

  async createChatCompletionStreamWithTools({
    messages,
    onMessage,
    onContent,
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
    const { temperature, maxTokens, topP, systemPrompt } = this.config;

    this.client = this.sdk.getGenerativeModel({
      // model: 'gemini-1.5-flash',
      model: 'models/gemini-1.5-pro-latest',
      generationConfig: {
        temperature,
        topP,
        maxOutputTokens: maxTokens,
      },
      systemInstruction: systemPrompt,
    });

    const removeSomeFields = (obj: unknown) => {
      const target = JSON.parse(JSON.stringify(obj));
      const deleteProperties = [
        'additionalProperties',
        '$schema',
        'maximum',
        'minimum',
        'default',
        'minItems',
        'exclusiveMinimum',
      ];
      const removeProperties = (_obj: Record<string, unknown>) => {
        for (const key in _obj) {
          if (deleteProperties.includes(key)) {
            delete _obj[key];
          } else if (typeof _obj[key] === 'object') {
            removeProperties(_obj[key] as Record<string, unknown>);
          }
        }
      };

      removeProperties(target);

      return target;
    };

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
            parameters: removeSomeFields(tool.function.parameters),
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
        return secondResult;
      }

      let text = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        onContent?.(chunkText);
        text += chunkText;
      }
      console.log(`[${this.name}] ` + 'message', text);
      onMessage?.({ role: 'assistant', content: text });
      return result;
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
  }): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  async saveUsage(usage: UsageMetadata): Promise<void> {
    await billingInfoStorage.addInputTokens(usage.promptTokenCount, 'gemini');
    await billingInfoStorage.addOutputTokens(usage.candidatesTokenCount, 'gemini');
  }
}
