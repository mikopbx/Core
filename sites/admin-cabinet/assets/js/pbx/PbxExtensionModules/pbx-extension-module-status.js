"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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

/* global PbxApi, globalTranslate, UserMessage */

/**
 * Represents the status of an external module.
 * @class PbxExtensionStatus
 * @memberof module:pbxExtensionModuleModify
 */
var PbxExtensionStatus = /*#__PURE__*/function () {
  function PbxExtensionStatus() {
    _classCallCheck(this, PbxExtensionStatus);
  }

  _createClass(PbxExtensionStatus, [{
    key: "initialize",
    value:
    /**
     * Initializes the module status.
     * @param {string} uniqid - The unique ID of the module.
     * @param {boolean} [changeLabel=true] - Indicates whether to change the label text.
     */
    function initialize(uniqid) {
      var changeLabel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
      this.$toggle = $(".ui.toggle.checkbox[data-value=\"".concat(uniqid, "\"]"));
      this.$toggleSegment = $('#module-status-toggle-segment');
      this.$allToggles = $(".ui.toggle.checkbox");
      this.$statusIcon = $("tr#".concat(uniqid, " i.status-icon"));
      this.$toggleSegment.show();

      if (changeLabel) {
        this.$label = $(".ui.toggle.checkbox[data-value=\"".concat(uniqid, "\"]")).find('label');
      } else {
        this.$label = false;
      }

      this.uniqid = uniqid;
      this.$disabilityFields = $("tr#".concat(uniqid, " .disability"));
      var cbOnChecked = $.proxy(this.cbOnChecked, this);
      var cbOnUnchecked = $.proxy(this.cbOnUnchecked, this);
      this.$toggle.checkbox({
        onChecked: cbOnChecked,
        onUnchecked: cbOnUnchecked
      });
    }
    /**
     * Changes the label text.
     * @param {string} newText - The new label text.
     */

  }, {
    key: "changeLabelText",
    value: function changeLabelText(newText) {
      if (this.$label) {
        this.$label.text(newText);
      }
    }
    /**
     * Callback function when the module is checked.
     */

  }, {
    key: "cbOnChecked",
    value: function cbOnChecked() {
      this.$statusIcon.addClass('spinner loading icon');
      this.$allToggles.addClass('disabled');
      $('a.button').addClass('disabled');
      this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
      var cbAfterModuleEnable = $.proxy(this.cbAfterModuleEnable, this);
      PbxApi.ModulesEnableModule(this.uniqid, cbAfterModuleEnable);
    }
    /**
     * Callback function when the module is unchecked.
     */

  }, {
    key: "cbOnUnchecked",
    value: function cbOnUnchecked() {
      this.$statusIcon.addClass('spinner loading icon');
      this.$allToggles.addClass('disabled');
      $('a.button').addClass('disabled');
      this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
      var cbAfterModuleDisable = $.proxy(this.cbAfterModuleDisable, this);
      PbxApi.ModulesDisableModule(this.uniqid, cbAfterModuleDisable);
    }
    /**
     * Callback function after disabling the module.
     * @param {object} response - The response from the server.
     * @param {boolean} success - Indicates whether the request was successful.
     */

  }, {
    key: "cbAfterModuleDisable",
    value: function cbAfterModuleDisable(response, success) {
      if (success) {
        // Update UI to show module is disabled
        this.$toggle.checkbox('set unchecked');
        this.$statusIcon.removeClass('spinner loading icon');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled); // Trigger events to indicate module status and config data has changed

        var event = document.createEvent('Event');
        event.initEvent('ModuleStatusChanged', false, true);
        window.dispatchEvent(event);
        event.initEvent('ConfigDataChanged', false, true);
        window.dispatchEvent(event); // Disable input fields and show message for changed objects

        this.$disabilityFields.addClass('disabled');

        if (response.data.changedObjects !== undefined) {
          UserMessage.showMultiString(response.data.changedObjects, globalTranslate.ext_ModuleChangedObjects);
        } // Refresh the page to reflect changes is better to do in on module page using event ModuleStatusChanged subscription


        window.location.reload();
      } else {
        this.$toggle.checkbox('set checked');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
        this.$disabilityFields.removeClass('disabled');
        var $row = $("tr[data-id=".concat(this.uniqid, "]"));
        this.showModuleError($row, globalTranslate.ext_ModuleChangeStatusError, response.messages);
      }

      this.$allToggles.removeClass('disabled');
      $('a.button').removeClass('disabled');
      this.$statusIcon.removeClass('spinner loading icon');
    }
    /**
     * Callback function after enabling the module.
     * @param {object} response - The response from the server.
     * @param {boolean} success - Indicates whether the request was successful.
     */

  }, {
    key: "cbAfterModuleEnable",
    value: function cbAfterModuleEnable(response, success) {
      if (success) {
        $('.ui.message.ajax').remove(); // Update UI to show module is enabled

        this.$toggle.checkbox('set checked');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled); // Trigger events to indicate module status and config data has changed

        var event = document.createEvent('Event');
        event.initEvent('ModuleStatusChanged', false, true);
        window.dispatchEvent(event);
        event.initEvent('ConfigDataChanged', false, true);
        window.dispatchEvent(event); // Enable input fields and show message for changed objects

        this.$disabilityFields.removeClass('disabled');

        if (response.data.changedObjects !== undefined) {
          UserMessage.showMultiString(response.data.changedObjects, globalTranslate.ext_ModuleChangedObjects);
        } // Refresh the page to reflect changes is better to do in on module page using event ModuleStatusChanged subscription


        window.location.reload();
      } else {
        this.$toggle.checkbox('set unchecked');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
        this.$disabilityFields.addClass('disabled');
        var $row = $("tr[data-id=".concat(this.uniqid, "]"));
        this.showModuleError($row, globalTranslate.ext_ModuleChangeStatusError, response.messages);
      }

      this.$allToggles.removeClass('disabled');
      this.$statusIcon.removeClass('spinner loading icon');
      $('a.button').removeClass('disabled');
    }
    /**
     * Displays an error message related to module status in the UI.
     * @param {jQuery} $row - The jQuery object representing the row in the UI associated with the module.
     * @param {string} header - The header text for the error message.
     * @param {Object} messages - Detailed error messages to be displayed.
     */

  }, {
    key: "showModuleError",
    value: function showModuleError($row, header) {
      var messages = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

      if (messages === undefined) {
        return;
      }

      if ($row.length === 0) {
        if (messages.license !== undefined) {
          UserMessage.showLicenseError(globalTranslate.ext_ModuleLicenseProblem, messages.license);
        } else {
          UserMessage.showMultiString(messages, globalTranslate.ext_ModuleChangeStatusError);
        }

        return;
      }

      if (messages.license !== undefined) {
        var manageLink = "<br>".concat(globalTranslate.lic_ManageLicense, " <a href=\"").concat(Config.keyManagementUrl, "\" target=\"_blank\">").concat(Config.keyManagementSite, "</a>");
        messages.license.push(manageLink);
      }

      var textDescription = UserMessage.convertToText(messages);
      var htmlMessage = "<tr class=\"ui warning table-error-messages\">\n                                        <td colspan=\"5\">\n                                        <div class=\"ui center aligned icon header\">\n                                        <i class=\"exclamation triangle icon\"></i>\n                                          <div class=\"content\">\n                                            ".concat(header, "\n                                          </div>\n                                        </div>\n                                            <p>").concat(textDescription, "</p>\n                                        </div>\n                                        </td>\n                                    </tr>");
      $row.addClass('warning');
      $row.before(htmlMessage);
    }
  }]);

  return PbxExtensionStatus;
}(); // When the document is ready, initialize the external module status toggles.


