'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const widgetPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(
        __dirname,
        '../../../sites/admin-cabinet/assets/js/src/FormElements/password-widget.js'
    );
const widgetSource = fs.readFileSync(widgetPath, 'utf8')
    .replace(/(?:const|var) PasswordWidget =/, 'globalThis.PasswordWidget =');
const context = {};
vm.createContext(context);
vm.runInContext(widgetSource, context, { filename: widgetPath });

const strongPasswords = new Map([
    ['aDlnREd3YnJ2SFVWakl5', 90],
    ['6355a1b3bd8d2eb5b8b001db186474b6', 60],
    ['dba06e1a1f03cceee3fb06b4cf07cc56', 60],
    ['d31579fc75ddd914484b023a9a65dd32', 60],
    ['aB3gjkmnpRstuvWyxzH2aaaa', 80],
]);

for (const [password, expectedScore] of strongPasswords) {
    assert.equal(
        context.PasswordWidget.scorePasswordLocal(password),
        expectedScore,
        `${password} must have the same score in the browser as on the server`
    );
}

for (const password of [
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '11111111111111111111111111111111',
    'abcabcabcabcabcabcabcabcabcabcab',
]) {
    assert.ok(
        context.PasswordWidget.scorePasswordLocal(password) < 60,
        `${password} must remain below the SIP password threshold`
    );
}

console.log('PasswordWidget score tests passed');
