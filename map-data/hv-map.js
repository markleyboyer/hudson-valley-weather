/* Map of the Hudson Valley academies (and optional NYS Mesonet stations) for the reviewer browser.
 * Expects Leaflet on the page, window.HV_ACADEMIES (from build_hudson_valley.py) and a #hvMap element.
 * Options on the element: data-base (folder holding the map data, default "map-data/"),
 * data-click="filter" to filter the browser table when an academy is clicked, data-static to
 * disable interaction (for printing). */
(function () {
  const el = document.getElementById('hvMap');
  if (!el || !window.L || !window.HV_ACADEMIES) return;
  const base = el.dataset.base || 'map-data/';
  const isStatic = el.hasAttribute('data-static');
  const map = L.map(el, {
    scrollWheelZoom: false, zoomSnap: 0.25,
    zoomControl: !isStatic, dragging: !isStatic, doubleClickZoom: !isStatic, attributionControl: true,
  });
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 13,
    attribution: 'Base map &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors &bull; Stations: NYS Mesonet &bull; Counties: US Census',
  }).addTo(map);
  map.fitBounds([[40.95, -74.75], [42.95, -73.3]]);

  const accent = '#8a3b12', meso = '#2e5e9e';
  map.createPane('academies').style.zIndex = 650;  // academies draw above the Mesonet dots
  const layers = { counties: L.layerGroup().addTo(map), radius: L.layerGroup(), mesonet: L.layerGroup(), academies: L.layerGroup().addTo(map) };

  fetch(base + 'ny_counties.geojson').then(r => r.json()).then(gj => {
    L.geoJSON(gj, {
      interactive: false,
      style: f => f.properties.hv
        ? { color: '#6b5e45', weight: 1.2, fillColor: '#e8dcc0', fillOpacity: 0.45 }
        : { color: '#b9b0a0', weight: 0.6, fillOpacity: 0 },
    }).addTo(layers.counties);
    // County names placed by hand so they stay clear of the academy labels
    const COUNTY_LABELS = {
      Albany: [42.56, -74.06], Rensselaer: [42.70, -73.45], Greene: [42.25, -74.20], Columbia: [42.17, -73.60],
      Ulster: [41.90, -74.38], Dutchess: [41.83, -73.70], Orange: [41.36, -74.52], Putnam: [41.43, -73.72],
      Rockland: [41.16, -74.08], Westchester: [41.24, -73.70],
    };
    Object.entries(COUNTY_LABELS).forEach(([name, ll]) =>
      L.marker(ll, { interactive: false, icon: L.divIcon({ className: 'hv-county-label', html: name, iconSize: null }) })
        .addTo(layers.counties));
  }).catch(() => {});

  fetch(base + 'nysm_stations.json').then(r => r.json()).then(st => {
    st.forEach(s => L.circleMarker([s.lat, s.lon], { radius: 4, color: '#fff', weight: 1, fillColor: meso, fillOpacity: 0.95 })
      .bindTooltip(`NYS Mesonet: ${s.name} (${s.county} County)`).addTo(layers.mesonet));
  }).catch(() => {});

  window.HV_ACADEMIES.forEach(a => {
    L.circle([a.lat, a.lon], { radius: 30000, color: accent, weight: 0.8, fillColor: accent, fillOpacity: 0.06, interactive: false })
      .addTo(layers.radius);
    const r = 4 + Math.sqrt(a.pages) / 3.2;
    const m = L.circleMarker([a.lat, a.lon], {
      pane: 'academies', radius: r, color: '#fff', weight: 1.5, fillColor: accent, fillOpacity: 0.9,
    }).addTo(layers.academies);
    m.bindTooltip(`<b>${a.name}</b><br>${a.town}, ${a.county} County<br>${a.pages.toLocaleString()} pages, ${a.first}&ndash;${a.last}`,
      { direction: 'top' });
    if (a.label) {
      const left = a.side === 'left';
      L.marker([a.lat, a.lon], { interactive: false, icon: L.divIcon({
        className: 'hv-acad-label' + (left ? ' left' : ''), html: '<span>' + a.short + '</span>', iconSize: null,
        iconAnchor: left ? [r + 3, 7] : [-(r + 3), 7] }) })
        .addTo(layers.academies);
    }
    if (el.dataset.click === 'filter') {
      m.on('click', () => {
        const s = document.getElementById('search');
        if (!s) return;
        s.value = a.name;
        if (typeof applyFilters === 'function') applyFilters();
        document.getElementById('mainTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  });

  // Toggles: <input type="checkbox" data-layer="mesonet|radius">
  document.querySelectorAll('input[data-layer]').forEach(cb => {
    const apply = () => { const l = layers[cb.dataset.layer]; if (cb.checked) l.addTo(map); else map.removeLayer(l); };
    cb.addEventListener('change', apply);
    apply();
  });
})();
