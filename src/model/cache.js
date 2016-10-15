import debug from 'debug';

const TTL = 86400 * 1000;

/**
 * Simple in-memory cache
 */
export default class Cache {

    constructor() {
        this._willExpire = (new Date()).getTime() + TTL;
        this._data = {};
    }

    clearIfExpired() {
        const timestamp = (new Date()).getTime();

        if (timestamp > this._willExpire) {
            this._data = null;
            this._data = {};
            this._willExpire = timestamp + TTL;
            debug('app:cache')('cache expired and dropped');
        }
    }

    /**
     *
     * @param {string} key
     * @returns {boolean}
     */
    hasKey(key) {
        return this._data.hasOwnProperty(key);
    }

    /**
     *
     * @param {string} key
     * @param {*} val
     * @returns {Cache}
     */
    set(key, val) {
        this._data[key] = val;
        return this;
    }

    /**
     *
     * @param {string} key
     * @param {*} defVal
     * @returns {*}
     */
    get(key, defVal) {
        if (!this.hasKey(key)) {
            return defVal;
        }

        return this._data[key];
    }

}
