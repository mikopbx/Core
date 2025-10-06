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
 *     includeSpecial: true,      // Include special characters in generated passwords
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
    includeSpecial: true,
    // Include special characters in generated passwords
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
      // Simple local generator with configurable special characters
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

      if (options.includeSpecial) {
        chars += '!@#$%^&*';
      }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvcGFzc3dvcmQtd2lkZ2V0LmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkV2lkZ2V0IiwiaW5zdGFuY2VzIiwiTWFwIiwiVkFMSURBVElPTiIsIkhBUkQiLCJTT0ZUIiwiTk9ORSIsInZhbGlkYXRpb25UaW1lcnMiLCJkZWZhdWx0cyIsInZhbGlkYXRpb24iLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJpbmNsdWRlU3BlY2lhbCIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwib25WYWxpZGF0ZSIsIm9uR2VuZXJhdGUiLCJ2YWxpZGF0aW9uUnVsZXMiLCJpbml0Iiwic2VsZWN0b3IiLCJvcHRpb25zIiwiJGZpZWxkIiwiJCIsImxlbmd0aCIsImZpZWxkSWQiLCJhdHRyIiwiTWF0aCIsInJhbmRvbSIsInRvU3RyaW5nIiwic3Vic3RyIiwiaGFzIiwiZGVzdHJveSIsImluc3RhbmNlIiwiJGNvbnRhaW5lciIsImNsb3Nlc3QiLCJlbGVtZW50cyIsInN0YXRlIiwiaXNWYWxpZCIsInNjb3JlIiwic3RyZW5ndGgiLCJtZXNzYWdlcyIsImlzR2VuZXJhdGVkIiwiaXNGb2N1c2VkIiwic2V0Iiwic2V0dXBVSSIsImJpbmRFdmVudHMiLCJzZXR1cEZvcm1WYWxpZGF0aW9uIiwidmFsIiwiY2hlY2tQYXNzd29yZCIsIiRpbnB1dFdyYXBwZXIiLCJ3cmFwIiwicGFyZW50IiwiZGlzYWJsZVBhc3N3b3JkTWFuYWdlcnMiLCJhZGRTaG93SGlkZUJ1dHRvbiIsImFkZEdlbmVyYXRlQnV0dG9uIiwiYWRkQ2xpcGJvYXJkQnV0dG9uIiwiYWRkU3RyZW5ndGhCYXIiLCJhZGRXYXJuaW5nc0NvbnRhaW5lciIsInVwZGF0ZUlucHV0V3JhcHBlckNsYXNzIiwiZmluZCIsIiRzaG93SGlkZUJ0biIsImdsb2JhbFRyYW5zbGF0ZSIsImJ0X1Rvb2xUaXBTaG93UGFzc3dvcmQiLCJhcHBlbmQiLCIkZ2VuZXJhdGVCdG4iLCJidF9Ub29sVGlwR2VuZXJhdGVQYXNzd29yZCIsIiRjbGlwYm9hcmRCdG4iLCJjdXJyZW50VmFsdWUiLCJidF9Ub29sVGlwQ29weVBhc3N3b3JkIiwiJHByb2dyZXNzQmFyIiwiJHByb2dyZXNzU2VjdGlvbiIsIiR3YXJuaW5ncyIsIiRmb3JtIiwib24iLCJyZW1vdmVBdHRyIiwicHJldiIsIiRob25leXBvdCIsImJlZm9yZSIsIm9mZiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRvZ2dsZVBhc3N3b3JkVmlzaWJpbGl0eSIsImdlbmVyYXRlUGFzc3dvcmQiLCJDbGlwYm9hcmRKUyIsImNsaXBib2FyZCIsInBvcHVwIiwic2V0VGltZW91dCIsImNsZWFyU2VsZWN0aW9uIiwiaGFuZGxlSW5wdXQiLCJjbGVhclRpbWVvdXQiLCJoYW5kbGVQYXN0ZUlucHV0IiwidmFsdWUiLCJjbGVhclZhbGlkYXRpb24iLCJwYXNzd29yZCIsImlzTWFza2VkUGFzc3dvcmQiLCJzaG93IiwidmFsaWRhdGVQYXNzd29yZCIsImlzIiwiaGlkZSIsImRpc2FibGUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJlbmFibGUiLCJyZW1vdmVDbGFzcyIsInNldFJlYWRPbmx5IiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJmaWVsZE5hbWUiLCJydWxlcyIsInB1c2giLCJ0eXBlIiwicHJvbXB0IiwicHdfVmFsaWRhdGVQYXNzd29yZEVtcHR5IiwicHdfVmFsaWRhdGVQYXNzd29yZFdlYWsiLCJpZGVudGlmaWVyIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJwYXNzd29yZFN0cmVuZ3RoIiwidGVzdCIsInZhbGlkYXRlUGFzc3dvcmRXaXRoRGVib3VuY2UiLCJkZWJvdW5jZVRpbWUiLCJsb2NhbFNjb3JlIiwic2NvcmVQYXNzd29yZExvY2FsIiwidXBkYXRlUHJvZ3Jlc3NCYXIiLCJoaWRlV2FybmluZ3MiLCJQYXNzd29yZHNBUEkiLCJyZXN1bHQiLCJoYW5kbGVWYWxpZGF0aW9uUmVzdWx0IiwiZ2V0U3RyZW5ndGhMYWJlbCIsInVuaXF1ZUNoYXJzIiwiU2V0Iiwic2l6ZSIsInVuaXF1ZVJhdGlvIiwibWF4IiwibWluIiwicHJvZ3Jlc3MiLCJwZXJjZW50Iiwic2hvd0FjdGl2aXR5IiwiZ2V0Q29sb3JGb3JTY29yZSIsIm1lc3NhZ2VUeXBlIiwiJGZvcm1PYmoiLCJnZW5lcmF0ZUNhbGxiYWNrIiwic2V0R2VuZXJhdGVkUGFzc3dvcmQiLCJjaGFycyIsImkiLCJjaGFyQXQiLCJmbG9vciIsInRyaWdnZXIiLCJkYXRhQ2hhbmdlZCIsImNvbG9yQ2xhc3MiLCJlbXB0eSIsImljb25DbGFzcyIsImxpc3RJdGVtcyIsIm1hcCIsIm1zZyIsImpvaW4iLCIkbGFiZWwiLCIkaWNvbiIsImJ0X1Rvb2xUaXBIaWRlUGFzc3dvcmQiLCJ1cGRhdGVDb25maWciLCJpbnN0YW5jZU9yRmllbGRJZCIsIm5ld09wdGlvbnMiLCJnZXQiLCJyZW1vdmUiLCJoaWRlU3RyZW5ndGhCYXIiLCJoYXNCdXR0b25zIiwiZ2V0U3RhdGUiLCJkZXN0cm95QWxsIiwiZm9yRWFjaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxjQUFjLEdBQUc7QUFFbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQUFJQyxHQUFKLEVBTFE7O0FBUW5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUU7QUFDUkMsSUFBQUEsSUFBSSxFQUFFLE1BREU7QUFDUTtB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dCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYXNzd29yZHNBUEksIEZvcm0sIENsaXBib2FyZEpTICovXG5cbi8qKlxuICogUGFzc3dvcmQgV2lkZ2V0IE1vZHVsZVxuICpcbiAqIEEgY29tcHJlaGVuc2l2ZSBwYXNzd29yZCBmaWVsZCBjb21wb25lbnQgdGhhdCBwcm92aWRlczpcbiAqIC0gUGFzc3dvcmQgZ2VuZXJhdGlvblxuICogLSBTdHJlbmd0aCB2YWxpZGF0aW9uIHdpdGggcmVhbC10aW1lIGZlZWRiYWNrXG4gKiAtIFZpc3VhbCBwcm9ncmVzcyBpbmRpY2F0b3JcbiAqIC0gQVBJLWJhc2VkIHZhbGlkYXRpb24gd2l0aCBsb2NhbCBmYWxsYmFja1xuICogLSBGb3JtIHZhbGlkYXRpb24gaW50ZWdyYXRpb25cbiAqXG4gKiBVc2FnZTpcbiAqIGNvbnN0IHdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQoJyNteVBhc3N3b3JkRmllbGQnLCB7XG4gKiAgICAgbW9kZTogJ2Z1bGwnLCAgICAgICAgICAgICAgLy8gJ2Z1bGwnIHwgJ2dlbmVyYXRlLW9ubHknIHwgJ2Rpc3BsYXktb25seScgfCAnZGlzYWJsZWQnXG4gKiAgICAgdmFsaWRhdGlvbjogJ3NvZnQnLCAgICAgICAgLy8gJ2hhcmQnIHwgJ3NvZnQnIHwgJ25vbmUnXG4gKiAgICAgbWluU2NvcmU6IDYwLFxuICogICAgIGdlbmVyYXRlTGVuZ3RoOiAxNixcbiAqICAgICBpbmNsdWRlU3BlY2lhbDogdHJ1ZSwgICAgICAvLyBJbmNsdWRlIHNwZWNpYWwgY2hhcmFjdGVycyBpbiBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gKiAgICAgb25WYWxpZGF0ZTogKGlzVmFsaWQsIHNjb3JlLCBtZXNzYWdlcykgPT4geyAuLi4gfVxuICogfSk7XG4gKi9cbmNvbnN0IFBhc3N3b3JkV2lkZ2V0ID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEFjdGl2ZSB3aWRnZXQgaW5zdGFuY2VzXG4gICAgICovXG4gICAgaW5zdGFuY2VzOiBuZXcgTWFwKCksXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiB0eXBlc1xuICAgICAqL1xuICAgIFZBTElEQVRJT046IHtcbiAgICAgICAgSEFSRDogJ2hhcmQnLCAgIC8vIEJsb2NrIGZvcm0gc3VibWlzc2lvbiBpZiBpbnZhbGlkXG4gICAgICAgIFNPRlQ6ICdzb2Z0JywgICAvLyBTaG93IHdhcm5pbmdzIGJ1dCBhbGxvdyBzdWJtaXNzaW9uXG4gICAgICAgIE5PTkU6ICdub25lJyAgICAvLyBObyB2YWxpZGF0aW9uXG4gICAgfSxcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBUaW1lcnMgZm9yIGRlYm91bmNpbmcgdmFsaWRhdGlvblxuICAgICAqL1xuICAgIHZhbGlkYXRpb25UaW1lcnM6IHt9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIHZhbGlkYXRpb246ICdzb2Z0JyxcbiAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSwgIC8vIFNob3cvaGlkZSBwYXNzd29yZCB0b2dnbGVcbiAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLCAgICAgIC8vIENvcHkgdG8gY2xpcGJvYXJkIGJ1dHRvblxuICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgbWluU2NvcmU6IDYwLFxuICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMTYsXG4gICAgICAgIGluY2x1ZGVTcGVjaWFsOiB0cnVlLCAgICAgICAvLyBJbmNsdWRlIHNwZWNpYWwgY2hhcmFjdGVycyBpbiBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgY2hlY2tPbkxvYWQ6IGZhbHNlLFxuICAgICAgICBvblZhbGlkYXRlOiBudWxsLCAgICAgICAgLy8gQ2FsbGJhY2s6IChpc1ZhbGlkLCBzY29yZSwgbWVzc2FnZXMpID0+IHZvaWRcbiAgICAgICAgb25HZW5lcmF0ZTogbnVsbCwgICAgICAgIC8vIENhbGxiYWNrOiAocGFzc3dvcmQpID0+IHZvaWRcbiAgICAgICAgdmFsaWRhdGlvblJ1bGVzOiBudWxsICAgIC8vIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGVzIGZvciBGb3JtLmpzXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGpRdWVyeX0gc2VsZWN0b3IgLSBGaWVsZCBzZWxlY3RvciBvciBqUXVlcnkgb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBXaWRnZXQgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R8bnVsbH0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgaW5pdChzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoc2VsZWN0b3IpO1xuICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkSWQgPSAkZmllbGQuYXR0cignaWQnKSB8fCAkZmllbGQuYXR0cignbmFtZScpIHx8IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgaW5zdGFuY2UgaWYgYW55XG4gICAgICAgIGlmICh0aGlzLmluc3RhbmNlcy5oYXMoZmllbGRJZCkpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveShmaWVsZElkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGluc3RhbmNlXG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0ge1xuICAgICAgICAgICAgZmllbGRJZCxcbiAgICAgICAgICAgICRmaWVsZCxcbiAgICAgICAgICAgICRjb250YWluZXI6ICRmaWVsZC5jbG9zZXN0KCcuZmllbGQnKSxcbiAgICAgICAgICAgIG9wdGlvbnM6IHsgLi4udGhpcy5kZWZhdWx0cywgLi4ub3B0aW9ucyB9LFxuICAgICAgICAgICAgZWxlbWVudHM6IHt9LFxuICAgICAgICAgICAgc3RhdGU6IHtcbiAgICAgICAgICAgICAgICBpc1ZhbGlkOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNjb3JlOiAwLFxuICAgICAgICAgICAgICAgIHN0cmVuZ3RoOiAnJyxcbiAgICAgICAgICAgICAgICBtZXNzYWdlczogW10sXG4gICAgICAgICAgICAgICAgaXNHZW5lcmF0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGlzRm9jdXNlZDogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIGluc3RhbmNlXG4gICAgICAgIHRoaXMuaW5zdGFuY2VzLnNldChmaWVsZElkLCBpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplXG4gICAgICAgIHRoaXMuc2V0dXBVSShpbnN0YW5jZSk7XG4gICAgICAgIHRoaXMuYmluZEV2ZW50cyhpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBmb3JtIHZhbGlkYXRpb24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChpbnN0YW5jZS5vcHRpb25zLnZhbGlkYXRpb24gIT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwRm9ybVZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpbml0aWFsIHZhbHVlIGlmIHJlcXVlc3RlZFxuICAgICAgICBpZiAoaW5zdGFuY2Uub3B0aW9ucy5jaGVja09uTG9hZCAmJiAkZmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tQYXNzd29yZChpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIFVJIGVsZW1lbnRzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgc2V0dXBVSShpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgJGNvbnRhaW5lciwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG5cbiAgICAgICAgLy8gRmluZCBvciBjcmVhdGUgaW5wdXQgd3JhcHBlclxuICAgICAgICBsZXQgJGlucHV0V3JhcHBlciA9ICRmaWVsZC5jbG9zZXN0KCcudWkuaW5wdXQnKTtcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkZmllbGQud3JhcCgnPGRpdiBjbGFzcz1cInVpIGlucHV0XCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAkaW5wdXRXcmFwcGVyID0gJGZpZWxkLnBhcmVudCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGlzYWJsZSBwYXNzd29yZCBtYW5hZ2Vyc1xuICAgICAgICB0aGlzLmRpc2FibGVQYXNzd29yZE1hbmFnZXJzKGluc3RhbmNlKTtcblxuICAgICAgICAvLyBBZGQgc2hvdy9oaWRlIHBhc3N3b3JkIGJ1dHRvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1Bhc3N3b3JkQnV0dG9uKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFNob3dIaWRlQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBnZW5lcmF0ZSBidXR0b24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLmdlbmVyYXRlQnV0dG9uKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEdlbmVyYXRlQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBjbGlwYm9hcmQgYnV0dG9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5jbGlwYm9hcmRCdXR0b24pIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQ2xpcGJvYXJkQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBzdHJlbmd0aCBiYXIgaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dTdHJlbmd0aEJhcikge1xuICAgICAgICAgICAgdGhpcy5hZGRTdHJlbmd0aEJhcihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgd2FybmluZ3MgY29udGFpbmVyIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5zaG93V2FybmluZ3MpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkV2FybmluZ3NDb250YWluZXIoaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGlucHV0IHdyYXBwZXIgY2xhc3MgYmFzZWQgb24gYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyhpbnN0YW5jZSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgc2hvdy9oaWRlIHBhc3N3b3JkIGJ1dHRvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZFNob3dIaWRlQnV0dG9uKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGlucHV0V3JhcHBlciA9ICRmaWVsZC5jbG9zZXN0KCcudWkuaW5wdXQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uc2hvdy1oaWRlLXBhc3N3b3JkJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuID0gJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uc2hvdy1oaWRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBidXR0b25cbiAgICAgICAgY29uc3QgJHNob3dIaWRlQnRuID0gJChgXG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIHNob3ctaGlkZS1wYXNzd29yZFwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwU2hvd1Bhc3N3b3JkfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXllIGljb25cIj48L2k+XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBlbmQgdG8gd3JhcHBlclxuICAgICAgICAkaW5wdXRXcmFwcGVyLmFwcGVuZCgkc2hvd0hpZGVCdG4pO1xuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4gPSAkc2hvd0hpZGVCdG47XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgZ2VuZXJhdGUgYnV0dG9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkR2VuZXJhdGVCdXR0b24oaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkaW5wdXRXcmFwcGVyID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYnV0dG9uIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0biA9ICRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBidXR0b25cbiAgICAgICAgY29uc3QgJGdlbmVyYXRlQnRuID0gJChgXG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIGdlbmVyYXRlLXBhc3N3b3JkXCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBHZW5lcmF0ZVBhc3N3b3JkfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic3luYyBpY29uXCI+PC9pPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwZW5kIHRvIHdyYXBwZXJcbiAgICAgICAgJGlucHV0V3JhcHBlci5hcHBlbmQoJGdlbmVyYXRlQnRuKTtcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuID0gJGdlbmVyYXRlQnRuO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIGNsaXBib2FyZCBidXR0b25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRDbGlwYm9hcmRCdXR0b24oaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkaW5wdXRXcmFwcGVyID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYnV0dG9uIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5jbGlwYm9hcmQnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuID0gJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBidXR0b25cbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8ICcnO1xuICAgICAgICBjb25zdCAkY2xpcGJvYXJkQnRuID0gJChgXG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIGNsaXBib2FyZFwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNsaXBib2FyZC10ZXh0PVwiJHtjdXJyZW50VmFsdWV9XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlQYXNzd29yZH1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb25zXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBjb3B5XCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNvcm5lciBrZXkgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8L2k+XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBlbmQgdG8gd3JhcHBlclxuICAgICAgICAkaW5wdXRXcmFwcGVyLmFwcGVuZCgkY2xpcGJvYXJkQnRuKTtcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0biA9ICRjbGlwYm9hcmRCdG47XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgc3RyZW5ndGggYmFyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkU3RyZW5ndGhCYXIoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkY29udGFpbmVyIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHByb2dyZXNzIGJhciBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NCYXIgPSAkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpO1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbiA9ICRjb250YWluZXIuZmluZCgnLnBhc3N3b3JkLXN0cmVuZ3RoLXNlY3Rpb24nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIHByb2dyZXNzIGJhclxuICAgICAgICBjb25zdCAkcHJvZ3Jlc3NTZWN0aW9uID0gJChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwicGFzc3dvcmQtc3RyZW5ndGgtc2VjdGlvblwiIHN0eWxlPVwiZGlzcGxheTpub25lO1wiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBwYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcyBwcm9ncmVzcyBib3R0b20gYXR0YWNoZWQgXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYXJcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluc2VydCBhZnRlciBmaWVsZFxuICAgICAgICAkY29udGFpbmVyLmFwcGVuZCgkcHJvZ3Jlc3NTZWN0aW9uKTtcbiAgICAgICAgXG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc0JhciA9ICRwcm9ncmVzc1NlY3Rpb24uZmluZCgnLnBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24gPSAkcHJvZ3Jlc3NTZWN0aW9uO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIHdhcm5pbmdzIGNvbnRhaW5lclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZFdhcm5pbmdzQ29udGFpbmVyKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGNvbnRhaW5lciB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB3YXJuaW5ncyBjb250YWluZXIgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRjb250YWluZXIuZmluZCgnLnBhc3N3b3JkLXdhcm5pbmdzJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzID0gJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtd2FybmluZ3MnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIHdhcm5pbmdzIGNvbnRhaW5lciAod2lsbCBiZSBwb3B1bGF0ZWQgd2hlbiBuZWVkZWQpXG4gICAgICAgIGNvbnN0ICR3YXJuaW5ncyA9ICQoJzxkaXYgY2xhc3M9XCJwYXNzd29yZC13YXJuaW5nc1wiPjwvZGl2PicpO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwZW5kIHRvIHRoZSBmaWVsZCBjb250YWluZXIgKGFmdGVyIHByb2dyZXNzIGJhciBpZiBleGlzdHMpXG4gICAgICAgICRjb250YWluZXIuYXBwZW5kKCR3YXJuaW5ncyk7XG4gICAgICAgIFxuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MgPSAkd2FybmluZ3M7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEaXNhYmxlIHBhc3N3b3JkIG1hbmFnZXJzIGZyb20gaW50ZXJmZXJpbmcgd2l0aCBwYXNzd29yZCBmaWVsZHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBkaXNhYmxlUGFzc3dvcmRNYW5hZ2VycyhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRmb3JtID0gJGZpZWxkLmNsb3Nlc3QoJ2Zvcm0nKTtcblxuICAgICAgICAvLyBTZXQgYXR0cmlidXRlcyB0byBwcmV2ZW50IGF1dG9maWxsXG4gICAgICAgICRmaWVsZC5hdHRyKHtcbiAgICAgICAgICAgICdhdXRvY29tcGxldGUnOiAnb2ZmJyxcbiAgICAgICAgICAgICdkYXRhLWxwaWdub3JlJzogJ3RydWUnLCAgICAgICAgICAgLy8gTGFzdFBhc3NcbiAgICAgICAgICAgICdkYXRhLTFwLWlnbm9yZSc6ICd0cnVlJywgICAgICAgICAgLy8gMVBhc3N3b3JkXG4gICAgICAgICAgICAnZGF0YS1mb3JtLXR5cGUnOiAnb3RoZXInLCAgICAgICAgIC8vIENocm9tZVxuICAgICAgICAgICAgJ2RhdGEtYndpZ25vcmUnOiAndHJ1ZScsICAgICAgICAgICAvLyBCaXR3YXJkZW5cbiAgICAgICAgICAgICdyZWFkb25seSc6ICdyZWFkb25seScgICAgICAgICAgICAgIC8vIE1ha2UgcmVhZG9ubHkgaW5pdGlhbGx5XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlbW92ZSByZWFkb25seSBvbiBmb2N1c1xuICAgICAgICAkZmllbGQub24oJ2ZvY3VzLnBhc3N3b3JkTWFuYWdlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgaG9uZXlwb3QgZmllbGQgdG8gdHJpY2sgcGFzc3dvcmQgbWFuYWdlcnNcbiAgICAgICAgaWYgKCRmaWVsZC5wcmV2KCcucGFzc3dvcmQtaG9uZXlwb3QnKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0ICRob25leXBvdCA9ICQoJzxpbnB1dCB0eXBlPVwicGFzc3dvcmRcIiBjbGFzcz1cInBhc3N3b3JkLWhvbmV5cG90XCIgbmFtZT1cImZha2VfcGFzc3dvcmRfZmllbGRcIiBzdHlsZT1cInBvc2l0aW9uOiBhYnNvbHV0ZTsgbGVmdDogLTk5OTlweDsgd2lkdGg6IDFweDsgaGVpZ2h0OiAxcHg7XCIgdGFiaW5kZXg9XCItMVwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIGF1dG9jb21wbGV0ZT1cIm9mZlwiPicpO1xuICAgICAgICAgICAgJGZpZWxkLmJlZm9yZSgkaG9uZXlwb3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJldmVudCBmb3JtIGZyb20gdHJpZ2dlcmluZyBwYXNzd29yZCBzYXZlIHByb21wdFxuICAgICAgICBpZiAoJGZvcm0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJGZvcm0uYXR0cignZGF0YS1scGlnbm9yZScsICd0cnVlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQmluZCBldmVudHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBiaW5kRXZlbnRzKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cvaGlkZSBidXR0b24gY2xpY2tcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZVBhc3N3b3JkVmlzaWJpbGl0eShpbnN0YW5jZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2VuZXJhdGUgYnV0dG9uIGNsaWNrXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5vZmYoJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVBhc3N3b3JkKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5IGZvciBjb3B5IGJ1dHRvblxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0biAmJiB0eXBlb2YgQ2xpcGJvYXJkSlMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIENsaXBib2FyZEpTIGZvciB0aGUgYnV0dG9uXG4gICAgICAgICAgICBpZiAoIWluc3RhbmNlLmNsaXBib2FyZCkge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUyhpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuWzBdKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwIGZvciBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc3VjY2Vzc2Z1bCBjb3B5XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgICAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmllbGQgaW5wdXQgZXZlbnRcbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGVPbklucHV0KSB7XG4gICAgICAgICAgICAkZmllbGQub2ZmKCdpbnB1dC5wYXNzd29yZFdpZGdldCBjaGFuZ2UucGFzc3dvcmRXaWRnZXQnKS5vbignaW5wdXQucGFzc3dvcmRXaWRnZXQgY2hhbmdlLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlSW5wdXQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFBhc3RlIGV2ZW50IC0gdHJpZ2dlciB2YWxpZGF0aW9uIGltbWVkaWF0ZWx5IGFmdGVyIHBhc3RlXG4gICAgICAgICAgICAkZmllbGQub2ZmKCdwYXN0ZS5wYXNzd29yZFdpZGdldCcpLm9uKCdwYXN0ZS5wYXNzd29yZFdpZGdldCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgZGVib3VuY2UgdGltZXIgZm9yIGltbWVkaWF0ZSBwYXN0ZSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudmFsaWRhdGlvblRpbWVyc1tpbnN0YW5jZS5maWVsZElkXSkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy52YWxpZGF0aW9uVGltZXJzW2luc3RhbmNlLmZpZWxkSWRdKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudmFsaWRhdGlvblRpbWVyc1tpbnN0YW5jZS5maWVsZElkXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBOZWVkIHRpbWVvdXQgYmVjYXVzZSBwYXN0ZSBjb250ZW50IGlzIG5vdCBpbW1lZGlhdGVseSBhdmFpbGFibGUgaW4gZmllbGQgdmFsdWVcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVQYXN0ZUlucHV0KGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNsaXBib2FyZCBidXR0b24gd2hlbiBwYXNzd29yZCBjaGFuZ2VzXG4gICAgICAgICRmaWVsZC5vbignaW5wdXQucGFzc3dvcmRXaWRnZXQgY2hhbmdlLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIHN0YXRlIG9uIGVtcHR5XG4gICAgICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhbGwgY2xpcGJvYXJkIGJ1dHRvbnMgKHdpZGdldCdzIGFuZCBhbnkgZXh0ZXJuYWwgb25lcylcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgdmFsdWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgcGFzdGUgZXZlbnQgZm9yIGNsaXBib2FyZCBidXR0b24gdXBkYXRlICh3aXRoIGRlbGF5KVxuICAgICAgICAkZmllbGQub24oJ3Bhc3RlLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBzdGF0ZSBvbiBlbXB0eVxuICAgICAgICAgICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGFsbCBjbGlwYm9hcmQgYnV0dG9ucyAod2lkZ2V0J3MgYW5kIGFueSBleHRlcm5hbCBvbmVzKVxuICAgICAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgdmFsdWUpO1xuICAgICAgICAgICAgfSwgMTApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvY3VzIGV2ZW50IC0gc2hvdyBwcm9ncmVzcyBiYXIgd2hlbiBmaWVsZCBpcyBmb2N1c2VkXG4gICAgICAgICRmaWVsZC5vZmYoJ2ZvY3VzLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2ZvY3VzLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIFNob3cgcHJvZ3Jlc3MgYmFyIGlmIHRoZXJlJ3MgYSBwYXNzd29yZCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgcGFzc3dvcmQgPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICBpZiAocGFzc3dvcmQgJiYgcGFzc3dvcmQgIT09ICcnICYmICF0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdmFsaWRhdGlvbiB0byB1cGRhdGUgcHJvZ3Jlc3MgYmFyIHdoZW4gZm9jdXNlZCAod2l0aG91dCBkZWJvdW5jZSBmb3IgaW5pdGlhbCBmb2N1cylcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0ZU9uSW5wdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJsdXIgZXZlbnQgLSBoaWRlIHByb2dyZXNzIGJhciB3aGVuIGZpZWxkIGxvc2VzIGZvY3VzIG9ubHkgaWYgbm8gd2FybmluZ3NcbiAgICAgICAgJGZpZWxkLm9mZignYmx1ci5wYXNzd29yZFdpZGdldCcpLm9uKCdibHVyLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkID0gZmFsc2U7XG4gICAgICAgICAgICAvLyBIaWRlIHByb2dyZXNzIGJhciBvbmx5IGlmIHRoZXJlIGFyZSBubyB2YWxpZGF0aW9uIHdhcm5pbmdzIHZpc2libGVcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uICYmXG4gICAgICAgICAgICAgICAgKCFpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MgfHwgaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzLmlzKCc6ZW1wdHknKSB8fCAhaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzLmlzKCc6dmlzaWJsZScpKSkge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTmV2ZXIgaGlkZSB3YXJuaW5ncyBvbiBibHVyIC0gdGhleSBzaG91bGQgcmVtYWluIHZpc2libGVcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBEaXNhYmxlIHdpZGdldFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGRpc2FibGUoaW5zdGFuY2UpIHtcbiAgICAgICAgaW5zdGFuY2UuJGZpZWxkLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5wcm9wKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbmNlLiRjb250YWluZXIuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFbmFibGUgd2lkZ2V0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgZW5hYmxlKGluc3RhbmNlKSB7XG4gICAgICAgIGluc3RhbmNlLiRmaWVsZC5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbmNlLiRjb250YWluZXIucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgcmVhZC1vbmx5IG1vZGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBzZXRSZWFkT25seShpbnN0YW5jZSkge1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgZm9ybSB2YWxpZGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgc2V0dXBGb3JtVmFsaWRhdGlvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBTa2lwIGlmIEZvcm0gb2JqZWN0IGlzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtID09PSAndW5kZWZpbmVkJyB8fCAhRm9ybS52YWxpZGF0ZVJ1bGVzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgJGZpZWxkLmF0dHIoJ2lkJyk7XG4gICAgICAgIGlmICghZmllbGROYW1lKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBjdXN0b20gcnVsZXMgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGlvblJ1bGVzKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXNbZmllbGROYW1lXSA9IG9wdGlvbnMudmFsaWRhdGlvblJ1bGVzO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBtb2RlXG4gICAgICAgIGNvbnN0IHJ1bGVzID0gW107XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbm9uLWVtcHR5IHJ1bGUgZm9yIGhhcmQgdmFsaWRhdGlvblxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0aW9uID09PSB0aGlzLlZBTElEQVRJT04uSEFSRCkge1xuICAgICAgICAgICAgcnVsZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wd19WYWxpZGF0ZVBhc3N3b3JkRW1wdHlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgc3RyZW5ndGggdmFsaWRhdGlvblxuICAgICAgICBpZiAob3B0aW9ucy5taW5TY29yZSA+IDAgJiYgb3B0aW9ucy52YWxpZGF0aW9uID09PSB0aGlzLlZBTElEQVRJT04uSEFSRCkge1xuICAgICAgICAgICAgcnVsZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3Bhc3N3b3JkU3RyZW5ndGgnLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnB3X1ZhbGlkYXRlUGFzc3dvcmRXZWFrXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHJ1bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlc1tmaWVsZE5hbWVdID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGZpZWxkTmFtZSxcbiAgICAgICAgICAgICAgICBydWxlczogcnVsZXNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBwYXNzd29yZCBzdHJlbmd0aFxuICAgICAgICBpZiAodHlwZW9mICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5wYXNzd29yZFN0cmVuZ3RoID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnBhc3N3b3JkU3RyZW5ndGggPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlLnN0YXRlLnNjb3JlID49IG9wdGlvbnMubWluU2NvcmU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBwYXNzd29yZCBpcyBtYXNrZWQgKHNlcnZlciByZXR1cm5zIHRoZXNlIHdoZW4gcGFzc3dvcmQgaXMgaGlkZGVuKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIGNoZWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgcGFzc3dvcmQgYXBwZWFycyB0byBiZSBtYXNrZWRcbiAgICAgKi9cbiAgICBpc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSB7XG4gICAgICAgIHJldHVybiAvXlt4WF17Nix9JHxeXFwqezYsfSR8XkhJRERFTiR8Xk1BU0tFRCQvaS50ZXN0KHBhc3N3b3JkKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbnB1dCBldmVudCB3aXRoIGRlYm91bmNpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBoYW5kbGVJbnB1dChpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0IHBhc3N3b3JkID0gJGZpZWxkLnZhbCgpO1xuXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBpZiBkaXNhYmxlZFxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0aW9uID09PSB0aGlzLlZBTElEQVRJT04uTk9ORSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGZvciBtYXNrZWQgcGFzc3dvcmRzXG4gICAgICAgIGlmICh0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgdGhpcyBpcyBhIGdlbmVyYXRlZCBwYXNzd29yZCAoYWxyZWFkeSB2YWxpZGF0ZWQgaW4gc2V0R2VuZXJhdGVkUGFzc3dvcmQpXG4gICAgICAgIGlmIChpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZCkge1xuICAgICAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNHZW5lcmF0ZWQgPSBmYWxzZTsgLy8gUmVzZXQgZmxhZyBmb3IgbmV4dCBpbnB1dFxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWx3YXlzIHZhbGlkYXRlIHBhc3N3b3JkIHdpdGggZGVib3VuY2UgKGRvbid0IHJlcXVpcmUgZm9jdXMpXG4gICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZFdpdGhEZWJvdW5jZShpbnN0YW5jZSwgcGFzc3dvcmQsIDUwMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBwYXN0ZSBpbnB1dCBldmVudCB3aXRob3V0IGRlYm91bmNpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBoYW5kbGVQYXN0ZUlucHV0KGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgcGFzc3dvcmQgPSAkZmllbGQudmFsKCk7XG5cbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGlmIGRpc2FibGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gZm9yIG1hc2tlZCBwYXNzd29yZHNcbiAgICAgICAgaWYgKHRoaXMuaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFZhbGlkYXRlIGltbWVkaWF0ZWx5IHdpdGhvdXQgZGVib3VuY2UgZm9yIHBhc3RlXG4gICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgcGFzc3dvcmQgd2l0aCBkZWJvdW5jaW5nIGZvciB0eXBpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB0byB2YWxpZGF0ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZWJvdW5jZVRpbWUgLSBEZWJvdW5jZSBkZWxheSBpbiBtaWxsaXNlY29uZHNcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVBhc3N3b3JkV2l0aERlYm91bmNlKGluc3RhbmNlLCBwYXNzd29yZCwgZGVib3VuY2VUaW1lID0gNTAwKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHRpbWVyXG4gICAgICAgIGlmICh0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0pIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdyBpbW1lZGlhdGUgbG9jYWwgZmVlZGJhY2sgd2hpbGUgd2FpdGluZyAoYWx3YXlzIHNob3cgcHJvZ3Jlc3MgYmFyIHdoZW4gdHlwaW5nKVxuICAgICAgICBpZiAocGFzc3dvcmQgJiYgcGFzc3dvcmQgIT09ICcnICYmICF0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICBjb25zdCBsb2NhbFNjb3JlID0gdGhpcy5zY29yZVBhc3N3b3JkTG9jYWwocGFzc3dvcmQpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzc0JhcihpbnN0YW5jZSwgbG9jYWxTY29yZSk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgcHJvZ3Jlc3Mgc2VjdGlvbiB3aGVuIHR5cGluZyAoZG9uJ3QgcmVxdWlyZSBmb2N1cyBmb3IgaW1tZWRpYXRlIGZlZWRiYWNrKVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZm9yIGVtcHR5IHBhc3N3b3JkXG4gICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdGltZXIgZm9yIGZ1bGwgdmFsaWRhdGlvbiAoaW5jbHVkaW5nIEFQSSBjYWxsIGFuZCB3YXJuaW5ncylcbiAgICAgICAgdGhpcy52YWxpZGF0aW9uVGltZXJzW2luc3RhbmNlLmZpZWxkSWRdID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBPbmx5IGRvIGZ1bGwgdmFsaWRhdGlvbiBpZiBmaWVsZCBzdGlsbCBoYXMgdGhlIHNhbWUgdmFsdWVcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS4kZmllbGQudmFsKCkgPT09IHBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGRlYm91bmNlVGltZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIHBhc3N3b3JkIGltbWVkaWF0ZWx5XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3N3b3JkIC0gUGFzc3dvcmQgdG8gdmFsaWRhdGVcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCkge1xuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuXG4gICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHdhcm5pbmdzIGF0IHRoZSBzdGFydCBvZiB2YWxpZGF0aW9uXG4gICAgICAgIHRoaXMuaGlkZVdhcm5pbmdzKGluc3RhbmNlKTtcblxuICAgICAgICAvLyBIYW5kbGUgZW1wdHkgcGFzc3dvcmRcbiAgICAgICAgaWYgKCFwYXNzd29yZCB8fCBwYXNzd29yZCA9PT0gJycpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBmb3IgbWFza2VkIHBhc3N3b3Jkc1xuICAgICAgICBpZiAodGhpcy5pc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdyBwcm9ncmVzcyBzZWN0aW9uIHdoZW4gdmFsaWRhdGluZ1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93IGltbWVkaWF0ZSBsb2NhbCBmZWVkYmFja1xuICAgICAgICBjb25zdCBsb2NhbFNjb3JlID0gdGhpcy5zY29yZVBhc3N3b3JkTG9jYWwocGFzc3dvcmQpO1xuICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzQmFyKGluc3RhbmNlLCBsb2NhbFNjb3JlKTtcblxuICAgICAgICAvLyBVc2UgQVBJIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIFBhc3N3b3Jkc0FQSSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIFBhc3N3b3Jkc0FQSS52YWxpZGF0ZVBhc3N3b3JkKHBhc3N3b3JkLCBpbnN0YW5jZS5maWVsZElkLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVZhbGlkYXRpb25SZXN1bHQoaW5zdGFuY2UsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBVc2UgbG9jYWwgdmFsaWRhdGlvblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgIHNjb3JlOiBsb2NhbFNjb3JlLFxuICAgICAgICAgICAgICAgIGlzVmFsaWQ6IGxvY2FsU2NvcmUgPj0gb3B0aW9ucy5taW5TY29yZSxcbiAgICAgICAgICAgICAgICBzdHJlbmd0aDogdGhpcy5nZXRTdHJlbmd0aExhYmVsKGxvY2FsU2NvcmUpLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiBbXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIHBhc3N3b3JkIHNjb3JlIGxvY2FsbHlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB0byBzY29yZVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFNjb3JlIGZyb20gMC0xMDBcbiAgICAgKi9cbiAgICBzY29yZVBhc3N3b3JkTG9jYWwocGFzc3dvcmQpIHtcbiAgICAgICAgbGV0IHNjb3JlID0gMDtcbiAgICAgICAgaWYgKCFwYXNzd29yZCB8fCBwYXNzd29yZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBzY29yZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gcGFzc3dvcmQubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgLy8gTGVuZ3RoIHNjb3JpbmcgKHVwIHRvIDMwIHBvaW50cylcbiAgICAgICAgaWYgKGxlbmd0aCA+PSAxNikge1xuICAgICAgICAgICAgc2NvcmUgKz0gMzA7XG4gICAgICAgIH0gZWxzZSBpZiAobGVuZ3RoID49IDEyKSB7XG4gICAgICAgICAgICBzY29yZSArPSAyMDtcbiAgICAgICAgfSBlbHNlIGlmIChsZW5ndGggPj0gOCkge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTA7XG4gICAgICAgIH0gZWxzZSBpZiAobGVuZ3RoID49IDYpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoYXJhY3RlciBkaXZlcnNpdHkgKHVwIHRvIDQwIHBvaW50cylcbiAgICAgICAgaWYgKC9bYS16XS8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAvLyBMb3dlcmNhc2VcbiAgICAgICAgaWYgKC9bQS1aXS8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAvLyBVcHBlcmNhc2VcbiAgICAgICAgaWYgKC9cXGQvLnRlc3QocGFzc3dvcmQpKSBzY29yZSArPSAxMDsgICAgIC8vIERpZ2l0c1xuICAgICAgICBpZiAoL1xcVy8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAgICAgLy8gU3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICAgIFxuICAgICAgICAvLyBQYXR0ZXJuIGNvbXBsZXhpdHkgKHVwIHRvIDMwIHBvaW50cylcbiAgICAgICAgY29uc3QgdW5pcXVlQ2hhcnMgPSBuZXcgU2V0KHBhc3N3b3JkKS5zaXplO1xuICAgICAgICBjb25zdCB1bmlxdWVSYXRpbyA9IHVuaXF1ZUNoYXJzIC8gbGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgaWYgKHVuaXF1ZVJhdGlvID4gMC43KSB7XG4gICAgICAgICAgICBzY29yZSArPSAyMDtcbiAgICAgICAgfSBlbHNlIGlmICh1bmlxdWVSYXRpbyA+IDAuNSkge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTU7XG4gICAgICAgIH0gZWxzZSBpZiAodW5pcXVlUmF0aW8gPiAwLjMpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDEwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2NvcmUgKz0gNTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUGVuYWx0aWVzIGZvciBjb21tb24gcGF0dGVybnNcbiAgICAgICAgaWYgKC8oLilcXDF7Mix9Ly50ZXN0KHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgc2NvcmUgLT0gMTA7IC8vIFJlcGVhdGluZyBjaGFyYWN0ZXJzXG4gICAgICAgIH1cbiAgICAgICAgaWYgKC8oMDEyfDEyM3wyMzR8MzQ1fDQ1Nnw1Njd8Njc4fDc4OXw4OTB8YWJjfGJjZHxjZGV8ZGVmKS9pLnRlc3QocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICBzY29yZSAtPSAxMDsgLy8gU2VxdWVudGlhbCBwYXR0ZXJuc1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCBzY29yZSkpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0cmVuZ3RoIGxhYmVsIGZvciBzY29yZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29yZSAtIFBhc3N3b3JkIHNjb3JlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gU3RyZW5ndGggbGFiZWxcbiAgICAgKi9cbiAgICBnZXRTdHJlbmd0aExhYmVsKHNjb3JlKSB7XG4gICAgICAgIGlmIChzY29yZSA8IDIwKSByZXR1cm4gJ3Zlcnlfd2Vhayc7XG4gICAgICAgIGlmIChzY29yZSA8IDQwKSByZXR1cm4gJ3dlYWsnO1xuICAgICAgICBpZiAoc2NvcmUgPCA2MCkgcmV0dXJuICdmYWlyJztcbiAgICAgICAgaWYgKHNjb3JlIDwgODApIHJldHVybiAnZ29vZCc7XG4gICAgICAgIHJldHVybiAnc3Ryb25nJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwcm9ncmVzcyBiYXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcmUgLSBQYXNzd29yZCBzY29yZVxuICAgICAqL1xuICAgIHVwZGF0ZVByb2dyZXNzQmFyKGluc3RhbmNlLCBzY29yZSkge1xuICAgICAgICBjb25zdCB7IGVsZW1lbnRzIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIGlmICghZWxlbWVudHMuJHByb2dyZXNzQmFyIHx8IGVsZW1lbnRzLiRwcm9ncmVzc0Jhci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzXG4gICAgICAgIGVsZW1lbnRzLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG4gICAgICAgICAgICBwZXJjZW50OiBNYXRoLm1pbihzY29yZSwgMTAwKSxcbiAgICAgICAgICAgIHNob3dBY3Rpdml0eTogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNvbG9yXG4gICAgICAgIGVsZW1lbnRzLiRwcm9ncmVzc0JhclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdyZWQgb3JhbmdlIHllbGxvdyBvbGl2ZSBncmVlbicpXG4gICAgICAgICAgICAuYWRkQ2xhc3ModGhpcy5nZXRDb2xvckZvclNjb3JlKHNjb3JlKSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY29sb3IgY2xhc3MgZm9yIHNjb3JlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3JlIC0gUGFzc3dvcmQgc2NvcmVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDb2xvciBjbGFzcyBuYW1lXG4gICAgICovXG4gICAgZ2V0Q29sb3JGb3JTY29yZShzY29yZSkge1xuICAgICAgICBpZiAoc2NvcmUgPCAyMCkgcmV0dXJuICdyZWQnO1xuICAgICAgICBpZiAoc2NvcmUgPCA0MCkgcmV0dXJuICdvcmFuZ2UnO1xuICAgICAgICBpZiAoc2NvcmUgPCA2MCkgcmV0dXJuICd5ZWxsb3cnO1xuICAgICAgICBpZiAoc2NvcmUgPCA4MCkgcmV0dXJuICdvbGl2ZSc7XG4gICAgICAgIHJldHVybiAnZ3JlZW4nO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHZhbGlkYXRpb24gcmVzdWx0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCAtIFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICovXG4gICAgaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgcmVzdWx0KSB7XG4gICAgICAgIGlmICghcmVzdWx0KSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgeyBvcHRpb25zIH0gPSBpbnN0YW5jZTtcblxuICAgICAgICAvLyBBbHdheXMgY2xlYXIgd2FybmluZ3MgZmlyc3QgdG8gZW5zdXJlIGNsZWFuIHN0YXRlXG4gICAgICAgIHRoaXMuaGlkZVdhcm5pbmdzKGluc3RhbmNlKTtcblxuICAgICAgICAvLyBVcGRhdGUgc3RhdGVcbiAgICAgICAgaW5zdGFuY2Uuc3RhdGUgPSB7XG4gICAgICAgICAgICBpc1ZhbGlkOiByZXN1bHQuaXNWYWxpZCB8fCByZXN1bHQuc2NvcmUgPj0gb3B0aW9ucy5taW5TY29yZSxcbiAgICAgICAgICAgIHNjb3JlOiByZXN1bHQuc2NvcmUsXG4gICAgICAgICAgICBzdHJlbmd0aDogcmVzdWx0LnN0cmVuZ3RoIHx8IHRoaXMuZ2V0U3RyZW5ndGhMYWJlbChyZXN1bHQuc2NvcmUpLFxuICAgICAgICAgICAgbWVzc2FnZXM6IHJlc3VsdC5tZXNzYWdlcyB8fCBbXSxcbiAgICAgICAgICAgIGlzR2VuZXJhdGVkOiBpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFVwZGF0ZSBVSVxuICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzQmFyKGluc3RhbmNlLCByZXN1bHQuc2NvcmUpO1xuXG4gICAgICAgIC8vIFNob3cgd2FybmluZ3MvZXJyb3JzIG9ubHkgaWYgdGhlcmUgYXJlIG1lc3NhZ2VzIEFORCBwYXNzd29yZCBpcyBub3Qgc3Ryb25nIGVub3VnaFxuICAgICAgICBpZiAob3B0aW9ucy5zaG93V2FybmluZ3MgJiYgcmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5sZW5ndGggPiAwICYmICFpbnN0YW5jZS5zdGF0ZS5pc1ZhbGlkKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlVHlwZSA9IGluc3RhbmNlLnN0YXRlLmlzVmFsaWQgPyAnd2FybmluZycgOiAnZXJyb3InO1xuICAgICAgICAgICAgdGhpcy5zaG93V2FybmluZ3MoaW5zdGFuY2UsIHJlc3VsdCwgbWVzc2FnZVR5cGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FsbCB2YWxpZGF0aW9uIGNhbGxiYWNrXG4gICAgICAgIGlmIChvcHRpb25zLm9uVmFsaWRhdGUpIHtcbiAgICAgICAgICAgIG9wdGlvbnMub25WYWxpZGF0ZShpbnN0YW5jZS5zdGF0ZS5pc1ZhbGlkLCByZXN1bHQuc2NvcmUsIHJlc3VsdC5tZXNzYWdlcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZm9ybSB2YWxpZGF0aW9uIHN0YXRlXG4gICAgICAgIGlmIChGb3JtICYmIEZvcm0uJGZvcm1PYmopIHtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGluc3RhbmNlLiRmaWVsZC5hdHRyKCduYW1lJykgfHwgaW5zdGFuY2UuJGZpZWxkLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoIWluc3RhbmNlLnN0YXRlLmlzVmFsaWQgJiYgb3B0aW9ucy52YWxpZGF0aW9uID09PSB0aGlzLlZBTElEQVRJT04uSEFSRCkge1xuICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnYWRkIHByb21wdCcsIGZpZWxkTmFtZSwgcmVzdWx0Lm1lc3NhZ2VzWzBdIHx8ICdJbnZhbGlkIHBhc3N3b3JkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsIGZpZWxkTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIHBhc3N3b3JkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgZ2VuZXJhdGVQYXNzd29yZChpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdlbmVyYXRlIHBhc3N3b3JkXG4gICAgICAgIGNvbnN0IGdlbmVyYXRlQ2FsbGJhY2sgPSAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwYXNzd29yZCA9IHR5cGVvZiByZXN1bHQgPT09ICdzdHJpbmcnID8gcmVzdWx0IDogcmVzdWx0LnBhc3N3b3JkO1xuXG4gICAgICAgICAgICAvLyBTZXQgcGFzc3dvcmRcbiAgICAgICAgICAgIHRoaXMuc2V0R2VuZXJhdGVkUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2FsbCBjYWxsYmFja1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMub25HZW5lcmF0ZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMub25HZW5lcmF0ZShwYXNzd29yZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXNlIEFQSSBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBQYXNzd29yZHNBUEkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBQYXNzd29yZHNBUEkuZ2VuZXJhdGVQYXNzd29yZChvcHRpb25zLmdlbmVyYXRlTGVuZ3RoLCBnZW5lcmF0ZUNhbGxiYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNpbXBsZSBsb2NhbCBnZW5lcmF0b3Igd2l0aCBjb25maWd1cmFibGUgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICBsZXQgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODknO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuaW5jbHVkZVNwZWNpYWwpIHtcbiAgICAgICAgICAgICAgICBjaGFycyArPSAnIUAjJCVeJionO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IHBhc3N3b3JkID0gJyc7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9wdGlvbnMuZ2VuZXJhdGVMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHBhc3N3b3JkICs9IGNoYXJzLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFycy5sZW5ndGgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGdlbmVyYXRlQ2FsbGJhY2socGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgZ2VuZXJhdGVkIHBhc3N3b3JkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3N3b3JkIC0gR2VuZXJhdGVkIHBhc3N3b3JkXG4gICAgICovXG4gICAgc2V0R2VuZXJhdGVkUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCAkY29udGFpbmVyLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBnZW5lcmF0ZWQgZmxhZyBmaXJzdCB0byBwcmV2ZW50IGR1cGxpY2F0ZSB2YWxpZGF0aW9uXG4gICAgICAgIGluc3RhbmNlLnN0YXRlLmlzR2VuZXJhdGVkID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB2YWx1ZSB3aXRob3V0IHRyaWdnZXJpbmcgY2hhbmdlIGV2ZW50IHlldFxuICAgICAgICAkZmllbGQudmFsKHBhc3N3b3JkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY2xpcGJvYXJkIGJ1dHRvbnMgKHdpZGdldCdzIGFuZCBhbnkgZXh0ZXJuYWwgb25lcylcbiAgICAgICAgJCgnLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCBwYXNzd29yZCk7XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGF0ZSBvbmNlIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0aW9uICE9PSB0aGlzLlZBTElEQVRJT04uTk9ORSkge1xuICAgICAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5vdyB0cmlnZ2VyIGNoYW5nZSBmb3IgZm9ybSB0cmFja2luZyAodmFsaWRhdGlvbiBhbHJlYWR5IGRvbmUgYWJvdmUpXG4gICAgICAgICRmaWVsZC50cmlnZ2VyKCdjaGFuZ2UnKVxuICAgICAgICBcbiAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZVxuICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uZGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyB3YXJuaW5nc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXN1bHQgLSBWYWxpZGF0aW9uIHJlc3VsdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gTWVzc2FnZSB0eXBlICh3YXJuaW5nL2Vycm9yKVxuICAgICAqL1xuICAgIHNob3dXYXJuaW5ncyhpbnN0YW5jZSwgcmVzdWx0LCB0eXBlID0gJ3dhcm5pbmcnKSB7XG4gICAgICAgIGlmICghaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCB7IGVsZW1lbnRzIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgY29sb3JDbGFzcyA9IHR5cGUgPT09ICdlcnJvcicgPyAncmVkJyA6ICdvcmFuZ2UnO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3Rpbmcgd2FybmluZ3NcbiAgICAgICAgZWxlbWVudHMuJHdhcm5pbmdzLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgd2FybmluZ3MgYXMgcG9pbnRpbmcgbGFiZWxcbiAgICAgICAgaWYgKHJlc3VsdC5tZXNzYWdlcyAmJiByZXN1bHQubWVzc2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQ2hvb3NlIGljb24gYmFzZWQgb24gbWVzc2FnZSB0eXBlXG4gICAgICAgICAgICBjb25zdCBpY29uQ2xhc3MgPSB0eXBlID09PSAnZXJyb3InID8gJ2V4Y2xhbWF0aW9uIGNpcmNsZScgOiAnZXhjbGFtYXRpb24gdHJpYW5nbGUnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgbGlzdCBpdGVtcyBmcm9tIG1lc3NhZ2VzIHdpdGggaWNvbnNcbiAgICAgICAgICAgIGNvbnN0IGxpc3RJdGVtcyA9IHJlc3VsdC5tZXNzYWdlcy5tYXAobXNnID0+IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIiR7aWNvbkNsYXNzfSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPiR7bXNnfTwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCkuam9pbignJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSBwb2ludGluZyBhYm92ZSBsYWJlbCB3aXRoIGxpc3QgKHBvaW50cyB0byBwYXNzd29yZCBmaWVsZClcbiAgICAgICAgICAgIGNvbnN0ICRsYWJlbCA9ICQoYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBwb2ludGluZyAke2NvbG9yQ2xhc3N9IGJhc2ljIGxhYmVsXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBsaXN0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2xpc3RJdGVtc31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZWxlbWVudHMuJHdhcm5pbmdzLmFwcGVuZCgkbGFiZWwpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSB3YXJuaW5nc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGhpZGVXYXJuaW5ncyhpbnN0YW5jZSkge1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MuZW1wdHkoKS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBwYXNzd29yZCB2aXNpYmlsaXR5XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgdG9nZ2xlUGFzc3dvcmRWaXNpYmlsaXR5KGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJHNob3dIaWRlQnRuID0gaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkc2hvd0hpZGVCdG4pIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRpY29uID0gJHNob3dIaWRlQnRuLmZpbmQoJ2knKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAncGFzc3dvcmQnKSB7XG4gICAgICAgICAgICAvLyBTaG93IHBhc3N3b3JkXG4gICAgICAgICAgICAkZmllbGQuYXR0cigndHlwZScsICd0ZXh0Jyk7XG4gICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllJykuYWRkQ2xhc3MoJ2V5ZSBzbGFzaCcpO1xuICAgICAgICAgICAgJHNob3dIaWRlQnRuLmF0dHIoJ2RhdGEtY29udGVudCcsIGdsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwSGlkZVBhc3N3b3JkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgcGFzc3dvcmRcbiAgICAgICAgICAgICRmaWVsZC5hdHRyKCd0eXBlJywgJ3Bhc3N3b3JkJyk7XG4gICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllIHNsYXNoJykuYWRkQ2xhc3MoJ2V5ZScpO1xuICAgICAgICAgICAgJHNob3dIaWRlQnRuLmF0dHIoJ2RhdGEtY29udGVudCcsIGdsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwU2hvd1Bhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgdmFsaWRhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSkge1xuICAgICAgICAvLyBDbGVhciB3YXJuaW5ncyB3aGVuIGV4cGxpY2l0bHkgY2xlYXJpbmcgdmFsaWRhdGlvbiAoZW1wdHkgcGFzc3dvcmQpXG4gICAgICAgIHRoaXMuaGlkZVdhcm5pbmdzKGluc3RhbmNlKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NCYXIpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7IHBlcmNlbnQ6IDAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFuY2Uuc3RhdGUgPSB7XG4gICAgICAgICAgICBpc1ZhbGlkOiB0cnVlLFxuICAgICAgICAgICAgc2NvcmU6IDAsXG4gICAgICAgICAgICBzdHJlbmd0aDogJycsXG4gICAgICAgICAgICBtZXNzYWdlczogW10sXG4gICAgICAgICAgICBpc0dlbmVyYXRlZDogZmFsc2UsXG4gICAgICAgICAgICBpc0ZvY3VzZWQ6IGluc3RhbmNlLnN0YXRlLmlzRm9jdXNlZCB8fCBmYWxzZVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgcGFzc3dvcmQgKG1hbnVhbCB2YWxpZGF0aW9uKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGNoZWNrUGFzc3dvcmQoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgcGFzc3dvcmQgPSBpbnN0YW5jZS4kZmllbGQudmFsKCk7XG4gICAgICAgIGlmIChwYXNzd29yZCAmJiBwYXNzd29yZCAhPT0gJycpIHtcbiAgICAgICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBmb3IgbWFza2VkIHBhc3N3b3Jkc1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRm9yIGluaXRpYWwgY2hlY2ssIGRvbid0IHNob3cgcHJvZ3Jlc3MgYmFyIGJ1dCBkbyB2YWxpZGF0ZSBhbmQgc2hvdyB3YXJuaW5nc1xuICAgICAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBjb25maWd1cmF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBpbnN0YW5jZU9yRmllbGRJZCAtIEluc3RhbmNlIG9yIGZpZWxkIElEXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5ld09wdGlvbnMgLSBOZXcgb3B0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZUNvbmZpZyhpbnN0YW5jZU9yRmllbGRJZCwgbmV3T3B0aW9ucykge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHR5cGVvZiBpbnN0YW5jZU9yRmllbGRJZCA9PT0gJ3N0cmluZycgXG4gICAgICAgICAgICA/IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZU9yRmllbGRJZClcbiAgICAgICAgICAgIDogaW5zdGFuY2VPckZpZWxkSWQ7XG4gICAgICAgICAgICBcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgb3B0aW9uc1xuICAgICAgICBpbnN0YW5jZS5vcHRpb25zID0geyAuLi5pbnN0YW5jZS5vcHRpb25zLCAuLi5uZXdPcHRpb25zIH07XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZHluYW1pYyBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICBpZiAoJ3Nob3dQYXNzd29yZEJ1dHRvbicgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuc2hvd1Bhc3N3b3JkQnV0dG9uICYmICFpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgYnV0dG9uIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFNob3dIaWRlQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAvLyBSZS1iaW5kIGV2ZW50cyBmb3IgdGhlIG5ldyBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bi5vZmYoJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlUGFzc3dvcmRWaXNpYmlsaXR5KGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICghbmV3T3B0aW9ucy5zaG93UGFzc3dvcmRCdXR0b24gJiYgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGJ1dHRvbiBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGdlbmVyYXRlIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnZ2VuZXJhdGVCdXR0b24nIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLmdlbmVyYXRlQnV0dG9uICYmICFpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgYnV0dG9uIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEdlbmVyYXRlQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAvLyBSZS1iaW5kIGV2ZW50cyBmb3IgdGhlIG5ldyBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5vZmYoJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVQYXNzd29yZChpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW5ld09wdGlvbnMuZ2VuZXJhdGVCdXR0b24gJiYgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGJ1dHRvbiBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNsaXBib2FyZCBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICBpZiAoJ2NsaXBib2FyZEJ1dHRvbicgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuY2xpcGJvYXJkQnV0dG9uICYmICFpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGJ1dHRvbiBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRDbGlwYm9hcmRCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2xpcGJvYXJkIGZvciB0aGUgbmV3IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuICYmIHR5cGVvZiBDbGlwYm9hcmRKUyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBDbGlwYm9hcmRKUyBmb3IgdGhlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUyhpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgZm9yIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHN1Y2Nlc3NmdWwgY29weVxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFuZXdPcHRpb25zLmNsaXBib2FyZEJ1dHRvbiAmJiBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGJ1dHRvbiBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBpbnN0YW5jZS5jbGlwYm9hcmQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBzdHJlbmd0aCBiYXIgdmlzaWJpbGl0eVxuICAgICAgICBpZiAoJ3Nob3dTdHJlbmd0aEJhcicgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuc2hvd1N0cmVuZ3RoQmFyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93U3RyZW5ndGhCYXIoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVTdHJlbmd0aEJhcihpbnN0YW5jZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSB3YXJuaW5ncyB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnc2hvd1dhcm5pbmdzJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5zaG93V2FybmluZ3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dXYXJuaW5ncyhpbnN0YW5jZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVdhcm5pbmdzKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGlucHV0IHdyYXBwZXIgYWN0aW9uIGNsYXNzIGJhc2VkIG9uIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIHRoaXMudXBkYXRlSW5wdXRXcmFwcGVyQ2xhc3MoaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtc2V0dXAgZm9ybSB2YWxpZGF0aW9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAoaW5zdGFuY2Uub3B0aW9ucy52YWxpZGF0aW9uICE9PSB0aGlzLlZBTElEQVRJT04uTk9ORSkge1xuICAgICAgICAgICAgdGhpcy5zZXR1cEZvcm1WYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgY3VycmVudCB2YWx1ZSBpZiB2YWxpZGF0aW9uIGNoYW5nZWRcbiAgICAgICAgaWYgKCd2YWxpZGF0aW9uJyBpbiBuZXdPcHRpb25zICYmIGluc3RhbmNlLiRmaWVsZC52YWwoKSkge1xuICAgICAgICAgICAgdGhpcy5jaGVja1Bhc3N3b3JkKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGlucHV0IHdyYXBwZXIgYWN0aW9uIGNsYXNzIGJhc2VkIG9uIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgdXBkYXRlSW5wdXRXcmFwcGVyQ2xhc3MoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgJGlucHV0V3JhcHBlciA9IGluc3RhbmNlLiRmaWVsZC5jbG9zZXN0KCcudWkuaW5wdXQnKTtcbiAgICAgICAgY29uc3QgaGFzQnV0dG9ucyA9ICEhKFxuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuIHx8IFxuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuIHx8IFxuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0blxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhhc0J1dHRvbnMpIHtcbiAgICAgICAgICAgICRpbnB1dFdyYXBwZXIuYWRkQ2xhc3MoJ2FjdGlvbicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGlucHV0V3JhcHBlci5yZW1vdmVDbGFzcygnYWN0aW9uJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCB3aWRnZXQgc3RhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGluc3RhbmNlT3JGaWVsZElkIC0gSW5zdGFuY2Ugb3IgZmllbGQgSURcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fG51bGx9IFdpZGdldCBzdGF0ZVxuICAgICAqL1xuICAgIGdldFN0YXRlKGluc3RhbmNlT3JGaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICByZXR1cm4gaW5zdGFuY2UgPyBpbnN0YW5jZS5zdGF0ZSA6IG51bGw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHN0cmVuZ3RoIGJhclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gaW5zdGFuY2VPckZpZWxkSWQgLSBJbnN0YW5jZSBvciBmaWVsZCBJRFxuICAgICAqL1xuICAgIHNob3dTdHJlbmd0aEJhcihpbnN0YW5jZU9yRmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHR5cGVvZiBpbnN0YW5jZU9yRmllbGRJZCA9PT0gJ3N0cmluZycgXG4gICAgICAgICAgICA/IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZU9yRmllbGRJZClcbiAgICAgICAgICAgIDogaW5zdGFuY2VPckZpZWxkSWQ7XG4gICAgICAgICAgICBcbiAgICAgICAgaWYgKGluc3RhbmNlICYmIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHN0cmVuZ3RoIGJhclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gaW5zdGFuY2VPckZpZWxkSWQgLSBJbnN0YW5jZSBvciBmaWVsZCBJRFxuICAgICAqL1xuICAgIGhpZGVTdHJlbmd0aEJhcihpbnN0YW5jZU9yRmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHR5cGVvZiBpbnN0YW5jZU9yRmllbGRJZCA9PT0gJ3N0cmluZycgXG4gICAgICAgICAgICA/IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZU9yRmllbGRJZClcbiAgICAgICAgICAgIDogaW5zdGFuY2VPckZpZWxkSWQ7XG4gICAgICAgICAgICBcbiAgICAgICAgaWYgKGluc3RhbmNlICYmIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IHdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICBkZXN0cm95KGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIFVuYmluZCBldmVudHNcbiAgICAgICAgaW5zdGFuY2UuJGZpZWxkLm9mZignLnBhc3N3b3JkV2lkZ2V0Jyk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5vZmYoJy5wYXNzd29yZFdpZGdldCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bi5vZmYoJy5wYXNzd29yZFdpZGdldCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IGNsaXBib2FyZCBpbnN0YW5jZVxuICAgICAgICBpZiAoaW5zdGFuY2UuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmNsaXBib2FyZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgdGltZXJcbiAgICAgICAgaWYgKHRoaXMudmFsaWRhdGlvblRpbWVyc1tmaWVsZElkXSkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudmFsaWRhdGlvblRpbWVyc1tmaWVsZElkXSk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy52YWxpZGF0aW9uVGltZXJzW2ZpZWxkSWRdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZGVsZXRlKGZpZWxkSWQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBhbGwgaW5zdGFuY2VzXG4gICAgICovXG4gICAgZGVzdHJveUFsbCgpIHtcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UsIGZpZWxkSWQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveShmaWVsZElkKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTsiXX0=