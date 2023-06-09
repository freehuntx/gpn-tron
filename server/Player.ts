import { EventEmitter } from 'events'
import { ClientSocket } from './ClientSocket'
import { ScoreHistory, ScoreType } from './Game'
import { escapeString, isStringValid } from '@gpn-tron/shared/utils/string'

export enum PlayerAction {
  NONE,
  MOVE_UP,
  MOVE_RIGHT,
  MOVE_DOWN,
  MOVE_LEFT
}

export class Player extends EventEmitter {
  #socket?: ClientSocket
  #username: string
  #password: string
  #chatMessage?: string
  #alive = false
  #pos = { x: 0, y: 0 }
  #action: PlayerAction = PlayerAction.NONE
  #scoreHistory: ScoreHistory = []
  #eloScore = 1000
  #state: PlayerState
  #chatTimeout: NodeJS.Timeout

  constructor(username: string, password: string) {
    super()
    this.#username = username
    this.#password = password

    this.#initializeState()
  }

  get username(): string { return this.#username }
  get password(): string { return this.#password }
  get alive(): boolean { return this.#alive }
  get chatMessage(): string { return this.#chatMessage }
  get pos(): { x: number; y: number } { return this.#pos }
  get connected(): boolean { return !!this.#socket?.connected }
  get eloScore(): number { return this.#eloScore }
  set eloScore(eloScore: number) { this.#eloScore = eloScore }
  get state() { return this.#state }

  // Returns the time filtered scores. Everything above 2 hours is removed.
  get scoreHistory(): ScoreHistory {
    const now = Date.now()
    this.#scoreHistory = this.#scoreHistory.filter(({ time }) => now - time <= (2 * 60 * 60 * 1000))
    return this.#scoreHistory
  }
  set scoreHistory(newHistory: ScoreHistory) {
    this.#scoreHistory = newHistory
  }
  get wins(): number {
    return this.scoreHistory.filter(({ type }) => type === ScoreType.WIN).length
  }
  get loses(): number {
    return this.scoreHistory.filter(({ type }) => type === ScoreType.LOOSE).length
  }
  get winRatio(): number {
    const games = this.wins + this.loses
    return games > 0 ? this.wins / games : 0
  }

  #initializeState() {
    this.#state = {
      alive: false,
      name: this.#username,
      pos: this.#pos,
      moves: []
    }
  }

  readAndResetAction(): PlayerAction {
    const action = this.#action
    this.#action = PlayerAction.NONE
    return action
  }

  setSocket(socket: ClientSocket) {
    this.disconnect()

    this.#socket = socket
    this.#socket.on('packet', this.#onPacket.bind(this))
    this.#socket.on('disconnected', this.#onDisconnect.bind(this))
  }

  spawn(x: number, y: number) {
    this.#alive = true
    this.#state.alive = true
    this.#state.moves = []
    this.setPos(x, y)
  }

  setPos(x: number, y: number) {
    this.#pos.x = x
    this.#pos.y = y
    this.#state.pos.x = x
    this.#state.pos.y = y
    this.#state.moves.push({ x, y })
  }

  disconnect() {
    this.#socket?.disconnect()
  }

  send(type: string, ...args: any) {
    this.#socket?.send(type, ...args)
  }

  rawSend(packet: string) {
    this.#socket?.rawSend(packet)
  }

  win() {
    this.#scoreHistory.push({ type: ScoreType.WIN, time: Date.now() })
    this.#socket?.send('win', this.wins, this.loses)
  }

  lose() {
    this.#scoreHistory.push({ type: ScoreType.LOOSE, time: Date.now() })
    this.#socket?.send('lose', this.wins, this.loses)
    this.#alive = false
    this.#state.alive = false
  }

  sendError(error: string, disconnect = false) {
    this.#socket?.sendError(error, disconnect)
  }

  #onPacket(packetType: string, ...args: any) {
    if (packetType === 'move') {
      const [direction] = args
      if (direction === 'up') this.#action = PlayerAction.MOVE_UP
      else if (direction === 'right') this.#action = PlayerAction.MOVE_RIGHT
      else if (direction === 'down') this.#action = PlayerAction.MOVE_DOWN
      else if (direction === 'left') this.#action = PlayerAction.MOVE_LEFT
      else this.sendError('WARNING_UNKNOWN_MOVE')
    }
    else if (packetType === 'chat') {
      const chatMessage = escapeString(args[0] || '')

      if (!this.#alive) {
        this.sendError('ERROR_DEAD_CANNOT_CHAT')
      }
      else if (!isStringValid(chatMessage)) {
        this.sendError('ERROR_INVALID_CHAT_MESSAGE')
      } else {
        this.#chatMessage = chatMessage
        this.#state.chat = chatMessage

        this.emit('chat', chatMessage)

        // Clear the chat message in 5 seconds
        clearTimeout(this.#chatTimeout)
        this.#chatTimeout = setTimeout(() => {
          this.#chatMessage = undefined
          this.#state.chat = undefined
        }, 5000)
      }
    } else {
      console.log('UNKNOWN PACKET')
      this.sendError('unknown packet')
    }
  }

  #onDisconnect() {
    this.#socket = undefined
    this.#chatMessage = undefined
    this.#action = PlayerAction.NONE
    this.emit('disconnected')
  }
}