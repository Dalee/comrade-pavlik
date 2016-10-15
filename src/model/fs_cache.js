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
