import { EventEmitter } from 'events'
import { MultiElo } from 'multi-elo'
import { baseTickrate, tickIncreaseInterval } from '@gpn-tron/shared/constants/common'
import { getColor } from '@gpn-tron/shared/constants/colors'
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
  #width: number
  #height: number
  #fields: Array<Array<number>>
  #state: GameState
  #tickRate = baseTickrate
  #startTime = Date.now()

  get state() {
    return this.#state
  }
  get alivePlayers(): Player[] {
    return this.#players.filter(({ alive }) => alive)
  }
  get deadPlayers(): Player[] {
    return this.#players.filter(({ alive }) => !alive)
  }

  constructor(players: Player[]) {
    super()

    this.#id = Math.random().toString(32).slice(2)
    this.#players = players

    this.#initializePlayers()
    this.#initializeFields()
    this.#initializeGame()
    this.#initializeState()

    setTimeout(() => this.#onTick(), 1000 / baseTickrate)
  }

  broadcastToAlive(type: string, ...args: any) {
    for (const player of this.alivePlayers) {
      player.send(type, ...args)
    }
  }

  broadcast(type: string, ...args: any) {
    this.#players.forEach(player => {
      player.send(type, ...args)
    })
  }

  #removePlayerFromFields(player: Player) {
    player.moves.forEach(({ x, y }) => {
      this.#fields[x][y] = -1
    })
  }

  #initializePlayers() {
    // Shuffle the players
    this.#players.sort(() => 0.5 - Math.random())

    for (let i=0; i<this.#players.length; i++) {
      this.#players[i].id = i // Set the current player id
    }
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
    this.#width = this.#players.length * 2
    this.#height = this.#players.length * 2
    this.#fields = Array(this.#width).fill(null).map(() => Array(this.#height).fill(-1))

    for (let i = 0; i < this.#players.length; i++) {
      const x = i * 2
      const y = i * 2
      this.#fields[x][y] = i // Set the current player id to the spawn field
      this.#players[i].spawn(x, y)
    }
  }

  #initializeGame() {
    const onEndRemover = []
    this.once('end', () => {
      onEndRemover.forEach(fn => fn())
    })

    for (const player of this.alivePlayers) {
      player.send('game', this.#width, this.#height, player.id)

      // Watch for chat messages and share them with all players
      const onChat = message => {
        this.broadcastToAlive('message', player.id, message)
      }
      player.on('chat', onChat)

      onEndRemover.push(() => {
        player.off('chat', onChat)
      })
    }

    this.#broadcastPos()
    this.broadcastToAlive('tick')
  }

  #broadcastPos() {
    let updatePacket = ''
    for (const player of this.alivePlayers) {
      const { x, y } = player.pos
      updatePacket += `pos|${player.id}|${x}|${y}\n`
    }

    for (const player of this.alivePlayers) {
      player.rawSend(updatePacket)
    }
  }

  #onTick() {
    const newDeadPlayers: Player[] = []

    // Remove disconnected players
    this.alivePlayers.filter(({ connected }) => !connected).forEach(player => {
      newDeadPlayers.push(player)
      player.kill()
      this.#removePlayerFromFields(player)
    })

    // Update player position
    for (const player of this.alivePlayers) {
      let { action } = player
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
      else {
        // Enforce up if player did not move
        action = PlayerAction.MOVE_UP
      }

      player.setPos(x, y)
    }

    // Apply move to fields
    for (const player of this.alivePlayers) {
      const { x, y } = player.pos
      const fieldPlayerIndex = this.#fields[x][y]
      const fieldPlayer = this.#players[fieldPlayerIndex]

      // If field is free move to it
      if (!fieldPlayer) {
        this.#fields[x][y] = player.id
        continue
      }

      // If both people entered the field at the same time, kill both
      if (fieldPlayer !== player && fieldPlayer.pos.x === x && fieldPlayer.pos.y === y) {
        newDeadPlayers.push(fieldPlayer)
        fieldPlayer.kill()
      }

      newDeadPlayers.push(player)
      player.kill()
    }

    // Cleanup fields of dead players and make them lose
    newDeadPlayers.forEach(player => {
      this.#removePlayerFromFields(player)
      player.lose()
    })

    // Inform about dead players and pos updates
    let updatePacket = ''
    if (newDeadPlayers.length) {
      updatePacket += `die|${newDeadPlayers.map(({ id }) => id).join('|')}\n`
    }
    for (const player of this.alivePlayers) {
      const { x, y } = player.pos
      updatePacket += `pos|${player.id}|${x}|${y}\n`
    }

    for (const player of this.alivePlayers) {
      player.rawSend(updatePacket)
    }

    // Check for game end
    let shouldEnd = false
    if (this.#players.length === 1 && this.alivePlayers.length === 0) shouldEnd = true
    else if (this.#players.length > 1 && this.alivePlayers.length <= 1) shouldEnd = true

    if (shouldEnd) {
      const winners: Player[] = this.alivePlayers
      winners.forEach(p => p.win())

      const losers = this.deadPlayers

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
      this.broadcastToAlive('tick')

      // Dynamically define tickrate
      const timeDiff = Date.now() - this.#startTime
      this.#tickRate = baseTickrate + Math.floor(timeDiff / 1000 / tickIncreaseInterval)

      setTimeout(() => this.#onTick(), 1000 / this.#tickRate)
    }
  }
}
