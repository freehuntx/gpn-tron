import { createServer, Server } from 'http';
import { Server as IoServer } from 'socket.io';
import { DeepProxy } from './DeepProxy';

export class WsStateServer<StateType> {
  #server: Server;
  #io: IoServer;
  #state: StateType;

  constructor(port: number, initial = {}) {
    this.#server = createServer();
    this.#io = new IoServer(this.#server, { cors: { origin: '*' } });

    this.#io.on('connection', (socket) => {
      socket.emit('update', this.#state);
    });

    this.#state = new DeepProxy(initial, {
      set: (target: any, path: any, value: any) => {
        target[path[path.length - 1]] = value;
        this.#io.emit('set', path, value);
        return true;
      },
      deleteProperty: (target: any, path: any) => {
        delete target[path[path.length - 1]];
        this.#io.emit('delete', path);
        return true;
      },
    }) as unknown as StateType;

    setTimeout(() => {
      this.#server.listen(port, '127.0.0.1');
    }, 1);
  }

  get state() {
    return this.#state;
  }
}
