import { EventEmitter } from 'events'
import { MultiElo } from 'multi-elo'
import { Player, PlayerAction, PlayerState } from "./Player"
import { tickrate } from '@gpn-tron/shared/constants/common'

export interface GameState {
  id: string
  width: number
  height: number
  start: Vec2
  goal: Vec2
  players: Record<string, PlayerState>
  walls: Record<string, { pos: Vec2 } & WallInfo>
}

export class Game extends EventEmitter {
  #id: string
  #maze: Maze
  #players: Player[] = []

  #state: GameState

  constructor(difficulty: number) {
    super()

    this.#id = Math.random().toString(32).slice(2)
    this.#maze = createMaze(difficulty)

    this.#state = {
      id: this.#id,
      width: this.#maze.width,
      height: this.#maze.height,
      start: this.#maze.start,
      goal: this.#maze.goal,
      players: {},
      walls: {}
    }

    const tickInterval = setInterval(() => this.#onTick(), 1000 / tickrate)
    this.on('end', () => clearInterval(tickInterval))
  }

  get id(): string { return this.#id }
  get state(): GameState { return this.#state }
  get maze(): Maze { return this.#maze }

  addPlayer(player: Player) {
    if (this.#players.includes(player)) {
      console.error('[Error] Player already joined!')
      return
    }

    this.#players.push(player)
    this.#state.players[player.username] = player.state

    this.#updatePlayerPosition(player, this.#maze.start.x, this.#maze.start.y)
  }

  removePlayer(player: Player) {
    const playerIndex = this.#players.indexOf(player)
    if (playerIndex === -1) return

    this.#players.splice(playerIndex, 1)
    delete this.#state.players[player.username]
  }

  #updatePlayerPosition(player: Player, x: number, y: number) {
    const { top, right, bottom, left } = this.#maze.walls[x][y]
    const wallArgs = [top, right, bottom, left].map(e => e ? 1 : 0)
    player.setPos(x, y)
    player.send('pos', x, y, ...wallArgs)
  }

  #onTick() {
    // Check for winners
    const winners = this.#players.filter(player => player.pos.x === this.#maze.goal.x && player.pos.y === this.#maze.goal.y)
    if (winners.length > 0) {
      for (const player of this.#players) {
        if (winners.includes(player)) player.win()
        else player.lose()
      }

      // Update ELO scores
      if (this.#players.length > 1) {
        const losers = this.#players.filter(player => !(player.pos.x === this.#maze.goal.x && player.pos.y === this.#maze.goal.y))
        const playersInOrder = [...winners, ...losers];
        const placesInOrder = [...(winners.map(player => 1)), ...(losers.map(player => 2))];
        const newEloScores = MultiElo.getNewRatings(playersInOrder.map(player => player.eloScore), placesInOrder);
        for (let i = 0; i < playersInOrder.length; i++) {
          playersInOrder[i].eloScore = newEloScores[i];
        }
      }
      
      this.emit('end', winners)
      return
    }

    // Handle movement
    for (const player of this.#players) {
      const action = player.readAndResetAction()
      let hitWall = false
      let moved = false

      if (action === PlayerAction.MOVE_UP) {
        if (this.#maze.walls[player.pos.x][player.pos.y].top) hitWall = true
        else {
          player.setPos(player.pos.x, player.pos.y - 1)
          moved = true
        }
      } else if (action === PlayerAction.MOVE_RIGHT) {
        if (this.#maze.walls[player.pos.x][player.pos.y].right) hitWall = true
        else {
          player.setPos(player.pos.x + 1, player.pos.y)
          moved = true
        }
      } else if (action === PlayerAction.MOVE_DOWN) {
        if (this.#maze.walls[player.pos.x][player.pos.y].bottom) hitWall = true
        else {
          player.setPos(player.pos.x, player.pos.y + 1)
          moved = true
        }
      } else if (action === PlayerAction.MOVE_LEFT) {
        if (this.#maze.walls[player.pos.x][player.pos.y].left) hitWall = true
        else {
          player.setPos(player.pos.x - 1, player.pos.y)
          moved = true
        }
      }

      const { x, y } = player.pos
      const isAtGoal = this.#maze.goal.x === x && this.#maze.goal.y === y
      if (!this.#state.walls[`${x}:${y}`]) {
        this.#state.walls[`${x}:${y}`] = { pos: { x, y }, ...this.#maze.walls[x][y] }
      }

      if (hitWall) player.sendError('you cant walk into walls...')
      if (moved) {
        if (!isAtGoal) this.#updatePlayerPosition(player, x, y)
      }
    }
  }
}