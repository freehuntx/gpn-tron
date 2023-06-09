type ServerInfoList = { host: string; port: number }[]
type ScoreboardEntry = { username: string; winRatio: number; wins: number; loses: number, elo: number }
type ChartData = Record<string, any>[]
type Scoreboard = ScoreboardEntry[]
type LastWinners = string[]

interface ViewState {
  serverInfoList: ServerInfoList
  game?: GameState
  chartData: ChartData
  scoreboard: Scoreboard
  lastWinners: LastWinners
}

interface GameState {
  id: string
  width: number
  height: number
  players: PlayerState[]
}
