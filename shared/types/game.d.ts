interface ViewState {
  serverInfoList: {
    host: string
    port: number
  }[],
  game?: GameState
  chartData: any[]
  scoreboard: any[]
  lastWinners: any[]
}

interface GameState {
  id: string
  width: number
  height: number
  players: Record<string, PlayerState>
  fields: Array<Array<number>>
}
