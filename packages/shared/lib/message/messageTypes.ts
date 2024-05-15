import { Chat } from './chatTypes';

interface BaseMessage<D = unknown, P = unknown> {
  type: unknown;
  payload?: P;
  response: D;
}

export interface CaptureMessage extends BaseMessage {
  type: 'ScreenCapture';
  response: string;
}

export interface ChatMessage extends BaseMessage {
  type: 'Chat';
  payload: {
    content: Chat['content'];
    history?: Chat[];
  };
  response: string;
}

export type Message = CaptureMessage | ChatMessage;
