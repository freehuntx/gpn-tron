import { createServer, Server, Socket } from 'net'

export class GameServer {
  #gamePort: number // Port number of the game tcp server
  #gameServer: Server // TCP Server instance

  constructor(gamePort: number) {
    this.#gamePort = gamePort
    
    this.#gameServer = createServer(socket => this.#onSocket(socket))

    this.#loadGameData()
    this.#updateScoreboard()

    // Lets wait a tick before we start. So one could listen to the started event.
    setTimeout(() => {
      this.#startGame()

      // Lets create a tcp server
      this.#gameServer.listen(this.#gamePort)
    }, 1)
  }

  /**
   * Our callback which is called as soon as a peer connects to the tcp server
   * @param socket The tcp client socket that connected to this server
   */
  async #onSocket(socket: Socket) {
    
  }
}