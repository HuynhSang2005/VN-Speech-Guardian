/**
 * Mock WebSocket Server for E2E Testing
 * Simulates Socket.IO server behavior for audio streaming tests
 */

export class WebSocketMockServer {
  private server: any = null;
  private port: number = 3001;

  async start(): Promise<void> {
    // Placeholder for mock server start
    console.log('Mock WebSocket server started on port', this.port);
  }

  async stop(): Promise<void> {
    // Placeholder for mock server stop
    console.log('Mock WebSocket server stopped');
  }

  getUrl(): string {
    return `http://localhost:${this.port}`;
  }
}