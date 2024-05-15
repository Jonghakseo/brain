import { Screen } from './Screen';
import { Memory } from './Memory';

type Config = {};

export class ProgramSequence {
  memory: Memory;
  config: Config;
  llm: any;

  private constructor(config: Config, memory: Memory) {
    this.config = config;
    this.memory = memory;
  }

  static init(initialOrder: string) {
    return new ProgramSequence({}, new Memory(initialOrder));
  }
  //
  //   async firstRequest() {
  //     const base64 = await Screen.capture();
  //     const response = await this.llm.request([
  //       {
  //         // 좀 더 구체적으로 지시 필요
  //         prompt: `"${this.memory.initialOrder}" 를 하고 싶은데, 절차적으로 어떻게 행동해야할지 알려줘. 네가 이 화면에서 할 수 있는 액션은 스크롤 up / down, 요소 클릭, 타이핑 등이 있어. 다소 추상적으로 이야기해도 괜찮아. 절차를 수립하는 단계야.`,
  //       },
  //       {
  //         image: base64,
  //       },
  //     ]);
  //
  //     switch (response.type) {
  //       case 'scroll': {
  //         // 스크롤 실행
  //         // 화면 다시 캡쳐
  //         // 대화 기록과 함께 다시 요청 - 자, 이제 스크롤을 내린 화면이야, 이제 뭘 해야할까? 나는 여전히 "${this.memory.initialOrder}"를 하고 싶어. 절차적으로 어떻게 행동해야할지 알려줘. 네가 이 화면에서 할 수 있는 액션은 스크롤 up / down, 요소 클릭, 타이핑 등이 있어.
  //         // 혹시 동작이 완료되었다면 OK로 응답해줘
  //         break;
  //       }
  //       case 'interaction': {
  //         await this.llm.request(
  //           this.memory.getPrevConversations().concat([
  //             {
  //               prompt:
  //                 '이제 그 인터렉션을 할 수 있는 요소들을 찾아야해. 네가 호출할 수 있는 메소드들의 스펙은 이렇게 되어있어. 어떻게 getByRole, getByPlaceholder ',
  //             },
  //           ]),
  //         );
  //       }
  //     }
  //   }
  //
  //   // // 메모리 영역: 해야 할 일, 지금까지 작업한 내용
  //   //
  //   // // 0. 해야 할 일 입력
  //   // // 1. 화면 캡쳐
  //   // // 2. 전송하면서, 화면 데이터와 함께, 이 화면에서 무엇을 하고 싶은지를 전달 (화면은 저장하지 않음)
  //   // // 3. 절차적으로 무엇을 해야할지 물어보고 일단 이 화면에서 해야 하는 액션을 알려달라고 함 : 스크롤 up / down, 요소 클릭, 타이핑 등의 커맨드를 섞어서
  //   // // 4. 인터랙팅을 요구한다면, 인터랙팅 가능한 각 요소에 고유 아이디를 붙임 + jsdom + ally selector를 사용해서 해당 요소에 맞는 element를 찾음
  //   // // 5. 바로 찾으면 해당 요소에 인터랙팅을 하고, 바로 못 찾으면 찾은 요소들을 보내서 그 중에 어떤게 맞는지 확인해달라고 함. (이 대화 기록은 저장하지 않음)
  //   // // 5-1. 알 수 없으면 그대로 실패 처리
  //   // // 6. 인터랙팅을 하고, 화면을 다시 캡쳐해서 해야 할 일이 완료되었는지 확인 (화면은 저장하지 않음)
  //   // // 6-1. 완료되었으면 그대로 종료
  //   // // 6-2. 완료되지 않았으면 화면을 전송하면서 다시 3번부터 시작
}
