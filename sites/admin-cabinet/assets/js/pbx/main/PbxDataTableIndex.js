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
   * @param {boolean} [config.orderable=true] - Enable/disable sorting for all columns
   * @param {Array} [config.order=[[0, 'asc']]] - Default sort order
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
            buttons.push("\n                        <a href=\"".concat(globalRootUrl).concat(_this2.routePrefix, "/modify/").concat(recordId, "\" \n                           class=\"ui button edit popuped\" \n                           data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                            <i class=\"icon edit blue\"></i>\n                        </a>\n                    "));
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
        var data = _this6.dataTable.row(e.currentTarget).data(); // Get the record ID - check for both uniqid and id fields


        var recordId = data && (data.uniqid || data.id);

        if (recordId && (_this6.permissions.modify || _this6.permissions.edit)) {
          window.location = "".concat(globalRootUrl).concat(_this6.routePrefix, "/modify/").concat(recordId);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1BieERhdGFUYWJsZUluZGV4LmpzIl0sIm5hbWVzIjpbIlBieERhdGFUYWJsZUluZGV4IiwiY29uZmlnIiwidGFibGVJZCIsImFwaU1vZHVsZSIsInJvdXRlUHJlZml4IiwidHJhbnNsYXRpb25zIiwiY29sdW1ucyIsInNob3dTdWNjZXNzTWVzc2FnZXMiLCJzaG93SW5mbyIsIm9yZGVyYWJsZSIsInVuZGVmaW5lZCIsIm9yZGVyIiwicGVybWlzc2lvbnMiLCJzYXZlIiwibW9kaWZ5IiwiZWRpdCIsImNvcHkiLCJjdXN0b20iLCJhY3Rpb25CdXR0b25zIiwiY3VzdG9tQWN0aW9uQnV0dG9ucyIsImRlc2NyaXB0aW9uU2V0dGluZ3MiLCJPYmplY3QiLCJhc3NpZ24iLCJtYXhMaW5lcyIsImR5bmFtaWNIZWlnaHQiLCJjYWxjdWxhdGVMaW5lcyIsIiR0YWJsZSIsIiQiLCJkYXRhVGFibGUiLCJvbkRhdGFMb2FkZWQiLCJvbkRyYXdDYWxsYmFjayIsIm9uUGVybWlzc2lvbnNMb2FkZWQiLCJjdXN0b21EZWxldGVIYW5kbGVyIiwic2hvd0xvYWRlciIsImxvYWRQZXJtaXNzaW9ucyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJlcnJvciIsImNvbnNvbGUiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X0Vycm9ySW5pdGlhbGl6aW5nVGFibGUiLCJoaWRlTG9hZGVyIiwidG9nZ2xlRW1wdHlQbGFjZWhvbGRlciIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJtZXRob2QiLCJkYXRhIiwiY29udHJvbGxlciIsImRhdGFUeXBlIiwic3VjY2VzcyIsIndhcm4iLCJhZGRDbGFzcyIsInByb2Nlc3NlZENvbHVtbnMiLCJwcm9jZXNzQ29sdW1ucyIsImVuZHBvaW50cyIsImdldExpc3QiLCJ0eXBlIiwiZGF0YVNyYyIsImpzb24iLCJoYW5kbGVEYXRhTG9hZCIsInhociIsInRocm93biIsImV4X0Vycm9yTG9hZGluZ0RhdGEiLCJvcmRlcmluZyIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInNlYXJjaGluZyIsImluZm8iLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZHJhd0NhbGxiYWNrIiwiaGFuZGxlRHJhd0NhbGxiYWNrIiwiRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIiLCJpbml0aWFsaXplQ29weUhhbmRsZXIiLCJpbml0aWFsaXplQ3VzdG9tSGFuZGxlcnMiLCJmb3JFYWNoIiwiY29sIiwiZmluZCIsImlzQWN0aW9uQ29sdW1uIiwicHVzaCIsImNyZWF0ZUFjdGlvbkNvbHVtbiIsInNlYXJjaGFibGUiLCJjbGFzc05hbWUiLCJyZW5kZXIiLCJyb3ciLCJidXR0b25zIiwicmVjb3JkSWQiLCJ1bmlxaWQiLCJpZCIsImluY2x1ZGVzIiwiYnRfVG9vbFRpcEVkaXQiLCJidF9Ub29sVGlwQ29weSIsImN1c3RvbUJ1dHRvbiIsIm5hbWUiLCJocmVmIiwiZGF0YVZhbHVlIiwiaW5jbHVkZUlkIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJ0b29sdGlwIiwiaWNvbiIsImJ0X1Rvb2xUaXBEZWxldGUiLCJsZW5ndGgiLCJqb2luIiwiaXNFbXB0eSIsInJlc3VsdCIsInBvcHVwIiwicmVwb3NpdGlvbkFkZEJ1dHRvbiIsImluaXRpYWxpemVEb3VibGVDbGlja0VkaXQiLCIkYWRkQnV0dG9uIiwiJHdyYXBwZXIiLCIkbGVmdENvbHVtbiIsImZpcnN0IiwiYXBwZW5kIiwic2hvdyIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCJhdHRyIiwiZGVsZXRlUmVjb3JkIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsIndpbmRvdyIsImxvY2F0aW9uIiwib25DbGljayIsInJlbG9hZCIsIkV4dGVuc2lvbnMiLCJjYk9uRGF0YUNoYW5nZWQiLCJkZWxldGVTdWNjZXNzIiwic2hvd1N1Y2Nlc3MiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImRlbGV0ZUVycm9yIiwiZXhfSW1wb3NzaWJsZVRvRGVsZXRlUmVjb3JkIiwicmVtb3ZlQ2xhc3MiLCJjbG9zZXN0IiwiJGNvbnRhaW5lciIsInBhcmVudCIsIiRwbGFjZWhvbGRlciIsImhpZGUiLCIkbG9hZGVyIiwiZXhfTG9hZGluZ0RhdGEiLCJiZWZvcmUiLCIkcGFyZW50IiwidHJpbSIsInNhZmVEZXNjIiwiZGVzY3JpcHRpb25MaW5lcyIsInNwbGl0IiwiZmlsdGVyIiwibGluZSIsImZvcm1hdHRlZERlc2MiLCJ2aXNpYmxlTGluZXMiLCJzbGljZSIsInRydW5jYXRlZERlc2MiLCJmdWxsRGVzYyIsIm9mZiIsImRlc3Ryb3kiLCJyZW1vdmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLGlCO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0ksNkJBQVlDLE1BQVosRUFBb0I7QUFBQTs7QUFDaEI7QUFDQSxTQUFLQyxPQUFMLEdBQWVELE1BQU0sQ0FBQ0MsT0FBdEI7QUFDQSxTQUFLQyxTQUFMLEdBQWlCRixNQUFNLENBQUNFLFNBQXhCO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQkgsTUFBTSxDQUFDRyxXQUExQjtBQUNBLFNBQUtDLFlBQUwsR0FBb0JKLE1BQU0sQ0FBQ0ksWUFBUCxJQUF1QixFQUEzQztBQUNBLFNBQUtDLE9BQUwsR0FBZUwsTUFBTSxD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LENBQUM1QyxJQUFqQixDQUFzQixJQUF0QixDQUFqQjtBQUVBLCtIQUMyQm9ELFFBRDNCLDBRQUtNRCxhQUxOO0FBT0g7QUFDSixTQXBDdUIsQ0FzQ3hCOzs7QUFDQSxlQUFPOUcsSUFBUDtBQUNILE9BeENEO0FBeUNIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksbUJBQVU7QUFDTjtBQUNBLFdBQUt2QixNQUFMLENBQVl1SSxHQUFaLENBQWdCLE9BQWhCLEVBQXlCLGlDQUF6QjtBQUNBLFdBQUt2SSxNQUFMLENBQVl1SSxHQUFaLENBQWdCLE9BQWhCLEVBQXlCLFFBQXpCO0FBQ0EsV0FBS3ZJLE1BQUwsQ0FBWXVJLEdBQVosQ0FBZ0IsVUFBaEIsRUFBNEIsOEJBQTVCLEVBSk0sQ0FNTjs7QUFDQSxVQUFJLEtBQUtySSxTQUFMLElBQWtCLE9BQU8sS0FBS0EsU0FBTCxDQUFlc0ksT0FBdEIsS0FBa0MsVUFBeEQsRUFBb0U7QUFDaEUsYUFBS3RJLFNBQUwsQ0FBZXNJLE9BQWY7QUFDSCxPQVRLLENBV047OztBQUNBdkksTUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0J3SSxNQUF4QjtBQUNIOzs7O0tBR0w7OztBQUNBbkMsTUFBTSxDQUFDaEksaUJBQVAsR0FBMkJBLGlCQUEzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXh0ZW5zaW9ucywgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIE1pa29QQlggaW5kZXggdGFibGUgbWFuYWdlbWVudCB3aXRoIEFDTCBzdXBwb3J0XG4gKiBcbiAqIFByb3ZpZGVzIGNvbW1vbiBmdW5jdGlvbmFsaXR5IGZvciBEYXRhVGFibGUtYmFzZWQgaW5kZXggcGFnZXMgaW5jbHVkaW5nOlxuICogLSBTZXJ2ZXItc2lkZSBBQ0wgcGVybWlzc2lvbiBjaGVja2luZ1xuICogLSBEeW5hbWljIGFjdGlvbiBidXR0b24gcmVuZGVyaW5nIGJhc2VkIG9uIHBlcm1pc3Npb25zXG4gKiAtIFVuaWZpZWQgZGVzY3JpcHRpb24gdHJ1bmNhdGlvbiB3aXRoIHBvcHVwIHN1cHBvcnRcbiAqIC0gQ29weSBmdW5jdGlvbmFsaXR5IHN1cHBvcnRcbiAqIC0gQ3VzdG9tIGFjdGlvbiBidXR0b25zXG4gKiAtIFR3by1zdGVwIGRlbGV0ZSBjb25maXJtYXRpb25cbiAqIC0gRG91YmxlLWNsaWNrIGVkaXRpbmdcbiAqIFxuICogQGNsYXNzIFBieERhdGFUYWJsZUluZGV4XG4gKi9cbmNsYXNzIFBieERhdGFUYWJsZUluZGV4IHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXggaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLnRhYmxlSWQgLSBIVE1MIHRhYmxlIGVsZW1lbnQgSURcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnLmFwaU1vZHVsZSAtIEFQSSBtb2R1bGUgZm9yIGRhdGEgb3BlcmF0aW9uc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcucm91dGVQcmVmaXggLSBVUkwgcm91dGUgcHJlZml4IChlLmcuLCAnY2FsbC1xdWV1ZXMnKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcudHJhbnNsYXRpb25zIC0gVHJhbnNsYXRpb24ga2V5cyBmb3IgbWVzc2FnZXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb25maWcuY29sdW1ucyAtIERhdGFUYWJsZSBjb2x1bW4gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2hvd1N1Y2Nlc3NNZXNzYWdlcz1mYWxzZV0gLSBTaG93IHN1Y2Nlc3MgbWVzc2FnZXMgb24gZGVsZXRlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNob3dJbmZvPWZhbHNlXSAtIFNob3cgRGF0YVRhYmxlIGluZm9cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmFjdGlvbkJ1dHRvbnM9WydlZGl0JywgJ2RlbGV0ZSddXSAtIFN0YW5kYXJkIGFjdGlvbiBidXR0b25zIHRvIHNob3dcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmN1c3RvbUFjdGlvbkJ1dHRvbnM9W11dIC0gQ3VzdG9tIGFjdGlvbiBidXR0b24gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5kZXNjcmlwdGlvblNldHRpbmdzXSAtIERlc2NyaXB0aW9uIHRydW5jYXRpb24gc2V0dGluZ3NcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLm9uRGF0YUxvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBkYXRhIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25EcmF3Q2FsbGJhY2tdIC0gQ2FsbGJhY2sgYWZ0ZXIgdGFibGUgZHJhd1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25QZXJtaXNzaW9uc0xvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBwZXJtaXNzaW9ucyBsb2FkZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmN1c3RvbURlbGV0ZUhhbmRsZXJdIC0gQ3VzdG9tIGRlbGV0ZSBoYW5kbGVyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLm9yZGVyYWJsZT10cnVlXSAtIEVuYWJsZS9kaXNhYmxlIHNvcnRpbmcgZm9yIGFsbCBjb2x1bW5zXG4gICAgICogQHBhcmFtIHtBcnJheX0gW2NvbmZpZy5vcmRlcj1bWzAsICdhc2MnXV1dIC0gRGVmYXVsdCBzb3J0IG9yZGVyXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gICAgICAgIC8vIENvcmUgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLnRhYmxlSWQgPSBjb25maWcudGFibGVJZDtcbiAgICAgICAgdGhpcy5hcGlNb2R1bGUgPSBjb25maWcuYXBpTW9kdWxlO1xuICAgICAgICB0aGlzLnJvdXRlUHJlZml4ID0gY29uZmlnLnJvdXRlUHJlZml4O1xuICAgICAgICB0aGlzLnRyYW5zbGF0aW9ucyA9IGNvbmZpZy50cmFuc2xhdGlvbnMgfHwge307XG4gICAgICAgIHRoaXMuY29sdW1ucyA9IGNvbmZpZy5jb2x1bW5zIHx8IFtdO1xuICAgICAgICB0aGlzLnNob3dTdWNjZXNzTWVzc2FnZXMgPSBjb25maWcuc2hvd1N1Y2Nlc3NNZXNzYWdlcyB8fCBmYWxzZTtcbiAgICAgICAgdGhpcy5zaG93SW5mbyA9IGNvbmZpZy5zaG93SW5mbyB8fCBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNvcnRpbmcgY29uZmlndXJhdGlvbiAoYmFja3dhcmQgY29tcGF0aWJsZSlcbiAgICAgICAgdGhpcy5vcmRlcmFibGUgPSBjb25maWcub3JkZXJhYmxlICE9PSB1bmRlZmluZWQgPyBjb25maWcub3JkZXJhYmxlIDogdHJ1ZTtcbiAgICAgICAgdGhpcy5vcmRlciA9IGNvbmZpZy5vcmRlciB8fCBbWzAsICdhc2MnXV07XG4gICAgICAgIFxuICAgICAgICAvLyBQZXJtaXNzaW9uIHN0YXRlIChsb2FkZWQgZnJvbSBzZXJ2ZXIpXG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSB7XG4gICAgICAgICAgICBzYXZlOiBmYWxzZSxcbiAgICAgICAgICAgIG1vZGlmeTogZmFsc2UsXG4gICAgICAgICAgICBlZGl0OiBmYWxzZSxcbiAgICAgICAgICAgIGRlbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICBjb3B5OiBmYWxzZSxcbiAgICAgICAgICAgIGN1c3RvbToge31cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFjdGlvbiBidXR0b25zIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy5hY3Rpb25CdXR0b25zID0gY29uZmlnLmFjdGlvbkJ1dHRvbnMgfHwgWydlZGl0JywgJ2RlbGV0ZSddO1xuICAgICAgICB0aGlzLmN1c3RvbUFjdGlvbkJ1dHRvbnMgPSBjb25maWcuY3VzdG9tQWN0aW9uQnV0dG9ucyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlc2NyaXB0aW9uIHRydW5jYXRpb24gc2V0dGluZ3NcbiAgICAgICAgdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICBtYXhMaW5lczogMyxcbiAgICAgICAgICAgIGR5bmFtaWNIZWlnaHQ6IGZhbHNlLFxuICAgICAgICAgICAgY2FsY3VsYXRlTGluZXM6IG51bGxcbiAgICAgICAgfSwgY29uZmlnLmRlc2NyaXB0aW9uU2V0dGluZ3MgfHwge30pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW50ZXJuYWwgcHJvcGVydGllc1xuICAgICAgICB0aGlzLiR0YWJsZSA9ICQoYCMke3RoaXMudGFibGVJZH1gKTtcbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIE9wdGlvbmFsIGNhbGxiYWNrc1xuICAgICAgICB0aGlzLm9uRGF0YUxvYWRlZCA9IGNvbmZpZy5vbkRhdGFMb2FkZWQ7XG4gICAgICAgIHRoaXMub25EcmF3Q2FsbGJhY2sgPSBjb25maWcub25EcmF3Q2FsbGJhY2s7XG4gICAgICAgIHRoaXMub25QZXJtaXNzaW9uc0xvYWRlZCA9IGNvbmZpZy5vblBlcm1pc3Npb25zTG9hZGVkO1xuICAgICAgICB0aGlzLmN1c3RvbURlbGV0ZUhhbmRsZXIgPSBjb25maWcuY3VzdG9tRGVsZXRlSGFuZGxlcjtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlIHdpdGggcGVybWlzc2lvbiBsb2FkaW5nXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFNob3cgbG9hZGVyIHdoaWxlIGluaXRpYWxpemluZ1xuICAgICAgICAgICAgdGhpcy5zaG93TG9hZGVyKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpcnN0LCBsb2FkIHBlcm1pc3Npb25zIGZyb20gc2VydmVyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRQZXJtaXNzaW9ucygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIERhdGFUYWJsZSAod2lsbCBoYW5kbGUgbG9hZGVyL2VtcHR5IHN0YXRlIGluIGRhdGEgY2FsbGJhY2spXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIFBieERhdGFUYWJsZUluZGV4OicsIGVycm9yKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JJbml0aWFsaXppbmdUYWJsZSB8fCAnRmFpbGVkIHRvIGluaXRpYWxpemUgdGFibGUnKTtcbiAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcGVybWlzc2lvbnMgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBhc3luYyBsb2FkUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWFjbC9jaGVja1Blcm1pc3Npb25zYCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogdGhpcy5yb3V0ZVByZWZpeFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMucGVybWlzc2lvbnMsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uUGVybWlzc2lvbnNMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkKHRoaXMucGVybWlzc2lvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGxvYWQgcGVybWlzc2lvbnMsIHVzaW5nIGRlZmF1bHRzOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIE9uIGVycm9yLCBkZWZhdWx0IHRvIG5vIHBlcm1pc3Npb25zIGZvciBzYWZldHlcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIGNvbW1vbiBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgLy8gQWRkIHRoZSBkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQgY2xhc3MgdG8gdGhlIHRhYmxlXG4gICAgICAgIHRoaXMuJHRhYmxlLmFkZENsYXNzKCdkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQnKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb2Nlc3NlZENvbHVtbnMgPSB0aGlzLnByb2Nlc3NDb2x1bW5zKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb25maWcgPSB7XG4gICAgICAgICAgICBhamF4OiB7XG4gICAgICAgICAgICAgICAgdXJsOiB0aGlzLmFwaU1vZHVsZS5lbmRwb2ludHMuZ2V0TGlzdCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiAoanNvbikgPT4gdGhpcy5oYW5kbGVEYXRhTG9hZChqc29uKSxcbiAgICAgICAgICAgICAgICBlcnJvcjogKHhociwgZXJyb3IsIHRocm93bikgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhpZGVMb2FkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4X0Vycm9yTG9hZGluZ0RhdGEgfHwgJ0ZhaWxlZCB0byBsb2FkIGRhdGEnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29sdW1uczogcHJvY2Vzc2VkQ29sdW1ucyxcbiAgICAgICAgICAgIG9yZGVyOiB0aGlzLm9yZGVyLFxuICAgICAgICAgICAgb3JkZXJpbmc6IHRoaXMub3JkZXJhYmxlLFxuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hpbmc6IHRydWUsXG4gICAgICAgICAgICBpbmZvOiB0aGlzLnNob3dJbmZvLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjazogKCkgPT4gdGhpcy5oYW5kbGVEcmF3Q2FsbGJhY2soKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB0aGlzLiR0YWJsZS5EYXRhVGFibGUoY29uZmlnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGVsZXRlSGFuZGxlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDb3B5SGFuZGxlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDdXN0b21IYW5kbGVycygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGNvbHVtbiBkZWZpbml0aW9ucyBhbmQgYWRkIGFjdGlvbiBjb2x1bW4gaWYgbmVlZGVkXG4gICAgICovXG4gICAgcHJvY2Vzc0NvbHVtbnMoKSB7XG4gICAgICAgIGNvbnN0IGNvbHVtbnMgPSBbLi4udGhpcy5jb2x1bW5zXTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIHNvcnRpbmcgaXMgZ2xvYmFsbHkgZGlzYWJsZWQsIGVuc3VyZSBhbGwgY29sdW1ucyByZXNwZWN0IGl0XG4gICAgICAgIGlmICghdGhpcy5vcmRlcmFibGUpIHtcbiAgICAgICAgICAgIGNvbHVtbnMuZm9yRWFjaChjb2wgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFByZXNlcnZlIGV4cGxpY2l0IG9yZGVyYWJsZTogZmFsc2UsIGJ1dCBvdmVycmlkZSB0cnVlIG9yIHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIGlmIChjb2wub3JkZXJhYmxlICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBjb2wub3JkZXJhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzdGFuZGFyZCBhY3Rpb24gY29sdW1uIGlmIG5vdCBhbHJlYWR5IHByZXNlbnRcbiAgICAgICAgaWYgKCFjb2x1bW5zLmZpbmQoY29sID0+IGNvbC5pc0FjdGlvbkNvbHVtbikpIHtcbiAgICAgICAgICAgIGNvbHVtbnMucHVzaCh0aGlzLmNyZWF0ZUFjdGlvbkNvbHVtbigpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNvbHVtbnM7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBzdGFuZGFyZCBhY3Rpb24gY29sdW1uIHdpdGggcGVybWlzc2lvbi1iYXNlZCByZW5kZXJpbmdcbiAgICAgKi9cbiAgICBjcmVhdGVBY3Rpb25Db2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiAncmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nJyxcbiAgICAgICAgICAgIGlzQWN0aW9uQ29sdW1uOiB0cnVlLFxuICAgICAgICAgICAgcmVuZGVyOiAoZGF0YSwgdHlwZSwgcm93KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYnV0dG9ucyA9IFtdO1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgcmVjb3JkIElEIC0gY2hlY2sgZm9yIGJvdGggdW5pcWlkIGFuZCBpZCBmaWVsZHNcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9IHJvdy51bmlxaWQgfHwgcm93LmlkIHx8ICcnO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVkaXQgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uQnV0dG9ucy5pbmNsdWRlcygnZWRpdCcpICYmIFxuICAgICAgICAgICAgICAgICAgICAodGhpcy5wZXJtaXNzaW9ucy5tb2RpZnkgfHwgdGhpcy5wZXJtaXNzaW9ucy5lZGl0KSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7Z2xvYmFsUm9vdFVybH0ke3RoaXMucm91dGVQcmVmaXh9L21vZGlmeS8ke3JlY29yZElkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZWRpdCBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZWRpdCBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ29weSBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdjb3B5JykgJiYgdGhpcy5wZXJtaXNzaW9ucy5jb3B5KSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGNvcHkgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHl9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGNvcHkgb3V0bGluZSBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3VzdG9tIGJ1dHRvbnNcbiAgICAgICAgICAgICAgICB0aGlzLmN1c3RvbUFjdGlvbkJ1dHRvbnMuZm9yRWFjaChjdXN0b21CdXR0b24gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wZXJtaXNzaW9ucy5jdXN0b20gJiYgdGhpcy5wZXJtaXNzaW9ucy5jdXN0b21bY3VzdG9tQnV0dG9uLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBocmVmID0gY3VzdG9tQnV0dG9uLmhyZWYgfHwgJyMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YVZhbHVlID0gY3VzdG9tQnV0dG9uLmluY2x1ZGVJZCA/IGBkYXRhLXZhbHVlPVwiJHtyZWNvcmRJZH1cImAgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7aHJlZn1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2RhdGFWYWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiAke2N1c3RvbUJ1dHRvbi5jbGFzc30gcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGN1c3RvbUJ1dHRvbi50b29sdGlwKX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2N1c3RvbUJ1dHRvbi5pY29ufVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIERlbGV0ZSBidXR0b24gKGFsd2F5cyBsYXN0KVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdGlvbkJ1dHRvbnMuaW5jbHVkZXMoJ2RlbGV0ZScpICYmIHRoaXMucGVybWlzc2lvbnMuZGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gYnV0dG9ucy5sZW5ndGggPiAwID8gXG4gICAgICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj4ke2J1dHRvbnMuam9pbignJyl9PC9kaXY+YCA6IFxuICAgICAgICAgICAgICAgICAgICAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRhdGEgbG9hZCBhbmQgZW1wdHkgc3RhdGUgbWFuYWdlbWVudFxuICAgICAqL1xuICAgIGhhbmRsZURhdGFMb2FkKGpzb24pIHtcbiAgICAgICAgLy8gSGlkZSBsb2FkZXIgZmlyc3RcbiAgICAgICAgdGhpcy5oaWRlTG9hZGVyKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBpc0VtcHR5ID0gIWpzb24ucmVzdWx0IHx8ICFqc29uLmRhdGEgfHwganNvbi5kYXRhLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKGlzRW1wdHkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMub25EYXRhTG9hZGVkKSB7XG4gICAgICAgICAgICB0aGlzLm9uRGF0YUxvYWRlZChqc29uKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGpzb24ucmVzdWx0ID8ganNvbi5kYXRhIDogW107XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBkcmF3IGNhbGxiYWNrIGZvciBwb3N0LXJlbmRlciBvcGVyYXRpb25zXG4gICAgICovXG4gICAgaGFuZGxlRHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIHBvcHVwc1xuICAgICAgICB0aGlzLiR0YWJsZS5maW5kKCcucG9wdXBlZCcpLnBvcHVwKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBNb3ZlIEFkZCBOZXcgYnV0dG9uIHRvIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAgICB0aGlzLnJlcG9zaXRpb25BZGRCdXR0b24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZG91YmxlLWNsaWNrIGVkaXRpbmdcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDdXN0b20gZHJhdyBjYWxsYmFja1xuICAgICAgICBpZiAodGhpcy5vbkRyYXdDYWxsYmFjaykge1xuICAgICAgICAgICAgdGhpcy5vbkRyYXdDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcG9zaXRpb24gQWRkIE5ldyBidXR0b24gdG8gRGF0YVRhYmxlcyB3cmFwcGVyXG4gICAgICovXG4gICAgcmVwb3NpdGlvbkFkZEJ1dHRvbigpIHtcbiAgICAgICAgY29uc3QgJGFkZEJ1dHRvbiA9ICQoJyNhZGQtbmV3LWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkd3JhcHBlciA9ICQoYCMke3RoaXMudGFibGVJZH1fd3JhcHBlcmApO1xuICAgICAgICBjb25zdCAkbGVmdENvbHVtbiA9ICR3cmFwcGVyLmZpbmQoJy5laWdodC53aWRlLmNvbHVtbicpLmZpcnN0KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGFkZEJ1dHRvbi5sZW5ndGggJiYgJGxlZnRDb2x1bW4ubGVuZ3RoICYmIHRoaXMucGVybWlzc2lvbnMuc2F2ZSkge1xuICAgICAgICAgICAgJGxlZnRDb2x1bW4uYXBwZW5kKCRhZGRCdXR0b24pO1xuICAgICAgICAgICAgJGFkZEJ1dHRvbi5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZWxldGUgaGFuZGxlciB3aXRoIHR3by1zdGVwIGNvbmZpcm1hdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVEZWxldGVIYW5kbGVyKCkge1xuICAgICAgICAvLyBEZWxldGVTb21ldGhpbmcuanMgaGFuZGxlcyBmaXJzdCBjbGlja1xuICAgICAgICAvLyBXZSBoYW5kbGUgc2Vjb25kIGNsaWNrIHdoZW4gdHdvLXN0ZXBzLWRlbGV0ZSBjbGFzcyBpcyByZW1vdmVkXG4gICAgICAgIHRoaXMuJHRhYmxlLm9uKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodGhpcy5jdXN0b21EZWxldGVIYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXN0b21EZWxldGVIYW5kbGVyKHJlY29yZElkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGlNb2R1bGUuZGVsZXRlUmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHRoaXMuY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjb3B5IGhhbmRsZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ29weUhhbmRsZXIoKSB7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9uKCdjbGljaycsICdhLmNvcHknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWRpcmVjdCB0byBtb2RpZnkgcGFnZSB3aXRoIGNvcHkgcGFyYW1ldGVyXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfSR7dGhpcy5yb3V0ZVByZWZpeH0vbW9kaWZ5Lz9jb3B5PSR7cmVjb3JkSWR9YDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY3VzdG9tIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDdXN0b21IYW5kbGVycygpIHtcbiAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zLmZvckVhY2goY3VzdG9tQnV0dG9uID0+IHtcbiAgICAgICAgICAgIGlmIChjdXN0b21CdXR0b24ub25DbGljaykge1xuICAgICAgICAgICAgICAgIHRoaXMuJHRhYmxlLm9uKCdjbGljaycsIGBhLiR7Y3VzdG9tQnV0dG9uLmNsYXNzfWAsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21CdXR0b24ub25DbGljayhyZWNvcmRJZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciByZWNvcmQgZGVsZXRpb25cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFJlbG9hZCB0YWJsZSBkYXRhXG4gICAgICAgICAgICB0aGlzLmRhdGFUYWJsZS5hamF4LnJlbG9hZCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVsYXRlZCBjb21wb25lbnRzXG4gICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbnMgIT09ICd1bmRlZmluZWQnICYmIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIG1lc3NhZ2UgaWYgY29uZmlndXJlZFxuICAgICAgICAgICAgaWYgKHRoaXMuc2hvd1N1Y2Nlc3NNZXNzYWdlcyAmJiB0aGlzLnRyYW5zbGF0aW9ucy5kZWxldGVTdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1N1Y2Nlc3ModGhpcy50cmFuc2xhdGlvbnMuZGVsZXRlU3VjY2Vzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmFuc2xhdGlvbnMuZGVsZXRlRXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvc3NpYmxlVG9EZWxldGVSZWNvcmQ7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGUgZnJvbSBhbGwgZGVsZXRlIGJ1dHRvbnNcbiAgICAgICAgdGhpcy4kdGFibGUuZmluZCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRlciB3aGlsZSBsb2FkaW5nIGRhdGFcbiAgICAgKi9cbiAgICBzaG93TG9hZGVyKCkge1xuICAgICAgICAvLyBIaWRlIGV2ZXJ5dGhpbmcgZmlyc3RcbiAgICAgICAgLy8gRmluZCB0aGUgdGFibGUncyBwYXJlbnQgY29udGFpbmVyIC0gbmVlZCB0aGUgb3JpZ2luYWwgY29udGFpbmVyLCBub3QgdGhlIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAgICBjb25zdCAkd3JhcHBlciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZCQ9XCJfd3JhcHBlclwiXScpO1xuICAgICAgICBsZXQgJGNvbnRhaW5lcjtcbiAgICAgICAgaWYgKCR3cmFwcGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBwYXJlbnQgb2YgdGhlIHdyYXBwZXIgKHNob3VsZCBiZSB0aGUgb3JpZ2luYWwgY29udGFpbmVyKVxuICAgICAgICAgICAgJGNvbnRhaW5lciA9ICR3cmFwcGVyLnBhcmVudCgnZGl2W2lkXScpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZhbGxiYWNrIGlmIHN0cnVjdHVyZSBpcyBkaWZmZXJlbnRcbiAgICAgICAgaWYgKCEkY29udGFpbmVyIHx8ICEkY29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgJGNvbnRhaW5lciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZF06bm90KFtpZCQ9XCJfd3JhcHBlclwiXSknKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCAkcGxhY2Vob2xkZXIgPSAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKTtcbiAgICAgICAgY29uc3QgJGFkZEJ1dHRvbiA9ICQoJyNhZGQtbmV3LWJ1dHRvbicpO1xuICAgICAgICBcbiAgICAgICAgJGNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICRwbGFjZWhvbGRlci5oaWRlKCk7XG4gICAgICAgICRhZGRCdXR0b24uaGlkZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGFuZCBzaG93IGxvYWRlciBpZiBub3QgZXhpc3RzXG4gICAgICAgIGxldCAkbG9hZGVyID0gJCgnI3RhYmxlLWRhdGEtbG9hZGVyJyk7XG4gICAgICAgIGlmICghJGxvYWRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHNlZ21lbnQgd2l0aCBsb2FkZXIgZm9yIGJldHRlciB2aXN1YWwgYXBwZWFyYW5jZVxuICAgICAgICAgICAgJGxvYWRlciA9ICQoYFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJ0YWJsZS1kYXRhLWxvYWRlclwiIGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwibWluLWhlaWdodDogMjAwcHg7IHBvc2l0aW9uOiByZWxhdGl2ZTtcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmdEYXRhIHx8ICdMb2FkaW5nLi4uJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIC8vIEluc2VydCBsb2FkZXIgaW4gdGhlIGFwcHJvcHJpYXRlIHBsYWNlXG4gICAgICAgICAgICBpZiAoJGNvbnRhaW5lci5sZW5ndGggJiYgJGNvbnRhaW5lci5wYXJlbnQoKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmJlZm9yZSgkbG9hZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJHBsYWNlaG9sZGVyLmxlbmd0aCAmJiAkcGxhY2Vob2xkZXIucGFyZW50KCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJHBsYWNlaG9sZGVyLmJlZm9yZSgkbG9hZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2s6IGFwcGVuZCB0byBib2R5IG9yIHBhcmVudCBjb250YWluZXJcbiAgICAgICAgICAgICAgICBjb25zdCAkcGFyZW50ID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnLnB1c2hlcicpIHx8IHRoaXMuJHRhYmxlLnBhcmVudCgpO1xuICAgICAgICAgICAgICAgICRwYXJlbnQuYXBwZW5kKCRsb2FkZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRsb2FkZXIuc2hvdygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIGxvYWRlclxuICAgICAqL1xuICAgIGhpZGVMb2FkZXIoKSB7XG4gICAgICAgICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpLmhpZGUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGVtcHR5IHRhYmxlIHBsYWNlaG9sZGVyIHZpc2liaWxpdHlcbiAgICAgKi9cbiAgICB0b2dnbGVFbXB0eVBsYWNlaG9sZGVyKGlzRW1wdHkpIHtcbiAgICAgICAgLy8gRmluZCB0aGUgdGFibGUncyBwYXJlbnQgY29udGFpbmVyIC0gbmVlZCB0aGUgb3JpZ2luYWwgY29udGFpbmVyLCBub3QgdGhlIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAgICAvLyBEYXRhVGFibGVzIHdyYXBzIHRoZSB0YWJsZSBpbiBhIGRpdiB3aXRoIGlkIGVuZGluZyBpbiAnX3dyYXBwZXInXG4gICAgICAgIC8vIFdlIG5lZWQgdG8gZmluZCB0aGUgcGFyZW50IG9mIHRoYXQgd3JhcHBlciB3aGljaCBpcyB0aGUgb3JpZ2luYWwgY29udGFpbmVyXG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkJD1cIl93cmFwcGVyXCJdJyk7XG4gICAgICAgIGxldCAkY29udGFpbmVyO1xuICAgICAgICBpZiAoJHdyYXBwZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHBhcmVudCBvZiB0aGUgd3JhcHBlciAoc2hvdWxkIGJlIHRoZSBvcmlnaW5hbCBjb250YWluZXIpXG4gICAgICAgICAgICAkY29udGFpbmVyID0gJHdyYXBwZXIucGFyZW50KCdkaXZbaWRdJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmFsbGJhY2sgaWYgc3RydWN0dXJlIGlzIGRpZmZlcmVudFxuICAgICAgICBpZiAoISRjb250YWluZXIgfHwgISRjb250YWluZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAkY29udGFpbmVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkXTpub3QoW2lkJD1cIl93cmFwcGVyXCJdKScpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHBsYWNlaG9sZGVyID0gJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNFbXB0eSkge1xuICAgICAgICAgICAgJGNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICAkYWRkQnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSBwbGFjZWhvbGRlciBpcyB2aXNpYmxlXG4gICAgICAgICAgICBpZiAoJHBsYWNlaG9sZGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoJHBsYWNlaG9sZGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5wZXJtaXNzaW9ucy5zYXZlKSB7XG4gICAgICAgICAgICAgICAgJGFkZEJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkY29udGFpbmVyLnNob3coKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRvdWJsZS1jbGljayBmb3IgZWRpdGluZ1xuICAgICAqIEV4Y2x1ZGVzIGFjdGlvbiBidXR0b24gY2VsbHMgdG8gYXZvaWQgY29uZmxpY3RzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgpIHtcbiAgICAgICAgdGhpcy4kdGFibGUub24oJ2RibGNsaWNrJywgJ3Rib2R5IHRkOm5vdCgucmlnaHQuYWxpZ25lZCknLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuZGF0YVRhYmxlLnJvdyhlLmN1cnJlbnRUYXJnZXQpLmRhdGEoKTtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgcmVjb3JkIElEIC0gY2hlY2sgZm9yIGJvdGggdW5pcWlkIGFuZCBpZCBmaWVsZHNcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gZGF0YSAmJiAoZGF0YS51bmlxaWQgfHwgZGF0YS5pZCk7XG4gICAgICAgICAgICBpZiAocmVjb3JkSWQgJiYgKHRoaXMucGVybWlzc2lvbnMubW9kaWZ5IHx8IHRoaXMucGVybWlzc2lvbnMuZWRpdCkpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfSR7dGhpcy5yb3V0ZVByZWZpeH0vbW9kaWZ5LyR7cmVjb3JkSWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHVuaWZpZWQgZGVzY3JpcHRpb24gcmVuZGVyZXIgd2l0aCB0cnVuY2F0aW9uIHN1cHBvcnRcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJlbmRlcmVyIGZ1bmN0aW9uIGZvciBEYXRhVGFibGVzXG4gICAgICovXG4gICAgY3JlYXRlRGVzY3JpcHRpb25SZW5kZXJlcigpIHtcbiAgICAgICAgcmV0dXJuIChkYXRhLCB0eXBlLCByb3cpID0+IHtcbiAgICAgICAgICAgIGlmICghZGF0YSB8fCBkYXRhLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ+KAlCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAvLyBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVEZXNjID0gd2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChkYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXNjcmlwdGlvbkxpbmVzID0gc2FmZURlc2Muc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpICE9PSAnJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG1heCBsaW5lc1xuICAgICAgICAgICAgICAgIGxldCBtYXhMaW5lcyA9IHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5tYXhMaW5lcztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmR5bmFtaWNIZWlnaHQgJiYgdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmNhbGN1bGF0ZUxpbmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heExpbmVzID0gdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmNhbGN1bGF0ZUxpbmVzKHJvdyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChkZXNjcmlwdGlvbkxpbmVzLmxlbmd0aCA8PSBtYXhMaW5lcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiBmaXRzIC0gc2hvdyB3aXRoIHByZXNlcnZlZCBmb3JtYXR0aW5nXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZERlc2MgPSBkZXNjcmlwdGlvbkxpbmVzLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb24tdGV4dFwiIHN0eWxlPVwibGluZS1oZWlnaHQ6IDEuMztcIj4ke2Zvcm1hdHRlZERlc2N9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiB0b28gbG9uZyAtIHRydW5jYXRlIHdpdGggcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlzaWJsZUxpbmVzID0gZGVzY3JpcHRpb25MaW5lcy5zbGljZSgwLCBtYXhMaW5lcyk7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVMaW5lc1ttYXhMaW5lcyAtIDFdICs9ICcuLi4nO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkRGVzYyA9IHZpc2libGVMaW5lcy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxEZXNjID0gZGVzY3JpcHRpb25MaW5lcy5qb2luKCdcXG4nKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uLXRleHQgdHJ1bmNhdGVkIHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2Z1bGxEZXNjfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcG9zaXRpb249XCJ0b3AgcmlnaHRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cIndpZGVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBoZWxwOyBib3JkZXItYm90dG9tOiAxcHggZG90dGVkICM5OTk7IGxpbmUtaGVpZ2h0OiAxLjM7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3RydW5jYXRlZERlc2N9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3Igc2VhcmNoIGFuZCBvdGhlciBvcGVyYXRpb25zLCByZXR1cm4gcGxhaW4gdGV4dFxuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgdGhlIERhdGFUYWJsZSBhbmQgY2xlYW51cFxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIFJlbW92ZSBldmVudCBoYW5kbGVyc1xuICAgICAgICB0aGlzLiR0YWJsZS5vZmYoJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknKTtcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdjbGljaycsICdhLmNvcHknKTtcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IERhdGFUYWJsZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRoaXMuZGF0YVRhYmxlICYmIHR5cGVvZiB0aGlzLmRhdGFUYWJsZS5kZXN0cm95ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGlzLmRhdGFUYWJsZS5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkZXJcbiAgICAgICAgJCgnI3RhYmxlLWRhdGEtbG9hZGVyJykucmVtb3ZlKCk7XG4gICAgfVxufVxuXG4vLyBNYWtlIGF2YWlsYWJsZSBnbG9iYWxseVxud2luZG93LlBieERhdGFUYWJsZUluZGV4ID0gUGJ4RGF0YVRhYmxlSW5kZXg7Il19