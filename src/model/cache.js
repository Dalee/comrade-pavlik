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
