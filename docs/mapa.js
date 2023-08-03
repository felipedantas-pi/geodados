// add the PMTiles plugin to the maplibregl global.
let protocol = new pmtiles.Protocol();
// Necessário para suportar os idiomas árabe e hebraico, que são escritos da direita para a esquerda. 
// RTLTextPlugin: https://docs.mapbox.com/mapbox-gl-js/plugins/#mapbox-gl-rtl-text
maplibregl.setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.js');
maplibregl.addProtocol("pmtiles", protocol.tile);



// let PMTILES_Buildings_URL = "https://xs489works.xsrv.jp/pmtiles-data/Overture-Maps-Data/buildings-japan.pmtiles";
// let PMTILES_Places_URL = "https://xs489works.xsrv.jp/pmtiles-data/Overture-Maps-Data/places-japan.pmtiles";
// const p1 = new pmtiles.PMTiles(PMTILES_Buildings_URL)
// const p2 = new pmtiles.PMTiles(PMTILES_Places_URL)
// protocol.add(p1);

let map = new maplibregl.Map({
    container: 'map',
    //style: './dark.json',
    //style: 'https://maputnik.github.io/osm-liberty/style.json',
    style: 'https://tile2.openstreetmap.jp/styles/osm-bright/style.json',
    center: [-42.811,-5.090], // starting position [lng, lat]
    zoom: 14.52,
    pitch: 60,
    bearing: -12.7,
    hash: true,
    attributionControl: false
})

// ズーム・回転
map.addControl(new maplibregl.NavigationControl());

// フルスクリーンモードのオンオフ
map.addControl(new maplibregl.FullscreenControl());

// 現在位置表示
map.addControl(new maplibregl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: false
    },
    fitBoundsOptions: { maxZoom: 18 },
    trackUserLocation: true,
    showUserLocation: true
}));

// スケール表示
map.addControl(new maplibregl.ScaleControl({
    maxWidth: 200,
    unit: 'metric'
}));

// Attributionを折りたたみ表示
map.addControl(new maplibregl.AttributionControl({
    compact: true,
    customAttribution: '（<a href="https://twitter.com/dantasfeliper" target="_blank">Twitter</a> | <a href="https://github.com/shi-works/Overture-Maps-Data-for-GIS" target="_blank">Github</a>） '
}));

// ジオコーダー追加
var geocoder_api = {
    forwardGeocode: async (config) => {
        const features = [];
        try {
            let request =
                'https://nominatim.openstreetmap.org/search?q=' +
                config.query +
                '&format=geojson&polygon_geojson=1&addressdetails=1';
            const response = await fetch(request);
            const geojson = await response.json();
            for (let feature of geojson.features) {
                let center = [
                    feature.bbox[0] +
                    (feature.bbox[2] - feature.bbox[0]) / 2,
                    feature.bbox[1] +
                    (feature.bbox[3] - feature.bbox[1]) / 2
                ];
                let point = {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: center
                    },
                    place_name: feature.properties.display_name,
                    properties: feature.properties,
                    text: feature.properties.display_name,
                    place_type: ['place'],
                    center: center
                };
                features.push(point);
            }
        } catch (e) {
            console.error(`Failed to forwardGeocode with error: ${e}`);
        }

        return {
            features: features
        };
    }
};

map.addControl(
    new MaplibreGeocoder(geocoder_api, {
        maplibregl: maplibregl
    }), 'top-left');

