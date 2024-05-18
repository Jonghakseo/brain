// eslint-disable-next-line @typescript-eslint/triple-slash-reference
import 'webextension-polyfill';
import type { Message } from '@chrome-extension-boilerplate/shared';
import { LLM } from '@lib/background/llm';
import { Screen } from '@lib/background/program/Screen';
import { GoogleLLM } from '@lib/background/agents/google';
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
          if (message.payload.history) {
            await llm.chatCompletionWithHistory(message.payload.content, message.payload.history);
          } else {
            await llm.chatCompletion(message.payload.content);
          }

          sendResponse({ type: 'Chat', response: null });
        }
      }
    } catch (e) {
      console.warn('Error in background script', e);
      sendResponse({ type: (message.type + '__Error') as Message['type'], response: e as string });
    }
  });
});
