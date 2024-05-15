import { settingStorage } from '@chrome-extension-boilerplate/shared';

export class Screen {
  static async capture() {
    return await chrome.tabs.captureVisibleTab({
      quality: (await settingStorage.get()).extensionConfig.captureQuality,
      format: 'jpeg',
    });
  }
}
