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

/* global Config, PbxApi, PbxApiClient */

/**
 * PasswordsAPI - REST API v3 client for password validation and generation
 *
 * Uses RESTful v3 endpoints with custom method notation
 *
 * @class PasswordsAPI
 */
const PasswordsAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/passwords',
    customMethods: {
        validate: ':validate',
        generate: ':generate',
        checkDictionary: ':checkDictionary'
    }
});

// Add method aliases to PasswordsAPI
Object.assign(PasswordsAPI, {

    /**
     * Validate password strength
     *
     * @param {string} password - Password to validate
     * @param {string} field - Field name (WebAdminPassword or SSHPassword)
     * @param {function} callback - Callback function
     */
    validatePassword(password, field, callback) {
        const data = {
            password: password,
            field: field
        };

        return this.callCustomMethod('validate', data, (response) => {
            if (callback && typeof callback === 'function') {
                if (response && response.result === true && response.data) {
                    callback(response.data);
                } else {
                    callback(false);
                }
            }
        }, 'POST');
    },

    /**
     * Generate a secure password
     *
     * @param {number} length - Desired password length (8-64)
     * @param {function} callback - Callback function
     */
    generatePassword(length, callback) {
        const data = {
            length: length || 16
        };

        return this.callCustomMethod('generate', data, (response) => {
            if (callback && typeof callback === 'function') {
                if (response && response.result === true && response.data) {
                    callback(response.data);
                } else {
                    callback(false);
                }
            }
        }, 'POST');
    },

    /**
     * Check if password exists in dictionary (lightweight check)
     *
     * @param {string} password - Password to check
     * @param {function} callback - Callback function
     */
    checkDictionary(password, callback) {
        const data = {
            password: password
        };

        return this.callCustomMethod('checkDictionary', data, (response) => {
            if (callback && typeof callback === 'function') {
                if (response && response.result === true && response.data) {
                    callback(response.data);
                } else {
                    callback(false);
                }
            }
        }, 'POST');
    },

    /**
     * Debounced password validation for real-time checking
     * Returns a debounced function that delays execution
     *
     * @param {function} callback - Callback function
     * @param {number} delay - Delay in milliseconds
     * @return {function} Debounced validation function
     */
    createDebouncedValidator(callback, delay = 500) {
        let timeoutId;

        return function(password, field) {
            clearTimeout(timeoutId);

            // Show loading state immediately
            if (callback && typeof callback === 'function') {
                callback({ isLoading: true });
            }

            timeoutId = setTimeout(() => {
                PasswordsAPI.validatePassword(password, field, callback);
            }, delay);
        };
    }

});

// Export for use in other modules
window.PasswordsAPI = PasswordsAPI;