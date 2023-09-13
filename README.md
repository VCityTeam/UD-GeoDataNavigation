# UD-GeoDataNavigation
A generic methodology for creating visually integrated views of 3D geospatial data and facilitating navigation between different representations of spatial features

- [internal project page](https://github.com/VCityTeam/VCity/tree/master/Projects/BIM-GIS_integration_diagrams)
- [article in progress](https://github.com/VCityTeam/VCity/tree/master/articles/geospatial_data_integration_CCO_DVA)

**Contents**
- [UD-GeoDataNavigation](#ud-geodatanavigation)
- [Reproducibility](#reproducibility)
  - [GeoVolumes OWL model](#geovolumes-owl-model)
    - [Dependencies](#dependencies)
    - [To run UML to RDF/OWL transformation](#to-run-uml-to-rdfowl-transformation)

# Reproducibility

## GeoVolumes OWL model 
The geovolumes model was recreated in Enterprise Architect and exported to the UML XMI 1.0 format [here](./model/geovolume.xmi). This section discusses how to convert this UML model to and OWL ontology.

![Geovolumes UML model](./model/geovolumes.png)

### Dependencies 
- [ShapeChange](https://shapechange.net/get-started/)

### To run UML to RDF/OWL transformation
```bash
java -jar [path to ShapeChange jar] -Dfile.encoding=UTF-8 -c ./model/shapechange_config.xml
```

