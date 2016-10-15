/**
 * Manifest
 */
export default {
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
                    cwd: __dirname + '/../src/'
                }
            }
        },
        {
            plugin: {
                register: 'hapi-boom-decorators'
            }
        }
    ]
};
