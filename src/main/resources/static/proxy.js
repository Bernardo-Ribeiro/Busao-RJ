const express = require('express')
const https = require('https')
const http = require('http')
const cors = require('cors')
const compression = require('compression')

const app = express()
app.use(cors())
app.use(compression())

// In-memory cache of latest upstream snapshot to reduce bandwidth and latency
// Cache shape: { fetchedAtMs: number, items: Array<object>, latestByOrdem: Map, lines: Array<string>, maxTs: number }
const CACHE_TTL_MS = 10 * 1000 // 10 seconds
let cache = null

function parseJSONSafe(str) {
  try { return JSON.parse(str) } catch (_) { return null }
}

function normalizeTs(tsRaw) {
  if (!tsRaw) return 0
  if (/^\d+$/.test(String(tsRaw))) {
    let n = parseInt(tsRaw, 10)
    return n < 1e12 ? n * 1000 : n
  }
  const parsed = Date.parse(String(tsRaw))
  return isNaN(parsed) ? 0 : parsed
}

function ensureCache() {
  return new Promise((resolve, reject) => {
    const now = Date.now()
    if (cache && (now - cache.fetchedAtMs) < CACHE_TTL_MS) {
      return resolve(cache)
    }

    const upstreamUrl = 'https://dados.mobilidade.rio/gps/sppo'
    const lib = upstreamUrl.startsWith('https') ? https : http
    const req = lib.get(upstreamUrl, (upstreamRes) => {
      let body = ''
      upstreamRes.on('data', chunk => { body += chunk })
      upstreamRes.on('end', () => {
        if (upstreamRes.statusCode && upstreamRes.statusCode >= 400) {
          return reject(new Error(`Upstream status ${upstreamRes.statusCode}`))
        }
        const json = parseJSONSafe(body)
        if (!Array.isArray(json)) {
          return reject(new Error('Upstream payload is not an array'))
        }
        const latestByOrdem = new Map()
        let maxTs = 0
        for (const item of json) {
          const ordem = (item.ordem || '').toString()
          if (!ordem) continue
          const lat = item.latitude ? parseFloat(String(item.latitude).replace(',', '.')) : null
          const lon = item.longitude ? parseFloat(String(item.longitude).replace(',', '.')) : null
          const ts = normalizeTs(item.datahoraservidor || item.datahoraenvio || item.datahora)
          const rec = {
            ordem,
            linha: item.linha || '',
            lat, lon,
            ts,
            velocidade: item.velocidade || 0,
            direcao: item.direcao || 0
          }
          const prev = latestByOrdem.get(ordem)
          if (!prev || (ts && ts > prev.ts)) latestByOrdem.set(ordem, rec)
          if (ts && ts > maxTs) maxTs = ts
        }
        const lines = Array.from(new Set(Array.from(latestByOrdem.values()).map(v => v.linha))).filter(Boolean).sort()
        cache = { fetchedAtMs: now, items: Array.from(latestByOrdem.values()), latestByOrdem, lines, maxTs }
        resolve(cache)
      })
    })
    req.on('error', err => reject(err))
  })
}

// Simple proxy using built-in https/http to avoid ESM/import issues with some fetch libraries
app.get('/gps/sppo', (req, res) => {
  const upstreamUrl = 'https://dados.mobilidade.rio/gps/sppo'
  const lib = upstreamUrl.startsWith('https') ? https : http

  const upstreamReq = lib.get(upstreamUrl, upstreamRes => {
    let body = ''
    upstreamRes.on('data', chunk => { body += chunk })
    upstreamRes.on('end', () => {
      // forward the status and content-type
      const contentType = upstreamRes.headers['content-type'] || 'application/json'
      res.set('Content-Type', contentType)
      res.status(upstreamRes.statusCode || 200).send(body)
    })
  })

  upstreamReq.on('error', err => {
    console.error('Upstream request failed:', err)
    res.status(502).send({ error: err.message })
  })
})

// Lightweight endpoints for the client app to reduce bandwidth
app.get('/api/lines', async (req, res) => {
  try {
    const c = await ensureCache()
    res.set('Cache-Control', 'no-store')
    res.json({ lines: c.lines, since: c.maxTs })
  } catch (err) {
    console.error('lines endpoint error:', err)
    res.status(502).json({ error: err.message })
  }
})

app.get('/api/vehicles', async (req, res) => {
  try {
    const c = await ensureCache()
    const { linhas, bbox, since } = req.query
    let list = c.items

    // Filter by lines (comma-separated)
    if (linhas) {
      const set = new Set(String(linhas).split(',').map(s => s.trim()).filter(Boolean))
      list = list.filter(v => set.has(String(v.linha)))
    }

    // Filter by bounding box: minLon,minLat,maxLon,maxLat
    if (bbox) {
      const parts = String(bbox).split(',').map(x => parseFloat(x))
      if (parts.length === 4 && parts.every(n => !Number.isNaN(n))) {
        const [minLon, minLat, maxLon, maxLat] = parts
        list = list.filter(v => v.lat != null && v.lon != null && v.lat >= minLat && v.lat <= maxLat && v.lon >= minLon && v.lon <= maxLon)
      }
    }

    // Filter by since (ms)
    if (since) {
      const s = parseInt(String(since), 10)
      if (!Number.isNaN(s) && s > 0) list = list.filter(v => v.ts > s)
    }

    // Response payload is minimal
    res.set('Cache-Control', 'no-store')
    res.json({ since: c.maxTs, count: list.length, data: list })
  } catch (err) {
    console.error('vehicles endpoint error:', err)
    res.status(502).json({ error: err.message })
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Proxy running at http://localhost:${port}/gps/sppo`))