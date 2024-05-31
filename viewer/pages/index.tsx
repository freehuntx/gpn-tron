import { useEffect, useState } from 'react'
import { getColorByString } from '@gpn-tron/shared/constants/colors'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer
} from 'recharts'
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
  const [chatMessages, setChatMessages] = useState<{ date: number; from: string; message: string }[]>([])
  
  const lines: Record<string, any> = {};
  chartData.forEach((point) => {
    Object.keys(point).sort().forEach((key, index) => {
      if (key === "name") return;
      lines[key] = {
        key,
        stroke: getColorByString(key)
      };
    });
  });

  useEffect(() => {
    const playersLastMessages = {}
    let tmpChatMessages: { date: number; from: string; message: string }[] = []

    const onUpdate = () => {
      setChartData(gameService.chartData)
      setScoreboard(gameService.scoreboard)

      for (const player of gameService.game?.players || []) {
        if (!player.chat) {
          playersLastMessages[player.name] = undefined
          continue
        }
        if (playersLastMessages[player.name] === player.chat) continue
        playersLastMessages[player.name] = player.chat
        tmpChatMessages.push({ date: Date.now(), from: player.name, message: player.chat })
        tmpChatMessages = tmpChatMessages.slice(-30)
      }
      setChatMessages(tmpChatMessages)
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
          <br />
          <br />
          <b>Wanna share your bot code? Upload to Github with #gpn-tron</b>
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
                  <td style={{color: getColorByString(username)}}>{username} {lastWinners.indexOf(username) !== -1 && '🎉'}</td>
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
        {/* Chart */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          top: 'calc(100%/4*2)', left: 'calc(100%/4)',
          width: 'calc(100%/4)', height: 'calc(100% / 4 * 2)',
          fontSize: '.8rem',
          padding: '.5rem',
          overflow: 'hidden'
        }}>
          <h2>Chat</h2>
          <div style={{
            flexGrow: 1
          }}>
            {[...chatMessages].reverse().map(({ date, from, message }) => (
              <div style={{ margin: '.5rem' }}>
                <b>{from} ({new Date(date).toISOString().replace(/^(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+).*$/, '$3.$2.$1 - $4:$5:$6')})</b>
                <br />{message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
