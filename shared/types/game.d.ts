declare enum ScoreType {
  LOOSE,
  WIN
}

type Score = {
  type: ScoreType
  time: number
}

type ScoreHistory = Score[]
