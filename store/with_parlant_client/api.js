// api.js (New Version)
import { ParlantClient } from 'parlant-client';

class ChatService {
  constructor() {
    this.client = new ParlantClient({
      environment: 'http://localhost:8800',
    });
    this.sessionId = null;
    this.lastOffset = 0;
  }

  // Step 1: Create a session
  async createSession(agentId) {
    const session = await this.client.sessions.create({
      agentId: agentId,
    });
    this.sessionId = session.id;
    return this.sessionId;
  }

  // Step 2: Send a message
  async sendMessage(message) {
    if (!this.sessionId) throw new Error('No session');
    await this.client.sessions.createEvent(this.sessionId, {
      kind: 'message',
      source: 'customer',
      message: message,
    });
  }

  // Step 3: Listen for responses (this is the hard part)
  // You need to call this in a loop from App.jsx
  async pollForEvents() {
    if (!this.sessionId) return [];
    
    const events = await this.client.sessions.listEvents(this.sessionId, {
      minOffset: this.lastOffset,
      waitForData: 30, // Long polling
      kinds: "message",
    });

    if (events.length > 0) {
      this.lastOffset = events[events.length - 1].offset + 1;
    }

    // Filter for messages from the agent
    return events.filter(e => e.source === 'ai_agent');
  }
}

export const chatService = new ChatService();