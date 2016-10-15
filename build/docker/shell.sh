#!/usr/bin/env bash

NAME="$1"
BUILD="$2"

[ -z "$NAME" ] && echo "Usage: $0 <name> [<build>]" && exit 1
[ -z "$BUILD" ] && BUILD=$(sudo docker images "$NAME" | tail -n +2 | head -1 | awk '{print $2}')

echo "Open bash in $NAME:$BUILD..."
sudo docker run --rm -ti "$NAME:$BUILD" /sbin/my_init -- bash
