FROM phusion/baseimage:0.9.18
ENV TERM=xterm-color

# Use for force upgrade of ubuntu packages
ENV LAST_UPGRADE=2016-05-17

RUN export DEBIAN_FRONTEND=noninteractive && \
	sed 's/archive.ubuntu.com/mirror.yandex.ru/' -i /etc/apt/sources.list && \
	apt-get -qq -y update && \
	apt-get -qq -y -o Dpkg::Options::="--force-confold" upgrade && \
	apt-get -qq -y install make software-properties-common python-dev libffi-dev libssl-dev python-pip && \
	apt-add-repository -y ppa:ansible/ansible && \
	apt-get -qq -y update && \
	update-ca-certificates --fresh && \
	pip install --upgrade urllib3 pyopenssl ndg-httpsclient pyasn1 && \
	apt-get -qq -y remove python-dev libffi-dev libssl-dev && \
	apt-get -qq -y install ansible && \
	apt-get -qq -y clean

# Perform provision
COPY build/ansible /ansible
RUN export DEBIAN_FRONTEND=noninteractive && \
	export PYTHONUNBUFFERED=true && \
	export ANSIBLE_FORCE_COLOR=true && \
	ansible-galaxy install -r /ansible/requirements.yml && \
	ansible-playbook -c local -e "project_root=/app" /ansible/docker.yml -i /ansible/inventory.ini

# Set working dir for container
RUN mkdir /app
WORKDIR /app

# Copy configs for package managers
COPY package.json npm-shrinkwrap.json \
	/app/

# Install node modules and preinstall composer packages
RUN npm install --silent

# Copy application
COPY . /app

RUN node ./node_modules/.bin/gulp build

# Run all daemons
CMD ["/sbin/my_init"]
