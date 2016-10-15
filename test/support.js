import { compose } from 'glue';

/**
 * Sets up testing server from manifest
 *
 * @returns {*}
 */
export async function getServerInstance() {
    const manifest = require('./manifest');
    const server = await compose(manifest,  {relativeTo: __dirname + '/../src/'});
    await server.start();

    return server;
}
