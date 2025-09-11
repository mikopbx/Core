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
    } // Add show/hide password button if needed


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvcGFzc3dvcmQtd2lkZ2V0LmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkV2lkZ2V0IiwiaW5zdGFuY2VzIiwiTWFwIiwiVkFMSURBVElPTiIsIkhBUkQiLCJTT0ZUIiwiTk9ORSIsInZhbGlkYXRpb25DYWNoZSIsInZhbGlkYXRpb25UaW1lcnMiLCJkZWZhdWx0cyIsInZhbGlkYXRpb24iLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm9uVmFsaWRhdGUiLCJvbkdlbmVyYXRlIiwidmFsaWRhdGlvblJ1bGVzIiwiaW5pdCIsInNlbGVjdG9yIiwib3B0aW9ucyIsIiRmaWVsZCIsIiQiLCJsZW5ndGgiLCJmaWVsZElkIiwiYXR0ciIsIk1hdGgiLCJyYW5kb20iLCJ0b1N0cmluZyIsInN1YnN0ciIsImhhcyIsImRlc3Ryb3kiLCJpbnN0YW5jZSIsIiRjb250YWluZXIiLCJjbG9zZXN0IiwiZWxlbWVudHMiLCJzdGF0ZSIsImlzVmFsaWQiLCJzY29yZSIsInN0cmVuZ3RoIiwibWVzc2FnZXMiLCJpc0dlbmVyYXRlZCIsImlzRm9jdXNlZCIsInNldCIsInNldHVwVUkiLCJiaW5kRXZlbnRzIiwic2V0dXBGb3JtVmFsaWRhdGlvbiIsInZhbCIsImNoZWNrUGFzc3dvcmQiLCIkaW5wdXRXcmFwcGVyIiwid3JhcCIsInBhcmVudCIsImFkZFNob3dIaWRlQnV0dG9uIiwiYWRkR2VuZXJhdGVCdXR0b24iLCJhZGRDbGlwYm9hcmRCdXR0b24iLCJhZGRTdHJlbmd0aEJhciIsImFkZFdhcm5pbmdzQ29udGFpbmVyIiwidXBkYXRlSW5wdXRXcmFwcGVyQ2xhc3MiLCJmaW5kIiwiJHNob3dIaWRlQnRuIiwiZ2xvYmFsVHJhbnNsYXRlIiwiYnRfVG9vbFRpcFNob3dQYXNzd29yZCIsImFwcGVuZCIsIiRnZW5lcmF0ZUJ0biIsImJ0X1Rvb2xUaXBHZW5lcmF0ZVBhc3N3b3JkIiwiJGNsaXBib2FyZEJ0biIsImN1cnJlbnRWYWx1ZSIsImJ0X1Rvb2xUaXBDb3B5UGFzc3dvcmQiLCIkcHJvZ3Jlc3NCYXIiLCIkcHJvZ3Jlc3NTZWN0aW9uIiwiJHdhcm5pbmdzIiwib2ZmIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJ0b2dnbGVQYXNzd29yZFZpc2liaWxpdHkiLCJnZW5lcmF0ZVBhc3N3b3JkIiwiQ2xpcGJvYXJkSlMiLCJjbGlwYm9hcmQiLCJwb3B1cCIsInNldFRpbWVvdXQiLCJjbGVhclNlbGVjdGlvbiIsImhhbmRsZUlucHV0IiwidmFsdWUiLCJjbGVhclZhbGlkYXRpb24iLCJwYXNzd29yZCIsImlzTWFza2VkUGFzc3dvcmQiLCJzaG93IiwidmFsaWRhdGVQYXNzd29yZCIsImhpZGUiLCJkaXNhYmxlIiwicHJvcCIsImFkZENsYXNzIiwiZW5hYmxlIiwicmVtb3ZlQ2xhc3MiLCJzZXRSZWFkT25seSIsIkZvcm0iLCJ2YWxpZGF0ZVJ1bGVzIiwiZmllbGROYW1lIiwicnVsZXMiLCJwdXNoIiwidHlwZSIsInByb21wdCIsInB3X1ZhbGlkYXRlUGFzc3dvcmRFbXB0eSIsInB3X1ZhbGlkYXRlUGFzc3dvcmRXZWFrIiwiaWRlbnRpZmllciIsImZuIiwiZm9ybSIsInNldHRpbmdzIiwicGFzc3dvcmRTdHJlbmd0aCIsInRlc3QiLCJjYWNoZUtleSIsImhhbmRsZVZhbGlkYXRpb25SZXN1bHQiLCJjbGVhclRpbWVvdXQiLCJsb2NhbFNjb3JlIiwic2NvcmVQYXNzd29yZExvY2FsIiwidXBkYXRlUHJvZ3Jlc3NCYXIiLCJQYXNzd29yZFZhbGlkYXRpb25BUEkiLCJyZXN1bHQiLCJnZXRTdHJlbmd0aExhYmVsIiwidW5pcXVlQ2hhcnMiLCJTZXQiLCJzaXplIiwidW5pcXVlUmF0aW8iLCJtYXgiLCJtaW4iLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJzaG93QWN0aXZpdHkiLCJnZXRDb2xvckZvclNjb3JlIiwibWVzc2FnZVR5cGUiLCJoaWRlV2FybmluZ3MiLCIkZm9ybU9iaiIsImdlbmVyYXRlQ2FsbGJhY2siLCJzZXRHZW5lcmF0ZWRQYXNzd29yZCIsImNoYXJzIiwiaSIsImNoYXJBdCIsImZsb29yIiwidHJpZ2dlciIsImRhdGFDaGFuZ2VkIiwiY29sb3JDbGFzcyIsImVtcHR5IiwiaWNvbkNsYXNzIiwibGlzdEl0ZW1zIiwibWFwIiwibXNnIiwiam9pbiIsIiRsYWJlbCIsIiRpY29uIiwiYnRfVG9vbFRpcEhpZGVQYXNzd29yZCIsInVwZGF0ZUNvbmZpZyIsImluc3RhbmNlT3JGaWVsZElkIiwibmV3T3B0aW9ucyIsImdldCIsInJlbW92ZSIsImhpZGVTdHJlbmd0aEJhciIsImhhc0J1dHRvbnMiLCJnZXRTdGF0ZSIsImRlc3Ryb3lBbGwiLCJmb3JFYWNoIiwiY2xlYXJDYWNoZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsY0FBYyxHQUFHO0FBRW5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsSUFBSUMsR0FBSixFQUxROztBQVFuQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFO0FBQ1JDLElBQUFBLElBQUksRUFBRSxNQURFO0FBQ1E7QUFDaEJDLElBQUFBLElBQUksRUFBRSxNQUZFO0FBRVE7QUFDaEJDLElBQUFBLElBQUksRUFBRSxNQUhFLENBR1E7O0FBSFIsR0FYTzs7QUFpQm5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUUs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QUFMLEdBQXVCLEVBQXZCO0FBQ0g7QUEvbkNrQixDQUF2QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFBhc3N3b3JkVmFsaWRhdGlvbkFQSSwgRm9ybSwgQ2xpcGJvYXJkSlMgKi9cblxuLyoqXG4gKiBQYXNzd29yZCBXaWRnZXQgTW9kdWxlXG4gKiBcbiAqIEEgY29tcHJlaGVuc2l2ZSBwYXNzd29yZCBmaWVsZCBjb21wb25lbnQgdGhhdCBwcm92aWRlczpcbiAqIC0gUGFzc3dvcmQgZ2VuZXJhdGlvblxuICogLSBTdHJlbmd0aCB2YWxpZGF0aW9uIHdpdGggcmVhbC10aW1lIGZlZWRiYWNrXG4gKiAtIFZpc3VhbCBwcm9ncmVzcyBpbmRpY2F0b3JcbiAqIC0gQVBJLWJhc2VkIHZhbGlkYXRpb24gd2l0aCBsb2NhbCBmYWxsYmFja1xuICogLSBGb3JtIHZhbGlkYXRpb24gaW50ZWdyYXRpb25cbiAqIFxuICogVXNhZ2U6XG4gKiBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KCcjbXlQYXNzd29yZEZpZWxkJywge1xuICogICAgIG1vZGU6ICdmdWxsJywgICAgICAgICAgICAgIC8vICdmdWxsJyB8ICdnZW5lcmF0ZS1vbmx5JyB8ICdkaXNwbGF5LW9ubHknIHwgJ2Rpc2FibGVkJ1xuICogICAgIHZhbGlkYXRpb246ICdzb2Z0JywgICAgICAgIC8vICdoYXJkJyB8ICdzb2Z0JyB8ICdub25lJ1xuICogICAgIG1pblNjb3JlOiA2MCxcbiAqICAgICBnZW5lcmF0ZUxlbmd0aDogMTYsXG4gKiAgICAgb25WYWxpZGF0ZTogKGlzVmFsaWQsIHNjb3JlLCBtZXNzYWdlcykgPT4geyAuLi4gfVxuICogfSk7XG4gKi9cbmNvbnN0IFBhc3N3b3JkV2lkZ2V0ID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEFjdGl2ZSB3aWRnZXQgaW5zdGFuY2VzXG4gICAgICovXG4gICAgaW5zdGFuY2VzOiBuZXcgTWFwKCksXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiB0eXBlc1xuICAgICAqL1xuICAgIFZBTElEQVRJT046IHtcbiAgICAgICAgSEFSRDogJ2hhcmQnLCAgIC8vIEJsb2NrIGZvcm0gc3VibWlzc2lvbiBpZiBpbnZhbGlkXG4gICAgICAgIFNPRlQ6ICdzb2Z0JywgICAvLyBTaG93IHdhcm5pbmdzIGJ1dCBhbGxvdyBzdWJtaXNzaW9uXG4gICAgICAgIE5PTkU6ICdub25lJyAgICAvLyBObyB2YWxpZGF0aW9uXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBmb3IgdmFsaWRhdGlvbiByZXN1bHRzXG4gICAgICovXG4gICAgdmFsaWRhdGlvbkNhY2hlOiB7fSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUaW1lcnMgZm9yIGRlYm91bmNpbmcgdmFsaWRhdGlvblxuICAgICAqL1xuICAgIHZhbGlkYXRpb25UaW1lcnM6IHt9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIHZhbGlkYXRpb246ICdzb2Z0JyxcbiAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSwgIC8vIFNob3cvaGlkZSBwYXNzd29yZCB0b2dnbGVcbiAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLCAgICAgIC8vIENvcHkgdG8gY2xpcGJvYXJkIGJ1dHRvblxuICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgbWluU2NvcmU6IDYwLFxuICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMTYsXG4gICAgICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSxcbiAgICAgICAgY2hlY2tPbkxvYWQ6IGZhbHNlLFxuICAgICAgICBvblZhbGlkYXRlOiBudWxsLCAgICAgICAgLy8gQ2FsbGJhY2s6IChpc1ZhbGlkLCBzY29yZSwgbWVzc2FnZXMpID0+IHZvaWRcbiAgICAgICAgb25HZW5lcmF0ZTogbnVsbCwgICAgICAgIC8vIENhbGxiYWNrOiAocGFzc3dvcmQpID0+IHZvaWRcbiAgICAgICAgdmFsaWRhdGlvblJ1bGVzOiBudWxsICAgIC8vIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGVzIGZvciBGb3JtLmpzXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGpRdWVyeX0gc2VsZWN0b3IgLSBGaWVsZCBzZWxlY3RvciBvciBqUXVlcnkgb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBXaWRnZXQgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R8bnVsbH0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgaW5pdChzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoc2VsZWN0b3IpO1xuICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkSWQgPSAkZmllbGQuYXR0cignaWQnKSB8fCAkZmllbGQuYXR0cignbmFtZScpIHx8IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgaW5zdGFuY2UgaWYgYW55XG4gICAgICAgIGlmICh0aGlzLmluc3RhbmNlcy5oYXMoZmllbGRJZCkpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveShmaWVsZElkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGluc3RhbmNlXG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0ge1xuICAgICAgICAgICAgZmllbGRJZCxcbiAgICAgICAgICAgICRmaWVsZCxcbiAgICAgICAgICAgICRjb250YWluZXI6ICRmaWVsZC5jbG9zZXN0KCcuZmllbGQnKSxcbiAgICAgICAgICAgIG9wdGlvbnM6IHsgLi4udGhpcy5kZWZhdWx0cywgLi4ub3B0aW9ucyB9LFxuICAgICAgICAgICAgZWxlbWVudHM6IHt9LFxuICAgICAgICAgICAgc3RhdGU6IHtcbiAgICAgICAgICAgICAgICBpc1ZhbGlkOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNjb3JlOiAwLFxuICAgICAgICAgICAgICAgIHN0cmVuZ3RoOiAnJyxcbiAgICAgICAgICAgICAgICBtZXNzYWdlczogW10sXG4gICAgICAgICAgICAgICAgaXNHZW5lcmF0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGlzRm9jdXNlZDogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIGluc3RhbmNlXG4gICAgICAgIHRoaXMuaW5zdGFuY2VzLnNldChmaWVsZElkLCBpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplXG4gICAgICAgIHRoaXMuc2V0dXBVSShpbnN0YW5jZSk7XG4gICAgICAgIHRoaXMuYmluZEV2ZW50cyhpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBmb3JtIHZhbGlkYXRpb24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChpbnN0YW5jZS5vcHRpb25zLnZhbGlkYXRpb24gIT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwRm9ybVZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpbml0aWFsIHZhbHVlIGlmIHJlcXVlc3RlZFxuICAgICAgICBpZiAoaW5zdGFuY2Uub3B0aW9ucy5jaGVja09uTG9hZCAmJiAkZmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tQYXNzd29yZChpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIFVJIGVsZW1lbnRzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgc2V0dXBVSShpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgJGNvbnRhaW5lciwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIG9yIGNyZWF0ZSBpbnB1dCB3cmFwcGVyXG4gICAgICAgIGxldCAkaW5wdXRXcmFwcGVyID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBpZiAoJGlucHV0V3JhcHBlci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICRmaWVsZC53cmFwKCc8ZGl2IGNsYXNzPVwidWkgaW5wdXRcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICRpbnB1dFdyYXBwZXIgPSAkZmllbGQucGFyZW50KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzaG93L2hpZGUgcGFzc3dvcmQgYnV0dG9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5zaG93UGFzc3dvcmRCdXR0b24pIHtcbiAgICAgICAgICAgIHRoaXMuYWRkU2hvd0hpZGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZ2VuZXJhdGUgYnV0dG9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5nZW5lcmF0ZUJ1dHRvbikge1xuICAgICAgICAgICAgdGhpcy5hZGRHZW5lcmF0ZUJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjbGlwYm9hcmQgYnV0dG9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5jbGlwYm9hcmRCdXR0b24pIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQ2xpcGJvYXJkQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0cmVuZ3RoIGJhciBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1N0cmVuZ3RoQmFyKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFN0cmVuZ3RoQmFyKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHdhcm5pbmdzIGNvbnRhaW5lciBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1dhcm5pbmdzKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFdhcm5pbmdzQ29udGFpbmVyKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGlucHV0IHdyYXBwZXIgY2xhc3MgYmFzZWQgb24gYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyhpbnN0YW5jZSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgc2hvdy9oaWRlIHBhc3N3b3JkIGJ1dHRvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZFNob3dIaWRlQnV0dG9uKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGlucHV0V3JhcHBlciA9ICRmaWVsZC5jbG9zZXN0KCcudWkuaW5wdXQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uc2hvdy1oaWRlLXBhc3N3b3JkJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuID0gJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uc2hvdy1oaWRlLXBhc3N3b3JkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBidXR0b25cbiAgICAgICAgY29uc3QgJHNob3dIaWRlQnRuID0gJChgXG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIHNob3ctaGlkZS1wYXNzd29yZFwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwU2hvd1Bhc3N3b3JkIHx8ICdTaG93IHBhc3N3b3JkJ31cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV5ZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwZW5kIHRvIHdyYXBwZXJcbiAgICAgICAgJGlucHV0V3JhcHBlci5hcHBlbmQoJHNob3dIaWRlQnRuKTtcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuID0gJHNob3dIaWRlQnRuO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIGdlbmVyYXRlIGJ1dHRvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZEdlbmVyYXRlQnV0dG9uKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGlucHV0V3JhcHBlciA9ICRmaWVsZC5jbG9zZXN0KCcudWkuaW5wdXQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uZ2VuZXJhdGUtcGFzc3dvcmQnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4gPSAkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYnV0dG9uXG4gICAgICAgIGNvbnN0ICRnZW5lcmF0ZUJ0biA9ICQoYFxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBnZW5lcmF0ZS1wYXNzd29yZFwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwR2VuZXJhdGVQYXNzd29yZCB8fCAnR2VuZXJhdGUgcGFzc3dvcmQnfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic3luYyBpY29uXCI+PC9pPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwZW5kIHRvIHdyYXBwZXJcbiAgICAgICAgJGlucHV0V3JhcHBlci5hcHBlbmQoJGdlbmVyYXRlQnRuKTtcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuID0gJGdlbmVyYXRlQnRuO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIGNsaXBib2FyZCBidXR0b25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRDbGlwYm9hcmRCdXR0b24oaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkaW5wdXRXcmFwcGVyID0gJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYnV0dG9uIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5jbGlwYm9hcmQnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuID0gJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBidXR0b25cbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8ICcnO1xuICAgICAgICBjb25zdCAkY2xpcGJvYXJkQnRuID0gJChgXG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIGNsaXBib2FyZFwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNsaXBib2FyZC10ZXh0PVwiJHtjdXJyZW50VmFsdWV9XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHlQYXNzd29yZCB8fCAnQ29weSBwYXNzd29yZCd9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uc1wiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gY29weVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjb3JuZXIga2V5IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPC9pPlxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwZW5kIHRvIHdyYXBwZXJcbiAgICAgICAgJGlucHV0V3JhcHBlci5hcHBlbmQoJGNsaXBib2FyZEJ0bik7XG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4gPSAkY2xpcGJvYXJkQnRuO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIHN0cmVuZ3RoIGJhclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZFN0cmVuZ3RoQmFyKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGNvbnRhaW5lciB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBwcm9ncmVzcyBiYXIgYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRjb250YWluZXIuZmluZCgnLnBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyID0gJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24gPSAkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC1zdHJlbmd0aC1zZWN0aW9uJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBwcm9ncmVzcyBiYXJcbiAgICAgICAgY29uc3QgJHByb2dyZXNzU2VjdGlvbiA9ICQoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInBhc3N3b3JkLXN0cmVuZ3RoLXNlY3Rpb25cIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgcGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MgcHJvZ3Jlc3MgYm90dG9tIGF0dGFjaGVkIFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnNlcnQgYWZ0ZXIgZmllbGRcbiAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJHByb2dyZXNzU2VjdGlvbik7XG4gICAgICAgIFxuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NCYXIgPSAkcHJvZ3Jlc3NTZWN0aW9uLmZpbmQoJy5wYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpO1xuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uID0gJHByb2dyZXNzU2VjdGlvbjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCB3YXJuaW5ncyBjb250YWluZXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRXYXJuaW5nc0NvbnRhaW5lcihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRjb250YWluZXIgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2FybmluZ3MgY29udGFpbmVyIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC13YXJuaW5ncycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncyA9ICRjb250YWluZXIuZmluZCgnLnBhc3N3b3JkLXdhcm5pbmdzJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB3YXJuaW5ncyBjb250YWluZXIgKHdpbGwgYmUgcG9wdWxhdGVkIHdoZW4gbmVlZGVkKVxuICAgICAgICBjb25zdCAkd2FybmluZ3MgPSAkKCc8ZGl2IGNsYXNzPVwicGFzc3dvcmQtd2FybmluZ3NcIj48L2Rpdj4nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB0aGUgZmllbGQgY29udGFpbmVyIChhZnRlciBwcm9ncmVzcyBiYXIgaWYgZXhpc3RzKVxuICAgICAgICAkY29udGFpbmVyLmFwcGVuZCgkd2FybmluZ3MpO1xuICAgICAgICBcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzID0gJHdhcm5pbmdzO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQmluZCBldmVudHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBiaW5kRXZlbnRzKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cvaGlkZSBidXR0b24gY2xpY2tcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZVBhc3N3b3JkVmlzaWJpbGl0eShpbnN0YW5jZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2VuZXJhdGUgYnV0dG9uIGNsaWNrXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5vZmYoJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVBhc3N3b3JkKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNsaXBib2FyZCBmdW5jdGlvbmFsaXR5IGZvciBjb3B5IGJ1dHRvblxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0biAmJiB0eXBlb2YgQ2xpcGJvYXJkSlMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIENsaXBib2FyZEpTIGZvciB0aGUgYnV0dG9uXG4gICAgICAgICAgICBpZiAoIWluc3RhbmNlLmNsaXBib2FyZCkge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUyhpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuWzBdKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwIGZvciBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgc3VjY2Vzc2Z1bCBjb3B5XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgICAgICAgICAgICAgIGUuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmllbGQgaW5wdXQgZXZlbnRcbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGVPbklucHV0KSB7XG4gICAgICAgICAgICAkZmllbGQub2ZmKCdpbnB1dC5wYXNzd29yZFdpZGdldCBjaGFuZ2UucGFzc3dvcmRXaWRnZXQnKS5vbignaW5wdXQucGFzc3dvcmRXaWRnZXQgY2hhbmdlLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlSW5wdXQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBjbGlwYm9hcmQgYnV0dG9uIHdoZW4gcGFzc3dvcmQgY2hhbmdlc1xuICAgICAgICAkZmllbGQub24oJ2lucHV0LnBhc3N3b3JkV2lkZ2V0IGNoYW5nZS5wYXNzd29yZFdpZGdldCcsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBzdGF0ZSBvbiBlbXB0eVxuICAgICAgICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBVcGRhdGUgYWxsIGNsaXBib2FyZCBidXR0b25zICh3aWRnZXQncyBhbmQgYW55IGV4dGVybmFsIG9uZXMpXG4gICAgICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIHZhbHVlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb2N1cyBldmVudCAtIHNob3cgcHJvZ3Jlc3MgYmFyIHdoZW4gZmllbGQgaXMgZm9jdXNlZFxuICAgICAgICAkZmllbGQub2ZmKCdmb2N1cy5wYXNzd29yZFdpZGdldCcpLm9uKCdmb2N1cy5wYXNzd29yZFdpZGdldCcsICgpID0+IHtcbiAgICAgICAgICAgIGluc3RhbmNlLnN0YXRlLmlzRm9jdXNlZCA9IHRydWU7XG4gICAgICAgICAgICAvLyBTaG93IHByb2dyZXNzIGJhciBpZiB0aGVyZSdzIGEgcGFzc3dvcmQgdmFsdWVcbiAgICAgICAgICAgIGNvbnN0IHBhc3N3b3JkID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgaWYgKHBhc3N3b3JkICYmIHBhc3N3b3JkICE9PSAnJyAmJiAhdGhpcy5pc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24uc2hvdygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHZhbGlkYXRpb24gdG8gdXBkYXRlIHByb2dyZXNzIGJhclxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRlT25JbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQmx1ciBldmVudCAtIGhpZGUgcHJvZ3Jlc3MgYmFyIHdoZW4gZmllbGQgbG9zZXMgZm9jdXNcbiAgICAgICAgJGZpZWxkLm9mZignYmx1ci5wYXNzd29yZFdpZGdldCcpLm9uKCdibHVyLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkID0gZmFsc2U7XG4gICAgICAgICAgICAvLyBIaWRlIG9ubHkgcHJvZ3Jlc3MgYmFyLCBrZWVwIHdhcm5pbmdzIHZpc2libGVcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBOZXZlciBoaWRlIHdhcm5pbmdzIG9uIGJsdXIgLSB0aGV5IHNob3VsZCByZW1haW4gdmlzaWJsZVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIERpc2FibGUgd2lkZ2V0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgZGlzYWJsZShpbnN0YW5jZSkge1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFuY2UuJGNvbnRhaW5lci5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEVuYWJsZSB3aWRnZXRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBlbmFibGUoaW5zdGFuY2UpIHtcbiAgICAgICAgaW5zdGFuY2UuJGZpZWxkLnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFuY2UuJGNvbnRhaW5lci5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCByZWFkLW9ubHkgbW9kZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHNldFJlYWRPbmx5KGluc3RhbmNlKSB7XG4gICAgICAgIGluc3RhbmNlLiRmaWVsZC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4uaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXR1cCBmb3JtIHZhbGlkYXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBzZXR1cEZvcm1WYWxpZGF0aW9uKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgaWYgRm9ybSBvYmplY3QgaXMgbm90IGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIEZvcm0gPT09ICd1bmRlZmluZWQnIHx8ICFGb3JtLnZhbGlkYXRlUnVsZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCAkZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgaWYgKCFmaWVsZE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGN1c3RvbSBydWxlcyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0aW9uUnVsZXMpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlc1tmaWVsZE5hbWVdID0gb3B0aW9ucy52YWxpZGF0aW9uUnVsZXM7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIG1vZGVcbiAgICAgICAgY29uc3QgcnVsZXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub24tZW1wdHkgcnVsZSBmb3IgaGFyZCB2YWxpZGF0aW9uXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5IQVJEKSB7XG4gICAgICAgICAgICBydWxlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnB3X1ZhbGlkYXRlUGFzc3dvcmRFbXB0eSB8fCAnUGFzc3dvcmQgY2Fubm90IGJlIGVtcHR5J1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzdHJlbmd0aCB2YWxpZGF0aW9uXG4gICAgICAgIGlmIChvcHRpb25zLm1pblNjb3JlID4gMCAmJiBvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5IQVJEKSB7XG4gICAgICAgICAgICBydWxlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiAncGFzc3dvcmRTdHJlbmd0aCcsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHdfVmFsaWRhdGVQYXNzd29yZFdlYWsgfHwgJ1Bhc3N3b3JkIGlzIHRvbyB3ZWFrJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChydWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXNbZmllbGROYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBmaWVsZE5hbWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IHJ1bGVzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgcGFzc3dvcmQgc3RyZW5ndGhcbiAgICAgICAgaWYgKHR5cGVvZiAkLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMucGFzc3dvcmRTdHJlbmd0aCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5wYXNzd29yZFN0cmVuZ3RoID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZS5zdGF0ZS5zY29yZSA+PSBvcHRpb25zLm1pblNjb3JlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgcGFzc3dvcmQgaXMgbWFza2VkIChzZXJ2ZXIgcmV0dXJucyB0aGVzZSB3aGVuIHBhc3N3b3JkIGlzIGhpZGRlbilcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB0byBjaGVja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHBhc3N3b3JkIGFwcGVhcnMgdG8gYmUgbWFza2VkXG4gICAgICovXG4gICAgaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkge1xuICAgICAgICByZXR1cm4gL15beFhdezYsfSR8XlxcKns2LH0kfF5ISURERU4kfF5NQVNLRUQkL2kudGVzdChwYXNzd29yZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgaW5wdXQgZXZlbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBoYW5kbGVJbnB1dChpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0IHBhc3N3b3JkID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGlmIGRpc2FibGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBmb3IgbWFza2VkIHBhc3N3b3Jkc1xuICAgICAgICBpZiAodGhpcy5pc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgdGhpcyBpcyBhIGdlbmVyYXRlZCBwYXNzd29yZCAoYWxyZWFkeSB2YWxpZGF0ZWQgaW4gc2V0R2VuZXJhdGVkUGFzc3dvcmQpXG4gICAgICAgIGlmIChpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZCkge1xuICAgICAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNHZW5lcmF0ZWQgPSBmYWxzZTsgLy8gUmVzZXQgZmxhZyBmb3IgbmV4dCBpbnB1dFxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGF0ZSBwYXNzd29yZCBvbmx5IGlmIGZpZWxkIGlzIGZvY3VzZWRcbiAgICAgICAgaWYgKGluc3RhbmNlLnN0YXRlLmlzRm9jdXNlZCkge1xuICAgICAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIHBhc3N3b3JkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3N3b3JkIC0gUGFzc3dvcmQgdG8gdmFsaWRhdGVcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCkge1xuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGVtcHR5IHBhc3N3b3JkXG4gICAgICAgIGlmICghcGFzc3dvcmQgfHwgcGFzc3dvcmQgPT09ICcnKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgdmFsaWRhdGlvbiBmb3IgbWFza2VkIHBhc3N3b3JkcyAoc2VydmVyIHJldHVybnMgdGhlc2Ugd2hlbiBwYXNzd29yZCBpcyBoaWRkZW4pXG4gICAgICAgIC8vIENvbW1vbiBwYXR0ZXJuczogeHh4eHh4eCwgWFhYWFhYWFgsICoqKioqKiosIEhJRERFTiwgZXRjLlxuICAgICAgICBpZiAodGhpcy5pc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHByb2dyZXNzIHNlY3Rpb24gb25seSBpZiBmaWVsZCBpcyBmb2N1c2VkXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uICYmIGluc3RhbmNlLnN0YXRlLmlzRm9jdXNlZCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGNhY2hlIGZpcnN0XG4gICAgICAgIGNvbnN0IGNhY2hlS2V5ID0gYCR7aW5zdGFuY2UuZmllbGRJZH06JHtwYXNzd29yZH1gO1xuICAgICAgICBpZiAodGhpcy52YWxpZGF0aW9uQ2FjaGVbY2FjaGVLZXldKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZVZhbGlkYXRpb25SZXN1bHQoaW5zdGFuY2UsIHRoaXMudmFsaWRhdGlvbkNhY2hlW2NhY2hlS2V5XSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHRpbWVyXG4gICAgICAgIGlmICh0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0pIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGltbWVkaWF0ZSBsb2NhbCBmZWVkYmFja1xuICAgICAgICBjb25zdCBsb2NhbFNjb3JlID0gdGhpcy5zY29yZVBhc3N3b3JkTG9jYWwocGFzc3dvcmQpO1xuICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzQmFyKGluc3RhbmNlLCBsb2NhbFNjb3JlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlYm91bmNlIEFQSSBjYWxsXG4gICAgICAgIHRoaXMudmFsaWRhdGlvblRpbWVyc1tpbnN0YW5jZS5maWVsZElkXSA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgLy8gVXNlIEFQSSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICh0eXBlb2YgUGFzc3dvcmRWYWxpZGF0aW9uQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFBhc3N3b3JkVmFsaWRhdGlvbkFQSS52YWxpZGF0ZVBhc3N3b3JkKHBhc3N3b3JkLCBpbnN0YW5jZS5maWVsZElkLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENhY2hlIHJlc3VsdFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52YWxpZGF0aW9uQ2FjaGVbY2FjaGVLZXldID0gcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVWYWxpZGF0aW9uUmVzdWx0KGluc3RhbmNlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBsb2NhbCB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgICAgICBzY29yZTogbG9jYWxTY29yZSxcbiAgICAgICAgICAgICAgICAgICAgaXNWYWxpZDogbG9jYWxTY29yZSA+PSBvcHRpb25zLm1pblNjb3JlLFxuICAgICAgICAgICAgICAgICAgICBzdHJlbmd0aDogdGhpcy5nZXRTdHJlbmd0aExhYmVsKGxvY2FsU2NvcmUpLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlczogW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgcmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgNzAwKTsgLy8gSW5jcmVhc2VkIGRlYm91bmNlIGZvciBtb3JlIGNvbWZvcnRhYmxlIHR5cGluZ1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIHBhc3N3b3JkIHNjb3JlIGxvY2FsbHlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB0byBzY29yZVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFNjb3JlIGZyb20gMC0xMDBcbiAgICAgKi9cbiAgICBzY29yZVBhc3N3b3JkTG9jYWwocGFzc3dvcmQpIHtcbiAgICAgICAgbGV0IHNjb3JlID0gMDtcbiAgICAgICAgaWYgKCFwYXNzd29yZCB8fCBwYXNzd29yZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBzY29yZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gcGFzc3dvcmQubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgLy8gTGVuZ3RoIHNjb3JpbmcgKHVwIHRvIDMwIHBvaW50cylcbiAgICAgICAgaWYgKGxlbmd0aCA+PSAxNikge1xuICAgICAgICAgICAgc2NvcmUgKz0gMzA7XG4gICAgICAgIH0gZWxzZSBpZiAobGVuZ3RoID49IDEyKSB7XG4gICAgICAgICAgICBzY29yZSArPSAyMDtcbiAgICAgICAgfSBlbHNlIGlmIChsZW5ndGggPj0gOCkge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTA7XG4gICAgICAgIH0gZWxzZSBpZiAobGVuZ3RoID49IDYpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoYXJhY3RlciBkaXZlcnNpdHkgKHVwIHRvIDQwIHBvaW50cylcbiAgICAgICAgaWYgKC9bYS16XS8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAvLyBMb3dlcmNhc2VcbiAgICAgICAgaWYgKC9bQS1aXS8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAvLyBVcHBlcmNhc2VcbiAgICAgICAgaWYgKC9cXGQvLnRlc3QocGFzc3dvcmQpKSBzY29yZSArPSAxMDsgICAgIC8vIERpZ2l0c1xuICAgICAgICBpZiAoL1xcVy8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAgICAgLy8gU3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICAgIFxuICAgICAgICAvLyBQYXR0ZXJuIGNvbXBsZXhpdHkgKHVwIHRvIDMwIHBvaW50cylcbiAgICAgICAgY29uc3QgdW5pcXVlQ2hhcnMgPSBuZXcgU2V0KHBhc3N3b3JkKS5zaXplO1xuICAgICAgICBjb25zdCB1bmlxdWVSYXRpbyA9IHVuaXF1ZUNoYXJzIC8gbGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgaWYgKHVuaXF1ZVJhdGlvID4gMC43KSB7XG4gICAgICAgICAgICBzY29yZSArPSAyMDtcbiAgICAgICAgfSBlbHNlIGlmICh1bmlxdWVSYXRpbyA+IDAuNSkge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTU7XG4gICAgICAgIH0gZWxzZSBpZiAodW5pcXVlUmF0aW8gPiAwLjMpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDEwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2NvcmUgKz0gNTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUGVuYWx0aWVzIGZvciBjb21tb24gcGF0dGVybnNcbiAgICAgICAgaWYgKC8oLilcXDF7Mix9Ly50ZXN0KHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgc2NvcmUgLT0gMTA7IC8vIFJlcGVhdGluZyBjaGFyYWN0ZXJzXG4gICAgICAgIH1cbiAgICAgICAgaWYgKC8oMDEyfDEyM3wyMzR8MzQ1fDQ1Nnw1Njd8Njc4fDc4OXw4OTB8YWJjfGJjZHxjZGV8ZGVmKS9pLnRlc3QocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICBzY29yZSAtPSAxMDsgLy8gU2VxdWVudGlhbCBwYXR0ZXJuc1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoMCwgTWF0aC5taW4oMTAwLCBzY29yZSkpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0cmVuZ3RoIGxhYmVsIGZvciBzY29yZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29yZSAtIFBhc3N3b3JkIHNjb3JlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gU3RyZW5ndGggbGFiZWxcbiAgICAgKi9cbiAgICBnZXRTdHJlbmd0aExhYmVsKHNjb3JlKSB7XG4gICAgICAgIGlmIChzY29yZSA8IDIwKSByZXR1cm4gJ3Zlcnlfd2Vhayc7XG4gICAgICAgIGlmIChzY29yZSA8IDQwKSByZXR1cm4gJ3dlYWsnO1xuICAgICAgICBpZiAoc2NvcmUgPCA2MCkgcmV0dXJuICdmYWlyJztcbiAgICAgICAgaWYgKHNjb3JlIDwgODApIHJldHVybiAnZ29vZCc7XG4gICAgICAgIHJldHVybiAnc3Ryb25nJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwcm9ncmVzcyBiYXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcmUgLSBQYXNzd29yZCBzY29yZVxuICAgICAqL1xuICAgIHVwZGF0ZVByb2dyZXNzQmFyKGluc3RhbmNlLCBzY29yZSkge1xuICAgICAgICBjb25zdCB7IGVsZW1lbnRzIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIGlmICghZWxlbWVudHMuJHByb2dyZXNzQmFyIHx8IGVsZW1lbnRzLiRwcm9ncmVzc0Jhci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzXG4gICAgICAgIGVsZW1lbnRzLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG4gICAgICAgICAgICBwZXJjZW50OiBNYXRoLm1pbihzY29yZSwgMTAwKSxcbiAgICAgICAgICAgIHNob3dBY3Rpdml0eTogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNvbG9yXG4gICAgICAgIGVsZW1lbnRzLiRwcm9ncmVzc0JhclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdyZWQgb3JhbmdlIHllbGxvdyBvbGl2ZSBncmVlbicpXG4gICAgICAgICAgICAuYWRkQ2xhc3ModGhpcy5nZXRDb2xvckZvclNjb3JlKHNjb3JlKSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY29sb3IgY2xhc3MgZm9yIHNjb3JlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3JlIC0gUGFzc3dvcmQgc2NvcmVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDb2xvciBjbGFzcyBuYW1lXG4gICAgICovXG4gICAgZ2V0Q29sb3JGb3JTY29yZShzY29yZSkge1xuICAgICAgICBpZiAoc2NvcmUgPCAyMCkgcmV0dXJuICdyZWQnO1xuICAgICAgICBpZiAoc2NvcmUgPCA0MCkgcmV0dXJuICdvcmFuZ2UnO1xuICAgICAgICBpZiAoc2NvcmUgPCA2MCkgcmV0dXJuICd5ZWxsb3cnO1xuICAgICAgICBpZiAoc2NvcmUgPCA4MCkgcmV0dXJuICdvbGl2ZSc7XG4gICAgICAgIHJldHVybiAnZ3JlZW4nO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHZhbGlkYXRpb24gcmVzdWx0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCAtIFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICovXG4gICAgaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgcmVzdWx0KSB7XG4gICAgICAgIGlmICghcmVzdWx0KSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRlXG4gICAgICAgIGluc3RhbmNlLnN0YXRlID0ge1xuICAgICAgICAgICAgaXNWYWxpZDogcmVzdWx0LmlzVmFsaWQgfHwgcmVzdWx0LnNjb3JlID49IG9wdGlvbnMubWluU2NvcmUsXG4gICAgICAgICAgICBzY29yZTogcmVzdWx0LnNjb3JlLFxuICAgICAgICAgICAgc3RyZW5ndGg6IHJlc3VsdC5zdHJlbmd0aCB8fCB0aGlzLmdldFN0cmVuZ3RoTGFiZWwocmVzdWx0LnNjb3JlKSxcbiAgICAgICAgICAgIG1lc3NhZ2VzOiByZXN1bHQubWVzc2FnZXMgfHwgW10sXG4gICAgICAgICAgICBpc0dlbmVyYXRlZDogaW5zdGFuY2Uuc3RhdGUuaXNHZW5lcmF0ZWRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBVSVxuICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzQmFyKGluc3RhbmNlLCByZXN1bHQuc2NvcmUpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyB3YXJuaW5ncy9lcnJvcnNcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1dhcm5pbmdzICYmIHJlc3VsdC5tZXNzYWdlcyAmJiByZXN1bHQubWVzc2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZVR5cGUgPSBpbnN0YW5jZS5zdGF0ZS5pc1ZhbGlkID8gJ3dhcm5pbmcnIDogJ2Vycm9yJztcbiAgICAgICAgICAgIHRoaXMuc2hvd1dhcm5pbmdzKGluc3RhbmNlLCByZXN1bHQsIG1lc3NhZ2VUeXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZVdhcm5pbmdzKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2FsbCB2YWxpZGF0aW9uIGNhbGxiYWNrXG4gICAgICAgIGlmIChvcHRpb25zLm9uVmFsaWRhdGUpIHtcbiAgICAgICAgICAgIG9wdGlvbnMub25WYWxpZGF0ZShpbnN0YW5jZS5zdGF0ZS5pc1ZhbGlkLCByZXN1bHQuc2NvcmUsIHJlc3VsdC5tZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtIHZhbGlkYXRpb24gc3RhdGVcbiAgICAgICAgaWYgKEZvcm0gJiYgRm9ybS4kZm9ybU9iaikge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gaW5zdGFuY2UuJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCBpbnN0YW5jZS4kZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmICghaW5zdGFuY2Uuc3RhdGUuaXNWYWxpZCAmJiBvcHRpb25zLnZhbGlkYXRpb24gPT09IHRoaXMuVkFMSURBVElPTi5IQVJEKSB7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdhZGQgcHJvbXB0JywgZmllbGROYW1lLCByZXN1bHQubWVzc2FnZXNbMF0gfHwgJ0ludmFsaWQgcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgZmllbGROYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgcGFzc3dvcmRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVBhc3N3b3JkKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdlbmVyYXRlIHBhc3N3b3JkXG4gICAgICAgIGNvbnN0IGdlbmVyYXRlQ2FsbGJhY2sgPSAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwYXNzd29yZCA9IHR5cGVvZiByZXN1bHQgPT09ICdzdHJpbmcnID8gcmVzdWx0IDogcmVzdWx0LnBhc3N3b3JkO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgcGFzc3dvcmRcbiAgICAgICAgICAgIHRoaXMuc2V0R2VuZXJhdGVkUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCBjYWxsYmFja1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMub25HZW5lcmF0ZSkge1xuICAgICAgICAgICAgICAgIG9wdGlvbnMub25HZW5lcmF0ZShwYXNzd29yZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgQVBJIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIFBhc3N3b3JkVmFsaWRhdGlvbkFQSSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIFBhc3N3b3JkVmFsaWRhdGlvbkFQSS5nZW5lcmF0ZVBhc3N3b3JkKG9wdGlvbnMuZ2VuZXJhdGVMZW5ndGgsIGdlbmVyYXRlQ2FsbGJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2ltcGxlIGxvY2FsIGdlbmVyYXRvclxuICAgICAgICAgICAgY29uc3QgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkhQCMkJV4mKic7XG4gICAgICAgICAgICBsZXQgcGFzc3dvcmQgPSAnJztcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3B0aW9ucy5nZW5lcmF0ZUxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGFzc3dvcmQgKz0gY2hhcnMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZ2VuZXJhdGVDYWxsYmFjayhwYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCBnZW5lcmF0ZWQgcGFzc3dvcmRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBHZW5lcmF0ZWQgcGFzc3dvcmRcbiAgICAgKi9cbiAgICBzZXRHZW5lcmF0ZWRQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsICRjb250YWluZXIsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGdlbmVyYXRlZCBmbGFnIGZpcnN0IHRvIHByZXZlbnQgZHVwbGljYXRlIHZhbGlkYXRpb25cbiAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNHZW5lcmF0ZWQgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHZhbHVlIHdpdGhvdXQgdHJpZ2dlcmluZyBjaGFuZ2UgZXZlbnQgeWV0XG4gICAgICAgICRmaWVsZC52YWwocGFzc3dvcmQpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFsbCBjbGlwYm9hcmQgYnV0dG9ucyAod2lkZ2V0J3MgYW5kIGFueSBleHRlcm5hbCBvbmVzKVxuICAgICAgICAkKCcuY2xpcGJvYXJkJykuYXR0cignZGF0YS1jbGlwYm9hcmQtdGV4dCcsIHBhc3N3b3JkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIG9uY2UgaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb24gIT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm93IHRyaWdnZXIgY2hhbmdlIGZvciBmb3JtIHRyYWNraW5nICh2YWxpZGF0aW9uIGFscmVhZHkgZG9uZSBhYm92ZSlcbiAgICAgICAgJGZpZWxkLnRyaWdnZXIoJ2NoYW5nZScpXG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHdhcm5pbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCAtIFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBNZXNzYWdlIHR5cGUgKHdhcm5pbmcvZXJyb3IpXG4gICAgICovXG4gICAgc2hvd1dhcm5pbmdzKGluc3RhbmNlLCByZXN1bHQsIHR5cGUgPSAnd2FybmluZycpIHtcbiAgICAgICAgaWYgKCFpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHsgZWxlbWVudHMgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCBjb2xvckNsYXNzID0gdHlwZSA9PT0gJ2Vycm9yJyA/ICdyZWQnIDogJ29yYW5nZSc7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB3YXJuaW5nc1xuICAgICAgICBlbGVtZW50cy4kd2FybmluZ3MuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB3YXJuaW5ncyBhcyBwb2ludGluZyBsYWJlbFxuICAgICAgICBpZiAocmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBDaG9vc2UgaWNvbiBiYXNlZCBvbiBtZXNzYWdlIHR5cGVcbiAgICAgICAgICAgIGNvbnN0IGljb25DbGFzcyA9IHR5cGUgPT09ICdlcnJvcicgPyAnZXhjbGFtYXRpb24gY2lyY2xlJyA6ICdleGNsYW1hdGlvbiB0cmlhbmdsZSc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSBsaXN0IGl0ZW1zIGZyb20gbWVzc2FnZXMgd2l0aCBpY29uc1xuICAgICAgICAgICAgY29uc3QgbGlzdEl0ZW1zID0gcmVzdWx0Lm1lc3NhZ2VzLm1hcChtc2cgPT4gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtpY29uQ2xhc3N9IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+JHttc2d9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKS5qb2luKCcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIHBvaW50aW5nIGFib3ZlIGxhYmVsIHdpdGggbGlzdCAocG9pbnRzIHRvIHBhc3N3b3JkIGZpZWxkKVxuICAgICAgICAgICAgY29uc3QgJGxhYmVsID0gJChgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nICR7Y29sb3JDbGFzc30gYmFzaWMgbGFiZWxcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGxpc3RcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7bGlzdEl0ZW1zfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBlbGVtZW50cy4kd2FybmluZ3MuYXBwZW5kKCRsYWJlbCkuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHdhcm5pbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgaGlkZVdhcm5pbmdzKGluc3RhbmNlKSB7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncy5lbXB0eSgpLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHBhc3N3b3JkIHZpc2liaWxpdHlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICB0b2dnbGVQYXNzd29yZFZpc2liaWxpdHkoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkc2hvd0hpZGVCdG4gPSBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG47XG4gICAgICAgIFxuICAgICAgICBpZiAoISRzaG93SGlkZUJ0bikgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJGljb24gPSAkc2hvd0hpZGVCdG4uZmluZCgnaScpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdwYXNzd29yZCcpIHtcbiAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmRcbiAgICAgICAgICAgICRmaWVsZC5hdHRyKCd0eXBlJywgJ3RleHQnKTtcbiAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUnKS5hZGRDbGFzcygnZXllIHNsYXNoJyk7XG4gICAgICAgICAgICAkc2hvd0hpZGVCdG4uYXR0cignZGF0YS1jb250ZW50JywgZ2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBIaWRlUGFzc3dvcmQgfHwgJ0hpZGUgcGFzc3dvcmQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgcGFzc3dvcmRcbiAgICAgICAgICAgICRmaWVsZC5hdHRyKCd0eXBlJywgJ3Bhc3N3b3JkJyk7XG4gICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllIHNsYXNoJykuYWRkQ2xhc3MoJ2V5ZScpO1xuICAgICAgICAgICAgJHNob3dIaWRlQnRuLmF0dHIoJ2RhdGEtY29udGVudCcsIGdsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwU2hvd1Bhc3N3b3JkIHx8ICdTaG93IHBhc3N3b3JkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIHZhbGlkYXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpIHtcbiAgICAgICAgLy8gQ2xlYXIgd2FybmluZ3Mgd2hlbiBleHBsaWNpdGx5IGNsZWFyaW5nIHZhbGlkYXRpb24gKGVtcHR5IHBhc3N3b3JkKVxuICAgICAgICB0aGlzLmhpZGVXYXJuaW5ncyhpbnN0YW5jZSk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3MoeyBwZXJjZW50OiAwIH0pO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbmNlLnN0YXRlID0ge1xuICAgICAgICAgICAgaXNWYWxpZDogdHJ1ZSxcbiAgICAgICAgICAgIHNjb3JlOiAwLFxuICAgICAgICAgICAgc3RyZW5ndGg6ICcnLFxuICAgICAgICAgICAgbWVzc2FnZXM6IFtdLFxuICAgICAgICAgICAgaXNHZW5lcmF0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgaXNGb2N1c2VkOiBpbnN0YW5jZS5zdGF0ZS5pc0ZvY3VzZWQgfHwgZmFsc2VcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIHBhc3N3b3JkIChtYW51YWwgdmFsaWRhdGlvbilcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjaGVja1Bhc3N3b3JkKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHBhc3N3b3JkID0gaW5zdGFuY2UuJGZpZWxkLnZhbCgpO1xuICAgICAgICBpZiAocGFzc3dvcmQgJiYgcGFzc3dvcmQgIT09ICcnKSB7XG4gICAgICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gZm9yIG1hc2tlZCBwYXNzd29yZHNcbiAgICAgICAgICAgIGlmICh0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZvciBpbml0aWFsIGNoZWNrLCBkb24ndCBzaG93IHByb2dyZXNzIGJhciBidXQgZG8gdmFsaWRhdGUgYW5kIHNob3cgd2FybmluZ3NcbiAgICAgICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgY29uZmlndXJhdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gaW5zdGFuY2VPckZpZWxkSWQgLSBJbnN0YW5jZSBvciBmaWVsZCBJRFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBuZXdPcHRpb25zIC0gTmV3IG9wdGlvbnNcbiAgICAgKi9cbiAgICB1cGRhdGVDb25maWcoaW5zdGFuY2VPckZpZWxkSWQsIG5ld09wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0eXBlb2YgaW5zdGFuY2VPckZpZWxkSWQgPT09ICdzdHJpbmcnIFxuICAgICAgICAgICAgPyB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VPckZpZWxkSWQpXG4gICAgICAgICAgICA6IGluc3RhbmNlT3JGaWVsZElkO1xuICAgICAgICAgICAgXG4gICAgICAgIGlmICghaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIG9wdGlvbnNcbiAgICAgICAgaW5zdGFuY2Uub3B0aW9ucyA9IHsgLi4uaW5zdGFuY2Uub3B0aW9ucywgLi4ubmV3T3B0aW9ucyB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGR5bmFtaWMgYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdzaG93UGFzc3dvcmRCdXR0b24nIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLnNob3dQYXNzd29yZEJ1dHRvbiAmJiAhaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGJ1dHRvbiBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRTaG93SGlkZUJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgLy8gUmUtYmluZCBldmVudHMgZm9yIHRoZSBuZXcgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4ub2ZmKCdjbGljay5wYXNzd29yZFdpZGdldCcpLm9uKCdjbGljay5wYXNzd29yZFdpZGdldCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZVBhc3N3b3JkVmlzaWJpbGl0eShpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW5ld09wdGlvbnMuc2hvd1Bhc3N3b3JkQnV0dG9uICYmIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBidXR0b24gaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBnZW5lcmF0ZSBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICBpZiAoJ2dlbmVyYXRlQnV0dG9uJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5nZW5lcmF0ZUJ1dHRvbiAmJiAhaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGJ1dHRvbiBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRHZW5lcmF0ZUJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgLy8gUmUtYmluZCBldmVudHMgZm9yIHRoZSBuZXcgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ub2ZmKCdjbGljay5wYXNzd29yZFdpZGdldCcpLm9uKCdjbGljay5wYXNzd29yZFdpZGdldCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cFxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucG9wdXAoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFuZXdPcHRpb25zLmdlbmVyYXRlQnV0dG9uICYmIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBidXR0b24gaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjbGlwYm9hcmQgYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdjbGlwYm9hcmRCdXR0b24nIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLmNsaXBib2FyZEJ1dHRvbiAmJiAhaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bikge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBidXR0b24gaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgIHRoaXMuYWRkQ2xpcGJvYXJkQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGNsaXBib2FyZCBmb3IgdGhlIG5ldyBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0biAmJiB0eXBlb2YgQ2xpcGJvYXJkSlMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgQ2xpcGJvYXJkSlMgZm9yIHRoZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmNsaXBib2FyZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0blswXSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwIGZvciBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBzdWNjZXNzZnVsIGNvcHlcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucG9wdXAoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICghbmV3T3B0aW9ucy5jbGlwYm9hcmRCdXR0b24gJiYgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bikge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBidXR0b24gaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmNsaXBib2FyZCkge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuY2xpcGJvYXJkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgc3RyZW5ndGggYmFyIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdzaG93U3RyZW5ndGhCYXInIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLnNob3dTdHJlbmd0aEJhcikge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1N0cmVuZ3RoQmFyKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlU3RyZW5ndGhCYXIoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgd2FybmluZ3MgdmlzaWJpbGl0eVxuICAgICAgICBpZiAoJ3Nob3dXYXJuaW5ncycgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuc2hvd1dhcm5pbmdzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93V2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVXYXJuaW5ncyhpbnN0YW5jZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBpbnB1dCB3cmFwcGVyIGFjdGlvbiBjbGFzcyBiYXNlZCBvbiBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICB0aGlzLnVwZGF0ZUlucHV0V3JhcHBlckNsYXNzKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLXNldHVwIGZvcm0gdmFsaWRhdGlvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGluc3RhbmNlLm9wdGlvbnMudmFsaWRhdGlvbiAhPT0gdGhpcy5WQUxJREFUSU9OLk5PTkUpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dXBGb3JtVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGN1cnJlbnQgdmFsdWUgaWYgdmFsaWRhdGlvbiBjaGFuZ2VkXG4gICAgICAgIGlmICgndmFsaWRhdGlvbicgaW4gbmV3T3B0aW9ucyAmJiBpbnN0YW5jZS4kZmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tQYXNzd29yZChpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBpbnB1dCB3cmFwcGVyIGFjdGlvbiBjbGFzcyBiYXNlZCBvbiBidXR0b24gdmlzaWJpbGl0eVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHVwZGF0ZUlucHV0V3JhcHBlckNsYXNzKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSBpbnN0YW5jZS4kZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIGNvbnN0IGhhc0J1dHRvbnMgPSAhIShcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0biB8fCBcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0biB8fCBcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG5cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChoYXNCdXR0b25zKSB7XG4gICAgICAgICAgICAkaW5wdXRXcmFwcGVyLmFkZENsYXNzKCdhY3Rpb24nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRpbnB1dFdyYXBwZXIucmVtb3ZlQ2xhc3MoJ2FjdGlvbicpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgd2lkZ2V0IHN0YXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBpbnN0YW5jZU9yRmllbGRJZCAtIEluc3RhbmNlIG9yIGZpZWxkIElEXG4gICAgICogQHJldHVybnMge29iamVjdHxudWxsfSBXaWRnZXQgc3RhdGVcbiAgICAgKi9cbiAgICBnZXRTdGF0ZShpbnN0YW5jZU9yRmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHR5cGVvZiBpbnN0YW5jZU9yRmllbGRJZCA9PT0gJ3N0cmluZycgXG4gICAgICAgICAgICA/IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZU9yRmllbGRJZClcbiAgICAgICAgICAgIDogaW5zdGFuY2VPckZpZWxkSWQ7XG4gICAgICAgICAgICBcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlID8gaW5zdGFuY2Uuc3RhdGUgOiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBzdHJlbmd0aCBiYXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGluc3RhbmNlT3JGaWVsZElkIC0gSW5zdGFuY2Ugb3IgZmllbGQgSURcbiAgICAgKi9cbiAgICBzaG93U3RyZW5ndGhCYXIoaW5zdGFuY2VPckZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0eXBlb2YgaW5zdGFuY2VPckZpZWxkSWQgPT09ICdzdHJpbmcnIFxuICAgICAgICAgICAgPyB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VPckZpZWxkSWQpXG4gICAgICAgICAgICA6IGluc3RhbmNlT3JGaWVsZElkO1xuICAgICAgICAgICAgXG4gICAgICAgIGlmIChpbnN0YW5jZSAmJiBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBzdHJlbmd0aCBiYXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xvYmplY3R9IGluc3RhbmNlT3JGaWVsZElkIC0gSW5zdGFuY2Ugb3IgZmllbGQgSURcbiAgICAgKi9cbiAgICBoaWRlU3RyZW5ndGhCYXIoaW5zdGFuY2VPckZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0eXBlb2YgaW5zdGFuY2VPckZpZWxkSWQgPT09ICdzdHJpbmcnIFxuICAgICAgICAgICAgPyB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VPckZpZWxkSWQpXG4gICAgICAgICAgICA6IGluc3RhbmNlT3JGaWVsZElkO1xuICAgICAgICAgICAgXG4gICAgICAgIGlmIChpbnN0YW5jZSAmJiBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSB3aWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICovXG4gICAgZGVzdHJveShmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBVbmJpbmQgZXZlbnRzXG4gICAgICAgIGluc3RhbmNlLiRmaWVsZC5vZmYoJy5wYXNzd29yZFdpZGdldCcpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ub2ZmKCcucGFzc3dvcmRXaWRnZXQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4ub2ZmKCcucGFzc3dvcmRXaWRnZXQnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBjbGlwYm9hcmQgaW5zdGFuY2VcbiAgICAgICAgaWYgKGluc3RhbmNlLmNsaXBib2FyZCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIGRlbGV0ZSBpbnN0YW5jZS5jbGlwYm9hcmQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIHRpbWVyXG4gICAgICAgIGlmICh0aGlzLnZhbGlkYXRpb25UaW1lcnNbZmllbGRJZF0pIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnZhbGlkYXRpb25UaW1lcnNbZmllbGRJZF0pO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMudmFsaWRhdGlvblRpbWVyc1tmaWVsZElkXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGluc3RhbmNlXG4gICAgICAgIHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShmaWVsZElkKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgYWxsIGluc3RhbmNlc1xuICAgICAqL1xuICAgIGRlc3Ryb3lBbGwoKSB7XG4gICAgICAgIHRoaXMuaW5zdGFuY2VzLmZvckVhY2goKGluc3RhbmNlLCBmaWVsZElkKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koZmllbGRJZCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnZhbGlkYXRpb25DYWNoZSA9IHt9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgdmFsaWRhdGlvbiBjYWNoZVxuICAgICAqL1xuICAgIGNsZWFyQ2FjaGUoKSB7XG4gICAgICAgIHRoaXMudmFsaWRhdGlvbkNhY2hlID0ge307XG4gICAgfVxufTsiXX0=