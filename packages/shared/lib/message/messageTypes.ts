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

export interface AbortMessage extends BaseMessage {
  type: 'Abort';
}

export interface ChatMessage extends BaseMessage {
  type: 'Chat';
  payload: {
    content: Chat['content'];
    history?: Chat[];
  };
  response: unknown;
}

// export interface GenerateProgramMessage extends BaseMessage {
//   type: 'GenerateProgram';
//   payload: {
//     programId: string;
//   };
//   response: unknown;
// }
export interface RunProgramMessage extends BaseMessage {
  type: 'RunProgram';
  payload: {
    programId: string;
  };
  response: unknown;
}

export type Message = CaptureMessage | ChatMessage | RunProgramMessage | AbortMessage;

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
