export async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs.at(0);
  return activeTab;
}
