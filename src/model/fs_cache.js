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

import fs from 'fs';
import _ from 'lodash';

/**
 *
 */
export default class FsCache {

    /**
     *
     * @param {string} storageDir
     */
    constructor(storageDir) {
        this._storageDir = storageDir;
        this._storageDir = _.trimEnd(this._storageDir, "/");
    }

    /**
     *
     * @param {string} fileName
     * @returns {Promise}
     */
    async hasFile(fileName) {
        const fileOnDisk = this._mapFileToCache(fileName);

        return new Promise((resolve) => {
            fs.stat(fileOnDisk, (err) => {
                if (err) {
                    resolve(false);
                    return;
                }
                resolve(true);
            });
        });
    }

    // there should be a lock, to prevent simultaneous file write
    // but.. lack of time..
    getWriteStream(fileName) {
        const fileOnDisk = this._mapFileToCache(fileName);
        return fs.createWriteStream(fileOnDisk);
    }

    getReadStream(fileName) {
        const fileOnDisk = this._mapFileToCache(fileName);

        if (this.hasFile(fileName) === false) {
            return null;
        }

        return fs.createReadStream(fileOnDisk);
    }

    /**
     *
     * @param {string} fileName
     * @returns {string}
     * @private
     */
    _mapFileToCache(fileName) {
        fileName = this._sanitizeFileName(fileName);
        return `${this._storageDir}/${fileName}`;
    }

    /**
     *
     * @param {string} fileName
     * @returns {string}
     * @private
     */
    _sanitizeFileName(fileName) {
        // remove all ., .. and / from fileName
        fileName = fileName.split("/").join("");
        fileName = _.trim(fileName, ".");
        fileName = fileName.split("..").join("");

        return fileName;
    }
}
