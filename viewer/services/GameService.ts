import { EventEmitter } from "events"
import { WsStateClient } from "@gpn-tron/shared/lib/ws-state/client"

export class GameService extends EventEmitter {
  #client: WsStateClient<ViewState>
  
  get game() {
    return this.#client.state.game
  }
  get chartData() {
    return this.#client.state.chartData
  }
  get scoreboard() {
    return this.#client.state.scoreboard
  }
  get serverInfoList() {
    return this.#client.state.serverInfoList
  }
  get lastWinners() {
    return this.#client.state.lastWinners
  }

  constructor() {
    super()
    this.#client = new WsStateClient<ViewState>(4001)

    this.#client.on('update', () => {
      this.emit('update')
    })
  }
}

export default new GameService()