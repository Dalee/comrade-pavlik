FROM phusion/baseimage:0.9.19

CMD ["/sbin/my_init"]
ENV LAST_UPGRADE=2016-05-17

RUN export DEBIAN_FRONTEND=noninteractive && \
	sed 's/archive.ubuntu.com/mirror.yandex.ru/' -i /etc/apt/sources.list && \
	apt-get -qq -y update && \
	apt-get -qq -y -o Dpkg::Options::="--force-confold" upgrade && \
	apt-get -qq -y install make software-properties-common && \
	apt-add-repository -y ppa:ansible/ansible && \
	apt-get -qq -y update && \
	update-ca-certificates --fresh && \
	apt-get -qq -y install ansible && \
	apt-get -qq -y clean

COPY build/ansible /ansible
RUN export DEBIAN_FRONTEND=noninteractive && \
	export PYTHONUNBUFFERED=true && \
	export ANSIBLE_FORCE_COLOR=true && \
	ansible-galaxy install -r /ansible/requirements.yml && \
	ansible-playbook -c local -e "project_root=/app" /ansible/docker.yml -i /ansible/inventory.ini


RUN mkdir /app
WORKDIR /app


COPY package.json npm-shrinkwrap.json /app/
RUN npm install --silent
COPY . /app

RUN node ./node_modules/.bin/gulp build
