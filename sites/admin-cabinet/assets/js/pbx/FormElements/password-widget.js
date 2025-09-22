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


    var $showHideBtn = $("\n            <button type=\"button\" class=\"ui basic icon button show-hide-password\" \n                    data-content=\"".concat(globalTranslate.bt_ToolTipShowPassword || 'Show password', "\">\n                <i class=\"eye icon\"></i>\n            </button>\n        ")); // Append to wrapper

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


    var $generateBtn = $("\n            <button type=\"button\" class=\"ui basic icon button generate-password\" \n                    data-content=\"".concat(globalTranslate.bt_ToolTipGeneratePassword || 'Generate password', "\">\n                <i class=\"sync icon\"></i>\n            </button>\n        ")); // Append to wrapper

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
    var $clipboardBtn = $("\n            <button type=\"button\" class=\"ui basic icon button clipboard\" \n                    data-clipboard-text=\"".concat(currentValue, "\"\n                    data-content=\"").concat(globalTranslate.bt_ToolTipCopyPassword || 'Copy password', "\">\n                <i class=\"icons\">\n                    <i class=\"icon copy\"></i>\n                    <i class=\"corner key icon\"></i>\n                </i>\n            </button>\n        ")); // Append to wrapper

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
      });
    } // Update clipboard button when password changes


    $field.on('input.passwordWidget change.passwordWidget', function () {
      var value = $field.val(); // Clear validation state on empty

      if (!value || value === '') {
        _this.clearValidation(instance);
      } // Update all clipboard buttons (widget's and any external ones)


      $('.clipboard').attr('data-clipboard-text', value);
    }); // Focus event - show progress bar when field is focused

    $field.off('focus.passwordWidget').on('focus.passwordWidget', function () {
      instance.state.isFocused = true; // Show progress bar if there's a password value

      var password = $field.val();

      if (password && password !== '' && !_this.isMaskedPassword(password)) {
        if (instance.elements.$progressSection) {
          instance.elements.$progressSection.show();
        } // Trigger validation to update progress bar


        if (options.validateOnInput) {
          _this.validatePassword(instance, password);
        }
      }
    }); // Blur event - hide progress bar when field loses focus

    $field.off('blur.passwordWidget').on('blur.passwordWidget', function () {
      instance.state.isFocused = false; // Hide only progress bar, keep warnings visible

      if (instance.elements.$progressSection) {
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
        prompt: globalTranslate.pw_ValidatePasswordEmpty || 'Password cannot be empty'
      });
    } // Add strength validation


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
   * Handle input event
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
    } // Validate password only if field is focused


    if (instance.state.isFocused) {
      this.validatePassword(instance, password);
    }
  },

  /**
   * Validate password
   * @param {object} instance - Widget instance
   * @param {string} password - Password to validate
   */
  validatePassword: function validatePassword(instance, password) {
    var _this2 = this;

    var options = instance.options; // Handle empty password

    if (!password || password === '') {
      this.clearValidation(instance);
      return;
    } // Skip validation for masked passwords (server returns these when password is hidden)
    // Common patterns: xxxxxxx, XXXXXXXX, *******, HIDDEN, etc.


    if (this.isMaskedPassword(password)) {
      this.clearValidation(instance);
      return;
    } // Show progress section only if field is focused


    if (instance.elements.$progressSection && instance.state.isFocused) {
      instance.elements.$progressSection.show();
    } // Check cache first


    var cacheKey = "".concat(instance.fieldId, ":").concat(password);

    if (this.validationCache[cacheKey]) {
      this.handleValidationResult(instance, this.validationCache[cacheKey]);
      return;
    } // Clear existing timer


    if (this.validationTimers[instance.fieldId]) {
      clearTimeout(this.validationTimers[instance.fieldId]);
    } // Show immediate local feedback


    var localScore = this.scorePasswordLocal(password);
    this.updateProgressBar(instance, localScore); // Debounce API call

    this.validationTimers[instance.fieldId] = setTimeout(function () {
      // Use API if available
      if (typeof PasswordValidationAPI !== 'undefined') {
        PasswordValidationAPI.validatePassword(password, instance.fieldId, function (result) {
          if (result) {
            // Cache result
            _this2.validationCache[cacheKey] = result;

            _this2.handleValidationResult(instance, result);
          }
        });
      } else {
        // Use local validation
        var result = {
          score: localScore,
          isValid: localScore >= options.minScore,
          strength: _this2.getStrengthLabel(localScore),
          messages: []
        };

        _this2.handleValidationResult(instance, result);
      }
    }, 700); // Increased debounce for more comfortable typing
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
    var options = instance.options; // Update state

    instance.state = {
      isValid: result.isValid || result.score >= options.minScore,
      score: result.score,
      strength: result.strength || this.getStrengthLabel(result.score),
      messages: result.messages || [],
      isGenerated: instance.state.isGenerated
    }; // Update UI

    this.updateProgressBar(instance, result.score); // Show warnings/errors

    if (options.showWarnings && result.messages && result.messages.length > 0) {
      var messageType = instance.state.isValid ? 'warning' : 'error';
      this.showWarnings(instance, result, messageType);
    } else {
      this.hideWarnings(instance);
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
    var _this3 = this;

    var options = instance.options; // Show loading state

    if (instance.elements.$generateBtn) {
      instance.elements.$generateBtn.addClass('loading');
    } // Generate password


    var generateCallback = function generateCallback(result) {
      var password = typeof result === 'string' ? result : result.password; // Set password

      _this3.setGeneratedPassword(instance, password); // Remove loading state


      if (instance.elements.$generateBtn) {
        instance.elements.$generateBtn.removeClass('loading');
      } // Call callback


      if (options.onGenerate) {
        options.onGenerate(password);
      }
    }; // Use API if available


    if (typeof PasswordValidationAPI !== 'undefined') {
      PasswordValidationAPI.generatePassword(options.generateLength, generateCallback);
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
    var _this4 = this;

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

            _this4.togglePasswordVisibility(instance);
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

            _this4.generatePassword(instance);
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
    var _this5 = this;

    this.instances.forEach(function (instance, fieldId) {
      _this5.destroy(fieldId);
    });
    this.validationCache = {};
  },

  /**
   * Clear validation cache
   */
  clearCache: function clearCache() {
    this.validationCache = {};
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvcGFzc3dvcmQtd2lkZ2V0LmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkV2lkZ2V0IiwiaW5zdGFuY2VzIiwiTWFwIiwiVkFMSURBVElPTiIsIkhBUkQiLCJTT0ZUIiwiTk9ORSIsInZhbGlkYXRpb25DYWNoZSIsInZhbGlkYXRpb25UaW1lcnMiLCJkZWZhdWx0cyIsInZhbGlkYXRpb24iLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm9uVmFsaWRhdGUiLCJvbkdlbmVyYXRlIiwidmFsaWRhdGlvblJ1bGVzIiwiaW5pdCIsInNlbGVjdG9yIiwib3B0aW9ucyIsIiRmaWVsZCIsIiQiLCJsZW5ndGgiLCJmaWVsZElkIiwiYXR0ciIsIk1hdGgiLCJyYW5kb20iLCJ0b1N0cmluZyIsInN1YnN0ciIsImhhcyIsImRlc3Ryb3kiLCJpbnN0YW5jZSIsIiRjb250YWluZXIiLCJjbG9zZXN0IiwiZWxlbWVudHMiLCJzdGF0ZSIsImlzVmFsaWQiLCJzY29yZSIsInN0cmVuZ3RoIiwibWVzc2FnZXMiLCJpc0dlbmVyYXRlZCIsImlzRm9jdXNlZCIsInNldCIsInNldHVwVUkiLCJiaW5kRXZlbnRzIiwic2V0dXBGb3JtVmFsaWRhdGlvbiIsInZhbCIsImNoZWNrUGFzc3dvcmQiLCIkaW5wdXRXcmFwcGVyIiwid3JhcCIsInBhcmVudCIsImRpc2FibGVQYXNzd29yZE1hbmFnZXJzIiwiYWRkU2hvd0hpZGVCdXR0b24iLCJhZGRHZW5lcmF0ZUJ1dHRvbiIsImFkZENsaXBib2FyZEJ1dHRvbiIsImFkZFN0cmVuZ3RoQmFyIiwiYWRkV2FybmluZ3NDb250YWluZXIiLCJ1cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyIsImZpbmQiLCIkc2hvd0hpZGVCdG4iLCJnbG9iYWxUcmFuc2xhdGUiLCJidF9Ub29sVGlwU2hvd1Bhc3N3b3JkIiwiYXBwZW5kIiwiJGdlbmVyYXRlQnRuIiwiYnRfVG9vbFRpcEdlbmVyYXRlUGFzc3dvcmQiLCIkY2xpcGJvYXJkQnRuIiwiY3VycmVudFZhbHVlIiwiYnRfVG9vbFRpcENvcHlQYXNzd29yZCIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc1NlY3Rpb24iLCIkd2FybmluZ3MiLCIkZm9ybSIsIm9uIiwicmVtb3ZlQXR0ciIsInByZXYiLCIkaG9uZXlwb3QiLCJiZWZvcmUiLCJvZmYiLCJlIiwicHJldmVudERlZmF1bHQiLCJ0b2dnbGVQYXNzd29yZFZpc2liaWxpdHkiLCJnZW5lcmF0ZVBhc3N3b3JkIiwiQ2xpcGJvYXJkSlMiLCJjbGlwYm9hcmQiLCJwb3B1cCIsInNldFRpbWVvdXQiLCJjbGVhclNlbGVjdGlvbiIsImhhbmRsZUlucHV0IiwidmFsdWUiLCJjbGVhclZhbGlkYXRpb24iLCJwYXNzd29yZCIsImlzTWFza2VkUGFzc3dvcmQiLCJzaG93IiwidmFsaWRhdGVQYXNzd29yZCIsImhpZGUiLCJkaXNhYmxlIiwicHJvcCIsImFkZENsYXNzIiwiZW5hYmxlIiwicmVtb3ZlQ2xhc3MiLCJzZXRSZWFkT25seSIsIkZvcm0iLCJ2YWxpZGF0ZVJ1bGVzIiwiZmllbGROYW1lIiwicnVsZXMiLCJwdXNoIiwidHlwZSIsInByb21wdCIsInB3X1ZhbGlkYXRlUGFzc3dvcmRFbXB0eSIsInB3X1ZhbGlkYXRlUGFzc3dvcmRXZWFrIiwiaWRlbnRpZmllciIsImZuIiwiZm9ybSIsInNldHRpbmdzIiwicGFzc3dvcmRTdHJlbmd0aCIsInRlc3QiLCJjYWNoZUtleSIsImhhbmRsZVZhbGlkYXRpb25SZXN1bHQiLCJjbGVhclRpbWVvdXQiLCJsb2NhbFNjb3JlIiwic2NvcmVQYXNzd29yZExvY2FsIiwidXBkYXRlUHJvZ3Jlc3NCYXIiLCJQYXNzd29yZFZhbGlkYXRpb25BUEkiLCJyZXN1bHQiLCJnZXRTdHJlbmd0aExhYmVsIiwidW5pcXVlQ2hhcnMiLCJTZXQiLCJzaXplIiwidW5pcXVlUmF0aW8iLCJtYXgiLCJtaW4iLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJzaG93QWN0aXZpdHkiLCJnZXRDb2xvckZvclNjb3JlIiwibWVzc2FnZVR5cGUiLCJoaWRlV2FybmluZ3MiLCIkZm9ybU9iaiIsImdlbmVyYXRlQ2FsbGJhY2siLCJzZXRHZW5lcmF0ZWRQYXNzd29yZCIsImNoYXJzIiwiaSIsImNoYXJBdCIsImZsb29yIiwidHJpZ2dlciIsImRhdGFDaGFuZ2VkIiwiY29sb3JDbGFzcyIsImVtcHR5IiwiaWNvbkNsYXNzIiwibGlzdEl0ZW1zIiwibWFwIiwibXNnIiwiam9pbiIsIiRsYWJlbCIsIiRpY29uIiwiYnRfVG9vbFRpcEhpZGVQYXNzd29yZCIsInVwZGF0ZUNvbmZpZyIsImluc3RhbmNlT3JGaWVsZElkIiwibmV3T3B0aW9ucyIsImdldCIsInJlbW92ZSIsImhpZGVTdHJlbmd0aEJhciIsImhhc0J1dHRvbnMiLCJnZXRTdGF0ZSIsImRlc3Ryb3lBbGwiLCJmb3JFYWNoIiwiY2xlYXJDYWNoZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsY0FBYyxHQUFHO0FBRW5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsSUFBSUMsR0FBSixFQUxROztBQVFuQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFO0FBQ1JDLElBQUFBLElBQUksRUFBRSxNQURFO0FBQ1E7QUFDaEJDLElBQUFBLElBQUksRUFBRSxNQUZFO0FBRVE7QUFDaEJDLElB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QUFBQSxVQW5xQ21CLHdCQW1xQ047QUFDVCxTQUFLckssZUFBTCxHQUF1QixFQUF2QjtBQUNIO0FBcnFDa0IsQ0FBdkIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYXNzd29yZFZhbGlkYXRpb25BUEksIEZvcm0sIENsaXBib2FyZEpTICovXG5cbi8qKlxuICogUGFzc3dvcmQgV2lkZ2V0IE1vZHVsZVxuICogXG4gKiBBIGNvbXByZWhlbnNpdmUgcGFzc3dvcmQgZmllbGQgY29tcG9uZW50IHRoYXQgcHJvdmlkZXM6XG4gKiAtIFBhc3N3b3JkIGdlbmVyYXRpb25cbiAqIC0gU3RyZW5ndGggdmFsaWRhdGlvbiB3aXRoIHJlYWwtdGltZSBmZWVkYmFja1xuICogLSBWaXN1YWwgcHJvZ3Jlc3MgaW5kaWNhdG9yXG4gKiAtIEFQSS1iYXNlZCB2YWxpZGF0aW9uIHdpdGggbG9jYWwgZmFsbGJhY2tcbiAqIC0gRm9ybSB2YWxpZGF0aW9uIGludGVncmF0aW9uXG4gKiBcbiAqIFVzYWdlOlxuICogY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdCgnI215UGFzc3dvcmRGaWVsZCcsIHtcbiAqICAgICBtb2RlOiAnZnVsbCcsICAgICAgICAgICAgICAvLyAnZnVsbCcgfCAnZ2VuZXJhdGUtb25seScgfCAnZGlzcGxheS1vbmx5JyB8ICdkaXNhYmxlZCdcbiAqICAgICB2YWxpZGF0aW9uOiAnc29mdCcsICAgICAgICAvLyAnaGFyZCcgfCAnc29mdCcgfCAnbm9uZSdcbiAqICAgICBtaW5TY29yZTogNjAsXG4gKiAgICAgZ2VuZXJhdGVMZW5ndGg6IDE2LFxuICogICAgIG9uVmFsaWRhdGU6IChpc1ZhbGlkLCBzY29yZSwgbWVzc2FnZXMpID0+IHsgLi4uIH1cbiAqIH0pO1xuICovXG5jb25zdCBQYXNzd29yZFdpZGdldCA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBY3RpdmUgd2lkZ2V0IGluc3RhbmNlc1xuICAgICAqL1xuICAgIGluc3RhbmNlczogbmV3IE1hcCgpLFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gdHlwZXNcbiAgICAgKi9cbiAgICBWQUxJREFUSU9OOiB7XG4gICAgICAgIEhBUkQ6ICdoYXJkJywgICAvLyBCbG9jayBmb3JtIHN1Ym1pc3Npb24gaWYgaW52YWxpZFxuICAgICAgICBTT0ZUOiAnc29mdCcsICAgLy8gU2hvdyB3YXJuaW5ncyBidXQgYWxsb3cgc3VibWlzc2lvblxuICAgICAgICBOT05FOiAnbm9uZScgICAgLy8gTm8gdmFsaWRhdGlvblxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FjaGUgZm9yIHZhbGlkYXRpb24gcmVzdWx0c1xuICAgICAqL1xuICAgIHZhbGlkYXRpb25DYWNoZToge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogVGltZXJzIGZvciBkZWJvdW5jaW5nIHZhbGlkYXRpb25cbiAgICAgKi9cbiAgICB2YWxpZGF0aW9uVGltZXJzOiB7fSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBkZWZhdWx0czoge1xuICAgICAgICB2YWxpZGF0aW9uOiAnc29mdCcsXG4gICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsICAvLyBTaG93L2hpZGUgcGFzc3dvcmQgdG9nZ2xlXG4gICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSwgICAgICAvLyBDb3B5IHRvIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDE2LFxuICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgIGNoZWNrT25Mb2FkOiBmYWxzZSxcbiAgICAgICAgb25WYWxpZGF0ZTogbnVsbCwgICAgICAgIC8vIENhbGxiYWNrOiAoaXNWYWxpZCwgc2NvcmUsIG1lc3NhZ2VzKSA9PiB2b2lkXG4gICAgICAgIG9uR2VuZXJhdGU6IG51bGwsICAgICAgICAvLyBDYWxsYmFjazogKHBhc3N3b3JkKSA9PiB2b2lkXG4gICAgICAgIHZhbGlkYXRpb25SdWxlczogbnVsbCAgICAvLyBDdXN0b20gdmFsaWRhdGlvbiBydWxlcyBmb3IgRm9ybS5qc1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xqUXVlcnl9IHNlbGVjdG9yIC0gRmllbGQgc2VsZWN0b3Igb3IgalF1ZXJ5IG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gV2lkZ2V0IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fG51bGx9IFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXQoc2VsZWN0b3IsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZElkID0gJGZpZWxkLmF0dHIoJ2lkJykgfHwgJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIGluc3RhbmNlIGlmIGFueVxuICAgICAgICBpZiAodGhpcy5pbnN0YW5jZXMuaGFzKGZpZWxkSWQpKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koZmllbGRJZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBpbnN0YW5jZVxuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHtcbiAgICAgICAgICAgIGZpZWxkSWQsXG4gICAgICAgICAgICAkZmllbGQsXG4gICAgICAgICAgICAkY29udGFpbmVyOiAkZmllbGQuY2xvc2VzdCgnLmZpZWxkJyksXG4gICAgICAgICAgICBvcHRpb25zOiB7IC4uLnRoaXMuZGVmYXVsdHMsIC4uLm9wdGlvbnMgfSxcbiAgICAgICAgICAgIGVsZW1lbnRzOiB7fSxcbiAgICAgICAgICAgIHN0YXRlOiB7XG4gICAgICAgICAgICAgICAgaXNWYWxpZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzY29yZTogMCxcbiAgICAgICAgICAgICAgICBzdHJlbmd0aDogJycsXG4gICAgICAgICAgICAgICAgbWVzc2FnZXM6IFtdLFxuICAgICAgICAgICAgICAgIGlzR2VuZXJhdGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpc0ZvY3VzZWQ6IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5zZXQoZmllbGRJZCwgaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZVxuICAgICAgICB0aGlzLnNldHVwVUkoaW5zdGFuY2UpO1xuICAgICAgICB0aGlzLmJpbmRFdmVudHMoaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgZm9ybSB2YWxpZGF0aW9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAoaW5zdGFuY2Uub3B0aW9ucy52YWxpZGF0aW9uICE9PSB0aGlzLlZBTElEQVRJT04uTk9ORSkge1xuICAgICAgICAgICAgdGhpcy5zZXR1cEZvcm1WYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaW5pdGlhbCB2YWx1ZSBpZiByZXF1ZXN0ZWRcbiAgICAgICAgaWYgKGluc3RhbmNlLm9wdGlvbnMuY2hlY2tPbkxvYWQgJiYgJGZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICB0aGlzLmNoZWNrUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXR1cCBVSSBlbGVtZW50c1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHNldHVwVUkoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsICRjb250YWluZXIsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuXG4gICAgICAgIC8vIEZpbmQgb3IgY3JlYXRlIGlucHV0IHdyYXBwZXJcbiAgICAgICAgbGV0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIGlmICgkaW5wdXRXcmFwcGVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJGZpZWxkLndyYXAoJzxkaXYgY2xhc3M9XCJ1aSBpbnB1dFwiPjwvZGl2PicpO1xuICAgICAgICAgICAgJGlucHV0V3JhcHBlciA9ICRmaWVsZC5wYXJlbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERpc2FibGUgcGFzc3dvcmQgbWFuYWdlcnNcbiAgICAgICAgdGhpcy5kaXNhYmxlUGFzc3dvcmRNYW5hZ2VycyhpbnN0YW5jZSk7XG5cbiAgICAgICAgLy8gQWRkIHNob3cvaGlkZSBwYXNzd29yZCBidXR0b24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dQYXNzd29yZEJ1dHRvbikge1xuICAgICAgICAgICAgdGhpcy5hZGRTaG93SGlkZUJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgZ2VuZXJhdGUgYnV0dG9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5nZW5lcmF0ZUJ1dHRvbikge1xuICAgICAgICAgICAgdGhpcy5hZGRHZW5lcmF0ZUJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgY2xpcGJvYXJkIGJ1dHRvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuY2xpcGJvYXJkQnV0dG9uKSB7XG4gICAgICAgICAgICB0aGlzLmFkZENsaXBib2FyZEJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgc3RyZW5ndGggYmFyIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5zaG93U3RyZW5ndGhCYXIpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkU3RyZW5ndGhCYXIoaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHdhcm5pbmdzIGNvbnRhaW5lciBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1dhcm5pbmdzKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFdhcm5pbmdzQ29udGFpbmVyKGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBpbnB1dCB3cmFwcGVyIGNsYXNzIGJhc2VkIG9uIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIHRoaXMudXBkYXRlSW5wdXRXcmFwcGVyQ2xhc3MoaW5zdGFuY2UpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIHNob3cvaGlkZSBwYXNzd29yZCBidXR0b25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRTaG93SGlkZUJ1dHRvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLnNob3ctaGlkZS1wYXNzd29yZCcpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0biA9ICRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLnNob3ctaGlkZS1wYXNzd29yZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYnV0dG9uXG4gICAgICAgIGNvbnN0ICRzaG93SGlkZUJ0biA9ICQoYFxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBzaG93LWhpZGUtcGFzc3dvcmRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFNob3dQYXNzd29yZCB8fCAnU2hvdyBwYXNzd29yZCd9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleWUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRzaG93SGlkZUJ0bik7XG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0biA9ICRzaG93SGlkZUJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBnZW5lcmF0ZSBidXR0b25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRHZW5lcmF0ZUJ1dHRvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuID0gJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uZ2VuZXJhdGUtcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJ1dHRvblxuICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSAkKGBcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gZ2VuZXJhdGUtcGFzc3dvcmRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEdlbmVyYXRlUGFzc3dvcmQgfHwgJ0dlbmVyYXRlIHBhc3N3b3JkJ31cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgaWNvblwiPjwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRnZW5lcmF0ZUJ0bik7XG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0biA9ICRnZW5lcmF0ZUJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkQ2xpcGJvYXJkQnV0dG9uKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGlucHV0V3JhcHBlciA9ICRmaWVsZC5jbG9zZXN0KCcudWkuaW5wdXQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uY2xpcGJvYXJkJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0biA9ICRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLmNsaXBib2FyZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYnV0dG9uXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCAnJztcbiAgICAgICAgY29uc3QgJGNsaXBib2FyZEJ0biA9ICQoYFxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBjbGlwYm9hcmRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Y3VycmVudFZhbHVlfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5UGFzc3dvcmQgfHwgJ0NvcHkgcGFzc3dvcmQnfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGNvcHlcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29ybmVyIGtleSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRjbGlwYm9hcmRCdG4pO1xuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuID0gJGNsaXBib2FyZEJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBzdHJlbmd0aCBiYXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRTdHJlbmd0aEJhcihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRjb250YWluZXIgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgcHJvZ3Jlc3MgYmFyIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc0JhciA9ICRjb250YWluZXIuZmluZCgnLnBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uID0gJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtc2VjdGlvbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgcHJvZ3Jlc3MgYmFyXG4gICAgICAgIGNvbnN0ICRwcm9ncmVzc1NlY3Rpb24gPSAkKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwYXNzd29yZC1zdHJlbmd0aC1zZWN0aW9uXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIHBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzIHByb2dyZXNzIGJvdHRvbSBhdHRhY2hlZCBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5zZXJ0IGFmdGVyIGZpZWxkXG4gICAgICAgICRjb250YWluZXIuYXBwZW5kKCRwcm9ncmVzc1NlY3Rpb24pO1xuICAgICAgICBcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyID0gJHByb2dyZXNzU2VjdGlvbi5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbiA9ICRwcm9ncmVzc1NlY3Rpb247XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgd2FybmluZ3MgY29udGFpbmVyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkV2FybmluZ3NDb250YWluZXIoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkY29udGFpbmVyIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdhcm5pbmdzIGNvbnRhaW5lciBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtd2FybmluZ3MnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MgPSAkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC13YXJuaW5ncycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgd2FybmluZ3MgY29udGFpbmVyICh3aWxsIGJlIHBvcHVsYXRlZCB3aGVuIG5lZWRlZClcbiAgICAgICAgY29uc3QgJHdhcm5pbmdzID0gJCgnPGRpdiBjbGFzcz1cInBhc3N3b3JkLXdhcm5pbmdzXCI+PC9kaXY+Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBlbmQgdG8gdGhlIGZpZWxkIGNvbnRhaW5lciAoYWZ0ZXIgcHJvZ3Jlc3MgYmFyIGlmIGV4aXN0cylcbiAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJHdhcm5pbmdzKTtcbiAgICAgICAgXG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncyA9ICR3YXJuaW5ncztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERpc2FibGUgcGFzc3dvcmQgbWFuYWdlcnMgZnJvbSBpbnRlcmZlcmluZyB3aXRoIHBhc3N3b3JkIGZpZWxkc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGRpc2FibGVQYXNzd29yZE1hbmFnZXJzKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGZvcm0gPSAkZmllbGQuY2xvc2VzdCgnZm9ybScpO1xuXG4gICAgICAgIC8vIFNldCBhdHRyaWJ1dGVzIHRvIHByZXZlbnQgYXV0b2ZpbGxcbiAgICAgICAgJGZpZWxkLmF0dHIoe1xuICAgICAgICAgICAgJ2F1dG9jb21wbGV0ZSc6ICdvZmYnLFxuICAgICAgICAgICAgJ2RhdGEtbHBpZ25vcmUnOiAndHJ1ZScsICAgICAgICAgICAvLyBMYXN0UGFzc1xuICAgICAgICAgICAgJ2RhdGEtMXAtaWdub3JlJzogJ3RydWUnLCAgICAgICAgICAvLyAxUGFzc3dvcmRcbiAgICAgICAgICAgICdkYXRhLWZvcm0tdHlwZSc6ICdvdGhlcicsICAgICAgICAgLy8gQ2hyb21lXG4gICAgICAgICAgICAnZGF0YS1id2lnbm9yZSc6ICd0cnVlJywgICAgICAgICAgIC8vIEJpdHdhcmRlblxuICAgICAgICAgICAgJ3JlYWRvbmx5JzogJ3JlYWRvbmx5JyAgICAgICAgICAgICAgLy8gTWFrZSByZWFkb25seSBpbml0aWFsbHlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHJlYWRvbmx5IG9uIGZvY3VzXG4gICAgICAgICRmaWVsZC5vbignZm9jdXMucGFzc3dvcmRNYW5hZ2VyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBob25leXBvdCBmaWVsZCB0byB0cmljayBwYXNzd29yZCBtYW5hZ2Vyc1xuICAgICAgICBpZiAoJGZpZWxkLnByZXYoJy5wYXNzd29yZC1ob25leXBvdCcpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgJGhvbmV5cG90ID0gJCgnPGlucHV0IHR5cGU9XCJwYXNzd29yZFwiIGNsYXNzPVwicGFzc3dvcmQtaG9uZXlwb3RcIiBuYW1lPVwiZmFrZV9wYXNzd29yZF9maWVsZFwiIHN0eWxlPVwicG9zaXRpb246IGFic29sdXRlOyBsZWZ0OiAtOTk5OXB4OyB3aWR0aDogMXB4OyBoZWlnaHQ6IDFweDtcIiB0YWJpbmRleD1cIi0xXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgYXV0b2NvbXBsZXRlPVwib2ZmXCI+Jyk7XG4gICAgICAgICAgICAkZmllbGQuYmVmb3JlKCRob25leXBvdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmV2ZW50IGZvcm0gZnJvbSB0cmlnZ2VyaW5nIHBhc3N3b3JkIHNhdmUgcHJvbXB0XG4gICAgICAgIGlmICgkZm9ybS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkZm9ybS5hdHRyKCdkYXRhLWxwaWdub3JlJywgJ3RydWUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCaW5kIGV2ZW50c1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGJpbmRFdmVudHMoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdy9oaWRlIGJ1dHRvbiBjbGlja1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4ub2ZmKCdjbGljay5wYXNzd29yZFdpZGdldCcpLm9uKCdjbGljay5wYXNzd29yZFdpZGdldCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlUGFzc3dvcmRWaXNpYmlsaXR5KGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZW5lcmF0ZSBidXR0b24gY2xpY2tcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZ1bmN0aW9uYWxpdHkgZm9yIGNvcHkgYnV0dG9uXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuICYmIHR5cGVvZiBDbGlwYm9hcmRKUyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgQ2xpcGJvYXJkSlMgZm9yIHRoZSBidXR0b25cbiAgICAgICAgICAgIGlmICghaW5zdGFuY2UuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG5bMF0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgZm9yIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzdWNjZXNzZnVsIGNvcHlcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaWVsZCBpbnB1dCBldmVudFxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0ZU9uSW5wdXQpIHtcbiAgICAgICAgICAgICRmaWVsZC5vZmYoJ2lucHV0LnBhc3N3b3JkV2lkZ2V0IGNoYW5nZS5wYXNzd29yZFdpZGdldCcpLm9uKCdpbnB1dC5wYXNzd29yZFdpZGdldCBjaGFuZ2UucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dChpbnN0YW5jZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNsaXBib2FyZCBidXR0b24gd2hlbiBwYXNzd29yZCBjaGFuZ2VzXG4gICAgICAgICRmaWVsZC5vbignaW5wdXQucGFzc3dvcmRXaWRnZXQgY2hhbmdlLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIHN0YXRlIG9uIGVtcHR5XG4gICAgICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhbGwgY2xpcGJvYXJkIGJ1dHRvbnMgKHdpZGdldCdzIGFuZCBhbnkgZXh0ZXJuYWwgb25lcylcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgdmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvY3VzIGV2ZW50IC0gc2hvdyBwcm9ncmVzcyBiYXIgd2hlbiBmaWVsZCBpcyBmb2N1c2VkXG4gICAgICAgICRmaWVsZC5vZmYoJ2ZvY3VzLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2ZvY3VzLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIFNob3cgcHJvZ3Jlc3MgYmFyIGlmIHRoZXJlJ3MgYSBwYXNzd29yZCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgcGFzc3dvcmQgPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICBpZiAocGFzc3dvcmQgJiYgcGFzc3dvcmQgIT09ICcnICYmICF0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdmFsaWRhdGlvbiB0byB1cGRhdGUgcHJvZ3Jlc3MgYmFyXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGVPbklucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCbHVyIGV2ZW50IC0gaGlkZSBwcm9ncmVzcyBiYXIgd2hlbiBmaWVsZCBsb3NlcyBmb2N1c1xuICAgICAgICAkZmllbGQub2ZmKCdibHVyLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2JsdXIucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0ZvY3VzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIEhpZGUgb25seSBwcm9ncmVzcyBiYXIsIGtlZXAgd2FybmluZ3MgdmlzaWJsZVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE5ldmVyIGhpZGUgd2FybmluZ3Mgb24gYmx1ciAtIHRoZXkgc2hvdWxkIHJlbWFpbiB2aXNpYmxlXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogRGlzYWJsZSB3aWRnZXRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBkaXNhYmxlKGluc3RhbmNlKSB7XG4gICAgICAgIGluc3RhbmNlLiRmaWVsZC5wcm9wKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS4kY29udGFpbmVyLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRW5hYmxlIHdpZGdldFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGVuYWJsZShpbnN0YW5jZSkge1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS4kY29udGFpbmVyLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHJlYWQtb25seSBtb2RlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgc2V0UmVhZE9ubHkoaW5zdGFuY2UpIHtcbiAgICAgICAgaW5zdGFuY2UuJGZpZWxkLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIGZvcm0gdmFsaWRhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHNldHVwRm9ybVZhbGlkYXRpb24oaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCBpZiBGb3JtIG9iamVjdCBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSA9PT0gJ3VuZGVmaW5lZCcgfHwgIUZvcm0udmFsaWRhdGVSdWxlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICBpZiAoIWZpZWxkTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgY3VzdG9tIHJ1bGVzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb25SdWxlcykge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzW2ZpZWxkTmFtZV0gPSBvcHRpb25zLnZhbGlkYXRpb25SdWxlcztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gbW9kZVxuICAgICAgICBjb25zdCBydWxlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5vbi1lbXB0eSBydWxlIGZvciBoYXJkIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLkhBUkQpIHtcbiAgICAgICAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHdfVmFsaWRhdGVQYXNzd29yZEVtcHR5IHx8ICdQYXNzd29yZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0cmVuZ3RoIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKG9wdGlvbnMubWluU2NvcmUgPiAwICYmIG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLkhBUkQpIHtcbiAgICAgICAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdwYXNzd29yZFN0cmVuZ3RoJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wd19WYWxpZGF0ZVBhc3N3b3JkV2VhayB8fCAnUGFzc3dvcmQgaXMgdG9vIHdlYWsnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHJ1bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlc1tmaWVsZE5hbWVdID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGZpZWxkTmFtZSxcbiAgICAgICAgICAgICAgICBydWxlczogcnVsZXNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBwYXNzd29yZCBzdHJlbmd0aFxuICAgICAgICBpZiAodHlwZW9mICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5wYXNzd29yZFN0cmVuZ3RoID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnBhc3N3b3JkU3RyZW5ndGggPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlLnN0YXRlLnNjb3JlID49IG9wdGlvbnMubWluU2NvcmU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBwYXNzd29yZCBpcyBtYXNrZWQgKHNlcnZlciByZXR1cm5zIHRoZXNlIHdoZW4gcGFzc3dvcmQgaXMgaGlkZGVuKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIGNoZWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgcGFzc3dvcmQgYXBwZWFycyB0byBiZSBtYXNrZWRcbiAgICAgKi9cbiAgICBpc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSB7XG4gICAgICAgIHJldHVybiAvXlt4WF17Nix9JHxeXFwqezYsfSR8XkhJRERFTiR8Xk1BU0tFRCQvaS50ZXN0KHBhc3N3b3JkKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbnB1dCBldmVudFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGhhbmRsZUlucHV0KGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgcGFzc3dvcmQgPSAkZmllbGQudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgZGlzYWJsZWRcbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLk5PTkUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGZvciBtYXNrZWQgcGFzc3dvcmRzXG4gICAgICAgIGlmICh0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBpZiB0aGlzIGlzIGEgZ2VuZXJhdGVkIHBhc3N3b3JkIChhbHJlYWR5IHZhbGlkYXRlZCBpbiBzZXRHZW5lcmF0ZWRQYXNzd29yZClcbiAgICAgICAgaWYgKGluc3RhbmNlLnN0YXRlLmlzR2VuZXJhdGVkKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZCA9IGZhbHNlOyAvLyBSZXNldCBmbGFnIGZvciBuZXh0IGlucHV0XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIHBhc3N3b3JkIG9ubHkgaWYgZmllbGQgaXMgZm9jdXNlZFxuICAgICAgICBpZiAoaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgcGFzc3dvcmRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB0byB2YWxpZGF0ZVxuICAgICAqL1xuICAgIHZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKSB7XG4gICAgICAgIGNvbnN0IHsgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZW1wdHkgcGFzc3dvcmRcbiAgICAgICAgaWYgKCFwYXNzd29yZCB8fCBwYXNzd29yZCA9PT0gJycpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGZvciBtYXNrZWQgcGFzc3dvcmRzIChzZXJ2ZXIgcmV0dXJucyB0aGVzZSB3aGVuIHBhc3N3b3JkIGlzIGhpZGRlbilcbiAgICAgICAgLy8gQ29tbW9uIHBhdHRlcm5zOiB4eHh4eHh4LCBYWFhYWFhYWCwgKioqKioqKiwgSElEREVOLCBldGMuXG4gICAgICAgIGlmICh0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgcHJvZ3Jlc3Mgc2VjdGlvbiBvbmx5IGlmIGZpZWxkIGlzIGZvY3VzZWRcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24gJiYgaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLnNob3coKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgY2FjaGUgZmlyc3RcbiAgICAgICAgY29uc3QgY2FjaGVLZXkgPSBgJHtpbnN0YW5jZS5maWVsZElkfToke3Bhc3N3b3JkfWA7XG4gICAgICAgIGlmICh0aGlzLnZhbGlkYXRpb25DYWNoZVtjYWNoZUtleV0pIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgdGhpcy52YWxpZGF0aW9uQ2FjaGVbY2FjaGVLZXldKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgdGltZXJcbiAgICAgICAgaWYgKHRoaXMudmFsaWRhdGlvblRpbWVyc1tpbnN0YW5jZS5maWVsZElkXSkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudmFsaWRhdGlvblRpbWVyc1tpbnN0YW5jZS5maWVsZElkXSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgaW1tZWRpYXRlIGxvY2FsIGZlZWRiYWNrXG4gICAgICAgIGNvbnN0IGxvY2FsU2NvcmUgPSB0aGlzLnNjb3JlUGFzc3dvcmRMb2NhbChwYXNzd29yZCk7XG4gICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3NCYXIoaW5zdGFuY2UsIGxvY2FsU2NvcmUpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVib3VuY2UgQVBJIGNhbGxcbiAgICAgICAgdGhpcy52YWxpZGF0aW9uVGltZXJzW2luc3RhbmNlLmZpZWxkSWRdID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBVc2UgQVBJIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBQYXNzd29yZFZhbGlkYXRpb25BUEkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgUGFzc3dvcmRWYWxpZGF0aW9uQVBJLnZhbGlkYXRlUGFzc3dvcmQocGFzc3dvcmQsIGluc3RhbmNlLmZpZWxkSWQsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FjaGUgcmVzdWx0XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRpb25DYWNoZVtjYWNoZUtleV0gPSByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVZhbGlkYXRpb25SZXN1bHQoaW5zdGFuY2UsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGxvY2FsIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3JlOiBsb2NhbFNjb3JlLFxuICAgICAgICAgICAgICAgICAgICBpc1ZhbGlkOiBsb2NhbFNjb3JlID49IG9wdGlvbnMubWluU2NvcmUsXG4gICAgICAgICAgICAgICAgICAgIHN0cmVuZ3RoOiB0aGlzLmdldFN0cmVuZ3RoTGFiZWwobG9jYWxTY29yZSksXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiBbXVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVWYWxpZGF0aW9uUmVzdWx0KGluc3RhbmNlLCByZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCA3MDApOyAvLyBJbmNyZWFzZWQgZGVib3VuY2UgZm9yIG1vcmUgY29tZm9ydGFibGUgdHlwaW5nXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgcGFzc3dvcmQgc2NvcmUgbG9jYWxseVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIHNjb3JlXG4gICAgICogQHJldHVybnMge251bWJlcn0gU2NvcmUgZnJvbSAwLTEwMFxuICAgICAqL1xuICAgIHNjb3JlUGFzc3dvcmRMb2NhbChwYXNzd29yZCkge1xuICAgICAgICBsZXQgc2NvcmUgPSAwO1xuICAgICAgICBpZiAoIXBhc3N3b3JkIHx8IHBhc3N3b3JkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHNjb3JlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsZW5ndGggPSBwYXNzd29yZC5sZW5ndGg7XG4gICAgICAgIFxuICAgICAgICAvLyBMZW5ndGggc2NvcmluZyAodXAgdG8gMzAgcG9pbnRzKVxuICAgICAgICBpZiAobGVuZ3RoID49IDE2KSB7XG4gICAgICAgICAgICBzY29yZSArPSAzMDtcbiAgICAgICAgfSBlbHNlIGlmIChsZW5ndGggPj0gMTIpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDIwO1xuICAgICAgICB9IGVsc2UgaWYgKGxlbmd0aCA+PSA4KSB7XG4gICAgICAgICAgICBzY29yZSArPSAxMDtcbiAgICAgICAgfSBlbHNlIGlmIChsZW5ndGggPj0gNikge1xuICAgICAgICAgICAgc2NvcmUgKz0gNTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hhcmFjdGVyIGRpdmVyc2l0eSAodXAgdG8gNDAgcG9pbnRzKVxuICAgICAgICBpZiAoL1thLXpdLy50ZXN0KHBhc3N3b3JkKSkgc2NvcmUgKz0gMTA7IC8vIExvd2VyY2FzZVxuICAgICAgICBpZiAoL1tBLVpdLy50ZXN0KHBhc3N3b3JkKSkgc2NvcmUgKz0gMTA7IC8vIFVwcGVyY2FzZVxuICAgICAgICBpZiAoL1xcZC8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAgICAgLy8gRGlnaXRzXG4gICAgICAgIGlmICgvXFxXLy50ZXN0KHBhc3N3b3JkKSkgc2NvcmUgKz0gMTA7ICAgICAvLyBTcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgXG4gICAgICAgIC8vIFBhdHRlcm4gY29tcGxleGl0eSAodXAgdG8gMzAgcG9pbnRzKVxuICAgICAgICBjb25zdCB1bmlxdWVDaGFycyA9IG5ldyBTZXQocGFzc3dvcmQpLnNpemU7XG4gICAgICAgIGNvbnN0IHVuaXF1ZVJhdGlvID0gdW5pcXVlQ2hhcnMgLyBsZW5ndGg7XG4gICAgICAgIFxuICAgICAgICBpZiAodW5pcXVlUmF0aW8gPiAwLjcpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDIwO1xuICAgICAgICB9IGVsc2UgaWYgKHVuaXF1ZVJhdGlvID4gMC41KSB7XG4gICAgICAgICAgICBzY29yZSArPSAxNTtcbiAgICAgICAgfSBlbHNlIGlmICh1bmlxdWVSYXRpbyA+IDAuMykge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzY29yZSArPSA1O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBQZW5hbHRpZXMgZm9yIGNvbW1vbiBwYXR0ZXJuc1xuICAgICAgICBpZiAoLyguKVxcMXsyLH0vLnRlc3QocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICBzY29yZSAtPSAxMDsgLy8gUmVwZWF0aW5nIGNoYXJhY3RlcnNcbiAgICAgICAgfVxuICAgICAgICBpZiAoLygwMTJ8MTIzfDIzNHwzNDV8NDU2fDU2N3w2Nzh8Nzg5fDg5MHxhYmN8YmNkfGNkZXxkZWYpL2kudGVzdChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgIHNjb3JlIC09IDEwOyAvLyBTZXF1ZW50aWFsIHBhdHRlcm5zXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1pbigxMDAsIHNjb3JlKSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc3RyZW5ndGggbGFiZWwgZm9yIHNjb3JlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3JlIC0gUGFzc3dvcmQgc2NvcmVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTdHJlbmd0aCBsYWJlbFxuICAgICAqL1xuICAgIGdldFN0cmVuZ3RoTGFiZWwoc2NvcmUpIHtcbiAgICAgICAgaWYgKHNjb3JlIDwgMjApIHJldHVybiAndmVyeV93ZWFrJztcbiAgICAgICAgaWYgKHNjb3JlIDwgNDApIHJldHVybiAnd2Vhayc7XG4gICAgICAgIGlmIChzY29yZSA8IDYwKSByZXR1cm4gJ2ZhaXInO1xuICAgICAgICBpZiAoc2NvcmUgPCA4MCkgcmV0dXJuICdnb29kJztcbiAgICAgICAgcmV0dXJuICdzdHJvbmcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHByb2dyZXNzIGJhclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29yZSAtIFBhc3N3b3JkIHNjb3JlXG4gICAgICovXG4gICAgdXBkYXRlUHJvZ3Jlc3NCYXIoaW5zdGFuY2UsIHNjb3JlKSB7XG4gICAgICAgIGNvbnN0IHsgZWxlbWVudHMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFlbGVtZW50cy4kcHJvZ3Jlc3NCYXIgfHwgZWxlbWVudHMuJHByb2dyZXNzQmFyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3NcbiAgICAgICAgZWxlbWVudHMuJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcbiAgICAgICAgICAgIHBlcmNlbnQ6IE1hdGgubWluKHNjb3JlLCAxMDApLFxuICAgICAgICAgICAgc2hvd0FjdGl2aXR5OiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY29sb3JcbiAgICAgICAgZWxlbWVudHMuJHByb2dyZXNzQmFyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JlZCBvcmFuZ2UgeWVsbG93IG9saXZlIGdyZWVuJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyh0aGlzLmdldENvbG9yRm9yU2NvcmUoc2NvcmUpKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjb2xvciBjbGFzcyBmb3Igc2NvcmVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcmUgLSBQYXNzd29yZCBzY29yZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IENvbG9yIGNsYXNzIG5hbWVcbiAgICAgKi9cbiAgICBnZXRDb2xvckZvclNjb3JlKHNjb3JlKSB7XG4gICAgICAgIGlmIChzY29yZSA8IDIwKSByZXR1cm4gJ3JlZCc7XG4gICAgICAgIGlmIChzY29yZSA8IDQwKSByZXR1cm4gJ29yYW5nZSc7XG4gICAgICAgIGlmIChzY29yZSA8IDYwKSByZXR1cm4gJ3llbGxvdyc7XG4gICAgICAgIGlmIChzY29yZSA8IDgwKSByZXR1cm4gJ29saXZlJztcbiAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgdmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gVmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKi9cbiAgICBoYW5kbGVWYWxpZGF0aW9uUmVzdWx0KGluc3RhbmNlLCByZXN1bHQpIHtcbiAgICAgICAgaWYgKCFyZXN1bHQpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHsgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgc3RhdGVcbiAgICAgICAgaW5zdGFuY2Uuc3RhdGUgPSB7XG4gICAgICAgICAgICBpc1ZhbGlkOiByZXN1bHQuaXNWYWxpZCB8fCByZXN1bHQuc2NvcmUgPj0gb3B0aW9ucy5taW5TY29yZSxcbiAgICAgICAgICAgIHNjb3JlOiByZXN1bHQuc2NvcmUsXG4gICAgICAgICAgICBzdHJlbmd0aDogcmVzdWx0LnN0cmVuZ3RoIHx8IHRoaXMuZ2V0U3RyZW5ndGhMYWJlbChyZXN1bHQuc2NvcmUpLFxuICAgICAgICAgICAgbWVzc2FnZXM6IHJlc3VsdC5tZXNzYWdlcyB8fCBbXSxcbiAgICAgICAgICAgIGlzR2VuZXJhdGVkOiBpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIFVJXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3NCYXIoaW5zdGFuY2UsIHJlc3VsdC5zY29yZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHdhcm5pbmdzL2Vycm9yc1xuICAgICAgICBpZiAob3B0aW9ucy5zaG93V2FybmluZ3MgJiYgcmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlVHlwZSA9IGluc3RhbmNlLnN0YXRlLmlzVmFsaWQgPyAnd2FybmluZycgOiAnZXJyb3InO1xuICAgICAgICAgICAgdGhpcy5zaG93V2FybmluZ3MoaW5zdGFuY2UsIHJlc3VsdCwgbWVzc2FnZVR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxsIHZhbGlkYXRpb24gY2FsbGJhY2tcbiAgICAgICAgaWYgKG9wdGlvbnMub25WYWxpZGF0ZSkge1xuICAgICAgICAgICAgb3B0aW9ucy5vblZhbGlkYXRlKGluc3RhbmNlLnN0YXRlLmlzVmFsaWQsIHJlc3VsdC5zY29yZSwgcmVzdWx0Lm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gdmFsaWRhdGlvbiBzdGF0ZVxuICAgICAgICBpZiAoRm9ybSAmJiBGb3JtLiRmb3JtT2JqKSB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBpbnN0YW5jZS4kZmllbGQuYXR0cignbmFtZScpIHx8IGluc3RhbmNlLiRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKCFpbnN0YW5jZS5zdGF0ZS5pc1ZhbGlkICYmIG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLkhBUkQpIHtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ2FkZCBwcm9tcHQnLCBmaWVsZE5hbWUsIHJlc3VsdC5tZXNzYWdlc1swXSB8fCAnSW52YWxpZCBwYXNzd29yZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCBmaWVsZE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBwYXNzd29yZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGdlbmVyYXRlUGFzc3dvcmQoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2VuZXJhdGUgcGFzc3dvcmRcbiAgICAgICAgY29uc3QgZ2VuZXJhdGVDYWxsYmFjayA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBhc3N3b3JkID0gdHlwZW9mIHJlc3VsdCA9PT0gJ3N0cmluZycgPyByZXN1bHQgOiByZXN1bHQucGFzc3dvcmQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBwYXNzd29yZFxuICAgICAgICAgICAgdGhpcy5zZXRHZW5lcmF0ZWRQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWxsIGNhbGxiYWNrXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5vbkdlbmVyYXRlKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5vbkdlbmVyYXRlKHBhc3N3b3JkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBBUEkgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgUGFzc3dvcmRWYWxpZGF0aW9uQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgUGFzc3dvcmRWYWxpZGF0aW9uQVBJLmdlbmVyYXRlUGFzc3dvcmQob3B0aW9ucy5nZW5lcmF0ZUxlbmd0aCwgZ2VuZXJhdGVDYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaW1wbGUgbG9jYWwgZ2VuZXJhdG9yXG4gICAgICAgICAgICBjb25zdCBjaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSFAIyQlXiYqJztcbiAgICAgICAgICAgIGxldCBwYXNzd29yZCA9ICcnO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvcHRpb25zLmdlbmVyYXRlTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwYXNzd29yZCArPSBjaGFycy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBnZW5lcmF0ZUNhbGxiYWNrKHBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IGdlbmVyYXRlZCBwYXNzd29yZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIEdlbmVyYXRlZCBwYXNzd29yZFxuICAgICAqL1xuICAgIHNldEdlbmVyYXRlZFBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgJGNvbnRhaW5lciwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgZ2VuZXJhdGVkIGZsYWcgZmlyc3QgdG8gcHJldmVudCBkdXBsaWNhdGUgdmFsaWRhdGlvblxuICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdmFsdWUgd2l0aG91dCB0cmlnZ2VyaW5nIGNoYW5nZSBldmVudCB5ZXRcbiAgICAgICAgJGZpZWxkLnZhbChwYXNzd29yZCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWxsIGNsaXBib2FyZCBidXR0b25zICh3aWRnZXQncyBhbmQgYW55IGV4dGVybmFsIG9uZXMpXG4gICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgcGFzc3dvcmQpO1xuICAgICAgICBcbiAgICAgICAgLy8gVmFsaWRhdGUgb25jZSBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGlvbiAhPT0gdGhpcy5WQUxJREFUSU9OLk5PTkUpIHtcbiAgICAgICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOb3cgdHJpZ2dlciBjaGFuZ2UgZm9yIGZvcm0gdHJhY2tpbmcgKHZhbGlkYXRpb24gYWxyZWFkeSBkb25lIGFib3ZlKVxuICAgICAgICAkZmllbGQudHJpZ2dlcignY2hhbmdlJylcbiAgICAgICAgXG4gICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2VcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgd2FybmluZ3NcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gVmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIE1lc3NhZ2UgdHlwZSAod2FybmluZy9lcnJvcilcbiAgICAgKi9cbiAgICBzaG93V2FybmluZ3MoaW5zdGFuY2UsIHJlc3VsdCwgdHlwZSA9ICd3YXJuaW5nJykge1xuICAgICAgICBpZiAoIWluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncykgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgeyBlbGVtZW50cyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0IGNvbG9yQ2xhc3MgPSB0eXBlID09PSAnZXJyb3InID8gJ3JlZCcgOiAnb3JhbmdlJztcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHdhcm5pbmdzXG4gICAgICAgIGVsZW1lbnRzLiR3YXJuaW5ncy5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHdhcm5pbmdzIGFzIHBvaW50aW5nIGxhYmVsXG4gICAgICAgIGlmIChyZXN1bHQubWVzc2FnZXMgJiYgcmVzdWx0Lm1lc3NhZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIENob29zZSBpY29uIGJhc2VkIG9uIG1lc3NhZ2UgdHlwZVxuICAgICAgICAgICAgY29uc3QgaWNvbkNsYXNzID0gdHlwZSA9PT0gJ2Vycm9yJyA/ICdleGNsYW1hdGlvbiBjaXJjbGUnIDogJ2V4Y2xhbWF0aW9uIHRyaWFuZ2xlJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIGxpc3QgaXRlbXMgZnJvbSBtZXNzYWdlcyB3aXRoIGljb25zXG4gICAgICAgICAgICBjb25zdCBsaXN0SXRlbXMgPSByZXN1bHQubWVzc2FnZXMubWFwKG1zZyA9PiBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2ljb25DbGFzc30gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4ke21zZ308L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApLmpvaW4oJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgcG9pbnRpbmcgYWJvdmUgbGFiZWwgd2l0aCBsaXN0IChwb2ludHMgdG8gcGFzc3dvcmQgZmllbGQpXG4gICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcG9pbnRpbmcgJHtjb2xvckNsYXNzfSBiYXNpYyBsYWJlbFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbGlzdFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtsaXN0SXRlbXN9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGVsZW1lbnRzLiR3YXJuaW5ncy5hcHBlbmQoJGxhYmVsKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgd2FybmluZ3NcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBoaWRlV2FybmluZ3MoaW5zdGFuY2UpIHtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncykge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzLmVtcHR5KCkuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUb2dnbGUgcGFzc3dvcmQgdmlzaWJpbGl0eVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHRvZ2dsZVBhc3N3b3JkVmlzaWJpbGl0eShpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRzaG93SGlkZUJ0biA9IGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bjtcbiAgICAgICAgXG4gICAgICAgIGlmICghJHNob3dIaWRlQnRuKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkaWNvbiA9ICRzaG93SGlkZUJ0bi5maW5kKCdpJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ3Bhc3N3b3JkJykge1xuICAgICAgICAgICAgLy8gU2hvdyBwYXNzd29yZFxuICAgICAgICAgICAgJGZpZWxkLmF0dHIoJ3R5cGUnLCAndGV4dCcpO1xuICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V5ZScpLmFkZENsYXNzKCdleWUgc2xhc2gnKTtcbiAgICAgICAgICAgICRzaG93SGlkZUJ0bi5hdHRyKCdkYXRhLWNvbnRlbnQnLCBnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEhpZGVQYXNzd29yZCB8fCAnSGlkZSBwYXNzd29yZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBwYXNzd29yZFxuICAgICAgICAgICAgJGZpZWxkLmF0dHIoJ3R5cGUnLCAncGFzc3dvcmQnKTtcbiAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUgc2xhc2gnKS5hZGRDbGFzcygnZXllJyk7XG4gICAgICAgICAgICAkc2hvd0hpZGVCdG4uYXR0cignZGF0YS1jb250ZW50JywgZ2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBTaG93UGFzc3dvcmQgfHwgJ1Nob3cgcGFzc3dvcmQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgdmFsaWRhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSkge1xuICAgICAgICAvLyBDbGVhciB3YXJuaW5ncyB3aGVuIGV4cGxpY2l0bHkgY2xlYXJpbmcgdmFsaWRhdGlvbiAoZW1wdHkgcGFzc3dvcmQpXG4gICAgICAgIHRoaXMuaGlkZVdhcm5pbmdzKGluc3RhbmNlKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NCYXIpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7IHBlcmNlbnQ6IDAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFuY2Uuc3RhdGUgPSB7XG4gICAgICAgICAgICBpc1ZhbGlkOiB0cnVlLFxuICAgICAgICAgICAgc2NvcmU6IDAsXG4gICAgICAgICAgICBzdHJlbmd0aDogJycsXG4gICAgICAgICAgICBtZXNzYWdlczogW10sXG4gICAgICAgICAgICBpc0dlbmVyYXRlZDogZmFsc2UsXG4gICAgICAgICAgICBpc0ZvY3VzZWQ6IGluc3RhbmNlLnN0YXRlLmlzRm9jdXNlZCB8fCBmYWxzZVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgcGFzc3dvcmQgKG1hbnVhbCB2YWxpZGF0aW9uKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGNoZWNrUGFzc3dvcmQoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgcGFzc3dvcmQgPSBpbnN0YW5jZS4kZmllbGQudmFsKCk7XG4gICAgICAgIGlmIChwYXNzd29yZCAmJiBwYXNzd29yZCAhPT0gJycpIHtcbiAgICAgICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBmb3IgbWFza2VkIHBhc3N3b3Jkc1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRm9yIGluaXRpYWwgY2hlY2ssIGRvbid0IHNob3cgcHJvZ3Jlc3MgYmFyIGJ1dCBkbyB2YWxpZGF0ZSBhbmQgc2hvdyB3YXJuaW5nc1xuICAgICAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBjb25maWd1cmF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBpbnN0YW5jZU9yRmllbGRJZCAtIEluc3RhbmNlIG9yIGZpZWxkIElEXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5ld09wdGlvbnMgLSBOZXcgb3B0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZUNvbmZpZyhpbnN0YW5jZU9yRmllbGRJZCwgbmV3T3B0aW9ucykge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHR5cGVvZiBpbnN0YW5jZU9yRmllbGRJZCA9PT0gJ3N0cmluZycgXG4gICAgICAgICAgICA/IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZU9yRmllbGRJZClcbiAgICAgICAgICAgIDogaW5zdGFuY2VPckZpZWxkSWQ7XG4gICAgICAgICAgICBcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgb3B0aW9uc1xuICAgICAgICBpbnN0YW5jZS5vcHRpb25zID0geyAuLi5pbnN0YW5jZS5vcHRpb25zLCAuLi5uZXdPcHRpb25zIH07XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZHluYW1pYyBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICBpZiAoJ3Nob3dQYXNzd29yZEJ1dHRvbicgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuc2hvd1Bhc3N3b3JkQnV0dG9uICYmICFpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgYnV0dG9uIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFNob3dIaWRlQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAvLyBSZS1iaW5kIGV2ZW50cyBmb3IgdGhlIG5ldyBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bi5vZmYoJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlUGFzc3dvcmRWaXNpYmlsaXR5KGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICghbmV3T3B0aW9ucy5zaG93UGFzc3dvcmRCdXR0b24gJiYgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGJ1dHRvbiBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGdlbmVyYXRlIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnZ2VuZXJhdGVCdXR0b24nIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLmdlbmVyYXRlQnV0dG9uICYmICFpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgYnV0dG9uIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEdlbmVyYXRlQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAvLyBSZS1iaW5kIGV2ZW50cyBmb3IgdGhlIG5ldyBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5vZmYoJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVQYXNzd29yZChpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW5ld09wdGlvbnMuZ2VuZXJhdGVCdXR0b24gJiYgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGJ1dHRvbiBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNsaXBib2FyZCBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICBpZiAoJ2NsaXBib2FyZEJ1dHRvbicgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuY2xpcGJvYXJkQnV0dG9uICYmICFpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGJ1dHRvbiBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRDbGlwYm9hcmRCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2xpcGJvYXJkIGZvciB0aGUgbmV3IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuICYmIHR5cGVvZiBDbGlwYm9hcmRKUyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBDbGlwYm9hcmRKUyBmb3IgdGhlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUyhpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgZm9yIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHN1Y2Nlc3NmdWwgY29weVxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFuZXdPcHRpb25zLmNsaXBib2FyZEJ1dHRvbiAmJiBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGJ1dHRvbiBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBpbnN0YW5jZS5jbGlwYm9hcmQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBzdHJlbmd0aCBiYXIgdmlzaWJpbGl0eVxuICAgICAgICBpZiAoJ3Nob3dTdHJlbmd0aEJhcicgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuc2hvd1N0cmVuZ3RoQmFyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93U3RyZW5ndGhCYXIoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVTdHJlbmd0aEJhcihpbnN0YW5jZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSB3YXJuaW5ncyB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnc2hvd1dhcm5pbmdzJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5zaG93V2FybmluZ3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dXYXJuaW5ncyhpbnN0YW5jZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVdhcm5pbmdzKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGlucHV0IHdyYXBwZXIgYWN0aW9uIGNsYXNzIGJhc2VkIG9uIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIHRoaXMudXBkYXRlSW5wdXRXcmFwcGVyQ2xhc3MoaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtc2V0dXAgZm9ybSB2YWxpZGF0aW9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAoaW5zdGFuY2Uub3B0aW9ucy52YWxpZGF0aW9uICE9PSB0aGlzLlZBTElEQVRJT04uTk9ORSkge1xuICAgICAgICAgICAgdGhpcy5zZXR1cEZvcm1WYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgY3VycmVudCB2YWx1ZSBpZiB2YWxpZGF0aW9uIGNoYW5nZWRcbiAgICAgICAgaWYgKCd2YWxpZGF0aW9uJyBpbiBuZXdPcHRpb25zICYmIGluc3RhbmNlLiRmaWVsZC52YWwoKSkge1xuICAgICAgICAgICAgdGhpcy5jaGVja1Bhc3N3b3JkKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGlucHV0IHdyYXBwZXIgYWN0aW9uIGNsYXNzIGJhc2VkIG9uIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgdXBkYXRlSW5wdXRXcmFwcGVyQ2xhc3MoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgJGlucHV0V3JhcHBlciA9IGluc3RhbmNlLiRmaWVsZC5jbG9zZXN0KCcudWkuaW5wdXQnKTtcbiAgICAgICAgY29uc3QgaGFzQnV0dG9ucyA9ICEhKFxuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuIHx8IFxuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuIHx8IFxuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0blxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhhc0J1dHRvbnMpIHtcbiAgICAgICAgICAgICRpbnB1dFdyYXBwZXIuYWRkQ2xhc3MoJ2FjdGlvbicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGlucHV0V3JhcHBlci5yZW1vdmVDbGFzcygnYWN0aW9uJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCB3aWRnZXQgc3RhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGluc3RhbmNlT3JGaWVsZElkIC0gSW5zdGFuY2Ugb3IgZmllbGQgSURcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fG51bGx9IFdpZGdldCBzdGF0ZVxuICAgICAqL1xuICAgIGdldFN0YXRlKGluc3RhbmNlT3JGaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICByZXR1cm4gaW5zdGFuY2UgPyBpbnN0YW5jZS5zdGF0ZSA6IG51bGw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHN0cmVuZ3RoIGJhclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gaW5zdGFuY2VPckZpZWxkSWQgLSBJbnN0YW5jZSBvciBmaWVsZCBJRFxuICAgICAqL1xuICAgIHNob3dTdHJlbmd0aEJhcihpbnN0YW5jZU9yRmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHR5cGVvZiBpbnN0YW5jZU9yRmllbGRJZCA9PT0gJ3N0cmluZycgXG4gICAgICAgICAgICA/IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZU9yRmllbGRJZClcbiAgICAgICAgICAgIDogaW5zdGFuY2VPckZpZWxkSWQ7XG4gICAgICAgICAgICBcbiAgICAgICAgaWYgKGluc3RhbmNlICYmIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHN0cmVuZ3RoIGJhclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gaW5zdGFuY2VPckZpZWxkSWQgLSBJbnN0YW5jZSBvciBmaWVsZCBJRFxuICAgICAqL1xuICAgIGhpZGVTdHJlbmd0aEJhcihpbnN0YW5jZU9yRmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHR5cGVvZiBpbnN0YW5jZU9yRmllbGRJZCA9PT0gJ3N0cmluZycgXG4gICAgICAgICAgICA/IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZU9yRmllbGRJZClcbiAgICAgICAgICAgIDogaW5zdGFuY2VPckZpZWxkSWQ7XG4gICAgICAgICAgICBcbiAgICAgICAgaWYgKGluc3RhbmNlICYmIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IHdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICBkZXN0cm95KGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIFVuYmluZCBldmVudHNcbiAgICAgICAgaW5zdGFuY2UuJGZpZWxkLm9mZignLnBhc3N3b3JkV2lkZ2V0Jyk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5vZmYoJy5wYXNzd29yZFdpZGdldCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bi5vZmYoJy5wYXNzd29yZFdpZGdldCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IGNsaXBib2FyZCBpbnN0YW5jZVxuICAgICAgICBpZiAoaW5zdGFuY2UuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmNsaXBib2FyZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgdGltZXJcbiAgICAgICAgaWYgKHRoaXMudmFsaWRhdGlvblRpbWVyc1tmaWVsZElkXSkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudmFsaWRhdGlvblRpbWVyc1tmaWVsZElkXSk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy52YWxpZGF0aW9uVGltZXJzW2ZpZWxkSWRdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZGVsZXRlKGZpZWxkSWQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBhbGwgaW5zdGFuY2VzXG4gICAgICovXG4gICAgZGVzdHJveUFsbCgpIHtcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UsIGZpZWxkSWQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveShmaWVsZElkKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMudmFsaWRhdGlvbkNhY2hlID0ge307XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciB2YWxpZGF0aW9uIGNhY2hlXG4gICAgICovXG4gICAgY2xlYXJDYWNoZSgpIHtcbiAgICAgICAgdGhpcy52YWxpZGF0aW9uQ2FjaGUgPSB7fTtcbiAgICB9XG59OyJdfQ==