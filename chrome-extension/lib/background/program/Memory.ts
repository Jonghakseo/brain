export class Memory {
  initialOrder: string;
  conversations: string[] = [];

  constructor(initialOrder: string) {
    this.initialOrder = initialOrder;
  }

  saveConversation(conversation: string) {
    this.conversations.push(conversation);
  }

  getPrevConversations() {
    return this.conversations;
  }

  resetConversations() {
    this.conversations = [];
  }
}
