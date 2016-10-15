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
    switch(kind[1].toLowerCase()) {
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
