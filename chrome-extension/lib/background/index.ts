// eslint-disable-next-line @typescript-eslint/triple-slash-reference
import 'webextension-polyfill';
import type { Message } from '@chrome-extension-boilerplate/shared';
import { LLM } from '@lib/background/llm';
import { Screen } from '@lib/background/program/Screen';
import { OpenAiLLM } from '@lib/background/agents/openai';

/**
 * when click the extension icon, open(or close) the side panel automatically
 */
void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

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
    try {
      switch (message.type) {
        case 'ScreenCapture': {
          const image = await Screen.capture();
          sendResponse({ type: 'ScreenCapture', response: image });
          break;
        }
        case 'Chat': {
          const baseLLM = new OpenAiLLM();
          const llm = new LLM(baseLLM);
          await llm.chatCompletionWithHistory(message.payload.content, message.payload.history ?? []);
          sendResponse({ type: 'Chat', response: null });
          break;
        }
        // case 'GenerateProgram': {
        //   const baseLLM = new OpenAiLLM();
        //   const llm = new LLM(baseLLM);
        //   // const generated = await llm.generateProgram(message.payload.programId);
        //   // sendResponse({ type: 'GenerateProgram', response: generated });
        //   break;
        // }
        case 'RunProgram': {
          const baseLLM = new OpenAiLLM();
          const llm = new LLM(baseLLM);
          const program = await llm.runProgram(message.payload.programId);
          sendResponse({ type: 'RunProgram', response: program });
          break;
        }
      }
    } catch (e) {
      console.warn('Error in background script', e);
      sendResponse({ type: (message.type + '__Error') as Message['type'], response: e as string });
    }
  });
});
