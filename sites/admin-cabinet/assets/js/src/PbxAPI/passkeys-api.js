/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

/* global PbxApiClient */

/**
 * PasskeysAPI - RESTful API client for Passkeys management
 *
 * This module provides methods to interact with the Passkeys API v3
 * using the centralized PbxApiClient for all HTTP operations.
 *
 * @module PasskeysAPI
 */
const PasskeysAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/passkeys',
    customMethods: {
        checkAvailability: ':checkAvailability',
        authenticationStart: ':authenticationStart',
        authenticationFinish: ':authenticationFinish',
        registrationStart: ':registrationStart',
        registrationFinish: ':registrationFinish',
    }
});

/**
 * Get list of all passkeys for current user
 * @param {function} callback - The callback function to handle the response.
 */
PasskeysAPI.getList = function(callback) {
    this.callGet({}, callback);
};

/**
 * Start passkey registration - get challenge from server
 * @param {string} passkeyName - Name for the new passkey
 * @param {function} callback - The callback function to handle the response.
 */
PasskeysAPI.registrationStart = function(passkeyName, callback) {
    this.callCustomMethod('registrationStart', { name: passkeyName }, callback, 'POST');
};

/**
 * Finish passkey registration - send attestation to server
 * @param {object} attestationData - Attestation response from WebAuthn
 * @param {function} callback - The callback function to handle the response.
 */
PasskeysAPI.registrationFinish = function(attestationData, callback) {
    this.callCustomMethod('registrationFinish', attestationData, callback, 'POST');
};

/**
 * Update passkey (rename)
 * @param {string} id - Passkey ID
 * @param {string} newName - New name for the passkey
 * @param {function} callback - The callback function to handle the response.
 */
PasskeysAPI.update = function(id, newName, callback) {
    this.callPatch({ id, name: newName }, callback);
};

/**
 * Delete passkey
 * @param {string} id - Passkey ID to delete
 * @param {function} callback - The callback function to handle the response.
 */
PasskeysAPI.deleteRecord = function(id, callback) {
    this.callDelete(callback, id);
};

/**
 * Check if user has passkeys registered (PUBLIC - no auth required)
 * @param {string} login - Username to check
 * @param {function} callback - The callback function to handle the response.
 */
PasskeysAPI.checkAvailability = function(login, callback) {
    this.callCustomMethod('checkAvailability', { login }, callback, 'GET');
};

/**
 * Start WebAuthn authentication - get challenge (PUBLIC - no auth required)
 * @param {string} login - Username to authenticate
 * @param {function} callback - The callback function to handle the response.
 */
PasskeysAPI.authenticationStart = function(login, callback) {
    this.callCustomMethod('authenticationStart', { login }, callback, 'GET');
};

/**
 * Finish WebAuthn authentication - verify assertion (PUBLIC - no auth required)
 * @param {object} assertionData - Assertion response from WebAuthn
 * @param {function} callback - The callback function to handle the response.
 */
PasskeysAPI.authenticationFinish = function(assertionData, callback) {
    this.callCustomMethod('authenticationFinish', assertionData, callback, 'POST');
};
