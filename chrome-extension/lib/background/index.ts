// eslint-disable-next-line @typescript-eslint/triple-slash-reference
import 'webextension-polyfill';
import { conversationStorage, Message, settingStorage } from '@chrome-extension-boilerplate/shared';
import { LLM } from '@lib/background/llm';
import { Screen } from '@lib/background/program/Screen';
import { OpenAILLM } from '@lib/background/agents/openai';
import { GoogleLLM } from '@lib/background/agents/google';
import { SuggestionLLM } from '@lib/background/agents/suggestion';

/**
 * when click the extension icon, open(or close) the side panel automatically
 */
void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

let abortController: AbortController | undefined;

chrome.runtime.onConnect.addListener(port => {
  const sendResponse = <M extends Message>(message: Omit<M, 'payload'>) => {
    console.log('response', message);
    try {
      port.postMessage(message);
    } catch (error) {
      console.error(error);
    }
  };

  port.onDisconnect.addListener(() => console.log('Port disconnected'));

  port.onMessage.addListener(async (message: Message) => {
    console.log('message', message);
    const {
      llmConfig: { model },
    } = await settingStorage.get();
    const baseLLM = model === 'gemini-1.5-flash' ? new GoogleLLM(model) : new OpenAILLM(model);
    abortController = baseLLM.abortController;
    try {
      switch (message.type) {
        case 'ScreenCapture': {
          const image = await Screen.capture();
          sendResponse({ type: 'ScreenCapture', response: image });
          break;
        }
        case 'Suggest': {
          const suggest = new SuggestionLLM();
          const { chats } = await conversationStorage.get();
          const result = await suggest.chatSuggest({
            text: message.payload,
            history: chats,
          });
          sendResponse({ type: 'Suggest', response: result });
          break;
        }
        case 'Chat': {
          const llm = new LLM(baseLLM);
          const { messages } = await llm.chatCompletionWithHistory(
            message.payload.content,
            message.payload.history ?? [],
          );
          sendResponse({ type: 'Chat', response: messages });
          break;
        }
        // case 'GenerateProgram': {
        //   const baseLLM = new OpenAILLM();
        //   const llm = new LLM(baseLLM);
        //   // const generated = await llm.generateProgram(message.payload.programId);
        //   // sendResponse({ type: 'GenerateProgram', response: generated });
        //   break;
        // }
        case 'RunProgram': {
          const llm = new LLM(baseLLM);
          const program = await llm.runProgram(message.payload.programId);
          sendResponse({ type: 'RunProgram', response: program });
          break;
        }
        case 'Abort': {
          console.log('Abort', !!abortController);
          abortController?.abort();
          sendResponse({ type: 'Abort', response: 'Aborted' });
          break;
        }
      }
    } catch (e) {
      console.warn('Error in background script', e);
      sendResponse({ type: (message.type + '__Error') as Message['type'], response: e as string });
    }
  });
});
