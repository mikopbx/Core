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

/* global globalTranslate, PasskeysAPI, UserMessage, ClipboardJS */

/**
 * GeneralSettingsPasskeys object is responsible for managing Passkeys in General Settings
 *
 * @module GeneralSettingsPasskeys
 */
const GeneralSettingsPasskeys = {
    /**
     * jQuery object for the container
     * @type {jQuery}
     */
    $container: null,

    /**
     * Array of passkeys
     * @type {Array}
     */
    passkeys: [],

    /**
     * Clipboard instance for copy functionality
     * @type {ClipboardJS}
     */
    clipboard: null,

    /**
     * Initialize the Passkeys management module
     */
    initialize() {
        this.$container = $('#passkeys-container');

        if (this.$container.length === 0) {
            return;
        }

        // Check if WebAuthn is supported
        if (!window.PublicKeyCredential) {
            this.renderUnsupportedMessage();
            return;
        }

        // Check if accessing via IP address (WebAuthn requires valid domain)
        if (this.isAccessingViaIpAddress()) {
            this.renderDomainRequiredMessage();
            return;
        }

        this.loadPasskeys();
        this.bindEventHandlers();
    },

    /**
     * Check if the current hostname is an IP address (IPv4 or IPv6)
     * WebAuthn requires a valid domain name, not an IP address
     * @returns {boolean} True if accessing via IP address
     */
    isAccessingViaIpAddress() {
        const { hostname } = window.location;

        // IPv4 pattern: xxx.xxx.xxx.xxx
        const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;

        // IPv6 patterns: [::1], [2001:db8::1], etc.
        // Also check for localhost IP representations
        const ipv6Pattern = /^(\[.*\]|::1|localhost)$/i;

        // Check for IPv6 without brackets (some browsers)
        const ipv6NoBrackets = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

        return ipv4Pattern.test(hostname)
            || ipv6Pattern.test(hostname)
            || ipv6NoBrackets.test(hostname);
    },

    /**
     * Render message when domain is required for Passkeys
     */
    renderDomainRequiredMessage() {
        const html = `
            <div class="ui info message">
                <div class="header">
                    <i class="info circle icon"></i>
                    ${globalTranslate.pk_DomainRequired}
                </div>
                <p>${globalTranslate.pk_DomainRequiredDescription}</p>
            </div>
        `;
        this.$container.html(html);
    },

    /**
     * Render unsupported browser message
     */
    renderUnsupportedMessage() {
        const html = `
            <div class="ui warning message">
                <i class="warning icon"></i>
                ${globalTranslate.pk_NotSupported}
            </div>
        `;
        this.$container.html(html);
    },

    /**
     * Load passkeys from server
     */
    loadPasskeys() {
        PasskeysAPI.getList((response) => {
            if (response.result && response.data) {
                this.passkeys = response.data;
            } else {
                this.passkeys = [];
            }
            this.renderTable();
        });
    },

    /**
     * Render the passkeys table
     */
    renderTable() {
        const $table = $('#passkeys-table tbody');
        const $emptyRow = $('#passkeys-empty-row');

        if (this.passkeys.length === 0) {
            // Show empty placeholder
            $table.find('tr:not(#passkeys-empty-row)').remove();
            $emptyRow.show();
        } else {
            // Hide empty placeholder
            $emptyRow.hide();

            // Remove existing passkey rows (keep empty row)
            $table.find('tr:not(#passkeys-empty-row)').remove();

            // Add passkey rows
            this.passkeys.forEach((passkey) => {
                const lastUsed = passkey.last_used_at
                    ? this.formatDate(passkey.last_used_at)
                    : globalTranslate.pk_NeverUsed;

                const html = `
                    <tr data-id="${passkey.id}">
                        <td class="passkey-cell">
                            <div style="margin-bottom: 0.3em;">
                                <strong>${this.escapeHtml(passkey.name)}</strong>
                            </div>
                            <div style="font-size: 0.85em; color: rgba(0,0,0,.4);">
                                ${globalTranslate.pk_ColumnLastUsed}: ${lastUsed}
                            </div>
                        </td>
                        <td class="right aligned collapsing">
                            <a class="ui basic icon button two-steps-delete delete-passkey-btn"
                               data-id="${passkey.id}"
                               data-content="${globalTranslate.pk_Delete}">
                                <i class="trash icon red"></i>
                            </a>
                        </td>
                    </tr>
                `;
                $table.append(html);
            });

            // Add button row
            const addButtonRow = `
                <tr id="add-passkey-row">
                    <td colspan="2">
                        <button class="ui mini basic button" id="add-passkey-button">
                            <i class="plus icon"></i>
                            ${globalTranslate.pk_AddPasskey}
                        </button>
                    </td>
                </tr>
            `;
            $table.append(addButtonRow);

            // Initialize tooltips
            $table.find('[data-content]').popup();
        }
    },

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString();
    },

    /**
     * Bind event handlers
     */
    bindEventHandlers() {
        // Add passkey button (delegated)
        this.$container.on('click', '#add-passkey-button', (e) => {
            e.preventDefault();
            GeneralSettingsPasskeys.registerNewPasskey();
        });

        // Delete button (delegated)
        // Only trigger deletion on second click (when two-steps-delete class is removed)
        this.$container.on('click', '.delete-passkey-btn:not(.two-steps-delete)', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            const passkeyId = $(e.currentTarget).data('id');
            GeneralSettingsPasskeys.deletePasskey(passkeyId);
        });
    },

    /**
     * Generate passkey name based on browser and device information
     * @returns {string} Generated passkey name
     */
    generatePasskeyName() {
        const ua = navigator.userAgent;
        let browser = 'Browser';
        let os = 'Unknown OS';
        let device = '';

        // Detect browser
        if (ua.indexOf('Edg') > -1) {
            browser = 'Edge';
        } else if (ua.indexOf('Chrome') > -1) {
            browser = 'Chrome';
        } else if (ua.indexOf('Safari') > -1) {
            browser = 'Safari';
        } else if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
        } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
            browser = 'Opera';
        }

        // Detect OS
        if (ua.indexOf('Win') > -1) {
            os = 'Windows';
        } else if (ua.indexOf('Mac') > -1) {
            os = 'macOS';
        } else if (ua.indexOf('Linux') > -1) {
            os = 'Linux';
        } else if (ua.indexOf('Android') > -1) {
            os = 'Android';
        } else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
            os = ua.indexOf('iPhone') > -1 ? 'iPhone' : 'iPad';
        }

        // Detect device type for mobile
        if (ua.indexOf('Mobile') > -1 && os !== 'Android' && os !== 'iPhone' && os !== 'iPad') {
            device = ' Mobile';
        }

        // Build name
        const timestamp = new Date().toLocaleDateString();
        return `${browser} on ${os}${device} (${timestamp})`;
    },

    /**
     * Register new passkey using WebAuthn
     */
    async registerNewPasskey() {
        // Auto-generate passkey name based on browser/device
        const passkeyName = GeneralSettingsPasskeys.generatePasskeyName();

        const $button = $('#add-passkey-button');
        $button.addClass('loading disabled');

        try {
            // Step 1: Get challenge from server
            PasskeysAPI.registrationStart(passkeyName, async (response) => {
                if (!response.result) {
                    $button.removeClass('loading disabled');
                    UserMessage.showMultiString(response.messages);
                    return;
                }

                try {
                    // Step 2: Call WebAuthn API
                    const publicKeyOptions = GeneralSettingsPasskeys.prepareCredentialCreationOptions(response.data);
                    const credential = await navigator.credentials.create({ publicKey: publicKeyOptions });

                    // Step 3: Send attestation to server
                    const attestationData = GeneralSettingsPasskeys.prepareAttestationData(credential, response.data, passkeyName);

                    PasskeysAPI.registrationFinish(attestationData, (finishResponse) => {
                        $button.removeClass('loading disabled');

                        if (finishResponse.result) {
                            GeneralSettingsPasskeys.loadPasskeys();
                        } else {
                            UserMessage.showMultiString(finishResponse.messages);
                        }
                    });
                } catch (error) {
                    $button.removeClass('loading disabled');
                    console.error('WebAuthn registration error:', error);

                    // Handle specific WebAuthn errors
                    if (error.name === 'NotAllowedError') {
                        // Check if it's a TLS certificate error (Chrome-specific)
                        if (error.message && error.message.includes('TLS certificate')) {
                            UserMessage.showError(globalTranslate.pk_TlsCertificateError);
                        } else {
                            // User cancelled the operation
                            UserMessage.showError(globalTranslate.pk_RegisterCancelled);
                        }
                    } else {
                        UserMessage.showError(`${globalTranslate.pk_RegisterError}: ${error.message}`);
                    }
                }
            });
        } catch (error) {
            $button.removeClass('loading disabled');
            console.error('Registration start error:', error);
            UserMessage.showError(`${globalTranslate.pk_RegisterError}: ${error.message}`);
        }
    },

    /**
     * Prepare credential creation options for WebAuthn API
     * @param {object} serverData - Data from server
     * @returns {object} PublicKeyCredentialCreationOptions
     */
    prepareCredentialCreationOptions(serverData) {
        return {
            challenge: GeneralSettingsPasskeys.base64urlToArrayBuffer(serverData.challenge),
            rp: serverData.rp,
            user: {
                id: GeneralSettingsPasskeys.base64urlToArrayBuffer(serverData.user.id),
                name: serverData.user.name,
                displayName: serverData.user.displayName,
            },
            pubKeyCredParams: serverData.pubKeyCredParams,
            authenticatorSelection: serverData.authenticatorSelection,
            timeout: serverData.timeout || 60000,
            attestation: serverData.attestation || 'none',
        };
    },

    /**
     * Prepare attestation data to send to server
     * @param {PublicKeyCredential} credential - Credential from WebAuthn
     * @param {object} serverData - Original server data with sessionId
     * @param {string} passkeyName - Generated passkey name
     * @returns {object} Attestation data
     */
    prepareAttestationData(credential, serverData, passkeyName) {
        const response = credential.response;

        return {
            sessionId: serverData.sessionId,
            credentialId: GeneralSettingsPasskeys.arrayBufferToBase64url(credential.rawId),
            name: passkeyName,
            attestationObject: GeneralSettingsPasskeys.arrayBufferToBase64url(response.attestationObject),
            clientDataJSON: GeneralSettingsPasskeys.arrayBufferToBase64url(response.clientDataJSON),
        };
    },

    /**
     * Delete passkey (without confirmation - using two-steps-delete mechanism)
     * @param {string} passkeyId - ID of passkey to delete
     */
    deletePasskey(passkeyId) {
        PasskeysAPI.deleteRecord(passkeyId, (response) => {
            if (response.result) {
                GeneralSettingsPasskeys.loadPasskeys();
            } else {
                UserMessage.showMultiString(response.messages);
            }
        });
    },

    /**
     * Convert base64url string to ArrayBuffer
     * @param {string} base64url - Base64url encoded string
     * @returns {ArrayBuffer}
     */
    base64urlToArrayBuffer(base64url) {
        const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding;
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray.buffer;
    },

    /**
     * Convert ArrayBuffer to base64url string
     * @param {ArrayBuffer} buffer - ArrayBuffer to convert
     * @returns {string} Base64url encoded string
     */
    arrayBufferToBase64url(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = window.btoa(binary);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    },

    /**
     * Escape HTML for safe display
     * @param {string} text Text to escape
     * @return {string} Escaped text
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
};

// Initialize when document is ready
$(document).ready(() => {
    GeneralSettingsPasskeys.initialize();
});
