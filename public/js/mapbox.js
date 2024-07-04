console.log('Hello from the client side');

export const displayMap = (locations) => {
  var map = new maplibregl.Map({
    container: 'map', // container id
    style: 'https://demotiles.maplibre.org/style.json', // style URL
    center: [0, 0], // starting position [lng, lat]
    zoom: 9, // starting zoom
  });

  locations.forEach(function (marker) {
    var popup = new maplibregl.Popup({ offset: 20 }).setText(
      marker.description
    );

    new maplibregl.Marker()
      .setLngLat(marker.coordinates)
      .setPopup(popup)
      .addTo(map);
  });

  map.addControl(new maplibregl.NavigationControl());

  var bounds = new maplibregl.LngLatBounds();

  locations.forEach(function (marker) {
    bounds.extend(marker.coordinates);
  });

  map.fitBounds(bounds, { padding: 80, maxZoom: 5 });
};
