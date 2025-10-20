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

/**
 * ACL Helper - Client-side Access Control List helper
 *
 * Provides convenient API for checking user permissions in JavaScript code.
 * Works with CurrentPageACL object that is initialized by PHP on page load.
 *
 * @module ACLHelper
 */
const ACLHelper = {

    /**
     * Check if ACL data is initialized
     * @returns {boolean} true if ACL data is available
     */
    isInitialized() {
        return window.CurrentPageACL
            && window.CurrentPageACL.initialized === true
            && window.CurrentPageACL.permissions;
    },

    /**
     * Get all permissions for current page
     * @returns {object|null} Permissions object or null if not initialized
     */
    getPermissions() {
        if (!this.isInitialized()) {
            console.warn('ACLHelper: CurrentPageACL is not initialized');
            return null;
        }
        return window.CurrentPageACL.permissions;
    },

    /**
     * Get current controller information
     * @returns {object|null} Controller info or null if not initialized
     */
    getControllerInfo() {
        if (!this.isInitialized()) {
            return null;
        }
        return {
            controller: window.CurrentPageACL.controller,
            controllerName: window.CurrentPageACL.controllerName,
            actionName: window.CurrentPageACL.actionName
        };
    },

    /**
     * Check if user has permission for specific action
     *
     * @param {string} action - Action name (save, delete, modify, etc.)
     * @returns {boolean} true if user has permission, false otherwise
     *
     * @example
     * if (ACLHelper.isAllowed('save')) {
     *     $('#save-button').show();
     * }
     */
    isAllowed(action) {
        if (!this.isInitialized()) {
            // If ACL not initialized, allow by default (localhost bypass)
            console.warn(`ACLHelper: ACL not initialized, allowing '${action}' by default`);
            return true;
        }

        const permissions = this.getPermissions();
        return permissions[action] === true;
    },

    /**
     * Shorthand: Check if user can save
     * @returns {boolean}
     */
    canSave() {
        return this.isAllowed('save');
    },

    /**
     * Shorthand: Check if user can delete
     * @returns {boolean}
     */
    canDelete() {
        return this.isAllowed('delete');
    },

    /**
     * Shorthand: Check if user can modify
     * @returns {boolean}
     */
    canModify() {
        return this.isAllowed('modify');
    },

    /**
     * Shorthand: Check if user can edit
     * @returns {boolean}
     */
    canEdit() {
        return this.isAllowed('edit');
    },

    /**
     * Shorthand: Check if user can copy
     * @returns {boolean}
     */
    canCopy() {
        return this.isAllowed('copy');
    },

    /**
     * Shorthand: Check if user can download
     * @returns {boolean}
     */
    canDownload() {
        return this.isAllowed('download');
    },

    /**
     * Shorthand: Check if user can restore
     * @returns {boolean}
     */
    canRestore() {
        return this.isAllowed('restore');
    },

    /**
     * Show or hide element based on permission
     *
     * @param {string|jQuery} selector - jQuery selector or jQuery object
     * @param {string} action - Action name to check
     * @returns {boolean} true if element is shown, false if hidden
     *
     * @example
     * ACLHelper.toggleByPermission('#save-button', 'save');
     * ACLHelper.toggleByPermission($('#delete-button'), 'delete');
     */
    toggleByPermission(selector, action) {
        const $element = typeof selector === 'string' ? $(selector) : selector;

        if ($element.length === 0) {
            console.warn(`ACLHelper: Element not found: ${selector}`);
            return false;
        }

        if (this.isAllowed(action)) {
            $element.show();
            return true;
        } else {
            $element.hide();
            return false;
        }
    },

    /**
     * Enable or disable element based on permission
     *
     * @param {string|jQuery} selector - jQuery selector or jQuery object
     * @param {string} action - Action name to check
     * @returns {boolean} true if element is enabled, false if disabled
     *
     * @example
     * ACLHelper.toggleEnableByPermission('#save-button', 'save');
     */
    toggleEnableByPermission(selector, action) {
        const $element = typeof selector === 'string' ? $(selector) : selector;

        if ($element.length === 0) {
            console.warn(`ACLHelper: Element not found: ${selector}`);
            return false;
        }

        if (this.isAllowed(action)) {
            $element.removeClass('disabled');
            $element.prop('disabled', false);
            return true;
        } else {
            $element.addClass('disabled');
            $element.prop('disabled', true);
            return false;
        }
    },

    /**
     * Add or remove CSS class based on permission
     *
     * @param {string|jQuery} selector - jQuery selector or jQuery object
     * @param {string} action - Action name to check
     * @param {string} classToAdd - CSS class to add if allowed
     * @param {string} classToRemove - CSS class to remove if not allowed (optional)
     * @returns {boolean} true if class was added, false otherwise
     *
     * @example
     * ACLHelper.toggleClassByPermission('#my-button', 'save', 'active', 'inactive');
     */
    toggleClassByPermission(selector, action, classToAdd, classToRemove = null) {
        const $element = typeof selector === 'string' ? $(selector) : selector;

        if ($element.length === 0) {
            console.warn(`ACLHelper: Element not found: ${selector}`);
            return false;
        }

        if (this.isAllowed(action)) {
            $element.addClass(classToAdd);
            if (classToRemove) {
                $element.removeClass(classToRemove);
            }
            return true;
        } else {
            $element.removeClass(classToAdd);
            if (classToRemove) {
                $element.addClass(classToRemove);
            }
            return false;
        }
    },

    /**
     * Execute callback only if user has permission
     *
     * @param {string} action - Action name to check
     * @param {function} callback - Function to execute if allowed
     * @param {function} [deniedCallback] - Optional function to execute if not allowed
     * @returns {boolean} true if callback was executed, false otherwise
     *
     * @example
     * ACLHelper.ifAllowed('save', () => {
     *     console.log('User can save');
     *     initializeSaveButton();
     * }, () => {
     *     console.log('User cannot save');
     * });
     */
    ifAllowed(action, callback, deniedCallback = null) {
        if (this.isAllowed(action)) {
            if (typeof callback === 'function') {
                callback();
            }
            return true;
        } else {
            if (typeof deniedCallback === 'function') {
                deniedCallback();
            }
            return false;
        }
    },

    /**
     * Apply multiple permission-based actions
     *
     * @param {object} config - Configuration object mapping actions to selectors
     *
     * @example
     * ACLHelper.applyPermissions({
     *     save: {
     *         show: '#save-button',
     *         enable: '#submit-form'
     *     },
     *     delete: {
     *         show: '#delete-button'
     *     }
     * });
     */
    applyPermissions(config) {
        Object.keys(config).forEach(action => {
            const rules = config[action];

            if (rules.show) {
                this.toggleByPermission(rules.show, action);
            }

            if (rules.hide) {
                const $element = $(rules.hide);
                if (this.isAllowed(action)) {
                    $element.hide();
                } else {
                    $element.show();
                }
            }

            if (rules.enable) {
                this.toggleEnableByPermission(rules.enable, action);
            }

            if (rules.disable) {
                const $element = $(rules.disable);
                if (this.isAllowed(action)) {
                    $element.addClass('disabled').prop('disabled', true);
                } else {
                    $element.removeClass('disabled').prop('disabled', false);
                }
            }
        });
    },

    /**
     * Debug helper: Log current ACL state to console
     */
    debug() {
        if (!this.isInitialized()) {
            console.warn('ACLHelper: Not initialized');
            return;
        }

        console.group('ACL Helper Debug Info');
        console.log('Controller:', window.CurrentPageACL.controller);
        console.log('Controller Name:', window.CurrentPageACL.controllerName);
        console.log('Action Name:', window.CurrentPageACL.actionName);
        console.log('Permissions:', window.CurrentPageACL.permissions);
        console.groupEnd();
    }
};
