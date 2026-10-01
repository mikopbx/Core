const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '../../..');

function loadDropdownSettings(relativePath) {
    const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    const document = {};
    let settings;
    const dropdown = {
        dropdown(options) {
            settings = options;
        },
    };
    const jquery = (selector) => selector === document
        ? {ready: (callback) => callback()}
        : dropdown;

    vm.runInNewContext(source, {$: jquery, document});
    return settings;
}

for (const relativePath of [
    'sites/admin-cabinet/assets/js/src/TopMenuSearch/top-menu-search.js',
    'sites/admin-cabinet/assets/js/pbx/TopMenuSearch/top-menu-search.js',
]) {
    test(`${relativePath} keeps results closed until the user types`, () => {
        const settings = loadDropdownSettings(relativePath);

        assert.equal(settings.showOnFocus, false);
        assert.equal(settings.minCharacters, 1);
    });
}
