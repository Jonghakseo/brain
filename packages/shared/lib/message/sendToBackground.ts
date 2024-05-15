import { Message } from './messageTypes';

export function sendToBackground<T extends Message['type'], M extends Message & { type: T }>(
  type: T,
  payload?: M['payload'],
) {
  return new Promise<M['response']>((resolve, reject) => {
    const port = chrome.runtime.connect();
    port.onMessage.addListener((message: M) => {
      if (message.type.endsWith('__Error')) {
        reject(message.response);
      } else {
        resolve(message.response as M['response']);
      }
    });
    port.onDisconnect.addListener(() => console.log('Port disconnected'));
    try {
      port.postMessage({ type, payload });
    } catch (error) {
      console.log(error);
    }
  });
}
