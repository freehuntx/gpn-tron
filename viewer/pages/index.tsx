import { useEffect, useState } from 'react'
import { Scoreboard } from '../components/Scoreboard'
import { Game } from '../components/Game'
import gameService from '../services/GameService'

// Just a fun component to work around a broken screen on the GPN
function BrokenScreenFun() {
  return (
    <>
      {/* Broken screen placeholder */}
      <div
        style={{
          zIndex: 999,
          position: 'absolute',
          background: 'gray',
          top: 'calc(100%/4)',
          left: 'calc(100%/4)',
          width: 'calc(100%/4)',
          height: 'calc(100%/4)'
        }}
      ></div>
      <img
        src="https://i.ibb.co/QJxSCNk/a.jpg"
        style={{
          zIndex: 999,
          position: 'absolute',
          top: 0,
          left: 'calc(100%/4)',
          width: 'calc(100%/4)',
          height: 'calc(100%/4)'
        }}
      />
    </>
  )
}

export default function Home() {
  const [active, setActive] = useState(false)
  const [serverInfoList, setServerInfoList] = useState<ServerInfoList>([])
  const [lastWinners, setLastWinners] = useState<LastWinners>([])

  useEffect(() => {
    // Do this to prevent SSR
    setActive(true)

    gameService.on('update', () => {
      setServerInfoList(gameService.serverInfoList)
      setLastWinners(gameService.lastWinners)
    })
  }, [])

  if (!active || !gameService.game) return null
  return (
    <>
      <BrokenScreenFun />
      <div style={{ display: 'flex', height: '100%', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, width: '100%' }}>
          <div style={{ flexGrow: 1, height: '100%' }}>
            <h1>!!!Development state!!!</h1>
            <h3>Ports:</h3>
            <ul>
              <li>- 3000 [HTTP] (View server)</li>
              <li>- {serverInfoList[0]?.port || 4000} [TCP] (Game server)</li>
            </ul>
            <h3>Hostnames:</h3>
            <h5>(Please prefer IPv6! As IPv4 may change)</h5>
            <ul>
              {serverInfoList.map(({ host, port }) => (
                <li key={host}>- {host}</li>
              ))}
            </ul>
          </div>
          <div style={{ flexGrow: 1, height: '100%' }}>
            <h3 style={{ marginBottom: '.5em' }}>Scoreboard (Last 2 Hours)</h3>
            {lastWinners.length > 0 && (
              <>
                <b>Last winners:</b> {lastWinners.join(', ')}
                <hr style={{ margin: '1em 0' }} />
              </>
            )}
            <Scoreboard />
            <h2>
              Wanna share your bot code? Upload to Github with #gpn-tron
            </h2>
          </div>
        </div>
        <div style={{ flexGrow: 1, width: '100%' }}>
          <Game />
        </div>
      </div>
    </>
  )
}
