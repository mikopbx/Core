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
var manager = {
  $formObj: $('#save-ami-form'),
  // Form object
  $dropDowns: $('#save-ami-form .ui.dropdown'),
  // Dropdown elements
  $masterCheckBoxes: $('#save-ami-form .list .master.checkbox'),
  // Master checkbox elements
  $childrenCheckBoxes: $('#save-ami-form .list .child.checkbox'),
  // Child checkbox elements
  $allCheckBoxes: $('#save-ami-form .list .checkbox'),
  // All checkbox elements
  $unCheckButton: $('.uncheck.button'),
  // Uncheck button element
  $username: $('#username'),
  // Username input field
  originalName: '',
  // Original username value
  validateRules: {
    // Validation rules for the form fields
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
   * Checks if username
   doesn't exist in the database
   * @param {string} oldName - The old username
   * @param {string} newName - The new username
   * @param {string} cssClassName - The CSS class name
   * @param {string} userId - The user ID
   * @returns {*}
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
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = manager.$formObj.form('get values');
    return result;
  },
  cbAfterSendForm: function cbAfterSendForm() {// Callback function after sending the form
  },
  initializeForm: function initializeForm() {
    // Initialize the form
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJG1hc3RlckNoZWNrQm94ZXMiLCIkY2hpbGRyZW5DaGVja0JveGVzIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiR1c2VybmFtZSIsIm9yaWdpbmFsTmFtZSIsInZhbGlkYXRlUnVsZXMiLCJ1c2VybmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHkiLCJhbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlIiwic2VjcmV0IiwiYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHkiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIiRjaGlsZENoZWNrYm94IiwiY2xvc2VzdCIsInNpYmxpbmdzIiwiZmluZCIsIm9uVW5jaGVja2VkIiwiZmlyZU9uSW5pdCIsIm9uQ2hhbmdlIiwiJGxpc3RHcm91cCIsIiRwYXJlbnRDaGVja2JveCIsImNoaWxkcmVuIiwiJGNoZWNrYm94IiwiYWxsQ2hlY2tlZCIsImFsbFVuY2hlY2tlZCIsImVhY2giLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInZhbHVlIiwidXNlcklkIiwiZm9ybSIsIm5ld1ZhbHVlIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJpbml0aWFsaXplRm9ybSIsIm9sZE5hbWUiLCJuZXdOYW1lIiwiY3NzQ2xhc3NOYW1lIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJuYW1lQXZhaWxhYmxlIiwibGVuZ3RoIiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUVBLElBQU1BLE9BQU8sR0FBRztBQUNmQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURJO0FBQ2dCO0FBQy9CQyxFQUFBQSxVQUFVLEVBQUVELENBQUMsQ0FBQyw2QkFBRCxDQUZFO0FBRStCO0FBQzlDRSxFQUFBQSxpQkFBaUIsRUFBRUYsQ0FBQyxDQUFDLHVDQUFELENBSEw7QUFHZ0Q7QUFDL0RHLEVBQUFBLG1CQUFtQixFQUFFSCxDQUFDLENBQUMsc0NBQUQsQ0FKUDtBQUlrRDtBQUNqRUksRUFBQUEsY0FBYyxFQUFFSixDQUFDLENBQUMsZ0NBQUQsQ0FMRjtBQUtzQztBQUNyREssRUFBQUEsY0FBYyxFQUFFTCxDQUFDLENBQUMsaUJBQUQsQ0FORjtBQU13QjtBQUN2Q00sRUFBQUEsU0FBUyxFQUFFTixDQUFDLENBQUMsV0FBRCxDQVBHO0FBT2E7QUFDNUJPLEVBQUFBLFlBQVksRUFBQyxFQVJFO0FBUUU7QUFDakJDLEVBQUFBLGFBQWEsRUFBRTtBQUNkO0FBQ0FDLElBQUFBLFFBQVEsRUFBRTtBQUNUQyxNQUFBQSxVQUFVLEVBQUUsVUFESDtBQUVUQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDQyxRQUFBQSxJQUFJLEVBQUUsT0FEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGekIsT0FETSxFQUtOO0FBQ0NILFFBQUFBLElBQUksRUFBRSwyQkFEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FB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QixZQUF0QixDQUFkO0FBQ0EsV0FBT2dCLE1BQVA7QUFDQSxHQW5KYztBQW9KZlEsRUFBQUEsZUFwSmUsNkJBb0pHLENBQ2pCO0FBQ0EsR0F0SmM7QUF1SmZyQixFQUFBQSxjQXZKZSw0QkF1SkU7QUFDaEI7QUFDQXNCLElBQUFBLElBQUksQ0FBQ3BFLFFBQUwsR0FBZ0JELE9BQU8sQ0FBQ0MsUUFBeEI7QUFDQW9FLElBQUFBLElBQUksQ0FBQ2QsR0FBTCxhQUFjQyxhQUFkO0FBQ0FhLElBQUFBLElBQUksQ0FBQzNELGFBQUwsR0FBcUJWLE9BQU8sQ0FBQ1UsYUFBN0I7QUFDQTJELElBQUFBLElBQUksQ0FBQ0gsZ0JBQUwsR0FBd0JsRSxPQUFPLENBQUNrRSxnQkFBaEM7QUFDQUcsSUFBQUEsSUFBSSxDQUFDRCxlQUFMLEdBQXVCcEUsT0FBTyxDQUFDb0UsZUFBL0I7QUFDQUMsSUFBQUEsSUFBSSxDQUFDaEQsVUFBTDtBQUNBO0FBL0pjLENBQWhCLEMsQ0FtS0E7O0FBQ0FuQixDQUFDLENBQUNvRSxFQUFGLENBQUsxQixJQUFMLENBQVVlLFFBQVYsQ0FBbUI5QyxLQUFuQixDQUF5QjBELFNBQXpCLEdBQXFDLFVBQUM3QixLQUFELEVBQVE4QixTQUFSO0FBQUEsU0FBc0J0RSxDQUFDLFlBQUtzRSxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7O0FBRUF2RSxDQUFDLENBQUN3RSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCM0UsRUFBQUEsT0FBTyxDQUFDcUIsVUFBUjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0gKi9cblxuY29uc3QgbWFuYWdlciA9IHtcblx0JGZvcm1PYmo6ICQoJyNzYXZlLWFtaS1mb3JtJyksIC8vIEZvcm0gb2JqZWN0XG5cdCRkcm9wRG93bnM6ICQoJyNzYXZlLWFtaS1mb3JtIC51aS5kcm9wZG93bicpLCAvLyBEcm9wZG93biBlbGVtZW50c1xuXHQkbWFzdGVyQ2hlY2tCb3hlczogJCgnI3NhdmUtYW1pLWZvcm0gLmxpc3QgLm1hc3Rlci5jaGVja2JveCcpLCAvLyBNYXN0ZXIgY2hlY2tib3ggZWxlbWVudHNcblx0JGNoaWxkcmVuQ2hlY2tCb3hlczogJCgnI3NhdmUtYW1pLWZvcm0gLmxpc3QgLmNoaWxkLmNoZWNrYm94JyksICAvLyBDaGlsZCBjaGVja2JveCBlbGVtZW50c1xuXHQkYWxsQ2hlY2tCb3hlczogJCgnI3NhdmUtYW1pLWZvcm0gLmxpc3QgLmNoZWNrYm94JyksIC8vIEFsbCBjaGVja2JveCBlbGVtZW50c1xuXHQkdW5DaGVja0J1dHRvbjogJCgnLnVuY2hlY2suYnV0dG9uJyksICAvLyBVbmNoZWNrIGJ1dHRvbiBlbGVtZW50XG5cdCR1c2VybmFtZTogJCgnI3VzZXJuYW1lJyksICAvLyBVc2VybmFtZSBpbnB1dCBmaWVsZFxuXHRvcmlnaW5hbE5hbWU6JycsIC8vIE9yaWdpbmFsIHVzZXJuYW1lIHZhbHVlXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHQvLyBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHNcblx0XHR1c2VybmFtZToge1xuXHRcdFx0aWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcblx0XHRcdHJ1bGVzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZW1wdHknLFxuXHRcdFx0XHRcdHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmFtX1ZhbGlkYXRpb25BTUlOYW1lSXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdleGlzdFJ1bGVbdXNlcm5hbWUtZXJyb3JdJyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlLFxuXHRcdFx0XHR9LFxuXHRcdFx0XSxcblx0XHR9LFxuXHRcdHNlY3JldDoge1xuXHRcdFx0aWRlbnRpZmllcjogJ3NlY3JldCcsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9WYWxpZGF0aW9uQU1JU2VjcmV0SXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuXHRcdG1hbmFnZXIuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXG5cdFx0Ly8gSW5pdGlhbGl6ZSBtYXN0ZXIgY2hlY2tib3hlc1xuXHRcdG1hbmFnZXIuJG1hc3RlckNoZWNrQm94ZXNcblx0XHRcdC5jaGVja2JveCh7XG5cdFx0XHRcdC8vIENoZWNrIGFsbCBjaGlsZHJlblxuXHRcdFx0XHRvbkNoZWNrZWQoKSB7XG5cdFx0XHRcdFx0Y29uc3Rcblx0XHRcdFx0XHRcdCRjaGlsZENoZWNrYm94ID0gJCh0aGlzKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5zaWJsaW5ncygnLmxpc3QnKS5maW5kKCcuY2hlY2tib3gnKTtcblx0XHRcdFx0XHQkY2hpbGRDaGVja2JveC5jaGVja2JveCgnY2hlY2snKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Ly8gVW5jaGVjayBhbGwgY2hpbGRyZW5cblx0XHRcdFx0b25VbmNoZWNrZWQoKSB7XG5cdFx0XHRcdFx0Y29uc3Rcblx0XHRcdFx0XHRcdCRjaGlsZENoZWNrYm94ID0gJCh0aGlzKS5jbG9zZXN0KCcuY2hlY2tib3gnKS5zaWJsaW5ncygnLmxpc3QnKS5maW5kKCcuY2hlY2tib3gnKTtcblx0XHRcdFx0XHQkY2hpbGRDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cblx0XHQvLyBJbml0aWFsaXplIGNoaWxkIGNoZWNrYm94ZXNcblx0XHRtYW5hZ2VyLiRjaGlsZHJlbkNoZWNrQm94ZXNcblx0XHRcdC5jaGVja2JveCh7XG5cdFx0XHRcdC8vIEZpcmUgb24gbG9hZCB0byBzZXQgcGFyZW50IHZhbHVlXG5cdFx0XHRcdGZpcmVPbkluaXQ6IHRydWUsXG5cdFx0XHRcdC8vIENoYW5nZSBwYXJlbnQgc3RhdGUgb24gZWFjaCBjaGlsZCBjaGVja2JveCBjaGFuZ2Vcblx0XHRcdFx0b25DaGFuZ2UoKSB7XG5cdFx0XHRcdFx0Y29uc3QgJGxpc3RHcm91cCA9ICQodGhpcykuY2xvc2VzdCgnLmxpc3QnKTtcblx0XHRcdFx0XHRjb25zdCAkcGFyZW50Q2hlY2tib3ggPSAkbGlzdEdyb3VwLmNsb3Nlc3QoJy5pdGVtJykuY2hpbGRyZW4oJy5jaGVja2JveCcpO1xuXHRcdFx0XHRcdGNvbnN0ICRjaGVja2JveCA9ICRsaXN0R3JvdXAuZmluZCgnLmNoZWNrYm94Jyk7XG5cdFx0XHRcdFx0bGV0IGFsbENoZWNrZWQgPSB0cnVlO1xuXHRcdFx0XHRcdGxldCBhbGxVbmNoZWNrZWQgPSB0cnVlO1xuXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgYWxsIG90aGVyIHNpYmxpbmdzIGFyZSBjaGVja2VkIG9yIHVuY2hlY2tlZFxuXHRcdFx0XHRcdCRjaGVja2JveC5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdGlmICgkKHRoaXMpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcblx0XHRcdFx0XHRcdFx0YWxsVW5jaGVja2VkID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRhbGxDaGVja2VkID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHQvLyBTZXQgcGFyZW50IGNoZWNrYm94IHN0YXRlLCBidXQgZG9uJ3QgdHJpZ2dlciBpdHMgb25DaGFuZ2UgY2FsbGJhY2tcblx0XHRcdFx0XHRpZiAoYWxsQ2hlY2tlZCkge1xuXHRcdFx0XHRcdFx0JHBhcmVudENoZWNrYm94LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYWxsVW5jaGVja2VkKSB7XG5cdFx0XHRcdFx0XHQkcGFyZW50Q2hlY2tib3guY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JHBhcmVudENoZWNrYm94LmNoZWNrYm94KCdzZXQgaW5kZXRlcm1pbmF0ZScpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXG5cdFx0Ly8gSGFuZGxlIHVuY2hlY2sgYnV0dG9uIGNsaWNrXG5cdFx0bWFuYWdlci4kdW5DaGVja0J1dHRvbi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0bWFuYWdlci4kYWxsQ2hlY2tCb3hlcy5jaGVja2JveCgndW5jaGVjaycpO1xuXHRcdH0pO1xuXG5cdFx0Ly8gSGFuZGxlIHVzZXJuYW1lIGNoYW5nZVxuXHRcdG1hbmFnZXIuJHVzZXJuYW1lLm9uKCdjaGFuZ2UnLCAodmFsdWUpPT57XG5cdFx0XHRjb25zdCB1c2VySWQgPSBtYW5hZ2VyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ2lkJyk7XG5cdFx0XHRjb25zdCBuZXdWYWx1ZSA9IG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywndXNlcm5hbWUnKTtcblx0XHRcdG1hbmFnZXIuY2hlY2tBdmFpbGFiaWxpdHkobWFuYWdlci5vcmlnaW5hbE5hbWUsIG5ld1ZhbHVlLCAndXNlcm5hbWUnLCB1c2VySWQpO1xuXHRcdH0pO1xuXHRcdG1hbmFnZXIuaW5pdGlhbGl6ZUZvcm0oKTtcblx0XHRtYW5hZ2VyLm9yaWdpbmFsTmFtZSA9IG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywndXNlcm5hbWUnKTtcblx0fSxcblx0LyoqXG5cdCAqIENoZWNrcyBpZiB1c2VybmFtZVxuXHQgZG9lc24ndCBleGlzdCBpbiB0aGUgZGF0YWJhc2Vcblx0ICogQHBhcmFtIHtzdHJpbmd9IG9sZE5hbWUgLSBUaGUgb2xkIHVzZXJuYW1lXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBuZXdOYW1lIC0gVGhlIG5ldyB1c2VybmFtZVxuXHQgKiBAcGFyYW0ge3N0cmluZ30gY3NzQ2xhc3NOYW1lIC0gVGhlIENTUyBjbGFzcyBuYW1lXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB1c2VySWQgLSBUaGUgdXNlciBJRFxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdGNoZWNrQXZhaWxhYmlsaXR5KG9sZE5hbWUsIG5ld05hbWUsIGNzc0NsYXNzTmFtZSA9ICd1c2VybmFtZScsIHVzZXJJZCA9ICcnKSB7XG5cdFx0aWYgKG9sZE5hbWUgPT09IG5ld05hbWUpIHtcblx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdCQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1hc3Rlcmlzay1tYW5hZ2Vycy9hdmFpbGFibGUve3ZhbHVlfWAsXG5cdFx0XHRzdGF0ZUNvbnRleHQ6IGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdGJlZm9yZVNlbmQoc2V0dGluZ3MpIHtcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0XHRcdHJlc3VsdC51cmxEYXRhID0ge1xuXHRcdFx0XHRcdHZhbHVlOiBuZXdOYW1lLFxuXHRcdFx0XHR9O1xuXHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UubmFtZUF2YWlsYWJsZSkge1xuXHRcdFx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHVzZXJJZC5sZW5ndGggPiAwICYmIHJlc3BvbnNlLnVzZXJJZCA9PT0gdXNlcklkKSB7XG5cdFx0XHRcdFx0JChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5hZGRDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0JChgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWApLnBhcmVudCgpLmFkZENsYXNzKCdlcnJvcicpO1xuXHRcdFx0XHRcdCQoYCMke2Nzc0NsYXNzTmFtZX0tZXJyb3JgKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcblx0XHRjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblx0XHRyZXN1bHQuZGF0YSA9IG1hbmFnZXIuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG5cdGNiQWZ0ZXJTZW5kRm9ybSgpIHtcblx0XHQvLyBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBzZW5kaW5nIHRoZSBmb3JtXG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdC8vIEluaXRpYWxpemUgdGhlIGZvcm1cblx0XHRGb3JtLiRmb3JtT2JqID0gbWFuYWdlci4kZm9ybU9iajtcblx0XHRGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gbWFuYWdlci52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG1hbmFnZXIuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG1hbmFnZXIuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxuXG59O1xuXG4vLyBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIHVuaXF1ZW5lc3Mgb2YgdXNlcm5hbWVcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSAodmFsdWUsIHBhcmFtZXRlcikgPT4gJChgIyR7cGFyYW1ldGVyfWApLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRtYW5hZ2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19