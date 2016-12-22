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

import {Readable} from 'stream';
import GitlabProvider from './../provider/gitlab';

/**
 * Wrapper for different provider types
 * Just export two methods to deal with
 */
export default class ComposerRegistry {

    /**
     * Create composer registry.
     * Currently only one provider is supported: gitlab_repo
     *
     * @param {string} userToken
     * @param {Object} providerDef
     * @param {Cache} providerCache
     */
    constructor(userToken, providerDef, providerCache) {
        this._provider = new GitlabProvider(
            'composer',
            'composer.json',
            userToken,
            providerDef,
            providerCache
        );
    }

    /**
     * Fetch and format package list from each of provider
     *
     * @param {string} publicHost
     * @returns {Object}
     */
    async getPackageList(publicHost) {
        const packages = {};

        const repoList = await this._provider.getRepoList();
        for (let repo of repoList) {
            const name = repo.getName();
            const refs = repo.getRefs();

            const version = {};
            for (let refInfo of refs) {
                if (!repo.isRefValid(refInfo.name) || !repo.isRefHasMetadata(refInfo.name)) {
                    continue;
                }

                // format metadata
                const refMetadata = repo.getRefMetadata(refInfo.name);
                const downloadUrl = repo.getDownloadUrl(publicHost, "composer", refMetadata);

                const versionInfo = {
                    "name": refMetadata.name,
                    "type": refMetadata.type,
                    "version": repo.getRefDisplayName(refInfo.name),
                    "extra": refMetadata.extra || {},
                    "require": refMetadata.require || {},
                    "require-dev": refMetadata["require-dev"] || {},
                    "autoload": refMetadata.autoload || {},
                    "config": refMetadata.config || {},
                    "bin": refMetadata.bin || [],
                    "dist": {
                        "url": downloadUrl,
                        "type": "zip"
                    }
                };

                const versionName = repo.getRefDisplayName(refInfo.name);
                version[versionName] = versionInfo;
            }

            packages[name] = version;
        }

        return packages;
    }

    /**
     * Get zip stream contents of repository
     *
     * @param {string} uuid
     * @param {string} ref the sha1 hash or branch name to fetch data
     * @returns {Request}
     */
    async getPackage(uuid, ref) {
        const result = await this._provider.getArchive(uuid, ref, "zip");
        return new Readable().wrap(result);
    }
}
