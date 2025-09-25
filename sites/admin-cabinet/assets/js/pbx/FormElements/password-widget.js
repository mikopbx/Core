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
      if (typeof PasswordsAPI !== 'undefined') {
        PasswordsAPI.validatePassword(password, instance.fieldId, function (result) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvcGFzc3dvcmQtd2lkZ2V0LmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkV2lkZ2V0IiwiaW5zdGFuY2VzIiwiTWFwIiwiVkFMSURBVElPTiIsIkhBUkQiLCJTT0ZUIiwiTk9ORSIsInZhbGlkYXRpb25DYWNoZSIsInZhbGlkYXRpb25UaW1lcnMiLCJkZWZhdWx0cyIsInZhbGlkYXRpb24iLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm9uVmFsaWRhdGUiLCJvbkdlbmVyYXRlIiwidmFsaWRhdGlvblJ1bGVzIiwiaW5pdCIsInNlbGVjdG9yIiwib3B0aW9ucyIsIiRmaWVsZCIsIiQiLCJsZW5ndGgiLCJmaWVsZElkIiwiYXR0ciIsIk1hdGgiLCJyYW5kb20iLCJ0b1N0cmluZyIsInN1YnN0ciIsImhhcyIsImRlc3Ryb3kiLCJpbnN0YW5jZSIsIiRjb250YWluZXIiLCJjbG9zZXN0IiwiZWxlbWVudHMiLCJzdGF0ZSIsImlzVmFsaWQiLCJzY29yZSIsInN0cmVuZ3RoIiwibWVzc2FnZXMiLCJpc0dlbmVyYXRlZCIsImlzRm9jdXNlZCIsInNldCIsInNldHVwVUkiLCJiaW5kRXZlbnRzIiwic2V0dXBGb3JtVmFsaWRhdGlvbiIsInZhbCIsImNoZWNrUGFzc3dvcmQiLCIkaW5wdXRXcmFwcGVyIiwid3JhcCIsInBhcmVudCIsImRpc2FibGVQYXNzd29yZE1hbmFnZXJzIiwiYWRkU2hvd0hpZGVCdXR0b24iLCJhZGRHZW5lcmF0ZUJ1dHRvbiIsImFkZENsaXBib2FyZEJ1dHRvbiIsImFkZFN0cmVuZ3RoQmFyIiwiYWRkV2FybmluZ3NDb250YWluZXIiLCJ1cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyIsImZpbmQiLCIkc2hvd0hpZGVCdG4iLCJnbG9iYWxUcmFuc2xhdGUiLCJidF9Ub29sVGlwU2hvd1Bhc3N3b3JkIiwiYXBwZW5kIiwiJGdlbmVyYXRlQnRuIiwiYnRfVG9vbFRpcEdlbmVyYXRlUGFzc3dvcmQiLCIkY2xpcGJvYXJkQnRuIiwiY3VycmVudFZhbHVlIiwiYnRfVG9vbFRpcENvcHlQYXNzd29yZCIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc1NlY3Rpb24iLCIkd2FybmluZ3MiLCIkZm9ybSIsIm9uIiwicmVtb3ZlQXR0ciIsInByZXYiLCIkaG9uZXlwb3QiLCJiZWZvcmUiLCJvZmYiLCJlIiwicHJldmVudERlZmF1bHQiLCJ0b2dnbGVQYXNzd29yZFZpc2liaWxpdHkiLCJnZW5lcmF0ZVBhc3N3b3JkIiwiQ2xpcGJvYXJkSlMiLCJjbGlwYm9hcmQiLCJwb3B1cCIsInNldFRpbWVvdXQiLCJjbGVhclNlbGVjdGlvbiIsImhhbmRsZUlucHV0IiwidmFsdWUiLCJjbGVhclZhbGlkYXRpb24iLCJwYXNzd29yZCIsImlzTWFza2VkUGFzc3dvcmQiLCJzaG93IiwidmFsaWRhdGVQYXNzd29yZCIsImhpZGUiLCJkaXNhYmxlIiwicHJvcCIsImFkZENsYXNzIiwiZW5hYmxlIiwicmVtb3ZlQ2xhc3MiLCJzZXRSZWFkT25seSIsIkZvcm0iLCJ2YWxpZGF0ZVJ1bGVzIiwiZmllbGROYW1lIiwicnVsZXMiLCJwdXNoIiwidHlwZSIsInByb21wdCIsInB3X1ZhbGlkYXRlUGFzc3dvcmRFbXB0eSIsInB3X1ZhbGlkYXRlUGFzc3dvcmRXZWFrIiwiaWRlbnRpZmllciIsImZuIiwiZm9ybSIsInNldHRpbmdzIiwicGFzc3dvcmRTdHJlbmd0aCIsInRlc3QiLCJjYWNoZUtleSIsImhhbmRsZVZhbGlkYXRpb25SZXN1bHQiLCJjbGVhclRpbWVvdXQiLCJsb2NhbFNjb3JlIiwic2NvcmVQYXNzd29yZExvY2FsIiwidXBkYXRlUHJvZ3Jlc3NCYXIiLCJQYXNzd29yZHNBUEkiLCJyZXN1bHQiLCJnZXRTdHJlbmd0aExhYmVsIiwidW5pcXVlQ2hhcnMiLCJTZXQiLCJzaXplIiwidW5pcXVlUmF0aW8iLCJtYXgiLCJtaW4iLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJzaG93QWN0aXZpdHkiLCJnZXRDb2xvckZvclNjb3JlIiwibWVzc2FnZVR5cGUiLCJoaWRlV2FybmluZ3MiLCIkZm9ybU9iaiIsImdlbmVyYXRlQ2FsbGJhY2siLCJzZXRHZW5lcmF0ZWRQYXNzd29yZCIsImNoYXJzIiwiaSIsImNoYXJBdCIsImZsb29yIiwidHJpZ2dlciIsImRhdGFDaGFuZ2VkIiwiY29sb3JDbGFzcyIsImVtcHR5IiwiaWNvbkNsYXNzIiwibGlzdEl0ZW1zIiwibWFwIiwibXNnIiwiam9pbiIsIiRsYWJlbCIsIiRpY29uIiwiYnRfVG9vbFRpcEhpZGVQYXNzd29yZCIsInVwZGF0ZUNvbmZpZyIsImluc3RhbmNlT3JGaWVsZElkIiwibmV3T3B0aW9ucyIsImdldCIsInJlbW92ZSIsImhpZGVTdHJlbmd0aEJhciIsImhhc0J1dHRvbnMiLCJnZXRTdGF0ZSIsImRlc3Ryb3lBbGwiLCJmb3JFYWNoIiwiY2xlYXJDYWNoZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsY0FBYyxHQUFHO0FBRW5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsSUFBSUMsR0FBSixFQUxROztBQVFuQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFO0FBQ1JDLElBQUFBLElBQUksRUFBRSxNQURFO0FBQ1E7QUFDaEJDLElBQUFBLElBQUksRUFBRSxNQUZFO0FBRVE7QUFDaEJDLElBQUFBLElBQUks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LSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGFzc3dvcmRzQVBJLCBGb3JtLCBDbGlwYm9hcmRKUyAqL1xuXG4vKipcbiAqIFBhc3N3b3JkIFdpZGdldCBNb2R1bGVcbiAqIFxuICogQSBjb21wcmVoZW5zaXZlIHBhc3N3b3JkIGZpZWxkIGNvbXBvbmVudCB0aGF0IHByb3ZpZGVzOlxuICogLSBQYXNzd29yZCBnZW5lcmF0aW9uXG4gKiAtIFN0cmVuZ3RoIHZhbGlkYXRpb24gd2l0aCByZWFsLXRpbWUgZmVlZGJhY2tcbiAqIC0gVmlzdWFsIHByb2dyZXNzIGluZGljYXRvclxuICogLSBBUEktYmFzZWQgdmFsaWRhdGlvbiB3aXRoIGxvY2FsIGZhbGxiYWNrXG4gKiAtIEZvcm0gdmFsaWRhdGlvbiBpbnRlZ3JhdGlvblxuICogXG4gKiBVc2FnZTpcbiAqIGNvbnN0IHdpZGdldCA9IFBhc3N3b3JkV2lkZ2V0LmluaXQoJyNteVBhc3N3b3JkRmllbGQnLCB7XG4gKiAgICAgbW9kZTogJ2Z1bGwnLCAgICAgICAgICAgICAgLy8gJ2Z1bGwnIHwgJ2dlbmVyYXRlLW9ubHknIHwgJ2Rpc3BsYXktb25seScgfCAnZGlzYWJsZWQnXG4gKiAgICAgdmFsaWRhdGlvbjogJ3NvZnQnLCAgICAgICAgLy8gJ2hhcmQnIHwgJ3NvZnQnIHwgJ25vbmUnXG4gKiAgICAgbWluU2NvcmU6IDYwLFxuICogICAgIGdlbmVyYXRlTGVuZ3RoOiAxNixcbiAqICAgICBvblZhbGlkYXRlOiAoaXNWYWxpZCwgc2NvcmUsIG1lc3NhZ2VzKSA9PiB7IC4uLiB9XG4gKiB9KTtcbiAqL1xuY29uc3QgUGFzc3dvcmRXaWRnZXQgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogQWN0aXZlIHdpZGdldCBpbnN0YW5jZXNcbiAgICAgKi9cbiAgICBpbnN0YW5jZXM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHR5cGVzXG4gICAgICovXG4gICAgVkFMSURBVElPTjoge1xuICAgICAgICBIQVJEOiAnaGFyZCcsICAgLy8gQmxvY2sgZm9ybSBzdWJtaXNzaW9uIGlmIGludmFsaWRcbiAgICAgICAgU09GVDogJ3NvZnQnLCAgIC8vIFNob3cgd2FybmluZ3MgYnV0IGFsbG93IHN1Ym1pc3Npb25cbiAgICAgICAgTk9ORTogJ25vbmUnICAgIC8vIE5vIHZhbGlkYXRpb25cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhY2hlIGZvciB2YWxpZGF0aW9uIHJlc3VsdHNcbiAgICAgKi9cbiAgICB2YWxpZGF0aW9uQ2FjaGU6IHt9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRpbWVycyBmb3IgZGVib3VuY2luZyB2YWxpZGF0aW9uXG4gICAgICovXG4gICAgdmFsaWRhdGlvblRpbWVyczoge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgdmFsaWRhdGlvbjogJ3NvZnQnLFxuICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLCAgLy8gU2hvdy9oaWRlIHBhc3N3b3JkIHRvZ2dsZVxuICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsICAgICAgLy8gQ29weSB0byBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICBtaW5TY29yZTogNjAsXG4gICAgICAgIGdlbmVyYXRlTGVuZ3RoOiAxNixcbiAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICBjaGVja09uTG9hZDogZmFsc2UsXG4gICAgICAgIG9uVmFsaWRhdGU6IG51bGwsICAgICAgICAvLyBDYWxsYmFjazogKGlzVmFsaWQsIHNjb3JlLCBtZXNzYWdlcykgPT4gdm9pZFxuICAgICAgICBvbkdlbmVyYXRlOiBudWxsLCAgICAgICAgLy8gQ2FsbGJhY2s6IChwYXNzd29yZCkgPT4gdm9pZFxuICAgICAgICB2YWxpZGF0aW9uUnVsZXM6IG51bGwgICAgLy8gQ3VzdG9tIHZhbGlkYXRpb24gcnVsZXMgZm9yIEZvcm0uanNcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0XG4gICAgICogQHBhcmFtIHtzdHJpbmd8alF1ZXJ5fSBzZWxlY3RvciAtIEZpZWxkIHNlbGVjdG9yIG9yIGpRdWVyeSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIFdpZGdldCBvcHRpb25zXG4gICAgICogQHJldHVybnMge29iamVjdHxudWxsfSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBpbml0KHNlbGVjdG9yLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJChzZWxlY3Rvcik7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgZmllbGRJZCA9ICRmaWVsZC5hdHRyKCdpZCcpIHx8ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBpbnN0YW5jZSBpZiBhbnlcbiAgICAgICAgaWYgKHRoaXMuaW5zdGFuY2VzLmhhcyhmaWVsZElkKSkge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KGZpZWxkSWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2VcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB7XG4gICAgICAgICAgICBmaWVsZElkLFxuICAgICAgICAgICAgJGZpZWxkLFxuICAgICAgICAgICAgJGNvbnRhaW5lcjogJGZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLFxuICAgICAgICAgICAgb3B0aW9uczogeyAuLi50aGlzLmRlZmF1bHRzLCAuLi5vcHRpb25zIH0sXG4gICAgICAgICAgICBlbGVtZW50czoge30sXG4gICAgICAgICAgICBzdGF0ZToge1xuICAgICAgICAgICAgICAgIGlzVmFsaWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgc2NvcmU6IDAsXG4gICAgICAgICAgICAgICAgc3RyZW5ndGg6ICcnLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiBbXSxcbiAgICAgICAgICAgICAgICBpc0dlbmVyYXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgaXNGb2N1c2VkOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuc2V0KGZpZWxkSWQsIGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemVcbiAgICAgICAgdGhpcy5zZXR1cFVJKGluc3RhbmNlKTtcbiAgICAgICAgdGhpcy5iaW5kRXZlbnRzKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldHVwIGZvcm0gdmFsaWRhdGlvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGluc3RhbmNlLm9wdGlvbnMudmFsaWRhdGlvbiAhPT0gdGhpcy5WQUxJREFUSU9OLk5PTkUpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dXBGb3JtVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGluaXRpYWwgdmFsdWUgaWYgcmVxdWVzdGVkXG4gICAgICAgIGlmIChpbnN0YW5jZS5vcHRpb25zLmNoZWNrT25Mb2FkICYmICRmaWVsZC52YWwoKSkge1xuICAgICAgICAgICAgdGhpcy5jaGVja1Bhc3N3b3JkKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgVUkgZWxlbWVudHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBzZXR1cFVJKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCAkY29udGFpbmVyLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcblxuICAgICAgICAvLyBGaW5kIG9yIGNyZWF0ZSBpbnB1dCB3cmFwcGVyXG4gICAgICAgIGxldCAkaW5wdXRXcmFwcGVyID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBpZiAoJGlucHV0V3JhcHBlci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICRmaWVsZC53cmFwKCc8ZGl2IGNsYXNzPVwidWkgaW5wdXRcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICRpbnB1dFdyYXBwZXIgPSAkZmllbGQucGFyZW50KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEaXNhYmxlIHBhc3N3b3JkIG1hbmFnZXJzXG4gICAgICAgIHRoaXMuZGlzYWJsZVBhc3N3b3JkTWFuYWdlcnMoaW5zdGFuY2UpO1xuXG4gICAgICAgIC8vIEFkZCBzaG93L2hpZGUgcGFzc3dvcmQgYnV0dG9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5zaG93UGFzc3dvcmRCdXR0b24pIHtcbiAgICAgICAgICAgIHRoaXMuYWRkU2hvd0hpZGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGdlbmVyYXRlIGJ1dHRvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuZ2VuZXJhdGVCdXR0b24pIHtcbiAgICAgICAgICAgIHRoaXMuYWRkR2VuZXJhdGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGNsaXBib2FyZCBidXR0b24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLmNsaXBib2FyZEJ1dHRvbikge1xuICAgICAgICAgICAgdGhpcy5hZGRDbGlwYm9hcmRCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHN0cmVuZ3RoIGJhciBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1N0cmVuZ3RoQmFyKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFN0cmVuZ3RoQmFyKGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCB3YXJuaW5ncyBjb250YWluZXIgaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dXYXJuaW5ncykge1xuICAgICAgICAgICAgdGhpcy5hZGRXYXJuaW5nc0NvbnRhaW5lcihpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgaW5wdXQgd3JhcHBlciBjbGFzcyBiYXNlZCBvbiBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICB0aGlzLnVwZGF0ZUlucHV0V3JhcHBlckNsYXNzKGluc3RhbmNlKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBzaG93L2hpZGUgcGFzc3dvcmQgYnV0dG9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkU2hvd0hpZGVCdXR0b24oaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkaW5wdXRXcmFwcGVyID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYnV0dG9uIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5zaG93LWhpZGUtcGFzc3dvcmQnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4gPSAkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5zaG93LWhpZGUtcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJ1dHRvblxuICAgICAgICBjb25zdCAkc2hvd0hpZGVCdG4gPSAkKGBcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gc2hvdy1oaWRlLXBhc3N3b3JkXCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBTaG93UGFzc3dvcmR9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleWUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRzaG93SGlkZUJ0bik7XG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0biA9ICRzaG93SGlkZUJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBnZW5lcmF0ZSBidXR0b25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRHZW5lcmF0ZUJ1dHRvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuID0gJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uZ2VuZXJhdGUtcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJ1dHRvblxuICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSAkKGBcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gZ2VuZXJhdGUtcGFzc3dvcmRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEdlbmVyYXRlUGFzc3dvcmR9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzeW5jIGljb25cIj48L2k+XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBlbmQgdG8gd3JhcHBlclxuICAgICAgICAkaW5wdXRXcmFwcGVyLmFwcGVuZCgkZ2VuZXJhdGVCdG4pO1xuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4gPSAkZ2VuZXJhdGVCdG47XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgY2xpcGJvYXJkIGJ1dHRvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZENsaXBib2FyZEJ1dHRvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLmNsaXBib2FyZCcpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4gPSAkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5jbGlwYm9hcmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJ1dHRvblxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkZmllbGQudmFsKCkgfHwgJyc7XG4gICAgICAgIGNvbnN0ICRjbGlwYm9hcmRCdG4gPSAkKGBcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gY2xpcGJvYXJkXCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY2xpcGJvYXJkLXRleHQ9XCIke2N1cnJlbnRWYWx1ZX1cIlxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weVBhc3N3b3JkfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGNvcHlcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29ybmVyIGtleSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRjbGlwYm9hcmRCdG4pO1xuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuID0gJGNsaXBib2FyZEJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBzdHJlbmd0aCBiYXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRTdHJlbmd0aEJhcihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRjb250YWluZXIgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgcHJvZ3Jlc3MgYmFyIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc0JhciA9ICRjb250YWluZXIuZmluZCgnLnBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uID0gJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtc2VjdGlvbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgcHJvZ3Jlc3MgYmFyXG4gICAgICAgIGNvbnN0ICRwcm9ncmVzc1NlY3Rpb24gPSAkKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwYXNzd29yZC1zdHJlbmd0aC1zZWN0aW9uXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIHBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzIHByb2dyZXNzIGJvdHRvbSBhdHRhY2hlZCBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5zZXJ0IGFmdGVyIGZpZWxkXG4gICAgICAgICRjb250YWluZXIuYXBwZW5kKCRwcm9ncmVzc1NlY3Rpb24pO1xuICAgICAgICBcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyID0gJHByb2dyZXNzU2VjdGlvbi5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbiA9ICRwcm9ncmVzc1NlY3Rpb247XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgd2FybmluZ3MgY29udGFpbmVyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkV2FybmluZ3NDb250YWluZXIoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkY29udGFpbmVyIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdhcm5pbmdzIGNvbnRhaW5lciBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtd2FybmluZ3MnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MgPSAkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC13YXJuaW5ncycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgd2FybmluZ3MgY29udGFpbmVyICh3aWxsIGJlIHBvcHVsYXRlZCB3aGVuIG5lZWRlZClcbiAgICAgICAgY29uc3QgJHdhcm5pbmdzID0gJCgnPGRpdiBjbGFzcz1cInBhc3N3b3JkLXdhcm5pbmdzXCI+PC9kaXY+Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBlbmQgdG8gdGhlIGZpZWxkIGNvbnRhaW5lciAoYWZ0ZXIgcHJvZ3Jlc3MgYmFyIGlmIGV4aXN0cylcbiAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJHdhcm5pbmdzKTtcbiAgICAgICAgXG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncyA9ICR3YXJuaW5ncztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERpc2FibGUgcGFzc3dvcmQgbWFuYWdlcnMgZnJvbSBpbnRlcmZlcmluZyB3aXRoIHBhc3N3b3JkIGZpZWxkc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGRpc2FibGVQYXNzd29yZE1hbmFnZXJzKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGZvcm0gPSAkZmllbGQuY2xvc2VzdCgnZm9ybScpO1xuXG4gICAgICAgIC8vIFNldCBhdHRyaWJ1dGVzIHRvIHByZXZlbnQgYXV0b2ZpbGxcbiAgICAgICAgJGZpZWxkLmF0dHIoe1xuICAgICAgICAgICAgJ2F1dG9jb21wbGV0ZSc6ICdvZmYnLFxuICAgICAgICAgICAgJ2RhdGEtbHBpZ25vcmUnOiAndHJ1ZScsICAgICAgICAgICAvLyBMYXN0UGFzc1xuICAgICAgICAgICAgJ2RhdGEtMXAtaWdub3JlJzogJ3RydWUnLCAgICAgICAgICAvLyAxUGFzc3dvcmRcbiAgICAgICAgICAgICdkYXRhLWZvcm0tdHlwZSc6ICdvdGhlcicsICAgICAgICAgLy8gQ2hyb21lXG4gICAgICAgICAgICAnZGF0YS1id2lnbm9yZSc6ICd0cnVlJywgICAgICAgICAgIC8vIEJpdHdhcmRlblxuICAgICAgICAgICAgJ3JlYWRvbmx5JzogJ3JlYWRvbmx5JyAgICAgICAgICAgICAgLy8gTWFrZSByZWFkb25seSBpbml0aWFsbHlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHJlYWRvbmx5IG9uIGZvY3VzXG4gICAgICAgICRmaWVsZC5vbignZm9jdXMucGFzc3dvcmRNYW5hZ2VyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBob25leXBvdCBmaWVsZCB0byB0cmljayBwYXNzd29yZCBtYW5hZ2Vyc1xuICAgICAgICBpZiAoJGZpZWxkLnByZXYoJy5wYXNzd29yZC1ob25leXBvdCcpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgJGhvbmV5cG90ID0gJCgnPGlucHV0IHR5cGU9XCJwYXNzd29yZFwiIGNsYXNzPVwicGFzc3dvcmQtaG9uZXlwb3RcIiBuYW1lPVwiZmFrZV9wYXNzd29yZF9maWVsZFwiIHN0eWxlPVwicG9zaXRpb246IGFic29sdXRlOyBsZWZ0OiAtOTk5OXB4OyB3aWR0aDogMXB4OyBoZWlnaHQ6IDFweDtcIiB0YWJpbmRleD1cIi0xXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgYXV0b2NvbXBsZXRlPVwib2ZmXCI+Jyk7XG4gICAgICAgICAgICAkZmllbGQuYmVmb3JlKCRob25leXBvdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmV2ZW50IGZvcm0gZnJvbSB0cmlnZ2VyaW5nIHBhc3N3b3JkIHNhdmUgcHJvbXB0XG4gICAgICAgIGlmICgkZm9ybS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkZm9ybS5hdHRyKCdkYXRhLWxwaWdub3JlJywgJ3RydWUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCaW5kIGV2ZW50c1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGJpbmRFdmVudHMoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdy9oaWRlIGJ1dHRvbiBjbGlja1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4ub2ZmKCdjbGljay5wYXNzd29yZFdpZGdldCcpLm9uKCdjbGljay5wYXNzd29yZFdpZGdldCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlUGFzc3dvcmRWaXNpYmlsaXR5KGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZW5lcmF0ZSBidXR0b24gY2xpY2tcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2xpcGJvYXJkIGZ1bmN0aW9uYWxpdHkgZm9yIGNvcHkgYnV0dG9uXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuICYmIHR5cGVvZiBDbGlwYm9hcmRKUyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgQ2xpcGJvYXJkSlMgZm9yIHRoZSBidXR0b25cbiAgICAgICAgICAgIGlmICghaW5zdGFuY2UuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG5bMF0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgZm9yIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzdWNjZXNzZnVsIGNvcHlcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaWVsZCBpbnB1dCBldmVudFxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0ZU9uSW5wdXQpIHtcbiAgICAgICAgICAgICRmaWVsZC5vZmYoJ2lucHV0LnBhc3N3b3JkV2lkZ2V0IGNoYW5nZS5wYXNzd29yZFdpZGdldCcpLm9uKCdpbnB1dC5wYXNzd29yZFdpZGdldCBjaGFuZ2UucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dChpbnN0YW5jZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNsaXBib2FyZCBidXR0b24gd2hlbiBwYXNzd29yZCBjaGFuZ2VzXG4gICAgICAgICRmaWVsZC5vbignaW5wdXQucGFzc3dvcmRXaWRnZXQgY2hhbmdlLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIHN0YXRlIG9uIGVtcHR5XG4gICAgICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhbGwgY2xpcGJvYXJkIGJ1dHRvbnMgKHdpZGdldCdzIGFuZCBhbnkgZXh0ZXJuYWwgb25lcylcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgdmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvY3VzIGV2ZW50IC0gc2hvdyBwcm9ncmVzcyBiYXIgd2hlbiBmaWVsZCBpcyBmb2N1c2VkXG4gICAgICAgICRmaWVsZC5vZmYoJ2ZvY3VzLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2ZvY3VzLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIFNob3cgcHJvZ3Jlc3MgYmFyIGlmIHRoZXJlJ3MgYSBwYXNzd29yZCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgcGFzc3dvcmQgPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICBpZiAocGFzc3dvcmQgJiYgcGFzc3dvcmQgIT09ICcnICYmICF0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdmFsaWRhdGlvbiB0byB1cGRhdGUgcHJvZ3Jlc3MgYmFyXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGVPbklucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCbHVyIGV2ZW50IC0gaGlkZSBwcm9ncmVzcyBiYXIgd2hlbiBmaWVsZCBsb3NlcyBmb2N1c1xuICAgICAgICAkZmllbGQub2ZmKCdibHVyLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2JsdXIucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0ZvY3VzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIEhpZGUgb25seSBwcm9ncmVzcyBiYXIsIGtlZXAgd2FybmluZ3MgdmlzaWJsZVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE5ldmVyIGhpZGUgd2FybmluZ3Mgb24gYmx1ciAtIHRoZXkgc2hvdWxkIHJlbWFpbiB2aXNpYmxlXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogRGlzYWJsZSB3aWRnZXRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBkaXNhYmxlKGluc3RhbmNlKSB7XG4gICAgICAgIGluc3RhbmNlLiRmaWVsZC5wcm9wKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS4kY29udGFpbmVyLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRW5hYmxlIHdpZGdldFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGVuYWJsZShpbnN0YW5jZSkge1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS4kY29udGFpbmVyLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHJlYWQtb25seSBtb2RlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgc2V0UmVhZE9ubHkoaW5zdGFuY2UpIHtcbiAgICAgICAgaW5zdGFuY2UuJGZpZWxkLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIGZvcm0gdmFsaWRhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHNldHVwRm9ybVZhbGlkYXRpb24oaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCBpZiBGb3JtIG9iamVjdCBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSA9PT0gJ3VuZGVmaW5lZCcgfHwgIUZvcm0udmFsaWRhdGVSdWxlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICBpZiAoIWZpZWxkTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgY3VzdG9tIHJ1bGVzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb25SdWxlcykge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzW2ZpZWxkTmFtZV0gPSBvcHRpb25zLnZhbGlkYXRpb25SdWxlcztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gbW9kZVxuICAgICAgICBjb25zdCBydWxlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5vbi1lbXB0eSBydWxlIGZvciBoYXJkIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLkhBUkQpIHtcbiAgICAgICAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHdfVmFsaWRhdGVQYXNzd29yZEVtcHR5XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0cmVuZ3RoIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKG9wdGlvbnMubWluU2NvcmUgPiAwICYmIG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLkhBUkQpIHtcbiAgICAgICAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdwYXNzd29yZFN0cmVuZ3RoJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wd19WYWxpZGF0ZVBhc3N3b3JkV2Vha1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChydWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXNbZmllbGROYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBmaWVsZE5hbWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IHJ1bGVzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgcGFzc3dvcmQgc3RyZW5ndGhcbiAgICAgICAgaWYgKHR5cGVvZiAkLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMucGFzc3dvcmRTdHJlbmd0aCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5wYXNzd29yZFN0cmVuZ3RoID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZS5zdGF0ZS5zY29yZSA+PSBvcHRpb25zLm1pblNjb3JlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgcGFzc3dvcmQgaXMgbWFza2VkIChzZXJ2ZXIgcmV0dXJucyB0aGVzZSB3aGVuIHBhc3N3b3JkIGlzIGhpZGRlbilcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB0byBjaGVja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHBhc3N3b3JkIGFwcGVhcnMgdG8gYmUgbWFza2VkXG4gICAgICovXG4gICAgaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkge1xuICAgICAgICByZXR1cm4gL15beFhdezYsfSR8XlxcKns2LH0kfF5ISURERU4kfF5NQVNLRUQkL2kudGVzdChwYXNzd29yZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW5wdXQgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBoYW5kbGVJbnB1dChpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0IHBhc3N3b3JkID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGlmIGRpc2FibGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBmb3IgbWFza2VkIHBhc3N3b3Jkc1xuICAgICAgICBpZiAodGhpcy5pc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgdGhpcyBpcyBhIGdlbmVyYXRlZCBwYXNzd29yZCAoYWxyZWFkeSB2YWxpZGF0ZWQgaW4gc2V0R2VuZXJhdGVkUGFzc3dvcmQpXG4gICAgICAgIGlmIChpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZCkge1xuICAgICAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNHZW5lcmF0ZWQgPSBmYWxzZTsgLy8gUmVzZXQgZmxhZyBmb3IgbmV4dCBpbnB1dFxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGF0ZSBwYXNzd29yZCBvbmx5IGlmIGZpZWxkIGlzIGZvY3VzZWRcbiAgICAgICAgaWYgKGluc3RhbmNlLnN0YXRlLmlzRm9jdXNlZCkge1xuICAgICAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIHBhc3N3b3JkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3N3b3JkIC0gUGFzc3dvcmQgdG8gdmFsaWRhdGVcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCkge1xuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGVtcHR5IHBhc3N3b3JkXG4gICAgICAgIGlmICghcGFzc3dvcmQgfHwgcGFzc3dvcmQgPT09ICcnKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBmb3IgbWFza2VkIHBhc3N3b3JkcyAoc2VydmVyIHJldHVybnMgdGhlc2Ugd2hlbiBwYXNzd29yZCBpcyBoaWRkZW4pXG4gICAgICAgIC8vIENvbW1vbiBwYXR0ZXJuczogeHh4eHh4eCwgWFhYWFhYWFgsICoqKioqKiosIEhJRERFTiwgZXRjLlxuICAgICAgICBpZiAodGhpcy5pc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHByb2dyZXNzIHNlY3Rpb24gb25seSBpZiBmaWVsZCBpcyBmb2N1c2VkXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uICYmIGluc3RhbmNlLnN0YXRlLmlzRm9jdXNlZCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGNhY2hlIGZpcnN0XG4gICAgICAgIGNvbnN0IGNhY2hlS2V5ID0gYCR7aW5zdGFuY2UuZmllbGRJZH06JHtwYXNzd29yZH1gO1xuICAgICAgICBpZiAodGhpcy52YWxpZGF0aW9uQ2FjaGVbY2FjaGVLZXldKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZVZhbGlkYXRpb25SZXN1bHQoaW5zdGFuY2UsIHRoaXMudmFsaWRhdGlvbkNhY2hlW2NhY2hlS2V5XSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHRpbWVyXG4gICAgICAgIGlmICh0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0pIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGltbWVkaWF0ZSBsb2NhbCBmZWVkYmFja1xuICAgICAgICBjb25zdCBsb2NhbFNjb3JlID0gdGhpcy5zY29yZVBhc3N3b3JkTG9jYWwocGFzc3dvcmQpO1xuICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzQmFyKGluc3RhbmNlLCBsb2NhbFNjb3JlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlYm91bmNlIEFQSSBjYWxsXG4gICAgICAgIHRoaXMudmFsaWRhdGlvblRpbWVyc1tpbnN0YW5jZS5maWVsZElkXSA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgLy8gVXNlIEFQSSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICh0eXBlb2YgUGFzc3dvcmRzQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFBhc3N3b3Jkc0FQSS52YWxpZGF0ZVBhc3N3b3JkKHBhc3N3b3JkLCBpbnN0YW5jZS5maWVsZElkLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENhY2hlIHJlc3VsdFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52YWxpZGF0aW9uQ2FjaGVbY2FjaGVLZXldID0gcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVWYWxpZGF0aW9uUmVzdWx0KGluc3RhbmNlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBsb2NhbCB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgICAgICBzY29yZTogbG9jYWxTY29yZSxcbiAgICAgICAgICAgICAgICAgICAgaXNWYWxpZDogbG9jYWxTY29yZSA+PSBvcHRpb25zLm1pblNjb3JlLFxuICAgICAgICAgICAgICAgICAgICBzdHJlbmd0aDogdGhpcy5nZXRTdHJlbmd0aExhYmVsKGxvY2FsU2NvcmUpLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczogW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgcmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgNzAwKTsgLy8gSW5jcmVhc2VkIGRlYm91bmNlIGZvciBtb3JlIGNvbWZvcnRhYmxlIHR5cGluZ1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIHBhc3N3b3JkIHNjb3JlIGxvY2FsbHlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB0byBzY29yZVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFNjb3JlIGZyb20gMC0xMDBcbiAgICAgKi9cbiAgICBzY29yZVBhc3N3b3JkTG9jYWwocGFzc3dvcmQpIHtcbiAgICAgICAgbGV0IHNjb3JlID0gMDtcbiAgICAgICAgaWYgKCFwYXNzd29yZCB8fCBwYXNzd29yZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBzY29yZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gcGFzc3dvcmQubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgLy8gTGVuZ3RoIHNjb3JpbmcgKHVwIHRvIDMwIHBvaW50cylcbiAgICAgICAgaWYgKGxlbmd0aCA+PSAxNikge1xuICAgICAgICAgICAgc2NvcmUgKz0gMzA7XG4gICAgICAgIH0gZWxzZSBpZiAobGVuZ3RoID49IDEyKSB7XG4gICAgICAgICAgICBzY29yZSArPSAyMDtcbiAgICAgICAgfSBlbHNlIGlmIChsZW5ndGggPj0gOCkge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTA7XG4gICAgICAgIH0gZWxzZSBpZiAobGVuZ3RoID49IDYpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoYXJhY3RlciBkaXZlcnNpdHkgKHVwIHRvIDQwIHBvaW50cylcbiAgICAgICAgaWYgKC9bYS16XS8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAvLyBMb3dlcmNhc2VcbiAgICAgICAgaWYgKC9bQS1aXS8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAvLyBVcHBlcmNhc2VcbiAgICAgICAgaWYgKC9cXGQvLnRlc3QocGFzc3dvcmQpKSBzY29yZSArPSAxMDsgICAgIC8vIERpZ2l0c1xuICAgICAgICBpZiAoL1xcVy8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAgICAgLy8gU3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICAgIFxuICAgICAgICAvLyBQYXR0ZXJuIGNvbXBsZXhpdHkgKHVwIHRvIDMwIHBvaW50cylcbiAgICAgICAgY29uc3QgdW5pcXVlQ2hhcnMgPSBuZXcgU2V0KHBhc3N3b3JkKS5zaXplO1xuICAgICAgICBjb25zdCB1bmlxdWVSYXRpbyA9IHVuaXF1ZUNoYXJzIC8gbGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgaWYgKHVuaXF1ZVJhdGlvID4gMC43KSB7XG4gICAgICAgICAgICBzY29yZSArPSAyMDtcbiAgICAgICAgfSBlbHNlIGlmICh1bmlxdWVSYXRpbyA+IDAuNSkge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTU7XG4gICAgICAgIH0gZWxzZSBpZiAodW5pcXVlUmF0aW8gPiAwLjMpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDEwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2NvcmUgKz0gNTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUGVuYWx0aWVzIGZvciBjb21tb24gcGF0dGVybnNcbiAgICAgICAgaWYgKC8oLilcXDF7Mix9Ly50ZXN0KHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgc2NvcmUgLT0gMTA7IC8vIFJlcGVhdGluZyBjaGFyYWN0ZXJzXG4gICAgICAgIH1cbiAgICAgICAgaWYgKC8oMDEyfDEyM3wyMzR8MzQ1fDQ1Nnw1Njd8Njc4fDc4OXw4OTB8YWJjfGJjZHxjZGV8ZGVmKS9pLnRlc3QocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICBzY29yZSAtPSAxMDsgLy8gU2VxdWVudGlhbCBwYXR0ZXJuc1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCBzY29yZSkpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0cmVuZ3RoIGxhYmVsIGZvciBzY29yZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29yZSAtIFBhc3N3b3JkIHNjb3JlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gU3RyZW5ndGggbGFiZWxcbiAgICAgKi9cbiAgICBnZXRTdHJlbmd0aExhYmVsKHNjb3JlKSB7XG4gICAgICAgIGlmIChzY29yZSA8IDIwKSByZXR1cm4gJ3Zlcnlfd2Vhayc7XG4gICAgICAgIGlmIChzY29yZSA8IDQwKSByZXR1cm4gJ3dlYWsnO1xuICAgICAgICBpZiAoc2NvcmUgPCA2MCkgcmV0dXJuICdmYWlyJztcbiAgICAgICAgaWYgKHNjb3JlIDwgODApIHJldHVybiAnZ29vZCc7XG4gICAgICAgIHJldHVybiAnc3Ryb25nJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwcm9ncmVzcyBiYXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcmUgLSBQYXNzd29yZCBzY29yZVxuICAgICAqL1xuICAgIHVwZGF0ZVByb2dyZXNzQmFyKGluc3RhbmNlLCBzY29yZSkge1xuICAgICAgICBjb25zdCB7IGVsZW1lbnRzIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIGlmICghZWxlbWVudHMuJHByb2dyZXNzQmFyIHx8IGVsZW1lbnRzLiRwcm9ncmVzc0Jhci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzXG4gICAgICAgIGVsZW1lbnRzLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG4gICAgICAgICAgICBwZXJjZW50OiBNYXRoLm1pbihzY29yZSwgMTAwKSxcbiAgICAgICAgICAgIHNob3dBY3Rpdml0eTogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNvbG9yXG4gICAgICAgIGVsZW1lbnRzLiRwcm9ncmVzc0JhclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdyZWQgb3JhbmdlIHllbGxvdyBvbGl2ZSBncmVlbicpXG4gICAgICAgICAgICAuYWRkQ2xhc3ModGhpcy5nZXRDb2xvckZvclNjb3JlKHNjb3JlKSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY29sb3IgY2xhc3MgZm9yIHNjb3JlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3JlIC0gUGFzc3dvcmQgc2NvcmVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDb2xvciBjbGFzcyBuYW1lXG4gICAgICovXG4gICAgZ2V0Q29sb3JGb3JTY29yZShzY29yZSkge1xuICAgICAgICBpZiAoc2NvcmUgPCAyMCkgcmV0dXJuICdyZWQnO1xuICAgICAgICBpZiAoc2NvcmUgPCA0MCkgcmV0dXJuICdvcmFuZ2UnO1xuICAgICAgICBpZiAoc2NvcmUgPCA2MCkgcmV0dXJuICd5ZWxsb3cnO1xuICAgICAgICBpZiAoc2NvcmUgPCA4MCkgcmV0dXJuICdvbGl2ZSc7XG4gICAgICAgIHJldHVybiAnZ3JlZW4nO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHZhbGlkYXRpb24gcmVzdWx0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCAtIFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICovXG4gICAgaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgcmVzdWx0KSB7XG4gICAgICAgIGlmICghcmVzdWx0KSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRlXG4gICAgICAgIGluc3RhbmNlLnN0YXRlID0ge1xuICAgICAgICAgICAgaXNWYWxpZDogcmVzdWx0LmlzVmFsaWQgfHwgcmVzdWx0LnNjb3JlID49IG9wdGlvbnMubWluU2NvcmUsXG4gICAgICAgICAgICBzY29yZTogcmVzdWx0LnNjb3JlLFxuICAgICAgICAgICAgc3RyZW5ndGg6IHJlc3VsdC5zdHJlbmd0aCB8fCB0aGlzLmdldFN0cmVuZ3RoTGFiZWwocmVzdWx0LnNjb3JlKSxcbiAgICAgICAgICAgIG1lc3NhZ2VzOiByZXN1bHQubWVzc2FnZXMgfHwgW10sXG4gICAgICAgICAgICBpc0dlbmVyYXRlZDogaW5zdGFuY2Uuc3RhdGUuaXNHZW5lcmF0ZWRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBVSVxuICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzQmFyKGluc3RhbmNlLCByZXN1bHQuc2NvcmUpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyB3YXJuaW5ncy9lcnJvcnNcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1dhcm5pbmdzICYmIHJlc3VsdC5tZXNzYWdlcyAmJiByZXN1bHQubWVzc2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZVR5cGUgPSBpbnN0YW5jZS5zdGF0ZS5pc1ZhbGlkID8gJ3dhcm5pbmcnIDogJ2Vycm9yJztcbiAgICAgICAgICAgIHRoaXMuc2hvd1dhcm5pbmdzKGluc3RhbmNlLCByZXN1bHQsIG1lc3NhZ2VUeXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZVdhcm5pbmdzKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2FsbCB2YWxpZGF0aW9uIGNhbGxiYWNrXG4gICAgICAgIGlmIChvcHRpb25zLm9uVmFsaWRhdGUpIHtcbiAgICAgICAgICAgIG9wdGlvbnMub25WYWxpZGF0ZShpbnN0YW5jZS5zdGF0ZS5pc1ZhbGlkLCByZXN1bHQuc2NvcmUsIHJlc3VsdC5tZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtIHZhbGlkYXRpb24gc3RhdGVcbiAgICAgICAgaWYgKEZvcm0gJiYgRm9ybS4kZm9ybU9iaikge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gaW5zdGFuY2UuJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCBpbnN0YW5jZS4kZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmICghaW5zdGFuY2Uuc3RhdGUuaXNWYWxpZCAmJiBvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5IQVJEKSB7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdhZGQgcHJvbXB0JywgZmllbGROYW1lLCByZXN1bHQubWVzc2FnZXNbMF0gfHwgJ0ludmFsaWQgcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgZmllbGROYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgcGFzc3dvcmRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVBhc3N3b3JkKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdlbmVyYXRlIHBhc3N3b3JkXG4gICAgICAgIGNvbnN0IGdlbmVyYXRlQ2FsbGJhY2sgPSAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwYXNzd29yZCA9IHR5cGVvZiByZXN1bHQgPT09ICdzdHJpbmcnID8gcmVzdWx0IDogcmVzdWx0LnBhc3N3b3JkO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgcGFzc3dvcmRcbiAgICAgICAgICAgIHRoaXMuc2V0R2VuZXJhdGVkUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCBjYWxsYmFja1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMub25HZW5lcmF0ZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMub25HZW5lcmF0ZShwYXNzd29yZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgQVBJIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIFBhc3N3b3Jkc0FQSSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIFBhc3N3b3Jkc0FQSS5nZW5lcmF0ZVBhc3N3b3JkKG9wdGlvbnMuZ2VuZXJhdGVMZW5ndGgsIGdlbmVyYXRlQ2FsbGJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2ltcGxlIGxvY2FsIGdlbmVyYXRvclxuICAgICAgICAgICAgY29uc3QgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkhQCMkJV4mKic7XG4gICAgICAgICAgICBsZXQgcGFzc3dvcmQgPSAnJztcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3B0aW9ucy5nZW5lcmF0ZUxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGFzc3dvcmQgKz0gY2hhcnMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZ2VuZXJhdGVDYWxsYmFjayhwYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCBnZW5lcmF0ZWQgcGFzc3dvcmRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBHZW5lcmF0ZWQgcGFzc3dvcmRcbiAgICAgKi9cbiAgICBzZXRHZW5lcmF0ZWRQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsICRjb250YWluZXIsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGdlbmVyYXRlZCBmbGFnIGZpcnN0IHRvIHByZXZlbnQgZHVwbGljYXRlIHZhbGlkYXRpb25cbiAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNHZW5lcmF0ZWQgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHZhbHVlIHdpdGhvdXQgdHJpZ2dlcmluZyBjaGFuZ2UgZXZlbnQgeWV0XG4gICAgICAgICRmaWVsZC52YWwocGFzc3dvcmQpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjbGlwYm9hcmQgYnV0dG9ucyAod2lkZ2V0J3MgYW5kIGFueSBleHRlcm5hbCBvbmVzKVxuICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIHBhc3N3b3JkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIG9uY2UgaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gIT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm93IHRyaWdnZXIgY2hhbmdlIGZvciBmb3JtIHRyYWNraW5nICh2YWxpZGF0aW9uIGFscmVhZHkgZG9uZSBhYm92ZSlcbiAgICAgICAgJGZpZWxkLnRyaWdnZXIoJ2NoYW5nZScpXG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHdhcm5pbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCAtIFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBNZXNzYWdlIHR5cGUgKHdhcm5pbmcvZXJyb3IpXG4gICAgICovXG4gICAgc2hvd1dhcm5pbmdzKGluc3RhbmNlLCByZXN1bHQsIHR5cGUgPSAnd2FybmluZycpIHtcbiAgICAgICAgaWYgKCFpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHsgZWxlbWVudHMgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCBjb2xvckNsYXNzID0gdHlwZSA9PT0gJ2Vycm9yJyA/ICdyZWQnIDogJ29yYW5nZSc7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB3YXJuaW5nc1xuICAgICAgICBlbGVtZW50cy4kd2FybmluZ3MuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB3YXJuaW5ncyBhcyBwb2ludGluZyBsYWJlbFxuICAgICAgICBpZiAocmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBDaG9vc2UgaWNvbiBiYXNlZCBvbiBtZXNzYWdlIHR5cGVcbiAgICAgICAgICAgIGNvbnN0IGljb25DbGFzcyA9IHR5cGUgPT09ICdlcnJvcicgPyAnZXhjbGFtYXRpb24gY2lyY2xlJyA6ICdleGNsYW1hdGlvbiB0cmlhbmdsZSc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSBsaXN0IGl0ZW1zIGZyb20gbWVzc2FnZXMgd2l0aCBpY29uc1xuICAgICAgICAgICAgY29uc3QgbGlzdEl0ZW1zID0gcmVzdWx0Lm1lc3NhZ2VzLm1hcChtc2cgPT4gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtpY29uQ2xhc3N9IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+JHttc2d9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKS5qb2luKCcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIHBvaW50aW5nIGFib3ZlIGxhYmVsIHdpdGggbGlzdCAocG9pbnRzIHRvIHBhc3N3b3JkIGZpZWxkKVxuICAgICAgICAgICAgY29uc3QgJGxhYmVsID0gJChgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nICR7Y29sb3JDbGFzc30gYmFzaWMgbGFiZWxcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGxpc3RcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7bGlzdEl0ZW1zfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBlbGVtZW50cy4kd2FybmluZ3MuYXBwZW5kKCRsYWJlbCkuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHdhcm5pbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgaGlkZVdhcm5pbmdzKGluc3RhbmNlKSB7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncy5lbXB0eSgpLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHBhc3N3b3JkIHZpc2liaWxpdHlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICB0b2dnbGVQYXNzd29yZFZpc2liaWxpdHkoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkc2hvd0hpZGVCdG4gPSBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG47XG4gICAgICAgIFxuICAgICAgICBpZiAoISRzaG93SGlkZUJ0bikgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJGljb24gPSAkc2hvd0hpZGVCdG4uZmluZCgnaScpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdwYXNzd29yZCcpIHtcbiAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmRcbiAgICAgICAgICAgICRmaWVsZC5hdHRyKCd0eXBlJywgJ3RleHQnKTtcbiAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUnKS5hZGRDbGFzcygnZXllIHNsYXNoJyk7XG4gICAgICAgICAgICAkc2hvd0hpZGVCdG4uYXR0cignZGF0YS1jb250ZW50JywgZ2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBIaWRlUGFzc3dvcmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBwYXNzd29yZFxuICAgICAgICAgICAgJGZpZWxkLmF0dHIoJ3R5cGUnLCAncGFzc3dvcmQnKTtcbiAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUgc2xhc2gnKS5hZGRDbGFzcygnZXllJyk7XG4gICAgICAgICAgICAkc2hvd0hpZGVCdG4uYXR0cignZGF0YS1jb250ZW50JywgZ2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBTaG93UGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciB2YWxpZGF0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKSB7XG4gICAgICAgIC8vIENsZWFyIHdhcm5pbmdzIHdoZW4gZXhwbGljaXRseSBjbGVhcmluZyB2YWxpZGF0aW9uIChlbXB0eSBwYXNzd29yZClcbiAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc0Jhcikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyLnByb2dyZXNzKHsgcGVyY2VudDogMCB9KTtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS5zdGF0ZSA9IHtcbiAgICAgICAgICAgIGlzVmFsaWQ6IHRydWUsXG4gICAgICAgICAgICBzY29yZTogMCxcbiAgICAgICAgICAgIHN0cmVuZ3RoOiAnJyxcbiAgICAgICAgICAgIG1lc3NhZ2VzOiBbXSxcbiAgICAgICAgICAgIGlzR2VuZXJhdGVkOiBmYWxzZSxcbiAgICAgICAgICAgIGlzRm9jdXNlZDogaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkIHx8IGZhbHNlXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBwYXNzd29yZCAobWFudWFsIHZhbGlkYXRpb24pXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgY2hlY2tQYXNzd29yZChpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCBwYXNzd29yZCA9IGluc3RhbmNlLiRmaWVsZC52YWwoKTtcbiAgICAgICAgaWYgKHBhc3N3b3JkICYmIHBhc3N3b3JkICE9PSAnJykge1xuICAgICAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGZvciBtYXNrZWQgcGFzc3dvcmRzXG4gICAgICAgICAgICBpZiAodGhpcy5pc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBGb3IgaW5pdGlhbCBjaGVjaywgZG9uJ3Qgc2hvdyBwcm9ncmVzcyBiYXIgYnV0IGRvIHZhbGlkYXRlIGFuZCBzaG93IHdhcm5pbmdzXG4gICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGluc3RhbmNlT3JGaWVsZElkIC0gSW5zdGFuY2Ugb3IgZmllbGQgSURcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbmV3T3B0aW9ucyAtIE5ldyBvcHRpb25zXG4gICAgICovXG4gICAgdXBkYXRlQ29uZmlnKGluc3RhbmNlT3JGaWVsZElkLCBuZXdPcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBvcHRpb25zXG4gICAgICAgIGluc3RhbmNlLm9wdGlvbnMgPSB7IC4uLmluc3RhbmNlLm9wdGlvbnMsIC4uLm5ld09wdGlvbnMgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBkeW5hbWljIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnc2hvd1Bhc3N3b3JkQnV0dG9uJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5zaG93UGFzc3dvcmRCdXR0b24gJiYgIWluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBidXR0b24gaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgIHRoaXMuYWRkU2hvd0hpZGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIC8vIFJlLWJpbmQgZXZlbnRzIGZvciB0aGUgbmV3IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b2dnbGVQYXNzd29yZFZpc2liaWxpdHkoaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFuZXdPcHRpb25zLnNob3dQYXNzd29yZEJ1dHRvbiAmJiBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYnV0dG9uIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZ2VuZXJhdGUgYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdnZW5lcmF0ZUJ1dHRvbicgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuZ2VuZXJhdGVCdXR0b24gJiYgIWluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBidXR0b24gaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgIHRoaXMuYWRkR2VuZXJhdGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIC8vIFJlLWJpbmQgZXZlbnRzIGZvciB0aGUgbmV3IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVBhc3N3b3JkKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLnBvcHVwKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICghbmV3T3B0aW9ucy5nZW5lcmF0ZUJ1dHRvbiAmJiBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYnV0dG9uIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2xpcGJvYXJkIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnY2xpcGJvYXJkQnV0dG9uJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5jbGlwYm9hcmRCdXR0b24gJiYgIWluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgYnV0dG9uIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICB0aGlzLmFkZENsaXBib2FyZEJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBjbGlwYm9hcmQgZm9yIHRoZSBuZXcgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4gJiYgdHlwZW9mIENsaXBib2FyZEpTICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIENsaXBib2FyZEpTIGZvciB0aGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkID0gbmV3IENsaXBib2FyZEpTKGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG5bMF0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cCBmb3IgY2xpcGJvYXJkIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc3VjY2Vzc2Z1bCBjb3B5XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxNTAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW5ld09wdGlvbnMuY2xpcGJvYXJkQnV0dG9uICYmIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYnV0dG9uIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmNsaXBib2FyZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHN0cmVuZ3RoIGJhciB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnc2hvd1N0cmVuZ3RoQmFyJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5zaG93U3RyZW5ndGhCYXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dTdHJlbmd0aEJhcihpbnN0YW5jZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVN0cmVuZ3RoQmFyKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHdhcm5pbmdzIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdzaG93V2FybmluZ3MnIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLnNob3dXYXJuaW5ncykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1dhcm5pbmdzKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW5wdXQgd3JhcHBlciBhY3Rpb24gY2xhc3MgYmFzZWQgb24gYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyhpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1zZXR1cCBmb3JtIHZhbGlkYXRpb24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChpbnN0YW5jZS5vcHRpb25zLnZhbGlkYXRpb24gIT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwRm9ybVZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBjdXJyZW50IHZhbHVlIGlmIHZhbGlkYXRpb24gY2hhbmdlZFxuICAgICAgICBpZiAoJ3ZhbGlkYXRpb24nIGluIG5ld09wdGlvbnMgJiYgaW5zdGFuY2UuJGZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICB0aGlzLmNoZWNrUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaW5wdXQgd3JhcHBlciBhY3Rpb24gY2xhc3MgYmFzZWQgb24gYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICB1cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCAkaW5wdXRXcmFwcGVyID0gaW5zdGFuY2UuJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBjb25zdCBoYXNCdXR0b25zID0gISEoXG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4gfHwgXG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4gfHwgXG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaGFzQnV0dG9ucykge1xuICAgICAgICAgICAgJGlucHV0V3JhcHBlci5hZGRDbGFzcygnYWN0aW9uJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkaW5wdXRXcmFwcGVyLnJlbW92ZUNsYXNzKCdhY3Rpb24nKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHdpZGdldCBzdGF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gaW5zdGFuY2VPckZpZWxkSWQgLSBJbnN0YW5jZSBvciBmaWVsZCBJRFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R8bnVsbH0gV2lkZ2V0IHN0YXRlXG4gICAgICovXG4gICAgZ2V0U3RhdGUoaW5zdGFuY2VPckZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0eXBlb2YgaW5zdGFuY2VPckZpZWxkSWQgPT09ICdzdHJpbmcnIFxuICAgICAgICAgICAgPyB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VPckZpZWxkSWQpXG4gICAgICAgICAgICA6IGluc3RhbmNlT3JGaWVsZElkO1xuICAgICAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZSA/IGluc3RhbmNlLnN0YXRlIDogbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgc3RyZW5ndGggYmFyXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBpbnN0YW5jZU9yRmllbGRJZCAtIEluc3RhbmNlIG9yIGZpZWxkIElEXG4gICAgICovXG4gICAgc2hvd1N0cmVuZ3RoQmFyKGluc3RhbmNlT3JGaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgc3RyZW5ndGggYmFyXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBpbnN0YW5jZU9yRmllbGRJZCAtIEluc3RhbmNlIG9yIGZpZWxkIElEXG4gICAgICovXG4gICAgaGlkZVN0cmVuZ3RoQmFyKGluc3RhbmNlT3JGaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgd2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGRlc3Ryb3koZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gVW5iaW5kIGV2ZW50c1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQub2ZmKCcucGFzc3dvcmRXaWRnZXQnKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignLnBhc3N3b3JkV2lkZ2V0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuLm9mZignLnBhc3N3b3JkV2lkZ2V0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgY2xpcGJvYXJkIGluc3RhbmNlXG4gICAgICAgIGlmIChpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuY2xpcGJvYXJkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB0aW1lclxuICAgICAgICBpZiAodGhpcy52YWxpZGF0aW9uVGltZXJzW2ZpZWxkSWRdKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy52YWxpZGF0aW9uVGltZXJzW2ZpZWxkSWRdKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnZhbGlkYXRpb25UaW1lcnNbZmllbGRJZF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5kZWxldGUoZmllbGRJZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IGFsbCBpbnN0YW5jZXNcbiAgICAgKi9cbiAgICBkZXN0cm95QWxsKCkge1xuICAgICAgICB0aGlzLmluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSwgZmllbGRJZCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KGZpZWxkSWQpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy52YWxpZGF0aW9uQ2FjaGUgPSB7fTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIHZhbGlkYXRpb24gY2FjaGVcbiAgICAgKi9cbiAgICBjbGVhckNhY2hlKCkge1xuICAgICAgICB0aGlzLnZhbGlkYXRpb25DYWNoZSA9IHt9O1xuICAgIH1cbn07Il19