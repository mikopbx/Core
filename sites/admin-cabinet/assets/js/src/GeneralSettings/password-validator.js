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

/* global globalTranslate, PasswordScore, Form */

/**
 * Password Validator Module for General Settings
 * Provides enhanced validation UI with warnings and suggestions
 * Uses the PasswordScore module for strength calculation
 */
const passwordValidator = {
    
    /**
     * Initialize password validation for General Settings page
     * 
     * @param {object} options Configuration options
     */
    initialize(options = {}) {
        this.options = {
            showWarnings: true,
            checkOnLoad: true,
            ...options
        };
        
        this.bindEventHandlers();
        
        if (this.options.checkOnLoad) {
            this.checkInitialPasswords();
        }
    },
    
    /**
     * Bind event handlers for password fields
     */
    bindEventHandlers() {
        // Web Admin Password field
        const $webAdminPassword = $('#WebAdminPassword');
        if ($webAdminPassword.length > 0) {
            // Use PasswordScore for real-time validation
            $webAdminPassword.on('input', (e) => {
                const password = e.target.value;
                if (password && password !== 'xxxxxxx') {
                    PasswordScore.checkPassStrength({
                        pass: password,
                        bar: $('.password-score'),
                        section: $('.password-score-section'),
                        field: 'WebAdminPassword',
                        callback: (result) => {
                            this.handleValidationResult(result, 'WebAdminPassword');
                        }
                    });
                }
            });
            
            // Clear warnings when field is cleared
            $webAdminPassword.on('change', (e) => {
                if (!e.target.value || e.target.value === 'xxxxxxx') {
                    this.hideWarnings('WebAdminPassword');
                }
            });
        }
        
        // SSH Password field
        const $sshPassword = $('#SSHPassword');
        if ($sshPassword.length > 0) {
            $sshPassword.on('input', (e) => {
                const password = e.target.value;
                const sshDisabled = $('#SSHDisableSSHPassword').checkbox('is checked');
                
                if (!sshDisabled && password && password !== 'xxxxxxx') {
                    PasswordScore.checkPassStrength({
                        pass: password,
                        bar: $('.ssh-password-score'),
                        section: $('.ssh-password-score-section'),
                        field: 'SSHPassword',
                        callback: (result) => {
                            this.handleValidationResult(result, 'SSHPassword');
                        }
                    });
                }
            });
            
            $sshPassword.on('change', (e) => {
                if (!e.target.value || e.target.value === 'xxxxxxx') {
                    this.hideWarnings('SSHPassword');
                }
            });
        }
        
        // Generate password buttons
        $('.generate-password-btn').on('click', (e) => {
            e.preventDefault();
            const field = $(e.currentTarget).data('field');
            this.generatePassword(field);
        });
    },
    
    /**
     * Check initial passwords on page load
     */
    checkInitialPasswords() {
        // Remove any existing password-validate messages
        $('.password-validate').fadeOut(300, function() {
            $(this).remove();
        });
        
        // Check Web Admin Password
        const $webAdminPassword = $('#WebAdminPassword');
        if ($webAdminPassword.length > 0) {
            const webPassword = $webAdminPassword.val();
            if (webPassword && webPassword !== 'xxxxxxx') {
                // Use PasswordScore for initial check
                PasswordScore.checkPassStrength({
                    pass: webPassword,
                    bar: $('.password-score'),
                    section: $('.password-score-section'),
                    field: 'WebAdminPassword',
                    callback: (result) => {
                        // Only show warnings for weak passwords on initial load
                        if (result && !result.isValid) {
                            this.handleValidationResult(result, 'WebAdminPassword', true);
                        }
                    }
                });
            }
        }
        
        // Check SSH Password
        const $sshPassword = $('#SSHPassword');
        if ($sshPassword.length > 0) {
            const sshPassword = $sshPassword.val();
            const sshDisabled = $('#SSHDisableSSHPassword').checkbox('is checked');
            
            if (!sshDisabled && sshPassword && sshPassword !== 'xxxxxxx') {
                PasswordScore.checkPassStrength({
                    pass: sshPassword,
                    bar: $('.ssh-password-score'),
                    section: $('.ssh-password-score-section'),
                    field: 'SSHPassword',
                    callback: (result) => {
                        if (result && !result.isValid) {
                            this.handleValidationResult(result, 'SSHPassword', true);
                        }
                    }
                });
            }
        }
    },
    
    /**
     * Handle validation result from PasswordScore
     * 
     * @param {object} result Validation result
     * @param {string} field Field name
     * @param {boolean} isInitial Is this initial check
     */
    handleValidationResult(result, field, isInitial = false) {
        if (!this.options.showWarnings) {
            return;
        }
        
        // Update field validation state
        const $field = $(`#${field}`).closest('.field');
        $field.removeClass('error warning success');
        
        if (!result.isValid) {
            $field.addClass('error');
            this.showWarnings(result, field, isInitial);
        } else if (result.score < 60) {
            $field.addClass('warning');
            this.showWarnings(result, field, isInitial);
        } else if (result.score >= 80) {
            $field.addClass('success');
            // Hide warnings for strong passwords
            this.hideWarnings(field);
        }
    },
    
    /**
     * Show warnings for password
     * 
     * @param {object} result Validation result
     * @param {string} field Field name
     * @param {boolean} isInitial Is this initial check
     */
    showWarnings(result, field, isInitial = false) {
        const containerId = field === 'WebAdminPassword' 
            ? 'web-password-warnings'
            : 'ssh-password-warnings';
            
        let $container = $(`#${containerId}`);
        
        // Create container if it doesn't exist
        if ($container.length === 0) {
            const $field = $(`#${field}`).closest('.field');
            $container = $('<div>', {
                id: containerId,
                class: 'ui small message password-warnings'
            });
            $field.after($container);
        }
        
        // Clear existing content
        $container.empty().removeClass('negative warning info positive');
        
        if (!result.isValid) {
            $container.addClass('negative');
            
            if (result.isDefault) {
                $container.append(`
                    <div class="header">
                        ${globalTranslate.gs_SetPassword || 'Set Password'}
                    </div>
                    <p>${globalTranslate.gs_SetPasswordInfo || 'You are using a default password. Please change it.'}</p>
                `);
            } else if (result.isSimple) {
                $container.append(`
                    <div class="header">
                        ${globalTranslate.gs_WeakPassword || 'Weak Password'}
                    </div>
                    <p>${globalTranslate.gs_PasswordTooCommon || 'This password is too common and easily guessable.'}</p>
                `);
            } else if (result.messages && result.messages.length > 0) {
                $container.append(`
                    <div class="header">
                        ${globalTranslate.gs_PasswordRequirements || 'Password Requirements'}
                    </div>
                    <ul class="list">
                        ${result.messages.map(msg => `<li>${msg}</li>`).join('')}
                    </ul>
                `);
            }
        } else if (result.score < 60 && result.suggestions && result.suggestions.length > 0) {
            $container.addClass('warning');
            $container.append(`
                <div class="header">
                    ${globalTranslate.gs_PasswordSuggestions || 'Suggestions to improve password strength'}
                </div>
                <ul class="list">
                    ${result.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
            `);
        }
        
        // Show container if it has content
        if ($container.html()) {
            $container.show();
        } else {
            $container.hide();
        }
    },
    
    /**
     * Hide warnings for field
     * 
     * @param {string} field Field name
     */
    hideWarnings(field) {
        const containerId = field === 'WebAdminPassword' 
            ? 'web-password-warnings'
            : 'ssh-password-warnings';
        $(`#${containerId}`).hide();
    },
    
    /**
     * Generate secure password for field
     * 
     * @param {string} field Field name
     */
    generatePassword(field) {
        PasswordScore.generatePassword(16, (result) => {
            if (result && result.password) {
                // Set the password in the field
                $(`#${field}`).val(result.password);
                
                // Also update repeat field if exists
                const $repeatField = $(`#${field}Repeat`);
                if ($repeatField.length > 0) {
                    $repeatField.val(result.password);
                }
                
                // Validate the new password
                PasswordScore.checkPassStrength({
                    pass: result.password,
                    bar: field === 'WebAdminPassword' ? $('.password-score') : $('.ssh-password-score'),
                    section: field === 'WebAdminPassword' ? $('.password-score-section') : $('.ssh-password-score-section'),
                    field: field,
                    callback: (validationResult) => {
                        this.handleValidationResult(validationResult, field);
                    }
                });
                
                // Mark form as changed
                if (typeof Form !== 'undefined' && Form.checkValues) {
                    Form.checkValues();
                }
            }
        });
    }
};