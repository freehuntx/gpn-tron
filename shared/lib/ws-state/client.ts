import { EventEmitter } from 'events'
import { io, Socket } from 'socket.io-client'
import { applyPatch } from 'fast-json-patch'

export class WsStateClient<WsStateType> extends EventEmitter {
  #socket: Socket
  #state: WsStateType = {} as WsStateType

  constructor(port: number, protocol = 'ws') {
    super()

    this.#socket = io(`${protocol}://${location.hostname}:${port}`)

    this.#socket.on('init', state => {
      this.#state = state
      this.emit('update')
    })

    this.#socket.on('patch', patch => {
      // Ensure to not keep references
      this.#state = structuredClone(applyPatch(this.#state, patch).newDocument)
      this.emit('update')
    })
  }

  close() {
    this.#socket.close()
  }

  get state() { return this.#state }
}
