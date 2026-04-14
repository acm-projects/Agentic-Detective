// src/components/SuspectPortrait.tsx

import { useEffect, useRef, useCallback } from 'react'
import type { FeatureSelection } from '../caseFile'

// ── Vite asset imports ──────────────────────────────────
import backHairSrc  from './portraits/custom/Back-hair.png'
import headSrc      from './portraits/custom/Head.png'
import neckSrc      from './portraits/custom/neck.png'
import shirtSrc     from './portraits/custom/Shirt.png'
import eyesSrc      from './portraits/custom/Eyes.png'
import nosesSrc     from './portraits/custom/Noses.png'
import mouthsSrc    from './portraits/custom/Mouths.png'
import frontHairSrc from './portraits/custom/Front-hair.png'

const FRAME_W = 128
const FRAME_H = 128

interface Frame { x: number; y: number }
interface Asset { src: string; frames: Frame[] }

function getFrames6(): Frame[] {
  return Array.from({ length: 6 }, (_, i) => ({
    x: (i % 3) * FRAME_W,
    y: Math.floor(i / 3) * FRAME_H,
  }))
}

function getFrames1(): Frame[] {
  return [{ x: 0, y: 0 }]
}

// 5 columns × 2 rows = 10 frames
function getFrames10(): Frame[] {
  return Array.from({ length: 10 }, (_, i) => ({
    x: (i % 5) * FRAME_W,
    y: Math.floor(i / 5) * FRAME_H,
  }))
}

// 6 columns × 2 rows = 12 frames
function getFrames12(): Frame[] {
  return Array.from({ length: 12 }, (_, i) => ({
    x: (i % 6) * FRAME_W,
    y: Math.floor(i / 6) * FRAME_H,
  }))
}

const ASSETS: Record<string, Asset> = {
  backHair:  { src: backHairSrc,  frames: getFrames10() },
  head:      { src: headSrc,      frames: getFrames1() },
  neck:      { src: neckSrc,      frames: getFrames1() },
  shirt:     { src: shirtSrc,     frames: getFrames1() },
  eyes:      { src: eyesSrc,      frames: getFrames6() },
  nose:      { src: nosesSrc,     frames: getFrames6() },
  mouth:     { src: mouthsSrc,    frames: getFrames6() },
  frontHair: { src: frontHairSrc, frames: getFrames12() },
}

const LAYER_ORDER = ['backHair', 'shirt', 'neck', 'head', 'eyes', 'nose', 'mouth', 'frontHair']

const SKIN_LAYERS  = new Set(['head', 'neck'])
const HAIR_LAYERS  = new Set(['backHair', 'frontHair'])
const EYE_LAYERS   = new Set(['eyes'])
const SHIRT_LAYERS = new Set(['shirt'])
const MOUTH_LAYERS = new Set(['mouth'])

type CharacterState = Record<string, Frame>

function buildCharacterState(features: FeatureSelection): CharacterState {
  return {
    backHair:  ASSETS.backHair.frames[features.backHairFrameIndex]  ?? ASSETS.backHair.frames[0],
    frontHair: ASSETS.frontHair.frames[features.frontHairFrameIndex] ?? ASSETS.frontHair.frames[0],
    eyes:      ASSETS.eyes.frames[features.eyesFrameIndex]           ?? ASSETS.eyes.frames[0],
    nose:      ASSETS.nose.frames[features.noseFrameIndex]           ?? ASSETS.nose.frames[0],
    mouth:     ASSETS.mouth.frames[features.mouthFrameIndex]         ?? ASSETS.mouth.frames[0],
    head:      ASSETS.head.frames[0],
    neck:      ASSETS.neck.frames[0],
    shirt:     ASSETS.shirt.frames[0],
  }
}

