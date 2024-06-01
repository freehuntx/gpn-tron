import { EventEmitter } from "events"
import { io, Socket } from "socket.io-client"
import { applyPatch } from "fast-json-patch"

export class WsStateClient<WsStateType> extends EventEmitter {
  #socket: Socket
  #state: WsStateType = {} as WsStateType

  constructor(port: number, protocol = 'ws') {
    super()

    this.#socket = io(`${protocol}://${typeof location !== 'undefined' ? location.hostname : '127.0.0.1'}:${port}`)

    this.#socket.on('init', state => {
      this.#state = state
      this.emit('update')
    })

    this.#socket.on('patch', patch => {
      // Ensure to not keep references
      if (typeof structuredClone === 'function') {
        this.#state = structuredClone(applyPatch(this.#state, patch).newDocument)
      } else {
        this.#state = JSON.parse(JSON.stringify(applyPatch(this.#state, patch).newDocument))
      }
      this.emit('update')
    })
  }

  close() {
    this.#socket.close()
  }

  get state() { return this.#state }
}
