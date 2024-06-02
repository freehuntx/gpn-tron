import { Socket } from "net"
import { EventEmitter } from "events"
//import { maxPacketsPerSecond } from "@gpn-tron/shared/constants/common"

export class ClientSocket extends EventEmitter {
  #connected = false
  #ip: string
  #socket?: Socket
  #sendBuffer = ""
  #sendTimeout?: NodeJS.Timeout

  /**
   * Create a ClientSocket instance from a tcp socket instance
   * @param socket TCP Socket instance
   * @returns {ClientSocket | null} Returns a ClientSocket instance or null if there was an error
   */
  static fromSocket(socket: Socket) {
    try {
      return new ClientSocket(socket)
    } catch (error) {
      console.error(error)
      return null
    }
  }

  constructor(socket: Socket) {
    super()

    if (socket.destroyed) throw new Error('Socket is not connected')
    if (!socket.remoteAddress) throw new Error('Socket has no valid ip')

    this.#connected = true
    this.#socket = socket
    this.#ip = socket.remoteAddress

    let buffer = ''

    this.#socket.on('data', chunk => {
      // More than x packets per second can be considered as spam.
      // Increase packet recv counter by 1 and check if its above the max
      //if (this.#recvPacketCount++ > maxPacketsPerSecond) {
      //  return this.sendError('ERROR_SPAM', true)
      //}

      // After a second reduce the packet count by one again so this packet is just counted for 1 second
      //setTimeout(() => {
      //  this.#recvPacketCount--
      //}, 1000)

      buffer += chunk.toString()

      if (buffer.length > 1024) {
        this.sendError('ERROR_PACKET_OVERFLOW', true)
        return
      }

      while (this.#connected && buffer.includes('\n')) {
        const packetIndex = buffer.indexOf('\n')
        const packetStr = buffer.substring(0, packetIndex)
        buffer = buffer.substring(packetIndex + 1)
        this.#onPacket(packetStr)
      }
    })

    this.#socket.on('close', () => this.disconnect())
    this.#socket.on('end', () => this.disconnect())
    this.#socket.on('error', this.#onError.bind(this))
  }

  get connected(): boolean { return this.#connected }
  get ip(): string { return this.#ip }

  disconnect() {
    if (!this.#connected) return

    this.#connected = false
    this.#socket.removeAllListeners()
    this.#socket?.end()
    this.#socket?.destroy()
    this.#socket = undefined
    this.emit('disconnected')
  }

  send(type: string, ...args: any) {
    return this.rawSend(`${[type, ...args].join('|')}\n`)
  }

  rawSend(packet: string) {
    if (!this.connected || !this.#socket || this.#socket.destroyed) return

    this.#sendBuffer += packet

    clearTimeout(this.#sendTimeout)
    this.#sendTimeout = setTimeout(() => {
      try {
        this.#socket.write(this.#sendBuffer)
        this.#sendBuffer = ""
      }
      catch (error) {
        console.error(error)
        this.disconnect()
      }
    }, 1)
  }

  sendError(error: string, disconnect = false) {
    this.send('error', error)
    if (disconnect) this.disconnect()
  }

  #onPacket(packet: string) {
    if (!this.connected) return

    const args = packet.split('|').map(arg => /^\-?\d+(\.\d+)?$/.test(arg) ? Number(arg) : arg)
    const type = args.shift()
    this.emit('packet', type, ...args)
  }

  #onError(error: Error & { code: string }) {
    if (error?.code !== 'ECONNRESET') console.error(error)
    this.disconnect()
  }
}