import fs from 'fs';
import os from 'os';
import { EventEmitter } from 'events';
import { createServer, Server, Socket } from 'net';
import { WsStateServer } from '../libs/ws-state/server';
import { ClientSocket } from './ClientSocket';
import { Player } from './Player';
import { Game, GameState } from './Game';
import { maxConnections } from '../shared/contants/common';

const GAME_DATA_PATH = os.tmpdir() + '/data.json';
const HOSTNAMES = Object.values(os.networkInterfaces())
  .map((e) => e || [])
  .flat()
  .filter((e) => !e.internal && String(e.family).includes('4'))
  .map(({ address }) => address);
// HOSTNAMES.unshift('gpn-tron.v6.rocks');

if (HOSTNAMES.length === 0) throw new Error('Failed getting external ips!');

type ServerInfoListState = { host: string; port: number }[];
type ScoreboardState = {
  username: string;
  wins: number;
  loses: number;
  elo: number;
}[];
type ChartDataState = Record<string, any>[];

interface State {
  serverInfoList: ServerInfoListState;
  scoreboard: ScoreboardState;
  chartData: ChartDataState;
  game?: GameState;
  lastWinners: string[];
}

export class MazeServer extends EventEmitter {
  #gamePort: number; // Port number of the game tcp server
  #gameServer: Server; // TCP Server instance
  #viewPort: number; // Port number of the view server
  #viewServer: WsStateServer<State>;
  #game?: Game; // Game instance (if a game is active)
  #players: Record<string, Player> = {}; // Map of players. Key=username, Value=player
  #connectionIpmap: Record<string, number> = {};

