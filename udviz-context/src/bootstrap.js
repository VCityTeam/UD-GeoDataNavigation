/** @format */

import { loadMultipleJSON, initScene } from '@ud-viz/utils_browser';
import * as itowns from 'itowns';
import * as widgetSPARQL from '@ud-viz/widget_sparql';
import * as proj4 from 'proj4';

import { GeoVolumeWindow } from './Extensions/GeoVolume/GeoVolume/View/GeoVolumeWindow';
import {GeoVolumeSource} from './Extensions/GeoVolume/GeoVolume/ViewModel/GeoVolumeSource';
import { SparqlQueryWindow } from './Extensions/SPARQL/SparqlQueryWindow';
import css from './style.css';

loadMultipleJSON([
  '../assets/config/layer/elevation.json',
  '../assets/config/layer/base_maps.json',
  '../assets/config/server/sparql_server.json',
  '../assets/config/widget/sparql_widget.json',
  '../assets/config/scene.json',
  '../assets/config/extent_lyon.json'
]).then((configs) => {
  proj4.default.defs(
    'EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
  );

  const extent = new itowns.Extent(
    configs['extent_lyon'].crs,
    parseInt(configs['extent_lyon'].west),
    parseInt(configs['extent_lyon'].east),
    parseInt(configs['extent_lyon'].south),
    parseInt(configs['extent_lyon'].north)
  );

  // create a itowns planar view
  const viewDomElement = document.createElement('div');
  viewDomElement.classList.add('full_screen');
  document.body.appendChild(viewDomElement);
  const view = new itowns.PlanarView(viewDomElement, extent, {
    maxSubdivisionLevel: 9,
  });
  // init scene 3D
  initScene(
    view.camera.camera3D,
    view.mainLoop.gfxEngine.renderer,
    view.scene,
    configs['scene']
  );

  view.addLayer(
    new itowns.ColorLayer(configs['base_maps'][0]['layer_name'], {
      updateStrategy: {
        type: itowns.STRATEGY_DICHOTOMY,
        options: {},
      },
      source: new itowns.WMSSource({
        extent: extent,
        name: configs['base_maps'][0]['name'],
        url: configs['base_maps'][0]['url'],
        version: configs['base_maps'][0]['version'],
        crs: extent.crs,
        format: configs['base_maps'][0]['format'],
      }),
      transparent: true,
    })
  );

  const isTextureFormat =
    configs['elevation']['format'] == 'image/jpeg' ||
    configs['elevation']['format'] == 'image/png';
  view.addLayer(
    new itowns.ElevationLayer(configs['elevation']['layer_name'], {
      useColorTextureElevation: isTextureFormat,
      colorTextureElevationMinZ: isTextureFormat
        ? configs['elevation']['colorTextureElevationMinZ']
        : null,
      colorTextureElevationMaxZ: isTextureFormat
        ? configs['elevation']['colorTextureElevationMaxZ']
        : null,
      source: new itowns.WMSSource({
        extent: extent,
        url: configs['elevation']['url'],
        name: configs['elevation']['name'],
        crs: extent.crs,
        heightMapWidth: 256,
        format: configs['elevation']['format'],
      }),
    })
  );

  let sparqlEndpointResponseProvider =
    new widgetSPARQL.SparqlEndpointResponseProvider(configs['sparql_server']);

    console.log(sparqlEndpointResponseProvider);
    
  const geoVolumeSource = new GeoVolumeSource(
    sparqlEndpointResponseProvider,
    view
  );


  geoVolumeSource.getgeoVolumes().then(() => {
    const geoVolumeWindow = new GeoVolumeWindow(geoVolumeSource, view);

    const sparqlWidget = new SparqlQueryWindow(
      sparqlEndpointResponseProvider,
      configs['sparql_widget'],
      view,
      geoVolumeWindow
    );
  });
});
