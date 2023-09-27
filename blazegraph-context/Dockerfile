FROM openjdk:8-alpine

LABEL maintainer="jey.puget-gil@liris.cnrs.fr, diego.vinasco-alvarez@liris.cnrs.fr"
LABEL authors="balhoff@renci.org, jey.puget-gil@liris.cnrs.fr, diego.vinasco-alvarez@liris.cnrs.fr"


# use --env on the docker run command line to override
ENV BLAZEGRAPH_VERSION=BLAZEGRAPH_RELEASE_2_1_5 \
    JETTY_WEBAPPS=/var/lib/jetty/webapps \
    BLAZEGRAPH_UID=888 \
    BLAZEGRAPH_GID=888 \
    BLAZEGRAPH_RW_PATH=/blazegraph \
    BLAZEGRAPH_TIMEOUT="60000" \
    BLAZEGRAPH_MEMORY="8G"
ENV BLAZEGRAPH_VERSION_URL=https://github.com/blazegraph/database/releases/download/${BLAZEGRAPH_VERSION}/blazegraph.jar

# install dependencies
USER root
RUN apk add --no-cache openssl && \
	apk add --no-cache bash && \
	apk add --no-cache su-exec && \
	apk add --no-cache curl

RUN mkdir $BLAZEGRAPH_RW_PATH \
&& cd $BLAZEGRAPH_RW_PATH \
&& curl -L -O $BLAZEGRAPH_VERSION_URL \
&& curl -L -O 'https://repo1.maven.org/maven2/org/eclipse/jetty/jetty-servlets/9.2.3.v20140905/jetty-servlets-9.2.3.v20140905.jar'

ADD readonly_cors.xml ${BLAZEGRAPH_RW_PATH}/readonly_cors.tmp.xml
ADD entrypoint.sh ${BLAZEGRAPH_RW_PATH}/entrypoint.sh
RUN chmod +x ${BLAZEGRAPH_RW_PATH}/entrypoint.sh

# create the mount point for configuration files
RUN mkdir /data
ADD blazegraph.properties /data/blazegraph.properties

# the port on which Blazegraph will be listening within the container
EXPOSE 8080

# By default, a writable working directory is expected,
# containing blazegraph.properties and blazegraph.jnl
WORKDIR /data

ENTRYPOINT ["/blazegraph/entrypoint.sh"]