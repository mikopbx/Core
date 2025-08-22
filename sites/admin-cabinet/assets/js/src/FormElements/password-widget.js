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

/* global globalTranslate, PasswordScore, PasswordValidationAPI, Form */

/**
 * Unified Password Widget Module
 * Provides password validation, generation, and UI feedback for any password field
 * 
 * Usage:
 * PasswordWidget.init('#myPasswordField', {
 *     context: 'provider',       // Context: 'provider', 'general', 'extension', 'ami'
 *     generateButton: true,      // Add generate button
 *     validateOnInput: true,     // Real-time validation
 *     validateOnlyGenerated: false, // Validate only generated passwords
 *     showStrengthBar: true,     // Show strength indicator
 *     showWarnings: true,        // Show warning messages
 *     checkOnLoad: true          // Check initial password
 * });
 */
const PasswordWidget = {
    
    /**
     * Active widget instances
     */
    instances: new Map(),
    
    /**
     * Default configuration
     */
    defaults: {
        context: 'general',
        generateButton: true,
        validateOnInput: true,
        validateOnlyGenerated: false,
        showStrengthBar: true,
        showWarnings: true,
        checkOnLoad: true,
        minScore: 60,
        generateLength: 16
    },
    
    /**
     * Initialize password widget for a field
     * @param {string|jQuery} selector - Field selector or jQuery object
     * @param {object} options - Widget options
     * @returns {object} Widget instance
     */
    init(selector, options = {}) {
        const $field = $(selector);
        if ($field.length === 0) {
            console.warn('PasswordWidget: Field not found', selector);
            return null;
        }
        
        const fieldId = $field.attr('id') || $field.attr('name') || Math.random().toString(36).substr(2, 9);
        
        // Destroy existing instance if any
        if (this.instances.has(fieldId)) {
            this.destroy(fieldId);
        }
        
        // Create new instance
        const instance = {
            id: fieldId,
            $field: $field,
            $container: $field.closest('.field'),
            options: { ...this.defaults, ...options },
            isGenerated: false,
            elements: {}
        };
        
        // Initialize widget
        this.setupUI(instance);
        this.bindEvents(instance);
        
        // Check initial password if needed
        if (instance.options.checkOnLoad) {
            this.checkPassword(instance);
        }
        
        // Store instance
        this.instances.set(fieldId, instance);
        
        return instance;
    },
    
    /**
     * Setup UI elements
     * @param {object} instance - Widget instance
     */
    setupUI(instance) {
        const { $field, $container, options } = instance;
        
        // Add generate button if needed
        if (options.generateButton) {
            this.addGenerateButton(instance);
        }
        
        // Add strength bar if needed
        if (options.showStrengthBar) {
            this.addStrengthBar(instance);
        }
        
        // Prepare warning container
        if (options.showWarnings) {
            instance.elements.$warnings = $(`<div id="${instance.id}-warnings" class="ui small message password-warnings" style="display:none;"></div>`);
            $container.after(instance.elements.$warnings);
        }
    },
    
    /**
     * Add generate button to field
     * @param {object} instance - Widget instance
     */
    addGenerateButton(instance) {
        const { $field, $container } = instance;
        const $inputWrapper = $container.find('.ui.input');
        
        // Check if there's already a generate button (clipboard button on providers)
        let $generateBtn = $inputWrapper.find('button.clipboard, button.generate-password');
        
        if ($generateBtn.length === 0) {
            // Add action class to input wrapper
            if (!$inputWrapper.hasClass('action')) {
                $inputWrapper.addClass('action');
            }
            
            // Create generate button
            $generateBtn = $(`
                <button class="ui icon button generate-password" type="button" 
                        title="${globalTranslate.psw_GeneratePassword || 'Generate password'}">
                    <i class="sync alternate icon"></i>
                </button>
            `);
            $inputWrapper.append($generateBtn);
        }
        
        instance.elements.$generateBtn = $generateBtn;
    },
    
    /**
     * Add strength bar to field
     * @param {object} instance - Widget instance
     */
    addStrengthBar(instance) {
        const { $container } = instance;
        
        let $scoreSection = $container.find('.password-score-section');
        if ($scoreSection.length === 0) {
            $scoreSection = $(`
                <div class="password-score-section" style="display: none;">
                    <div class="ui small progress password-score">
                        <div class="bar"></div>
                    </div>
                </div>
            `);
            $container.append($scoreSection);
        }
        
        const $progressBar = $scoreSection.find('.password-score');
        $progressBar.progress({
            percent: 0,
            showActivity: false
        });
        
        instance.elements.$scoreSection = $scoreSection;
        instance.elements.$progressBar = $progressBar;
    },
    
    /**
     * Bind event handlers
     * @param {object} instance - Widget instance
     */
    bindEvents(instance) {
        const { $field, options } = instance;
        
        // Generate button click
        if (instance.elements.$generateBtn) {
            instance.elements.$generateBtn.off('click.passwordWidget').on('click.passwordWidget', (e) => {
                e.preventDefault();
                this.generatePassword(instance);
            });
        }
        
        // Real-time validation on input
        if (options.validateOnInput) {
            $field.off('input.passwordWidget').on('input.passwordWidget', () => {
                this.handleInput(instance);
            });
        }
        
        // Clear warnings on empty
        $field.off('change.passwordWidget').on('change.passwordWidget', () => {
            const value = $field.val();
            if (!value || value === 'xxxxxxx') {
                this.hideWarnings(instance);
                if (instance.elements.$scoreSection) {
                    instance.elements.$scoreSection.hide();
                }
            }
        });
    },
    
    /**
     * Handle password input
     * @param {object} instance - Widget instance
     */
    handleInput(instance) {
        const { $field, options } = instance;
        const password = $field.val();
        
        // Check if should validate
        if (!this.shouldValidate(instance, password)) {
            this.hideWarnings(instance);
            if (instance.elements.$scoreSection) {
                instance.elements.$scoreSection.hide();
            }
            return;
        }
        
        // Show strength bar
        if (instance.elements.$scoreSection) {
            instance.elements.$scoreSection.show();
        }
        
        // Validate password
        this.validatePassword(instance, password);
    },
    
    /**
     * Check if password should be validated
     * @param {object} instance - Widget instance
     * @param {string} password - Password value
     * @returns {boolean}
     */
    shouldValidate(instance, password) {
        if (!password || password === 'xxxxxxx') {
            return false;
        }
        
        const { options } = instance;
        
        // Always validate generated passwords
        if (instance.isGenerated) {
            return true;
        }
        
        // Check context-specific rules
        if (options.context === 'provider') {
            const registrationType = $('#registration_type').val();
            if (registrationType === 'none') {
                return true;
            }
            return !options.validateOnlyGenerated;
        }
        
        return !options.validateOnlyGenerated;
    },
    
    /**
     * Validate password
     * @param {object} instance - Widget instance
     * @param {string} password - Password to validate
     */
    validatePassword(instance, password) {
        const { options } = instance;
        
        // Use PasswordScore for validation
        PasswordScore.checkPassStrength({
            pass: password,
            bar: instance.elements.$progressBar,
            section: instance.elements.$scoreSection,
            field: `${options.context}_${instance.id}`,
            callback: (result) => {
                this.handleValidationResult(instance, result);
            }
        });
    },
    
    /**
     * Handle validation result
     * @param {object} instance - Widget instance
     * @param {object} result - Validation result
     */
    handleValidationResult(instance, result) {
        if (!result) return;
        
        const { $container, options } = instance;
        const $field = $container;
        
        // Update field state
        $field.removeClass('error warning success');
        
        if (result.isDefault || result.isSimple || result.isInDictionary) {
            $field.addClass('error');
            if (options.showWarnings) {
                this.showWarnings(instance, result, 'error');
            }
        } else if (!result.isValid || result.score < options.minScore) {
            $field.addClass('warning');
            if (options.showWarnings) {
                this.showWarnings(instance, result, 'warning');
            }
        } else if (result.score >= 80) {
            $field.addClass('success');
            this.hideWarnings(instance);
        } else {
            this.hideWarnings(instance);
        }
    },
    
    /**
     * Generate password
     * @param {object} instance - Widget instance
     */
    generatePassword(instance) {
        const { $field, options } = instance;
        const $btn = instance.elements.$generateBtn;
        
        if ($btn) {
            $btn.addClass('loading');
        }
        
        // Use API if available
        if (typeof PasswordValidationAPI !== 'undefined') {
            PasswordValidationAPI.generatePassword(options.generateLength, (result) => {
                if ($btn) $btn.removeClass('loading');
                
                if (result && result.password) {
                    this.setGeneratedPassword(instance, result.password);
                }
            });
        } else {
            // Fallback generation
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let password = '';
            for (let i = 0; i < options.generateLength; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            
            if ($btn) $btn.removeClass('loading');
            this.setGeneratedPassword(instance, password);
        }
    },
    
    /**
     * Set generated password
     * @param {object} instance - Widget instance
     * @param {string} password - Generated password
     */
    setGeneratedPassword(instance, password) {
        const { $field, $container } = instance;
        
        // Set password
        $field.val(password);
        instance.isGenerated = true;
        
        // Hide warnings
        this.hideWarnings(instance);
        
        // Show success state
        if (instance.elements.$scoreSection) {
            instance.elements.$scoreSection.show();
        }
        
        if (instance.elements.$progressBar) {
            instance.elements.$progressBar
                .removeClass('red orange yellow olive')
                .addClass('green')
                .progress('set percent', 100);
        }
        
        $container.removeClass('error warning').addClass('success');
        
        // Mark form as changed
        if (typeof Form !== 'undefined' && Form.checkValues) {
            Form.checkValues();
        }
    },
    
    /**
     * Show warnings
     * @param {object} instance - Widget instance
     * @param {object} result - Validation result
     * @param {string} type - Warning type
     */
    showWarnings(instance, result, type = 'warning') {
        if (!instance.elements.$warnings) return;
        
        const $warnings = instance.elements.$warnings;
        $warnings.empty()
            .removeClass('negative warning info positive error success')
            .addClass(type === 'error' ? 'negative' : type);
        
        let content = '';
        
        if (result.isDefault) {
            content = `
                <div class="header">
                    <i class="exclamation triangle icon"></i>
                    ${globalTranslate.psw_DefaultPasswordWarning || 'Default Password Detected'}
                </div>
                <p>${globalTranslate.psw_ChangeDefaultPassword || 'Please change the default password for security.'}</p>
            `;
        } else if (result.isSimple || result.isInDictionary) {
            content = `
                <div class="header">
                    <i class="exclamation triangle icon"></i>
                    ${globalTranslate.psw_WeakPassword || 'Weak Password'}
                </div>
                <p>${globalTranslate.psw_PasswordTooCommon || 'This password is too common and easily guessable.'}</p>
            `;
        } else if (result.messages && result.messages.length > 0) {
            content = `
                <div class="header">
                    <i class="info circle icon"></i>
                    ${globalTranslate.psw_PasswordRequirements || 'Password Requirements'}
                </div>
                <ul class="list">
                    ${result.messages.map(msg => `<li>${msg}</li>`).join('')}
                </ul>
            `;
        }
        
        // Add generate button suggestion for weak passwords
        if ((result.score < 60 || !result.isValid) && type === 'error') {
            content += `
                <div class="ui divider"></div>
                <p>
                    <i class="idea icon"></i>
                    ${globalTranslate.psw_UseGenerateButton || 'Use the generate button to create a strong password.'}
                </p>
            `;
        }
        
        if (content) {
            $warnings.html(content).show();
        } else {
            $warnings.hide();
        }
    },
    
    /**
     * Hide warnings
     * @param {object} instance - Widget instance
     */
    hideWarnings(instance) {
        if (instance.elements.$warnings) {
            instance.elements.$warnings.hide();
        }
        instance.$container.removeClass('error warning success');
    },
    
    /**
     * Check initial password
     * @param {object} instance - Widget instance
     */
    checkPassword(instance) {
        const password = instance.$field.val();
        if (this.shouldValidate(instance, password)) {
            this.validatePassword(instance, password);
        }
    },
    
    /**
     * Destroy widget instance
     * @param {string} fieldId - Field ID
     */
    destroy(fieldId) {
        const instance = this.instances.get(fieldId);
        if (!instance) return;
        
        // Unbind events
        instance.$field.off('.passwordWidget');
        if (instance.elements.$generateBtn) {
            instance.elements.$generateBtn.off('.passwordWidget');
        }
        
        // Remove elements
        if (instance.elements.$warnings) {
            instance.elements.$warnings.remove();
        }
        if (instance.elements.$scoreSection) {
            instance.elements.$scoreSection.remove();
        }
        
        // Remove instance
        this.instances.delete(fieldId);
    },
    
    /**
     * Destroy all widget instances
     */
    destroyAll() {
        this.instances.forEach((instance, fieldId) => {
            this.destroy(fieldId);
        });
    }
};

// Export for use in other modules
// export default PasswordWidget;