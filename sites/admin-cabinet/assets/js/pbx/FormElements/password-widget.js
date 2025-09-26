"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

/* global globalTranslate, PasswordsAPI, Form, ClipboardJS */

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
var PasswordWidget = {
  /**
   * Active widget instances
   */
  instances: new Map(),

  /**
   * Validation types
   */
  VALIDATION: {
    HARD: 'hard',
    // Block form submission if invalid
    SOFT: 'soft',
    // Show warnings but allow submission
    NONE: 'none' // No validation

  },

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
    showPasswordButton: true,
    // Show/hide password toggle
    clipboardButton: true,
    // Copy to clipboard button
    showStrengthBar: true,
    showWarnings: true,
    minScore: 60,
    generateLength: 16,
    validateOnInput: true,
    checkOnLoad: false,
    onValidate: null,
    // Callback: (isValid, score, messages) => void
    onGenerate: null,
    // Callback: (password) => void
    validationRules: null // Custom validation rules for Form.js

  },

  /**
   * Initialize password widget
   * @param {string|jQuery} selector - Field selector or jQuery object
   * @param {object} options - Widget options
   * @returns {object|null} Widget instance
   */
  init: function init(selector) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var $field = $(selector);

    if ($field.length === 0) {
      return null;
    }

    var fieldId = $field.attr('id') || $field.attr('name') || Math.random().toString(36).substr(2, 9); // Destroy existing instance if any

    if (this.instances.has(fieldId)) {
      this.destroy(fieldId);
    } // Create instance


    var instance = {
      fieldId: fieldId,
      $field: $field,
      $container: $field.closest('.field'),
      options: _objectSpread(_objectSpread({}, this.defaults), options),
      elements: {},
      state: {
        isValid: true,
        score: 0,
        strength: '',
        messages: [],
        isGenerated: false,
        isFocused: false
      }
    }; // Store instance

    this.instances.set(fieldId, instance); // Initialize

    this.setupUI(instance);
    this.bindEvents(instance); // Setup form validation if needed

    if (instance.options.validation !== this.VALIDATION.NONE) {
      this.setupFormValidation(instance);
    } // Check initial value if requested


    if (instance.options.checkOnLoad && $field.val()) {
      this.checkPassword(instance);
    }

    return instance;
  },

  /**
   * Setup UI elements
   * @param {object} instance - Widget instance
   */
  setupUI: function setupUI(instance) {
    var $field = instance.$field,
        $container = instance.$container,
        options = instance.options; // Find or create input wrapper

    var $inputWrapper = $field.closest('.ui.input');

    if ($inputWrapper.length === 0) {
      $field.wrap('<div class="ui input"></div>');
      $inputWrapper = $field.parent();
    } // Disable password managers


    this.disablePasswordManagers(instance); // Add show/hide password button if needed

    if (options.showPasswordButton) {
      this.addShowHideButton(instance);
    } // Add generate button if needed


    if (options.generateButton) {
      this.addGenerateButton(instance);
    } // Add clipboard button if needed


    if (options.clipboardButton) {
      this.addClipboardButton(instance);
    } // Add strength bar if needed


    if (options.showStrengthBar) {
      this.addStrengthBar(instance);
    } // Add warnings container if needed


    if (options.showWarnings) {
      this.addWarningsContainer(instance);
    } // Update input wrapper class based on button visibility


    this.updateInputWrapperClass(instance);
  },

  /**
   * Add show/hide password button
   * @param {object} instance - Widget instance
   */
  addShowHideButton: function addShowHideButton(instance) {
    var $field = instance.$field;
    var $inputWrapper = $field.closest('.ui.input'); // Check if button already exists

    if ($inputWrapper.find('button.show-hide-password').length > 0) {
      instance.elements.$showHideBtn = $inputWrapper.find('button.show-hide-password');
      return;
    } // Create button


    var $showHideBtn = $("\n            <button type=\"button\" class=\"ui basic icon button show-hide-password\" \n                    data-content=\"".concat(globalTranslate.bt_ToolTipShowPassword, "\">\n                <i class=\"eye icon\"></i>\n            </button>\n        ")); // Append to wrapper

    $inputWrapper.append($showHideBtn);
    instance.elements.$showHideBtn = $showHideBtn;
  },

  /**
   * Add generate button
   * @param {object} instance - Widget instance
   */
  addGenerateButton: function addGenerateButton(instance) {
    var $field = instance.$field;
    var $inputWrapper = $field.closest('.ui.input'); // Check if button already exists

    if ($inputWrapper.find('button.generate-password').length > 0) {
      instance.elements.$generateBtn = $inputWrapper.find('button.generate-password');
      return;
    } // Create button


    var $generateBtn = $("\n            <button type=\"button\" class=\"ui basic icon button generate-password\" \n                    data-content=\"".concat(globalTranslate.bt_ToolTipGeneratePassword, "\">\n                <i class=\"sync icon\"></i>\n            </button>\n        ")); // Append to wrapper

    $inputWrapper.append($generateBtn);
    instance.elements.$generateBtn = $generateBtn;
  },

  /**
   * Add clipboard button
   * @param {object} instance - Widget instance
   */
  addClipboardButton: function addClipboardButton(instance) {
    var $field = instance.$field;
    var $inputWrapper = $field.closest('.ui.input'); // Check if button already exists

    if ($inputWrapper.find('button.clipboard').length > 0) {
      instance.elements.$clipboardBtn = $inputWrapper.find('button.clipboard');
      return;
    } // Create button


    var currentValue = $field.val() || '';
    var $clipboardBtn = $("\n            <button type=\"button\" class=\"ui basic icon button clipboard\" \n                    data-clipboard-text=\"".concat(currentValue, "\"\n                    data-content=\"").concat(globalTranslate.bt_ToolTipCopyPassword, "\">\n                <i class=\"icons\">\n                    <i class=\"icon copy\"></i>\n                    <i class=\"corner key icon\"></i>\n                </i>\n            </button>\n        ")); // Append to wrapper

    $inputWrapper.append($clipboardBtn);
    instance.elements.$clipboardBtn = $clipboardBtn;
  },

  /**
   * Add strength bar
   * @param {object} instance - Widget instance
   */
  addStrengthBar: function addStrengthBar(instance) {
    var $container = instance.$container; // Check if progress bar already exists

    if ($container.find('.password-strength-progress').length > 0) {
      instance.elements.$progressBar = $container.find('.password-strength-progress');
      instance.elements.$progressSection = $container.find('.password-strength-section');
      return;
    } // Create progress bar


    var $progressSection = $("\n            <div class=\"password-strength-section\" style=\"display:none;\">\n                <div class=\"ui small password-strength-progress progress bottom attached \">\n                    <div class=\"bar\"></div>\n                </div>\n            </div>\n        "); // Insert after field

    $container.append($progressSection);
    instance.elements.$progressBar = $progressSection.find('.password-strength-progress');
    instance.elements.$progressSection = $progressSection;
  },

  /**
   * Add warnings container
   * @param {object} instance - Widget instance
   */
  addWarningsContainer: function addWarningsContainer(instance) {
    var $container = instance.$container; // Check if warnings container already exists

    if ($container.find('.password-warnings').length > 0) {
      instance.elements.$warnings = $container.find('.password-warnings');
      return;
    } // Create warnings container (will be populated when needed)


    var $warnings = $('<div class="password-warnings"></div>'); // Append to the field container (after progress bar if exists)

    $container.append($warnings);
    instance.elements.$warnings = $warnings;
  },

  /**
   * Disable password managers from interfering with password fields
   * @param {object} instance - Widget instance
   */
  disablePasswordManagers: function disablePasswordManagers(instance) {
    var $field = instance.$field;
    var $form = $field.closest('form'); // Set attributes to prevent autofill

    $field.attr({
      'autocomplete': 'off',
      'data-lpignore': 'true',
      // LastPass
      'data-1p-ignore': 'true',
      // 1Password
      'data-form-type': 'other',
      // Chrome
      'data-bwignore': 'true',
      // Bitwarden
      'readonly': 'readonly' // Make readonly initially

    }); // Remove readonly on focus

    $field.on('focus.passwordManager', function () {
      $(this).removeAttr('readonly');
    }); // Add honeypot field to trick password managers

    if ($field.prev('.password-honeypot').length === 0) {
      var $honeypot = $('<input type="password" class="password-honeypot" name="fake_password_field" style="position: absolute; left: -9999px; width: 1px; height: 1px;" tabindex="-1" aria-hidden="true" autocomplete="off">');
      $field.before($honeypot);
    } // Prevent form from triggering password save prompt


    if ($form.length > 0) {
      $form.attr('data-lpignore', 'true');
    }
  },

  /**
   * Bind events
   * @param {object} instance - Widget instance
   */
  bindEvents: function bindEvents(instance) {
    var _this = this;

    var $field = instance.$field,
        options = instance.options; // Show/hide button click

    if (instance.elements.$showHideBtn) {
      instance.elements.$showHideBtn.off('click.passwordWidget').on('click.passwordWidget', function (e) {
        e.preventDefault();

        _this.togglePasswordVisibility(instance);
      });
    } // Generate button click


    if (instance.elements.$generateBtn) {
      instance.elements.$generateBtn.off('click.passwordWidget').on('click.passwordWidget', function (e) {
        e.preventDefault();

        _this.generatePassword(instance);
      });
    } // Initialize clipboard functionality for copy button


    if (instance.elements.$clipboardBtn && typeof ClipboardJS !== 'undefined') {
      // Initialize ClipboardJS for the button
      if (!instance.clipboard) {
        instance.clipboard = new ClipboardJS(instance.elements.$clipboardBtn[0]); // Initialize popup for clipboard button

        instance.elements.$clipboardBtn.popup({
          on: 'manual'
        }); // Handle successful copy

        instance.clipboard.on('success', function (e) {
          instance.elements.$clipboardBtn.popup('show');
          setTimeout(function () {
            instance.elements.$clipboardBtn.popup('hide');
          }, 1500);
          e.clearSelection();
        });
      }
    } // Field input event


    if (options.validateOnInput) {
      $field.off('input.passwordWidget change.passwordWidget').on('input.passwordWidget change.passwordWidget', function () {
        _this.handleInput(instance);
      }); // Paste event - trigger validation immediately after paste

      $field.off('paste.passwordWidget').on('paste.passwordWidget', function () {
        // Clear any existing debounce timer for immediate paste validation
        if (_this.validationTimers[instance.fieldId]) {
          clearTimeout(_this.validationTimers[instance.fieldId]);
          delete _this.validationTimers[instance.fieldId];
        } // Need timeout because paste content is not immediately available in field value


        setTimeout(function () {
          _this.handlePasteInput(instance);
        }, 10);
      });
    } // Update clipboard button when password changes


    $field.on('input.passwordWidget change.passwordWidget', function () {
      var value = $field.val(); // Clear validation state on empty

      if (!value || value === '') {
        _this.clearValidation(instance);
      } // Update all clipboard buttons (widget's and any external ones)


      $('.clipboard').attr('data-clipboard-text', value);
    }); // Handle paste event for clipboard button update (with delay)

    $field.on('paste.passwordWidget', function () {
      setTimeout(function () {
        var value = $field.val(); // Clear validation state on empty

        if (!value || value === '') {
          _this.clearValidation(instance);
        } // Update all clipboard buttons (widget's and any external ones)


        $('.clipboard').attr('data-clipboard-text', value);
      }, 10);
    }); // Focus event - show progress bar when field is focused

    $field.off('focus.passwordWidget').on('focus.passwordWidget', function () {
      instance.state.isFocused = true; // Show progress bar if there's a password value

      var password = $field.val();

      if (password && password !== '' && !_this.isMaskedPassword(password)) {
        if (instance.elements.$progressSection) {
          instance.elements.$progressSection.show();
        } // Trigger validation to update progress bar when focused (without debounce for initial focus)


        if (options.validateOnInput) {
          _this.validatePassword(instance, password);
        }
      }
    }); // Blur event - hide progress bar when field loses focus only if no warnings

    $field.off('blur.passwordWidget').on('blur.passwordWidget', function () {
      instance.state.isFocused = false; // Hide progress bar only if there are no validation warnings visible

      if (instance.elements.$progressSection && (!instance.elements.$warnings || instance.elements.$warnings.is(':empty') || !instance.elements.$warnings.is(':visible'))) {
        instance.elements.$progressSection.hide();
      } // Never hide warnings on blur - they should remain visible

    });
  },

  /**
   * Disable widget
   * @param {object} instance - Widget instance
   */
  disable: function disable(instance) {
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
  enable: function enable(instance) {
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
  setReadOnly: function setReadOnly(instance) {
    instance.$field.prop('readonly', true);

    if (instance.elements.$generateBtn) {
      instance.elements.$generateBtn.hide();
    }
  },

  /**
   * Setup form validation
   * @param {object} instance - Widget instance
   */
  setupFormValidation: function setupFormValidation(instance) {
    var $field = instance.$field,
        options = instance.options; // Skip if Form object is not available

    if (typeof Form === 'undefined' || !Form.validateRules) {
      return;
    }

    var fieldName = $field.attr('name') || $field.attr('id');

    if (!fieldName) {
      return;
    } // Use custom rules if provided


    if (options.validationRules) {
      Form.validateRules[fieldName] = options.validationRules;
      return;
    } // Create validation rules based on mode


    var rules = []; // Add non-empty rule for hard validation

    if (options.validation === this.VALIDATION.HARD) {
      rules.push({
        type: 'empty',
        prompt: globalTranslate.pw_ValidatePasswordEmpty
      });
    } // Add strength validation


    if (options.minScore > 0 && options.validation === this.VALIDATION.HARD) {
      rules.push({
        type: 'passwordStrength',
        prompt: globalTranslate.pw_ValidatePasswordWeak
      });
    }

    if (rules.length > 0) {
      Form.validateRules[fieldName] = {
        identifier: fieldName,
        rules: rules
      };
    } // Add custom validation rule for password strength


    if (typeof $.fn.form.settings.rules.passwordStrength === 'undefined') {
      $.fn.form.settings.rules.passwordStrength = function () {
        return instance.state.score >= options.minScore;
      };
    }
  },

  /**
   * Check if password is masked (server returns these when password is hidden)
   * @param {string} password - Password to check
   * @returns {boolean} True if password appears to be masked
   */
  isMaskedPassword: function isMaskedPassword(password) {
    return /^[xX]{6,}$|^\*{6,}$|^HIDDEN$|^MASKED$/i.test(password);
  },

  /**
   * Handle input event with debouncing
   * @param {object} instance - Widget instance
   */
  handleInput: function handleInput(instance) {
    var $field = instance.$field,
        options = instance.options;
    var password = $field.val(); // Skip validation if disabled

    if (options.validation === this.VALIDATION.NONE) {
      return;
    } // Skip validation for masked passwords


    if (this.isMaskedPassword(password)) {
      this.clearValidation(instance);
      return;
    } // Skip validation if this is a generated password (already validated in setGeneratedPassword)


    if (instance.state.isGenerated) {
      instance.state.isGenerated = false; // Reset flag for next input

      return;
    } // Always validate password with debounce (don't require focus)


    this.validatePasswordWithDebounce(instance, password, 500);
  },

  /**
   * Handle paste input event without debouncing
   * @param {object} instance - Widget instance
   */
  handlePasteInput: function handlePasteInput(instance) {
    var $field = instance.$field,
        options = instance.options;
    var password = $field.val(); // Skip validation if disabled

    if (options.validation === this.VALIDATION.NONE) {
      return;
    } // Skip validation for masked passwords


    if (this.isMaskedPassword(password)) {
      this.clearValidation(instance);
      return;
    } // Validate immediately without debounce for paste


    this.validatePassword(instance, password);
  },

  /**
   * Validate password with debouncing for typing
   * @param {object} instance - Widget instance
   * @param {string} password - Password to validate
   * @param {number} debounceTime - Debounce delay in milliseconds
   */
  validatePasswordWithDebounce: function validatePasswordWithDebounce(instance, password) {
    var _this2 = this;

    var debounceTime = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 500;

    // Clear existing timer
    if (this.validationTimers[instance.fieldId]) {
      clearTimeout(this.validationTimers[instance.fieldId]);
    } // Show immediate local feedback while waiting (always show progress bar when typing)


    if (password && password !== '' && !this.isMaskedPassword(password)) {
      var localScore = this.scorePasswordLocal(password);
      this.updateProgressBar(instance, localScore); // Show progress section when typing (don't require focus for immediate feedback)

      if (instance.elements.$progressSection) {
        instance.elements.$progressSection.show();
      }
    } else {
      // Clear validation for empty password
      this.clearValidation(instance);
    } // Set timer for full validation (including API call and warnings)


    this.validationTimers[instance.fieldId] = setTimeout(function () {
      // Only do full validation if field still has the same value
      if (instance.$field.val() === password) {
        _this2.validatePassword(instance, password);
      }
    }, debounceTime);
  },

  /**
   * Validate password immediately
   * @param {object} instance - Widget instance
   * @param {string} password - Password to validate
   */
  validatePassword: function validatePassword(instance, password) {
    var _this3 = this;

    var options = instance.options; // Clear previous warnings at the start of validation

    this.hideWarnings(instance); // Handle empty password

    if (!password || password === '') {
      this.clearValidation(instance);
      return;
    } // Skip validation for masked passwords


    if (this.isMaskedPassword(password)) {
      this.clearValidation(instance);
      return;
    } // Show progress section when validating


    if (instance.elements.$progressSection) {
      instance.elements.$progressSection.show();
    } // Show immediate local feedback


    var localScore = this.scorePasswordLocal(password);
    this.updateProgressBar(instance, localScore); // Use API if available

    if (typeof PasswordsAPI !== 'undefined') {
      PasswordsAPI.validatePassword(password, instance.fieldId, function (result) {
        if (result) {
          _this3.handleValidationResult(instance, result);
        }
      });
    } else {
      // Use local validation
      var result = {
        score: localScore,
        isValid: localScore >= options.minScore,
        strength: this.getStrengthLabel(localScore),
        messages: []
      };
      this.handleValidationResult(instance, result);
    }
  },

  /**
   * Calculate password score locally
   * @param {string} password - Password to score
   * @returns {number} Score from 0-100
   */
  scorePasswordLocal: function scorePasswordLocal(password) {
    var score = 0;

    if (!password || password.length === 0) {
      return score;
    }

    var length = password.length; // Length scoring (up to 30 points)

    if (length >= 16) {
      score += 30;
    } else if (length >= 12) {
      score += 20;
    } else if (length >= 8) {
      score += 10;
    } else if (length >= 6) {
      score += 5;
    } // Character diversity (up to 40 points)


    if (/[a-z]/.test(password)) score += 10; // Lowercase

    if (/[A-Z]/.test(password)) score += 10; // Uppercase

    if (/\d/.test(password)) score += 10; // Digits

    if (/\W/.test(password)) score += 10; // Special characters
    // Pattern complexity (up to 30 points)

    var uniqueChars = new Set(password).size;
    var uniqueRatio = uniqueChars / length;

    if (uniqueRatio > 0.7) {
      score += 20;
    } else if (uniqueRatio > 0.5) {
      score += 15;
    } else if (uniqueRatio > 0.3) {
      score += 10;
    } else {
      score += 5;
    } // Penalties for common patterns


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
  getStrengthLabel: function getStrengthLabel(score) {
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
  updateProgressBar: function updateProgressBar(instance, score) {
    var elements = instance.elements;

    if (!elements.$progressBar || elements.$progressBar.length === 0) {
      return;
    } // Update progress


    elements.$progressBar.progress({
      percent: Math.min(score, 100),
      showActivity: false
    }); // Update color

    elements.$progressBar.removeClass('red orange yellow olive green').addClass(this.getColorForScore(score));
  },

  /**
   * Get color class for score
   * @param {number} score - Password score
   * @returns {string} Color class name
   */
  getColorForScore: function getColorForScore(score) {
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
  handleValidationResult: function handleValidationResult(instance, result) {
    if (!result) return;
    var options = instance.options; // Always clear warnings first to ensure clean state

    this.hideWarnings(instance); // Update state

    instance.state = {
      isValid: result.isValid || result.score >= options.minScore,
      score: result.score,
      strength: result.strength || this.getStrengthLabel(result.score),
      messages: result.messages || [],
      isGenerated: instance.state.isGenerated
    }; // Update UI

    this.updateProgressBar(instance, result.score); // Show warnings/errors only if there are messages AND password is not strong enough

    if (options.showWarnings && result.messages && result.messages.length > 0 && !instance.state.isValid) {
      var messageType = instance.state.isValid ? 'warning' : 'error';
      this.showWarnings(instance, result, messageType);
    } // Call validation callback


    if (options.onValidate) {
      options.onValidate(instance.state.isValid, result.score, result.messages);
    } // Update form validation state


    if (Form && Form.$formObj) {
      var fieldName = instance.$field.attr('name') || instance.$field.attr('id');

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
  generatePassword: function generatePassword(instance) {
    var _this4 = this;

    var options = instance.options; // Show loading state

    if (instance.elements.$generateBtn) {
      instance.elements.$generateBtn.addClass('loading');
    } // Generate password


    var generateCallback = function generateCallback(result) {
      var password = typeof result === 'string' ? result : result.password; // Set password

      _this4.setGeneratedPassword(instance, password); // Remove loading state


      if (instance.elements.$generateBtn) {
        instance.elements.$generateBtn.removeClass('loading');
      } // Call callback


      if (options.onGenerate) {
        options.onGenerate(password);
      }
    }; // Use API if available


    if (typeof PasswordsAPI !== 'undefined') {
      PasswordsAPI.generatePassword(options.generateLength, generateCallback);
    } else {
      // Simple local generator
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      var password = '';

      for (var i = 0; i < options.generateLength; i++) {
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
  setGeneratedPassword: function setGeneratedPassword(instance, password) {
    var $field = instance.$field,
        $container = instance.$container,
        options = instance.options; // Set generated flag first to prevent duplicate validation

    instance.state.isGenerated = true; // Set value without triggering change event yet

    $field.val(password); // Update all clipboard buttons (widget's and any external ones)

    $('.clipboard').attr('data-clipboard-text', password); // Validate once if needed

    if (options.validation !== this.VALIDATION.NONE) {
      this.validatePassword(instance, password);
    } // Now trigger change for form tracking (validation already done above)


    $field.trigger('change'); // Trigger form change

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
  showWarnings: function showWarnings(instance, result) {
    var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'warning';
    if (!instance.elements.$warnings) return;
    var elements = instance.elements;
    var colorClass = type === 'error' ? 'red' : 'orange'; // Clear existing warnings

    elements.$warnings.empty(); // Add warnings as pointing label

    if (result.messages && result.messages.length > 0) {
      // Choose icon based on message type
      var iconClass = type === 'error' ? 'exclamation circle' : 'exclamation triangle'; // Create list items from messages with icons

      var listItems = result.messages.map(function (msg) {
        return "\n                <div class=\"item\">\n                    <i class=\"".concat(iconClass, " icon\"></i>\n                    <div class=\"content\">").concat(msg, "</div>\n                </div>\n            ");
      }).join(''); // Create pointing above label with list (points to password field)

      var $label = $("\n                <div class=\"ui pointing ".concat(colorClass, " basic label\">\n                    <div class=\"ui list\">\n                        ").concat(listItems, "\n                    </div>\n                </div>\n            "));
      elements.$warnings.append($label).show();
    }
  },

  /**
   * Hide warnings
   * @param {object} instance - Widget instance
   */
  hideWarnings: function hideWarnings(instance) {
    if (instance.elements.$warnings) {
      instance.elements.$warnings.empty().hide();
    }
  },

  /**
   * Toggle password visibility
   * @param {object} instance - Widget instance
   */
  togglePasswordVisibility: function togglePasswordVisibility(instance) {
    var $field = instance.$field;
    var $showHideBtn = instance.elements.$showHideBtn;
    if (!$showHideBtn) return;
    var $icon = $showHideBtn.find('i');

    if ($field.attr('type') === 'password') {
      // Show password
      $field.attr('type', 'text');
      $icon.removeClass('eye').addClass('eye slash');
      $showHideBtn.attr('data-content', globalTranslate.bt_ToolTipHidePassword);
    } else {
      // Hide password
      $field.attr('type', 'password');
      $icon.removeClass('eye slash').addClass('eye');
      $showHideBtn.attr('data-content', globalTranslate.bt_ToolTipShowPassword);
    }
  },

  /**
   * Clear validation
   * @param {object} instance - Widget instance
   */
  clearValidation: function clearValidation(instance) {
    // Clear warnings when explicitly clearing validation (empty password)
    this.hideWarnings(instance);

    if (instance.elements.$progressSection) {
      instance.elements.$progressSection.hide();
    }

    if (instance.elements.$progressBar) {
      instance.elements.$progressBar.progress({
        percent: 0
      });
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
  checkPassword: function checkPassword(instance) {
    var password = instance.$field.val();

    if (password && password !== '') {
      // Skip validation for masked passwords
      if (this.isMaskedPassword(password)) {
        this.clearValidation(instance);
        return;
      } // For initial check, don't show progress bar but do validate and show warnings


      this.validatePassword(instance, password);
    }
  },

  /**
   * Update configuration
   * @param {string|object} instanceOrFieldId - Instance or field ID
   * @param {object} newOptions - New options
   */
  updateConfig: function updateConfig(instanceOrFieldId, newOptions) {
    var _this5 = this;

    var instance = typeof instanceOrFieldId === 'string' ? this.instances.get(instanceOrFieldId) : instanceOrFieldId;

    if (!instance) {
      return;
    } // Update options


    instance.options = _objectSpread(_objectSpread({}, instance.options), newOptions); // Handle dynamic button visibility

    if ('showPasswordButton' in newOptions) {
      if (newOptions.showPasswordButton && !instance.elements.$showHideBtn) {
        // Add button if it doesn't exist
        this.addShowHideButton(instance); // Re-bind events for the new button

        if (instance.elements.$showHideBtn) {
          instance.elements.$showHideBtn.off('click.passwordWidget').on('click.passwordWidget', function (e) {
            e.preventDefault();

            _this5.togglePasswordVisibility(instance);
          });
        }
      } else if (!newOptions.showPasswordButton && instance.elements.$showHideBtn) {
        // Remove button if it exists
        instance.elements.$showHideBtn.remove();
        delete instance.elements.$showHideBtn;
      }
    } // Handle generate button visibility


    if ('generateButton' in newOptions) {
      if (newOptions.generateButton && !instance.elements.$generateBtn) {
        // Add button if it doesn't exist
        this.addGenerateButton(instance); // Re-bind events for the new button

        if (instance.elements.$generateBtn) {
          instance.elements.$generateBtn.off('click.passwordWidget').on('click.passwordWidget', function (e) {
            e.preventDefault();

            _this5.generatePassword(instance);
          }); // Initialize popup

          instance.elements.$generateBtn.popup();
        }
      } else if (!newOptions.generateButton && instance.elements.$generateBtn) {
        // Remove button if it exists
        instance.elements.$generateBtn.remove();
        delete instance.elements.$generateBtn;
      }
    } // Handle clipboard button visibility


    if ('clipboardButton' in newOptions) {
      if (newOptions.clipboardButton && !instance.elements.$clipboardBtn) {
        // Add button if it doesn't exist
        this.addClipboardButton(instance); // Re-initialize clipboard for the new button

        if (instance.elements.$clipboardBtn && typeof ClipboardJS !== 'undefined') {
          // Initialize ClipboardJS for the button
          if (instance.clipboard) {
            instance.clipboard.destroy();
          }

          instance.clipboard = new ClipboardJS(instance.elements.$clipboardBtn[0]); // Initialize popup for clipboard button

          instance.elements.$clipboardBtn.popup({
            on: 'manual'
          }); // Handle successful copy

          instance.clipboard.on('success', function (e) {
            instance.elements.$clipboardBtn.popup('show');
            setTimeout(function () {
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
    } // Handle strength bar visibility


    if ('showStrengthBar' in newOptions) {
      if (newOptions.showStrengthBar) {
        this.showStrengthBar(instance);
      } else {
        this.hideStrengthBar(instance);
      }
    } // Handle warnings visibility


    if ('showWarnings' in newOptions) {
      if (newOptions.showWarnings) {
        this.showWarnings(instance);
      } else {
        this.hideWarnings(instance);
      }
    } // Update input wrapper action class based on button visibility


    this.updateInputWrapperClass(instance); // Re-setup form validation if needed

    if (instance.options.validation !== this.VALIDATION.NONE) {
      this.setupFormValidation(instance);
    } // Check current value if validation changed


    if ('validation' in newOptions && instance.$field.val()) {
      this.checkPassword(instance);
    }
  },

  /**
   * Update input wrapper action class based on button visibility
   * @param {object} instance - Widget instance
   */
  updateInputWrapperClass: function updateInputWrapperClass(instance) {
    var $inputWrapper = instance.$field.closest('.ui.input');
    var hasButtons = !!(instance.elements.$showHideBtn || instance.elements.$generateBtn || instance.elements.$clipboardBtn);

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
  getState: function getState(instanceOrFieldId) {
    var instance = typeof instanceOrFieldId === 'string' ? this.instances.get(instanceOrFieldId) : instanceOrFieldId;
    return instance ? instance.state : null;
  },

  /**
   * Show strength bar
   * @param {string|object} instanceOrFieldId - Instance or field ID
   */
  showStrengthBar: function showStrengthBar(instanceOrFieldId) {
    var instance = typeof instanceOrFieldId === 'string' ? this.instances.get(instanceOrFieldId) : instanceOrFieldId;

    if (instance && instance.elements.$progressSection) {
      instance.elements.$progressSection.show();
    }
  },

  /**
   * Hide strength bar
   * @param {string|object} instanceOrFieldId - Instance or field ID
   */
  hideStrengthBar: function hideStrengthBar(instanceOrFieldId) {
    var instance = typeof instanceOrFieldId === 'string' ? this.instances.get(instanceOrFieldId) : instanceOrFieldId;

    if (instance && instance.elements.$progressSection) {
      instance.elements.$progressSection.hide();
    }
  },

  /**
   * Destroy widget instance
   * @param {string} fieldId - Field ID
   */
  destroy: function destroy(fieldId) {
    var instance = this.instances.get(fieldId);
    if (!instance) return; // Unbind events

    instance.$field.off('.passwordWidget');

    if (instance.elements.$generateBtn) {
      instance.elements.$generateBtn.off('.passwordWidget');
    }

    if (instance.elements.$showHideBtn) {
      instance.elements.$showHideBtn.off('.passwordWidget');
    } // Destroy clipboard instance


    if (instance.clipboard) {
      instance.clipboard.destroy();
      delete instance.clipboard;
    } // Clear timer


    if (this.validationTimers[fieldId]) {
      clearTimeout(this.validationTimers[fieldId]);
      delete this.validationTimers[fieldId];
    } // Remove instance


    this.instances["delete"](fieldId);
  },

  /**
   * Destroy all instances
   */
  destroyAll: function destroyAll() {
    var _this6 = this;

    this.instances.forEach(function (instance, fieldId) {
      _this6.destroy(fieldId);
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvcGFzc3dvcmQtd2lkZ2V0LmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkV2lkZ2V0IiwiaW5zdGFuY2VzIiwiTWFwIiwiVkFMSURBVElPTiIsIkhBUkQiLCJTT0ZUIiwiTk9ORSIsInZhbGlkYXRpb25UaW1lcnMiLCJkZWZhdWx0cyIsInZhbGlkYXRpb24iLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm9uVmFsaWRhdGUiLCJvbkdlbmVyYXRlIiwidmFsaWRhdGlvblJ1bGVzIiwiaW5pdCIsInNlbGVjdG9yIiwib3B0aW9ucyIsIiRmaWVsZCIsIiQiLCJsZW5ndGgiLCJmaWVsZElkIiwiYXR0ciIsIk1hdGgiLCJyYW5kb20iLCJ0b1N0cmluZyIsInN1YnN0ciIsImhhcyIsImRlc3Ryb3kiLCJpbnN0YW5jZSIsIiRjb250YWluZXIiLCJjbG9zZXN0IiwiZWxlbWVudHMiLCJzdGF0ZSIsImlzVmFsaWQiLCJzY29yZSIsInN0cmVuZ3RoIiwibWVzc2FnZXMiLCJpc0dlbmVyYXRlZCIsImlzRm9jdXNlZCIsInNldCIsInNldHVwVUkiLCJiaW5kRXZlbnRzIiwic2V0dXBGb3JtVmFsaWRhdGlvbiIsInZhbCIsImNoZWNrUGFzc3dvcmQiLCIkaW5wdXRXcmFwcGVyIiwid3JhcCIsInBhcmVudCIsImRpc2FibGVQYXNzd29yZE1hbmFnZXJzIiwiYWRkU2hvd0hpZGVCdXR0b24iLCJhZGRHZW5lcmF0ZUJ1dHRvbiIsImFkZENsaXBib2FyZEJ1dHRvbiIsImFkZFN0cmVuZ3RoQmFyIiwiYWRkV2FybmluZ3NDb250YWluZXIiLCJ1cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyIsImZpbmQiLCIkc2hvd0hpZGVCdG4iLCJnbG9iYWxUcmFuc2xhdGUiLCJidF9Ub29sVGlwU2hvd1Bhc3N3b3JkIiwiYXBwZW5kIiwiJGdlbmVyYXRlQnRuIiwiYnRfVG9vbFRpcEdlbmVyYXRlUGFzc3dvcmQiLCIkY2xpcGJvYXJkQnRuIiwiY3VycmVudFZhbHVlIiwiYnRfVG9vbFRpcENvcHlQYXNzd29yZCIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc1NlY3Rpb24iLCIkd2FybmluZ3MiLCIkZm9ybSIsIm9uIiwicmVtb3ZlQXR0ciIsInByZXYiLCIkaG9uZXlwb3QiLCJiZWZvcmUiLCJvZmYiLCJlIiwicHJldmVudERlZmF1bHQiLCJ0b2dnbGVQYXNzd29yZFZpc2liaWxpdHkiLCJnZW5lcmF0ZVBhc3N3b3JkIiwiQ2xpcGJvYXJkSlMiLCJjbGlwYm9hcmQiLCJwb3B1cCIsInNldFRpbWVvdXQiLCJjbGVhclNlbGVjdGlvbiIsImhhbmRsZUlucHV0IiwiY2xlYXJUaW1lb3V0IiwiaGFuZGxlUGFzdGVJbnB1dCIsInZhbHVlIiwiY2xlYXJWYWxpZGF0aW9uIiwicGFzc3dvcmQiLCJpc01hc2tlZFBhc3N3b3JkIiwic2hvdyIsInZhbGlkYXRlUGFzc3dvcmQiLCJpcyIsImhpZGUiLCJkaXNhYmxlIiwicHJvcCIsImFkZENsYXNzIiwiZW5hYmxlIiwicmVtb3ZlQ2xhc3MiLCJzZXRSZWFkT25seSIsIkZvcm0iLCJ2YWxpZGF0ZVJ1bGVzIiwiZmllbGROYW1lIiwicnVsZXMiLCJwdXNoIiwidHlwZSIsInByb21wdCIsInB3X1ZhbGlkYXRlUGFzc3dvcmRFbXB0eSIsInB3X1ZhbGlkYXRlUGFzc3dvcmRXZWFrIiwiaWRlbnRpZmllciIsImZuIiwiZm9ybSIsInNldHRpbmdzIiwicGFzc3dvcmRTdHJlbmd0aCIsInRlc3QiLCJ2YWxpZGF0ZVBhc3N3b3JkV2l0aERlYm91bmNlIiwiZGVib3VuY2VUaW1lIiwibG9jYWxTY29yZSIsInNjb3JlUGFzc3dvcmRMb2NhbCIsInVwZGF0ZVByb2dyZXNzQmFyIiwiaGlkZVdhcm5pbmdzIiwiUGFzc3dvcmRzQVBJIiwicmVzdWx0IiwiaGFuZGxlVmFsaWRhdGlvblJlc3VsdCIsImdldFN0cmVuZ3RoTGFiZWwiLCJ1bmlxdWVDaGFycyIsIlNldCIsInNpemUiLCJ1bmlxdWVSYXRpbyIsIm1heCIsIm1pbiIsInByb2dyZXNzIiwicGVyY2VudCIsInNob3dBY3Rpdml0eSIsImdldENvbG9yRm9yU2NvcmUiLCJtZXNzYWdlVHlwZSIsIiRmb3JtT2JqIiwiZ2VuZXJhdGVDYWxsYmFjayIsInNldEdlbmVyYXRlZFBhc3N3b3JkIiwiY2hhcnMiLCJpIiwiY2hhckF0IiwiZmxvb3IiLCJ0cmlnZ2VyIiwiZGF0YUNoYW5nZWQiLCJjb2xvckNsYXNzIiwiZW1wdHkiLCJpY29uQ2xhc3MiLCJsaXN0SXRlbXMiLCJtYXAiLCJtc2ciLCJqb2luIiwiJGxhYmVsIiwiJGljb24iLCJidF9Ub29sVGlwSGlkZVBhc3N3b3JkIiwidXBkYXRlQ29uZmlnIiwiaW5zdGFuY2VPckZpZWxkSWQiLCJuZXdPcHRpb25zIiwiZ2V0IiwicmVtb3ZlIiwiaGlkZVN0cmVuZ3RoQmFyIiwiaGFzQnV0dG9ucyIsImdldFN0YXRlIiwiZGVzdHJveUFsbCIsImZvckVhY2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGNBQWMsR0FBRztBQUVuQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBQUlDLEdBQUosRUFMUTs7QUFRbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRTtBQUNSQyxJQUFBQSxJQUFJLEVBQUUsTUFERTtBQUNRO0FBQ2hCQyxJQUFBQSxJQUFJLEVBQUUs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WUFBdEIsRUFBb0M7QUFDaENoQyxNQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0I2QixZQUFsQixDQUErQmMsR0FBL0IsQ0FBbUMsaUJBQW5DO0FBQ0g7O0FBQ0QsUUFBSTlDLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnlCLFlBQXRCLEVBQW9DO0FBQ2hDNUIsTUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCeUIsWUFBbEIsQ0FBK0JrQixHQUEvQixDQUFtQyxpQkFBbkM7QUFDSCxLQVhZLENBYWI7OztBQUNBLFFBQUk5QyxRQUFRLENBQUNvRCxTQUFiLEVBQXdCO0FBQ3BCcEQsTUFBQUEsUUFBUSxDQUFDb0QsU0FBVCxDQUFtQnJELE9BQW5CO0FBQ0EsYUFBT0MsUUFBUSxDQUFDb0QsU0FBaEI7QUFDSCxLQWpCWSxDQW1CYjs7O0FBQ0EsUUFBSSxLQUFLakYsZ0JBQUwsQ0FBc0JxQixPQUF0QixDQUFKLEVBQW9DO0FBQ2hDaUUsTUFBQUEsWUFBWSxDQUFDLEtBQUt0RixnQkFBTCxDQUFzQnFCLE9BQXRCLENBQUQsQ0FBWjtBQUNBLGFBQU8sS0FBS3JCLGdCQUFMLENBQXNCcUIsT0FBdEIsQ0FBUDtBQUNILEtBdkJZLENBeUJiOzs7QUFDQSxTQUFLM0IsU0FBTCxXQUFzQjJCLE9BQXRCO0FBQ0gsR0F0dENrQjs7QUF3dENuQjtBQUNKO0FBQ0E7QUFDSWdKLEVBQUFBLFVBM3RDbUIsd0JBMnRDTjtBQUFBOztBQUNULFNBQUszSyxTQUFMLENBQWU0SyxPQUFmLENBQXVCLFVBQUN6SSxRQUFELEVBQVdSLE9BQVgsRUFBdUI7QUFDMUMsTUFBQSxNQUFJLENBQUNPLE9BQUwsQ0FBYVAsT0FBYjtBQUNILEtBRkQ7QUFHSDtBQS90Q2tCLENBQXZCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGFzc3dvcmRzQVBJLCBGb3JtLCBDbGlwYm9hcmRKUyAqL1xuXG4vKipcbiAqIFBhc3N3b3JkIFdpZGdldCBNb2R1bGVcbiAqIFxuICogQSBjb21wcmVoZW5zaXZlIHBhc3N3b3JkIGZpZWxkIGNvbXBvbmVudCB0aGF0IHByb3ZpZGVzOlxuICogLSBQYXNzd29yZCBnZW5lcmF0aW9uXG4gKiAtIFN0cmVuZ3RoIHZhbGlkYXRpb24gd2l0aCByZWFsLXRpbWUgZmVlZGJhY2tcbiAqIC0gVmlzdWFsIHByb2dyZXNzIGluZGljYXRvclxuICogLSBBUEktYmFzZWQgdmFsaWRhdGlvbiB3aXRoIGxvY2FsIGZhbGxiYWNrXG4gKiAtIEZvcm0gdmFsaWRhdGlvbiBpbnRlZ3JhdGlvblxuICogXG4gKiBVc2FnZTpcbiAqIGNvbnN0IHdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQoJyNteVBhc3N3b3JkRmllbGQnLCB7XG4gKiAgICAgbW9kZTogJ2Z1bGwnLCAgICAgICAgICAgICAgLy8gJ2Z1bGwnIHwgJ2dlbmVyYXRlLW9ubHknIHwgJ2Rpc3BsYXktb25seScgfCAnZGlzYWJsZWQnXG4gKiAgICAgdmFsaWRhdGlvbjogJ3NvZnQnLCAgICAgICAgLy8gJ2hhcmQnIHwgJ3NvZnQnIHwgJ25vbmUnXG4gKiAgICAgbWluU2NvcmU6IDYwLFxuICogICAgIGdlbmVyYXRlTGVuZ3RoOiAxNixcbiAqICAgICBvblZhbGlkYXRlOiAoaXNWYWxpZCwgc2NvcmUsIG1lc3NhZ2VzKSA9PiB7IC4uLiB9XG4gKiB9KTtcbiAqL1xuY29uc3QgUGFzc3dvcmRXaWRnZXQgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogQWN0aXZlIHdpZGdldCBpbnN0YW5jZXNcbiAgICAgKi9cbiAgICBpbnN0YW5jZXM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHR5cGVzXG4gICAgICovXG4gICAgVkFMSURBVElPTjoge1xuICAgICAgICBIQVJEOiAnaGFyZCcsICAgLy8gQmxvY2sgZm9ybSBzdWJtaXNzaW9uIGlmIGludmFsaWRcbiAgICAgICAgU09GVDogJ3NvZnQnLCAgIC8vIFNob3cgd2FybmluZ3MgYnV0IGFsbG93IHN1Ym1pc3Npb25cbiAgICAgICAgTk9ORTogJ25vbmUnICAgIC8vIE5vIHZhbGlkYXRpb25cbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRpbWVycyBmb3IgZGVib3VuY2luZyB2YWxpZGF0aW9uXG4gICAgICovXG4gICAgdmFsaWRhdGlvblRpbWVyczoge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgdmFsaWRhdGlvbjogJ3NvZnQnLFxuICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLCAgLy8gU2hvdy9oaWRlIHBhc3N3b3JkIHRvZ2dsZVxuICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsICAgICAgLy8gQ29weSB0byBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICBtaW5TY29yZTogNjAsXG4gICAgICAgIGdlbmVyYXRlTGVuZ3RoOiAxNixcbiAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICBjaGVja09uTG9hZDogZmFsc2UsXG4gICAgICAgIG9uVmFsaWRhdGU6IG51bGwsICAgICAgICAvLyBDYWxsYmFjazogKGlzVmFsaWQsIHNjb3JlLCBtZXNzYWdlcykgPT4gdm9pZFxuICAgICAgICBvbkdlbmVyYXRlOiBudWxsLCAgICAgICAgLy8gQ2FsbGJhY2s6IChwYXNzd29yZCkgPT4gdm9pZFxuICAgICAgICB2YWxpZGF0aW9uUnVsZXM6IG51bGwgICAgLy8gQ3VzdG9tIHZhbGlkYXRpb24gcnVsZXMgZm9yIEZvcm0uanNcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0XG4gICAgICogQHBhcmFtIHtzdHJpbmd8alF1ZXJ5fSBzZWxlY3RvciAtIEZpZWxkIHNlbGVjdG9yIG9yIGpRdWVyeSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIFdpZGdldCBvcHRpb25zXG4gICAgICogQHJldHVybnMge29iamVjdHxudWxsfSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBpbml0KHNlbGVjdG9yLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJChzZWxlY3Rvcik7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgZmllbGRJZCA9ICRmaWVsZC5hdHRyKCdpZCcpIHx8ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBpbnN0YW5jZSBpZiBhbnlcbiAgICAgICAgaWYgKHRoaXMuaW5zdGFuY2VzLmhhcyhmaWVsZElkKSkge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KGZpZWxkSWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2VcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB7XG4gICAgICAgICAgICBmaWVsZElkLFxuICAgICAgICAgICAgJGZpZWxkLFxuICAgICAgICAgICAgJGNvbnRhaW5lcjogJGZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLFxuICAgICAgICAgICAgb3B0aW9uczogeyAuLi50aGlzLmRlZmF1bHRzLCAuLi5vcHRpb25zIH0sXG4gICAgICAgICAgICBlbGVtZW50czoge30sXG4gICAgICAgICAgICBzdGF0ZToge1xuICAgICAgICAgICAgICAgIGlzVmFsaWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgc2NvcmU6IDAsXG4gICAgICAgICAgICAgICAgc3RyZW5ndGg6ICcnLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiBbXSxcbiAgICAgICAgICAgICAgICBpc0dlbmVyYXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgaXNGb2N1c2VkOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuc2V0KGZpZWxkSWQsIGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemVcbiAgICAgICAgdGhpcy5zZXR1cFVJKGluc3RhbmNlKTtcbiAgICAgICAgdGhpcy5iaW5kRXZlbnRzKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldHVwIGZvcm0gdmFsaWRhdGlvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGluc3RhbmNlLm9wdGlvbnMudmFsaWRhdGlvbiAhPT0gdGhpcy5WQUxJREFUSU9OLk5PTkUpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dXBGb3JtVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGluaXRpYWwgdmFsdWUgaWYgcmVxdWVzdGVkXG4gICAgICAgIGlmIChpbnN0YW5jZS5vcHRpb25zLmNoZWNrT25Mb2FkICYmICRmaWVsZC52YWwoKSkge1xuICAgICAgICAgICAgdGhpcy5jaGVja1Bhc3N3b3JkKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgVUkgZWxlbWVudHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBzZXR1cFVJKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCAkY29udGFpbmVyLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcblxuICAgICAgICAvLyBGaW5kIG9yIGNyZWF0ZSBpbnB1dCB3cmFwcGVyXG4gICAgICAgIGxldCAkaW5wdXRXcmFwcGVyID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBpZiAoJGlucHV0V3JhcHBlci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICRmaWVsZC53cmFwKCc8ZGl2IGNsYXNzPVwidWkgaW5wdXRcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICRpbnB1dFdyYXBwZXIgPSAkZmllbGQucGFyZW50KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEaXNhYmxlIHBhc3N3b3JkIG1hbmFnZXJzXG4gICAgICAgIHRoaXMuZGlzYWJsZVBhc3N3b3JkTWFuYWdlcnMoaW5zdGFuY2UpO1xuXG4gICAgICAgIC8vIEFkZCBzaG93L2hpZGUgcGFzc3dvcmQgYnV0dG9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5zaG93UGFzc3dvcmRCdXR0b24pIHtcbiAgICAgICAgICAgIHRoaXMuYWRkU2hvd0hpZGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGdlbmVyYXRlIGJ1dHRvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuZ2VuZXJhdGVCdXR0b24pIHtcbiAgICAgICAgICAgIHRoaXMuYWRkR2VuZXJhdGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGNsaXBib2FyZCBidXR0b24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLmNsaXBib2FyZEJ1dHRvbikge1xuICAgICAgICAgICAgdGhpcy5hZGRDbGlwYm9hcmRCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHN0cmVuZ3RoIGJhciBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1N0cmVuZ3RoQmFyKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFN0cmVuZ3RoQmFyKGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCB3YXJuaW5ncyBjb250YWluZXIgaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dXYXJuaW5ncykge1xuICAgICAgICAgICAgdGhpcy5hZGRXYXJuaW5nc0NvbnRhaW5lcihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgaW5wdXQgd3JhcHBlciBjbGFzcyBiYXNlZCBvbiBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICB0aGlzLnVwZGF0ZUlucHV0V3JhcHBlckNsYXNzKGluc3RhbmNlKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBzaG93L2hpZGUgcGFzc3dvcmQgYnV0dG9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkU2hvd0hpZGVCdXR0b24oaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkaW5wdXRXcmFwcGVyID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYnV0dG9uIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5zaG93LWhpZGUtcGFzc3dvcmQnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4gPSAkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5zaG93LWhpZGUtcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJ1dHRvblxuICAgICAgICBjb25zdCAkc2hvd0hpZGVCdG4gPSAkKGBcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gc2hvdy1oaWRlLXBhc3N3b3JkXCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBTaG93UGFzc3dvcmR9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleWUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRzaG93SGlkZUJ0bik7XG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0biA9ICRzaG93SGlkZUJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBnZW5lcmF0ZSBidXR0b25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRHZW5lcmF0ZUJ1dHRvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuID0gJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uZ2VuZXJhdGUtcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJ1dHRvblxuICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSAkKGBcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gZ2VuZXJhdGUtcGFzc3dvcmRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEdlbmVyYXRlUGFzc3dvcmR9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzeW5jIGljb25cIj48L2k+XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBlbmQgdG8gd3JhcHBlclxuICAgICAgICAkaW5wdXRXcmFwcGVyLmFwcGVuZCgkZ2VuZXJhdGVCdG4pO1xuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4gPSAkZ2VuZXJhdGVCdG47XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgY2xpcGJvYXJkIGJ1dHRvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZENsaXBib2FyZEJ1dHRvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLmNsaXBib2FyZCcpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4gPSAkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJ1dHRvblxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkZmllbGQudmFsKCkgfHwgJyc7XG4gICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdG4gPSAkKGBcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gY2xpcGJvYXJkXCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY2xpcGJvYXJkLXRleHQ9XCIke2N1cnJlbnRWYWx1ZX1cIlxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weVBhc3N3b3JkfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGNvcHlcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29ybmVyIGtleSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRjbGlwYm9hcmRCdG4pO1xuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuID0gJGNsaXBib2FyZEJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBzdHJlbmd0aCBiYXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRTdHJlbmd0aEJhcihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRjb250YWluZXIgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgcHJvZ3Jlc3MgYmFyIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc0JhciA9ICRjb250YWluZXIuZmluZCgnLnBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uID0gJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtc2VjdGlvbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgcHJvZ3Jlc3MgYmFyXG4gICAgICAgIGNvbnN0ICRwcm9ncmVzc1NlY3Rpb24gPSAkKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwYXNzd29yZC1zdHJlbmd0aC1zZWN0aW9uXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIHBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzIHByb2dyZXNzIGJvdHRvbSBhdHRhY2hlZCBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5zZXJ0IGFmdGVyIGZpZWxkXG4gICAgICAgICRjb250YWluZXIuYXBwZW5kKCRwcm9ncmVzc1NlY3Rpb24pO1xuICAgICAgICBcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyID0gJHByb2dyZXNzU2VjdGlvbi5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbiA9ICRwcm9ncmVzc1NlY3Rpb247XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgd2FybmluZ3MgY29udGFpbmVyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkV2FybmluZ3NDb250YWluZXIoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkY29udGFpbmVyIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdhcm5pbmdzIGNvbnRhaW5lciBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtd2FybmluZ3MnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MgPSAkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC13YXJuaW5ncycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgd2FybmluZ3MgY29udGFpbmVyICh3aWxsIGJlIHBvcHVsYXRlZCB3aGVuIG5lZWRlZClcbiAgICAgICAgY29uc3QgJHdhcm5pbmdzID0gJCgnPGRpdiBjbGFzcz1cInBhc3N3b3JkLXdhcm5pbmdzXCI+PC9kaXY+Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBlbmQgdG8gdGhlIGZpZWxkIGNvbnRhaW5lciAoYWZ0ZXIgcHJvZ3Jlc3MgYmFyIGlmIGV4aXN0cylcbiAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJHdhcm5pbmdzKTtcbiAgICAgICAgXG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncyA9ICR3YXJuaW5ncztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERpc2FibGUgcGFzc3dvcmQgbWFuYWdlcnMgZnJvbSBpbnRlcmZlcmluZyB3aXRoIHBhc3N3b3JkIGZpZWxkc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGRpc2FibGVQYXNzd29yZE1hbmFnZXJzKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGZvcm0gPSAkZmllbGQuY2xvc2VzdCgnZm9ybScpO1xuXG4gICAgICAgIC8vIFNldCBhdHRyaWJ1dGVzIHRvIHByZXZlbnQgYXV0b2ZpbGxcbiAgICAgICAgJGZpZWxkLmF0dHIoe1xuICAgICAgICAgICAgJ2F1dG9jb21wbGV0ZSc6ICdvZmYnLFxuICAgICAgICAgICAgJ2RhdGEtbHBpZ25vcmUnOiAndHJ1ZScsICAgICAgICAgICAvLyBMYXN0UGFzc1xuICAgICAgICAgICAgJ2RhdGEtMXAtaWdub3JlJzogJ3RydWUnLCAgICAgICAgICAvLyAxUGFzc3dvcmRcbiAgICAgICAgICAgICdkYXRhLWZvcm0tdHlwZSc6ICdvdGhlcicsICAgICAgICAgLy8gQ2hyb21lXG4gICAgICAgICAgICAnZGF0YS1id2lnbm9yZSc6ICd0cnVlJywgICAgICAgICAgIC8vIEJpdHdhcmRlblxuICAgICAgICAgICAgJ3JlYWRvbmx5JzogJ3JlYWRvbmx5JyAgICAgICAgICAgICAgLy8gTWFrZSByZWFkb25seSBpbml0aWFsbHlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHJlYWRvbmx5IG9uIGZvY3VzXG4gICAgICAgICRmaWVsZC5vbignZm9jdXMucGFzc3dvcmRNYW5hZ2VyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBob25leXBvdCBmaWVsZCB0byB0cmljayBwYXNzd29yZCBtYW5hZ2Vyc1xuICAgICAgICBpZiAoJGZpZWxkLnByZXYoJy5wYXNzd29yZC1ob25leXBvdCcpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgJGhvbmV5cG90ID0gJCgnPGlucHV0IHR5cGU9XCJwYXNzd29yZFwiIGNsYXNzPVwicGFzc3dvcmQtaG9uZXlwb3RcIiBuYW1lPVwiZmFrZV9wYXNzd29yZF9maWVsZFwiIHN0eWxlPVwicG9zaXRpb246IGFic29sdXRlOyBsZWZ0OiAtOTk5OXB4OyB3aWR0aDogMXB4OyBoZWlnaHQ6IDFweDtcIiB0YWJpbmRleD1cIi0xXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgYXV0b2NvbXBsZXRlPVwib2ZmXCI+Jyk7XG4gICAgICAgICAgICAkZmllbGQuYmVmb3JlKCRob25leXBvdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmV2ZW50IGZvcm0gZnJvbSB0cmlnZ2VyaW5nIHBhc3N3b3JkIHNhdmUgcHJvbXB0XG4gICAgICAgIGlmICgkZm9ybS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkZm9ybS5hdHRyKCdkYXRhLWxwaWdub3JlJywgJ3RydWUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCaW5kIGV2ZW50c1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGJpbmRFdmVudHMoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdy9oaWRlIGJ1dHRvbiBjbGlja1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4ub2ZmKCdjbGljay5wYXNzd29yZFdpZGdldCcpLm9uKCdjbGljay5wYXNzd29yZFdpZGdldCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlUGFzc3dvcmRWaXNpYmlsaXR5KGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZW5lcmF0ZSBidXR0b24gY2xpY2tcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZ1bmN0aW9uYWxpdHkgZm9yIGNvcHkgYnV0dG9uXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuICYmIHR5cGVvZiBDbGlwYm9hcmRKUyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgQ2xpcGJvYXJkSlMgZm9yIHRoZSBidXR0b25cbiAgICAgICAgICAgIGlmICghaW5zdGFuY2UuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG5bMF0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgZm9yIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzdWNjZXNzZnVsIGNvcHlcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaWVsZCBpbnB1dCBldmVudFxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0ZU9uSW5wdXQpIHtcbiAgICAgICAgICAgICRmaWVsZC5vZmYoJ2lucHV0LnBhc3N3b3JkV2lkZ2V0IGNoYW5nZS5wYXNzd29yZFdpZGdldCcpLm9uKCdpbnB1dC5wYXNzd29yZFdpZGdldCBjaGFuZ2UucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dChpbnN0YW5jZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gUGFzdGUgZXZlbnQgLSB0cmlnZ2VyIHZhbGlkYXRpb24gaW1tZWRpYXRlbHkgYWZ0ZXIgcGFzdGVcbiAgICAgICAgICAgICRmaWVsZC5vZmYoJ3Bhc3RlLnBhc3N3b3JkV2lkZ2V0Jykub24oJ3Bhc3RlLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBkZWJvdW5jZSB0aW1lciBmb3IgaW1tZWRpYXRlIHBhc3RlIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICBpZiAodGhpcy52YWxpZGF0aW9uVGltZXJzW2luc3RhbmNlLmZpZWxkSWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0pO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy52YWxpZGF0aW9uVGltZXJzW2luc3RhbmNlLmZpZWxkSWRdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE5lZWQgdGltZW91dCBiZWNhdXNlIHBhc3RlIGNvbnRlbnQgaXMgbm90IGltbWVkaWF0ZWx5IGF2YWlsYWJsZSBpbiBmaWVsZCB2YWx1ZVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVBhc3RlSW5wdXQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY2xpcGJvYXJkIGJ1dHRvbiB3aGVuIHBhc3N3b3JkIGNoYW5nZXNcbiAgICAgICAgJGZpZWxkLm9uKCdpbnB1dC5wYXNzd29yZFdpZGdldCBjaGFuZ2UucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gc3RhdGUgb24gZW1wdHlcbiAgICAgICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVXBkYXRlIGFsbCBjbGlwYm9hcmQgYnV0dG9ucyAod2lkZ2V0J3MgYW5kIGFueSBleHRlcm5hbCBvbmVzKVxuICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCB2YWx1ZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBwYXN0ZSBldmVudCBmb3IgY2xpcGJvYXJkIGJ1dHRvbiB1cGRhdGUgKHdpdGggZGVsYXkpXG4gICAgICAgICRmaWVsZC5vbigncGFzdGUucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIHN0YXRlIG9uIGVtcHR5XG4gICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYWxsIGNsaXBib2FyZCBidXR0b25zICh3aWRnZXQncyBhbmQgYW55IGV4dGVybmFsIG9uZXMpXG4gICAgICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCB2YWx1ZSk7XG4gICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9jdXMgZXZlbnQgLSBzaG93IHByb2dyZXNzIGJhciB3aGVuIGZpZWxkIGlzIGZvY3VzZWRcbiAgICAgICAgJGZpZWxkLm9mZignZm9jdXMucGFzc3dvcmRXaWRnZXQnKS5vbignZm9jdXMucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0ZvY3VzZWQgPSB0cnVlO1xuICAgICAgICAgICAgLy8gU2hvdyBwcm9ncmVzcyBiYXIgaWYgdGhlcmUncyBhIHBhc3N3b3JkIHZhbHVlXG4gICAgICAgICAgICBjb25zdCBwYXNzd29yZCA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGlmIChwYXNzd29yZCAmJiBwYXNzd29yZCAhPT0gJycgJiYgIXRoaXMuaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB2YWxpZGF0aW9uIHRvIHVwZGF0ZSBwcm9ncmVzcyBiYXIgd2hlbiBmb2N1c2VkICh3aXRob3V0IGRlYm91bmNlIGZvciBpbml0aWFsIGZvY3VzKVxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRlT25JbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQmx1ciBldmVudCAtIGhpZGUgcHJvZ3Jlc3MgYmFyIHdoZW4gZmllbGQgbG9zZXMgZm9jdXMgb25seSBpZiBubyB3YXJuaW5nc1xuICAgICAgICAkZmllbGQub2ZmKCdibHVyLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2JsdXIucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0ZvY3VzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIEhpZGUgcHJvZ3Jlc3MgYmFyIG9ubHkgaWYgdGhlcmUgYXJlIG5vIHZhbGlkYXRpb24gd2FybmluZ3MgdmlzaWJsZVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24gJiZcbiAgICAgICAgICAgICAgICAoIWluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncyB8fCBpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MuaXMoJzplbXB0eScpIHx8ICFpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MuaXMoJzp2aXNpYmxlJykpKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBOZXZlciBoaWRlIHdhcm5pbmdzIG9uIGJsdXIgLSB0aGV5IHNob3VsZCByZW1haW4gdmlzaWJsZVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIERpc2FibGUgd2lkZ2V0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgZGlzYWJsZShpbnN0YW5jZSkge1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFuY2UuJGNvbnRhaW5lci5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEVuYWJsZSB3aWRnZXRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBlbmFibGUoaW5zdGFuY2UpIHtcbiAgICAgICAgaW5zdGFuY2UuJGZpZWxkLnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFuY2UuJGNvbnRhaW5lci5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCByZWFkLW9ubHkgbW9kZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHNldFJlYWRPbmx5KGluc3RhbmNlKSB7XG4gICAgICAgIGluc3RhbmNlLiRmaWVsZC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXR1cCBmb3JtIHZhbGlkYXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBzZXR1cEZvcm1WYWxpZGF0aW9uKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgaWYgRm9ybSBvYmplY3QgaXMgbm90IGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIEZvcm0gPT09ICd1bmRlZmluZWQnIHx8ICFGb3JtLnZhbGlkYXRlUnVsZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCAkZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgaWYgKCFmaWVsZE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGN1c3RvbSBydWxlcyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0aW9uUnVsZXMpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlc1tmaWVsZE5hbWVdID0gb3B0aW9ucy52YWxpZGF0aW9uUnVsZXM7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIG1vZGVcbiAgICAgICAgY29uc3QgcnVsZXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub24tZW1wdHkgcnVsZSBmb3IgaGFyZCB2YWxpZGF0aW9uXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5IQVJEKSB7XG4gICAgICAgICAgICBydWxlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnB3X1ZhbGlkYXRlUGFzc3dvcmRFbXB0eVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzdHJlbmd0aCB2YWxpZGF0aW9uXG4gICAgICAgIGlmIChvcHRpb25zLm1pblNjb3JlID4gMCAmJiBvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5IQVJEKSB7XG4gICAgICAgICAgICBydWxlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncGFzc3dvcmRTdHJlbmd0aCcsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHdfVmFsaWRhdGVQYXNzd29yZFdlYWtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAocnVsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzW2ZpZWxkTmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogZmllbGROYW1lLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBydWxlc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIHBhc3N3b3JkIHN0cmVuZ3RoXG4gICAgICAgIGlmICh0eXBlb2YgJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnBhc3N3b3JkU3RyZW5ndGggPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAkLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMucGFzc3dvcmRTdHJlbmd0aCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaW5zdGFuY2Uuc3RhdGUuc2NvcmUgPj0gb3B0aW9ucy5taW5TY29yZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHBhc3N3b3JkIGlzIG1hc2tlZCAoc2VydmVyIHJldHVybnMgdGhlc2Ugd2hlbiBwYXNzd29yZCBpcyBoaWRkZW4pXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3N3b3JkIC0gUGFzc3dvcmQgdG8gY2hlY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBwYXNzd29yZCBhcHBlYXJzIHRvIGJlIG1hc2tlZFxuICAgICAqL1xuICAgIGlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpIHtcbiAgICAgICAgcmV0dXJuIC9eW3hYXXs2LH0kfF5cXCp7Nix9JHxeSElEREVOJHxeTUFTS0VEJC9pLnRlc3QocGFzc3dvcmQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGlucHV0IGV2ZW50IHdpdGggZGVib3VuY2luZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGhhbmRsZUlucHV0KGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgcGFzc3dvcmQgPSAkZmllbGQudmFsKCk7XG5cbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGlmIGRpc2FibGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gZm9yIG1hc2tlZCBwYXNzd29yZHNcbiAgICAgICAgaWYgKHRoaXMuaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBpZiB0aGlzIGlzIGEgZ2VuZXJhdGVkIHBhc3N3b3JkIChhbHJlYWR5IHZhbGlkYXRlZCBpbiBzZXRHZW5lcmF0ZWRQYXNzd29yZClcbiAgICAgICAgaWYgKGluc3RhbmNlLnN0YXRlLmlzR2VuZXJhdGVkKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZCA9IGZhbHNlOyAvLyBSZXNldCBmbGFnIGZvciBuZXh0IGlucHV0XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBbHdheXMgdmFsaWRhdGUgcGFzc3dvcmQgd2l0aCBkZWJvdW5jZSAoZG9uJ3QgcmVxdWlyZSBmb2N1cylcbiAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkV2l0aERlYm91bmNlKGluc3RhbmNlLCBwYXNzd29yZCwgNTAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHBhc3RlIGlucHV0IGV2ZW50IHdpdGhvdXQgZGVib3VuY2luZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGhhbmRsZVBhc3RlSW5wdXQoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCBwYXNzd29yZCA9ICRmaWVsZC52YWwoKTtcblxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgZGlzYWJsZWRcbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLk5PTkUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBmb3IgbWFza2VkIHBhc3N3b3Jkc1xuICAgICAgICBpZiAodGhpcy5pc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgaW1tZWRpYXRlbHkgd2l0aG91dCBkZWJvdW5jZSBmb3IgcGFzdGVcbiAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSBwYXNzd29yZCB3aXRoIGRlYm91bmNpbmcgZm9yIHR5cGluZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIHZhbGlkYXRlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlYm91bmNlVGltZSAtIERlYm91bmNlIGRlbGF5IGluIG1pbGxpc2Vjb25kc1xuICAgICAqL1xuICAgIHZhbGlkYXRlUGFzc3dvcmRXaXRoRGVib3VuY2UoaW5zdGFuY2UsIHBhc3N3b3JkLCBkZWJvdW5jZVRpbWUgPSA1MDApIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgdGltZXJcbiAgICAgICAgaWYgKHRoaXMudmFsaWRhdGlvblRpbWVyc1tpbnN0YW5jZS5maWVsZElkXSkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudmFsaWRhdGlvblRpbWVyc1tpbnN0YW5jZS5maWVsZElkXSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93IGltbWVkaWF0ZSBsb2NhbCBmZWVkYmFjayB3aGlsZSB3YWl0aW5nIChhbHdheXMgc2hvdyBwcm9ncmVzcyBiYXIgd2hlbiB0eXBpbmcpXG4gICAgICAgIGlmIChwYXNzd29yZCAmJiBwYXNzd29yZCAhPT0gJycgJiYgIXRoaXMuaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGxvY2FsU2NvcmUgPSB0aGlzLnNjb3JlUGFzc3dvcmRMb2NhbChwYXNzd29yZCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzQmFyKGluc3RhbmNlLCBsb2NhbFNjb3JlKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBwcm9ncmVzcyBzZWN0aW9uIHdoZW4gdHlwaW5nIChkb24ndCByZXF1aXJlIGZvY3VzIGZvciBpbW1lZGlhdGUgZmVlZGJhY2spXG4gICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBmb3IgZW1wdHkgcGFzc3dvcmRcbiAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aW1lciBmb3IgZnVsbCB2YWxpZGF0aW9uIChpbmNsdWRpbmcgQVBJIGNhbGwgYW5kIHdhcm5pbmdzKVxuICAgICAgICB0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0gPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIC8vIE9ubHkgZG8gZnVsbCB2YWxpZGF0aW9uIGlmIGZpZWxkIHN0aWxsIGhhcyB0aGUgc2FtZSB2YWx1ZVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLiRmaWVsZC52YWwoKSA9PT0gcGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZGVib3VuY2VUaW1lKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgcGFzc3dvcmQgaW1tZWRpYXRlbHlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB0byB2YWxpZGF0ZVxuICAgICAqL1xuICAgIHZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKSB7XG4gICAgICAgIGNvbnN0IHsgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG5cbiAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgd2FybmluZ3MgYXQgdGhlIHN0YXJ0IG9mIHZhbGlkYXRpb25cbiAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBlbXB0eSBwYXNzd29yZFxuICAgICAgICBpZiAoIXBhc3N3b3JkIHx8IHBhc3N3b3JkID09PSAnJykge1xuICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGZvciBtYXNrZWQgcGFzc3dvcmRzXG4gICAgICAgIGlmICh0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93IHByb2dyZXNzIHNlY3Rpb24gd2hlbiB2YWxpZGF0aW5nXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cgaW1tZWRpYXRlIGxvY2FsIGZlZWRiYWNrXG4gICAgICAgIGNvbnN0IGxvY2FsU2NvcmUgPSB0aGlzLnNjb3JlUGFzc3dvcmRMb2NhbChwYXNzd29yZCk7XG4gICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3NCYXIoaW5zdGFuY2UsIGxvY2FsU2NvcmUpO1xuXG4gICAgICAgIC8vIFVzZSBBUEkgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgUGFzc3dvcmRzQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgUGFzc3dvcmRzQVBJLnZhbGlkYXRlUGFzc3dvcmQocGFzc3dvcmQsIGluc3RhbmNlLmZpZWxkSWQsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVzZSBsb2NhbCB2YWxpZGF0aW9uXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgc2NvcmU6IGxvY2FsU2NvcmUsXG4gICAgICAgICAgICAgICAgaXNWYWxpZDogbG9jYWxTY29yZSA+PSBvcHRpb25zLm1pblNjb3JlLFxuICAgICAgICAgICAgICAgIHN0cmVuZ3RoOiB0aGlzLmdldFN0cmVuZ3RoTGFiZWwobG9jYWxTY29yZSksXG4gICAgICAgICAgICAgICAgbWVzc2FnZXM6IFtdXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVWYWxpZGF0aW9uUmVzdWx0KGluc3RhbmNlLCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgcGFzc3dvcmQgc2NvcmUgbG9jYWxseVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIHNjb3JlXG4gICAgICogQHJldHVybnMge251bWJlcn0gU2NvcmUgZnJvbSAwLTEwMFxuICAgICAqL1xuICAgIHNjb3JlUGFzc3dvcmRMb2NhbChwYXNzd29yZCkge1xuICAgICAgICBsZXQgc2NvcmUgPSAwO1xuICAgICAgICBpZiAoIXBhc3N3b3JkIHx8IHBhc3N3b3JkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHNjb3JlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsZW5ndGggPSBwYXNzd29yZC5sZW5ndGg7XG4gICAgICAgIFxuICAgICAgICAvLyBMZW5ndGggc2NvcmluZyAodXAgdG8gMzAgcG9pbnRzKVxuICAgICAgICBpZiAobGVuZ3RoID49IDE2KSB7XG4gICAgICAgICAgICBzY29yZSArPSAzMDtcbiAgICAgICAgfSBlbHNlIGlmIChsZW5ndGggPj0gMTIpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDIwO1xuICAgICAgICB9IGVsc2UgaWYgKGxlbmd0aCA+PSA4KSB7XG4gICAgICAgICAgICBzY29yZSArPSAxMDtcbiAgICAgICAgfSBlbHNlIGlmIChsZW5ndGggPj0gNikge1xuICAgICAgICAgICAgc2NvcmUgKz0gNTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hhcmFjdGVyIGRpdmVyc2l0eSAodXAgdG8gNDAgcG9pbnRzKVxuICAgICAgICBpZiAoL1thLXpdLy50ZXN0KHBhc3N3b3JkKSkgc2NvcmUgKz0gMTA7IC8vIExvd2VyY2FzZVxuICAgICAgICBpZiAoL1tBLVpdLy50ZXN0KHBhc3N3b3JkKSkgc2NvcmUgKz0gMTA7IC8vIFVwcGVyY2FzZVxuICAgICAgICBpZiAoL1xcZC8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAgICAgLy8gRGlnaXRzXG4gICAgICAgIGlmICgvXFxXLy50ZXN0KHBhc3N3b3JkKSkgc2NvcmUgKz0gMTA7ICAgICAvLyBTcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgXG4gICAgICAgIC8vIFBhdHRlcm4gY29tcGxleGl0eSAodXAgdG8gMzAgcG9pbnRzKVxuICAgICAgICBjb25zdCB1bmlxdWVDaGFycyA9IG5ldyBTZXQocGFzc3dvcmQpLnNpemU7XG4gICAgICAgIGNvbnN0IHVuaXF1ZVJhdGlvID0gdW5pcXVlQ2hhcnMgLyBsZW5ndGg7XG4gICAgICAgIFxuICAgICAgICBpZiAodW5pcXVlUmF0aW8gPiAwLjcpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDIwO1xuICAgICAgICB9IGVsc2UgaWYgKHVuaXF1ZVJhdGlvID4gMC41KSB7XG4gICAgICAgICAgICBzY29yZSArPSAxNTtcbiAgICAgICAgfSBlbHNlIGlmICh1bmlxdWVSYXRpbyA+IDAuMykge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzY29yZSArPSA1O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBQZW5hbHRpZXMgZm9yIGNvbW1vbiBwYXR0ZXJuc1xuICAgICAgICBpZiAoLyguKVxcMXsyLH0vLnRlc3QocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICBzY29yZSAtPSAxMDsgLy8gUmVwZWF0aW5nIGNoYXJhY3RlcnNcbiAgICAgICAgfVxuICAgICAgICBpZiAoLygwMTJ8MTIzfDIzNHwzNDV8NDU2fDU2N3w2Nzh8Nzg5fDg5MHxhYmN8YmNkfGNkZXxkZWYpL2kudGVzdChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgIHNjb3JlIC09IDEwOyAvLyBTZXF1ZW50aWFsIHBhdHRlcm5zXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1pbigxMDAsIHNjb3JlKSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc3RyZW5ndGggbGFiZWwgZm9yIHNjb3JlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3JlIC0gUGFzc3dvcmQgc2NvcmVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTdHJlbmd0aCBsYWJlbFxuICAgICAqL1xuICAgIGdldFN0cmVuZ3RoTGFiZWwoc2NvcmUpIHtcbiAgICAgICAgaWYgKHNjb3JlIDwgMjApIHJldHVybiAndmVyeV93ZWFrJztcbiAgICAgICAgaWYgKHNjb3JlIDwgNDApIHJldHVybiAnd2Vhayc7XG4gICAgICAgIGlmIChzY29yZSA8IDYwKSByZXR1cm4gJ2ZhaXInO1xuICAgICAgICBpZiAoc2NvcmUgPCA4MCkgcmV0dXJuICdnb29kJztcbiAgICAgICAgcmV0dXJuICdzdHJvbmcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHByb2dyZXNzIGJhclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29yZSAtIFBhc3N3b3JkIHNjb3JlXG4gICAgICovXG4gICAgdXBkYXRlUHJvZ3Jlc3NCYXIoaW5zdGFuY2UsIHNjb3JlKSB7XG4gICAgICAgIGNvbnN0IHsgZWxlbWVudHMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFlbGVtZW50cy4kcHJvZ3Jlc3NCYXIgfHwgZWxlbWVudHMuJHByb2dyZXNzQmFyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3NcbiAgICAgICAgZWxlbWVudHMuJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcbiAgICAgICAgICAgIHBlcmNlbnQ6IE1hdGgubWluKHNjb3JlLCAxMDApLFxuICAgICAgICAgICAgc2hvd0FjdGl2aXR5OiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY29sb3JcbiAgICAgICAgZWxlbWVudHMuJHByb2dyZXNzQmFyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JlZCBvcmFuZ2UgeWVsbG93IG9saXZlIGdyZWVuJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyh0aGlzLmdldENvbG9yRm9yU2NvcmUoc2NvcmUpKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjb2xvciBjbGFzcyBmb3Igc2NvcmVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcmUgLSBQYXNzd29yZCBzY29yZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IENvbG9yIGNsYXNzIG5hbWVcbiAgICAgKi9cbiAgICBnZXRDb2xvckZvclNjb3JlKHNjb3JlKSB7XG4gICAgICAgIGlmIChzY29yZSA8IDIwKSByZXR1cm4gJ3JlZCc7XG4gICAgICAgIGlmIChzY29yZSA8IDQwKSByZXR1cm4gJ29yYW5nZSc7XG4gICAgICAgIGlmIChzY29yZSA8IDYwKSByZXR1cm4gJ3llbGxvdyc7XG4gICAgICAgIGlmIChzY29yZSA8IDgwKSByZXR1cm4gJ29saXZlJztcbiAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgdmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gVmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKi9cbiAgICBoYW5kbGVWYWxpZGF0aW9uUmVzdWx0KGluc3RhbmNlLCByZXN1bHQpIHtcbiAgICAgICAgaWYgKCFyZXN1bHQpIHJldHVybjtcblxuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuXG4gICAgICAgIC8vIEFsd2F5cyBjbGVhciB3YXJuaW5ncyBmaXJzdCB0byBlbnN1cmUgY2xlYW4gc3RhdGVcbiAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0ZVxuICAgICAgICBpbnN0YW5jZS5zdGF0ZSA9IHtcbiAgICAgICAgICAgIGlzVmFsaWQ6IHJlc3VsdC5pc1ZhbGlkIHx8IHJlc3VsdC5zY29yZSA+PSBvcHRpb25zLm1pblNjb3JlLFxuICAgICAgICAgICAgc2NvcmU6IHJlc3VsdC5zY29yZSxcbiAgICAgICAgICAgIHN0cmVuZ3RoOiByZXN1bHQuc3RyZW5ndGggfHwgdGhpcy5nZXRTdHJlbmd0aExhYmVsKHJlc3VsdC5zY29yZSksXG4gICAgICAgICAgICBtZXNzYWdlczogcmVzdWx0Lm1lc3NhZ2VzIHx8IFtdLFxuICAgICAgICAgICAgaXNHZW5lcmF0ZWQ6IGluc3RhbmNlLnN0YXRlLmlzR2VuZXJhdGVkXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXBkYXRlIFVJXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3NCYXIoaW5zdGFuY2UsIHJlc3VsdC5zY29yZSk7XG5cbiAgICAgICAgLy8gU2hvdyB3YXJuaW5ncy9lcnJvcnMgb25seSBpZiB0aGVyZSBhcmUgbWVzc2FnZXMgQU5EIHBhc3N3b3JkIGlzIG5vdCBzdHJvbmcgZW5vdWdoXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dXYXJuaW5ncyAmJiByZXN1bHQubWVzc2FnZXMgJiYgcmVzdWx0Lm1lc3NhZ2VzLmxlbmd0aCA+IDAgJiYgIWluc3RhbmNlLnN0YXRlLmlzVmFsaWQpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VUeXBlID0gaW5zdGFuY2Uuc3RhdGUuaXNWYWxpZCA/ICd3YXJuaW5nJyA6ICdlcnJvcic7XG4gICAgICAgICAgICB0aGlzLnNob3dXYXJuaW5ncyhpbnN0YW5jZSwgcmVzdWx0LCBtZXNzYWdlVHlwZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYWxsIHZhbGlkYXRpb24gY2FsbGJhY2tcbiAgICAgICAgaWYgKG9wdGlvbnMub25WYWxpZGF0ZSkge1xuICAgICAgICAgICAgb3B0aW9ucy5vblZhbGlkYXRlKGluc3RhbmNlLnN0YXRlLmlzVmFsaWQsIHJlc3VsdC5zY29yZSwgcmVzdWx0Lm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtIHZhbGlkYXRpb24gc3RhdGVcbiAgICAgICAgaWYgKEZvcm0gJiYgRm9ybS4kZm9ybU9iaikge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gaW5zdGFuY2UuJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCBpbnN0YW5jZS4kZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmICghaW5zdGFuY2Uuc3RhdGUuaXNWYWxpZCAmJiBvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5IQVJEKSB7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdhZGQgcHJvbXB0JywgZmllbGROYW1lLCByZXN1bHQubWVzc2FnZXNbMF0gfHwgJ0ludmFsaWQgcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgZmllbGROYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgcGFzc3dvcmRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVBhc3N3b3JkKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdlbmVyYXRlIHBhc3N3b3JkXG4gICAgICAgIGNvbnN0IGdlbmVyYXRlQ2FsbGJhY2sgPSAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwYXNzd29yZCA9IHR5cGVvZiByZXN1bHQgPT09ICdzdHJpbmcnID8gcmVzdWx0IDogcmVzdWx0LnBhc3N3b3JkO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgcGFzc3dvcmRcbiAgICAgICAgICAgIHRoaXMuc2V0R2VuZXJhdGVkUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCBjYWxsYmFja1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMub25HZW5lcmF0ZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMub25HZW5lcmF0ZShwYXNzd29yZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgQVBJIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIFBhc3N3b3Jkc0FQSSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIFBhc3N3b3Jkc0FQSS5nZW5lcmF0ZVBhc3N3b3JkKG9wdGlvbnMuZ2VuZXJhdGVMZW5ndGgsIGdlbmVyYXRlQ2FsbGJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2ltcGxlIGxvY2FsIGdlbmVyYXRvclxuICAgICAgICAgICAgY29uc3QgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkhQCMkJV4mKic7XG4gICAgICAgICAgICBsZXQgcGFzc3dvcmQgPSAnJztcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3B0aW9ucy5nZW5lcmF0ZUxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGFzc3dvcmQgKz0gY2hhcnMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZ2VuZXJhdGVDYWxsYmFjayhwYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCBnZW5lcmF0ZWQgcGFzc3dvcmRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBHZW5lcmF0ZWQgcGFzc3dvcmRcbiAgICAgKi9cbiAgICBzZXRHZW5lcmF0ZWRQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsICRjb250YWluZXIsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGdlbmVyYXRlZCBmbGFnIGZpcnN0IHRvIHByZXZlbnQgZHVwbGljYXRlIHZhbGlkYXRpb25cbiAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNHZW5lcmF0ZWQgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHZhbHVlIHdpdGhvdXQgdHJpZ2dlcmluZyBjaGFuZ2UgZXZlbnQgeWV0XG4gICAgICAgICRmaWVsZC52YWwocGFzc3dvcmQpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjbGlwYm9hcmQgYnV0dG9ucyAod2lkZ2V0J3MgYW5kIGFueSBleHRlcm5hbCBvbmVzKVxuICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIHBhc3N3b3JkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIG9uY2UgaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gIT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm93IHRyaWdnZXIgY2hhbmdlIGZvciBmb3JtIHRyYWNraW5nICh2YWxpZGF0aW9uIGFscmVhZHkgZG9uZSBhYm92ZSlcbiAgICAgICAgJGZpZWxkLnRyaWdnZXIoJ2NoYW5nZScpXG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHdhcm5pbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCAtIFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBNZXNzYWdlIHR5cGUgKHdhcm5pbmcvZXJyb3IpXG4gICAgICovXG4gICAgc2hvd1dhcm5pbmdzKGluc3RhbmNlLCByZXN1bHQsIHR5cGUgPSAnd2FybmluZycpIHtcbiAgICAgICAgaWYgKCFpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHsgZWxlbWVudHMgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCBjb2xvckNsYXNzID0gdHlwZSA9PT0gJ2Vycm9yJyA/ICdyZWQnIDogJ29yYW5nZSc7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB3YXJuaW5nc1xuICAgICAgICBlbGVtZW50cy4kd2FybmluZ3MuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB3YXJuaW5ncyBhcyBwb2ludGluZyBsYWJlbFxuICAgICAgICBpZiAocmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBDaG9vc2UgaWNvbiBiYXNlZCBvbiBtZXNzYWdlIHR5cGVcbiAgICAgICAgICAgIGNvbnN0IGljb25DbGFzcyA9IHR5cGUgPT09ICdlcnJvcicgPyAnZXhjbGFtYXRpb24gY2lyY2xlJyA6ICdleGNsYW1hdGlvbiB0cmlhbmdsZSc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSBsaXN0IGl0ZW1zIGZyb20gbWVzc2FnZXMgd2l0aCBpY29uc1xuICAgICAgICAgICAgY29uc3QgbGlzdEl0ZW1zID0gcmVzdWx0Lm1lc3NhZ2VzLm1hcChtc2cgPT4gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtpY29uQ2xhc3N9IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+JHttc2d9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKS5qb2luKCcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIHBvaW50aW5nIGFib3ZlIGxhYmVsIHdpdGggbGlzdCAocG9pbnRzIHRvIHBhc3N3b3JkIGZpZWxkKVxuICAgICAgICAgICAgY29uc3QgJGxhYmVsID0gJChgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nICR7Y29sb3JDbGFzc30gYmFzaWMgbGFiZWxcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGxpc3RcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7bGlzdEl0ZW1zfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBlbGVtZW50cy4kd2FybmluZ3MuYXBwZW5kKCRsYWJlbCkuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHdhcm5pbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgaGlkZVdhcm5pbmdzKGluc3RhbmNlKSB7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncy5lbXB0eSgpLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHBhc3N3b3JkIHZpc2liaWxpdHlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICB0b2dnbGVQYXNzd29yZFZpc2liaWxpdHkoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkc2hvd0hpZGVCdG4gPSBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG47XG4gICAgICAgIFxuICAgICAgICBpZiAoISRzaG93SGlkZUJ0bikgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJGljb24gPSAkc2hvd0hpZGVCdG4uZmluZCgnaScpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdwYXNzd29yZCcpIHtcbiAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmRcbiAgICAgICAgICAgICRmaWVsZC5hdHRyKCd0eXBlJywgJ3RleHQnKTtcbiAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUnKS5hZGRDbGFzcygnZXllIHNsYXNoJyk7XG4gICAgICAgICAgICAkc2hvd0hpZGVCdG4uYXR0cignZGF0YS1jb250ZW50JywgZ2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBIaWRlUGFzc3dvcmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBwYXNzd29yZFxuICAgICAgICAgICAgJGZpZWxkLmF0dHIoJ3R5cGUnLCAncGFzc3dvcmQnKTtcbiAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUgc2xhc2gnKS5hZGRDbGFzcygnZXllJyk7XG4gICAgICAgICAgICAkc2hvd0hpZGVCdG4uYXR0cignZGF0YS1jb250ZW50JywgZ2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBTaG93UGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciB2YWxpZGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKSB7XG4gICAgICAgIC8vIENsZWFyIHdhcm5pbmdzIHdoZW4gZXhwbGljaXRseSBjbGVhcmluZyB2YWxpZGF0aW9uIChlbXB0eSBwYXNzd29yZClcbiAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc0Jhcikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyLnByb2dyZXNzKHsgcGVyY2VudDogMCB9KTtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS5zdGF0ZSA9IHtcbiAgICAgICAgICAgIGlzVmFsaWQ6IHRydWUsXG4gICAgICAgICAgICBzY29yZTogMCxcbiAgICAgICAgICAgIHN0cmVuZ3RoOiAnJyxcbiAgICAgICAgICAgIG1lc3NhZ2VzOiBbXSxcbiAgICAgICAgICAgIGlzR2VuZXJhdGVkOiBmYWxzZSxcbiAgICAgICAgICAgIGlzRm9jdXNlZDogaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkIHx8IGZhbHNlXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBwYXNzd29yZCAobWFudWFsIHZhbGlkYXRpb24pXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgY2hlY2tQYXNzd29yZChpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCBwYXNzd29yZCA9IGluc3RhbmNlLiRmaWVsZC52YWwoKTtcbiAgICAgICAgaWYgKHBhc3N3b3JkICYmIHBhc3N3b3JkICE9PSAnJykge1xuICAgICAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGZvciBtYXNrZWQgcGFzc3dvcmRzXG4gICAgICAgICAgICBpZiAodGhpcy5pc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGb3IgaW5pdGlhbCBjaGVjaywgZG9uJ3Qgc2hvdyBwcm9ncmVzcyBiYXIgYnV0IGRvIHZhbGlkYXRlIGFuZCBzaG93IHdhcm5pbmdzXG4gICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGluc3RhbmNlT3JGaWVsZElkIC0gSW5zdGFuY2Ugb3IgZmllbGQgSURcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbmV3T3B0aW9ucyAtIE5ldyBvcHRpb25zXG4gICAgICovXG4gICAgdXBkYXRlQ29uZmlnKGluc3RhbmNlT3JGaWVsZElkLCBuZXdPcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBvcHRpb25zXG4gICAgICAgIGluc3RhbmNlLm9wdGlvbnMgPSB7IC4uLmluc3RhbmNlLm9wdGlvbnMsIC4uLm5ld09wdGlvbnMgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBkeW5hbWljIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnc2hvd1Bhc3N3b3JkQnV0dG9uJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5zaG93UGFzc3dvcmRCdXR0b24gJiYgIWluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBidXR0b24gaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgIHRoaXMuYWRkU2hvd0hpZGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIC8vIFJlLWJpbmQgZXZlbnRzIGZvciB0aGUgbmV3IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b2dnbGVQYXNzd29yZFZpc2liaWxpdHkoaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFuZXdPcHRpb25zLnNob3dQYXNzd29yZEJ1dHRvbiAmJiBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYnV0dG9uIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZ2VuZXJhdGUgYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdnZW5lcmF0ZUJ1dHRvbicgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuZ2VuZXJhdGVCdXR0b24gJiYgIWluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBidXR0b24gaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgIHRoaXMuYWRkR2VuZXJhdGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIC8vIFJlLWJpbmQgZXZlbnRzIGZvciB0aGUgbmV3IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVBhc3N3b3JkKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLnBvcHVwKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICghbmV3T3B0aW9ucy5nZW5lcmF0ZUJ1dHRvbiAmJiBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYnV0dG9uIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2xpcGJvYXJkIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnY2xpcGJvYXJkQnV0dG9uJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5jbGlwYm9hcmRCdXR0b24gJiYgIWluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgYnV0dG9uIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICB0aGlzLmFkZENsaXBib2FyZEJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIHRoZSBuZXcgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4gJiYgdHlwZW9mIENsaXBib2FyZEpTICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIENsaXBib2FyZEpTIGZvciB0aGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG5bMF0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cCBmb3IgY2xpcGJvYXJkIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc3VjY2Vzc2Z1bCBjb3B5XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW5ld09wdGlvbnMuY2xpcGJvYXJkQnV0dG9uICYmIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYnV0dG9uIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmNsaXBib2FyZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHN0cmVuZ3RoIGJhciB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnc2hvd1N0cmVuZ3RoQmFyJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5zaG93U3RyZW5ndGhCYXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dTdHJlbmd0aEJhcihpbnN0YW5jZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVN0cmVuZ3RoQmFyKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHdhcm5pbmdzIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdzaG93V2FybmluZ3MnIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLnNob3dXYXJuaW5ncykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1dhcm5pbmdzKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW5wdXQgd3JhcHBlciBhY3Rpb24gY2xhc3MgYmFzZWQgb24gYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyhpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1zZXR1cCBmb3JtIHZhbGlkYXRpb24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChpbnN0YW5jZS5vcHRpb25zLnZhbGlkYXRpb24gIT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwRm9ybVZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBjdXJyZW50IHZhbHVlIGlmIHZhbGlkYXRpb24gY2hhbmdlZFxuICAgICAgICBpZiAoJ3ZhbGlkYXRpb24nIGluIG5ld09wdGlvbnMgJiYgaW5zdGFuY2UuJGZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICB0aGlzLmNoZWNrUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaW5wdXQgd3JhcHBlciBhY3Rpb24gY2xhc3MgYmFzZWQgb24gYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICB1cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCAkaW5wdXRXcmFwcGVyID0gaW5zdGFuY2UuJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBjb25zdCBoYXNCdXR0b25zID0gISEoXG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4gfHwgXG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4gfHwgXG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaGFzQnV0dG9ucykge1xuICAgICAgICAgICAgJGlucHV0V3JhcHBlci5hZGRDbGFzcygnYWN0aW9uJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkaW5wdXRXcmFwcGVyLnJlbW92ZUNsYXNzKCdhY3Rpb24nKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHdpZGdldCBzdGF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gaW5zdGFuY2VPckZpZWxkSWQgLSBJbnN0YW5jZSBvciBmaWVsZCBJRFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R8bnVsbH0gV2lkZ2V0IHN0YXRlXG4gICAgICovXG4gICAgZ2V0U3RhdGUoaW5zdGFuY2VPckZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0eXBlb2YgaW5zdGFuY2VPckZpZWxkSWQgPT09ICdzdHJpbmcnIFxuICAgICAgICAgICAgPyB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VPckZpZWxkSWQpXG4gICAgICAgICAgICA6IGluc3RhbmNlT3JGaWVsZElkO1xuICAgICAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZSA/IGluc3RhbmNlLnN0YXRlIDogbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgc3RyZW5ndGggYmFyXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBpbnN0YW5jZU9yRmllbGRJZCAtIEluc3RhbmNlIG9yIGZpZWxkIElEXG4gICAgICovXG4gICAgc2hvd1N0cmVuZ3RoQmFyKGluc3RhbmNlT3JGaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgc3RyZW5ndGggYmFyXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBpbnN0YW5jZU9yRmllbGRJZCAtIEluc3RhbmNlIG9yIGZpZWxkIElEXG4gICAgICovXG4gICAgaGlkZVN0cmVuZ3RoQmFyKGluc3RhbmNlT3JGaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgd2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGRlc3Ryb3koZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gVW5iaW5kIGV2ZW50c1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQub2ZmKCcucGFzc3dvcmRXaWRnZXQnKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignLnBhc3N3b3JkV2lkZ2V0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuLm9mZignLnBhc3N3b3JkV2lkZ2V0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgY2xpcGJvYXJkIGluc3RhbmNlXG4gICAgICAgIGlmIChpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuY2xpcGJvYXJkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB0aW1lclxuICAgICAgICBpZiAodGhpcy52YWxpZGF0aW9uVGltZXJzW2ZpZWxkSWRdKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy52YWxpZGF0aW9uVGltZXJzW2ZpZWxkSWRdKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnZhbGlkYXRpb25UaW1lcnNbZmllbGRJZF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5kZWxldGUoZmllbGRJZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IGFsbCBpbnN0YW5jZXNcbiAgICAgKi9cbiAgICBkZXN0cm95QWxsKCkge1xuICAgICAgICB0aGlzLmluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSwgZmllbGRJZCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KGZpZWxkSWQpO1xuICAgICAgICB9KTtcbiAgICB9XG59OyJdfQ==