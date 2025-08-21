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

/* global globalTranslate, PasswordScore, Form */

/**
 * Password Validator Module for General Settings
 * Provides enhanced validation UI with warnings and suggestions
 * Uses the PasswordScore module for strength calculation
 */
var passwordValidator = {
  /**
   * Initialize password validation for General Settings page
   * 
   * @param {object} options Configuration options
   */
  initialize: function initialize() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    this.options = _objectSpread({
      showWarnings: true,
      checkOnLoad: true
    }, options);
    this.bindEventHandlers();

    if (this.options.checkOnLoad) {
      this.checkInitialPasswords();
    }
  },

  /**
   * Bind event handlers for password fields
   */
  bindEventHandlers: function bindEventHandlers() {
    var _this = this;

    // Web Admin Password field
    var $webAdminPassword = $('#WebAdminPassword');

    if ($webAdminPassword.length > 0) {
      // Use PasswordScore for real-time validation
      $webAdminPassword.on('input', function (e) {
        var password = e.target.value;

        if (password && password !== 'xxxxxxx') {
          PasswordScore.checkPassStrength({
            pass: password,
            bar: $('.password-score'),
            section: $('.password-score-section'),
            field: 'WebAdminPassword',
            callback: function callback(result) {
              _this.handleValidationResult(result, 'WebAdminPassword');
            }
          });
        }
      }); // Clear warnings when field is cleared

      $webAdminPassword.on('change', function (e) {
        if (!e.target.value || e.target.value === 'xxxxxxx') {
          _this.hideWarnings('WebAdminPassword');
        }
      });
    } // SSH Password field


    var $sshPassword = $('#SSHPassword');

    if ($sshPassword.length > 0) {
      $sshPassword.on('input', function (e) {
        var password = e.target.value;
        var sshDisabled = $('#SSHDisablePasswordLogins').checkbox('is checked');

        if (!sshDisabled && password && password !== 'xxxxxxx') {
          PasswordScore.checkPassStrength({
            pass: password,
            bar: $('.ssh-password-score'),
            section: $('.ssh-password-score-section'),
            field: 'SSHPassword',
            callback: function callback(result) {
              _this.handleValidationResult(result, 'SSHPassword');
            }
          });
        }
      });
      $sshPassword.on('change', function (e) {
        if (!e.target.value || e.target.value === 'xxxxxxx') {
          _this.hideWarnings('SSHPassword');
        }
      });
    } // Generate password buttons


    $('.generate-password-btn').on('click', function (e) {
      e.preventDefault();
      var field = $(e.currentTarget).data('field');

      _this.generatePassword(field);
    });
  },

  /**
   * Check initial passwords on page load
   */
  checkInitialPasswords: function checkInitialPasswords() {
    var _this2 = this;

    // Remove any existing password-validate messages
    $('.password-validate').fadeOut(300, function () {
      $(this).remove();
    }); // Check Web Admin Password

    var $webAdminPassword = $('#WebAdminPassword');

    if ($webAdminPassword.length > 0) {
      var webPassword = $webAdminPassword.val();

      if (webPassword && webPassword !== 'xxxxxxx') {
        // Use PasswordScore for initial check
        PasswordScore.checkPassStrength({
          pass: webPassword,
          bar: $('.password-score'),
          section: $('.password-score-section'),
          field: 'WebAdminPassword',
          callback: function callback(result) {
            // Only show warnings for weak passwords on initial load
            if (result && !result.isValid) {
              _this2.handleValidationResult(result, 'WebAdminPassword', true);
            }
          }
        });
      }
    } // Check SSH Password


    var $sshPassword = $('#SSHPassword');

    if ($sshPassword.length > 0) {
      var sshPassword = $sshPassword.val();
      var sshDisabled = $('#SSHDisableSSHPassword').checkbox('is checked');

      if (!sshDisabled && sshPassword && sshPassword !== 'xxxxxxx') {
        PasswordScore.checkPassStrength({
          pass: sshPassword,
          bar: $('.ssh-password-score'),
          section: $('.ssh-password-score-section'),
          field: 'SSHPassword',
          callback: function callback(result) {
            if (result && !result.isValid) {
              _this2.handleValidationResult(result, 'SSHPassword', true);
            }
          }
        });
      }
    }
  },

  /**
   * Handle validation result from PasswordScore
   * 
   * @param {object} result Validation result
   * @param {string} field Field name
   * @param {boolean} isInitial Is this initial check
   */
  handleValidationResult: function handleValidationResult(result, field) {
    var isInitial = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    if (!this.options.showWarnings) {
      return;
    } // Update field validation state


    var $field = $("#".concat(field)).closest('.field');
    $field.removeClass('error warning success');

    if (!result.isValid) {
      $field.addClass('error');
      this.showWarnings(result, field, isInitial);
    } else if (result.score < 60) {
      $field.addClass('warning');
      this.showWarnings(result, field, isInitial);
    } else if (result.score >= 80) {
      $field.addClass('success'); // Hide warnings for strong passwords

      this.hideWarnings(field);
    }
  },

  /**
   * Show warnings for password
   * 
   * @param {object} result Validation result
   * @param {string} field Field name
   * @param {boolean} isInitial Is this initial check
   */
  showWarnings: function showWarnings(result, field) {
    var isInitial = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var containerId = field === 'WebAdminPassword' ? 'web-password-warnings' : 'ssh-password-warnings';
    var $container = $("#".concat(containerId)); // Create container if it doesn't exist

    if ($container.length === 0) {
      var $field = $("#".concat(field)).closest('.field');
      $container = $('<div>', {
        id: containerId,
        "class": 'ui small message password-warnings'
      });
      $field.after($container);
    } // Clear existing content


    $container.empty().removeClass('negative warning info positive');

    if (!result.isValid) {
      $container.addClass('negative');

      if (result.isDefault) {
        $container.append("\n                    <div class=\"header\">\n                        ".concat(globalTranslate.gs_SetPassword || 'Set Password', "\n                    </div>\n                    <p>").concat(globalTranslate.gs_SetPasswordInfo || 'You are using a default password. Please change it.', "</p>\n                "));
      } else if (result.isSimple) {
        $container.append("\n                    <div class=\"header\">\n                        ".concat(globalTranslate.gs_WeakPassword || 'Weak Password', "\n                    </div>\n                    <p>").concat(globalTranslate.gs_PasswordTooCommon || 'This password is too common and easily guessable.', "</p>\n                "));
      } else if (result.messages && result.messages.length > 0) {
        $container.append("\n                    <div class=\"header\">\n                        ".concat(globalTranslate.gs_PasswordRequirements || 'Password Requirements', "\n                    </div>\n                    <ul class=\"list\">\n                        ").concat(result.messages.map(function (msg) {
          return "<li>".concat(msg, "</li>");
        }).join(''), "\n                    </ul>\n                "));
      }
    } else if (result.score < 60 && result.suggestions && result.suggestions.length > 0) {
      $container.addClass('warning');
      $container.append("\n                <div class=\"header\">\n                    ".concat(globalTranslate.gs_PasswordSuggestions || 'Suggestions to improve password strength', "\n                </div>\n                <ul class=\"list\">\n                    ").concat(result.suggestions.map(function (suggestion) {
        return "<li>".concat(suggestion, "</li>");
      }).join(''), "\n                </ul>\n            "));
    } // Show container if it has content


    if ($container.html()) {
      $container.show();
    } else {
      $container.hide();
    }
  },

  /**
   * Hide warnings for field
   * 
   * @param {string} field Field name
   */
  hideWarnings: function hideWarnings(field) {
    var containerId = field === 'WebAdminPassword' ? 'web-password-warnings' : 'ssh-password-warnings';
    $("#".concat(containerId)).hide();
  },

  /**
   * Generate secure password for field
   * 
   * @param {string} field Field name
   */
  generatePassword: function generatePassword(field) {
    var _this3 = this;

    PasswordScore.generatePassword(16, function (result) {
      if (result && result.password) {
        // Set the password in the field
        $("#".concat(field)).val(result.password); // Also update repeat field if exists

        var $repeatField = $("#".concat(field, "Repeat"));

        if ($repeatField.length > 0) {
          $repeatField.val(result.password);
        } // Validate the new password


        PasswordScore.checkPassStrength({
          pass: result.password,
          bar: field === 'WebAdminPassword' ? $('.password-score') : $('.ssh-password-score'),
          section: field === 'WebAdminPassword' ? $('.password-score-section') : $('.ssh-password-score-section'),
          field: field,
          callback: function callback(validationResult) {
            _this3.handleValidationResult(validationResult, field);
          }
        }); // Mark form as changed

        if (typeof Form !== 'undefined' && Form.checkValues) {
          Form.checkValues();
        }
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvcGFzc3dvcmQtdmFsaWRhdG9yLmpzIl0sIm5hbWVzIjpbInBhc3N3b3JkVmFsaWRhdG9yIiwiaW5pdGlhbGl6ZSIsIm9wdGlvbnMiLCJzaG93V2FybmluZ3MiLCJjaGVja09uTG9hZCIsImJpbmRFdmVudEhhbmRsZXJzIiwiY2hlY2tJbml0aWFsUGFzc3dvcmRzIiwiJHdlYkFkbWluUGFzc3dvcmQiLCIkIiwibGVuZ3RoIiwib24iLCJlIiwicGFzc3dvcmQiLCJ0YXJnZXQiLCJ2YWx1ZSIsIlBhc3N3b3JkU2NvcmUiLCJjaGVja1Bhc3NTdHJlbmd0aCIsInBhc3MiLCJiYXIiLCJzZWN0aW9uIiwiZmllbGQiLCJjYWxsYmFjayIsInJlc3VsdCIsImhhbmRsZVZhbGlkYXRpb25SZXN1bHQiLCJoaWRlV2FybmluZ3MiLCIkc3NoUGFzc3dvcmQiLCJzc2hEaXNhYmxlZCIsImNoZWNrYm94IiwicHJldmVudERlZmF1bHQiLCJjdXJyZW50VGFyZ2V0IiwiZGF0YSIsImdlbmVyYXRlUGFzc3dvcmQiLCJmYWRlT3V0IiwicmVtb3ZlIiwid2ViUGFzc3dvcmQiLCJ2YWwiLCJpc1ZhbGlkIiwic3NoUGFzc3dvcmQiLCJpc0luaXRpYWwiLCIkZmllbGQiLCJjbG9zZXN0IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInNjb3JlIiwiY29udGFpbmVySWQiLCIkY29udGFpbmVyIiwiaWQiLCJhZnRlciIsImVtcHR5IiwiaXNEZWZhdWx0IiwiYXBwZW5kIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZ3NfU2V0UGFzc3dvcmQiLCJnc19TZXRQYXNzd29yZEluZm8iLCJpc1NpbXBsZSIsImdzX1dlYWtQYXNzd29yZCIsImdzX1Bhc3N3b3JkVG9vQ29tbW9uIiwibWVzc2FnZXMiLCJnc19QYXNzd29yZFJlcXVpcmVtZW50cyIsIm1hcCIsIm1zZyIsImpvaW4iLCJzdWdnZXN0aW9ucyIsImdzX1Bhc3N3b3JkU3VnZ2VzdGlvbnMiLCJzdWdnZXN0aW9uIiwiaHRtbCIsInNob3ciLCJoaWRlIiwiJHJlcGVhdEZpZWxkIiwidmFsaWRhdGlvblJlc3VsdCIsIkZvcm0iLCJjaGVja1ZhbHVlcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxpQkFBaUIsR0FBRztBQUV0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBUHNCLHdCQU9HO0FBQUEsUUFBZEMsT0FBYyx1RUFBSixFQUFJO0FBQ3JCLFNBQUtBLE9BQUw7QUFDSUMsTUFBQUEsWUFBWSxFQUFFLElBRGxCO0FBRUlDLE1BQUFBLFdBQVcsRUFBRTtBQUZqQixPQUdPRixPQUhQO0FBTUEsU0FBS0csaUJBQUw7O0FBRUEsUUFBSSxLQUFLSCxPQUFMLENBQWFFLFdBQWpCLEVBQThCO0FBQzFCLFdBQUtFLHFCQUFMO0FBQ0g7QUFDSixHQW5CcUI7O0FBcUJ0QjtBQUNKO0FBQ0E7QUFDSUQsRUFBQUEsaUJBeEJzQiwrQkF3QkY7QUFBQTs7QUFDaEI7QUFDQSxRQUFNRSxpQkFBaUIsR0FBR0MsQ0FBQyxDQUFDLG1CQUFELENBQTNCOztBQUNBLFFBQUlELGlCQUFpQixDQUFDRSxNQUFsQixHQUEyQixDQUEvQixFQUFrQztBQUM5QjtBQUNBRixNQUFBQSxpQkFBaUIsQ0FBQ0csRUFBbEIsQ0FBcUIsT0FBckIsRUFBOEIsVUFBQ0MsQ0FBRCxFQUFPO0FBQ2pDLFlBQU1DLFFBQVEsR0FBR0QsQ0FBQyxDQUFDRSxNQUFGLENBQVNDLEtBQTFCOztBQUNBLFlBQUlGLFFBQVEsSUFBSUEsUUFBUSxLQUFLLFNBQTdCLEVBQXdDO0FBQ3BDRyxVQUFBQSxhQUFhLENBQUNDLGlCQUFkLENBQWdDO0FBQzVCQyxZQUFBQSxJQUFJLEVBQUVMLFFBRHNCO0FBRTVCTSxZQUFBQSxHQUFH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QURlO0FBRTVCTSxVQUFBQSxHQUFHLEVBQUVFLEtBQUssS0FBSyxrQkFBVixHQUErQlosQ0FBQyxDQUFDLGlCQUFELENBQWhDLEdBQXNEQSxDQUFDLENBQUMscUJBQUQsQ0FGaEM7QUFHNUJXLFVBQUFBLE9BQU8sRUFBRUMsS0FBSyxLQUFLLGtCQUFWLEdBQStCWixDQUFDLENBQUMseUJBQUQsQ0FBaEMsR0FBOERBLENBQUMsQ0FBQyw2QkFBRCxDQUg1QztBQUk1QlksVUFBQUEsS0FBSyxFQUFFQSxLQUpxQjtBQUs1QkMsVUFBQUEsUUFBUSxFQUFFLGtCQUFDZ0QsZ0JBQUQsRUFBc0I7QUFDNUIsWUFBQSxNQUFJLENBQUM5QyxzQkFBTCxDQUE0QjhDLGdCQUE1QixFQUE4Q2pELEtBQTlDO0FBQ0g7QUFQMkIsU0FBaEMsRUFYMkIsQ0FxQjNCOztBQUNBLFlBQUksT0FBT2tELElBQVAsS0FBZ0IsV0FBaEIsSUFBK0JBLElBQUksQ0FBQ0MsV0FBeEMsRUFBcUQ7QUFDakRELFVBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNIO0FBQ0o7QUFDSixLQTNCRDtBQTRCSDtBQWhTcUIsQ0FBMUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYXNzd29yZFNjb3JlLCBGb3JtICovXG5cbi8qKlxuICogUGFzc3dvcmQgVmFsaWRhdG9yIE1vZHVsZSBmb3IgR2VuZXJhbCBTZXR0aW5nc1xuICogUHJvdmlkZXMgZW5oYW5jZWQgdmFsaWRhdGlvbiBVSSB3aXRoIHdhcm5pbmdzIGFuZCBzdWdnZXN0aW9uc1xuICogVXNlcyB0aGUgUGFzc3dvcmRTY29yZSBtb2R1bGUgZm9yIHN0cmVuZ3RoIGNhbGN1bGF0aW9uXG4gKi9cbmNvbnN0IHBhc3N3b3JkVmFsaWRhdG9yID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgdmFsaWRhdGlvbiBmb3IgR2VuZXJhbCBTZXR0aW5ncyBwYWdlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgQ29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZShvcHRpb25zID0ge30pIHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgICAgICAgc2hvd1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IHRydWUsXG4gICAgICAgICAgICAuLi5vcHRpb25zXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLmJpbmRFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmNoZWNrT25Mb2FkKSB7XG4gICAgICAgICAgICB0aGlzLmNoZWNrSW5pdGlhbFBhc3N3b3JkcygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCaW5kIGV2ZW50IGhhbmRsZXJzIGZvciBwYXNzd29yZCBmaWVsZHNcbiAgICAgKi9cbiAgICBiaW5kRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgLy8gV2ViIEFkbWluIFBhc3N3b3JkIGZpZWxkXG4gICAgICAgIGNvbnN0ICR3ZWJBZG1pblBhc3N3b3JkID0gJCgnI1dlYkFkbWluUGFzc3dvcmQnKTtcbiAgICAgICAgaWYgKCR3ZWJBZG1pblBhc3N3b3JkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIFVzZSBQYXNzd29yZFNjb3JlIGZvciByZWFsLXRpbWUgdmFsaWRhdGlvblxuICAgICAgICAgICAgJHdlYkFkbWluUGFzc3dvcmQub24oJ2lucHV0JywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXNzd29yZCA9IGUudGFyZ2V0LnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChwYXNzd29yZCAmJiBwYXNzd29yZCAhPT0gJ3h4eHh4eHgnKSB7XG4gICAgICAgICAgICAgICAgICAgIFBhc3N3b3JkU2NvcmUuY2hlY2tQYXNzU3RyZW5ndGgoe1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFzczogcGFzc3dvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBiYXI6ICQoJy5wYXNzd29yZC1zY29yZScpLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogJCgnLnBhc3N3b3JkLXNjb3JlLXNlY3Rpb24nKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkOiAnV2ViQWRtaW5QYXNzd29yZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVmFsaWRhdGlvblJlc3VsdChyZXN1bHQsICdXZWJBZG1pblBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciB3YXJuaW5ncyB3aGVuIGZpZWxkIGlzIGNsZWFyZWRcbiAgICAgICAgICAgICR3ZWJBZG1pblBhc3N3b3JkLm9uKCdjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghZS50YXJnZXQudmFsdWUgfHwgZS50YXJnZXQudmFsdWUgPT09ICd4eHh4eHh4Jykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhpZGVXYXJuaW5ncygnV2ViQWRtaW5QYXNzd29yZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTU0ggUGFzc3dvcmQgZmllbGRcbiAgICAgICAgY29uc3QgJHNzaFBhc3N3b3JkID0gJCgnI1NTSFBhc3N3b3JkJyk7XG4gICAgICAgIGlmICgkc3NoUGFzc3dvcmQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJHNzaFBhc3N3b3JkLm9uKCdpbnB1dCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFzc3dvcmQgPSBlLnRhcmdldC52YWx1ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBzc2hEaXNhYmxlZCA9ICQoJyNTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICghc3NoRGlzYWJsZWQgJiYgcGFzc3dvcmQgJiYgcGFzc3dvcmQgIT09ICd4eHh4eHh4Jykge1xuICAgICAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhc3M6IHBhc3N3b3JkLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFyOiAkKCcuc3NoLXBhc3N3b3JkLXNjb3JlJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiAkKCcuc3NoLXBhc3N3b3JkLXNjb3JlLXNlY3Rpb24nKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkOiAnU1NIUGFzc3dvcmQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVZhbGlkYXRpb25SZXN1bHQocmVzdWx0LCAnU1NIUGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRzc2hQYXNzd29yZC5vbignY2hhbmdlJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWUudGFyZ2V0LnZhbHVlIHx8IGUudGFyZ2V0LnZhbHVlID09PSAneHh4eHh4eCcpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oaWRlV2FybmluZ3MoJ1NTSFBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdlbmVyYXRlIHBhc3N3b3JkIGJ1dHRvbnNcbiAgICAgICAgJCgnLmdlbmVyYXRlLXBhc3N3b3JkLWJ0bicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVBhc3N3b3JkKGZpZWxkKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpbml0aWFsIHBhc3N3b3JkcyBvbiBwYWdlIGxvYWRcbiAgICAgKi9cbiAgICBjaGVja0luaXRpYWxQYXNzd29yZHMoKSB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgcGFzc3dvcmQtdmFsaWRhdGUgbWVzc2FnZXNcbiAgICAgICAgJCgnLnBhc3N3b3JkLXZhbGlkYXRlJykuZmFkZU91dCgzMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBXZWIgQWRtaW4gUGFzc3dvcmRcbiAgICAgICAgY29uc3QgJHdlYkFkbWluUGFzc3dvcmQgPSAkKCcjV2ViQWRtaW5QYXNzd29yZCcpO1xuICAgICAgICBpZiAoJHdlYkFkbWluUGFzc3dvcmQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgd2ViUGFzc3dvcmQgPSAkd2ViQWRtaW5QYXNzd29yZC52YWwoKTtcbiAgICAgICAgICAgIGlmICh3ZWJQYXNzd29yZCAmJiB3ZWJQYXNzd29yZCAhPT0gJ3h4eHh4eHgnKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIFBhc3N3b3JkU2NvcmUgZm9yIGluaXRpYWwgY2hlY2tcbiAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgcGFzczogd2ViUGFzc3dvcmQsXG4gICAgICAgICAgICAgICAgICAgIGJhcjogJCgnLnBhc3N3b3JkLXNjb3JlJyksXG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246ICQoJy5wYXNzd29yZC1zY29yZS1zZWN0aW9uJyksXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkOiAnV2ViQWRtaW5QYXNzd29yZCcsXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHNob3cgd2FybmluZ3MgZm9yIHdlYWsgcGFzc3dvcmRzIG9uIGluaXRpYWwgbG9hZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiAhcmVzdWx0LmlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVZhbGlkYXRpb25SZXN1bHQocmVzdWx0LCAnV2ViQWRtaW5QYXNzd29yZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIFNTSCBQYXNzd29yZFxuICAgICAgICBjb25zdCAkc3NoUGFzc3dvcmQgPSAkKCcjU1NIUGFzc3dvcmQnKTtcbiAgICAgICAgaWYgKCRzc2hQYXNzd29yZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzc2hQYXNzd29yZCA9ICRzc2hQYXNzd29yZC52YWwoKTtcbiAgICAgICAgICAgIGNvbnN0IHNzaERpc2FibGVkID0gJCgnI1NTSERpc2FibGVTU0hQYXNzd29yZCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghc3NoRGlzYWJsZWQgJiYgc3NoUGFzc3dvcmQgJiYgc3NoUGFzc3dvcmQgIT09ICd4eHh4eHh4Jykge1xuICAgICAgICAgICAgICAgIFBhc3N3b3JkU2NvcmUuY2hlY2tQYXNzU3RyZW5ndGgoe1xuICAgICAgICAgICAgICAgICAgICBwYXNzOiBzc2hQYXNzd29yZCxcbiAgICAgICAgICAgICAgICAgICAgYmFyOiAkKCcuc3NoLXBhc3N3b3JkLXNjb3JlJyksXG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246ICQoJy5zc2gtcGFzc3dvcmQtc2NvcmUtc2VjdGlvbicpLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZDogJ1NTSFBhc3N3b3JkJyxcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgIXJlc3VsdC5pc1ZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVWYWxpZGF0aW9uUmVzdWx0KHJlc3VsdCwgJ1NTSFBhc3N3b3JkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHZhbGlkYXRpb24gcmVzdWx0IGZyb20gUGFzc3dvcmRTY29yZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXN1bHQgVmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGQgRmllbGQgbmFtZVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNJbml0aWFsIElzIHRoaXMgaW5pdGlhbCBjaGVja1xuICAgICAqL1xuICAgIGhhbmRsZVZhbGlkYXRpb25SZXN1bHQocmVzdWx0LCBmaWVsZCwgaXNJbml0aWFsID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuc2hvd1dhcm5pbmdzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBmaWVsZCB2YWxpZGF0aW9uIHN0YXRlXG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoYCMke2ZpZWxkfWApLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICAkZmllbGQucmVtb3ZlQ2xhc3MoJ2Vycm9yIHdhcm5pbmcgc3VjY2VzcycpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFyZXN1bHQuaXNWYWxpZCkge1xuICAgICAgICAgICAgJGZpZWxkLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgdGhpcy5zaG93V2FybmluZ3MocmVzdWx0LCBmaWVsZCwgaXNJbml0aWFsKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQuc2NvcmUgPCA2MCkge1xuICAgICAgICAgICAgJGZpZWxkLmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICAgICB0aGlzLnNob3dXYXJuaW5ncyhyZXN1bHQsIGZpZWxkLCBpc0luaXRpYWwpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdC5zY29yZSA+PSA4MCkge1xuICAgICAgICAgICAgJGZpZWxkLmFkZENsYXNzKCdzdWNjZXNzJyk7XG4gICAgICAgICAgICAvLyBIaWRlIHdhcm5pbmdzIGZvciBzdHJvbmcgcGFzc3dvcmRzXG4gICAgICAgICAgICB0aGlzLmhpZGVXYXJuaW5ncyhmaWVsZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgd2FybmluZ3MgZm9yIHBhc3N3b3JkXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCBWYWxpZGF0aW9uIHJlc3VsdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZCBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0luaXRpYWwgSXMgdGhpcyBpbml0aWFsIGNoZWNrXG4gICAgICovXG4gICAgc2hvd1dhcm5pbmdzKHJlc3VsdCwgZmllbGQsIGlzSW5pdGlhbCA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IGNvbnRhaW5lcklkID0gZmllbGQgPT09ICdXZWJBZG1pblBhc3N3b3JkJyBcbiAgICAgICAgICAgID8gJ3dlYi1wYXNzd29yZC13YXJuaW5ncydcbiAgICAgICAgICAgIDogJ3NzaC1wYXNzd29yZC13YXJuaW5ncyc7XG4gICAgICAgICAgICBcbiAgICAgICAgbGV0ICRjb250YWluZXIgPSAkKGAjJHtjb250YWluZXJJZH1gKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBjb250YWluZXIgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICBpZiAoJGNvbnRhaW5lci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoYCMke2ZpZWxkfWApLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICAgICAgJGNvbnRhaW5lciA9ICQoJzxkaXY+Jywge1xuICAgICAgICAgICAgICAgIGlkOiBjb250YWluZXJJZCxcbiAgICAgICAgICAgICAgICBjbGFzczogJ3VpIHNtYWxsIG1lc3NhZ2UgcGFzc3dvcmQtd2FybmluZ3MnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRmaWVsZC5hZnRlcigkY29udGFpbmVyKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY29udGVudFxuICAgICAgICAkY29udGFpbmVyLmVtcHR5KCkucmVtb3ZlQ2xhc3MoJ25lZ2F0aXZlIHdhcm5pbmcgaW5mbyBwb3NpdGl2ZScpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFyZXN1bHQuaXNWYWxpZCkge1xuICAgICAgICAgICAgJGNvbnRhaW5lci5hZGRDbGFzcygnbmVnYXRpdmUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3VsdC5pc0RlZmF1bHQpIHtcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZChgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmdzX1NldFBhc3N3b3JkIHx8ICdTZXQgUGFzc3dvcmQnfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfU2V0UGFzc3dvcmRJbmZvIHx8ICdZb3UgYXJlIHVzaW5nIGEgZGVmYXVsdCBwYXNzd29yZC4gUGxlYXNlIGNoYW5nZSBpdC4nfTwvcD5cbiAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0LmlzU2ltcGxlKSB7XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19XZWFrUGFzc3dvcmQgfHwgJ1dlYWsgUGFzc3dvcmQnfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRUb29Db21tb24gfHwgJ1RoaXMgcGFzc3dvcmQgaXMgdG9vIGNvbW1vbiBhbmQgZWFzaWx5IGd1ZXNzYWJsZS4nfTwvcD5cbiAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0Lm1lc3NhZ2VzICYmIHJlc3VsdC5tZXNzYWdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19QYXNzd29yZFJlcXVpcmVtZW50cyB8fCAnUGFzc3dvcmQgUmVxdWlyZW1lbnRzJ31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzcz1cImxpc3RcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7cmVzdWx0Lm1lc3NhZ2VzLm1hcChtc2cgPT4gYDxsaT4ke21zZ308L2xpPmApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdC5zY29yZSA8IDYwICYmIHJlc3VsdC5zdWdnZXN0aW9ucyAmJiByZXN1bHQuc3VnZ2VzdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJGNvbnRhaW5lci5hZGRDbGFzcygnd2FybmluZycpO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfUGFzc3dvcmRTdWdnZXN0aW9ucyB8fCAnU3VnZ2VzdGlvbnMgdG8gaW1wcm92ZSBwYXNzd29yZCBzdHJlbmd0aCd9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPHVsIGNsYXNzPVwibGlzdFwiPlxuICAgICAgICAgICAgICAgICAgICAke3Jlc3VsdC5zdWdnZXN0aW9ucy5tYXAoc3VnZ2VzdGlvbiA9PiBgPGxpPiR7c3VnZ2VzdGlvbn08L2xpPmApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBjb250YWluZXIgaWYgaXQgaGFzIGNvbnRlbnRcbiAgICAgICAgaWYgKCRjb250YWluZXIuaHRtbCgpKSB7XG4gICAgICAgICAgICAkY29udGFpbmVyLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRjb250YWluZXIuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHdhcm5pbmdzIGZvciBmaWVsZFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZCBGaWVsZCBuYW1lXG4gICAgICovXG4gICAgaGlkZVdhcm5pbmdzKGZpZWxkKSB7XG4gICAgICAgIGNvbnN0IGNvbnRhaW5lcklkID0gZmllbGQgPT09ICdXZWJBZG1pblBhc3N3b3JkJyBcbiAgICAgICAgICAgID8gJ3dlYi1wYXNzd29yZC13YXJuaW5ncydcbiAgICAgICAgICAgIDogJ3NzaC1wYXNzd29yZC13YXJuaW5ncyc7XG4gICAgICAgICQoYCMke2NvbnRhaW5lcklkfWApLmhpZGUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIHNlY3VyZSBwYXNzd29yZCBmb3IgZmllbGRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGQgRmllbGQgbmFtZVxuICAgICAqL1xuICAgIGdlbmVyYXRlUGFzc3dvcmQoZmllbGQpIHtcbiAgICAgICAgUGFzc3dvcmRTY29yZS5nZW5lcmF0ZVBhc3N3b3JkKDE2LCAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5wYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgcGFzc3dvcmQgaW4gdGhlIGZpZWxkXG4gICAgICAgICAgICAgICAgJChgIyR7ZmllbGR9YCkudmFsKHJlc3VsdC5wYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWxzbyB1cGRhdGUgcmVwZWF0IGZpZWxkIGlmIGV4aXN0c1xuICAgICAgICAgICAgICAgIGNvbnN0ICRyZXBlYXRGaWVsZCA9ICQoYCMke2ZpZWxkfVJlcGVhdGApO1xuICAgICAgICAgICAgICAgIGlmICgkcmVwZWF0RmllbGQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAkcmVwZWF0RmllbGQudmFsKHJlc3VsdC5wYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBuZXcgcGFzc3dvcmRcbiAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgcGFzczogcmVzdWx0LnBhc3N3b3JkLFxuICAgICAgICAgICAgICAgICAgICBiYXI6IGZpZWxkID09PSAnV2ViQWRtaW5QYXNzd29yZCcgPyAkKCcucGFzc3dvcmQtc2NvcmUnKSA6ICQoJy5zc2gtcGFzc3dvcmQtc2NvcmUnKSxcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogZmllbGQgPT09ICdXZWJBZG1pblBhc3N3b3JkJyA/ICQoJy5wYXNzd29yZC1zY29yZS1zZWN0aW9uJykgOiAkKCcuc3NoLXBhc3N3b3JkLXNjb3JlLXNlY3Rpb24nKSxcbiAgICAgICAgICAgICAgICAgICAgZmllbGQ6IGZpZWxkLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKHZhbGlkYXRpb25SZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVmFsaWRhdGlvblJlc3VsdCh2YWxpZGF0aW9uUmVzdWx0LCBmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5jaGVja1ZhbHVlcykge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59OyJdfQ==