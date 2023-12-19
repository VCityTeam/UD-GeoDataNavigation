import { JsonRenderer, Table } from "@ud-viz/widget_sparql";
import { D3GraphCanvas } from "./D3GraphCanvas";
import { loadTextFile } from "@ud-viz/utils_browser";
import { GeoVolumeWindow } from "../GeoVolume/GeoVolume/View/GeoVolumeWindow";

/**
 * The SPARQL query window class which provides the user interface for querying
 * a SPARQL endpoint and displaying the endpoint response.
 */
export class SparqlQueryWindow {
  /**
   * Creates a SPARQL query window.
   *
   * @param {SparqlEndpointResponseProvider} sparqlProvider The SPARQL Endpoint Response Provider
   * @param {object} configSparqlWidget The sparqlModule view configuration.
   * @param {object} configSparqlWidget.queries Query configurations
   * @param {object} configSparqlWidget.queries.title The query title
   * @param {object} configSparqlWidget.queries.filepath The path to the file which contains the query text
   * @param {object} configSparqlWidget.queries.formats Configuration for which visualizations are allowed
   *                                              with this query. Should be an object of key, value
   *                                              pairs. The keys of these pairs should correspond
   *                                              with the cases in the updateDataView() function.
   */
  constructor(sparqlProvider, configSparqlWidget, itownsView, geoVolumeWidget) {
    /** @type {HTMLElement} */
    this.domElement = null;

    /** @type {HTMLElement} */
    this.dataView = null;

    this.buttonHide = null;

    this.initHtml();

    this.domElement.classList.add("widget_sparql");
    this.domElement.style.visibility = "hidden";

    this.buttonHide.onclick = () => {
      this.domElement.style.visibility = "hidden";
    };
    const uiDomElement = document.createElement("div");
    uiDomElement.classList.add("full_screen");  
    document.body.appendChild(uiDomElement);
    uiDomElement.appendChild(this.domElement);

    this.configSparqlWidget = configSparqlWidget;
    /**
     * The SPARQL Endpoint Response Provider
     *
     * @type {SparqlEndpointResponseProvider}
     */
    this.sparqlProvider = sparqlProvider;

    /**
     *A reference to the JsonRenderer class
     *
     * @type {JsonRenderer}
     */
    this.jsonRenderer = new JsonRenderer();

    this.itownsView = itownsView;
    /**
     * Contains the D3 graph view to display RDF data.
     *
     * @type {D3GraphCanvas}
     */
    this.d3Graph = new D3GraphCanvas(configSparqlWidget,this.itownsView);

    /**
     * Contains the D3 table to display RDF data.
     *
     * @type {Table}
     */
    this.table = new Table(this);

    /**
     * Store the queries of the SparqlQueryWindow from the config.
     *
     * @type {object}
     */
    this.queries = configSparqlWidget["queries"];

    /**
     * Sets the SparqlEndpointResponseProvider
     * and graph view. Also updates this.queries with the queries declared in the configuration file
     * Should be called by a `SparqlWidgetView`. Once this is done,
     * the window is actually usable ; service event listerers are set here.
     */

    // Get queries from text files and update the this.queries
    const promises = [];
    this.queries.forEach((query) => {
      promises.push(
        loadTextFile(query.filepath).then((result) => {
          query.text = result;
        })
      );
    });

    geoVolumeWidget.addEventListener(
      GeoVolumeWindow.SELECTED_GEOVOLUME_UPDATED,
      (event) => {
        let geoVolume = event.message;
        if (geoVolume.content.length > 0) {
          for (let c of geoVolume.content) {
            if (c.type.includes("sparql")) {
              var li = document.getElementById(c.id);
              var graphButton = document.createElement("button");
              graphButton.className =
                "w3-btn w3-medium w3-bar-item w3-round w3-border w3-right";
              let logo = document.createElement("img");
              logo.src = "../assets/icons/graph.svg";
              logo.width = "20";
              graphButton.appendChild(logo);
              graphButton.onclick = () => {
                Promise.all(promises).then(() => {
                  let index_temp = -1;
                  console.log(c.variantIdentifier);
                  if (c.variantIdentifier == "file") index_temp = 0;
                  if (c.variantIdentifier.includes("GMLID")) index_temp = 1;
                  if (c.variantIdentifier.includes("GUID")) index_temp = 3;
                  if (index_temp != -1) {
                    const query = this.queries[index_temp].text.replaceAll(
                      "$ID",
                      c.variantIdentifier.split("=").slice(-1)[0]
                    );
                    this.d3Graph = new D3GraphCanvas(this.configSparqlWidget,this.itownsView);
                    this.sparqlProvider
                      .querySparqlEndpointService(query)
                      .then((response) =>
                        this.updateDataView(response)
                      );
                  }
                });
              };
              li.appendChild(graphButton);
            }
          }
        }
      }
    );
  }

  /**
   * Update the DataView.
   *
   * @param {object} response A JSON object returned by a SparqlEndpointResponseProvider.EVENT_ENDPOINT_RESPONSE_UPDATED event
   * @param {string} view_type The selected semantic data view type.
   */
  updateDataView(response) {
    console.log(response);

    this.clearDataView();
    this.domElement.style.visibility = "visible";
    this.d3Graph.update(response);
    this.dataView.append(this.d3Graph.canvas);
  }

  /**
   * Clear the DataView of content.
   */
  clearDataView() {
    this.dataView.innerText = "";
    this.dataView.style["height"] = "100%";
    this.dataView.style["overflow"] = "auto";
  }

  /**
   * Initialize the html of the view
   */
  initHtml() {
    this.domElement = document.createElement("div");
    const interfaceElement = document.createElement("div");
    interfaceElement.className = "box-section";
    this.buttonHide = document.createElement("button");
    this.buttonHide.innerText = "Hide";
    interfaceElement.appendChild(this.buttonHide);
    this.domElement.appendChild(interfaceElement);
    this.dataView = document.createElement("div");
    this.dataView.className = "box-selection";
    interfaceElement.appendChild(this.dataView);
  }
}
