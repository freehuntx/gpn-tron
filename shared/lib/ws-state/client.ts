import { EventEmitter } from 'events'
import { io, Socket } from 'socket.io-client'
import { applyPatch } from 'fast-json-patch'

export class WsStateClient<WsStateType> extends EventEmitter {
  #socket: Socket
  #state: WsStateType = {} as WsStateType

  constructor(port: number, host = '127.0.0.1', protocol = 'ws') {
    super()

    this.#socket = io(`${protocol}://${host}:${port}`)

    this.#socket.on('init', state => {
      this.#state = state
      this.emit('update')
    })

    this.#socket.on('patch', patch => {
      this.#state = applyPatch(this.#state, patch).newDocument
      this.emit('update')
    })
  }

  close() {
    this.#socket.close()
  }

  get state() { return this.#state }
}
