import { EventEmitter } from 'events'
import { escapeString, isStringValid } from '@gpn-tron/shared/utils/string'
import { ClientSocket } from './ClientSocket'
import { ScoreHistory, ScoreType } from './Game'

export enum PlayerAction {
  NONE,
  MOVE_UP,
  MOVE_RIGHT,
  MOVE_DOWN,
  MOVE_LEFT
}

export class Player extends EventEmitter {
  #socket?: ClientSocket
  #id = -1
  #alive: boolean
  #username: string
  #password: string
  #chatMessage?: string
  #pos = { x: 0, y: 0 }
  #moves: Vec2[] = []
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

  get id(): number { return this.#id }
  set id(id: number) {
    this.#id = id
    this.#state.id = id
  }
  get username(): string { return this.#username }
  get password(): string { return this.#password }
  get alive(): boolean { return this.#alive }
  get chatMessage(): string { return this.#chatMessage }
  get pos(): Vec2 { return this.#pos }
  get moves(): Vec2[] { return this.#moves }
  get connected(): boolean { return !!this.#socket?.connected }
  get eloScore(): number { return this.#eloScore }
  set eloScore(eloScore: number) { this.#eloScore = eloScore }
  get state() { return this.#state }
  get action(): PlayerAction { return this.#action }

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
      id: this.#id,
      alive: false,
      name: this.#username,
      pos: this.#pos,
      moves: []
    }
  }

  setSocket(socket: ClientSocket) {
    this.disconnect()

    this.#socket = socket
    this.#socket.on('packet', this.#onPacket.bind(this))
    this.#socket.on('disconnected', this.disconnect.bind(this))
  }

  spawn(x: number, y: number) {
    this.#alive = true
    this.#moves = []
    this.#state.alive = true
    this.#state.moves = []
    this.setPos(x, y)
  }

  setPos(x: number, y: number) {
    this.#pos.x = x
    this.#pos.y = y
    this.#state.pos.x = x
    this.#state.pos.y = y
    this.#moves.push({ x, y })
    this.#state.moves.push({ x, y })
  }

  disconnect() {
    let disconnected = this.connected
    
    this.#socket?.removeAllListeners()
    this.#socket?.disconnect()
    this.#socket = undefined

    if (disconnected) this.emit('disconnected')
  }

  send(type: string, ...args: any) {
    if (!this.connected) return
    this.#socket?.send(type, ...args)
  }

  rawSend(packet: string) {
    if (!this.connected) return
    this.#socket?.rawSend(packet)
  }

  win() {
    this.#scoreHistory.push({ type: ScoreType.WIN, time: Date.now() })
    this.send('win', this.wins, this.loses)
  }

  lose() {
    this.#scoreHistory.push({ type: ScoreType.LOOSE, time: Date.now() })
    this.send('lose', this.wins, this.loses)
    this.kill()
  }

  kill() {
    if (!this.#alive) return
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
      this.sendError('ERROR_UNKNOWN_PACKET')
    }
  }
}