function drawTinted(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: Frame,
  color: string,
) {
  const src = document.createElement('canvas')
  src.width = FRAME_W
  src.height = FRAME_H
  const srcCtx = src.getContext('2d')!
  srcCtx.drawImage(img, frame.x, frame.y, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H)

  const imageData = srcCtx.getImageData(0, 0, FRAME_W, FRAME_H)
  const data = imageData.data

  const tmp = document.createElement('canvas')
  tmp.width = tmp.height = 1
  const tmpCtx = tmp.getContext('2d')!
  tmpCtx.fillStyle = color
  tmpCtx.fillRect(0, 0, 1, 1)
  const [tr, tg, tb] = tmpCtx.getImageData(0, 0, 1, 1).data

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    if (a === 0) continue
    const brightness = (r + g + b) / 3
    if (brightness > 200) continue

    const t = brightness / 255
    const multiply = (v: number, tv: number) => (v * tv) / 255
    const screen   = (v: number, tv: number) => 255 - ((255 - v) * (255 - tv)) / 255
    data[i]     = multiply(r, tr) * (1 - t) + screen(r, tr) * t
    data[i + 1] = multiply(g, tg) * (1 - t) + screen(g, tg) * t
    data[i + 2] = multiply(b, tb) * (1 - t) + screen(b, tb) * t
  }

  srcCtx.putImageData(imageData, 0, 0)
  ctx.drawImage(src, 0, 0)
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  images: Record<string, HTMLImageElement>,
  character: CharacterState,
  features: FeatureSelection,
) {
  ctx.clearRect(0, 0, FRAME_W, FRAME_H)

  const off = document.createElement('canvas')
  off.width = FRAME_W
  off.height = FRAME_H
  const offCtx = off.getContext('2d')!
  offCtx.imageSmoothingEnabled = false

  for (const layer of LAYER_ORDER) {
    const img = images[layer]
    const frame = character[layer]
    if (!img || !frame) continue

    const tint =
      HAIR_LAYERS.has(layer)  ? features.hairColor  :
      SKIN_LAYERS.has(layer)  ? features.skinColor  :
      EYE_LAYERS.has(layer)   ? features.eyeColor   :
      SHIRT_LAYERS.has(layer) ? features.shirtColor :
      MOUTH_LAYERS.has(layer) ? features.lipColor   :
      null

    if (tint) {
      offCtx.clearRect(0, 0, FRAME_W, FRAME_H)
      drawTinted(offCtx, img, frame, tint)
      ctx.drawImage(off, 0, 0)
    } else {
      ctx.drawImage(img, frame.x, frame.y, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H)
    }
  }
}

async function loadImages(): Promise<Record<string, HTMLImageElement>> {
  const entries = await Promise.all(
    Object.entries(ASSETS).map(
      ([key, asset]) =>
        new Promise<[string, HTMLImageElement]>((res, rej) => {
          const img = new Image()
          img.onload = () => res([key, img])
          img.onerror = () => rej(new Error(`Failed to load ${asset.src}`))
          img.src = asset.src
        })
    )
  )
  return Object.fromEntries(entries)
}

// ─────────────────────────────────────────────
//  PROPS
// ─────────────────────────────────────────────

interface SuspectPortraitProps {
  features: FeatureSelection
  /** Rendered size in CSS pixels. Defaults to 384 (128 * 3) */
  size?: number
  className?: string
}

// Shared image cache so sprites are only loaded once across all portrait instances
const imageCache: Record<string, HTMLImageElement> = {}
let imageCachePromise: Promise<Record<string, HTMLImageElement>> | null = null

function getImages(): Promise<Record<string, HTMLImageElement>> {
  if (Object.keys(imageCache).length > 0) {
    return Promise.resolve(imageCache)
  }
  if (!imageCachePromise) {
    imageCachePromise = loadImages().then(imgs => {
      Object.assign(imageCache, imgs)
      return imageCache
    })
  }
  return imageCachePromise
}

// ─────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────

export default function SuspectPortrait({ features, size = 384, className }: SuspectPortraitProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const loadedRef   = useRef(false)
  const featuresRef = useRef(features)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !loadedRef.current) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    const character = buildCharacterState(featuresRef.current)
    drawCharacter(ctx, imageCache, character, featuresRef.current)
  }, [])

  // Load sprites once
  useEffect(() => {
    getImages().then(() => {
      loadedRef.current = true
      redraw()
    }).catch(err => console.error('Portrait sprite load error:', err))
  }, [redraw])

  // Redraw whenever features change
  useEffect(() => {
    featuresRef.current = features
    redraw()
  }, [features, redraw])

  return (
    <canvas
      ref={canvasRef}
      width={FRAME_W}
      height={FRAME_H}
      className={className}
      style={{
        width: size / 1.75,
        height: size / 1.75,
        imageRendering: 'pixelated',
      }}
    />
  )
}