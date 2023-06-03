import { createServer, Server, Socket } from 'net'
import { joinTimeout, maxConnections } from '@gpn-tron/shared/constants/common'
import { ClientSocket } from './ClientSocket'

class Player {
  username: string
  password: string
  connected: boolean
  constructor(username, password) {}
  leaveGame() {}
  sendError(a, b) {}
  setSocket(a) {}
}

export class GameServer {
  #port: number // Port number of the game tcp server
  #tcpServer: Server // TCP Server instance
  #connectionIpMap: Record<string, number> = {} // Used to count the amount of connections per ip
  #players: Record<string, Player> = {} // Map of players. Key=username, Value=player

  constructor(port: number) {
    this.#port = port
    this.#tcpServer = createServer(this.#onSocket.bind(this))

    //this.#loadGameData()
    //this.#updateScoreboard()

    // Lets wait a tick before we start. So one could listen to the started event.
    /*setTimeout(() => {
      this.#startGame()

      // Lets create a tcp server
      this.#gameServer.listen(this.#gamePort)
    }, 1)*/
  }

  /**
   * Our callback which is called as soon as a peer connects to the tcp server
   * @param socket The tcp client socket that connected to this server
   */
  async #onSocket(socket: Socket) {
    const clientSocket = ClientSocket.fromSocket(socket) // Lets try to create a ClientSocket instance which has alot of useful functions
    if (!clientSocket) return
    
    if (!this.#connectionIpMap[clientSocket.ip]) this.#connectionIpMap[clientSocket.ip] = 0
    this.#connectionIpMap[clientSocket.ip]++

    clientSocket.on('disconnected', () => {
      this.#connectionIpMap[clientSocket.ip]--
    })

    if (maxConnections >= 0 && this.#connectionIpMap[clientSocket.ip] > maxConnections) {
      return clientSocket.sendError('ERROR_MAX_CONNECTIONS', true)
    }

    clientSocket.send('motd', 'You can find the protocol documentation here: https://github.com/freehuntx/gpn-tron/blob/master/PROTOCOL.md')

    // We need a timeout to detect if a client takes too long to join. 5 seconds should be fine
    const joinTimeoutTimer = setTimeout(() => {
      clientSocket.sendError('ERROR_JOIN_TIMEOUT', true)
    }, joinTimeout)

    // We listen once to the packet event. We expect the first packet to be a join packet
    clientSocket.once('packet', (packetType: string, username: string, password: string) => {
      if (packetType !== 'join') return clientSocket.sendError('ERROR_EXPECTED_JOIN', true)

      // Check the username
      if (typeof username !== "string") return clientSocket.sendError('ERROR_INVALID_USERNAME', true)
      if (username.length < 1) return clientSocket.sendError('ERROR_USERNAME_TOO_SHORT', true)
      if (username.length > 32) return clientSocket.sendError('ERROR_USERNAME_TOO_LONG', true)

      if (!/^[ -~]+$/.test(username)) return clientSocket.sendError('ERROR_USERNAME_INVALID_SYMBOLS', true)

      // Check the password
      if (typeof password !== "string") return clientSocket.sendError('ERROR_INVALID_PASSWORD', true)
      if (password.length < 1) return clientSocket.sendError('ERROR_PASSWORD_TOO_SHORT', true)
      if (username.length > 128) return clientSocket.sendError('ERROR_PASSWORD_TOO_LONG', true)

      // If we already have a player instance for this username lets use that
      let player = this.#players[username]

      if (!player) {
        // Create a new player if we dont know this user yet
        player = new Player(username, password)
        this.#players[username] = player
      } else {
        // There is a player with this name already? Check if the password is correct!
        if (player.password !== password) return clientSocket.sendError('ERROR_WRONG_PASSWORD', true)
        if (player.connected) {
          player.leaveGame()
          player.sendError('ERROR_SESSION_TAKEOVER', true)
        }
      }

      clearTimeout(joinTimeout) // Timeout is not needed as the client joined properly
      player.setSocket(clientSocket) // Lets update the socket of this player
    })
  }
}