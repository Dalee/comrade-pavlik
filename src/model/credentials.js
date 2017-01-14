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

/**
 * Extract password from request (either http-basic or bearer)
 *
 * @param {Object} request
 * @returns {*}
 */
export default function getTokenFromRequest(request) {
    const extractor = /^(.+) (.+)$/;
    const headers = request.headers || {};
    const kind = extractor.exec(headers.authorization || '');

    if (kind === null) {
        return null;
    }

    let token = null;
    switch (kind[1].toLowerCase()) {
        case 'basic':
            token = extractBasic(kind[2]);
            break;

        case 'bearer':
            token = kind[2];
            break;
    }

    return token;
}

function extractBasic(payloadRaw) {
    const extractor = /(.+):(.+)/;
    const payload = new Buffer(payloadRaw, 'base64').toString();
    const parsed = extractor.exec(payload);

    if (parsed === null) {
        return null;
    }

    return parsed[2];
}
