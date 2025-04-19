"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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

/* global PbxApi, globalTranslate, UserMessage, EventBus */

/**
 * Represents the status of an external module.
 * @class PbxExtensionStatus
 * @memberof module:pbxExtensionModuleModify
 */
var PbxExtensionStatus = /*#__PURE__*/function () {
  function PbxExtensionStatus() {
    _classCallCheck(this, PbxExtensionStatus);

    _defineProperty(this, "channelId", 'module-status');
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
      var _this = this;

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
      EventBus.subscribe(this.channelId, function (data) {
        _this.cbAfterChangeModuleStatus(data);
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
      var params = {
        moduleUniqueID: this.uniqid,
        channelId: this.channelId
      };
      PbxApi.ModulesEnableModule(params);
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
      var params = {
        moduleUniqueID: this.uniqid,
        channelId: this.channelId
      };
      PbxApi.ModulesDisableModule(params);
    }
    /**
     * Callback function after changing the module status.
     * @param {object} response - The response from the server.
     */

  }, {
    key: "cbAfterChangeModuleStatus",
    value: function cbAfterChangeModuleStatus(response) {
      if (response.moduleUniqueId !== this.uniqid) {
        return;
      }

      var stageDetails = response.stageDetails;

      if (response.stage === 'Stage_I_ModuleDisable') {
        var cbAfterModuleDisable = $.proxy(this.cbAfterModuleDisable, this);
        cbAfterModuleDisable(stageDetails);
      } else if (response.stage === 'Stage_I_ModuleEnable') {
        var cbAfterModuleEnable = $.proxy(this.cbAfterModuleEnable, this);
        cbAfterModuleEnable(stageDetails);
      }
    }
    /**
     * Callback function after disabling the module.
     * @param {object} response - The response from the server.
     */

  }, {
    key: "cbAfterModuleDisable",
    value: function cbAfterModuleDisable(response) {
      if (response.result) {
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
     */

  }, {
    key: "cbAfterModuleEnable",
    value: function cbAfterModuleEnable(response) {
      if (response.result) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJHRvZ2dsZVNlZ21lbnQiLCIkYWxsVG9nZ2xlcyIsIiRzdGF0dXNJY29uIiwic2hvdyIsIiRsYWJlbCIsImZpbmQiLCIkZGlzYWJpbGl0eUZpZWxkcyIsImNiT25DaGVja2VkIiwicHJveHkiLCJjYk9uVW5jaGVja2VkIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJvblVuY2hlY2tlZCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwiY2hhbm5lbElkIiwiZGF0YSIsImNiQWZ0ZXJDaGFuZ2VNb2R1bGVTdGF0dXMiLCJuZXdUZXh0IiwidGV4dCIsImFkZENsYXNzIiwiY2hhbmdlTGFiZWxUZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X01vZHVsZVN0YXR1c0NoYW5naW5nIiwicGFyYW1zIiwibW9kdWxlVW5pcXVlSUQiLCJQYnhBcGkiLCJNb2R1bGVzRW5hYmxlTW9kdWxlIiwiTW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJyZXNwb25zZSIsIm1vZHVsZVVuaXF1ZUlkIiwic3RhZ2VEZXRhaWxzIiwic3RhZ2UiLCJjYkFmdGVyTW9kdWxlRGlzYWJsZSIsImNiQWZ0ZXJNb2R1bGVFbmFibGUiLCJyZXN1bHQiLCJyZW1vdmVDbGFzcyIsImV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50Iiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsImNoYW5nZWRPYmplY3RzIiwidW5kZWZpbmVkIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfTW9kdWxlQ2hhbmdlZE9iamVjdHMiLCJsb2NhdGlvbiIsInJlbG9hZCIsImV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQiLCIkcm93Iiwic2hvd01vZHVsZUVycm9yIiwiZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yIiwibWVzc2FnZXMiLCJyZW1vdmUiLCJoZWFkZXIiLCJsZW5ndGgiLCJsaWNlbnNlIiwic2hvd0xpY2Vuc2VFcnJvciIsImV4dF9Nb2R1bGVMaWNlbnNlUHJvYmxlbSIsIm1hbmFnZUxpbmsiLCJsaWNfTWFuYWdlTGljZW5zZSIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJrZXlNYW5hZ2VtZW50U2l0ZSIsInB1c2giLCJ0ZXh0RGVzY3JpcHRpb24iLCJjb252ZXJ0VG9UZXh0IiwiaHRtbE1lc3NhZ2UiLCJiZWZvcmUiLCJyZWFkeSIsInVuaXFJZCIsImF0dHIiLCJwYWdlU3RhdHVzIiwiaW5pdGlhbGl6ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxrQjs7Ozt1Q0FNVSxlOzs7Ozs7QUFFWjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0ksd0JBQVdDLE1BQVgsRUFBdUM7QUFBQTs7QUFBQSxVQUFwQkMsV0FBb0IsdUVBQU4sSUFBTTtBQUNuQyxXQUFLQyxPQUFMLEdBQWVDLENBQUMsNENBQW9DSCxNQUFwQyxTQUFoQjtBQUNBLFdBQUtJLGNBQUwsR0FBc0JELENBQUMsQ0FBQywrQkFBRCxDQUF2QjtBQUNBLFdBQUtFLFdBQUwsR0FBbUJGLENBQUMsdUJBQXBCO0FBQ0EsV0FBS0csV0FBTCxHQUFtQkgsQ0FBQyxjQUFPSCxNQUFQLG9CQUFwQjtBQUNBLFdBQUtJLGNBQUwsQ0FBb0JHLElBQXBCOztBQUNBLFVBQUlOLFdBQUosRUFBaUI7QUFDYixhQUFLTyxNQUFMLEdBQWNMLENBQUMsNENBQW9DSCxNQUFwQyxTQUFELENBQWlEUyxJQUFq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bmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBFdmVudEJ1cyAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN0YXR1cyBvZiBhbiBleHRlcm5hbCBtb2R1bGUuXG4gKiBAY2xhc3MgUGJ4RXh0ZW5zaW9uU3RhdHVzXG4gKiBAbWVtYmVyb2YgbW9kdWxlOnBieEV4dGVuc2lvbk1vZHVsZU1vZGlmeVxuICovXG5jbGFzcyBQYnhFeHRlbnNpb25TdGF0dXMge1xuXG4gICAgLyoqXG4gICAgICogVGhlIGlkZW50aWZpZXIgZm9yIHRoZSBQVUIvU1VCIGNoYW5uZWwgdXNlZCB0byBzdWJzY3JpYmUgdG8gbW9kdWxlIHN0YXR1cyB1cGRhdGVzLlxuICAgICAqIFRoaXMgZW5zdXJlcyB0aGF0IHRoZSBjbGllbnQgaXMgbGlzdGVuaW5nIG9uIHRoZSBjb3JyZWN0IGNoYW5uZWwgZm9yIHJlbGV2YW50IGV2ZW50cy5cbiAgICAgKi9cbiAgICBjaGFubmVsSWQgPSAnbW9kdWxlLXN0YXR1cyc7XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbW9kdWxlIHN0YXR1cy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdW5pcWlkIC0gVGhlIHVuaXF1ZSBJRCBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NoYW5nZUxhYmVsPXRydWVdIC0gSW5kaWNhdGVzIHdoZXRoZXIgdG8gY2hhbmdlIHRoZSBsYWJlbCB0ZXh0LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUodW5pcWlkLCBjaGFuZ2VMYWJlbCA9IHRydWUpIHtcbiAgICAgICAgdGhpcy4kdG9nZ2xlID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveFtkYXRhLXZhbHVlPVwiJHt1bmlxaWR9XCJdYCk7XG4gICAgICAgIHRoaXMuJHRvZ2dsZVNlZ21lbnQgPSAkKCcjbW9kdWxlLXN0YXR1cy10b2dnbGUtc2VnbWVudCcpO1xuICAgICAgICB0aGlzLiRhbGxUb2dnbGVzID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveGApO1xuICAgICAgICB0aGlzLiRzdGF0dXNJY29uID0gJChgdHIjJHt1bmlxaWR9IGkuc3RhdHVzLWljb25gKTtcbiAgICAgICAgdGhpcy4kdG9nZ2xlU2VnbWVudC5zaG93KCk7XG4gICAgICAgIGlmIChjaGFuZ2VMYWJlbCkge1xuICAgICAgICAgICAgdGhpcy4kbGFiZWwgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94W2RhdGEtdmFsdWU9XCIke3VuaXFpZH1cIl1gKS5maW5kKCdsYWJlbCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kbGFiZWwgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnVuaXFpZCA9IHVuaXFpZDtcbiAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcyA9ICQoYHRyIyR7dW5pcWlkfSAuZGlzYWJpbGl0eWApO1xuICAgICAgICBjb25zdCBjYk9uQ2hlY2tlZCA9ICQucHJveHkodGhpcy5jYk9uQ2hlY2tlZCwgdGhpcyk7XG4gICAgICAgIGNvbnN0IGNiT25VbmNoZWNrZWQgPSAkLnByb3h5KHRoaXMuY2JPblVuY2hlY2tlZCwgdGhpcyk7XG4gICAgICAgIHRoaXMuJHRvZ2dsZS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQ6IGNiT25DaGVja2VkLFxuICAgICAgICAgICAgb25VbmNoZWNrZWQ6IGNiT25VbmNoZWNrZWQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSh0aGlzLmNoYW5uZWxJZCwgZGF0YSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNiQWZ0ZXJDaGFuZ2VNb2R1bGVTdGF0dXMoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoYW5nZXMgdGhlIGxhYmVsIHRleHQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld1RleHQgLSBUaGUgbmV3IGxhYmVsIHRleHQuXG4gICAgICovXG4gICAgY2hhbmdlTGFiZWxUZXh0KG5ld1RleHQpIHtcbiAgICAgICAgaWYgKHRoaXMuJGxhYmVsKSB7XG4gICAgICAgICAgICB0aGlzLiRsYWJlbC50ZXh0KG5ld1RleHQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gd2hlbiB0aGUgbW9kdWxlIGlzIGNoZWNrZWQuXG4gICAgICovXG4gICAgY2JPbkNoZWNrZWQoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24uYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmcpO1xuICAgICAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgICAgICBtb2R1bGVVbmlxdWVJRDogdGhpcy51bmlxaWQsXG4gICAgICAgICAgICBjaGFubmVsSWQ6IHRoaXMuY2hhbm5lbElkLFxuICAgICAgICB9O1xuICAgICAgICBQYnhBcGkuTW9kdWxlc0VuYWJsZU1vZHVsZShwYXJhbXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gdGhlIG1vZHVsZSBpcyB1bmNoZWNrZWQuXG4gICAgICovXG4gICAgY2JPblVuY2hlY2tlZCgpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbi5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIG1vZHVsZVVuaXF1ZUlEOiB0aGlzLnVuaXFpZCxcbiAgICAgICAgICAgIGNoYW5uZWxJZDogdGhpcy5jaGFubmVsSWQsXG4gICAgICAgIH07XG4gICAgICAgIFBieEFwaS5Nb2R1bGVzRGlzYWJsZU1vZHVsZShwYXJhbXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGNoYW5naW5nIHRoZSBtb2R1bGUgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgY2JBZnRlckNoYW5nZU1vZHVsZVN0YXR1cyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UubW9kdWxlVW5pcXVlSWQgIT09IHRoaXMudW5pcWlkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc3RhZ2VEZXRhaWxzID0gcmVzcG9uc2Uuc3RhZ2VEZXRhaWxzO1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhZ2UgPT09ICdTdGFnZV9JX01vZHVsZURpc2FibGUnKXtcbiAgICAgICAgICAgIGNvbnN0IGNiQWZ0ZXJNb2R1bGVEaXNhYmxlID0gJC5wcm94eSh0aGlzLmNiQWZ0ZXJNb2R1bGVEaXNhYmxlLCB0aGlzKTtcbiAgICAgICAgICAgIGNiQWZ0ZXJNb2R1bGVEaXNhYmxlKHN0YWdlRGV0YWlscyk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2Uuc3RhZ2UgPT09ICdTdGFnZV9JX01vZHVsZUVuYWJsZScpe1xuICAgICAgICAgICAgY29uc3QgY2JBZnRlck1vZHVsZUVuYWJsZSA9ICQucHJveHkodGhpcy5jYkFmdGVyTW9kdWxlRW5hYmxlLCB0aGlzKTtcbiAgICAgICAgICAgIGNiQWZ0ZXJNb2R1bGVFbmFibGUoc3RhZ2VEZXRhaWxzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGRpc2FibGluZyB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgY2JBZnRlck1vZHVsZURpc2FibGUocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIFVJIHRvIHNob3cgbW9kdWxlIGlzIGRpc2FibGVkXG4gICAgICAgICAgICB0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgIHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgICAgICAgICB0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQpO1xuXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGV2ZW50cyB0byBpbmRpY2F0ZSBtb2R1bGUgc3RhdHVzIGFuZCBjb25maWcgZGF0YSBoYXMgY2hhbmdlZFxuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnTW9kdWxlU3RhdHVzQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgaW5wdXQgZmllbGRzIGFuZCBzaG93IG1lc3NhZ2UgZm9yIGNoYW5nZWQgb2JqZWN0c1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlZnJlc2ggdGhlIHBhZ2UgdG8gcmVmbGVjdCBjaGFuZ2VzIGlzIGJldHRlciB0byBkbyBpbiBvbiBtb2R1bGUgcGFnZSB1c2luZyBldmVudCBNb2R1bGVTdGF0dXNDaGFuZ2VkIHN1YnNjcmlwdGlvblxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGB0cltkYXRhLWlkPSR7dGhpcy51bmlxaWR9XWApO1xuICAgICAgICAgICAgdGhpcy5zaG93TW9kdWxlRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvciwgcmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgZW5hYmxpbmcgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJNb2R1bGVFbmFibGUocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgLy8gVXBkYXRlIFVJIHRvIHNob3cgbW9kdWxlIGlzIGVuYWJsZWRcbiAgICAgICAgICAgIHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBldmVudHMgdG8gaW5kaWNhdGUgbW9kdWxlIHN0YXR1cyBhbmQgY29uZmlnIGRhdGEgaGFzIGNoYW5nZWRcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXG4gICAgICAgICAgICAvLyBFbmFibGUgaW5wdXQgZmllbGRzIGFuZCBzaG93IG1lc3NhZ2UgZm9yIGNoYW5nZWQgb2JqZWN0c1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlZnJlc2ggdGhlIHBhZ2UgdG8gcmVmbGVjdCBjaGFuZ2VzIGlzIGJldHRlciB0byBkbyBpbiBvbiBtb2R1bGUgcGFnZSB1c2luZyBldmVudCBNb2R1bGVTdGF0dXNDaGFuZ2VkIHN1YnNjcmlwdGlvblxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICB0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQpO1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGB0cltkYXRhLWlkPSR7dGhpcy51bmlxaWR9XWApO1xuICAgICAgICAgICAgdGhpcy5zaG93TW9kdWxlRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvciwgcmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheXMgYW4gZXJyb3IgbWVzc2FnZSByZWxhdGVkIHRvIG1vZHVsZSBzdGF0dXMgaW4gdGhlIFVJLlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gVGhlIGpRdWVyeSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByb3cgaW4gdGhlIFVJIGFzc29jaWF0ZWQgd2l0aCB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBoZWFkZXIgLSBUaGUgaGVhZGVyIHRleHQgZm9yIHRoZSBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlcyAtIERldGFpbGVkIGVycm9yIG1lc3NhZ2VzIHRvIGJlIGRpc3BsYXllZC5cbiAgICAgKi9cbiAgICBzaG93TW9kdWxlRXJyb3IoJHJvdywgaGVhZGVyLCBtZXNzYWdlcz0nJykge1xuICAgICAgICBpZiAobWVzc2FnZXM9PT11bmRlZmluZWQpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICgkcm93Lmxlbmd0aD09PTApe1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2VzLmxpY2Vuc2UhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dMaWNlbnNlRXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVMaWNlbnNlUHJvYmxlbSwgbWVzc2FnZXMubGljZW5zZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhtZXNzYWdlcywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1lc3NhZ2VzLmxpY2Vuc2UhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgY29uc3QgbWFuYWdlTGluayA9IGA8YnI+JHtnbG9iYWxUcmFuc2xhdGUubGljX01hbmFnZUxpY2Vuc2V9IDxhIGhyZWY9XCIke0NvbmZpZy5rZXlNYW5hZ2VtZW50VXJsfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Q29uZmlnLmtleU1hbmFnZW1lbnRTaXRlfTwvYT5gO1xuICAgICAgICAgICAgbWVzc2FnZXMubGljZW5zZS5wdXNoKG1hbmFnZUxpbmspO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRleHREZXNjcmlwdGlvbiA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZXMpO1xuICAgICAgICBjb25zdCBodG1sTWVzc2FnZT0gIGA8dHIgY2xhc3M9XCJ1aSB3YXJuaW5nIHRhYmxlLWVycm9yLW1lc3NhZ2VzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNvbHNwYW49XCI1XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNlbnRlciBhbGlnbmVkIGljb24gaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtoZWFkZXJ9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHA+JHt0ZXh0RGVzY3JpcHRpb259PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RyPmA7XG4gICAgICAgICRyb3cuYWRkQ2xhc3MoJ3dhcm5pbmcnKTtcbiAgICAgICAgJHJvdy5iZWZvcmUoaHRtbE1lc3NhZ2UpO1xuICAgIH1cbn1cblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGV4dGVybmFsIG1vZHVsZSBzdGF0dXMgdG9nZ2xlcy5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zdCB1bmlxSWQgPSAkKCcjbW9kdWxlLXN0YXR1cy10b2dnbGUnKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgaWYgKHVuaXFJZCkge1xuICAgICAgICBjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cygpO1xuICAgICAgICBwYWdlU3RhdHVzLmluaXRpYWxpemUodW5pcUlkLCB0cnVlKTtcbiAgICB9XG59KTtcbiJdfQ==