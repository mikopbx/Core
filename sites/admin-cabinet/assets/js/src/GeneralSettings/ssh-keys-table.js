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

/* global globalTranslate, ClipboardJS, UserMessage */

/**
 * SSH Keys Table Management Module
 * Handles display and management of SSH authorized keys in a table format
 */
const sshKeysTable = {
    /**
     * Array of SSH keys
     * @type {Array<{key: string, comment: string}>}
     */
    keys: [],
    
    /**
     * jQuery object for the table container
     * @type {jQuery}
     */
    $container: null,
    
    /**
     * jQuery object for the hidden input field
     * @type {jQuery}
     */
    $hiddenField: null,
    
    /**
     * Clipboard instance for copy functionality
     * @type {ClipboardJS}
     */
    clipboard: null,
    
    /**
     * Initialize the SSH keys table
     * 
     * @param {string} containerId Container element ID
     * @param {string} fieldId Hidden field ID
     */
    initialize(containerId, fieldId) {
        this.$container = $(`#${containerId}`);
        this.$hiddenField = $(`#${fieldId}`);
        
        if (this.$container.length === 0 || this.$hiddenField.length === 0) {
            return;
        }
        
        // Parse existing value from textarea/hidden field
        this.parseExistingKeys();
        
        // Render the table
        this.renderTable();
        
        // Initialize clipboard
        this.initializeClipboard();
        
        // Bind event handlers
        this.bindEventHandlers();
    },
    
    /**
     * Parse existing SSH keys from the hidden field
     */
    parseExistingKeys() {
        const existingValue = this.$hiddenField.val();
        if (!existingValue) {
            return;
        }
        
        const lines = existingValue.split('\n');
        this.keys = [];
        
        lines.forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                // Store the full key line
                this.keys.push({
                    key: line
                });
            }
        });
    },
    
    /**
     * Render the SSH keys table
     */
    renderTable() {
        let html = `
            <table class="ui very basic table" id="ssh-keys-list">
                <tbody>
        `;
        
        // Show existing keys
        this.keys.forEach((keyData, index) => {
            const truncated = this.truncateSSHKey(keyData.key);
            html += `
                <tr data-index="${index}">
                    <td class="ssh-key-cell">
                        <code style="font-size: 0.9em;">${truncated}</code>
                    </td>
                    <td class="right aligned collapsing">
                        <div class="ui tiny basic icon buttons action-buttons">
                            <a class="ui button copy-key-btn" 
                               data-clipboard-text="${this.escapeHtml(keyData.key)}"
                               data-variation="basic"
                               data-content="${globalTranslate.bt_ToolTipCopyKey}">
                                <i class="copy icon blue"></i>
                            </a>
                            <a class="ui button delete-key-btn" 
                               data-index="${index}"
                               data-content="${globalTranslate.bt_ToolTipDelete}">
                                <i class="trash icon red"></i>
                            </a>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        // Add new key row (initially hidden, shown when add button clicked)
        html += `
                <tr id="add-key-row" style="display:none;">
                    <td colspan="2">
                        <div class="ui form">
                            <div class="field">
                                <textarea id="new-ssh-key" rows="3" 
                                    placeholder="${globalTranslate.gs_SSHKeyPlaceholder}"></textarea>
                            </div>
                            <div class="ui mini buttons">
                                <button class="ui positive button" id="save-key-btn">
                                    <i class="check icon"></i> ${globalTranslate.bt_Add}
                                </button>
                                <button class="ui button" id="cancel-key-btn">
                                    <i class="close icon"></i> ${globalTranslate.bt_Cancel}
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
                <tr id="add-button-row">
                    <td colspan="2">
                        <button class="ui mini basic button" id="show-add-key-btn">
                            <i class="plus icon"></i>
                            ${globalTranslate.gs_AddKey}
                        </button>
                    </td>
                </tr>
                </tbody>
            </table>
        `;
        
        this.$container.html(html);
        
        // Initialize tooltips
        this.$container.find('[data-content]').popup();
    },
    
    /**
     * Truncate SSH key for display (preserves comment)
     * 
     * @param {string} key Full SSH key
     * @return {string} Truncated key with comment
     */
    truncateSSHKey(key) {
        if (!key || key.length < 50) {
            return key;
        }
        
        const parts = key.split(' ');
        if (parts.length >= 2) {
            const keyType = parts[0];
            const keyData = parts[1];
            const comment = parts.slice(2).join(' '); // Everything after key data is comment
            
            if (keyData.length > 40) {
                const truncated = keyData.substring(0, 20) + '...' + keyData.substring(keyData.length - 15);
                // Include comment if present
                return comment ? `${keyType} ${truncated} ${comment}` : `${keyType} ${truncated}`;
            }
        }
        
        return key;
    },
    
    /**
     * Initialize clipboard functionality
     */
    initializeClipboard() {
        if (this.clipboard) {
            this.clipboard.destroy();
        }
        
        this.clipboard = new ClipboardJS('.copy-key-btn');
        
        this.clipboard.on('success', (e) => {
            // Just visual feedback - change icon briefly
            const $icon = $(e.trigger).find('i');
            $icon.removeClass('copy').addClass('check green');
            setTimeout(() => {
                $icon.removeClass('check green').addClass('copy blue');
            }, 2000);
            
            // Clear selection
            e.clearSelection();
        });
        
        this.clipboard.on('error', () => {
            UserMessage.showError(globalTranslate.gs_CopyFailed);
        });
    },
    
    /**
     * Bind event handlers
     */
    bindEventHandlers() {
        // Show add key form
        this.$container.on('click', '#show-add-key-btn', (e) => {
            e.preventDefault();
            $('#add-key-row').show();
            $('#add-button-row').hide();
            $('#new-ssh-key').focus();
        });
        
        // Save new key
        this.$container.on('click', '#save-key-btn', (e) => {
            e.preventDefault();
            this.addKey();
        });
        
        // Cancel add key
        this.$container.on('click', '#cancel-key-btn', (e) => {
            e.preventDefault();
            this.cancelAddKey();
        });
        
        // Delete key button
        this.$container.on('click', '.delete-key-btn', (e) => {
            e.preventDefault();
            const index = parseInt($(e.currentTarget).data('index'));
            this.deleteKey(index);
        });
        
        // Enter key in input saves the key
        this.$container.on('keydown', '#new-ssh-key', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addKey();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelAddKey();
            }
        });
    },
    
    /**
     * Cancel adding a new key
     */
    cancelAddKey() {
        $('#new-ssh-key').val('');
        $('#add-key-row').hide();
        $('#add-button-row').show();
    },
    
    /**
     * Add a new SSH key or multiple keys
     */
    addKey() {
        const $input = $('#new-ssh-key');
        const inputValue = $input.val().trim();
        
        if (!inputValue) {
            // Just close the form if empty
            this.cancelAddKey();
            return;
        }
        
        // Parse multiple keys (split by newlines and filter out empty lines and comments)
        const lines = inputValue.split('\n');
        const newKeys = [];
        const invalidKeys = [];
        const duplicateKeys = [];
        
        lines.forEach(line => {
            line = line.trim();
            
            // Skip empty lines and comments
            if (!line || line.startsWith('#')) {
                return;
            }
            
            // Validate SSH key format
            if (!this.isValidSSHKey(line)) {
                invalidKeys.push(line.substring(0, 50) + (line.length > 50 ? '...' : ''));
                return;
            }
            
            // Check for duplicates
            if (this.keys.some(k => k.key === line)) {
                duplicateKeys.push(this.truncateSSHKey(line));
                return;
            }
            
            // Check for duplicates within the new keys being added
            if (newKeys.some(k => k.key === line)) {
                duplicateKeys.push(this.truncateSSHKey(line));
                return;
            }
            
            newKeys.push({
                key: line
            });
        });
        
        // Show errors if any
        if (invalidKeys.length > 0) {
            const message = globalTranslate.gs_InvalidKeyFormat + 
                           ': ' + invalidKeys.join(', ');
            UserMessage.showError(message);
            $input.focus();
            return;
        }
        
        if (duplicateKeys.length > 0 && newKeys.length === 0) {
            const message = globalTranslate.gs_KeyAlreadyExists + 
                           ': ' + duplicateKeys.join(', ');
            UserMessage.showError(message);
            $input.focus();
            return;
        }
        
        // Add all valid new keys
        if (newKeys.length > 0) {
            this.keys.push(...newKeys);
            
            // Update hidden field
            this.updateHiddenField();
            
            // Re-render table
            this.renderTable();
            
            // Re-initialize clipboard for new buttons
            this.initializeClipboard();
            
            // Show info about duplicates if any were skipped
            if (duplicateKeys.length > 0) {
                const message = `${globalTranslate.gs_KeysAdded} ${newKeys.length} ${globalTranslate.gs_Keys}. ` +
                               `${globalTranslate.gs_SkippedDuplicates}: ${duplicateKeys.length}`;
                UserMessage.showInformation(message);
            }
        } else if (duplicateKeys.length > 0) {
            // All keys were duplicates
            const message = globalTranslate.gs_AllKeysAlreadyExist;
            UserMessage.showError(message);
            $input.focus();
        }
    },
    
    /**
     * Delete an SSH key
     * 
     * @param {number} index Key index to delete
     */
    deleteKey(index) {
        if (index < 0 || index >= this.keys.length) {
            return;
        }
        
        // Remove from array
        this.keys.splice(index, 1);
        
        // Update hidden field
        this.updateHiddenField();
        
        // Re-render table
        this.renderTable();
        
        // Re-initialize clipboard for remaining buttons
        this.initializeClipboard();
    },
    
    /**
     * Update the hidden field with current keys
     */
    updateHiddenField() {
        const lines = this.keys.map(keyData => keyData.key);
        
        this.$hiddenField.val(lines.join('\n'));
        
        // Trigger change event for form validation
        this.$hiddenField.trigger('change');
        
        // Also trigger Form.checkValues() if it exists to enable save button
        if (typeof Form !== 'undefined' && Form.checkValues) {
            Form.checkValues();
        }
    },
    
    /**
     * Validate SSH key format
     * 
     * @param {string} key SSH key string
     * @return {boolean} True if valid
     */
    isValidSSHKey(key) {
        const sshKeyRegex = /^(ssh-rsa|ssh-dss|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)\s+[A-Za-z0-9+/]+[=]{0,2}(\s+.+)?$/;
        return sshKeyRegex.test(key.trim());
    },
    
    /**
     * Escape HTML for safe display
     * 
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