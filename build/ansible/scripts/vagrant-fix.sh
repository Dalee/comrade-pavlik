#!/usr/bin/env bash

#
# set .hushlogin for each vagrant ssh connection
# fix "stdin is not tty" nag message
#

if [ ! -f /home/vagrant/.hushlogin ]; then
	touch /home/vagrant/.hushlogin
fi

if [ -f /root/.profile ]; then
	rm /root/.profile
fi