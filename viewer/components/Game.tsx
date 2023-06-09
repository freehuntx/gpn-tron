import React, { useEffect, useState, useRef } from "react"
import { GameRenderer } from "../classes/GameRenderer"

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const renderer = new GameRenderer(canvas)

    const tickInterval = setInterval(() => {
      if (!canvas.parentElement) return
      renderer.render()
    }, 1000 / 30)

    return () => {
      clearInterval(tickInterval)
    }
  }, [canvasRef.current])

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ margin: 'auto' }}></canvas>
    </div>
  )
}