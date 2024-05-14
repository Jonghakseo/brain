type Message<D> = {
  response: ResponseMessage<D>;
};

type ResponseMessage<Data> =
  | {
      type: 'Success';
      data: Data;
    }
  | {
      type: 'Error';
      error: Error;
    };

export function sendToBackground<M extends Message<unknown>>(message: M) {
  return new Promise((resolve, reject) => {
    const port = chrome.runtime.connect();
    port.onMessage.addListener((response: M['response']) => {
      if (response.type === 'Error') {
        reject(response.error);
      } else {
        resolve(response.data);
      }
    });
    port.onDisconnect.addListener(() => console.log('Port disconnected'));
    try {
      port.postMessage(message);
    } catch (error) {
      console.log(error);
    }
  });
}
