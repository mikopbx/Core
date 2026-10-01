const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '../../..');

function loadNetworks(relativePath) {
    const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    const jquery = () => ({ready: () => {}});
    jquery.fn = {form: {settings: {rules: {}}}};

    const context = {
        $: jquery,
        document: {},
        globalTranslate: new Proxy({}, {get: (_target, property) => String(property)}),
    };

    vm.runInNewContext(`${source}\nglobalThis.testNetworks = networks;`, context);
    return context.testNetworks;
}

for (const relativePath of [
    'sites/admin-cabinet/assets/js/src/Network/network-modify.js',
    'sites/admin-cabinet/assets/js/pbx/Network/network-modify.js',
]) {
    test(`${relativePath} displays the correct dotted-decimal mask for /23`, () => {
        const networks = loadNetworks(relativePath);
        const subnet23 = networks.getSubnetOptionsArray()
            .find((option) => option.value === '23');

        assert.deepEqual(
            JSON.parse(JSON.stringify(subnet23)),
            {value: '23', text: '23 - 255.255.254.0'},
        );
    });
}
