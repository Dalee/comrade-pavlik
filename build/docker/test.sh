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

echo "Run tests and coverage..."

#
# run tests and coverage and write results to COVERAGE_DIR
#
docker-compose -f build/docker/docker-compose.test.yml \
    up --abort-on-container-exit --force-recreate

#
# determine exit code
#
CODE=`docker-compose -f build/docker/docker-compose.test.yml ps -q \
    | xargs docker inspect -f '{{ .State.ExitCode }}' \
    | grep -v 0 \
    | wc -l \
    | tr -d ' '`

if [ $CODE -eq 0 ]; then
    #
    # copy generated coverage to project root
    #
    if [ -d "${HOST_COVERAGE_DIR}" ]; then
        rm -rf "${HOST_COVERAGE_DIR}"
    fi

    docker cp \
        "${CONTAINER_NAME}:${CONTAINER_COVERAGE_DIR}" "${HOST_COVERAGE_DIR}"
fi

#
# destroy containers
#
docker-compose -f build/docker/docker-compose.test.yml rm --all -fv

exit $CODE
