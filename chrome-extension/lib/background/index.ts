// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../message.d.ts" />
import 'webextension-polyfill';

async function captureVisibleTab() {
  return await chrome.tabs.captureVisibleTab();
}

// async function init() {
//   try {
//     const tab = await chrome.tabs.getCurrent();
//     console.log(tab);
//   } catch (e) {
//     console.error(e);
//   }
//   try {
//     const current = await chrome.tabs.captureVisibleTab();
//     console.log(current);
//   } catch (e) {
//     console.error(e);
//   }
// }

setTimeout(() => {
  captureVisibleTab().then(console.log);
}, 2000);

chrome.runtime.onConnect.addListener(port => {
  port.onDisconnect.addListener(() => console.log('Port disconnected'));

  port.onMessage.addListener(async (message: Message) => {
    switch (message.type) {
      case 'Start': {
        console.log('startProgram');
        break;
      }
    }
  });
});
