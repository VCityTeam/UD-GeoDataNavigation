#!/bin/bash

addgroup --system --gid $BLAZEGRAPH_GID blazegraph
adduser --system --shell /bin/false --no-create-home --uid $BLAZEGRAPH_UID blazegraph
adduser blazegraph blazegraph

# Make sure permissions are good
chown -R blazegraph:blazegraph $BLAZEGRAPH_RW_PATH
chown -R blazegraph:blazegraph /data

sed "s/@@TIMEOUT@@/$BLAZEGRAPH_TIMEOUT/" $BLAZEGRAPH_RW_PATH/readonly_cors.tmp.xml | sed "s/@@READONLY@@/$BLAZEGRAPH_READONLY/" > /data/readonly_cors.xml

su-exec blazegraph:blazegraph \
    java -Xmx$BLAZEGRAPH_MEMORY \
    -Dfile.encoding=UTF-8 \
    -Djetty.port=8080 \
    -Djetty.overrideWebXml=readonly_cors.xml \
    -Dbigdata.propertyFile=blazegraph.properties \
    -cp $BLAZEGRAPH_RW_PATH/blazegraph.jar:$BLAZEGRAPH_RW_PATH/jetty-servlets-9.2.3.v20140905.jar \
    com.bigdata.rdf.sail.webapp.StandaloneNanoSparqlServer
    