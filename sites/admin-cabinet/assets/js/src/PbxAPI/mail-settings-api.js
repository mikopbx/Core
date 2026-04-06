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

/* global globalRootUrl, Config, PbxApi, PbxApiClient, $ */

/**
 * MailSettingsAPI - REST API v3 client for mail settings management (Singleton resource)
 *
 * Provides a clean interface for mail settings operations.
 * Mail Settings is a singleton resource - there's only one configuration in the system.
 *
 * @class MailSettingsAPI 
 */
const MailSettingsAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/mail-settings',
    singleton: true,
    customMethods: {
        testConnection: ':testConnection',
        sendTestEmail: ':sendTestEmail',
        getOAuth2Url: ':getOAuth2Url',
        oauth2Callback: ':oauth2Callback',
        refreshToken: ':refreshToken'
    }
});

// Add method aliases for compatibility and easier use
Object.assign(MailSettingsAPI, {

    /**
     * Get all mail settings
     * @param {Function} callback - The callback function
     */
    getSettings(callback) {
        return this.callGet({}, (response) => {
            if (response.result) {
                callback(response.data);
            } else {
                callback(false);
            }
        });
    },

    /**
     * Update mail settings (full update)
     * @param {Object} data - Settings data to update
     * @param {Function} callback - The callback function
     */
    updateSettings(data, callback) {
        return this.callPut(data, callback);
    },

    /**
     * Partially update mail settings
     * @param {Object} data - Partial settings data to update
     * @param {Function} callback - The callback function
     */
    patchSettings(data, callback) {
        return this.callPatch(data, callback);
    },

    /**
     * Reset mail settings to defaults
     * @param {Function} callback - The callback function
     */
    resetSettings(callback) {
        return this.callDelete(callback);
    },

    /**
     * Test SMTP connection
     * @param {Function} callback - The callback function
     */
    testConnection(callback) {
        return this.callCustomMethod('testConnection', {}, callback, 'POST');
    },

    /**
     * Send test email
     * @param {Object} data - Email parameters (to, subject, body)
     * @param {Function} callback - The callback function
     */
    sendTestEmail(data, callback) {
        return this.callCustomMethod('sendTestEmail', data, callback, 'POST');
    },

    /**
     * Get OAuth2 authorization URL
     * @param {string} provider - OAuth2 provider (google|microsoft|yandex)
     * @param {Function} callback - The callback function
     */
    getOAuth2Url(provider, callback) {
        return this.callCustomMethod('getOAuth2Url', { provider: provider }, (response) => {
            if (response.result) {
                callback(response.data);
            } else {
                callback(false);
            }
        });
    },

    /**
     * Process OAuth2 callback
     * @param {Object} params - OAuth2 callback parameters (code, state)
     * @param {Function} callback - The callback function
     */
    handleOAuth2Callback(params, callback) {
        return this.callCustomMethod('oauth2Callback', params, callback, 'POST');
    },

    /**
     * Refresh OAuth2 access token
     * @param {Function} callback - The callback function
     */
    refreshToken(callback) {
        return this.callCustomMethod('refreshToken', {}, callback, 'POST');
    },

    /**
     * Detect email provider from email address
     * @param {string} email - Email address
     * @return {string} Provider name (google|microsoft|yandex|custom)
     */
    detectProvider(email) {
        const emailLower = email.toLowerCase();

        if (emailLower.includes('@gmail.com') || emailLower.includes('@googlemail.com')) {
            return 'google';
        } else if (emailLower.includes('@outlook.') || emailLower.includes('@hotmail.') || emailLower.includes('@live.')) {
            return 'microsoft';
        } else if (emailLower.includes('@yandex.') || emailLower.includes('@ya.ru')) {
            return 'yandex';
        }

        return 'custom';
    },

    /**
     * Get provider display name
     * @param {string} provider - Provider identifier
     * @return {string} Display name
     */
    getProviderName(provider) {
        const names = {
            'google': 'Google/Gmail',
            'microsoft': 'Microsoft/Outlook',
            'yandex': 'Yandex Mail',
            'custom': 'Custom Provider'
        };

        return names[provider] || 'Unknown';
    }
});