$(document).ready(function () {
  var uniqId = $('#module-status-toggle').attr('data-value');

  if (uniqId) {
    var pageStatus = new PbxExtensionStatus();
    pageStatus.initialize(uniqId, true);
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJHRvZ2dsZVNlZ21lbnQiLCIkYWxsVG9nZ2xlcyIsIiRzdGF0dXNJY29uIiwic2hvdyIsIiRsYWJlbCIsImZpbmQiLCIkZGlzYWJpbGl0eUZpZWxkcyIsImNiT25DaGVja2VkIiwicHJveHkiLCJjYk9uVW5jaGVja2VkIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJvblVuY2hlY2tlZCIsIm5ld1RleHQiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJjaGFuZ2VMYWJlbFRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmciLCJjYkFmdGVyTW9kdWxlRW5hYmxlIiwiUGJ4QXBpIiwiTW9kdWxlc0VuYWJsZU1vZHVsZSIsImNiQWZ0ZXJNb2R1bGVEaXNhYmxlIiwiTW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJyZW1vdmVDbGFzcyIsImV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50Iiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsImRhdGEiLCJjaGFuZ2VkT2JqZWN0cyIsInVuZGVmaW5lZCIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X01vZHVsZUNoYW5nZWRPYmplY3RzIiwibG9jYXRpb24iLCJyZWxvYWQiLCJleHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkIiwiJHJvdyIsInNob3dNb2R1bGVFcnJvciIsImV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvciIsIm1lc3NhZ2VzIiwicmVtb3ZlIiwiaGVhZGVyIiwibGVuZ3RoIiwibGljZW5zZSIsInNob3dMaWNlbnNlRXJyb3IiLCJleHRfTW9kdWxlTGljZW5zZVByb2JsZW0iLCJtYW5hZ2VMaW5rIiwibGljX01hbmFnZUxpY2Vuc2UiLCJDb25maWciLCJrZXlNYW5hZ2VtZW50VXJsIiwia2V5TWFuYWdlbWVudFNpdGUiLCJwdXNoIiwidGV4dERlc2NyaXB0aW9uIiwiY29udmVydFRvVGV4dCIsImh0bWxNZXNzYWdlIiwiYmVmb3JlIiwicmVhZHkiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsImluaXRpYWxpemUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLGtCOzs7Ozs7OztBQUVGO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSSx3QkFBV0MsTUFBWCxFQUF1QztBQUFBLFVBQXBCQyxXQUFvQix1RUFBTixJQUFNO0FBQ25DLFdBQUtDLE9BQUwsR0FBZUMsQ0FBQyw0Q0FBb0NILE1BQXBDLFNBQWhCO0FBQ0EsV0FBS0ksY0FBTCxHQUFzQkQsQ0FBQyxDQUFDLCtCQUFELENBQXZCO0FBQ0EsV0FBS0UsV0FBTCxHQUFtQkYsQ0FBQyx1QkFBcEI7QUFDQSxXQUFLRyxXQUFMLEdBQW1CSCxDQUFDLGNBQU9ILE1BQVAsb0JBQXBCO0FBQ0EsV0FBS0ksY0FBTCxDQUFvQkcsSUFBcEI7O0FBQ0EsVUFBSU4sV0FBSixFQUFpQjtBQUNiLGFBQUtPLE1BQUwsR0FBY0wsQ0FBQyw0Q0FBb0NILE1BQXBDLFNBQUQsQ0FBaURTLElBQWpELENBQXNELE9BQXRELENBQWQ7QUFDSCxPQUZELE1BRU87QUFDSCxhQUFLRCxNQUFMLEdBQWMsS0FBZDtBQUNIOztBQUNELFdBQUtSLE1BQUwsR0FBY0EsTUFBZDtBQUNBLFdBQUtVLGlCQUFMLEdBQXlCUCxDQUFDLGNBQU9ILE1BQVAsa0JBQTFCO0FBQ0Es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SUFBQUEsVUFBVSxDQUFDQyxVQUFYLENBQXNCSCxNQUF0QixFQUE4QixJQUE5QjtBQUNIO0FBQ0osQ0FORCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBzdGF0dXMgb2YgYW4gZXh0ZXJuYWwgbW9kdWxlLlxuICogQGNsYXNzIFBieEV4dGVuc2lvblN0YXR1c1xuICogQG1lbWJlcm9mIG1vZHVsZTpwYnhFeHRlbnNpb25Nb2R1bGVNb2RpZnlcbiAqL1xuY2xhc3MgUGJ4RXh0ZW5zaW9uU3RhdHVzIHtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBtb2R1bGUgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1bmlxaWQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY2hhbmdlTGFiZWw9dHJ1ZV0gLSBJbmRpY2F0ZXMgd2hldGhlciB0byBjaGFuZ2UgdGhlIGxhYmVsIHRleHQuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSh1bmlxaWQsIGNoYW5nZUxhYmVsID0gdHJ1ZSkge1xuICAgICAgICB0aGlzLiR0b2dnbGUgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94W2RhdGEtdmFsdWU9XCIke3VuaXFpZH1cIl1gKTtcbiAgICAgICAgdGhpcy4kdG9nZ2xlU2VnbWVudCA9ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZS1zZWdtZW50Jyk7XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94YCk7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24gPSAkKGB0ciMke3VuaXFpZH0gaS5zdGF0dXMtaWNvbmApO1xuICAgICAgICB0aGlzLiR0b2dnbGVTZWdtZW50LnNob3coKTtcbiAgICAgICAgaWYgKGNoYW5nZUxhYmVsKSB7XG4gICAgICAgICAgICB0aGlzLiRsYWJlbCA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApLmZpbmQoJ2xhYmVsJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiRsYWJlbCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudW5pcWlkID0gdW5pcWlkO1xuICAgICAgICB0aGlzLiRkaXNhYmlsaXR5RmllbGRzID0gJChgdHIjJHt1bmlxaWR9IC5kaXNhYmlsaXR5YCk7XG4gICAgICAgIGNvbnN0IGNiT25DaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25DaGVja2VkLCB0aGlzKTtcbiAgICAgICAgY29uc3QgY2JPblVuY2hlY2tlZCA9ICQucHJveHkodGhpcy5jYk9uVW5jaGVja2VkLCB0aGlzKTtcbiAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZDogY2JPbkNoZWNrZWQsXG4gICAgICAgICAgICBvblVuY2hlY2tlZDogY2JPblVuY2hlY2tlZCxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hhbmdlcyB0aGUgbGFiZWwgdGV4dC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3VGV4dCAtIFRoZSBuZXcgbGFiZWwgdGV4dC5cbiAgICAgKi9cbiAgICBjaGFuZ2VMYWJlbFRleHQobmV3VGV4dCkge1xuICAgICAgICBpZiAodGhpcy4kbGFiZWwpIHtcbiAgICAgICAgICAgIHRoaXMuJGxhYmVsLnRleHQobmV3VGV4dCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIHRoZSBtb2R1bGUgaXMgY2hlY2tlZC5cbiAgICAgKi9cbiAgICBjYk9uQ2hlY2tlZCgpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbi5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG4gICAgICAgIGNvbnN0IGNiQWZ0ZXJNb2R1bGVFbmFibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZUVuYWJsZSwgdGhpcyk7XG4gICAgICAgIFBieEFwaS5Nb2R1bGVzRW5hYmxlTW9kdWxlKHRoaXMudW5pcWlkLCBjYkFmdGVyTW9kdWxlRW5hYmxlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIHRoZSBtb2R1bGUgaXMgdW5jaGVja2VkLlxuICAgICAqL1xuICAgIGNiT25VbmNoZWNrZWQoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24uYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmcpO1xuICAgICAgICBjb25zdCBjYkFmdGVyTW9kdWxlRGlzYWJsZSA9ICQucHJveHkodGhpcy5jYkFmdGVyTW9kdWxlRGlzYWJsZSwgdGhpcyk7XG4gICAgICAgIFBieEFwaS5Nb2R1bGVzRGlzYWJsZU1vZHVsZSh0aGlzLnVuaXFpZCwgY2JBZnRlck1vZHVsZURpc2FibGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGRpc2FibGluZyB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdWNjZXNzIC0gSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWwuXG4gICAgICovXG4gICAgY2JBZnRlck1vZHVsZURpc2FibGUocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcbiAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVSSB0byBzaG93IG1vZHVsZSBpcyBkaXNhYmxlZFxuICAgICAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICB0aGlzLiRzdGF0dXNJY29uLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkKTtcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBldmVudHMgdG8gaW5kaWNhdGUgbW9kdWxlIHN0YXR1cyBhbmQgY29uZmlnIGRhdGEgaGFzIGNoYW5nZWRcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXG4gICAgICAgICAgICAvLyBEaXNhYmxlIGlucHV0IGZpZWxkcyBhbmQgc2hvdyBtZXNzYWdlIGZvciBjaGFuZ2VkIG9iamVjdHNcbiAgICAgICAgICAgIHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlZE9iamVjdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZWZyZXNoIHRoZSBwYWdlIHRvIHJlZmxlY3QgY2hhbmdlcyBpcyBiZXR0ZXIgdG8gZG8gaW4gb24gbW9kdWxlIHBhZ2UgdXNpbmcgZXZlbnQgTW9kdWxlU3RhdHVzQ2hhbmdlZCBzdWJzY3JpcHRpb25cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcbiAgICAgICAgICAgIHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChgdHJbZGF0YS1pZD0ke3RoaXMudW5pcWlkfV1gKTtcbiAgICAgICAgICAgIHRoaXMuc2hvd01vZHVsZUVycm9yKCRyb3csIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IsIHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLiRhbGxUb2dnbGVzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB0aGlzLiRzdGF0dXNJY29uLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGVuYWJsaW5nIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHN1Y2Nlc3MgLSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgcmVxdWVzdCB3YXMgc3VjY2Vzc2Z1bC5cbiAgICAgKi9cbiAgICBjYkFmdGVyTW9kdWxlRW5hYmxlKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG4gICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAvLyBVcGRhdGUgVUkgdG8gc2hvdyBtb2R1bGUgaXMgZW5hYmxlZFxuICAgICAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGV2ZW50cyB0byBpbmRpY2F0ZSBtb2R1bGUgc3RhdHVzIGFuZCBjb25maWcgZGF0YSBoYXMgY2hhbmdlZFxuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnTW9kdWxlU3RhdHVzQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cbiAgICAgICAgICAgIC8vIEVuYWJsZSBpbnB1dCBmaWVsZHMgYW5kIHNob3cgbWVzc2FnZSBmb3IgY2hhbmdlZCBvYmplY3RzXG4gICAgICAgICAgICB0aGlzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZWRPYmplY3RzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVmcmVzaCB0aGUgcGFnZSB0byByZWZsZWN0IGNoYW5nZXMgaXMgYmV0dGVyIHRvIGRvIGluIG9uIG1vZHVsZSBwYWdlIHVzaW5nIGV2ZW50IE1vZHVsZVN0YXR1c0NoYW5nZWQgc3Vic2NyaXB0aW9uXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG4gICAgICAgICAgICB0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQoYHRyW2RhdGEtaWQ9JHt0aGlzLnVuaXFpZH1dYCk7XG4gICAgICAgICAgICB0aGlzLnNob3dNb2R1bGVFcnJvcigkcm93LCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yLCByZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbi5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5cyBhbiBlcnJvciBtZXNzYWdlIHJlbGF0ZWQgdG8gbW9kdWxlIHN0YXR1cyBpbiB0aGUgVUkuXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBUaGUgalF1ZXJ5IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHJvdyBpbiB0aGUgVUkgYXNzb2NpYXRlZCB3aXRoIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGhlYWRlciAtIFRoZSBoZWFkZXIgdGV4dCBmb3IgdGhlIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2VzIC0gRGV0YWlsZWQgZXJyb3IgbWVzc2FnZXMgdG8gYmUgZGlzcGxheWVkLlxuICAgICAqL1xuICAgIHNob3dNb2R1bGVFcnJvcigkcm93LCBoZWFkZXIsIG1lc3NhZ2VzPScnKSB7XG4gICAgICAgIGlmIChtZXNzYWdlcz09PXVuZGVmaW5lZCl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCRyb3cubGVuZ3RoPT09MCl7XG4gICAgICAgICAgICBpZiAobWVzc2FnZXMubGljZW5zZSE9PXVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUxpY2Vuc2VQcm9ibGVtLCBtZXNzYWdlcy5saWNlbnNlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKG1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWVzc2FnZXMubGljZW5zZSE9PXVuZGVmaW5lZCl7XG4gICAgICAgICAgICBjb25zdCBtYW5hZ2VMaW5rID0gYDxicj4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfTWFuYWdlTGljZW5zZX0gPGEgaHJlZj1cIiR7Q29uZmlnLmtleU1hbmFnZW1lbnRVcmx9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtDb25maWcua2V5TWFuYWdlbWVudFNpdGV9PC9hPmA7XG4gICAgICAgICAgICBtZXNzYWdlcy5saWNlbnNlLnB1c2gobWFuYWdlTGluayk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdGV4dERlc2NyaXB0aW9uID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlcyk7XG4gICAgICAgIGNvbnN0IGh0bWxNZXNzYWdlPSAgYDx0ciBjbGFzcz1cInVpIHdhcm5pbmcgdGFibGUtZXJyb3ItbWVzc2FnZXNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY2VudGVyIGFsaWduZWQgaWNvbiBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2hlYWRlcn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cD4ke3RleHREZXNjcmlwdGlvbn08L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdHI+YDtcbiAgICAgICAgJHJvdy5hZGRDbGFzcygnd2FybmluZycpO1xuICAgICAgICAkcm93LmJlZm9yZShodG1sTWVzc2FnZSk7XG4gICAgfVxufVxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZXh0ZXJuYWwgbW9kdWxlIHN0YXR1cyB0b2dnbGVzLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNvbnN0IHVuaXFJZCA9ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZScpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICBpZiAodW5pcUlkKSB7XG4gICAgICAgIGNvbnN0IHBhZ2VTdGF0dXMgPSBuZXcgUGJ4RXh0ZW5zaW9uU3RhdHVzKCk7XG4gICAgICAgIHBhZ2VTdGF0dXMuaW5pdGlhbGl6ZSh1bmlxSWQsIHRydWUpO1xuICAgIH1cbn0pO1xuIl19