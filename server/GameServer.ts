import { networkInterfaces, tmpdir } from 'os'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createServer, Server, Socket } from 'net'
import { joinTimeout, maxConnections } from '@gpn-tron/shared/constants/common'
import { WsStateServer } from '@gpn-tron/shared/lib/ws-state/server'
import { ClientSocket } from './ClientSocket'
import { Player } from './Player'
import { Game, ScoreType } from './Game'

const VIEW_PORT = parseInt(process.env.VIEW_PORT || '') || 4001
const GAME_DATA_PATH = `${tmpdir()}/gpn-tron-data.json`
const HOSTNAMES = Object.values(networkInterfaces())
  .map(e => e || [])
  .flat()
  .filter(e => !e.internal && String(e.family).includes('4'))
  .map(({ address }) => address)
// HOSTNAMES.unshift('gpn-mazing.v6.rocks')

if (HOSTNAMES.length === 0) throw new Error('Failed getting external ips!')

export class GameServer {
  #port: number // Port number of the game tcp server
  #tcpServer: Server // TCP Server instance
  #viewServer: WsStateServer<ViewState> // View server instance
  #connectionIpMap: Record<string, number> = {} // Used to count the amount of connections per ip
  #players: Record<string, Player> = {} // Map of players. Key=username, Value=player
  #game?: Game // Game instance (if a game is active)

  constructor(port: number) {
    this.#port = port
    this.#tcpServer = createServer(this.#onSocket.bind(this))

    this.#initViewServer()
    this.#loadGameData()
    this.#updateScoreboard()

    setTimeout(() => {
      this.#tcpServer.listen(this.#port)
      console.log('Game server started on port:', this.#port)
    }, 1)

    setTimeout(() => this.#startGame(), 1000)
  }

  #initViewServer() {
    this.#viewServer = new WsStateServer<ViewState>(VIEW_PORT, {
      serverInfoList: HOSTNAMES.map(host => ({
        host,
        port: this.#port
      })),
      chartData: [],
      scoreboard: [],
      lastWinners: []
    })
  }

  /**
   * This method will load stored game data
   */
  #loadGameData() {
    // Create the file if it was not found
    if (!existsSync(GAME_DATA_PATH)) {
      writeFileSync(GAME_DATA_PATH, '{}') // Empty object is default
    }

    try {
      const gameData = JSON.parse(readFileSync(GAME_DATA_PATH).toString())
      if (!gameData.players) gameData.players = {}

      const playerdata: Record<string, any> = gameData.players
      for (const [username, { password, scoreHistory, eloScore }] of Object.entries(playerdata)) {
        if (!this.#players[username]) this.#players[username] = new Player(username, password)
        if (scoreHistory) this.#players[username].scoreHistory = scoreHistory
        if (eloScore) this.#players[username].eloScore = eloScore;
      }
    } catch (error) { }
  }

  /**
   * This method will store game data
   */
  #storeGameData() {
    // Create the file if it was not found
    if (!existsSync(GAME_DATA_PATH)) {
      writeFileSync(GAME_DATA_PATH, '{}') // Empty object is default
    }

    try {
      const gameData = JSON.parse(readFileSync(GAME_DATA_PATH).toString())
      if (!gameData.players) gameData.players = {}

      for (const { username, password, scoreHistory, eloScore } of Object.values(this.#players)) {
        gameData.players[username] = { password, scoreHistory, eloScore }
      }

      writeFileSync(GAME_DATA_PATH, JSON.stringify(gameData, null, 2))
    } catch (error) { }
  }

  #updateScoreboard() {
    const scoreboardPlayers: Player[] = Object.values(this.#players)
      .sort((a, b) => {
        const winRatioDiff = b.winRatio - a.winRatio
        if (winRatioDiff !== 0) return winRatioDiff
        const winDiff = b.wins - a.wins
        if (winDiff !== 0) return winDiff
        return b.loses - a.loses
      })
      .slice(0, 10)

    this.#viewServer.state.scoreboard = scoreboardPlayers
      .map(({ username, winRatio, wins, loses, eloScore }) => ({ username, winRatio, wins, loses, elo: eloScore }))

    this.#updateChartData(scoreboardPlayers)
  }

  #updateChartData(players: Player[]) {
    const chartPoints = 20
    const chartData = Array(chartPoints).fill(undefined).map((_, index) => {
      const chartPoint: Record<string, any> = {
        name: index
      }

      for (const player of players) {
        const historyIndex = player.scoreHistory.length - (chartPoints - 1 - index)
        const wins = player.scoreHistory.slice(0, historyIndex).filter(e => e.type === ScoreType.WIN).length
        const loses = player.scoreHistory.slice(0, historyIndex).filter(e => e.type === ScoreType.LOOSE).length
        const games = wins + loses
        const winRatio = games > 0 ? wins / games : 0

        chartPoint[player.username] = winRatio
      }

      return chartPoint
    })

    this.#viewServer.state.chartData = chartData
  }

  /**
   * This method will create a game instance and add current connected players to it.
   * The method will call itself to keep games running.
   * @param difficulty A number that decides the map difficulty
   */
  #startGame() {
    if (this.#game) throw new Error('Game in progress')

    const connectedPlayers = Object.values(this.#players).filter(player => player.connected)
    if (!connectedPlayers.length) {
      setTimeout(() => this.#startGame(), 1000)
      return
    }

    this.#game = new Game(connectedPlayers) // Create a new game
    this.#viewServer.state.game = this.#game.state

    // Lets listen to the game end event
    this.#game.once('end', (winners: Player[]) => {
      this.#game.removeAllListeners()
      this.#game = undefined

      this.#viewServer.state.lastWinners = winners.map(({ username }) => username)

      // Store the current game data
      this.#storeGameData()

      this.#updateScoreboard()

      // Since the game did end lets create a new one
      setTimeout(() => this.#startGame(), 1000)
    })
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

    if (maxConnections >= 0 && this.#connectionIpMap[clientSocket.ip] > maxConnections && !clientSocket.ip.endsWith('127.0.0.1')) {
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
      clearTimeout(joinTimeoutTimer) // Timeout is not needed as the client sent the join packet

      // Check the username
      if (typeof username !== "string") return clientSocket.sendError('ERROR_INVALID_USERNAME', true)
      if (username.length < 1) return clientSocket.sendError('ERROR_USERNAME_TOO_SHORT', true)
      if (username.length > 32) return clientSocket.sendError('ERROR_USERNAME_TOO_LONG', true)

      if (!/^[ -~]+$/.test(username)) return clientSocket.sendError('ERROR_USERNAME_INVALID_SYMBOLS', true)

      // Check the password
      if (typeof password !== "string") return clientSocket.sendError('ERROR_INVALID_PASSWORD', true)
      if (password.length < 1) return clientSocket.sendError('ERROR_PASSWORD_TOO_SHORT', true)
      if (username.length > 128) return clientSocket.sendError('ERROR_PASSWORD_TOO_LONG', true)

      // Check for bots
      if (username === 'bot') {
        if (!clientSocket.ip.endsWith('127.0.0.1')) {
          return clientSocket.sendError('ERROR_NO_PERMISSION', true)
        }
      }

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
          player.sendError('ERROR_ALREADY_CONNECTED', true)
        }
      }

      player.setSocket(clientSocket) // Lets update the socket of this player
    })
  }
}