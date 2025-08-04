"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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

/* global globalRootUrl, SemanticLocalization, globalTranslate, UserMessage, Extensions, SecurityUtils */

/**
 * Base class for MikoPBX index table management with ACL support
 * 
 * Provides common functionality for DataTable-based index pages including:
 * - Server-side ACL permission checking
 * - Dynamic action button rendering based on permissions
 * - Unified description truncation with popup support
 * - Copy functionality support
 * - Custom action buttons
 * - Two-step delete confirmation
 * - Double-click editing
 * 
 * @class PbxDataTableIndex
 */
var PbxDataTableIndex = /*#__PURE__*/function () {
  /**
   * Create a new PbxDataTableIndex instance
   * 
   * @param {Object} config - Configuration object
   * @param {string} config.tableId - HTML table element ID
   * @param {Object} config.apiModule - API module for data operations
   * @param {string} config.routePrefix - URL route prefix (e.g., 'call-queues')
   * @param {Object} config.translations - Translation keys for messages
   * @param {Array} config.columns - DataTable column definitions
   * @param {boolean} [config.showSuccessMessages=false] - Show success messages on delete
   * @param {boolean} [config.showInfo=false] - Show DataTable info
   * @param {Array} [config.actionButtons=['edit', 'delete']] - Standard action buttons to show
   * @param {Array} [config.customActionButtons=[]] - Custom action button definitions
   * @param {Object} [config.descriptionSettings] - Description truncation settings
   * @param {Function} [config.onDataLoaded] - Callback after data loaded
   * @param {Function} [config.onDrawCallback] - Callback after table draw
   * @param {Function} [config.onPermissionsLoaded] - Callback after permissions loaded
   * @param {Function} [config.customDeleteHandler] - Custom delete handler
   */
  function PbxDataTableIndex(config) {
    _classCallCheck(this, PbxDataTableIndex);

    // Core configuration
    this.tableId = config.tableId;
    this.apiModule = config.apiModule;
    this.routePrefix = config.routePrefix;
    this.translations = config.translations || {};
    this.columns = config.columns || [];
    this.showSuccessMessages = config.showSuccessMessages || false;
    this.showInfo = config.showInfo || false; // Permission state (loaded from server)

    this.permissions = {
      save: false,
      modify: false,
      edit: false,
      "delete": false,
      copy: false,
      custom: {}
    }; // Action buttons configuration

    this.actionButtons = config.actionButtons || ['edit', 'delete'];
    this.customActionButtons = config.customActionButtons || []; // Description truncation settings

    this.descriptionSettings = Object.assign({
      maxLines: 3,
      dynamicHeight: false,
      calculateLines: null
    }, config.descriptionSettings || {}); // Internal properties

    this.$table = $("#".concat(this.tableId));
    this.dataTable = {}; // Optional callbacks

    this.onDataLoaded = config.onDataLoaded;
    this.onDrawCallback = config.onDrawCallback;
    this.onPermissionsLoaded = config.onPermissionsLoaded;
    this.customDeleteHandler = config.customDeleteHandler;
  }
  /**
   * Initialize the module with permission loading
   */


  _createClass(PbxDataTableIndex, [{
    key: "initialize",
    value: async function initialize() {
      try {
        // Show loader while initializing
        this.showLoader(); // First, load permissions from server

        await this.loadPermissions(); // Initialize DataTable (will handle loader/empty state in data callback)

        this.initializeDataTable();
      } catch (error) {
        console.error('Failed to initialize PbxDataTableIndex:', error);
        UserMessage.showError(globalTranslate.ex_ErrorInitializingTable || 'Failed to initialize table');
        this.hideLoader();
        this.toggleEmptyPlaceholder(true);
      }
    }
    /**
     * Load permissions from server
     */

  }, {
    key: "loadPermissions",
    value: async function loadPermissions() {
      try {
        var response = await $.ajax({
          url: "".concat(globalRootUrl, "acl/checkPermissions"),
          method: 'GET',
          data: {
            controller: this.routePrefix
          },
          dataType: 'json'
        });

        if (response.success && response.data) {
          Object.assign(this.permissions, response.data);

          if (this.onPermissionsLoaded) {
            this.onPermissionsLoaded(this.permissions);
          }
        }
      } catch (error) {
        console.warn('Failed to load permissions, using defaults:', error); // On error, default to no permissions for safety
      }
    }
    /**
     * Initialize DataTable with common configuration
     */

  }, {
    key: "initializeDataTable",
    value: function initializeDataTable() {
      var _this = this;

      var processedColumns = this.processColumns();
      var config = {
        ajax: {
          url: this.apiModule.endpoints.getList,
          type: 'GET',
          dataSrc: function dataSrc(json) {
            return _this.handleDataLoad(json);
          },
          error: function error(xhr, _error, thrown) {
            _this.hideLoader();

            _this.toggleEmptyPlaceholder(true);

            UserMessage.showError(globalTranslate.ex_ErrorLoadingData || 'Failed to load data');
          }
        },
        columns: processedColumns,
        order: [[0, 'asc']],
        lengthChange: false,
        paging: false,
        searching: true,
        info: this.showInfo,
        language: SemanticLocalization.dataTableLocalisation,
        drawCallback: function drawCallback() {
          return _this.handleDrawCallback();
        }
      };
      this.dataTable = this.$table.DataTable(config); // Initialize handlers

      this.initializeDeleteHandler();
      this.initializeCopyHandler();
      this.initializeCustomHandlers();
    }
    /**
     * Process column definitions and add action column if needed
     */

  }, {
    key: "processColumns",
    value: function processColumns() {
      var columns = _toConsumableArray(this.columns); // Add standard action column if not already present


      if (!columns.find(function (col) {
        return col.isActionColumn;
      })) {
        columns.push(this.createActionColumn());
      }

      return columns;
    }
    /**
     * Create standard action column with permission-based rendering
     */

  }, {
    key: "createActionColumn",
    value: function createActionColumn() {
      var _this2 = this;

      return {
        data: null,
        orderable: false,
        searchable: false,
        className: 'right aligned collapsing',
        isActionColumn: true,
        render: function render(data, type, row) {
          var buttons = []; // Edit button

          if (_this2.actionButtons.includes('edit') && (_this2.permissions.modify || _this2.permissions.edit)) {
            buttons.push("\n                        <a href=\"".concat(globalRootUrl).concat(_this2.routePrefix, "/modify/").concat(row.uniqid, "\" \n                           class=\"ui button edit popuped\" \n                           data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                            <i class=\"icon edit blue\"></i>\n                        </a>\n                    "));
          } // Copy button


          if (_this2.actionButtons.includes('copy') && _this2.permissions.copy) {
            buttons.push("\n                        <a href=\"#\" \n                           data-value=\"".concat(row.uniqid, "\"\n                           class=\"ui button copy popuped\" \n                           data-content=\"").concat(globalTranslate.bt_ToolTipCopy, "\">\n                            <i class=\"icon copy outline blue\"></i>\n                        </a>\n                    "));
          } // Custom buttons


          _this2.customActionButtons.forEach(function (customButton) {
            if (_this2.permissions.custom && _this2.permissions.custom[customButton.name]) {
              var href = customButton.href || '#';
              var dataValue = customButton.includeId ? "data-value=\"".concat(row.uniqid, "\"") : '';
              buttons.push("\n                            <a href=\"".concat(href, "\" \n                               ").concat(dataValue, "\n                               class=\"ui button ").concat(customButton["class"], " popuped\" \n                               data-content=\"").concat(SecurityUtils.escapeHtml(customButton.tooltip), "\">\n                                <i class=\"").concat(customButton.icon, "\"></i>\n                            </a>\n                        "));
            }
          }); // Delete button (always last)


          if (_this2.actionButtons.includes('delete') && _this2.permissions["delete"]) {
            buttons.push("\n                        <a href=\"#\" \n                           data-value=\"".concat(row.uniqid, "\" \n                           class=\"ui button delete two-steps-delete popuped\" \n                           data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                            <i class=\"icon trash red\"></i>\n                        </a>\n                    "));
          }

          return buttons.length > 0 ? "<div class=\"ui tiny basic icon buttons action-buttons\">".concat(buttons.join(''), "</div>") : '';
        }
      };
    }
    /**
     * Handle data load and empty state management
     */

  }, {
    key: "handleDataLoad",
    value: function handleDataLoad(json) {
      // Hide loader first
      this.hideLoader();
      var isEmpty = !json.result || !json.data || json.data.length === 0;
      this.toggleEmptyPlaceholder(isEmpty);

      if (this.onDataLoaded) {
        this.onDataLoaded(json);
      }

      return json.result ? json.data : [];
    }
    /**
     * Handle draw callback for post-render operations
     */

  }, {
    key: "handleDrawCallback",
    value: function handleDrawCallback() {
      // Initialize Semantic UI popups
      this.$table.find('.popuped').popup(); // Move Add New button to DataTables wrapper

      this.repositionAddButton(); // Initialize double-click editing

      this.initializeDoubleClickEdit(); // Custom draw callback

      if (this.onDrawCallback) {
        this.onDrawCallback();
      }
    }
    /**
     * Reposition Add New button to DataTables wrapper
     */

  }, {
    key: "repositionAddButton",
    value: function repositionAddButton() {
      var $addButton = $('#add-new-button');
      var $wrapper = $("#".concat(this.tableId, "_wrapper"));
      var $leftColumn = $wrapper.find('.eight.wide.column').first();

      if ($addButton.length && $leftColumn.length && this.permissions.save) {
        $leftColumn.append($addButton);
        $addButton.show();
      }
    }
    /**
     * Initialize delete handler with two-step confirmation
     */

  }, {
    key: "initializeDeleteHandler",
    value: function initializeDeleteHandler() {
      var _this3 = this;

      // DeleteSomething.js handles first click
      // We handle second click when two-steps-delete class is removed
      this.$table.on('click', 'a.delete:not(.two-steps-delete)', function (e) {
        e.preventDefault();
        var $button = $(e.currentTarget);
        var recordId = $button.attr('data-value'); // Add loading state

        $button.addClass('loading disabled');

        if (_this3.customDeleteHandler) {
          _this3.customDeleteHandler(recordId);
        } else {
          _this3.apiModule.deleteRecord(recordId, function (response) {
            return _this3.cbAfterDeleteRecord(response);
          });
        }
      });
    }
    /**
     * Initialize copy handler
     */

  }, {
    key: "initializeCopyHandler",
    value: function initializeCopyHandler() {
      var _this4 = this;

      this.$table.on('click', 'a.copy', function (e) {
        e.preventDefault();
        var recordId = $(e.currentTarget).attr('data-value'); // Redirect to modify page with copy parameter

        window.location = "".concat(globalRootUrl).concat(_this4.routePrefix, "/modify/?copy=").concat(recordId);
      });
    }
    /**
     * Initialize custom button handlers
     */

  }, {
    key: "initializeCustomHandlers",
    value: function initializeCustomHandlers() {
      var _this5 = this;

      this.customActionButtons.forEach(function (customButton) {
        if (customButton.onClick) {
          _this5.$table.on('click', "a.".concat(customButton["class"]), function (e) {
            e.preventDefault();
            var recordId = $(e.currentTarget).attr('data-value');
            customButton.onClick(recordId);
          });
        }
      });
    }
    /**
     * Callback after record deletion
     */

  }, {
    key: "cbAfterDeleteRecord",
    value: function cbAfterDeleteRecord(response) {
      if (response.result === true) {
        // Reload table data
        this.dataTable.ajax.reload(); // Update related components

        if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
          Extensions.cbOnDataChanged();
        } // Show success message if configured


        if (this.showSuccessMessages && this.translations.deleteSuccess) {
          UserMessage.showSuccess(this.translations.deleteSuccess);
        }
      } else {
        var _response$messages;

        // Show error message
        var errorMessage = ((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || this.translations.deleteError || globalTranslate.ex_ImpossibleToDeleteRecord;
        UserMessage.showError(errorMessage);
      } // Remove loading state from all delete buttons


      this.$table.find('a.delete').removeClass('loading disabled');
    }
    /**
     * Show loader while loading data
     */

  }, {
    key: "showLoader",
    value: function showLoader() {
      // Hide everything first
      // Find the table's parent container - need the original container, not the DataTables wrapper
      var $wrapper = this.$table.closest('div[id$="_wrapper"]');
      var $container;

      if ($wrapper.length) {
        // Get the parent of the wrapper (should be the original container)
        $container = $wrapper.parent('div[id]');
      } // Fallback if structure is different


      if (!$container || !$container.length) {
        $container = this.$table.closest('div[id]:not([id$="_wrapper"])');
      }

      var $placeholder = $('#empty-table-placeholder');
      var $addButton = $('#add-new-button');
      $container.hide();
      $placeholder.hide();
      $addButton.hide(); // Create and show loader if not exists

      var $loader = $('#table-data-loader');

      if (!$loader.length) {
        // Create a segment with loader for better visual appearance
        $loader = $("\n                <div id=\"table-data-loader\" class=\"ui segment\" style=\"min-height: 200px; position: relative;\">\n                    <div class=\"ui active inverted dimmer\">\n                        <div class=\"ui text loader\">".concat(globalTranslate.ex_LoadingData || 'Loading...', "</div>\n                    </div>\n                </div>\n            ")); // Insert loader in the appropriate place

        if ($container.length && $container.parent().length) {
          $container.before($loader);
        } else if ($placeholder.length && $placeholder.parent().length) {
          $placeholder.before($loader);
        } else {
          // Fallback: append to body or parent container
          var $parent = this.$table.closest('.pusher') || this.$table.parent();
          $parent.append($loader);
        }
      }

      $loader.show();
    }
    /**
     * Hide loader
     */

  }, {
    key: "hideLoader",
    value: function hideLoader() {
      $('#table-data-loader').hide();
    }
    /**
     * Toggle empty table placeholder visibility
     */

  }, {
    key: "toggleEmptyPlaceholder",
    value: function toggleEmptyPlaceholder(isEmpty) {
      // Find the table's parent container - need the original container, not the DataTables wrapper
      // DataTables wraps the table in a div with id ending in '_wrapper'
      // We need to find the parent of that wrapper which is the original container
      var $wrapper = this.$table.closest('div[id$="_wrapper"]');
      var $container;

      if ($wrapper.length) {
        // Get the parent of the wrapper (should be the original container)
        $container = $wrapper.parent('div[id]');
      } // Fallback if structure is different


      if (!$container || !$container.length) {
        $container = this.$table.closest('div[id]:not([id$="_wrapper"])');
      }

      var $addButton = $('#add-new-button');
      var $placeholder = $('#empty-table-placeholder');

      if (isEmpty) {
        $container.hide();
        $addButton.hide(); // Make sure placeholder is visible

        if ($placeholder.length) {
          $placeholder.show();
        }
      } else {
        if ($placeholder.length) {
          $placeholder.hide();
        }

        if (this.permissions.save) {
          $addButton.show();
        }

        $container.show();
      }
    }
    /**
     * Initialize double-click for editing
     * Excludes action button cells to avoid conflicts
     */

  }, {
    key: "initializeDoubleClickEdit",
    value: function initializeDoubleClickEdit() {
      var _this6 = this;

      this.$table.on('dblclick', 'tbody td:not(.right.aligned)', function (e) {
        var data = _this6.dataTable.row(e.currentTarget).data();

        if (data && data.uniqid && (_this6.permissions.modify || _this6.permissions.edit)) {
          window.location = "".concat(globalRootUrl).concat(_this6.routePrefix, "/modify/").concat(data.uniqid);
        }
      });
    }
    /**
     * Create a unified description renderer with truncation support
     * 
     * @returns {Function} Renderer function for DataTables
     */

  }, {
    key: "createDescriptionRenderer",
    value: function createDescriptionRenderer() {
      var _this7 = this;

      return function (data, type, row) {
        if (!data || data.trim() === '') {
          return '—';
        }

        if (type === 'display') {
          // Escape HTML to prevent XSS
          var safeDesc = window.SecurityUtils.escapeHtml(data);
          var descriptionLines = safeDesc.split('\n').filter(function (line) {
            return line.trim() !== '';
          }); // Calculate max lines

          var maxLines = _this7.descriptionSettings.maxLines;

          if (_this7.descriptionSettings.dynamicHeight && _this7.descriptionSettings.calculateLines) {
            maxLines = _this7.descriptionSettings.calculateLines(row);
          }

          if (descriptionLines.length <= maxLines) {
            // Description fits - show with preserved formatting
            var formattedDesc = descriptionLines.join('<br>');
            return "<div class=\"description-text\" style=\"line-height: 1.3;\">".concat(formattedDesc, "</div>");
          } else {
            // Description too long - truncate with popup
            var visibleLines = descriptionLines.slice(0, maxLines);
            visibleLines[maxLines - 1] += '...';
            var truncatedDesc = visibleLines.join('<br>');
            var fullDesc = descriptionLines.join('\n');
            return "<div class=\"description-text truncated popuped\" \n                               data-content=\"".concat(fullDesc, "\" \n                               data-position=\"top right\" \n                               data-variation=\"wide\"\n                               style=\"cursor: help; border-bottom: 1px dotted #999; line-height: 1.3;\">\n                        ").concat(truncatedDesc, "\n                    </div>");
          }
        } // For search and other operations, return plain text


        return data;
      };
    }
    /**
     * Destroy the DataTable and cleanup
     */

  }, {
    key: "destroy",
    value: function destroy() {
      // Remove event handlers
      this.$table.off('click', 'a.delete:not(.two-steps-delete)');
      this.$table.off('click', 'a.copy');
      this.$table.off('dblclick', 'tbody td:not(.right.aligned)'); // Destroy DataTable if exists

      if (this.dataTable && typeof this.dataTable.destroy === 'function') {
        this.dataTable.destroy();
      } // Remove loader


      $('#table-data-loader').remove();
    }
  }]);

  return PbxDataTableIndex;
}(); // Make available globally


window.PbxDataTableIndex = PbxDataTableIndex;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1BieERhdGFUYWJsZUluZGV4LmpzIl0sIm5hbWVzIjpbIlBieERhdGFUYWJsZUluZGV4IiwiY29uZmlnIiwidGFibGVJZCIsImFwaU1vZHVsZSIsInJvdXRlUHJlZml4IiwidHJhbnNsYXRpb25zIiwiY29sdW1ucyIsInNob3dTdWNjZXNzTWVzc2FnZXMiLCJzaG93SW5mbyIsInBlcm1pc3Npb25zIiwic2F2ZSIsIm1vZGlmeSIsImVkaXQiLCJjb3B5IiwiY3VzdG9tIiwiYWN0aW9uQnV0dG9ucyIsImN1c3RvbUFjdGlvbkJ1dHRvbnMiLCJkZXNjcmlwdGlvblNldHRpbmdzIiwiT2JqZWN0IiwiYXNzaWduIiwibWF4TGluZXMiLCJkeW5hbWljSGVpZ2h0IiwiY2FsY3VsYXRlTGluZXMiLCIkdGFibGUiLCIkIiwiZGF0YVRhYmxlIiwib25EYXRhTG9hZGVkIiwib25EcmF3Q2FsbGJhY2siLCJvblBlcm1pc3Npb25zTG9hZGVkIiwiY3VzdG9tRGVsZXRlSGFuZGxlciIsInNob3dMb2FkZXIiLCJsb2FkUGVybWlzc2lvbnMiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiZXJyb3IiLCJjb25zb2xlIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9FcnJvckluaXRpYWxpemluZ1RhYmxlIiwiaGlkZUxvYWRlciIsInRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIiLCJyZXNwb25zZSIsImFqYXgiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiZGF0YSIsImNvbnRyb2xsZXIiLCJkYXRhVHlwZSIsInN1Y2Nlc3MiLCJ3YXJuIiwicHJvY2Vzc2VkQ29sdW1ucyIsInByb2Nlc3NDb2x1bW5zIiwiZW5kcG9pbnRzIiwiZ2V0TGlzdCIsInR5cGUiLCJkYXRhU3JjIiwianNvbiIsImhhbmRsZURhdGFMb2FkIiwieGhyIiwidGhyb3duIiwiZXhfRXJyb3JMb2FkaW5nRGF0YSIsIm9yZGVyIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwic2VhcmNoaW5nIiwiaW5mbyIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJkcmF3Q2FsbGJhY2siLCJoYW5kbGVEcmF3Q2FsbGJhY2siLCJEYXRhVGFibGUiLCJpbml0aWFsaXplRGVsZXRlSGFuZGxlciIsImluaXRpYWxpemVDb3B5SGFuZGxlciIsImluaXRpYWxpemVDdXN0b21IYW5kbGVycyIsImZpbmQiLCJjb2wiLCJpc0FjdGlvbkNvbHVtbiIsInB1c2giLCJjcmVhdGVBY3Rpb25Db2x1bW4iLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwiY2xhc3NOYW1lIiwicmVuZGVyIiwicm93IiwiYnV0dG9ucyIsImluY2x1ZGVzIiwidW5pcWlkIiwiYnRfVG9vbFRpcEVkaXQiLCJidF9Ub29sVGlwQ29weSIsImZvckVhY2giLCJjdXN0b21CdXR0b24iLCJuYW1lIiwiaHJlZiIsImRhdGFWYWx1ZSIsImluY2x1ZGVJZCIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwidG9vbHRpcCIsImljb24iLCJidF9Ub29sVGlwRGVsZXRlIiwibGVuZ3RoIiwiam9pbiIsImlzRW1wdHkiLCJyZXN1bHQiLCJwb3B1cCIsInJlcG9zaXRpb25BZGRCdXR0b24iLCJpbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0IiwiJGFkZEJ1dHRvbiIsIiR3cmFwcGVyIiwiJGxlZnRDb2x1bW4iLCJmaXJzdCIsImFwcGVuZCIsInNob3ciLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwicmVjb3JkSWQiLCJhdHRyIiwiYWRkQ2xhc3MiLCJkZWxldGVSZWNvcmQiLCJjYkFmdGVyRGVsZXRlUmVjb3JkIiwid2luZG93IiwibG9jYXRpb24iLCJvbkNsaWNrIiwicmVsb2FkIiwiRXh0ZW5zaW9ucyIsImNiT25EYXRhQ2hhbmdlZCIsImRlbGV0ZVN1Y2Nlc3MiLCJzaG93U3VjY2VzcyIsImVycm9yTWVzc2FnZSIsIm1lc3NhZ2VzIiwiZGVsZXRlRXJyb3IiLCJleF9JbXBvc3NpYmxlVG9EZWxldGVSZWNvcmQiLCJyZW1vdmVDbGFzcyIsImNsb3Nlc3QiLCIkY29udGFpbmVyIiwicGFyZW50IiwiJHBsYWNlaG9sZGVyIiwiaGlkZSIsIiRsb2FkZXIiLCJleF9Mb2FkaW5nRGF0YSIsImJlZm9yZSIsIiRwYXJlbnQiLCJ0cmltIiwic2FmZURlc2MiLCJkZXNjcmlwdGlvbkxpbmVzIiwic3BsaXQiLCJmaWx0ZXIiLCJsaW5lIiwiZm9ybWF0dGVkRGVzYyIsInZpc2libGVMaW5lcyIsInNsaWNlIiwidHJ1bmNhdGVkRGVzYyIsImZ1bGxEZXNjIiwib2ZmIiwiZGVzdHJveSIsInJlbW92ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsaUI7QUFDRjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJLDZCQUFZQyxNQUFaLEVBQW9CO0FBQUE7O0FBQ2hCO0FBQ0EsU0FBS0MsT0FBTCxHQUFlRCxNQUFNLENBQUNDLE9BQXRCO0FBQ0EsU0FBS0MsU0FBTCxHQUFpQkYsTUFBTSxDQUFDRSxTQUF4QjtBQUNBLFNBQUtDLFdBQUwsR0FBbUJILE1BQU0sQ0FBQ0csV0FBMUI7QUFDQSxTQUFLQyxZQUFMLEdBQW9CSixNQUFNLENBQUNJLFlBQVAsSUFBdUIsRUFBM0M7QUFDQSxTQUFLQyxPQUFMLEdBQWVMLE1BQU0sQ0FBQ0ssT0FBUCxJQUFrQixFQUFqQztBQUNBLFNBQUtDLG1CQUFM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Zm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXh0ZW5zaW9ucywgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIE1pa29QQlggaW5kZXggdGFibGUgbWFuYWdlbWVudCB3aXRoIEFDTCBzdXBwb3J0XG4gKiBcbiAqIFByb3ZpZGVzIGNvbW1vbiBmdW5jdGlvbmFsaXR5IGZvciBEYXRhVGFibGUtYmFzZWQgaW5kZXggcGFnZXMgaW5jbHVkaW5nOlxuICogLSBTZXJ2ZXItc2lkZSBBQ0wgcGVybWlzc2lvbiBjaGVja2luZ1xuICogLSBEeW5hbWljIGFjdGlvbiBidXR0b24gcmVuZGVyaW5nIGJhc2VkIG9uIHBlcm1pc3Npb25zXG4gKiAtIFVuaWZpZWQgZGVzY3JpcHRpb24gdHJ1bmNhdGlvbiB3aXRoIHBvcHVwIHN1cHBvcnRcbiAqIC0gQ29weSBmdW5jdGlvbmFsaXR5IHN1cHBvcnRcbiAqIC0gQ3VzdG9tIGFjdGlvbiBidXR0b25zXG4gKiAtIFR3by1zdGVwIGRlbGV0ZSBjb25maXJtYXRpb25cbiAqIC0gRG91YmxlLWNsaWNrIGVkaXRpbmdcbiAqIFxuICogQGNsYXNzIFBieERhdGFUYWJsZUluZGV4XG4gKi9cbmNsYXNzIFBieERhdGFUYWJsZUluZGV4IHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXggaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLnRhYmxlSWQgLSBIVE1MIHRhYmxlIGVsZW1lbnQgSURcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnLmFwaU1vZHVsZSAtIEFQSSBtb2R1bGUgZm9yIGRhdGEgb3BlcmF0aW9uc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcucm91dGVQcmVmaXggLSBVUkwgcm91dGUgcHJlZml4IChlLmcuLCAnY2FsbC1xdWV1ZXMnKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcudHJhbnNsYXRpb25zIC0gVHJhbnNsYXRpb24ga2V5cyBmb3IgbWVzc2FnZXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb25maWcuY29sdW1ucyAtIERhdGFUYWJsZSBjb2x1bW4gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2hvd1N1Y2Nlc3NNZXNzYWdlcz1mYWxzZV0gLSBTaG93IHN1Y2Nlc3MgbWVzc2FnZXMgb24gZGVsZXRlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNob3dJbmZvPWZhbHNlXSAtIFNob3cgRGF0YVRhYmxlIGluZm9cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmFjdGlvbkJ1dHRvbnM9WydlZGl0JywgJ2RlbGV0ZSddXSAtIFN0YW5kYXJkIGFjdGlvbiBidXR0b25zIHRvIHNob3dcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmN1c3RvbUFjdGlvbkJ1dHRvbnM9W11dIC0gQ3VzdG9tIGFjdGlvbiBidXR0b24gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5kZXNjcmlwdGlvblNldHRpbmdzXSAtIERlc2NyaXB0aW9uIHRydW5jYXRpb24gc2V0dGluZ3NcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLm9uRGF0YUxvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBkYXRhIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25EcmF3Q2FsbGJhY2tdIC0gQ2FsbGJhY2sgYWZ0ZXIgdGFibGUgZHJhd1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25QZXJtaXNzaW9uc0xvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBwZXJtaXNzaW9ucyBsb2FkZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmN1c3RvbURlbGV0ZUhhbmRsZXJdIC0gQ3VzdG9tIGRlbGV0ZSBoYW5kbGVyXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gICAgICAgIC8vIENvcmUgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLnRhYmxlSWQgPSBjb25maWcudGFibGVJZDtcbiAgICAgICAgdGhpcy5hcGlNb2R1bGUgPSBjb25maWcuYXBpTW9kdWxlO1xuICAgICAgICB0aGlzLnJvdXRlUHJlZml4ID0gY29uZmlnLnJvdXRlUHJlZml4O1xuICAgICAgICB0aGlzLnRyYW5zbGF0aW9ucyA9IGNvbmZpZy50cmFuc2xhdGlvbnMgfHwge307XG4gICAgICAgIHRoaXMuY29sdW1ucyA9IGNvbmZpZy5jb2x1bW5zIHx8IFtdO1xuICAgICAgICB0aGlzLnNob3dTdWNjZXNzTWVzc2FnZXMgPSBjb25maWcuc2hvd1N1Y2Nlc3NNZXNzYWdlcyB8fCBmYWxzZTtcbiAgICAgICAgdGhpcy5zaG93SW5mbyA9IGNvbmZpZy5zaG93SW5mbyB8fCBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBlcm1pc3Npb24gc3RhdGUgKGxvYWRlZCBmcm9tIHNlcnZlcilcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IHtcbiAgICAgICAgICAgIHNhdmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9kaWZ5OiBmYWxzZSxcbiAgICAgICAgICAgIGVkaXQ6IGZhbHNlLFxuICAgICAgICAgICAgZGVsZXRlOiBmYWxzZSxcbiAgICAgICAgICAgIGNvcHk6IGZhbHNlLFxuICAgICAgICAgICAgY3VzdG9tOiB7fVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWN0aW9uIGJ1dHRvbnMgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmFjdGlvbkJ1dHRvbnMgPSBjb25maWcuYWN0aW9uQnV0dG9ucyB8fCBbJ2VkaXQnLCAnZGVsZXRlJ107XG4gICAgICAgIHRoaXMuY3VzdG9tQWN0aW9uQnV0dG9ucyA9IGNvbmZpZy5jdXN0b21BY3Rpb25CdXR0b25zIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzY3JpcHRpb24gdHJ1bmNhdGlvbiBzZXR0aW5nc1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIG1heExpbmVzOiAzLFxuICAgICAgICAgICAgZHluYW1pY0hlaWdodDogZmFsc2UsXG4gICAgICAgICAgICBjYWxjdWxhdGVMaW5lczogbnVsbFxuICAgICAgICB9LCBjb25maWcuZGVzY3JpcHRpb25TZXR0aW5ncyB8fCB7fSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnRlcm5hbCBwcm9wZXJ0aWVzXG4gICAgICAgIHRoaXMuJHRhYmxlID0gJChgIyR7dGhpcy50YWJsZUlkfWApO1xuICAgICAgICB0aGlzLmRhdGFUYWJsZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gT3B0aW9uYWwgY2FsbGJhY2tzXG4gICAgICAgIHRoaXMub25EYXRhTG9hZGVkID0gY29uZmlnLm9uRGF0YUxvYWRlZDtcbiAgICAgICAgdGhpcy5vbkRyYXdDYWxsYmFjayA9IGNvbmZpZy5vbkRyYXdDYWxsYmFjaztcbiAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkID0gY29uZmlnLm9uUGVybWlzc2lvbnNMb2FkZWQ7XG4gICAgICAgIHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlciA9IGNvbmZpZy5jdXN0b21EZWxldGVIYW5kbGVyO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGUgd2l0aCBwZXJtaXNzaW9uIGxvYWRpbmdcbiAgICAgKi9cbiAgICBhc3luYyBpbml0aWFsaXplKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gU2hvdyBsb2FkZXIgd2hpbGUgaW5pdGlhbGl6aW5nXG4gICAgICAgICAgICB0aGlzLnNob3dMb2FkZXIoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmlyc3QsIGxvYWQgcGVybWlzc2lvbnMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubG9hZFBlcm1pc3Npb25zKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgRGF0YVRhYmxlICh3aWxsIGhhbmRsZSBsb2FkZXIvZW1wdHkgc3RhdGUgaW4gZGF0YSBjYWxsYmFjaylcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGluaXRpYWxpemUgUGJ4RGF0YVRhYmxlSW5kZXg6JywgZXJyb3IpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5leF9FcnJvckluaXRpYWxpemluZ1RhYmxlIHx8ICdGYWlsZWQgdG8gaW5pdGlhbGl6ZSB0YWJsZScpO1xuICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGVyKCk7XG4gICAgICAgICAgICB0aGlzLnRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIodHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBwZXJtaXNzaW9ucyBmcm9tIHNlcnZlclxuICAgICAqL1xuICAgIGFzeW5jIGxvYWRQZXJtaXNzaW9ucygpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9YWNsL2NoZWNrUGVybWlzc2lvbnNgLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiB0aGlzLnJvdXRlUHJlZml4XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5wZXJtaXNzaW9ucywgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub25QZXJtaXNzaW9uc0xvYWRlZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uUGVybWlzc2lvbnNMb2FkZWQodGhpcy5wZXJtaXNzaW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gbG9hZCBwZXJtaXNzaW9ucywgdXNpbmcgZGVmYXVsdHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gT24gZXJyb3IsIGRlZmF1bHQgdG8gbm8gcGVybWlzc2lvbnMgZm9yIHNhZmV0eVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRGF0YVRhYmxlIHdpdGggY29tbW9uIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuICAgICAgICBjb25zdCBwcm9jZXNzZWRDb2x1bW5zID0gdGhpcy5wcm9jZXNzQ29sdW1ucygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY29uZmlnID0ge1xuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogdGhpcy5hcGlNb2R1bGUuZW5kcG9pbnRzLmdldExpc3QsXG4gICAgICAgICAgICAgICAgdHlwZTogJ0dFVCcsXG4gICAgICAgICAgICAgICAgZGF0YVNyYzogKGpzb24pID0+IHRoaXMuaGFuZGxlRGF0YUxvYWQoanNvbiksXG4gICAgICAgICAgICAgICAgZXJyb3I6ICh4aHIsIGVycm9yLCB0aHJvd24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlRW1wdHlQbGFjZWhvbGRlcih0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5leF9FcnJvckxvYWRpbmdEYXRhIHx8ICdGYWlsZWQgdG8gbG9hZCBkYXRhJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbHVtbnM6IHByb2Nlc3NlZENvbHVtbnMsXG4gICAgICAgICAgICBvcmRlcjogW1swLCAnYXNjJ11dLFxuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hpbmc6IHRydWUsXG4gICAgICAgICAgICBpbmZvOiB0aGlzLnNob3dJbmZvLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjazogKCkgPT4gdGhpcy5oYW5kbGVEcmF3Q2FsbGJhY2soKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB0aGlzLiR0YWJsZS5EYXRhVGFibGUoY29uZmlnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGVsZXRlSGFuZGxlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDb3B5SGFuZGxlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDdXN0b21IYW5kbGVycygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGNvbHVtbiBkZWZpbml0aW9ucyBhbmQgYWRkIGFjdGlvbiBjb2x1bW4gaWYgbmVlZGVkXG4gICAgICovXG4gICAgcHJvY2Vzc0NvbHVtbnMoKSB7XG4gICAgICAgIGNvbnN0IGNvbHVtbnMgPSBbLi4udGhpcy5jb2x1bW5zXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzdGFuZGFyZCBhY3Rpb24gY29sdW1uIGlmIG5vdCBhbHJlYWR5IHByZXNlbnRcbiAgICAgICAgaWYgKCFjb2x1bW5zLmZpbmQoY29sID0+IGNvbC5pc0FjdGlvbkNvbHVtbikpIHtcbiAgICAgICAgICAgIGNvbHVtbnMucHVzaCh0aGlzLmNyZWF0ZUFjdGlvbkNvbHVtbigpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNvbHVtbnM7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBzdGFuZGFyZCBhY3Rpb24gY29sdW1uIHdpdGggcGVybWlzc2lvbi1iYXNlZCByZW5kZXJpbmdcbiAgICAgKi9cbiAgICBjcmVhdGVBY3Rpb25Db2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiAncmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nJyxcbiAgICAgICAgICAgIGlzQWN0aW9uQ29sdW1uOiB0cnVlLFxuICAgICAgICAgICAgcmVuZGVyOiAoZGF0YSwgdHlwZSwgcm93KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYnV0dG9ucyA9IFtdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVkaXQgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uQnV0dG9ucy5pbmNsdWRlcygnZWRpdCcpICYmIFxuICAgICAgICAgICAgICAgICAgICAodGhpcy5wZXJtaXNzaW9ucy5tb2RpZnkgfHwgdGhpcy5wZXJtaXNzaW9ucy5lZGl0KSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7Z2xvYmFsUm9vdFVybH0ke3RoaXMucm91dGVQcmVmaXh9L21vZGlmeS8ke3Jvdy51bmlxaWR9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBlZGl0IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFZGl0fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdGlvbkJ1dHRvbnMuaW5jbHVkZXMoJ2NvcHknKSAmJiB0aGlzLnBlcm1pc3Npb25zLmNvcHkpIHtcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtyb3cudW5pcWlkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBjb3B5IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBjb3B5IG91dGxpbmUgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEN1c3RvbSBidXR0b25zXG4gICAgICAgICAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zLmZvckVhY2goY3VzdG9tQnV0dG9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvbnMuY3VzdG9tICYmIHRoaXMucGVybWlzc2lvbnMuY3VzdG9tW2N1c3RvbUJ1dHRvbi5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaHJlZiA9IGN1c3RvbUJ1dHRvbi5ocmVmIHx8ICcjJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFWYWx1ZSA9IGN1c3RvbUJ1dHRvbi5pbmNsdWRlSWQgPyBgZGF0YS12YWx1ZT1cIiR7cm93LnVuaXFpZH1cImAgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7aHJlZn1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2RhdGFWYWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiAke2N1c3RvbUJ1dHRvbi5jbGFzc30gcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGN1c3RvbUJ1dHRvbi50b29sdGlwKX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2N1c3RvbUJ1dHRvbi5pY29ufVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIERlbGV0ZSBidXR0b24gKGFsd2F5cyBsYXN0KVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdGlvbkJ1dHRvbnMuaW5jbHVkZXMoJ2RlbGV0ZScpICYmIHRoaXMucGVybWlzc2lvbnMuZGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7cm93LnVuaXFpZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZSB0d28tc3RlcHMtZGVsZXRlIHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEZWxldGV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBidXR0b25zLmxlbmd0aCA+IDAgPyBcbiAgICAgICAgICAgICAgICAgICAgYDxkaXYgY2xhc3M9XCJ1aSB0aW55IGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPiR7YnV0dG9ucy5qb2luKCcnKX08L2Rpdj5gIDogXG4gICAgICAgICAgICAgICAgICAgICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZGF0YSBsb2FkIGFuZCBlbXB0eSBzdGF0ZSBtYW5hZ2VtZW50XG4gICAgICovXG4gICAgaGFuZGxlRGF0YUxvYWQoanNvbikge1xuICAgICAgICAvLyBIaWRlIGxvYWRlciBmaXJzdFxuICAgICAgICB0aGlzLmhpZGVMb2FkZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGlzRW1wdHkgPSAhanNvbi5yZXN1bHQgfHwgIWpzb24uZGF0YSB8fCBqc29uLmRhdGEubGVuZ3RoID09PSAwO1xuICAgICAgICB0aGlzLnRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIoaXNFbXB0eSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vbkRhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgIHRoaXMub25EYXRhTG9hZGVkKGpzb24pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ganNvbi5yZXN1bHQgPyBqc29uLmRhdGEgOiBbXTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRyYXcgY2FsbGJhY2sgZm9yIHBvc3QtcmVuZGVyIG9wZXJhdGlvbnNcbiAgICAgKi9cbiAgICBoYW5kbGVEcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgcG9wdXBzXG4gICAgICAgIHRoaXMuJHRhYmxlLmZpbmQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1vdmUgQWRkIE5ldyBidXR0b24gdG8gRGF0YVRhYmxlcyB3cmFwcGVyXG4gICAgICAgIHRoaXMucmVwb3NpdGlvbkFkZEJ1dHRvbigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZWRpdGluZ1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEN1c3RvbSBkcmF3IGNhbGxiYWNrXG4gICAgICAgIGlmICh0aGlzLm9uRHJhd0NhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLm9uRHJhd0NhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUmVwb3NpdGlvbiBBZGQgTmV3IGJ1dHRvbiB0byBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgKi9cbiAgICByZXBvc2l0aW9uQWRkQnV0dG9uKCkge1xuICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gJChgIyR7dGhpcy50YWJsZUlkfV93cmFwcGVyYCk7XG4gICAgICAgIGNvbnN0ICRsZWZ0Q29sdW1uID0gJHdyYXBwZXIuZmluZCgnLmVpZ2h0LndpZGUuY29sdW1uJykuZmlyc3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkYWRkQnV0dG9uLmxlbmd0aCAmJiAkbGVmdENvbHVtbi5sZW5ndGggJiYgdGhpcy5wZXJtaXNzaW9ucy5zYXZlKSB7XG4gICAgICAgICAgICAkbGVmdENvbHVtbi5hcHBlbmQoJGFkZEJ1dHRvbik7XG4gICAgICAgICAgICAkYWRkQnV0dG9uLnNob3coKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRlbGV0ZSBoYW5kbGVyIHdpdGggdHdvLXN0ZXAgY29uZmlybWF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICAgIC8vIERlbGV0ZVNvbWV0aGluZy5qcyBoYW5kbGVzIGZpcnN0IGNsaWNrXG4gICAgICAgIC8vIFdlIGhhbmRsZSBzZWNvbmQgY2xpY2sgd2hlbiB0d28tc3RlcHMtZGVsZXRlIGNsYXNzIGlzIHJlbW92ZWRcbiAgICAgICAgdGhpcy4kdGFibGUub24oJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aGlzLmN1c3RvbURlbGV0ZUhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1c3RvbURlbGV0ZUhhbmRsZXIocmVjb3JkSWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaU1vZHVsZS5kZWxldGVSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4gdGhpcy5jYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNvcHkgaGFuZGxlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVDb3B5SGFuZGxlcigpIHtcbiAgICAgICAgdGhpcy4kdGFibGUub24oJ2NsaWNrJywgJ2EuY29weScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIG1vZGlmeSBwYWdlIHdpdGggY29weSBwYXJhbWV0ZXJcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvP2NvcHk9JHtyZWNvcmRJZH1gO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjdXN0b20gYnV0dG9uIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUN1c3RvbUhhbmRsZXJzKCkge1xuICAgICAgICB0aGlzLmN1c3RvbUFjdGlvbkJ1dHRvbnMuZm9yRWFjaChjdXN0b21CdXR0b24gPT4ge1xuICAgICAgICAgICAgaWYgKGN1c3RvbUJ1dHRvbi5vbkNsaWNrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kdGFibGUub24oJ2NsaWNrJywgYGEuJHtjdXN0b21CdXR0b24uY2xhc3N9YCwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUJ1dHRvbi5vbkNsaWNrKHJlY29yZElkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHJlY29yZCBkZWxldGlvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gUmVsb2FkIHRhYmxlIGRhdGFcbiAgICAgICAgICAgIHRoaXMuZGF0YVRhYmxlLmFqYXgucmVsb2FkKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZWxhdGVkIGNvbXBvbmVudHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9ucyAhPT0gJ3VuZGVmaW5lZCcgJiYgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IHN1Y2Nlc3MgbWVzc2FnZSBpZiBjb25maWd1cmVkXG4gICAgICAgICAgICBpZiAodGhpcy5zaG93U3VjY2Vzc01lc3NhZ2VzICYmIHRoaXMudHJhbnNsYXRpb25zLmRlbGV0ZVN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93U3VjY2Vzcyh0aGlzLnRyYW5zbGF0aW9ucy5kZWxldGVTdWNjZXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyYW5zbGF0aW9ucy5kZWxldGVFcnJvciB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9zc2libGVUb0RlbGV0ZVJlY29yZDtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZSBmcm9tIGFsbCBkZWxldGUgYnV0dG9uc1xuICAgICAgICB0aGlzLiR0YWJsZS5maW5kKCdhLmRlbGV0ZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgbG9hZGVyIHdoaWxlIGxvYWRpbmcgZGF0YVxuICAgICAqL1xuICAgIHNob3dMb2FkZXIoKSB7XG4gICAgICAgIC8vIEhpZGUgZXZlcnl0aGluZyBmaXJzdFxuICAgICAgICAvLyBGaW5kIHRoZSB0YWJsZSdzIHBhcmVudCBjb250YWluZXIgLSBuZWVkIHRoZSBvcmlnaW5hbCBjb250YWluZXIsIG5vdCB0aGUgRGF0YVRhYmxlcyB3cmFwcGVyXG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkJD1cIl93cmFwcGVyXCJdJyk7XG4gICAgICAgIGxldCAkY29udGFpbmVyO1xuICAgICAgICBpZiAoJHdyYXBwZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHBhcmVudCBvZiB0aGUgd3JhcHBlciAoc2hvdWxkIGJlIHRoZSBvcmlnaW5hbCBjb250YWluZXIpXG4gICAgICAgICAgICAkY29udGFpbmVyID0gJHdyYXBwZXIucGFyZW50KCdkaXZbaWRdJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmFsbGJhY2sgaWYgc3RydWN0dXJlIGlzIGRpZmZlcmVudFxuICAgICAgICBpZiAoISRjb250YWluZXIgfHwgISRjb250YWluZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAkY29udGFpbmVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkXTpub3QoW2lkJD1cIl93cmFwcGVyXCJdKScpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0ICRwbGFjZWhvbGRlciA9ICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpO1xuICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIFxuICAgICAgICAkY29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgJHBsYWNlaG9sZGVyLmhpZGUoKTtcbiAgICAgICAgJGFkZEJ1dHRvbi5oaWRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYW5kIHNob3cgbG9hZGVyIGlmIG5vdCBleGlzdHNcbiAgICAgICAgbGV0ICRsb2FkZXIgPSAkKCcjdGFibGUtZGF0YS1sb2FkZXInKTtcbiAgICAgICAgaWYgKCEkbG9hZGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgc2VnbWVudCB3aXRoIGxvYWRlciBmb3IgYmV0dGVyIHZpc3VhbCBhcHBlYXJhbmNlXG4gICAgICAgICAgICAkbG9hZGVyID0gJChgXG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cInRhYmxlLWRhdGEtbG9hZGVyXCIgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJtaW4taGVpZ2h0OiAyMDBweDsgcG9zaXRpb246IHJlbGF0aXZlO1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aXZlIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHQgbG9hZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXhfTG9hZGluZ0RhdGEgfHwgJ0xvYWRpbmcuLi4nfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgLy8gSW5zZXJ0IGxvYWRlciBpbiB0aGUgYXBwcm9wcmlhdGUgcGxhY2VcbiAgICAgICAgICAgIGlmICgkY29udGFpbmVyLmxlbmd0aCAmJiAkY29udGFpbmVyLnBhcmVudCgpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuYmVmb3JlKCRsb2FkZXIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkcGxhY2Vob2xkZXIubGVuZ3RoICYmICRwbGFjZWhvbGRlci5wYXJlbnQoKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkcGxhY2Vob2xkZXIuYmVmb3JlKCRsb2FkZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjazogYXBwZW5kIHRvIGJvZHkgb3IgcGFyZW50IGNvbnRhaW5lclxuICAgICAgICAgICAgICAgIGNvbnN0ICRwYXJlbnQgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCcucHVzaGVyJykgfHwgdGhpcy4kdGFibGUucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgJHBhcmVudC5hcHBlbmQoJGxvYWRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJGxvYWRlci5zaG93KCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgbG9hZGVyXG4gICAgICovXG4gICAgaGlkZUxvYWRlcigpIHtcbiAgICAgICAgJCgnI3RhYmxlLWRhdGEtbG9hZGVyJykuaGlkZSgpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBUb2dnbGUgZW1wdHkgdGFibGUgcGxhY2Vob2xkZXIgdmlzaWJpbGl0eVxuICAgICAqL1xuICAgIHRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIoaXNFbXB0eSkge1xuICAgICAgICAvLyBGaW5kIHRoZSB0YWJsZSdzIHBhcmVudCBjb250YWluZXIgLSBuZWVkIHRoZSBvcmlnaW5hbCBjb250YWluZXIsIG5vdCB0aGUgRGF0YVRhYmxlcyB3cmFwcGVyXG4gICAgICAgIC8vIERhdGFUYWJsZXMgd3JhcHMgdGhlIHRhYmxlIGluIGEgZGl2IHdpdGggaWQgZW5kaW5nIGluICdfd3JhcHBlcidcbiAgICAgICAgLy8gV2UgbmVlZCB0byBmaW5kIHRoZSBwYXJlbnQgb2YgdGhhdCB3cmFwcGVyIHdoaWNoIGlzIHRoZSBvcmlnaW5hbCBjb250YWluZXJcbiAgICAgICAgY29uc3QgJHdyYXBwZXIgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCdkaXZbaWQkPVwiX3dyYXBwZXJcIl0nKTtcbiAgICAgICAgbGV0ICRjb250YWluZXI7XG4gICAgICAgIGlmICgkd3JhcHBlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgcGFyZW50IG9mIHRoZSB3cmFwcGVyIChzaG91bGQgYmUgdGhlIG9yaWdpbmFsIGNvbnRhaW5lcilcbiAgICAgICAgICAgICRjb250YWluZXIgPSAkd3JhcHBlci5wYXJlbnQoJ2RpdltpZF0nKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGYWxsYmFjayBpZiBzdHJ1Y3R1cmUgaXMgZGlmZmVyZW50XG4gICAgICAgIGlmICghJGNvbnRhaW5lciB8fCAhJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICRjb250YWluZXIgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCdkaXZbaWRdOm5vdChbaWQkPVwiX3dyYXBwZXJcIl0pJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgJGFkZEJ1dHRvbiA9ICQoJyNhZGQtbmV3LWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkcGxhY2Vob2xkZXIgPSAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0VtcHR5KSB7XG4gICAgICAgICAgICAkY29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgICRhZGRCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHBsYWNlaG9sZGVyIGlzIHZpc2libGVcbiAgICAgICAgICAgIGlmICgkcGxhY2Vob2xkZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJHBsYWNlaG9sZGVyLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICgkcGxhY2Vob2xkZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJHBsYWNlaG9sZGVyLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnBlcm1pc3Npb25zLnNhdmUpIHtcbiAgICAgICAgICAgICAgICAkYWRkQnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRjb250YWluZXIuc2hvdygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZG91YmxlLWNsaWNrIGZvciBlZGl0aW5nXG4gICAgICogRXhjbHVkZXMgYWN0aW9uIGJ1dHRvbiBjZWxscyB0byBhdm9pZCBjb25mbGljdHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0KCkge1xuICAgICAgICB0aGlzLiR0YWJsZS5vbignZGJsY2xpY2snLCAndGJvZHkgdGQ6bm90KC5yaWdodC5hbGlnbmVkKScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5kYXRhVGFibGUucm93KGUuY3VycmVudFRhcmdldCkuZGF0YSgpO1xuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS51bmlxaWQgJiYgKHRoaXMucGVybWlzc2lvbnMubW9kaWZ5IHx8IHRoaXMucGVybWlzc2lvbnMuZWRpdCkpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfSR7dGhpcy5yb3V0ZVByZWZpeH0vbW9kaWZ5LyR7ZGF0YS51bmlxaWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHVuaWZpZWQgZGVzY3JpcHRpb24gcmVuZGVyZXIgd2l0aCB0cnVuY2F0aW9uIHN1cHBvcnRcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJlbmRlcmVyIGZ1bmN0aW9uIGZvciBEYXRhVGFibGVzXG4gICAgICovXG4gICAgY3JlYXRlRGVzY3JpcHRpb25SZW5kZXJlcigpIHtcbiAgICAgICAgcmV0dXJuIChkYXRhLCB0eXBlLCByb3cpID0+IHtcbiAgICAgICAgICAgIGlmICghZGF0YSB8fCBkYXRhLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ+KAlCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAvLyBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVEZXNjID0gd2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChkYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXNjcmlwdGlvbkxpbmVzID0gc2FmZURlc2Muc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpICE9PSAnJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG1heCBsaW5lc1xuICAgICAgICAgICAgICAgIGxldCBtYXhMaW5lcyA9IHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5tYXhMaW5lcztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmR5bmFtaWNIZWlnaHQgJiYgdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmNhbGN1bGF0ZUxpbmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heExpbmVzID0gdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmNhbGN1bGF0ZUxpbmVzKHJvdyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChkZXNjcmlwdGlvbkxpbmVzLmxlbmd0aCA8PSBtYXhMaW5lcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiBmaXRzIC0gc2hvdyB3aXRoIHByZXNlcnZlZCBmb3JtYXR0aW5nXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZERlc2MgPSBkZXNjcmlwdGlvbkxpbmVzLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb24tdGV4dFwiIHN0eWxlPVwibGluZS1oZWlnaHQ6IDEuMztcIj4ke2Zvcm1hdHRlZERlc2N9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiB0b28gbG9uZyAtIHRydW5jYXRlIHdpdGggcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlzaWJsZUxpbmVzID0gZGVzY3JpcHRpb25MaW5lcy5zbGljZSgwLCBtYXhMaW5lcyk7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVMaW5lc1ttYXhMaW5lcyAtIDFdICs9ICcuLi4nO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkRGVzYyA9IHZpc2libGVMaW5lcy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxEZXNjID0gZGVzY3JpcHRpb25MaW5lcy5qb2luKCdcXG4nKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uLXRleHQgdHJ1bmNhdGVkIHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2Z1bGxEZXNjfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcG9zaXRpb249XCJ0b3AgcmlnaHRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cIndpZGVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBoZWxwOyBib3JkZXItYm90dG9tOiAxcHggZG90dGVkICM5OTk7IGxpbmUtaGVpZ2h0OiAxLjM7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3RydW5jYXRlZERlc2N9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3Igc2VhcmNoIGFuZCBvdGhlciBvcGVyYXRpb25zLCByZXR1cm4gcGxhaW4gdGV4dFxuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgdGhlIERhdGFUYWJsZSBhbmQgY2xlYW51cFxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIFJlbW92ZSBldmVudCBoYW5kbGVyc1xuICAgICAgICB0aGlzLiR0YWJsZS5vZmYoJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknKTtcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdjbGljaycsICdhLmNvcHknKTtcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IERhdGFUYWJsZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRoaXMuZGF0YVRhYmxlICYmIHR5cGVvZiB0aGlzLmRhdGFUYWJsZS5kZXN0cm95ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGlzLmRhdGFUYWJsZS5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkZXJcbiAgICAgICAgJCgnI3RhYmxlLWRhdGEtbG9hZGVyJykucmVtb3ZlKCk7XG4gICAgfVxufVxuXG4vLyBNYWtlIGF2YWlsYWJsZSBnbG9iYWxseVxud2luZG93LlBieERhdGFUYWJsZUluZGV4ID0gUGJ4RGF0YVRhYmxlSW5kZXg7Il19