export class Screen {
  static async capture(quality: number = 25) {
    return await chrome.tabs.captureVisibleTab({
      quality,
      format: 'jpeg',
    });
  }
}
