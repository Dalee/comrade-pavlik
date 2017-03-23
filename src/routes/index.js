/*
 * Copyright 2016 Dalee Digital Agency
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import debug from 'debug';
import Joi from 'joi';
import _ from 'lodash';
import ComposerRegistry from '../registry/composer';
import NpmRegistry from '../registry/npm';
import FsCache from '../model/fs_cache';
import getTokenFromRequest from '../model/credentials';
import Pack from '../../package.json';

const fsCache = new FsCache(process.env.NPM_CACHE_DIR || '/tmp');
const upstreamNpmRegistry = 'https://registry.npmjs.org';

/**
 * get current public host
 *
 * @param request
 * @returns {string}
 */
function getPublicHost(request) {
    const scheme = request.info.protocol || 'http';
    const host = request.info.host || 'localhost';

    return `${scheme}://${host}`;
}

/**
 * Index routes
 */
export default [
    {
        method: 'GET',
        path: "/",
        handler: healthCheck,
        config: {
            description: 'version info',
            tags: ["api"]
        }
    },
    {
        method: 'GET',
        path: '/packages.json',
        handler: composerIndex,
        config: {
            description: 'packages.json response',
            tags: ['api', 'composer'],
            validate: {
                headers: Joi.object({
                    'authorization': Joi.string().required()
                }).options({allowUnknown: true})
            }
        }
    },
    {
        method: 'GET',
        path: "/composer/{uuid}/{ref}.zip", // check Repo.getDownloadUrl
        handler: downloadComposerPackage,
        config: {
            description: 'composer: download a package',
            tags: ['api', 'composer'],
            validate: {
                params: {
                    uuid: Joi.string().required(),
                    ref: Joi.string().alphanum().required()
                },
                headers: Joi.object({
                    'authorization': Joi.string().required()
                }).options({allowUnknown: true})
            }
        }
    },
    {
        method: 'GET',
        path: "/{name}",
        handler: npmPackageMetadata,
        config: {
            description: 'npm: get package metadata',
            tags: ['api', 'npm'],
            validate: {
                params: {
                    name: Joi.string().required()
                },
                headers: Joi.object({
                    'authorization': Joi.string().required()
                }).options({allowUnknown: true})
            }
        }
    },
    {
        method: 'GET',
        path: "/npm/{uuid}/{ref}.tgz",
        handler: downloadNpmPackage,
        config: {
            description: 'npm: download a package', // check Repo.getDownloadUrl
            tags: ['api', 'npm'],
            validate: {
                params: {
                    uuid: Joi.string().required(),
                    ref: Joi.string().alphanum().required()
                },
                headers: Joi.object({
                    'authorization': Joi.string().required()
                }).options({allowUnknown: true})
            }
        }
    },
    {
        method: ['GET', 'PUT', 'POST'],
        path: "/-/{any*}",
        handler: operationNpm,
        config: {
            description: 'npm: search action',
            tags: ['api', 'npm']
        }
    }
];

/**
 * Response with package.json
 *
 * @param request
 * @param reply
 */
function composerIndex(request, reply) {
    const token = getTokenFromRequest(request);
    const publicHost = getPublicHost(request);
    const registry = new ComposerRegistry(
        token,
        request.server.settings.app.gitlab
    );

    debug('app:npm:composerIndex')('fetching package list');
    reply({
        'packages': registry.getPackageList(publicHost)
    });
}

/**
 * Download composer package
 *
 * @param request
 * @param reply
 */
function downloadComposerPackage(request, reply) {
    const uuid = request.params.uuid;
    const ref = request.params.ref;
    const token = getTokenFromRequest(request);

    const registry = new ComposerRegistry(
        token,
        request.server.settings.app.gitlab
    );

    debug('app:npm:downloadComposerPackage')('fetching archive');
    reply(registry.getPackage(uuid, ref));
}


/**
 * Get Package metadata
 *
 * @param request
 * @param reply
 */
function npmPackageMetadata(request, reply) {
    // ensure package name is scoped, otherwise, upstreamRedirect to official
    // npmjs registry.
    const fullName = request.params.name;
    const upstreamRedirect = `${upstreamNpmRegistry}/${fullName}`;
    if (fullName.indexOf('@') === -1) {
        debug('app:npm:upstreamRedirect')('redirecting to:', upstreamRedirect);
        return reply.redirect(upstreamRedirect);
    }

    const token = getTokenFromRequest(request);
    const packageName = fullName.substring(fullName.indexOf('/') + 1);
    const publicHost = getPublicHost(request);
    const registry = new NpmRegistry(
        token,
        request.server.settings.app.gitlab,
        fsCache
    );

    debug('app:npm:npmPackageMetadata')('searching package', packageName);
    const response = registry.getPackageJson(publicHost, packageName);

    // not found, redirecting to upstream
    if (response === null) {
        debug('app:npm:upstreamRedirect')('redirecting to:', upstreamRedirect);
        return reply.redirect(upstreamRedirect);
    }

    reply(response);
}

/**
 * Download npm package
 *
 * @param request
 * @param reply
 */
function downloadNpmPackage(request, reply) {
    const uuid = request.params.uuid;
    const ref = request.params.ref;
    const token = getTokenFromRequest(request);

    const registry = new NpmRegistry(
        token,
        request.server.settings.app.gitlab,
        fsCache
    );

    debug('app:npm:downloadNpmPackage')('fetching package');
    reply(registry.getPackage(uuid, ref));
}

/**
 * NPM repository service route
 *
 * @param request
 * @param reply
 */
function operationNpm(request, reply) {
    const redirect = `${upstreamNpmRegistry}/-/${request.params.any}`;

    debug('app:npm:redirect')('redirecting to:', redirect);
    reply.redirect(redirect);
}

/**
 * Index route handler
 *
 * @param request
 * @param reply
 */
function healthCheck(request, reply) {
    reply(_.pick(Pack, ['name', 'version']));
}
