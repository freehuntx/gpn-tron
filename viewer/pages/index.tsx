import { useEffect, useState } from 'react'
import { useGame } from '../providers/Game'
import { Scoreboard } from '../components/Scoreboard'
import { Game } from '../components/Game'

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
      {/* No Drake */}
      <img
        src="https://i.ibb.co/GRKrvvL/5ee7713799588c0004aa6848.png"
        ref={ref => {
          if (!ref) return
          ref.style.left = `calc(100% / 4 - ${ref.width}px)`
        }}
        style={{
          zIndex: 999,
          position: 'absolute',
          top: 'calc(100%/4)',
          height: 'calc(100%/4)',
        }}
      />
      {/* Yes Drake */}
      <img
        src="https://i.ibb.co/vkQqdv9/5ee771dc99588c0004aa6849.png"
        ref={ref => {
          if (!ref) return
          ref.style.left = `calc(100% / 2 - ${ref.width}px)`
        }}
        style={{
          zIndex: 999,
          position: 'absolute',
          top: '0',
          left: 'calc(100%/4*2)',
          height: 'calc(100%/4)',
        }}
      />
    </>
  )
}

export default function Home() {
  const [active, setActive] = useState(false)
  const { serverInfoList, lastWinners, game } = useGame()

  useEffect(() => {
    // Do this to prevent SSR
    setActive(true)
  }, [])

  if (!active || !game) return null
  return (
    <>
      <BrokenScreenFun />
      <div style={{ display: 'flex', height: '100%', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, width: '100%' }}>
          <div style={{ flexGrow: 1, height: '100%' }}>
            <h3>Serverinfo: (Please prefer IPv6! As IPv4 may change)</h3>
            <ul>
              {serverInfoList.map(({ host, port }) => (
                <li key={`${host}:${port}`}>TCP: {`${host}:${port}`}</li>
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
          </div>
        </div>
        <div style={{ flexGrow: 1, width: '100%' }}>
          {game && <Game />}
        </div>
      </div>
    </>
  )
}
