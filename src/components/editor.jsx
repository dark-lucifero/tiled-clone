"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Layers, Save, Undo, Redo, MousePointer, Pencil, Eraser } from "lucide-react"

export default function TileMapEditor() {
  const [mapConfig, setMapConfig] = useState({
    width: 20,
    height: 20,
    tileSize: 32,
  })
  const [newMapConfig, setNewMapConfig] = useState({
    width: 20,
    height: 20,
    tileSize: 32,
  })
  const [tileset, setTileset] = useState({
    image: null,
    tileSize: 32,
    columns: 0,
    rows: 0,
  })
  const [layers, setLayers] = useState([{ id: "layer-1", name: "Layer 1", visible: true, tiles: [] }])
  const [selectedLayer, setSelectedLayer] = useState("layer-1")
  const [selectedTile, setSelectedTile] = useState(null)
  const [selectedMapTile, setSelectedMapTile] = useState(null)
  const [tool, setTool] = useState("place")
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTiles, setSelectedTiles] = useState([])
  const [selectionStart, setSelectionStart] = useState(null)
  const [isShiftPressed, setIsShiftPressed] = useState(false)

  const canvasRef = useRef(null)
  const tilesetCanvasRef = useRef(null)
  const isDrawing = useRef(false)

  useEffect(() => {
    drawMap()
  }, [mapConfig, layers])

  useEffect(() => {
    if (tileset.image) {
      drawTileset()
    }
  }, [tileset])

  const handleKeyDown = (e) => {
    if (e.key === "Shift") {
      setIsShiftPressed(true)
    } else if (e.key === "Delete" || e.key === "Backspace") {
      deleteSelectedTiles()
    }
  }

  const handleKeyUp = (e) => {
    if (e.key === "Shift") {
      setIsShiftPressed(false)
    }
  }

  const deleteSelectedTiles = () => {
    if (selectedTiles.length === 0) return

    const deletedTilesByLayer = {}

    setLayers(
      layers.map((layer) => {
        const deletedTiles = layer.tiles.filter((tile) =>
          selectedTiles.some((selected) => selected.x === tile.x && selected.y === tile.y),
        )

        if (deletedTiles.length > 0) {
          deletedTilesByLayer[layer.id] = deletedTiles
        }

        return {
          ...layer,
          tiles: layer.tiles.filter(
            (tile) => !selectedTiles.some((selected) => selected.x === tile.x && selected.y === tile.y),
          ),
        }
      }),
    )

    // Add deletion to history for each layer
    Object.entries(deletedTilesByLayer).forEach(([layerId, tiles]) => {
      addToHistory({
        type: "delete",
        layerId,
        tiles,
      })
    })

    setSelectedTiles([])
  }

  const drawMap = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = mapConfig.width * mapConfig.tileSize
    canvas.height = mapConfig.height * mapConfig.tileSize

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = "#ccc"
    ctx.lineWidth = 1
    for (let x = 0; x <= mapConfig.width; x++) {
      ctx.beginPath()
      ctx.moveTo(x * mapConfig.tileSize, 0)
      ctx.lineTo(x * mapConfig.tileSize, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y <= mapConfig.height; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * mapConfig.tileSize)
      ctx.lineTo(canvas.width, y * mapConfig.tileSize)
      ctx.stroke()
    }

    // Draw tiles
    if (tileset.image) {
      layers.forEach((layer) => {
        if (layer.visible) {
          layer.tiles.forEach((tile) => {
            ctx.drawImage(
              tileset.image,
              tile.tileX * tileset.tileSize,
              tile.tileY * tileset.tileSize,
              tileset.tileSize,
              tileset.tileSize,
              tile.x * mapConfig.tileSize,
              tile.y * mapConfig.tileSize,
              mapConfig.tileSize,
              mapConfig.tileSize,
            )
          })
        }
      })
    }

    // Highlight selected tiles
    if (tool === "select" && selectedTiles.length > 0) {
      ctx.strokeStyle = "#ff0000"
      ctx.lineWidth = 2
      selectedTiles.forEach(({ x, y }) => {
        ctx.strokeRect(x * mapConfig.tileSize, y * mapConfig.tileSize, mapConfig.tileSize, mapConfig.tileSize)
      })
    }

    // Draw selection rectangle while dragging
    if (tool === "select" && selectionStart && isDrawing.current) {
      const rect = canvas.getBoundingClientRect()
      const currentX = Math.floor((event.clientX - rect.left) / mapConfig.tileSize)
      const currentY = Math.floor((event.clientY - rect.top) / mapConfig.tileSize)

      const startX = Math.max(0, Math.min(selectionStart.x, currentX))
      const startY = Math.max(0, Math.min(selectionStart.y, currentY))
      const endX = Math.min(mapConfig.width - 1, Math.max(selectionStart.x, currentX))
      const endY = Math.min(mapConfig.height - 1, Math.max(selectionStart.y, currentY))

      ctx.strokeStyle = "rgba(0, 100, 255, 0.5)"
      ctx.lineWidth = 2
      ctx.strokeRect(
        startX * mapConfig.tileSize,
        startY * mapConfig.tileSize,
        (endX - startX + 1) * mapConfig.tileSize,
        (endY - startY + 1) * mapConfig.tileSize,
      )
    }
  }

  const drawTileset = () => {
    const canvas = tilesetCanvasRef.current
    if (!canvas || !tileset.image) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = tileset.image.width
    canvas.height = tileset.image.height
    ctx.drawImage(tileset.image, 0, 0)

    // Draw grid
    ctx.strokeStyle = "#ccc"
    ctx.lineWidth = 1
    for (let x = 0; x < tileset.columns; x++) {
      for (let y = 0; y < tileset.rows; y++) {
        ctx.strokeRect(x * tileset.tileSize, y * tileset.tileSize, tileset.tileSize, tileset.tileSize)
      }
    }

    // Highlight selected tile
    if (selectedTile) {
      ctx.strokeStyle = "#ff0000"
      ctx.lineWidth = 2
      ctx.strokeRect(
        selectedTile.x * tileset.tileSize,
        selectedTile.y * tileset.tileSize,
        tileset.tileSize,
        tileset.tileSize,
      )
    }
  }

  const handleTilesetUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const img = new Image()
    img.onload = () => {
      setTileset({
        image: img,
        tileSize: 32,
        columns: Math.floor(img.width / 32),
        rows: Math.floor(img.height / 32),
      })
    }
    img.src = URL.createObjectURL(file)
  }

  const handleTilesetClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / tileset.tileSize)
    const y = Math.floor((e.clientY - rect.top) / tileset.tileSize)
    setSelectedTile({ x, y })
    drawTileset()
  }

  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / mapConfig.tileSize)
    const y = Math.floor((e.clientY - rect.top) / mapConfig.tileSize)

    if (x >= mapConfig.width || y >= mapConfig.height) return

    if (tool === "place" && selectedTile) {
      addTile(x, y)
    } else if (tool === "erase") {
      deleteTile(x, y)
    } else if (tool === "select") {
      const clickedTile = layers
        .flatMap((layer) => layer.tiles.map((tile) => ({ ...tile, layerName: layer.name })))
        .find((t) => t.x === x && t.y === y)

      if (!isShiftPressed) {
        setSelectedTiles(clickedTile ? [{ x, y, tile: clickedTile }] : [])
      } else if (clickedTile) {
        const alreadySelected = selectedTiles.some((selected) => selected.x === x && selected.y === y)

        if (alreadySelected) {
          setSelectedTiles(selectedTiles.filter((selected) => !(selected.x === x && selected.y === y)))
        } else {
          setSelectedTiles([...selectedTiles, { x, y, tile: clickedTile }])
        }
      }

      drawMap()
    }
  }

  const handleMouseDown = (e) => {
    if (tool === "select") {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = Math.floor((e.clientX - rect.left) / mapConfig.tileSize)
      const y = Math.floor((e.clientY - rect.top) / mapConfig.tileSize)

      setSelectionStart({ x, y })
      isDrawing.current = true

      if (!isShiftPressed) {
        setSelectedTiles([])
      }
    } else {
      isDrawing.current = true
      handleMapClick(e)
    }
  }

  const handleMouseMove = (e) => {
    if (!isDrawing.current || tool !== "select" || !selectionStart) return

    const rect = e.currentTarget.getBoundingClientRect()
    const currentX = Math.floor((e.clientX - rect.left) / mapConfig.tileSize)
    const currentY = Math.floor((e.clientY - rect.top) / mapConfig.tileSize)

    const startX = Math.max(0, Math.min(selectionStart.x, currentX))
    const startY = Math.max(0, Math.min(selectionStart.y, currentY))
    const endX = Math.min(mapConfig.width - 1, Math.max(selectionStart.x, currentX))
    const endY = Math.min(mapConfig.height - 1, Math.max(selectionStart.y, currentY))

    const newSelection = []
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const tile = layers
          .flatMap((layer) => layer.tiles.map((tile) => ({ ...tile, layerName: layer.name })))
          .find((t) => t.x === x && t.y === y)

        if (tile) {
          newSelection.push({ x, y, tile })
        }
      }
    }

    setSelectedTiles((prev) => {
      if (isShiftPressed) {
        const existing = prev.filter(
          (selected) => !newSelection.some((newTile) => newTile.x === selected.x && newTile.y === selected.y),
        )
        return [...existing, ...newSelection]
      }
      return newSelection
    })

    drawMap()
  }

  const handleMouseUp = () => {
    isDrawing.current = false
    setSelectionStart(null)
  }

  const addTile = (x, y) => {
    if (!selectedTile) return

    const newTile = {
      x,
      y,
      tileX: selectedTile.x,
      tileY: selectedTile.y,
      layerId: selectedLayer,
    }

    setLayers(
      layers.map((layer) => {
        if (layer.id === selectedLayer) {
          // Remove any existing tile at the same position
          const tiles = layer.tiles.filter((t) => t.x !== x || t.y !== y)
          return { ...layer, tiles: [...tiles, newTile] }
        }
        return layer
      }),
    )

    addToHistory({
      type: "add",
      layerId: selectedLayer,
      tiles: [newTile],
    })
  }

  const deleteTile = (x, y) => {
    setLayers(
      layers.map((layer) => {
        if (layer.id === selectedLayer) {
          const deletedTiles = layer.tiles.filter((t) => t.x === x && t.y === y)
          const tiles = layer.tiles.filter((t) => t.x !== x || t.y !== y)

          if (deletedTiles.length > 0) {
            addToHistory({
              type: "delete",
              layerId: selectedLayer,
              tiles: deletedTiles,
            })
          }

          return { ...layer, tiles: tiles }
        }
        return layer
      }),
    )
  }

  const addToHistory = (action) => {
    const newHistory = [...history.slice(0, historyIndex + 1), action]
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex < 0) return

    const action = history[historyIndex]
    setLayers(
      layers.map((layer) => {
        if (layer.id === action.layerId) {
          if (action.type === "add") {
            return {
              ...layer,
              tiles: layer.tiles.filter((t) => !action.tiles.includes(t)),
            }
          } else if (action.type === "delete") {
            return {
              ...layer,
              tiles: [...layer.tiles, ...action.tiles],
            }
          }
        }
        return layer
      }),
    )

    setHistoryIndex(historyIndex - 1)
  }

  const redo = () => {
    if (historyIndex >= history.length - 1) return

    const action = history[historyIndex + 1]
    setLayers(
      layers.map((layer) => {
        if (layer.id === action.layerId) {
          if (action.type === "add") {
            return {
              ...layer,
              tiles: [...layer.tiles, ...action.tiles],
            }
          } else if (action.type === "delete") {
            return {
              ...layer,
              tiles: layer.tiles.filter((t) => !action.tiles.includes(t)),
            }
          }
        }
        return layer
      }),
    )

    setHistoryIndex(historyIndex + 1)
  }

  const addLayer = () => {
    const id = `layer-${layers.length + 1}`
    setLayers([...layers, { id, name: `Layer ${layers.length + 1}`, visible: true, tiles: [] }])
    setSelectedLayer(id)
  }

  const exportMap = () => {
    const mapData = {
      config: mapConfig,
      layers: layers,
    }

    const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "tilemap.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCreateMap = () => {
    setMapConfig(newMapConfig)
    setIsDialogOpen(false)
  }

  return (
    <div className="flex flex-col h-screen" tabIndex={-1} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp}>
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">New Map</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Map</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="width">Map Width (tiles)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={newMapConfig.width}
                    onChange={(e) => setNewMapConfig({ ...newMapConfig, width: Number.parseInt(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="height">Map Height (tiles)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={newMapConfig.height}
                    onChange={(e) => setNewMapConfig({ ...newMapConfig, height: Number.parseInt(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tileSize">Tile Size (pixels)</Label>
                  <Input
                    id="tileSize"
                    type="number"
                    value={newMapConfig.tileSize}
                    onChange={(e) => setNewMapConfig({ ...newMapConfig, tileSize: Number.parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateMap}>Create Map</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Input type="file" accept="image/*" onChange={handleTilesetUpload} className="max-w-[200px]" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTool("select")}
            className={tool === "select" ? "bg-accent" : ""}
          >
            <MousePointer className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTool("place")}
            className={tool === "place" ? "bg-accent" : ""}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTool("erase")}
            className={tool === "erase" ? "bg-accent" : ""}
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex < 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={exportMap}>
            <Save className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 flex">
        <div className="w-64 border-r p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Layers</h3>
            <Button variant="ghost" size="icon" onClick={addLayer}>
              <Layers className="h-4 w-4" />
            </Button>
          </div>
          <Select value={selectedLayer} onValueChange={setSelectedLayer}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layers.map((layer) => (
                <SelectItem key={layer.id} value={layer.id}>
                  {layer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tileset.image && (
            <div className="border rounded-lg p-2">
              <canvas
                ref={tilesetCanvasRef}
                onClick={handleTilesetClick}
                className="w-full cursor-pointer"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
          )}
          {selectedTiles.length > 0 && (
            <div className="border rounded-lg p-2">
              <h4 className="font-medium mb-2">Selection Info</h4>
              <p className="text-sm">Selected tiles: {selectedTiles.length}</p>
              <p className="text-sm">
                Layers: {Array.from(new Set(selectedTiles.map((t) => t.tile.layerName))).join(", ")}
              </p>
              {selectedTiles.length === 1 && (
                <>
                  <p className="text-sm">
                    Position: ({selectedTiles[0].x}, {selectedTiles[0].y})
                  </p>
                  <p className="text-sm">Layer: {selectedTiles[0].tile.layerName}</p>
                </>
              )}
              <Button className="w-full mt-2" variant="destructive" size="sm" onClick={deleteSelectedTiles}>
                Delete Selected
              </Button>
            </div>
          )}
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <canvas
            ref={canvasRef}
            onClick={handleMapClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="border rounded-lg"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      </div>
    </div>
  )
}

