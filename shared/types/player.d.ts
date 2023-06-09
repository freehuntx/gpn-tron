interface PlayerState {
  id: number
  alive: boolean
  name: string
  pos: Vec2
  moves: Vec2[]
  chat?: string
}