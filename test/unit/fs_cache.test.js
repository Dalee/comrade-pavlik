import assert from 'assert';
import mock from 'mock-fs';
import FsCache from '../../src/model/fs_cache';

describe('FsCache', () => {

    after(() => {
        mock.restore();
    });

    // it's private, yes.. but anyway, we need to test it
    it('should correctly sanitize file name', () => {
        const fsCache = new FsCache("/tmp");

        assert.equal(
            fsCache._sanitizeFileName("./fileName.zip"),
            "fileName.zip"
        );

        assert.equal(
            fsCache._sanitizeFileName("../bla-bla/fileName.zip"),
            "bla-blafileName.zip"
        );
    });

    it('should correctly respond with hasFile', async () => {
        mock({
            '/_mocked_directory_/_cache': {
                'existingFileName.zip': 'sample content'
            }
        });

        const fsCache = new FsCache('/_mocked_directory_/_cache');
        let result;

        result = await fsCache.hasFile('existingFileName.zip');
        assert.equal(result, true);

        result = await fsCache.hasFile('nonExistingFileName.zip');
        assert.equal(result, false);
    });

    it('should correctly return read stream', (done) => {
        mock({
            '/_mocked_directory_/_cache': {
                'existingFileName.zip': 'sample content'
            }
        });

        const fsCache = new FsCache('/_mocked_directory_/_cache');
        let readable = fsCache.getReadStream('existingFileName.zip');
        assert.notEqual(readable, null);

        readable.setEncoding('utf8');
        readable.on('data', (chunk) => {
            try {
                assert.equal(chunk, 'sample content');
                done();
            } catch (err) {
                done(err);
            }
        });
        readable.read();
    });
});
