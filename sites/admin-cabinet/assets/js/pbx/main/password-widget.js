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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3Bhc3N3b3JkLXdpZGdldC5qcyJdLCJuYW1lcyI6WyJQYXNzd29yZFdpZGdldCIsImluc3RhbmNlcyIsIk1hcCIsImRlZmF1bHRzIiwiY29udGV4dCIsImdlbmVyYXRlQnV0dG9uIiwidmFsaWRhdGVPbklucHV0IiwidmFsaWRhdGVPbmx5R2VuZXJhdGVkIiwic2hvd1N0cmVuZ3RoQmFyIiwic2hvd1dhcm5pbmdzIiwiY2hlY2tPbkxvYWQiLCJtaW5TY29yZSIsImdlbmVyYXRlTGVuZ3RoIiwiaW5pdCIsInNlbGVjdG9yIiwib3B0aW9ucyIsIiRmaWVsZCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsImZpZWxkSWQiLCJhdHRyIiwiTWF0aCIsInJhbmRvbSIsInRvU3RyaW5nIiwic3Vic3RyIiwiaGFzIiwiZGVzdHJveSIsImluc3RhbmNlIiwiaWQiLCIkY29udGFpbmVyIiwiY2xvc2VzdCIsImlzR2VuZXJhdGVkIiwiZWxlbWVudHMiLCJzZXR1cFVJIiwiYmluZEV2ZW50cyIsImNoZWNrUGFzc3dvcmQiLCJzZXQiLCJhZGRHZW5lcmF0ZUJ1dHRvbiIsImFkZFN0cmVuZ3RoQmFyIiwiJHdhcm5pbmdzIiwiYWZ0ZXIiLCIkaW5wdXRXcmFwcGVyIiwiZmluZCIsIiRnZW5lcmF0ZUJ0biIsImhhc0NsYXNzIiwiYWRkQ2xhc3MiLCJnbG9iYWxUcmFuc2xhdGUiLCJwc3dfR2VuZXJhdGVQYXNzd29yZCIsImFwcGVuZCIsIiRzY29yZVNlY3Rpb24iLCIkcHJvZ3Jlc3NCYXIiLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJzaG93QWN0aXZpdHkiLCJvZmYiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImdlbmVyYXRlUGFzc3dvcmQiLCJoYW5kbGVJbnB1dCIsInZhbHVlIiwidmFsIiwiaGlkZVdhcm5pbmdzIiwiaGlkZSIsInBhc3N3b3JkIiwic2hvdWxkVmFsaWRhdGUiLCJzaG93IiwidmFsaWRhdGVQYXNzd29yZCIsInJlZ2lzdHJhdGlvblR5cGUiLCJQYXNzd29yZFNjb3JlIiwiY2hlY2tQYXNzU3RyZW5ndGgiLCJwYXNzIiwiYmFyIiwic2VjdGlvbiIsImZpZWxkIiwiY2FsbGJhY2siLCJyZXN1bHQiLCJoYW5kbGVWYWxpZGF0aW9uUmVzdWx0IiwicmVtb3ZlQ2xhc3MiLCJpc0RlZmF1bHQiLCJpc1NpbXBsZSIsImlzSW5EaWN0aW9uYXJ5IiwiaXNWYWxpZCIsInNjb3JlIiwiJGJ0biIsIlBhc3N3b3JkVmFsaWRhdGlvbkFQSSIsInNldEdlbmVyYXRlZFBhc3N3b3JkIiwiY2hhcnMiLCJpIiwiY2hhckF0IiwiZmxvb3IiLCJGb3JtIiwiY2hlY2tWYWx1ZXMiLCJ0eXBlIiwiZW1wdHkiLCJjb250ZW50IiwicHN3X0RlZmF1bHRQYXNzd29yZFdhcm5pbmciLCJwc3dfQ2hhbmdlRGVmYXVsdFBhc3N3b3JkIiwicHN3X1dlYWtQYXNzd29yZCIsInBzd19QYXNzd29yZFRvb0NvbW1vbiIsIm1lc3NhZ2VzIiwicHN3X1Bhc3N3b3JkUmVxdWlyZW1lbnRzIiwibWFwIiwibXNnIiwiam9pbiIsInBzd19Vc2VHZW5lcmF0ZUJ1dHRvbiIsImh0bWwiLCJnZXQiLCJyZW1vdmUiLCJkZXN0cm95QWxsIiwiZm9yRWFjaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGNBQWMsR0FBRztBQUVuQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBQUlDLEdBQUosRUFMUTs7QUFPbkI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRTtBQUNOQyxJQUFBQSxPQUFPLEVBQUUsU0FESDtBQUVOQyxJQUFBQSxjQUFjLEVB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TCxXQUFzQm9CLE9BQXRCO0FBQ0gsR0FyZGtCOztBQXVkbkI7QUFDSjtBQUNBO0FBQ0kwRixFQUFBQSxVQTFkbUIsd0JBMGROO0FBQUE7O0FBQ1QsU0FBSzlHLFNBQUwsQ0FBZStHLE9BQWYsQ0FBdUIsVUFBQ25GLFFBQUQsRUFBV1IsT0FBWCxFQUF1QjtBQUMxQyxNQUFBLE1BQUksQ0FBQ08sT0FBTCxDQUFhUCxPQUFiO0FBQ0gsS0FGRDtBQUdIO0FBOWRrQixDQUF2QixDLENBaWVBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYXNzd29yZFNjb3JlLCBQYXNzd29yZFZhbGlkYXRpb25BUEksIEZvcm0gKi9cblxuLyoqXG4gKiBVbmlmaWVkIFBhc3N3b3JkIFdpZGdldCBNb2R1bGVcbiAqIFByb3ZpZGVzIHBhc3N3b3JkIHZhbGlkYXRpb24sIGdlbmVyYXRpb24sIGFuZCBVSSBmZWVkYmFjayBmb3IgYW55IHBhc3N3b3JkIGZpZWxkXG4gKiBcbiAqIFVzYWdlOlxuICogUGFzc3dvcmRXaWRnZXQuaW5pdCgnI215UGFzc3dvcmRGaWVsZCcsIHtcbiAqICAgICBjb250ZXh0OiAncHJvdmlkZXInLCAgICAgICAvLyBDb250ZXh0OiAncHJvdmlkZXInLCAnZ2VuZXJhbCcsICdleHRlbnNpb24nLCAnYW1pJ1xuICogICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLCAgICAgIC8vIEFkZCBnZW5lcmF0ZSBidXR0b25cbiAqICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsICAgICAvLyBSZWFsLXRpbWUgdmFsaWRhdGlvblxuICogICAgIHZhbGlkYXRlT25seUdlbmVyYXRlZDogZmFsc2UsIC8vIFZhbGlkYXRlIG9ubHkgZ2VuZXJhdGVkIHBhc3N3b3Jkc1xuICogICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSwgICAgIC8vIFNob3cgc3RyZW5ndGggaW5kaWNhdG9yXG4gKiAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLCAgICAgICAgLy8gU2hvdyB3YXJuaW5nIG1lc3NhZ2VzXG4gKiAgICAgY2hlY2tPbkxvYWQ6IHRydWUgICAgICAgICAgLy8gQ2hlY2sgaW5pdGlhbCBwYXNzd29yZFxuICogfSk7XG4gKi9cbmNvbnN0IFBhc3N3b3JkV2lkZ2V0ID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEFjdGl2ZSB3aWRnZXQgaW5zdGFuY2VzXG4gICAgICovXG4gICAgaW5zdGFuY2VzOiBuZXcgTWFwKCksXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgY29udGV4dDogJ2dlbmVyYWwnLFxuICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICB2YWxpZGF0ZU9ubHlHZW5lcmF0ZWQ6IGZhbHNlLFxuICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWUsXG4gICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDE2XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldCBmb3IgYSBmaWVsZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGpRdWVyeX0gc2VsZWN0b3IgLSBGaWVsZCBzZWxlY3RvciBvciBqUXVlcnkgb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBXaWRnZXQgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXQoc2VsZWN0b3IsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCAkZmllbGQgPSAkKHNlbGVjdG9yKTtcbiAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignUGFzc3dvcmRXaWRnZXQ6IEZpZWxkIG5vdCBmb3VuZCcsIHNlbGVjdG9yKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZElkID0gJGZpZWxkLmF0dHIoJ2lkJykgfHwgJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIGluc3RhbmNlIGlmIGFueVxuICAgICAgICBpZiAodGhpcy5pbnN0YW5jZXMuaGFzKGZpZWxkSWQpKSB7XG4gICAgICAgICAgICB0aGlzLmRlc3Ryb3koZmllbGRJZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBuZXcgaW5zdGFuY2VcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB7XG4gICAgICAgICAgICBpZDogZmllbGRJZCxcbiAgICAgICAgICAgICRmaWVsZDogJGZpZWxkLFxuICAgICAgICAgICAgJGNvbnRhaW5lcjogJGZpZWxkLmNsb3Nlc3QoJy5maWVsZCcpLFxuICAgICAgICAgICAgb3B0aW9uczogeyAuLi50aGlzLmRlZmF1bHRzLCAuLi5vcHRpb25zIH0sXG4gICAgICAgICAgICBpc0dlbmVyYXRlZDogZmFsc2UsXG4gICAgICAgICAgICBlbGVtZW50czoge31cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2lkZ2V0XG4gICAgICAgIHRoaXMuc2V0dXBVSShpbnN0YW5jZSk7XG4gICAgICAgIHRoaXMuYmluZEV2ZW50cyhpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpbml0aWFsIHBhc3N3b3JkIGlmIG5lZWRlZFxuICAgICAgICBpZiAoaW5zdGFuY2Uub3B0aW9ucy5jaGVja09uTG9hZCkge1xuICAgICAgICAgICAgdGhpcy5jaGVja1Bhc3N3b3JkKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuc2V0KGZpZWxkSWQsIGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIFVJIGVsZW1lbnRzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgc2V0dXBVSShpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRmaWVsZCwgJGNvbnRhaW5lciwgb3B0aW9ucyB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZ2VuZXJhdGUgYnV0dG9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAob3B0aW9ucy5nZW5lcmF0ZUJ1dHRvbikge1xuICAgICAgICAgICAgdGhpcy5hZGRHZW5lcmF0ZUJ1dHRvbihpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzdHJlbmd0aCBiYXIgaWYgbmVlZGVkXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dTdHJlbmd0aEJhcikge1xuICAgICAgICAgICAgdGhpcy5hZGRTdHJlbmd0aEJhcihpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFByZXBhcmUgd2FybmluZyBjb250YWluZXJcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1dhcm5pbmdzKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MgPSAkKGA8ZGl2IGlkPVwiJHtpbnN0YW5jZS5pZH0td2FybmluZ3NcIiBjbGFzcz1cInVpIHNtYWxsIG1lc3NhZ2UgcGFzc3dvcmQtd2FybmluZ3NcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIj48L2Rpdj5gKTtcbiAgICAgICAgICAgICRjb250YWluZXIuYWZ0ZXIoaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIGdlbmVyYXRlIGJ1dHRvbiB0byBmaWVsZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGFkZEdlbmVyYXRlQnV0dG9uKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCAkY29udGFpbmVyIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGlucHV0V3JhcHBlciA9ICRjb250YWluZXIuZmluZCgnLnVpLmlucHV0Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSdzIGFscmVhZHkgYSBnZW5lcmF0ZSBidXR0b24gKGNsaXBib2FyZCBidXR0b24gb24gcHJvdmlkZXJzKVxuICAgICAgICBsZXQgJGdlbmVyYXRlQnRuID0gJGlucHV0V3JhcHBlci5maW5kKCdidXR0b24uY2xpcGJvYXJkLCBidXR0b24uZ2VuZXJhdGUtcGFzc3dvcmQnKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkZ2VuZXJhdGVCdG4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBBZGQgYWN0aW9uIGNsYXNzIHRvIGlucHV0IHdyYXBwZXJcbiAgICAgICAgICAgIGlmICghJGlucHV0V3JhcHBlci5oYXNDbGFzcygnYWN0aW9uJykpIHtcbiAgICAgICAgICAgICAgICAkaW5wdXRXcmFwcGVyLmFkZENsYXNzKCdhY3Rpb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIGdlbmVyYXRlIGJ1dHRvblxuICAgICAgICAgICAgJGdlbmVyYXRlQnRuID0gJChgXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGljb24gYnV0dG9uIGdlbmVyYXRlLXBhc3N3b3JkXCIgdHlwZT1cImJ1dHRvblwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCIke2dsb2JhbFRyYW5zbGF0ZS5wc3dfR2VuZXJhdGVQYXNzd29yZCB8fCAnR2VuZXJhdGUgcGFzc3dvcmQnfVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgYWx0ZXJuYXRlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICRpbnB1dFdyYXBwZXIuYXBwZW5kKCRnZW5lcmF0ZUJ0bik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0biA9ICRnZW5lcmF0ZUJ0bjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBzdHJlbmd0aCBiYXIgdG8gZmllbGRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBhZGRTdHJlbmd0aEJhcihpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7ICRjb250YWluZXIgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgbGV0ICRzY29yZVNlY3Rpb24gPSAkY29udGFpbmVyLmZpbmQoJy5wYXNzd29yZC1zY29yZS1zZWN0aW9uJyk7XG4gICAgICAgIGlmICgkc2NvcmVTZWN0aW9uLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJHNjb3JlU2VjdGlvbiA9ICQoYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwYXNzd29yZC1zY29yZS1zZWN0aW9uXCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgcHJvZ3Jlc3MgcGFzc3dvcmQtc2NvcmVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYXJcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKCRzY29yZVNlY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkcHJvZ3Jlc3NCYXIgPSAkc2NvcmVTZWN0aW9uLmZpbmQoJy5wYXNzd29yZC1zY29yZScpO1xuICAgICAgICAkcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgcGVyY2VudDogMCxcbiAgICAgICAgICAgIHNob3dBY3Rpdml0eTogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2NvcmVTZWN0aW9uID0gJHNjb3JlU2VjdGlvbjtcbiAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyID0gJHByb2dyZXNzQmFyO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQmluZCBldmVudCBoYW5kbGVyc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGJpbmRFdmVudHMoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gR2VuZXJhdGUgYnV0dG9uIGNsaWNrXG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kZ2VuZXJhdGVCdG4pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bi5vZmYoJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0Jykub24oJ2NsaWNrLnBhc3N3b3JkV2lkZ2V0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVBhc3N3b3JkKGluc3RhbmNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZWFsLXRpbWUgdmFsaWRhdGlvbiBvbiBpbnB1dFxuICAgICAgICBpZiAob3B0aW9ucy52YWxpZGF0ZU9uSW5wdXQpIHtcbiAgICAgICAgICAgICRmaWVsZC5vZmYoJ2lucHV0LnBhc3N3b3JkV2lkZ2V0Jykub24oJ2lucHV0LnBhc3N3b3JkV2lkZ2V0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlSW5wdXQoaW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIHdhcm5pbmdzIG9uIGVtcHR5XG4gICAgICAgICRmaWVsZC5vZmYoJ2NoYW5nZS5wYXNzd29yZFdpZGdldCcpLm9uKCdjaGFuZ2UucGFzc3dvcmRXaWRnZXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICd4eHh4eHh4Jykge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZVdhcm5pbmdzKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHNjb3JlU2VjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2NvcmVTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHBhc3N3b3JkIGlucHV0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgaGFuZGxlSW5wdXQoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCBwYXNzd29yZCA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHNob3VsZCB2YWxpZGF0ZVxuICAgICAgICBpZiAoIXRoaXMuc2hvdWxkVmFsaWRhdGUoaW5zdGFuY2UsIHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRzY29yZVNlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kc2NvcmVTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBzdHJlbmd0aCBiYXJcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRzY29yZVNlY3Rpb24pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzY29yZVNlY3Rpb24uc2hvdygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGF0ZSBwYXNzd29yZFxuICAgICAgICB0aGlzLnZhbGlkYXRlUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHBhc3N3b3JkIHNob3VsZCBiZSB2YWxpZGF0ZWRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBXaWRnZXQgaW5zdGFuY2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFzc3dvcmQgLSBQYXNzd29yZCB2YWx1ZVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIHNob3VsZFZhbGlkYXRlKGluc3RhbmNlLCBwYXNzd29yZCkge1xuICAgICAgICBpZiAoIXBhc3N3b3JkIHx8IHBhc3N3b3JkID09PSAneHh4eHh4eCcpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgeyBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFsd2F5cyB2YWxpZGF0ZSBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIGlmIChpbnN0YW5jZS5pc0dlbmVyYXRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGNvbnRleHQtc3BlY2lmaWMgcnVsZXNcbiAgICAgICAgaWYgKG9wdGlvbnMuY29udGV4dCA9PT0gJ3Byb3ZpZGVyJykge1xuICAgICAgICAgICAgY29uc3QgcmVnaXN0cmF0aW9uVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKHJlZ2lzdHJhdGlvblR5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICFvcHRpb25zLnZhbGlkYXRlT25seUdlbmVyYXRlZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuICFvcHRpb25zLnZhbGlkYXRlT25seUdlbmVyYXRlZDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRlIHBhc3N3b3JkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3N3b3JkIC0gUGFzc3dvcmQgdG8gdmFsaWRhdGVcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCkge1xuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIFBhc3N3b3JkU2NvcmUgZm9yIHZhbGlkYXRpb25cbiAgICAgICAgUGFzc3dvcmRTY29yZS5jaGVja1Bhc3NTdHJlbmd0aCh7XG4gICAgICAgICAgICBwYXNzOiBwYXNzd29yZCxcbiAgICAgICAgICAgIGJhcjogaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyLFxuICAgICAgICAgICAgc2VjdGlvbjogaW5zdGFuY2UuZWxlbWVudHMuJHNjb3JlU2VjdGlvbixcbiAgICAgICAgICAgIGZpZWxkOiBgJHtvcHRpb25zLmNvbnRleHR9XyR7aW5zdGFuY2UuaWR9YCxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVWYWxpZGF0aW9uUmVzdWx0KGluc3RhbmNlLCByZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSB2YWxpZGF0aW9uIHJlc3VsdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXN1bHQgLSBWYWxpZGF0aW9uIHJlc3VsdFxuICAgICAqL1xuICAgIGhhbmRsZVZhbGlkYXRpb25SZXN1bHQoaW5zdGFuY2UsIHJlc3VsdCkge1xuICAgICAgICBpZiAoIXJlc3VsdCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgeyAkY29udGFpbmVyLCBvcHRpb25zIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJGNvbnRhaW5lcjtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBmaWVsZCBzdGF0ZVxuICAgICAgICAkZmllbGQucmVtb3ZlQ2xhc3MoJ2Vycm9yIHdhcm5pbmcgc3VjY2VzcycpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlc3VsdC5pc0RlZmF1bHQgfHwgcmVzdWx0LmlzU2ltcGxlIHx8IHJlc3VsdC5pc0luRGljdGlvbmFyeSkge1xuICAgICAgICAgICAgJGZpZWxkLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1dhcm5pbmdzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93V2FybmluZ3MoaW5zdGFuY2UsIHJlc3VsdCwgJ2Vycm9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIXJlc3VsdC5pc1ZhbGlkIHx8IHJlc3VsdC5zY29yZSA8IG9wdGlvbnMubWluU2NvcmUpIHtcbiAgICAgICAgICAgICRmaWVsZC5hZGRDbGFzcygnd2FybmluZycpO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1dhcm5pbmdzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93V2FybmluZ3MoaW5zdGFuY2UsIHJlc3VsdCwgJ3dhcm5pbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQuc2NvcmUgPj0gODApIHtcbiAgICAgICAgICAgICRmaWVsZC5hZGRDbGFzcygnc3VjY2VzcycpO1xuICAgICAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBwYXNzd29yZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqL1xuICAgIGdlbmVyYXRlUGFzc3dvcmQoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyAkZmllbGQsIG9wdGlvbnMgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCAkYnRuID0gaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRidG4pIHtcbiAgICAgICAgICAgICRidG4uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlIEFQSSBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBQYXNzd29yZFZhbGlkYXRpb25BUEkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBQYXNzd29yZFZhbGlkYXRpb25BUEkuZ2VuZXJhdGVQYXNzd29yZChvcHRpb25zLmdlbmVyYXRlTGVuZ3RoLCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCRidG4pICRidG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5wYXNzd29yZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEdlbmVyYXRlZFBhc3N3b3JkKGluc3RhbmNlLCByZXN1bHQucGFzc3dvcmQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgZ2VuZXJhdGlvblxuICAgICAgICAgICAgY29uc3QgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkhQCMkJV4mKic7XG4gICAgICAgICAgICBsZXQgcGFzc3dvcmQgPSAnJztcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3B0aW9ucy5nZW5lcmF0ZUxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGFzc3dvcmQgKz0gY2hhcnMuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzLmxlbmd0aCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJGJ0bikgJGJ0bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgdGhpcy5zZXRHZW5lcmF0ZWRQYXNzd29yZChpbnN0YW5jZSwgcGFzc3dvcmQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgZ2VuZXJhdGVkIHBhc3N3b3JkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhc3N3b3JkIC0gR2VuZXJhdGVkIHBhc3N3b3JkXG4gICAgICovXG4gICAgc2V0R2VuZXJhdGVkUGFzc3dvcmQoaW5zdGFuY2UsIHBhc3N3b3JkKSB7XG4gICAgICAgIGNvbnN0IHsgJGZpZWxkLCAkY29udGFpbmVyIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBwYXNzd29yZFxuICAgICAgICAkZmllbGQudmFsKHBhc3N3b3JkKTtcbiAgICAgICAgaW5zdGFuY2UuaXNHZW5lcmF0ZWQgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlkZSB3YXJuaW5nc1xuICAgICAgICB0aGlzLmhpZGVXYXJuaW5ncyhpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHN1Y2Nlc3Mgc3RhdGVcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRzY29yZVNlY3Rpb24pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzY29yZVNlY3Rpb24uc2hvdygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHByb2dyZXNzQmFyKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kcHJvZ3Jlc3NCYXJcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JlZCBvcmFuZ2UgeWVsbG93IG9saXZlJylcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2dyZWVuJylcbiAgICAgICAgICAgICAgICAucHJvZ3Jlc3MoJ3NldCBwZXJjZW50JywgMTAwKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJGNvbnRhaW5lci5yZW1vdmVDbGFzcygnZXJyb3Igd2FybmluZycpLmFkZENsYXNzKCdzdWNjZXNzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uY2hlY2tWYWx1ZXMpIHtcbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyB3YXJuaW5nc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFdpZGdldCBpbnN0YW5jZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXN1bHQgLSBWYWxpZGF0aW9uIHJlc3VsdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gV2FybmluZyB0eXBlXG4gICAgICovXG4gICAgc2hvd1dhcm5pbmdzKGluc3RhbmNlLCByZXN1bHQsIHR5cGUgPSAnd2FybmluZycpIHtcbiAgICAgICAgaWYgKCFpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICR3YXJuaW5ncyA9IGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncztcbiAgICAgICAgJHdhcm5pbmdzLmVtcHR5KClcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbmVnYXRpdmUgd2FybmluZyBpbmZvIHBvc2l0aXZlIGVycm9yIHN1Y2Nlc3MnKVxuICAgICAgICAgICAgLmFkZENsYXNzKHR5cGUgPT09ICdlcnJvcicgPyAnbmVnYXRpdmUnIDogdHlwZSk7XG4gICAgICAgIFxuICAgICAgICBsZXQgY29udGVudCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlc3VsdC5pc0RlZmF1bHQpIHtcbiAgICAgICAgICAgIGNvbnRlbnQgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnBzd19EZWZhdWx0UGFzc3dvcmRXYXJuaW5nIHx8ICdEZWZhdWx0IFBhc3N3b3JkIERldGVjdGVkJ31cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5wc3dfQ2hhbmdlRGVmYXVsdFBhc3N3b3JkIHx8ICdQbGVhc2UgY2hhbmdlIHRoZSBkZWZhdWx0IHBhc3N3b3JkIGZvciBzZWN1cml0eS4nfTwvcD5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzdWx0LmlzU2ltcGxlIHx8IHJlc3VsdC5pc0luRGljdGlvbmFyeSkge1xuICAgICAgICAgICAgY29udGVudCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucHN3X1dlYWtQYXNzd29yZCB8fCAnV2VhayBQYXNzd29yZCd9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkVG9vQ29tbW9uIHx8ICdUaGlzIHBhc3N3b3JkIGlzIHRvbyBjb21tb24gYW5kIGVhc2lseSBndWVzc2FibGUuJ308L3A+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdC5tZXNzYWdlcyAmJiByZXN1bHQubWVzc2FnZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29udGVudCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucHN3X1Bhc3N3b3JkUmVxdWlyZW1lbnRzIHx8ICdQYXNzd29yZCBSZXF1aXJlbWVudHMnfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDx1bCBjbGFzcz1cImxpc3RcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtyZXN1bHQubWVzc2FnZXMubWFwKG1zZyA9PiBgPGxpPiR7bXNnfTwvbGk+YCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgPC91bD5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBnZW5lcmF0ZSBidXR0b24gc3VnZ2VzdGlvbiBmb3Igd2VhayBwYXNzd29yZHNcbiAgICAgICAgaWYgKChyZXN1bHQuc2NvcmUgPCA2MCB8fCAhcmVzdWx0LmlzVmFsaWQpICYmIHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWRlYSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wc3dfVXNlR2VuZXJhdGVCdXR0b24gfHwgJ1VzZSB0aGUgZ2VuZXJhdGUgYnV0dG9uIHRvIGNyZWF0ZSBhIHN0cm9uZyBwYXNzd29yZC4nfVxuICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAkd2FybmluZ3MuaHRtbChjb250ZW50KS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkd2FybmluZ3MuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHdhcm5pbmdzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgaGlkZVdhcm5pbmdzKGluc3RhbmNlKSB7XG4gICAgICAgIGlmIChpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MpIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiR3YXJuaW5ncy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFuY2UuJGNvbnRhaW5lci5yZW1vdmVDbGFzcygnZXJyb3Igd2FybmluZyBzdWNjZXNzJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpbml0aWFsIHBhc3N3b3JkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gV2lkZ2V0IGluc3RhbmNlXG4gICAgICovXG4gICAgY2hlY2tQYXNzd29yZChpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCBwYXNzd29yZCA9IGluc3RhbmNlLiRmaWVsZC52YWwoKTtcbiAgICAgICAgaWYgKHRoaXMuc2hvdWxkVmFsaWRhdGUoaW5zdGFuY2UsIHBhc3N3b3JkKSkge1xuICAgICAgICAgICAgdGhpcy52YWxpZGF0ZVBhc3N3b3JkKGluc3RhbmNlLCBwYXNzd29yZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgd2lkZ2V0IGluc3RhbmNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGRlc3Ryb3koZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gVW5iaW5kIGV2ZW50c1xuICAgICAgICBpbnN0YW5jZS4kZmllbGQub2ZmKCcucGFzc3dvcmRXaWRnZXQnKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bikge1xuICAgICAgICAgICAgaW5zdGFuY2UuZWxlbWVudHMuJGdlbmVyYXRlQnRuLm9mZignLnBhc3N3b3JkV2lkZ2V0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBlbGVtZW50c1xuICAgICAgICBpZiAoaW5zdGFuY2UuZWxlbWVudHMuJHdhcm5pbmdzKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5lbGVtZW50cy4kd2FybmluZ3MucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluc3RhbmNlLmVsZW1lbnRzLiRzY29yZVNlY3Rpb24pIHtcbiAgICAgICAgICAgIGluc3RhbmNlLmVsZW1lbnRzLiRzY29yZVNlY3Rpb24ucmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5kZWxldGUoZmllbGRJZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IGFsbCB3aWRnZXQgaW5zdGFuY2VzXG4gICAgICovXG4gICAgZGVzdHJveUFsbCgpIHtcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UsIGZpZWxkSWQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZGVzdHJveShmaWVsZElkKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuLy8gZXhwb3J0IGRlZmF1bHQgUGFzc3dvcmRXaWRnZXQ7Il19