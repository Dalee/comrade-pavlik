# GitLab npm/composer private repos?

[![](https://images.microbadger.com/badges/image/dalee/comrade-pavlik.svg)](https://microbadger.com/images/dalee/comrade-pavlik "Get your own image badge on microbadger.com")
[![Build Status](https://travis-ci.org/Dalee/comrade-pavlik.svg?branch=master)](https://travis-ci.org/Dalee/comrade-pavlik)

![logo](doc/pavlik.png)

Meet [Comrade Pavlik](https://en.wikipedia.org/wiki/Pavlik_Morozov).
Zero-configuration<sup><a href="#zeroconf">[1]</a></sup> private composer
or/and npm server using GitLab instance as backend.

Working out-of-the-box:
 * npm >= 2.5
 * composer (should work any recent version)
 * GitLab >= 8.x

## Docker image

```bash
docker pull dalee/comrade-pavlik
```

## Project goals

 * GitLab instance as registry backend
 * Easy-to-use as Developer
 * Easy-to-use as CI-server
 * Use docker build process without leaving GitLab passwords or deploy keys in layers
 * Access management via GitLab private tokens
 * Quick and easy install

## What included?

 * Composer private packages
 * NPM private scoped packages
 * Per-user authorization (via GitLab private tokens)

## Prerequisites

Let's assume:
 * You running GitLab instance as `gitlab.example.com`
 * You selected Pavlik domain as `packages.example.com`
 * You created GitLab special repository (see below) with namespace `devops/packages`

So, what you should put to `gitlab.example.com/devops/packages.git`?
All you have to do, just put `repoList.json` with simple structure:

```json
[
  {
    "acme": "git@gitlab.example.com/composer/my-package.git",
    "uuid": "<random generated uuid-v4 #1>",
    "tags": ["composer"]
  },
  {
    "acme": "https://gitlab.example.com/nodejs/my-package.git",
    "uuid": "<random generated uuid-v4 #2>",
    "tags": ["npm"]
  }
  ...
]
```

Where:
 * `acme` - your company key, just any reasonable name, nothing special
 * `uuid` - one time generated, and never changed UUID (grab as much as you want [here](https://www.uuidgenerator.net/))
 * `tags` - list of tags associated with package, currently supported either "composer" or "npm"

So yes, you have to describe every private package you want to use in `repoList.json`.

The one small thing here, you can have multiple company keys, pointing to different repositories,
so, in our case we developing in one GitLab instance and deploying from another. Company keys let you
have single `composer.lock` for those two cases.

## Running

You have at least two options to configure Pavlik:
 * Put configuration options to `.env` file in project root
 * Export configuration options as environment variables

Currently supported configuration options:
 * `GITLAB_URL` - base GitLab domain - `http://gitlab.example.com`
 * `GITLAB_REPO_NAME` - namespace/project with repoList.json file - `devops/packages`
 * `GITLAB_REPO_FILE` - name of repoList file - `repoList.json`
 * `GITLAB_FILE_NAMESPACE` - your company key - `acme`
 * `NPM_CACHE_DIR` - place to store downloaded packages for npm (optional, Pavlik will use `/tmp` by default)

To simplify deployment, you can use prebuild docker [image](https://hub.docker.com/r/dalee/comrade-pavlik/) `dalee/comrade-pavlik`.


## Using

Once Pavlik up and running, you can now use it in your development/deploy process

### Auth

First of all, you need create authorization info:
 * You can use [Python2 script](https://github.com/Dalee/ansible.bootstrap/blob/master/files/pavlik-enable) to generate such info
 * Create `auth.json` for composer and `.npmrc` manually

Sample `auth.json`
```json
{
	"http-basic": {
		"packages.example.com": {
			"username": "gitlab username",
			"password": "gitlab user private token"
		}
	}
}
```

Sample `.npmrc`
```
registry=http://packages.example.com/
//packages.example.com/:_authToken=<gitlab user private token>
```

### Composer

Put Pavlik domain as repository definition
```json
"repositories": [{
   "type": "composer",
   "url": "http://packages.example.com"
}]
```
If you use `http` (which is insecure, but ok for some cases), you have to put config option
to allow composer use insecure repository:

```json
"config": {
    "secure-http": false
}
```

That's it, Pavlik will download `repoList.json`, search for "composer" tag, and will try
match name of your dependency with name in `composer.json` of your package.
If requested dependency name will match name you defined in `composer.json` of your
package - Pavlik will serve this package for you.

### npm

Just use scoped packages. For example:
```json
"dependencies": {
  "@acme/my-package": "^1.0.0"
}
```

Pavlik will download `repoList.json`, search for "npm" tag, and will try to match `my-package` name
with name of `package.json`. If they match, Pavlik will serve package for you.

### CI

Do not put `auth.json` and `.npmrc` under version control!
 * composer - set `COMPOSER_AUTH` environment variable with content of json blob
 * npm - set `NPM_TOKEN` environment variable and create `.npmrc` with following contents:
```
registry=http://packages.example.com/
//packages.example.com/:_authToken=${NPM_TOKEN}
```

## Sample systemd service definition

```
[Unit]
Description=Pavlik docker container
After=docker.service
Requires=docker.service

[Service]
TimeoutStartSec=0
Restart=always
ExecStartPre=-/usr/bin/docker stop %n
ExecStartPre=-/usr/bin/docker rm %n
ExecStart=/usr/bin/docker run --rm --name %n \
        -e "GITLAB_URL=http://gitlab.example.com" \
        -e "GITLAB_REPO_NAME=devops/packages" \
        -e "GITLAB_REPO_FILE=repoList.json" \
        -e "GITLAB_FILE_NAMESPACE=acme" \
        -p 8081:80 \
        pavlik:latest

[Install]
WantedBy=multi-user.target
```

## Notes

Development process
 * Vagrant machine bundled with Pavlik suitable for Development as well as CI-testing
 * Docker build script located in `./build/docker/build.sh`
 * Docker build and test script located `./build/docker/test.sh`

<a id="zeroconf" name="zeroconf">[1] - almost zero, actually</a><br/>

### See also

Those things maybe useful also:
 * [Sinopia](https://github.com/rlidwka/sinopia)
 * [Docker-npmjs](https://github.com/terinjokes/docker-npmjs)
