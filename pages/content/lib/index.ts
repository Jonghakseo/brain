// const height = window.innerHeight;
// const width = window.innerWidth;
//
// console.log(chrome.tabs);
//
// const capture = async () => {
//   const canvas = document.createElement('canvas');
//   canvas.width = width;
//   canvas.height = height;
//   const context = canvas.getContext('2d');
//
//   const video = document.createElement('video');
//   video.width = width;
//   video.height = height;
//   video.autoplay = true;
//
//   try {
//     const current = await chrome.tabs.getCurrent();
//     if (!current) {
//       return;
//     }
//     chrome.desktopCapture.chooseDesktopMedia(['screen'], current, streamId => {
//       console.log(streamId);
//     });
//     // console.log(chrome.storage);
//     // chrome.tabCapture.capture(
//     //   {
//     //     audio: false,
//     //     video: true,
//     //   },
//     //   captureStream => {
//     //     if (captureStream) {
//     //       video.srcObject = captureStream;
//     //       setTimeout(() => {
//     //         context?.drawImage(video, 0, 0, width, height);
//     //         // const frame = canvas.toDataURL('image/png');
//     //         canvas.toBlob(blob => {
//     //           const reader = new FileReader();
//     //           if (!blob) {
//     //             return;
//     //           }
//     //           reader.readAsDataURL(blob);
//     //           reader.onloadend = function () {
//     //             const base64data = reader.result;
//     //             console.log(base64data);
//     //           };
//     //         });
//     //       }, 100);
//     //     }
//     //   },
//     // );
//   } catch (err) {
//     console.error('Error: ' + err);
//   }
// };
//
// setTimeout(() => {
//   capture();
// }, 1000);
// //
// // // 메모리 영역: 해야 할 일, 지금까지 작업한 내용
// //
// // // 0. 해야 할 일 지시
// // // 1. 화면 캡쳐
// // // 2. 전송하면서, 화면 데이터와 함께, 이 화면에서 무엇을 하고 싶은지를 전달 (화면은 저장하지 않음)
// // // 3. 절차적으로 무엇을 해야할지 물어보고 일단 이 화면에서 해야 하는 액션을 알려달라고 함 : 스크롤 up / down, 요소 클릭, 타이핑 등의 커맨드를 섞어서
// // // 4. 인터랙팅을 요구한다면, 인터랙팅 가능한 각 요소에 고유 아이디를 붙임 + jsdom + ally selector를 사용해서 해당 요소에 맞는 element를 찾음
// // // 5. 바로 찾으면 해당 요소에 인터랙팅을 하고, 바로 못 찾으면 찾은 요소들을 보내서 그 중에 어떤게 맞는지 확인해달라고 함. (이 대화 기록은 저장하지 않음)
// // // 5-1. 알 수 없으면 그대로 실패 처리
// // // 6. 인터랙팅을 하고, 화면을 다시 캡쳐해서 해야 할 일이 완료되었는지 확인 (화면은 저장하지 않음)
// // // 6-1. 완료되었으면 그대로 종료
// // // 6-2. 완료되지 않았으면 화면을 전송하면서 다시 3번부터 시작
