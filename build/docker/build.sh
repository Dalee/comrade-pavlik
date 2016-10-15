#!/usr/bin/env bash

# if bash_profile is present, load it
if [ -f ~/.bash_profile ]; then
    . ~/.bash_profile
fi

CONFIG_DIR=`dirname $0`
CONFIG_FILE="${CONFIG_DIR}/config.rc"

if [ ! -f "${CONFIG_FILE}" ]; then
    echo "Missed ${CONFIG_FILE} file"
    exit 1
fi
. "${CONFIG_FILE}"

# https://docs.docker.com/engine/reference/builder/#/arg
PROXY_OPTIONS=""
if [ ! -z ${https_proxy} ]; then
    PROXY_OPTIONS="--build-arg https_proxy=${https_proxy} --build-arg http_proxy=${http_proxy}"
fi

docker build ${PROXY_OPTIONS} -t "${IMAGE_NAME}:${IMAGE_NUMBER}" .
CODE=$?

exit ${CODE}