  constructor(gamePort: number, viewPort: number) {
    super();
    this.#gamePort = gamePort;
    this.#viewPort = viewPort;

    this.#gameServer = createServer((socket) => this.#onSocket(socket));
    this.#viewServer = new WsStateServer(this.#viewPort, {
      serverInfoList: HOSTNAMES.map((host) => ({
        host,
        port: this.#gamePort,
      })),
      chartData: [],
      scoreboard: [],
      lastWinners: [],
    });

    this.#loadGameData();
    this.#updateScoreboard();

    // Lets wait a tick before we start. So one could listen to the started event.
    setTimeout(() => {
      this.#startGame();

      // Lets create a tcp server
      this.#gameServer.listen(this.#gamePort);
    }, 1);
  }

  /**
   * This method will load stored game data
   */
  #loadGameData() {
    // Create the file if it was not found
    if (!fs.existsSync(GAME_DATA_PATH)) {
      fs.writeFileSync(GAME_DATA_PATH, '{}'); // Empty object is default
    }

    try {
      const gameData = JSON.parse(fs.readFileSync(GAME_DATA_PATH).toString());
      if (!gameData.players) gameData.players = {};

      const playerdata: Record<string, any> = gameData.players;
      for (const [
        username,
        { password, scoreHistory, eloScore },
      ] of Object.entries(playerdata)) {
        if (!this.#players[username])
          this.#players[username] = new Player(username, password);
        if (scoreHistory) this.#players[username].scoreHistory = scoreHistory;
        if (eloScore) this.#players[username].eloScore = eloScore;
      }
    } catch (error) {}
  }

  /**
   * This method will store game data
   */
  #storeGameData() {
    // Create the file if it was not found
    if (!fs.existsSync(GAME_DATA_PATH)) {
      fs.writeFileSync(GAME_DATA_PATH, '{}'); // Empty object is default
    }

    try {
      const gameData = JSON.parse(fs.readFileSync(GAME_DATA_PATH).toString());
      if (!gameData.players) gameData.players = {};

      for (const {
        username,
        password,
        scoreHistory,
        eloScore,
      } of Object.values(this.#players)) {
        gameData.players[username] = { password, scoreHistory, eloScore };
      }

      fs.writeFileSync(GAME_DATA_PATH, JSON.stringify(gameData, null, 2));
    } catch (error) {}
  }

  #updateScoreboard() {
    const scoreboardPlayers: Player[] = Object.values(this.#players)
      .sort((a, b) => {
        const winRatioDiff = b.winRatio - a.winRatio;
        if (winRatioDiff !== 0) return winRatioDiff;
        const winDiff = b.wins - a.wins;
        if (winDiff !== 0) return winDiff;
        return b.loses - a.loses;
      })
      .slice(0, 10);

    this.#viewServer.state.scoreboard = scoreboardPlayers.map(
      ({ username, winRatio, wins, loses, eloScore }) => ({
        username,
        winRatio,
        wins,
        loses,
        elo: eloScore,
      })
    );

    this.#updateChartData(scoreboardPlayers);
  }

  #updateChartData(players: Player[]) {
    const chartPoints = 20;
    const chartData = Array(chartPoints)
      .fill(undefined)
      .map((_, index) => {
        const chartPoint: Record<string, any> = {
          name: index,
        };

        for (const player of players) {
          const historyIndex =
            player.scoreHistory.length - (chartPoints - 1 - index);
          const wins = player.scoreHistory
            .slice(0, historyIndex)
            .filter((e) => e.type === 'win').length;
          const loses = player.scoreHistory
            .slice(0, historyIndex)
            .filter((e) => e.type === 'lose').length;
          const games = wins + loses;
          const winRatio = games > 0 ? wins / games : 0;

          chartPoint[player.username] = winRatio;
        }

        return chartPoint;
      });

    this.#viewServer.state.chartData = chartData;
  }

  /**
   * This method will create a game instance and add current connected players to it.
   * The method will call itself to keep games running.
   * @param difficulty A number that decides the map difficulty
   */
  #startGame() {
    if (this.#game) throw new Error('Game in progress');

    const game = new Game(); // Create a new game
    this.#game = game;
    this.#viewServer.state.game = game.state;

    // Lets add current connected players to the game
    for (const player of Object.values(this.#players)) {
      if (!player.connected) continue;
      player.joinGame(game);
    }

    // Lets listen to the game end event
    game.on('end', (winners: Player[]) => {
      game.removeAllListeners();
      delete this.#viewServer.state.game;
      this.#game = undefined;

      this.#viewServer.state.lastWinners = winners.map(
        ({ username }) => username
      );

      // Store the current game data
      this.#storeGameData();

      this.#updateScoreboard();

      // Since the game did end lets create a new one with new difficulty
      setTimeout(() => this.#startGame(), 100);
    });
  }

  /**
   * Our callback which is called as soon as a peer connects to the tcp server
   * @param socket The tcp client socket that connected to this server
   */
  async #onSocket(socket: Socket) {
    const clientSocket = new ClientSocket(socket); // Lets create a ClientSocket instance which has alot of useful functions

    if (!this.#connectionIpmap[clientSocket.ip])
      this.#connectionIpmap[clientSocket.ip] = 0;
    this.#connectionIpmap[clientSocket.ip]++;

    clientSocket.on('disconnected', () => {
      this.#connectionIpmap[clientSocket.ip]--;
    });

    if (this.#connectionIpmap[clientSocket.ip] > maxConnections) {
      return clientSocket.sendError('Max connections reached', true);
    }

    clientSocket.send(
      'motd',
      'You can find the protocol documentation here: https://github.com/freehuntx/gpn-tron/blob/master/PROTOCOL.md'
    );

    // We need a timeout to detect if a client takes too long to join. 5 seconds should be fine
    const joinTimeout = setTimeout(() => {
      clientSocket.sendError('join timeout', true);
    }, 5000);

    // We listen once to the packet event. We expect the first packet to be a join packet
    clientSocket.once(
      'packet',
      (packetType: string, username: string, password: string) => {
        if (packetType !== 'join')
          return clientSocket.sendError('join packet expected', true);

        // Check the username
        if (typeof username !== 'string')
          return clientSocket.sendError('invalid username', true);
        if (username.length < 1)
          return clientSocket.sendError('username too short', true);
        if (username.length > 32)
          return clientSocket.sendError('username too long', true);

        if (!/^[ -~]+$/.test(username)) {
          return clientSocket.sendError('username has invalid symbols', true);
        }

        // Check the password
        if (typeof password !== 'string')
          return clientSocket.sendError('invalid password', true);
        if (password.length < 1)
          return clientSocket.sendError('password too short', true);
        if (username.length > 128)
          return clientSocket.sendError('password too long', true);

        // If we already have a player instance for this username lets use that
        let player = this.#players[username];

        if (player) {
          // There is a player with this name already? Check if the password is correct!
          if (player.password !== password)
            return clientSocket.sendError('wrong password', true);
          if (player.connected) {
            player.leaveGame();
            player.sendError(
              'Kicked out of session. Somebody else uses your user!',
              true
            );
          }
        } else {
          // Create a new player if we dont know this user yet
          player = new Player(username, password);
          this.#players[username] = player;
        }

        clearTimeout(joinTimeout); // Timeout is not needed as the client joined properly
        player.setSocket(clientSocket); // Lets update the socket of this player

        // If there is a game let the player join it
        if (this.#game) player.joinGame(this.#game);
      }
    );
  }
}
