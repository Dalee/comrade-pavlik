import request from 'request';
import {Readable} from 'stream';
import semver from 'semver';
import debug from 'debug';
import GitlabProvider from './../provider/gitlab';

import fs from 'fs';
import crypto from 'crypto';

/**
 * Wrapper for different provider types
 * Just export two methods to deal with
 */
export default class NpmRegistry {

    /**
     * Create npm registry.
     * Currently only one provider is supported: gitlab_repo
     *
     * @param {string} userToken
     * @param {Object} providerDef
     * @param {Cache} providerCache
     * @param {FsCache} fsCache
     */
    constructor(userToken, providerDef, providerCache, fsCache) {
        this._provider = new GitlabProvider(
            'npm',
            'package.json',
            userToken,
            providerDef,
            providerCache
        );

        this._fsCache = fsCache;
    }


    async getPackageJson(publicHost, packageName) {
        // two cases, either package is located in our repo
        // or in registry.. so we just call GitLab and fetch repo.json
        // check existence of package
        // and if it's not in our repo, make request to registry.npmjs.org
        // request is support HTTPS_PROXY/HTTP_PROXY environment variables
        // so, if you behind corporate proxy, make sure those
        // environments are set
        const repoList = await this._provider.getRepoList();

        let targetRepo = null;
        for (let repo of repoList) {
            const name = repo.getName();
            if (name === packageName) {
                targetRepo = repo;
                break;
            }
        }

        if (targetRepo === null) {
            return null;
        }

        return await this._formatPackageJson(publicHost, targetRepo);
    }

    /**
     *
     * @param {string} uuid
     * @param {string} ref
     * @returns {Object} Stream2 interface
     */
    async getPackage(uuid, ref) {
        const fileName = this._formatPackageFileName(uuid, ref);
        return this._fsCache.getReadStream(fileName);
    }

    /**
     * Respond with json formatted
     *
     * @param publicHost
     * @param repo
     * @returns {Object}
     * @private
     */
    async _formatPackageJson(publicHost, repo) {
        const name = repo.getName();
        const refs = repo.getRefs();

        const packageData = {
            "name": name,
            "private": true,
            "description": "",
            "license": "UNLICENSED",
            "dist-tags": {},
            "versions": {}
        };

        for (let refInfo of refs) {
            const refName = refInfo.name;

            if (!repo.isRefValid(refName) || !repo.isRefHasMetadata(refName)) {
                debug('app:npm:formatPackageJson')('Ref name is invalid / metadata absent:', refInfo.name);
                continue;
            }

            // check version information
            // input:
            // GitLab tag: vX.X.X
            // GitLab branch: branchname
            //
            // output:
            // tag: X.X.X
            // branch: 0.0.1-branchname
            // TODO: tests..
            //
            let version = repo.getRefDisplayName(refInfo.name);
            if (version.indexOf('v') === 0) {
                version = version.substring(1);
            }
            if (version.indexOf('dev-') !== -1) {
                version = `0.0.1-${version.substring(4)}`;
            }

            // final check..
            if (!semver.valid(version)) {
                debug('app:npm:formatPackageJson')('Ref version is invalid:', version);
                continue;
            }

            const refMetadata = repo.getRefMetadata(refInfo.name);
            const commitId = refMetadata.commit.id;
            const downloadUrl = repo.getDownloadUrl(publicHost, "npm", refMetadata);

            // download package to cache and calculate it sha1 hash
            const cachedFile = await this._downloadPackageToCache(repo.getUuid(), commitId);
            const shasum = await this._calculatePackageSignature(cachedFile);

            // format final json
            packageData["dist-tags"][version] = version;
            if (packageData["description"] === "") {
                packageData["description"] = refMetadata.description || "";
            }

            packageData["versions"][version] = {
                "name": refMetadata.name,
                "version": version,
                "main": refMetadata.main || "",
                "scripts": refMetadata.scripts || {},
                "dependencies": refMetadata.dependencies || {},
                "devDependencies": refMetadata.devDependencies || {},
                "bin": refMetadata.bin || {},
                "dist": {
                    "tarball": downloadUrl, // have to calculate cache here..
                    "shasum": shasum
                }
            };
        }

        return packageData;
    }

    /**
     *
     * @param {string} uuid
     * @param {string} ref
     * @returns {Promise}
     * @private
     */
    async _downloadPackageToCache(uuid, ref) {
        const fileName = this._formatPackageFileName(uuid, ref);
        const inCache = await this._fsCache.hasFile(fileName);
        if (inCache) {
            return fileName;
        }

        const output = this._fsCache.getWriteStream(fileName);
        const archiveReq = await this._provider.getArchive(uuid, ref, "tar.gz");

        debug('app:npm:download-archive')('writing archive:', fileName);
        return new Promise((resolve, reject) => {
            archiveReq.on('error', (err) => {
                reject(err);
            });

            output.on('error', (err) => {
                reject(err)
            });

            output.on('close', () => {
                debug('app:npm:download-archive')('write done:', fileName);
                resolve(fileName);
            });

            archiveReq.pipe(output);
        });
    }

    /**
     *
     * @param fileName
     * @returns {Promise}
     * @private
     */
    async _calculatePackageSignature(fileName) {
        const hash = crypto.createHash('sha1');
        const stream = this._fsCache.getReadStream(fileName);

        return new Promise((resolve, reject) => {
            stream.on('data', (data) => {
                hash.update(data);
            });

            stream.on('error', (err) => {
                reject(err);
            });

            stream.on('end', function () {
                resolve(hash.digest('hex'));
            });
        });
    }

    _formatPackageFileName(uuid, ref) {
        return `${uuid}-${ref}.tgz`;
    }
}
