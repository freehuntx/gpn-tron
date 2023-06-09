import React, { useEffect, useState, useRef } from "react"
import { getColor } from "@gpn-tron/shared/constants/colors"
import { useGame } from "../providers/Game"

const wallSize = 1
const floorSize = 16
const roomSize = floorSize + wallSize

const drawPlayerLine = (context: CanvasRenderingContext2D, playerRadius: number, color: string, from: Vec2, to: Vec2) => {
  context.strokeStyle = color
  context.lineWidth = playerRadius * 2
  context.beginPath()
  context.moveTo(from.x, from.y)
  context.lineTo(to.x, to.y)
  context.stroke()
}

export function Game() {
  const { game } = useGame()
  const [offScreenCanvas] = useState<HTMLCanvasElement>(document.createElement('canvas'))
  const [offScreenContext] = useState<CanvasRenderingContext2D>(offScreenCanvas.getContext('2d') as CanvasRenderingContext2D)
  const [canvas, setCanvas] = useState<HTMLCanvasElement>()
  const [canvasContext, setCanvasContext] = useState<CanvasRenderingContext2D>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) {
      setCanvasContext(undefined)
      setCanvas(undefined)
      return
    }

    const newCanvas = canvasRef.current
    setCanvas(newCanvas)

    const newContext = canvasRef.current.getContext('2d')
    if (newContext) setCanvasContext(newContext)
  }, [canvasRef.current])

  useEffect(() => {
    if (!canvas || !offScreenContext || !canvasContext || !game) return

    const tickInterval = setInterval(() => {
      if (!canvas.parentElement) return

      // Calculate canvas size
      const canvasPixelSize = Math.min(
        canvas.parentElement.clientHeight,
        canvas.parentElement.clientWidth
      )

      offScreenCanvas.width = canvasPixelSize
      offScreenCanvas.height = canvasPixelSize

      // Calculate view
      const view = (() => {
        //let lowestX = 0, lowestY = 0
        //let highestX = 0, highestY = 0

        // Get size info by walls
        //for (const { pos: { x, y } } of Object.values(game.walls)) {
        //  lowestX = Math.min(lowestX, x)
        //  lowestY = Math.min(lowestY, y)
        //  highestX = Math.max(highestX, x)
        //  highestY = Math.max(highestY, y)
        //}

        // Increase by one  to get the proper width/height
        //highestX++
        //highestY++

        //const width = Math.abs(highestX - lowestX)
        //const height = Math.abs(highestY - lowestY)
        const size = Math.max(game.width, game.height)
        const pixelSize = size * roomSize
        const factor = canvasPixelSize / pixelSize

        return {
          //width, height, size,
          x: 0,
          y: 0,
          //pixelSize,
          factor
        }
      })()

      const factoredRoomSize = roomSize * view.factor
      const factoredWallSize = wallSize * view.factor
      const factoredHalfWallSize = factoredWallSize / 2
      const factoredHalfRoomSize = factoredRoomSize / 2
      const factoredFloorSize = floorSize * view.factor
      const playerRadius = factoredFloorSize * 0.4

      // Clear frame
      offScreenContext.fillStyle = '#090a35'
      offScreenContext.clearRect(0, 0, canvas.width, canvas.height)
      offScreenContext.fillRect(0, 0, canvas.width, canvas.height)

      // Render walls
      offScreenContext.strokeStyle = 'white'
      offScreenContext.lineWidth = 1
      for (let x = 0; x < game.width; x++) {
        let tmpX = x - view.x
        tmpX *= factoredRoomSize

        offScreenContext.beginPath()
        offScreenContext.moveTo(tmpX, 0)
        offScreenContext.lineTo(tmpX, canvas.height)
        offScreenContext.stroke()

        for (let y = 0; y < game.height; y++) {
          let tmpY = y - view.y
          tmpY *= factoredRoomSize

          offScreenContext.beginPath()
          offScreenContext.moveTo(0, tmpY)
          offScreenContext.lineTo(canvas.width, tmpY)
          offScreenContext.stroke()

          //let tmpX = x - view.x
          //let tmpY = y - view.y
          //tmpX *= factoredRoomSize
          //tmpY *= factoredRoomSize

          //offScreenContext.strokeStyle = 'white'
          //offScreenContext.strokeRect(tmpX, tmpY, factoredRoomSize, factoredRoomSize)

          //const clearX = tmpX + factoredHalfWallSize
          //const clearY = tmpY + factoredHalfWallSize
          //offScreenContext.fillStyle = "white"
          //offScreenContext.fillRect(tmpX - factoredHalfWallSize, tmpY - factoredHalfWallSize, factoredRoomSize + factoredWallSize, factoredRoomSize + factoredWallSize)
          //offScreenContext.clearRect(clearX, clearY, factoredFloorSize, factoredFloorSize)
        }
      }
      /*for (let x = 0; x < game.width; x++) {
        for (let y = 0; y < game.height; y++) {
          const fieldPlayerIndex = game.fields[x][y]
          const fieldPlayer = game.players[fieldPlayerIndex]
          if (!fieldPlayer) continue

          const playerColor = getColor(fieldPlayerIndex)

          let tmpX = x - view.x
          let tmpY = y - view.y
          tmpX *= factoredRoomSize
          tmpY *= factoredRoomSize
          const clearX = tmpX + factoredHalfWallSize
          const clearY = tmpY + factoredHalfWallSize
          offScreenContext.fillStyle = playerColor
          offScreenContext.fillRect(clearX, clearY, factoredFloorSize, factoredFloorSize)
        }
      }*/

      // Render player path and head
      for (let i = 0; i < game.players.length; i++) {
        let { alive, pos: { x, y }, moves } = game.players[i]
        if (!alive) continue

        x *= factoredRoomSize
        y *= factoredRoomSize
        x += factoredHalfRoomSize
        y += factoredHalfRoomSize

        const playerColor = getColor(i)
        // Render paths
        for (let moveIndex = 0; moveIndex < moves.length; moveIndex++) {
          if (moveIndex === 0) continue
          const prevPos = moves[moveIndex - 1]
          const pos = moves[moveIndex]

          let prevX = prevPos.x
          let prevY = prevPos.y
          let posX = pos.x
          let posY = pos.y

          if (prevPos.x === 0 && pos.x === game.width - 1) {
            prevX = 0
            posX = -1
            drawPlayerLine(offScreenContext, playerRadius, playerColor, {
              x: game.width * factoredRoomSize + factoredRoomSize / 2,
              y: pos.y * factoredRoomSize + factoredRoomSize / 2
            }, {
              x: (game.width-1) * factoredRoomSize + factoredRoomSize / 2,
              y: pos.y * factoredRoomSize + factoredRoomSize / 2
            })
          }
          if (prevPos.x === game.width - 1 && pos.x === 0) {
            prevX = game.width - 1
            posX = game.width
            drawPlayerLine(offScreenContext, playerRadius, playerColor, {
              x: -1 * factoredRoomSize + factoredRoomSize / 2,
              y: pos.y * factoredRoomSize + factoredRoomSize / 2
            }, {
              x: 0 * factoredRoomSize + factoredRoomSize / 2,
              y: pos.y * factoredRoomSize + factoredRoomSize / 2
            })
          }
          if (prevPos.y === 0 && pos.y === game.height - 1) {
            prevY = 0
            posY = -1
            drawPlayerLine(offScreenContext, playerRadius, playerColor, {
              x: pos.x * factoredRoomSize + factoredRoomSize / 2,
              y: game.height * factoredRoomSize + factoredRoomSize / 2
            }, {
              x: pos.x * factoredRoomSize + factoredRoomSize / 2,
              y: (game.height-1) * factoredRoomSize + factoredRoomSize / 2
            })
          }
          if (prevPos.y === game.height - 1 && pos.y === 0) {
            prevY = game.height - 1
            posY = game.height
            drawPlayerLine(offScreenContext, playerRadius, playerColor, {
              x: pos.x * factoredRoomSize + factoredRoomSize / 2,
              y: -1 * factoredRoomSize + factoredRoomSize / 2
            }, {
              x: pos.x * factoredRoomSize + factoredRoomSize / 2,
              y: 0 * factoredRoomSize + factoredRoomSize / 2
            })
          }

          const fromX = prevX * factoredRoomSize + factoredRoomSize / 2
          const fromY = prevY * factoredRoomSize + factoredRoomSize / 2
          const toX = posX * factoredRoomSize + factoredRoomSize / 2
          const toY = posY * factoredRoomSize + factoredRoomSize / 2

          // Draw start head
          offScreenContext.fillStyle = playerColor
          offScreenContext.beginPath()
          offScreenContext.arc(x, y, playerRadius, 0, 2 * Math.PI, false);
          offScreenContext.fill()

          // Draw player line
          drawPlayerLine(offScreenContext, playerRadius, playerColor, { x: fromX, y: fromY }, { x: toX, y: toY })

          // Draw corners
          offScreenContext.beginPath()
          offScreenContext.arc(fromX, fromY, playerRadius, 0, 2 * Math.PI, false);
          offScreenContext.fill()
        }

        // Draw head
        offScreenContext.fillStyle = playerColor
        offScreenContext.beginPath()
        offScreenContext.arc(x, y, playerRadius, 0, 2 * Math.PI, false);
        offScreenContext.fill()
      }

      // Render names
      for (let i = 0; i < game.players.length; i++) {
        let { alive, name, pos: { x, y } } = game.players[i]
        if (!alive) continue

        const playerColor = getColor(i)
        x *= factoredRoomSize
        y *= factoredRoomSize
        x += factoredHalfRoomSize
        y += factoredHalfRoomSize

        const textHeight = 18

        offScreenContext.font = `bold ${textHeight}px serif`
        const nameMetrics = offScreenContext.measureText(name)

        const nameX = x - nameMetrics.width / 2 - 10
        const nameY = y - textHeight * 3 - 5

        // Draw name box
        offScreenContext.fillStyle = playerColor
        offScreenContext.strokeStyle = 'black'
        offScreenContext.lineWidth = 2
        offScreenContext.beginPath()
        offScreenContext.rect(nameX, nameY, nameMetrics.width + 10, textHeight + 10)
        offScreenContext.fill()
        offScreenContext.stroke()

        // Draw player name
        offScreenContext.textBaseline = 'top'
        offScreenContext.fillStyle = 'black'
        offScreenContext.fillText(name, nameX + 5, nameY + 5)
      }

      // Render chat
      for (const player of game.players) {
        let { alive, pos: { x, y }, moves, chat } = player
        if (!alive || !chat) continue

        x *= factoredRoomSize
        y *= factoredRoomSize
        x += factoredHalfRoomSize
        y += factoredHalfRoomSize
        offScreenContext.fillStyle = 'white'
        offScreenContext.fillRect(x - 10, y + factoredRoomSize - 20, offScreenContext.measureText(chat).width + 20, 40)
        offScreenContext.fillStyle = 'black'
        offScreenContext.fillText(chat, x, y + factoredRoomSize)
      }

      // Now push the rendering to real canvas
      canvas.width = offScreenCanvas.width
      canvas.height = offScreenCanvas.height
      canvasContext.drawImage(offScreenCanvas, 0, 0)
    }, 1000 / 30)

    return () => {
      clearInterval(tickInterval)
    }
  }, [offScreenContext, canvasContext, game])

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ margin: 'auto' }}></canvas>
    </div>
  )
}