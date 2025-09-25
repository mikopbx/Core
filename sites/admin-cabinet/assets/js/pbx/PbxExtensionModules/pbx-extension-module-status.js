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
        uniqid: this.uniqid,
        channelId: this.channelId
      };
      ModulesAPI.enableModule(params);
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
        uniqid: this.uniqid,
        channelId: this.channelId
      };
      ModulesAPI.disableModule(params);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXN0YXR1cy5qcyJdLCJuYW1lcyI6WyJQYnhFeHRlbnNpb25TdGF0dXMiLCJ1bmlxaWQiLCJjaGFuZ2VMYWJlbCIsIiR0b2dnbGUiLCIkIiwiJHRvZ2dsZVNlZ21lbnQiLCIkYWxsVG9nZ2xlcyIsIiRzdGF0dXNJY29uIiwic2hvdyIsIiRsYWJlbCIsImZpbmQiLCIkZGlzYWJpbGl0eUZpZWxkcyIsImNiT25DaGVja2VkIiwicHJveHkiLCJjYk9uVW5jaGVja2VkIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJvblVuY2hlY2tlZCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwiY2hhbm5lbElkIiwiZGF0YSIsImNiQWZ0ZXJDaGFuZ2VNb2R1bGVTdGF0dXMiLCJuZXdUZXh0IiwidGV4dCIsImFkZENsYXNzIiwiY2hhbmdlTGFiZWxUZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X01vZHVsZVN0YXR1c0NoYW5naW5nIiwicGFyYW1zIiwiTW9kdWxlc0FQSSIsImVuYWJsZU1vZHVsZSIsImRpc2FibGVNb2R1bGUiLCJyZXNwb25zZSIsIm1vZHVsZVVuaXF1ZUlkIiwic3RhZ2VEZXRhaWxzIiwic3RhZ2UiLCJjYkFmdGVyTW9kdWxlRGlzYWJsZSIsImNiQWZ0ZXJNb2R1bGVFbmFibGUiLCJyZXN1bHQiLCJyZW1vdmVDbGFzcyIsImV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50Iiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsImNoYW5nZWRPYmplY3RzIiwidW5kZWZpbmVkIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfTW9kdWxlQ2hhbmdlZE9iamVjdHMiLCJsb2NhdGlvbiIsInJlbG9hZCIsImV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0VuYWJsZWQiLCIkcm93Iiwic2hvd01vZHVsZUVycm9yIiwiZXh0X01vZHVsZUNoYW5nZVN0YXR1c0Vycm9yIiwibWVzc2FnZXMiLCJyZW1vdmUiLCJoZWFkZXIiLCJsZW5ndGgiLCJsaWNlbnNlIiwic2hvd0xpY2Vuc2VFcnJvciIsImV4dF9Nb2R1bGVMaWNlbnNlUHJvYmxlbSIsIm1hbmFnZUxpbmsiLCJsaWNfTWFuYWdlTGljZW5zZSIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJrZXlNYW5hZ2VtZW50U2l0ZSIsInB1c2giLCJ0ZXh0RGVzY3JpcHRpb24iLCJjb252ZXJ0VG9UZXh0IiwiaHRtbE1lc3NhZ2UiLCJiZWZvcmUiLCJyZWFkeSIsInVuaXFJZCIsImF0dHIiLCJwYWdlU3RhdHVzIiwiaW5pdGlhbGl6ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxrQjs7Ozt1Q0FNVSxlOzs7Ozs7QUFFWjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0ksd0JBQVdDLE1BQVgsRUFBdUM7QUFBQTs7QUFBQSxVQUFwQkMsV0FBb0IsdUVBQU4sSUFBTTtBQUNuQyxXQUFLQyxPQUFMLEdBQWVDLENBQUMsNENBQW9DSCxNQUFwQyxTQUFoQjtBQUNBLFdBQUtJLGNBQUwsR0FBc0JELENBQUMsQ0FBQywrQkFBRCxDQUF2QjtBQUNBLFdBQUtFLFdBQUwsR0FBbUJGLENBQUMsdUJBQXBCO0FBQ0EsV0FBS0csV0FBTCxHQUFtQkgsQ0FBQyxjQUFPSCxNQUFQLG9CQUFwQjtBQUNBLFdBQUtJLGNBQUwsQ0FBb0JHLElBQXBCOztBQUNBLFVBQUlOLFdBQUosRUFBaUI7QUFDYixhQUFLTyxNQUFMLEdBQWNMLENBQUMsNENBQW9DSCxNQUFwQyxTQUFELENBQWlEUyxJQUFqRCxDQUFzRCxPQUF0RCxDQUFkO0FBQ0gsT0FG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QTdDLEVBQXVFTixRQUFRLENBQUNJLE9BQWhGO0FBQ0gsU0FGRCxNQUVPO0FBQ0hiLFVBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QlEsUUFBNUIsRUFBc0NoQyxlQUFlLENBQUMrQiwyQkFBdEQ7QUFDSDs7QUFDRDtBQUNIOztBQUNELFVBQUlDLFFBQVEsQ0FBQ0ksT0FBVCxLQUFtQmQsU0FBdkIsRUFBaUM7QUFDN0IsWUFBTWlCLFVBQVUsaUJBQVV2QyxlQUFlLENBQUN3QyxpQkFBMUIsd0JBQXdEQyxNQUFNLENBQUNDLGdCQUEvRCxrQ0FBb0dELE1BQU0sQ0FBQ0UsaUJBQTNHLFNBQWhCO0FBQ0FYLFFBQUFBLFFBQVEsQ0FBQ0ksT0FBVCxDQUFpQlEsSUFBakIsQ0FBc0JMLFVBQXRCO0FBQ0g7O0FBQ0QsVUFBTU0sZUFBZSxHQUFHdEIsV0FBVyxDQUFDdUIsYUFBWixDQUEwQmQsUUFBMUIsQ0FBeEI7QUFDQSxVQUFNZSxXQUFXLG9aQUtxQmIsTUFMckIsZ0tBUXdCVyxlQVJ4QixtSkFBakI7QUFZQWhCLE1BQUFBLElBQUksQ0FBQy9CLFFBQUwsQ0FBYyxTQUFkO0FBQ0ErQixNQUFBQSxJQUFJLENBQUNtQixNQUFMLENBQVlELFdBQVo7QUFDSDs7OztLQUdMOzs7QUFDQXRFLENBQUMsQ0FBQ3VDLFFBQUQsQ0FBRCxDQUFZaUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCLE1BQU1DLE1BQU0sR0FBR3pFLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCMEUsSUFBM0IsQ0FBZ0MsWUFBaEMsQ0FBZjs7QUFDQSxNQUFJRCxNQUFKLEVBQVk7QUFDUixRQUFNRSxVQUFVLEdBQUcsSUFBSS9FLGtCQUFKLEVBQW5CO0FBQ0ErRSxJQUFBQSxVQUFVLENBQUNDLFVBQVgsQ0FBc0JILE1BQXRCLEVBQThCLElBQTlCO0FBQ0g7QUFDSixDQU5EIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIE1vZHVsZXNBUEksIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIEV2ZW50QnVzICovXG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgc3RhdHVzIG9mIGFuIGV4dGVybmFsIG1vZHVsZS5cbiAqIEBjbGFzcyBQYnhFeHRlbnNpb25TdGF0dXNcbiAqIEBtZW1iZXJvZiBtb2R1bGU6cGJ4RXh0ZW5zaW9uTW9kdWxlTW9kaWZ5XG4gKi9cbmNsYXNzIFBieEV4dGVuc2lvblN0YXR1cyB7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgaWRlbnRpZmllciBmb3IgdGhlIFBVQi9TVUIgY2hhbm5lbCB1c2VkIHRvIHN1YnNjcmliZSB0byBtb2R1bGUgc3RhdHVzIHVwZGF0ZXMuXG4gICAgICogVGhpcyBlbnN1cmVzIHRoYXQgdGhlIGNsaWVudCBpcyBsaXN0ZW5pbmcgb24gdGhlIGNvcnJlY3QgY2hhbm5lbCBmb3IgcmVsZXZhbnQgZXZlbnRzLlxuICAgICAqL1xuICAgIGNoYW5uZWxJZCA9ICdtb2R1bGUtc3RhdHVzJztcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBtb2R1bGUgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1bmlxaWQgLSBUaGUgdW5pcXVlIElEIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY2hhbmdlTGFiZWw9dHJ1ZV0gLSBJbmRpY2F0ZXMgd2hldGhlciB0byBjaGFuZ2UgdGhlIGxhYmVsIHRleHQuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSh1bmlxaWQsIGNoYW5nZUxhYmVsID0gdHJ1ZSkge1xuICAgICAgICB0aGlzLiR0b2dnbGUgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94W2RhdGEtdmFsdWU9XCIke3VuaXFpZH1cIl1gKTtcbiAgICAgICAgdGhpcy4kdG9nZ2xlU2VnbWVudCA9ICQoJyNtb2R1bGUtc3RhdHVzLXRvZ2dsZS1zZWdtZW50Jyk7XG4gICAgICAgIHRoaXMuJGFsbFRvZ2dsZXMgPSAkKGAudWkudG9nZ2xlLmNoZWNrYm94YCk7XG4gICAgICAgIHRoaXMuJHN0YXR1c0ljb24gPSAkKGB0ciMke3VuaXFpZH0gaS5zdGF0dXMtaWNvbmApO1xuICAgICAgICB0aGlzLiR0b2dnbGVTZWdtZW50LnNob3coKTtcbiAgICAgICAgaWYgKGNoYW5nZUxhYmVsKSB7XG4gICAgICAgICAgICB0aGlzLiRsYWJlbCA9ICQoYC51aS50b2dnbGUuY2hlY2tib3hbZGF0YS12YWx1ZT1cIiR7dW5pcWlkfVwiXWApLmZpbmQoJ2xhYmVsJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLiRsYWJlbCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudW5pcWlkID0gdW5pcWlkO1xuICAgICAgICB0aGlzLiRkaXNhYmlsaXR5RmllbGRzID0gJChgdHIjJHt1bmlxaWR9IC5kaXNhYmlsaXR5YCk7XG4gICAgICAgIGNvbnN0IGNiT25DaGVja2VkID0gJC5wcm94eSh0aGlzLmNiT25DaGVja2VkLCB0aGlzKTtcbiAgICAgICAgY29uc3QgY2JPblVuY2hlY2tlZCA9ICQucHJveHkodGhpcy5jYk9uVW5jaGVja2VkLCB0aGlzKTtcbiAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZDogY2JPbkNoZWNrZWQsXG4gICAgICAgICAgICBvblVuY2hlY2tlZDogY2JPblVuY2hlY2tlZCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKHRoaXMuY2hhbm5lbElkLCBkYXRhID0+IHtcbiAgICAgICAgICAgIHRoaXMuY2JBZnRlckNoYW5nZU1vZHVsZVN0YXR1cyhkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hhbmdlcyB0aGUgbGFiZWwgdGV4dC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3VGV4dCAtIFRoZSBuZXcgbGFiZWwgdGV4dC5cbiAgICAgKi9cbiAgICBjaGFuZ2VMYWJlbFRleHQobmV3VGV4dCkge1xuICAgICAgICBpZiAodGhpcy4kbGFiZWwpIHtcbiAgICAgICAgICAgIHRoaXMuJGxhYmVsLnRleHQobmV3VGV4dCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIHRoZSBtb2R1bGUgaXMgY2hlY2tlZC5cbiAgICAgKi9cbiAgICBjYk9uQ2hlY2tlZCgpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbi5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIHVuaXFpZDogdGhpcy51bmlxaWQsXG4gICAgICAgICAgICBjaGFubmVsSWQ6IHRoaXMuY2hhbm5lbElkLFxuICAgICAgICB9O1xuICAgICAgICBNb2R1bGVzQVBJLmVuYWJsZU1vZHVsZShwYXJhbXMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gdGhlIG1vZHVsZSBpcyB1bmNoZWNrZWQuXG4gICAgICovXG4gICAgY2JPblVuY2hlY2tlZCgpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzSWNvbi5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nIGljb24nKTtcbiAgICAgICAgdGhpcy4kYWxsVG9nZ2xlcy5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVTdGF0dXNDaGFuZ2luZyk7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIHVuaXFpZDogdGhpcy51bmlxaWQsXG4gICAgICAgICAgICBjaGFubmVsSWQ6IHRoaXMuY2hhbm5lbElkLFxuICAgICAgICB9O1xuICAgICAgICBNb2R1bGVzQVBJLmRpc2FibGVNb2R1bGUocGFyYW1zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBjaGFuZ2luZyB0aGUgbW9kdWxlIHN0YXR1cy5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJDaGFuZ2VNb2R1bGVTdGF0dXMocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLm1vZHVsZVVuaXF1ZUlkICE9PSB0aGlzLnVuaXFpZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN0YWdlRGV0YWlscyA9IHJlc3BvbnNlLnN0YWdlRGV0YWlscztcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YWdlID09PSAnU3RhZ2VfSV9Nb2R1bGVEaXNhYmxlJyl7XG4gICAgICAgICAgICBjb25zdCBjYkFmdGVyTW9kdWxlRGlzYWJsZSA9ICQucHJveHkodGhpcy5jYkFmdGVyTW9kdWxlRGlzYWJsZSwgdGhpcyk7XG4gICAgICAgICAgICBjYkFmdGVyTW9kdWxlRGlzYWJsZShzdGFnZURldGFpbHMpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnN0YWdlID09PSAnU3RhZ2VfSV9Nb2R1bGVFbmFibGUnKXtcbiAgICAgICAgICAgIGNvbnN0IGNiQWZ0ZXJNb2R1bGVFbmFibGUgPSAkLnByb3h5KHRoaXMuY2JBZnRlck1vZHVsZUVuYWJsZSwgdGhpcyk7XG4gICAgICAgICAgICBjYkFmdGVyTW9kdWxlRW5hYmxlKHN0YWdlRGV0YWlscyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBkaXNhYmxpbmcgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJNb2R1bGVEaXNhYmxlKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVSSB0byBzaG93IG1vZHVsZSBpcyBkaXNhYmxlZFxuICAgICAgICAgICAgdGhpcy4kdG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICB0aGlzLiRzdGF0dXNJY29uLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkKTtcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBldmVudHMgdG8gaW5kaWNhdGUgbW9kdWxlIHN0YXR1cyBhbmQgY29uZmlnIGRhdGEgaGFzIGNoYW5nZWRcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ01vZHVsZVN0YXR1c0NoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXG4gICAgICAgICAgICAvLyBEaXNhYmxlIGlucHV0IGZpZWxkcyBhbmQgc2hvdyBtZXNzYWdlIGZvciBjaGFuZ2VkIG9iamVjdHNcbiAgICAgICAgICAgIHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlZE9iamVjdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZWZyZXNoIHRoZSBwYWdlIHRvIHJlZmxlY3QgY2hhbmdlcyBpcyBiZXR0ZXIgdG8gZG8gaW4gb24gbW9kdWxlIHBhZ2UgdXNpbmcgZXZlbnQgTW9kdWxlU3RhdHVzQ2hhbmdlZCBzdWJzY3JpcHRpb25cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlTGFiZWxUZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRGlzYWJsZWRTdGF0dXNFbmFibGVkKTtcbiAgICAgICAgICAgIHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChgdHJbZGF0YS1pZD0ke3RoaXMudW5pcWlkfV1gKTtcbiAgICAgICAgICAgIHRoaXMuc2hvd01vZHVsZUVycm9yKCRyb3csIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IsIHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLiRhbGxUb2dnbGVzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB0aGlzLiRzdGF0dXNJY29uLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGVuYWJsaW5nIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICBjYkFmdGVyTW9kdWxlRW5hYmxlKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVSSB0byBzaG93IG1vZHVsZSBpcyBlbmFibGVkXG4gICAgICAgICAgICB0aGlzLiR0b2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICB0aGlzLmNoYW5nZUxhYmVsVGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZURpc2FibGVkU3RhdHVzRW5hYmxlZCk7XG5cbiAgICAgICAgICAgIC8vIFRyaWdnZXIgZXZlbnRzIHRvIGluZGljYXRlIG1vZHVsZSBzdGF0dXMgYW5kIGNvbmZpZyBkYXRhIGhhcyBjaGFuZ2VkXG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdNb2R1bGVTdGF0dXNDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblxuICAgICAgICAgICAgLy8gRW5hYmxlIGlucHV0IGZpZWxkcyBhbmQgc2hvdyBtZXNzYWdlIGZvciBjaGFuZ2VkIG9iamVjdHNcbiAgICAgICAgICAgIHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jaGFuZ2VkT2JqZWN0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLmRhdGEuY2hhbmdlZE9iamVjdHMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlZE9iamVjdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZWZyZXNoIHRoZSBwYWdlIHRvIHJlZmxlY3QgY2hhbmdlcyBpcyBiZXR0ZXIgdG8gZG8gaW4gb24gbW9kdWxlIHBhZ2UgdXNpbmcgZXZlbnQgTW9kdWxlU3RhdHVzQ2hhbmdlZCBzdWJzY3JpcHRpb25cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJHRvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VMYWJlbFRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEaXNhYmxlZFN0YXR1c0Rpc2FibGVkKTtcbiAgICAgICAgICAgIHRoaXMuJGRpc2FiaWxpdHlGaWVsZHMuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChgdHJbZGF0YS1pZD0ke3RoaXMudW5pcWlkfV1gKTtcbiAgICAgICAgICAgIHRoaXMuc2hvd01vZHVsZUVycm9yKCRyb3csIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IsIHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLiRhbGxUb2dnbGVzLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB0aGlzLiRzdGF0dXNJY29uLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcgaWNvbicpO1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERpc3BsYXlzIGFuIGVycm9yIG1lc3NhZ2UgcmVsYXRlZCB0byBtb2R1bGUgc3RhdHVzIGluIHRoZSBVSS5cbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHJvdyAtIFRoZSBqUXVlcnkgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgcm93IGluIHRoZSBVSSBhc3NvY2lhdGVkIHdpdGggdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGVhZGVyIC0gVGhlIGhlYWRlciB0ZXh0IGZvciB0aGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZXMgLSBEZXRhaWxlZCBlcnJvciBtZXNzYWdlcyB0byBiZSBkaXNwbGF5ZWQuXG4gICAgICovXG4gICAgc2hvd01vZHVsZUVycm9yKCRyb3csIGhlYWRlciwgbWVzc2FnZXM9JycpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2VzPT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJHJvdy5sZW5ndGg9PT0wKXtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlcy5saWNlbnNlIT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TGljZW5zZUVycm9yKGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlTGljZW5zZVByb2JsZW0sIG1lc3NhZ2VzLmxpY2Vuc2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcobWVzc2FnZXMsIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlQ2hhbmdlU3RhdHVzRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtZXNzYWdlcy5saWNlbnNlIT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgIGNvbnN0IG1hbmFnZUxpbmsgPSBgPGJyPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19NYW5hZ2VMaWNlbnNlfSA8YSBocmVmPVwiJHtDb25maWcua2V5TWFuYWdlbWVudFVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke0NvbmZpZy5rZXlNYW5hZ2VtZW50U2l0ZX08L2E+YDtcbiAgICAgICAgICAgIG1lc3NhZ2VzLmxpY2Vuc2UucHVzaChtYW5hZ2VMaW5rKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0ZXh0RGVzY3JpcHRpb24gPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2VzKTtcbiAgICAgICAgY29uc3QgaHRtbE1lc3NhZ2U9ICBgPHRyIGNsYXNzPVwidWkgd2FybmluZyB0YWJsZS1lcnJvci1tZXNzYWdlc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjb2xzcGFuPVwiNVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBjZW50ZXIgYWxpZ25lZCBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aGVhZGVyfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7dGV4dERlc2NyaXB0aW9ufTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90cj5gO1xuICAgICAgICAkcm93LmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICRyb3cuYmVmb3JlKGh0bWxNZXNzYWdlKTtcbiAgICB9XG59XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBleHRlcm5hbCBtb2R1bGUgc3RhdHVzIHRvZ2dsZXMuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY29uc3QgdW5pcUlkID0gJCgnI21vZHVsZS1zdGF0dXMtdG9nZ2xlJykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgIGlmICh1bmlxSWQpIHtcbiAgICAgICAgY29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXMoKTtcbiAgICAgICAgcGFnZVN0YXR1cy5pbml0aWFsaXplKHVuaXFJZCwgdHJ1ZSk7XG4gICAgfVxufSk7XG4iXX0=