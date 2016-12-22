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
