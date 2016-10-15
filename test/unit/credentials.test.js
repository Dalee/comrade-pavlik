import assert from 'assert';
import getTokenFromRequest from '../../src/model/credentials';

describe('Credentials', () => {
    it('should correctly parse basic-getTokenFromRequest header', () => {
        const req = {
            headers: {
                authorization: 'Basic dXNlcjpwYXNzd29yZA=='
            }
        };

        assert.equal(
            getTokenFromRequest(req),
            'password'
        );
    });

    it('should correctly parse oauth header', () => {
        const req = {
            headers: {
                authorization: 'Bearer hello-world'
            }
        };

        assert.equal(
            getTokenFromRequest(req),
            'hello-world'
        )
    });
});
