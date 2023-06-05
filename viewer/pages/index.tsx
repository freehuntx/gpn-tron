import { WsStateClient } from "@gpn-tron/shared/lib/ws-state/client"
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    let client = new WsStateClient<ViewState>(4001)

    client.on('update', () => {
      if (client.state.game) console.log(client.state.game?.players.bot.pos)
    })

    return () => {
      client.close()
    }
  }, [])

  return <h1>lel!</h1>;
}
