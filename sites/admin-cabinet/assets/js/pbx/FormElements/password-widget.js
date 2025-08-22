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
var PasswordWidget = {
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
    } // Create new instance


    var instance = {
      id: fieldId,
      $field: $field,
      $container: $field.closest('.field'),
      options: _objectSpread(_objectSpread({}, this.defaults), options),
      isGenerated: false,
      elements: {}
    }; // Initialize widget

    this.setupUI(instance);
    this.bindEvents(instance); // Check initial password if needed

    if (instance.options.checkOnLoad) {
      this.checkPassword(instance);
    } // Store instance


    this.instances.set(fieldId, instance);
    return instance;
  },

  /**
   * Setup UI elements
   * @param {object} instance - Widget instance
   */
  setupUI: function setupUI(instance) {
    var $field = instance.$field,
        $container = instance.$container,
        options = instance.options; // Add generate button if needed

    if (options.generateButton) {
      this.addGenerateButton(instance);
    } // Add strength bar if needed


    if (options.showStrengthBar) {
      this.addStrengthBar(instance);
    } // Prepare warning container


    if (options.showWarnings) {
      instance.elements.$warnings = $("<div id=\"".concat(instance.id, "-warnings\" class=\"ui small message password-warnings\" style=\"display:none;\"></div>"));
      $container.after(instance.elements.$warnings);
    }
  },

  /**
   * Add generate button to field
   * @param {object} instance - Widget instance
   */
  addGenerateButton: function addGenerateButton(instance) {
    var $field = instance.$field,
        $container = instance.$container;
    var $inputWrapper = $container.find('.ui.input'); // Check if there's already a generate button (clipboard button on providers)

    var $generateBtn = $inputWrapper.find('button.clipboard, button.generate-password');

    if ($generateBtn.length === 0) {
      // Add action class to input wrapper
      if (!$inputWrapper.hasClass('action')) {
        $inputWrapper.addClass('action');
      } // Create generate button


      $generateBtn = $("\n                <button class=\"ui icon button generate-password\" type=\"button\" \n                        title=\"".concat(globalTranslate.psw_GeneratePassword || 'Generate password', "\">\n                    <i class=\"sync alternate icon\"></i>\n                </button>\n            "));
      $inputWrapper.append($generateBtn);
    }

    instance.elements.$generateBtn = $generateBtn;
  },

  /**
   * Add strength bar to field
   * @param {object} instance - Widget instance
   */
  addStrengthBar: function addStrengthBar(instance) {
    var $container = instance.$container;
    var $scoreSection = $container.find('.password-score-section');

    if ($scoreSection.length === 0) {
      $scoreSection = $("\n                <div class=\"password-score-section\" style=\"display: none;\">\n                    <div class=\"ui small progress password-score\">\n                        <div class=\"bar\"></div>\n                    </div>\n                </div>\n            ");
      $container.append($scoreSection);
    }

    var $progressBar = $scoreSection.find('.password-score');
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
  bindEvents: function bindEvents(instance) {
    var _this = this;

    var $field = instance.$field,
        options = instance.options; // Generate button click

    if (instance.elements.$generateBtn) {
      instance.elements.$generateBtn.off('click.passwordWidget').on('click.passwordWidget', function (e) {
        e.preventDefault();

        _this.generatePassword(instance);
      });
    } // Real-time validation on input


    if (options.validateOnInput) {
      $field.off('input.passwordWidget').on('input.passwordWidget', function () {
        _this.handleInput(instance);
      });
    } // Clear warnings on empty


    $field.off('change.passwordWidget').on('change.passwordWidget', function () {
      var value = $field.val();

      if (!value || value === 'xxxxxxx') {
        _this.hideWarnings(instance);

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
  handleInput: function handleInput(instance) {
    var $field = instance.$field,
        options = instance.options;
    var password = $field.val(); // Check if should validate

    if (!this.shouldValidate(instance, password)) {
      this.hideWarnings(instance);

      if (instance.elements.$scoreSection) {
        instance.elements.$scoreSection.hide();
      }

      return;
    } // Show strength bar


    if (instance.elements.$scoreSection) {
      instance.elements.$scoreSection.show();
    } // Validate password


    this.validatePassword(instance, password);
  },

  /**
   * Check if password should be validated
   * @param {object} instance - Widget instance
   * @param {string} password - Password value
   * @returns {boolean}
   */
  shouldValidate: function shouldValidate(instance, password) {
    if (!password || password === 'xxxxxxx') {
      return false;
    }

    var options = instance.options; // Always validate generated passwords

    if (instance.isGenerated) {
      return true;
    } // Check context-specific rules


    if (options.context === 'provider') {
      var registrationType = $('#registration_type').val();

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
  validatePassword: function validatePassword(instance, password) {
    var _this2 = this;

    var options = instance.options; // Use PasswordScore for validation

    PasswordScore.checkPassStrength({
      pass: password,
      bar: instance.elements.$progressBar,
      section: instance.elements.$scoreSection,
      field: "".concat(options.context, "_").concat(instance.id),
      callback: function callback(result) {
        _this2.handleValidationResult(instance, result);
      }
    });
  },

  /**
   * Handle validation result
   * @param {object} instance - Widget instance
   * @param {object} result - Validation result
   */
  handleValidationResult: function handleValidationResult(instance, result) {
    if (!result) return;
    var $container = instance.$container,
        options = instance.options;
    var $field = $container; // Update field state

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
  generatePassword: function generatePassword(instance) {
    var _this3 = this;

    var $field = instance.$field,
        options = instance.options;
    var $btn = instance.elements.$generateBtn;

    if ($btn) {
      $btn.addClass('loading');
    } // Use API if available


    if (typeof PasswordValidationAPI !== 'undefined') {
      PasswordValidationAPI.generatePassword(options.generateLength, function (result) {
        if ($btn) $btn.removeClass('loading');

        if (result && result.password) {
          _this3.setGeneratedPassword(instance, result.password);
        }
      });
    } else {
      // Fallback generation
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      var password = '';

      for (var i = 0; i < options.generateLength; i++) {
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
  setGeneratedPassword: function setGeneratedPassword(instance, password) {
    var $field = instance.$field,
        $container = instance.$container; // Set password

    $field.val(password);
    instance.isGenerated = true; // Hide warnings

    this.hideWarnings(instance); // Show success state

    if (instance.elements.$scoreSection) {
      instance.elements.$scoreSection.show();
    }

    if (instance.elements.$progressBar) {
      instance.elements.$progressBar.removeClass('red orange yellow olive').addClass('green').progress('set percent', 100);
    }

    $container.removeClass('error warning').addClass('success'); // Mark form as changed

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
  showWarnings: function showWarnings(instance, result) {
    var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'warning';
    if (!instance.elements.$warnings) return;
    var $warnings = instance.elements.$warnings;
    $warnings.empty().removeClass('negative warning info positive error success').addClass(type === 'error' ? 'negative' : type);
    var content = '';

    if (result.isDefault) {
      content = "\n                <div class=\"header\">\n                    <i class=\"exclamation triangle icon\"></i>\n                    ".concat(globalTranslate.psw_DefaultPasswordWarning || 'Default Password Detected', "\n                </div>\n                <p>").concat(globalTranslate.psw_ChangeDefaultPassword || 'Please change the default password for security.', "</p>\n            ");
    } else if (result.isSimple || result.isInDictionary) {
      content = "\n                <div class=\"header\">\n                    <i class=\"exclamation triangle icon\"></i>\n                    ".concat(globalTranslate.psw_WeakPassword || 'Weak Password', "\n                </div>\n                <p>").concat(globalTranslate.psw_PasswordTooCommon || 'This password is too common and easily guessable.', "</p>\n            ");
    } else if (result.messages && result.messages.length > 0) {
      content = "\n                <div class=\"header\">\n                    <i class=\"info circle icon\"></i>\n                    ".concat(globalTranslate.psw_PasswordRequirements || 'Password Requirements', "\n                </div>\n                <ul class=\"list\">\n                    ").concat(result.messages.map(function (msg) {
        return "<li>".concat(msg, "</li>");
      }).join(''), "\n                </ul>\n            ");
    } // Add generate button suggestion for weak passwords


    if ((result.score < 60 || !result.isValid) && type === 'error') {
      content += "\n                <div class=\"ui divider\"></div>\n                <p>\n                    <i class=\"idea icon\"></i>\n                    ".concat(globalTranslate.psw_UseGenerateButton || 'Use the generate button to create a strong password.', "\n                </p>\n            ");
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
  hideWarnings: function hideWarnings(instance) {
    if (instance.elements.$warnings) {
      instance.elements.$warnings.hide();
    }

    instance.$container.removeClass('error warning success');
  },

  /**
   * Check initial password
   * @param {object} instance - Widget instance
   */
  checkPassword: function checkPassword(instance) {
    var password = instance.$field.val();

    if (this.shouldValidate(instance, password)) {
      this.validatePassword(instance, password);
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
    } // Remove elements


    if (instance.elements.$warnings) {
      instance.elements.$warnings.remove();
    }

    if (instance.elements.$scoreSection) {
      instance.elements.$scoreSection.remove();
    } // Remove instance


    this.instances["delete"](fieldId);
  },

  /**
   * Destroy all widget instances
   */
  destroyAll: function destroyAll() {
    var _this4 = this;

    this.instances.forEach(function (instance, fieldId) {
      _this4.destroy(fieldId);
    });
  }
}; // Export for use in other modules
// export default PasswordWidget;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvcGFzc3dvcmQtd2lkZ2V0LmpzIl0sIm5hbWVzIjpbIlBhc3N3b3JkV2lkZ2V0IiwiaW5zdGFuY2VzIiwiTWFwIiwiZGVmYXVsdHMiLCJjb250ZXh0IiwiZ2VuZXJhdGVCdXR0b24iLCJ2YWxpZGF0ZU9uSW5wdXQiLCJ2YWxpZGF0ZU9ubHlHZW5lcmF0ZWQiLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJjaGVja09uTG9hZCIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJpbml0Iiwic2VsZWN0b3IiLCJvcHRpb25zIiwiJGZpZWxkIiwiJCIsImxlbmd0aCIsImNvbnNvbGUiLCJ3YXJuIiwiZmllbGRJZCIsImF0dHIiLCJNYXRoIiwicmFuZG9tIiwidG9TdHJpbmciLCJzdWJzdHIiLCJoYXMiLCJkZXN0cm95IiwiaW5zdGFuY2UiLCJpZCIsIiRjb250YWluZXIiLCJjbG9zZXN0IiwiaXNHZW5lcmF0ZWQiLCJlbGVtZW50cyIsInNldHVwVUkiLCJiaW5kRXZlbnRzIiwiY2hlY2tQYXNzd29yZCIsInNldCIsImFkZEdlbmVyYXRlQnV0dG9uIiwiYWRkU3RyZW5ndGhCYXIiLCIkd2FybmluZ3MiLCJhZnRlciIsIiRpbnB1dFdyYXBwZXIiLCJmaW5kIiwiJGdlbmVyYXRlQnRuIiwiaGFzQ2xhc3MiLCJhZGRDbGFzcyIsImdsb2JhbFRyYW5zbGF0ZSIsInBzd19HZW5lcmF0ZVBhc3N3b3JkIiwiYXBwZW5kIiwiJHNjb3JlU2VjdGlvbiIsIiRwcm9ncmVzc0JhciIsInByb2dyZXNzIiwicGVyY2VudCIsInNob3dBY3Rpdml0eSIsIm9mZiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiZ2VuZXJhdGVQYXNzd29yZCIsImhhbmRsZUlucHV0IiwidmFsdWUiLCJ2YWwiLCJoaWRlV2FybmluZ3MiLCJoaWRlIiwicGFzc3dvcmQiLCJzaG91bGRWYWxpZGF0ZSIsInNob3ciLCJ2YWxpZGF0ZVBhc3N3b3JkIiwicmVnaXN0cmF0aW9uVHlwZSIsIlBhc3N3b3JkU2NvcmUiLCJjaGVja1Bhc3NTdHJlbmd0aCIsInBhc3MiLCJiYXIiLCJzZWN0aW9uIiwiZmllbGQiLCJjYWxsYmFjayIsInJlc3VsdCIsImhhbmRsZVZhbGlkYXRpb25SZXN1bHQiLCJyZW1vdmVDbGFzcyIsImlzRGVmYXVsdCIsImlzU2ltcGxlIiwiaXNJbkRpY3Rpb25hcnkiLCJpc1ZhbGlkIiwic2NvcmUiLCIkYnRuIiwiUGFzc3dvcmRWYWxpZGF0aW9uQVBJIiwic2V0R2VuZXJhdGVkUGFzc3dvcmQiLCJjaGFycyIsImkiLCJjaGFyQXQiLCJmbG9vciIsIkZvcm0iLCJjaGVja1ZhbHVlcyIsInR5cGUiLCJlbXB0eSIsImNvbnRlbnQiLCJwc3dfRGVmYXVsdFBhc3N3b3JkV2FybmluZyIsInBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmQiLCJwc3dfV2Vha1Bhc3N3b3JkIiwicHN3X1Bhc3N3b3JkVG9vQ29tbW9uIiwibWVzc2FnZXMiLCJwc3dfUGFzc3dvcmRSZXF1aXJlbWVudHMiLCJtYXAiLCJtc2ciLCJqb2luIiwicHN3X1VzZUdlbmVyYXRlQnV0dG9uIiwiaHRtbCIsImdldCIsInJlbW92ZSIsImRlc3Ryb3lBbGwiLCJmb3JFYWNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsY0FBYyxHQUFHO0FBRW5CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxTQUFTLEVBQUUsSUFBSUMsR0FBSixFQUxROztBQU9uQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFO0FBQ05DLElBQUFBLE9BQU8sRUFBRSxTQURIO0FBRU5DLElBQUFB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QUs3RyxTQUFMLFdBQXNCb0IsT0FBdEI7QUFDSCxHQXJka0I7O0FBdWRuQjtBQUNKO0FBQ0E7QUFDSTBGLEVBQUFBLFVBMWRtQix3QkEwZE47QUFBQTs7QUFDVCxTQUFLOUcsU0FBTCxDQUFlK0csT0FBZixDQUF1QixVQUFDbkYsUUFBRCxFQUFXUixPQUFYLEVBQXVCO0FBQzFDLE1BQUEsTUFBSSxDQUFDTyxPQUFMLENBQWFQLE9BQWI7QUFDSCxLQUZEO0FBR0g7QUE5ZGtCLENBQXZCLEMsQ0FpZUE7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFBhc3N3b3JkU2NvcmUsIFBhc3N3b3JkVmFsaWRhdGlvbkFQSSwgRm9ybSAqL1xuXG4vKipcbiAqIFVuaWZpZWQgUGFzc3dvcmQgV2lkZ2V0IE1vZHVsZVxuICogUHJvdmlkZXMgcGFzc3dvcmQgdmFsaWRhdGlvbiwgZ2VuZXJhdGlvbiwgYW5kIFVJIGZlZWRiYWNrIGZvciBhbnkgcGFzc3dvcmQgZmllbGRcbiAqIFxuICogVXNhZ2U6XG4gKiBQYXNzd29yZFdpZGdldC5pbml0KCcjbXlQYXNzd29yZEZpZWxkJywge1xuICogICAgIGNvbnRleHQ6ICdwcm92aWRlcicsICAgICAgIC8vIENvbnRleHQ6ICdwcm92aWRlcicsICdnZW5lcmFsJywgJ2V4dGVuc2lvbicsICdhbWknXG4gKiAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsICAgICAgLy8gQWRkIGdlbmVyYXRlIGJ1dHRvblxuICogICAgIHZhbGlkYXRlT25JbnB1dDogdHJ1ZSwgICAgIC8vIFJlYWwtdGltZSB2YWxpZGF0aW9uXG4gKiAgICAgdmFsaWRhdGVPbmx5R2VuZXJhdGVkOiBmYWxzZSwgLy8gVmFsaWRhdGUgb25seSBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gKiAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLCAgICAgLy8gU2hvdyBzdHJlbmd0aCBpbmRpY2F0b3JcbiAqICAgICBzaG93V2FybmluZ3M6IHRydWUsICAgICAgICAvLyBTaG93IHdhcm5pbmcgbWVzc2FnZXNcbiAqICAgICBjaGVja09uTG9hZDogdHJ1ZSAgICAgICAgICAvLyBDaGVjayBpbml0aWFsIHBhc3N3b3JkXG4gKiB9KTtcbiAqL1xuY29uc3QgUGFzc3dvcmRXaWRnZXQgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogQWN0aXZlIHdpZGdldCBpbnN0YW5jZXNcbiAgICAgKi9cbiAgICBpbnN0YW5jZXM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBkZWZhdWx0czoge1xuICAgICAgICBjb250ZXh0OiAnZ2VuZXJhbCcsXG4gICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgIHZhbGlkYXRlT25seUdlbmVyYXRlZDogZmFsc2UsXG4gICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICBjaGVja09uTG9hZDogdHJ1ZSxcbiAgICAgICAgbWluU2NvcmU6IDYwLFxuICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMTZcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0IGZvciBhIGZpZWxkXG4gICAgICogQHBhcmFtIHtzdHJpbmd8alF1ZXJ5fSBzZWxlY3RvciAtIEZpZWxkIHNlbGVjdG9yIG9yIGpRdWVyeSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIFdpZGdldCBvcHRpb25zXG4gICAgICogQHJldHVybnMge29iamVjdH0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgaW5pdChzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoc2VsZWN0b3IpO1xuICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdQYXNzd29yZFdpZGdldDogRmllbGQgbm90IGZvdW5kJywgc2VsZWN0b3IpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkSWQgPSAkZmllbGQuYXR0cignaWQnKSB8fCAkZmllbGQuYXR0cignbmFtZScpIHx8IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgaW5zdGFuY2UgaWYgYW55XG4gICAgICAgIGlmICh0aGlzLmluc3RhbmNlcy5oYXMoZmllbGRJZCkpIHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveShmaWVsZElkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIG5ldyBpbnN0YW5jZVxuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHtcbiAgICAgICAgICAgIGlkOiBmaWVsZElkLFxuICAgICAgICAgICAgJGZpZWxkOiAkZmllbGQsXG4gICAgICAgICAgICAkY29udGFpbmVyOiAkZmllbGQuY2xvc2VzdCgnLmZpZWxkJyksXG4gICAgICAgICAgICBvcHRpb25zOiB7IC4uLnRoaXMuZGVmYXVsdHMsIC4uLm9wdGlvbnMgfSxcbiAgICAgICAgICAgIGlzR2VuZXJhdGVkOiBmYWxzZSxcbiAgICAgICAgICAgIGVsZW1lbnRzOiB7fVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aWRnZXRcbiAgICAgICAgdGhpcy5zZXR1cFVJKGluc3RhbmNlKTtcbiAgICAgICAgdGhpcy5iaW5kRXZlbnRzKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGluaXRpYWwgcGFzc3dvcmQgaWYgbmVlZGVkXG4gICAgICAgIGlmIChpbnN0YW5jZS5vcHRpb25zLmNoZWNrT25Mb2FkKSB7XG4gICAgICAgICAgICB0aGlzLmNoZWNrUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5zZXQoZmllbGRJZCwgaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgVUkgZWxlbWVudHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBzZXR1cFVJKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCAkY29udGFpbmVyLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBnZW5lcmF0ZSBidXR0b24gaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLmdlbmVyYXRlQnV0dG9uKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEdlbmVyYXRlQnV0dG9uKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0cmVuZ3RoIGJhciBpZiBuZWVkZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1N0cmVuZ3RoQmFyKSB7XG4gICAgICAgICAgICB0aGlzLmFkZFN0cmVuZ3RoQmFyKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUHJlcGFyZSB3YXJuaW5nIGNvbnRhaW5lclxuICAgICAgICBpZiAob3B0aW9ucy5zaG93V2FybmluZ3MpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncyA9ICQoYDxkaXYgaWQ9XCIke2luc3RhbmNlLmlkfS13YXJuaW5nc1wiIGNsYXNzPVwidWkgc21hbGwgbWVzc2FnZSBwYXNzd29yZC13YXJuaW5nc1wiIHN0eWxlPVwiZGlzcGxheTpub25lO1wiPjwvZGl2PmApO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5hZnRlcihpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgZ2VuZXJhdGUgYnV0dG9uIHRvIGZpZWxkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYWRkR2VuZXJhdGVCdXR0b24oaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsICRjb250YWluZXIgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkaW5wdXRXcmFwcGVyID0gJGNvbnRhaW5lci5maW5kKCcudWkuaW5wdXQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZXJlJ3MgYWxyZWFkeSBhIGdlbmVyYXRlIGJ1dHRvbiAoY2xpcGJvYXJkIGJ1dHRvbiBvbiBwcm92aWRlcnMpXG4gICAgICAgIGxldCAkZ2VuZXJhdGVCdG4gPSAkaW5wdXRXcmFwcGVyLmZpbmQoJ2J1dHRvbi5jbGlwYm9hcmQsIGJ1dHRvbi5nZW5lcmF0ZS1wYXNzd29yZCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRnZW5lcmF0ZUJ0bi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIEFkZCBhY3Rpb24gY2xhc3MgdG8gaW5wdXQgd3JhcHBlclxuICAgICAgICAgICAgaWYgKCEkaW5wdXRXcmFwcGVyLmhhc0NsYXNzKCdhY3Rpb24nKSkge1xuICAgICAgICAgICAgICAgICRpbnB1dFdyYXBwZXIuYWRkQ2xhc3MoJ2FjdGlvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgZ2VuZXJhdGUgYnV0dG9uXG4gICAgICAgICAgICAkZ2VuZXJhdGVCdG4gPSAkKGBcbiAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgaWNvbiBidXR0b24gZ2VuZXJhdGUtcGFzc3dvcmRcIiB0eXBlPVwiYnV0dG9uXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19HZW5lcmF0ZVBhc3N3b3JkIHx8ICdHZW5lcmF0ZSBwYXNzd29yZCd9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic3luYyBhbHRlcm5hdGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgJGlucHV0V3JhcHBlci5hcHBlbmQoJGdlbmVyYXRlQnRuKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuID0gJGdlbmVyYXRlQnRuO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIHN0cmVuZ3RoIGJhciB0byBmaWVsZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZFN0cmVuZ3RoQmFyKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGNvbnRhaW5lciB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICBsZXQgJHNjb3JlU2VjdGlvbiA9ICRjb250YWluZXIuZmluZCgnLnBhc3N3b3JkLXNjb3JlLXNlY3Rpb24nKTtcbiAgICAgICAgaWYgKCRzY29yZVNlY3Rpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkc2NvcmVTZWN0aW9uID0gJChgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInBhc3N3b3JkLXNjb3JlLXNlY3Rpb25cIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBwcm9ncmVzcyBwYXNzd29yZC1zY29yZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJHNjb3JlU2VjdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRwcm9ncmVzc0JhciA9ICRzY29yZVNlY3Rpb24uZmluZCgnLnBhc3N3b3JkLXNjb3JlJyk7XG4gICAgICAgICRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG4gICAgICAgICAgICBwZXJjZW50OiAwLFxuICAgICAgICAgICAgc2hvd0FjdGl2aXR5OiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzY29yZVNlY3Rpb24gPSAkc2NvcmVTZWN0aW9uO1xuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NCYXIgPSAkcHJvZ3Jlc3NCYXI7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCaW5kIGV2ZW50IGhhbmRsZXJzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgYmluZEV2ZW50cyhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBHZW5lcmF0ZSBidXR0b24gY2xpY2tcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignY2xpY2sucGFzc3dvcmRXaWRnZXQnKS5vbignY2xpY2sucGFzc3dvcmRXaWRnZXQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlYWwtdGltZSB2YWxpZGF0aW9uIG9uIGlucHV0XG4gICAgICAgIGlmIChvcHRpb25zLnZhbGlkYXRlT25JbnB1dCkge1xuICAgICAgICAgICAgJGZpZWxkLm9mZignaW5wdXQucGFzc3dvcmRXaWRnZXQnKS5vbignaW5wdXQucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVJbnB1dChpbnN0YW5jZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgd2FybmluZ3Mgb24gZW1wdHlcbiAgICAgICAgJGZpZWxkLm9mZignY2hhbmdlLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2NoYW5nZS5wYXNzd29yZFdpZGdldCcsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJ3h4eHh4eHgnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kc2NvcmVTZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzY29yZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcGFzc3dvcmQgaW5wdXRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBoYW5kbGVJbnB1dChpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0IHBhc3N3b3JkID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgc2hvdWxkIHZhbGlkYXRlXG4gICAgICAgIGlmICghdGhpcy5zaG91bGRWYWxpZGF0ZShpbnN0YW5jZSwgcGFzc3dvcmQpKSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVXYXJuaW5ncyhpbnN0YW5jZSk7XG4gICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNjb3JlU2VjdGlvbikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzY29yZVNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHN0cmVuZ3RoIGJhclxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNjb3JlU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNjb3JlU2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIHBhc3N3b3JkXG4gICAgICAgIHRoaXMudmFsaWRhdGVQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgcGFzc3dvcmQgc2hvdWxkIGJlIHZhbGlkYXRlZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCAtIFBhc3N3b3JkIHZhbHVlXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgc2hvdWxkVmFsaWRhdGUoaW5zdGFuY2UsIHBhc3N3b3JkKSB7XG4gICAgICAgIGlmICghcGFzc3dvcmQgfHwgcGFzc3dvcmQgPT09ICd4eHh4eHh4Jykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQWx3YXlzIHZhbGlkYXRlIGdlbmVyYXRlZCBwYXNzd29yZHNcbiAgICAgICAgaWYgKGluc3RhbmNlLmlzR2VuZXJhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgY29udGV4dC1zcGVjaWZpYyBydWxlc1xuICAgICAgICBpZiAob3B0aW9ucy5jb250ZXh0ID09PSAncHJvdmlkZXInKSB7XG4gICAgICAgICAgICBjb25zdCByZWdpc3RyYXRpb25UeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgICAgICBpZiAocmVnaXN0cmF0aW9uVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gIW9wdGlvbnMudmFsaWRhdGVPbmx5R2VuZXJhdGVkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gIW9wdGlvbnMudmFsaWRhdGVPbmx5R2VuZXJhdGVkO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgcGFzc3dvcmRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB0byB2YWxpZGF0ZVxuICAgICAqL1xuICAgIHZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKSB7XG4gICAgICAgIGNvbnN0IHsgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgUGFzc3dvcmRTY29yZSBmb3IgdmFsaWRhdGlvblxuICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgIHBhc3M6IHBhc3N3b3JkLFxuICAgICAgICAgICAgYmFyOiBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NCYXIsXG4gICAgICAgICAgICBzZWN0aW9uOiBpbnN0YW5jZS5lbGVtZW50cy4kc2NvcmVTZWN0aW9uLFxuICAgICAgICAgICAgZmllbGQ6IGAke29wdGlvbnMuY29udGV4dH1fJHtpbnN0YW5jZS5pZH1gLFxuICAgICAgICAgICAgY2FsbGJhY2s6IChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVZhbGlkYXRpb25SZXN1bHQoaW5zdGFuY2UsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHZhbGlkYXRpb24gcmVzdWx0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCAtIFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICovXG4gICAgaGFuZGxlVmFsaWRhdGlvblJlc3VsdChpbnN0YW5jZSwgcmVzdWx0KSB7XG4gICAgICAgIGlmICghcmVzdWx0KSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCB7ICRjb250YWluZXIsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkY29udGFpbmVyO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGZpZWxkIHN0YXRlXG4gICAgICAgICRmaWVsZC5yZW1vdmVDbGFzcygnZXJyb3Igd2FybmluZyBzdWNjZXNzJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzdWx0LmlzRGVmYXVsdCB8fCByZXN1bHQuaXNTaW1wbGUgfHwgcmVzdWx0LmlzSW5EaWN0aW9uYXJ5KSB7XG4gICAgICAgICAgICAkZmllbGQuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5zaG93V2FybmluZ3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dXYXJuaW5ncyhpbnN0YW5jZSwgcmVzdWx0LCAnZXJyb3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghcmVzdWx0LmlzVmFsaWQgfHwgcmVzdWx0LnNjb3JlIDwgb3B0aW9ucy5taW5TY29yZSkge1xuICAgICAgICAgICAgJGZpZWxkLmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5zaG93V2FybmluZ3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dXYXJuaW5ncyhpbnN0YW5jZSwgcmVzdWx0LCAnd2FybmluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdC5zY29yZSA+PSA4MCkge1xuICAgICAgICAgICAgJGZpZWxkLmFkZENsYXNzKCdzdWNjZXNzJyk7XG4gICAgICAgICAgICB0aGlzLmhpZGVXYXJuaW5ncyhpbnN0YW5jZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVXYXJuaW5ncyhpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIHBhc3N3b3JkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgZ2VuZXJhdGVQYXNzd29yZChpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIGNvbnN0ICRidG4gPSBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG47XG4gICAgICAgIFxuICAgICAgICBpZiAoJGJ0bikge1xuICAgICAgICAgICAgJGJ0bi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgQVBJIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIFBhc3N3b3JkVmFsaWRhdGlvbkFQSSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIFBhc3N3b3JkVmFsaWRhdGlvbkFQSS5nZW5lcmF0ZVBhc3N3b3JkKG9wdGlvbnMuZ2VuZXJhdGVMZW5ndGgsIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoJGJ0bikgJGJ0bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0R2VuZXJhdGVkUGFzc3dvcmQoaW5zdGFuY2UsIHJlc3VsdC5wYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayBnZW5lcmF0aW9uXG4gICAgICAgICAgICBjb25zdCBjaGFycyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSFAIyQlXiYqJztcbiAgICAgICAgICAgIGxldCBwYXNzd29yZCA9ICcnO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvcHRpb25zLmdlbmVyYXRlTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwYXNzd29yZCArPSBjaGFycy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkYnRuKSAkYnRuLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICB0aGlzLnNldEdlbmVyYXRlZFBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCBnZW5lcmF0ZWQgcGFzc3dvcmRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBHZW5lcmF0ZWQgcGFzc3dvcmRcbiAgICAgKi9cbiAgICBzZXRHZW5lcmF0ZWRQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsICRjb250YWluZXIgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHBhc3N3b3JkXG4gICAgICAgICRmaWVsZC52YWwocGFzc3dvcmQpO1xuICAgICAgICBpbnN0YW5jZS5pc0dlbmVyYXRlZCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBIaWRlIHdhcm5pbmdzXG4gICAgICAgIHRoaXMuaGlkZVdhcm5pbmdzKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgc3VjY2VzcyBzdGF0ZVxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNjb3JlU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNjb3JlU2VjdGlvbi5zaG93KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NCYXIpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRwcm9ncmVzc0JhclxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncmVkIG9yYW5nZSB5ZWxsb3cgb2xpdmUnKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZ3JlZW4nKVxuICAgICAgICAgICAgICAgIC5wcm9ncmVzcygnc2V0IHBlcmNlbnQnLCAxMDApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkY29udGFpbmVyLnJlbW92ZUNsYXNzKCdlcnJvciB3YXJuaW5nJykuYWRkQ2xhc3MoJ3N1Y2Nlc3MnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHdhcm5pbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCAtIFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBXYXJuaW5nIHR5cGVcbiAgICAgKi9cbiAgICBzaG93V2FybmluZ3MoaW5zdGFuY2UsIHJlc3VsdCwgdHlwZSA9ICd3YXJuaW5nJykge1xuICAgICAgICBpZiAoIWluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncykgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJHdhcm5pbmdzID0gaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzO1xuICAgICAgICAkd2FybmluZ3MuZW1wdHkoKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCduZWdhdGl2ZSB3YXJuaW5nIGluZm8gcG9zaXRpdmUgZXJyb3Igc3VjY2VzcycpXG4gICAgICAgICAgICAuYWRkQ2xhc3ModHlwZSA9PT0gJ2Vycm9yJyA/ICduZWdhdGl2ZScgOiB0eXBlKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBjb250ZW50ID0gJyc7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzdWx0LmlzRGVmYXVsdCkge1xuICAgICAgICAgICAgY29udGVudCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucHN3X0RlZmF1bHRQYXNzd29yZFdhcm5pbmcgfHwgJ0RlZmF1bHQgUGFzc3dvcmQgRGV0ZWN0ZWQnfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLnBzd19DaGFuZ2VEZWZhdWx0UGFzc3dvcmQgfHwgJ1BsZWFzZSBjaGFuZ2UgdGhlIGRlZmF1bHQgcGFzc3dvcmQgZm9yIHNlY3VyaXR5Lid9PC9wPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQuaXNTaW1wbGUgfHwgcmVzdWx0LmlzSW5EaWN0aW9uYXJ5KSB7XG4gICAgICAgICAgICBjb250ZW50ID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wc3dfV2Vha1Bhc3N3b3JkIHx8ICdXZWFrIFBhc3N3b3JkJ31cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5wc3dfUGFzc3dvcmRUb29Db21tb24gfHwgJ1RoaXMgcGFzc3dvcmQgaXMgdG9vIGNvbW1vbiBhbmQgZWFzaWx5IGd1ZXNzYWJsZS4nfTwvcD5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb250ZW50ID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wc3dfUGFzc3dvcmRSZXF1aXJlbWVudHMgfHwgJ1Bhc3N3b3JkIFJlcXVpcmVtZW50cyd9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPHVsIGNsYXNzPVwibGlzdFwiPlxuICAgICAgICAgICAgICAgICAgICAke3Jlc3VsdC5tZXNzYWdlcy5tYXAobXNnID0+IGA8bGk+JHttc2d9PC9saT5gKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGdlbmVyYXRlIGJ1dHRvbiBzdWdnZXN0aW9uIGZvciB3ZWFrIHBhc3N3b3Jkc1xuICAgICAgICBpZiAoKHJlc3VsdC5zY29yZSA8IDYwIHx8ICFyZXN1bHQuaXNWYWxpZCkgJiYgdHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgY29udGVudCArPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpZGVhIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnBzd19Vc2VHZW5lcmF0ZUJ1dHRvbiB8fCAnVXNlIHRoZSBnZW5lcmF0ZSBidXR0b24gdG8gY3JlYXRlIGEgc3Ryb25nIHBhc3N3b3JkLid9XG4gICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICR3YXJuaW5ncy5odG1sKGNvbnRlbnQpLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICR3YXJuaW5ncy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgd2FybmluZ3NcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBoaWRlV2FybmluZ3MoaW5zdGFuY2UpIHtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncykge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YW5jZS4kY29udGFpbmVyLnJlbW92ZUNsYXNzKCdlcnJvciB3YXJuaW5nIHN1Y2Nlc3MnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIGluaXRpYWwgcGFzc3dvcmRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjaGVja1Bhc3N3b3JkKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHBhc3N3b3JkID0gaW5zdGFuY2UuJGZpZWxkLnZhbCgpO1xuICAgICAgICBpZiAodGhpcy5zaG91bGRWYWxpZGF0ZShpbnN0YW5jZSwgcGFzc3dvcmQpKSB7XG4gICAgICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSB3aWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICovXG4gICAgZGVzdHJveShmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBVbmJpbmQgZXZlbnRzXG4gICAgICAgIGluc3RhbmNlLiRmaWVsZC5vZmYoJy5wYXNzd29yZFdpZGdldCcpO1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4ub2ZmKCcucGFzc3dvcmRXaWRnZXQnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGVsZW1lbnRzXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncy5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNjb3JlU2VjdGlvbikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHNjb3JlU2VjdGlvbi5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGluc3RhbmNlXG4gICAgICAgIHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShmaWVsZElkKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgYWxsIHdpZGdldCBpbnN0YW5jZXNcbiAgICAgKi9cbiAgICBkZXN0cm95QWxsKCkge1xuICAgICAgICB0aGlzLmluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSwgZmllbGRJZCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5kZXN0cm95KGZpZWxkSWQpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG4vLyBleHBvcnQgZGVmYXVsdCBQYXNzd29yZFdpZGdldDsiXX0=