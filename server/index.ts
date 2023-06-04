import { GameServer } from "./GameServer"
import { Bot } from './Bot'

const GAME_PORT = parseInt(process.env.GAME_PORT || '') || 4000

async function main() {
  const gameServer = new GameServer(GAME_PORT)

  console.log('Game server started on port:', GAME_PORT)

  // Spawn a bot
  setTimeout(() => {
    const bot = new Bot('127.0.0.1', GAME_PORT)
  }, 1000)
}

main().catch(console.error)
