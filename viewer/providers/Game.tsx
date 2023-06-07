import React, { createContext, useContext, useEffect, useState } from 'react'
import { WsStateClient } from '@gpn-tron/shared/lib/ws-state/client'

type GameContext = ViewState & { _toggle: boolean }

const initialContext = { serverInfoList: [], scoreboard: [], lastWinners: [], chartData: [], _toggle: false }
const gameContext = createContext<GameContext>(initialContext)

export const useGame = () => useContext(gameContext)

export function GameProvider({ children }: { children: React.ReactElement }) {
  const [state, setState] = useState<ViewState>(initialContext)
  const [_toggle, setToggle] = useState<boolean>(false)

  useEffect(() => {
    const client = new WsStateClient<ViewState>(4001)

    client.on('update', (path) => {
      setState(client.state)
      setToggle(b => !b)
    })
  }, [])

  return (
    <gameContext.Provider value={{ ...state, _toggle }}>
      {children}
    </gameContext.Provider>
  )
}