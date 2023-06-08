import { EventEmitter } from 'events'
import { MultiElo } from 'multi-elo'
import { tickrate } from '@gpn-tron/shared/constants/common'
import { Player, PlayerAction } from "./Player"

export enum ScoreType {
  LOOSE,
  WIN
}

export type Score = {
  type: ScoreType
  time: number
}

export type ScoreHistory = Score[]

export class Game extends EventEmitter {
  #id: string
  #players: Player[]
  #alivePlayerIds: number[]
  #deadPlayerIds: number[]
  #width: number
  #height: number
  #fields: Array<Array<number>>
  #state: GameState

  get alivePlayers(): Player[] {
    return this.#alivePlayerIds.map(e => this.#players[e])
  }
  get deadPlayers(): Player[] {
    return this.#deadPlayerIds.map(e => this.#players[e])
  }
  get state() {
    return this.#state
  }

  constructor(players: Player[]) {
    super()

    this.#id = Math.random().toString(32).slice(2)
    this.#players = players
    this.#alivePlayerIds = players.map((e, i) => i)
    this.#deadPlayerIds = []
    this.#width = players.length * 3
    this.#height = players.length * 3

    this.#initializeFields()
    this.#initializeGame()
    this.#initializeState()

    const tickInterval = setInterval(() => this.#onTick(), 1000 / tickrate)
    this.once('end', () => clearInterval(tickInterval))
  }

  broadcast(type: string, ...args: any) {
    this.#players.forEach(player => {
      player.send(type, ...args)
    })
  }

  #initializeState() {
    this.#state = {
      id: this.#id,
      width: this.#width,
      height: this.#height,
      players: this.#players.map(({ state }) => state),
    }
  }

  #initializeFields() {
    this.#fields = Array(this.#width).fill(null).map(() => Array(this.#height).fill(-1))
    const y = this.#height - 2 // 1 distance from lowest wall
    for (let i = 0; i < this.#players.length; i++) {
      const x = i * 3 + 1
      this.#fields[x][y] = i // Set the current player id to the spawn field
      this.#players[i].spawn(x, y)
    }
  }

  #initializeGame() {
    const onEndRemover = []
    this.once('end', () => {
      onEndRemover.forEach(fn => fn())
    })

    for (const playerIndex of this.#alivePlayerIds) {
      const player = this.#players[playerIndex]
      player.send('game', this.#width, this.#height, playerIndex)

      // Watch for chat messages and share them with all players
      const onChat = message => {
        this.broadcast('message', playerIndex, message)
      }
      player.on('chat', onChat)

      onEndRemover.push(() => {
        player.off('chat', onChat)
      })
    }

    this.#broadcastPos()
    // Let players know that this is the end of the player list.
    this.broadcast('tick')
  }

  #broadcastPos() {
    let updatePacket = ''
    for (const playerIndex of this.#alivePlayerIds) {
      const { x, y } = this.#players[playerIndex].pos
      updatePacket += `pos|${playerIndex}|${x}|${y}\n`
    }

    for (const playerIndex of this.#alivePlayerIds) {
      this.#players[playerIndex].rawSend(updatePacket)
    }
  }

  #onTick() {
    // Update player position
    for (const playerIndex of this.#alivePlayerIds) {
      const player = this.#players[playerIndex]

      // Detect disconnected players
      if (!player.connected) {
        this.#deadPlayerIds.push(playerIndex)
        continue
      }

      let action = player.readAndResetAction()

      // FIXME: Find a better solutions for players who did no move. Kick them?
      if (action === PlayerAction.NONE) {
        action = PlayerAction.MOVE_UP
      }

      let { x, y } = player.pos

      if (action === PlayerAction.MOVE_UP) {
        if (y === 0) y = this.#height - 1
        else y--
      }
      else if (action === PlayerAction.MOVE_RIGHT) {
        if (x === this.#width - 1) x = 0
        else x++
      }
      else if (action === PlayerAction.MOVE_DOWN) {
        if (y === this.#height - 1) y = 0
        else y++
      }
      else if (action === PlayerAction.MOVE_LEFT) {
        if (x === 0) x = this.#width - 1
        else x--
      }

      player.setPos(x, y)
    }

    // Apply move to fields
    for (const playerIndex of this.#alivePlayerIds) {
      const player = this.#players[playerIndex]
      if (!player.connected) continue

      const { x, y } = player.pos
      const fieldPlayerIndex = this.#fields[x][y]
      const fieldPlayer = this.#players[fieldPlayerIndex]

      // If field is free move to it
      if (!fieldPlayer) {
        this.#fields[x][y] = playerIndex
        continue
      }

      // If the player was not yet recognized as dead, add it
      if (this.#deadPlayerIds.indexOf(playerIndex) === -1) {
        this.#deadPlayerIds.push(playerIndex)
      }

      // If both people entered the field at the same time, kill both
      if (fieldPlayer !== player && fieldPlayer.pos.x === x && fieldPlayer.pos.y === y) {
        if (this.#deadPlayerIds.indexOf(fieldPlayerIndex) === -1) {
          this.#deadPlayerIds.push(fieldPlayerIndex)
        }
      }
    }

    // Cleanup fields of dead players
    for (let x = 0; x < this.#width; x++) {
      for (let y = 0; y < this.#height; y++) {
        const fieldPlayerIndex = this.#fields[x][y]
        if (fieldPlayerIndex === -1) continue
        if (this.#deadPlayerIds.indexOf(fieldPlayerIndex) === -1) continue
        this.#fields[x][y] = -1
      }
    }

    // Remove dead players from alive players array
    const newDeadPlayers: number[] = []
    for (let i = this.#alivePlayerIds.length - 1; i >= 0; i--) {
      const playerId = this.#alivePlayerIds[i]
      if (this.#deadPlayerIds.indexOf(playerId) === -1) continue

      newDeadPlayers.push(playerId)
      this.#alivePlayerIds.splice(i, 1)
      this.#players[playerId].lose()
    }

    // Inform about dead players and pos updates
    let updatePacket = ''
    if (newDeadPlayers.length) {
      updatePacket += `die|${newDeadPlayers.join('|')}\n`
    }
    for (const playerIndex of this.#alivePlayerIds) {
      const { x, y } = this.#players[playerIndex].pos
      updatePacket += `pos|${playerIndex}|${x}|${y}\n`
    }

    for (const playerIndex of this.#alivePlayerIds) {
      this.#players[playerIndex].rawSend(updatePacket)
    }

    // Check for game end
    let shouldEnd = false
    if (this.#players.length === 1 && !this.#alivePlayerIds.length) shouldEnd = true
    else if (this.#players.length > 1 && this.#alivePlayerIds.length <= 1) shouldEnd = true

    if (shouldEnd) {
      const winners: Player[] = []
      if (this.#alivePlayerIds.length === 1) {
        const winner = this.#players[this.#alivePlayerIds[0]]
        winners.push(winner)
        winner.win()
      }

      const losers = this.#deadPlayerIds.map(e => this.#players[e])

      // Update ELO scores
      if (winners.length && losers.length) {
        const playersInOrder = [...winners, ...losers];
        const placesInOrder = [...(winners.map(player => 1)), ...(losers.map(player => 2))];
        const newEloScores = MultiElo.getNewRatings(playersInOrder.map(player => player.eloScore), placesInOrder);
        for (let i = 0; i < playersInOrder.length; i++) {
          playersInOrder[i].eloScore = newEloScores[i];
        }
      }

      this.emit('end', winners)
    } else {
      this.broadcast('tick')
    }
  }
}
