const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '../../..');

function loadFilesApi(relativePath) {
    const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    let resumableOptions;

    class PbxApiClient {}
    class Resumable {
        constructor(options) {
            resumableOptions = options;
            this.files = [];
        }

        assignBrowse() {}
        on() {}
    }

    const button = {
        querySelector: () => ({setAttribute: () => {}}),
    };
    const context = {
        PbxApiClient,
        Resumable,
        Config: {pbxUrl: ''},
        TokenManager: {accessToken: ''},
        document: {getElementById: () => button},
        window: {},
        setTimeout: () => {},
    };

    vm.runInNewContext(`${source}\nglobalThis.testFilesApi = FilesAPI;`, context);
    return {
        api: context.testFilesApi,
        options: () => resumableOptions,
    };
}

for (const relativePath of [
    'sites/admin-cabinet/assets/js/src/PbxAPI/files-api.js',
    'sites/admin-cabinet/assets/js/pbx/PbxAPI/files-api.js',
]) {
    test(`${relativePath} sends the upload category`, () => {
        const loaded = loadFilesApi(relativePath);
        loaded.api.attachToBtn('upload', ['mp3'], () => {}, null, 'sound');

        const query = loaded.options().query({name: 'prompt.mp3'});
        assert.equal(query.category, 'sound');
    });
}
