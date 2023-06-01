import { Socket } from 'net';
import { EventEmitter } from 'events';
import { afkTimeout, maxPackets } from '../shared/constants/common';

export class ClientSocket extends EventEmitter {
  #connected = false;
  #ip: string;
  #socket?: Socket;
  #recvBuffer = '';
  #recvPacketCount = 0;

  constructor(socket: Socket) {
    super();
    this.#connected = true;
    this.#socket = socket;
    // FIXME: Add disconnect if no ip could be get?
    this.#ip = socket.remoteAddress || '';

    // We expect the user to send atleast every 10 seconds some data. Otherwise he is afk
    let dataTimeout: any;

    this.#socket.on('data', (chunk) => {
      // More than x packets per second can be considered as spam.
      // Increase packet recv counter by 1 and check if its above 10
      if (this.#recvPacketCount++ > maxPackets) {
        return this.sendError(
          `Dont spam me! Max ${maxPackets} packets per second!`,
          true
        );
      }

      // After a second reduce the packet counter again
      setTimeout(() => {
        this.#recvPacketCount--;
      }, 1000);

      clearTimeout(dataTimeout);
      dataTimeout = setTimeout(() => {
        return this.sendError('You are kicked because afk', true);
      }, afkTimeout);

      this.#recvBuffer += chunk.toString();

      while (this.#connected && this.#recvBuffer.includes('\n')) {
        const packetIndex = this.#recvBuffer.indexOf('\n');
        const packetStr = this.#recvBuffer.substring(0, packetIndex);
        this.#recvBuffer = this.#recvBuffer.substring(packetIndex + 1);
        this.#onPacket(packetStr);
      }

      if (this.#recvBuffer.length > 1024) {
        this.sendError('Packet buffer overflow', true);
      }
    });

    this.#socket.on('close', () => this.disconnect());
    this.#socket.on('end', () => this.disconnect());
    this.#socket.on('error', this.#onError.bind(this));
  }

  get connected(): boolean {
    return this.#connected;
  }
  get ip(): string {
    return this.#ip;
  }

  disconnect() {
    if (!this.#connected) return;

    this.#connected = false;
    this.#socket?.end();
    this.#socket?.destroy();
    this.#socket = undefined;
    this.emit('disconnected');
  }

  send(type: string, ...args: any) {
    if (!this.connected || !this.#socket || this.#socket.destroyed) return;
    try {
      this.#socket?.write(`${[type, ...args].join('|')}\n`);
    } catch (error) {
      console.error(error);
      this.disconnect();
    }
  }

  sendError(error: string, disconnect = false) {
    this.send('error', error);
    if (disconnect) this.disconnect();
  }

  #onPacket(packet: string) {
    if (!this.connected) return;

    const args = packet
      .split('|')
      .map((arg) => (/^\-?\d+(\.\d+)?$/.test(arg) ? Number(arg) : arg));
    const type = args.shift();
    this.emit('packet', type, ...args);
  }

  #onError(error: Error & { code: string }) {
    if (error?.code !== 'ECONNRESET') console.error(error);
  }
}
