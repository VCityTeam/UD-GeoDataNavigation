import { Graph } from "@ud-viz/widget_sparql";

import * as d3 from "d3";
import { getUriLocalname, tokenizeURI } from "@ud-viz/utils_browser";
import * as THREE from "three";

export class D3GraphCanvas extends THREE.EventDispatcher {
  /**
   * Create a new D3 graph from an RDF JSON object.
   * Adapted from https://observablehq.com/@d3/force-directed-graph#chart and
   * https://www.d3indepth.com/zoom-and-pan/
   *
   * @param {object} configSparqlWidget The sparqlModule configuration.
   * @param {number} configSparqlWidget.height The SVG canvas height.
   * @param {number} configSparqlWidget.width The SVG canvas width.
   * @param {number} configSparqlWidget.fontSize The font size to use for node and link labels.
   * @param {object} configSparqlWidget.namespaceLabels Prefix declarations which will replace text labels in the Legend.
   *                                                    This doesn't (yet) affect the legend font size.
   */
  constructor(configSparqlWidget, itownsView) {
    super();
    if (
      !configSparqlWidget ||
      !configSparqlWidget.height ||
      !configSparqlWidget.width ||
      !configSparqlWidget.fontSize
    ) {
      console.log(configSparqlWidget);
      throw 'The given "configSparqlWidget" configuration is incorrect.';
    }
    this.itownsView = itownsView;
    this.height = configSparqlWidget.height;
    this.width = configSparqlWidget.width;
    this.fontSize = configSparqlWidget.fontSize;
    this.knownNamespaceLabels = configSparqlWidget.namespaceLabels;
    this.svg = d3
      .create("svg")
      .attr("class", "d3_graph")
      .attr("viewBox", [0, 0, this.width, this.height])
      .style("display", "hidden");
    this.data = new Graph();
    this.colorSetOrScale = d3.scaleOrdinal(d3.schemeCategory10);
  }

  // / Data Functions ///

