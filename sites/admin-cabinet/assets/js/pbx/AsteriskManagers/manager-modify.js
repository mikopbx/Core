"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXItbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm1hbmFnZXIiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJG1hc3RlckNoZWNrQm94ZXMiLCIkY2hpbGRyZW5DaGVja0JveGVzIiwiJGFsbENoZWNrQm94ZXMiLCIkdW5DaGVja0J1dHRvbiIsIiR1c2VybmFtZSIsIm9yaWdpbmFsTmFtZSIsInZhbGlkYXRlUnVsZXMiLCJ1c2VybmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJhbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHkiLCJhbV9FcnJvclRoaXNVc2VybmFtZUluTm90QXZhaWxhYmxlIiwic2VjcmV0IiwiYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHkiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsIiRjaGlsZENoZWNrYm94IiwiY2xvc2VzdCIsInNpYmxpbmdzIiwiZmluZCIsIm9uVW5jaGVja2VkIiwiZmlyZU9uSW5pdCIsIm9uQ2hhbmdlIiwiJGxpc3RHcm91cCIsIiRwYXJlbnRDaGVja2JveCIsImNoaWxkcmVuIiwiJGNoZWNrYm94IiwiYWxsQ2hlY2tlZCIsImFsbFVuY2hlY2tlZCIsImVhY2giLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInZhbHVlIiwidXNlcklkIiwiZm9ybSIsIm5ld1ZhbHVlIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJpbml0aWFsaXplRm9ybSIsIm9sZE5hbWUiLCJuZXdOYW1lIiwiY3NzQ2xhc3NOYW1lIiwicGFyZW50IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJzdGF0ZUNvbnRleHQiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJ1cmxEYXRhIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJuYW1lQXZhaWxhYmxlIiwibGVuZ3RoIiwiY2JCZWZvcmVTZW5kRm9ybSIsImRhdGEiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUVBLElBQU1BLE9BQU8sR0FBRztBQUNmQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQURJO0FBQ2dCO0FBQy9CQyxFQUFBQSxVQUFVLEVBQUVELENBQUMsQ0FBQyw2QkFBRCxDQUZFO0FBRStCO0FBQzlDRSxFQUFBQSxpQkFBaUIsRUFBRUYsQ0FBQyxDQUFDLHVDQUFELENBSEw7QUFHZ0Q7QUFDL0RHLEVBQUFBLG1CQUFtQixFQUFFSCxDQUFDLENBQUMsc0NBQUQsQ0FKUDtBQUlrRDtBQUNqRUksRUFBQUEsY0FBYyxFQUFFSixDQUFDLENBQUMsZ0NBQUQsQ0FMRjtBQUtzQztBQUNyREssRUFBQUEsY0FBYyxFQUFFTCxDQUFDLENBQUMsaUJBQUQsQ0FORjtBQU13QjtBQUN2Q00sRUFBQUEsU0FBUyxFQUFFTixDQUFDLENBQUMsV0FBRCxDQVBHO0FBT2E7QUFDNUJPLEVBQUFBLFlBQVksRUFBQyxFQVJFO0FBUUU7QUFDakJDLEVBQUFBLGFBQWEsRUFBRTtBQUNkO0FBQ0FDLElBQUFBLFFBQVEsRUFBRTtBQUNUQyxNQUFBQSxVQUFVLEVBQUUsVUFESDtBQUVUQyxNQUFBQSxLQUFLLEVBQUUsQ0FDTjtBQUNDQyxRQUFBQSxJQUFJLEVBQUUsT0FEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGekIsT0FETSxFQUtOO0FBQ0NILFFBQUFBLElBQUksRUFBRSwyQkFEUDtBQUVDQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FB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QixZQUF0QixDQUFkO0FBQ0EsV0FBT2dCLE1BQVA7QUFDQSxHQW5KYztBQW9KZlEsRUFBQUEsZUFwSmUsNkJBb0pHLENBQ2pCO0FBQ0EsR0F0SmM7QUF1SmZyQixFQUFBQSxjQXZKZSw0QkF1SkU7QUFDaEI7QUFDQXNCLElBQUFBLElBQUksQ0FBQ3BFLFFBQUwsR0FBZ0JELE9BQU8sQ0FBQ0MsUUFBeEI7QUFDQW9FLElBQUFBLElBQUksQ0FBQ2QsR0FBTCxhQUFjQyxhQUFkO0FBQ0FhLElBQUFBLElBQUksQ0FBQzNELGFBQUwsR0FBcUJWLE9BQU8sQ0FBQ1UsYUFBN0I7QUFDQTJELElBQUFBLElBQUksQ0FBQ0gsZ0JBQUwsR0FBd0JsRSxPQUFPLENBQUNrRSxnQkFBaEM7QUFDQUcsSUFBQUEsSUFBSSxDQUFDRCxlQUFMLEdBQXVCcEUsT0FBTyxDQUFDb0UsZUFBL0I7QUFDQUMsSUFBQUEsSUFBSSxDQUFDaEQsVUFBTDtBQUNBO0FBL0pjLENBQWhCLEMsQ0FtS0E7O0FBQ0FuQixDQUFDLENBQUNvRSxFQUFGLENBQUsxQixJQUFMLENBQVVlLFFBQVYsQ0FBbUI5QyxLQUFuQixDQUF5QjBELFNBQXpCLEdBQXFDLFVBQUM3QixLQUFELEVBQVE4QixTQUFSO0FBQUEsU0FBc0J0RSxDQUFDLFlBQUtzRSxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7O0FBRUF2RSxDQUFDLENBQUN3RSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCM0UsRUFBQUEsT0FBTyxDQUFDcUIsVUFBUjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtICovXG5cbmNvbnN0IG1hbmFnZXIgPSB7XG5cdCRmb3JtT2JqOiAkKCcjc2F2ZS1hbWktZm9ybScpLCAvLyBGb3JtIG9iamVjdFxuXHQkZHJvcERvd25zOiAkKCcjc2F2ZS1hbWktZm9ybSAudWkuZHJvcGRvd24nKSwgLy8gRHJvcGRvd24gZWxlbWVudHNcblx0JG1hc3RlckNoZWNrQm94ZXM6ICQoJyNzYXZlLWFtaS1mb3JtIC5saXN0IC5tYXN0ZXIuY2hlY2tib3gnKSwgLy8gTWFzdGVyIGNoZWNrYm94IGVsZW1lbnRzXG5cdCRjaGlsZHJlbkNoZWNrQm94ZXM6ICQoJyNzYXZlLWFtaS1mb3JtIC5saXN0IC5jaGlsZC5jaGVja2JveCcpLCAgLy8gQ2hpbGQgY2hlY2tib3ggZWxlbWVudHNcblx0JGFsbENoZWNrQm94ZXM6ICQoJyNzYXZlLWFtaS1mb3JtIC5saXN0IC5jaGVja2JveCcpLCAvLyBBbGwgY2hlY2tib3ggZWxlbWVudHNcblx0JHVuQ2hlY2tCdXR0b246ICQoJy51bmNoZWNrLmJ1dHRvbicpLCAgLy8gVW5jaGVjayBidXR0b24gZWxlbWVudFxuXHQkdXNlcm5hbWU6ICQoJyN1c2VybmFtZScpLCAgLy8gVXNlcm5hbWUgaW5wdXQgZmllbGRcblx0b3JpZ2luYWxOYW1lOicnLCAvLyBPcmlnaW5hbCB1c2VybmFtZSB2YWx1ZVxuXHR2YWxpZGF0ZVJ1bGVzOiB7XG5cdFx0Ly8gVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzXG5cdFx0dXNlcm5hbWU6IHtcblx0XHRcdGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG5cdFx0XHRydWxlczogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHlwZTogJ2VtcHR5Jyxcblx0XHRcdFx0XHRwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV9WYWxpZGF0aW9uQU1JTmFtZUlzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0eXBlOiAnZXhpc3RSdWxlW3VzZXJuYW1lLWVycm9yXScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JUaGlzVXNlcm5hbWVJbk5vdEF2YWlsYWJsZSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0XHRzZWNyZXQ6IHtcblx0XHRcdGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuYW1fVmFsaWRhdGlvbkFNSVNlY3JldElzRW1wdHksXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH0sXG5cdH0sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0Ly8gSW5pdGlhbGl6ZSBkcm9wZG93bnNcblx0XHRtYW5hZ2VyLiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblxuXHRcdC8vIEluaXRpYWxpemUgbWFzdGVyIGNoZWNrYm94ZXNcblx0XHRtYW5hZ2VyLiRtYXN0ZXJDaGVja0JveGVzXG5cdFx0XHQuY2hlY2tib3goe1xuXHRcdFx0XHQvLyBDaGVjayBhbGwgY2hpbGRyZW5cblx0XHRcdFx0b25DaGVja2VkKCkge1xuXHRcdFx0XHRcdGNvbnN0XG5cdFx0XHRcdFx0XHQkY2hpbGRDaGVja2JveCA9ICQodGhpcykuY2xvc2VzdCgnLmNoZWNrYm94Jykuc2libGluZ3MoJy5saXN0JykuZmluZCgnLmNoZWNrYm94Jyk7XG5cdFx0XHRcdFx0JGNoaWxkQ2hlY2tib3guY2hlY2tib3goJ2NoZWNrJyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdC8vIFVuY2hlY2sgYWxsIGNoaWxkcmVuXG5cdFx0XHRcdG9uVW5jaGVja2VkKCkge1xuXHRcdFx0XHRcdGNvbnN0XG5cdFx0XHRcdFx0XHQkY2hpbGRDaGVja2JveCA9ICQodGhpcykuY2xvc2VzdCgnLmNoZWNrYm94Jykuc2libGluZ3MoJy5saXN0JykuZmluZCgnLmNoZWNrYm94Jyk7XG5cdFx0XHRcdFx0JGNoaWxkQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXG5cdFx0Ly8gSW5pdGlhbGl6ZSBjaGlsZCBjaGVja2JveGVzXG5cdFx0bWFuYWdlci4kY2hpbGRyZW5DaGVja0JveGVzXG5cdFx0XHQuY2hlY2tib3goe1xuXHRcdFx0XHQvLyBGaXJlIG9uIGxvYWQgdG8gc2V0IHBhcmVudCB2YWx1ZVxuXHRcdFx0XHRmaXJlT25Jbml0OiB0cnVlLFxuXHRcdFx0XHQvLyBDaGFuZ2UgcGFyZW50IHN0YXRlIG9uIGVhY2ggY2hpbGQgY2hlY2tib3ggY2hhbmdlXG5cdFx0XHRcdG9uQ2hhbmdlKCkge1xuXHRcdFx0XHRcdGNvbnN0ICRsaXN0R3JvdXAgPSAkKHRoaXMpLmNsb3Nlc3QoJy5saXN0Jyk7XG5cdFx0XHRcdFx0Y29uc3QgJHBhcmVudENoZWNrYm94ID0gJGxpc3RHcm91cC5jbG9zZXN0KCcuaXRlbScpLmNoaWxkcmVuKCcuY2hlY2tib3gnKTtcblx0XHRcdFx0XHRjb25zdCAkY2hlY2tib3ggPSAkbGlzdEdyb3VwLmZpbmQoJy5jaGVja2JveCcpO1xuXHRcdFx0XHRcdGxldCBhbGxDaGVja2VkID0gdHJ1ZTtcblx0XHRcdFx0XHRsZXQgYWxsVW5jaGVja2VkID0gdHJ1ZTtcblxuXHRcdFx0XHRcdC8vIENoZWNrIGlmIGFsbCBvdGhlciBzaWJsaW5ncyBhcmUgY2hlY2tlZCBvciB1bmNoZWNrZWRcblx0XHRcdFx0XHQkY2hlY2tib3guZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRpZiAoJCh0aGlzKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG5cdFx0XHRcdFx0XHRcdGFsbFVuY2hlY2tlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0YWxsQ2hlY2tlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0Ly8gU2V0IHBhcmVudCBjaGVja2JveCBzdGF0ZSwgYnV0IGRvbid0IHRyaWdnZXIgaXRzIG9uQ2hhbmdlIGNhbGxiYWNrXG5cdFx0XHRcdFx0aWYgKGFsbENoZWNrZWQpIHtcblx0XHRcdFx0XHRcdCRwYXJlbnRDaGVja2JveC5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFsbFVuY2hlY2tlZCkge1xuXHRcdFx0XHRcdFx0JHBhcmVudENoZWNrYm94LmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCRwYXJlbnRDaGVja2JveC5jaGVja2JveCgnc2V0IGluZGV0ZXJtaW5hdGUnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblxuXHRcdC8vIEhhbmRsZSB1bmNoZWNrIGJ1dHRvbiBjbGlja1xuXHRcdG1hbmFnZXIuJHVuQ2hlY2tCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdG1hbmFnZXIuJGFsbENoZWNrQm94ZXMuY2hlY2tib3goJ3VuY2hlY2snKTtcblx0XHR9KTtcblxuXHRcdC8vIEhhbmRsZSB1c2VybmFtZSBjaGFuZ2Vcblx0XHRtYW5hZ2VyLiR1c2VybmFtZS5vbignY2hhbmdlJywgKHZhbHVlKT0+e1xuXHRcdFx0Y29uc3QgdXNlcklkID0gbWFuYWdlci4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpZCcpO1xuXHRcdFx0Y29uc3QgbmV3VmFsdWUgPSBtYW5hZ2VyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ3VzZXJuYW1lJyk7XG5cdFx0XHRtYW5hZ2VyLmNoZWNrQXZhaWxhYmlsaXR5KG1hbmFnZXIub3JpZ2luYWxOYW1lLCBuZXdWYWx1ZSwgJ3VzZXJuYW1lJywgdXNlcklkKTtcblx0XHR9KTtcblx0XHRtYW5hZ2VyLmluaXRpYWxpemVGb3JtKCk7XG5cdFx0bWFuYWdlci5vcmlnaW5hbE5hbWUgPSBtYW5hZ2VyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsJ3VzZXJuYW1lJyk7XG5cdH0sXG5cdC8qKlxuXHQgKiBDaGVja3MgaWYgdXNlcm5hbWVcblx0IGRvZXNuJ3QgZXhpc3QgaW4gdGhlIGRhdGFiYXNlXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBvbGROYW1lIC0gVGhlIG9sZCB1c2VybmFtZVxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbmV3TmFtZSAtIFRoZSBuZXcgdXNlcm5hbWVcblx0ICogQHBhcmFtIHtzdHJpbmd9IGNzc0NsYXNzTmFtZSAtIFRoZSBDU1MgY2xhc3MgbmFtZVxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdXNlcklkIC0gVGhlIHVzZXIgSURcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRjaGVja0F2YWlsYWJpbGl0eShvbGROYW1lLCBuZXdOYW1lLCBjc3NDbGFzc05hbWUgPSAndXNlcm5hbWUnLCB1c2VySWQgPSAnJykge1xuXHRcdGlmIChvbGROYW1lID09PSBuZXdOYW1lKSB7XG5cdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvYXZhaWxhYmxlL3t2YWx1ZX1gLFxuXHRcdFx0c3RhdGVDb250ZXh0OiBgLnVpLmlucHV0LiR7Y3NzQ2xhc3NOYW1lfWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRiZWZvcmVTZW5kKHNldHRpbmdzKSB7XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdFx0XHRyZXN1bHQudXJsRGF0YSA9IHtcblx0XHRcdFx0XHR2YWx1ZTogbmV3TmFtZSxcblx0XHRcdFx0fTtcblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLm5hbWVBdmFpbGFibGUpIHtcblx0XHRcdFx0XHQkKGAudWkuaW5wdXQuJHtjc3NDbGFzc05hbWV9YCkucGFyZW50KCkucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cdFx0XHRcdFx0JChgIyR7Y3NzQ2xhc3NOYW1lfS1lcnJvcmApLmFkZENsYXNzKCdoaWRkZW4nKTtcblx0XHRcdFx0fSBlbHNlIGlmICh1c2VySWQubGVuZ3RoID4gMCAmJiByZXNwb25zZS51c2VySWQgPT09IHVzZXJJZCkge1xuXHRcdFx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoYC51aS5pbnB1dC4ke2Nzc0NsYXNzTmFtZX1gKS5wYXJlbnQoKS5hZGRDbGFzcygnZXJyb3InKTtcblx0XHRcdFx0XHQkKGAjJHtjc3NDbGFzc05hbWV9LWVycm9yYCkucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxuXHRjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG5cdFx0Y29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cdFx0cmVzdWx0LmRhdGEgPSBtYW5hZ2VyLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9LFxuXHRjYkFmdGVyU2VuZEZvcm0oKSB7XG5cdFx0Ly8gQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgc2VuZGluZyB0aGUgZm9ybVxuXHR9LFxuXHRpbml0aWFsaXplRm9ybSgpIHtcblx0XHQvLyBJbml0aWFsaXplIHRoZSBmb3JtXG5cdFx0Rm9ybS4kZm9ybU9iaiA9IG1hbmFnZXIuJGZvcm1PYmo7XG5cdFx0Rm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLW1hbmFnZXJzL3NhdmVgO1xuXHRcdEZvcm0udmFsaWRhdGVSdWxlcyA9IG1hbmFnZXIudmFsaWRhdGVSdWxlcztcblx0XHRGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBtYW5hZ2VyLmNiQmVmb3JlU2VuZEZvcm07XG5cdFx0Rm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBtYW5hZ2VyLmNiQWZ0ZXJTZW5kRm9ybTtcblx0XHRGb3JtLmluaXRpYWxpemUoKTtcblx0fSxcblxufTtcblxuLy8gQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyB1bmlxdWVuZXNzIG9mIHVzZXJuYW1lXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0bWFuYWdlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==