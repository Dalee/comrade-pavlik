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

import Promise from 'bluebird';
import debug from 'debug';
import request from 'request';
import gitlab from 'gitlab';

import Repo from '../model/repo';

/**
 * GitLab provider
 *
 */
export default class GitlabProvider {

    /**
     *
     * @param {string} tag
     * @param {string} jsonFile
     * @param {string} token
     * @param {Object} providerDef
     */
    constructor(tag, jsonFile, token, providerDef) {
        this._gitlabAdapter = gitlab({
            'url': providerDef.url,
            'token': token
        });

        this._url = providerDef.url;
        this._token = token;

        this._repoName = providerDef.repo;
        this._repoFile = providerDef.json_file;

        this._namespace = providerDef.json_namespace;
        this._searchTag = tag;

        this._jsonFile = jsonFile;
    }

    /**
     * Extract repo list from predefined repository
     *
     * @returns [Repo]
     */
    async getRepoList() {
        debug('app:provider:gitlab')('formatting repository list');

        const repoList = await this._getRepoList();
        await Promise.map(repoList, repoObj => {
            return this._fillRefs(repoObj);
        });

        return repoList;
    }

    /**
     * node-gitlab doesn't provide method to get archive, so
     * emulate it here..
     *
     * @param {string} uuid
     * @param {string} ref
     * @param {string} fmt
     * @returns {Request|null}
     */
    async getArchive(uuid, ref, fmt) {
        let repo;

        debug('app:provider:gitlab')('fetching and streaming archive', uuid, ref);
        const repoList = await this._getRepoList();
        for (const repoObj of repoList) {
            if (repoObj.getUuid() === uuid) {
                repo = repoObj;
                break;
            }
        }

        if (!repo) {
            return null;
        }

        try {
            const projectInfo = await this._getProjectInfo(repo.getNamespace());
            const endpointUrl = `${this._url}/api/v3/projects/${projectInfo.id}/repository/archive.${fmt}?sha=${ref}`;

            debug('app:provider:gitlab')('streaming project archive', endpointUrl);
            return request({
                url: endpointUrl,
                headers: {
                    'PRIVATE-TOKEN': this._token
                }
            });

        } catch (e) {
            debug('app:provider:gitlab')('streaming project archive error:', e);
            return null;
        }
    }

    /**
     *
     * @returns {Array}
     * @private
     */
    async _getRepoList() {
        try {
            const projectInfo = await this._getProjectInfo(this._repoName);
            const rawRepoList = await this._getProjectJsonFile(projectInfo, this._repoFile, 'master');
            return this._parseRepoList(rawRepoList);

        } catch (e) {
            debug('app:provider:gitlab')('error', e);
            return [];
        }
    }

    /**
     *
     * @param {string} repoNamespace
     * @returns {Object}
     * @private
     */
    _getProjectInfo(repoNamespace) {
        return new Promise((resolve, reject) => {
            this._gitlabAdapter.projects.show(repoNamespace, (project) => {
                resolve(project);
            });
        });
    }

    /**
     * Fetch and parse JSON file from Repository
     *
     * @param {Object} projectInfo
     * @param {string} fileName
     * @param {string} ref
     * @returns {Array}
     * @private
     */
    async _getProjectJsonFile(projectInfo, fileName, ref) {
        let rawRepoList;

        const rawFile = await new Promise((resolve, reject) => {
            this._gitlabAdapter.projects.repository.showFile(projectInfo.id, {
                ref: ref,
                file_path: fileName
            }, (file) => {
                resolve(file || {});
            });
        });

        try {
            rawRepoList = new Buffer(rawFile.content || '', 'base64').toString();
            rawRepoList = JSON.parse(rawRepoList);

        } catch (e) {
            rawRepoList = null;
        }


        return rawRepoList;
    }

    /**
     *
     * @param {Array} rawRepoList
     * @returns {Array}
     * @private
     */
    _parseRepoList(rawRepoList) {
        const result = [];

        debug('app:provider:gitlab')('parsing raw repository list');
        for (const repoDef of rawRepoList) {
            const repoObject = new Repo(repoDef, this._namespace);

            // does repo object fulfill all requirements?
            // - it has valid uuid
            // - it has required tag (e.g. "composer")
            if (!repoObject.hasUuid()) {
                continue;
            }

            if (repoObject.hasRepoTag(this._searchTag)) {
                result.push(repoObject);
            }
        }

        return result;
    }

    /**
     *
     * @param {Repo} repoObject
     * @returns {Repo}
     * @private
     */
    async _fillRefs(repoObject) {
        debug('app:provider:gitlab')('filling refs for project', repoObject.getNamespace());

        try {
            const projectInfo = await this._getProjectInfo(repoObject.getNamespace());
            repoObject.setProjectMetadata(projectInfo);

            await Promise.all([
                this._loadTags(repoObject),
                this._loadBranches(repoObject),
                this._loadRefsMeta(projectInfo, repoObject)
            ]);

            return repoObject;

        } catch (e) {
            debug('app:provider:gitlab')('filling refs for project error:', e);
            return null;
        }
    }

    /**
     *
     * @param {Repo} repoObject
     * @private
     */
    async _loadTags(repoObject) {
        return new Promise((resolve, reject) => {
            this._gitlabAdapter.projects.repository.listTags(repoObject.getId(), (tags) => {
                repoObject.setTags(tags);
                resolve(tags);
            });
        });
    }

    /**
     *
     * @param {Repo} repoObject
     * @private
     */
    async _loadBranches(repoObject) {
        return new Promise((resolve, reject) => {
            this._gitlabAdapter.projects.repository.listBranches(repoObject.getId(), (branches) => {
                repoObject.setBranches(branches);
                resolve(branches);
            });
        });
    }

    /**
     *
     * @param {Object} projectInfo
     * @param {Repo} repoObject
     * @private
     */
    async _loadRefsMeta(projectInfo, repoObject) {
        debug('app:provider:gitlab')('loading refs metadata..', repoObject.getNamespace());

        const refs = repoObject.getRefs();
        for (const refDef of refs) {
            if (!repoObject.isRefValid(refDef.name)) {
                continue;
            }

            const refMetadata = await this._getProjectJsonFile(projectInfo, this._jsonFile, refDef.commit.id);
            repoObject.setRefMetadata(refDef, refMetadata || {});
        }

        return repoObject;
    }
}
