// Use Spring Boot backend served at the same origin
const API_ONIBUS = `${location.origin}/onibus`

const INITIAL_LAT_LON = [-22.9145, -43.4477]
const INITIAL_ZOOM = 11
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

const $busList = document.querySelector('#buslist')

let map
let busesLayerGroup
let currentLine = null
let refreshTimer = null

const addMarker = (bus) => {
    // bus is an object: { ordem, linha, latitude, longitude }
    if (!bus || bus.latitude == null || bus.longitude == null) return
    const carNumber = bus.ordem
    const lineNumber = bus.linha
    const lat = bus.latitude
    const lon = bus.longitude
    const popupText = `${lineNumber} - ${carNumber}`

    L.marker([lat, lon])
        .bindPopup(popupText)
        .addTo(busesLayerGroup)
}

const populateSelect = (lines) => {
    while ($busList.options.length > 1) $busList.remove(1)
    const list = (lines || []).filter(Boolean).sort()
    list.forEach(line => {
        const option = document.createElement('option')
        option.value = line
        option.text = line
        $busList.appendChild(option)
    })
}

const drawMarkers = (vehicles) => {
    if (busesLayerGroup) map.removeLayer(busesLayerGroup)
    busesLayerGroup = L.layerGroup().addTo(map)
    ;(vehicles || []).forEach(addMarker)
}

const getBoundsParams = () => {
    const b = map.getBounds()
    return {
        latMin: b.getSouth(),
        latMax: b.getNorth(),
        lonMin: b.getWest(),
        lonMax: b.getEast()
    }
}

const buildUrl = (params) => {
    const url = new URL(API_ONIBUS)
    Object.entries(params || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
    return url.toString()
}

const loadLines = () => {
    // Fetch all buses and derive distinct lines
    fetch(API_ONIBUS)
        .then(r => { if (!r.ok) throw new Error(`GET /onibus ${r.status}`); return r.json() })
        .then(list => {
            const lines = [...new Set((list || []).map(b => b.linha))]
            populateSelect(lines)
        })
        .catch(err => console.error('Falha ao carregar linhas:', err))
}

const loadVehicles = () => {
    if (!currentLine) return
    const { latMin, latMax, lonMin, lonMax } = getBoundsParams()
    const url = buildUrl({ linha: currentLine, latMin, latMax, lonMin, lonMax })
    fetch(url)
        .then(r => { if (!r.ok) throw new Error(`GET /onibus ${r.status}`); return r.json() })
        .then(list => {
            drawMarkers(list || [])
            console.log(`Exibindo ${list?.length || 0} veículos da linha ${currentLine}`)
        })
        .catch(err => console.error('Falha ao carregar veículos:', err))
}

const scheduleRefresh = () => {
    if (refreshTimer) clearInterval(refreshTimer)
    refreshTimer = setInterval(loadVehicles, 10000) // 10s
}

const initMap = () => {
    map = L.map('map').setView(INITIAL_LAT_LON, INITIAL_ZOOM)

    L.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        attribution: '© Dados: Data Rio / Mapa: OpenStreetMap'
    }).addTo(map)
}

const onBusListSelected = (event) => {
    currentLine = event.target.value
    loadVehicles()
    scheduleRefresh()
}

const initEvents = () => {
    $busList.addEventListener('change', onBusListSelected)
    let moveDebounce
    map.on('moveend', () => {
        if (!currentLine) return
        clearTimeout(moveDebounce)
        moveDebounce = setTimeout(loadVehicles, 300)
    })
}

const init = () => {
    initMap()
    loadLines()
    initEvents()
}

init()
