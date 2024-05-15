interface BaseMessage<D = unknown, P = unknown> {
  type: unknown;
  payload: P;
  response: ResponseMessage<D>;
}

type ResponseMessage<Data> =
  | {
      type: 'Success';
      data: Data;
    }
  | {
      type: 'Error';
      error: Error;
    };

interface StartMessage extends BaseMessage {
  type: 'Start';
  payload: {
    prompt: string;
  };
}

type Message = StartMessage;
