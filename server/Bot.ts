import { Socket } from 'net'

export class Bot {
  #socket: Socket
  #ip: string
  #port: number
  #connected = false
  #ingame = false
  #playerId: number
  #width: number
  #height: number
  #fields: Array<Array<number>>

  constructor(ip: string, port: number) {
    this.#ip = ip
    this.#port = port

    this.connect()
  }

  connect() {
    this.disconnect()
    let data = ''

    this.#socket = new Socket()

    this.#socket.on('data', chunk => {
      data += chunk.toString()

      while (this.#connected && data.includes('\n')) {
        const packetIndex = data.indexOf('\n')
        const packetStr = data.substring(0, packetIndex)
        data = data.substring(packetIndex + 1)
        this.onPacket(packetStr)
      }
    })

    this.#socket.on('close', () => {
      setTimeout(() => this.connect(), 1000)
    })

    this.#socket.connect(this.#port, this.#ip, () => {
      this.#connected = true
      this.send('join', 'bot', 'password')
    })
  }

  disconnect() {
    this.#socket?.destroy()
    this.#socket = undefined
    this.#connected = false
  }

  send(type: string, ...args: any) {
    if (!this.#connected || !this.#socket || this.#socket.destroyed) return
    try {
      this.#socket.write(`${[type, ...args].join('|')}\n`)
    }
    catch (error) {
      console.error(error)
      this.disconnect()
    }
  }

  onPacket(packet: string) {
    if (!this.#connected) return

    const args = packet.split('|').map(arg => /^\-?\d+(\.\d+)?$/.test(arg) ? Number(arg) : arg)
    const type = args.shift()
    //console.log(type, ...args)

    // Do
    if (type === 'motd') {
    }
    else if (type === 'error') {
    }
    else if (type === 'game') {
      const [width, height, playerId] = args as number[]
      this.#ingame = true
      this.#playerId = playerId
      this.#width = width
      this.#height = height
      this.#fields = Array(width).fill(null).map(() => Array(height).fill(-1))
    }
    else if (type === 'die') {
      for (let x = 0; x < this.#width; x++) {
        for (let y = 0; y < this.#height; y++) {
          const fieldPlayerId = this.#fields[x][y]
          if (fieldPlayerId === -1) continue
          if (args.indexOf(fieldPlayerId) === -1) continue
          this.#fields[x][y] = -1
        }
      }
    }
    else if (type === 'lose' || type === 'win') {
      this.#ingame = false
      this.#playerId = undefined
    }
    else if (type === 'pos') {
      const [playerId, x, y] = args as number[]
      this.#fields[x][y] = playerId

      // If its us, try to find a free field to move to
      if (playerId === this.#playerId) {
        if (y === 0 && this.#fields[x][this.#height - 1] === -1) {
          this.send('move', 'up')
        }
        else if (this.#fields[x][y - 1] === -1) {
          this.send('move', 'up')
        }
        else if (x === this.#width - 1 && this.#fields[0][y] === -1) {
          this.send('move', 'right')
        }
        else if (this.#fields[x + 1][y] === -1) {
          this.send('move', 'right')
        }
        else if (y === this.#height - 1 && this.#fields[x][0] === -1) {
          this.send('move', 'down')
        }
        else if (this.#fields[x][y + 1] === -1) {
          this.send('move', 'down')
        }
        else if (x === 0 && this.#fields[this.#width - 1][y] === -1) {
          this.send('move', 'left')
        }
        else if (this.#fields[x - 1][y] === -1) {
          this.send('move', 'left')
        }
      }
    }
  }
}
