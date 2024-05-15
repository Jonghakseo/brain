// eslint-disable-next-line @typescript-eslint/triple-slash-reference
import 'webextension-polyfill';
import { Screen } from './program/Screen';
import { LLM } from './llm';
import type { Message } from '@chrome-extension-boilerplate/shared';

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
    console.log('message.type', message);
    try {
      switch (message.type) {
        case 'ScreenCapture': {
          const image = await Screen.capture();
          sendResponse({ type: 'ScreenCapture', response: image });
          break;
        }
        case 'Chat': {
          const llm = new LLM(process.env.OPENAI_KEY);
          const response = await (() => {
            if (message.payload.history) {
              return llm.chatCompletionWithHistory(message.payload.content, message.payload.history);
            } else {
              return llm.chatCompletion(message.payload.content);
            }
          })();

          sendResponse({ type: 'Chat', response });
        }
      }
    } catch (e) {
      sendResponse({ type: (message.type + '__Error') as Message['type'], response: e });
    }
  });
});
