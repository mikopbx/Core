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
      if (!instance.clipboard) {
        instance.clipboard = new ClipboardJS(instance.elements.$clipboardBtn[0]); // Handle successful copy - show temporary success message

        instance.clipboard.on('success', function (e) {
          var originalContent = instance.elements.$clipboardBtn.attr('data-content');
          instance.elements.$clipboardBtn.attr('data-content', globalTranslate.bt_ToolTipPasswordCopied || 'Скопировано!');
          instance.elements.$clipboardBtn.popup('show');
          setTimeout(function () {
            instance.elements.$clipboardBtn.popup('hide');
            instance.elements.$clipboardBtn.attr('data-content', originalContent);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvcGFzc3dvcmQtd2lkZ2V0LmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkV2lkZ2V0IiwiaW5zdGFuY2VzIiwiTWFwIiwiVkFMSURBVElPTiIsIkhBUkQiLCJTT0ZUIiwiTk9ORSIsInZhbGlkYXRpb25UaW1lcnMiLCJkZWZhdWx0cyIsInZhbGlkYXRpb24iLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJpbmNsdWRlU3BlY2lhbCIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwib25WYWxpZGF0ZSIsIm9uR2VuZXJhdGUiLCJ2YWxpZGF0aW9uUnVsZXMiLCJpbml0Iiwic2VsZWN0b3IiLCJvcHRpb25zIiwiJGZpZWxkIiwiJCIsImxlbmd0aCIsImZpZWxkSWQiLCJhdHRyIiwiTWF0aCIsInJhbmRvbSIsInRvU3RyaW5nIiwic3Vic3RyIiwiaGFzIiwiZGVzdHJveSIsImluc3RhbmNlIiwiJGNvbnRhaW5lciIsImNsb3Nlc3QiLCJlbGVtZW50cyIsInN0YXRlIiwiaXNWYWxpZCIsInNjb3JlIiwic3RyZW5ndGgiLCJtZXNzYWdlcyIsImlzR2VuZXJhdGVkIiwiaXNGb2N1c2VkIiwic2V0Iiwic2V0dXBVSSIsImJpbmRFdmVudHMiLCJzZXR1cEZvcm1WYWxpZGF0aW9uIiwidmFsIiwiY2hlY2tQYXNzd29yZCIsIiRpbnB1dFdyYXBwZXIiLCJ3cmFwIiwicGFyZW50IiwiZGlzYWJsZVBhc3N3b3JkTWFuYWdlcnMiLCJhZGRTaG93SGlkZUJ1dHRvbiIsImFkZEdlbmVyYXRlQnV0dG9uIiwiYWRkQ2xpcGJvYXJkQnV0dG9uIiwiYWRkU3RyZW5ndGhCYXIiLCJhZGRXYXJuaW5nc0NvbnRhaW5lciIsInVwZGF0ZUlucHV0V3JhcHBlckNsYXNzIiwiZmluZCIsIiRzaG93SGlkZUJ0biIsImdsb2JhbFRyYW5zbGF0ZSIsImJ0X1Rvb2xUaXBTaG93UGFzc3dvcmQiLCJhcHBlbmQiLCIkZ2VuZXJhdGVCdG4iLCJidF9Ub29sVGlwR2VuZXJhdGVQYXNzd29yZCIsIiRjbGlwYm9hcmRCdG4iLCJjdXJyZW50VmFsdWUiLCJidF9Ub29sVGlwQ29weVBhc3N3b3JkIiwiJHByb2dyZXNzQmFyIiwiJHByb2dyZXNzU2VjdGlvbiIsIiR3YXJuaW5ncyIsIiRmb3JtIiwib24iLCJyZW1vdmVBdHRyIiwicHJldiIsIiRob25leXBvdCIsImJlZm9yZSIsIm9mZiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRvZ2dsZVBhc3N3b3JkVmlzaWJpbGl0eSIsImdlbmVyYXRlUGFzc3dvcmQiLCJDbGlwYm9hcmRKUyIsImNsaXBib2FyZCIsIm9yaWdpbmFsQ29udGVudCIsImJ0X1Rvb2xUaXBQYXNzd29yZENvcGllZCIsInBvcHVwIiwic2V0VGltZW91dCIsImNsZWFyU2VsZWN0aW9uIiwiaGFuZGxlSW5wdXQiLCJjbGVhclRpbWVvdXQiLCJoYW5kbGVQYXN0ZUlucHV0IiwidmFsdWUiLCJjbGVhclZhbGlkYXRpb24iLCJwYXNzd29yZCIsImlzTWFza2VkUGFzc3dvcmQiLCJzaG93IiwidmFsaWRhdGVQYXNzd29yZCIsImlzIiwiaGlkZSIsImRpc2FibGUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJlbmFibGUiLCJyZW1vdmVDbGFzcyIsInNldFJlYWRPbmx5IiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJmaWVsZE5hbWUiLCJydWxlcyIsInB1c2giLCJ0eXBlIiwicHJvbXB0IiwicHdfVmFsaWRhdGVQYXNzd29yZEVtcHR5IiwicHdfVmFsaWRhdGVQYXNzd29yZFdlYWsiLCJpZGVudGlmaWVyIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJwYXNzd29yZFN0cmVuZ3RoIiwidGVzdCIsInZhbGlkYXRlUGFzc3dvcmRXaXRoRGVib3VuY2UiLCJkZWJvdW5jZVRpbWUiLCJsb2NhbFNjb3JlIiwic2NvcmVQYXNzd29yZExvY2FsIiwidXBkYXRlUHJvZ3Jlc3NCYXIiLCJoaWRlV2FybmluZ3MiLCJQYXNzd29yZHNBUEkiLCJyZXN1bHQiLCJoYW5kbGVWYWxpZGF0aW9uUmVzdWx0IiwiZ2V0U3RyZW5ndGhMYWJlbCIsInVuaXF1ZUNoYXJzIiwiU2V0Iiwic2l6ZSIsInVuaXF1ZVJhdGlvIiwibWF4IiwibWluIiwicHJvZ3Jlc3MiLCJwZXJjZW50Iiwic2hvd0FjdGl2aXR5IiwiZ2V0Q29sb3JGb3JTY29yZSIsIm1lc3NhZ2VUeXBlIiwiJGZvcm1PYmoiLCJnZW5lcmF0ZUNhbGxiYWNrIiwic2V0R2VuZXJhdGVkUGFzc3dvcmQiLCJjaGFycyIsImkiLCJjaGFyQXQiLCJmbG9vciIsInRyaWdnZXIiLCJkYXRhQ2hhbmdlZCIsImNvbG9yQ2xhc3MiLCJlbXB0eSIsImljb25DbGFzcyIsImxpc3RJdGVtcyIsIm1hcCIsIm1zZyIsImpvaW4iLCIkbGFiZWwiLCIkaWNvbiIsImJ0X1Rvb2xUaXBIaWRlUGFzc3dvcmQiLCJ1cGRhdGVDb25maWciLCJpbnN0YW5jZU9yRmllbGRJZCIsIm5ld09wdGlvbnMiLCJnZXQiLCJyZW1vdmUiLCJoaWRlU3RyZW5ndGhCYXIiLCJoYXNCdXR0b25zIiwiZ2V0U3RhdGUiLCJkZXN0cm95QWxsIiwiZm9yRWFjaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxjQUFjLEdBQUc7QUFFbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQUFJQyxHQUFKLEVBTFE7O0FBUW5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFB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dENrQjs7QUEydENuQjtBQUNKO0FBQ0E7QUFDSWtKLEVBQUFBLFVBOXRDbUIsd0JBOHRDTjtBQUFBOztBQUNULFNBQUs5SyxTQUFMLENBQWUrSyxPQUFmLENBQXVCLFVBQUMzSSxRQUFELEVBQVdSLE9BQVgsRUFBdUI7QUFDMUMsTUFBQSxNQUFJLENBQUNPLE9BQUwsQ0FBYVAsT0FBYjtBQUNILEtBRkQ7QUFHSDtBQWx1Q2tCLENBQXZCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGFzc3dvcmRzQVBJLCBGb3JtLCBDbGlwYm9hcmRKUyAqL1xuXG4vKipcbiAqIFBhc3N3b3JkIFdpZGdldCBNb2R1bGVcbiAqXG4gKiBBIGNvbXByZWhlbnNpdmUgcGFzc3dvcmQgZmllbGQgY29tcG9uZW50IHRoYXQgcHJvdmlkZXM6XG4gKiAtIFBhc3N3b3JkIGdlbmVyYXRpb25cbiAqIC0gU3RyZW5ndGggdmFsaWRhdGlvbiB3aXRoIHJlYWwtdGltZSBmZWVkYmFja1xuICogLSBWaXN1YWwgcHJvZ3Jlc3MgaW5kaWNhdG9yXG4gKiAtIEFQSS1iYXNlZCB2YWxpZGF0aW9uIHdpdGggbG9jYWwgZmFsbGJhY2tcbiAqIC0gRm9ybSB2YWxpZGF0aW9uIGludGVncmF0aW9uXG4gKlxuICogVXNhZ2U6XG4gKiBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KCcjbXlQYXNzd29yZEZpZWxkJywge1xuICogICAgIG1vZGU6ICdmdWxsJywgICAgICAgICAgICAgIC8vICdmdWxsJyB8ICdnZW5lcmF0ZS1vbmx5JyB8ICdkaXNwbGF5LW9ubHknIHwgJ2Rpc2FibGVkJ1xuICogICAgIHZhbGlkYXRpb246ICdzb2Z0JywgICAgICAgIC8vICdoYXJkJyB8ICdzb2Z0JyB8ICdub25lJ1xuICogICAgIG1pblNjb3JlOiA2MCxcbiAqICAgICBnZW5lcmF0ZUxlbmd0aDogMTYsXG4gKiAgICAgaW5jbHVkZVNwZWNpYWw6IHRydWUsICAgICAgLy8gSW5jbHVkZSBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gZ2VuZXJhdGVkIHBhc3N3b3Jkc1xuICogICAgIG9uVmFsaWRhdGU6IChpc1ZhbGlkLCBzY29yZSwgbWVzc2FnZXMpID0+IHsgLi4uIH1cbiAqIH0pO1xuICovXG5jb25zdCBQYXNzd29yZFdpZGdldCA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBY3RpdmUgd2lkZ2V0IGluc3RhbmNlc1xuICAgICAqL1xuICAgIGluc3RhbmNlczogbmV3IE1hcCgpLFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gdHlwZXNcbiAgICAgKi9cbiAgICBWQUxJREFUSU9OOiB7XG4gICAgICAgIEhBUkQ6ICdoYXJkJywgICAvLyBCbG9jayBmb3JtIHN1Ym1pc3Npb24gaWYgaW52YWxpZFxuICAgICAgICBTT0ZUOiAnc29mdCcsICAgLy8gU2hvdyB3YXJuaW5ncyBidXQgYWxsb3cgc3VibWlzc2lvblxuICAgICAgICBOT05FOiAnbm9uZScgICAgLy8gTm8gdmFsaWRhdGlvblxuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogVGltZXJzIGZvciBkZWJvdW5jaW5nIHZhbGlkYXRpb25cbiAgICAgKi9cbiAgICB2YWxpZGF0aW9uVGltZXJzOiB7fSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBkZWZhdWx0czoge1xuICAgICAgICB2YWxpZGF0aW9uOiAnc29mdCcsXG4gICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsICAvLyBTaG93L2hpZGUgcGFzc3dvcmQgdG9nZ2xlXG4gICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSwgICAgICAvLyBDb3B5IHRvIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDE2LFxuICAgICAgICBpbmNsdWRlU3BlY2lhbDogdHJ1ZSwgICAgICAgLy8gSW5jbHVkZSBzcGVjaWFsIGNoYXJhY3RlcnMgaW4gZ2VuZXJhdGVkIHBhc3N3b3Jkc1xuICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgIGNoZWNrT25Mb2FkOiBmYWxzZSxcbiAgICAgICAgb25WYWxpZGF0ZTogbnVsbCwgICAgICAgIC8vIENhbGxiYWNrOiAoaXNWYWxpZCwgc2NvcmUsIG1lc3NhZ2VzKSA9PiB2b2lkXG4gICAgICAgIG9uR2VuZXJhdGU6IG51bGwsICAgICAgICAvLyBDYWxsYmFjazogKHBhc3N3b3JkKSA9PiB2b2lkXG4gICAgICAgIHZhbGlkYXRpb25SdWxlczogbnVsbCAgICAvLyBDdXN0b20gdmFsaWRhdGlvbiBydWxlcyBmb3IgRm9ybS5qc1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xqUXVlcnl9IHNlbGVjdG9yIC0gRmllbGQgc2VsZWN0b3Igb3IgalF1ZXJ5IG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gV2lkZ2V0IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fG51bGx9IFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXQoc2VsZWN0b3IsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZElkID0gJGZpZWxkLmF0dHIoJ2lkJykgfHwgJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIGluc3RhbmNlIGlmIGFueVxuICAgICAgICBpZiAodGhpcy5pbnN0YW5jZXMuaGFzKGZpZWxkSWQpKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koZmllbGRJZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBpbnN0YW5jZVxuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHtcbiAgICAgICAgICAgIGZpZWxkSWQsXG4gICAgICAgICAgICAkZmllbGQsXG4gICAgICAgICAgICAkY29udGFpbmVyOiAkZmllbGQuY2xvc2VzdCgnLmZpZWxkJyksXG4gICAgICAgICAgICBvcHRpb25zOiB7IC4uLnRoaXMuZGVmYXVsdHMsIC4uLm9wdGlvbnMgfSxcbiAgICAgICAgICAgIGVsZW1lbnRzOiB7fSxcbiAgICAgICAgICAgIHN0YXRlOiB7XG4gICAgICAgICAgICAgICAgaXNWYWxpZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzY29yZTogMCxcbiAgICAgICAgICAgICAgICBzdHJlbmd0aDogJycsXG4gICAgICAgICAgICAgICAgbWVzc2FnZXM6IFtdLFxuICAgICAgICAgICAgICAgIGlzR2VuZXJhdGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpc0ZvY3VzZWQ6IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5zZXQoZmllbGRJZCwgaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZVxuICAgICAgICB0aGlzLnNldHVwVUkoaW5zdGFuY2UpO1xuICAgICAgICB0aGlzLmJpbmRFdmVudHMoaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgZm9ybSB2YWxpZGF0aW9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAoaW5zdGFuY2Uub3B0aW9ucy52YWxpZGF0aW9uICE9PSB0aGlzLlZBTElEQVRJT04uTk9ORSkge1xuICAgICAgICAgICAgdGhpcy5zZXR1cEZvcm1WYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaW5pdGlhbCB2YWx1ZSBpZiByZXF1ZXN0ZWRcbiAgICAgICAgaWYgKGluc3RhbmNlLm9wdGlvbnMuY2hlY2tPbkxvYWQgJiYgJGZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICB0aGlzLmNoZWNrUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXR1cCBVSSBlbGVtZW50c1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHNldHVwVUkoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsICRjb250YWluZXIsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuXG4gICAgICAgIC8vIEZpbmQgb3IgY3JlYXRlIGlucHV0IHdyYXBwZXJcbiAgICAgICAgbGV0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIGlmICgkaW5wdXRXcmFwcGVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJGZpZWxkLndyYXAoJzxkaXYgY2xhc3M9XCJ1aSBpbnB1dFwiPjwvZGl2PicpO1xuICAgICAgICAgICAgJGlucHV0V3JhcHBlciA9ICRmaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERpc2FibGUgcGFzc3dvcmQgbWFuYWdlcnNcbiAgICAgICAgdGhpcy5kaXNhYmxlUGFzc3dvcmRNYW5hZ2VycyhpbnN0YW5jZSk7XG5cbiAgICAgICAgLy8gQWRkIHNob3cvaGlkZSBwYXNzd29yZCBidXR0b24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dQYXNzd29yZEJ1dHRvbikge1xuICAgICAgICAgICAgdGhpcy5hZGRTaG93SGlkZUJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgZ2VuZXJhdGUgYnV0dG9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5nZW5lcmF0ZUJ1dHRvbikge1xuICAgICAgICAgICAgdGhpcy5hZGRHZW5lcmF0ZUJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgY2xpcGJvYXJkIGJ1dHRvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuY2xpcGJvYXJkQnV0dG9uKSB7XG4gICAgICAgICAgICB0aGlzLmFkZENsaXBib2FyZEJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgc3RyZW5ndGggYmFyIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5zaG93U3RyZW5ndGhCYXIpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkU3RyZW5ndGhCYXIoaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHdhcm5pbmdzIGNvbnRhaW5lciBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1dhcm5pbmdzKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFdhcm5pbmdzQ29udGFpbmVyKGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBpbnB1dCB3cmFwcGVyIGNsYXNzIGJhc2VkIG9uIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIHRoaXMudXBkYXRlSW5wdXRXcmFwcGVyQ2xhc3MoaW5zdGFuY2UpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIHNob3cvaGlkZSBwYXNzd29yZCBidXR0b25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRTaG93SGlkZUJ1dHRvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLnNob3ctaGlkZS1wYXNzd29yZCcpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0biA9ICRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLnNob3ctaGlkZS1wYXNzd29yZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYnV0dG9uXG4gICAgICAgIGNvbnN0ICRzaG93SGlkZUJ0biA9ICQoYFxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBzaG93LWhpZGUtcGFzc3dvcmRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFNob3dQYXNzd29yZH1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV5ZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwZW5kIHRvIHdyYXBwZXJcbiAgICAgICAgJGlucHV0V3JhcHBlci5hcHBlbmQoJHNob3dIaWRlQnRuKTtcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuID0gJHNob3dIaWRlQnRuO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIGdlbmVyYXRlIGJ1dHRvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZEdlbmVyYXRlQnV0dG9uKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGlucHV0V3JhcHBlciA9ICRmaWVsZC5jbG9zZXN0KCcudWkuaW5wdXQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uZ2VuZXJhdGUtcGFzc3dvcmQnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4gPSAkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYnV0dG9uXG4gICAgICAgIGNvbnN0ICRnZW5lcmF0ZUJ0biA9ICQoYFxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBnZW5lcmF0ZS1wYXNzd29yZFwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwR2VuZXJhdGVQYXNzd29yZH1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgaWNvblwiPjwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRnZW5lcmF0ZUJ0bik7XG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0biA9ICRnZW5lcmF0ZUJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkQ2xpcGJvYXJkQnV0dG9uKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGlucHV0V3JhcHBlciA9ICRmaWVsZC5jbG9zZXN0KCcudWkuaW5wdXQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uY2xpcGJvYXJkJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0biA9ICRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLmNsaXBib2FyZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYnV0dG9uXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCAnJztcbiAgICAgICAgY29uc3QgJGNsaXBib2FyZEJ0biA9ICQoYFxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBjbGlwYm9hcmRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Y3VycmVudFZhbHVlfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5UGFzc3dvcmR9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uc1wiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gY29weVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjb3JuZXIga2V5IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPC9pPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwZW5kIHRvIHdyYXBwZXJcbiAgICAgICAgJGlucHV0V3JhcHBlci5hcHBlbmQoJGNsaXBib2FyZEJ0bik7XG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4gPSAkY2xpcGJvYXJkQnRuO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIHN0cmVuZ3RoIGJhclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZFN0cmVuZ3RoQmFyKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGNvbnRhaW5lciB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBwcm9ncmVzcyBiYXIgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRjb250YWluZXIuZmluZCgnLnBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyID0gJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24gPSAkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC1zdHJlbmd0aC1zZWN0aW9uJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBwcm9ncmVzcyBiYXJcbiAgICAgICAgY29uc3QgJHByb2dyZXNzU2VjdGlvbiA9ICQoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInBhc3N3b3JkLXN0cmVuZ3RoLXNlY3Rpb25cIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgcGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MgcHJvZ3Jlc3MgYm90dG9tIGF0dGFjaGVkIFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnNlcnQgYWZ0ZXIgZmllbGRcbiAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJHByb2dyZXNzU2VjdGlvbik7XG4gICAgICAgIFxuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NCYXIgPSAkcHJvZ3Jlc3NTZWN0aW9uLmZpbmQoJy5wYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpO1xuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uID0gJHByb2dyZXNzU2VjdGlvbjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCB3YXJuaW5ncyBjb250YWluZXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRXYXJuaW5nc0NvbnRhaW5lcihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRjb250YWluZXIgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2FybmluZ3MgY29udGFpbmVyIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC13YXJuaW5ncycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncyA9ICRjb250YWluZXIuZmluZCgnLnBhc3N3b3JkLXdhcm5pbmdzJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB3YXJuaW5ncyBjb250YWluZXIgKHdpbGwgYmUgcG9wdWxhdGVkIHdoZW4gbmVlZGVkKVxuICAgICAgICBjb25zdCAkd2FybmluZ3MgPSAkKCc8ZGl2IGNsYXNzPVwicGFzc3dvcmQtd2FybmluZ3NcIj48L2Rpdj4nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB0aGUgZmllbGQgY29udGFpbmVyIChhZnRlciBwcm9ncmVzcyBiYXIgaWYgZXhpc3RzKVxuICAgICAgICAkY29udGFpbmVyLmFwcGVuZCgkd2FybmluZ3MpO1xuICAgICAgICBcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzID0gJHdhcm5pbmdzO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGlzYWJsZSBwYXNzd29yZCBtYW5hZ2VycyBmcm9tIGludGVyZmVyaW5nIHdpdGggcGFzc3dvcmQgZmllbGRzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgZGlzYWJsZVBhc3N3b3JkTWFuYWdlcnMoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkZm9ybSA9ICRmaWVsZC5jbG9zZXN0KCdmb3JtJyk7XG5cbiAgICAgICAgLy8gU2V0IGF0dHJpYnV0ZXMgdG8gcHJldmVudCBhdXRvZmlsbFxuICAgICAgICAkZmllbGQuYXR0cih7XG4gICAgICAgICAgICAnYXV0b2NvbXBsZXRlJzogJ29mZicsXG4gICAgICAgICAgICAnZGF0YS1scGlnbm9yZSc6ICd0cnVlJywgICAgICAgICAgIC8vIExhc3RQYXNzXG4gICAgICAgICAgICAnZGF0YS0xcC1pZ25vcmUnOiAndHJ1ZScsICAgICAgICAgIC8vIDFQYXNzd29yZFxuICAgICAgICAgICAgJ2RhdGEtZm9ybS10eXBlJzogJ290aGVyJywgICAgICAgICAvLyBDaHJvbWVcbiAgICAgICAgICAgICdkYXRhLWJ3aWdub3JlJzogJ3RydWUnLCAgICAgICAgICAgLy8gQml0d2FyZGVuXG4gICAgICAgICAgICAncmVhZG9ubHknOiAncmVhZG9ubHknICAgICAgICAgICAgICAvLyBNYWtlIHJlYWRvbmx5IGluaXRpYWxseVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZW1vdmUgcmVhZG9ubHkgb24gZm9jdXNcbiAgICAgICAgJGZpZWxkLm9uKCdmb2N1cy5wYXNzd29yZE1hbmFnZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGhvbmV5cG90IGZpZWxkIHRvIHRyaWNrIHBhc3N3b3JkIG1hbmFnZXJzXG4gICAgICAgIGlmICgkZmllbGQucHJldignLnBhc3N3b3JkLWhvbmV5cG90JykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCAkaG9uZXlwb3QgPSAkKCc8aW5wdXQgdHlwZT1cInBhc3N3b3JkXCIgY2xhc3M9XCJwYXNzd29yZC1ob25leXBvdFwiIG5hbWU9XCJmYWtlX3Bhc3N3b3JkX2ZpZWxkXCIgc3R5bGU9XCJwb3NpdGlvbjogYWJzb2x1dGU7IGxlZnQ6IC05OTk5cHg7IHdpZHRoOiAxcHg7IGhlaWdodDogMXB4O1wiIHRhYmluZGV4PVwiLTFcIiBhcmlhLWhpZGRlbj1cInRydWVcIiBhdXRvY29tcGxldGU9XCJvZmZcIj4nKTtcbiAgICAgICAgICAgICRmaWVsZC5iZWZvcmUoJGhvbmV5cG90KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByZXZlbnQgZm9ybSBmcm9tIHRyaWdnZXJpbmcgcGFzc3dvcmQgc2F2ZSBwcm9tcHRcbiAgICAgICAgaWYgKCRmb3JtLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRmb3JtLmF0dHIoJ2RhdGEtbHBpZ25vcmUnLCAndHJ1ZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJpbmQgZXZlbnRzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYmluZEV2ZW50cyhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93L2hpZGUgYnV0dG9uIGNsaWNrXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bi5vZmYoJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy50b2dnbGVQYXNzd29yZFZpc2liaWxpdHkoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdlbmVyYXRlIGJ1dHRvbiBjbGlja1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ub2ZmKCdjbGljay5wYXNzd29yZFdpZGdldCcpLm9uKCdjbGljay5wYXNzd29yZFdpZGdldCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVQYXNzd29yZChpbnN0YW5jZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZnVuY3Rpb25hbGl0eSBmb3IgY29weSBidXR0b25cbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4gJiYgdHlwZW9mIENsaXBib2FyZEpTICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgaWYgKCFpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0blswXSk7XG5cbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc3VjY2Vzc2Z1bCBjb3B5IC0gc2hvdyB0ZW1wb3Jhcnkgc3VjY2VzcyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxDb250ZW50ID0gaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5hdHRyKCdkYXRhLWNvbnRlbnQnKTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5hdHRyKCdkYXRhLWNvbnRlbnQnLCBnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFBhc3N3b3JkQ29waWVkIHx8ICfQodC60L7Qv9C40YDQvtCy0LDQvdC+IScpO1xuXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucG9wdXAoJ3Nob3cnKTtcblxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4uYXR0cignZGF0YS1jb250ZW50Jywgb3JpZ2luYWxDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTUwMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaWVsZCBpbnB1dCBldmVudFxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0ZU9uSW5wdXQpIHtcbiAgICAgICAgICAgICRmaWVsZC5vZmYoJ2lucHV0LnBhc3N3b3JkV2lkZ2V0IGNoYW5nZS5wYXNzd29yZFdpZGdldCcpLm9uKCdpbnB1dC5wYXNzd29yZFdpZGdldCBjaGFuZ2UucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dChpbnN0YW5jZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gUGFzdGUgZXZlbnQgLSB0cmlnZ2VyIHZhbGlkYXRpb24gaW1tZWRpYXRlbHkgYWZ0ZXIgcGFzdGVcbiAgICAgICAgICAgICRmaWVsZC5vZmYoJ3Bhc3RlLnBhc3N3b3JkV2lkZ2V0Jykub24oJ3Bhc3RlLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBkZWJvdW5jZSB0aW1lciBmb3IgaW1tZWRpYXRlIHBhc3RlIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICBpZiAodGhpcy52YWxpZGF0aW9uVGltZXJzW2luc3RhbmNlLmZpZWxkSWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0pO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy52YWxpZGF0aW9uVGltZXJzW2luc3RhbmNlLmZpZWxkSWRdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE5lZWQgdGltZW91dCBiZWNhdXNlIHBhc3RlIGNvbnRlbnQgaXMgbm90IGltbWVkaWF0ZWx5IGF2YWlsYWJsZSBpbiBmaWVsZCB2YWx1ZVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVBhc3RlSW5wdXQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY2xpcGJvYXJkIGJ1dHRvbiB3aGVuIHBhc3N3b3JkIGNoYW5nZXNcbiAgICAgICAgJGZpZWxkLm9uKCdpbnB1dC5wYXNzd29yZFdpZGdldCBjaGFuZ2UucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gc3RhdGUgb24gZW1wdHlcbiAgICAgICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVXBkYXRlIGFsbCBjbGlwYm9hcmQgYnV0dG9ucyAod2lkZ2V0J3MgYW5kIGFueSBleHRlcm5hbCBvbmVzKVxuICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCB2YWx1ZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBwYXN0ZSBldmVudCBmb3IgY2xpcGJvYXJkIGJ1dHRvbiB1cGRhdGUgKHdpdGggZGVsYXkpXG4gICAgICAgICRmaWVsZC5vbigncGFzdGUucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIHN0YXRlIG9uIGVtcHR5XG4gICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYWxsIGNsaXBib2FyZCBidXR0b25zICh3aWRnZXQncyBhbmQgYW55IGV4dGVybmFsIG9uZXMpXG4gICAgICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCB2YWx1ZSk7XG4gICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9jdXMgZXZlbnQgLSBzaG93IHByb2dyZXNzIGJhciB3aGVuIGZpZWxkIGlzIGZvY3VzZWRcbiAgICAgICAgJGZpZWxkLm9mZignZm9jdXMucGFzc3dvcmRXaWRnZXQnKS5vbignZm9jdXMucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0ZvY3VzZWQgPSB0cnVlO1xuICAgICAgICAgICAgLy8gU2hvdyBwcm9ncmVzcyBiYXIgaWYgdGhlcmUncyBhIHBhc3N3b3JkIHZhbHVlXG4gICAgICAgICAgICBjb25zdCBwYXNzd29yZCA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGlmIChwYXNzd29yZCAmJiBwYXNzd29yZCAhPT0gJycgJiYgIXRoaXMuaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB2YWxpZGF0aW9uIHRvIHVwZGF0ZSBwcm9ncmVzcyBiYXIgd2hlbiBmb2N1c2VkICh3aXRob3V0IGRlYm91bmNlIGZvciBpbml0aWFsIGZvY3VzKVxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRlT25JbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQmx1ciBldmVudCAtIGhpZGUgcHJvZ3Jlc3MgYmFyIHdoZW4gZmllbGQgbG9zZXMgZm9jdXMgb25seSBpZiBubyB3YXJuaW5nc1xuICAgICAgICAkZmllbGQub2ZmKCdibHVyLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2JsdXIucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0ZvY3VzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIEhpZGUgcHJvZ3Jlc3MgYmFyIG9ubHkgaWYgdGhlcmUgYXJlIG5vIHZhbGlkYXRpb24gd2FybmluZ3MgdmlzaWJsZVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24gJiZcbiAgICAgICAgICAgICAgICAoIWluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncyB8fCBpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MuaXMoJzplbXB0eScpIHx8ICFpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MuaXMoJzp2aXNpYmxlJykpKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBOZXZlciBoaWRlIHdhcm5pbmdzIG9uIGJsdXIgLSB0aGV5IHNob3VsZCByZW1haW4gdmlzaWJsZVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIERpc2FibGUgd2lkZ2V0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgZGlzYWJsZShpbnN0YW5jZSkge1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFuY2UuJGNvbnRhaW5lci5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEVuYWJsZSB3aWRnZXRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBlbmFibGUoaW5zdGFuY2UpIHtcbiAgICAgICAgaW5zdGFuY2UuJGZpZWxkLnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFuY2UuJGNvbnRhaW5lci5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCByZWFkLW9ubHkgbW9kZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHNldFJlYWRPbmx5KGluc3RhbmNlKSB7XG4gICAgICAgIGluc3RhbmNlLiRmaWVsZC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXR1cCBmb3JtIHZhbGlkYXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBzZXR1cEZvcm1WYWxpZGF0aW9uKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgaWYgRm9ybSBvYmplY3QgaXMgbm90IGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIEZvcm0gPT09ICd1bmRlZmluZWQnIHx8ICFGb3JtLnZhbGlkYXRlUnVsZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCAkZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgaWYgKCFmaWVsZE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGN1c3RvbSBydWxlcyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0aW9uUnVsZXMpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlc1tmaWVsZE5hbWVdID0gb3B0aW9ucy52YWxpZGF0aW9uUnVsZXM7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIG1vZGVcbiAgICAgICAgY29uc3QgcnVsZXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub24tZW1wdHkgcnVsZSBmb3IgaGFyZCB2YWxpZGF0aW9uXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5IQVJEKSB7XG4gICAgICAgICAgICBydWxlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnB3X1ZhbGlkYXRlUGFzc3dvcmRFbXB0eVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzdHJlbmd0aCB2YWxpZGF0aW9uXG4gICAgICAgIGlmIChvcHRpb25zLm1pblNjb3JlID4gMCAmJiBvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5IQVJEKSB7XG4gICAgICAgICAgICBydWxlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncGFzc3dvcmRTdHJlbmd0aCcsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHdfVmFsaWRhdGVQYXNzd29yZFdlYWtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAocnVsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzW2ZpZWxkTmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogZmllbGROYW1lLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBydWxlc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIHBhc3N3b3JkIHN0cmVuZ3RoXG4gICAgICAgIGlmICh0eXBlb2YgJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnBhc3N3b3JkU3RyZW5ndGggPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAkLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMucGFzc3dvcmRTdHJlbmd0aCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaW5zdGFuY2Uuc3RhdGUuc2NvcmUgPj0gb3B0aW9ucy5taW5TY29yZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHBhc3N3b3JkIGlzIG1hc2tlZCAoc2VydmVyIHJldHVybnMgdGhlc2Ugd2hlbiBwYXNzd29yZCBpcyBoaWRkZW4pXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3N3b3JkIC0gUGFzc3dvcmQgdG8gY2hlY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBwYXNzd29yZCBhcHBlYXJzIHRvIGJlIG1hc2tlZFxuICAgICAqL1xuICAgIGlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpIHtcbiAgICAgICAgcmV0dXJuIC9eW3hYXXs2LH0kfF5cXCp7Nix9JHxeSElEREVOJHxeTUFTS0VEJC9pLnRlc3QocGFzc3dvcmQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGlucHV0IGV2ZW50IHdpdGggZGVib3VuY2luZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGhhbmRsZUlucHV0KGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgcGFzc3dvcmQgPSAkZmllbGQudmFsKCk7XG5cbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGlmIGRpc2FibGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gZm9yIG1hc2tlZCBwYXNzd29yZHNcbiAgICAgICAgaWYgKHRoaXMuaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBpZiB0aGlzIGlzIGEgZ2VuZXJhdGVkIHBhc3N3b3JkIChhbHJlYWR5IHZhbGlkYXRlZCBpbiBzZXRHZW5lcmF0ZWRQYXNzd29yZClcbiAgICAgICAgaWYgKGluc3RhbmNlLnN0YXRlLmlzR2VuZXJhdGVkKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZCA9IGZhbHNlOyAvLyBSZXNldCBmbGFnIGZvciBuZXh0IGlucHV0XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBbHdheXMgdmFsaWRhdGUgcGFzc3dvcmQgd2l0aCBkZWJvdW5jZSAoZG9uJ3QgcmVxdWlyZSBmb2N1cylcbiAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkV2l0aERlYm91bmNlKGluc3RhbmNlLCBwYXNzd29yZCwgNTAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHBhc3RlIGlucHV0IGV2ZW50IHdpdGhvdXQgZGVib3VuY2luZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGhhbmRsZVBhc3RlSW5wdXQoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCBwYXNzd29yZCA9ICRmaWVsZC52YWwoKTtcblxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgZGlzYWJsZWRcbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLk5PTkUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBmb3IgbWFza2VkIHBhc3N3b3Jkc1xuICAgICAgICBpZiAodGhpcy5pc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgaW1tZWRpYXRlbHkgd2l0aG91dCBkZWJvdW5jZSBmb3IgcGFzdGVcbiAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSBwYXNzd29yZCB3aXRoIGRlYm91bmNpbmcgZm9yIHR5cGluZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIHZhbGlkYXRlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlYm91bmNlVGltZSAtIERlYm91bmNlIGRlbGF5IGluIG1pbGxpc2Vjb25kc1xuICAgICAqL1xuICAgIHZhbGlkYXRlUGFzc3dvcmRXaXRoRGVib3VuY2UoaW5zdGFuY2UsIHBhc3N3b3JkLCBkZWJvdW5jZVRpbWUgPSA1MDApIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgdGltZXJcbiAgICAgICAgaWYgKHRoaXMudmFsaWRhdGlvblRpbWVyc1tpbnN0YW5jZS5maWVsZElkXSkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudmFsaWRhdGlvblRpbWVyc1tpbnN0YW5jZS5maWVsZElkXSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93IGltbWVkaWF0ZSBsb2NhbCBmZWVkYmFjayB3aGlsZSB3YWl0aW5nIChhbHdheXMgc2hvdyBwcm9ncmVzcyBiYXIgd2hlbiB0eXBpbmcpXG4gICAgICAgIGlmIChwYXNzd29yZCAmJiBwYXNzd29yZCAhPT0gJycgJiYgIXRoaXMuaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGxvY2FsU2NvcmUgPSB0aGlzLnNjb3JlUGFzc3dvcmRMb2NhbChwYXNzd29yZCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzQmFyKGluc3RhbmNlLCBsb2NhbFNjb3JlKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBwcm9ncmVzcyBzZWN0aW9uIHdoZW4gdHlwaW5nIChkb24ndCByZXF1aXJlIGZvY3VzIGZvciBpbW1lZGlhdGUgZmVlZGJhY2spXG4gICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBmb3IgZW1wdHkgcGFzc3dvcmRcbiAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aW1lciBmb3IgZnVsbCB2YWxpZGF0aW9uIChpbmNsdWRpbmcgQVBJIGNhbGwgYW5kIHdhcm5pbmdzKVxuICAgICAgICB0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0gPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIC8vIE9ubHkgZG8gZnVsbCB2YWxpZGF0aW9uIGlmIGZpZWxkIHN0aWxsIGhhcyB0aGUgc2FtZSB2YWx1ZVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLiRmaWVsZC52YWwoKSA9PT0gcGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZGVib3VuY2VUaW1lKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgcGFzc3dvcmQgaW1tZWRpYXRlbHlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB0byB2YWxpZGF0ZVxuICAgICAqL1xuICAgIHZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKSB7XG4gICAgICAgIGNvbnN0IHsgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG5cbiAgICAgICAgLy8gQ2xlYXIgcHJldmlvdXMgd2FybmluZ3MgYXQgdGhlIHN0YXJ0IG9mIHZhbGlkYXRpb25cbiAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBlbXB0eSBwYXNzd29yZFxuICAgICAgICBpZiAoIXBhc3N3b3JkIHx8IHBhc3N3b3JkID09PSAnJykge1xuICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGZvciBtYXNrZWQgcGFzc3dvcmRzXG4gICAgICAgIGlmICh0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93IHByb2dyZXNzIHNlY3Rpb24gd2hlbiB2YWxpZGF0aW5nXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cgaW1tZWRpYXRlIGxvY2FsIGZlZWRiYWNrXG4gICAgICAgIGNvbnN0IGxvY2FsU2NvcmUgPSB0aGlzLnNjb3JlUGFzc3dvcmRMb2NhbChwYXNzd29yZCk7XG4gICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3NCYXIoaW5zdGFuY2UsIGxvY2FsU2NvcmUpO1xuXG4gICAgICAgIC8vIFVzZSBBUEkgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgUGFzc3dvcmRzQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgUGFzc3dvcmRzQVBJLnZhbGlkYXRlUGFzc3dvcmQocGFzc3dvcmQsIGluc3RhbmNlLmZpZWxkSWQsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVzZSBsb2NhbCB2YWxpZGF0aW9uXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgc2NvcmU6IGxvY2FsU2NvcmUsXG4gICAgICAgICAgICAgICAgaXNWYWxpZDogbG9jYWxTY29yZSA+PSBvcHRpb25zLm1pblNjb3JlLFxuICAgICAgICAgICAgICAgIHN0cmVuZ3RoOiB0aGlzLmdldFN0cmVuZ3RoTGFiZWwobG9jYWxTY29yZSksXG4gICAgICAgICAgICAgICAgbWVzc2FnZXM6IFtdXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVWYWxpZGF0aW9uUmVzdWx0KGluc3RhbmNlLCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgcGFzc3dvcmQgc2NvcmUgbG9jYWxseVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIHNjb3JlXG4gICAgICogQHJldHVybnMge251bWJlcn0gU2NvcmUgZnJvbSAwLTEwMFxuICAgICAqL1xuICAgIHNjb3JlUGFzc3dvcmRMb2NhbChwYXNzd29yZCkge1xuICAgICAgICBsZXQgc2NvcmUgPSAwO1xuICAgICAgICBpZiAoIXBhc3N3b3JkIHx8IHBhc3N3b3JkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHNjb3JlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsZW5ndGggPSBwYXNzd29yZC5sZW5ndGg7XG4gICAgICAgIFxuICAgICAgICAvLyBMZW5ndGggc2NvcmluZyAodXAgdG8gMzAgcG9pbnRzKVxuICAgICAgICBpZiAobGVuZ3RoID49IDE2KSB7XG4gICAgICAgICAgICBzY29yZSArPSAzMDtcbiAgICAgICAgfSBlbHNlIGlmIChsZW5ndGggPj0gMTIpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDIwO1xuICAgICAgICB9IGVsc2UgaWYgKGxlbmd0aCA+PSA4KSB7XG4gICAgICAgICAgICBzY29yZSArPSAxMDtcbiAgICAgICAgfSBlbHNlIGlmIChsZW5ndGggPj0gNikge1xuICAgICAgICAgICAgc2NvcmUgKz0gNTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hhcmFjdGVyIGRpdmVyc2l0eSAodXAgdG8gNDAgcG9pbnRzKVxuICAgICAgICBpZiAoL1thLXpdLy50ZXN0KHBhc3N3b3JkKSkgc2NvcmUgKz0gMTA7IC8vIExvd2VyY2FzZVxuICAgICAgICBpZiAoL1tBLVpdLy50ZXN0KHBhc3N3b3JkKSkgc2NvcmUgKz0gMTA7IC8vIFVwcGVyY2FzZVxuICAgICAgICBpZiAoL1xcZC8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAgICAgLy8gRGlnaXRzXG4gICAgICAgIGlmICgvXFxXLy50ZXN0KHBhc3N3b3JkKSkgc2NvcmUgKz0gMTA7ICAgICAvLyBTcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgXG4gICAgICAgIC8vIFBhdHRlcm4gY29tcGxleGl0eSAodXAgdG8gMzAgcG9pbnRzKVxuICAgICAgICBjb25zdCB1bmlxdWVDaGFycyA9IG5ldyBTZXQocGFzc3dvcmQpLnNpemU7XG4gICAgICAgIGNvbnN0IHVuaXF1ZVJhdGlvID0gdW5pcXVlQ2hhcnMgLyBsZW5ndGg7XG4gICAgICAgIFxuICAgICAgICBpZiAodW5pcXVlUmF0aW8gPiAwLjcpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDIwO1xuICAgICAgICB9IGVsc2UgaWYgKHVuaXF1ZVJhdGlvID4gMC41KSB7XG4gICAgICAgICAgICBzY29yZSArPSAxNTtcbiAgICAgICAgfSBlbHNlIGlmICh1bmlxdWVSYXRpbyA+IDAuMykge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzY29yZSArPSA1O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBQZW5hbHRpZXMgZm9yIGNvbW1vbiBwYXR0ZXJuc1xuICAgICAgICBpZiAoLyguKVxcMXsyLH0vLnRlc3QocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICBzY29yZSAtPSAxMDsgLy8gUmVwZWF0aW5nIGNoYXJhY3RlcnNcbiAgICAgICAgfVxuICAgICAgICBpZiAoLygwMTJ8MTIzfDIzNHwzNDV8NDU2fDU2N3w2Nzh8Nzg5fDg5MHxhYmN8YmNkfGNkZXxkZWYpL2kudGVzdChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgIHNjb3JlIC09IDEwOyAvLyBTZXF1ZW50aWFsIHBhdHRlcm5zXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1pbigxMDAsIHNjb3JlKSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc3RyZW5ndGggbGFiZWwgZm9yIHNjb3JlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3JlIC0gUGFzc3dvcmQgc2NvcmVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTdHJlbmd0aCBsYWJlbFxuICAgICAqL1xuICAgIGdldFN0cmVuZ3RoTGFiZWwoc2NvcmUpIHtcbiAgICAgICAgaWYgKHNjb3JlIDwgMjApIHJldHVybiAndmVyeV93ZWFrJztcbiAgICAgICAgaWYgKHNjb3JlIDwgNDApIHJldHVybiAnd2Vhayc7XG4gICAgICAgIGlmIChzY29yZSA8IDYwKSByZXR1cm4gJ2ZhaXInO1xuICAgICAgICBpZiAoc2NvcmUgPCA4MCkgcmV0dXJuICdnb29kJztcbiAgICAgICAgcmV0dXJuICdzdHJvbmcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHByb2dyZXNzIGJhclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29yZSAtIFBhc3N3b3JkIHNjb3JlXG4gICAgICovXG4gICAgdXBkYXRlUHJvZ3Jlc3NCYXIoaW5zdGFuY2UsIHNjb3JlKSB7XG4gICAgICAgIGNvbnN0IHsgZWxlbWVudHMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFlbGVtZW50cy4kcHJvZ3Jlc3NCYXIgfHwgZWxlbWVudHMuJHByb2dyZXNzQmFyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3NcbiAgICAgICAgZWxlbWVudHMuJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcbiAgICAgICAgICAgIHBlcmNlbnQ6IE1hdGgubWluKHNjb3JlLCAxMDApLFxuICAgICAgICAgICAgc2hvd0FjdGl2aXR5OiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY29sb3JcbiAgICAgICAgZWxlbWVudHMuJHByb2dyZXNzQmFyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JlZCBvcmFuZ2UgeWVsbG93IG9saXZlIGdyZWVuJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyh0aGlzLmdldENvbG9yRm9yU2NvcmUoc2NvcmUpKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjb2xvciBjbGFzcyBmb3Igc2NvcmVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcmUgLSBQYXNzd29yZCBzY29yZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IENvbG9yIGNsYXNzIG5hbWVcbiAgICAgKi9cbiAgICBnZXRDb2xvckZvclNjb3JlKHNjb3JlKSB7XG4gICAgICAgIGlmIChzY29yZSA8IDIwKSByZXR1cm4gJ3JlZCc7XG4gICAgICAgIGlmIChzY29yZSA8IDQwKSByZXR1cm4gJ29yYW5nZSc7XG4gICAgICAgIGlmIChzY29yZSA8IDYwKSByZXR1cm4gJ3llbGxvdyc7XG4gICAgICAgIGlmIChzY29yZSA8IDgwKSByZXR1cm4gJ29saXZlJztcbiAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgdmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gVmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKi9cbiAgICBoYW5kbGVWYWxpZGF0aW9uUmVzdWx0KGluc3RhbmNlLCByZXN1bHQpIHtcbiAgICAgICAgaWYgKCFyZXN1bHQpIHJldHVybjtcblxuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuXG4gICAgICAgIC8vIEFsd2F5cyBjbGVhciB3YXJuaW5ncyBmaXJzdCB0byBlbnN1cmUgY2xlYW4gc3RhdGVcbiAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0ZVxuICAgICAgICBpbnN0YW5jZS5zdGF0ZSA9IHtcbiAgICAgICAgICAgIGlzVmFsaWQ6IHJlc3VsdC5pc1ZhbGlkIHx8IHJlc3VsdC5zY29yZSA+PSBvcHRpb25zLm1pblNjb3JlLFxuICAgICAgICAgICAgc2NvcmU6IHJlc3VsdC5zY29yZSxcbiAgICAgICAgICAgIHN0cmVuZ3RoOiByZXN1bHQuc3RyZW5ndGggfHwgdGhpcy5nZXRTdHJlbmd0aExhYmVsKHJlc3VsdC5zY29yZSksXG4gICAgICAgICAgICBtZXNzYWdlczogcmVzdWx0Lm1lc3NhZ2VzIHx8IFtdLFxuICAgICAgICAgICAgaXNHZW5lcmF0ZWQ6IGluc3RhbmNlLnN0YXRlLmlzR2VuZXJhdGVkXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXBkYXRlIFVJXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3NCYXIoaW5zdGFuY2UsIHJlc3VsdC5zY29yZSk7XG5cbiAgICAgICAgLy8gU2hvdyB3YXJuaW5ncy9lcnJvcnMgb25seSBpZiB0aGVyZSBhcmUgbWVzc2FnZXMgQU5EIHBhc3N3b3JkIGlzIG5vdCBzdHJvbmcgZW5vdWdoXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dXYXJuaW5ncyAmJiByZXN1bHQubWVzc2FnZXMgJiYgcmVzdWx0Lm1lc3NhZ2VzLmxlbmd0aCA+IDAgJiYgIWluc3RhbmNlLnN0YXRlLmlzVmFsaWQpIHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VUeXBlID0gaW5zdGFuY2Uuc3RhdGUuaXNWYWxpZCA/ICd3YXJuaW5nJyA6ICdlcnJvcic7XG4gICAgICAgICAgICB0aGlzLnNob3dXYXJuaW5ncyhpbnN0YW5jZSwgcmVzdWx0LCBtZXNzYWdlVHlwZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYWxsIHZhbGlkYXRpb24gY2FsbGJhY2tcbiAgICAgICAgaWYgKG9wdGlvbnMub25WYWxpZGF0ZSkge1xuICAgICAgICAgICAgb3B0aW9ucy5vblZhbGlkYXRlKGluc3RhbmNlLnN0YXRlLmlzVmFsaWQsIHJlc3VsdC5zY29yZSwgcmVzdWx0Lm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtIHZhbGlkYXRpb24gc3RhdGVcbiAgICAgICAgaWYgKEZvcm0gJiYgRm9ybS4kZm9ybU9iaikge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gaW5zdGFuY2UuJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCBpbnN0YW5jZS4kZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmICghaW5zdGFuY2Uuc3RhdGUuaXNWYWxpZCAmJiBvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5IQVJEKSB7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdhZGQgcHJvbXB0JywgZmllbGROYW1lLCByZXN1bHQubWVzc2FnZXNbMF0gfHwgJ0ludmFsaWQgcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgZmllbGROYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgcGFzc3dvcmRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVBhc3N3b3JkKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG5cbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgcGFzc3dvcmRcbiAgICAgICAgY29uc3QgZ2VuZXJhdGVDYWxsYmFjayA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBhc3N3b3JkID0gdHlwZW9mIHJlc3VsdCA9PT0gJ3N0cmluZycgPyByZXN1bHQgOiByZXN1bHQucGFzc3dvcmQ7XG5cbiAgICAgICAgICAgIC8vIFNldCBwYXNzd29yZFxuICAgICAgICAgICAgdGhpcy5zZXRHZW5lcmF0ZWRQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDYWxsIGNhbGxiYWNrXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5vbkdlbmVyYXRlKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5vbkdlbmVyYXRlKHBhc3N3b3JkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBVc2UgQVBJIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIFBhc3N3b3Jkc0FQSSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIFBhc3N3b3Jkc0FQSS5nZW5lcmF0ZVBhc3N3b3JkKG9wdGlvbnMuZ2VuZXJhdGVMZW5ndGgsIGdlbmVyYXRlQ2FsbGJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2ltcGxlIGxvY2FsIGdlbmVyYXRvciB3aXRoIGNvbmZpZ3VyYWJsZSBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgICAgIGxldCBjaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSc7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5pbmNsdWRlU3BlY2lhbCkge1xuICAgICAgICAgICAgICAgIGNoYXJzICs9ICchQCMkJV4mKic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgcGFzc3dvcmQgPSAnJztcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3B0aW9ucy5nZW5lcmF0ZUxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGFzc3dvcmQgKz0gY2hhcnMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZ2VuZXJhdGVDYWxsYmFjayhwYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCBnZW5lcmF0ZWQgcGFzc3dvcmRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBHZW5lcmF0ZWQgcGFzc3dvcmRcbiAgICAgKi9cbiAgICBzZXRHZW5lcmF0ZWRQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsICRjb250YWluZXIsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGdlbmVyYXRlZCBmbGFnIGZpcnN0IHRvIHByZXZlbnQgZHVwbGljYXRlIHZhbGlkYXRpb25cbiAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNHZW5lcmF0ZWQgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHZhbHVlIHdpdGhvdXQgdHJpZ2dlcmluZyBjaGFuZ2UgZXZlbnQgeWV0XG4gICAgICAgICRmaWVsZC52YWwocGFzc3dvcmQpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjbGlwYm9hcmQgYnV0dG9ucyAod2lkZ2V0J3MgYW5kIGFueSBleHRlcm5hbCBvbmVzKVxuICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIHBhc3N3b3JkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIG9uY2UgaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gIT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm93IHRyaWdnZXIgY2hhbmdlIGZvciBmb3JtIHRyYWNraW5nICh2YWxpZGF0aW9uIGFscmVhZHkgZG9uZSBhYm92ZSlcbiAgICAgICAgJGZpZWxkLnRyaWdnZXIoJ2NoYW5nZScpXG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHdhcm5pbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCAtIFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBNZXNzYWdlIHR5cGUgKHdhcm5pbmcvZXJyb3IpXG4gICAgICovXG4gICAgc2hvd1dhcm5pbmdzKGluc3RhbmNlLCByZXN1bHQsIHR5cGUgPSAnd2FybmluZycpIHtcbiAgICAgICAgaWYgKCFpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHsgZWxlbWVudHMgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCBjb2xvckNsYXNzID0gdHlwZSA9PT0gJ2Vycm9yJyA/ICdyZWQnIDogJ29yYW5nZSc7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB3YXJuaW5nc1xuICAgICAgICBlbGVtZW50cy4kd2FybmluZ3MuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB3YXJuaW5ncyBhcyBwb2ludGluZyBsYWJlbFxuICAgICAgICBpZiAocmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBDaG9vc2UgaWNvbiBiYXNlZCBvbiBtZXNzYWdlIHR5cGVcbiAgICAgICAgICAgIGNvbnN0IGljb25DbGFzcyA9IHR5cGUgPT09ICdlcnJvcicgPyAnZXhjbGFtYXRpb24gY2lyY2xlJyA6ICdleGNsYW1hdGlvbiB0cmlhbmdsZSc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSBsaXN0IGl0ZW1zIGZyb20gbWVzc2FnZXMgd2l0aCBpY29uc1xuICAgICAgICAgICAgY29uc3QgbGlzdEl0ZW1zID0gcmVzdWx0Lm1lc3NhZ2VzLm1hcChtc2cgPT4gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtpY29uQ2xhc3N9IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+JHttc2d9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKS5qb2luKCcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIHBvaW50aW5nIGFib3ZlIGxhYmVsIHdpdGggbGlzdCAocG9pbnRzIHRvIHBhc3N3b3JkIGZpZWxkKVxuICAgICAgICAgICAgY29uc3QgJGxhYmVsID0gJChgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nICR7Y29sb3JDbGFzc30gYmFzaWMgbGFiZWxcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGxpc3RcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7bGlzdEl0ZW1zfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBlbGVtZW50cy4kd2FybmluZ3MuYXBwZW5kKCRsYWJlbCkuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHdhcm5pbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgaGlkZVdhcm5pbmdzKGluc3RhbmNlKSB7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncy5lbXB0eSgpLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHBhc3N3b3JkIHZpc2liaWxpdHlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICB0b2dnbGVQYXNzd29yZFZpc2liaWxpdHkoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkc2hvd0hpZGVCdG4gPSBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG47XG4gICAgICAgIFxuICAgICAgICBpZiAoISRzaG93SGlkZUJ0bikgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJGljb24gPSAkc2hvd0hpZGVCdG4uZmluZCgnaScpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdwYXNzd29yZCcpIHtcbiAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmRcbiAgICAgICAgICAgICRmaWVsZC5hdHRyKCd0eXBlJywgJ3RleHQnKTtcbiAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUnKS5hZGRDbGFzcygnZXllIHNsYXNoJyk7XG4gICAgICAgICAgICAkc2hvd0hpZGVCdG4uYXR0cignZGF0YS1jb250ZW50JywgZ2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBIaWRlUGFzc3dvcmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBwYXNzd29yZFxuICAgICAgICAgICAgJGZpZWxkLmF0dHIoJ3R5cGUnLCAncGFzc3dvcmQnKTtcbiAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUgc2xhc2gnKS5hZGRDbGFzcygnZXllJyk7XG4gICAgICAgICAgICAkc2hvd0hpZGVCdG4uYXR0cignZGF0YS1jb250ZW50JywgZ2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBTaG93UGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciB2YWxpZGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKSB7XG4gICAgICAgIC8vIENsZWFyIHdhcm5pbmdzIHdoZW4gZXhwbGljaXRseSBjbGVhcmluZyB2YWxpZGF0aW9uIChlbXB0eSBwYXNzd29yZClcbiAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc0Jhcikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyLnByb2dyZXNzKHsgcGVyY2VudDogMCB9KTtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS5zdGF0ZSA9IHtcbiAgICAgICAgICAgIGlzVmFsaWQ6IHRydWUsXG4gICAgICAgICAgICBzY29yZTogMCxcbiAgICAgICAgICAgIHN0cmVuZ3RoOiAnJyxcbiAgICAgICAgICAgIG1lc3NhZ2VzOiBbXSxcbiAgICAgICAgICAgIGlzR2VuZXJhdGVkOiBmYWxzZSxcbiAgICAgICAgICAgIGlzRm9jdXNlZDogaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkIHx8IGZhbHNlXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBwYXNzd29yZCAobWFudWFsIHZhbGlkYXRpb24pXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgY2hlY2tQYXNzd29yZChpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCBwYXNzd29yZCA9IGluc3RhbmNlLiRmaWVsZC52YWwoKTtcbiAgICAgICAgaWYgKHBhc3N3b3JkICYmIHBhc3N3b3JkICE9PSAnJykge1xuICAgICAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGZvciBtYXNrZWQgcGFzc3dvcmRzXG4gICAgICAgICAgICBpZiAodGhpcy5pc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGb3IgaW5pdGlhbCBjaGVjaywgZG9uJ3Qgc2hvdyBwcm9ncmVzcyBiYXIgYnV0IGRvIHZhbGlkYXRlIGFuZCBzaG93IHdhcm5pbmdzXG4gICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGluc3RhbmNlT3JGaWVsZElkIC0gSW5zdGFuY2Ugb3IgZmllbGQgSURcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbmV3T3B0aW9ucyAtIE5ldyBvcHRpb25zXG4gICAgICovXG4gICAgdXBkYXRlQ29uZmlnKGluc3RhbmNlT3JGaWVsZElkLCBuZXdPcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBvcHRpb25zXG4gICAgICAgIGluc3RhbmNlLm9wdGlvbnMgPSB7IC4uLmluc3RhbmNlLm9wdGlvbnMsIC4uLm5ld09wdGlvbnMgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBkeW5hbWljIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnc2hvd1Bhc3N3b3JkQnV0dG9uJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5zaG93UGFzc3dvcmRCdXR0b24gJiYgIWluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBidXR0b24gaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgIHRoaXMuYWRkU2hvd0hpZGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIC8vIFJlLWJpbmQgZXZlbnRzIGZvciB0aGUgbmV3IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b2dnbGVQYXNzd29yZFZpc2liaWxpdHkoaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFuZXdPcHRpb25zLnNob3dQYXNzd29yZEJ1dHRvbiAmJiBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYnV0dG9uIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZ2VuZXJhdGUgYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdnZW5lcmF0ZUJ1dHRvbicgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuZ2VuZXJhdGVCdXR0b24gJiYgIWluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBidXR0b24gaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgIHRoaXMuYWRkR2VuZXJhdGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIC8vIFJlLWJpbmQgZXZlbnRzIGZvciB0aGUgbmV3IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVBhc3N3b3JkKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLnBvcHVwKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICghbmV3T3B0aW9ucy5nZW5lcmF0ZUJ1dHRvbiAmJiBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYnV0dG9uIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2xpcGJvYXJkIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnY2xpcGJvYXJkQnV0dG9uJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5jbGlwYm9hcmRCdXR0b24gJiYgIWluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgYnV0dG9uIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICB0aGlzLmFkZENsaXBib2FyZEJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIHRoZSBuZXcgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4gJiYgdHlwZW9mIENsaXBib2FyZEpTICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIENsaXBib2FyZEpTIGZvciB0aGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG5bMF0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cCBmb3IgY2xpcGJvYXJkIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc3VjY2Vzc2Z1bCBjb3B5XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW5ld09wdGlvbnMuY2xpcGJvYXJkQnV0dG9uICYmIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYnV0dG9uIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmNsaXBib2FyZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHN0cmVuZ3RoIGJhciB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnc2hvd1N0cmVuZ3RoQmFyJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5zaG93U3RyZW5ndGhCYXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dTdHJlbmd0aEJhcihpbnN0YW5jZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVN0cmVuZ3RoQmFyKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHdhcm5pbmdzIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdzaG93V2FybmluZ3MnIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLnNob3dXYXJuaW5ncykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1dhcm5pbmdzKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW5wdXQgd3JhcHBlciBhY3Rpb24gY2xhc3MgYmFzZWQgb24gYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyhpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1zZXR1cCBmb3JtIHZhbGlkYXRpb24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChpbnN0YW5jZS5vcHRpb25zLnZhbGlkYXRpb24gIT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwRm9ybVZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBjdXJyZW50IHZhbHVlIGlmIHZhbGlkYXRpb24gY2hhbmdlZFxuICAgICAgICBpZiAoJ3ZhbGlkYXRpb24nIGluIG5ld09wdGlvbnMgJiYgaW5zdGFuY2UuJGZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICB0aGlzLmNoZWNrUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaW5wdXQgd3JhcHBlciBhY3Rpb24gY2xhc3MgYmFzZWQgb24gYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICB1cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCAkaW5wdXRXcmFwcGVyID0gaW5zdGFuY2UuJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBjb25zdCBoYXNCdXR0b25zID0gISEoXG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4gfHwgXG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4gfHwgXG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaGFzQnV0dG9ucykge1xuICAgICAgICAgICAgJGlucHV0V3JhcHBlci5hZGRDbGFzcygnYWN0aW9uJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkaW5wdXRXcmFwcGVyLnJlbW92ZUNsYXNzKCdhY3Rpb24nKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHdpZGdldCBzdGF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gaW5zdGFuY2VPckZpZWxkSWQgLSBJbnN0YW5jZSBvciBmaWVsZCBJRFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R8bnVsbH0gV2lkZ2V0IHN0YXRlXG4gICAgICovXG4gICAgZ2V0U3RhdGUoaW5zdGFuY2VPckZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0eXBlb2YgaW5zdGFuY2VPckZpZWxkSWQgPT09ICdzdHJpbmcnIFxuICAgICAgICAgICAgPyB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VPckZpZWxkSWQpXG4gICAgICAgICAgICA6IGluc3RhbmNlT3JGaWVsZElkO1xuICAgICAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZSA/IGluc3RhbmNlLnN0YXRlIDogbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgc3RyZW5ndGggYmFyXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBpbnN0YW5jZU9yRmllbGRJZCAtIEluc3RhbmNlIG9yIGZpZWxkIElEXG4gICAgICovXG4gICAgc2hvd1N0cmVuZ3RoQmFyKGluc3RhbmNlT3JGaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgc3RyZW5ndGggYmFyXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBpbnN0YW5jZU9yRmllbGRJZCAtIEluc3RhbmNlIG9yIGZpZWxkIElEXG4gICAgICovXG4gICAgaGlkZVN0cmVuZ3RoQmFyKGluc3RhbmNlT3JGaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgd2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGRlc3Ryb3koZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gVW5iaW5kIGV2ZW50c1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQub2ZmKCcucGFzc3dvcmRXaWRnZXQnKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignLnBhc3N3b3JkV2lkZ2V0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuLm9mZignLnBhc3N3b3JkV2lkZ2V0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgY2xpcGJvYXJkIGluc3RhbmNlXG4gICAgICAgIGlmIChpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuY2xpcGJvYXJkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB0aW1lclxuICAgICAgICBpZiAodGhpcy52YWxpZGF0aW9uVGltZXJzW2ZpZWxkSWRdKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy52YWxpZGF0aW9uVGltZXJzW2ZpZWxkSWRdKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnZhbGlkYXRpb25UaW1lcnNbZmllbGRJZF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5kZWxldGUoZmllbGRJZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IGFsbCBpbnN0YW5jZXNcbiAgICAgKi9cbiAgICBkZXN0cm95QWxsKCkge1xuICAgICAgICB0aGlzLmluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSwgZmllbGRJZCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KGZpZWxkSWQpO1xuICAgICAgICB9KTtcbiAgICB9XG59OyJdfQ==