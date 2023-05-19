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
   * Validation rules for the form fields.
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
   * Callback function after sending the form.
   */
  cbAfterSendForm: function cbAfterSendForm() {// Callback function after sending the form
  },

  /**
   * Initializes the form.
   */
  initializeForm: function initializeForm() {
    Form.$formObj = manager.$formObj;
    Form.url = "".concat(globalRootUrl, "asterisk-managers/save");
    Form.validateRules = manager.validateRules;
    Form.cbBeforeSendForm = manager.cbBeforeSendForm;
    Form.cbAfterSendForm = manager.cbAfterSendForm;
    Form.initialize();
  }
}; // Custom form validation rule for checking uniqueness of username

$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
};

$(document).ready(function () {
  manager.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJG1hc3RlckNoZWNrQm94ZXMiLCIkY2hpbGRyZW5DaGVja0JveGVzIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiR1c2VybmFtZSIsIm9yaWdpbmFsTmFtZSIsInZhbGlkYXRlUnVsZXMiLCJ1c2VybmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHkiLCJhbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlIiwic2VjcmV0IiwiYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHkiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIiRjaGlsZENoZWNrYm94IiwiY2xvc2VzdCIsInNpYmxpbmdzIiwiZmluZCIsIm9uVW5jaGVja2VkIiwiZmlyZU9uSW5pdCIsIm9uQ2hhbmdlIiwiJGxpc3RHcm91cCIsIiRwYXJlbnRDaGVja2JveCIsImNoaWxkcmVuIiwiJGNoZWNrYm94IiwiYWxsQ2hlY2tlZCIsImFsbFVuY2hlY2tlZCIsImVhY2giLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInZhbHVlIiwidXNlcklkIiwiZm9ybSIsIm5ld1ZhbHVlIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJpbml0aWFsaXplRm9ybSIsIm9sZE5hbWUiLCJuZXdOYW1lIiwiY3NzQ2xhc3NOYW1lIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJuYW1lQXZhaWxhYmxlIiwibGVuZ3RoIiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLE9BQU8sR0FBRztBQUNmO0FBQ0Q7QUFDQTtBQUNBO0FBQ0NDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEk7O0FBT2Y7QUFDRDtBQUNBO0FBQ0E7QUFDQ0MsRUFBQUEsVUFBVSxFQUFFRCxDQUFDLENBQUMsNkJBQUQsQ0FYRTs7QUFhZjtBQUNEO0FBQ0E7QUFDQTtBQUNDRSxFQUFBQSxpQkFBaUIsRUFBRUYsQ0FBQyxDQUFDLHVDQUFELENBakJMOztBQW1CZjtBQUNEO0FBQ0E7QUFDQTtBQUNDRyxFQUFBQSxtQkFBbUIsRUFBRUgsQ0FBQyxDQUFDLHNDQUFELENBdkJQOztBQXlCZjtBQUNEO0FBQ0E7QUFDQTtBQUNDSSxFQUFBQSxjQUFjLEVBQUVKLENBQUMsQ0FBQyxnQ0FBRCxDQTdCRjs7QUErQmY7QUFDRDtBQUNBO0FBQ0E7QUFDQ0ssRUFBQUEsY0FBYyxFQUFFTCxDQUFDLENBQUMsaUJBQUQsQ0FuQ0Y7O0FBcUNmO0FBQ0Q7QUFDQTtBQUNBO0FBQ0NNLEVBQUFBLFNBQVMsRUFBRU4sQ0FBQyxDQUFDLFdBQUQsQ0F6Q0c7O0FBMkNmO0FBQ0Q7QUFDQTtBQUNBO0FBQ0NPLEVBQUFBLFlBQVksRUFBQyxFQS9DRTs7QUFpRGY7QUFDRDtBQUNBO0FBQ0E7QUFDQ0MsRUFBQUEsYUFBYSxFQUFFO0FBQ2RDLElBQUFBLFFBQVEsRUFBRTtBQUNUQyxNQUFBQSxVQUFVLEVBQUUsVUFESDtB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T0FBTyxDQUFDcUIsVUFBUjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0gKi9cblxuLyoqXG4gKiBNYW5hZ2VyIG1vZHVsZS5cbiAqIEBtb2R1bGUgbWFuYWdlclxuICovXG5jb25zdCBtYW5hZ2VyID0ge1xuXHQvKipcblx0ICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG5cdCAqIEB0eXBlIHtqUXVlcnl9XG5cdCAqL1xuXHQkZm9ybU9iajogJCgnI3NhdmUtYW1pLWZvcm0nKSxcblxuXHQvKipcblx0ICogalF1ZXJ5IG9iamVjdHMgZm9yIGRyb3Bkb3duIGVsZW1lbnRzLlxuXHQgKiBAdHlwZSB7alF1ZXJ5fVxuXHQgKi9cblx0JGRyb3BEb3duczogJCgnI3NhdmUtYW1pLWZvcm0gLnVpLmRyb3Bkb3duJyksXG5cblx0LyoqXG5cdCAqIGpRdWVyeSBvYmplY3RzIGZvciBtYXN0ZXIgY2hlY2tib3ggZWxlbWVudHMuXG5cdCAqIEB0eXBlIHtqUXVlcnl9XG5cdCAqL1xuXHQkbWFzdGVyQ2hlY2tCb3hlczogJCgnI3NhdmUtYW1pLWZvcm0gLmxpc3QgLm1hc3Rlci5jaGVja2JveCcpLFxuXG5cdC8qKlxuXHQgKiBqUXVlcnkgb2JqZWN0cyBmb3IgY2hpbGQgY2hlY2tib3ggZWxlbWVudHMuXG5cdCAqIEB0eXBlIHtqUXVlcnl9XG5cdCAqL1xuXHQkY2hpbGRyZW5DaGVja0JveGVzOiAkKCcjc2F2ZS1hbWktZm9ybSAubGlzdCAuY2hpbGQuY2hlY2tib3gnKSxcblxuXHQvKipcblx0ICogalF1ZXJ5IG9iamVjdHMgZm9yIGFsbCBjaGVja2JveCBlbGVtZW50cy5cblx0ICogQHR5cGUge2pRdWVyeX1cblx0ICovXG5cdCRhbGxDaGVja0JveGVzOiAkKCcjc2F2ZS1hbWktZm9ybSAubGlzdCAuY2hlY2tib3gnKSxcblxuXHQvKipcblx0ICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHVuY2hlY2sgYnV0dG9uLlxuXHQgKiBAdHlwZSB7alF1ZXJ5fVxuXHQgKi9cblx0JHVuQ2hlY2tCdXR0b246ICQoJy51bmNoZWNrLmJ1dHRvbicpLFxuXG5cdC8qKlxuXHQgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdXNlcm5hbWUgaW5wdXQgZmllbGQuXG5cdCAqIEB0eXBlIHtqUXVlcnl9XG5cdCAqL1xuXHQkdXNlcm5hbWU6ICQoJyN1c2VybmFtZScpLFxuXG5cdC8qKlxuXHQgKiBPcmlnaW5hbCB1c2VybmFtZSB2YWx1ZS5cblx0ICogQHR5cGUge3N0cmluZ31cblx0ICovXG5cdG9yaWdpbmFsTmFtZTonJyxcblxuXHQvKipcblx0ICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzLlxuXHQgKiBAdHlwZSB7b2JqZWN0fVxuXHQgKi9cblx0dmFsaWRhdGVSdWxlczoge1xuXHRcdHVzZXJuYW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSU5hbWVJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2V4aXN0UnVsZVt1c2VybmFtZS1lcnJvcl0nLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yVGhpc1VzZXJuYW1lSW5Ob3RBdmFpbGFibGUsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdFx0c2VjcmV0OiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnc2VjcmV0Jyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX1ZhbGlkYXRpb25BTUlTZWNyZXRJc0VtcHR5LFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHR9LFxuXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplcyB0aGUgbWFuYWdlciBtb2R1bGUuXG5cdCAqL1xuXHRpbml0aWFsaXplKCkge1xuXHRcdC8vIEluaXRpYWxpemUgZHJvcGRvd25zXG5cdFx0bWFuYWdlci4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG5cblx0XHQvLyBJbml0aWFsaXplIG1hc3RlciBjaGVja2JveGVzXG5cdFx0bWFuYWdlci4kbWFzdGVyQ2hlY2tCb3hlc1xuXHRcdFx0LmNoZWNrYm94KHtcblx0XHRcdFx0Ly8gQ2hlY2sgYWxsIGNoaWxkcmVuXG5cdFx0XHRcdG9uQ2hlY2tlZCgpIHtcblx0XHRcdFx0XHRjb25zdFxuXHRcdFx0XHRcdFx0JGNoaWxkQ2hlY2tib3ggPSAkKHRoaXMpLmNsb3Nlc3QoJy5jaGVja2JveCcpLnNpYmxpbmdzKCcubGlzdCcpLmZpbmQoJy5jaGVja2JveCcpO1xuXHRcdFx0XHRcdCRjaGlsZENoZWNrYm94LmNoZWNrYm94KCdjaGVjaycpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQvLyBVbmNoZWNrIGFsbCBjaGlsZHJlblxuXHRcdFx0XHRvblVuY2hlY2tlZCgpIHtcblx0XHRcdFx0XHRjb25zdFxuXHRcdFx0XHRcdFx0JGNoaWxkQ2hlY2tib3ggPSAkKHRoaXMpLmNsb3Nlc3QoJy5jaGVja2JveCcpLnNpYmxpbmdzKCcubGlzdCcpLmZpbmQoJy5jaGVja2JveCcpO1xuXHRcdFx0XHRcdCRjaGlsZENoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblxuXHRcdC8vIEluaXRpYWxpemUgY2hpbGQgY2hlY2tib3hlc1xuXHRcdG1hbmFnZXIuJGNoaWxkcmVuQ2hlY2tCb3hlc1xuXHRcdFx0LmNoZWNrYm94KHtcblx0XHRcdFx0Ly8gRmlyZSBvbiBsb2FkIHRvIHNldCBwYXJlbnQgdmFsdWVcblx0XHRcdFx0ZmlyZU9uSW5pdDogdHJ1ZSxcblx0XHRcdFx0Ly8gQ2hhbmdlIHBhcmVudCBzdGF0ZSBvbiBlYWNoIGNoaWxkIGNoZWNrYm94IGNoYW5nZVxuXHRcdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0XHRjb25zdCAkbGlzdEdyb3VwID0gJCh0aGlzKS5jbG9zZXN0KCcubGlzdCcpO1xuXHRcdFx0XHRcdGNvbnN0ICRwYXJlbnRDaGVja2JveCA9ICRsaXN0R3JvdXAuY2xvc2VzdCgnLml0ZW0nKS5jaGlsZHJlbignLmNoZWNrYm94Jyk7XG5cdFx0XHRcdFx0Y29uc3QgJGNoZWNrYm94ID0gJGxpc3RHcm91cC5maW5kKCcuY2hlY2tib3gnKTtcblx0XHRcdFx0XHRsZXQgYWxsQ2hlY2tlZCA9IHRydWU7XG5cdFx0XHRcdFx0bGV0IGFsbFVuY2hlY2tlZCA9IHRydWU7XG5cblx0XHRcdFx0XHQvLyBDaGVjayBpZiBhbGwgb3RoZXIgc2libGluZ3MgYXJlIGNoZWNrZWQgb3IgdW5jaGVja2VkXG5cdFx0XHRcdFx0JGNoZWNrYm94LmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0aWYgKCQodGhpcykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuXHRcdFx0XHRcdFx0XHRhbGxVbmNoZWNrZWQgPSBmYWxzZTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGFsbENoZWNrZWQgPSBmYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdC8vIFNldCBwYXJlbnQgY2hlY2tib3ggc3RhdGUsIGJ1dCBkb24ndCB0cmlnZ2VyIGl0cyBvbkNoYW5nZSBjYWxsYmFja1xuXHRcdFx0XHRcdGlmIChhbGxDaGVja2VkKSB7XG5cdFx0XHRcdFx0XHQkcGFyZW50Q2hlY2tib3guY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChhbGxVbmNoZWNrZWQpIHtcblx0XHRcdFx0XHRcdCRwYXJlbnRDaGVja2JveC5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkcGFyZW50Q2hlY2tib3guY2hlY2tib3goJ3NldCBpbmRldGVybWluYXRlJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cblx0XHQvLyBIYW5kbGUgdW5jaGVjayBidXR0b24gY2xpY2tcblx0XHRtYW5hZ2VyLiR1bkNoZWNrQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRtYW5hZ2VyLiRhbGxDaGVja0JveGVzLmNoZWNrYm94KCd1bmNoZWNrJyk7XG5cdFx0fSk7XG5cblx0XHQvLyBIYW5kbGUgdXNlcm5hbWUgY2hhbmdlXG5cdFx0bWFuYWdlci4kdXNlcm5hbWUub24oJ2NoYW5nZScsICh2YWx1ZSk9Pntcblx0XHRcdGNvbnN0IHVzZXJJZCA9IG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywnaWQnKTtcblx0XHRcdGNvbnN0IG5ld1ZhbHVlID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCd1c2VybmFtZScpO1xuXHRcdFx0bWFuYWdlci5jaGVja0F2YWlsYWJpbGl0eShtYW5hZ2VyLm9yaWdpbmFsTmFtZSwgbmV3VmFsdWUsICd1c2VybmFtZScsIHVzZXJJZCk7XG5cdFx0fSk7XG5cdFx0bWFuYWdlci5pbml0aWFsaXplRm9ybSgpO1xuXHRcdG1hbmFnZXIub3JpZ2luYWxOYW1lID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCd1c2VybmFtZScpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBDaGVja3MgaWYgdGhlIHVzZXJuYW1lIGRvZXNuJ3QgZXhpc3QgaW4gdGhlIGRhdGFiYXNlLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gb2xkTmFtZSAtIFRoZSBvbGQgdXNlcm5hbWUuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOYW1lIC0gVGhlIG5ldyB1c2VybmFtZS5cblx0ICogQHBhcmFtIHtzdHJpbmd9IGNzc0NsYXNzTmFtZSAtIFRoZSBDU1MgY2xhc3MgbmFtZS5cblx0ICogQHBhcmFtIHtzdHJpbmd9IHVzZXJJZCAtIFRoZSB1c2VyIElELlxuXHQgKi9cblx0Y2hlY2tBdmFpbGFiaWxpdHkob2xkTmFtZSwgbmV3TmFtZSwgY3NzQ2xhc3NOYW1lID0gJ3VzZXJuYW1lJywgdXNlcklkID0gJycpIHtcblx0XHRpZiAob2xkTmFtZSA9PT0gbmV3TmFtZSkge1xuXHRcdFx0JChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLW1hbmFnZXJzL2F2YWlsYWJsZS97dmFsdWV9YCxcblx0XHRcdHN0YXRlQ29udGV4dDogYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0YmVmb3JlU2VuZChzZXR0aW5ncykge1xuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRcdFx0cmVzdWx0LnVybERhdGEgPSB7XG5cdFx0XHRcdFx0dmFsdWU6IG5ld05hbWUsXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5uYW1lQXZhaWxhYmxlKSB7XG5cdFx0XHRcdFx0JChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAodXNlcklkLmxlbmd0aCA+IDAgJiYgcmVzcG9uc2UudXNlcklkID09PSB1c2VySWQpIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkuYWRkQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblxuXHQvKipcblx0ICogQ2FsbGJhY2sgZnVuY3Rpb24gYmVmb3JlIHNlbmRpbmcgdGhlIGZvcm0uXG5cdCAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIFNldHRpbmdzIG9iamVjdCBmb3IgdGhlIEFKQVggcmVxdWVzdC5cblx0ICogQHJldHVybnMge29iamVjdH0gLSBNb2RpZmllZCBzZXR0aW5ncyBvYmplY3QuXG5cdCAqL1xuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBtYW5hZ2VyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBzZW5kaW5nIHRoZSBmb3JtLlxuXHQgKi9cblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXHRcdC8vIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIHNlbmRpbmcgdGhlIGZvcm1cblx0fSxcblxuXHQvKipcblx0ICogSW5pdGlhbGl6ZXMgdGhlIGZvcm0uXG5cdCAqL1xuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHRGb3JtLiRmb3JtT2JqID0gbWFuYWdlci4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFuYWdlci52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG1hbmFnZXIuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG1hbmFnZXIuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxuXG59O1xuXG4vLyBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIHVuaXF1ZW5lc3Mgb2YgdXNlcm5hbWVcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRtYW5hZ2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19