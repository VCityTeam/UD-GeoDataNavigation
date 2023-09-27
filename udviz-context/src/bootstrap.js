/** @format */

import * as udvizBrowser from "@ud-viz/browser";
/* eslint-disable no-new */

udvizBrowser.FileUtil.loadMultipleJSON([
  '../assets/config/all_widget.json',
  '../assets/config/extent_lyon.json',
  '../assets/config/frame3D_planars.json',
  '../assets/config/layer/3DTiles.json',
  '../assets/config/layer/base_maps.json',
  '../assets/config/layer/elevation.json',
  '../assets/config/styles.json',
  '../assets/config/widget/about.json',
  '../assets/config/widget/help.json',
  '../assets/config/widget/temporal.json',
  '../assets/config/widget/sparql_widget.json',
  '../assets/config/server/sparql_server.json'
]).then((configs) => {
  // http://proj4js.org/
  // define a projection as a string and reference it that way
  // the definition of the projection should be in config TODO_ISSUE
  udvizBrowser.proj4.default.defs(
    configs["extent_lyon"].crs,
    "+proj=lcc +lat_1=45.25 +lat_2=46.75" +
      " +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
  );

  const extent = new udvizBrowser.itowns.Extent(
    configs["extent_lyon"].crs,
    parseInt(configs["extent_lyon"].west),
    parseInt(configs["extent_lyon"].east),
    parseInt(configs["extent_lyon"].south),
    parseInt(configs["extent_lyon"].north)
  );

  const app = new udvizBrowser.AllWidget(
    extent,
    configs["all_widget"],
    configs["frame3D_planars"][0]
  );

  const frame3DPlanar = app.getFrame3DPlanar();

  // /// ADD LAYERS
  udvizBrowser.add3DTilesLayers(
    configs["3DTiles"],
    frame3DPlanar.layerManager,
    frame3DPlanar.itownsView
  );

  udvizBrowser.addBaseMapLayer(
    configs["base_maps"][0],
    frame3DPlanar.itownsView,
    extent
  );

  udvizBrowser.addElevationLayer(
    configs["elevation"],
    frame3DPlanar.itownsView,
    extent
  );

  // //// ABOUT MODULE
  const about = new udvizBrowser.Widget.AboutWindow(configs["about"]);
  app.addWidgetView("about", about);

  // //// HELP MODULE
  new udvizBrowser.Widget.HelpWindow(configs["help"]); // => help window should be add with addWidgetView

  // //// 3DTILES DEBUG
  const debug3dTilesWindow = new udvizBrowser.Widget.Debug3DTilesWindow(
    app.getFrame3DPlanar().getLayerManager()
  );
  app.addWidgetView("3dtilesDebug", debug3dTilesWindow, {
    name: "3DTiles Debug",
  });

  // //// CAMERA POSITIONER
  const cameraPosition = new udvizBrowser.Widget.CameraPositionerView(
    app.getFrame3DPlanar().getItownsView()
  );
  app.addWidgetView("cameraPositioner", cameraPosition);

  // //// LAYER CHOICE MODULE
  const layerChoice = new udvizBrowser.Widget.LayerChoice(
    app.getFrame3DPlanar().getLayerManager()
  );
  app.addWidgetView("layerChoice", layerChoice);

  // //// CITY OBJECTS PROVIDER
  const cityObjectProvider = new udvizBrowser.Widget.CityObjectProvider(
    app.getFrame3DPlanar().getLayerManager(),
    configs['styles']
  );


  // //// CITY OBJECTS PROVIDER
  const cityObjectProvider = new udvizBrowser.Widget.CityObjectProvider(
    app.getFrame3DPlanar().getLayerManager(),
    configs['styles']
  );

  // //// CITY OBJECTS MODULE
  const cityObjectModule = new udvizBrowser.Widget.CityObjectModule(
    cityObjectProvider,
    configs['styles']
  );
  app.addWidgetView('cityObjects', cityObjectModule.view);

  // TEMPORAL MODULES
  let temporalProviders = [];
  
  const temporalModule1 = new udvizBrowser.Widget.TemporalModule(
    app.getFrame3DPlanar().getLayerManager().tilesManagers[0],
    configs['temporal']
  );
  
  const temporalModule2 = new udvizBrowser.Widget.TemporalModule(
    app.getFrame3DPlanar().getLayerManager().tilesManagers[1],
    configs['temporal']
  );

  temporalProviders.push(temporalModule1.provider);
  temporalProviders.push(temporalModule2.provider);

  // //// SPARQL MODULE
  const sparqlWorkspaceWidgetView = new udvizBrowser.Widget.Server.SparqlWorkspaceWidgetView(
    new udvizBrowser.Widget.Server.SparqlEndpointResponseProvider(
      configs['sparql_server']
    ),
    cityObjectProvider,
    temporalProviders,
    app.getFrame3DPlanar().getLayerManager(),
    configs['sparql_widget']
  );
  app.addWidgetView('sparqlModule', sparqlWorkspaceWidgetView, {
    name: 'SPARQL Query',
  });
});
