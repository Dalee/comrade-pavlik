import assert from 'assert';
import Repo from '../../src/model/repo';

describe('Repo model', () => {

    it('should correctly parse different schemes into project namespace', () => {
        const repoDef = {
            "https": "https://git.example.com/sample/repo.git",
            "ssh": "git@git.example.com:sample/repo.git",
            "without_git": "https://example.com/sample/repo",
            "ssh+git": "ssh+git://git@git.example.com/sample/repo"
        };
        let repoObject;

        repoObject = new Repo(repoDef, 'https');
        assert.equal(repoObject.getNamespace(), 'sample/repo');

        repoObject = new Repo(repoDef, 'ssh');
        assert.equal(repoObject.getNamespace(), 'sample/repo');

        repoObject = new Repo(repoDef, 'without_git');
        assert.equal(repoObject.getNamespace(), 'sample/repo');

        repoObject = new Repo(repoDef, 'ssh+git');
        assert.equal(repoObject.getNamespace(), 'sample/repo');
    });

    it('should correctly respond with absent tag info', () => {
        const repoDef = {
            "key": "https://git.example.com/sample/repo"
        };

        const repoObject = new Repo(repoDef, "key");
        assert.equal(repoObject.hasRepoTag('any'), false);
    });

    it('should correctly respond with null tag info', () => {
        const repoDef = {
            "key": "https://git.example.com/sample/repo",
            "tag": null
        };

        const repoObject = new Repo(repoDef, "key");
        assert.equal(repoObject.hasRepoTag('any'), false);
    });

    it('should correctly respond with tag info', () => {
        const repoDef = {
            "key": "https://git.example.com/sample/repo",
            "tag": ["composer"]
        };

        const repoObject = new Repo(repoDef, "key");
        assert.equal(repoObject.hasRepoTag('composer'), true);
        assert.equal(repoObject.hasRepoTag('npm'), false);
    });

    it('should correctly format download url (composer)', () => {
        const repoDef = {
            "key": "https://git.example.com/sample/repo",
            "uuid": "daf35931-98c0-4d86-9175-888a59656f31"
        };

        const refMeta = {
            commit: {
                id: "839df7bc84f206160705dec7730eda74b402b53c"
            }
        };

        const repoObject = new Repo(repoDef, "key");
        assert.equal(
            repoObject.getDownloadUrl("http://example.com", "composer", refMeta),
            "http://example.com/composer/daf35931-98c0-4d86-9175-888a59656f31/839df7bc84f206160705dec7730eda74b402b53c.zip"
        );
    });

    it('should correctly format download url (npm)', () => {
        const repoDef = {
            "key": "https://git.example.com/sample/repo",
            "uuid": "daf35931-98c0-4d86-9165-888a59656f31"
        };

        const refMeta = {
            commit: {
                id: "839df7bc84f206160705dec7730eda232b402b5c"
            }
        };

        const repoObject = new Repo(repoDef, "key");
        assert.equal(
            repoObject.getDownloadUrl("http://example.com", "npm", refMeta),
            "http://example.com/npm/daf35931-98c0-4d86-9165-888a59656f31/839df7bc84f206160705dec7730eda232b402b5c.tgz"
        );
    });
});
