# UD-GeoDataNavigation

A generic methodology for creating visually integrated views of 3D geospatial data and facilitating navigation between different representations of spatial features

**Contents**

- [Demo Installation](#demo-installation)
  - [Pre-requisites](#pre-requisites)
  - [Component Setup](#component-setup)
  - [Build Images and run containers](#build-images-and-run-containers)
  - [Upload RDF-Store Dataset](#upload-rdf-store-dataset)
- [Repository setup](#repository-setup)
- [GeoVolumes OWL model](#geovolumes-owl-model)
  - [Dependencies](#dependencies)
  - [To run UML to RDF/OWL transformation](#to-run-uml-to-rdfowl-transformation)
- [GeoVolumes data](#geovolumes-data)
  - [To run the JSON to RDF transformation](#to-run-the-json-to-rdf-transformation)


## Demo Installation

How to install and run the UD-Viz based UD-GeoDataNavigation demo.

### Pre-requisites

- [Install Docker](https://docs.docker.com/engine/install/)
- Install node/npm use the versions recommended by the [UD-Viz documentation](https://github.com/VCityTeam/UD-Viz#getting-started)

### Component Setup

1. To configure the demo and the components that support it create a `.env` file at the root of this repository. The arguments in this file will be used by docker compose.

```bash
touch .env
```

2. Edit the `.env` file to set the ports to be used by docker compose.
   For example:

```bash
#### UD-Viz
UD_VIZ_PORT=8000

#### BlazeGraph
BLAZEGRAPH_PORT=8001
```

### Build Images and run containers

Build the Blazegraph docker image and run its container:

```
docker compose up
```

### Upload RDF-Store Dataset

Upload files into the RDF-store :

1. Open a web browser and navigate to [localhost:8001/blazegraph](http://localhost:8001/blazegraph)
2. Click on the _UPDATE_ tab
3. Add the 3 files from the [blazegraph_graph](./data/blazegraph_graph/) directory
4. Click _Update_ after selecting a file.

Now the UD-Viz demo is ready and can be accessed from [localhost:8000](http://localhost:8000)

## GeoVolumes OWL model

The geovolumes model was recreated in Enterprise Architect and exported to the UML XMI 1.0 format [here](./model/geovolume.xmi).
This section discusses how to convert this UML model to and OWL ontology.

![Geovolumes UML model](./model/geovolumes.png)

### Dependencies

- [ShapeChange](https://shapechange.net/get-started/)
- [ShapeChange output patcher](https://github.com/VCityTeam/UD-Graph/tree/master/Transformations/ShapeChange#to-run-the-ontology-patcher)
  - Download with `wget -O ./lib/ontologyPatcher.py https://raw.githubusercontent.com/VCityTeam/UD-Graph/master/Transformations/ShapeChange/ontologyPatcher.py`
- [Python3](https://www.python.org/downloads/)
  - Install [Rdflib](https://pypi.org/project/rdflib/) with `pip install rdflib`

### To run UML to RDF/OWL transformation

First convert the UML model to OWL with ShapeChange

```bash
java -jar '[path to ShapeChange jar]' -Dfile.encoding=UTF-8 -c ./model/shapechange_config.xml
```

Then use the ontology patcher python script to clean up inconsitencies in the ontology

```bash
python3 ./lib/ontologyPatcher.py ./model/INPUT/geovolumes/geovolumes.ttl ./model/INPUT/geovolumes/geovolumes_patched.ttl
```

Optionally, the properties named with local scopes `geov:3DContainer.link`, `geov:Collections.link`, `geov:3DContainer.spatial`, `geov:Content.spatial`, `geov:3DContainer.temporal`, and `geov:Content.temporal` can be removed and replaced with the following triples with a global scope.

```sql
geov:spatial a owl:ObjectProperty ;
    rdfs:label "spatial"@en ;
    rdfs:domain geov:3DContainer, geov:Content ;
    rdfs:range geov:SpatialExtent .

geov:temporal a owl:ObjectProperty ;
    rdfs:label "temporal"@en ;
    rdfs:domain geov:3DContainer, geov:Content ;
    rdfs:range geov:TemporalExtent .

geov:link a owl:ObjectProperty ;
    rdfs:label "link"@en ;
    rdfs:domain geov:3DContainer, geov:Collections ;
    rdfs:range geov:Link .
```

References to these properties must also be refactored to match their new identifiers.

## GeoVolumes data

The GeoVolumes data was initial created in JSON.
It was transformed to RDF/Turtle using [YAAARML's](https://rml.io/yarrrml/) [Matey](https://rml.io/yarrrml/matey/) tool.

### To run the JSON to RDF transformation

1. Open the [Matey](https://rml.io/yarrrml/matey/) tool in a web browser.
2. Copy+paste the contents of the first `*.json` file from the [./data](./data) folder into the **"Input: Data"** field of Matey.
3. Copy+paste the contents of the [./data/geov_json2ttl.yaml](./data/geov_json2ttl.yaml) file into the **"Input: YARRRML"** field of Matey.
4. Click the **Generate RML** button.
5. Click the **Generate LD** button.
6. The results of the transformation are produced in the **Output: Knowledge Graph** field which can be downloaded.
