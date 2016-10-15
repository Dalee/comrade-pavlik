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
     * @param {Cache} cache
     */
    constructor(tag, jsonFile, token, providerDef, cache) {
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
        this._cache = cache;
    }

    /**
     * Extract repo list from predefined repository
     *
     * @returns [Repo]
     */
    async getRepoList() {
        debug('app:provider:gitlab')('formatting repository list');
        const repoList = await this._getRepoList();
        for (let repoObj of repoList) {
            await this._fillRefs(repoObj);
        }

        return repoList;
    }

    /**
     * node-gitlab doesn't provide method to get archive, so
     * emulate it here..
     *
     * @param {string} uuid
     * @param {string} ref
     * @param {string} fmt
     * @returns {Request}
     */
    async getArchive(uuid, ref, fmt) {
        debug('app:provider:gitlab')('fetching and streaming archive', uuid, ref);

        let repo = null;
        const repoList = await this._getRepoList();

        for (let repoObj of repoList) {
            if (repoObj.getUuid() === uuid) {
                repo = repoObj;
                break;
            }
        }

        if (repo === null) {
            return null;
        }

        const projectInfo = await this._getProjectInfo(repo.getNamespace());
        if (projectInfo === null) {
            return null;
        }

        // format API endpoint URL
        const endpointUrl = `${this._url}/api/v3/projects/${projectInfo.id}/repository/archive.${fmt}?sha=${ref}`;

        debug('app:provider:gitlab')('streaming project archive', endpointUrl);
        return request({
            url: endpointUrl,
            headers: {
                'PRIVATE-TOKEN': this._token
            }
        });
    }

    /**
     *
     * @returns [Repo]
     * @private
     */
    async _getRepoList() {
        // fetch project info
        const projectInfo = await this._getProjectInfo(this._repoName);
        if (projectInfo === null) {
            return [];
        }

        // fetch raw repo file
        const rawRepoList = await this._getProjectJsonFile(projectInfo, this._repoFile, 'master');
        if (rawRepoList === null) {
            return [];
        }

        return await this._parseRepoList(rawRepoList);
    }

    /**
     * Provide at least one or two arguments to this function
     * such as "resource type" and "resource id". And any
     * number of optional arguments.
     *
     * _formatCacheKey(resource, id, ...)
     *
     * @returns {string}
     * @private
     */
    _formatCacheKey() {
        const cacheKeyList = [this._url];

        for (let i = 0; i < arguments.length; i++) {
            cacheKeyList.push(arguments[i]);
        }

        return cacheKeyList.join('_');
    }

    /**
     * Fetch project info repoNamespace should be like "namespace/project"
     * WARNING: cache should not be used here.
     *
     * @param {string} repoNamespace
     * @returns {Object}
     * @private
     */
    async _getProjectInfo(repoNamespace) {
        debug('app:provider')('fetching project info', repoNamespace);
        return await new Promise((resolve, reject) => {
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
     * @private
     */
    async _getProjectJsonFile(projectInfo, fileName, ref) {
        debug('app:provider')('loading json file', projectInfo.id, fileName, ref);

        // format unique cache id
        const cacheKey = this._formatCacheKey(
            projectInfo.path_with_namespace,
            projectInfo.last_activity_at,
            fileName,
            ref
        );

        let rawRepoList = this._cache.get(cacheKey, null);
        if (!rawRepoList) {
            debug('app:provider')('cache miss, fetching json file', projectInfo.id, fileName, ref);
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
                this._cache.set(cacheKey, rawRepoList);

            } catch (e) {
                rawRepoList = null;
            }
        }

        return rawRepoList;
    }

    /**
     *
     * @param {Array} rawRepoList
     * @returns [Repo]
     * @private
     */
    async _parseRepoList(rawRepoList) {
        const result = [];

        debug('app:provider:gitlab')('parsing raw repository list');
        for (let repoDef of rawRepoList) {
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

        const projectInfo = await this._getProjectInfo(repoObject.getNamespace());
        repoObject.setProjectMetadata(projectInfo);

        await this._loadTags(projectInfo, repoObject);
        await this._loadBranches(projectInfo, repoObject);
        await this._loadRefsMeta(projectInfo, repoObject);

        return repoObject;
    }

    /**
     *
     * @param {Object} projectInfo
     * @param {Repo} repoObject
     * @private
     */
    async _loadTags(projectInfo, repoObject) {
        debug('app:provider:gitlab')('loading tags..', repoObject.getNamespace());
        const tagsCacheKey = this._formatCacheKey(
            'tags',
            projectInfo.path_with_namespace,
            projectInfo.last_activity_at
        );

        let tags = this._cache.get(tagsCacheKey, null);
        if (!tags) {
            debug('app:provider:gitlab')('cache miss, fetching tags', repoObject.getNamespace());
            tags = await new Promise((resolve, reject) => {
                this._gitlabAdapter.projects.repository.listTags(repoObject.getId(), (tags) => {
                    this._cache.set(tagsCacheKey, tags);
                    resolve(tags);
                });
            });
        }

        repoObject.setTags(tags);
    }

    /**
     *
     * @param {Object} projectInfo
     * @param {Repo} repoObject
     * @private
     */
    async _loadBranches(projectInfo, repoObject) {
        debug('app:provider:gitlab')('loading branches', repoObject.getNamespace());
        const branchesCacheKey = this._formatCacheKey(
            'branches',
            projectInfo.path_with_namespace,
            projectInfo.last_activity_at
        );

        let branches = this._cache.get(branchesCacheKey, null);
        if (!branches) {
            debug('app:provider:gitlab')('cache miss, fetching branches', repoObject.getNamespace());
            branches = await new Promise((resolve, reject) => {
                this._gitlabAdapter.projects.repository.listBranches(repoObject.getId(), (branches) => {
                    this._cache.set(branchesCacheKey, branches);
                    resolve(branches);
                });
            });
        }

        repoObject.setBranches(branches);
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
        for (let refDef of refs) {
            if (!repoObject.isRefValid(refDef.name)) {
                continue;
            }

            const refMetadata = await this._getProjectJsonFile(projectInfo, this._jsonFile, refDef.commit.id);
            repoObject.setRefMetadata(refDef, refMetadata || {});
        }

        return repoObject;
    }
}
