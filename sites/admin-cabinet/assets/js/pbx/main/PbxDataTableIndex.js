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
   * @param {Function} [config.onAfterDelete] - Callback after successful deletion
   * @param {Function} [config.getModifyUrl] - Custom URL generator for modify/edit actions
   * @param {boolean} [config.orderable=true] - Enable/disable sorting for all columns
   * @param {Array} [config.order=[[0, 'asc']]] - Default sort order
   * @param {Object} [config.ajaxData] - Additional data parameters for AJAX requests
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
    this.showInfo = config.showInfo || false; // Sorting configuration (backward compatible)

    this.orderable = config.orderable !== undefined ? config.orderable : true;
    this.order = config.order || [[0, 'asc']]; // Permission state (loaded from server)

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
    this.onAfterDelete = config.onAfterDelete;
    this.getModifyUrl = config.getModifyUrl;
    this.ajaxData = config.ajaxData || {};
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

      // Add the datatable-width-constrained class to the table
      this.$table.addClass('datatable-width-constrained');
      var processedColumns = this.processColumns();
      var config = {
        ajax: {
          url: this.apiModule.endpoints.getList,
          type: 'GET',
          data: this.ajaxData,
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
        order: this.order,
        ordering: this.orderable,
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
      var columns = _toConsumableArray(this.columns); // If sorting is globally disabled, ensure all columns respect it


      if (!this.orderable) {
        columns.forEach(function (col) {
          // Preserve explicit orderable: false, but override true or undefined
          if (col.orderable !== false) {
            col.orderable = false;
          }
        });
      } // Add standard action column if not already present


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
          var buttons = []; // Get the record ID - check for both uniqid and id fields

          var recordId = row.uniqid || row.id || ''; // Edit button

          if (_this2.actionButtons.includes('edit') && (_this2.permissions.modify || _this2.permissions.edit)) {
            // Use custom getModifyUrl if provided, otherwise use default
            var modifyUrl = _this2.getModifyUrl ? _this2.getModifyUrl(recordId) : "".concat(globalRootUrl).concat(_this2.routePrefix, "/modify/").concat(recordId);
            buttons.push("\n                        <a href=\"".concat(modifyUrl, "\" \n                           class=\"ui button edit popuped\" \n                           data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                            <i class=\"icon edit blue\"></i>\n                        </a>\n                    "));
          } // Copy button


          if (_this2.actionButtons.includes('copy') && _this2.permissions.copy) {
            buttons.push("\n                        <a href=\"#\" \n                           data-value=\"".concat(recordId, "\"\n                           class=\"ui button copy popuped\" \n                           data-content=\"").concat(globalTranslate.bt_ToolTipCopy, "\">\n                            <i class=\"icon copy outline blue\"></i>\n                        </a>\n                    "));
          } // Custom buttons


          _this2.customActionButtons.forEach(function (customButton) {
            if (_this2.permissions.custom && _this2.permissions.custom[customButton.name]) {
              var href = customButton.href || '#';
              var dataValue = customButton.includeId ? "data-value=\"".concat(recordId, "\"") : '';
              buttons.push("\n                            <a href=\"".concat(href, "\" \n                               ").concat(dataValue, "\n                               class=\"ui button ").concat(customButton["class"], " popuped\" \n                               data-content=\"").concat(SecurityUtils.escapeHtml(customButton.tooltip), "\">\n                                <i class=\"").concat(customButton.icon, "\"></i>\n                            </a>\n                        "));
            }
          }); // Delete button (always last)


          if (_this2.actionButtons.includes('delete') && _this2.permissions["delete"]) {
            buttons.push("\n                        <a href=\"#\" \n                           data-value=\"".concat(recordId, "\" \n                           class=\"ui button delete two-steps-delete popuped\" \n                           data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                            <i class=\"icon trash red\"></i>\n                        </a>\n                    "));
          }

          return buttons.length > 0 ? "<div class=\"ui tiny basic icon buttons action-buttons\">".concat(buttons.join(''), "</div>") : '';
        }
      };
    }
    /**
     * Handle data load and empty state management
     * Supports multiple API formats:
     * - v2 API: {result: true, data: [...]}
     * - v3 API: {data: {items: [...]}}
     * - Hybrid: {result: true, data: {items: [...]}}
     */

  }, {
    key: "handleDataLoad",
    value: function handleDataLoad(json) {
      // Hide loader first
      this.hideLoader();
      var data = [];
      var isSuccess = false; // First check if we have a result field to determine success

      if (json.hasOwnProperty('result')) {
        isSuccess = json.result === true;
      } // Now extract data based on structure


      if (json.data) {
        // Check if data has items property (v3 or hybrid format)
        if (json.data.items !== undefined) {
          data = json.data.items || []; // If no result field was present, assume success if we have data.items

          if (!json.hasOwnProperty('result')) {
            isSuccess = true;
          }
        } // Check if data is directly an array (v2 format)
        else if (Array.isArray(json.data)) {
          data = json.data; // If no result field was present, assume success

          if (!json.hasOwnProperty('result')) {
            isSuccess = true;
          }
        }
      }

      var isEmpty = !isSuccess || data.length === 0;
      this.toggleEmptyPlaceholder(isEmpty);

      if (this.onDataLoaded) {
        // Pass normalized response to callback
        var normalizedResponse = {
          result: isSuccess,
          data: data
        };
        this.onDataLoaded(normalizedResponse);
      }

      return data;
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
        var recordId = $(e.currentTarget).attr('data-value'); // Use same logic as modify URL but add copy parameter

        var copyUrl;

        if (_this4.getModifyUrl) {
          // Use custom getModifyUrl and add copy parameter
          var modifyUrl = _this4.getModifyUrl(recordId);

          if (modifyUrl) {
            // Remove recordId from URL and add copy parameter
            var baseUrl = modifyUrl.replace("/".concat(recordId), '');
            copyUrl = "".concat(baseUrl, "/?copy=").concat(recordId);
          }
        } else {
          // Default URL pattern
          copyUrl = "".concat(globalRootUrl).concat(_this4.routePrefix, "/modify/?copy=").concat(recordId);
        } // Redirect to copy URL


        if (copyUrl) {
          window.location = copyUrl;
        }
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
      var _this6 = this;

      if (response.result === true) {
        // Reload table data with callback support
        var reloadCallback = function reloadCallback() {
          // Call custom after-delete callback if provided
          if (typeof _this6.onAfterDelete === 'function') {
            _this6.onAfterDelete(response);
          }
        }; // Reload table and execute callback


        this.dataTable.ajax.reload(reloadCallback, false); // Update related components

        if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
          Extensions.cbOnDataChanged();
        } // Success message removed - no need to show success for deletion operations

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
      var _this7 = this;

      this.$table.on('dblclick', 'tbody td:not(.right.aligned)', function (e) {
        var data = _this7.dataTable.row(e.currentTarget).data(); // Get the record ID - check for both uniqid and id fields


        var recordId = data && (data.uniqid || data.id);

        if (recordId && (_this7.permissions.modify || _this7.permissions.edit)) {
          // Use custom getModifyUrl if provided, otherwise use default
          var modifyUrl = _this7.getModifyUrl ? _this7.getModifyUrl(recordId) : "".concat(globalRootUrl).concat(_this7.routePrefix, "/modify/").concat(recordId);
          window.location = modifyUrl;
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
      var _this8 = this;

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

          var maxLines = _this8.descriptionSettings.maxLines;

          if (_this8.descriptionSettings.dynamicHeight && _this8.descriptionSettings.calculateLines) {
            maxLines = _this8.descriptionSettings.calculateLines(row);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1BieERhdGFUYWJsZUluZGV4LmpzIl0sIm5hbWVzIjpbIlBieERhdGFUYWJsZUluZGV4IiwiY29uZmlnIiwidGFibGVJZCIsImFwaU1vZHVsZSIsInJvdXRlUHJlZml4IiwidHJhbnNsYXRpb25zIiwiY29sdW1ucyIsInNob3dTdWNjZXNzTWVzc2FnZXMiLCJzaG93SW5mbyIsIm9yZGVyYWJsZSIsInVuZGVmaW5lZCIsIm9yZGVyIiwicGVybWlzc2lvbnMiLCJzYXZlIiwibW9kaWZ5IiwiZWRpdCIsImNvcHkiLCJjdXN0b20iLCJhY3Rpb25CdXR0b25zIiwiY3VzdG9tQWN0aW9uQnV0dG9ucyIsImRlc2NyaXB0aW9uU2V0dGluZ3MiLCJPYmplY3QiLCJhc3NpZ24iLCJtYXhMaW5lcyIsImR5bmFtaWNIZWlnaHQiLCJjYWxjdWxhdGVMaW5lcyIsIiR0YWJsZSIsIiQiLCJkYXRhVGFibGUiLCJvbkRhdGFMb2FkZWQiLCJvbkRyYXdDYWxsYmFjayIsIm9uUGVybWlzc2lvbnNMb2FkZWQiLCJjdXN0b21EZWxldGVIYW5kbGVyIiwib25BZnRlckRlbGV0ZSIsImdldE1vZGlmeVVybCIsImFqYXhEYXRhIiwic2hvd0xvYWRlciIsImxvYWRQZXJtaXNzaW9ucyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJlcnJvciIsImNvbnNvbGUiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X0Vycm9ySW5pdGlhbGl6aW5nVGFibGUiLCJoaWRlTG9hZGVyIiwidG9nZ2xlRW1wdHlQbGFjZWhvbGRlciIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJtZXRob2QiLCJkYXRhIiwiY29udHJvbGxlciIsImRhdGFUeXBlIiwic3VjY2VzcyIsIndhcm4iLCJhZGRDbGFzcyIsInByb2Nlc3NlZENvbHVtbnMiLCJwcm9jZXNzQ29sdW1ucyIsImVuZHBvaW50cyIsImdldExpc3QiLCJ0eXBlIiwiZGF0YVNyYyIsImpzb24iLCJoYW5kbGVEYXRhTG9hZCIsInhociIsInRocm93biIsImV4X0Vycm9yTG9hZGluZ0RhdGEiLCJvcmRlcmluZyIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInNlYXJjaGluZyIsImluZm8iLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZHJhd0NhbGxiYWNrIiwiaGFuZGxlRHJhd0NhbGxiYWNrIiwiRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIiLCJpbml0aWFsaXplQ29weUhhbmRsZXIiLCJpbml0aWFsaXplQ3VzdG9tSGFuZGxlcnMiLCJmb3JFYWNoIiwiY29sIiwiZmluZCIsImlzQWN0aW9uQ29sdW1uIiwicHVzaCIsImNyZWF0ZUFjdGlvbkNvbHVtbiIsInNlYXJjaGFibGUiLCJjbGFzc05hbWUiLCJyZW5kZXIiLCJyb3ciLCJidXR0b25zIiwicmVjb3JkSWQiLCJ1bmlxaWQiLCJpZCIsImluY2x1ZGVzIiwibW9kaWZ5VXJsIiwiYnRfVG9vbFRpcEVkaXQiLCJidF9Ub29sVGlwQ29weSIsImN1c3RvbUJ1dHRvbiIsIm5hbWUiLCJocmVmIiwiZGF0YVZhbHVlIiwiaW5jbHVkZUlkIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJ0b29sdGlwIiwiaWNvbiIsImJ0X1Rvb2xUaXBEZWxldGUiLCJsZW5ndGgiLCJqb2luIiwiaXNTdWNjZXNzIiwiaGFzT3duUHJvcGVydHkiLCJyZXN1bHQiLCJpdGVtcyIsIkFycmF5IiwiaXNBcnJheSIsImlzRW1wdHkiLCJub3JtYWxpemVkUmVzcG9uc2UiLCJwb3B1cCIsInJlcG9zaXRpb25BZGRCdXR0b24iLCJpbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0IiwiJGFkZEJ1dHRvbiIsIiR3cmFwcGVyIiwiJGxlZnRDb2x1bW4iLCJmaXJzdCIsImFwcGVuZCIsInNob3ciLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiYXR0ciIsImRlbGV0ZVJlY29yZCIsImNiQWZ0ZXJEZWxldGVSZWNvcmQiLCJjb3B5VXJsIiwiYmFzZVVybCIsInJlcGxhY2UiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsIm9uQ2xpY2siLCJyZWxvYWRDYWxsYmFjayIsInJlbG9hZCIsIkV4dGVuc2lvbnMiLCJjYk9uRGF0YUNoYW5nZWQiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImRlbGV0ZUVycm9yIiwiZXhfSW1wb3NzaWJsZVRvRGVsZXRlUmVjb3JkIiwicmVtb3ZlQ2xhc3MiLCJjbG9zZXN0IiwiJGNvbnRhaW5lciIsInBhcmVudCIsIiRwbGFjZWhvbGRlciIsImhpZGUiLCIkbG9hZGVyIiwiZXhfTG9hZGluZ0RhdGEiLCJiZWZvcmUiLCIkcGFyZW50IiwidHJpbSIsInNhZmVEZXNjIiwiZGVzY3JpcHRpb25MaW5lcyIsInNwbGl0IiwiZmlsdGVyIiwibGluZSIsImZvcm1hdHRlZERlc2MiLCJ2aXNpYmxlTGluZXMiLCJzbGljZSIsInRydW5jYXRlZERlc2MiLCJmdWxsRGVzYyIsIm9mZiIsImRlc3Ryb3kiLCJyZW1vdmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLGlCO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0ksNkJBQVlDLE1BQVosRUFBb0I7QUFBQTs7QUFDaEI7QUFDQSxTQUFLQyxPQUFMLEdBQWVELE1BQU0sQ0FBQ0MsT0FB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LE9BeENEO0FBeUNIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksbUJBQVU7QUFDTjtBQUNBLFdBQUsxQixNQUFMLENBQVltSixHQUFaLENBQWdCLE9BQWhCLEVBQXlCLGlDQUF6QjtBQUNBLFdBQUtuSixNQUFMLENBQVltSixHQUFaLENBQWdCLE9BQWhCLEVBQXlCLFFBQXpCO0FBQ0EsV0FBS25KLE1BQUwsQ0FBWW1KLEdBQVosQ0FBZ0IsVUFBaEIsRUFBNEIsOEJBQTVCLEVBSk0sQ0FNTjs7QUFDQSxVQUFJLEtBQUtqSixTQUFMLElBQWtCLE9BQU8sS0FBS0EsU0FBTCxDQUFla0osT0FBdEIsS0FBa0MsVUFBeEQsRUFBb0U7QUFDaEUsYUFBS2xKLFNBQUwsQ0FBZWtKLE9BQWY7QUFDSCxPQVRLLENBV047OztBQUNBbkosTUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0JvSixNQUF4QjtBQUNIOzs7O0tBR0w7OztBQUNBbEMsTUFBTSxDQUFDN0ksaUJBQVAsR0FBMkJBLGlCQUEzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXh0ZW5zaW9ucywgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIE1pa29QQlggaW5kZXggdGFibGUgbWFuYWdlbWVudCB3aXRoIEFDTCBzdXBwb3J0XG4gKiBcbiAqIFByb3ZpZGVzIGNvbW1vbiBmdW5jdGlvbmFsaXR5IGZvciBEYXRhVGFibGUtYmFzZWQgaW5kZXggcGFnZXMgaW5jbHVkaW5nOlxuICogLSBTZXJ2ZXItc2lkZSBBQ0wgcGVybWlzc2lvbiBjaGVja2luZ1xuICogLSBEeW5hbWljIGFjdGlvbiBidXR0b24gcmVuZGVyaW5nIGJhc2VkIG9uIHBlcm1pc3Npb25zXG4gKiAtIFVuaWZpZWQgZGVzY3JpcHRpb24gdHJ1bmNhdGlvbiB3aXRoIHBvcHVwIHN1cHBvcnRcbiAqIC0gQ29weSBmdW5jdGlvbmFsaXR5IHN1cHBvcnRcbiAqIC0gQ3VzdG9tIGFjdGlvbiBidXR0b25zXG4gKiAtIFR3by1zdGVwIGRlbGV0ZSBjb25maXJtYXRpb25cbiAqIC0gRG91YmxlLWNsaWNrIGVkaXRpbmdcbiAqIFxuICogQGNsYXNzIFBieERhdGFUYWJsZUluZGV4XG4gKi9cbmNsYXNzIFBieERhdGFUYWJsZUluZGV4IHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXggaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLnRhYmxlSWQgLSBIVE1MIHRhYmxlIGVsZW1lbnQgSURcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnLmFwaU1vZHVsZSAtIEFQSSBtb2R1bGUgZm9yIGRhdGEgb3BlcmF0aW9uc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcucm91dGVQcmVmaXggLSBVUkwgcm91dGUgcHJlZml4IChlLmcuLCAnY2FsbC1xdWV1ZXMnKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcudHJhbnNsYXRpb25zIC0gVHJhbnNsYXRpb24ga2V5cyBmb3IgbWVzc2FnZXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb25maWcuY29sdW1ucyAtIERhdGFUYWJsZSBjb2x1bW4gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2hvd1N1Y2Nlc3NNZXNzYWdlcz1mYWxzZV0gLSBTaG93IHN1Y2Nlc3MgbWVzc2FnZXMgb24gZGVsZXRlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNob3dJbmZvPWZhbHNlXSAtIFNob3cgRGF0YVRhYmxlIGluZm9cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmFjdGlvbkJ1dHRvbnM9WydlZGl0JywgJ2RlbGV0ZSddXSAtIFN0YW5kYXJkIGFjdGlvbiBidXR0b25zIHRvIHNob3dcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmN1c3RvbUFjdGlvbkJ1dHRvbnM9W11dIC0gQ3VzdG9tIGFjdGlvbiBidXR0b24gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5kZXNjcmlwdGlvblNldHRpbmdzXSAtIERlc2NyaXB0aW9uIHRydW5jYXRpb24gc2V0dGluZ3NcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLm9uRGF0YUxvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBkYXRhIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25EcmF3Q2FsbGJhY2tdIC0gQ2FsbGJhY2sgYWZ0ZXIgdGFibGUgZHJhd1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25QZXJtaXNzaW9uc0xvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBwZXJtaXNzaW9ucyBsb2FkZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmN1c3RvbURlbGV0ZUhhbmRsZXJdIC0gQ3VzdG9tIGRlbGV0ZSBoYW5kbGVyXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5vbkFmdGVyRGVsZXRlXSAtIENhbGxiYWNrIGFmdGVyIHN1Y2Nlc3NmdWwgZGVsZXRpb25cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmdldE1vZGlmeVVybF0gLSBDdXN0b20gVVJMIGdlbmVyYXRvciBmb3IgbW9kaWZ5L2VkaXQgYWN0aW9uc1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5vcmRlcmFibGU9dHJ1ZV0gLSBFbmFibGUvZGlzYWJsZSBzb3J0aW5nIGZvciBhbGwgY29sdW1uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtjb25maWcub3JkZXI9W1swLCAnYXNjJ11dXSAtIERlZmF1bHQgc29ydCBvcmRlclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnLmFqYXhEYXRhXSAtIEFkZGl0aW9uYWwgZGF0YSBwYXJhbWV0ZXJzIGZvciBBSkFYIHJlcXVlc3RzXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gICAgICAgIC8vIENvcmUgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLnRhYmxlSWQgPSBjb25maWcudGFibGVJZDtcbiAgICAgICAgdGhpcy5hcGlNb2R1bGUgPSBjb25maWcuYXBpTW9kdWxlO1xuICAgICAgICB0aGlzLnJvdXRlUHJlZml4ID0gY29uZmlnLnJvdXRlUHJlZml4O1xuICAgICAgICB0aGlzLnRyYW5zbGF0aW9ucyA9IGNvbmZpZy50cmFuc2xhdGlvbnMgfHwge307XG4gICAgICAgIHRoaXMuY29sdW1ucyA9IGNvbmZpZy5jb2x1bW5zIHx8IFtdO1xuICAgICAgICB0aGlzLnNob3dTdWNjZXNzTWVzc2FnZXMgPSBjb25maWcuc2hvd1N1Y2Nlc3NNZXNzYWdlcyB8fCBmYWxzZTtcbiAgICAgICAgdGhpcy5zaG93SW5mbyA9IGNvbmZpZy5zaG93SW5mbyB8fCBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNvcnRpbmcgY29uZmlndXJhdGlvbiAoYmFja3dhcmQgY29tcGF0aWJsZSlcbiAgICAgICAgdGhpcy5vcmRlcmFibGUgPSBjb25maWcub3JkZXJhYmxlICE9PSB1bmRlZmluZWQgPyBjb25maWcub3JkZXJhYmxlIDogdHJ1ZTtcbiAgICAgICAgdGhpcy5vcmRlciA9IGNvbmZpZy5vcmRlciB8fCBbWzAsICdhc2MnXV07XG4gICAgICAgIFxuICAgICAgICAvLyBQZXJtaXNzaW9uIHN0YXRlIChsb2FkZWQgZnJvbSBzZXJ2ZXIpXG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSB7XG4gICAgICAgICAgICBzYXZlOiBmYWxzZSxcbiAgICAgICAgICAgIG1vZGlmeTogZmFsc2UsXG4gICAgICAgICAgICBlZGl0OiBmYWxzZSxcbiAgICAgICAgICAgIGRlbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICBjb3B5OiBmYWxzZSxcbiAgICAgICAgICAgIGN1c3RvbToge31cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFjdGlvbiBidXR0b25zIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy5hY3Rpb25CdXR0b25zID0gY29uZmlnLmFjdGlvbkJ1dHRvbnMgfHwgWydlZGl0JywgJ2RlbGV0ZSddO1xuICAgICAgICB0aGlzLmN1c3RvbUFjdGlvbkJ1dHRvbnMgPSBjb25maWcuY3VzdG9tQWN0aW9uQnV0dG9ucyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlc2NyaXB0aW9uIHRydW5jYXRpb24gc2V0dGluZ3NcbiAgICAgICAgdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICBtYXhMaW5lczogMyxcbiAgICAgICAgICAgIGR5bmFtaWNIZWlnaHQ6IGZhbHNlLFxuICAgICAgICAgICAgY2FsY3VsYXRlTGluZXM6IG51bGxcbiAgICAgICAgfSwgY29uZmlnLmRlc2NyaXB0aW9uU2V0dGluZ3MgfHwge30pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW50ZXJuYWwgcHJvcGVydGllc1xuICAgICAgICB0aGlzLiR0YWJsZSA9ICQoYCMke3RoaXMudGFibGVJZH1gKTtcbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIE9wdGlvbmFsIGNhbGxiYWNrc1xuICAgICAgICB0aGlzLm9uRGF0YUxvYWRlZCA9IGNvbmZpZy5vbkRhdGFMb2FkZWQ7XG4gICAgICAgIHRoaXMub25EcmF3Q2FsbGJhY2sgPSBjb25maWcub25EcmF3Q2FsbGJhY2s7XG4gICAgICAgIHRoaXMub25QZXJtaXNzaW9uc0xvYWRlZCA9IGNvbmZpZy5vblBlcm1pc3Npb25zTG9hZGVkO1xuICAgICAgICB0aGlzLmN1c3RvbURlbGV0ZUhhbmRsZXIgPSBjb25maWcuY3VzdG9tRGVsZXRlSGFuZGxlcjtcbiAgICAgICAgdGhpcy5vbkFmdGVyRGVsZXRlID0gY29uZmlnLm9uQWZ0ZXJEZWxldGU7XG4gICAgICAgIHRoaXMuZ2V0TW9kaWZ5VXJsID0gY29uZmlnLmdldE1vZGlmeVVybDtcbiAgICAgICAgdGhpcy5hamF4RGF0YSA9IGNvbmZpZy5hamF4RGF0YSB8fCB7fTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlIHdpdGggcGVybWlzc2lvbiBsb2FkaW5nXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFNob3cgbG9hZGVyIHdoaWxlIGluaXRpYWxpemluZ1xuICAgICAgICAgICAgdGhpcy5zaG93TG9hZGVyKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpcnN0LCBsb2FkIHBlcm1pc3Npb25zIGZyb20gc2VydmVyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRQZXJtaXNzaW9ucygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIERhdGFUYWJsZSAod2lsbCBoYW5kbGUgbG9hZGVyL2VtcHR5IHN0YXRlIGluIGRhdGEgY2FsbGJhY2spXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIFBieERhdGFUYWJsZUluZGV4OicsIGVycm9yKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JJbml0aWFsaXppbmdUYWJsZSB8fCAnRmFpbGVkIHRvIGluaXRpYWxpemUgdGFibGUnKTtcbiAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcGVybWlzc2lvbnMgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBhc3luYyBsb2FkUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWFjbC9jaGVja1Blcm1pc3Npb25zYCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogdGhpcy5yb3V0ZVByZWZpeFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMucGVybWlzc2lvbnMsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uUGVybWlzc2lvbnNMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkKHRoaXMucGVybWlzc2lvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGxvYWQgcGVybWlzc2lvbnMsIHVzaW5nIGRlZmF1bHRzOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIE9uIGVycm9yLCBkZWZhdWx0IHRvIG5vIHBlcm1pc3Npb25zIGZvciBzYWZldHlcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIGNvbW1vbiBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgLy8gQWRkIHRoZSBkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQgY2xhc3MgdG8gdGhlIHRhYmxlXG4gICAgICAgIHRoaXMuJHRhYmxlLmFkZENsYXNzKCdkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQnKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb2Nlc3NlZENvbHVtbnMgPSB0aGlzLnByb2Nlc3NDb2x1bW5zKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb25maWcgPSB7XG4gICAgICAgICAgICBhamF4OiB7XG4gICAgICAgICAgICAgICAgdXJsOiB0aGlzLmFwaU1vZHVsZS5lbmRwb2ludHMuZ2V0TGlzdCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB0aGlzLmFqYXhEYXRhLFxuICAgICAgICAgICAgICAgIGRhdGFTcmM6IChqc29uKSA9PiB0aGlzLmhhbmRsZURhdGFMb2FkKGpzb24pLFxuICAgICAgICAgICAgICAgIGVycm9yOiAoeGhyLCBlcnJvciwgdGhyb3duKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JMb2FkaW5nRGF0YSB8fCAnRmFpbGVkIHRvIGxvYWQgZGF0YScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBwcm9jZXNzZWRDb2x1bW5zLFxuICAgICAgICAgICAgb3JkZXI6IHRoaXMub3JkZXIsXG4gICAgICAgICAgICBvcmRlcmluZzogdGhpcy5vcmRlcmFibGUsXG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IHRoaXMuc2hvd0luZm8sXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrOiAoKSA9PiB0aGlzLmhhbmRsZURyYXdDYWxsYmFjaygpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLmRhdGFUYWJsZSA9IHRoaXMuJHRhYmxlLkRhdGFUYWJsZShjb25maWcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBoYW5kbGVyc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEZWxldGVIYW5kbGVyKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNvcHlIYW5kbGVyKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUN1c3RvbUhhbmRsZXJzKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgY29sdW1uIGRlZmluaXRpb25zIGFuZCBhZGQgYWN0aW9uIGNvbHVtbiBpZiBuZWVkZWRcbiAgICAgKi9cbiAgICBwcm9jZXNzQ29sdW1ucygpIHtcbiAgICAgICAgY29uc3QgY29sdW1ucyA9IFsuLi50aGlzLmNvbHVtbnNdO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgc29ydGluZyBpcyBnbG9iYWxseSBkaXNhYmxlZCwgZW5zdXJlIGFsbCBjb2x1bW5zIHJlc3BlY3QgaXRcbiAgICAgICAgaWYgKCF0aGlzLm9yZGVyYWJsZSkge1xuICAgICAgICAgICAgY29sdW1ucy5mb3JFYWNoKGNvbCA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUHJlc2VydmUgZXhwbGljaXQgb3JkZXJhYmxlOiBmYWxzZSwgYnV0IG92ZXJyaWRlIHRydWUgb3IgdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgaWYgKGNvbC5vcmRlcmFibGUgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbC5vcmRlcmFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0YW5kYXJkIGFjdGlvbiBjb2x1bW4gaWYgbm90IGFscmVhZHkgcHJlc2VudFxuICAgICAgICBpZiAoIWNvbHVtbnMuZmluZChjb2wgPT4gY29sLmlzQWN0aW9uQ29sdW1uKSkge1xuICAgICAgICAgICAgY29sdW1ucy5wdXNoKHRoaXMuY3JlYXRlQWN0aW9uQ29sdW1uKCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY29sdW1ucztcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHN0YW5kYXJkIGFjdGlvbiBjb2x1bW4gd2l0aCBwZXJtaXNzaW9uLWJhc2VkIHJlbmRlcmluZ1xuICAgICAqL1xuICAgIGNyZWF0ZUFjdGlvbkNvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBjbGFzc05hbWU6ICdyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmcnLFxuICAgICAgICAgICAgaXNBY3Rpb25Db2x1bW46IHRydWUsXG4gICAgICAgICAgICByZW5kZXI6IChkYXRhLCB0eXBlLCByb3cpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBidXR0b25zID0gW107XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSByZWNvcmQgSUQgLSBjaGVjayBmb3IgYm90aCB1bmlxaWQgYW5kIGlkIGZpZWxkc1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gcm93LnVuaXFpZCB8fCByb3cuaWQgfHwgJyc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRWRpdCBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdlZGl0JykgJiYgXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLnBlcm1pc3Npb25zLm1vZGlmeSB8fCB0aGlzLnBlcm1pc3Npb25zLmVkaXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgY3VzdG9tIGdldE1vZGlmeVVybCBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsID8gXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdldE1vZGlmeVVybChyZWNvcmRJZCkgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvJHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke21vZGlmeVVybH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGVkaXQgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGVkaXQgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uQnV0dG9ucy5pbmNsdWRlcygnY29weScpICYmIHRoaXMucGVybWlzc2lvbnMuY29weSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke3JlY29yZElkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBjb3B5IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBjb3B5IG91dGxpbmUgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEN1c3RvbSBidXR0b25zXG4gICAgICAgICAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zLmZvckVhY2goY3VzdG9tQnV0dG9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvbnMuY3VzdG9tICYmIHRoaXMucGVybWlzc2lvbnMuY3VzdG9tW2N1c3RvbUJ1dHRvbi5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaHJlZiA9IGN1c3RvbUJ1dHRvbi5ocmVmIHx8ICcjJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFWYWx1ZSA9IGN1c3RvbUJ1dHRvbi5pbmNsdWRlSWQgPyBgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCJgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2hyZWZ9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtkYXRhVmFsdWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gJHtjdXN0b21CdXR0b24uY2xhc3N9IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChjdXN0b21CdXR0b24udG9vbHRpcCl9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtjdXN0b21CdXR0b24uaWNvbn1cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBEZWxldGUgYnV0dG9uIChhbHdheXMgbGFzdClcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdkZWxldGUnKSAmJiB0aGlzLnBlcm1pc3Npb25zLmRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke3JlY29yZElkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlIHR3by1zdGVwcy1kZWxldGUgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1dHRvbnMubGVuZ3RoID4gMCA/IFxuICAgICAgICAgICAgICAgICAgICBgPGRpdiBjbGFzcz1cInVpIHRpbnkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+JHtidXR0b25zLmpvaW4oJycpfTwvZGl2PmAgOiBcbiAgICAgICAgICAgICAgICAgICAgJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBkYXRhIGxvYWQgYW5kIGVtcHR5IHN0YXRlIG1hbmFnZW1lbnRcbiAgICAgKiBTdXBwb3J0cyBtdWx0aXBsZSBBUEkgZm9ybWF0czpcbiAgICAgKiAtIHYyIEFQSToge3Jlc3VsdDogdHJ1ZSwgZGF0YTogWy4uLl19XG4gICAgICogLSB2MyBBUEk6IHtkYXRhOiB7aXRlbXM6IFsuLi5dfX1cbiAgICAgKiAtIEh5YnJpZDoge3Jlc3VsdDogdHJ1ZSwgZGF0YToge2l0ZW1zOiBbLi4uXX19XG4gICAgICovXG4gICAgaGFuZGxlRGF0YUxvYWQoanNvbikge1xuICAgICAgICAvLyBIaWRlIGxvYWRlciBmaXJzdFxuICAgICAgICB0aGlzLmhpZGVMb2FkZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBkYXRhID0gW107XG4gICAgICAgIGxldCBpc1N1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpcnN0IGNoZWNrIGlmIHdlIGhhdmUgYSByZXN1bHQgZmllbGQgdG8gZGV0ZXJtaW5lIHN1Y2Nlc3NcbiAgICAgICAgaWYgKGpzb24uaGFzT3duUHJvcGVydHkoJ3Jlc3VsdCcpKSB7XG4gICAgICAgICAgICBpc1N1Y2Nlc3MgPSBqc29uLnJlc3VsdCA9PT0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm93IGV4dHJhY3QgZGF0YSBiYXNlZCBvbiBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKGpzb24uZGF0YSkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgZGF0YSBoYXMgaXRlbXMgcHJvcGVydHkgKHYzIG9yIGh5YnJpZCBmb3JtYXQpXG4gICAgICAgICAgICBpZiAoanNvbi5kYXRhLml0ZW1zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0ganNvbi5kYXRhLml0ZW1zIHx8IFtdO1xuICAgICAgICAgICAgICAgIC8vIElmIG5vIHJlc3VsdCBmaWVsZCB3YXMgcHJlc2VudCwgYXNzdW1lIHN1Y2Nlc3MgaWYgd2UgaGF2ZSBkYXRhLml0ZW1zXG4gICAgICAgICAgICAgICAgaWYgKCFqc29uLmhhc093blByb3BlcnR5KCdyZXN1bHQnKSkge1xuICAgICAgICAgICAgICAgICAgICBpc1N1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGRhdGEgaXMgZGlyZWN0bHkgYW4gYXJyYXkgKHYyIGZvcm1hdClcbiAgICAgICAgICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoanNvbi5kYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBqc29uLmRhdGE7XG4gICAgICAgICAgICAgICAgLy8gSWYgbm8gcmVzdWx0IGZpZWxkIHdhcyBwcmVzZW50LCBhc3N1bWUgc3VjY2Vzc1xuICAgICAgICAgICAgICAgIGlmICghanNvbi5oYXNPd25Qcm9wZXJ0eSgncmVzdWx0JykpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNTdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGlzRW1wdHkgPSAhaXNTdWNjZXNzIHx8IGRhdGEubGVuZ3RoID09PSAwO1xuICAgICAgICB0aGlzLnRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIoaXNFbXB0eSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vbkRhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgIC8vIFBhc3Mgbm9ybWFsaXplZCByZXNwb25zZSB0byBjYWxsYmFja1xuICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgICAgIHJlc3VsdDogaXNTdWNjZXNzLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLm9uRGF0YUxvYWRlZChub3JtYWxpemVkUmVzcG9uc2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRyYXcgY2FsbGJhY2sgZm9yIHBvc3QtcmVuZGVyIG9wZXJhdGlvbnNcbiAgICAgKi9cbiAgICBoYW5kbGVEcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgcG9wdXBzXG4gICAgICAgIHRoaXMuJHRhYmxlLmZpbmQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1vdmUgQWRkIE5ldyBidXR0b24gdG8gRGF0YVRhYmxlcyB3cmFwcGVyXG4gICAgICAgIHRoaXMucmVwb3NpdGlvbkFkZEJ1dHRvbigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZWRpdGluZ1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEN1c3RvbSBkcmF3IGNhbGxiYWNrXG4gICAgICAgIGlmICh0aGlzLm9uRHJhd0NhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLm9uRHJhd0NhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUmVwb3NpdGlvbiBBZGQgTmV3IGJ1dHRvbiB0byBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgKi9cbiAgICByZXBvc2l0aW9uQWRkQnV0dG9uKCkge1xuICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gJChgIyR7dGhpcy50YWJsZUlkfV93cmFwcGVyYCk7XG4gICAgICAgIGNvbnN0ICRsZWZ0Q29sdW1uID0gJHdyYXBwZXIuZmluZCgnLmVpZ2h0LndpZGUuY29sdW1uJykuZmlyc3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkYWRkQnV0dG9uLmxlbmd0aCAmJiAkbGVmdENvbHVtbi5sZW5ndGggJiYgdGhpcy5wZXJtaXNzaW9ucy5zYXZlKSB7XG4gICAgICAgICAgICAkbGVmdENvbHVtbi5hcHBlbmQoJGFkZEJ1dHRvbik7XG4gICAgICAgICAgICAkYWRkQnV0dG9uLnNob3coKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRlbGV0ZSBoYW5kbGVyIHdpdGggdHdvLXN0ZXAgY29uZmlybWF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICAgIC8vIERlbGV0ZVNvbWV0aGluZy5qcyBoYW5kbGVzIGZpcnN0IGNsaWNrXG4gICAgICAgIC8vIFdlIGhhbmRsZSBzZWNvbmQgY2xpY2sgd2hlbiB0d28tc3RlcHMtZGVsZXRlIGNsYXNzIGlzIHJlbW92ZWRcbiAgICAgICAgdGhpcy4kdGFibGUub24oJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aGlzLmN1c3RvbURlbGV0ZUhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1c3RvbURlbGV0ZUhhbmRsZXIocmVjb3JkSWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaU1vZHVsZS5kZWxldGVSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4gdGhpcy5jYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNvcHkgaGFuZGxlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVDb3B5SGFuZGxlcigpIHtcbiAgICAgICAgdGhpcy4kdGFibGUub24oJ2NsaWNrJywgJ2EuY29weScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSBzYW1lIGxvZ2ljIGFzIG1vZGlmeSBVUkwgYnV0IGFkZCBjb3B5IHBhcmFtZXRlclxuICAgICAgICAgICAgbGV0IGNvcHlVcmw7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRNb2RpZnlVcmwpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgY3VzdG9tIGdldE1vZGlmeVVybCBhbmQgYWRkIGNvcHkgcGFyYW1ldGVyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9kaWZ5VXJsID0gdGhpcy5nZXRNb2RpZnlVcmwocmVjb3JkSWQpO1xuICAgICAgICAgICAgICAgIGlmIChtb2RpZnlVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHJlY29yZElkIGZyb20gVVJMIGFuZCBhZGQgY29weSBwYXJhbWV0ZXJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZVVybCA9IG1vZGlmeVVybC5yZXBsYWNlKGAvJHtyZWNvcmRJZH1gLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvcHlVcmwgPSBgJHtiYXNlVXJsfS8/Y29weT0ke3JlY29yZElkfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBEZWZhdWx0IFVSTCBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgY29weVVybCA9IGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvP2NvcHk9JHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWRpcmVjdCB0byBjb3B5IFVSTFxuICAgICAgICAgICAgaWYgKGNvcHlVcmwpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBjb3B5VXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjdXN0b20gYnV0dG9uIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUN1c3RvbUhhbmRsZXJzKCkge1xuICAgICAgICB0aGlzLmN1c3RvbUFjdGlvbkJ1dHRvbnMuZm9yRWFjaChjdXN0b21CdXR0b24gPT4ge1xuICAgICAgICAgICAgaWYgKGN1c3RvbUJ1dHRvbi5vbkNsaWNrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kdGFibGUub24oJ2NsaWNrJywgYGEuJHtjdXN0b21CdXR0b24uY2xhc3N9YCwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUJ1dHRvbi5vbkNsaWNrKHJlY29yZElkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHJlY29yZCBkZWxldGlvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gUmVsb2FkIHRhYmxlIGRhdGEgd2l0aCBjYWxsYmFjayBzdXBwb3J0XG4gICAgICAgICAgICBjb25zdCByZWxvYWRDYWxsYmFjayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDYWxsIGN1c3RvbSBhZnRlci1kZWxldGUgY2FsbGJhY2sgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMub25BZnRlckRlbGV0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQWZ0ZXJEZWxldGUocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbG9hZCB0YWJsZSBhbmQgZXhlY3V0ZSBjYWxsYmFja1xuICAgICAgICAgICAgdGhpcy5kYXRhVGFibGUuYWpheC5yZWxvYWQocmVsb2FkQ2FsbGJhY2ssIGZhbHNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHJlbGF0ZWQgY29tcG9uZW50c1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25zICE9PSAndW5kZWZpbmVkJyAmJiBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN1Y2Nlc3MgbWVzc2FnZSByZW1vdmVkIC0gbm8gbmVlZCB0byBzaG93IHN1Y2Nlc3MgZm9yIGRlbGV0aW9uIG9wZXJhdGlvbnNcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyYW5zbGF0aW9ucy5kZWxldGVFcnJvciB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9zc2libGVUb0RlbGV0ZVJlY29yZDtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZSBmcm9tIGFsbCBkZWxldGUgYnV0dG9uc1xuICAgICAgICB0aGlzLiR0YWJsZS5maW5kKCdhLmRlbGV0ZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgbG9hZGVyIHdoaWxlIGxvYWRpbmcgZGF0YVxuICAgICAqL1xuICAgIHNob3dMb2FkZXIoKSB7XG4gICAgICAgIC8vIEhpZGUgZXZlcnl0aGluZyBmaXJzdFxuICAgICAgICAvLyBGaW5kIHRoZSB0YWJsZSdzIHBhcmVudCBjb250YWluZXIgLSBuZWVkIHRoZSBvcmlnaW5hbCBjb250YWluZXIsIG5vdCB0aGUgRGF0YVRhYmxlcyB3cmFwcGVyXG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkJD1cIl93cmFwcGVyXCJdJyk7XG4gICAgICAgIGxldCAkY29udGFpbmVyO1xuICAgICAgICBpZiAoJHdyYXBwZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHBhcmVudCBvZiB0aGUgd3JhcHBlciAoc2hvdWxkIGJlIHRoZSBvcmlnaW5hbCBjb250YWluZXIpXG4gICAgICAgICAgICAkY29udGFpbmVyID0gJHdyYXBwZXIucGFyZW50KCdkaXZbaWRdJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmFsbGJhY2sgaWYgc3RydWN0dXJlIGlzIGRpZmZlcmVudFxuICAgICAgICBpZiAoISRjb250YWluZXIgfHwgISRjb250YWluZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAkY29udGFpbmVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkXTpub3QoW2lkJD1cIl93cmFwcGVyXCJdKScpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0ICRwbGFjZWhvbGRlciA9ICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpO1xuICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIFxuICAgICAgICAkY29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgJHBsYWNlaG9sZGVyLmhpZGUoKTtcbiAgICAgICAgJGFkZEJ1dHRvbi5oaWRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYW5kIHNob3cgbG9hZGVyIGlmIG5vdCBleGlzdHNcbiAgICAgICAgbGV0ICRsb2FkZXIgPSAkKCcjdGFibGUtZGF0YS1sb2FkZXInKTtcbiAgICAgICAgaWYgKCEkbG9hZGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgc2VnbWVudCB3aXRoIGxvYWRlciBmb3IgYmV0dGVyIHZpc3VhbCBhcHBlYXJhbmNlXG4gICAgICAgICAgICAkbG9hZGVyID0gJChgXG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cInRhYmxlLWRhdGEtbG9hZGVyXCIgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJtaW4taGVpZ2h0OiAyMDBweDsgcG9zaXRpb246IHJlbGF0aXZlO1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aXZlIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHQgbG9hZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXhfTG9hZGluZ0RhdGEgfHwgJ0xvYWRpbmcuLi4nfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgLy8gSW5zZXJ0IGxvYWRlciBpbiB0aGUgYXBwcm9wcmlhdGUgcGxhY2VcbiAgICAgICAgICAgIGlmICgkY29udGFpbmVyLmxlbmd0aCAmJiAkY29udGFpbmVyLnBhcmVudCgpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRjb250YWluZXIuYmVmb3JlKCRsb2FkZXIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkcGxhY2Vob2xkZXIubGVuZ3RoICYmICRwbGFjZWhvbGRlci5wYXJlbnQoKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkcGxhY2Vob2xkZXIuYmVmb3JlKCRsb2FkZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjazogYXBwZW5kIHRvIGJvZHkgb3IgcGFyZW50IGNvbnRhaW5lclxuICAgICAgICAgICAgICAgIGNvbnN0ICRwYXJlbnQgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCcucHVzaGVyJykgfHwgdGhpcy4kdGFibGUucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgJHBhcmVudC5hcHBlbmQoJGxvYWRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJGxvYWRlci5zaG93KCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgbG9hZGVyXG4gICAgICovXG4gICAgaGlkZUxvYWRlcigpIHtcbiAgICAgICAgJCgnI3RhYmxlLWRhdGEtbG9hZGVyJykuaGlkZSgpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBUb2dnbGUgZW1wdHkgdGFibGUgcGxhY2Vob2xkZXIgdmlzaWJpbGl0eVxuICAgICAqL1xuICAgIHRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIoaXNFbXB0eSkge1xuICAgICAgICAvLyBGaW5kIHRoZSB0YWJsZSdzIHBhcmVudCBjb250YWluZXIgLSBuZWVkIHRoZSBvcmlnaW5hbCBjb250YWluZXIsIG5vdCB0aGUgRGF0YVRhYmxlcyB3cmFwcGVyXG4gICAgICAgIC8vIERhdGFUYWJsZXMgd3JhcHMgdGhlIHRhYmxlIGluIGEgZGl2IHdpdGggaWQgZW5kaW5nIGluICdfd3JhcHBlcidcbiAgICAgICAgLy8gV2UgbmVlZCB0byBmaW5kIHRoZSBwYXJlbnQgb2YgdGhhdCB3cmFwcGVyIHdoaWNoIGlzIHRoZSBvcmlnaW5hbCBjb250YWluZXJcbiAgICAgICAgY29uc3QgJHdyYXBwZXIgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCdkaXZbaWQkPVwiX3dyYXBwZXJcIl0nKTtcbiAgICAgICAgbGV0ICRjb250YWluZXI7XG4gICAgICAgIGlmICgkd3JhcHBlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgcGFyZW50IG9mIHRoZSB3cmFwcGVyIChzaG91bGQgYmUgdGhlIG9yaWdpbmFsIGNvbnRhaW5lcilcbiAgICAgICAgICAgICRjb250YWluZXIgPSAkd3JhcHBlci5wYXJlbnQoJ2RpdltpZF0nKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGYWxsYmFjayBpZiBzdHJ1Y3R1cmUgaXMgZGlmZmVyZW50XG4gICAgICAgIGlmICghJGNvbnRhaW5lciB8fCAhJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICRjb250YWluZXIgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCdkaXZbaWRdOm5vdChbaWQkPVwiX3dyYXBwZXJcIl0pJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgJGFkZEJ1dHRvbiA9ICQoJyNhZGQtbmV3LWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkcGxhY2Vob2xkZXIgPSAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0VtcHR5KSB7XG4gICAgICAgICAgICAkY29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgICRhZGRCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHBsYWNlaG9sZGVyIGlzIHZpc2libGVcbiAgICAgICAgICAgIGlmICgkcGxhY2Vob2xkZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJHBsYWNlaG9sZGVyLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICgkcGxhY2Vob2xkZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJHBsYWNlaG9sZGVyLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLnBlcm1pc3Npb25zLnNhdmUpIHtcbiAgICAgICAgICAgICAgICAkYWRkQnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRjb250YWluZXIuc2hvdygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZG91YmxlLWNsaWNrIGZvciBlZGl0aW5nXG4gICAgICogRXhjbHVkZXMgYWN0aW9uIGJ1dHRvbiBjZWxscyB0byBhdm9pZCBjb25mbGljdHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0KCkge1xuICAgICAgICB0aGlzLiR0YWJsZS5vbignZGJsY2xpY2snLCAndGJvZHkgdGQ6bm90KC5yaWdodC5hbGlnbmVkKScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5kYXRhVGFibGUucm93KGUuY3VycmVudFRhcmdldCkuZGF0YSgpO1xuICAgICAgICAgICAgLy8gR2V0IHRoZSByZWNvcmQgSUQgLSBjaGVjayBmb3IgYm90aCB1bmlxaWQgYW5kIGlkIGZpZWxkc1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBkYXRhICYmIChkYXRhLnVuaXFpZCB8fCBkYXRhLmlkKTtcbiAgICAgICAgICAgIGlmIChyZWNvcmRJZCAmJiAodGhpcy5wZXJtaXNzaW9ucy5tb2RpZnkgfHwgdGhpcy5wZXJtaXNzaW9ucy5lZGl0KSkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gZ2V0TW9kaWZ5VXJsIGlmIHByb3ZpZGVkLCBvdGhlcndpc2UgdXNlIGRlZmF1bHRcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RpZnlVcmwgPSB0aGlzLmdldE1vZGlmeVVybCA/IFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdldE1vZGlmeVVybChyZWNvcmRJZCkgOiBcbiAgICAgICAgICAgICAgICAgICAgYCR7Z2xvYmFsUm9vdFVybH0ke3RoaXMucm91dGVQcmVmaXh9L21vZGlmeS8ke3JlY29yZElkfWA7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gbW9kaWZ5VXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgdW5pZmllZCBkZXNjcmlwdGlvbiByZW5kZXJlciB3aXRoIHRydW5jYXRpb24gc3VwcG9ydFxuICAgICAqIFxuICAgICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmVuZGVyZXIgZnVuY3Rpb24gZm9yIERhdGFUYWJsZXNcbiAgICAgKi9cbiAgICBjcmVhdGVEZXNjcmlwdGlvblJlbmRlcmVyKCkge1xuICAgICAgICByZXR1cm4gKGRhdGEsIHR5cGUsIHJvdykgPT4ge1xuICAgICAgICAgICAgaWYgKCFkYXRhIHx8IGRhdGEudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIHJldHVybiAn4oCUJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdkaXNwbGF5Jykge1xuICAgICAgICAgICAgICAgIC8vIEVzY2FwZSBIVE1MIHRvIHByZXZlbnQgWFNTXG4gICAgICAgICAgICAgICAgY29uc3Qgc2FmZURlc2MgPSB3aW5kb3cuU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGEpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uTGluZXMgPSBzYWZlRGVzYy5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkgIT09ICcnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDYWxjdWxhdGUgbWF4IGxpbmVzXG4gICAgICAgICAgICAgICAgbGV0IG1heExpbmVzID0gdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLm1heExpbmVzO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MuZHluYW1pY0hlaWdodCAmJiB0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MuY2FsY3VsYXRlTGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4TGluZXMgPSB0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MuY2FsY3VsYXRlTGluZXMocm93KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGRlc2NyaXB0aW9uTGluZXMubGVuZ3RoIDw9IG1heExpbmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERlc2NyaXB0aW9uIGZpdHMgLSBzaG93IHdpdGggcHJlc2VydmVkIGZvcm1hdHRpbmdcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkRGVzYyA9IGRlc2NyaXB0aW9uTGluZXMuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvbi10ZXh0XCIgc3R5bGU9XCJsaW5lLWhlaWdodDogMS4zO1wiPiR7Zm9ybWF0dGVkRGVzY308L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERlc2NyaXB0aW9uIHRvbyBsb25nIC0gdHJ1bmNhdGUgd2l0aCBwb3B1cFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2aXNpYmxlTGluZXMgPSBkZXNjcmlwdGlvbkxpbmVzLnNsaWNlKDAsIG1heExpbmVzKTtcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZUxpbmVzW21heExpbmVzIC0gMV0gKz0gJy4uLic7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWREZXNjID0gdmlzaWJsZUxpbmVzLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbERlc2MgPSBkZXNjcmlwdGlvbkxpbmVzLmpvaW4oJ1xcbicpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb24tdGV4dCB0cnVuY2F0ZWQgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7ZnVsbERlc2N9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wb3NpdGlvbj1cInRvcCByaWdodFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFyaWF0aW9uPVwid2lkZVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IGhlbHA7IGJvcmRlci1ib3R0b206IDFweCBkb3R0ZWQgIzk5OTsgbGluZS1oZWlnaHQ6IDEuMztcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7dHJ1bmNhdGVkRGVzY31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZvciBzZWFyY2ggYW5kIG90aGVyIG9wZXJhdGlvbnMsIHJldHVybiBwbGFpbiB0ZXh0XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSB0aGUgRGF0YVRhYmxlIGFuZCBjbGVhbnVwXG4gICAgICovXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIHRoaXMuJHRhYmxlLm9mZignY2xpY2snLCAnYS5kZWxldGU6bm90KC50d28tc3RlcHMtZGVsZXRlKScpO1xuICAgICAgICB0aGlzLiR0YWJsZS5vZmYoJ2NsaWNrJywgJ2EuY29weScpO1xuICAgICAgICB0aGlzLiR0YWJsZS5vZmYoJ2RibGNsaWNrJywgJ3Rib2R5IHRkOm5vdCgucmlnaHQuYWxpZ25lZCknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgRGF0YVRhYmxlIGlmIGV4aXN0c1xuICAgICAgICBpZiAodGhpcy5kYXRhVGFibGUgJiYgdHlwZW9mIHRoaXMuZGF0YVRhYmxlLmRlc3Ryb3kgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRoaXMuZGF0YVRhYmxlLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRlclxuICAgICAgICAkKCcjdGFibGUtZGF0YS1sb2FkZXInKS5yZW1vdmUoKTtcbiAgICB9XG59XG5cbi8vIE1ha2UgYXZhaWxhYmxlIGdsb2JhbGx5XG53aW5kb3cuUGJ4RGF0YVRhYmxlSW5kZXggPSBQYnhEYXRhVGFibGVJbmRleDsiXX0=