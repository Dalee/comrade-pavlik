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

const Pack = require('../package.json');

/**
 * Manifest
 */
export default {
    server: {
        app: {
            gitlab: {
                url: process.env.GITLAB_URL,
                repo: process.env.GITLAB_REPO_NAME,
                json_file: process.env.GITLAB_REPO_FILE,
                json_namespace: process.env.GITLAB_FILE_NAMESPACE
            }
        }
    },
    connections: [
        {
            port: process.env.NODE_PORT || 3000,
            compression: false,
            labels: ['api'],
            router: {
                isCaseSensitive: false,
                stripTrailingSlash: true
            },
            routes: {
                security: {
                    xframe: true,
                    xss: true,
                    noSniff: true,
                    hsts: true
                }
            }
        }
    ],
    registrations: [
        {
            plugin: {
                register: 'hapi-router',
                options: {
                    routes: 'routes/*.js',
                    cwd: __dirname
                }
            }
        },
        {
            plugin: {
                register: 'hapi-boom-decorators'
            }
        },
        {
            plugin: {
                register: 'good',
                options: {
                    reporters: {
                        console: [{
                            module: 'good-squeeze',
                            name: 'Squeeze',
                            args: [{
                                log: '*',
                                response: '*',
                                request: '*'
                            }]
                        }, {
                            module: 'good-console'
                        }, 'stdout']
                    }
                }
            }
        },
        {
            plugin: {
                register: 'inert'
            }
        },
        {
            plugin: {
                register: 'vision'
            }
        },
        {
            plugin: {
                register: 'hapi-swagger',
                options: {
                    host: process.env.NODE_PUBLIC_HOST,
                    info: {
                        title: Pack.name,
                        version: Pack.version,
                        description: Pack.description
                    }
                }
            }
        }
    ]
};
