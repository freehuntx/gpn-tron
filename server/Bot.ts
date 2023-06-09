import { Socket } from 'net'

export class Bot {
  #socket: Socket
  #ip: string
  #port: number
  #connected = false
  #name: string
  #pos: Vec2 = { x: 0, y: 0 }
  #ingame = false
  #playerId: number
  #width: number
  #height: number
  #fields: Array<Array<number>>
  #reconnectTimeout: NodeJS.Timeout

  constructor(name: string, ip: string, port: number) {
    this.#name = name
    this.#ip = ip
    this.#port = port

    this.connect()
  }

  connect() {
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
      this.disconnect()
    })

    this.#socket.on('error', (error) => {
      console.error(error)
      this.disconnect()
    })

    this.#socket.connect(this.#port, this.#ip, () => {
      this.#connected = true
      this.send('join', this.#name, 'password')
    })
  }

  disconnect() {
    this.#socket?.removeAllListeners()
    this.#socket?.destroy()
    this.#socket = undefined
    this.#connected = false

    clearTimeout(this.#reconnectTimeout)
    this.#reconnectTimeout = setTimeout(() => {
      this.connect()
    }, 1000)
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
      console.log('error', ...args)
    }
    else if (type === 'game') {
      const [width, height, playerId] = args as number[]
      this.#ingame = true
      this.#playerId = playerId
      this.#pos = { x: 0, y: 0 }
      this.#width = width
      this.#height = height
      this.#fields = Array(width).fill(null).map(() => Array(height).fill(-1))
      //this.send('chat', 'Im a stupid bot :(')
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

      if (playerId === this.#playerId) {
        this.#pos.x = x
        this.#pos.y = y
      }
    }
    else if (type === 'tick') {
      const { x, y } = this.#pos
      const possibleMoves: Record<string, boolean> = {}

      if (y === 0 && this.#fields[x][this.#height - 1] === -1) {
        possibleMoves.up = true
      }
      if (y > 0 && this.#fields[x][y - 1] === -1) {
        possibleMoves.up = true
      }
      if (x === this.#width - 1 && this.#fields[0][y] === -1) {
        possibleMoves.right = true
      }
      if (x < this.#width - 1 && this.#fields[x + 1][y] === -1) {
        possibleMoves.right = true
      }
      if (y === this.#height - 1 && this.#fields[x][0] === -1) {
        possibleMoves.down = true
      }
      if (y < this.#height - 1 && this.#fields[x][y + 1] === -1) {
        possibleMoves.down = true
      }
      if (x === 0 && this.#fields[this.#width - 1][y] === -1) {
        possibleMoves.left = true
      }
      if (x > 0 && this.#fields[x - 1][y] === -1) {
        possibleMoves.left = true
      }

      const possibleArr = Object.keys(possibleMoves)
      if (possibleArr.length) this.send('move', possibleArr[Math.floor(Math.random() * possibleArr.length)])
    }
  }
}
