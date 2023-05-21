"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl,globalTranslate, Form */

/**
 * Manager module.
 * @module manager
 */
var manager = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#save-ami-form'),

  /**
   * jQuery objects for dropdown elements.
   * @type {jQuery}
   */
  $dropDowns: $('#save-ami-form .ui.dropdown'),

  /**
   * jQuery objects for master checkbox elements.
   * @type {jQuery}
   */
  $masterCheckBoxes: $('#save-ami-form .list .master.checkbox'),

  /**
   * jQuery objects for child checkbox elements.
   * @type {jQuery}
   */
  $childrenCheckBoxes: $('#save-ami-form .list .child.checkbox'),

  /**
   * jQuery objects for all checkbox elements.
   * @type {jQuery}
   */
  $allCheckBoxes: $('#save-ami-form .list .checkbox'),

  /**
   * jQuery object for the uncheck button.
   * @type {jQuery}
   */
  $unCheckButton: $('.uncheck.button'),

  /**
   * jQuery object for the username input field.
   * @type {jQuery}
   */
  $username: $('#username'),

  /**
   * Original username value.
   * @type {string}
   */
  originalName: '',

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    username: {
      identifier: 'username',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.am_ValidationAMINameIsEmpty
      }, {
        type: 'existRule[username-error]',
        prompt: globalTranslate.am_ErrorThisUsernameInNotAvailable
      }]
    },
    secret: {
      identifier: 'secret',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.am_ValidationAMISecretIsEmpty
      }]
    }
  },

  /**
   * Initializes the manager module.
   */
  initialize: function initialize() {
    // Initialize dropdowns
    manager.$dropDowns.dropdown(); // Initialize master checkboxes

    manager.$masterCheckBoxes.checkbox({
      // Check all children
      onChecked: function onChecked() {
        var $childCheckbox = $(this).closest('.checkbox').siblings('.list').find('.checkbox');
        $childCheckbox.checkbox('check');
      },
      // Uncheck all children
      onUnchecked: function onUnchecked() {
        var $childCheckbox = $(this).closest('.checkbox').siblings('.list').find('.checkbox');
        $childCheckbox.checkbox('uncheck');
      }
    }); // Initialize child checkboxes

    manager.$childrenCheckBoxes.checkbox({
      // Fire on load to set parent value
      fireOnInit: true,
      // Change parent state on each child checkbox change
      onChange: function onChange() {
        var $listGroup = $(this).closest('.list');
        var $parentCheckbox = $listGroup.closest('.item').children('.checkbox');
        var $checkbox = $listGroup.find('.checkbox');
        var allChecked = true;
        var allUnchecked = true; // Check if all other siblings are checked or unchecked

        $checkbox.each(function () {
          if ($(this).checkbox('is checked')) {
            allUnchecked = false;
          } else {
            allChecked = false;
          }
        }); // Set parent checkbox state, but don't trigger its onChange callback

        if (allChecked) {
          $parentCheckbox.checkbox('set checked');
        } else if (allUnchecked) {
          $parentCheckbox.checkbox('set unchecked');
        } else {
          $parentCheckbox.checkbox('set indeterminate');
        }
      }
    }); // Handle uncheck button click

    manager.$unCheckButton.on('click', function (e) {
      e.preventDefault();
      manager.$allCheckBoxes.checkbox('uncheck');
    }); // Handle username change

    manager.$username.on('change', function (value) {
      var userId = manager.$formObj.form('get value', 'id');
      var newValue = manager.$formObj.form('get value', 'username');
      manager.checkAvailability(manager.originalName, newValue, 'username', userId);
    });
    manager.initializeForm();
    manager.originalName = manager.$formObj.form('get value', 'username');
  },

  /**
   * Checks if the username doesn't exist in the database.
   * @param {string} oldName - The old username.
   * @param {string} newName - The new username.
   * @param {string} cssClassName - The CSS class name.
   * @param {string} userId - The user ID.
   */
  checkAvailability: function checkAvailability(oldName, newName) {
    var cssClassName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'username';
    var userId = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';

    if (oldName === newName) {
      $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
      $("#".concat(cssClassName, "-error")).addClass('hidden');
      return;
    }

    $.api({
      url: "".concat(globalRootUrl, "asterisk-managers/available/{value}"),
      stateContext: ".ui.input.".concat(cssClassName),
      on: 'now',
      beforeSend: function beforeSend(settings) {
        var result = settings;
        result.urlData = {
          value: newName
        };
        return result;
      },
      onSuccess: function onSuccess(response) {
        if (response.nameAvailable) {
          $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
          $("#".concat(cssClassName, "-error")).addClass('hidden');
        } else if (userId.length > 0 && response.userId === userId) {
          $(".ui.input.".concat(cssClassName)).parent().removeClass('error');
          $("#".concat(cssClassName, "-error")).addClass('hidden');
        } else {
          $(".ui.input.".concat(cssClassName)).parent().addClass('error');
          $("#".concat(cssClassName, "-error")).removeClass('hidden');
        }
      }
    });
  },

  /**
   * Callback function before sending the form.
   * @param {object} settings - Settings object for the AJAX request.
   * @returns {object} - Modified settings object.
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = manager.$formObj.form('get values');
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {// Callback function after sending the form
  },

  /**
   * Initializes the form.
   */
  initializeForm: function initializeForm() {
    Form.$formObj = manager.$formObj;
    Form.url = "".concat(globalRootUrl, "asterisk-managers/save"); // Form submission URL

    Form.validateRules = manager.validateRules; // Form validation rules

    Form.cbBeforeSendForm = manager.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = manager.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
}; // Custom form validation rule for checking uniqueness of username

