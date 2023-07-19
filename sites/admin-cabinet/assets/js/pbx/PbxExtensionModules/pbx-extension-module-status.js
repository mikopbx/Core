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
        // Update UI to show module is enabled
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
          UserMessage.showMultiString(response.messages, globalTranslate.ext_ModuleChangeStatusError);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJHRvZ2dsZVNlZ21lbnQiLCIkYWxsVG9nZ2xlcyIsIiRzdGF0dXNJY29uIiwic2hvdyIsIiRsYWJlbCIsImZpbmQiLCIkZGlzYWJpbGl0eUZpZWxkcyIsImNiT25DaGVja2VkIiwicHJveHkiLCJjYk9uVW5jaGVja2VkIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJvblVuY2hlY2tlZCIsIm5ld1RleHQiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJjaGFuZ2VMYWJlbFRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmciLCJjYkFmdGVyTW9kdWxlRW5hYmxlIiwiUGJ4QXBpIiwiTW9kdWxlc0VuYWJsZU1vZHVsZSIsImNiQWZ0ZXJNb2R1bGVEaXNhYmxlIiwiTW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJyZW1vdmVDbGFzcyIsImV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50Iiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsImRhdGEiLCJjaGFuZ2VkT2JqZWN0cyIsInVuZGVmaW5lZCIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X01vZHVsZUNoYW5nZWRPYmplY3RzIiwiZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCIsIm1lc3NhZ2VzIiwiZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yIiwicmVhZHkiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsImluaXRpYWxpemUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtB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UUFBYixDQUFzQixlQUF0QjtBQUNBLGFBQUtNLGVBQUwsQ0FBcUJDLGVBQWUsQ0FBQ1UsZ0NBQXJDO0FBQ0EsYUFBS3JCLGlCQUFMLENBQXVCUyxRQUF2QixDQUFnQyxVQUFoQzs7QUFDQSxZQUFJUyxRQUFRLEtBQUtZLFNBQWIsSUFBMEJaLFFBQVEsQ0FBQ2lCLFFBQVQsS0FBc0JMLFNBQXBELEVBQStEO0FBQzNEQyxVQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJkLFFBQVEsQ0FBQ2lCLFFBQXJDLEVBQStDeEIsZUFBZSxDQUFDeUIsMkJBQS9EO0FBQ0g7QUFDSjs7QUFDRCxXQUFLekMsV0FBTCxDQUFpQnlCLFdBQWpCLENBQTZCLFVBQTdCO0FBQ0EsV0FBS3hCLFdBQUwsQ0FBaUJ3QixXQUFqQixDQUE2QixzQkFBN0I7QUFDQTNCLE1BQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBYzJCLFdBQWQsQ0FBMEIsVUFBMUI7QUFDSDs7OztLQUdMOzs7QUFDQTNCLENBQUMsQ0FBQzhCLFFBQUQsQ0FBRCxDQUFZYyxLQUFaLENBQWtCLFlBQU07QUFDcEIsTUFBTUMsTUFBTSxHQUFHN0MsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkI4QyxJQUEzQixDQUFnQyxZQUFoQyxDQUFmOztBQUNBLE1BQUlELE1BQUosRUFBWTtBQUNSLFFBQU1FLFVBQVUsR0FBRyxJQUFJbkQsa0JBQUosRUFBbkI7QUFDQW1ELElBQUFBLFVBQVUsQ0FBQ0MsVUFBWCxDQUFzQkgsTUFBdEIsRUFBOEIsSUFBOUI7QUFDSDtBQUNKLENBTkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlICovXG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgc3RhdHVzIG9mIGFuIGV4dGVybmFsIG1vZHVsZS5cbiAqIEBjbGFzcyBQYnhFeHRlbnNpb25TdGF0dXNcbiAqIEBtZW1iZXJvZiBtb2R1bGU6cGJ4RXh0ZW5zaW9uTW9kdWxlTW9kaWZ5XG4gKi9cbmNsYXNzIFBieEV4dGVuc2lvblN0YXR1cyB7XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbW9kdWxlIHN0YXR1cy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdW5pcWlkIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NoYW5nZUxhYmVsPXRydWVdIC0gSW5kaWNhdGVzIHdoZXRoZXIgdG8gY2hhbmdlIHRoZSBsYWJlbCB0ZXh0LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUodW5pcWlkLCBjaGFuZ2VMYWJlbCA9IHRydWUpIHtcbiAgICAgICAgdGhpcy4kdG9nZ2xlID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveFtkYXRhLXZhbHVlPVwiJHt1bmlxaWR9XCJdYCk7XG4gICAgICAgIHRoaXMuJHRvZ2dsZVNlZ21lbnQgPSAkKCcjbW9kdWxlLXN0YXR1cy10b2dnbGUtc2VnbWVudCcpO1xuICAgICAgICB0aGlzLiRhbGxUb2dnbGVzID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveGApO1xuICAgICAgICB0aGlzLiRzdGF0dXNJY29uID0gJChgdHIjJHt1bmlxaWR9IGkuc3RhdHVzLWljb25gKTtcbiAgICAgICAgdGhpcy4kdG9nZ2xlU2VnbWVudC5zaG93KCk7XG4gICAgICAgIGlmIChjaGFuZ2VMYWJlbCkge1xuICAgICAgICAgICAgdGhpcy4kbGFiZWwgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94W2RhdGEtdmFsdWU9XCIke3VuaXFpZH1cIl1gKS5maW5kKCdsYWJlbCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kbGFiZWwgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnVuaXFpZCA9IHVuaXFpZDtcbiAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcyA9ICQoYHRyIyR7dW5pcWlkfSAuZGlzYWJpbGl0eWApO1xuICAgICAgICBjb25zdCBjYk9uQ2hlY2tlZCA9ICQucHJveHkodGhpcy5jYk9uQ2hlY2tlZCwgdGhpcyk7XG4gICAgICAgIGNvbnN0IGNiT25VbmNoZWNrZWQgPSAkLnByb3h5KHRoaXMuY2JPblVuY2hlY2tlZCwgdGhpcyk7XG4gICAgICAgIHRoaXMuJHRvZ2dsZS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQ6IGNiT25DaGVja2VkLFxuICAgICAgICAgICAgb25VbmNoZWNrZWQ6IGNiT25VbmNoZWNrZWQsXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoYW5nZXMgdGhlIGxhYmVsIHRleHQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld1RleHQgLSBUaGUgbmV3IGxhYmVsIHRleHQuXG4gICAgICovXG4gICAgY2hhbmdlTGFiZWxUZXh0KG5ld1RleHQpIHtcbiAgICAgICAgaWYgKHRoaXMuJGxhYmVsKSB7XG4gICAgICAgICAgICB0aGlzLiRsYWJlbC50ZXh0KG5ld1RleHQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gd2hlbiB0aGUgbW9kdWxlIGlzIGNoZWNrZWQuXG4gICAgICovXG4gICAgY2JPbkNoZWNrZWQoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24uYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmcpO1xuICAgICAgICBjb25zdCBjYkFmdGVyTW9kdWxlRW5hYmxlID0gJC5wcm94eSh0aGlzLmNiQWZ0ZXJNb2R1bGVFbmFibGUsIHRoaXMpO1xuICAgICAgICBQYnhBcGkuTW9kdWxlc0VuYWJsZU1vZHVsZSh0aGlzLnVuaXFpZCwgY2JBZnRlck1vZHVsZUVuYWJsZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gd2hlbiB0aGUgbW9kdWxlIGlzIHVuY2hlY2tlZC5cbiAgICAgKi9cbiAgICBjYk9uVW5jaGVja2VkKCkge1xuICAgICAgICB0aGlzLiRzdGF0dXNJY29uLmFkZENsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuICAgICAgICB0aGlzLiRhbGxUb2dnbGVzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZVN0YXR1c0NoYW5naW5nKTtcbiAgICAgICAgY29uc3QgY2JBZnRlck1vZHVsZURpc2FibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZURpc2FibGUsIHRoaXMpO1xuICAgICAgICBQYnhBcGkuTW9kdWxlc0Rpc2FibGVNb2R1bGUodGhpcy51bmlxaWQsIGNiQWZ0ZXJNb2R1bGVEaXNhYmxlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBkaXNhYmxpbmcgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3VjY2VzcyAtIEluZGljYXRlcyB3aGV0aGVyIHRoZSByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJNb2R1bGVEaXNhYmxlKHJlc3BvbnNlLCBzdWNjZXNzKSB7XG4gICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgVUkgdG8gc2hvdyBtb2R1bGUgaXMgZGlzYWJsZWRcbiAgICAgICAgICAgIHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgdGhpcy4kc3RhdHVzSWNvbi5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG5cbiAgICAgICAgICAgIC8vIFRyaWdnZXIgZXZlbnRzIHRvIGluZGljYXRlIG1vZHVsZSBzdGF0dXMgYW5kIGNvbmZpZyBkYXRhIGhhcyBjaGFuZ2VkXG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblxuICAgICAgICAgICAgLy8gRGlzYWJsZSBpbnB1dCBmaWVsZHMgYW5kIHNob3cgbWVzc2FnZSBmb3IgY2hhbmdlZCBvYmplY3RzXG4gICAgICAgICAgICB0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZUNoYW5nZWRPYmplY3RzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVmcmVzaCB0aGUgcGFnZSB0byByZWZsZWN0IGNoYW5nZXMgaXMgYmV0dGVyIHRvIGRvIGluIG9uIG1vZHVsZSBwYWdlIHVzaW5nIGV2ZW50IE1vZHVsZVN0YXR1c0NoYW5nZWQgc3Vic2NyaXB0aW9uXG4gICAgICAgICAgICAvLyB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICB0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCk7XG4gICAgICAgICAgICB0aGlzLiRkaXNhYmlsaXR5RmllbGRzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbi5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBlbmFibGluZyB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdWNjZXNzIC0gSW5kaWNhdGVzIHdoZXRoZXIgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWwuXG4gICAgICovXG4gICAgY2JBZnRlck1vZHVsZUVuYWJsZShyZXNwb25zZSwgc3VjY2Vzcykge1xuICAgICAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgLy8gVXBkYXRlIFVJIHRvIHNob3cgbW9kdWxlIGlzIGVuYWJsZWRcbiAgICAgICAgICAgIHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBldmVudHMgdG8gaW5kaWNhdGUgbW9kdWxlIHN0YXR1cyBhbmQgY29uZmlnIGRhdGEgaGFzIGNoYW5nZWRcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXG4gICAgICAgICAgICAvLyBFbmFibGUgaW5wdXQgZmllbGRzIGFuZCBzaG93IG1lc3NhZ2UgZm9yIGNoYW5nZWQgb2JqZWN0c1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlZnJlc2ggdGhlIHBhZ2UgdG8gcmVmbGVjdCBjaGFuZ2VzIGlzIGJldHRlciB0byBkbyBpbiBvbiBtb2R1bGUgcGFnZSB1c2luZyBldmVudCBNb2R1bGVTdGF0dXNDaGFuZ2VkIHN1YnNjcmlwdGlvblxuICAgICAgICAgICAgLy8gd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICB0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQpO1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfVxufVxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZXh0ZXJuYWwgbW9kdWxlIHN0YXR1cyB0b2dnbGVzLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNvbnN0IHVuaXFJZCA9ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZScpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICBpZiAodW5pcUlkKSB7XG4gICAgICAgIGNvbnN0IHBhZ2VTdGF0dXMgPSBuZXcgUGJ4RXh0ZW5zaW9uU3RhdHVzKCk7XG4gICAgICAgIHBhZ2VTdGF0dXMuaW5pdGlhbGl6ZSh1bmlxSWQsIHRydWUpO1xuICAgIH1cbn0pO1xuIl19