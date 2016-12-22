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

import parseURL from 'parse-url';
import path from 'path';
import _ from 'lodash';

/**
 * Represent Repository
 *
 */
export default class Repo {

    /**
     *
     * @param {Object} repoDef
     * @param {string} keyName
     */
    constructor(repoDef, keyName) {
        this._repoDef = repoDef;
        this._repoDef.tag = this._repoDef.tag || [];
        this._keyName = keyName;

        this._uuid = repoDef.uuid || '';
        this._projectInfo = {};
        this._refs = [];
        this._refRemap = {};
        this._metadata = {};
    }

    /**
     *
     * @param projectInfo
     * @returns {Repo}
     */
    setProjectMetadata(projectInfo) {
        this._projectInfo = projectInfo;
        return this;
    }

    /**
     *
     * @param {Object} refDef
     * @param {Object} refMetadata
     * @returns {Repo}
     */
    setRefMetadata(refDef, refMetadata) {
        let refFullData = {};
        _.merge(refFullData, refDef, refMetadata);

        this._metadata[refDef.name] = refFullData;
        return this;
    }

    /**
     *
     * @param {string} refName
     * @returns {Object}
     */
    getRefMetadata(refName) {
        return this._metadata[refName] || {};
    }

    /**
     *
     * @param {string} refName
     * @returns {boolean}
     */
    isRefValid(refName) {
        return refName.indexOf('/') === -1;
    }

    /**
     *
     * @param {string} refName
     * @returns {boolean}
     */
    isRefHasMetadata(refName) {
        return this._metadata[refName].name || false;
    }

    /**
     * Return name defined in composer.json of repository
     *
     * @returns {string}
     */
    getName() {
        let masterMeta = this._metadata["master"] || {};
        return masterMeta.name || '__unknown__';
    }

    /**
     *
     * @param {string} refName
     * @returns {string}
     */
    getRefDisplayName(refName) {
        return this._refRemap[refName] || refName;
    }

    /**
     *
     * @returns {Number}
     */
    getId() {
        return this._projectInfo.id || -1;
    }

    getUuid() {
        return this._uuid;
    }

    /**
     * tags = [{
     *      name: 'tagName',
     *      commit: {
     *          id: 'sha-ref'
     *      }
     *  }, ...
     * ]
     *
     * @param tags
     * @returns {Repo}
     */
    setTags(tags) {
        for (let tagDef of tags) {
            this._refs.push(tagDef);
        }
        return this;
    }

    /**
     * branches = [{
     *      name: 'branch name',
     *      commit: {
     *          id: 'sha-ref'
     *      }
     *  }, ...
     * ]
     */
    setBranches(branches) {
        for (let branchDef of branches) {
            if (!this.isRefValid(branchDef.name)) {
                continue;
            }

            this._refRemap[branchDef.name] = `dev-${branchDef.name}`;
            this._refs.push(branchDef);
        }
        return this;
    }

    /**
     *
     * @returns {Array}
     */
    getRefs() {
        return this._refs;
    }

    /**
     * Get GitLab namespace for project (pp/core, etc..)
     *
     * @returns {String}
     */
    getNamespace() {
        const parsed = parseURL(this._repoDef[this._keyName] || '');
        if (parsed.pathname === '') {
            return '';
        }

        let uri = parsed.pathname;
        uri = [path.dirname(uri), path.basename(uri, '.git')].join('/');
        uri = uri.substr(1); // remove first slash

        return uri;
    }

    /**
     *
     * @returns {boolean}
     */
    hasUuid() {
        const uuid = this._uuid || '';
        return uuid.length > 1;
    }

    /**
     *
     * @param {string} tag
     * @returns {boolean}
     */
    hasRepoTag(tag) {
        return this._repoDef.tag.indexOf(tag) > -1;
    }

    /**
     *
     * @param {string} publicHost
     * @param {string} kind
     * @param {Object} refMetadata
     * @returns {string}
     */
    getDownloadUrl(publicHost, kind, refMetadata) {
        const ref = refMetadata.commit.id;
        const uuid = this.getUuid();

        let ext = "zip";
        switch (kind) {
            case "composer":
                ext = "zip";
                break;

            case "npm":
                ext = "tgz";
                break;
        }

        return `${publicHost}/${kind}/${uuid}/${ref}.${ext}`;
    }

}
