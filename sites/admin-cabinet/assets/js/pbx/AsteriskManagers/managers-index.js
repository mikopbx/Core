"use strict";

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

/* global globalRootUrl, globalTranslate, AsteriskManagersAPI, SecurityUtils, PbxDataTableIndex, TooltipBuilder */

/**
 * Object for managing Asterisk managers table using PbxDataTableIndex
 *
 * @module asteriskManagersIndex
 */
var asteriskManagersIndex = {
  /**
   * DataTable instance from base class
   */
  dataTableInstance: null,

  /**
   * Initialize the object
   */
  initialize: function initialize() {
    // Initialize event handlers once (using delegation)
    this.initializeTableEvents(); // Initialize the Asterisk managers table with REST API

    this.initializeDataTable();
  },

  /**
   * Initialize DataTable using custom table rendering
   */
  initializeDataTable: function initializeDataTable() {
    // Load data and render custom table
    this.loadAndRenderTable();
  },

  /**
   * Load data and render custom table
   */
  loadAndRenderTable: function loadAndRenderTable() {
    var _this = this;

    // Show loading state
    $('#asterisk-managers-table-container').html('<div class="ui active centered inline loader"></div>'); // Load data from API

    AsteriskManagersAPI.getList(function (data) {
      if (data && Array.isArray(data)) {
        if (data.length === 0) {
          // Hide the table container and add button, show placeholder
          $('#asterisk-managers-table-container').hide();
          $('.add-new-button').hide();
          $('#empty-table-placeholder').show();
        } else {
          // Show the table container and add button, hide placeholder
          $('#empty-table-placeholder').hide();
          $('.add-new-button').show();
          $('#asterisk-managers-table-container').show();

          _this.renderPermissionsTable(data);
        }
      } else {
        $('#asterisk-managers-table-container').html('<div class="ui error message">Failed to load data</div>');
      }
    }, false); // Don't use cache for now
  },

  /**
   * Render custom permissions table
   * @param {Array} managers - Array of manager objects
   */
  renderPermissionsTable: function renderPermissionsTable(managers) {
    var permissions = ['call', 'cdr', 'originate', 'reporting', 'agent', 'config', 'dialplan', 'dtmf', 'log', 'system', 'user', 'verbose', 'command'];
    var tableHtml = "\n            <table class=\"ui selectable very basic compact unstackable table\" id=\"asterisk-managers-table\">\n                <thead>\n                    <tr>\n                        <th></th>\n                        ".concat(permissions.map(function (perm) {
      return "\n                            <th width=\"20px\" class=\"permission-category hide-on-mobile\">\n                                <div><span>".concat(perm, "</span></div>\n                            </th>\n                        ");
    }).join(''), "\n                        <th></th>\n                    </tr>\n                </thead>\n                <tbody>\n        "); // Render rows

    managers.forEach(function (manager) {
      var readPerms = manager.readPermissionsSummary || '';
      var writePerms = manager.writePermissionsSummary || '';
      var systemIcon = manager.isSystem ? '<i class="yellow lock icon"></i> ' : ''; // Format description like in Firewall

      var description = manager.description || '';
      var descriptionText = description ? " - ".concat(description) : '';
      tableHtml += "\n                <tr class=\"manager-row\" data-id=\"".concat(manager.id, "\">\n                    <td>\n                        ").concat(systemIcon, "\n                        <i class=\"blue asterisk icon\"></i> \n                        <strong>").concat(window.SecurityUtils.escapeHtml(manager.username), "</strong>").concat(window.SecurityUtils.escapeHtml(descriptionText), "\n                    </td>\n            "); // Add permission cells - show checkmark if has any permission (read or write)

      permissions.forEach(function (perm) {
        var hasRead = readPerms === 'all' || readPerms.includes(perm);
        var hasWrite = writePerms === 'all' || writePerms.includes(perm);
        var hasPermission = hasRead || hasWrite;

        if (hasPermission) {
          // Add data attributes for dynamic tooltip initialization
          tableHtml += "<td class=\"center aligned permission-cell hide-on-mobile\" \n                        data-manager=\"".concat(window.SecurityUtils.escapeHtml(manager.username), "\"\n                        data-permission=\"").concat(perm, "\"\n                        data-is-system=\"").concat(manager.isSystem, "\"\n                        data-has-read=\"").concat(hasRead, "\"\n                        data-has-write=\"").concat(hasWrite, "\">"); // Use text labels with colors (no inline tooltip data)

          if (hasRead && hasWrite) {
            // Full access (both read and write)
            tableHtml += '<span class="ui green text"><strong>RW</strong></span>';
          } else if (hasRead) {
            // Read only
            tableHtml += '<span class="ui blue text"><strong>R</strong></span>';
          } else if (hasWrite) {
            // Write only
            tableHtml += '<span class="ui orange text"><strong>W</strong></span>';
          }
        } else {
          // No permission - empty cell without tooltip
          tableHtml += '<td class="center aligned permission-cell hide-on-mobile">';
        }

        tableHtml += '</td>';
      }); // Add action buttons

      tableHtml += "\n                <td class=\"right aligned collapsing\">\n                    <div class=\"ui tiny basic icon buttons action-buttons\">\n            ";

      if (manager.isSystem) {
        tableHtml += "\n                    <a href=\"".concat(globalRootUrl, "asterisk-managers/modify/").concat(manager.id, "\" \n                       class=\"ui button view popuped\" data-content=\"").concat(globalTranslate.bt_View, "\">\n                        <i class=\"icon eye blue\"></i>\n                    </a>\n                ");
      } else {
        tableHtml += "\n                    <a href=\"".concat(globalRootUrl, "asterisk-managers/modify/").concat(manager.id, "\" \n                       class=\"ui button edit popuped\" data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                        <i class=\"icon edit blue\"></i>\n                    </a>\n                    <a href=\"#\" data-value=\"").concat(manager.id, "\" \n                       class=\"ui button copy popuped\" data-content=\"").concat(globalTranslate.bt_ToolTipCopy, "\">\n                        <i class=\"icon copy outline blue\"></i>\n                    </a>\n                    <a href=\"#\" data-value=\"").concat(manager.id, "\" \n                       class=\"ui button delete two-steps-delete popuped\" data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                        <i class=\"icon trash red\"></i>\n                    </a>\n                ");
      }

      tableHtml += "\n                    </div>\n                </td>\n                </tr>\n            ";
    });
    tableHtml += "\n                </tbody>\n            </table>\n        "; // Render table

    $('#asterisk-managers-table-container').html(tableHtml); // Initialize tooltips dynamically like in Firewall

    this.initializePermissionTooltips();
  },

  /**
   * Initialize permission tooltips dynamically
   */
  initializePermissionTooltips: function initializePermissionTooltips() {
    var permissionDescriptions = this.getPermissionDescriptions(); // Initialize tooltips for all permission cells

    $('.permission-cell[data-manager]').each(function () {
      var $cell = $(this);
      var manager = $cell.data('manager');
      var permission = $cell.data('permission');
      var isSystem = $cell.data('is-system');
      var hasRead = $cell.data('has-read');
      var hasWrite = $cell.data('has-write');

      if (manager && permission && permissionDescriptions[permission]) {
        var tooltipData = asteriskManagersIndex.buildTooltipData(manager, permission, isSystem, hasRead, hasWrite, permissionDescriptions[permission]);
        var tooltipContent = TooltipBuilder.buildContent(tooltipData); // Initialize tooltip

        $cell.popup({
          html: tooltipContent,
          position: 'top center',
          hoverable: true,
          delay: {
            show: 300,
            hide: 100
          },
          variation: 'flowing'
        });
      }
    });
  },

  /**
   * Get permission descriptions object
   */
  getPermissionDescriptions: function getPermissionDescriptions() {
    return {
      call: {
        read: globalTranslate.am_tooltip_call_read,
        write: globalTranslate.am_tooltip_call_write
      },
      cdr: {
        read: globalTranslate.am_tooltip_cdr_read,
        write: globalTranslate.am_tooltip_cdr_write
      },
      originate: {
        read: globalTranslate.am_tooltip_originate_read,
        write: globalTranslate.am_tooltip_originate_write
      },
      reporting: {
        read: globalTranslate.am_tooltip_reporting_read,
        write: globalTranslate.am_tooltip_reporting_write
      },
      agent: {
        read: globalTranslate.am_tooltip_agent_read,
        write: globalTranslate.am_tooltip_agent_write
      },
      config: {
        read: globalTranslate.am_tooltip_config_read,
        write: globalTranslate.am_tooltip_config_write
      },
      dialplan: {
        read: globalTranslate.am_tooltip_dialplan_read,
        write: globalTranslate.am_tooltip_dialplan_write
      },
      dtmf: {
        read: globalTranslate.am_tooltip_dtmf_read,
        write: globalTranslate.am_tooltip_dtmf_write
      },
      log: {
        read: globalTranslate.am_tooltip_log_read,
        write: globalTranslate.am_tooltip_log_write
      },
      system: {
        read: globalTranslate.am_tooltip_system_read,
        write: globalTranslate.am_tooltip_system_write
      },
      user: {
        read: globalTranslate.am_tooltip_user_read,
        write: globalTranslate.am_tooltip_user_write
      },
      verbose: {
        read: globalTranslate.am_tooltip_verbose_read,
        write: globalTranslate.am_tooltip_verbose_write
      },
      command: {
        read: globalTranslate.am_tooltip_command_read,
        write: globalTranslate.am_tooltip_command_write
      }
    };
  },

  /**
   * Build tooltip data structure
   */
  buildTooltipData: function buildTooltipData(manager, permission, isSystem, hasRead, hasWrite, permDesc) {
    var tooltipData = {
      header: "".concat(manager, " - ").concat(permission.toUpperCase()),
      description: null,
      list: []
    }; // Add current access level

    var accessLevel = '';
    var accessColor = '';

    if (hasRead && hasWrite) {
      accessLevel = globalTranslate.am_tooltip_access_read_write;
      accessColor = 'green';
    } else if (hasRead) {
      accessLevel = globalTranslate.am_tooltip_access_read_only;
      accessColor = 'blue';
    } else if (hasWrite) {
      accessLevel = globalTranslate.am_tooltip_access_write_only;
      accessColor = 'orange';
    }

    var currentAccessLabel = globalTranslate.am_tooltip_current_access;
    tooltipData.description = "<span class=\"ui ".concat(accessColor, " text\"><strong>").concat(currentAccessLabel, ": ").concat(accessLevel, "</strong></span>"); // Add permission details

    var allowedOperationsLabel = globalTranslate.am_tooltip_allowed_operations;
    tooltipData.list.push({
      term: allowedOperationsLabel,
      definition: null
    });

    if (hasRead) {
      var readLabel = globalTranslate.am_Read;
      tooltipData.list.push({
        term: readLabel,
        definition: permDesc.read
      });
    }

    if (hasWrite) {
      var writeLabel = globalTranslate.am_Write;
      tooltipData.list.push({
        term: writeLabel,
        definition: permDesc.write
      });
    } // Add restrictions if any


    if (!hasRead || !hasWrite) {
      var restrictionsLabel = globalTranslate.am_tooltip_restrictions;
      tooltipData.list.push({
        term: restrictionsLabel,
        definition: null
      });

      if (!hasRead) {
        var cannotReadLabel = globalTranslate.am_tooltip_cannot_read;
        tooltipData.list.push("".concat(cannotReadLabel, ": ").concat(permDesc.read));
      }

      if (!hasWrite) {
        var cannotWriteLabel = globalTranslate.am_tooltip_cannot_write;
        tooltipData.list.push("".concat(cannotWriteLabel, ": ").concat(permDesc.write));
      }
    } // Add system manager warning if applicable


    if (isSystem) {
      tooltipData.warning = {
        header: globalTranslate.am_tooltip_system_manager_warning,
        text: globalTranslate.am_tooltip_system_manager_warning_text
      };
    }

    return tooltipData;
  },

  /**
   * Initialize table event handlers
   */
  initializeTableEvents: function initializeTableEvents() {
    // Use event delegation for dynamically generated content
    var $container = $('#asterisk-managers-table-container'); // Double click to edit (exclude action buttons column)

    $container.on('dblclick', '.manager-row td:not(.right.aligned)', function (e) {
      var id = $(e.target).closest('tr').attr('data-id');

      if (id) {
        window.location = "".concat(globalRootUrl, "asterisk-managers/modify/").concat(id);
      }
    }); // Copy button handler

    $container.on('click', 'a.copy', function (e) {
      e.preventDefault();
      var id = $(e.currentTarget).attr('data-value');

      if (id) {
        // Redirect to modify page with copy-source parameter
        window.location = "".concat(globalRootUrl, "asterisk-managers/modify?copy-source=").concat(id);
      }
    }); // Let delete-something.js handle the first click, we just prevent default navigation

    $container.on('click', 'a.delete.two-steps-delete', function (e) {
      e.preventDefault(); // Don't stop propagation - allow delete-something.js to work
    }); // Delete button handler - works with two-steps-delete logic
    // This will be triggered after delete-something.js removes the two-steps-delete class

    $container.on('click', 'a.delete:not(.two-steps-delete)', function (e) {
      e.preventDefault();
      var $button = $(this);
      var id = $button.attr('data-value');

      if (id) {
        $button.addClass('loading disabled');
        AsteriskManagersAPI.deleteRecord(id, function (response) {
          if (response && response.result === true) {
            // Reload the entire page to ensure clean state
            window.location.href = "".concat(globalRootUrl, "asterisk-managers/index");
          } else {
            UserMessage.showMultiString((response === null || response === void 0 ? void 0 : response.messages) || globalTranslate.am_ErrorDeletingManager);
            $button.removeClass('loading disabled'); // Restore two-steps-delete class if deletion failed

            $button.addClass('two-steps-delete');
            $button.find('i').removeClass('close').addClass('trash');
          }
        });
      }
    });
  },

  /**
   * Callback after data is loaded
   * @param {Array} data - Array of manager objects
   */
  onDataLoaded: function onDataLoaded(data) {// Additional processing after data load if needed
  }
};
/**
 * Initialize Asterisk Managers table on document ready
 */

