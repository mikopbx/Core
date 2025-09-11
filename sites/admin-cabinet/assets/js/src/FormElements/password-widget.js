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

/* global globalTranslate, PasswordValidationAPI, Form, ClipboardJS */

/**
 * Password Widget Module
 * 
 * A comprehensive password field component that provides:
 * - Password generation
 * - Strength validation with real-time feedback
 * - Visual progress indicator
 * - API-based validation with local fallback
 * - Form validation integration
 * 
 * Usage:
 * const widget = PasswordWidget.init('#myPasswordField', {
 *     mode: 'full',              // 'full' | 'generate-only' | 'display-only' | 'disabled'
 *     validation: 'soft',        // 'hard' | 'soft' | 'none'
 *     minScore: 60,
 *     generateLength: 16,
 *     onValidate: (isValid, score, messages) => { ... }
 * });
 */
const PasswordWidget = {
    
    /**
     * Active widget instances
     */
    instances: new Map(),
    
    
    /**
     * Validation types
     */
    VALIDATION: {
        HARD: 'hard',   // Block form submission if invalid
        SOFT: 'soft',   // Show warnings but allow submission
        NONE: 'none'    // No validation
    },
    
    /**
     * Cache for validation results
     */
    validationCache: {},
    
    /**
     * Timers for debouncing validation
     */
    validationTimers: {},
    
    /**
     * Default configuration
     */
    defaults: {
        validation: 'soft',
        generateButton: true,
        showPasswordButton: true,  // Show/hide password toggle
        clipboardButton: true,      // Copy to clipboard button
        showStrengthBar: true,
        showWarnings: true,
        minScore: 60,
        generateLength: 16,
        validateOnInput: true,
        checkOnLoad: false,
        onValidate: null,        // Callback: (isValid, score, messages) => void
        onGenerate: null,        // Callback: (password) => void
        validationRules: null    // Custom validation rules for Form.js
    },
    
    /**
     * Initialize password widget
     * @param {string|jQuery} selector - Field selector or jQuery object
     * @param {object} options - Widget options
     * @returns {object|null} Widget instance
     */
    init(selector, options = {}) {
        const $field = $(selector);
        if ($field.length === 0) {
            return null;
        }
        
        const fieldId = $field.attr('id') || $field.attr('name') || Math.random().toString(36).substr(2, 9);
        
        // Destroy existing instance if any
        if (this.instances.has(fieldId)) {
            this.destroy(fieldId);
        }
        
        // Create instance
        const instance = {
            fieldId,
            $field,
            $container: $field.closest('.field'),
            options: { ...this.defaults, ...options },
            elements: {},
            state: {
                isValid: true,
                score: 0,
                strength: '',
                messages: [],
                isGenerated: false,
                isFocused: false
            }
        };
        
        // Store instance
        this.instances.set(fieldId, instance);
        
        // Initialize
        this.setupUI(instance);
        this.bindEvents(instance);
        
        // Setup form validation if needed
        if (instance.options.validation !== this.VALIDATION.NONE) {
            this.setupFormValidation(instance);
        }
        
        // Check initial value if requested
        if (instance.options.checkOnLoad && $field.val()) {
            this.checkPassword(instance);
        }
        
        return instance;
    },
    
    /**
     * Setup UI elements
     * @param {object} instance - Widget instance
     */
    setupUI(instance) {
        const { $field, $container, options } = instance;
        
        // Find or create input wrapper
        let $inputWrapper = $field.closest('.ui.input');
        if ($inputWrapper.length === 0) {
            $field.wrap('<div class="ui input"></div>');
            $inputWrapper = $field.parent();
        }
        
        // Add show/hide password button if needed
        if (options.showPasswordButton) {
            this.addShowHideButton(instance);
        }
        
        // Add generate button if needed
        if (options.generateButton) {
            this.addGenerateButton(instance);
        }
        
        // Add clipboard button if needed
        if (options.clipboardButton) {
            this.addClipboardButton(instance);
        }
        
        // Add strength bar if needed
        if (options.showStrengthBar) {
            this.addStrengthBar(instance);
        }
        
        // Add warnings container if needed
        if (options.showWarnings) {
            this.addWarningsContainer(instance);
        }
        
        // Update input wrapper class based on button visibility
        this.updateInputWrapperClass(instance);
    },
    
    /**
     * Add show/hide password button
     * @param {object} instance - Widget instance
     */
    addShowHideButton(instance) {
        const { $field } = instance;
        const $inputWrapper = $field.closest('.ui.input');
        
        // Check if button already exists
        if ($inputWrapper.find('button.show-hide-password').length > 0) {
            instance.elements.$showHideBtn = $inputWrapper.find('button.show-hide-password');
            return;
        }
        
        // Create button
        const $showHideBtn = $(`
            <button type="button" class="ui basic icon button show-hide-password" 
                    data-content="${globalTranslate.bt_ToolTipShowPassword || 'Show password'}">
                <i class="eye icon"></i>
            </button>
        `);
        
        // Append to wrapper
        $inputWrapper.append($showHideBtn);
        instance.elements.$showHideBtn = $showHideBtn;
    },
    
    /**
     * Add generate button
     * @param {object} instance - Widget instance
     */
    addGenerateButton(instance) {
        const { $field } = instance;
        const $inputWrapper = $field.closest('.ui.input');
        
        // Check if button already exists
        if ($inputWrapper.find('button.generate-password').length > 0) {
            instance.elements.$generateBtn = $inputWrapper.find('button.generate-password');
            return;
        }
        
        // Create button
        const $generateBtn = $(`
            <button type="button" class="ui basic icon button generate-password" 
                    data-content="${globalTranslate.bt_ToolTipGeneratePassword || 'Generate password'}">
                <i class="sync icon"></i>
            </button>
        `);
        
        // Append to wrapper
        $inputWrapper.append($generateBtn);
        instance.elements.$generateBtn = $generateBtn;
    },
    
    /**
     * Add clipboard button
     * @param {object} instance - Widget instance
     */
    addClipboardButton(instance) {
        const { $field } = instance;
        const $inputWrapper = $field.closest('.ui.input');
        
        // Check if button already exists
        if ($inputWrapper.find('button.clipboard').length > 0) {
            instance.elements.$clipboardBtn = $inputWrapper.find('button.clipboard');
            return;
        }
        
        // Create button
        const currentValue = $field.val() || '';
        const $clipboardBtn = $(`
            <button type="button" class="ui basic icon button clipboard" 
                    data-clipboard-text="${currentValue}"
                    data-content="${globalTranslate.bt_ToolTipCopyPassword || 'Copy password'}">
                <i class="icons">
                    <i class="icon copy"></i>
                    <i class="corner key icon"></i>
                </i>
            </button>
        `);
        
        // Append to wrapper
        $inputWrapper.append($clipboardBtn);
        instance.elements.$clipboardBtn = $clipboardBtn;
    },
    
    /**
     * Add strength bar
     * @param {object} instance - Widget instance
     */
    addStrengthBar(instance) {
        const { $container } = instance;
        
        // Check if progress bar already exists
        if ($container.find('.password-strength-progress').length > 0) {
            instance.elements.$progressBar = $container.find('.password-strength-progress');
            instance.elements.$progressSection = $container.find('.password-strength-section');
            return;
        }
        
        // Create progress bar
        const $progressSection = $(`
            <div class="password-strength-section" style="display:none;">
                <div class="ui small password-strength-progress progress bottom attached ">
                    <div class="bar"></div>
                </div>
            </div>
        `);
        
        // Insert after field
        $container.append($progressSection);
        
        instance.elements.$progressBar = $progressSection.find('.password-strength-progress');
        instance.elements.$progressSection = $progressSection;
    },
    
    /**
     * Add warnings container
     * @param {object} instance - Widget instance
     */
    addWarningsContainer(instance) {
        const { $container } = instance;
        
        // Check if warnings container already exists
        if ($container.find('.password-warnings').length > 0) {
            instance.elements.$warnings = $container.find('.password-warnings');
            return;
        }
        
        // Create warnings container (will be populated when needed)
        const $warnings = $('<div class="password-warnings"></div>');
        
        // Append to the field container (after progress bar if exists)
        $container.append($warnings);
        
        instance.elements.$warnings = $warnings;
    },
    
    /**
     * Bind events
     * @param {object} instance - Widget instance
     */
    bindEvents(instance) {
        const { $field, options } = instance;
        
        // Show/hide button click
        if (instance.elements.$showHideBtn) {
            instance.elements.$showHideBtn.off('click.passwordWidget').on('click.passwordWidget', (e) => {
                e.preventDefault();
                this.togglePasswordVisibility(instance);
            });
        }
        
        // Generate button click
        if (instance.elements.$generateBtn) {
            instance.elements.$generateBtn.off('click.passwordWidget').on('click.passwordWidget', (e) => {
                e.preventDefault();
                this.generatePassword(instance);
            });
        }
        
        // Initialize clipboard functionality for copy button
        if (instance.elements.$clipboardBtn && typeof ClipboardJS !== 'undefined') {
            // Initialize ClipboardJS for the button
            if (!instance.clipboard) {
                instance.clipboard = new ClipboardJS(instance.elements.$clipboardBtn[0]);
                
                // Initialize popup for clipboard button
                instance.elements.$clipboardBtn.popup({
                    on: 'manual',
                });
                
                // Handle successful copy
                instance.clipboard.on('success', (e) => {
                    instance.elements.$clipboardBtn.popup('show');
                    setTimeout(() => {
                        instance.elements.$clipboardBtn.popup('hide');
                    }, 1500);
                    e.clearSelection();
                });
                
            }
        }
        
        // Field input event
        if (options.validateOnInput) {
            $field.off('input.passwordWidget change.passwordWidget').on('input.passwordWidget change.passwordWidget', () => {
                this.handleInput(instance);
            });
        }
        
        // Update clipboard button when password changes
        $field.on('input.passwordWidget change.passwordWidget', () => {
            const value = $field.val();
            // Clear validation state on empty
            if (!value || value === '') {
                this.clearValidation(instance);
            }
            // Update all clipboard buttons (widget's and any external ones)
            $('.clipboard').attr('data-clipboard-text', value);
        });
        
        // Focus event - show progress bar when field is focused
        $field.off('focus.passwordWidget').on('focus.passwordWidget', () => {
            instance.state.isFocused = true;
            // Show progress bar if there's a password value
            const password = $field.val();
            if (password && password !== '' && !this.isMaskedPassword(password)) {
                if (instance.elements.$progressSection) {
                    instance.elements.$progressSection.show();
                }
                // Trigger validation to update progress bar
                if (options.validateOnInput) {
                    this.validatePassword(instance, password);
                }
            }
        });
        
        // Blur event - hide progress bar when field loses focus
        $field.off('blur.passwordWidget').on('blur.passwordWidget', () => {
            instance.state.isFocused = false;
            // Hide only progress bar, keep warnings visible
            if (instance.elements.$progressSection) {
                instance.elements.$progressSection.hide();
            }
            // Never hide warnings on blur - they should remain visible
        });
    },
    
    
    /**
     * Disable widget
     * @param {object} instance - Widget instance
     */
    disable(instance) {
        instance.$field.prop('disabled', true);
        if (instance.elements.$generateBtn) {
            instance.elements.$generateBtn.prop('disabled', true);
        }
        instance.$container.addClass('disabled');
    },
    
    /**
     * Enable widget
     * @param {object} instance - Widget instance
     */
    enable(instance) {
        instance.$field.prop('disabled', false);
        if (instance.elements.$generateBtn) {
            instance.elements.$generateBtn.prop('disabled', false);
        }
        instance.$container.removeClass('disabled');
    },
    
    /**
     * Set read-only mode
     * @param {object} instance - Widget instance
     */
    setReadOnly(instance) {
        instance.$field.prop('readonly', true);
        if (instance.elements.$generateBtn) {
            instance.elements.$generateBtn.hide();
        }
    },
    
    /**
     * Setup form validation
     * @param {object} instance - Widget instance
     */
    setupFormValidation(instance) {
        const { $field, options } = instance;
        
        // Skip if Form object is not available
        if (typeof Form === 'undefined' || !Form.validateRules) {
            return;
        }
        
        const fieldName = $field.attr('name') || $field.attr('id');
        if (!fieldName) {
            return;
        }
        
        // Use custom rules if provided
        if (options.validationRules) {
            Form.validateRules[fieldName] = options.validationRules;
            return;
        }
        
        // Create validation rules based on mode
        const rules = [];
        
        // Add non-empty rule for hard validation
        if (options.validation === this.VALIDATION.HARD) {
            rules.push({
                type: 'empty',
                prompt: globalTranslate.pw_ValidatePasswordEmpty || 'Password cannot be empty'
            });
        }
        
        // Add strength validation
        if (options.minScore > 0 && options.validation === this.VALIDATION.HARD) {
            rules.push({
                type: 'passwordStrength',
                prompt: globalTranslate.pw_ValidatePasswordWeak || 'Password is too weak'
            });
        }
        
        if (rules.length > 0) {
            Form.validateRules[fieldName] = {
                identifier: fieldName,
                rules: rules
            };
        }
        
        // Add custom validation rule for password strength
        if (typeof $.fn.form.settings.rules.passwordStrength === 'undefined') {
            $.fn.form.settings.rules.passwordStrength = () => {
                return instance.state.score >= options.minScore;
            };
        }
    },
    
    /**
     * Check if password is masked (server returns these when password is hidden)
     * @param {string} password - Password to check
     * @returns {boolean} True if password appears to be masked
     */
    isMaskedPassword(password) {
        return /^[xX]{6,}$|^\*{6,}$|^HIDDEN$|^MASKED$/i.test(password);
    },
    
    /**
     * Handle input event
     * @param {object} instance - Widget instance
     */
    handleInput(instance) {
        const { $field, options } = instance;
        const password = $field.val();
        
        // Skip validation if disabled
        if (options.validation === this.VALIDATION.NONE) {
            return;
        }
        
        // Skip validation for masked passwords
        if (this.isMaskedPassword(password)) {
            this.clearValidation(instance);
            return;
        }
        
        // Skip validation if this is a generated password (already validated in setGeneratedPassword)
        if (instance.state.isGenerated) {
            instance.state.isGenerated = false; // Reset flag for next input
            return;
        }
        
        // Validate password only if field is focused
        if (instance.state.isFocused) {
            this.validatePassword(instance, password);
        }
    },
    
    /**
     * Validate password
     * @param {object} instance - Widget instance
     * @param {string} password - Password to validate
     */
    validatePassword(instance, password) {
        const { options } = instance;
        
        // Handle empty password
        if (!password || password === '') {
            this.clearValidation(instance);
            return;
        }
        
        // Skip validation for masked passwords (server returns these when password is hidden)
        // Common patterns: xxxxxxx, XXXXXXXX, *******, HIDDEN, etc.
        if (this.isMaskedPassword(password)) {
            this.clearValidation(instance);
            return;
        }
        
        // Show progress section only if field is focused
        if (instance.elements.$progressSection && instance.state.isFocused) {
            instance.elements.$progressSection.show();
        }
        
        // Check cache first
        const cacheKey = `${instance.fieldId}:${password}`;
        if (this.validationCache[cacheKey]) {
            this.handleValidationResult(instance, this.validationCache[cacheKey]);
            return;
        }
        
        // Clear existing timer
        if (this.validationTimers[instance.fieldId]) {
            clearTimeout(this.validationTimers[instance.fieldId]);
        }
        
        // Show immediate local feedback
        const localScore = this.scorePasswordLocal(password);
        this.updateProgressBar(instance, localScore);
        
        // Debounce API call
        this.validationTimers[instance.fieldId] = setTimeout(() => {
            // Use API if available
            if (typeof PasswordValidationAPI !== 'undefined') {
                PasswordValidationAPI.validatePassword(password, instance.fieldId, (result) => {
                    if (result) {
                        // Cache result
                        this.validationCache[cacheKey] = result;
                        this.handleValidationResult(instance, result);
                    }
                });
            } else {
                // Use local validation
                const result = {
                    score: localScore,
                    isValid: localScore >= options.minScore,
                    strength: this.getStrengthLabel(localScore),
                    messages: []
                };
                this.handleValidationResult(instance, result);
            }
        }, 700); // Increased debounce for more comfortable typing
    },
    
    /**
     * Calculate password score locally
     * @param {string} password - Password to score
     * @returns {number} Score from 0-100
     */
    scorePasswordLocal(password) {
        let score = 0;
        if (!password || password.length === 0) {
            return score;
        }
        
        const length = password.length;
        
        // Length scoring (up to 30 points)
        if (length >= 16) {
            score += 30;
        } else if (length >= 12) {
            score += 20;
        } else if (length >= 8) {
            score += 10;
        } else if (length >= 6) {
            score += 5;
        }
        
        // Character diversity (up to 40 points)
        if (/[a-z]/.test(password)) score += 10; // Lowercase
        if (/[A-Z]/.test(password)) score += 10; // Uppercase
        if (/\d/.test(password)) score += 10;     // Digits
        if (/\W/.test(password)) score += 10;     // Special characters
        
        // Pattern complexity (up to 30 points)
        const uniqueChars = new Set(password).size;
        const uniqueRatio = uniqueChars / length;
        
        if (uniqueRatio > 0.7) {
            score += 20;
        } else if (uniqueRatio > 0.5) {
            score += 15;
        } else if (uniqueRatio > 0.3) {
            score += 10;
        } else {
            score += 5;
        }
        
        // Penalties for common patterns
        if (/(.)\1{2,}/.test(password)) {
            score -= 10; // Repeating characters
        }
        if (/(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)/i.test(password)) {
            score -= 10; // Sequential patterns
        }
        
        return Math.max(0, Math.min(100, score));
    },
    
    /**
     * Get strength label for score
     * @param {number} score - Password score
     * @returns {string} Strength label
     */
    getStrengthLabel(score) {
        if (score < 20) return 'very_weak';
        if (score < 40) return 'weak';
        if (score < 60) return 'fair';
        if (score < 80) return 'good';
        return 'strong';
    },
    
    /**
     * Update progress bar
     * @param {object} instance - Widget instance
     * @param {number} score - Password score
     */
    updateProgressBar(instance, score) {
        const { elements } = instance;
        
        if (!elements.$progressBar || elements.$progressBar.length === 0) {
            return;
        }
        
        // Update progress
        elements.$progressBar.progress({
            percent: Math.min(score, 100),
            showActivity: false,
        });
        
        // Update color
        elements.$progressBar
            .removeClass('red orange yellow olive green')
            .addClass(this.getColorForScore(score));
    },
    
    /**
     * Get color class for score
     * @param {number} score - Password score
     * @returns {string} Color class name
     */
    getColorForScore(score) {
        if (score < 20) return 'red';
        if (score < 40) return 'orange';
        if (score < 60) return 'yellow';
        if (score < 80) return 'olive';
        return 'green';
    },
    
    /**
     * Handle validation result
     * @param {object} instance - Widget instance
     * @param {object} result - Validation result
     */
    handleValidationResult(instance, result) {
        if (!result) return;
        
        const { options } = instance;
        
        // Update state
        instance.state = {
            isValid: result.isValid || result.score >= options.minScore,
            score: result.score,
            strength: result.strength || this.getStrengthLabel(result.score),
            messages: result.messages || [],
            isGenerated: instance.state.isGenerated
        };
        
        // Update UI
        this.updateProgressBar(instance, result.score);
        
        // Show warnings/errors
        if (options.showWarnings && result.messages && result.messages.length > 0) {
            const messageType = instance.state.isValid ? 'warning' : 'error';
            this.showWarnings(instance, result, messageType);
        } else {
            this.hideWarnings(instance);
        }
        
        // Call validation callback
        if (options.onValidate) {
            options.onValidate(instance.state.isValid, result.score, result.messages);
        }
        
        // Update form validation state
        if (Form && Form.$formObj) {
            const fieldName = instance.$field.attr('name') || instance.$field.attr('id');
            if (!instance.state.isValid && options.validation === this.VALIDATION.HARD) {
                Form.$formObj.form('add prompt', fieldName, result.messages[0] || 'Invalid password');
            } else {
                Form.$formObj.form('remove prompt', fieldName);
            }
        }
    },
    
    /**
     * Generate password
     * @param {object} instance - Widget instance
     */
    generatePassword(instance) {
        const { options } = instance;
        
        // Show loading state
        if (instance.elements.$generateBtn) {
            instance.elements.$generateBtn.addClass('loading');
        }
        
        // Generate password
        const generateCallback = (result) => {
            const password = typeof result === 'string' ? result : result.password;
            
            // Set password
            this.setGeneratedPassword(instance, password);
            
            // Remove loading state
            if (instance.elements.$generateBtn) {
                instance.elements.$generateBtn.removeClass('loading');
            }
            
            // Call callback
            if (options.onGenerate) {
                options.onGenerate(password);
            }
        };
        
        // Use API if available
        if (typeof PasswordValidationAPI !== 'undefined') {
            PasswordValidationAPI.generatePassword(options.generateLength, generateCallback);
        } else {
            // Simple local generator
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let password = '';
            for (let i = 0; i < options.generateLength; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            generateCallback(password);
        }
    },
    
    /**
     * Set generated password
     * @param {object} instance - Widget instance
     * @param {string} password - Generated password
     */
    setGeneratedPassword(instance, password) {
        const { $field, $container, options } = instance;
        
        // Set generated flag first to prevent duplicate validation
        instance.state.isGenerated = true;
        
        // Set value without triggering change event yet
        $field.val(password);
        
        // Update all clipboard buttons (widget's and any external ones)
        $('.clipboard').attr('data-clipboard-text', password);
        
        // Validate once if needed
        if (options.validation !== this.VALIDATION.NONE) {
            this.validatePassword(instance, password);
        }
        
        // Now trigger change for form tracking (validation already done above)
        $field.trigger('change')
        
        // Trigger form change
        if (typeof Form !== 'undefined' && Form.dataChanged) {
            Form.dataChanged();
        }
    },
    
    /**
     * Show warnings
     * @param {object} instance - Widget instance
     * @param {object} result - Validation result
     * @param {string} type - Message type (warning/error)
     */
    showWarnings(instance, result, type = 'warning') {
        if (!instance.elements.$warnings) return;
        
        const { elements } = instance;
        const colorClass = type === 'error' ? 'red' : 'orange';
        
        // Clear existing warnings
        elements.$warnings.empty();
        
        // Add warnings as pointing label
        if (result.messages && result.messages.length > 0) {
            // Choose icon based on message type
            const iconClass = type === 'error' ? 'exclamation circle' : 'exclamation triangle';
            
            // Create list items from messages with icons
            const listItems = result.messages.map(msg => `
                <div class="item">
                    <i class="${iconClass} icon"></i>
                    <div class="content">${msg}</div>
                </div>
            `).join('');
            
            // Create pointing above label with list (points to password field)
            const $label = $(`
                <div class="ui pointing ${colorClass} basic label">
                    <div class="ui list">
                        ${listItems}
                    </div>
                </div>
            `);
            
            elements.$warnings.append($label).show();
        }
    },
    
    /**
     * Hide warnings
     * @param {object} instance - Widget instance
     */
    hideWarnings(instance) {
        if (instance.elements.$warnings) {
            instance.elements.$warnings.empty().hide();
        }
    },
    
    /**
     * Toggle password visibility
     * @param {object} instance - Widget instance
     */
    togglePasswordVisibility(instance) {
        const { $field } = instance;
        const $showHideBtn = instance.elements.$showHideBtn;
        
        if (!$showHideBtn) return;
        
        const $icon = $showHideBtn.find('i');
        
        if ($field.attr('type') === 'password') {
            // Show password
            $field.attr('type', 'text');
            $icon.removeClass('eye').addClass('eye slash');
            $showHideBtn.attr('data-content', globalTranslate.bt_ToolTipHidePassword || 'Hide password');
        } else {
            // Hide password
            $field.attr('type', 'password');
            $icon.removeClass('eye slash').addClass('eye');
            $showHideBtn.attr('data-content', globalTranslate.bt_ToolTipShowPassword || 'Show password');
        }
    },
    
    /**
     * Clear validation
     * @param {object} instance - Widget instance
     */
    clearValidation(instance) {
        // Clear warnings when explicitly clearing validation (empty password)
        this.hideWarnings(instance);
        if (instance.elements.$progressSection) {
            instance.elements.$progressSection.hide();
        }
        if (instance.elements.$progressBar) {
            instance.elements.$progressBar.progress({ percent: 0 });
        }
        instance.state = {
            isValid: true,
            score: 0,
            strength: '',
            messages: [],
            isGenerated: false,
            isFocused: instance.state.isFocused || false
        };
    },
    
    /**
     * Check password (manual validation)
     * @param {object} instance - Widget instance
     */
    checkPassword(instance) {
        const password = instance.$field.val();
        if (password && password !== '') {
            // Skip validation for masked passwords
            if (this.isMaskedPassword(password)) {
                this.clearValidation(instance);
                return;
            }
            // For initial check, don't show progress bar but do validate and show warnings
            this.validatePassword(instance, password);
        }
    },
    
    /**
     * Update configuration
     * @param {string|object} instanceOrFieldId - Instance or field ID
     * @param {object} newOptions - New options
     */
    updateConfig(instanceOrFieldId, newOptions) {
        const instance = typeof instanceOrFieldId === 'string' 
            ? this.instances.get(instanceOrFieldId)
            : instanceOrFieldId;
            
        if (!instance) {
            return;
        }
        
        // Update options
        instance.options = { ...instance.options, ...newOptions };
        
        // Handle dynamic button visibility
        if ('showPasswordButton' in newOptions) {
            if (newOptions.showPasswordButton && !instance.elements.$showHideBtn) {
                // Add button if it doesn't exist
                this.addShowHideButton(instance);
                // Re-bind events for the new button
                if (instance.elements.$showHideBtn) {
                    instance.elements.$showHideBtn.off('click.passwordWidget').on('click.passwordWidget', (e) => {
                        e.preventDefault();
                        this.togglePasswordVisibility(instance);
                    });
                }
            } else if (!newOptions.showPasswordButton && instance.elements.$showHideBtn) {
                // Remove button if it exists
                instance.elements.$showHideBtn.remove();
                delete instance.elements.$showHideBtn;
            }
        }
        
        // Handle generate button visibility
        if ('generateButton' in newOptions) {
            if (newOptions.generateButton && !instance.elements.$generateBtn) {
                // Add button if it doesn't exist
                this.addGenerateButton(instance);
                // Re-bind events for the new button
                if (instance.elements.$generateBtn) {
                    instance.elements.$generateBtn.off('click.passwordWidget').on('click.passwordWidget', (e) => {
                        e.preventDefault();
                        this.generatePassword(instance);
                    });
                    // Initialize popup
                    instance.elements.$generateBtn.popup();
                }
            } else if (!newOptions.generateButton && instance.elements.$generateBtn) {
                // Remove button if it exists
                instance.elements.$generateBtn.remove();
                delete instance.elements.$generateBtn;
            }
        }
        
        // Handle clipboard button visibility
        if ('clipboardButton' in newOptions) {
            if (newOptions.clipboardButton && !instance.elements.$clipboardBtn) {
                // Add button if it doesn't exist
                this.addClipboardButton(instance);
                // Re-initialize clipboard for the new button
                if (instance.elements.$clipboardBtn && typeof ClipboardJS !== 'undefined') {
                    // Initialize ClipboardJS for the button
                    if (instance.clipboard) {
                        instance.clipboard.destroy();
                    }
                    instance.clipboard = new ClipboardJS(instance.elements.$clipboardBtn[0]);
                    
                    // Initialize popup for clipboard button
                    instance.elements.$clipboardBtn.popup({
                        on: 'manual',
                    });
                    
                    // Handle successful copy
                    instance.clipboard.on('success', (e) => {
                        instance.elements.$clipboardBtn.popup('show');
                        setTimeout(() => {
                            instance.elements.$clipboardBtn.popup('hide');
                        }, 1500);
                        e.clearSelection();
                    });
                    
                }
            } else if (!newOptions.clipboardButton && instance.elements.$clipboardBtn) {
                // Remove button if it exists
                if (instance.clipboard) {
                    instance.clipboard.destroy();
                    delete instance.clipboard;
                }
                instance.elements.$clipboardBtn.remove();
                delete instance.elements.$clipboardBtn;
            }
        }
        
        // Handle strength bar visibility
        if ('showStrengthBar' in newOptions) {
            if (newOptions.showStrengthBar) {
                this.showStrengthBar(instance);
            } else {
                this.hideStrengthBar(instance);
            }
        }
        
        // Handle warnings visibility
        if ('showWarnings' in newOptions) {
            if (newOptions.showWarnings) {
                this.showWarnings(instance);
            } else {
                this.hideWarnings(instance);
            }
        }
        
        // Update input wrapper action class based on button visibility
        this.updateInputWrapperClass(instance);
        
        // Re-setup form validation if needed
        if (instance.options.validation !== this.VALIDATION.NONE) {
            this.setupFormValidation(instance);
        }
        
        // Check current value if validation changed
        if ('validation' in newOptions && instance.$field.val()) {
            this.checkPassword(instance);
        }
    },
    
    /**
     * Update input wrapper action class based on button visibility
     * @param {object} instance - Widget instance
     */
    updateInputWrapperClass(instance) {
        const $inputWrapper = instance.$field.closest('.ui.input');
        const hasButtons = !!(
            instance.elements.$showHideBtn || 
            instance.elements.$generateBtn || 
            instance.elements.$clipboardBtn
        );
        
        if (hasButtons) {
            $inputWrapper.addClass('action');
        } else {
            $inputWrapper.removeClass('action');
        }
    },
    
    /**
     * Get widget state
     * @param {string|object} instanceOrFieldId - Instance or field ID
     * @returns {object|null} Widget state
     */
    getState(instanceOrFieldId) {
        const instance = typeof instanceOrFieldId === 'string' 
            ? this.instances.get(instanceOrFieldId)
            : instanceOrFieldId;
            
        return instance ? instance.state : null;
    },
    
    /**
     * Show strength bar
     * @param {string|object} instanceOrFieldId - Instance or field ID
     */
    showStrengthBar(instanceOrFieldId) {
        const instance = typeof instanceOrFieldId === 'string' 
            ? this.instances.get(instanceOrFieldId)
            : instanceOrFieldId;
            
        if (instance && instance.elements.$progressSection) {
            instance.elements.$progressSection.show();
        }
    },
    
    /**
     * Hide strength bar
     * @param {string|object} instanceOrFieldId - Instance or field ID
     */
    hideStrengthBar(instanceOrFieldId) {
        const instance = typeof instanceOrFieldId === 'string' 
            ? this.instances.get(instanceOrFieldId)
            : instanceOrFieldId;
            
        if (instance && instance.elements.$progressSection) {
            instance.elements.$progressSection.hide();
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
        if (instance.elements.$showHideBtn) {
            instance.elements.$showHideBtn.off('.passwordWidget');
        }
        
        // Destroy clipboard instance
        if (instance.clipboard) {
            instance.clipboard.destroy();
            delete instance.clipboard;
        }
        
        // Clear timer
        if (this.validationTimers[fieldId]) {
            clearTimeout(this.validationTimers[fieldId]);
            delete this.validationTimers[fieldId];
        }
        
        // Remove instance
        this.instances.delete(fieldId);
    },
    
    /**
     * Destroy all instances
     */
    destroyAll() {
        this.instances.forEach((instance, fieldId) => {
            this.destroy(fieldId);
        });
        this.validationCache = {};
    },
    
    /**
     * Clear validation cache
     */
    clearCache() {
        this.validationCache = {};
    }
};