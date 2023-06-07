import { useEffect, useState } from 'react'
import { useGame } from '../providers/Game'
import { Scoreboard } from '../components/Scoreboard'
import { Game } from '../components/Game'

export default function Home() {
  const [active, setActive] = useState(false)
  const { serverInfoList, lastWinners, game } = useGame()

  useEffect(() => {
    // Do this to prevent SSR
    setActive(true)
  }, [])

  if (!active) return null
  return (
    <div style={{ display: 'flex', height: '100%', fontSize: '1.3em', wordBreak: 'break-all' }}>
      <div style={{ width: '60%', height: '80%', flexShrink: 0 }}>
        {game && <Game />}
      </div>
      <div style={{ flexGrow: 1, padding: '1em' }}>
        <h3>Serverinfo: (Please prefer IPv6! As IPv4 may change)</h3>
        <ul>
          {serverInfoList.map(({ host, port }) => (
            <li key={`${host}:${port}`}>TCP: {`${host}:${port}`}</li>
          ))}
        </ul>
        <hr style={{ margin: '1em 0' }} />
        {lastWinners.length > 0 && (
          <>
            <b>Last winners:</b> {lastWinners.join(', ')}
            <hr style={{ margin: '1em 0' }} />
          </>
        )}
        <h3 style={{ marginBottom: '.5em' }}>Scoreboard (Last 2 Hours)</h3>
        <Scoreboard />
      </div>
    </div>

  )
}