$(document).ready(function () {
  asteriskManagersIndex.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbImFzdGVyaXNrTWFuYWdlcnNJbmRleCIsImRhdGFUYWJsZUluc3RhbmNlIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVUYWJsZUV2ZW50cyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJsb2FkQW5kUmVuZGVyVGFibGUiLCIkIiwiaHRtbCIsIkFzdGVyaXNrTWFuYWdlcnNBUEkiLCJnZXRMaXN0IiwiZGF0YSIsIkFycmF5IiwiaXNBcnJheSIsImxlbmd0aCIsImhpZGUiLCJzaG93IiwicmVuZGVyUGVybWlzc2lvbnNUYWJsZSIsIm1hbmFnZXJzIiwicGVybWlzc2lvbnMiLCJ0YWJsZUh0bWwiLCJtYXAiLCJwZXJtIiwiam9pbiIsImZvckVhY2giLCJtYW5hZ2VyIiwicmVhZFBlcm1zIiwicmVhZFBlcm1pc3Npb25zU3VtbWFyeSIsIndyaXRlUGVybXMiLCJ3cml0ZVBlcm1pc3Npb25zU3VtbWFyeSIsInN5c3RlbUljb24iLCJpc1N5c3RlbSIsImRlc2NyaXB0aW9uIiwiZGVzY3JpcHRpb25UZXh0IiwiaWQiLCJ3aW5kb3ciLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsInVzZXJuYW1lIiwiaGFzUmVhZCIsImluY2x1ZGVzIiwiaGFzV3JpdGUiLCJoYXNQZXJtaXNzaW9uIiwiZ2xvYmFsUm9vdFVybCIsImdsb2JhbFRyYW5zbGF0ZSIsImJ0X1ZpZXciLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBDb3B5IiwiYnRfVG9vbFRpcERlbGV0ZSIsImluaXRpYWxpemVQZXJtaXNzaW9uVG9vbHRpcHMiLCJwZXJtaXNzaW9uRGVzY3JpcHRpb25zIiwiZ2V0UGVybWlzc2lvbkRlc2NyaXB0aW9ucyIsImVhY2giLCIkY2VsbCIsInBlcm1pc3Npb24iLCJ0b29sdGlwRGF0YSIsImJ1aWxkVG9vbHRpcERhdGEiLCJ0b29sdGlwQ29udGVudCIsIlRvb2x0aXBCdWlsZGVyIiwiYnVpbGRDb250ZW50IiwicG9wdXAiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5IiwidmFyaWF0aW9uIiwiY2FsbCIsInJlYWQiLCJhbV90b29sdGlwX2NhbGxfcmVhZCIsIndyaXRlIiwiYW1fdG9vbHRpcF9jYWxsX3dyaXRlIiwiY2RyIiwiYW1fdG9vbHRpcF9jZHJfcmVhZCIsImFtX3Rvb2x0aXBfY2RyX3dyaXRlIiwib3JpZ2luYXRlIiwiYW1fdG9vbHRpcF9vcmlnaW5hdGVfcmVhZCIsImFtX3Rvb2x0aXBfb3JpZ2luYXRlX3dyaXRlIiwicmVwb3J0aW5nIiwiYW1fdG9vbHRpcF9yZXBvcnRpbmdfcmVhZCIsImFtX3Rvb2x0aXBfcmVwb3J0aW5nX3dyaXRlIiwiYWdlbnQiLCJhbV90b29sdGlwX2FnZW50X3JlYWQiLCJhbV90b29sdGlwX2FnZW50X3dyaXRlIiwiY29uZmlnIiwiYW1fdG9vbHRpcF9jb25maWdfcmVhZCIsImFtX3Rvb2x0aXBfY29uZmlnX3dyaXRlIiwiZGlhbHBsYW4iLCJhbV90b29sdGlwX2RpYWxwbGFuX3JlYWQiLCJhbV90b29sdGlwX2RpYWxwbGFuX3dyaXRlIiwiZHRtZiIsImFtX3Rvb2x0aXBfZHRtZl9yZWFkIiwiYW1fdG9vbHRpcF9kdG1mX3dyaXRlIiwibG9nIiwiYW1fdG9vbHRpcF9sb2dfcmVhZCIsImFtX3Rvb2x0aXBfbG9nX3dyaXRlIiwic3lzdGVtIiwiYW1fdG9vbHRpcF9zeXN0ZW1fcmVhZCIsImFtX3Rvb2x0aXBfc3lzdGVtX3dyaXRlIiwidXNlciIsImFtX3Rvb2x0aXBfdXNlcl9yZWFkIiwiYW1fdG9vbHRpcF91c2VyX3dyaXRlIiwidmVyYm9zZSIsImFtX3Rvb2x0aXBfdmVyYm9zZV9yZWFkIiwiYW1fdG9vbHRpcF92ZXJib3NlX3dyaXRlIiwiY29tbWFuZCIsImFtX3Rvb2x0aXBfY29tbWFuZF9yZWFkIiwiYW1fdG9vbHRpcF9jb21tYW5kX3dyaXRlIiwicGVybURlc2MiLCJoZWFkZXIiLCJ0b1VwcGVyQ2FzZSIsImxpc3QiLCJhY2Nlc3NMZXZlbCIsImFjY2Vzc0NvbG9yIiwiYW1fdG9vbHRpcF9hY2Nlc3NfcmVhZF93cml0ZSIsImFtX3Rvb2x0aXBfYWNjZXNzX3JlYWRfb25seSIsImFtX3Rvb2x0aXBfYWNjZXNzX3dyaXRlX29ubHkiLCJjdXJyZW50QWNjZXNzTGFiZWwiLCJhbV90b29sdGlwX2N1cnJlbnRfYWNjZXNzIiwiYWxsb3dlZE9wZXJhdGlvbnNMYWJlbCIsImFtX3Rvb2x0aXBfYWxsb3dlZF9vcGVyYXRpb25zIiwicHVzaCIsInRlcm0iLCJkZWZpbml0aW9uIiwicmVhZExhYmVsIiwiYW1fUmVhZCIsIndyaXRlTGFiZWwiLCJhbV9Xcml0ZSIsInJlc3RyaWN0aW9uc0xhYmVsIiwiYW1fdG9vbHRpcF9yZXN0cmljdGlvbnMiLCJjYW5ub3RSZWFkTGFiZWwiLCJhbV90b29sdGlwX2Nhbm5vdF9yZWFkIiwiY2Fubm90V3JpdGVMYWJlbCIsImFtX3Rvb2x0aXBfY2Fubm90X3dyaXRlIiwid2FybmluZyIsImFtX3Rvb2x0aXBfc3lzdGVtX21hbmFnZXJfd2FybmluZyIsInRleHQiLCJhbV90b29sdGlwX3N5c3RlbV9tYW5hZ2VyX3dhcm5pbmdfdGV4dCIsIiRjb250YWluZXIiLCJvbiIsImUiLCJ0YXJnZXQiLCJjbG9zZXN0IiwiYXR0ciIsImxvY2F0aW9uIiwicHJldmVudERlZmF1bHQiLCJjdXJyZW50VGFyZ2V0IiwiJGJ1dHRvbiIsImFkZENsYXNzIiwiZGVsZXRlUmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJocmVmIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsImFtX0Vycm9yRGVsZXRpbmdNYW5hZ2VyIiwicmVtb3ZlQ2xhc3MiLCJmaW5kIiwib25EYXRhTG9hZGVkIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QUFRO0FBQ0orRyxRQUFBQSxPQUFPLENBQUNDLFFBQVIsQ0FBaUIsa0JBQWpCO0FBQ0F6SSxRQUFBQSxtQkFBbUIsQ0FBQzBJLFlBQXBCLENBQWlDakgsRUFBakMsRUFBcUMsVUFBQ2tILFFBQUQsRUFBYztBQUMvQyxjQUFJQSxRQUFRLElBQUlBLFFBQVEsQ0FBQ0MsTUFBVCxLQUFvQixJQUFwQyxFQUEwQztBQUN0QztBQUNBbEgsWUFBQUEsTUFBTSxDQUFDMkcsUUFBUCxDQUFnQlEsSUFBaEIsYUFBMEIzRyxhQUExQjtBQUNILFdBSEQsTUFHTztBQUNINEcsWUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCLENBQUFKLFFBQVEsU0FBUixJQUFBQSxRQUFRLFdBQVIsWUFBQUEsUUFBUSxDQUFFSyxRQUFWLEtBQXNCN0csZUFBZSxDQUFDOEcsdUJBQWxFO0FBQ0FULFlBQUFBLE9BQU8sQ0FBQ1UsV0FBUixDQUFvQixrQkFBcEIsRUFGRyxDQUdIOztBQUNBVixZQUFBQSxPQUFPLENBQUNDLFFBQVIsQ0FBaUIsa0JBQWpCO0FBQ0FELFlBQUFBLE9BQU8sQ0FBQ1csSUFBUixDQUFhLEdBQWIsRUFBa0JELFdBQWxCLENBQThCLE9BQTlCLEVBQXVDVCxRQUF2QyxDQUFnRCxPQUFoRDtBQUNIO0FBQ0osU0FYRDtBQVlIO0FBQ0osS0FwQkQ7QUFxQkgsR0E3WnlCOztBQStaMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSVcsRUFBQUEsWUFuYTBCLHdCQW1hYmxKLElBbmFhLEVBbWFQLENBQ2Y7QUFDSDtBQXJheUIsQ0FBOUI7QUF3YUE7QUFDQTtBQUNBOztBQUNBSixDQUFDLENBQUN1SixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCOUosRUFBQUEscUJBQXFCLENBQUNFLFVBQXRCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEFzdGVyaXNrTWFuYWdlcnNBUEksIFNlY3VyaXR5VXRpbHMsIFBieERhdGFUYWJsZUluZGV4LCBUb29sdGlwQnVpbGRlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgQXN0ZXJpc2sgbWFuYWdlcnMgdGFibGUgdXNpbmcgUGJ4RGF0YVRhYmxlSW5kZXhcbiAqXG4gKiBAbW9kdWxlIGFzdGVyaXNrTWFuYWdlcnNJbmRleFxuICovXG5jb25zdCBhc3Rlcmlza01hbmFnZXJzSW5kZXggPSB7XG4gICAgLyoqXG4gICAgICogRGF0YVRhYmxlIGluc3RhbmNlIGZyb20gYmFzZSBjbGFzc1xuICAgICAqL1xuICAgIGRhdGFUYWJsZUluc3RhbmNlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgb2JqZWN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBldmVudCBoYW5kbGVycyBvbmNlICh1c2luZyBkZWxlZ2F0aW9uKVxuICAgICAgICB0aGlzLmluaXRpYWxpemVUYWJsZUV2ZW50cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgQXN0ZXJpc2sgbWFuYWdlcnMgdGFibGUgd2l0aCBSRVNUIEFQSVxuICAgICAgICB0aGlzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRGF0YVRhYmxlIHVzaW5nIGN1c3RvbSB0YWJsZSByZW5kZXJpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuICAgICAgICAvLyBMb2FkIGRhdGEgYW5kIHJlbmRlciBjdXN0b20gdGFibGVcbiAgICAgICAgdGhpcy5sb2FkQW5kUmVuZGVyVGFibGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBkYXRhIGFuZCByZW5kZXIgY3VzdG9tIHRhYmxlXG4gICAgICovXG4gICAgbG9hZEFuZFJlbmRlclRhYmxlKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgJCgnI2FzdGVyaXNrLW1hbmFnZXJzLXRhYmxlLWNvbnRhaW5lcicpLmh0bWwoJzxkaXYgY2xhc3M9XCJ1aSBhY3RpdmUgY2VudGVyZWQgaW5saW5lIGxvYWRlclwiPjwvZGl2PicpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gQVBJXG4gICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZ2V0TGlzdCgoZGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKGRhdGEgJiYgQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSB0YWJsZSBjb250YWluZXIgYW5kIGFkZCBidXR0b24sIHNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAgICAgJCgnI2FzdGVyaXNrLW1hbmFnZXJzLXRhYmxlLWNvbnRhaW5lcicpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmFkZC1uZXctYnV0dG9uJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgdGFibGUgY29udGFpbmVyIGFuZCBhZGQgYnV0dG9uLCBoaWRlIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgICAgICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmFkZC1uZXctYnV0dG9uJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjYXN0ZXJpc2stbWFuYWdlcnMtdGFibGUtY29udGFpbmVyJykuc2hvdygpO1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyUGVybWlzc2lvbnNUYWJsZShkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyNhc3Rlcmlzay1tYW5hZ2Vycy10YWJsZS1jb250YWluZXInKS5odG1sKCc8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZVwiPkZhaWxlZCB0byBsb2FkIGRhdGE8L2Rpdj4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgZmFsc2UpOyAvLyBEb24ndCB1c2UgY2FjaGUgZm9yIG5vd1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVuZGVyIGN1c3RvbSBwZXJtaXNzaW9ucyB0YWJsZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG1hbmFnZXJzIC0gQXJyYXkgb2YgbWFuYWdlciBvYmplY3RzXG4gICAgICovXG4gICAgcmVuZGVyUGVybWlzc2lvbnNUYWJsZShtYW5hZ2Vycykge1xuICAgICAgICBjb25zdCBwZXJtaXNzaW9ucyA9IFsnY2FsbCcsICdjZHInLCAnb3JpZ2luYXRlJywgJ3JlcG9ydGluZycsICdhZ2VudCcsICdjb25maWcnLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZGlhbHBsYW4nLCAnZHRtZicsICdsb2cnLCAnc3lzdGVtJywgJ3VzZXInLCAndmVyYm9zZScsICdjb21tYW5kJ107XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgbGV0IHRhYmxlSHRtbCA9IGBcbiAgICAgICAgICAgIDx0YWJsZSBjbGFzcz1cInVpIHNlbGVjdGFibGUgdmVyeSBiYXNpYyBjb21wYWN0IHVuc3RhY2thYmxlIHRhYmxlXCIgaWQ9XCJhc3Rlcmlzay1tYW5hZ2Vycy10YWJsZVwiPlxuICAgICAgICAgICAgICAgIDx0aGVhZD5cbiAgICAgICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRoPjwvdGg+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3Blcm1pc3Npb25zLm1hcChwZXJtID0+IGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGggd2lkdGg9XCIyMHB4XCIgY2xhc3M9XCJwZXJtaXNzaW9uLWNhdGVnb3J5IGhpZGUtb24tbW9iaWxlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXY+PHNwYW4+JHtwZXJtfTwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RoPlxuICAgICAgICAgICAgICAgICAgICAgICAgYCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGg+PC90aD5cbiAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICA8L3RoZWFkPlxuICAgICAgICAgICAgICAgIDx0Ym9keT5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbmRlciByb3dzXG4gICAgICAgIG1hbmFnZXJzLmZvckVhY2gobWFuYWdlciA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWFkUGVybXMgPSBtYW5hZ2VyLnJlYWRQZXJtaXNzaW9uc1N1bW1hcnkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCB3cml0ZVBlcm1zID0gbWFuYWdlci53cml0ZVBlcm1pc3Npb25zU3VtbWFyeSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHN5c3RlbUljb24gPSBtYW5hZ2VyLmlzU3lzdGVtID8gJzxpIGNsYXNzPVwieWVsbG93IGxvY2sgaWNvblwiPjwvaT4gJyA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3JtYXQgZGVzY3JpcHRpb24gbGlrZSBpbiBGaXJld2FsbFxuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBtYW5hZ2VyLmRlc2NyaXB0aW9uIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRpb25UZXh0ID0gZGVzY3JpcHRpb24gPyBgIC0gJHtkZXNjcmlwdGlvbn1gIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRhYmxlSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwibWFuYWdlci1yb3dcIiBkYXRhLWlkPVwiJHttYW5hZ2VyLmlkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8dGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3N5c3RlbUljb259XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImJsdWUgYXN0ZXJpc2sgaWNvblwiPjwvaT4gXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7d2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChtYW5hZ2VyLnVzZXJuYW1lKX08L3N0cm9uZz4ke3dpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGVzY3JpcHRpb25UZXh0KX1cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBwZXJtaXNzaW9uIGNlbGxzIC0gc2hvdyBjaGVja21hcmsgaWYgaGFzIGFueSBwZXJtaXNzaW9uIChyZWFkIG9yIHdyaXRlKVxuICAgICAgICAgICAgcGVybWlzc2lvbnMuZm9yRWFjaChwZXJtID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBoYXNSZWFkID0gcmVhZFBlcm1zID09PSAnYWxsJyB8fCByZWFkUGVybXMuaW5jbHVkZXMocGVybSk7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFzV3JpdGUgPSB3cml0ZVBlcm1zID09PSAnYWxsJyB8fCB3cml0ZVBlcm1zLmluY2x1ZGVzKHBlcm0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc1Blcm1pc3Npb24gPSBoYXNSZWFkIHx8IGhhc1dyaXRlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChoYXNQZXJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBkYXRhIGF0dHJpYnV0ZXMgZm9yIGR5bmFtaWMgdG9vbHRpcCBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgICAgICAgICB0YWJsZUh0bWwgKz0gYDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkIHBlcm1pc3Npb24tY2VsbCBoaWRlLW9uLW1vYmlsZVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1tYW5hZ2VyPVwiJHt3aW5kb3cuU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKG1hbmFnZXIudXNlcm5hbWUpfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBlcm1pc3Npb249XCIke3Blcm19XCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtaXMtc3lzdGVtPVwiJHttYW5hZ2VyLmlzU3lzdGVtfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWhhcy1yZWFkPVwiJHtoYXNSZWFkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWhhcy13cml0ZT1cIiR7aGFzV3JpdGV9XCI+YDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSB0ZXh0IGxhYmVscyB3aXRoIGNvbG9ycyAobm8gaW5saW5lIHRvb2x0aXAgZGF0YSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc1JlYWQgJiYgaGFzV3JpdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZ1bGwgYWNjZXNzIChib3RoIHJlYWQgYW5kIHdyaXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGFibGVIdG1sICs9ICc8c3BhbiBjbGFzcz1cInVpIGdyZWVuIHRleHRcIj48c3Ryb25nPlJXPC9zdHJvbmc+PC9zcGFuPic7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaGFzUmVhZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVhZCBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZUh0bWwgKz0gJzxzcGFuIGNsYXNzPVwidWkgYmx1ZSB0ZXh0XCI+PHN0cm9uZz5SPC9zdHJvbmc+PC9zcGFuPic7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaGFzV3JpdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdyaXRlIG9ubHlcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlSHRtbCArPSAnPHNwYW4gY2xhc3M9XCJ1aSBvcmFuZ2UgdGV4dFwiPjxzdHJvbmc+Vzwvc3Ryb25nPjwvc3Bhbj4nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTm8gcGVybWlzc2lvbiAtIGVtcHR5IGNlbGwgd2l0aG91dCB0b29sdGlwXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlSHRtbCArPSAnPHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgcGVybWlzc2lvbi1jZWxsIGhpZGUtb24tbW9iaWxlXCI+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGFibGVIdG1sICs9ICc8L3RkPic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGFjdGlvbiBidXR0b25zXG4gICAgICAgICAgICB0YWJsZUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChtYW5hZ2VyLmlzU3lzdGVtKSB7XG4gICAgICAgICAgICAgICAgdGFibGVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7Z2xvYmFsUm9vdFVybH1hc3Rlcmlzay1tYW5hZ2Vycy9tb2RpZnkvJHttYW5hZ2VyLmlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiB2aWV3IHBvcHVwZWRcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9WaWV3fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGV5ZSBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGFibGVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7Z2xvYmFsUm9vdFVybH1hc3Rlcmlzay1tYW5hZ2Vycy9tb2RpZnkvJHttYW5hZ2VyLmlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBlZGl0IHBvcHVwZWRcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBkYXRhLXZhbHVlPVwiJHttYW5hZ2VyLmlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBjb3B5IHBvcHVwZWRcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBjb3B5IG91dGxpbmUgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGRhdGEtdmFsdWU9XCIke21hbmFnZXIuaWR9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZSB0d28tc3RlcHMtZGVsZXRlIHBvcHVwZWRcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRhYmxlSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGFibGVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8L3Rib2R5PlxuICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbmRlciB0YWJsZVxuICAgICAgICAkKCcjYXN0ZXJpc2stbWFuYWdlcnMtdGFibGUtY29udGFpbmVyJykuaHRtbCh0YWJsZUh0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBkeW5hbWljYWxseSBsaWtlIGluIEZpcmV3YWxsXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVBlcm1pc3Npb25Ub29sdGlwcygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwZXJtaXNzaW9uIHRvb2x0aXBzIGR5bmFtaWNhbGx5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBlcm1pc3Npb25Ub29sdGlwcygpIHtcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbkRlc2NyaXB0aW9ucyA9IHRoaXMuZ2V0UGVybWlzc2lvbkRlc2NyaXB0aW9ucygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgYWxsIHBlcm1pc3Npb24gY2VsbHNcbiAgICAgICAgJCgnLnBlcm1pc3Npb24tY2VsbFtkYXRhLW1hbmFnZXJdJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjZWxsID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG1hbmFnZXIgPSAkY2VsbC5kYXRhKCdtYW5hZ2VyJyk7XG4gICAgICAgICAgICBjb25zdCBwZXJtaXNzaW9uID0gJGNlbGwuZGF0YSgncGVybWlzc2lvbicpO1xuICAgICAgICAgICAgY29uc3QgaXNTeXN0ZW0gPSAkY2VsbC5kYXRhKCdpcy1zeXN0ZW0nKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1JlYWQgPSAkY2VsbC5kYXRhKCdoYXMtcmVhZCcpO1xuICAgICAgICAgICAgY29uc3QgaGFzV3JpdGUgPSAkY2VsbC5kYXRhKCdoYXMtd3JpdGUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKG1hbmFnZXIgJiYgcGVybWlzc2lvbiAmJiBwZXJtaXNzaW9uRGVzY3JpcHRpb25zW3Blcm1pc3Npb25dKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbHRpcERhdGEgPSBhc3Rlcmlza01hbmFnZXJzSW5kZXguYnVpbGRUb29sdGlwRGF0YShcbiAgICAgICAgICAgICAgICAgICAgbWFuYWdlciwgcGVybWlzc2lvbiwgaXNTeXN0ZW0sIGhhc1JlYWQsIGhhc1dyaXRlLCBwZXJtaXNzaW9uRGVzY3JpcHRpb25zW3Blcm1pc3Npb25dXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sdGlwQ29udGVudCA9IFRvb2x0aXBCdWlsZGVyLmJ1aWxkQ29udGVudCh0b29sdGlwRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwXG4gICAgICAgICAgICAgICAgJGNlbGwucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiB0b29sdGlwQ29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHBlcm1pc3Npb24gZGVzY3JpcHRpb25zIG9iamVjdFxuICAgICAqL1xuICAgIGdldFBlcm1pc3Npb25EZXNjcmlwdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjYWxsOiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY2FsbF9yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jYWxsX3dyaXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2RyOiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY2RyX3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2Nkcl93cml0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9yaWdpbmF0ZToge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX29yaWdpbmF0ZV9yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9vcmlnaW5hdGVfd3JpdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXBvcnRpbmc6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9yZXBvcnRpbmdfcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfcmVwb3J0aW5nX3dyaXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWdlbnQ6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9hZ2VudF9yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9hZ2VudF93cml0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2NvbmZpZ19yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jb25maWdfd3JpdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkaWFscGxhbjoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2RpYWxwbGFuX3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2RpYWxwbGFuX3dyaXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHRtZjoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2R0bWZfcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfZHRtZl93cml0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxvZzoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2xvZ19yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9sb2dfd3JpdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzeXN0ZW06IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9zeXN0ZW1fcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfc3lzdGVtX3dyaXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3VzZXJfcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfdXNlcl93cml0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZlcmJvc2U6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF92ZXJib3NlX3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3ZlcmJvc2Vfd3JpdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb21tYW5kOiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY29tbWFuZF9yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jb21tYW5kX3dyaXRlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCB0b29sdGlwIGRhdGEgc3RydWN0dXJlXG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwRGF0YShtYW5hZ2VyLCBwZXJtaXNzaW9uLCBpc1N5c3RlbSwgaGFzUmVhZCwgaGFzV3JpdGUsIHBlcm1EZXNjKSB7XG4gICAgICAgIGNvbnN0IHRvb2x0aXBEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBgJHttYW5hZ2VyfSAtICR7cGVybWlzc2lvbi50b1VwcGVyQ2FzZSgpfWAsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogbnVsbCxcbiAgICAgICAgICAgIGxpc3Q6IFtdXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY3VycmVudCBhY2Nlc3MgbGV2ZWxcbiAgICAgICAgbGV0IGFjY2Vzc0xldmVsID0gJyc7XG4gICAgICAgIGxldCBhY2Nlc3NDb2xvciA9ICcnO1xuICAgICAgICBpZiAoaGFzUmVhZCAmJiBoYXNXcml0ZSkge1xuICAgICAgICAgICAgYWNjZXNzTGV2ZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9hY2Nlc3NfcmVhZF93cml0ZTtcbiAgICAgICAgICAgIGFjY2Vzc0NvbG9yID0gJ2dyZWVuJztcbiAgICAgICAgfSBlbHNlIGlmIChoYXNSZWFkKSB7XG4gICAgICAgICAgICBhY2Nlc3NMZXZlbCA9IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2FjY2Vzc19yZWFkX29ubHk7XG4gICAgICAgICAgICBhY2Nlc3NDb2xvciA9ICdibHVlJztcbiAgICAgICAgfSBlbHNlIGlmIChoYXNXcml0ZSkge1xuICAgICAgICAgICAgYWNjZXNzTGV2ZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9hY2Nlc3Nfd3JpdGVfb25seTtcbiAgICAgICAgICAgIGFjY2Vzc0NvbG9yID0gJ29yYW5nZSc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRBY2Nlc3NMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2N1cnJlbnRfYWNjZXNzO1xuICAgICAgICB0b29sdGlwRGF0YS5kZXNjcmlwdGlvbiA9IGA8c3BhbiBjbGFzcz1cInVpICR7YWNjZXNzQ29sb3J9IHRleHRcIj48c3Ryb25nPiR7Y3VycmVudEFjY2Vzc0xhYmVsfTogJHthY2Nlc3NMZXZlbH08L3N0cm9uZz48L3NwYW4+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBwZXJtaXNzaW9uIGRldGFpbHNcbiAgICAgICAgY29uc3QgYWxsb3dlZE9wZXJhdGlvbnNMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2FsbG93ZWRfb3BlcmF0aW9ucztcbiAgICAgICAgdG9vbHRpcERhdGEubGlzdC5wdXNoKHtcbiAgICAgICAgICAgIHRlcm06IGFsbG93ZWRPcGVyYXRpb25zTGFiZWwsXG4gICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhhc1JlYWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlYWRMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5hbV9SZWFkO1xuICAgICAgICAgICAgdG9vbHRpcERhdGEubGlzdC5wdXNoKHtcbiAgICAgICAgICAgICAgICB0ZXJtOiByZWFkTGFiZWwsXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogcGVybURlc2MucmVhZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChoYXNXcml0ZSkge1xuICAgICAgICAgICAgY29uc3Qgd3JpdGVMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5hbV9Xcml0ZTtcbiAgICAgICAgICAgIHRvb2x0aXBEYXRhLmxpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgdGVybTogd3JpdGVMYWJlbCxcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBwZXJtRGVzYy53cml0ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCByZXN0cmljdGlvbnMgaWYgYW55XG4gICAgICAgIGlmICghaGFzUmVhZCB8fCAhaGFzV3JpdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3RyaWN0aW9uc0xhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfcmVzdHJpY3Rpb25zO1xuICAgICAgICAgICAgdG9vbHRpcERhdGEubGlzdC5wdXNoKHtcbiAgICAgICAgICAgICAgICB0ZXJtOiByZXN0cmljdGlvbnNMYWJlbCxcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFoYXNSZWFkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2Fubm90UmVhZExhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY2Fubm90X3JlYWQ7XG4gICAgICAgICAgICAgICAgdG9vbHRpcERhdGEubGlzdC5wdXNoKGAke2Nhbm5vdFJlYWRMYWJlbH06ICR7cGVybURlc2MucmVhZH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghaGFzV3JpdGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYW5ub3RXcml0ZUxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY2Fubm90X3dyaXRlO1xuICAgICAgICAgICAgICAgIHRvb2x0aXBEYXRhLmxpc3QucHVzaChgJHtjYW5ub3RXcml0ZUxhYmVsfTogJHtwZXJtRGVzYy53cml0ZX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN5c3RlbSBtYW5hZ2VyIHdhcm5pbmcgaWYgYXBwbGljYWJsZVxuICAgICAgICBpZiAoaXNTeXN0ZW0pIHtcbiAgICAgICAgICAgIHRvb2x0aXBEYXRhLndhcm5pbmcgPSB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9zeXN0ZW1fbWFuYWdlcl93YXJuaW5nLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3N5c3RlbV9tYW5hZ2VyX3dhcm5pbmdfdGV4dFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRvb2x0aXBEYXRhO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWJsZSBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJsZUV2ZW50cygpIHtcbiAgICAgICAgLy8gVXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGR5bmFtaWNhbGx5IGdlbmVyYXRlZCBjb250ZW50XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkKCcjYXN0ZXJpc2stbWFuYWdlcnMtdGFibGUtY29udGFpbmVyJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEb3VibGUgY2xpY2sgdG8gZWRpdCAoZXhjbHVkZSBhY3Rpb24gYnV0dG9ucyBjb2x1bW4pXG4gICAgICAgICRjb250YWluZXIub24oJ2RibGNsaWNrJywgJy5tYW5hZ2VyLXJvdyB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLWlkJyk7XG4gICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLW1hbmFnZXJzL21vZGlmeS8ke2lkfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29weSBidXR0b24gaGFuZGxlclxuICAgICAgICAkY29udGFpbmVyLm9uKCdjbGljaycsICdhLmNvcHknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICAvLyBSZWRpcmVjdCB0byBtb2RpZnkgcGFnZSB3aXRoIGNvcHktc291cmNlIHBhcmFtZXRlclxuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvbW9kaWZ5P2NvcHktc291cmNlPSR7aWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBMZXQgZGVsZXRlLXNvbWV0aGluZy5qcyBoYW5kbGUgdGhlIGZpcnN0IGNsaWNrLCB3ZSBqdXN0IHByZXZlbnQgZGVmYXVsdCBuYXZpZ2F0aW9uXG4gICAgICAgICRjb250YWluZXIub24oJ2NsaWNrJywgJ2EuZGVsZXRlLnR3by1zdGVwcy1kZWxldGUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAvLyBEb24ndCBzdG9wIHByb3BhZ2F0aW9uIC0gYWxsb3cgZGVsZXRlLXNvbWV0aGluZy5qcyB0byB3b3JrXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIC0gd29ya3Mgd2l0aCB0d28tc3RlcHMtZGVsZXRlIGxvZ2ljXG4gICAgICAgIC8vIFRoaXMgd2lsbCBiZSB0cmlnZ2VyZWQgYWZ0ZXIgZGVsZXRlLXNvbWV0aGluZy5qcyByZW1vdmVzIHRoZSB0d28tc3RlcHMtZGVsZXRlIGNsYXNzXG4gICAgICAgICRjb250YWluZXIub24oJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmRlbGV0ZVJlY29yZChpZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbG9hZCB0aGUgZW50aXJlIHBhZ2UgdG8gZW5zdXJlIGNsZWFuIHN0YXRlXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvaW5kZXhgO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlPy5tZXNzYWdlcyB8fCBnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JEZWxldGluZ01hbmFnZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVzdG9yZSB0d28tc3RlcHMtZGVsZXRlIGNsYXNzIGlmIGRlbGV0aW9uIGZhaWxlZFxuICAgICAgICAgICAgICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygndHdvLXN0ZXBzLWRlbGV0ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2Nsb3NlJykuYWRkQ2xhc3MoJ3RyYXNoJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICogQHBhcmFtIHtBcnJheX0gZGF0YSAtIEFycmF5IG9mIG1hbmFnZXIgb2JqZWN0c1xuICAgICAqL1xuICAgIG9uRGF0YUxvYWRlZChkYXRhKSB7XG4gICAgICAgIC8vIEFkZGl0aW9uYWwgcHJvY2Vzc2luZyBhZnRlciBkYXRhIGxvYWQgaWYgbmVlZGVkXG4gICAgfVxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIEFzdGVyaXNrIE1hbmFnZXJzIHRhYmxlIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBhc3Rlcmlza01hbmFnZXJzSW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=