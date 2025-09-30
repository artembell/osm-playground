import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css'

import maplibregl from 'maplibre-gl';

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/globe.json',
    center: [0, 0],
    zoom: 1
});