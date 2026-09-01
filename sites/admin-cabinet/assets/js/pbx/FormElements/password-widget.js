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
    this.updateProgressBar(instance, localScore); // Build a local-scoring result used when server validation is unavailable.
    // messages carries a generic weak-password hint when the local score is below
    // the minimum, so HARD validation still shows an actionable prompt instead of a
    // bare "Invalid password" (the per-rule server guidance cannot be reproduced
    // client-side, but a weak-password notice is better than nothing).

    var localResult = {
      score: localScore,
      isValid: localScore >= options.minScore,
      strength: this.getStrengthLabel(localScore),
      messages: localScore >= options.minScore ? [] : [globalTranslate.psw_WeakPassword]
    }; // Use API if available

    if (typeof PasswordsAPI !== 'undefined') {
      PasswordsAPI.validatePassword(password, instance.fieldId, function (result) {
        // Only act while the field still holds the same password — a late
        // response for a stale value must not overwrite current state.
        if (instance.$field.val() !== password) {
          return;
        } // Prefer the authoritative server verdict (it includes the dictionary
        // check). On ANY failure — a 403 for a restricted ModuleUsersUI role, or
        // a transient 5xx/network error — fall back to local scoring. This is
        // important: state.score MUST reflect the password currently in the
        // field. Leaving the previous server verdict in place would let a strong
        // password's stale high score pass the submit gate after the user edits
        // it down to a weak one and the re-validation request fails.


        _this3.handleValidationResult(instance, result || localResult);
      });
    } else {
      // PasswordsAPI not loaded at all — local scoring is the only option.
      this.handleValidationResult(instance, localResult);
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
    } else {
      score += Math.max(0, length);
    } // Character diversity (up to 40 points)


    if (/[a-z]/.test(password)) score += 10; // Lowercase

    if (/[A-Z]/.test(password)) score += 10; // Uppercase

    if (/\d/.test(password)) score += 10; // Digits

    var diversity = 0;
    if (/[a-z]/.test(password)) diversity += 1;
    if (/[A-Z]/.test(password)) diversity += 1;
    if (/\d/.test(password)) diversity += 1;

    if (/[^a-zA-Z0-9]/.test(password)) {
      score += 10; // Special characters

      diversity += 1;
    } // Pattern complexity (up to 30 points)


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
    } // Bonus for mixing at least three character classes in a long password.


    if (diversity >= 3 && length >= 12) {
      score += 10;
    } // A three-character run in a long, diverse machine-generated token does
    // not materially reduce its entropy. Keep penalizing low-diversity input.


    var looksLikeDiverseMachineToken = length >= 20 && uniqueRatio > 0.3;
    var hasLongRepeatedRun = /(.)\1{3,}/.test(password);

    if (/(.)\1{2,}/.test(password) && (!looksLikeDiverseMachineToken || hasLongRepeatedRun)) {
      score -= 10; // Repeating characters
    }

    var sequentialPatterns = ['qwerty', 'asdfgh', 'zxcvbn', '12345', '23456', '34567', '45678', '56789', 'abcde', 'bcdef', 'cdefg', 'defgh'];
    var lowerPassword = password.toLowerCase();

    if (sequentialPatterns.some(function (pattern) {
      return lowerPassword.includes(pattern) || lowerPassword.includes(pattern.split('').reverse().join(''));
    })) {
      score -= 10;
    }

    if (/^[a-z]+$/i.test(password) && length < 10) {
      score -= 15;
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

    this.hideWarnings(instance); // Update state.
    // A high score rescues isValid: the extension submit gate (and the widget's own
    // HARD rule) judge strength by score, so a password the server flags (e.g. a
    // dictionary hit) but that still scores >= minScore is treated as acceptable.
    // This keeps the warning/validity in step with the score-based submit gate —
    // showing a blocking error the form then ignores would only confuse the user.

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
   * Generate a password locally (fallback when the API is unavailable or fails).
   * @param {object} options - Widget options (generateLength, includeSpecial)
   * @returns {string} Generated password
   */
  generateLocalPassword: function generateLocalPassword(options) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    if (options.includeSpecial) {
      chars += '!@#$%^&*';
    } // Use the cryptographically secure RNG: this fallback produces real account
    // credentials (SIP/AMI/SSH) when the server generator is unreachable, so
    // Math.random() — predictable and not crypto-grade — must not be used.


    var length = options.generateLength;
    var randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);
    var password = '';

    for (var i = 0; i < length; i++) {
      password += chars.charAt(randomValues[i] % chars.length);
    }

    return password;
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
      var password = typeof result === 'string' ? result : result && result.password; // If the API call failed (result is false/empty), fall back to local
      // generation so the button always yields a usable password instead of
      // silently blanking the field with `undefined`.

      if (!password) {
        password = _this4.generateLocalPassword(options);
      } // Set password


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
      generateCallback(this.generateLocalPassword(options));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvcGFzc3dvcmQtd2lkZ2V0LmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkV2lkZ2V0IiwiaW5zdGFuY2VzIiwiTWFwIiwiVkFMSURBVElPTiIsIkhBUkQiLCJTT0ZUIiwiTk9ORSIsInZhbGlkYXRpb25UaW1lcnMiLCJkZWZhdWx0cyIsInZhbGlkYXRpb24iLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJpbmNsdWRlU3BlY2lhbCIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwib25WYWxpZGF0ZSIsIm9uR2VuZXJhdGUiLCJ2YWxpZGF0aW9uUnVsZXMiLCJpbml0Iiwic2VsZWN0b3IiLCJvcHRpb25zIiwiJGZpZWxkIiwiJCIsImxlbmd0aCIsImZpZWxkSWQiLCJhdHRyIiwiTWF0aCIsInJhbmRvbSIsInRvU3RyaW5nIiwic3Vic3RyIiwiaGFzIiwiZGVzdHJveSIsImluc3RhbmNlIiwiJGNvbnRhaW5lciIsImNsb3Nlc3QiLCJlbGVtZW50cyIsInN0YXRlIiwiaXNWYWxpZCIsInNjb3JlIiwic3RyZW5ndGgiLCJtZXNzYWdlcyIsImlzR2VuZXJhdGVkIiwiaXNGb2N1c2VkIiwic2V0Iiwic2V0dXBVSSIsImJpbmRFdmVudHMiLCJzZXR1cEZvcm1WYWxpZGF0aW9uIiwidmFsIiwiY2hlY2tQYXNzd29yZCIsIiRpbnB1dFdyYXBwZXIiLCJ3cmFwIiwicGFyZW50IiwiZGlzYWJsZVBhc3N3b3JkTWFuYWdlcnMiLCJhZGRTaG93SGlkZUJ1dHRvbiIsImFkZEdlbmVyYXRlQnV0dG9uIiwiYWRkQ2xpcGJvYXJkQnV0dG9uIiwiYWRkU3RyZW5ndGhCYXIiLCJhZGRXYXJuaW5nc0NvbnRhaW5lciIsInVwZGF0ZUlucHV0V3JhcHBlckNsYXNzIiwiZmluZCIsIiRzaG93SGlkZUJ0biIsImdsb2JhbFRyYW5zbGF0ZSIsImJ0X1Rvb2xUaXBTaG93UGFzc3dvcmQiLCJhcHBlbmQiLCIkZ2VuZXJhdGVCdG4iLCJidF9Ub29sVGlwR2VuZXJhdGVQYXNzd29yZCIsIiRjbGlwYm9hcmRCdG4iLCJjdXJyZW50VmFsdWUiLCJidF9Ub29sVGlwQ29weVBhc3N3b3JkIiwiJHByb2dyZXNzQmFyIiwiJHByb2dyZXNzU2VjdGlvbiIsIiR3YXJuaW5ncyIsIiRmb3JtIiwib24iLCJyZW1vdmVBdHRyIiwicHJldiIsIiRob25leXBvdCIsImJlZm9yZSIsIm9mZiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRvZ2dsZVBhc3N3b3JkVmlzaWJpbGl0eSIsImdlbmVyYXRlUGFzc3dvcmQiLCJDbGlwYm9hcmRKUyIsImNsaXBib2FyZCIsIm9yaWdpbmFsQ29udGVudCIsImJ0X1Rvb2xUaXBQYXNzd29yZENvcGllZCIsInBvcHVwIiwic2V0VGltZW91dCIsImNsZWFyU2VsZWN0aW9uIiwiaGFuZGxlSW5wdXQiLCJjbGVhclRpbWVvdXQiLCJoYW5kbGVQYXN0ZUlucHV0IiwidmFsdWUiLCJjbGVhclZhbGlkYXRpb24iLCJwYXNzd29yZCIsImlzTWFza2VkUGFzc3dvcmQiLCJzaG93IiwidmFsaWRhdGVQYXNzd29yZCIsImlzIiwiaGlkZSIsImRpc2FibGUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJlbmFibGUiLCJyZW1vdmVDbGFzcyIsInNldFJlYWRPbmx5IiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJmaWVsZE5hbWUiLCJydWxlcyIsInB1c2giLCJ0eXBlIiwicHJvbXB0IiwicHdfVmFsaWRhdGVQYXNzd29yZEVtcHR5IiwicHdfVmFsaWRhdGVQYXNzd29yZFdlYWsiLCJpZGVudGlmaWVyIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJwYXNzd29yZFN0cmVuZ3RoIiwidGVzdCIsInZhbGlkYXRlUGFzc3dvcmRXaXRoRGVib3VuY2UiLCJkZWJvdW5jZVRpbWUiLCJsb2NhbFNjb3JlIiwic2NvcmVQYXNzd29yZExvY2FsIiwidXBkYXRlUHJvZ3Jlc3NCYXIiLCJoaWRlV2FybmluZ3MiLCJsb2NhbFJlc3VsdCIsImdldFN0cmVuZ3RoTGFiZWwiLCJwc3dfV2Vha1Bhc3N3b3JkIiwiUGFzc3dvcmRzQVBJIiwicmVzdWx0IiwiaGFuZGxlVmFsaWRhdGlvblJlc3VsdCIsIm1heCIsImRpdmVyc2l0eSIsInVuaXF1ZUNoYXJzIiwiU2V0Iiwic2l6ZSIsInVuaXF1ZVJhdGlvIiwibG9va3NMaWtlRGl2ZXJzZU1hY2hpbmVUb2tlbiIsImhhc0xvbmdSZXBlYXRlZFJ1biIsInNlcXVlbnRpYWxQYXR0ZXJucyIsImxvd2VyUGFzc3dvcmQiLCJ0b0xvd2VyQ2FzZSIsInNvbWUiLCJwYXR0ZXJuIiwiaW5jbHVkZXMiLCJzcGxpdCIsInJldmVyc2UiLCJqb2luIiwibWluIiwicHJvZ3Jlc3MiLCJwZXJjZW50Iiwic2hvd0FjdGl2aXR5IiwiZ2V0Q29sb3JGb3JTY29yZSIsIm1lc3NhZ2VUeXBlIiwiJGZvcm1PYmoiLCJnZW5lcmF0ZUxvY2FsUGFzc3dvcmQiLCJjaGFycyIsInJhbmRvbVZhbHVlcyIsIlVpbnQzMkFycmF5Iiwid2luZG93IiwiY3J5cHRvIiwiZ2V0UmFuZG9tVmFsdWVzIiwiaSIsImNoYXJBdCIsImdlbmVyYXRlQ2FsbGJhY2siLCJzZXRHZW5lcmF0ZWRQYXNzd29yZCIsInRyaWdnZXIiLCJkYXRhQ2hhbmdlZCIsImNvbG9yQ2xhc3MiLCJlbXB0eSIsImljb25DbGFzcyIsImxpc3RJdGVtcyIsIm1hcCIsIm1zZyIsIiRsYWJlbCIsIiRpY29uIiwiYnRfVG9vbFRpcEhpZGVQYXNzd29yZCIsInVwZGF0ZUNvbmZpZyIsImluc3RhbmNlT3JGaWVsZElkIiwibmV3T3B0aW9ucyIsImdldCIsInJlbW92ZSIsImhpZGVTdHJlbmd0aEJhciIsImhhc0J1dHRvbnMiLCJnZXRTdGF0ZSIsImRlc3Ryb3lBbGwiLCJmb3JFYWNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNB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QixDQUFELENBQVo7QUFDQSxhQUFPLEtBQUt0QixnQkFBTCxDQUFzQnNCLE9BQXRCLENBQVA7QUFDSCxLQXZCWSxDQXlCYjs7O0FBQ0EsU0FBSzVCLFNBQUwsV0FBc0I0QixPQUF0QjtBQUNILEdBcnlDa0I7O0FBdXlDbkI7QUFDSjtBQUNBO0FBQ0lvSyxFQUFBQSxVQTF5Q21CLHdCQTB5Q047QUFBQTs7QUFDVCxTQUFLaE0sU0FBTCxDQUFlaU0sT0FBZixDQUF1QixVQUFDN0osUUFBRCxFQUFXUixPQUFYLEVBQXVCO0FBQzFDLE1BQUEsTUFBSSxDQUFDTyxPQUFMLENBQWFQLE9BQWI7QUFDSCxLQUZEO0FBR0g7QUE5eUNrQixDQUF2QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFBhc3N3b3Jkc0FQSSwgRm9ybSwgQ2xpcGJvYXJkSlMgKi9cblxuLyoqXG4gKiBQYXNzd29yZCBXaWRnZXQgTW9kdWxlXG4gKlxuICogQSBjb21wcmVoZW5zaXZlIHBhc3N3b3JkIGZpZWxkIGNvbXBvbmVudCB0aGF0IHByb3ZpZGVzOlxuICogLSBQYXNzd29yZCBnZW5lcmF0aW9uXG4gKiAtIFN0cmVuZ3RoIHZhbGlkYXRpb24gd2l0aCByZWFsLXRpbWUgZmVlZGJhY2tcbiAqIC0gVmlzdWFsIHByb2dyZXNzIGluZGljYXRvclxuICogLSBBUEktYmFzZWQgdmFsaWRhdGlvbiB3aXRoIGxvY2FsIGZhbGxiYWNrXG4gKiAtIEZvcm0gdmFsaWRhdGlvbiBpbnRlZ3JhdGlvblxuICpcbiAqIFVzYWdlOlxuICogY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdCgnI215UGFzc3dvcmRGaWVsZCcsIHtcbiAqICAgICBtb2RlOiAnZnVsbCcsICAgICAgICAgICAgICAvLyAnZnVsbCcgfCAnZ2VuZXJhdGUtb25seScgfCAnZGlzcGxheS1vbmx5JyB8ICdkaXNhYmxlZCdcbiAqICAgICB2YWxpZGF0aW9uOiAnc29mdCcsICAgICAgICAvLyAnaGFyZCcgfCAnc29mdCcgfCAnbm9uZSdcbiAqICAgICBtaW5TY29yZTogNjAsXG4gKiAgICAgZ2VuZXJhdGVMZW5ndGg6IDE2LFxuICogICAgIGluY2x1ZGVTcGVjaWFsOiB0cnVlLCAgICAgIC8vIEluY2x1ZGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGluIGdlbmVyYXRlZCBwYXNzd29yZHNcbiAqICAgICBvblZhbGlkYXRlOiAoaXNWYWxpZCwgc2NvcmUsIG1lc3NhZ2VzKSA9PiB7IC4uLiB9XG4gKiB9KTtcbiAqL1xuY29uc3QgUGFzc3dvcmRXaWRnZXQgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogQWN0aXZlIHdpZGdldCBpbnN0YW5jZXNcbiAgICAgKi9cbiAgICBpbnN0YW5jZXM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHR5cGVzXG4gICAgICovXG4gICAgVkFMSURBVElPTjoge1xuICAgICAgICBIQVJEOiAnaGFyZCcsICAgLy8gQmxvY2sgZm9ybSBzdWJtaXNzaW9uIGlmIGludmFsaWRcbiAgICAgICAgU09GVDogJ3NvZnQnLCAgIC8vIFNob3cgd2FybmluZ3MgYnV0IGFsbG93IHN1Ym1pc3Npb25cbiAgICAgICAgTk9ORTogJ25vbmUnICAgIC8vIE5vIHZhbGlkYXRpb25cbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRpbWVycyBmb3IgZGVib3VuY2luZyB2YWxpZGF0aW9uXG4gICAgICovXG4gICAgdmFsaWRhdGlvblRpbWVyczoge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgdmFsaWRhdGlvbjogJ3NvZnQnLFxuICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLCAgLy8gU2hvdy9oaWRlIHBhc3N3b3JkIHRvZ2dsZVxuICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsICAgICAgLy8gQ29weSB0byBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICBtaW5TY29yZTogNjAsXG4gICAgICAgIGdlbmVyYXRlTGVuZ3RoOiAxNixcbiAgICAgICAgaW5jbHVkZVNwZWNpYWw6IHRydWUsICAgICAgIC8vIEluY2x1ZGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGluIGdlbmVyYXRlZCBwYXNzd29yZHNcbiAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICBjaGVja09uTG9hZDogZmFsc2UsXG4gICAgICAgIG9uVmFsaWRhdGU6IG51bGwsICAgICAgICAvLyBDYWxsYmFjazogKGlzVmFsaWQsIHNjb3JlLCBtZXNzYWdlcykgPT4gdm9pZFxuICAgICAgICBvbkdlbmVyYXRlOiBudWxsLCAgICAgICAgLy8gQ2FsbGJhY2s6IChwYXNzd29yZCkgPT4gdm9pZFxuICAgICAgICB2YWxpZGF0aW9uUnVsZXM6IG51bGwgICAgLy8gQ3VzdG9tIHZhbGlkYXRpb24gcnVsZXMgZm9yIEZvcm0uanNcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0XG4gICAgICogQHBhcmFtIHtzdHJpbmd8alF1ZXJ5fSBzZWxlY3RvciAtIEZpZWxkIHNlbGVjdG9yIG9yIGpRdWVyeSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIFdpZGdldCBvcHRpb25zXG4gICAgICogQHJldHVybnMge29iamVjdHxudWxsfSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBpbml0KHNlbGVjdG9yLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJChzZWxlY3Rvcik7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgZmllbGRJZCA9ICRmaWVsZC5hdHRyKCdpZCcpIHx8ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBpbnN0YW5jZSBpZiBhbnlcbiAgICAgICAgaWYgKHRoaXMuaW5zdGFuY2VzLmhhcyhmaWVsZElkKSkge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KGZpZWxkSWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2VcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB7XG4gICAgICAgICAgICBmaWVsZElkLFxuICAgICAgICAgICAgJGZpZWxkLFxuICAgICAgICAgICAgJGNvbnRhaW5lcjogJGZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLFxuICAgICAgICAgICAgb3B0aW9uczogeyAuLi50aGlzLmRlZmF1bHRzLCAuLi5vcHRpb25zIH0sXG4gICAgICAgICAgICBlbGVtZW50czoge30sXG4gICAgICAgICAgICBzdGF0ZToge1xuICAgICAgICAgICAgICAgIGlzVmFsaWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgc2NvcmU6IDAsXG4gICAgICAgICAgICAgICAgc3RyZW5ndGg6ICcnLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiBbXSxcbiAgICAgICAgICAgICAgICBpc0dlbmVyYXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgaXNGb2N1c2VkOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuc2V0KGZpZWxkSWQsIGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemVcbiAgICAgICAgdGhpcy5zZXR1cFVJKGluc3RhbmNlKTtcbiAgICAgICAgdGhpcy5iaW5kRXZlbnRzKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldHVwIGZvcm0gdmFsaWRhdGlvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGluc3RhbmNlLm9wdGlvbnMudmFsaWRhdGlvbiAhPT0gdGhpcy5WQUxJREFUSU9OLk5PTkUpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dXBGb3JtVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGluaXRpYWwgdmFsdWUgaWYgcmVxdWVzdGVkXG4gICAgICAgIGlmIChpbnN0YW5jZS5vcHRpb25zLmNoZWNrT25Mb2FkICYmICRmaWVsZC52YWwoKSkge1xuICAgICAgICAgICAgdGhpcy5jaGVja1Bhc3N3b3JkKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgVUkgZWxlbWVudHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBzZXR1cFVJKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCAkY29udGFpbmVyLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcblxuICAgICAgICAvLyBGaW5kIG9yIGNyZWF0ZSBpbnB1dCB3cmFwcGVyXG4gICAgICAgIGxldCAkaW5wdXRXcmFwcGVyID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBpZiAoJGlucHV0V3JhcHBlci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICRmaWVsZC53cmFwKCc8ZGl2IGNsYXNzPVwidWkgaW5wdXRcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICRpbnB1dFdyYXBwZXIgPSAkZmllbGQucGFyZW50KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEaXNhYmxlIHBhc3N3b3JkIG1hbmFnZXJzXG4gICAgICAgIHRoaXMuZGlzYWJsZVBhc3N3b3JkTWFuYWdlcnMoaW5zdGFuY2UpO1xuXG4gICAgICAgIC8vIEFkZCBzaG93L2hpZGUgcGFzc3dvcmQgYnV0dG9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5zaG93UGFzc3dvcmRCdXR0b24pIHtcbiAgICAgICAgICAgIHRoaXMuYWRkU2hvd0hpZGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGdlbmVyYXRlIGJ1dHRvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuZ2VuZXJhdGVCdXR0b24pIHtcbiAgICAgICAgICAgIHRoaXMuYWRkR2VuZXJhdGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGNsaXBib2FyZCBidXR0b24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLmNsaXBib2FyZEJ1dHRvbikge1xuICAgICAgICAgICAgdGhpcy5hZGRDbGlwYm9hcmRCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHN0cmVuZ3RoIGJhciBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1N0cmVuZ3RoQmFyKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFN0cmVuZ3RoQmFyKGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCB3YXJuaW5ncyBjb250YWluZXIgaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dXYXJuaW5ncykge1xuICAgICAgICAgICAgdGhpcy5hZGRXYXJuaW5nc0NvbnRhaW5lcihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgaW5wdXQgd3JhcHBlciBjbGFzcyBiYXNlZCBvbiBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICB0aGlzLnVwZGF0ZUlucHV0V3JhcHBlckNsYXNzKGluc3RhbmNlKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBzaG93L2hpZGUgcGFzc3dvcmQgYnV0dG9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkU2hvd0hpZGVCdXR0b24oaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkaW5wdXRXcmFwcGVyID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYnV0dG9uIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5zaG93LWhpZGUtcGFzc3dvcmQnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4gPSAkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5zaG93LWhpZGUtcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJ1dHRvblxuICAgICAgICBjb25zdCAkc2hvd0hpZGVCdG4gPSAkKGBcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gc2hvdy1oaWRlLXBhc3N3b3JkXCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBTaG93UGFzc3dvcmR9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleWUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRzaG93SGlkZUJ0bik7XG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0biA9ICRzaG93SGlkZUJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBnZW5lcmF0ZSBidXR0b25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRHZW5lcmF0ZUJ1dHRvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuID0gJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uZ2VuZXJhdGUtcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJ1dHRvblxuICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSAkKGBcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gZ2VuZXJhdGUtcGFzc3dvcmRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEdlbmVyYXRlUGFzc3dvcmR9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzeW5jIGljb25cIj48L2k+XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBlbmQgdG8gd3JhcHBlclxuICAgICAgICAkaW5wdXRXcmFwcGVyLmFwcGVuZCgkZ2VuZXJhdGVCdG4pO1xuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4gPSAkZ2VuZXJhdGVCdG47XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgY2xpcGJvYXJkIGJ1dHRvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZENsaXBib2FyZEJ1dHRvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLmNsaXBib2FyZCcpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4gPSAkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJ1dHRvblxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkZmllbGQudmFsKCkgfHwgJyc7XG4gICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdG4gPSAkKGBcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gY2xpcGJvYXJkXCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY2xpcGJvYXJkLXRleHQ9XCIke2N1cnJlbnRWYWx1ZX1cIlxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weVBhc3N3b3JkfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGNvcHlcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29ybmVyIGtleSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRjbGlwYm9hcmRCdG4pO1xuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuID0gJGNsaXBib2FyZEJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBzdHJlbmd0aCBiYXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRTdHJlbmd0aEJhcihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRjb250YWluZXIgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgcHJvZ3Jlc3MgYmFyIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc0JhciA9ICRjb250YWluZXIuZmluZCgnLnBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uID0gJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtc2VjdGlvbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgcHJvZ3Jlc3MgYmFyXG4gICAgICAgIGNvbnN0ICRwcm9ncmVzc1NlY3Rpb24gPSAkKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwYXNzd29yZC1zdHJlbmd0aC1zZWN0aW9uXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIHBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzIHByb2dyZXNzIGJvdHRvbSBhdHRhY2hlZCBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5zZXJ0IGFmdGVyIGZpZWxkXG4gICAgICAgICRjb250YWluZXIuYXBwZW5kKCRwcm9ncmVzc1NlY3Rpb24pO1xuICAgICAgICBcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyID0gJHByb2dyZXNzU2VjdGlvbi5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbiA9ICRwcm9ncmVzc1NlY3Rpb247XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgd2FybmluZ3MgY29udGFpbmVyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkV2FybmluZ3NDb250YWluZXIoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkY29udGFpbmVyIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdhcm5pbmdzIGNvbnRhaW5lciBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtd2FybmluZ3MnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MgPSAkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC13YXJuaW5ncycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgd2FybmluZ3MgY29udGFpbmVyICh3aWxsIGJlIHBvcHVsYXRlZCB3aGVuIG5lZWRlZClcbiAgICAgICAgY29uc3QgJHdhcm5pbmdzID0gJCgnPGRpdiBjbGFzcz1cInBhc3N3b3JkLXdhcm5pbmdzXCI+PC9kaXY+Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBlbmQgdG8gdGhlIGZpZWxkIGNvbnRhaW5lciAoYWZ0ZXIgcHJvZ3Jlc3MgYmFyIGlmIGV4aXN0cylcbiAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJHdhcm5pbmdzKTtcbiAgICAgICAgXG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncyA9ICR3YXJuaW5ncztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERpc2FibGUgcGFzc3dvcmQgbWFuYWdlcnMgZnJvbSBpbnRlcmZlcmluZyB3aXRoIHBhc3N3b3JkIGZpZWxkc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGRpc2FibGVQYXNzd29yZE1hbmFnZXJzKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGZvcm0gPSAkZmllbGQuY2xvc2VzdCgnZm9ybScpO1xuXG4gICAgICAgIC8vIFNldCBhdHRyaWJ1dGVzIHRvIHByZXZlbnQgYXV0b2ZpbGxcbiAgICAgICAgJGZpZWxkLmF0dHIoe1xuICAgICAgICAgICAgJ2F1dG9jb21wbGV0ZSc6ICdvZmYnLFxuICAgICAgICAgICAgJ2RhdGEtbHBpZ25vcmUnOiAndHJ1ZScsICAgICAgICAgICAvLyBMYXN0UGFzc1xuICAgICAgICAgICAgJ2RhdGEtMXAtaWdub3JlJzogJ3RydWUnLCAgICAgICAgICAvLyAxUGFzc3dvcmRcbiAgICAgICAgICAgICdkYXRhLWZvcm0tdHlwZSc6ICdvdGhlcicsICAgICAgICAgLy8gQ2hyb21lXG4gICAgICAgICAgICAnZGF0YS1id2lnbm9yZSc6ICd0cnVlJywgICAgICAgICAgIC8vIEJpdHdhcmRlblxuICAgICAgICAgICAgJ3JlYWRvbmx5JzogJ3JlYWRvbmx5JyAgICAgICAgICAgICAgLy8gTWFrZSByZWFkb25seSBpbml0aWFsbHlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHJlYWRvbmx5IG9uIGZvY3VzXG4gICAgICAgICRmaWVsZC5vbignZm9jdXMucGFzc3dvcmRNYW5hZ2VyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBob25leXBvdCBmaWVsZCB0byB0cmljayBwYXNzd29yZCBtYW5hZ2Vyc1xuICAgICAgICBpZiAoJGZpZWxkLnByZXYoJy5wYXNzd29yZC1ob25leXBvdCcpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgJGhvbmV5cG90ID0gJCgnPGlucHV0IHR5cGU9XCJwYXNzd29yZFwiIGNsYXNzPVwicGFzc3dvcmQtaG9uZXlwb3RcIiBuYW1lPVwiZmFrZV9wYXNzd29yZF9maWVsZFwiIHN0eWxlPVwicG9zaXRpb246IGFic29sdXRlOyBsZWZ0OiAtOTk5OXB4OyB3aWR0aDogMXB4OyBoZWlnaHQ6IDFweDtcIiB0YWJpbmRleD1cIi0xXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgYXV0b2NvbXBsZXRlPVwib2ZmXCI+Jyk7XG4gICAgICAgICAgICAkZmllbGQuYmVmb3JlKCRob25leXBvdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmV2ZW50IGZvcm0gZnJvbSB0cmlnZ2VyaW5nIHBhc3N3b3JkIHNhdmUgcHJvbXB0XG4gICAgICAgIGlmICgkZm9ybS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkZm9ybS5hdHRyKCdkYXRhLWxwaWdub3JlJywgJ3RydWUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCaW5kIGV2ZW50c1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGJpbmRFdmVudHMoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdy9oaWRlIGJ1dHRvbiBjbGlja1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4ub2ZmKCdjbGljay5wYXNzd29yZFdpZGdldCcpLm9uKCdjbGljay5wYXNzd29yZFdpZGdldCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlUGFzc3dvcmRWaXNpYmlsaXR5KGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZW5lcmF0ZSBidXR0b24gY2xpY2tcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZ1bmN0aW9uYWxpdHkgZm9yIGNvcHkgYnV0dG9uXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuICYmIHR5cGVvZiBDbGlwYm9hcmRKUyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGlmICghaW5zdGFuY2UuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG5bMF0pO1xuXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHN1Y2Nlc3NmdWwgY29weSAtIHNob3cgdGVtcG9yYXJ5IHN1Y2Nlc3MgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsQ29udGVudCA9IGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4uYXR0cignZGF0YS1jb250ZW50Jyk7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4uYXR0cignZGF0YS1jb250ZW50JywgZ2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBQYXNzd29yZENvcGllZCB8fCAn0KHQutC+0L/QuNGA0L7QstCw0L3QviEnKTtcblxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKCdzaG93Jyk7XG5cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLmF0dHIoJ2RhdGEtY29udGVudCcsIG9yaWdpbmFsQ29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuXG4gICAgICAgICAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmllbGQgaW5wdXQgZXZlbnRcbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGVPbklucHV0KSB7XG4gICAgICAgICAgICAkZmllbGQub2ZmKCdpbnB1dC5wYXNzd29yZFdpZGdldCBjaGFuZ2UucGFzc3dvcmRXaWRnZXQnKS5vbignaW5wdXQucGFzc3dvcmRXaWRnZXQgY2hhbmdlLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlSW5wdXQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFBhc3RlIGV2ZW50IC0gdHJpZ2dlciB2YWxpZGF0aW9uIGltbWVkaWF0ZWx5IGFmdGVyIHBhc3RlXG4gICAgICAgICAgICAkZmllbGQub2ZmKCdwYXN0ZS5wYXNzd29yZFdpZGdldCcpLm9uKCdwYXN0ZS5wYXNzd29yZFdpZGdldCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgZGVib3VuY2UgdGltZXIgZm9yIGltbWVkaWF0ZSBwYXN0ZSB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudmFsaWRhdGlvblRpbWVyc1tpbnN0YW5jZS5maWVsZElkXSkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy52YWxpZGF0aW9uVGltZXJzW2luc3RhbmNlLmZpZWxkSWRdKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudmFsaWRhdGlvblRpbWVyc1tpbnN0YW5jZS5maWVsZElkXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBOZWVkIHRpbWVvdXQgYmVjYXVzZSBwYXN0ZSBjb250ZW50IGlzIG5vdCBpbW1lZGlhdGVseSBhdmFpbGFibGUgaW4gZmllbGQgdmFsdWVcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVQYXN0ZUlucHV0KGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNsaXBib2FyZCBidXR0b24gd2hlbiBwYXNzd29yZCBjaGFuZ2VzXG4gICAgICAgICRmaWVsZC5vbignaW5wdXQucGFzc3dvcmRXaWRnZXQgY2hhbmdlLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIHN0YXRlIG9uIGVtcHR5XG4gICAgICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhbGwgY2xpcGJvYXJkIGJ1dHRvbnMgKHdpZGdldCdzIGFuZCBhbnkgZXh0ZXJuYWwgb25lcylcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgdmFsdWUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgcGFzdGUgZXZlbnQgZm9yIGNsaXBib2FyZCBidXR0b24gdXBkYXRlICh3aXRoIGRlbGF5KVxuICAgICAgICAkZmllbGQub24oJ3Bhc3RlLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBzdGF0ZSBvbiBlbXB0eVxuICAgICAgICAgICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGFsbCBjbGlwYm9hcmQgYnV0dG9ucyAod2lkZ2V0J3MgYW5kIGFueSBleHRlcm5hbCBvbmVzKVxuICAgICAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgdmFsdWUpO1xuICAgICAgICAgICAgfSwgMTApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvY3VzIGV2ZW50IC0gc2hvdyBwcm9ncmVzcyBiYXIgd2hlbiBmaWVsZCBpcyBmb2N1c2VkXG4gICAgICAgICRmaWVsZC5vZmYoJ2ZvY3VzLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2ZvY3VzLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIFNob3cgcHJvZ3Jlc3MgYmFyIGlmIHRoZXJlJ3MgYSBwYXNzd29yZCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgcGFzc3dvcmQgPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICBpZiAocGFzc3dvcmQgJiYgcGFzc3dvcmQgIT09ICcnICYmICF0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdmFsaWRhdGlvbiB0byB1cGRhdGUgcHJvZ3Jlc3MgYmFyIHdoZW4gZm9jdXNlZCAod2l0aG91dCBkZWJvdW5jZSBmb3IgaW5pdGlhbCBmb2N1cylcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0ZU9uSW5wdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJsdXIgZXZlbnQgLSBoaWRlIHByb2dyZXNzIGJhciB3aGVuIGZpZWxkIGxvc2VzIGZvY3VzIG9ubHkgaWYgbm8gd2FybmluZ3NcbiAgICAgICAgJGZpZWxkLm9mZignYmx1ci5wYXNzd29yZFdpZGdldCcpLm9uKCdibHVyLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkID0gZmFsc2U7XG4gICAgICAgICAgICAvLyBIaWRlIHByb2dyZXNzIGJhciBvbmx5IGlmIHRoZXJlIGFyZSBubyB2YWxpZGF0aW9uIHdhcm5pbmdzIHZpc2libGVcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uICYmXG4gICAgICAgICAgICAgICAgKCFpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MgfHwgaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzLmlzKCc6ZW1wdHknKSB8fCAhaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzLmlzKCc6dmlzaWJsZScpKSkge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTmV2ZXIgaGlkZSB3YXJuaW5ncyBvbiBibHVyIC0gdGhleSBzaG91bGQgcmVtYWluIHZpc2libGVcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBEaXNhYmxlIHdpZGdldFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGRpc2FibGUoaW5zdGFuY2UpIHtcbiAgICAgICAgaW5zdGFuY2UuJGZpZWxkLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5wcm9wKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbmNlLiRjb250YWluZXIuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFbmFibGUgd2lkZ2V0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgZW5hYmxlKGluc3RhbmNlKSB7XG4gICAgICAgIGluc3RhbmNlLiRmaWVsZC5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbmNlLiRjb250YWluZXIucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgcmVhZC1vbmx5IG1vZGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBzZXRSZWFkT25seShpbnN0YW5jZSkge1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgZm9ybSB2YWxpZGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgc2V0dXBGb3JtVmFsaWRhdGlvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBTa2lwIGlmIEZvcm0gb2JqZWN0IGlzIG5vdCBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtID09PSAndW5kZWZpbmVkJyB8fCAhRm9ybS52YWxpZGF0ZVJ1bGVzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgJGZpZWxkLmF0dHIoJ2lkJyk7XG4gICAgICAgIGlmICghZmllbGROYW1lKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBjdXN0b20gcnVsZXMgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGlvblJ1bGVzKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXNbZmllbGROYW1lXSA9IG9wdGlvbnMudmFsaWRhdGlvblJ1bGVzO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBtb2RlXG4gICAgICAgIGNvbnN0IHJ1bGVzID0gW107XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbm9uLWVtcHR5IHJ1bGUgZm9yIGhhcmQgdmFsaWRhdGlvblxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0aW9uID09PSB0aGlzLlZBTElEQVRJT04uSEFSRCkge1xuICAgICAgICAgICAgcnVsZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wd19WYWxpZGF0ZVBhc3N3b3JkRW1wdHlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgc3RyZW5ndGggdmFsaWRhdGlvblxuICAgICAgICBpZiAob3B0aW9ucy5taW5TY29yZSA+IDAgJiYgb3B0aW9ucy52YWxpZGF0aW9uID09PSB0aGlzLlZBTElEQVRJT04uSEFSRCkge1xuICAgICAgICAgICAgcnVsZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3Bhc3N3b3JkU3RyZW5ndGgnLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnB3X1ZhbGlkYXRlUGFzc3dvcmRXZWFrXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHJ1bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlc1tmaWVsZE5hbWVdID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGZpZWxkTmFtZSxcbiAgICAgICAgICAgICAgICBydWxlczogcnVsZXNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBwYXNzd29yZCBzdHJlbmd0aFxuICAgICAgICBpZiAodHlwZW9mICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5wYXNzd29yZFN0cmVuZ3RoID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnBhc3N3b3JkU3RyZW5ndGggPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlLnN0YXRlLnNjb3JlID49IG9wdGlvbnMubWluU2NvcmU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBwYXNzd29yZCBpcyBtYXNrZWQgKHNlcnZlciByZXR1cm5zIHRoZXNlIHdoZW4gcGFzc3dvcmQgaXMgaGlkZGVuKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIGNoZWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgcGFzc3dvcmQgYXBwZWFycyB0byBiZSBtYXNrZWRcbiAgICAgKi9cbiAgICBpc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSB7XG4gICAgICAgIHJldHVybiAvXlt4WF17Nix9JHxeXFwqezYsfSR8XkhJRERFTiR8Xk1BU0tFRCQvaS50ZXN0KHBhc3N3b3JkKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbnB1dCBldmVudCB3aXRoIGRlYm91bmNpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBoYW5kbGVJbnB1dChpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0IHBhc3N3b3JkID0gJGZpZWxkLnZhbCgpO1xuXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBpZiBkaXNhYmxlZFxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0aW9uID09PSB0aGlzLlZBTElEQVRJT04uTk9ORSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGZvciBtYXNrZWQgcGFzc3dvcmRzXG4gICAgICAgIGlmICh0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgdGhpcyBpcyBhIGdlbmVyYXRlZCBwYXNzd29yZCAoYWxyZWFkeSB2YWxpZGF0ZWQgaW4gc2V0R2VuZXJhdGVkUGFzc3dvcmQpXG4gICAgICAgIGlmIChpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZCkge1xuICAgICAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNHZW5lcmF0ZWQgPSBmYWxzZTsgLy8gUmVzZXQgZmxhZyBmb3IgbmV4dCBpbnB1dFxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWx3YXlzIHZhbGlkYXRlIHBhc3N3b3JkIHdpdGggZGVib3VuY2UgKGRvbid0IHJlcXVpcmUgZm9jdXMpXG4gICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZFdpdGhEZWJvdW5jZShpbnN0YW5jZSwgcGFzc3dvcmQsIDUwMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBwYXN0ZSBpbnB1dCBldmVudCB3aXRob3V0IGRlYm91bmNpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBoYW5kbGVQYXN0ZUlucHV0KGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgcGFzc3dvcmQgPSAkZmllbGQudmFsKCk7XG5cbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGlmIGRpc2FibGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gZm9yIG1hc2tlZCBwYXNzd29yZHNcbiAgICAgICAgaWYgKHRoaXMuaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFZhbGlkYXRlIGltbWVkaWF0ZWx5IHdpdGhvdXQgZGVib3VuY2UgZm9yIHBhc3RlXG4gICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgcGFzc3dvcmQgd2l0aCBkZWJvdW5jaW5nIGZvciB0eXBpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB0byB2YWxpZGF0ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZWJvdW5jZVRpbWUgLSBEZWJvdW5jZSBkZWxheSBpbiBtaWxsaXNlY29uZHNcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVBhc3N3b3JkV2l0aERlYm91bmNlKGluc3RhbmNlLCBwYXNzd29yZCwgZGVib3VuY2VUaW1lID0gNTAwKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHRpbWVyXG4gICAgICAgIGlmICh0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0pIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdyBpbW1lZGlhdGUgbG9jYWwgZmVlZGJhY2sgd2hpbGUgd2FpdGluZyAoYWx3YXlzIHNob3cgcHJvZ3Jlc3MgYmFyIHdoZW4gdHlwaW5nKVxuICAgICAgICBpZiAocGFzc3dvcmQgJiYgcGFzc3dvcmQgIT09ICcnICYmICF0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICBjb25zdCBsb2NhbFNjb3JlID0gdGhpcy5zY29yZVBhc3N3b3JkTG9jYWwocGFzc3dvcmQpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzc0JhcihpbnN0YW5jZSwgbG9jYWxTY29yZSk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgcHJvZ3Jlc3Mgc2VjdGlvbiB3aGVuIHR5cGluZyAoZG9uJ3QgcmVxdWlyZSBmb2N1cyBmb3IgaW1tZWRpYXRlIGZlZWRiYWNrKVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZm9yIGVtcHR5IHBhc3N3b3JkXG4gICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdGltZXIgZm9yIGZ1bGwgdmFsaWRhdGlvbiAoaW5jbHVkaW5nIEFQSSBjYWxsIGFuZCB3YXJuaW5ncylcbiAgICAgICAgdGhpcy52YWxpZGF0aW9uVGltZXJzW2luc3RhbmNlLmZpZWxkSWRdID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBPbmx5IGRvIGZ1bGwgdmFsaWRhdGlvbiBpZiBmaWVsZCBzdGlsbCBoYXMgdGhlIHNhbWUgdmFsdWVcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS4kZmllbGQudmFsKCkgPT09IHBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGRlYm91bmNlVGltZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIHBhc3N3b3JkIGltbWVkaWF0ZWx5XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3N3b3JkIC0gUGFzc3dvcmQgdG8gdmFsaWRhdGVcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCkge1xuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuXG4gICAgICAgIC8vIENsZWFyIHByZXZpb3VzIHdhcm5pbmdzIGF0IHRoZSBzdGFydCBvZiB2YWxpZGF0aW9uXG4gICAgICAgIHRoaXMuaGlkZVdhcm5pbmdzKGluc3RhbmNlKTtcblxuICAgICAgICAvLyBIYW5kbGUgZW1wdHkgcGFzc3dvcmRcbiAgICAgICAgaWYgKCFwYXNzd29yZCB8fCBwYXNzd29yZCA9PT0gJycpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBmb3IgbWFza2VkIHBhc3N3b3Jkc1xuICAgICAgICBpZiAodGhpcy5pc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2hvdyBwcm9ncmVzcyBzZWN0aW9uIHdoZW4gdmFsaWRhdGluZ1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93IGltbWVkaWF0ZSBsb2NhbCBmZWVkYmFja1xuICAgICAgICBjb25zdCBsb2NhbFNjb3JlID0gdGhpcy5zY29yZVBhc3N3b3JkTG9jYWwocGFzc3dvcmQpO1xuICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzQmFyKGluc3RhbmNlLCBsb2NhbFNjb3JlKTtcblxuICAgICAgICAvLyBCdWlsZCBhIGxvY2FsLXNjb3JpbmcgcmVzdWx0IHVzZWQgd2hlbiBzZXJ2ZXIgdmFsaWRhdGlvbiBpcyB1bmF2YWlsYWJsZS5cbiAgICAgICAgLy8gbWVzc2FnZXMgY2FycmllcyBhIGdlbmVyaWMgd2Vhay1wYXNzd29yZCBoaW50IHdoZW4gdGhlIGxvY2FsIHNjb3JlIGlzIGJlbG93XG4gICAgICAgIC8vIHRoZSBtaW5pbXVtLCBzbyBIQVJEIHZhbGlkYXRpb24gc3RpbGwgc2hvd3MgYW4gYWN0aW9uYWJsZSBwcm9tcHQgaW5zdGVhZCBvZiBhXG4gICAgICAgIC8vIGJhcmUgXCJJbnZhbGlkIHBhc3N3b3JkXCIgKHRoZSBwZXItcnVsZSBzZXJ2ZXIgZ3VpZGFuY2UgY2Fubm90IGJlIHJlcHJvZHVjZWRcbiAgICAgICAgLy8gY2xpZW50LXNpZGUsIGJ1dCBhIHdlYWstcGFzc3dvcmQgbm90aWNlIGlzIGJldHRlciB0aGFuIG5vdGhpbmcpLlxuICAgICAgICBjb25zdCBsb2NhbFJlc3VsdCA9IHtcbiAgICAgICAgICAgIHNjb3JlOiBsb2NhbFNjb3JlLFxuICAgICAgICAgICAgaXNWYWxpZDogbG9jYWxTY29yZSA+PSBvcHRpb25zLm1pblNjb3JlLFxuICAgICAgICAgICAgc3RyZW5ndGg6IHRoaXMuZ2V0U3RyZW5ndGhMYWJlbChsb2NhbFNjb3JlKSxcbiAgICAgICAgICAgIG1lc3NhZ2VzOiBsb2NhbFNjb3JlID49IG9wdGlvbnMubWluU2NvcmVcbiAgICAgICAgICAgICAgICA/IFtdXG4gICAgICAgICAgICAgICAgOiBbZ2xvYmFsVHJhbnNsYXRlLnBzd19XZWFrUGFzc3dvcmRdXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXNlIEFQSSBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBQYXNzd29yZHNBUEkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBQYXNzd29yZHNBUEkudmFsaWRhdGVQYXNzd29yZChwYXNzd29yZCwgaW5zdGFuY2UuZmllbGRJZCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgYWN0IHdoaWxlIHRoZSBmaWVsZCBzdGlsbCBob2xkcyB0aGUgc2FtZSBwYXNzd29yZCDigJQgYSBsYXRlXG4gICAgICAgICAgICAgICAgLy8gcmVzcG9uc2UgZm9yIGEgc3RhbGUgdmFsdWUgbXVzdCBub3Qgb3ZlcndyaXRlIGN1cnJlbnQgc3RhdGUuXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLiRmaWVsZC52YWwoKSAhPT0gcGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBQcmVmZXIgdGhlIGF1dGhvcml0YXRpdmUgc2VydmVyIHZlcmRpY3QgKGl0IGluY2x1ZGVzIHRoZSBkaWN0aW9uYXJ5XG4gICAgICAgICAgICAgICAgLy8gY2hlY2spLiBPbiBBTlkgZmFpbHVyZSDigJQgYSA0MDMgZm9yIGEgcmVzdHJpY3RlZCBNb2R1bGVVc2Vyc1VJIHJvbGUsIG9yXG4gICAgICAgICAgICAgICAgLy8gYSB0cmFuc2llbnQgNXh4L25ldHdvcmsgZXJyb3Ig4oCUIGZhbGwgYmFjayB0byBsb2NhbCBzY29yaW5nLiBUaGlzIGlzXG4gICAgICAgICAgICAgICAgLy8gaW1wb3J0YW50OiBzdGF0ZS5zY29yZSBNVVNUIHJlZmxlY3QgdGhlIHBhc3N3b3JkIGN1cnJlbnRseSBpbiB0aGVcbiAgICAgICAgICAgICAgICAvLyBmaWVsZC4gTGVhdmluZyB0aGUgcHJldmlvdXMgc2VydmVyIHZlcmRpY3QgaW4gcGxhY2Ugd291bGQgbGV0IGEgc3Ryb25nXG4gICAgICAgICAgICAgICAgLy8gcGFzc3dvcmQncyBzdGFsZSBoaWdoIHNjb3JlIHBhc3MgdGhlIHN1Ym1pdCBnYXRlIGFmdGVyIHRoZSB1c2VyIGVkaXRzXG4gICAgICAgICAgICAgICAgLy8gaXQgZG93biB0byBhIHdlYWsgb25lIGFuZCB0aGUgcmUtdmFsaWRhdGlvbiByZXF1ZXN0IGZhaWxzLlxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgcmVzdWx0IHx8IGxvY2FsUmVzdWx0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUGFzc3dvcmRzQVBJIG5vdCBsb2FkZWQgYXQgYWxsIOKAlCBsb2NhbCBzY29yaW5nIGlzIHRoZSBvbmx5IG9wdGlvbi5cbiAgICAgICAgICAgIHRoaXMuaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgbG9jYWxSZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgcGFzc3dvcmQgc2NvcmUgbG9jYWxseVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIHNjb3JlXG4gICAgICogQHJldHVybnMge251bWJlcn0gU2NvcmUgZnJvbSAwLTEwMFxuICAgICAqL1xuICAgIHNjb3JlUGFzc3dvcmRMb2NhbChwYXNzd29yZCkge1xuICAgICAgICBsZXQgc2NvcmUgPSAwO1xuICAgICAgICBpZiAoIXBhc3N3b3JkIHx8IHBhc3N3b3JkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHNjb3JlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsZW5ndGggPSBwYXNzd29yZC5sZW5ndGg7XG4gICAgICAgIFxuICAgICAgICAvLyBMZW5ndGggc2NvcmluZyAodXAgdG8gMzAgcG9pbnRzKVxuICAgICAgICBpZiAobGVuZ3RoID49IDE2KSB7XG4gICAgICAgICAgICBzY29yZSArPSAzMDtcbiAgICAgICAgfSBlbHNlIGlmIChsZW5ndGggPj0gMTIpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDIwO1xuICAgICAgICB9IGVsc2UgaWYgKGxlbmd0aCA+PSA4KSB7XG4gICAgICAgICAgICBzY29yZSArPSAxMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNjb3JlICs9IE1hdGgubWF4KDAsIGxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoYXJhY3RlciBkaXZlcnNpdHkgKHVwIHRvIDQwIHBvaW50cylcbiAgICAgICAgaWYgKC9bYS16XS8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAvLyBMb3dlcmNhc2VcbiAgICAgICAgaWYgKC9bQS1aXS8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAvLyBVcHBlcmNhc2VcbiAgICAgICAgaWYgKC9cXGQvLnRlc3QocGFzc3dvcmQpKSBzY29yZSArPSAxMDsgICAgIC8vIERpZ2l0c1xuICAgICAgICBsZXQgZGl2ZXJzaXR5ID0gMDtcbiAgICAgICAgaWYgKC9bYS16XS8udGVzdChwYXNzd29yZCkpIGRpdmVyc2l0eSArPSAxO1xuICAgICAgICBpZiAoL1tBLVpdLy50ZXN0KHBhc3N3b3JkKSkgZGl2ZXJzaXR5ICs9IDE7XG4gICAgICAgIGlmICgvXFxkLy50ZXN0KHBhc3N3b3JkKSkgZGl2ZXJzaXR5ICs9IDE7XG4gICAgICAgIGlmICgvW15hLXpBLVowLTldLy50ZXN0KHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTA7IC8vIFNwZWNpYWwgY2hhcmFjdGVyc1xuICAgICAgICAgICAgZGl2ZXJzaXR5ICs9IDE7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFBhdHRlcm4gY29tcGxleGl0eSAodXAgdG8gMzAgcG9pbnRzKVxuICAgICAgICBjb25zdCB1bmlxdWVDaGFycyA9IG5ldyBTZXQocGFzc3dvcmQpLnNpemU7XG4gICAgICAgIGNvbnN0IHVuaXF1ZVJhdGlvID0gdW5pcXVlQ2hhcnMgLyBsZW5ndGg7XG4gICAgICAgIFxuICAgICAgICBpZiAodW5pcXVlUmF0aW8gPiAwLjcpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDIwO1xuICAgICAgICB9IGVsc2UgaWYgKHVuaXF1ZVJhdGlvID4gMC41KSB7XG4gICAgICAgICAgICBzY29yZSArPSAxNTtcbiAgICAgICAgfSBlbHNlIGlmICh1bmlxdWVSYXRpbyA+IDAuMykge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzY29yZSArPSA1O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBCb251cyBmb3IgbWl4aW5nIGF0IGxlYXN0IHRocmVlIGNoYXJhY3RlciBjbGFzc2VzIGluIGEgbG9uZyBwYXNzd29yZC5cbiAgICAgICAgaWYgKGRpdmVyc2l0eSA+PSAzICYmIGxlbmd0aCA+PSAxMikge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBIHRocmVlLWNoYXJhY3RlciBydW4gaW4gYSBsb25nLCBkaXZlcnNlIG1hY2hpbmUtZ2VuZXJhdGVkIHRva2VuIGRvZXNcbiAgICAgICAgLy8gbm90IG1hdGVyaWFsbHkgcmVkdWNlIGl0cyBlbnRyb3B5LiBLZWVwIHBlbmFsaXppbmcgbG93LWRpdmVyc2l0eSBpbnB1dC5cbiAgICAgICAgY29uc3QgbG9va3NMaWtlRGl2ZXJzZU1hY2hpbmVUb2tlbiA9IGxlbmd0aCA+PSAyMCAmJiB1bmlxdWVSYXRpbyA+IDAuMztcbiAgICAgICAgY29uc3QgaGFzTG9uZ1JlcGVhdGVkUnVuID0gLyguKVxcMXszLH0vLnRlc3QocGFzc3dvcmQpO1xuICAgICAgICBpZiAoLyguKVxcMXsyLH0vLnRlc3QocGFzc3dvcmQpXG4gICAgICAgICAgICAmJiAoIWxvb2tzTGlrZURpdmVyc2VNYWNoaW5lVG9rZW4gfHwgaGFzTG9uZ1JlcGVhdGVkUnVuKSkge1xuICAgICAgICAgICAgc2NvcmUgLT0gMTA7IC8vIFJlcGVhdGluZyBjaGFyYWN0ZXJzXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzZXF1ZW50aWFsUGF0dGVybnMgPSBbXG4gICAgICAgICAgICAncXdlcnR5JywgJ2FzZGZnaCcsICd6eGN2Ym4nLFxuICAgICAgICAgICAgJzEyMzQ1JywgJzIzNDU2JywgJzM0NTY3JywgJzQ1Njc4JywgJzU2Nzg5JyxcbiAgICAgICAgICAgICdhYmNkZScsICdiY2RlZicsICdjZGVmZycsICdkZWZnaCdcbiAgICAgICAgXTtcbiAgICAgICAgY29uc3QgbG93ZXJQYXNzd29yZCA9IHBhc3N3b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChzZXF1ZW50aWFsUGF0dGVybnMuc29tZSgocGF0dGVybikgPT4gKFxuICAgICAgICAgICAgbG93ZXJQYXNzd29yZC5pbmNsdWRlcyhwYXR0ZXJuKVxuICAgICAgICAgICAgfHwgbG93ZXJQYXNzd29yZC5pbmNsdWRlcyhwYXR0ZXJuLnNwbGl0KCcnKS5yZXZlcnNlKCkuam9pbignJykpXG4gICAgICAgICkpKSB7XG4gICAgICAgICAgICBzY29yZSAtPSAxMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgvXlthLXpdKyQvaS50ZXN0KHBhc3N3b3JkKSAmJiBsZW5ndGggPCAxMCkge1xuICAgICAgICAgICAgc2NvcmUgLT0gMTU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1pbigxMDAsIHNjb3JlKSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc3RyZW5ndGggbGFiZWwgZm9yIHNjb3JlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3JlIC0gUGFzc3dvcmQgc2NvcmVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTdHJlbmd0aCBsYWJlbFxuICAgICAqL1xuICAgIGdldFN0cmVuZ3RoTGFiZWwoc2NvcmUpIHtcbiAgICAgICAgaWYgKHNjb3JlIDwgMjApIHJldHVybiAndmVyeV93ZWFrJztcbiAgICAgICAgaWYgKHNjb3JlIDwgNDApIHJldHVybiAnd2Vhayc7XG4gICAgICAgIGlmIChzY29yZSA8IDYwKSByZXR1cm4gJ2ZhaXInO1xuICAgICAgICBpZiAoc2NvcmUgPCA4MCkgcmV0dXJuICdnb29kJztcbiAgICAgICAgcmV0dXJuICdzdHJvbmcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHByb2dyZXNzIGJhclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29yZSAtIFBhc3N3b3JkIHNjb3JlXG4gICAgICovXG4gICAgdXBkYXRlUHJvZ3Jlc3NCYXIoaW5zdGFuY2UsIHNjb3JlKSB7XG4gICAgICAgIGNvbnN0IHsgZWxlbWVudHMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFlbGVtZW50cy4kcHJvZ3Jlc3NCYXIgfHwgZWxlbWVudHMuJHByb2dyZXNzQmFyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3NcbiAgICAgICAgZWxlbWVudHMuJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcbiAgICAgICAgICAgIHBlcmNlbnQ6IE1hdGgubWluKHNjb3JlLCAxMDApLFxuICAgICAgICAgICAgc2hvd0FjdGl2aXR5OiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY29sb3JcbiAgICAgICAgZWxlbWVudHMuJHByb2dyZXNzQmFyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JlZCBvcmFuZ2UgeWVsbG93IG9saXZlIGdyZWVuJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyh0aGlzLmdldENvbG9yRm9yU2NvcmUoc2NvcmUpKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjb2xvciBjbGFzcyBmb3Igc2NvcmVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcmUgLSBQYXNzd29yZCBzY29yZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IENvbG9yIGNsYXNzIG5hbWVcbiAgICAgKi9cbiAgICBnZXRDb2xvckZvclNjb3JlKHNjb3JlKSB7XG4gICAgICAgIGlmIChzY29yZSA8IDIwKSByZXR1cm4gJ3JlZCc7XG4gICAgICAgIGlmIChzY29yZSA8IDQwKSByZXR1cm4gJ29yYW5nZSc7XG4gICAgICAgIGlmIChzY29yZSA8IDYwKSByZXR1cm4gJ3llbGxvdyc7XG4gICAgICAgIGlmIChzY29yZSA8IDgwKSByZXR1cm4gJ29saXZlJztcbiAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgdmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gVmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKi9cbiAgICBoYW5kbGVWYWxpZGF0aW9uUmVzdWx0KGluc3RhbmNlLCByZXN1bHQpIHtcbiAgICAgICAgaWYgKCFyZXN1bHQpIHJldHVybjtcblxuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuXG4gICAgICAgIC8vIEFsd2F5cyBjbGVhciB3YXJuaW5ncyBmaXJzdCB0byBlbnN1cmUgY2xlYW4gc3RhdGVcbiAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0ZS5cbiAgICAgICAgLy8gQSBoaWdoIHNjb3JlIHJlc2N1ZXMgaXNWYWxpZDogdGhlIGV4dGVuc2lvbiBzdWJtaXQgZ2F0ZSAoYW5kIHRoZSB3aWRnZXQncyBvd25cbiAgICAgICAgLy8gSEFSRCBydWxlKSBqdWRnZSBzdHJlbmd0aCBieSBzY29yZSwgc28gYSBwYXNzd29yZCB0aGUgc2VydmVyIGZsYWdzIChlLmcuIGFcbiAgICAgICAgLy8gZGljdGlvbmFyeSBoaXQpIGJ1dCB0aGF0IHN0aWxsIHNjb3JlcyA+PSBtaW5TY29yZSBpcyB0cmVhdGVkIGFzIGFjY2VwdGFibGUuXG4gICAgICAgIC8vIFRoaXMga2VlcHMgdGhlIHdhcm5pbmcvdmFsaWRpdHkgaW4gc3RlcCB3aXRoIHRoZSBzY29yZS1iYXNlZCBzdWJtaXQgZ2F0ZSDigJRcbiAgICAgICAgLy8gc2hvd2luZyBhIGJsb2NraW5nIGVycm9yIHRoZSBmb3JtIHRoZW4gaWdub3JlcyB3b3VsZCBvbmx5IGNvbmZ1c2UgdGhlIHVzZXIuXG4gICAgICAgIGluc3RhbmNlLnN0YXRlID0ge1xuICAgICAgICAgICAgaXNWYWxpZDogcmVzdWx0LmlzVmFsaWQgfHwgcmVzdWx0LnNjb3JlID49IG9wdGlvbnMubWluU2NvcmUsXG4gICAgICAgICAgICBzY29yZTogcmVzdWx0LnNjb3JlLFxuICAgICAgICAgICAgc3RyZW5ndGg6IHJlc3VsdC5zdHJlbmd0aCB8fCB0aGlzLmdldFN0cmVuZ3RoTGFiZWwocmVzdWx0LnNjb3JlKSxcbiAgICAgICAgICAgIG1lc3NhZ2VzOiByZXN1bHQubWVzc2FnZXMgfHwgW10sXG4gICAgICAgICAgICBpc0dlbmVyYXRlZDogaW5zdGFuY2Uuc3RhdGUuaXNHZW5lcmF0ZWRcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBVcGRhdGUgVUlcbiAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzc0JhcihpbnN0YW5jZSwgcmVzdWx0LnNjb3JlKTtcblxuICAgICAgICAvLyBTaG93IHdhcm5pbmdzL2Vycm9ycyBvbmx5IGlmIHRoZXJlIGFyZSBtZXNzYWdlcyBBTkQgcGFzc3dvcmQgaXMgbm90IHN0cm9uZyBlbm91Z2hcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1dhcm5pbmdzICYmIHJlc3VsdC5tZXNzYWdlcyAmJiByZXN1bHQubWVzc2FnZXMubGVuZ3RoID4gMCAmJiAhaW5zdGFuY2Uuc3RhdGUuaXNWYWxpZCkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZVR5cGUgPSBpbnN0YW5jZS5zdGF0ZS5pc1ZhbGlkID8gJ3dhcm5pbmcnIDogJ2Vycm9yJztcbiAgICAgICAgICAgIHRoaXMuc2hvd1dhcm5pbmdzKGluc3RhbmNlLCByZXN1bHQsIG1lc3NhZ2VUeXBlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbGwgdmFsaWRhdGlvbiBjYWxsYmFja1xuICAgICAgICBpZiAob3B0aW9ucy5vblZhbGlkYXRlKSB7XG4gICAgICAgICAgICBvcHRpb25zLm9uVmFsaWRhdGUoaW5zdGFuY2Uuc3RhdGUuaXNWYWxpZCwgcmVzdWx0LnNjb3JlLCByZXN1bHQubWVzc2FnZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gdmFsaWRhdGlvbiBzdGF0ZVxuICAgICAgICBpZiAoRm9ybSAmJiBGb3JtLiRmb3JtT2JqKSB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBpbnN0YW5jZS4kZmllbGQuYXR0cignbmFtZScpIHx8IGluc3RhbmNlLiRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKCFpbnN0YW5jZS5zdGF0ZS5pc1ZhbGlkICYmIG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLkhBUkQpIHtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ2FkZCBwcm9tcHQnLCBmaWVsZE5hbWUsIHJlc3VsdC5tZXNzYWdlc1swXSB8fCAnSW52YWxpZCBwYXNzd29yZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCBmaWVsZE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIHBhc3N3b3JkIGxvY2FsbHkgKGZhbGxiYWNrIHdoZW4gdGhlIEFQSSBpcyB1bmF2YWlsYWJsZSBvciBmYWlscykuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBXaWRnZXQgb3B0aW9ucyAoZ2VuZXJhdGVMZW5ndGgsIGluY2x1ZGVTcGVjaWFsKVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEdlbmVyYXRlZCBwYXNzd29yZFxuICAgICAqL1xuICAgIGdlbmVyYXRlTG9jYWxQYXNzd29yZChvcHRpb25zKSB7XG4gICAgICAgIGxldCBjaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSc7XG4gICAgICAgIGlmIChvcHRpb25zLmluY2x1ZGVTcGVjaWFsKSB7XG4gICAgICAgICAgICBjaGFycyArPSAnIUAjJCVeJionO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIHRoZSBjcnlwdG9ncmFwaGljYWxseSBzZWN1cmUgUk5HOiB0aGlzIGZhbGxiYWNrIHByb2R1Y2VzIHJlYWwgYWNjb3VudFxuICAgICAgICAvLyBjcmVkZW50aWFscyAoU0lQL0FNSS9TU0gpIHdoZW4gdGhlIHNlcnZlciBnZW5lcmF0b3IgaXMgdW5yZWFjaGFibGUsIHNvXG4gICAgICAgIC8vIE1hdGgucmFuZG9tKCkg4oCUIHByZWRpY3RhYmxlIGFuZCBub3QgY3J5cHRvLWdyYWRlIOKAlCBtdXN0IG5vdCBiZSB1c2VkLlxuICAgICAgICBjb25zdCBsZW5ndGggPSBvcHRpb25zLmdlbmVyYXRlTGVuZ3RoO1xuICAgICAgICBjb25zdCByYW5kb21WYWx1ZXMgPSBuZXcgVWludDMyQXJyYXkobGVuZ3RoKTtcbiAgICAgICAgd2luZG93LmNyeXB0by5nZXRSYW5kb21WYWx1ZXMocmFuZG9tVmFsdWVzKTtcblxuICAgICAgICBsZXQgcGFzc3dvcmQgPSAnJztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcGFzc3dvcmQgKz0gY2hhcnMuY2hhckF0KHJhbmRvbVZhbHVlc1tpXSAlIGNoYXJzLmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhc3N3b3JkO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBwYXNzd29yZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGdlbmVyYXRlUGFzc3dvcmQoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyBvcHRpb25zIH0gPSBpbnN0YW5jZTtcblxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZW5lcmF0ZSBwYXNzd29yZFxuICAgICAgICBjb25zdCBnZW5lcmF0ZUNhbGxiYWNrID0gKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgbGV0IHBhc3N3b3JkID0gdHlwZW9mIHJlc3VsdCA9PT0gJ3N0cmluZycgPyByZXN1bHQgOiAocmVzdWx0ICYmIHJlc3VsdC5wYXNzd29yZCk7XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSBBUEkgY2FsbCBmYWlsZWQgKHJlc3VsdCBpcyBmYWxzZS9lbXB0eSksIGZhbGwgYmFjayB0byBsb2NhbFxuICAgICAgICAgICAgLy8gZ2VuZXJhdGlvbiBzbyB0aGUgYnV0dG9uIGFsd2F5cyB5aWVsZHMgYSB1c2FibGUgcGFzc3dvcmQgaW5zdGVhZCBvZlxuICAgICAgICAgICAgLy8gc2lsZW50bHkgYmxhbmtpbmcgdGhlIGZpZWxkIHdpdGggYHVuZGVmaW5lZGAuXG4gICAgICAgICAgICBpZiAoIXBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgcGFzc3dvcmQgPSB0aGlzLmdlbmVyYXRlTG9jYWxQYXNzd29yZChvcHRpb25zKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2V0IHBhc3N3b3JkXG4gICAgICAgICAgICB0aGlzLnNldEdlbmVyYXRlZFBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENhbGwgY2FsbGJhY2tcbiAgICAgICAgICAgIGlmIChvcHRpb25zLm9uR2VuZXJhdGUpIHtcbiAgICAgICAgICAgICAgICBvcHRpb25zLm9uR2VuZXJhdGUocGFzc3dvcmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFVzZSBBUEkgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgUGFzc3dvcmRzQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgUGFzc3dvcmRzQVBJLmdlbmVyYXRlUGFzc3dvcmQob3B0aW9ucy5nZW5lcmF0ZUxlbmd0aCwgZ2VuZXJhdGVDYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBnZW5lcmF0ZUNhbGxiYWNrKHRoaXMuZ2VuZXJhdGVMb2NhbFBhc3N3b3JkKG9wdGlvbnMpKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IGdlbmVyYXRlZCBwYXNzd29yZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIEdlbmVyYXRlZCBwYXNzd29yZFxuICAgICAqL1xuICAgIHNldEdlbmVyYXRlZFBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgJGNvbnRhaW5lciwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgZ2VuZXJhdGVkIGZsYWcgZmlyc3QgdG8gcHJldmVudCBkdXBsaWNhdGUgdmFsaWRhdGlvblxuICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdmFsdWUgd2l0aG91dCB0cmlnZ2VyaW5nIGNoYW5nZSBldmVudCB5ZXRcbiAgICAgICAgJGZpZWxkLnZhbChwYXNzd29yZCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNsaXBib2FyZCBidXR0b25zICh3aWRnZXQncyBhbmQgYW55IGV4dGVybmFsIG9uZXMpXG4gICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgcGFzc3dvcmQpO1xuICAgICAgICBcbiAgICAgICAgLy8gVmFsaWRhdGUgb25jZSBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGlvbiAhPT0gdGhpcy5WQUxJREFUSU9OLk5PTkUpIHtcbiAgICAgICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOb3cgdHJpZ2dlciBjaGFuZ2UgZm9yIGZvcm0gdHJhY2tpbmcgKHZhbGlkYXRpb24gYWxyZWFkeSBkb25lIGFib3ZlKVxuICAgICAgICAkZmllbGQudHJpZ2dlcignY2hhbmdlJylcbiAgICAgICAgXG4gICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2VcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgd2FybmluZ3NcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gVmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIE1lc3NhZ2UgdHlwZSAod2FybmluZy9lcnJvcilcbiAgICAgKi9cbiAgICBzaG93V2FybmluZ3MoaW5zdGFuY2UsIHJlc3VsdCwgdHlwZSA9ICd3YXJuaW5nJykge1xuICAgICAgICBpZiAoIWluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncykgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgeyBlbGVtZW50cyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0IGNvbG9yQ2xhc3MgPSB0eXBlID09PSAnZXJyb3InID8gJ3JlZCcgOiAnb3JhbmdlJztcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHdhcm5pbmdzXG4gICAgICAgIGVsZW1lbnRzLiR3YXJuaW5ncy5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHdhcm5pbmdzIGFzIHBvaW50aW5nIGxhYmVsXG4gICAgICAgIGlmIChyZXN1bHQubWVzc2FnZXMgJiYgcmVzdWx0Lm1lc3NhZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIENob29zZSBpY29uIGJhc2VkIG9uIG1lc3NhZ2UgdHlwZVxuICAgICAgICAgICAgY29uc3QgaWNvbkNsYXNzID0gdHlwZSA9PT0gJ2Vycm9yJyA/ICdleGNsYW1hdGlvbiBjaXJjbGUnIDogJ2V4Y2xhbWF0aW9uIHRyaWFuZ2xlJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIGxpc3QgaXRlbXMgZnJvbSBtZXNzYWdlcyB3aXRoIGljb25zXG4gICAgICAgICAgICBjb25zdCBsaXN0SXRlbXMgPSByZXN1bHQubWVzc2FnZXMubWFwKG1zZyA9PiBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2ljb25DbGFzc30gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4ke21zZ308L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApLmpvaW4oJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgcG9pbnRpbmcgYWJvdmUgbGFiZWwgd2l0aCBsaXN0IChwb2ludHMgdG8gcGFzc3dvcmQgZmllbGQpXG4gICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcG9pbnRpbmcgJHtjb2xvckNsYXNzfSBiYXNpYyBsYWJlbFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbGlzdFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtsaXN0SXRlbXN9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGVsZW1lbnRzLiR3YXJuaW5ncy5hcHBlbmQoJGxhYmVsKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgd2FybmluZ3NcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBoaWRlV2FybmluZ3MoaW5zdGFuY2UpIHtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncykge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzLmVtcHR5KCkuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUb2dnbGUgcGFzc3dvcmQgdmlzaWJpbGl0eVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHRvZ2dsZVBhc3N3b3JkVmlzaWJpbGl0eShpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRzaG93SGlkZUJ0biA9IGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bjtcbiAgICAgICAgXG4gICAgICAgIGlmICghJHNob3dIaWRlQnRuKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkaWNvbiA9ICRzaG93SGlkZUJ0bi5maW5kKCdpJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ3Bhc3N3b3JkJykge1xuICAgICAgICAgICAgLy8gU2hvdyBwYXNzd29yZFxuICAgICAgICAgICAgJGZpZWxkLmF0dHIoJ3R5cGUnLCAndGV4dCcpO1xuICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V5ZScpLmFkZENsYXNzKCdleWUgc2xhc2gnKTtcbiAgICAgICAgICAgICRzaG93SGlkZUJ0bi5hdHRyKCdkYXRhLWNvbnRlbnQnLCBnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEhpZGVQYXNzd29yZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIHBhc3N3b3JkXG4gICAgICAgICAgICAkZmllbGQuYXR0cigndHlwZScsICdwYXNzd29yZCcpO1xuICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V5ZSBzbGFzaCcpLmFkZENsYXNzKCdleWUnKTtcbiAgICAgICAgICAgICRzaG93SGlkZUJ0bi5hdHRyKCdkYXRhLWNvbnRlbnQnLCBnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFNob3dQYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIHZhbGlkYXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpIHtcbiAgICAgICAgLy8gQ2xlYXIgd2FybmluZ3Mgd2hlbiBleHBsaWNpdGx5IGNsZWFyaW5nIHZhbGlkYXRpb24gKGVtcHR5IHBhc3N3b3JkKVxuICAgICAgICB0aGlzLmhpZGVXYXJuaW5ncyhpbnN0YW5jZSk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3MoeyBwZXJjZW50OiAwIH0pO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbmNlLnN0YXRlID0ge1xuICAgICAgICAgICAgaXNWYWxpZDogdHJ1ZSxcbiAgICAgICAgICAgIHNjb3JlOiAwLFxuICAgICAgICAgICAgc3RyZW5ndGg6ICcnLFxuICAgICAgICAgICAgbWVzc2FnZXM6IFtdLFxuICAgICAgICAgICAgaXNHZW5lcmF0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgaXNGb2N1c2VkOiBpbnN0YW5jZS5zdGF0ZS5pc0ZvY3VzZWQgfHwgZmFsc2VcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIHBhc3N3b3JkIChtYW51YWwgdmFsaWRhdGlvbilcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjaGVja1Bhc3N3b3JkKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHBhc3N3b3JkID0gaW5zdGFuY2UuJGZpZWxkLnZhbCgpO1xuICAgICAgICBpZiAocGFzc3dvcmQgJiYgcGFzc3dvcmQgIT09ICcnKSB7XG4gICAgICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gZm9yIG1hc2tlZCBwYXNzd29yZHNcbiAgICAgICAgICAgIGlmICh0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZvciBpbml0aWFsIGNoZWNrLCBkb24ndCBzaG93IHByb2dyZXNzIGJhciBidXQgZG8gdmFsaWRhdGUgYW5kIHNob3cgd2FybmluZ3NcbiAgICAgICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgY29uZmlndXJhdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gaW5zdGFuY2VPckZpZWxkSWQgLSBJbnN0YW5jZSBvciBmaWVsZCBJRFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBuZXdPcHRpb25zIC0gTmV3IG9wdGlvbnNcbiAgICAgKi9cbiAgICB1cGRhdGVDb25maWcoaW5zdGFuY2VPckZpZWxkSWQsIG5ld09wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0eXBlb2YgaW5zdGFuY2VPckZpZWxkSWQgPT09ICdzdHJpbmcnIFxuICAgICAgICAgICAgPyB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VPckZpZWxkSWQpXG4gICAgICAgICAgICA6IGluc3RhbmNlT3JGaWVsZElkO1xuICAgICAgICAgICAgXG4gICAgICAgIGlmICghaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIG9wdGlvbnNcbiAgICAgICAgaW5zdGFuY2Uub3B0aW9ucyA9IHsgLi4uaW5zdGFuY2Uub3B0aW9ucywgLi4ubmV3T3B0aW9ucyB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGR5bmFtaWMgYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdzaG93UGFzc3dvcmRCdXR0b24nIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLnNob3dQYXNzd29yZEJ1dHRvbiAmJiAhaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGJ1dHRvbiBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRTaG93SGlkZUJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgLy8gUmUtYmluZCBldmVudHMgZm9yIHRoZSBuZXcgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4ub2ZmKCdjbGljay5wYXNzd29yZFdpZGdldCcpLm9uKCdjbGljay5wYXNzd29yZFdpZGdldCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZVBhc3N3b3JkVmlzaWJpbGl0eShpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW5ld09wdGlvbnMuc2hvd1Bhc3N3b3JkQnV0dG9uICYmIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBidXR0b24gaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBnZW5lcmF0ZSBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICBpZiAoJ2dlbmVyYXRlQnV0dG9uJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5nZW5lcmF0ZUJ1dHRvbiAmJiAhaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGJ1dHRvbiBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRHZW5lcmF0ZUJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgLy8gUmUtYmluZCBldmVudHMgZm9yIHRoZSBuZXcgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ub2ZmKCdjbGljay5wYXNzd29yZFdpZGdldCcpLm9uKCdjbGljay5wYXNzd29yZFdpZGdldCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cFxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucG9wdXAoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFuZXdPcHRpb25zLmdlbmVyYXRlQnV0dG9uICYmIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBidXR0b24gaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjbGlwYm9hcmQgYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdjbGlwYm9hcmRCdXR0b24nIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLmNsaXBib2FyZEJ1dHRvbiAmJiAhaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bikge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBidXR0b24gaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgIHRoaXMuYWRkQ2xpcGJvYXJkQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGNsaXBib2FyZCBmb3IgdGhlIG5ldyBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0biAmJiB0eXBlb2YgQ2xpcGJvYXJkSlMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgQ2xpcGJvYXJkSlMgZm9yIHRoZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmNsaXBib2FyZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0blswXSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwIGZvciBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzdWNjZXNzZnVsIGNvcHlcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICghbmV3T3B0aW9ucy5jbGlwYm9hcmRCdXR0b24gJiYgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bikge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBidXR0b24gaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmNsaXBib2FyZCkge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuY2xpcGJvYXJkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgc3RyZW5ndGggYmFyIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdzaG93U3RyZW5ndGhCYXInIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLnNob3dTdHJlbmd0aEJhcikge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1N0cmVuZ3RoQmFyKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU3RyZW5ndGhCYXIoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgd2FybmluZ3MgdmlzaWJpbGl0eVxuICAgICAgICBpZiAoJ3Nob3dXYXJuaW5ncycgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuc2hvd1dhcm5pbmdzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93V2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVXYXJuaW5ncyhpbnN0YW5jZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBpbnB1dCB3cmFwcGVyIGFjdGlvbiBjbGFzcyBiYXNlZCBvbiBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICB0aGlzLnVwZGF0ZUlucHV0V3JhcHBlckNsYXNzKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLXNldHVwIGZvcm0gdmFsaWRhdGlvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGluc3RhbmNlLm9wdGlvbnMudmFsaWRhdGlvbiAhPT0gdGhpcy5WQUxJREFUSU9OLk5PTkUpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dXBGb3JtVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGN1cnJlbnQgdmFsdWUgaWYgdmFsaWRhdGlvbiBjaGFuZ2VkXG4gICAgICAgIGlmICgndmFsaWRhdGlvbicgaW4gbmV3T3B0aW9ucyAmJiBpbnN0YW5jZS4kZmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tQYXNzd29yZChpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBpbnB1dCB3cmFwcGVyIGFjdGlvbiBjbGFzcyBiYXNlZCBvbiBidXR0b24gdmlzaWJpbGl0eVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHVwZGF0ZUlucHV0V3JhcHBlckNsYXNzKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSBpbnN0YW5jZS4kZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIGNvbnN0IGhhc0J1dHRvbnMgPSAhIShcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0biB8fCBcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0biB8fCBcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG5cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChoYXNCdXR0b25zKSB7XG4gICAgICAgICAgICAkaW5wdXRXcmFwcGVyLmFkZENsYXNzKCdhY3Rpb24nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRpbnB1dFdyYXBwZXIucmVtb3ZlQ2xhc3MoJ2FjdGlvbicpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgd2lkZ2V0IHN0YXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBpbnN0YW5jZU9yRmllbGRJZCAtIEluc3RhbmNlIG9yIGZpZWxkIElEXG4gICAgICogQHJldHVybnMge29iamVjdHxudWxsfSBXaWRnZXQgc3RhdGVcbiAgICAgKi9cbiAgICBnZXRTdGF0ZShpbnN0YW5jZU9yRmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHR5cGVvZiBpbnN0YW5jZU9yRmllbGRJZCA9PT0gJ3N0cmluZycgXG4gICAgICAgICAgICA/IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZU9yRmllbGRJZClcbiAgICAgICAgICAgIDogaW5zdGFuY2VPckZpZWxkSWQ7XG4gICAgICAgICAgICBcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlID8gaW5zdGFuY2Uuc3RhdGUgOiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBzdHJlbmd0aCBiYXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGluc3RhbmNlT3JGaWVsZElkIC0gSW5zdGFuY2Ugb3IgZmllbGQgSURcbiAgICAgKi9cbiAgICBzaG93U3RyZW5ndGhCYXIoaW5zdGFuY2VPckZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0eXBlb2YgaW5zdGFuY2VPckZpZWxkSWQgPT09ICdzdHJpbmcnIFxuICAgICAgICAgICAgPyB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VPckZpZWxkSWQpXG4gICAgICAgICAgICA6IGluc3RhbmNlT3JGaWVsZElkO1xuICAgICAgICAgICAgXG4gICAgICAgIGlmIChpbnN0YW5jZSAmJiBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBzdHJlbmd0aCBiYXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGluc3RhbmNlT3JGaWVsZElkIC0gSW5zdGFuY2Ugb3IgZmllbGQgSURcbiAgICAgKi9cbiAgICBoaWRlU3RyZW5ndGhCYXIoaW5zdGFuY2VPckZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0eXBlb2YgaW5zdGFuY2VPckZpZWxkSWQgPT09ICdzdHJpbmcnIFxuICAgICAgICAgICAgPyB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VPckZpZWxkSWQpXG4gICAgICAgICAgICA6IGluc3RhbmNlT3JGaWVsZElkO1xuICAgICAgICAgICAgXG4gICAgICAgIGlmIChpbnN0YW5jZSAmJiBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSB3aWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICovXG4gICAgZGVzdHJveShmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBVbmJpbmQgZXZlbnRzXG4gICAgICAgIGluc3RhbmNlLiRmaWVsZC5vZmYoJy5wYXNzd29yZFdpZGdldCcpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ub2ZmKCcucGFzc3dvcmRXaWRnZXQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4ub2ZmKCcucGFzc3dvcmRXaWRnZXQnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBjbGlwYm9hcmQgaW5zdGFuY2VcbiAgICAgICAgaWYgKGluc3RhbmNlLmNsaXBib2FyZCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIGRlbGV0ZSBpbnN0YW5jZS5jbGlwYm9hcmQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIHRpbWVyXG4gICAgICAgIGlmICh0aGlzLnZhbGlkYXRpb25UaW1lcnNbZmllbGRJZF0pIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnZhbGlkYXRpb25UaW1lcnNbZmllbGRJZF0pO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMudmFsaWRhdGlvblRpbWVyc1tmaWVsZElkXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGluc3RhbmNlXG4gICAgICAgIHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShmaWVsZElkKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgYWxsIGluc3RhbmNlc1xuICAgICAqL1xuICAgIGRlc3Ryb3lBbGwoKSB7XG4gICAgICAgIHRoaXMuaW5zdGFuY2VzLmZvckVhY2goKGluc3RhbmNlLCBmaWVsZElkKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koZmllbGRJZCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4iXX0=