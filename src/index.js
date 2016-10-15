import Promise from 'bluebird';
import { compose } from 'glue';

global.Promise = Promise;

/**
 * Starts server
 *
 * @returns {*}
 */
async function startServer() {
    const manifest = require('./manifest');
    const server = await compose(manifest, {relativeTo: __dirname});
    await server.start();

    return server;
}

startServer()
    .then(server => {
        server.log('info', `Server running at: ${server.info.uri}`);
    })
    .catch(error => {
        console.log(error); // eslint-disable-line no-console
    });
