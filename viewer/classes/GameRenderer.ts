import { getColor } from "@gpn-tron/shared/constants/colors"
import gameService from '../services/GameService'

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

export class GameRenderer {
  #canvas: HTMLCanvasElement
  #context: CanvasRenderingContext2D
  #offScreenCanvas = document.createElement('canvas')
  #offScreenContext = this.#offScreenCanvas.getContext('2d')
  #canvasPixelSize: number
  #viewFactor: number

  get factoredRoomSize() {
    return roomSize * this.#viewFactor
  }
  get factoredWallSize() {
    return wallSize * this.#viewFactor
  }
  get factoredHalfWallSize() {
    return this.factoredWallSize / 2
  }
  get factoredHalfRoomSize() {
    return this.factoredRoomSize / 2
  }
  get factoredFloorSize() {
    return floorSize * this.#viewFactor
  }
  get playerRadius() {
    return this.factoredFloorSize * 0.4
  }

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas
    this.#context = canvas.getContext('2d')
  }
  
  #updateCanvasSize() {
    this.#canvasPixelSize = Math.min(
      this.#canvas.parentElement.clientHeight,
      this.#canvas.parentElement.clientWidth
    )
    this.#offScreenCanvas.width = this.#canvasPixelSize
    this.#offScreenCanvas.height = this.#canvasPixelSize
  }

  #updateViewFactor() {
    const size = Math.max(gameService.game.width, gameService.game.height)
    const pixelSize = size * roomSize
    this.#viewFactor = this.#canvasPixelSize / pixelSize
  }

  #renderWalls() {
    // Render walls
    this.#offScreenContext.strokeStyle = 'white'
    this.#offScreenContext.lineWidth = 1
    for (let x = 0; x < gameService.game.width; x++) {
      const tmpX = x * this.factoredRoomSize

      this.#offScreenContext.beginPath()
      this.#offScreenContext.moveTo(tmpX, 0)
      this.#offScreenContext.lineTo(tmpX, this.#canvas.height)
      this.#offScreenContext.stroke()

      for (let y = 0; y < gameService.game.height; y++) {
        const tmpY = y * this.factoredRoomSize

        this.#offScreenContext.beginPath()
        this.#offScreenContext.moveTo(0, tmpY)
        this.#offScreenContext.lineTo(this.#canvas.width, tmpY)
        this.#offScreenContext.stroke()
      }
    }
  }

  #renderPlayers() {
    const { game } = gameService
    if (!game) return
    
    for (const player of game.players) {
      let { id, alive, name, pos: { x, y }, moves, chat } = player
      if (!alive) continue

      const playerColor = getColor(id)
      x *= this.factoredRoomSize
      y *= this.factoredRoomSize
      x += this.factoredHalfRoomSize
      y += this.factoredHalfRoomSize

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
          drawPlayerLine(this.#offScreenContext, this.playerRadius, playerColor, {
            x: game.width * this.factoredRoomSize + this.factoredRoomSize / 2,
            y: pos.y * this.factoredRoomSize + this.factoredRoomSize / 2
          }, {
            x: (game.width-1) * this.factoredRoomSize + this.factoredRoomSize / 2,
            y: pos.y * this.factoredRoomSize + this.factoredRoomSize / 2
          })
        }
        if (prevPos.x === game.width - 1 && pos.x === 0) {
          prevX = game.width - 1
          posX = game.width
          drawPlayerLine(this.#offScreenContext, this.playerRadius, playerColor, {
            x: -1 * this.factoredRoomSize + this.factoredRoomSize / 2,
            y: pos.y * this.factoredRoomSize + this.factoredRoomSize / 2
          }, {
            x: 0 * this.factoredRoomSize + this.factoredRoomSize / 2,
            y: pos.y * this.factoredRoomSize + this.factoredRoomSize / 2
          })
        }
        if (prevPos.y === 0 && pos.y === game.height - 1) {
          prevY = 0
          posY = -1
          drawPlayerLine(this.#offScreenContext, this.playerRadius, playerColor, {
            x: pos.x * this.factoredRoomSize + this.factoredRoomSize / 2,
            y: game.height * this.factoredRoomSize + this.factoredRoomSize / 2
          }, {
            x: pos.x * this.factoredRoomSize + this.factoredRoomSize / 2,
            y: (game.height-1) * this.factoredRoomSize + this.factoredRoomSize / 2
          })
        }
        if (prevPos.y === game.height - 1 && pos.y === 0) {
          prevY = game.height - 1
          posY = game.height
          drawPlayerLine(this.#offScreenContext, this.playerRadius, playerColor, {
            x: pos.x * this.factoredRoomSize + this.factoredRoomSize / 2,
            y: -1 * this.factoredRoomSize + this.factoredRoomSize / 2
          }, {
            x: pos.x * this.factoredRoomSize + this.factoredRoomSize / 2,
            y: 0 * this.factoredRoomSize + this.factoredRoomSize / 2
          })
        }

        const fromX = prevX * this.factoredRoomSize + this.factoredRoomSize / 2
        const fromY = prevY * this.factoredRoomSize + this.factoredRoomSize / 2
        const toX = posX * this.factoredRoomSize + this.factoredRoomSize / 2
        const toY = posY * this.factoredRoomSize + this.factoredRoomSize / 2

        // Draw start head
        this.#offScreenContext.fillStyle = playerColor
        this.#offScreenContext.beginPath()
        this.#offScreenContext.arc(x, y, this.playerRadius, 0, 2 * Math.PI, false);
        this.#offScreenContext.fill()

        // Draw player line
        drawPlayerLine(this.#offScreenContext, this.playerRadius, playerColor, { x: fromX, y: fromY }, { x: toX, y: toY })

        // Draw corners
        this.#offScreenContext.beginPath()
        this.#offScreenContext.arc(fromX, fromY, this.playerRadius, 0, 2 * Math.PI, false);
        this.#offScreenContext.fill()
      }

      // Draw head
      this.#offScreenContext.fillStyle = playerColor
      this.#offScreenContext.beginPath()
      this.#offScreenContext.arc(x, y, this.playerRadius, 0, 2 * Math.PI, false);
      this.#offScreenContext.fill()
    }
  }

  #renderNames() {
    const { game } = gameService
    if (!game) return

    for (const player of game.players) {
      let { id, alive, name, pos: { x, y } } = player
      if (!alive) continue

      const playerColor = getColor(id)
      x *= this.factoredRoomSize
      y *= this.factoredRoomSize
      x += this.factoredHalfRoomSize
      y += this.factoredHalfRoomSize

      const textHeight = 18

      this.#offScreenContext.font = `bold ${textHeight}px serif`
      const nameMetrics = this.#offScreenContext.measureText(name)

      const nameX = x - nameMetrics.width / 2 - 10
      const nameY = y - textHeight * 3 - 5

      // Draw name box
      this.#offScreenContext.fillStyle = playerColor
      this.#offScreenContext.strokeStyle = 'white'
      this.#offScreenContext.lineWidth = 2
      this.#offScreenContext.beginPath()
      this.#offScreenContext.rect(nameX, nameY, nameMetrics.width + 10, textHeight + 10)
      this.#offScreenContext.fill()
      this.#offScreenContext.stroke()

      // Draw player name
      this.#offScreenContext.textBaseline = 'top'
      this.#offScreenContext.fillStyle = 'white'
      this.#offScreenContext.fillText(name, nameX + 5, nameY + 5)
    }
  }

  #renderChat() {
    const { game } = gameService
    if (!game) return

    for (const player of game.players) {
      let { alive, pos: { x, y }, moves, chat } = player
      if (!alive || !chat) continue

      x *= this.factoredRoomSize
      y *= this.factoredRoomSize
      x += this.factoredHalfRoomSize
      y += this.factoredHalfRoomSize
      this.#offScreenContext.fillStyle = 'white'
      this.#offScreenContext.fillRect(x - 10, y + this.factoredRoomSize - 20, this.#offScreenContext.measureText(chat).width + 20, 40)
      this.#offScreenContext.fillStyle = 'black'
      this.#offScreenContext.fillText(chat, x, y + this.factoredRoomSize)
    }
  }

  render() {
    if (!this.#canvas || !this.#canvas.parentElement || !gameService.game) return

    this.#updateCanvasSize()
    this.#updateViewFactor()

    // Clear frame
    this.#offScreenContext.fillStyle = '#090a35'
    this.#offScreenContext.clearRect(0, 0, this.#canvas.width, this.#canvas.height)
    this.#offScreenContext.fillRect(0, 0, this.#canvas.width, this.#canvas.height)

    this.#renderWalls()
    this.#renderPlayers()
    this.#renderNames()
    this.#renderChat()

    // Now push the rendering to real canvas
    this.#canvas.width = this.#offScreenCanvas.width
    this.#canvas.height = this.#offScreenCanvas.height
    this.#context.drawImage(this.#offScreenCanvas, 0, 0)
  }
}
