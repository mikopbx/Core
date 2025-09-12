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
          _this3.customDeleteHandler(recordId, function (response) {
            return _this3.cbAfterDeleteRecord(response);
          });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1BieERhdGFUYWJsZUluZGV4LmpzIl0sIm5hbWVzIjpbIlBieERhdGFUYWJsZUluZGV4IiwiY29uZmlnIiwidGFibGVJZCIsImFwaU1vZHVsZSIsInJvdXRlUHJlZml4IiwidHJhbnNsYXRpb25zIiwiY29sdW1ucyIsInNob3dTdWNjZXNzTWVzc2FnZXMiLCJzaG93SW5mbyIsIm9yZGVyYWJsZSIsInVuZGVmaW5lZCIsIm9yZGVyIiwicGVybWlzc2lvbnMiLCJzYXZlIiwibW9kaWZ5IiwiZWRpdCIsImNvcHkiLCJjdXN0b20iLCJhY3Rpb25CdXR0b25zIiwiY3VzdG9tQWN0aW9uQnV0dG9ucyIsImRlc2NyaXB0aW9uU2V0dGluZ3MiLCJPYmplY3QiLCJhc3NpZ24iLCJtYXhMaW5lcyIsImR5bmFtaWNIZWlnaHQiLCJjYWxjdWxhdGVMaW5lcyIsIiR0YWJsZSIsIiQiLCJkYXRhVGFibGUiLCJvbkRhdGFMb2FkZWQiLCJvbkRyYXdDYWxsYmFjayIsIm9uUGVybWlzc2lvbnNMb2FkZWQiLCJjdXN0b21EZWxldGVIYW5kbGVyIiwib25BZnRlckRlbGV0ZSIsImdldE1vZGlmeVVybCIsImFqYXhEYXRhIiwic2hvd0xvYWRlciIsImxvYWRQZXJtaXNzaW9ucyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJlcnJvciIsImNvbnNvbGUiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X0Vycm9ySW5pdGlhbGl6aW5nVGFibGUiLCJoaWRlTG9hZGVyIiwidG9nZ2xlRW1wdHlQbGFjZWhvbGRlciIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJtZXRob2QiLCJkYXRhIiwiY29udHJvbGxlciIsImRhdGFUeXBlIiwic3VjY2VzcyIsIndhcm4iLCJhZGRDbGFzcyIsInByb2Nlc3NlZENvbHVtbnMiLCJwcm9jZXNzQ29sdW1ucyIsImVuZHBvaW50cyIsImdldExpc3QiLCJ0eXBlIiwiZGF0YVNyYyIsImpzb24iLCJoYW5kbGVEYXRhTG9hZCIsInhociIsInRocm93biIsImV4X0Vycm9yTG9hZGluZ0RhdGEiLCJvcmRlcmluZyIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInNlYXJjaGluZyIsImluZm8iLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZHJhd0NhbGxiYWNrIiwiaGFuZGxlRHJhd0NhbGxiYWNrIiwiRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIiLCJpbml0aWFsaXplQ29weUhhbmRsZXIiLCJpbml0aWFsaXplQ3VzdG9tSGFuZGxlcnMiLCJmb3JFYWNoIiwiY29sIiwiZmluZCIsImlzQWN0aW9uQ29sdW1uIiwicHVzaCIsImNyZWF0ZUFjdGlvbkNvbHVtbiIsInNlYXJjaGFibGUiLCJjbGFzc05hbWUiLCJyZW5kZXIiLCJyb3ciLCJidXR0b25zIiwicmVjb3JkSWQiLCJ1bmlxaWQiLCJpZCIsImluY2x1ZGVzIiwibW9kaWZ5VXJsIiwiYnRfVG9vbFRpcEVkaXQiLCJidF9Ub29sVGlwQ29weSIsImN1c3RvbUJ1dHRvbiIsIm5hbWUiLCJocmVmIiwiZGF0YVZhbHVlIiwiaW5jbHVkZUlkIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJ0b29sdGlwIiwiaWNvbiIsImJ0X1Rvb2xUaXBEZWxldGUiLCJsZW5ndGgiLCJqb2luIiwiaXNTdWNjZXNzIiwiaGFzT3duUHJvcGVydHkiLCJyZXN1bHQiLCJpdGVtcyIsIkFycmF5IiwiaXNBcnJheSIsImlzRW1wdHkiLCJub3JtYWxpemVkUmVzcG9uc2UiLCJwb3B1cCIsInJlcG9zaXRpb25BZGRCdXR0b24iLCJpbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0IiwiJGFkZEJ1dHRvbiIsIiR3cmFwcGVyIiwiJGxlZnRDb2x1bW4iLCJmaXJzdCIsImFwcGVuZCIsInNob3ciLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiYXR0ciIsImNiQWZ0ZXJEZWxldGVSZWNvcmQiLCJkZWxldGVSZWNvcmQiLCJjb3B5VXJsIiwiYmFzZVVybCIsInJlcGxhY2UiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsIm9uQ2xpY2siLCJyZWxvYWRDYWxsYmFjayIsInJlbG9hZCIsIkV4dGVuc2lvbnMiLCJjYk9uRGF0YUNoYW5nZWQiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImRlbGV0ZUVycm9yIiwiZXhfSW1wb3NzaWJsZVRvRGVsZXRlUmVjb3JkIiwicmVtb3ZlQ2xhc3MiLCJjbG9zZXN0IiwiJGNvbnRhaW5lciIsInBhcmVudCIsIiRwbGFjZWhvbGRlciIsImhpZGUiLCIkbG9hZGVyIiwiZXhfTG9hZGluZ0RhdGEiLCJiZWZvcmUiLCIkcGFyZW50IiwidHJpbSIsInNhZmVEZXNjIiwiZGVzY3JpcHRpb25MaW5lcyIsInNwbGl0IiwiZmlsdGVyIiwibGluZSIsImZvcm1hdHRlZERlc2MiLCJ2aXNpYmxlTGluZXMiLCJzbGljZSIsInRydW5jYXRlZERlc2MiLCJmdWxsRGVzYyIsIm9mZiIsImRlc3Ryb3kiLCJyZW1vdmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLGlCO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0ksNkJBQVlDLE1BQVosRUFBb0I7QUFBQTs7QUFDaEI7QUFDQSxTQUFLQyxPQUFMLEdBQWVELE1BQU0sQ0FBQ0MsT0FB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RUEsK0hBQzJCNEQsUUFEM0IsMFFBS01ELGFBTE47QUFPSDtBQUNKLFNBcEN1QixDQXNDeEI7OztBQUNBLGVBQU92SCxJQUFQO0FBQ0gsT0F4Q0Q7QUF5Q0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSxtQkFBVTtBQUNOO0FBQ0EsV0FBSzFCLE1BQUwsQ0FBWW1KLEdBQVosQ0FBZ0IsT0FBaEIsRUFBeUIsaUNBQXpCO0FBQ0EsV0FBS25KLE1BQUwsQ0FBWW1KLEdBQVosQ0FBZ0IsT0FBaEIsRUFBeUIsUUFBekI7QUFDQSxXQUFLbkosTUFBTCxDQUFZbUosR0FBWixDQUFnQixVQUFoQixFQUE0Qiw4QkFBNUIsRUFKTSxDQU1OOztBQUNBLFVBQUksS0FBS2pKLFNBQUwsSUFBa0IsT0FBTyxLQUFLQSxTQUFMLENBQWVrSixPQUF0QixLQUFrQyxVQUF4RCxFQUFvRTtBQUNoRSxhQUFLbEosU0FBTCxDQUFla0osT0FBZjtBQUNILE9BVEssQ0FXTjs7O0FBQ0FuSixNQUFBQSxDQUFDLENBQUMsb0JBQUQsQ0FBRCxDQUF3Qm9KLE1BQXhCO0FBQ0g7Ozs7S0FHTDs7O0FBQ0FsQyxNQUFNLENBQUM3SSxpQkFBUCxHQUEyQkEsaUJBQTNCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNlbWFudGljTG9jYWxpemF0aW9uLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBFeHRlbnNpb25zLCBTZWN1cml0eVV0aWxzICovXG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgTWlrb1BCWCBpbmRleCB0YWJsZSBtYW5hZ2VtZW50IHdpdGggQUNMIHN1cHBvcnRcbiAqIFxuICogUHJvdmlkZXMgY29tbW9uIGZ1bmN0aW9uYWxpdHkgZm9yIERhdGFUYWJsZS1iYXNlZCBpbmRleCBwYWdlcyBpbmNsdWRpbmc6XG4gKiAtIFNlcnZlci1zaWRlIEFDTCBwZXJtaXNzaW9uIGNoZWNraW5nXG4gKiAtIER5bmFtaWMgYWN0aW9uIGJ1dHRvbiByZW5kZXJpbmcgYmFzZWQgb24gcGVybWlzc2lvbnNcbiAqIC0gVW5pZmllZCBkZXNjcmlwdGlvbiB0cnVuY2F0aW9uIHdpdGggcG9wdXAgc3VwcG9ydFxuICogLSBDb3B5IGZ1bmN0aW9uYWxpdHkgc3VwcG9ydFxuICogLSBDdXN0b20gYWN0aW9uIGJ1dHRvbnNcbiAqIC0gVHdvLXN0ZXAgZGVsZXRlIGNvbmZpcm1hdGlvblxuICogLSBEb3VibGUtY2xpY2sgZWRpdGluZ1xuICogXG4gKiBAY2xhc3MgUGJ4RGF0YVRhYmxlSW5kZXhcbiAqL1xuY2xhc3MgUGJ4RGF0YVRhYmxlSW5kZXgge1xuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyBQYnhEYXRhVGFibGVJbmRleCBpbnN0YW5jZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcudGFibGVJZCAtIEhUTUwgdGFibGUgZWxlbWVudCBJRFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcuYXBpTW9kdWxlIC0gQVBJIG1vZHVsZSBmb3IgZGF0YSBvcGVyYXRpb25zXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy5yb3V0ZVByZWZpeCAtIFVSTCByb3V0ZSBwcmVmaXggKGUuZy4sICdjYWxsLXF1ZXVlcycpXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZy50cmFuc2xhdGlvbnMgLSBUcmFuc2xhdGlvbiBrZXlzIGZvciBtZXNzYWdlc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvbmZpZy5jb2x1bW5zIC0gRGF0YVRhYmxlIGNvbHVtbiBkZWZpbml0aW9uc1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5zaG93U3VjY2Vzc01lc3NhZ2VzPWZhbHNlXSAtIFNob3cgc3VjY2VzcyBtZXNzYWdlcyBvbiBkZWxldGVcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2hvd0luZm89ZmFsc2VdIC0gU2hvdyBEYXRhVGFibGUgaW5mb1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtjb25maWcuYWN0aW9uQnV0dG9ucz1bJ2VkaXQnLCAnZGVsZXRlJ11dIC0gU3RhbmRhcmQgYWN0aW9uIGJ1dHRvbnMgdG8gc2hvd1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtjb25maWcuY3VzdG9tQWN0aW9uQnV0dG9ucz1bXV0gLSBDdXN0b20gYWN0aW9uIGJ1dHRvbiBkZWZpbml0aW9uc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnLmRlc2NyaXB0aW9uU2V0dGluZ3NdIC0gRGVzY3JpcHRpb24gdHJ1bmNhdGlvbiBzZXR0aW5nc1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25EYXRhTG9hZGVkXSAtIENhbGxiYWNrIGFmdGVyIGRhdGEgbG9hZGVkXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5vbkRyYXdDYWxsYmFja10gLSBDYWxsYmFjayBhZnRlciB0YWJsZSBkcmF3XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5vblBlcm1pc3Npb25zTG9hZGVkXSAtIENhbGxiYWNrIGFmdGVyIHBlcm1pc3Npb25zIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcuY3VzdG9tRGVsZXRlSGFuZGxlcl0gLSBDdXN0b20gZGVsZXRlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLm9uQWZ0ZXJEZWxldGVdIC0gQ2FsbGJhY2sgYWZ0ZXIgc3VjY2Vzc2Z1bCBkZWxldGlvblxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcuZ2V0TW9kaWZ5VXJsXSAtIEN1c3RvbSBVUkwgZ2VuZXJhdG9yIGZvciBtb2RpZnkvZWRpdCBhY3Rpb25zXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLm9yZGVyYWJsZT10cnVlXSAtIEVuYWJsZS9kaXNhYmxlIHNvcnRpbmcgZm9yIGFsbCBjb2x1bW5zXG4gICAgICogQHBhcmFtIHtBcnJheX0gW2NvbmZpZy5vcmRlcj1bWzAsICdhc2MnXV1dIC0gRGVmYXVsdCBzb3J0IG9yZGVyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtjb25maWcuYWpheERhdGFdIC0gQWRkaXRpb25hbCBkYXRhIHBhcmFtZXRlcnMgZm9yIEFKQVggcmVxdWVzdHNcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICAgICAgLy8gQ29yZSBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMudGFibGVJZCA9IGNvbmZpZy50YWJsZUlkO1xuICAgICAgICB0aGlzLmFwaU1vZHVsZSA9IGNvbmZpZy5hcGlNb2R1bGU7XG4gICAgICAgIHRoaXMucm91dGVQcmVmaXggPSBjb25maWcucm91dGVQcmVmaXg7XG4gICAgICAgIHRoaXMudHJhbnNsYXRpb25zID0gY29uZmlnLnRyYW5zbGF0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpcy5jb2x1bW5zID0gY29uZmlnLmNvbHVtbnMgfHwgW107XG4gICAgICAgIHRoaXMuc2hvd1N1Y2Nlc3NNZXNzYWdlcyA9IGNvbmZpZy5zaG93U3VjY2Vzc01lc3NhZ2VzIHx8IGZhbHNlO1xuICAgICAgICB0aGlzLnNob3dJbmZvID0gY29uZmlnLnNob3dJbmZvIHx8IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU29ydGluZyBjb25maWd1cmF0aW9uIChiYWNrd2FyZCBjb21wYXRpYmxlKVxuICAgICAgICB0aGlzLm9yZGVyYWJsZSA9IGNvbmZpZy5vcmRlcmFibGUgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5vcmRlcmFibGUgOiB0cnVlO1xuICAgICAgICB0aGlzLm9yZGVyID0gY29uZmlnLm9yZGVyIHx8IFtbMCwgJ2FzYyddXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBlcm1pc3Npb24gc3RhdGUgKGxvYWRlZCBmcm9tIHNlcnZlcilcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IHtcbiAgICAgICAgICAgIHNhdmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9kaWZ5OiBmYWxzZSxcbiAgICAgICAgICAgIGVkaXQ6IGZhbHNlLFxuICAgICAgICAgICAgZGVsZXRlOiBmYWxzZSxcbiAgICAgICAgICAgIGNvcHk6IGZhbHNlLFxuICAgICAgICAgICAgY3VzdG9tOiB7fVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWN0aW9uIGJ1dHRvbnMgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmFjdGlvbkJ1dHRvbnMgPSBjb25maWcuYWN0aW9uQnV0dG9ucyB8fCBbJ2VkaXQnLCAnZGVsZXRlJ107XG4gICAgICAgIHRoaXMuY3VzdG9tQWN0aW9uQnV0dG9ucyA9IGNvbmZpZy5jdXN0b21BY3Rpb25CdXR0b25zIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzY3JpcHRpb24gdHJ1bmNhdGlvbiBzZXR0aW5nc1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIG1heExpbmVzOiAzLFxuICAgICAgICAgICAgZHluYW1pY0hlaWdodDogZmFsc2UsXG4gICAgICAgICAgICBjYWxjdWxhdGVMaW5lczogbnVsbFxuICAgICAgICB9LCBjb25maWcuZGVzY3JpcHRpb25TZXR0aW5ncyB8fCB7fSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnRlcm5hbCBwcm9wZXJ0aWVzXG4gICAgICAgIHRoaXMuJHRhYmxlID0gJChgIyR7dGhpcy50YWJsZUlkfWApO1xuICAgICAgICB0aGlzLmRhdGFUYWJsZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gT3B0aW9uYWwgY2FsbGJhY2tzXG4gICAgICAgIHRoaXMub25EYXRhTG9hZGVkID0gY29uZmlnLm9uRGF0YUxvYWRlZDtcbiAgICAgICAgdGhpcy5vbkRyYXdDYWxsYmFjayA9IGNvbmZpZy5vbkRyYXdDYWxsYmFjaztcbiAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkID0gY29uZmlnLm9uUGVybWlzc2lvbnNMb2FkZWQ7XG4gICAgICAgIHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlciA9IGNvbmZpZy5jdXN0b21EZWxldGVIYW5kbGVyO1xuICAgICAgICB0aGlzLm9uQWZ0ZXJEZWxldGUgPSBjb25maWcub25BZnRlckRlbGV0ZTtcbiAgICAgICAgdGhpcy5nZXRNb2RpZnlVcmwgPSBjb25maWcuZ2V0TW9kaWZ5VXJsO1xuICAgICAgICB0aGlzLmFqYXhEYXRhID0gY29uZmlnLmFqYXhEYXRhIHx8IHt9O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGUgd2l0aCBwZXJtaXNzaW9uIGxvYWRpbmdcbiAgICAgKi9cbiAgICBhc3luYyBpbml0aWFsaXplKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gU2hvdyBsb2FkZXIgd2hpbGUgaW5pdGlhbGl6aW5nXG4gICAgICAgICAgICB0aGlzLnNob3dMb2FkZXIoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmlyc3QsIGxvYWQgcGVybWlzc2lvbnMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubG9hZFBlcm1pc3Npb25zKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgRGF0YVRhYmxlICh3aWxsIGhhbmRsZSBsb2FkZXIvZW1wdHkgc3RhdGUgaW4gZGF0YSBjYWxsYmFjaylcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGluaXRpYWxpemUgUGJ4RGF0YVRhYmxlSW5kZXg6JywgZXJyb3IpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5leF9FcnJvckluaXRpYWxpemluZ1RhYmxlIHx8ICdGYWlsZWQgdG8gaW5pdGlhbGl6ZSB0YWJsZScpO1xuICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGVyKCk7XG4gICAgICAgICAgICB0aGlzLnRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIodHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBwZXJtaXNzaW9ucyBmcm9tIHNlcnZlclxuICAgICAqL1xuICAgIGFzeW5jIGxvYWRQZXJtaXNzaW9ucygpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgJC5hamF4KHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9YWNsL2NoZWNrUGVybWlzc2lvbnNgLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiB0aGlzLnJvdXRlUHJlZml4XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5wZXJtaXNzaW9ucywgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub25QZXJtaXNzaW9uc0xvYWRlZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uUGVybWlzc2lvbnNMb2FkZWQodGhpcy5wZXJtaXNzaW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gbG9hZCBwZXJtaXNzaW9ucywgdXNpbmcgZGVmYXVsdHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gT24gZXJyb3IsIGRlZmF1bHQgdG8gbm8gcGVybWlzc2lvbnMgZm9yIHNhZmV0eVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRGF0YVRhYmxlIHdpdGggY29tbW9uIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuICAgICAgICAvLyBBZGQgdGhlIGRhdGF0YWJsZS13aWR0aC1jb25zdHJhaW5lZCBjbGFzcyB0byB0aGUgdGFibGVcbiAgICAgICAgdGhpcy4kdGFibGUuYWRkQ2xhc3MoJ2RhdGF0YWJsZS13aWR0aC1jb25zdHJhaW5lZCcpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJvY2Vzc2VkQ29sdW1ucyA9IHRoaXMucHJvY2Vzc0NvbHVtbnMoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgICAgICAgIGFqYXg6IHtcbiAgICAgICAgICAgICAgICB1cmw6IHRoaXMuYXBpTW9kdWxlLmVuZHBvaW50cy5nZXRMaXN0LFxuICAgICAgICAgICAgICAgIHR5cGU6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHRoaXMuYWpheERhdGEsXG4gICAgICAgICAgICAgICAgZGF0YVNyYzogKGpzb24pID0+IHRoaXMuaGFuZGxlRGF0YUxvYWQoanNvbiksXG4gICAgICAgICAgICAgICAgZXJyb3I6ICh4aHIsIGVycm9yLCB0aHJvd24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlRW1wdHlQbGFjZWhvbGRlcih0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5leF9FcnJvckxvYWRpbmdEYXRhIHx8ICdGYWlsZWQgdG8gbG9hZCBkYXRhJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbHVtbnM6IHByb2Nlc3NlZENvbHVtbnMsXG4gICAgICAgICAgICBvcmRlcjogdGhpcy5vcmRlcixcbiAgICAgICAgICAgIG9yZGVyaW5nOiB0aGlzLm9yZGVyYWJsZSxcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoaW5nOiB0cnVlLFxuICAgICAgICAgICAgaW5mbzogdGhpcy5zaG93SW5mbyxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2s6ICgpID0+IHRoaXMuaGFuZGxlRHJhd0NhbGxiYWNrKClcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuZGF0YVRhYmxlID0gdGhpcy4kdGFibGUuRGF0YVRhYmxlKGNvbmZpZyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIoKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQ29weUhhbmRsZXIoKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQ3VzdG9tSGFuZGxlcnMoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBjb2x1bW4gZGVmaW5pdGlvbnMgYW5kIGFkZCBhY3Rpb24gY29sdW1uIGlmIG5lZWRlZFxuICAgICAqL1xuICAgIHByb2Nlc3NDb2x1bW5zKCkge1xuICAgICAgICBjb25zdCBjb2x1bW5zID0gWy4uLnRoaXMuY29sdW1uc107XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBzb3J0aW5nIGlzIGdsb2JhbGx5IGRpc2FibGVkLCBlbnN1cmUgYWxsIGNvbHVtbnMgcmVzcGVjdCBpdFxuICAgICAgICBpZiAoIXRoaXMub3JkZXJhYmxlKSB7XG4gICAgICAgICAgICBjb2x1bW5zLmZvckVhY2goY29sID0+IHtcbiAgICAgICAgICAgICAgICAvLyBQcmVzZXJ2ZSBleHBsaWNpdCBvcmRlcmFibGU6IGZhbHNlLCBidXQgb3ZlcnJpZGUgdHJ1ZSBvciB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICBpZiAoY29sLm9yZGVyYWJsZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29sLm9yZGVyYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgc3RhbmRhcmQgYWN0aW9uIGNvbHVtbiBpZiBub3QgYWxyZWFkeSBwcmVzZW50XG4gICAgICAgIGlmICghY29sdW1ucy5maW5kKGNvbCA9PiBjb2wuaXNBY3Rpb25Db2x1bW4pKSB7XG4gICAgICAgICAgICBjb2x1bW5zLnB1c2godGhpcy5jcmVhdGVBY3Rpb25Db2x1bW4oKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjb2x1bW5zO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgc3RhbmRhcmQgYWN0aW9uIGNvbHVtbiB3aXRoIHBlcm1pc3Npb24tYmFzZWQgcmVuZGVyaW5nXG4gICAgICovXG4gICAgY3JlYXRlQWN0aW9uQ29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIGNsYXNzTmFtZTogJ3JpZ2h0IGFsaWduZWQgY29sbGFwc2luZycsXG4gICAgICAgICAgICBpc0FjdGlvbkNvbHVtbjogdHJ1ZSxcbiAgICAgICAgICAgIHJlbmRlcjogKGRhdGEsIHR5cGUsIHJvdykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1dHRvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIHJlY29yZCBJRCAtIGNoZWNrIGZvciBib3RoIHVuaXFpZCBhbmQgaWQgZmllbGRzXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSByb3cudW5pcWlkIHx8IHJvdy5pZCB8fCAnJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFZGl0IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdGlvbkJ1dHRvbnMuaW5jbHVkZXMoJ2VkaXQnKSAmJiBcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMucGVybWlzc2lvbnMubW9kaWZ5IHx8IHRoaXMucGVybWlzc2lvbnMuZWRpdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gZ2V0TW9kaWZ5VXJsIGlmIHByb3ZpZGVkLCBvdGhlcndpc2UgdXNlIGRlZmF1bHRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kaWZ5VXJsID0gdGhpcy5nZXRNb2RpZnlVcmwgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0TW9kaWZ5VXJsKHJlY29yZElkKSA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgYCR7Z2xvYmFsUm9vdFVybH0ke3RoaXMucm91dGVQcmVmaXh9L21vZGlmeS8ke3JlY29yZElkfWA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7bW9kaWZ5VXJsfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZWRpdCBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZWRpdCBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ29weSBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdjb3B5JykgJiYgdGhpcy5wZXJtaXNzaW9ucy5jb3B5KSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGNvcHkgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHl9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGNvcHkgb3V0bGluZSBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3VzdG9tIGJ1dHRvbnNcbiAgICAgICAgICAgICAgICB0aGlzLmN1c3RvbUFjdGlvbkJ1dHRvbnMuZm9yRWFjaChjdXN0b21CdXR0b24gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wZXJtaXNzaW9ucy5jdXN0b20gJiYgdGhpcy5wZXJtaXNzaW9ucy5jdXN0b21bY3VzdG9tQnV0dG9uLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBocmVmID0gY3VzdG9tQnV0dG9uLmhyZWYgfHwgJyMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YVZhbHVlID0gY3VzdG9tQnV0dG9uLmluY2x1ZGVJZCA/IGBkYXRhLXZhbHVlPVwiJHtyZWNvcmRJZH1cImAgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7aHJlZn1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2RhdGFWYWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiAke2N1c3RvbUJ1dHRvbi5jbGFzc30gcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGN1c3RvbUJ1dHRvbi50b29sdGlwKX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2N1c3RvbUJ1dHRvbi5pY29ufVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIERlbGV0ZSBidXR0b24gKGFsd2F5cyBsYXN0KVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdGlvbkJ1dHRvbnMuaW5jbHVkZXMoJ2RlbGV0ZScpICYmIHRoaXMucGVybWlzc2lvbnMuZGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gYnV0dG9ucy5sZW5ndGggPiAwID8gXG4gICAgICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj4ke2J1dHRvbnMuam9pbignJyl9PC9kaXY+YCA6IFxuICAgICAgICAgICAgICAgICAgICAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRhdGEgbG9hZCBhbmQgZW1wdHkgc3RhdGUgbWFuYWdlbWVudFxuICAgICAqIFN1cHBvcnRzIG11bHRpcGxlIEFQSSBmb3JtYXRzOlxuICAgICAqIC0gdjIgQVBJOiB7cmVzdWx0OiB0cnVlLCBkYXRhOiBbLi4uXX1cbiAgICAgKiAtIHYzIEFQSToge2RhdGE6IHtpdGVtczogWy4uLl19fVxuICAgICAqIC0gSHlicmlkOiB7cmVzdWx0OiB0cnVlLCBkYXRhOiB7aXRlbXM6IFsuLi5dfX1cbiAgICAgKi9cbiAgICBoYW5kbGVEYXRhTG9hZChqc29uKSB7XG4gICAgICAgIC8vIEhpZGUgbG9hZGVyIGZpcnN0XG4gICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICBcbiAgICAgICAgbGV0IGRhdGEgPSBbXTtcbiAgICAgICAgbGV0IGlzU3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gRmlyc3QgY2hlY2sgaWYgd2UgaGF2ZSBhIHJlc3VsdCBmaWVsZCB0byBkZXRlcm1pbmUgc3VjY2Vzc1xuICAgICAgICBpZiAoanNvbi5oYXNPd25Qcm9wZXJ0eSgncmVzdWx0JykpIHtcbiAgICAgICAgICAgIGlzU3VjY2VzcyA9IGpzb24ucmVzdWx0ID09PSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOb3cgZXh0cmFjdCBkYXRhIGJhc2VkIG9uIHN0cnVjdHVyZVxuICAgICAgICBpZiAoanNvbi5kYXRhKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBkYXRhIGhhcyBpdGVtcyBwcm9wZXJ0eSAodjMgb3IgaHlicmlkIGZvcm1hdClcbiAgICAgICAgICAgIGlmIChqc29uLmRhdGEuaXRlbXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBqc29uLmRhdGEuaXRlbXMgfHwgW107XG4gICAgICAgICAgICAgICAgLy8gSWYgbm8gcmVzdWx0IGZpZWxkIHdhcyBwcmVzZW50LCBhc3N1bWUgc3VjY2VzcyBpZiB3ZSBoYXZlIGRhdGEuaXRlbXNcbiAgICAgICAgICAgICAgICBpZiAoIWpzb24uaGFzT3duUHJvcGVydHkoJ3Jlc3VsdCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzU3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgZGF0YSBpcyBkaXJlY3RseSBhbiBhcnJheSAodjIgZm9ybWF0KVxuICAgICAgICAgICAgZWxzZSBpZiAoQXJyYXkuaXNBcnJheShqc29uLmRhdGEpKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGpzb24uZGF0YTtcbiAgICAgICAgICAgICAgICAvLyBJZiBubyByZXN1bHQgZmllbGQgd2FzIHByZXNlbnQsIGFzc3VtZSBzdWNjZXNzXG4gICAgICAgICAgICAgICAgaWYgKCFqc29uLmhhc093blByb3BlcnR5KCdyZXN1bHQnKSkge1xuICAgICAgICAgICAgICAgICAgICBpc1N1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgaXNFbXB0eSA9ICFpc1N1Y2Nlc3MgfHwgZGF0YS5sZW5ndGggPT09IDA7XG4gICAgICAgIHRoaXMudG9nZ2xlRW1wdHlQbGFjZWhvbGRlcihpc0VtcHR5KTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm9uRGF0YUxvYWRlZCkge1xuICAgICAgICAgICAgLy8gUGFzcyBub3JtYWxpemVkIHJlc3BvbnNlIHRvIGNhbGxiYWNrXG4gICAgICAgICAgICBjb25zdCBub3JtYWxpemVkUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBpc1N1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMub25EYXRhTG9hZGVkKG5vcm1hbGl6ZWRSZXNwb25zZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZHJhdyBjYWxsYmFjayBmb3IgcG9zdC1yZW5kZXIgb3BlcmF0aW9uc1xuICAgICAqL1xuICAgIGhhbmRsZURyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBwb3B1cHNcbiAgICAgICAgdGhpcy4kdGFibGUuZmluZCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTW92ZSBBZGQgTmV3IGJ1dHRvbiB0byBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgdGhpcy5yZXBvc2l0aW9uQWRkQnV0dG9uKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRvdWJsZS1jbGljayBlZGl0aW5nXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3VzdG9tIGRyYXcgY2FsbGJhY2tcbiAgICAgICAgaWYgKHRoaXMub25EcmF3Q2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRoaXMub25EcmF3Q2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXBvc2l0aW9uIEFkZCBOZXcgYnV0dG9uIHRvIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAqL1xuICAgIHJlcG9zaXRpb25BZGRCdXR0b24oKSB7XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHdyYXBwZXIgPSAkKGAjJHt0aGlzLnRhYmxlSWR9X3dyYXBwZXJgKTtcbiAgICAgICAgY29uc3QgJGxlZnRDb2x1bW4gPSAkd3JhcHBlci5maW5kKCcuZWlnaHQud2lkZS5jb2x1bW4nKS5maXJzdCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRhZGRCdXR0b24ubGVuZ3RoICYmICRsZWZ0Q29sdW1uLmxlbmd0aCAmJiB0aGlzLnBlcm1pc3Npb25zLnNhdmUpIHtcbiAgICAgICAgICAgICRsZWZ0Q29sdW1uLmFwcGVuZCgkYWRkQnV0dG9uKTtcbiAgICAgICAgICAgICRhZGRCdXR0b24uc2hvdygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVsZXRlIGhhbmRsZXIgd2l0aCB0d28tc3RlcCBjb25maXJtYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVsZXRlSGFuZGxlcigpIHtcbiAgICAgICAgLy8gRGVsZXRlU29tZXRoaW5nLmpzIGhhbmRsZXMgZmlyc3QgY2xpY2tcbiAgICAgICAgLy8gV2UgaGFuZGxlIHNlY29uZCBjbGljayB3aGVuIHR3by1zdGVwcy1kZWxldGUgY2xhc3MgaXMgcmVtb3ZlZFxuICAgICAgICB0aGlzLiR0YWJsZS5vbignY2xpY2snLCAnYS5kZWxldGU6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlcihyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB0aGlzLmNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGlNb2R1bGUuZGVsZXRlUmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHRoaXMuY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjb3B5IGhhbmRsZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ29weUhhbmRsZXIoKSB7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9uKCdjbGljaycsICdhLmNvcHknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2Ugc2FtZSBsb2dpYyBhcyBtb2RpZnkgVVJMIGJ1dCBhZGQgY29weSBwYXJhbWV0ZXJcbiAgICAgICAgICAgIGxldCBjb3B5VXJsO1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0TW9kaWZ5VXJsKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBnZXRNb2RpZnlVcmwgYW5kIGFkZCBjb3B5IHBhcmFtZXRlclxuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsKHJlY29yZElkKTtcbiAgICAgICAgICAgICAgICBpZiAobW9kaWZ5VXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSByZWNvcmRJZCBmcm9tIFVSTCBhbmQgYWRkIGNvcHkgcGFyYW1ldGVyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VVcmwgPSBtb2RpZnlVcmwucmVwbGFjZShgLyR7cmVjb3JkSWR9YCwgJycpO1xuICAgICAgICAgICAgICAgICAgICBjb3B5VXJsID0gYCR7YmFzZVVybH0vP2NvcHk9JHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRGVmYXVsdCBVUkwgcGF0dGVyblxuICAgICAgICAgICAgICAgIGNvcHlVcmwgPSBgJHtnbG9iYWxSb290VXJsfSR7dGhpcy5yb3V0ZVByZWZpeH0vbW9kaWZ5Lz9jb3B5PSR7cmVjb3JkSWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gY29weSBVUkxcbiAgICAgICAgICAgIGlmIChjb3B5VXJsKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gY29weVVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY3VzdG9tIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDdXN0b21IYW5kbGVycygpIHtcbiAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zLmZvckVhY2goY3VzdG9tQnV0dG9uID0+IHtcbiAgICAgICAgICAgIGlmIChjdXN0b21CdXR0b24ub25DbGljaykge1xuICAgICAgICAgICAgICAgIHRoaXMuJHRhYmxlLm9uKCdjbGljaycsIGBhLiR7Y3VzdG9tQnV0dG9uLmNsYXNzfWAsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21CdXR0b24ub25DbGljayhyZWNvcmRJZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciByZWNvcmQgZGVsZXRpb25cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFJlbG9hZCB0YWJsZSBkYXRhIHdpdGggY2FsbGJhY2sgc3VwcG9ydFxuICAgICAgICAgICAgY29uc3QgcmVsb2FkQ2FsbGJhY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2FsbCBjdXN0b20gYWZ0ZXItZGVsZXRlIGNhbGxiYWNrIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLm9uQWZ0ZXJEZWxldGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkFmdGVyRGVsZXRlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWxvYWQgdGFibGUgYW5kIGV4ZWN1dGUgY2FsbGJhY2tcbiAgICAgICAgICAgIHRoaXMuZGF0YVRhYmxlLmFqYXgucmVsb2FkKHJlbG9hZENhbGxiYWNrLCBmYWxzZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZWxhdGVkIGNvbXBvbmVudHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9ucyAhPT0gJ3VuZGVmaW5lZCcgJiYgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdWNjZXNzIG1lc3NhZ2UgcmVtb3ZlZCAtIG5vIG5lZWQgdG8gc2hvdyBzdWNjZXNzIGZvciBkZWxldGlvbiBvcGVyYXRpb25zXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmFuc2xhdGlvbnMuZGVsZXRlRXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvc3NpYmxlVG9EZWxldGVSZWNvcmQ7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGUgZnJvbSBhbGwgZGVsZXRlIGJ1dHRvbnNcbiAgICAgICAgdGhpcy4kdGFibGUuZmluZCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRlciB3aGlsZSBsb2FkaW5nIGRhdGFcbiAgICAgKi9cbiAgICBzaG93TG9hZGVyKCkge1xuICAgICAgICAvLyBIaWRlIGV2ZXJ5dGhpbmcgZmlyc3RcbiAgICAgICAgLy8gRmluZCB0aGUgdGFibGUncyBwYXJlbnQgY29udGFpbmVyIC0gbmVlZCB0aGUgb3JpZ2luYWwgY29udGFpbmVyLCBub3QgdGhlIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAgICBjb25zdCAkd3JhcHBlciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZCQ9XCJfd3JhcHBlclwiXScpO1xuICAgICAgICBsZXQgJGNvbnRhaW5lcjtcbiAgICAgICAgaWYgKCR3cmFwcGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBwYXJlbnQgb2YgdGhlIHdyYXBwZXIgKHNob3VsZCBiZSB0aGUgb3JpZ2luYWwgY29udGFpbmVyKVxuICAgICAgICAgICAgJGNvbnRhaW5lciA9ICR3cmFwcGVyLnBhcmVudCgnZGl2W2lkXScpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZhbGxiYWNrIGlmIHN0cnVjdHVyZSBpcyBkaWZmZXJlbnRcbiAgICAgICAgaWYgKCEkY29udGFpbmVyIHx8ICEkY29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgJGNvbnRhaW5lciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZF06bm90KFtpZCQ9XCJfd3JhcHBlclwiXSknKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCAkcGxhY2Vob2xkZXIgPSAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKTtcbiAgICAgICAgY29uc3QgJGFkZEJ1dHRvbiA9ICQoJyNhZGQtbmV3LWJ1dHRvbicpO1xuICAgICAgICBcbiAgICAgICAgJGNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICRwbGFjZWhvbGRlci5oaWRlKCk7XG4gICAgICAgICRhZGRCdXR0b24uaGlkZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGFuZCBzaG93IGxvYWRlciBpZiBub3QgZXhpc3RzXG4gICAgICAgIGxldCAkbG9hZGVyID0gJCgnI3RhYmxlLWRhdGEtbG9hZGVyJyk7XG4gICAgICAgIGlmICghJGxvYWRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHNlZ21lbnQgd2l0aCBsb2FkZXIgZm9yIGJldHRlciB2aXN1YWwgYXBwZWFyYW5jZVxuICAgICAgICAgICAgJGxvYWRlciA9ICQoYFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJ0YWJsZS1kYXRhLWxvYWRlclwiIGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwibWluLWhlaWdodDogMjAwcHg7IHBvc2l0aW9uOiByZWxhdGl2ZTtcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmdEYXRhIHx8ICdMb2FkaW5nLi4uJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIC8vIEluc2VydCBsb2FkZXIgaW4gdGhlIGFwcHJvcHJpYXRlIHBsYWNlXG4gICAgICAgICAgICBpZiAoJGNvbnRhaW5lci5sZW5ndGggJiYgJGNvbnRhaW5lci5wYXJlbnQoKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmJlZm9yZSgkbG9hZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJHBsYWNlaG9sZGVyLmxlbmd0aCAmJiAkcGxhY2Vob2xkZXIucGFyZW50KCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJHBsYWNlaG9sZGVyLmJlZm9yZSgkbG9hZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2s6IGFwcGVuZCB0byBib2R5IG9yIHBhcmVudCBjb250YWluZXJcbiAgICAgICAgICAgICAgICBjb25zdCAkcGFyZW50ID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnLnB1c2hlcicpIHx8IHRoaXMuJHRhYmxlLnBhcmVudCgpO1xuICAgICAgICAgICAgICAgICRwYXJlbnQuYXBwZW5kKCRsb2FkZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRsb2FkZXIuc2hvdygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIGxvYWRlclxuICAgICAqL1xuICAgIGhpZGVMb2FkZXIoKSB7XG4gICAgICAgICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpLmhpZGUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGVtcHR5IHRhYmxlIHBsYWNlaG9sZGVyIHZpc2liaWxpdHlcbiAgICAgKi9cbiAgICB0b2dnbGVFbXB0eVBsYWNlaG9sZGVyKGlzRW1wdHkpIHtcbiAgICAgICAgLy8gRmluZCB0aGUgdGFibGUncyBwYXJlbnQgY29udGFpbmVyIC0gbmVlZCB0aGUgb3JpZ2luYWwgY29udGFpbmVyLCBub3QgdGhlIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAgICAvLyBEYXRhVGFibGVzIHdyYXBzIHRoZSB0YWJsZSBpbiBhIGRpdiB3aXRoIGlkIGVuZGluZyBpbiAnX3dyYXBwZXInXG4gICAgICAgIC8vIFdlIG5lZWQgdG8gZmluZCB0aGUgcGFyZW50IG9mIHRoYXQgd3JhcHBlciB3aGljaCBpcyB0aGUgb3JpZ2luYWwgY29udGFpbmVyXG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkJD1cIl93cmFwcGVyXCJdJyk7XG4gICAgICAgIGxldCAkY29udGFpbmVyO1xuICAgICAgICBpZiAoJHdyYXBwZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHBhcmVudCBvZiB0aGUgd3JhcHBlciAoc2hvdWxkIGJlIHRoZSBvcmlnaW5hbCBjb250YWluZXIpXG4gICAgICAgICAgICAkY29udGFpbmVyID0gJHdyYXBwZXIucGFyZW50KCdkaXZbaWRdJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmFsbGJhY2sgaWYgc3RydWN0dXJlIGlzIGRpZmZlcmVudFxuICAgICAgICBpZiAoISRjb250YWluZXIgfHwgISRjb250YWluZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAkY29udGFpbmVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkXTpub3QoW2lkJD1cIl93cmFwcGVyXCJdKScpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHBsYWNlaG9sZGVyID0gJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNFbXB0eSkge1xuICAgICAgICAgICAgJGNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICAkYWRkQnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSBwbGFjZWhvbGRlciBpcyB2aXNpYmxlXG4gICAgICAgICAgICBpZiAoJHBsYWNlaG9sZGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoJHBsYWNlaG9sZGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5wZXJtaXNzaW9ucy5zYXZlKSB7XG4gICAgICAgICAgICAgICAgJGFkZEJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkY29udGFpbmVyLnNob3coKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRvdWJsZS1jbGljayBmb3IgZWRpdGluZ1xuICAgICAqIEV4Y2x1ZGVzIGFjdGlvbiBidXR0b24gY2VsbHMgdG8gYXZvaWQgY29uZmxpY3RzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgpIHtcbiAgICAgICAgdGhpcy4kdGFibGUub24oJ2RibGNsaWNrJywgJ3Rib2R5IHRkOm5vdCgucmlnaHQuYWxpZ25lZCknLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuZGF0YVRhYmxlLnJvdyhlLmN1cnJlbnRUYXJnZXQpLmRhdGEoKTtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgcmVjb3JkIElEIC0gY2hlY2sgZm9yIGJvdGggdW5pcWlkIGFuZCBpZCBmaWVsZHNcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gZGF0YSAmJiAoZGF0YS51bmlxaWQgfHwgZGF0YS5pZCk7XG4gICAgICAgICAgICBpZiAocmVjb3JkSWQgJiYgKHRoaXMucGVybWlzc2lvbnMubW9kaWZ5IHx8IHRoaXMucGVybWlzc2lvbnMuZWRpdCkpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgY3VzdG9tIGdldE1vZGlmeVVybCBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kaWZ5VXJsID0gdGhpcy5nZXRNb2RpZnlVcmwgPyBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRNb2RpZnlVcmwocmVjb3JkSWQpIDogXG4gICAgICAgICAgICAgICAgICAgIGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvJHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IG1vZGlmeVVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHVuaWZpZWQgZGVzY3JpcHRpb24gcmVuZGVyZXIgd2l0aCB0cnVuY2F0aW9uIHN1cHBvcnRcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJlbmRlcmVyIGZ1bmN0aW9uIGZvciBEYXRhVGFibGVzXG4gICAgICovXG4gICAgY3JlYXRlRGVzY3JpcHRpb25SZW5kZXJlcigpIHtcbiAgICAgICAgcmV0dXJuIChkYXRhLCB0eXBlLCByb3cpID0+IHtcbiAgICAgICAgICAgIGlmICghZGF0YSB8fCBkYXRhLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ+KAlCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAvLyBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVEZXNjID0gd2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChkYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXNjcmlwdGlvbkxpbmVzID0gc2FmZURlc2Muc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpICE9PSAnJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG1heCBsaW5lc1xuICAgICAgICAgICAgICAgIGxldCBtYXhMaW5lcyA9IHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5tYXhMaW5lcztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmR5bmFtaWNIZWlnaHQgJiYgdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmNhbGN1bGF0ZUxpbmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heExpbmVzID0gdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmNhbGN1bGF0ZUxpbmVzKHJvdyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChkZXNjcmlwdGlvbkxpbmVzLmxlbmd0aCA8PSBtYXhMaW5lcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiBmaXRzIC0gc2hvdyB3aXRoIHByZXNlcnZlZCBmb3JtYXR0aW5nXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZERlc2MgPSBkZXNjcmlwdGlvbkxpbmVzLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb24tdGV4dFwiIHN0eWxlPVwibGluZS1oZWlnaHQ6IDEuMztcIj4ke2Zvcm1hdHRlZERlc2N9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiB0b28gbG9uZyAtIHRydW5jYXRlIHdpdGggcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlzaWJsZUxpbmVzID0gZGVzY3JpcHRpb25MaW5lcy5zbGljZSgwLCBtYXhMaW5lcyk7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVMaW5lc1ttYXhMaW5lcyAtIDFdICs9ICcuLi4nO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkRGVzYyA9IHZpc2libGVMaW5lcy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxEZXNjID0gZGVzY3JpcHRpb25MaW5lcy5qb2luKCdcXG4nKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uLXRleHQgdHJ1bmNhdGVkIHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2Z1bGxEZXNjfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcG9zaXRpb249XCJ0b3AgcmlnaHRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cIndpZGVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBoZWxwOyBib3JkZXItYm90dG9tOiAxcHggZG90dGVkICM5OTk7IGxpbmUtaGVpZ2h0OiAxLjM7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3RydW5jYXRlZERlc2N9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3Igc2VhcmNoIGFuZCBvdGhlciBvcGVyYXRpb25zLCByZXR1cm4gcGxhaW4gdGV4dFxuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgdGhlIERhdGFUYWJsZSBhbmQgY2xlYW51cFxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIFJlbW92ZSBldmVudCBoYW5kbGVyc1xuICAgICAgICB0aGlzLiR0YWJsZS5vZmYoJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknKTtcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdjbGljaycsICdhLmNvcHknKTtcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IERhdGFUYWJsZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRoaXMuZGF0YVRhYmxlICYmIHR5cGVvZiB0aGlzLmRhdGFUYWJsZS5kZXN0cm95ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGlzLmRhdGFUYWJsZS5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkZXJcbiAgICAgICAgJCgnI3RhYmxlLWRhdGEtbG9hZGVyJykucmVtb3ZlKCk7XG4gICAgfVxufVxuXG4vLyBNYWtlIGF2YWlsYWJsZSBnbG9iYWxseVxud2luZG93LlBieERhdGFUYWJsZUluZGV4ID0gUGJ4RGF0YVRhYmxlSW5kZXg7Il19