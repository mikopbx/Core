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

/* global Config, PbxApi */ 

/**
 * Password validation and generation API (v3)
 * Uses RESTful v3 endpoints with custom method notation
 * @module PasswordsAPI
 */
const PasswordsAPI = {
    /**
     * Validate password strength
     * 
     * @param {string} password - Password to validate
     * @param {string} field - Field name (WebAdminPassword or SSHPassword)
     * @param {function} callback - Callback function
     */
    validatePassword(password, field, callback) {
        $.api({
            url: `${Config.pbxUrl}/pbxcore/api/v3/passwords:validate`,
            on: 'now',
            method: 'POST',
            data: {
                password: password,
                field: field
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                if (callback && typeof callback === 'function') {
                    callback(response.data);
                }
            },
            onFailure(response) {
                if (callback && typeof callback === 'function') {
                    callback(false);
                }
            }
        });
    },
    
    /**
     * Generate a secure password
     * 
     * @param {number} length - Desired password length (8-64)
     * @param {function} callback - Callback function
     */
    generatePassword(length, callback) {
        $.api({
            url: `${Config.pbxUrl}/pbxcore/api/v3/passwords:generate`,
            on: 'now',
            method: 'POST',
            data: {
                length: length || 16
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                if (callback && typeof callback === 'function') {
                    callback(response.data);
                }
            },
            onFailure(response) {
                if (callback && typeof callback === 'function') {
                    callback(false);
                }
            }
        });
    },
    
    /**
     * Check if password exists in dictionary (lightweight check)
     * 
     * @param {string} password - Password to check
     * @param {function} callback - Callback function
     */
    checkDictionary(password, callback) {
        $.api({
            url: `${Config.pbxUrl}/pbxcore/api/v3/passwords:checkDictionary`,
            on: 'now',
            method: 'POST',
            data: {
                password: password
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                if (callback && typeof callback === 'function') {
                    callback(response.data);
                }
            },
            onFailure(response) {
                if (callback && typeof callback === 'function') {
                    callback(false);
                }
            }
        });
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
};