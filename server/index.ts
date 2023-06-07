import { GameServer } from "./GameServer"
import { Bot } from './Bot'

const GAME_PORT = parseInt(process.env.GAME_PORT || '') || 4000

async function main() {
  const gameServer = new GameServer(GAME_PORT)

  // Spawn a bot
  setTimeout(() => {
    for (let i = 0; i < 10; i++) {
      const bot = new Bot('bot' + i, '127.0.0.1', GAME_PORT)
    }
  }, 1000)
}

main().catch(console.error)
