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
      console.warn('PasswordWidget: Field not found', selector);
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
        }); // Handle copy error

        instance.clipboard.on('error', function (e) {
          console.error('Clipboard error:', e.action, e.trigger);
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
    } // Clear generated flag when user types


    instance.state.isGenerated = false; // Validate password only if field is focused

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
    }, 300);
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
        options = instance.options; // Set value

    $field.val(password).trigger('change');
    instance.state.isGenerated = true; // Update all clipboard buttons (widget's and any external ones)

    $('.clipboard').attr('data-clipboard-text', password); // Validate if needed

    if (options.validation !== this.VALIDATION.NONE) {
      this.validatePassword(instance, password);
    } // Trigger form change


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
      console.warn('PasswordWidget: Instance not found');
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
          }); // Handle copy error

          instance.clipboard.on('error', function (e) {
            console.error('Clipboard error:', e.action, e.trigger);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvcGFzc3dvcmQtd2lkZ2V0LmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkV2lkZ2V0IiwiaW5zdGFuY2VzIiwiTWFwIiwiVkFMSURBVElPTiIsIkhBUkQiLCJTT0ZUIiwiTk9ORSIsInZhbGlkYXRpb25DYWNoZSIsInZhbGlkYXRpb25UaW1lcnMiLCJkZWZhdWx0cyIsInZhbGlkYXRpb24iLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm9uVmFsaWRhdGUiLCJvbkdlbmVyYXRlIiwidmFsaWRhdGlvblJ1bGVzIiwiaW5pdCIsInNlbGVjdG9yIiwib3B0aW9ucyIsIiRmaWVsZCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsImZpZWxkSWQiLCJhdHRyIiwiTWF0aCIsInJhbmRvbSIsInRvU3RyaW5nIiwic3Vic3RyIiwiaGFzIiwiZGVzdHJveSIsImluc3RhbmNlIiwiJGNvbnRhaW5lciIsImNsb3Nlc3QiLCJlbGVtZW50cyIsInN0YXRlIiwiaXNWYWxpZCIsInNjb3JlIiwic3RyZW5ndGgiLCJtZXNzYWdlcyIsImlzR2VuZXJhdGVkIiwiaXNGb2N1c2VkIiwic2V0Iiwic2V0dXBVSSIsImJpbmRFdmVudHMiLCJzZXR1cEZvcm1WYWxpZGF0aW9uIiwidmFsIiwiY2hlY2tQYXNzd29yZCIsIiRpbnB1dFdyYXBwZXIiLCJ3cmFwIiwicGFyZW50IiwiYWRkU2hvd0hpZGVCdXR0b24iLCJhZGRHZW5lcmF0ZUJ1dHRvbiIsImFkZENsaXBib2FyZEJ1dHRvbiIsImFkZFN0cmVuZ3RoQmFyIiwiYWRkV2FybmluZ3NDb250YWluZXIiLCJ1cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyIsImZpbmQiLCIkc2hvd0hpZGVCdG4iLCJnbG9iYWxUcmFuc2xhdGUiLCJidF9Ub29sVGlwU2hvd1Bhc3N3b3JkIiwiYXBwZW5kIiwiJGdlbmVyYXRlQnRuIiwiYnRfVG9vbFRpcEdlbmVyYXRlUGFzc3dvcmQiLCIkY2xpcGJvYXJkQnRuIiwiY3VycmVudFZhbHVlIiwiYnRfVG9vbFRpcENvcHlQYXNzd29yZCIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc1NlY3Rpb24iLCIkd2FybmluZ3MiLCJvZmYiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRvZ2dsZVBhc3N3b3JkVmlzaWJpbGl0eSIsImdlbmVyYXRlUGFzc3dvcmQiLCJDbGlwYm9hcmRKUyIsImNsaXBib2FyZCIsInBvcHVwIiwic2V0VGltZW91dCIsImNsZWFyU2VsZWN0aW9uIiwiZXJyb3IiLCJhY3Rpb24iLCJ0cmlnZ2VyIiwiaGFuZGxlSW5wdXQiLCJ2YWx1ZSIsImNsZWFyVmFsaWRhdGlvbiIsInBhc3N3b3JkIiwiaXNNYXNrZWRQYXNzd29yZCIsInNob3ciLCJ2YWxpZGF0ZVBhc3N3b3JkIiwiaGlkZSIsImRpc2FibGUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJlbmFibGUiLCJyZW1vdmVDbGFzcyIsInNldFJlYWRPbmx5IiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJmaWVsZE5hbWUiLCJydWxlcyIsInB1c2giLCJ0eXBlIiwicHJvbXB0IiwicHdfVmFsaWRhdGVQYXNzd29yZEVtcHR5IiwicHdfVmFsaWRhdGVQYXNzd29yZFdlYWsiLCJpZGVudGlmaWVyIiwiZm4iLCJmb3JtIiwic2V0dGluZ3MiLCJwYXNzd29yZFN0cmVuZ3RoIiwidGVzdCIsImNhY2hlS2V5IiwiaGFuZGxlVmFsaWRhdGlvblJlc3VsdCIsImNsZWFyVGltZW91dCIsImxvY2FsU2NvcmUiLCJzY29yZVBhc3N3b3JkTG9jYWwiLCJ1cGRhdGVQcm9ncmVzc0JhciIsIlBhc3N3b3JkVmFsaWRhdGlvbkFQSSIsInJlc3VsdCIsImdldFN0cmVuZ3RoTGFiZWwiLCJ1bmlxdWVDaGFycyIsIlNldCIsInNpemUiLCJ1bmlxdWVSYXRpbyIsIm1heCIsIm1pbiIsInByb2dyZXNzIiwicGVyY2VudCIsInNob3dBY3Rpdml0eSIsImdldENvbG9yRm9yU2NvcmUiLCJtZXNzYWdlVHlwZSIsImhpZGVXYXJuaW5ncyIsIiRmb3JtT2JqIiwiZ2VuZXJhdGVDYWxsYmFjayIsInNldEdlbmVyYXRlZFBhc3N3b3JkIiwiY2hhcnMiLCJpIiwiY2hhckF0IiwiZmxvb3IiLCJkYXRhQ2hhbmdlZCIsImNvbG9yQ2xhc3MiLCJlbXB0eSIsImljb25DbGFzcyIsImxpc3RJdGVtcyIsIm1hcCIsIm1zZyIsImpvaW4iLCIkbGFiZWwiLCIkaWNvbiIsImJ0X1Rvb2xUaXBIaWRlUGFzc3dvcmQiLCJ1cGRhdGVDb25maWciLCJpbnN0YW5jZU9yRmllbGRJZCIsIm5ld09wdGlvbnMiLCJnZXQiLCJyZW1vdmUiLCJoaWRlU3RyZW5ndGhCYXIiLCJoYXNCdXR0b25zIiwiZ2V0U3RhdGUiLCJkZXN0cm95QWxsIiwiZm9yRWFjaCIsImNsZWFyQ2FjaGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGNBQWMsR0FBRztBQUVuQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBQUlDLEdBQUosRUFMUTs7QUFRbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRTtBQUNSQyxJQUFBQSxJQUFJLEVBQUUsTUFERTtBQUNRO0FBQ2hCQyxJQUFBQSxJQUFJLEVBQUUsTUFGRTtBQUVRO0FBQ2hCQyxJQUFBQSxJQUFJLEVBQUUsTUFIRSxDQUdROztBQUhSLEdBWE87O0FBaUJu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LE9BQXRCLENBQUQsQ0FBWjtBQUNBLGFBQU8sS0FBS3ZCLGdCQUFMLENBQXNCdUIsT0FBdEIsQ0FBUDtBQUNILEtBdkJZLENBeUJiOzs7QUFDQSxTQUFLOUIsU0FBTCxXQUFzQjhCLE9BQXRCO0FBQ0gsR0FobkNrQjs7QUFrbkNuQjtBQUNKO0FBQ0E7QUFDSXlJLEVBQUFBLFVBcm5DbUIsd0JBcW5DTjtBQUFBOztBQUNULFNBQUt2SyxTQUFMLENBQWV3SyxPQUFmLENBQXVCLFVBQUNsSSxRQUFELEVBQVdSLE9BQVgsRUFBdUI7QUFDMUMsTUFBQSxNQUFJLENBQUNPLE9BQUwsQ0FBYVAsT0FBYjtBQUNILEtBRkQ7QUFHQSxTQUFLeEIsZUFBTCxHQUF1QixFQUF2QjtBQUNILEdBMW5Da0I7O0FBNG5DbkI7QUFDSjtBQUNBO0FBQ0ltSyxFQUFBQSxVQS9uQ21CLHdCQStuQ047QUFDVCxTQUFLbkssZUFBTCxHQUF1QixFQUF2QjtBQUNIO0FBam9Da0IsQ0FBdkIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYXNzd29yZFZhbGlkYXRpb25BUEksIEZvcm0sIENsaXBib2FyZEpTICovXG5cbi8qKlxuICogUGFzc3dvcmQgV2lkZ2V0IE1vZHVsZVxuICogXG4gKiBBIGNvbXByZWhlbnNpdmUgcGFzc3dvcmQgZmllbGQgY29tcG9uZW50IHRoYXQgcHJvdmlkZXM6XG4gKiAtIFBhc3N3b3JkIGdlbmVyYXRpb25cbiAqIC0gU3RyZW5ndGggdmFsaWRhdGlvbiB3aXRoIHJlYWwtdGltZSBmZWVkYmFja1xuICogLSBWaXN1YWwgcHJvZ3Jlc3MgaW5kaWNhdG9yXG4gKiAtIEFQSS1iYXNlZCB2YWxpZGF0aW9uIHdpdGggbG9jYWwgZmFsbGJhY2tcbiAqIC0gRm9ybSB2YWxpZGF0aW9uIGludGVncmF0aW9uXG4gKiBcbiAqIFVzYWdlOlxuICogY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdCgnI215UGFzc3dvcmRGaWVsZCcsIHtcbiAqICAgICBtb2RlOiAnZnVsbCcsICAgICAgICAgICAgICAvLyAnZnVsbCcgfCAnZ2VuZXJhdGUtb25seScgfCAnZGlzcGxheS1vbmx5JyB8ICdkaXNhYmxlZCdcbiAqICAgICB2YWxpZGF0aW9uOiAnc29mdCcsICAgICAgICAvLyAnaGFyZCcgfCAnc29mdCcgfCAnbm9uZSdcbiAqICAgICBtaW5TY29yZTogNjAsXG4gKiAgICAgZ2VuZXJhdGVMZW5ndGg6IDE2LFxuICogICAgIG9uVmFsaWRhdGU6IChpc1ZhbGlkLCBzY29yZSwgbWVzc2FnZXMpID0+IHsgLi4uIH1cbiAqIH0pO1xuICovXG5jb25zdCBQYXNzd29yZFdpZGdldCA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBY3RpdmUgd2lkZ2V0IGluc3RhbmNlc1xuICAgICAqL1xuICAgIGluc3RhbmNlczogbmV3IE1hcCgpLFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gdHlwZXNcbiAgICAgKi9cbiAgICBWQUxJREFUSU9OOiB7XG4gICAgICAgIEhBUkQ6ICdoYXJkJywgICAvLyBCbG9jayBmb3JtIHN1Ym1pc3Npb24gaWYgaW52YWxpZFxuICAgICAgICBTT0ZUOiAnc29mdCcsICAgLy8gU2hvdyB3YXJuaW5ncyBidXQgYWxsb3cgc3VibWlzc2lvblxuICAgICAgICBOT05FOiAnbm9uZScgICAgLy8gTm8gdmFsaWRhdGlvblxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FjaGUgZm9yIHZhbGlkYXRpb24gcmVzdWx0c1xuICAgICAqL1xuICAgIHZhbGlkYXRpb25DYWNoZToge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogVGltZXJzIGZvciBkZWJvdW5jaW5nIHZhbGlkYXRpb25cbiAgICAgKi9cbiAgICB2YWxpZGF0aW9uVGltZXJzOiB7fSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBkZWZhdWx0czoge1xuICAgICAgICB2YWxpZGF0aW9uOiAnc29mdCcsXG4gICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsICAvLyBTaG93L2hpZGUgcGFzc3dvcmQgdG9nZ2xlXG4gICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSwgICAgICAvLyBDb3B5IHRvIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDE2LFxuICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgIGNoZWNrT25Mb2FkOiBmYWxzZSxcbiAgICAgICAgb25WYWxpZGF0ZTogbnVsbCwgICAgICAgIC8vIENhbGxiYWNrOiAoaXNWYWxpZCwgc2NvcmUsIG1lc3NhZ2VzKSA9PiB2b2lkXG4gICAgICAgIG9uR2VuZXJhdGU6IG51bGwsICAgICAgICAvLyBDYWxsYmFjazogKHBhc3N3b3JkKSA9PiB2b2lkXG4gICAgICAgIHZhbGlkYXRpb25SdWxlczogbnVsbCAgICAvLyBDdXN0b20gdmFsaWRhdGlvbiBydWxlcyBmb3IgRm9ybS5qc1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xqUXVlcnl9IHNlbGVjdG9yIC0gRmllbGQgc2VsZWN0b3Igb3IgalF1ZXJ5IG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gV2lkZ2V0IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fG51bGx9IFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXQoc2VsZWN0b3IsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignUGFzc3dvcmRXaWRnZXQ6IEZpZWxkIG5vdCBmb3VuZCcsIHNlbGVjdG9yKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZElkID0gJGZpZWxkLmF0dHIoJ2lkJykgfHwgJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIGluc3RhbmNlIGlmIGFueVxuICAgICAgICBpZiAodGhpcy5pbnN0YW5jZXMuaGFzKGZpZWxkSWQpKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koZmllbGRJZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBpbnN0YW5jZVxuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHtcbiAgICAgICAgICAgIGZpZWxkSWQsXG4gICAgICAgICAgICAkZmllbGQsXG4gICAgICAgICAgICAkY29udGFpbmVyOiAkZmllbGQuY2xvc2VzdCgnLmZpZWxkJyksXG4gICAgICAgICAgICBvcHRpb25zOiB7IC4uLnRoaXMuZGVmYXVsdHMsIC4uLm9wdGlvbnMgfSxcbiAgICAgICAgICAgIGVsZW1lbnRzOiB7fSxcbiAgICAgICAgICAgIHN0YXRlOiB7XG4gICAgICAgICAgICAgICAgaXNWYWxpZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzY29yZTogMCxcbiAgICAgICAgICAgICAgICBzdHJlbmd0aDogJycsXG4gICAgICAgICAgICAgICAgbWVzc2FnZXM6IFtdLFxuICAgICAgICAgICAgICAgIGlzR2VuZXJhdGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpc0ZvY3VzZWQ6IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5zZXQoZmllbGRJZCwgaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZVxuICAgICAgICB0aGlzLnNldHVwVUkoaW5zdGFuY2UpO1xuICAgICAgICB0aGlzLmJpbmRFdmVudHMoaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgZm9ybSB2YWxpZGF0aW9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAoaW5zdGFuY2Uub3B0aW9ucy52YWxpZGF0aW9uICE9PSB0aGlzLlZBTElEQVRJT04uTk9ORSkge1xuICAgICAgICAgICAgdGhpcy5zZXR1cEZvcm1WYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaW5pdGlhbCB2YWx1ZSBpZiByZXF1ZXN0ZWRcbiAgICAgICAgaWYgKGluc3RhbmNlLm9wdGlvbnMuY2hlY2tPbkxvYWQgJiYgJGZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICB0aGlzLmNoZWNrUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXR1cCBVSSBlbGVtZW50c1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHNldHVwVUkoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsICRjb250YWluZXIsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBvciBjcmVhdGUgaW5wdXQgd3JhcHBlclxuICAgICAgICBsZXQgJGlucHV0V3JhcHBlciA9ICRmaWVsZC5jbG9zZXN0KCcudWkuaW5wdXQnKTtcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkZmllbGQud3JhcCgnPGRpdiBjbGFzcz1cInVpIGlucHV0XCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAkaW5wdXRXcmFwcGVyID0gJGZpZWxkLnBhcmVudCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgc2hvdy9oaWRlIHBhc3N3b3JkIGJ1dHRvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1Bhc3N3b3JkQnV0dG9uKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFNob3dIaWRlQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGdlbmVyYXRlIGJ1dHRvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuZ2VuZXJhdGVCdXR0b24pIHtcbiAgICAgICAgICAgIHRoaXMuYWRkR2VuZXJhdGVCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY2xpcGJvYXJkIGJ1dHRvbiBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuY2xpcGJvYXJkQnV0dG9uKSB7XG4gICAgICAgICAgICB0aGlzLmFkZENsaXBib2FyZEJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzdHJlbmd0aCBiYXIgaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dTdHJlbmd0aEJhcikge1xuICAgICAgICAgICAgdGhpcy5hZGRTdHJlbmd0aEJhcihpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB3YXJuaW5ncyBjb250YWluZXIgaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dXYXJuaW5ncykge1xuICAgICAgICAgICAgdGhpcy5hZGRXYXJuaW5nc0NvbnRhaW5lcihpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBpbnB1dCB3cmFwcGVyIGNsYXNzIGJhc2VkIG9uIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIHRoaXMudXBkYXRlSW5wdXRXcmFwcGVyQ2xhc3MoaW5zdGFuY2UpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIHNob3cvaGlkZSBwYXNzd29yZCBidXR0b25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRTaG93SGlkZUJ1dHRvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLnNob3ctaGlkZS1wYXNzd29yZCcpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0biA9ICRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLnNob3ctaGlkZS1wYXNzd29yZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYnV0dG9uXG4gICAgICAgIGNvbnN0ICRzaG93SGlkZUJ0biA9ICQoYFxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBzaG93LWhpZGUtcGFzc3dvcmRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcFNob3dQYXNzd29yZCB8fCAnU2hvdyBwYXNzd29yZCd9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleWUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRzaG93SGlkZUJ0bik7XG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0biA9ICRzaG93SGlkZUJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBnZW5lcmF0ZSBidXR0b25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRHZW5lcmF0ZUJ1dHRvbihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRpbnB1dFdyYXBwZXIgPSAkZmllbGQuY2xvc2VzdCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBidXR0b24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLmdlbmVyYXRlLXBhc3N3b3JkJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuID0gJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uZ2VuZXJhdGUtcGFzc3dvcmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJ1dHRvblxuICAgICAgICBjb25zdCAkZ2VuZXJhdGVCdG4gPSAkKGBcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gZ2VuZXJhdGUtcGFzc3dvcmRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEdlbmVyYXRlUGFzc3dvcmQgfHwgJ0dlbmVyYXRlIHBhc3N3b3JkJ31cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgaWNvblwiPjwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRnZW5lcmF0ZUJ0bik7XG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0biA9ICRnZW5lcmF0ZUJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBjbGlwYm9hcmQgYnV0dG9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkQ2xpcGJvYXJkQnV0dG9uKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGlucHV0V3JhcHBlciA9ICRmaWVsZC5jbG9zZXN0KCcudWkuaW5wdXQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGJ1dHRvbiBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uY2xpcGJvYXJkJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0biA9ICRpbnB1dFdyYXBwZXIuZmluZCgnYnV0dG9uLmNsaXBib2FyZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYnV0dG9uXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCAnJztcbiAgICAgICAgY29uc3QgJGNsaXBib2FyZEJ0biA9ICQoYFxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBjbGlwYm9hcmRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jbGlwYm9hcmQtdGV4dD1cIiR7Y3VycmVudFZhbHVlfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5UGFzc3dvcmQgfHwgJ0NvcHkgcGFzc3dvcmQnfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGNvcHlcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY29ybmVyIGtleSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDwvaT5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byB3cmFwcGVyXG4gICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRjbGlwYm9hcmRCdG4pO1xuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuID0gJGNsaXBib2FyZEJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBzdHJlbmd0aCBiYXJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRTdHJlbmd0aEJhcihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRjb250YWluZXIgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgcHJvZ3Jlc3MgYmFyIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc0JhciA9ICRjb250YWluZXIuZmluZCgnLnBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uID0gJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtc2VjdGlvbicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgcHJvZ3Jlc3MgYmFyXG4gICAgICAgIGNvbnN0ICRwcm9ncmVzc1NlY3Rpb24gPSAkKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwYXNzd29yZC1zdHJlbmd0aC1zZWN0aW9uXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIHBhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzIHByb2dyZXNzIGJvdHRvbSBhdHRhY2hlZCBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5zZXJ0IGFmdGVyIGZpZWxkXG4gICAgICAgICRjb250YWluZXIuYXBwZW5kKCRwcm9ncmVzc1NlY3Rpb24pO1xuICAgICAgICBcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyID0gJHByb2dyZXNzU2VjdGlvbi5maW5kKCcucGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbiA9ICRwcm9ncmVzc1NlY3Rpb247XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgd2FybmluZ3MgY29udGFpbmVyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkV2FybmluZ3NDb250YWluZXIoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkY29udGFpbmVyIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdhcm5pbmdzIGNvbnRhaW5lciBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJGNvbnRhaW5lci5maW5kKCcucGFzc3dvcmQtd2FybmluZ3MnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MgPSAkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC13YXJuaW5ncycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgd2FybmluZ3MgY29udGFpbmVyICh3aWxsIGJlIHBvcHVsYXRlZCB3aGVuIG5lZWRlZClcbiAgICAgICAgY29uc3QgJHdhcm5pbmdzID0gJCgnPGRpdiBjbGFzcz1cInBhc3N3b3JkLXdhcm5pbmdzXCI+PC9kaXY+Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBlbmQgdG8gdGhlIGZpZWxkIGNvbnRhaW5lciAoYWZ0ZXIgcHJvZ3Jlc3MgYmFyIGlmIGV4aXN0cylcbiAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJHdhcm5pbmdzKTtcbiAgICAgICAgXG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncyA9ICR3YXJuaW5ncztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJpbmQgZXZlbnRzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYmluZEV2ZW50cyhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93L2hpZGUgYnV0dG9uIGNsaWNrXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bi5vZmYoJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy50b2dnbGVQYXNzd29yZFZpc2liaWxpdHkoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdlbmVyYXRlIGJ1dHRvbiBjbGlja1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ub2ZmKCdjbGljay5wYXNzd29yZFdpZGdldCcpLm9uKCdjbGljay5wYXNzd29yZFdpZGdldCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVQYXNzd29yZChpbnN0YW5jZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZnVuY3Rpb25hbGl0eSBmb3IgY29weSBidXR0b25cbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4gJiYgdHlwZW9mIENsaXBib2FyZEpTICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBDbGlwYm9hcmRKUyBmb3IgdGhlIGJ1dHRvblxuICAgICAgICAgICAgaWYgKCFpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0blswXSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cCBmb3IgY2xpcGJvYXJkIGJ1dHRvblxuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHN1Y2Nlc3NmdWwgY29weVxuICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4ucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuLnBvcHVwKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDE1MDApO1xuICAgICAgICAgICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGNvcHkgZXJyb3JcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQ2xpcGJvYXJkIGVycm9yOicsIGUuYWN0aW9uLCBlLnRyaWdnZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaWVsZCBpbnB1dCBldmVudFxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0ZU9uSW5wdXQpIHtcbiAgICAgICAgICAgICRmaWVsZC5vZmYoJ2lucHV0LnBhc3N3b3JkV2lkZ2V0IGNoYW5nZS5wYXNzd29yZFdpZGdldCcpLm9uKCdpbnB1dC5wYXNzd29yZFdpZGdldCBjaGFuZ2UucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dChpbnN0YW5jZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNsaXBib2FyZCBidXR0b24gd2hlbiBwYXNzd29yZCBjaGFuZ2VzXG4gICAgICAgICRmaWVsZC5vbignaW5wdXQucGFzc3dvcmRXaWRnZXQgY2hhbmdlLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIHN0YXRlIG9uIGVtcHR5XG4gICAgICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhbGwgY2xpcGJvYXJkIGJ1dHRvbnMgKHdpZGdldCdzIGFuZCBhbnkgZXh0ZXJuYWwgb25lcylcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgdmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvY3VzIGV2ZW50IC0gc2hvdyBwcm9ncmVzcyBiYXIgd2hlbiBmaWVsZCBpcyBmb2N1c2VkXG4gICAgICAgICRmaWVsZC5vZmYoJ2ZvY3VzLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2ZvY3VzLnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgaW5zdGFuY2Uuc3RhdGUuaXNGb2N1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIFNob3cgcHJvZ3Jlc3MgYmFyIGlmIHRoZXJlJ3MgYSBwYXNzd29yZCB2YWx1ZVxuICAgICAgICAgICAgY29uc3QgcGFzc3dvcmQgPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICBpZiAocGFzc3dvcmQgJiYgcGFzc3dvcmQgIT09ICcnICYmICF0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgdmFsaWRhdGlvbiB0byB1cGRhdGUgcHJvZ3Jlc3MgYmFyXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGVPbklucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCbHVyIGV2ZW50IC0gaGlkZSBwcm9ncmVzcyBiYXIgd2hlbiBmaWVsZCBsb3NlcyBmb2N1c1xuICAgICAgICAkZmllbGQub2ZmKCdibHVyLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2JsdXIucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0ZvY3VzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIEhpZGUgb25seSBwcm9ncmVzcyBiYXIsIGtlZXAgd2FybmluZ3MgdmlzaWJsZVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE5ldmVyIGhpZGUgd2FybmluZ3Mgb24gYmx1ciAtIHRoZXkgc2hvdWxkIHJlbWFpbiB2aXNpYmxlXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogRGlzYWJsZSB3aWRnZXRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBkaXNhYmxlKGluc3RhbmNlKSB7XG4gICAgICAgIGluc3RhbmNlLiRmaWVsZC5wcm9wKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS4kY29udGFpbmVyLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRW5hYmxlIHdpZGdldFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGVuYWJsZShpbnN0YW5jZSkge1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS4kY29udGFpbmVyLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHJlYWQtb25seSBtb2RlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgc2V0UmVhZE9ubHkoaW5zdGFuY2UpIHtcbiAgICAgICAgaW5zdGFuY2UuJGZpZWxkLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIGZvcm0gdmFsaWRhdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHNldHVwRm9ybVZhbGlkYXRpb24oaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCBpZiBGb3JtIG9iamVjdCBpcyBub3QgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSA9PT0gJ3VuZGVmaW5lZCcgfHwgIUZvcm0udmFsaWRhdGVSdWxlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICBpZiAoIWZpZWxkTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgY3VzdG9tIHJ1bGVzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRpb25SdWxlcykge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzW2ZpZWxkTmFtZV0gPSBvcHRpb25zLnZhbGlkYXRpb25SdWxlcztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gbW9kZVxuICAgICAgICBjb25zdCBydWxlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5vbi1lbXB0eSBydWxlIGZvciBoYXJkIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLkhBUkQpIHtcbiAgICAgICAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHdfVmFsaWRhdGVQYXNzd29yZEVtcHR5IHx8ICdQYXNzd29yZCBjYW5ub3QgYmUgZW1wdHknXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0cmVuZ3RoIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKG9wdGlvbnMubWluU2NvcmUgPiAwICYmIG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLkhBUkQpIHtcbiAgICAgICAgICAgIHJ1bGVzLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdwYXNzd29yZFN0cmVuZ3RoJyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wd19WYWxpZGF0ZVBhc3N3b3JkV2VhayB8fCAnUGFzc3dvcmQgaXMgdG9vIHdlYWsnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHJ1bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlc1tmaWVsZE5hbWVdID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGZpZWxkTmFtZSxcbiAgICAgICAgICAgICAgICBydWxlczogcnVsZXNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBwYXNzd29yZCBzdHJlbmd0aFxuICAgICAgICBpZiAodHlwZW9mICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5wYXNzd29yZFN0cmVuZ3RoID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnBhc3N3b3JkU3RyZW5ndGggPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlLnN0YXRlLnNjb3JlID49IG9wdGlvbnMubWluU2NvcmU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBwYXNzd29yZCBpcyBtYXNrZWQgKHNlcnZlciByZXR1cm5zIHRoZXNlIHdoZW4gcGFzc3dvcmQgaXMgaGlkZGVuKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIGNoZWNrXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgcGFzc3dvcmQgYXBwZWFycyB0byBiZSBtYXNrZWRcbiAgICAgKi9cbiAgICBpc01hc2tlZFBhc3N3b3JkKHBhc3N3b3JkKSB7XG4gICAgICAgIHJldHVybiAvXlt4WF17Nix9JHxeXFwqezYsfSR8XkhJRERFTiR8Xk1BU0tFRCQvaS50ZXN0KHBhc3N3b3JkKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBpbnB1dCBldmVudFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGhhbmRsZUlucHV0KGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgcGFzc3dvcmQgPSAkZmllbGQudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gaWYgZGlzYWJsZWRcbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLk5PTkUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCB2YWxpZGF0aW9uIGZvciBtYXNrZWQgcGFzc3dvcmRzXG4gICAgICAgIGlmICh0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVmFsaWRhdGlvbihpbnN0YW5jZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGdlbmVyYXRlZCBmbGFnIHdoZW4gdXNlciB0eXBlc1xuICAgICAgICBpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZCA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gVmFsaWRhdGUgcGFzc3dvcmQgb25seSBpZiBmaWVsZCBpcyBmb2N1c2VkXG4gICAgICAgIGlmIChpbnN0YW5jZS5zdGF0ZS5pc0ZvY3VzZWQpIHtcbiAgICAgICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSBwYXNzd29yZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIHZhbGlkYXRlXG4gICAgICovXG4gICAgdmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpIHtcbiAgICAgICAgY29uc3QgeyBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBlbXB0eSBwYXNzd29yZFxuICAgICAgICBpZiAoIXBhc3N3b3JkIHx8IHBhc3N3b3JkID09PSAnJykge1xuICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gZm9yIG1hc2tlZCBwYXNzd29yZHMgKHNlcnZlciByZXR1cm5zIHRoZXNlIHdoZW4gcGFzc3dvcmQgaXMgaGlkZGVuKVxuICAgICAgICAvLyBDb21tb24gcGF0dGVybnM6IHh4eHh4eHgsIFhYWFhYWFhYLCAqKioqKioqLCBISURERU4sIGV0Yy5cbiAgICAgICAgaWYgKHRoaXMuaXNNYXNrZWRQYXNzd29yZChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYXJWYWxpZGF0aW9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBwcm9ncmVzcyBzZWN0aW9uIG9ubHkgaWYgZmllbGQgaXMgZm9jdXNlZFxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbiAmJiBpbnN0YW5jZS5zdGF0ZS5pc0ZvY3VzZWQpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc1NlY3Rpb24uc2hvdygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBjYWNoZSBmaXJzdFxuICAgICAgICBjb25zdCBjYWNoZUtleSA9IGAke2luc3RhbmNlLmZpZWxkSWR9OiR7cGFzc3dvcmR9YDtcbiAgICAgICAgaWYgKHRoaXMudmFsaWRhdGlvbkNhY2hlW2NhY2hlS2V5XSkge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVWYWxpZGF0aW9uUmVzdWx0KGluc3RhbmNlLCB0aGlzLnZhbGlkYXRpb25DYWNoZVtjYWNoZUtleV0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB0aW1lclxuICAgICAgICBpZiAodGhpcy52YWxpZGF0aW9uVGltZXJzW2luc3RhbmNlLmZpZWxkSWRdKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy52YWxpZGF0aW9uVGltZXJzW2luc3RhbmNlLmZpZWxkSWRdKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBpbW1lZGlhdGUgbG9jYWwgZmVlZGJhY2tcbiAgICAgICAgY29uc3QgbG9jYWxTY29yZSA9IHRoaXMuc2NvcmVQYXNzd29yZExvY2FsKHBhc3N3b3JkKTtcbiAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzc0JhcihpbnN0YW5jZSwgbG9jYWxTY29yZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZWJvdW5jZSBBUEkgY2FsbFxuICAgICAgICB0aGlzLnZhbGlkYXRpb25UaW1lcnNbaW5zdGFuY2UuZmllbGRJZF0gPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIC8vIFVzZSBBUEkgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAodHlwZW9mIFBhc3N3b3JkVmFsaWRhdGlvbkFQSSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBQYXNzd29yZFZhbGlkYXRpb25BUEkudmFsaWRhdGVQYXNzd29yZChwYXNzd29yZCwgaW5zdGFuY2UuZmllbGRJZCwgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDYWNoZSByZXN1bHRcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmFsaWRhdGlvbkNhY2hlW2NhY2hlS2V5XSA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgbG9jYWwgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcmU6IGxvY2FsU2NvcmUsXG4gICAgICAgICAgICAgICAgICAgIGlzVmFsaWQ6IGxvY2FsU2NvcmUgPj0gb3B0aW9ucy5taW5TY29yZSxcbiAgICAgICAgICAgICAgICAgICAgc3RyZW5ndGg6IHRoaXMuZ2V0U3RyZW5ndGhMYWJlbChsb2NhbFNjb3JlKSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXM6IFtdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVZhbGlkYXRpb25SZXN1bHQoaW5zdGFuY2UsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDMwMCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgcGFzc3dvcmQgc2NvcmUgbG9jYWxseVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHRvIHNjb3JlXG4gICAgICogQHJldHVybnMge251bWJlcn0gU2NvcmUgZnJvbSAwLTEwMFxuICAgICAqL1xuICAgIHNjb3JlUGFzc3dvcmRMb2NhbChwYXNzd29yZCkge1xuICAgICAgICBsZXQgc2NvcmUgPSAwO1xuICAgICAgICBpZiAoIXBhc3N3b3JkIHx8IHBhc3N3b3JkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHNjb3JlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsZW5ndGggPSBwYXNzd29yZC5sZW5ndGg7XG4gICAgICAgIFxuICAgICAgICAvLyBMZW5ndGggc2NvcmluZyAodXAgdG8gMzAgcG9pbnRzKVxuICAgICAgICBpZiAobGVuZ3RoID49IDE2KSB7XG4gICAgICAgICAgICBzY29yZSArPSAzMDtcbiAgICAgICAgfSBlbHNlIGlmIChsZW5ndGggPj0gMTIpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDIwO1xuICAgICAgICB9IGVsc2UgaWYgKGxlbmd0aCA+PSA4KSB7XG4gICAgICAgICAgICBzY29yZSArPSAxMDtcbiAgICAgICAgfSBlbHNlIGlmIChsZW5ndGggPj0gNikge1xuICAgICAgICAgICAgc2NvcmUgKz0gNTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hhcmFjdGVyIGRpdmVyc2l0eSAodXAgdG8gNDAgcG9pbnRzKVxuICAgICAgICBpZiAoL1thLXpdLy50ZXN0KHBhc3N3b3JkKSkgc2NvcmUgKz0gMTA7IC8vIExvd2VyY2FzZVxuICAgICAgICBpZiAoL1tBLVpdLy50ZXN0KHBhc3N3b3JkKSkgc2NvcmUgKz0gMTA7IC8vIFVwcGVyY2FzZVxuICAgICAgICBpZiAoL1xcZC8udGVzdChwYXNzd29yZCkpIHNjb3JlICs9IDEwOyAgICAgLy8gRGlnaXRzXG4gICAgICAgIGlmICgvXFxXLy50ZXN0KHBhc3N3b3JkKSkgc2NvcmUgKz0gMTA7ICAgICAvLyBTcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgXG4gICAgICAgIC8vIFBhdHRlcm4gY29tcGxleGl0eSAodXAgdG8gMzAgcG9pbnRzKVxuICAgICAgICBjb25zdCB1bmlxdWVDaGFycyA9IG5ldyBTZXQocGFzc3dvcmQpLnNpemU7XG4gICAgICAgIGNvbnN0IHVuaXF1ZVJhdGlvID0gdW5pcXVlQ2hhcnMgLyBsZW5ndGg7XG4gICAgICAgIFxuICAgICAgICBpZiAodW5pcXVlUmF0aW8gPiAwLjcpIHtcbiAgICAgICAgICAgIHNjb3JlICs9IDIwO1xuICAgICAgICB9IGVsc2UgaWYgKHVuaXF1ZVJhdGlvID4gMC41KSB7XG4gICAgICAgICAgICBzY29yZSArPSAxNTtcbiAgICAgICAgfSBlbHNlIGlmICh1bmlxdWVSYXRpbyA+IDAuMykge1xuICAgICAgICAgICAgc2NvcmUgKz0gMTA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzY29yZSArPSA1O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBQZW5hbHRpZXMgZm9yIGNvbW1vbiBwYXR0ZXJuc1xuICAgICAgICBpZiAoLyguKVxcMXsyLH0vLnRlc3QocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICBzY29yZSAtPSAxMDsgLy8gUmVwZWF0aW5nIGNoYXJhY3RlcnNcbiAgICAgICAgfVxuICAgICAgICBpZiAoLygwMTJ8MTIzfDIzNHwzNDV8NDU2fDU2N3w2Nzh8Nzg5fDg5MHxhYmN8YmNkfGNkZXxkZWYpL2kudGVzdChwYXNzd29yZCkpIHtcbiAgICAgICAgICAgIHNjb3JlIC09IDEwOyAvLyBTZXF1ZW50aWFsIHBhdHRlcm5zXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1pbigxMDAsIHNjb3JlKSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc3RyZW5ndGggbGFiZWwgZm9yIHNjb3JlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3JlIC0gUGFzc3dvcmQgc2NvcmVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBTdHJlbmd0aCBsYWJlbFxuICAgICAqL1xuICAgIGdldFN0cmVuZ3RoTGFiZWwoc2NvcmUpIHtcbiAgICAgICAgaWYgKHNjb3JlIDwgMjApIHJldHVybiAndmVyeV93ZWFrJztcbiAgICAgICAgaWYgKHNjb3JlIDwgNDApIHJldHVybiAnd2Vhayc7XG4gICAgICAgIGlmIChzY29yZSA8IDYwKSByZXR1cm4gJ2ZhaXInO1xuICAgICAgICBpZiAoc2NvcmUgPCA4MCkgcmV0dXJuICdnb29kJztcbiAgICAgICAgcmV0dXJuICdzdHJvbmcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHByb2dyZXNzIGJhclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29yZSAtIFBhc3N3b3JkIHNjb3JlXG4gICAgICovXG4gICAgdXBkYXRlUHJvZ3Jlc3NCYXIoaW5zdGFuY2UsIHNjb3JlKSB7XG4gICAgICAgIGNvbnN0IHsgZWxlbWVudHMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFlbGVtZW50cy4kcHJvZ3Jlc3NCYXIgfHwgZWxlbWVudHMuJHByb2dyZXNzQmFyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3NcbiAgICAgICAgZWxlbWVudHMuJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcbiAgICAgICAgICAgIHBlcmNlbnQ6IE1hdGgubWluKHNjb3JlLCAxMDApLFxuICAgICAgICAgICAgc2hvd0FjdGl2aXR5OiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY29sb3JcbiAgICAgICAgZWxlbWVudHMuJHByb2dyZXNzQmFyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JlZCBvcmFuZ2UgeWVsbG93IG9saXZlIGdyZWVuJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyh0aGlzLmdldENvbG9yRm9yU2NvcmUoc2NvcmUpKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjb2xvciBjbGFzcyBmb3Igc2NvcmVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcmUgLSBQYXNzd29yZCBzY29yZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IENvbG9yIGNsYXNzIG5hbWVcbiAgICAgKi9cbiAgICBnZXRDb2xvckZvclNjb3JlKHNjb3JlKSB7XG4gICAgICAgIGlmIChzY29yZSA8IDIwKSByZXR1cm4gJ3JlZCc7XG4gICAgICAgIGlmIChzY29yZSA8IDQwKSByZXR1cm4gJ29yYW5nZSc7XG4gICAgICAgIGlmIChzY29yZSA8IDYwKSByZXR1cm4gJ3llbGxvdyc7XG4gICAgICAgIGlmIChzY29yZSA8IDgwKSByZXR1cm4gJ29saXZlJztcbiAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgdmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gVmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKi9cbiAgICBoYW5kbGVWYWxpZGF0aW9uUmVzdWx0KGluc3RhbmNlLCByZXN1bHQpIHtcbiAgICAgICAgaWYgKCFyZXN1bHQpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHsgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgc3RhdGVcbiAgICAgICAgaW5zdGFuY2Uuc3RhdGUgPSB7XG4gICAgICAgICAgICBpc1ZhbGlkOiByZXN1bHQuaXNWYWxpZCB8fCByZXN1bHQuc2NvcmUgPj0gb3B0aW9ucy5taW5TY29yZSxcbiAgICAgICAgICAgIHNjb3JlOiByZXN1bHQuc2NvcmUsXG4gICAgICAgICAgICBzdHJlbmd0aDogcmVzdWx0LnN0cmVuZ3RoIHx8IHRoaXMuZ2V0U3RyZW5ndGhMYWJlbChyZXN1bHQuc2NvcmUpLFxuICAgICAgICAgICAgbWVzc2FnZXM6IHJlc3VsdC5tZXNzYWdlcyB8fCBbXSxcbiAgICAgICAgICAgIGlzR2VuZXJhdGVkOiBpbnN0YW5jZS5zdGF0ZS5pc0dlbmVyYXRlZFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIFVJXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3NCYXIoaW5zdGFuY2UsIHJlc3VsdC5zY29yZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHdhcm5pbmdzL2Vycm9yc1xuICAgICAgICBpZiAob3B0aW9ucy5zaG93V2FybmluZ3MgJiYgcmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlVHlwZSA9IGluc3RhbmNlLnN0YXRlLmlzVmFsaWQgPyAnd2FybmluZycgOiAnZXJyb3InO1xuICAgICAgICAgICAgdGhpcy5zaG93V2FybmluZ3MoaW5zdGFuY2UsIHJlc3VsdCwgbWVzc2FnZVR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxsIHZhbGlkYXRpb24gY2FsbGJhY2tcbiAgICAgICAgaWYgKG9wdGlvbnMub25WYWxpZGF0ZSkge1xuICAgICAgICAgICAgb3B0aW9ucy5vblZhbGlkYXRlKGluc3RhbmNlLnN0YXRlLmlzVmFsaWQsIHJlc3VsdC5zY29yZSwgcmVzdWx0Lm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gdmFsaWRhdGlvbiBzdGF0ZVxuICAgICAgICBpZiAoRm9ybSAmJiBGb3JtLiRmb3JtT2JqKSB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBpbnN0YW5jZS4kZmllbGQuYXR0cignbmFtZScpIHx8IGluc3RhbmNlLiRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKCFpbnN0YW5jZS5zdGF0ZS5pc1ZhbGlkICYmIG9wdGlvbnMudmFsaWRhdGlvbiA9PT0gdGhpcy5WQUxJREFUSU9OLkhBUkQpIHtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ2FkZCBwcm9tcHQnLCBmaWVsZE5hbWUsIHJlc3VsdC5tZXNzYWdlc1swXSB8fCAnSW52YWxpZCBwYXNzd29yZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCBmaWVsZE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBwYXNzd29yZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGdlbmVyYXRlUGFzc3dvcmQoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2VuZXJhdGUgcGFzc3dvcmRcbiAgICAgICAgY29uc3QgZ2VuZXJhdGVDYWxsYmFjayA9IChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBhc3N3b3JkID0gdHlwZW9mIHJlc3VsdCA9PT0gJ3N0cmluZycgPyByZXN1bHQgOiByZXN1bHQucGFzc3dvcmQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBwYXNzd29yZFxuICAgICAgICAgICAgdGhpcy5zZXRHZW5lcmF0ZWRQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWxsIGNhbGxiYWNrXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5vbkdlbmVyYXRlKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5vbkdlbmVyYXRlKHBhc3N3b3JkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBBUEkgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgUGFzc3dvcmRWYWxpZGF0aW9uQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgUGFzc3dvcmRWYWxpZGF0aW9uQVBJLmdlbmVyYXRlUGFzc3dvcmQob3B0aW9ucy5nZW5lcmF0ZUxlbmd0aCwgZ2VuZXJhdGVDYWxsYmFjayk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaW1wbGUgbG9jYWwgZ2VuZXJhdG9yXG4gICAgICAgICAgICBjb25zdCBjaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSFAIyQlXiYqJztcbiAgICAgICAgICAgIGxldCBwYXNzd29yZCA9ICcnO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvcHRpb25zLmdlbmVyYXRlTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwYXNzd29yZCArPSBjaGFycy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBnZW5lcmF0ZUNhbGxiYWNrKHBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IGdlbmVyYXRlZCBwYXNzd29yZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIEdlbmVyYXRlZCBwYXNzd29yZFxuICAgICAqL1xuICAgIHNldEdlbmVyYXRlZFBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgJGNvbnRhaW5lciwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdmFsdWVcbiAgICAgICAgJGZpZWxkLnZhbChwYXNzd29yZCkudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIGluc3RhbmNlLnN0YXRlLmlzR2VuZXJhdGVkID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgY2xpcGJvYXJkIGJ1dHRvbnMgKHdpZGdldCdzIGFuZCBhbnkgZXh0ZXJuYWwgb25lcylcbiAgICAgICAgJCgnLmNsaXBib2FyZCcpLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCBwYXNzd29yZCk7XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGF0ZSBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMudmFsaWRhdGlvbiAhPT0gdGhpcy5WQUxJREFUSU9OLk5PTkUpIHtcbiAgICAgICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHdhcm5pbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCAtIFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBNZXNzYWdlIHR5cGUgKHdhcm5pbmcvZXJyb3IpXG4gICAgICovXG4gICAgc2hvd1dhcm5pbmdzKGluc3RhbmNlLCByZXN1bHQsIHR5cGUgPSAnd2FybmluZycpIHtcbiAgICAgICAgaWYgKCFpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHsgZWxlbWVudHMgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCBjb2xvckNsYXNzID0gdHlwZSA9PT0gJ2Vycm9yJyA/ICdyZWQnIDogJ29yYW5nZSc7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB3YXJuaW5nc1xuICAgICAgICBlbGVtZW50cy4kd2FybmluZ3MuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB3YXJuaW5ncyBhcyBwb2ludGluZyBsYWJlbFxuICAgICAgICBpZiAocmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBDaG9vc2UgaWNvbiBiYXNlZCBvbiBtZXNzYWdlIHR5cGVcbiAgICAgICAgICAgIGNvbnN0IGljb25DbGFzcyA9IHR5cGUgPT09ICdlcnJvcicgPyAnZXhjbGFtYXRpb24gY2lyY2xlJyA6ICdleGNsYW1hdGlvbiB0cmlhbmdsZSc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSBsaXN0IGl0ZW1zIGZyb20gbWVzc2FnZXMgd2l0aCBpY29uc1xuICAgICAgICAgICAgY29uc3QgbGlzdEl0ZW1zID0gcmVzdWx0Lm1lc3NhZ2VzLm1hcChtc2cgPT4gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtpY29uQ2xhc3N9IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+JHttc2d9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKS5qb2luKCcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIHBvaW50aW5nIGFib3ZlIGxhYmVsIHdpdGggbGlzdCAocG9pbnRzIHRvIHBhc3N3b3JkIGZpZWxkKVxuICAgICAgICAgICAgY29uc3QgJGxhYmVsID0gJChgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nICR7Y29sb3JDbGFzc30gYmFzaWMgbGFiZWxcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGxpc3RcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7bGlzdEl0ZW1zfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBlbGVtZW50cy4kd2FybmluZ3MuYXBwZW5kKCRsYWJlbCkuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHdhcm5pbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgaGlkZVdhcm5pbmdzKGluc3RhbmNlKSB7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncy5lbXB0eSgpLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHBhc3N3b3JkIHZpc2liaWxpdHlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICB0b2dnbGVQYXNzd29yZFZpc2liaWxpdHkoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkc2hvd0hpZGVCdG4gPSBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG47XG4gICAgICAgIFxuICAgICAgICBpZiAoISRzaG93SGlkZUJ0bikgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJGljb24gPSAkc2hvd0hpZGVCdG4uZmluZCgnaScpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdwYXNzd29yZCcpIHtcbiAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmRcbiAgICAgICAgICAgICRmaWVsZC5hdHRyKCd0eXBlJywgJ3RleHQnKTtcbiAgICAgICAgICAgICRpY29uLnJlbW92ZUNsYXNzKCdleWUnKS5hZGRDbGFzcygnZXllIHNsYXNoJyk7XG4gICAgICAgICAgICAkc2hvd0hpZGVCdG4uYXR0cignZGF0YS1jb250ZW50JywgZ2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBIaWRlUGFzc3dvcmQgfHwgJ0hpZGUgcGFzc3dvcmQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgcGFzc3dvcmRcbiAgICAgICAgICAgICRmaWVsZC5hdHRyKCd0eXBlJywgJ3Bhc3N3b3JkJyk7XG4gICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllIHNsYXNoJykuYWRkQ2xhc3MoJ2V5ZScpO1xuICAgICAgICAgICAgJHNob3dIaWRlQnRuLmF0dHIoJ2RhdGEtY29udGVudCcsIGdsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwU2hvd1Bhc3N3b3JkIHx8ICdTaG93IHBhc3N3b3JkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIHZhbGlkYXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpIHtcbiAgICAgICAgLy8gQ2xlYXIgd2FybmluZ3Mgd2hlbiBleHBsaWNpdGx5IGNsZWFyaW5nIHZhbGlkYXRpb24gKGVtcHR5IHBhc3N3b3JkKVxuICAgICAgICB0aGlzLmhpZGVXYXJuaW5ncyhpbnN0YW5jZSk7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3MoeyBwZXJjZW50OiAwIH0pO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbmNlLnN0YXRlID0ge1xuICAgICAgICAgICAgaXNWYWxpZDogdHJ1ZSxcbiAgICAgICAgICAgIHNjb3JlOiAwLFxuICAgICAgICAgICAgc3RyZW5ndGg6ICcnLFxuICAgICAgICAgICAgbWVzc2FnZXM6IFtdLFxuICAgICAgICAgICAgaXNHZW5lcmF0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgaXNGb2N1c2VkOiBpbnN0YW5jZS5zdGF0ZS5pc0ZvY3VzZWQgfHwgZmFsc2VcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIHBhc3N3b3JkIChtYW51YWwgdmFsaWRhdGlvbilcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjaGVja1Bhc3N3b3JkKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHBhc3N3b3JkID0gaW5zdGFuY2UuJGZpZWxkLnZhbCgpO1xuICAgICAgICBpZiAocGFzc3dvcmQgJiYgcGFzc3dvcmQgIT09ICcnKSB7XG4gICAgICAgICAgICAvLyBTa2lwIHZhbGlkYXRpb24gZm9yIG1hc2tlZCBwYXNzd29yZHNcbiAgICAgICAgICAgIGlmICh0aGlzLmlzTWFza2VkUGFzc3dvcmQocGFzc3dvcmQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZvciBpbml0aWFsIGNoZWNrLCBkb24ndCBzaG93IHByb2dyZXNzIGJhciBidXQgZG8gdmFsaWRhdGUgYW5kIHNob3cgd2FybmluZ3NcbiAgICAgICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgY29uZmlndXJhdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gaW5zdGFuY2VPckZpZWxkSWQgLSBJbnN0YW5jZSBvciBmaWVsZCBJRFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBuZXdPcHRpb25zIC0gTmV3IG9wdGlvbnNcbiAgICAgKi9cbiAgICB1cGRhdGVDb25maWcoaW5zdGFuY2VPckZpZWxkSWQsIG5ld09wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0eXBlb2YgaW5zdGFuY2VPckZpZWxkSWQgPT09ICdzdHJpbmcnIFxuICAgICAgICAgICAgPyB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VPckZpZWxkSWQpXG4gICAgICAgICAgICA6IGluc3RhbmNlT3JGaWVsZElkO1xuICAgICAgICAgICAgXG4gICAgICAgIGlmICghaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignUGFzc3dvcmRXaWRnZXQ6IEluc3RhbmNlIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgb3B0aW9uc1xuICAgICAgICBpbnN0YW5jZS5vcHRpb25zID0geyAuLi5pbnN0YW5jZS5vcHRpb25zLCAuLi5uZXdPcHRpb25zIH07XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgZHluYW1pYyBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICBpZiAoJ3Nob3dQYXNzd29yZEJ1dHRvbicgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuc2hvd1Bhc3N3b3JkQnV0dG9uICYmICFpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgYnV0dG9uIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFNob3dIaWRlQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAvLyBSZS1iaW5kIGV2ZW50cyBmb3IgdGhlIG5ldyBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bi5vZmYoJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlUGFzc3dvcmRWaXNpYmlsaXR5KGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICghbmV3T3B0aW9ucy5zaG93UGFzc3dvcmRCdXR0b24gJiYgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGJ1dHRvbiBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGdlbmVyYXRlIGJ1dHRvbiB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnZ2VuZXJhdGVCdXR0b24nIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLmdlbmVyYXRlQnV0dG9uICYmICFpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgYnV0dG9uIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEdlbmVyYXRlQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAvLyBSZS1iaW5kIGV2ZW50cyBmb3IgdGhlIG5ldyBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5vZmYoJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVQYXNzd29yZChpbnN0YW5jZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW5ld09wdGlvbnMuZ2VuZXJhdGVCdXR0b24gJiYgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGJ1dHRvbiBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNsaXBib2FyZCBidXR0b24gdmlzaWJpbGl0eVxuICAgICAgICBpZiAoJ2NsaXBib2FyZEJ1dHRvbicgaW4gbmV3T3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKG5ld09wdGlvbnMuY2xpcGJvYXJkQnV0dG9uICYmICFpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGJ1dHRvbiBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRDbGlwYm9hcmRCdXR0b24oaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2xpcGJvYXJkIGZvciB0aGUgbmV3IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuICYmIHR5cGVvZiBDbGlwYm9hcmRKUyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBDbGlwYm9hcmRKUyBmb3IgdGhlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuY2xpcGJvYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUyhpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgZm9yIGNsaXBib2FyZCBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHN1Y2Nlc3NmdWwgY29weVxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5jbGlwYm9hcmQub24oJ3N1Y2Nlc3MnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIGNvcHkgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDbGlwYm9hcmQgZXJyb3I6JywgZS5hY3Rpb24sIGUudHJpZ2dlcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIW5ld09wdGlvbnMuY2xpcGJvYXJkQnV0dG9uICYmIGluc3RhbmNlLmVsZW1lbnRzLiRjbGlwYm9hcmRCdG4pIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYnV0dG9uIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuY2xpcGJvYXJkLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGluc3RhbmNlLmNsaXBib2FyZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bi5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuZWxlbWVudHMuJGNsaXBib2FyZEJ0bjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHN0cmVuZ3RoIGJhciB2aXNpYmlsaXR5XG4gICAgICAgIGlmICgnc2hvd1N0cmVuZ3RoQmFyJyBpbiBuZXdPcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAobmV3T3B0aW9ucy5zaG93U3RyZW5ndGhCYXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dTdHJlbmd0aEJhcihpbnN0YW5jZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVN0cmVuZ3RoQmFyKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHdhcm5pbmdzIHZpc2liaWxpdHlcbiAgICAgICAgaWYgKCdzaG93V2FybmluZ3MnIGluIG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmIChuZXdPcHRpb25zLnNob3dXYXJuaW5ncykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1dhcm5pbmdzKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW5wdXQgd3JhcHBlciBhY3Rpb24gY2xhc3MgYmFzZWQgb24gYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy51cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyhpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1zZXR1cCBmb3JtIHZhbGlkYXRpb24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChpbnN0YW5jZS5vcHRpb25zLnZhbGlkYXRpb24gIT09IHRoaXMuVkFMSURBVElPTi5OT05FKSB7XG4gICAgICAgICAgICB0aGlzLnNldHVwRm9ybVZhbGlkYXRpb24oaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBjdXJyZW50IHZhbHVlIGlmIHZhbGlkYXRpb24gY2hhbmdlZFxuICAgICAgICBpZiAoJ3ZhbGlkYXRpb24nIGluIG5ld09wdGlvbnMgJiYgaW5zdGFuY2UuJGZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICB0aGlzLmNoZWNrUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaW5wdXQgd3JhcHBlciBhY3Rpb24gY2xhc3MgYmFzZWQgb24gYnV0dG9uIHZpc2liaWxpdHlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICB1cGRhdGVJbnB1dFdyYXBwZXJDbGFzcyhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCAkaW5wdXRXcmFwcGVyID0gaW5zdGFuY2UuJGZpZWxkLmNsb3Nlc3QoJy51aS5pbnB1dCcpO1xuICAgICAgICBjb25zdCBoYXNCdXR0b25zID0gISEoXG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2hvd0hpZGVCdG4gfHwgXG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4gfHwgXG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kY2xpcGJvYXJkQnRuXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaGFzQnV0dG9ucykge1xuICAgICAgICAgICAgJGlucHV0V3JhcHBlci5hZGRDbGFzcygnYWN0aW9uJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkaW5wdXRXcmFwcGVyLnJlbW92ZUNsYXNzKCdhY3Rpb24nKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHdpZGdldCBzdGF0ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG9iamVjdH0gaW5zdGFuY2VPckZpZWxkSWQgLSBJbnN0YW5jZSBvciBmaWVsZCBJRFxuICAgICAqIEByZXR1cm5zIHtvYmplY3R8bnVsbH0gV2lkZ2V0IHN0YXRlXG4gICAgICovXG4gICAgZ2V0U3RhdGUoaW5zdGFuY2VPckZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0eXBlb2YgaW5zdGFuY2VPckZpZWxkSWQgPT09ICdzdHJpbmcnIFxuICAgICAgICAgICAgPyB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VPckZpZWxkSWQpXG4gICAgICAgICAgICA6IGluc3RhbmNlT3JGaWVsZElkO1xuICAgICAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZSA/IGluc3RhbmNlLnN0YXRlIDogbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgc3RyZW5ndGggYmFyXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBpbnN0YW5jZU9yRmllbGRJZCAtIEluc3RhbmNlIG9yIGZpZWxkIElEXG4gICAgICovXG4gICAgc2hvd1N0cmVuZ3RoQmFyKGluc3RhbmNlT3JGaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgc3RyZW5ndGggYmFyXG4gICAgICogQHBhcmFtIHtzdHJpbmd8b2JqZWN0fSBpbnN0YW5jZU9yRmllbGRJZCAtIEluc3RhbmNlIG9yIGZpZWxkIElEXG4gICAgICovXG4gICAgaGlkZVN0cmVuZ3RoQmFyKGluc3RhbmNlT3JGaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdHlwZW9mIGluc3RhbmNlT3JGaWVsZElkID09PSAnc3RyaW5nJyBcbiAgICAgICAgICAgID8gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlT3JGaWVsZElkKVxuICAgICAgICAgICAgOiBpbnN0YW5jZU9yRmllbGRJZDtcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoaW5zdGFuY2UgJiYgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzU2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgd2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGRlc3Ryb3koZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gVW5iaW5kIGV2ZW50c1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQub2ZmKCcucGFzc3dvcmRXaWRnZXQnKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignLnBhc3N3b3JkV2lkZ2V0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRzaG93SGlkZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNob3dIaWRlQnRuLm9mZignLnBhc3N3b3JkV2lkZ2V0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgY2xpcGJvYXJkIGluc3RhbmNlXG4gICAgICAgIGlmIChpbnN0YW5jZS5jbGlwYm9hcmQpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmNsaXBib2FyZC5kZXN0cm95KCk7XG4gICAgICAgICAgICBkZWxldGUgaW5zdGFuY2UuY2xpcGJvYXJkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB0aW1lclxuICAgICAgICBpZiAodGhpcy52YWxpZGF0aW9uVGltZXJzW2ZpZWxkSWRdKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy52YWxpZGF0aW9uVGltZXJzW2ZpZWxkSWRdKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnZhbGlkYXRpb25UaW1lcnNbZmllbGRJZF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5kZWxldGUoZmllbGRJZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IGFsbCBpbnN0YW5jZXNcbiAgICAgKi9cbiAgICBkZXN0cm95QWxsKCkge1xuICAgICAgICB0aGlzLmluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSwgZmllbGRJZCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KGZpZWxkSWQpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy52YWxpZGF0aW9uQ2FjaGUgPSB7fTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIHZhbGlkYXRpb24gY2FjaGVcbiAgICAgKi9cbiAgICBjbGVhckNhY2hlKCkge1xuICAgICAgICB0aGlzLnZhbGlkYXRpb25DYWNoZSA9IHt9O1xuICAgIH1cbn07Il19