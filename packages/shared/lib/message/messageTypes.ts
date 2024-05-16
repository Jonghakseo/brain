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

export interface PartyEffectMessage extends BaseMessage {
  type: 'partyEffect'; // only celebrate
}

export interface GetNearbyElementsMessage extends BaseMessage {
  type: 'getNearbyElements';
  payload: {
    x: number;
    y: number;
    distance: number;
    maxCount: number;
  };
}
export interface ClickElementMessage extends BaseMessage {
  type: 'clickElement';
  payload: {
    elementId: number;
  };
}

export interface TypeInputMessage extends BaseMessage {
  type: 'typeInput';
  payload: {
    elementId: number;
    text: string;
  };
}
export interface KeyBoardPressMessage extends BaseMessage {
  type: 'keyboardPress';
  payload: {
    elementId?: number;
    key: 'Enter' | 'Backspace' | 'Spacebar';
  };
}
