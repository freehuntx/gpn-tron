import React, { useEffect, useState, useRef } from "react"
import { getColor } from "@gpn-tron/shared/constants/colors"
import { useGame } from "../providers/Game"

const wallSize = 1
const floorSize = 16
const roomSize = floorSize + wallSize

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

      // Clear frame
      offScreenContext.fillStyle = 'black'
      offScreenContext.fillRect(0, 0, canvas.width, canvas.height)

      // Render walls
      for (let x = 0; x < game.width; x++) {
        for (let y = 0; y < game.height; y++) {
          let tmpX = x - view.x
          let tmpY = y - view.y
          tmpX *= factoredRoomSize
          tmpY *= factoredRoomSize

          const clearX = tmpX + factoredHalfWallSize
          const clearY = tmpY + factoredHalfWallSize
          offScreenContext.fillStyle = "white"
          offScreenContext.fillRect(tmpX - factoredHalfWallSize, tmpY - factoredHalfWallSize, factoredRoomSize + factoredWallSize, factoredRoomSize + factoredWallSize)
          offScreenContext.clearRect(clearX, clearY, factoredFloorSize, factoredFloorSize)
        }
      }

      // Render paths
      for (let x = 0; x < game.width; x++) {
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
      }

      // Render players
      for (let i = 0; i < game.players.length; i++) {
        let { alive, name, pos: { x, y }, chat } = game.players[i]
        if (!alive) continue

        const playerColor = getColor(i)
        x -= view.x
        y - view.y
        x *= factoredRoomSize
        y *= factoredRoomSize
        x += factoredHalfRoomSize
        y += factoredHalfRoomSize

        const playerRadius = factoredFloorSize * 0.4
        const textHeight = 18

        offScreenContext.font = `bold ${textHeight}px serif`
        const nameMetrics = offScreenContext.measureText(name)

        const nameX = x - nameMetrics.width / 2 - 10
        const nameY = y - textHeight * 3 - 5

        // Draw player circle
        offScreenContext.fillStyle = playerColor
        offScreenContext.beginPath()
        offScreenContext.arc(x, y, playerRadius, 0, 2 * Math.PI, false);
        offScreenContext.fill()

        // Draw player outer circle
        offScreenContext.fillStyle = 'black'
        offScreenContext.beginPath()
        offScreenContext.arc(x, y, playerRadius, 0, 2 * Math.PI, false);
        offScreenContext.stroke()

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

        if (chat) {
          offScreenContext.fillStyle = 'white'
          offScreenContext.fillRect(x - 10, y + factoredRoomSize - 20, offScreenContext.measureText(chat).width + 20, 40)
          offScreenContext.fillStyle = 'black'
          offScreenContext.fillText(chat, x, y + factoredRoomSize)
        }
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
      <div style={{
        position: 'absolute',
        zIndex: 0,
        top: canvasRef.current ? canvasRef.current.offsetTop + 'px' : 0,
        left: canvasRef.current ? canvasRef.current.offsetLeft + 'px' : 0,
        width: canvasRef.current ? canvasRef.current.width + 'px' : 0,
        height: canvasRef.current ? canvasRef.current.height + 'px' : 0,
        opacity: 0.5,
        backgroundSize: 'cover',
        backgroundImage: `url(https://thiscatdoesnotexist.com/?rand=${game?.id})`
      }}>
      </div>
      <canvas ref={canvasRef} style={{
        margin: 'auto',
        zIndex: 1,
      }}></canvas>
    </div>
  )
}