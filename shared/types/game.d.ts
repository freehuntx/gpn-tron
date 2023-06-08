type ServerInfoList = { host: string; port: number }[]
type ScoreboardEntry = { username: string; winRatio: number; wins: number; loses: number, elo: number }
type ChartData = Record<string, any>[]

interface ViewState {
  serverInfoList: ServerInfoList
  game?: GameState
  chartData: ChartData
  scoreboard: ScoreboardEntry[]
  lastWinners: string[]
}

interface GameState {
  id: string
  width: number
  height: number
  players: PlayerState[]
}
