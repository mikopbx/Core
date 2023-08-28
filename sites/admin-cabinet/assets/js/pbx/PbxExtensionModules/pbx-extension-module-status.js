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
        // window.location.reload();

      } else {
        this.$toggle.checkbox('set checked');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
        this.$disabilityFields.removeClass('disabled');

        if (response !== undefined && response.messages !== undefined) {
          UserMessage.showMultiString(response.messages, globalTranslate.ext_ModuleChangeStatusError);
        }
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
        // window.location.reload();

      } else {
        this.$toggle.checkbox('set unchecked');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
        this.$disabilityFields.addClass('disabled');

        if (response !== undefined && response.messages !== undefined) {
          if (response.messages.license !== undefined) {
            response.messages.error = response.messages.license;
            UserMessage.showLicenseError(globalTranslate.ext_ModuleLicenseProblem, response.messages);
          } else {
            UserMessage.showMultiString(response.messages, globalTranslate.ext_ModuleChangeStatusError);
          }
        }
      }

      this.$allToggles.removeClass('disabled');
      this.$statusIcon.removeClass('spinner loading icon');
      $('a.button').removeClass('disabled');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJHRvZ2dsZVNlZ21lbnQiLCIkYWxsVG9nZ2xlcyIsIiRzdGF0dXNJY29uIiwic2hvdyIsIiRsYWJlbCIsImZpbmQiLCIkZGlzYWJpbGl0eUZpZWxkcyIsImNiT25DaGVja2VkIiwicHJveHkiLCJjYk9uVW5jaGVja2VkIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJvblVuY2hlY2tlZCIsIm5ld1RleHQiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJjaGFuZ2VMYWJlbFRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmciLCJjYkFmdGVyTW9kdWxlRW5hYmxlIiwiUGJ4QXBpIiwiTW9kdWxlc0VuYWJsZU1vZHVsZSIsImNiQWZ0ZXJNb2R1bGVEaXNhYmxlIiwiTW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJyZW1vdmVDbGFzcyIsImV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50Iiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsImRhdGEiLCJjaGFuZ2VkT2JqZWN0cyIsInVuZGVmaW5lZCIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X01vZHVsZUNoYW5nZWRPYmplY3RzIiwiZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCIsIm1lc3NhZ2VzIiwiZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yIiwicmVtb3ZlIiwibGljZW5zZSIsImVycm9yIiwic2hvd0xpY2Vuc2VFcnJvciIsImV4dF9Nb2R1bGVMaWNlbnNlUHJvYmxlbSIsInJlYWR5Iiwi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QTNCLENBQWdDLFlBQWhDLENBQWY7O0FBQ0EsTUFBSUQsTUFBSixFQUFZO0FBQ1IsUUFBTUUsVUFBVSxHQUFHLElBQUl4RCxrQkFBSixFQUFuQjtBQUNBd0QsSUFBQUEsVUFBVSxDQUFDQyxVQUFYLENBQXNCSCxNQUF0QixFQUE4QixJQUE5QjtBQUNIO0FBQ0osQ0FORCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBzdGF0dXMgb2YgYW4gZXh0ZXJuYWwgbW9kdWxlLlxuICogQGNsYXNzIFBieEV4dGVuc2lvblN0YXR1c1xuICogQG1lbWJlcm9mIG1vZHVsZTpwYnhFeHRlbnNpb25Nb2R1bGVNb2RpZnlcbiAqL1xuY2xhc3MgUGJ4RXh0ZW5zaW9uU3RhdHVzIHtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBtb2R1bGUgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1bmlxaWQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY2hhbmdlTGFiZWw9dHJ1ZV0gLSBJbmRpY2F0ZXMgd2hldGhlciB0byBjaGFuZ2UgdGhlIGxhYmVsIHRleHQuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSh1bmlxaWQsIGNoYW5nZUxhYmVsID0gdHJ1ZSkge1xuICAgICAgICB0aGlzLiR0b2dnbGUgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94W2RhdGEtdmFsdWU9XCIke3VuaXFpZH1cIl1gKTtcbiAgICAgICAgdGhpcy4kdG9nZ2xlU2VnbWVudCA9ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZS1zZWdtZW50Jyk7XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94YCk7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24gPSAkKGB0ciMke3VuaXFpZH0gaS5zdGF0dXMtaWNvbmApO1xuICAgICAgICB0aGlzLiR0b2dnbGVTZWdtZW50LnNob3coKTtcbiAgICAgICAgaWYgKGNoYW5nZUxhYmVsKSB7XG4gICAgICAgICAgICB0aGlzLiRsYWJlbCA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApLmZpbmQoJ2xhYmVsJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiRsYWJlbCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudW5pcWlkID0gdW5pcWlkO1xuICAgICAgICB0aGlzLiRkaXNhYmlsaXR5RmllbGRzID0gJChgdHIjJHt1bmlxaWR9IC5kaXNhYmlsaXR5YCk7XG4gICAgICAgIGNvbnN0IGNiT25DaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25DaGVja2VkLCB0aGlzKTtcbiAgICAgICAgY29uc3QgY2JPblVuY2hlY2tlZCA9ICQucHJveHkodGhpcy5jYk9uVW5jaGVja2VkLCB0aGlzKTtcbiAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZDogY2JPbkNoZWNrZWQsXG4gICAgICAgICAgICBvblVuY2hlY2tlZDogY2JPblVuY2hlY2tlZCxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hhbmdlcyB0aGUgbGFiZWwgdGV4dC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3VGV4dCAtIFRoZSBuZXcgbGFiZWwgdGV4dC5cbiAgICAgKi9cbiAgICBjaGFuZ2VMYWJlbFRleHQobmV3VGV4dCkge1xuICAgICAgICBpZiAodGhpcy4kbGFiZWwpIHtcbiAgICAgICAgICAgIHRoaXMuJGxhYmVsLnRleHQobmV3VGV4dCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIHRoZSBtb2R1bGUgaXMgY2hlY2tlZC5cbiAgICAgKi9cbiAgICBjYk9uQ2hlY2tlZCgpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbi5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG4gICAgICAgIGNvbnN0IGNiQWZ0ZXJNb2R1bGVFbmFibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZUVuYWJsZSwgdGhpcyk7XG4gICAgICAgIFBieEFwaS5Nb2R1bGVzRW5hYmxlTW9kdWxlKHRoaXMudW5pcWlkLCBjYkFmdGVyTW9kdWxlRW5hYmxlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIHRoZSBtb2R1bGUgaXMgdW5jaGVja2VkLlxuICAgICAqL1xuICAgIGNiT25VbmNoZWNrZWQoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24uYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmcpO1xuICAgICAgICBjb25zdCBjYkFmdGVyTW9kdWxlRGlzYWJsZSA9ICQucHJveHkodGhpcy5jYkFmdGVyTW9kdWxlRGlzYWJsZSwgdGhpcyk7XG4gICAgICAgIFBieEFwaS5Nb2R1bGVzRGlzYWJsZU1vZHVsZSh0aGlzLnVuaXFpZCwgY2JBZnRlck1vZHVsZURpc2FibGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGRpc2FibGluZyB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdWNjZXNzIC0gSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWwuXG4gICAgICovXG4gICAgY2JBZnRlck1vZHVsZURpc2FibGUocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcbiAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVSSB0byBzaG93IG1vZHVsZSBpcyBkaXNhYmxlZFxuICAgICAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICB0aGlzLiRzdGF0dXNJY29uLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkKTtcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBldmVudHMgdG8gaW5kaWNhdGUgbW9kdWxlIHN0YXR1cyBhbmQgY29uZmlnIGRhdGEgaGFzIGNoYW5nZWRcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXG4gICAgICAgICAgICAvLyBEaXNhYmxlIGlucHV0IGZpZWxkcyBhbmQgc2hvdyBtZXNzYWdlIGZvciBjaGFuZ2VkIG9iamVjdHNcbiAgICAgICAgICAgIHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlZE9iamVjdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZWZyZXNoIHRoZSBwYWdlIHRvIHJlZmxlY3QgY2hhbmdlcyBpcyBiZXR0ZXIgdG8gZG8gaW4gb24gbW9kdWxlIHBhZ2UgdXNpbmcgZXZlbnQgTW9kdWxlU3RhdHVzQ2hhbmdlZCBzdWJzY3JpcHRpb25cbiAgICAgICAgICAgIC8vIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcbiAgICAgICAgICAgIHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLiRhbGxUb2dnbGVzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB0aGlzLiRzdGF0dXNJY29uLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGVuYWJsaW5nIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHN1Y2Nlc3MgLSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgcmVxdWVzdCB3YXMgc3VjY2Vzc2Z1bC5cbiAgICAgKi9cbiAgICBjYkFmdGVyTW9kdWxlRW5hYmxlKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG4gICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAvLyBVcGRhdGUgVUkgdG8gc2hvdyBtb2R1bGUgaXMgZW5hYmxlZFxuICAgICAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGV2ZW50cyB0byBpbmRpY2F0ZSBtb2R1bGUgc3RhdHVzIGFuZCBjb25maWcgZGF0YSBoYXMgY2hhbmdlZFxuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnTW9kdWxlU3RhdHVzQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cbiAgICAgICAgICAgIC8vIEVuYWJsZSBpbnB1dCBmaWVsZHMgYW5kIHNob3cgbWVzc2FnZSBmb3IgY2hhbmdlZCBvYmplY3RzXG4gICAgICAgICAgICB0aGlzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZWRPYmplY3RzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVmcmVzaCB0aGUgcGFnZSB0byByZWZsZWN0IGNoYW5nZXMgaXMgYmV0dGVyIHRvIGRvIGluIG9uIG1vZHVsZSBwYWdlIHVzaW5nIGV2ZW50IE1vZHVsZVN0YXR1c0NoYW5nZWQgc3Vic2NyaXB0aW9uXG4gICAgICAgICAgICAvLyB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG4gICAgICAgICAgICB0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcy5saWNlbnNlIT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgPSByZXNwb25zZS5tZXNzYWdlcy5saWNlbnNlO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TGljZW5zZUVycm9yKGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlTGljZW5zZVByb2JsZW0sIHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfVxufVxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZXh0ZXJuYWwgbW9kdWxlIHN0YXR1cyB0b2dnbGVzLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNvbnN0IHVuaXFJZCA9ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZScpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICBpZiAodW5pcUlkKSB7XG4gICAgICAgIGNvbnN0IHBhZ2VTdGF0dXMgPSBuZXcgUGJ4RXh0ZW5zaW9uU3RhdHVzKCk7XG4gICAgICAgIHBhZ2VTdGF0dXMuaW5pdGlhbGl6ZSh1bmlxSWQsIHRydWUpO1xuICAgIH1cbn0pO1xuIl19