  /**
   * Clear and update the d3 SVG canvas based on the data from a graph dataset. Also apply event dispatchers
   *
   * @param {object} response an RDF JSON object ideally formatted by this.formatResponseData().
   */
  update(response) {
    this.clearCanvas();
    this.data.formatResponseData(response);
    console.log(this.data.typeList);
    this.data.typeList.forEach((el, i) => {
      this.data.typeList[i] = el.split("#").slice(-1);
    });
    const links = this.data.links.map((d) => Object.create(d));
    const nodes = this.data.nodes.map((d) => Object.create(d));

    const legend = this.prefixLegend(this.data.typeList);
    const colorScale = this.colorSetOrScale;
    const setColor = function (d, default_color, override_color = undefined) {
      if (override_color && colorScale) return override_color;
      else if (colorScale) return colorScale(d);
      return default_color;
    };

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d) => d.id)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2));

    const zoom = d3.zoom().on("zoom", this.handleZoom);

    this.svg.call(zoom);

    const link = this.svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.8)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => Math.sqrt(d.value));

    const node = this.svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 4)
      .attr("stroke-opacity", 0.8)
      .attr("stroke-width", 0.75)
      .attr("stroke", (d) => setColor(d.color_id, "#ddd", "#111"))
      .attr("fill", (d) => setColor(d.color_id, "black"))
      .on("click", (event, datum) => {
        this.itownsView
          .getLayers()
          .filter((el) => el.isC3DTilesLayer)
          .forEach((layer) => {
            layer.selectedObjectId = this.data.nodes[datum.index].id
              .split("#")
              .slice(-1);
            layer.updateStyle();
            this.itownsView.notifyChange();
          });
        this.dispatchEvent({
          type: "click",
          message: "node click event",
          event: event,
          datum: datum,
        });
      })
      .on("mouseover", (event, datum) => {
        event.target.style["stroke"] = setColor(
          nodes[datum.index].color_id,
          "white",
          "white"
        );
        event.target.style["fill"] = setColor(
          nodes[datum.index].color_id,
          "#333"
        );
        node_label
          .filter((e, j) => {
            return datum.index != j;
          })
          .style("visibility", "hidden");
        node_label
          .filter((e, j) => {
            return datum.index == j;
          })
          .text(function (d) {
            return getUriLocalname(d.id);
          })
          .style("fill", "white")
          .style("opacity", "1");
        link_label
          .filter((e) => {
            return datum.index == e.target.index;
          })
          .style("fill", "white")
          .style("visibility", "visible");
        this.dispatchEvent({
          type: "mouseover",
          message: "node mouseover event",
          event: event,
          datum: datum,
        });
      })
      .on("mouseout", (event, datum) => {
        event.target.style["stroke"] = setColor(
          nodes[datum.index].color_id,
          "#ddd",
          "#111"
        );
        event.target.style["fill"] = setColor(
          nodes[datum.index].color_id,
          "black"
        );
        node_label
          .filter((e, j) => {
            return datum.index != j;
          })
          .style("visibility", "visible");
        node_label
          .filter((e, j) => {
            return datum.index == j;
          })
          .text(function (d) {
            return getUriLocalname(d.id);
          })
          .style("fill", "white");
        link_label
          .filter((e) => {
            return (
              datum.index == e.source.index || datum.index == e.target.index
            );
          })
          .style("fill", "grey")
          .style("visibility", "hidden");
        this.dispatchEvent({
          type: "mouseout",
          message: "node mouseout event",
          event: event,
          datum: datum,
        });
      })
      .call(this.drag(simulation));

    node.append("title").text((d) => d.id);

    const node_label = this.svg
      .selectAll(".node_label")
      .data(nodes)
      .enter()
      .append("text")
      .text(function (d) {
        return getUriLocalname(d.id);
      })
      .style("text-anchor", "middle")
      .style("font-family", "Arial")
      .style("font-size", this.fontSize)
      .style("text-shadow", "1px 1px black")
      //   .style('fill', 'grey')
      // .style('opacity', '0.5')
      .style("fill", "white")
      .style('visibility', 'visible')
      .style("pointer-events", "none")
      .attr("class", "node_label");

    const link_label = this.svg
      .selectAll(".link_label")
      .data(links)
      .enter()
      .append("text")
      .text(function (d) {
        return getUriLocalname(d.label);
      })
      .style("text-anchor", "middle")
      .style("font-family", "Arial")
      .style("font-size", this.fontSize)
      .style("text-shadow", "1px 1px black")
      .style("fill", "white")
      // .style("opacity", "0.5")
      // .style('fill', 'white')
      .style("visibility", "hidden")
      .style("pointer-events", "none")
      .attr("class", "link_label");

    simulation.on("tick", () => {
      node_label
        .attr("x", function (d) {
          return d.x;
        })
        .attr("y", function (d) {
          return d.y - 10;
        });
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      link_label
        .attr("x", function (d) {
          return (d.source.x + d.target.x) / 2;
        })
        .attr("y", function (d) {
          return (d.source.y + d.target.y) / 2;
        });
      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    // Create legend
    // this.svg
    //   .append('text')
    //   .attr('x', 12)
    //   .attr('y', 24)
    //   .style('font-size', '4px')
    //   .style('text-decoration', 'underline')
    //   .text('Legend')
    //   .style('fill', 'FloralWhite');

    // legend colors
    this.svg
      .append("g")
      .attr("stroke", "#111")
      .attr("stroke-width", 1)
      .selectAll("rect")
      .data(legend)
      .join("rect")
      .attr("x", (d, i) => (2 + 30 * (i % 3)).toString() + "%")
      .attr("y", (d, i) => (90 + 5 * Math.floor(i / 3)).toString() + "%")
      .attr("width", 5)
      .attr("height", 5)
      .style("fill", (d, i) => {
        return setColor(i, "#000");
      })
      .append("title")
      .text((d) => d);

    // legend text
    this.svg
      .append("g")
      .selectAll("text")
      .data(legend)
      .join("text")
      .attr("x", (d, i) => (6 + 30 * (i % 3)).toString() + "%")
      .attr("y", (d, i) => (92 + 5 * Math.floor(i / 3)).toString() + "%")
      .text((d) => d)
      .style("fill", "FloralWhite")
      .style("font-size", "6px");
  }

  /**
   * Getter for retrieving the d3 svg.
   *
   * @returns {d3.svg.node} return the D3 svg object that represents the graph's "canvas"
   */
  get canvas() {
    return this.svg.node();
  }

  /**
   * Hide the graph SVG
   */
  hide() {
    this.svg.style("display", "hidden");
  }

  /**
   * Show the graph SVG
   */
  show() {
    this.svg.style("display", "visible");
  }

  /**
   * Remove nodes and lines from the SVG.
   */
  clearCanvas() {
    this.svg.selectAll("g").remove();
    this.svg.selectAll("text").remove();
  }

  // / Interface Functions ///

  /**
   * Create a drag effect for graph nodes within the context of a force simulation
   *
   * @param {d3.forceSimulation} simulation The active D3 force simulation of the graph
   * @returns {d3.drag} a D3 drag function to enable dragging nodes within the graph
   */
  drag(simulation) {
    /**
     *
     * @param {d3.D3DragEvent} event the drag event containing information on which node is being clicked and dragged
     */
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    /**
     *
     * @param {d3.D3DragEvent} event the drag event containing information on which node is being clicked and dragged
     */
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    /**
     *
     * @param {d3.D3DragEvent} event the drag event containing information on which node is being clicked and dragged
     */
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  /**
   * A handler function for selecting elements to transform during a zoom event
   *
   * @param {d3.D3ZoomEvent} event the zoom event containing information on how the svg canvas is being translated and scaled
   */
  handleZoom(event) {
    d3.selectAll("svg g")
      .filter((d, i) => i < 2)
      .attr("height", "100%")
      .attr("width", "100%")
      // .attr('transform', event.transform)
      .attr(
        "transform",
        "translate(" +
          event.transform.x +
          "," +
          event.transform.y +
          ") scale(" +
          event.transform.k +
          ")"
      );
    d3.selectAll("text.node_label")
      .style("font-size", this.fontSize / event.transform.k + "px")
      .attr(
        "transform",
        "translate(" +
          event.transform.x +
          "," +
          event.transform.y +
          ") scale(" +
          event.transform.k +
          ")"
      );
    d3.selectAll("text.link_label")
      .style("font-size", this.fontSize / event.transform.k + "px")
      .attr(
        "transform",
        "translate(" +
          event.transform.x +
          "," +
          event.transform.y +
          ") scale(" +
          event.transform.k +
          ")"
      );
  }

  /**
   * Check if a list of URIs have namespaces in the known namespace list. If so, replace
   * the namespace of the URI with a prefix. The known namespace list is declared in a
   * configuration file.
   *
   * @param {Array<string>} legendContent the list of uris representing the content of the legend0
   * @returns {Array<string>} returns the legend content with prefixes
   */
  prefixLegend(legendContent) {
    const prefixedLegendContent = [];
    for (const uri in legendContent) {
      const tURI = tokenizeURI(legendContent[uri]);
      if (Object.keys(this.knownNamespaceLabels).includes(tURI.namespace)) {
        prefixedLegendContent.push(
          `${this.knownNamespaceLabels[tURI.namespace]}:${tURI.localname}`
        );
      } else {
        prefixedLegendContent.push(legendContent[uri]);
      }
    }
    return prefixedLegendContent;
  }
}
