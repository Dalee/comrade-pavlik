#!/usr/bin/env bash

#
# begin provision
#

PLAYBOOK="/usr/bin/ansible-playbook"
GALAXY="/usr/bin/ansible-galaxy"

export PYTHONUNBUFFERED=1
export ANSIBLE_FORCE_COLOR=1

if [ ! -f "${PLAYBOOK}" ]; then
	echo "Installing Ansible..."
	apt-get -qq -y update > /dev/null 2>&1
	apt-get -qq -y install make software-properties-common > /dev/null 2>&1
	apt-add-repository -y ppa:ansible/ansible > /dev/null 2>&1
	apt-get -qq -y update > /dev/null 2>&1
	apt-get -qq -y install ansible > /dev/null 2>&1
fi

echo "Installing required roles..."
${GALAXY} \
	install --force \
	-r "${PROJECT_ROOT}/build/ansible/requirements.yml"

echo "Starting provision..."
${PLAYBOOK} \
	-e "project_root"=${PROJECT_ROOT} \
	-e "project_name"=${PROJECT_NAME} \
	-i "${PROJECT_ROOT}/build/ansible/inventory.ini" \
	"${PROJECT_ROOT}/build/ansible/vagrant.yml"