$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
};
/**
 *  Initialize Asterisk Manager modify form on document ready
 */


$(document).ready(function () {
  manager.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJG1hc3RlckNoZWNrQm94ZXMiLCIkY2hpbGRyZW5DaGVja0JveGVzIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiR1c2VybmFtZSIsIm9yaWdpbmFsTmFtZSIsInZhbGlkYXRlUnVsZXMiLCJ1c2VybmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHkiLCJhbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlIiwic2VjcmV0IiwiYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHkiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIiRjaGlsZENoZWNrYm94IiwiY2xvc2VzdCIsInNpYmxpbmdzIiwiZmluZCIsIm9uVW5jaGVja2VkIiwiZmlyZU9uSW5pdCIsIm9uQ2hhbmdlIiwiJGxpc3RHcm91cCIsIiRwYXJlbnRDaGVja2JveCIsImNoaWxkcmVuIiwiJGNoZWNrYm94IiwiYWxsQ2hlY2tlZCIsImFsbFVuY2hlY2tlZCIsImVhY2giLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInZhbHVlIiwidXNlcklkIiwiZm9ybSIsIm5ld1ZhbHVlIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJpbml0aWFsaXplRm9ybSIsIm9sZE5hbWUiLCJuZXdOYW1lIiwiY3NzQ2xhc3NOYW1lIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJuYW1lQXZhaWxhYmxlIiwibGVuZ3RoIiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE9BQU8sR0FBRztBQUNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEM7O0FBT1o7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFRCxDQUFDLENBQUMsNkJBQUQsQ0FYRDs7QUFhWjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxpQkFBaUIsRUFBRUYsQ0FBQyxDQUFDLHVDQUFELENBakJSOztBQW1CWjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxtQkFBbUIsRUFBRUgsQ0FBQyxDQUFDLHNDQUFELENBdkJWOztBQXlCWjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxjQUFjLEVBQUVKLENBQUMsQ0FBQyxnQ0FBRCxDQTdCTDs7QUErQlo7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsY0FBYyxFQUFFTCxDQUFDLENBQUMsaUJBQUQsQ0FuQ0w7O0FBcUNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lNLEVBQUFBLFNBQVMsRUFBRU4sQ0FBQyxDQUFDLFdBQUQsQ0F6Q0E7O0FBMkNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lPLEVBQUFBLFlBQVksRUFBRSxFQS9DRjs7QUFpRFo7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsUUFBUSxFQUFFO0FBQ05DLE1BQUFBLFVBQVUsRUFBRSxV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QUEsQ0FBckM7QUFFQTtBQUNBO0FBQ0E7OztBQUNBdkUsQ0FBQyxDQUFDd0UsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjNFLEVBQUFBLE9BQU8sQ0FBQ3FCLFVBQVI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtICovXG5cbi8qKlxuICogTWFuYWdlciBtb2R1bGUuXG4gKiBAbW9kdWxlIG1hbmFnZXJcbiAqL1xuY29uc3QgbWFuYWdlciA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1hbWktZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHMgZm9yIGRyb3Bkb3duIGVsZW1lbnRzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3NhdmUtYW1pLWZvcm0gLnVpLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0cyBmb3IgbWFzdGVyIGNoZWNrYm94IGVsZW1lbnRzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hc3RlckNoZWNrQm94ZXM6ICQoJyNzYXZlLWFtaS1mb3JtIC5saXN0IC5tYXN0ZXIuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzIGZvciBjaGlsZCBjaGVja2JveCBlbGVtZW50cy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjaGlsZHJlbkNoZWNrQm94ZXM6ICQoJyNzYXZlLWFtaS1mb3JtIC5saXN0IC5jaGlsZC5jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHMgZm9yIGFsbCBjaGVja2JveCBlbGVtZW50cy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhbGxDaGVja0JveGVzOiAkKCcjc2F2ZS1hbWktZm9ybSAubGlzdCAuY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1bmNoZWNrIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1bkNoZWNrQnV0dG9uOiAkKCcudW5jaGVjay5idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1c2VybmFtZSBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1c2VybmFtZTogJCgnI3VzZXJuYW1lJyksXG5cbiAgICAvKipcbiAgICAgKiBPcmlnaW5hbCB1c2VybmFtZSB2YWx1ZS5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG9yaWdpbmFsTmFtZTogJycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW3VzZXJuYW1lLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBtYW5hZ2VyIG1vZHVsZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICBtYW5hZ2VyLiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIG1hc3RlciBjaGVja2JveGVzXG4gICAgICAgIG1hbmFnZXIuJG1hc3RlckNoZWNrQm94ZXNcbiAgICAgICAgICAgIC5jaGVja2JveCh7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgYWxsIGNoaWxkcmVuXG4gICAgICAgICAgICAgICAgb25DaGVja2VkKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdFxuICAgICAgICAgICAgICAgICAgICAgICAgJGNoaWxkQ2hlY2tib3ggPSAkKHRoaXMpLmNsb3Nlc3QoJy5jaGVja2JveCcpLnNpYmxpbmdzKCcubGlzdCcpLmZpbmQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgICAgICAgICAkY2hpbGRDaGVja2JveC5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIFVuY2hlY2sgYWxsIGNoaWxkcmVuXG4gICAgICAgICAgICAgICAgb25VbmNoZWNrZWQoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0XG4gICAgICAgICAgICAgICAgICAgICAgICAkY2hpbGRDaGVja2JveCA9ICQodGhpcykuY2xvc2VzdCgnLmNoZWNrYm94Jykuc2libGluZ3MoJy5saXN0JykuZmluZCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgICAgICRjaGlsZENoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hpbGQgY2hlY2tib3hlc1xuICAgICAgICBtYW5hZ2VyLiRjaGlsZHJlbkNoZWNrQm94ZXNcbiAgICAgICAgICAgIC5jaGVja2JveCh7XG4gICAgICAgICAgICAgICAgLy8gRmlyZSBvbiBsb2FkIHRvIHNldCBwYXJlbnQgdmFsdWVcbiAgICAgICAgICAgICAgICBmaXJlT25Jbml0OiB0cnVlLFxuICAgICAgICAgICAgICAgIC8vIENoYW5nZSBwYXJlbnQgc3RhdGUgb24gZWFjaCBjaGlsZCBjaGVja2JveCBjaGFuZ2VcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGxpc3RHcm91cCA9ICQodGhpcykuY2xvc2VzdCgnLmxpc3QnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJHBhcmVudENoZWNrYm94ID0gJGxpc3RHcm91cC5jbG9zZXN0KCcuaXRlbScpLmNoaWxkcmVuKCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJGxpc3RHcm91cC5maW5kKCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFsbENoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBsZXQgYWxsVW5jaGVja2VkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBhbGwgb3RoZXIgc2libGluZ3MgYXJlIGNoZWNrZWQgb3IgdW5jaGVja2VkXG4gICAgICAgICAgICAgICAgICAgICRjaGVja2JveC5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGxVbmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWxsQ2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgcGFyZW50IGNoZWNrYm94IHN0YXRlLCBidXQgZG9uJ3QgdHJpZ2dlciBpdHMgb25DaGFuZ2UgY2FsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFsbENoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRwYXJlbnRDaGVja2JveC5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhbGxVbmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRwYXJlbnRDaGVja2JveC5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHBhcmVudENoZWNrYm94LmNoZWNrYm94KCdzZXQgaW5kZXRlcm1pbmF0ZScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSB1bmNoZWNrIGJ1dHRvbiBjbGlja1xuICAgICAgICBtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSB1c2VybmFtZSBjaGFuZ2VcbiAgICAgICAgbWFuYWdlci4kdXNlcm5hbWUub24oJ2NoYW5nZScsICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXNlcklkID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcm5hbWUnKTtcbiAgICAgICAgICAgIG1hbmFnZXIuY2hlY2tBdmFpbGFiaWxpdHkobWFuYWdlci5vcmlnaW5hbE5hbWUsIG5ld1ZhbHVlLCAndXNlcm5hbWUnLCB1c2VySWQpO1xuICAgICAgICB9KTtcbiAgICAgICAgbWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9IG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJuYW1lJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGUgdXNlcm5hbWUgZG9lc24ndCBleGlzdCBpbiB0aGUgZGF0YWJhc2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9sZE5hbWUgLSBUaGUgb2xkIHVzZXJuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOYW1lIC0gVGhlIG5ldyB1c2VybmFtZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1c2VySWQgLSBUaGUgdXNlciBJRC5cbiAgICAgKi9cbiAgICBjaGVja0F2YWlsYWJpbGl0eShvbGROYW1lLCBuZXdOYW1lLCBjc3NDbGFzc05hbWUgPSAndXNlcm5hbWUnLCB1c2VySWQgPSAnJykge1xuICAgICAgICBpZiAob2xkTmFtZSA9PT0gbmV3TmFtZSkge1xuICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgJChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvYXZhaWxhYmxlL3t2YWx1ZX1gLFxuICAgICAgICAgICAgc3RhdGVDb250ZXh0OiBgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWAsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnVybERhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBuZXdOYW1lLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubmFtZUF2YWlsYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiByZXNwb25zZS51c2VySWQgPT09IHVzZXJJZCkge1xuICAgICAgICAgICAgICAgICAgICAkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBiZWZvcmUgc2VuZGluZyB0aGUgZm9ybS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBTZXR0aW5ncyBvYmplY3QgZm9yIHRoZSBBSkFYIHJlcXVlc3QuXG4gICAgICogQHJldHVybnMge29iamVjdH0gLSBNb2RpZmllZCBzZXR0aW5ncyBvYmplY3QuXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBtYW5hZ2VyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIHNlbmRpbmcgdGhlIGZvcm1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBtYW5hZ2VyLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFuYWdlci52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbWFuYWdlci5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbWFuYWdlci5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG59O1xuXG4vLyBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIHVuaXF1ZW5lc3Mgb2YgdXNlcm5hbWVcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBBc3RlcmlzayBNYW5hZ2VyIG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBtYW5hZ2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19