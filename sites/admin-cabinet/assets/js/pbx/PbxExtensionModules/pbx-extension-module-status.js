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
            UserMessage.showLicenseError(globalTranslate.ext_ModuleLicenseProblem, response.messages.license);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJHRvZ2dsZVNlZ21lbnQiLCIkYWxsVG9nZ2xlcyIsIiRzdGF0dXNJY29uIiwic2hvdyIsIiRsYWJlbCIsImZpbmQiLCIkZGlzYWJpbGl0eUZpZWxkcyIsImNiT25DaGVja2VkIiwicHJveHkiLCJjYk9uVW5jaGVja2VkIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJvblVuY2hlY2tlZCIsIm5ld1RleHQiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJjaGFuZ2VMYWJlbFRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmciLCJjYkFmdGVyTW9kdWxlRW5hYmxlIiwiUGJ4QXBpIiwiTW9kdWxlc0VuYWJsZU1vZHVsZSIsImNiQWZ0ZXJNb2R1bGVEaXNhYmxlIiwiTW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJyZW1vdmVDbGFzcyIsImV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50Iiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsImRhdGEiLCJjaGFuZ2VkT2JqZWN0cyIsInVuZGVmaW5lZCIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X01vZHVsZUNoYW5nZWRPYmplY3RzIiwiZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCIsIm1lc3NhZ2VzIiwiZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yIiwicmVtb3ZlIiwibGljZW5zZSIsInNob3dMaWNlbnNlRXJyb3IiLCJleHRfTW9kdWxlTGljZW5zZVByb2JsZW0iLCJyZWFkeSIsInVuaXFJZCIs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LEVBQW5CO0FBQ0F1RCxJQUFBQSxVQUFVLENBQUNDLFVBQVgsQ0FBc0JILE1BQXRCLEVBQThCLElBQTlCO0FBQ0g7QUFDSixDQU5EIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXR1cyBvZiBhbiBleHRlcm5hbCBtb2R1bGUuXG4gKiBAY2xhc3MgUGJ4RXh0ZW5zaW9uU3RhdHVzXG4gKiBAbWVtYmVyb2YgbW9kdWxlOnBieEV4dGVuc2lvbk1vZHVsZU1vZGlmeVxuICovXG5jbGFzcyBQYnhFeHRlbnNpb25TdGF0dXMge1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG1vZHVsZSBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVuaXFpZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjaGFuZ2VMYWJlbD10cnVlXSAtIEluZGljYXRlcyB3aGV0aGVyIHRvIGNoYW5nZSB0aGUgbGFiZWwgdGV4dC5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKHVuaXFpZCwgY2hhbmdlTGFiZWwgPSB0cnVlKSB7XG4gICAgICAgIHRoaXMuJHRvZ2dsZSA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApO1xuICAgICAgICB0aGlzLiR0b2dnbGVTZWdtZW50ID0gJCgnI21vZHVsZS1zdGF0dXMtdG9nZ2xlLXNlZ21lbnQnKTtcbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcyA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hgKTtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbiA9ICQoYHRyIyR7dW5pcWlkfSBpLnN0YXR1cy1pY29uYCk7XG4gICAgICAgIHRoaXMuJHRvZ2dsZVNlZ21lbnQuc2hvdygpO1xuICAgICAgICBpZiAoY2hhbmdlTGFiZWwpIHtcbiAgICAgICAgICAgIHRoaXMuJGxhYmVsID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveFtkYXRhLXZhbHVlPVwiJHt1bmlxaWR9XCJdYCkuZmluZCgnbGFiZWwnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJGxhYmVsID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51bmlxaWQgPSB1bmlxaWQ7XG4gICAgICAgIHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMgPSAkKGB0ciMke3VuaXFpZH0gLmRpc2FiaWxpdHlgKTtcbiAgICAgICAgY29uc3QgY2JPbkNoZWNrZWQgPSAkLnByb3h5KHRoaXMuY2JPbkNoZWNrZWQsIHRoaXMpO1xuICAgICAgICBjb25zdCBjYk9uVW5jaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25VbmNoZWNrZWQsIHRoaXMpO1xuICAgICAgICB0aGlzLiR0b2dnbGUuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGVja2VkOiBjYk9uQ2hlY2tlZCxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkOiBjYk9uVW5jaGVja2VkLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2VzIHRoZSBsYWJlbCB0ZXh0LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdUZXh0IC0gVGhlIG5ldyBsYWJlbCB0ZXh0LlxuICAgICAqL1xuICAgIGNoYW5nZUxhYmVsVGV4dChuZXdUZXh0KSB7XG4gICAgICAgIGlmICh0aGlzLiRsYWJlbCkge1xuICAgICAgICAgICAgdGhpcy4kbGFiZWwudGV4dChuZXdUZXh0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gdGhlIG1vZHVsZSBpcyBjaGVja2VkLlxuICAgICAqL1xuICAgIGNiT25DaGVja2VkKCkge1xuICAgICAgICB0aGlzLiRzdGF0dXNJY29uLmFkZENsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuICAgICAgICB0aGlzLiRhbGxUb2dnbGVzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZVN0YXR1c0NoYW5naW5nKTtcbiAgICAgICAgY29uc3QgY2JBZnRlck1vZHVsZUVuYWJsZSA9ICQucHJveHkodGhpcy5jYkFmdGVyTW9kdWxlRW5hYmxlLCB0aGlzKTtcbiAgICAgICAgUGJ4QXBpLk1vZHVsZXNFbmFibGVNb2R1bGUodGhpcy51bmlxaWQsIGNiQWZ0ZXJNb2R1bGVFbmFibGUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gdGhlIG1vZHVsZSBpcyB1bmNoZWNrZWQuXG4gICAgICovXG4gICAgY2JPblVuY2hlY2tlZCgpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbi5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG4gICAgICAgIGNvbnN0IGNiQWZ0ZXJNb2R1bGVEaXNhYmxlID0gJC5wcm94eSh0aGlzLmNiQWZ0ZXJNb2R1bGVEaXNhYmxlLCB0aGlzKTtcbiAgICAgICAgUGJ4QXBpLk1vZHVsZXNEaXNhYmxlTW9kdWxlKHRoaXMudW5pcWlkLCBjYkFmdGVyTW9kdWxlRGlzYWJsZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgZGlzYWJsaW5nIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHN1Y2Nlc3MgLSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgcmVxdWVzdCB3YXMgc3VjY2Vzc2Z1bC5cbiAgICAgKi9cbiAgICBjYkFmdGVyTW9kdWxlRGlzYWJsZShyZXNwb25zZSwgc3VjY2Vzcykge1xuICAgICAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgLy8gVXBkYXRlIFVJIHRvIHNob3cgbW9kdWxlIGlzIGRpc2FibGVkXG4gICAgICAgICAgICB0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgIHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgICAgICAgICB0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQpO1xuXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGV2ZW50cyB0byBpbmRpY2F0ZSBtb2R1bGUgc3RhdHVzIGFuZCBjb25maWcgZGF0YSBoYXMgY2hhbmdlZFxuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnTW9kdWxlU3RhdHVzQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgaW5wdXQgZmllbGRzIGFuZCBzaG93IG1lc3NhZ2UgZm9yIGNoYW5nZWQgb2JqZWN0c1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlZnJlc2ggdGhlIHBhZ2UgdG8gcmVmbGVjdCBjaGFuZ2VzIGlzIGJldHRlciB0byBkbyBpbiBvbiBtb2R1bGUgcGFnZSB1c2luZyBldmVudCBNb2R1bGVTdGF0dXNDaGFuZ2VkIHN1YnNjcmlwdGlvblxuICAgICAgICAgICAgLy8gd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkICYmIHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgZW5hYmxpbmcgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3VjY2VzcyAtIEluZGljYXRlcyB3aGV0aGVyIHRoZSByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJNb2R1bGVFbmFibGUocmVzcG9uc2UsIHN1Y2Nlc3MpIHtcbiAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVSSB0byBzaG93IG1vZHVsZSBpcyBlbmFibGVkXG4gICAgICAgICAgICB0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICB0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCk7XG5cbiAgICAgICAgICAgIC8vIFRyaWdnZXIgZXZlbnRzIHRvIGluZGljYXRlIG1vZHVsZSBzdGF0dXMgYW5kIGNvbmZpZyBkYXRhIGhhcyBjaGFuZ2VkXG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblxuICAgICAgICAgICAgLy8gRW5hYmxlIGlucHV0IGZpZWxkcyBhbmQgc2hvdyBtZXNzYWdlIGZvciBjaGFuZ2VkIG9iamVjdHNcbiAgICAgICAgICAgIHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlZE9iamVjdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZWZyZXNoIHRoZSBwYWdlIHRvIHJlZmxlY3QgY2hhbmdlcyBpcyBiZXR0ZXIgdG8gZG8gaW4gb24gbW9kdWxlIHBhZ2UgdXNpbmcgZXZlbnQgTW9kdWxlU3RhdHVzQ2hhbmdlZCBzdWJzY3JpcHRpb25cbiAgICAgICAgICAgIC8vIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkKTtcbiAgICAgICAgICAgIHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzLmxpY2Vuc2UhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TGljZW5zZUVycm9yKGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlTGljZW5zZVByb2JsZW0sIHJlc3BvbnNlLm1lc3NhZ2VzLmxpY2Vuc2UpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbi5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9XG59XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBleHRlcm5hbCBtb2R1bGUgc3RhdHVzIHRvZ2dsZXMuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY29uc3QgdW5pcUlkID0gJCgnI21vZHVsZS1zdGF0dXMtdG9nZ2xlJykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgIGlmICh1bmlxSWQpIHtcbiAgICAgICAgY29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXMoKTtcbiAgICAgICAgcGFnZVN0YXR1cy5pbml0aWFsaXplKHVuaXFJZCwgdHJ1ZSk7XG4gICAgfVxufSk7XG4iXX0=