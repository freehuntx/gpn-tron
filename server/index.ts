import { GameServer } from "./GameServer"

const GAME_PORT = parseInt(process.env.GAME_PORT || '') || 4000

async function main() {
  const gameServer = new GameServer(GAME_PORT)

  console.log('Game server started on port:', GAME_PORT)
  console.log('View server started on port:', VIEW_PORT)
}

