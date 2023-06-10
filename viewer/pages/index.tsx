import { useEffect, useState } from 'react'
import { getColor } from '@gpn-tron/shared/constants/colors'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer
} from 'recharts'
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
  const [scoreboard, setScoreboard] = useState<Scoreboard>([])
  const [chartData, setChartData] = useState<ChartData>([])
  
  const lines: Record<string, any> = {};
  chartData.forEach((point) => {
    Object.keys(point).sort().forEach((key, index) => {
      if (key === "name") return;
      lines[key] = {
        key,
        stroke: getColor(index)
      };
    });
  });

  useEffect(() => {
    const onUpdate = () => {
      setChartData(gameService.chartData)
      setScoreboard(gameService.scoreboard)
    }
    gameService.on('update', onUpdate)

    return () => {
      gameService.off('update', onUpdate)
    }
  }, [])

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
      <div style={{ height: '100%', width: '100%', position: 'relative' }}>
        {/* Infobox */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0,
          width: 'calc(100%/4)', height: 'calc(100%/4)',
          overflow: 'hidden'
        }}>
          <h1>GPN Tron</h1>
          Connect via TCP and join the fun :)
          <br />
          You can also watch the current game via the viewer port.
        </div>
        {/* ConnectionInfo */}
        <div style={{
          position: 'absolute',
          top: 'calc(100%/4)', left: 0,
          width: 'calc(100%/4)', height: 'calc(100%/4)',
          overflow: 'hidden'
        }}>
          <h3>Ports:</h3>
          <ul>
            <li>- 3000 [HTTP] (View server)</li>
            <li>- {serverInfoList[0]?.port || 4000} [TCP] (Game server)</li>
          </ul>
          <h3>Hostnames:</h3>
          <ul>
            {serverInfoList.map(({ host, port }) => (
              <li key={host}>- {host}</li>
            ))}
          </ul>
        </div>
        {/* Scoreboard */}
        <div style={{
          position: 'absolute',
          top: 'calc(100%/4*2)', left: 0,
          width: 'calc(100%/4)', height: 'calc(100% / 2)',
          padding: '.5rem',
          overflow: 'hidden'
        }}>
          <h3 style={{ marginBottom: '.5em' }}>Scoreboard (Last 2 Hours)</h3>
          <table style={{ width: '100%', textAlign: 'left', lineHeight: '.8rem' }}>
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>WR</th>
                <th>ELO</th>
                <th>Wins</th>
                <th>Losses</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: '1em' }}></tr>
              {scoreboard.map(({ username, winRatio, wins, loses, elo }, index) => (
                <tr key={username}>
                  <td>{index + 1}.</td>
                  <td>{username} {lastWinners.indexOf(username) !== -1 && '🎉'}</td>
                  <td>{winRatio.toFixed(2)}</td>
                  <td>{elo.toFixed(0)}</td>
                  <td>{wins}</td>
                  <td>{loses}</td>
                </tr>
              ))}
              {scoreboard.length === 0 && (
                <tr>
                  <td colSpan={4}>Nobody scored yet :(</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Chart */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          top: 'calc(100%/4*3)', left: 0,
          width: 'calc(100%/4)', height: 'calc(100% / 4)',
          fontSize: '.8rem',
          padding: '.5rem',
          overflow: 'hidden'
        }}>
          <ResponsiveContainer>
            <LineChart data={chartData} >
              <XAxis dataKey="name" />
              <YAxis />
              <Legend />
              {Object.values(lines).map(({ key, stroke }) => (
                <Line key={key} dot={false} dataKey={key} stroke={stroke} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/*Game*/}
        <div style={{
          position: 'absolute',
          top: 0, left: 'calc(100%/4*2)',
          width: 'calc(100%/2)', height: '100%',
          fontSize: '.8rem',
          padding: '.5rem',
          overflow: 'hidden'
        }}>
          <Game />
        </div>
      </div>


      {/*<div style={{ display: 'flex', height: '100%', width: '100%' }}>
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
          <h2>
            Wanna share your bot code? Upload to Github with #gpn-tron
          </h2>
        </div>
        </div>*/}
    </>
  )
}
