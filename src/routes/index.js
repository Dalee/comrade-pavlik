import debug from 'debug';
import Joi from 'joi';
import ComposerRegistry from '../registry/composer';
import NpmRegistry from '../registry/npm';
import Cache from '../model/cache';
import FsCache from '../model/fs_cache';
import getTokenFromRequest from '../model/credentials';
import appInfo from '../../package.json';

/**
 *
 * @type {Cache}
 */
const memoryCache = new Cache();
const fsCache = new FsCache(process.env.NPM_CACHE_DIR || '/tmp');
const upstreamRegistry = 'https://registry.npmjs.org';

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
        handler: versionIndex,
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
async function composerIndex(request, reply) {
    memoryCache.clearIfExpired();

    const token = getTokenFromRequest(request);
    const publicHost = getPublicHost(request);
    const registry = new ComposerRegistry(
        token,
        request.server.settings.app.gitlab,
        memoryCache
    );

    debug('app:npm:composerIndex')('fetching package list');
    const packageList = await registry.getPackageList(publicHost);
    reply({"packages": packageList});
}

/**
 * Download composer package
 *
 * @param request
 * @param reply
 */
async function downloadComposerPackage(request, reply) {
    const uuid = request.params.uuid;
    const ref = request.params.ref;
    const token = getTokenFromRequest(request);

    const registry = new ComposerRegistry(
        token,
        request.server.settings.app.gitlab,
        memoryCache
    );

    debug('app:npm:downloadComposerPackage')('fetching archive');
    const response = await registry.getPackage(uuid, ref);
    reply(response);
}


/**
 * Get Package metadata
 *
 * @param request
 * @param reply
 */
async function npmPackageMetadata(request, reply) {
    memoryCache.clearIfExpired();

    // ensure package name is scoped, otherwise, upstreamRedirect to official
    // npmjs registry.
    const fullName = request.params.name;
    const upstreamRedirect = `${upstreamRegistry}/${fullName}`;
    if (fullName.indexOf('@') === -1) {
        debug('app:npm:upstreamRedirect')('redirecting to:', upstreamRedirect);
        reply.redirect(upstreamRedirect);
        return;
    }

    const token = getTokenFromRequest(request);
    const packageName = fullName.substring(fullName.indexOf('/') + 1);
    const publicHost = getPublicHost(request);
    const registry = new NpmRegistry(
        token,
        request.server.settings.app.gitlab,
        memoryCache,
        fsCache
    );

    debug('app:npm:npmPackageMetadata')('searching package', packageName);
    const response = await registry.getPackageJson(publicHost, packageName);

    // not found, redirecting to upstream
    if (response === null) {
        debug('app:npm:upstreamRedirect')('redirecting to:', upstreamRedirect);
        reply.redirect(upstreamRedirect);
        return;
    }

    reply(response);
}

/**
 * Download npm package
 *
 * @param request
 * @param reply
 */
async function downloadNpmPackage(request, reply) {
    const uuid = request.params.uuid;
    const ref = request.params.ref;
    const token = getTokenFromRequest(request);

    const registry = new NpmRegistry(
        token,
        request.server.settings.app.gitlab,
        memoryCache,
        fsCache
    );

    debug('app:npm:downloadNpmPackage')('fetching package');
    const response = await registry.getPackage(uuid, ref);
    reply(response);
}

/**
 * NPM repository service route
 *
 * @param request
 * @param reply
 */
function operationNpm(request, reply) {
    const redirect = `${upstreamRegistry}/-/${request.params.any}`;

    debug('app:npm:redirect')('redirecting to:', redirect);
    reply.redirect(redirect);
}

/**
 * Index route handler
 *
 * @param request
 * @param reply
 */
function versionIndex(request, reply) {
    reply({
        name: "Comrade Pavlik",
        version: appInfo.version
    });
}