map.on('load', () => {
    // buildingsベクトルタイル
    map.addSource("pmtiles-buildings", {
        type: "vector",
        url: "pmtiles://" + PMTILES_Buildings_URL,
        attribution: '© <a href="https://overturemaps.org">Overture Maps Foundation</a>'
    });

    // buildingsポリゴンレイヤ
    map.addLayer({
        "id": "buildings-polygon",
        "source": "pmtiles-buildings",
        "source-layer": "buildingsjapanfgb",
        'type': 'fill-extrusion',
        "minzoom": 15,
        "maxzoom": 23,
        "paint": {
            'fill-extrusion-color': 'rgb(0, 127, 255)',
            "fill-extrusion-opacity": 0.7,
            "fill-extrusion-height": ["get", "height"]
        }
    });

    // placesベクトルタイル
    map.addSource("pmtiles-places", {
        type: "vector",
        url: "pmtiles://" + PMTILES_Places_URL,
        attribution: '© <a href="https://overturemaps.org">Overture Maps Foundation</a>'
    });

    // placesサークルレイヤ
    map.addLayer({
        'id': 'places-circle',
        'type': 'circle',
        'source': 'pmtiles-places',
        'source-layer': "placesjapanfgb",
        "minzoom": 1,
        "maxzoom": 23,
        'paint': {
            'circle-color':
                ['case',
                    ['==', ['get', 'category_main'], 'beauty_salon'], '#fb9a99',
                    ['==', ['get', 'category_main'], 'hotel'], '#33a02c',
                    ['==', ['get', 'category_main'], 'landmark_and_historical_building'], '#a6cee3',
                    ['==', ['get', 'category_main'], 'professional_services'], '#fdbf6f',
                    ['==', ['get', 'category_main'], 'shopping'], '#e31a1c',
                    ['==', ['get', 'category_main'], 'restaurant'], '#1f78b4',
                    ['==', ['get', 'category_main'], 'school'], '#ff7f00',
                    ['==', ['get', 'category_main'], 'accommodation'], '#b2df8a',
                    '#cab2d6'
                ],
            'circle-radius': 4,
            'circle-stroke-width': 2,
            'circle-stroke-color': 'black'
        }
    });

    // placesシンボルレイヤ
    map.addLayer({
        'id': 'places-symbol',
        'type': 'symbol',
        'source': 'pmtiles-places',
        'source-layer': "placesjapanfgb",
        "minzoom": 17,
        "maxzoom": 23,
        'layout': {
            'text-field': ['get', 'name'],
            'text-font': ["Barlow Regular"],
            'text-size': 12,
            'text-offset': [0, 1.2]
        },
        'paint': {
            'text-color': "white",
            'text-halo-width': 2,
            'text-halo-color': 'black'
        }
    });

    // places ポップアップ表示
    map.on('click', 'places-circle', (e) => {
        var lng = e.features[0].geometry.coordinates[0];
        var lat = e.features[0].geometry.coordinates[1];
        var id = e.features[0].properties['id'];
        var updatetime = e.features[0].properties['updatetime'];
        var name = e.features[0].properties['name'];
        var confidence = e.features[0].properties['confidence'];
        var websites = e.features[0].properties['websites'];
        if (websites === 'undefined' || typeof websites === 'undefined') {
            websites_url = 'undefined';
        } else {
            websites_url = '<a href="' + websites + '" target="_blank">' + 'Webサイト' + '</a>';
        }
        var socials = e.features[0].properties['socials'];
        if (socials === 'undefined' || typeof socials === 'undefined') {
            socials_url = 'undefined'
        } else {
            socials_url = '<a href="' + socials + '" target="_blank">' + 'SNS' + '</a>'
        }
        var emails = e.features[0].properties['emails'];
        var phones = e.features[0].properties['phones'];
        var addresses = e.features[0].properties['addresses'];
        var sources = e.features[0].properties['sources'];
        var category_main = e.features[0].properties['category_main'];
        var categories_alternate = e.features[0].properties['categories_alternate'];
        var brand_names = e.features[0].properties['brand_names'];
        var brand_wikidata = e.features[0].properties['brand_wikidata'];

        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
                'id: ' + id + '<br>' +
                'updatetime: ' + updatetime + '<br>' +
                'name: ' + name + '<br>' +
                'confidence: ' + confidence + '<br>' +
                'websites: ' + websites_url + '<br>' +
                'socials: ' + socials_url + '<br>' +
                'emails: ' + emails + '<br>' +
                'phones: ' + phones + '<br>' +
                'addresses: ' + addresses + '<br>' +
                'sources: ' + sources + '<br>' +
                'category_main: ' + category_main + '<br>' +
                'categories_alternate: ' + categories_alternate + '<br>' +
                'brand_names: ' + brand_names + '<br>' +
                'brand_wikidata: ' + brand_wikidata + '<br>' +
                '<div><a href="https://www.google.com/maps?q=' + lat + ',' + lng + '&hl=ja" target="_blank">🌎Google Maps</a></div>' +
                '<div><a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + lat + ',' + lng + '&hl=ja" target="_blank">📷Street View</a></div>'
            )
            .addTo(map);
    });

});