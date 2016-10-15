const Pack = require('../package.json');
const env = require('dotenv').config({silent: true});

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
