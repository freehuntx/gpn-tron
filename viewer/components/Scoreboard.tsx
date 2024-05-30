import React, { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Legend
} from 'recharts'
import { getColorByString } from '@gpn-tron/shared/constants/colors'
import gameService from '../services/GameService'

export function Scoreboard() {
  const [chartData, setChartData] = useState<ChartData>([])
  const [scoreboard, setScoreboard] = useState<Scoreboard>([])

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

  return (
    <div style={{ display: 'flex' }}>
      <table style={{ width: '100%', textAlign: 'left' }}>
        <thead>
          <tr>
            <th></th>
            <th>Username</th>
            <th>Win Ratio</th>
            <th>ELO</th>
            <th>Wins</th>
            <th>Loses</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: '1em' }}></tr>
          {scoreboard.map(({ username, winRatio, wins, loses, elo }, index) => (
            <tr key={username}>
              <td>{index + 1}.</td>
              <td>{username}</td>
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
      <LineChart
        width={500}
        height={300}
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5
        }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Legend />
        {Object.values(lines).map(({ key, stroke }) => (
          <Line key={key} dot={false} dataKey={key} stroke={stroke} />
        ))}
      </LineChart>
    </div>
  )
}