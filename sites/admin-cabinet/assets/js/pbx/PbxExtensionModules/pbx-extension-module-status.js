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

/* global ModulesAPI, globalTranslate, UserMessage, EventBus */

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
      }); // Fallback for lost nchan messages: polls the operations journal and
      // unfreezes the toggle when the backend reached a terminal state the
      // browser never heard about.

      this.watchdog = ModulesAPI.createOperationWatchdog({
        onTerminal: function onTerminal(data) {
          return _this.cbWatchdogTerminal(data);
        },
        onStalled: function onStalled() {
          return _this.cbWatchdogStalled();
        }
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
      var _this2 = this;

      this.$statusIcon.addClass('spinner loading icon');
      this.$allToggles.addClass('disabled');
      $('a.button').addClass('disabled');
      this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
      var params = {
        uniqid: this.uniqid,
        channelId: this.channelId
      };
      this.watchdog.start(this.uniqid);
      ModulesAPI.enableModule(params, function (response) {
        _this2.cbAfterCommandAccepted(response, true);
      });
    }
    /**
     * Callback function when the module is unchecked.
     */

  }, {
    key: "cbOnUnchecked",
    value: function cbOnUnchecked() {
      var _this3 = this;

      this.$statusIcon.addClass('spinner loading icon');
      this.$allToggles.addClass('disabled');
      $('a.button').addClass('disabled');
      this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
      var params = {
        uniqid: this.uniqid,
        channelId: this.channelId
      };
      this.watchdog.start(this.uniqid);
      ModulesAPI.disableModule(params, function (response) {
        _this3.cbAfterCommandAccepted(response, false);
      });
    }
    /**
     * Fail-fast on an immediately rejected command (HTTP error, full queue):
     * without this the user would wait the full watchdog stall timeout.
     * @param {object} response - The HTTP-level API response.
     * @param {boolean} wasEnable - true when the rejected command was enable.
     */

  }, {
    key: "cbAfterCommandAccepted",
    value: function cbAfterCommandAccepted(response, wasEnable) {
      if (response && response.result === false) {
        this.watchdog.stop();
        this.unfreezeToggle(wasEnable);
        var $row = $("tr[data-id=".concat(this.uniqid, "]"));
        this.showModuleError($row, globalTranslate.ext_ModuleChangeStatusError, response.messages);
      }
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

      this.watchdog.notifyEvent(response);
      var stageDetails = response.stageDetails;

      if (response.stage === 'Stage_I_ModuleDisable') {
        this.watchdog.stop();
        var cbAfterModuleDisable = $.proxy(this.cbAfterModuleDisable, this);
        cbAfterModuleDisable(stageDetails);
      } else if (response.stage === 'Stage_I_ModuleEnable') {
        this.watchdog.stop();
        var cbAfterModuleEnable = $.proxy(this.cbAfterModuleEnable, this);
        cbAfterModuleEnable(stageDetails);
      }
    }
    /**
     * Handles a terminal journal state discovered by polling: the nchan
     * message was lost, but the backend finished the operation.
     * @param {object} data - The journal record from getOperationStatus.
     */

  }, {
    key: "cbWatchdogTerminal",
    value: function cbWatchdogTerminal(data) {
      if (data.state === 'completed') {
        window.location.reload();
        return;
      }

      this.unfreezeToggle(data.operation === 'enable');
      $('tr.table-error-messages').remove();
      var $row = $("tr[data-id=".concat(this.uniqid, "]"));
      this.showModuleError($row, globalTranslate.ext_ModuleChangeStatusError, data.errorMessages);
    }
    /**
     * Handles a stalled operation: no nchan events and no journal progress.
     */

  }, {
    key: "cbWatchdogStalled",
    value: function cbWatchdogStalled() {
      this.unfreezeToggle(this.$toggle.checkbox('is checked'));
      var $row = $("tr[data-id=".concat(this.uniqid, "]"));
      this.showModuleError($row, globalTranslate.ext_ModuleChangeStatusError, {
        error: [globalTranslate.ext_OperationStalledError || globalTranslate.ext_ModuleChangeStatusError]
      });
    }
    /**
     * Returns the toggle and the surrounding controls to an interactive state.
     * @param {boolean} enableFailed - true when a failed enable should revert to unchecked.
     */

  }, {
    key: "unfreezeToggle",
    value: function unfreezeToggle(enableFailed) {
      if (enableFailed) {
        this.$toggle.checkbox('set unchecked');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
        this.$disabilityFields.addClass('disabled');
      } else {
        this.$toggle.checkbox('set checked');
        this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
        this.$disabilityFields.removeClass('disabled');
      }

      this.$allToggles.removeClass('disabled');
      this.$statusIcon.removeClass('spinner loading icon');
      $('a.button').removeClass('disabled');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJHRvZ2dsZVNlZ21lbnQiLCIkYWxsVG9nZ2xlcyIsIiRzdGF0dXNJY29uIiwic2hvdyIsIiRsYWJlbCIsImZpbmQiLCIkZGlzYWJpbGl0eUZpZWxkcyIsImNiT25DaGVja2VkIiwicHJveHkiLCJjYk9uVW5jaGVja2VkIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJvblVuY2hlY2tlZCIsIndhdGNoZG9nIiwiTW9kdWxlc0FQSSIsImNyZWF0ZU9wZXJhdGlvbldhdGNoZG9nIiwib25UZXJtaW5hbCIsImRhdGEiLCJjYldhdGNoZG9nVGVybWluYWwiLCJvblN0YWxsZWQiLCJjYldhdGNoZG9nU3RhbGxlZCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwiY2hhbm5lbElkIiwiY2JBZnRlckNoYW5nZU1vZHVsZVN0YXR1cyIsIm5ld1RleHQiLCJ0ZXh0IiwiYWRkQ2xhc3MiLCJjaGFuZ2VMYWJlbFRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfTW9kdWxlU3RhdHVzQ2hhbmdpbmciLCJwYXJhbXMiLCJzdGFydCIsImVuYWJsZU1vZHVsZSIsInJlc3BvbnNlIiwiY2JBZnRlckNvbW1hbmRBY2NlcHRlZCIsImRpc2FibGVNb2R1bGUiLCJ3YXNFbmFibGUiLCJyZXN1bHQiLCJzdG9wIiwidW5mcmVlemVUb2dnbGUiLCIkcm93Iiwic2hvd01vZHVsZUVycm9yIiwiZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yIiwibWVzc2FnZXMiLCJtb2R1bGVVbmlxdWVJZCIsIm5vdGlmeUV2ZW50Iiwic3RhZ2VEZXRhaWxzIiwic3RhZ2UiLCJjYkFmdGVyTW9kdWxlRGlzYWJsZSIsImNiQWZ0ZXJNb2R1bGVFbmFibGUiLCJzdGF0ZSIsIndpbmRvdyIsImxvY2F0aW9uIiwicmVsb2FkIiwib3BlcmF0aW9uIiwicmVtb3ZlIiwiZXJyb3JNZXNzYWdlcyIsImVycm9yIiwiZXh0X09wZXJhdGlvblN0YWxsZWRFcnJvciIsImVuYWJsZUZhaWxlZCIsImV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkIiwiZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCIsInJlbW92ZUNsYXNzIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50IiwiZGlzcGF0Y2hFdmVudCIsImNoYW5nZWRPYmplY3RzIiwidW5kZWZpbmVkIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfTW9kdWxlQ2hhbmdlZE9iamVjdHMiLCJoZWFkZXIiLCJsZW5ndGgiLCJsaWNlbnNlIiwic2hvd0xpY2Vuc2VFcnJvciIsImV4dF9Nb2R1bGVMaWNlbnNlUHJvYmxlbSIsIm1hbmFnZUxpbmsiLCJsaWNfTWFuYWdlTGljZW5zZSIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJrZXlNYW5hZ2VtZW50U2l0ZSIsInB1c2giLCJ0ZXh0RGVzY3JpcHRpb24iLCJjb252ZXJ0VG9UZXh0IiwiaHRtbE1lc3NhZ2UiLCJiZWZvcmUiLCJyZWFkeSIsInVuaXFJZCIsImF0dHIiLCJwYWdlU3RhdHVzIiwiaW5pdGlhbGl6ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxrQjs7Ozt1Q0FNVSxlOzs7Ozs7QUFFWjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0ksd0JBQVdDLE1BQVgsRUFBdUM7QUFBQTs7QUFBQSxVQUFwQkMsV0FBb0IsdUVBQU4sSUFBTTtBQUNuQyxXQUFLQyxPQUFMLEdBQWVDLENBQUMsNENBQW9DSCxNQUFwQyxTQUFoQjtBQUNBLFdBQUtJLGNBQUwsR0FBc0JELENBQUMsQ0FBQywrQkFBRCxDQUF2QjtBQUNBLFdBQUtFLFdBQUwsR0FBbUJGLENBQUMsdUJBQXBCO0FBQ0EsV0FBS0csV0FBTCxHQUFtQkgsQ0FBQyxjQUFPSCxNQUFQLG9CQUFwQjtBQUNBLFdBQUtJLGNBQUwsQ0FBb0JHLElBQXBCOztBQUNBLFVBQUlOLFdBQUosRUFBaUI7QUFDYixhQUFLTyxNQUFMLEdBQWNMLENBQUMsNENBQW9DSCxNQUFwQyxTQUFELENBQWlEUyxJQUFqRCxDQUFzRCxPQUF0RCxDQUFkO0FBQ0gsT0FGRCxNQUVPO0FBQ0gsYUFBS0QsTUFBTCxHQUFjLEtBQWQ7QUFDSDs7QUFDRCxXQUFLUixNQUFMLEdBQWNBLE1BQWQ7QUFDQSxXQUFLVSxpQkFBTCxHQUF5QlAsQ0FBQyxjQUFPSCxNQUFQLGtCQUExQjtBQUNBLFVBQU1XLFdBQVcsR0FBR1IsQ0FBQyxDQUFDUyxLQUFGLENBQVEsS0FBS0QsV0FBYixFQUEwQixJQUExQixDQUFwQjtBQUNBLFVBQU1FLGFBQWEsR0FBR1YsQ0FBQyxDQUFDUyxLQUFGLENBQVEsS0FBS0MsYUFBYixFQUE0QixJQUE1QixDQUF0QjtBQUNBLFdBQUtYLE9BQUwsQ0FBYVksUUFBYixDQUFzQjtBQUNsQkMsUUFBQUEsU0FBUyxFQUFFSixXQURPO0FBRWxCSyxRQUFBQSxXQUFXLEVBQUVIO0FBRkssT0FBdEIsRUFmbUMsQ0FvQm5DO0FBQ0E7QUFDQTs7QUFDQSxXQUFLSSxRQUFMLEdBQWdCQyxVQUFVLENBQUNDLHVCQUFYLENBQW1DO0FBQy9DQyxRQUFBQSxVQUFVLEVBQUUsb0JBQUFDLElBQUk7QUFBQSxpQkFBSSxLQUFJLENBQUNDLGtCQUFMLENBQXdCRCxJQUF4QixDQUFKO0FBQUEsU0FEK0I7QUFFL0NFLFFBQUFBLFNBQVMsRUFBRTtBQUFBLGlCQUFNLEtBQUksQ0FBQ0MsaUJBQUwsRUFBTjtBQUFBO0FBRm9DLE9BQW5DLENBQWhCO0FBS0FDLE1BQUFBLFFBQVEsQ0FBQ0MsU0FBVCxDQUFtQixLQUFLQyxTQUF4QixFQUFtQyxVQUFBTixJQUFJLEVBQUk7QUFDdkMsUUFBQSxLQUFJLENBQUNPLHlCQUFMLENBQStCUCxJQUEvQjtBQUNILE9BRkQ7QUFHSDtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7O1dBQ0kseUJBQWdCUSxPQUFoQixFQUF5QjtBQUNyQixVQUFJLEtBQUtyQixNQUFULEVBQWlCO0FBQ2IsYUFBS0EsTUFBTCxDQUFZc0IsSUFBWixDQUFpQkQsT0FBakI7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksdUJBQWM7QUFBQTs7QUFDVixXQUFLdkIsV0FBTCxDQUFpQnlCLFFBQWpCLENBQTBCLHNCQUExQjtBQUNBLFdBQUsxQixXQUFMLENBQWlCMEIsUUFBakIsQ0FBMEIsVUFBMUI7QUFDQTVCLE1BQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBYzRCLFFBQWQsQ0FBdUIsVUFBdkI7QUFDQSxXQUFLQyxlQUFMLENBQXFCQyxlQUFlLENBQUNDLHdCQUFyQztBQUNBLFVBQU1DLE1BQU0sR0FBRztBQUNYbkMsUUFBQUEsTUFBTSxFQUFFLEtBQUtBLE1BREY7QUFFWDJCLFFBQUFBLFNBQVMsRUFBRSxLQUFLQTtBQUZMLE9BQWY7QUFJQSxXQUFLVixRQUFMLENBQWNtQixLQUFkLENBQW9CLEtBQUtwQyxNQUF6QjtBQUNBa0IsTUFBQUEsVUFBVSxDQUFDbUIsWUFBWCxDQUF3QkYsTUFBeEIsRUFBZ0MsVUFBQ0csUUFBRCxFQUFjO0FBQzFDLFFBQUEsTUFBSSxDQUFDQyxzQkFBTCxDQUE0QkQsUUFBNUIsRUFBc0MsSUFBdEM7QUFDSCxPQUZEO0FBR0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSx5QkFBZ0I7QUFBQTs7QUFDWixXQUFLaEMsV0FBTCxDQUFpQnlCLFFBQWpCLENBQTBCLHNCQUExQjtBQUNBLFdBQUsxQixXQUFMLENBQWlCMEIsUUFBakIsQ0FBMEIsVUFBMUI7QUFDQTVCLE1BQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBYzRCLFFBQWQsQ0FBdUIsVUFBdkI7QUFDQSxXQUFLQyxlQUFMLENBQXFCQyxlQUFlLENBQUNDLHdCQUFyQztBQUNBLFVBQU1DLE1BQU0sR0FBRztBQUNYbkMsUUFBQUEsTUFBTSxFQUFFLEtBQUtBLE1BREY7QUFFWDJCLFFBQUFBLFNBQVMsRUFBRSxLQUFLQTtBQUZMLE9BQWY7QUFJQSxXQUFLVixRQUFMLENBQWNtQixLQUFkLENBQW9CLEtBQUtwQyxNQUF6QjtBQUNBa0IsTUFBQUEsVUFBVSxDQUFDc0IsYUFBWCxDQUF5QkwsTUFBekIsRUFBaUMsVUFBQ0csUUFBRCxFQUFjO0FBQzNDLFFBQUEsTUFBSSxDQUFDQyxzQkFBTCxDQUE0QkQsUUFBNUIsRUFBc0MsS0FBdEM7QUFDSCxPQUZEO0FBR0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSxnQ0FBdUJBLFFBQXZCLEVBQWlDRyxTQUFqQyxFQUE0QztBQUN4QyxVQUFJSCxRQUFRLElBQUlBLFFBQVEsQ0FBQ0ksTUFBVCxLQUFvQixLQUFwQyxFQUEyQztBQUN2QyxhQUFLekIsUUFBTCxDQUFjMEIsSUFBZDtBQUNBLGFBQUtDLGNBQUwsQ0FBb0JILFNBQXBCO0FBQ0EsWUFBTUksSUFBSSxHQUFHMUMsQ0FBQyxzQkFBZSxLQUFLSCxNQUFwQixPQUFkO0FBQ0EsYUFBSzhDLGVBQUwsQ0FBcUJELElBQXJCLEVBQTJCWixlQUFlLENBQUNjLDJCQUEzQyxFQUF3RVQsUUFBUSxDQUFDVSxRQUFqRjtBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLG1DQUEwQlYsUUFBMUIsRUFBb0M7QUFDaEMsVUFBSUEsUUFBUSxDQUFDVyxjQUFULEtBQTRCLEtBQUtqRCxNQUFyQyxFQUE2QztBQUN6QztBQUNIOztBQUNELFdBQUtpQixRQUFMLENBQWNpQyxXQUFkLENBQTBCWixRQUExQjtBQUNBLFVBQU1hLFlBQVksR0FBR2IsUUFBUSxDQUFDYSxZQUE5Qjs7QUFDQSxVQUFJYixRQUFRLENBQUNjLEtBQVQsS0FBbUIsdUJBQXZCLEVBQStDO0FBQzNDLGFBQUtuQyxRQUFMLENBQWMwQixJQUFkO0FBQ0EsWUFBTVUsb0JBQW9CLEdBQUdsRCxDQUFDLENBQUNTLEtBQUYsQ0FBUSxLQUFLeUMsb0JBQWIsRUFBbUMsSUFBbkMsQ0FBN0I7QUFDQUEsUUFBQUEsb0JBQW9CLENBQUNGLFlBQUQsQ0FBcEI7QUFDSCxPQUpELE1BSU8sSUFBSWIsUUFBUSxDQUFDYyxLQUFULEtBQW1CLHNCQUF2QixFQUE4QztBQUNqRCxhQUFLbkMsUUFBTCxDQUFjMEIsSUFBZDtBQUNBLFlBQU1XLG1CQUFtQixHQUFHbkQsQ0FBQyxDQUFDUyxLQUFGLENBQVEsS0FBSzBDLG1CQUFiLEVBQWtDLElBQWxDLENBQTVCO0FBQ0FBLFFBQUFBLG1CQUFtQixDQUFDSCxZQUFELENBQW5CO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSw0QkFBbUI5QixJQUFuQixFQUF5QjtBQUNyQixVQUFJQSxJQUFJLENBQUNrQyxLQUFMLEtBQWUsV0FBbkIsRUFBZ0M7QUFDNUJDLFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsTUFBaEI7QUFDQTtBQUNIOztBQUNELFdBQUtkLGNBQUwsQ0FBb0J2QixJQUFJLENBQUNzQyxTQUFMLEtBQW1CLFFBQXZDO0FBQ0F4RCxNQUFBQSxDQUFDLENBQUMseUJBQUQsQ0FBRCxDQUE2QnlELE1BQTdCO0FBQ0EsVUFBTWYsSUFBSSxHQUFHMUMsQ0FBQyxzQkFBZSxLQUFLSCxNQUFwQixPQUFkO0FBQ0EsV0FBSzhDLGVBQUwsQ0FBcUJELElBQXJCLEVBQTJCWixlQUFlLENBQUNjLDJCQUEzQyxFQUF3RTFCLElBQUksQ0FBQ3dDLGFBQTdFO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSw2QkFBb0I7QUFDaEIsV0FBS2pCLGNBQUwsQ0FBb0IsS0FBSzFDLE9BQUwsQ0FBYVksUUFBYixDQUFzQixZQUF0QixDQUFwQjtBQUNBLFVBQU0rQixJQUFJLEdBQUcxQyxDQUFDLHNCQUFlLEtBQUtILE1BQXBCLE9BQWQ7QUFDQSxXQUFLOEMsZUFBTCxDQUFxQkQsSUFBckIsRUFBMkJaLGVBQWUsQ0FBQ2MsMkJBQTNDLEVBQ0k7QUFBQ2UsUUFBQUEsS0FBSyxFQUFFLENBQUM3QixlQUFlLENBQUM4Qix5QkFBaEIsSUFBNkM5QixlQUFlLENBQUNjLDJCQUE5RDtBQUFSLE9BREo7QUFFSDtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7O1dBQ0ksd0JBQWVpQixZQUFmLEVBQTZCO0FBQ3pCLFVBQUlBLFlBQUosRUFBa0I7QUFDZCxhQUFLOUQsT0FBTCxDQUFhWSxRQUFiLENBQXNCLGVBQXRCO0FBQ0EsYUFBS2tCLGVBQUwsQ0FBcUJDLGVBQWUsQ0FBQ2dDLGdDQUFyQztBQUNBLGFBQUt2RCxpQkFBTCxDQUF1QnFCLFFBQXZCLENBQWdDLFVBQWhDO0FBQ0gsT0FKRCxNQUlPO0FBQ0gsYUFBSzdCLE9BQUwsQ0FBYVksUUFBYixDQUFzQixhQUF0QjtBQUNBLGFBQUtrQixlQUFMLENBQXFCQyxlQUFlLENBQUNpQywrQkFBckM7QUFDQSxhQUFLeEQsaUJBQUwsQ0FBdUJ5RCxXQUF2QixDQUFtQyxVQUFuQztBQUNIOztBQUNELFdBQUs5RCxXQUFMLENBQWlCOEQsV0FBakIsQ0FBNkIsVUFBN0I7QUFDQSxXQUFLN0QsV0FBTCxDQUFpQjZELFdBQWpCLENBQTZCLHNCQUE3QjtBQUNBaEUsTUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjZ0UsV0FBZCxDQUEwQixVQUExQjtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSw4QkFBcUI3QixRQUFyQixFQUErQjtBQUMzQixVQUFJQSxRQUFRLENBQUNJLE1BQWIsRUFBcUI7QUFDakI7QUFDQSxhQUFLeEMsT0FBTCxDQUFhWSxRQUFiLENBQXNCLGVBQXRCO0FBQ0EsYUFBS1IsV0FBTCxDQUFpQjZELFdBQWpCLENBQTZCLHNCQUE3QjtBQUNBLGFBQUtuQyxlQUFMLENBQXFCQyxlQUFlLENBQUNnQyxnQ0FBckMsRUFKaUIsQ0FNakI7O0FBQ0EsWUFBTUcsS0FBSyxHQUFHQyxRQUFRLENBQUNDLFdBQVQsQ0FBcUIsT0FBckIsQ0FBZDtBQUNBRixRQUFBQSxLQUFLLENBQUNHLFNBQU4sQ0FBZ0IscUJBQWhCLEVBQXVDLEtBQXZDLEVBQThDLElBQTlDO0FBQ0FmLFFBQUFBLE1BQU0sQ0FBQ2dCLGFBQVAsQ0FBcUJKLEtBQXJCO0FBQ0FBLFFBQUFBLEtBQUssQ0FBQ0csU0FBTixDQUFnQixtQkFBaEIsRUFBcUMsS0FBckMsRUFBNEMsSUFBNUM7QUFDQWYsUUFBQUEsTUFBTSxDQUFDZ0IsYUFBUCxDQUFxQkosS0FBckIsRUFYaUIsQ0FhakI7O0FBQ0EsYUFBSzFELGlCQUFMLENBQXVCcUIsUUFBdkIsQ0FBZ0MsVUFBaEM7O0FBQ0EsWUFBSU8sUUFBUSxDQUFDakIsSUFBVCxDQUFjb0QsY0FBZCxLQUFpQ0MsU0FBckMsRUFBZ0Q7QUFDNUNDLFVBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QnRDLFFBQVEsQ0FBQ2pCLElBQVQsQ0FBY29ELGNBQTFDLEVBQTBEeEMsZUFBZSxDQUFDNEMsd0JBQTFFO0FBQ0gsU0FqQmdCLENBbUJqQjs7O0FBQ0FyQixRQUFBQSxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLE1BQWhCO0FBQ0gsT0FyQkQsTUFxQk87QUFDSCxhQUFLeEQsT0FBTCxDQUFhWSxRQUFiLENBQXNCLGFBQXRCO0FBQ0EsYUFBS2tCLGVBQUwsQ0FBcUJDLGVBQWUsQ0FBQ2lDLCtCQUFyQztBQUNBLGFBQUt4RCxpQkFBTCxDQUF1QnlELFdBQXZCLENBQW1DLFVBQW5DO0FBQ0EsWUFBTXRCLElBQUksR0FBRzFDLENBQUMsc0JBQWUsS0FBS0gsTUFBcEIsT0FBZDtBQUNBLGFBQUs4QyxlQUFMLENBQXFCRCxJQUFyQixFQUEyQlosZUFBZSxDQUFDYywyQkFBM0MsRUFBd0VULFFBQVEsQ0FBQ1UsUUFBakY7QUFDSDs7QUFDRCxXQUFLM0MsV0FBTCxDQUFpQjhELFdBQWpCLENBQTZCLFVBQTdCO0FBQ0FoRSxNQUFBQSxDQUFDLENBQUMsVUFBRCxDQUFELENBQWNnRSxXQUFkLENBQTBCLFVBQTFCO0FBQ0EsV0FBSzdELFdBQUwsQ0FBaUI2RCxXQUFqQixDQUE2QixzQkFBN0I7QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7O1dBQ0ksNkJBQW9CN0IsUUFBcEIsRUFBOEI7QUFDMUIsVUFBSUEsUUFBUSxDQUFDSSxNQUFiLEVBQXFCO0FBQ2pCdkMsUUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0J5RCxNQUF0QixHQURpQixDQUVqQjs7QUFDQSxhQUFLMUQsT0FBTCxDQUFhWSxRQUFiLENBQXNCLGFBQXRCO0FBQ0EsYUFBS2tCLGVBQUwsQ0FBcUJDLGVBQWUsQ0FBQ2lDLCtCQUFyQyxFQUppQixDQU1qQjs7QUFDQSxZQUFNRSxLQUFLLEdBQUdDLFFBQVEsQ0FBQ0MsV0FBVCxDQUFxQixPQUFyQixDQUFkO0FBQ0FGLFFBQUFBLEtBQUssQ0FBQ0csU0FBTixDQUFnQixxQkFBaEIsRUFBdUMsS0FBdkMsRUFBOEMsSUFBOUM7QUFDQWYsUUFBQUEsTUFBTSxDQUFDZ0IsYUFBUCxDQUFxQkosS0FBckI7QUFDQUEsUUFBQUEsS0FBSyxDQUFDRyxTQUFOLENBQWdCLG1CQUFoQixFQUFxQyxLQUFyQyxFQUE0QyxJQUE1QztBQUNBZixRQUFBQSxNQUFNLENBQUNnQixhQUFQLENBQXFCSixLQUFyQixFQVhpQixDQWFqQjs7QUFDQSxhQUFLMUQsaUJBQUwsQ0FBdUJ5RCxXQUF2QixDQUFtQyxVQUFuQzs7QUFDQSxZQUFJN0IsUUFBUSxDQUFDakIsSUFBVCxDQUFjb0QsY0FBZCxLQUFpQ0MsU0FBckMsRUFBZ0Q7QUFDNUNDLFVBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QnRDLFFBQVEsQ0FBQ2pCLElBQVQsQ0FBY29ELGNBQTFDLEVBQTBEeEMsZUFBZSxDQUFDNEMsd0JBQTFFO0FBQ0gsU0FqQmdCLENBbUJqQjs7O0FBQ0FyQixRQUFBQSxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLE1BQWhCO0FBQ0gsT0FyQkQsTUFxQk87QUFDSCxhQUFLeEQsT0FBTCxDQUFhWSxRQUFiLENBQXNCLGVBQXRCO0FBQ0EsYUFBS2tCLGVBQUwsQ0FBcUJDLGVBQWUsQ0FBQ2dDLGdDQUFyQztBQUNBLGFBQUt2RCxpQkFBTCxDQUF1QnFCLFFBQXZCLENBQWdDLFVBQWhDO0FBQ0EsWUFBTWMsSUFBSSxHQUFHMUMsQ0FBQyxzQkFBZSxLQUFLSCxNQUFwQixPQUFkO0FBQ0EsYUFBSzhDLGVBQUwsQ0FBcUJELElBQXJCLEVBQTJCWixlQUFlLENBQUNjLDJCQUEzQyxFQUF3RVQsUUFBUSxDQUFDVSxRQUFqRjtBQUNIOztBQUNELFdBQUszQyxXQUFMLENBQWlCOEQsV0FBakIsQ0FBNkIsVUFBN0I7QUFDQSxXQUFLN0QsV0FBTCxDQUFpQjZELFdBQWpCLENBQTZCLHNCQUE3QjtBQUNBaEUsTUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjZ0UsV0FBZCxDQUEwQixVQUExQjtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0kseUJBQWdCdEIsSUFBaEIsRUFBc0JpQyxNQUF0QixFQUEyQztBQUFBLFVBQWI5QixRQUFhLHVFQUFKLEVBQUk7O0FBQ3ZDLFVBQUlBLFFBQVEsS0FBRzBCLFNBQWYsRUFBeUI7QUFDckI7QUFDSDs7QUFDRCxVQUFJN0IsSUFBSSxDQUFDa0MsTUFBTCxLQUFjLENBQWxCLEVBQW9CO0FBQ2hCLFlBQUkvQixRQUFRLENBQUNnQyxPQUFULEtBQW1CTixTQUF2QixFQUFpQztBQUM3QkMsVUFBQUEsV0FBVyxDQUFDTSxnQkFBWixDQUE2QmhELGVBQWUsQ0FBQ2lELHdCQUE3QyxFQUF1RWxDLFFBQVEsQ0FBQ2dDLE9BQWhGO0FBQ0gsU0FGRCxNQUVPO0FBQ0hMLFVBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QjVCLFFBQTVCLEVBQXNDZixlQUFlLENBQUNjLDJCQUF0RDtBQUNIOztBQUNEO0FBQ0g7O0FBQ0QsVUFBSUMsUUFBUSxDQUFDZ0MsT0FBVCxLQUFtQk4sU0FBdkIsRUFBaUM7QUFDN0IsWUFBTVMsVUFBVSxpQkFBVWxELGVBQWUsQ0FBQ21ELGlCQUExQix3QkFBd0RDLE1BQU0sQ0FBQ0MsZ0JBQS9ELGtDQUFvR0QsTUFBTSxDQUFDRSxpQkFBM0csU0FBaEI7QUFDQXZDLFFBQUFBLFFBQVEsQ0FBQ2dDLE9BQVQsQ0FBaUJRLElBQWpCLENBQXNCTCxVQUF0QjtBQUNIOztBQUNELFVBQU1NLGVBQWUsR0FBR2QsV0FBVyxDQUFDZSxhQUFaLENBQTBCMUMsUUFBMUIsQ0FBeEI7QUFDQSxVQUFNMkMsV0FBVyxvWkFLcUJiLE1BTHJCLGdLQVF3QlcsZUFSeEIsbUpBQWpCO0FBWUE1QyxNQUFBQSxJQUFJLENBQUNkLFFBQUwsQ0FBYyxTQUFkO0FBQ0FjLE1BQUFBLElBQUksQ0FBQytDLE1BQUwsQ0FBWUQsV0FBWjtBQUNIOzs7O0tBR0w7OztBQUNBeEYsQ0FBQyxDQUFDa0UsUUFBRCxDQUFELENBQVl3QixLQUFaLENBQWtCLFlBQU07QUFDcEIsTUFBTUMsTUFBTSxHQUFHM0YsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkI0RixJQUEzQixDQUFnQyxZQUFoQyxDQUFmOztBQUNBLE1BQUlELE1BQUosRUFBWTtBQUNSLFFBQU1FLFVBQVUsR0FBRyxJQUFJakcsa0JBQUosRUFBbkI7QUFDQWlHLElBQUFBLFVBQVUsQ0FBQ0MsVUFBWCxDQUFzQkgsTUFBdEIsRUFBOEIsSUFBOUI7QUFDSDtBQUNKLENBTkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgTW9kdWxlc0FQSSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXZlbnRCdXMgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBzdGF0dXMgb2YgYW4gZXh0ZXJuYWwgbW9kdWxlLlxuICogQGNsYXNzIFBieEV4dGVuc2lvblN0YXR1c1xuICogQG1lbWJlcm9mIG1vZHVsZTpwYnhFeHRlbnNpb25Nb2R1bGVNb2RpZnlcbiAqL1xuY2xhc3MgUGJ4RXh0ZW5zaW9uU3RhdHVzIHtcblxuICAgIC8qKlxuICAgICAqIFRoZSBpZGVudGlmaWVyIGZvciB0aGUgUFVCL1NVQiBjaGFubmVsIHVzZWQgdG8gc3Vic2NyaWJlIHRvIG1vZHVsZSBzdGF0dXMgdXBkYXRlcy5cbiAgICAgKiBUaGlzIGVuc3VyZXMgdGhhdCB0aGUgY2xpZW50IGlzIGxpc3RlbmluZyBvbiB0aGUgY29ycmVjdCBjaGFubmVsIGZvciByZWxldmFudCBldmVudHMuXG4gICAgICovXG4gICAgY2hhbm5lbElkID0gJ21vZHVsZS1zdGF0dXMnO1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG1vZHVsZSBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHVuaXFpZCAtIFRoZSB1bmlxdWUgSUQgb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjaGFuZ2VMYWJlbD10cnVlXSAtIEluZGljYXRlcyB3aGV0aGVyIHRvIGNoYW5nZSB0aGUgbGFiZWwgdGV4dC5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKHVuaXFpZCwgY2hhbmdlTGFiZWwgPSB0cnVlKSB7XG4gICAgICAgIHRoaXMuJHRvZ2dsZSA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApO1xuICAgICAgICB0aGlzLiR0b2dnbGVTZWdtZW50ID0gJCgnI21vZHVsZS1zdGF0dXMtdG9nZ2xlLXNlZ21lbnQnKTtcbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcyA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hgKTtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbiA9ICQoYHRyIyR7dW5pcWlkfSBpLnN0YXR1cy1pY29uYCk7XG4gICAgICAgIHRoaXMuJHRvZ2dsZVNlZ21lbnQuc2hvdygpO1xuICAgICAgICBpZiAoY2hhbmdlTGFiZWwpIHtcbiAgICAgICAgICAgIHRoaXMuJGxhYmVsID0gJChgLnVpLnRvZ2dsZS5jaGVja2JveFtkYXRhLXZhbHVlPVwiJHt1bmlxaWR9XCJdYCkuZmluZCgnbGFiZWwnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJGxhYmVsID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy51bmlxaWQgPSB1bmlxaWQ7XG4gICAgICAgIHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMgPSAkKGB0ciMke3VuaXFpZH0gLmRpc2FiaWxpdHlgKTtcbiAgICAgICAgY29uc3QgY2JPbkNoZWNrZWQgPSAkLnByb3h5KHRoaXMuY2JPbkNoZWNrZWQsIHRoaXMpO1xuICAgICAgICBjb25zdCBjYk9uVW5jaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25VbmNoZWNrZWQsIHRoaXMpO1xuICAgICAgICB0aGlzLiR0b2dnbGUuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGVja2VkOiBjYk9uQ2hlY2tlZCxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkOiBjYk9uVW5jaGVja2VkLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBGYWxsYmFjayBmb3IgbG9zdCBuY2hhbiBtZXNzYWdlczogcG9sbHMgdGhlIG9wZXJhdGlvbnMgam91cm5hbCBhbmRcbiAgICAgICAgLy8gdW5mcmVlemVzIHRoZSB0b2dnbGUgd2hlbiB0aGUgYmFja2VuZCByZWFjaGVkIGEgdGVybWluYWwgc3RhdGUgdGhlXG4gICAgICAgIC8vIGJyb3dzZXIgbmV2ZXIgaGVhcmQgYWJvdXQuXG4gICAgICAgIHRoaXMud2F0Y2hkb2cgPSBNb2R1bGVzQVBJLmNyZWF0ZU9wZXJhdGlvbldhdGNoZG9nKHtcbiAgICAgICAgICAgIG9uVGVybWluYWw6IGRhdGEgPT4gdGhpcy5jYldhdGNoZG9nVGVybWluYWwoZGF0YSksXG4gICAgICAgICAgICBvblN0YWxsZWQ6ICgpID0+IHRoaXMuY2JXYXRjaGRvZ1N0YWxsZWQoKSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKHRoaXMuY2hhbm5lbElkLCBkYXRhID0+IHtcbiAgICAgICAgICAgIHRoaXMuY2JBZnRlckNoYW5nZU1vZHVsZVN0YXR1cyhkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hhbmdlcyB0aGUgbGFiZWwgdGV4dC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3VGV4dCAtIFRoZSBuZXcgbGFiZWwgdGV4dC5cbiAgICAgKi9cbiAgICBjaGFuZ2VMYWJlbFRleHQobmV3VGV4dCkge1xuICAgICAgICBpZiAodGhpcy4kbGFiZWwpIHtcbiAgICAgICAgICAgIHRoaXMuJGxhYmVsLnRleHQobmV3VGV4dCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIHRoZSBtb2R1bGUgaXMgY2hlY2tlZC5cbiAgICAgKi9cbiAgICBjYk9uQ2hlY2tlZCgpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbi5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIHVuaXFpZDogdGhpcy51bmlxaWQsXG4gICAgICAgICAgICBjaGFubmVsSWQ6IHRoaXMuY2hhbm5lbElkLFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLndhdGNoZG9nLnN0YXJ0KHRoaXMudW5pcWlkKTtcbiAgICAgICAgTW9kdWxlc0FQSS5lbmFibGVNb2R1bGUocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY2JBZnRlckNvbW1hbmRBY2NlcHRlZChyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gdGhlIG1vZHVsZSBpcyB1bmNoZWNrZWQuXG4gICAgICovXG4gICAgY2JPblVuY2hlY2tlZCgpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbi5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIHVuaXFpZDogdGhpcy51bmlxaWQsXG4gICAgICAgICAgICBjaGFubmVsSWQ6IHRoaXMuY2hhbm5lbElkLFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLndhdGNoZG9nLnN0YXJ0KHRoaXMudW5pcWlkKTtcbiAgICAgICAgTW9kdWxlc0FQSS5kaXNhYmxlTW9kdWxlKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNiQWZ0ZXJDb21tYW5kQWNjZXB0ZWQocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmFpbC1mYXN0IG9uIGFuIGltbWVkaWF0ZWx5IHJlamVjdGVkIGNvbW1hbmQgKEhUVFAgZXJyb3IsIGZ1bGwgcXVldWUpOlxuICAgICAqIHdpdGhvdXQgdGhpcyB0aGUgdXNlciB3b3VsZCB3YWl0IHRoZSBmdWxsIHdhdGNoZG9nIHN0YWxsIHRpbWVvdXQuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIEhUVFAtbGV2ZWwgQVBJIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2FzRW5hYmxlIC0gdHJ1ZSB3aGVuIHRoZSByZWplY3RlZCBjb21tYW5kIHdhcyBlbmFibGUuXG4gICAgICovXG4gICAgY2JBZnRlckNvbW1hbmRBY2NlcHRlZChyZXNwb25zZSwgd2FzRW5hYmxlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLndhdGNoZG9nLnN0b3AoKTtcbiAgICAgICAgICAgIHRoaXMudW5mcmVlemVUb2dnbGUod2FzRW5hYmxlKTtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGB0cltkYXRhLWlkPSR7dGhpcy51bmlxaWR9XWApO1xuICAgICAgICAgICAgdGhpcy5zaG93TW9kdWxlRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvciwgcmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgY2hhbmdpbmcgdGhlIG1vZHVsZSBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICBjYkFmdGVyQ2hhbmdlTW9kdWxlU3RhdHVzKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5tb2R1bGVVbmlxdWVJZCAhPT0gdGhpcy51bmlxaWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLndhdGNoZG9nLm5vdGlmeUV2ZW50KHJlc3BvbnNlKTtcbiAgICAgICAgY29uc3Qgc3RhZ2VEZXRhaWxzID0gcmVzcG9uc2Uuc3RhZ2VEZXRhaWxzO1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhZ2UgPT09ICdTdGFnZV9JX01vZHVsZURpc2FibGUnKXtcbiAgICAgICAgICAgIHRoaXMud2F0Y2hkb2cuc3RvcCgpO1xuICAgICAgICAgICAgY29uc3QgY2JBZnRlck1vZHVsZURpc2FibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZURpc2FibGUsIHRoaXMpO1xuICAgICAgICAgICAgY2JBZnRlck1vZHVsZURpc2FibGUoc3RhZ2VEZXRhaWxzKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGFnZSA9PT0gJ1N0YWdlX0lfTW9kdWxlRW5hYmxlJyl7XG4gICAgICAgICAgICB0aGlzLndhdGNoZG9nLnN0b3AoKTtcbiAgICAgICAgICAgIGNvbnN0IGNiQWZ0ZXJNb2R1bGVFbmFibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZUVuYWJsZSwgdGhpcyk7XG4gICAgICAgICAgICBjYkFmdGVyTW9kdWxlRW5hYmxlKHN0YWdlRGV0YWlscyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGEgdGVybWluYWwgam91cm5hbCBzdGF0ZSBkaXNjb3ZlcmVkIGJ5IHBvbGxpbmc6IHRoZSBuY2hhblxuICAgICAqIG1lc3NhZ2Ugd2FzIGxvc3QsIGJ1dCB0aGUgYmFja2VuZCBmaW5pc2hlZCB0aGUgb3BlcmF0aW9uLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gVGhlIGpvdXJuYWwgcmVjb3JkIGZyb20gZ2V0T3BlcmF0aW9uU3RhdHVzLlxuICAgICAqL1xuICAgIGNiV2F0Y2hkb2dUZXJtaW5hbChkYXRhKSB7XG4gICAgICAgIGlmIChkYXRhLnN0YXRlID09PSAnY29tcGxldGVkJykge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudW5mcmVlemVUb2dnbGUoZGF0YS5vcGVyYXRpb24gPT09ICdlbmFibGUnKTtcbiAgICAgICAgJCgndHIudGFibGUtZXJyb3ItbWVzc2FnZXMnKS5yZW1vdmUoKTtcbiAgICAgICAgY29uc3QgJHJvdyA9ICQoYHRyW2RhdGEtaWQ9JHt0aGlzLnVuaXFpZH1dYCk7XG4gICAgICAgIHRoaXMuc2hvd01vZHVsZUVycm9yKCRyb3csIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IsIGRhdGEuZXJyb3JNZXNzYWdlcyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBhIHN0YWxsZWQgb3BlcmF0aW9uOiBubyBuY2hhbiBldmVudHMgYW5kIG5vIGpvdXJuYWwgcHJvZ3Jlc3MuXG4gICAgICovXG4gICAgY2JXYXRjaGRvZ1N0YWxsZWQoKSB7XG4gICAgICAgIHRoaXMudW5mcmVlemVUb2dnbGUodGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdpcyBjaGVja2VkJykpO1xuICAgICAgICBjb25zdCAkcm93ID0gJChgdHJbZGF0YS1pZD0ke3RoaXMudW5pcWlkfV1gKTtcbiAgICAgICAgdGhpcy5zaG93TW9kdWxlRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcixcbiAgICAgICAgICAgIHtlcnJvcjogW2dsb2JhbFRyYW5zbGF0ZS5leHRfT3BlcmF0aW9uU3RhbGxlZEVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3JdfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgdG9nZ2xlIGFuZCB0aGUgc3Vycm91bmRpbmcgY29udHJvbHMgdG8gYW4gaW50ZXJhY3RpdmUgc3RhdGUuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBlbmFibGVGYWlsZWQgLSB0cnVlIHdoZW4gYSBmYWlsZWQgZW5hYmxlIHNob3VsZCByZXZlcnQgdG8gdW5jaGVja2VkLlxuICAgICAqL1xuICAgIHVuZnJlZXplVG9nZ2xlKGVuYWJsZUZhaWxlZCkge1xuICAgICAgICBpZiAoZW5hYmxlRmFpbGVkKSB7XG4gICAgICAgICAgICB0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNEaXNhYmxlZCk7XG4gICAgICAgICAgICB0aGlzLiRkaXNhYmlsaXR5RmllbGRzLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLiRhbGxUb2dnbGVzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB0aGlzLiRzdGF0dXNJY29uLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGRpc2FibGluZyB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgY2JBZnRlck1vZHVsZURpc2FibGUocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIFVJIHRvIHNob3cgbW9kdWxlIGlzIGRpc2FibGVkXG4gICAgICAgICAgICB0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgIHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgICAgICAgICB0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQpO1xuXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGV2ZW50cyB0byBpbmRpY2F0ZSBtb2R1bGUgc3RhdHVzIGFuZCBjb25maWcgZGF0YSBoYXMgY2hhbmdlZFxuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnTW9kdWxlU3RhdHVzQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgaW5wdXQgZmllbGRzIGFuZCBzaG93IG1lc3NhZ2UgZm9yIGNoYW5nZWQgb2JqZWN0c1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlZnJlc2ggdGhlIHBhZ2UgdG8gcmVmbGVjdCBjaGFuZ2VzIGlzIGJldHRlciB0byBkbyBpbiBvbiBtb2R1bGUgcGFnZSB1c2luZyBldmVudCBNb2R1bGVTdGF0dXNDaGFuZ2VkIHN1YnNjcmlwdGlvblxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQpO1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGB0cltkYXRhLWlkPSR7dGhpcy51bmlxaWR9XWApO1xuICAgICAgICAgICAgdGhpcy5zaG93TW9kdWxlRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvciwgcmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgZW5hYmxpbmcgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJNb2R1bGVFbmFibGUocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgLy8gVXBkYXRlIFVJIHRvIHNob3cgbW9kdWxlIGlzIGVuYWJsZWRcbiAgICAgICAgICAgIHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBldmVudHMgdG8gaW5kaWNhdGUgbW9kdWxlIHN0YXR1cyBhbmQgY29uZmlnIGRhdGEgaGFzIGNoYW5nZWRcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXG4gICAgICAgICAgICAvLyBFbmFibGUgaW5wdXQgZmllbGRzIGFuZCBzaG93IG1lc3NhZ2UgZm9yIGNoYW5nZWQgb2JqZWN0c1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNoYW5nZWRPYmplY3RzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VkT2JqZWN0cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlZnJlc2ggdGhlIHBhZ2UgdG8gcmVmbGVjdCBjaGFuZ2VzIGlzIGJldHRlciB0byBkbyBpbiBvbiBtb2R1bGUgcGFnZSB1c2luZyBldmVudCBNb2R1bGVTdGF0dXNDaGFuZ2VkIHN1YnNjcmlwdGlvblxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICB0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRGlzYWJsZWQpO1xuICAgICAgICAgICAgdGhpcy4kZGlzYWJpbGl0eUZpZWxkcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGB0cltkYXRhLWlkPSR7dGhpcy51bmlxaWR9XWApO1xuICAgICAgICAgICAgdGhpcy5zaG93TW9kdWxlRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvciwgcmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24ucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZyBpY29uJyk7XG4gICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheXMgYW4gZXJyb3IgbWVzc2FnZSByZWxhdGVkIHRvIG1vZHVsZSBzdGF0dXMgaW4gdGhlIFVJLlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gVGhlIGpRdWVyeSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByb3cgaW4gdGhlIFVJIGFzc29jaWF0ZWQgd2l0aCB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBoZWFkZXIgLSBUaGUgaGVhZGVyIHRleHQgZm9yIHRoZSBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlcyAtIERldGFpbGVkIGVycm9yIG1lc3NhZ2VzIHRvIGJlIGRpc3BsYXllZC5cbiAgICAgKi9cbiAgICBzaG93TW9kdWxlRXJyb3IoJHJvdywgaGVhZGVyLCBtZXNzYWdlcz0nJykge1xuICAgICAgICBpZiAobWVzc2FnZXM9PT11bmRlZmluZWQpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICgkcm93Lmxlbmd0aD09PTApe1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2VzLmxpY2Vuc2UhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dMaWNlbnNlRXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVMaWNlbnNlUHJvYmxlbSwgbWVzc2FnZXMubGljZW5zZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhtZXNzYWdlcywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVDaGFuZ2VTdGF0dXNFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1lc3NhZ2VzLmxpY2Vuc2UhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgY29uc3QgbWFuYWdlTGluayA9IGA8YnI+JHtnbG9iYWxUcmFuc2xhdGUubGljX01hbmFnZUxpY2Vuc2V9IDxhIGhyZWY9XCIke0NvbmZpZy5rZXlNYW5hZ2VtZW50VXJsfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Q29uZmlnLmtleU1hbmFnZW1lbnRTaXRlfTwvYT5gO1xuICAgICAgICAgICAgbWVzc2FnZXMubGljZW5zZS5wdXNoKG1hbmFnZUxpbmspO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRleHREZXNjcmlwdGlvbiA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZXMpO1xuICAgICAgICBjb25zdCBodG1sTWVzc2FnZT0gIGA8dHIgY2xhc3M9XCJ1aSB3YXJuaW5nIHRhYmxlLWVycm9yLW1lc3NhZ2VzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNvbHNwYW49XCI1XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNlbnRlciBhbGlnbmVkIGljb24gaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtoZWFkZXJ9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHA+JHt0ZXh0RGVzY3JpcHRpb259PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RyPmA7XG4gICAgICAgICRyb3cuYWRkQ2xhc3MoJ3dhcm5pbmcnKTtcbiAgICAgICAgJHJvdy5iZWZvcmUoaHRtbE1lc3NhZ2UpO1xuICAgIH1cbn1cblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGV4dGVybmFsIG1vZHVsZSBzdGF0dXMgdG9nZ2xlcy5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zdCB1bmlxSWQgPSAkKCcjbW9kdWxlLXN0YXR1cy10b2dnbGUnKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgaWYgKHVuaXFJZCkge1xuICAgICAgICBjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cygpO1xuICAgICAgICBwYWdlU3RhdHVzLmluaXRpYWxpemUodW5pcUlkLCB0cnVlKTtcbiAgICB9XG59KTtcbiJdfQ==