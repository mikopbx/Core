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
   * @param {boolean} [config.serverSide=false] - Enable server-side processing
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
    this.enableSearchIndex = config.enableSearchIndex !== false; // Default true
    // Adjust default sort order if search_index is added (it will be column 0)

    this.order = config.order || (this.enableSearchIndex ? [[1, 'asc']] : [[0, 'asc']]); // Permission state (loaded from server)

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
    this.serverSide = config.serverSide || false;
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
      this.$table.addClass('datatable-width-constrained'); // Add missing header cells if needed for search_index column

      this.ensureHeaderCells();
      var processedColumns = this.processColumns(); // v3 API format with getList method

      var ajaxConfig;

      if (typeof this.apiModule.getList === 'function') {
        // v3 format with getList method - use custom ajax function
        ajaxConfig = function ajaxConfig(data, callback, settings) {
          _this.apiModule.getList(_this.ajaxData, function (response) {
            var processedData = _this.handleDataLoad(response);

            callback({
              data: processedData
            });
          });
        };
      } else {
        console.error('API module does not have getList method');
        ajaxConfig = {
          data: []
        };
      }

      var config = {
        ajax: ajaxConfig,
        columns: processedColumns,
        order: this.order,
        ordering: this.orderable,
        lengthChange: false,
        paging: false,
        searching: true,
        info: this.showInfo,
        autoWidth: false,
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
      var columns = _toConsumableArray(this.columns); // Add hidden search_index column at the beginning if enabled and not present
      // This column contains all searchable text without HTML formatting


      if (this.enableSearchIndex && !columns.find(function (col) {
        return col.data === 'search_index';
      })) {
        columns.unshift({
          data: 'search_index',
          visible: false,
          searchable: true,
          orderable: false,
          defaultContent: '',
          render: function render(data, type, row) {
            // If search_index is not provided by backend, generate it from row data
            if (data) {
              return data;
            } // Fallback: generate search index from visible fields


            var searchableFields = [];
            Object.keys(row).forEach(function (key) {
              // Skip internal fields and represent fields (they're often duplicates)
              if (key !== 'search_index' && key !== 'id' && key !== 'uniqid' && key !== 'DT_RowId' && !key.endsWith('_represent')) {
                var value = row[key];

                if (value && typeof value === 'string') {
                  // Strip HTML tags and add to searchable fields
                  var cleanValue = value.replace(/<[^>]*>/g, '').trim();

                  if (cleanValue) {
                    searchableFields.push(cleanValue);
                  }
                } else if (value && typeof value === 'number') {
                  searchableFields.push(value.toString());
                }
              }
            }); // Also process _represent fields as they contain user-friendly text

            Object.keys(row).forEach(function (key) {
              if (key.endsWith('_represent') && row[key]) {
                var cleanValue = String(row[key]).replace(/<[^>]*>/g, '').trim();

                if (cleanValue) {
                  searchableFields.push(cleanValue);
                }
              }
            });
            return searchableFields.join(' ').toLowerCase();
          }
        });
      } // If sorting is globally disabled, ensure all columns respect it


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
     * v3 API format: {result: boolean, data: array} or {data: {items: array}}
     */

  }, {
    key: "handleDataLoad",
    value: function handleDataLoad(response) {
      // Hide loader first
      this.hideLoader();
      var data = [];
      var isSuccess = false; // Check for error response

      if (!response || response.result === false) {
        isSuccess = false;
        data = [];
      } // Standard v3 format with data array
      else if (Array.isArray(response.data)) {
        isSuccess = true;
        data = response.data;
      } // v3 format with items property
      else if (response.data && Array.isArray(response.data.items)) {
        isSuccess = true;
        data = response.data.items;
      } // Fallback for responses with result:true but no data
      else if (response.result === true) {
        isSuccess = true;
        data = [];
      }

      var isEmpty = !isSuccess || data.length === 0;
      this.toggleEmptyPlaceholder(isEmpty);

      if (isEmpty && !isSuccess) {
        UserMessage.showError(globalTranslate.ex_ErrorLoadingData || 'Failed to load data');
      }

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
     * Ensure table has enough header cells for all columns
     * This is needed when we add the hidden search_index column programmatically
     */

  }, {
    key: "ensureHeaderCells",
    value: function ensureHeaderCells() {
      if (!this.enableSearchIndex) {
        return;
      }

      var $thead = this.$table.find('thead');

      if (!$thead.length) {
        // Create thead if it doesn't exist
        this.$table.prepend('<thead><tr></tr></thead>');
      }

      var $headerRow = this.$table.find('thead tr').first(); // Add a hidden header cell at the beginning for search_index
      // DataTables requires matching number of th elements and columns

      $headerRow.prepend('<th style="display:none;">Search Index</th>');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1BieERhdGFUYWJsZUluZGV4LmpzIl0sIm5hbWVzIjpbIlBieERhdGFUYWJsZUluZGV4IiwiY29uZmlnIiwidGFibGVJZCIsImFwaU1vZHVsZSIsInJvdXRlUHJlZml4IiwidHJhbnNsYXRpb25zIiwiY29sdW1ucyIsInNob3dTdWNjZXNzTWVzc2FnZXMiLCJzaG93SW5mbyIsIm9yZGVyYWJsZSIsInVuZGVmaW5lZCIsImVuYWJsZVNlYXJjaEluZGV4Iiwib3JkZXIiLCJwZXJtaXNzaW9ucyIsInNhdmUiLCJtb2RpZnkiLCJlZGl0IiwiY29weSIsImN1c3RvbSIsImFjdGlvbkJ1dHRvbnMiLCJjdXN0b21BY3Rpb25CdXR0b25zIiwiZGVzY3JpcHRpb25TZXR0aW5ncyIsIk9iamVjdCIsImFzc2lnbiIsIm1heExpbmVzIiwiZHluYW1pY0hlaWdodCIsImNhbGN1bGF0ZUxpbmVzIiwiJHRhYmxlIiwiJCIsImRhdGFUYWJsZSIsIm9uRGF0YUxvYWRlZCIsIm9uRHJhd0NhbGxiYWNrIiwib25QZXJtaXNzaW9uc0xvYWRlZCIsImN1c3RvbURlbGV0ZUhhbmRsZXIiLCJvbkFmdGVyRGVsZXRlIiwiZ2V0TW9kaWZ5VXJsIiwiYWpheERhdGEiLCJzZXJ2ZXJTaWRlIiwic2hvd0xvYWRlciIsImxvYWRQZXJtaXNzaW9ucyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJlcnJvciIsImNvbnNvbGUiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X0Vycm9ySW5pdGlhbGl6aW5nVGFibGUiLCJoaWRlTG9hZGVyIiwidG9nZ2xlRW1wdHlQbGFjZWhvbGRlciIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJtZXRob2QiLCJkYXRhIiwiY29udHJvbGxlciIsImRhdGFUeXBlIiwic3VjY2VzcyIsIndhcm4iLCJhZGRDbGFzcyIsImVuc3VyZUhlYWRlckNlbGxzIiwicHJvY2Vzc2VkQ29sdW1ucyIsInByb2Nlc3NDb2x1bW5zIiwiYWpheENvbmZpZyIsImdldExpc3QiLCJjYWxsYmFjayIsInNldHRpbmdzIiwicHJvY2Vzc2VkRGF0YSIsImhhbmRsZURhdGFMb2FkIiwib3JkZXJpbmciLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJzZWFyY2hpbmciLCJpbmZvIiwiYXV0b1dpZHRoIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImRyYXdDYWxsYmFjayIsImhhbmRsZURyYXdDYWxsYmFjayIsIkRhdGFUYWJsZSIsImluaXRpYWxpemVEZWxldGVIYW5kbGVyIiwiaW5pdGlhbGl6ZUNvcHlIYW5kbGVyIiwiaW5pdGlhbGl6ZUN1c3RvbUhhbmRsZXJzIiwiZmluZCIsImNvbCIsInVuc2hpZnQiLCJ2aXNpYmxlIiwic2VhcmNoYWJsZSIsImRlZmF1bHRDb250ZW50IiwicmVuZGVyIiwidHlwZSIsInJvdyIsInNlYXJjaGFibGVGaWVsZHMiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImVuZHNXaXRoIiwidmFsdWUiLCJjbGVhblZhbHVlIiwicmVwbGFjZSIsInRyaW0iLCJwdXNoIiwidG9TdHJpbmciLCJTdHJpbmciLCJqb2luIiwidG9Mb3dlckNhc2UiLCJpc0FjdGlvbkNvbHVtbiIsImNyZWF0ZUFjdGlvbkNvbHVtbiIsImNsYXNzTmFtZSIsImJ1dHRvbnMiLCJyZWNvcmRJZCIsInVuaXFpZCIsImlkIiwiaW5jbHVkZXMiLCJtb2RpZnlVcmwiLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBDb3B5IiwiY3VzdG9tQnV0dG9uIiwibmFtZSIsImhyZWYiLCJkYXRhVmFsdWUiLCJpbmNsdWRlSWQiLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsInRvb2x0aXAiLCJpY29uIiwiYnRfVG9vbFRpcERlbGV0ZSIsImxlbmd0aCIsImlzU3VjY2VzcyIsInJlc3VsdCIsIkFycmF5IiwiaXNBcnJheSIsIml0ZW1zIiwiaXNFbXB0eSIsImV4X0Vycm9yTG9hZGluZ0RhdGEiLCJub3JtYWxpemVkUmVzcG9uc2UiLCJwb3B1cCIsInJlcG9zaXRpb25BZGRCdXR0b24iLCJpbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0IiwiJHRoZWFkIiwicHJlcGVuZCIsIiRoZWFkZXJSb3ciLCJmaXJzdCIsIiRhZGRCdXR0b24iLCIkd3JhcHBlciIsIiRsZWZ0Q29sdW1uIiwiYXBwZW5kIiwic2hvdyIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCJhdHRyIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsImRlbGV0ZVJlY29yZCIsImNvcHlVcmwiLCJiYXNlVXJsIiwid2luZG93IiwibG9jYXRpb24iLCJvbkNsaWNrIiwicmVsb2FkQ2FsbGJhY2siLCJyZWxvYWQiLCJFeHRlbnNpb25zIiwiY2JPbkRhdGFDaGFuZ2VkIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJkZWxldGVFcnJvciIsImV4X0ltcG9zc2libGVUb0RlbGV0ZVJlY29yZCIsInJlbW92ZUNsYXNzIiwiY2xvc2VzdCIsIiRjb250YWluZXIiLCJwYXJlbnQiLCIkcGxhY2Vob2xkZXIiLCJoaWRlIiwiJGxvYWRlciIsImV4X0xvYWRpbmdEYXRhIiwiYmVmb3JlIiwiJHBhcmVudCIsInNhZmVEZXNjIiwiZGVzY3JpcHRpb25MaW5lcyIsInNwbGl0IiwiZmlsdGVyIiwibGluZSIsImZvcm1hdHRlZERlc2MiLCJ2aXNpYmxlTGluZXMiLCJzbGljZSIsInRydW5jYXRlZERlc2MiLCJmdWxsRGVzYyIsIm9mZiIsImRlc3Ryb3kiLCJyZW1vdmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QUFDTjtBQUNBLFdBQUszQixNQUFMLENBQVltSyxHQUFaLENBQWdCLE9BQWhCLEVBQXlCLGlDQUF6QjtBQUNBLFdBQUtuSyxNQUFMLENBQVltSyxHQUFaLENBQWdCLE9BQWhCLEVBQXlCLFFBQXpCO0FBQ0EsV0FBS25LLE1BQUwsQ0FBWW1LLEdBQVosQ0FBZ0IsVUFBaEIsRUFBNEIsOEJBQTVCLEVBSk0sQ0FNTjs7QUFDQSxVQUFJLEtBQUtqSyxTQUFMLElBQWtCLE9BQU8sS0FBS0EsU0FBTCxDQUFla0ssT0FBdEIsS0FBa0MsVUFBeEQsRUFBb0U7QUFDaEUsYUFBS2xLLFNBQUwsQ0FBZWtLLE9BQWY7QUFDSCxPQVRLLENBV047OztBQUNBbkssTUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0JvSyxNQUF4QjtBQUNIOzs7O0tBR0w7OztBQUNBakMsTUFBTSxDQUFDL0osaUJBQVAsR0FBMkJBLGlCQUEzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXh0ZW5zaW9ucywgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIE1pa29QQlggaW5kZXggdGFibGUgbWFuYWdlbWVudCB3aXRoIEFDTCBzdXBwb3J0XG4gKiBcbiAqIFByb3ZpZGVzIGNvbW1vbiBmdW5jdGlvbmFsaXR5IGZvciBEYXRhVGFibGUtYmFzZWQgaW5kZXggcGFnZXMgaW5jbHVkaW5nOlxuICogLSBTZXJ2ZXItc2lkZSBBQ0wgcGVybWlzc2lvbiBjaGVja2luZ1xuICogLSBEeW5hbWljIGFjdGlvbiBidXR0b24gcmVuZGVyaW5nIGJhc2VkIG9uIHBlcm1pc3Npb25zXG4gKiAtIFVuaWZpZWQgZGVzY3JpcHRpb24gdHJ1bmNhdGlvbiB3aXRoIHBvcHVwIHN1cHBvcnRcbiAqIC0gQ29weSBmdW5jdGlvbmFsaXR5IHN1cHBvcnRcbiAqIC0gQ3VzdG9tIGFjdGlvbiBidXR0b25zXG4gKiAtIFR3by1zdGVwIGRlbGV0ZSBjb25maXJtYXRpb25cbiAqIC0gRG91YmxlLWNsaWNrIGVkaXRpbmdcbiAqIFxuICogQGNsYXNzIFBieERhdGFUYWJsZUluZGV4XG4gKi9cbmNsYXNzIFBieERhdGFUYWJsZUluZGV4IHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXggaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLnRhYmxlSWQgLSBIVE1MIHRhYmxlIGVsZW1lbnQgSURcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnLmFwaU1vZHVsZSAtIEFQSSBtb2R1bGUgZm9yIGRhdGEgb3BlcmF0aW9uc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcucm91dGVQcmVmaXggLSBVUkwgcm91dGUgcHJlZml4IChlLmcuLCAnY2FsbC1xdWV1ZXMnKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcudHJhbnNsYXRpb25zIC0gVHJhbnNsYXRpb24ga2V5cyBmb3IgbWVzc2FnZXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb25maWcuY29sdW1ucyAtIERhdGFUYWJsZSBjb2x1bW4gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2hvd1N1Y2Nlc3NNZXNzYWdlcz1mYWxzZV0gLSBTaG93IHN1Y2Nlc3MgbWVzc2FnZXMgb24gZGVsZXRlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNob3dJbmZvPWZhbHNlXSAtIFNob3cgRGF0YVRhYmxlIGluZm9cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmFjdGlvbkJ1dHRvbnM9WydlZGl0JywgJ2RlbGV0ZSddXSAtIFN0YW5kYXJkIGFjdGlvbiBidXR0b25zIHRvIHNob3dcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmN1c3RvbUFjdGlvbkJ1dHRvbnM9W11dIC0gQ3VzdG9tIGFjdGlvbiBidXR0b24gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5kZXNjcmlwdGlvblNldHRpbmdzXSAtIERlc2NyaXB0aW9uIHRydW5jYXRpb24gc2V0dGluZ3NcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLm9uRGF0YUxvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBkYXRhIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25EcmF3Q2FsbGJhY2tdIC0gQ2FsbGJhY2sgYWZ0ZXIgdGFibGUgZHJhd1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25QZXJtaXNzaW9uc0xvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBwZXJtaXNzaW9ucyBsb2FkZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmN1c3RvbURlbGV0ZUhhbmRsZXJdIC0gQ3VzdG9tIGRlbGV0ZSBoYW5kbGVyXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5vbkFmdGVyRGVsZXRlXSAtIENhbGxiYWNrIGFmdGVyIHN1Y2Nlc3NmdWwgZGVsZXRpb25cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmdldE1vZGlmeVVybF0gLSBDdXN0b20gVVJMIGdlbmVyYXRvciBmb3IgbW9kaWZ5L2VkaXQgYWN0aW9uc1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5vcmRlcmFibGU9dHJ1ZV0gLSBFbmFibGUvZGlzYWJsZSBzb3J0aW5nIGZvciBhbGwgY29sdW1uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtjb25maWcub3JkZXI9W1swLCAnYXNjJ11dXSAtIERlZmF1bHQgc29ydCBvcmRlclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnLmFqYXhEYXRhXSAtIEFkZGl0aW9uYWwgZGF0YSBwYXJhbWV0ZXJzIGZvciBBSkFYIHJlcXVlc3RzXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNlcnZlclNpZGU9ZmFsc2VdIC0gRW5hYmxlIHNlcnZlci1zaWRlIHByb2Nlc3NpbmdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICAgICAgLy8gQ29yZSBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMudGFibGVJZCA9IGNvbmZpZy50YWJsZUlkO1xuICAgICAgICB0aGlzLmFwaU1vZHVsZSA9IGNvbmZpZy5hcGlNb2R1bGU7XG4gICAgICAgIHRoaXMucm91dGVQcmVmaXggPSBjb25maWcucm91dGVQcmVmaXg7XG4gICAgICAgIHRoaXMudHJhbnNsYXRpb25zID0gY29uZmlnLnRyYW5zbGF0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpcy5jb2x1bW5zID0gY29uZmlnLmNvbHVtbnMgfHwgW107XG4gICAgICAgIHRoaXMuc2hvd1N1Y2Nlc3NNZXNzYWdlcyA9IGNvbmZpZy5zaG93U3VjY2Vzc01lc3NhZ2VzIHx8IGZhbHNlO1xuICAgICAgICB0aGlzLnNob3dJbmZvID0gY29uZmlnLnNob3dJbmZvIHx8IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU29ydGluZyBjb25maWd1cmF0aW9uIChiYWNrd2FyZCBjb21wYXRpYmxlKVxuICAgICAgICB0aGlzLm9yZGVyYWJsZSA9IGNvbmZpZy5vcmRlcmFibGUgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5vcmRlcmFibGUgOiB0cnVlO1xuICAgICAgICB0aGlzLmVuYWJsZVNlYXJjaEluZGV4ID0gY29uZmlnLmVuYWJsZVNlYXJjaEluZGV4ICE9PSBmYWxzZTsgLy8gRGVmYXVsdCB0cnVlXG4gICAgICAgIC8vIEFkanVzdCBkZWZhdWx0IHNvcnQgb3JkZXIgaWYgc2VhcmNoX2luZGV4IGlzIGFkZGVkIChpdCB3aWxsIGJlIGNvbHVtbiAwKVxuICAgICAgICB0aGlzLm9yZGVyID0gY29uZmlnLm9yZGVyIHx8ICh0aGlzLmVuYWJsZVNlYXJjaEluZGV4ID8gW1sxLCAnYXNjJ11dIDogW1swLCAnYXNjJ11dKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBlcm1pc3Npb24gc3RhdGUgKGxvYWRlZCBmcm9tIHNlcnZlcilcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IHtcbiAgICAgICAgICAgIHNhdmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9kaWZ5OiBmYWxzZSxcbiAgICAgICAgICAgIGVkaXQ6IGZhbHNlLFxuICAgICAgICAgICAgZGVsZXRlOiBmYWxzZSxcbiAgICAgICAgICAgIGNvcHk6IGZhbHNlLFxuICAgICAgICAgICAgY3VzdG9tOiB7fVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWN0aW9uIGJ1dHRvbnMgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmFjdGlvbkJ1dHRvbnMgPSBjb25maWcuYWN0aW9uQnV0dG9ucyB8fCBbJ2VkaXQnLCAnZGVsZXRlJ107XG4gICAgICAgIHRoaXMuY3VzdG9tQWN0aW9uQnV0dG9ucyA9IGNvbmZpZy5jdXN0b21BY3Rpb25CdXR0b25zIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzY3JpcHRpb24gdHJ1bmNhdGlvbiBzZXR0aW5nc1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIG1heExpbmVzOiAzLFxuICAgICAgICAgICAgZHluYW1pY0hlaWdodDogZmFsc2UsXG4gICAgICAgICAgICBjYWxjdWxhdGVMaW5lczogbnVsbFxuICAgICAgICB9LCBjb25maWcuZGVzY3JpcHRpb25TZXR0aW5ncyB8fCB7fSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnRlcm5hbCBwcm9wZXJ0aWVzXG4gICAgICAgIHRoaXMuJHRhYmxlID0gJChgIyR7dGhpcy50YWJsZUlkfWApO1xuICAgICAgICB0aGlzLmRhdGFUYWJsZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gT3B0aW9uYWwgY2FsbGJhY2tzXG4gICAgICAgIHRoaXMub25EYXRhTG9hZGVkID0gY29uZmlnLm9uRGF0YUxvYWRlZDtcbiAgICAgICAgdGhpcy5vbkRyYXdDYWxsYmFjayA9IGNvbmZpZy5vbkRyYXdDYWxsYmFjaztcbiAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkID0gY29uZmlnLm9uUGVybWlzc2lvbnNMb2FkZWQ7XG4gICAgICAgIHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlciA9IGNvbmZpZy5jdXN0b21EZWxldGVIYW5kbGVyO1xuICAgICAgICB0aGlzLm9uQWZ0ZXJEZWxldGUgPSBjb25maWcub25BZnRlckRlbGV0ZTtcbiAgICAgICAgdGhpcy5nZXRNb2RpZnlVcmwgPSBjb25maWcuZ2V0TW9kaWZ5VXJsO1xuICAgICAgICB0aGlzLmFqYXhEYXRhID0gY29uZmlnLmFqYXhEYXRhIHx8IHt9O1xuICAgICAgICB0aGlzLnNlcnZlclNpZGUgPSBjb25maWcuc2VydmVyU2lkZSB8fCBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlIHdpdGggcGVybWlzc2lvbiBsb2FkaW5nXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFNob3cgbG9hZGVyIHdoaWxlIGluaXRpYWxpemluZ1xuICAgICAgICAgICAgdGhpcy5zaG93TG9hZGVyKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpcnN0LCBsb2FkIHBlcm1pc3Npb25zIGZyb20gc2VydmVyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRQZXJtaXNzaW9ucygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIERhdGFUYWJsZSAod2lsbCBoYW5kbGUgbG9hZGVyL2VtcHR5IHN0YXRlIGluIGRhdGEgY2FsbGJhY2spXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIFBieERhdGFUYWJsZUluZGV4OicsIGVycm9yKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JJbml0aWFsaXppbmdUYWJsZSB8fCAnRmFpbGVkIHRvIGluaXRpYWxpemUgdGFibGUnKTtcbiAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcGVybWlzc2lvbnMgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBhc3luYyBsb2FkUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWFjbC9jaGVja1Blcm1pc3Npb25zYCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogdGhpcy5yb3V0ZVByZWZpeFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMucGVybWlzc2lvbnMsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uUGVybWlzc2lvbnNMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkKHRoaXMucGVybWlzc2lvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGxvYWQgcGVybWlzc2lvbnMsIHVzaW5nIGRlZmF1bHRzOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIE9uIGVycm9yLCBkZWZhdWx0IHRvIG5vIHBlcm1pc3Npb25zIGZvciBzYWZldHlcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIGNvbW1vbiBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgLy8gQWRkIHRoZSBkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQgY2xhc3MgdG8gdGhlIHRhYmxlXG4gICAgICAgIHRoaXMuJHRhYmxlLmFkZENsYXNzKCdkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBtaXNzaW5nIGhlYWRlciBjZWxscyBpZiBuZWVkZWQgZm9yIHNlYXJjaF9pbmRleCBjb2x1bW5cbiAgICAgICAgdGhpcy5lbnN1cmVIZWFkZXJDZWxscygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJvY2Vzc2VkQ29sdW1ucyA9IHRoaXMucHJvY2Vzc0NvbHVtbnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHYzIEFQSSBmb3JtYXQgd2l0aCBnZXRMaXN0IG1ldGhvZFxuICAgICAgICBsZXQgYWpheENvbmZpZztcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5hcGlNb2R1bGUuZ2V0TGlzdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gdjMgZm9ybWF0IHdpdGggZ2V0TGlzdCBtZXRob2QgLSB1c2UgY3VzdG9tIGFqYXggZnVuY3Rpb25cbiAgICAgICAgICAgIGFqYXhDb25maWcgPSAoZGF0YSwgY2FsbGJhY2ssIHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGlNb2R1bGUuZ2V0TGlzdCh0aGlzLmFqYXhEYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc2VkRGF0YSA9IHRoaXMuaGFuZGxlRGF0YUxvYWQocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBwcm9jZXNzZWREYXRhXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBtb2R1bGUgZG9lcyBub3QgaGF2ZSBnZXRMaXN0IG1ldGhvZCcpO1xuICAgICAgICAgICAgYWpheENvbmZpZyA9IHtkYXRhOiBbXX07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgICAgICAgIGFqYXg6IGFqYXhDb25maWcsXG4gICAgICAgICAgICBjb2x1bW5zOiBwcm9jZXNzZWRDb2x1bW5zLFxuICAgICAgICAgICAgb3JkZXI6IHRoaXMub3JkZXIsXG4gICAgICAgICAgICBvcmRlcmluZzogdGhpcy5vcmRlcmFibGUsXG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IHRoaXMuc2hvd0luZm8sXG4gICAgICAgICAgICBhdXRvV2lkdGg6IGZhbHNlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjazogKCkgPT4gdGhpcy5oYW5kbGVEcmF3Q2FsbGJhY2soKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB0aGlzLiR0YWJsZS5EYXRhVGFibGUoY29uZmlnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGVsZXRlSGFuZGxlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDb3B5SGFuZGxlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDdXN0b21IYW5kbGVycygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGNvbHVtbiBkZWZpbml0aW9ucyBhbmQgYWRkIGFjdGlvbiBjb2x1bW4gaWYgbmVlZGVkXG4gICAgICovXG4gICAgcHJvY2Vzc0NvbHVtbnMoKSB7XG4gICAgICAgIGNvbnN0IGNvbHVtbnMgPSBbLi4udGhpcy5jb2x1bW5zXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoaWRkZW4gc2VhcmNoX2luZGV4IGNvbHVtbiBhdCB0aGUgYmVnaW5uaW5nIGlmIGVuYWJsZWQgYW5kIG5vdCBwcmVzZW50XG4gICAgICAgIC8vIFRoaXMgY29sdW1uIGNvbnRhaW5zIGFsbCBzZWFyY2hhYmxlIHRleHQgd2l0aG91dCBIVE1MIGZvcm1hdHRpbmdcbiAgICAgICAgaWYgKHRoaXMuZW5hYmxlU2VhcmNoSW5kZXggJiYgIWNvbHVtbnMuZmluZChjb2wgPT4gY29sLmRhdGEgPT09ICdzZWFyY2hfaW5kZXgnKSkge1xuICAgICAgICAgICAgY29sdW1ucy51bnNoaWZ0KHtcbiAgICAgICAgICAgICAgICBkYXRhOiAnc2VhcmNoX2luZGV4JyxcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGVmYXVsdENvbnRlbnQ6ICcnLFxuICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHNlYXJjaF9pbmRleCBpcyBub3QgcHJvdmlkZWQgYnkgYmFja2VuZCwgZ2VuZXJhdGUgaXQgZnJvbSByb3cgZGF0YVxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBnZW5lcmF0ZSBzZWFyY2ggaW5kZXggZnJvbSB2aXNpYmxlIGZpZWxkc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hhYmxlRmllbGRzID0gW107XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHJvdykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBpbnRlcm5hbCBmaWVsZHMgYW5kIHJlcHJlc2VudCBmaWVsZHMgKHRoZXkncmUgb2Z0ZW4gZHVwbGljYXRlcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgIT09ICdzZWFyY2hfaW5kZXgnICYmIGtleSAhPT0gJ2lkJyAmJiBrZXkgIT09ICd1bmlxaWQnICYmIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSAhPT0gJ0RUX1Jvd0lkJyAmJiAha2V5LmVuZHNXaXRoKCdfcmVwcmVzZW50JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHJvd1trZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0cmlwIEhUTUwgdGFncyBhbmQgYWRkIHRvIHNlYXJjaGFibGUgZmllbGRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuVmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC88W14+XSo+L2csICcnKS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGVhblZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlRmllbGRzLnB1c2goY2xlYW5WYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZUZpZWxkcy5wdXNoKHZhbHVlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFsc28gcHJvY2VzcyBfcmVwcmVzZW50IGZpZWxkcyBhcyB0aGV5IGNvbnRhaW4gdXNlci1mcmllbmRseSB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHJvdykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5lbmRzV2l0aCgnX3JlcHJlc2VudCcpICYmIHJvd1trZXldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xlYW5WYWx1ZSA9IFN0cmluZyhyb3dba2V5XSkucmVwbGFjZSgvPFtePl0qPi9nLCAnJykudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGVhblZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGVGaWVsZHMucHVzaChjbGVhblZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VhcmNoYWJsZUZpZWxkcy5qb2luKCcgJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgc29ydGluZyBpcyBnbG9iYWxseSBkaXNhYmxlZCwgZW5zdXJlIGFsbCBjb2x1bW5zIHJlc3BlY3QgaXRcbiAgICAgICAgaWYgKCF0aGlzLm9yZGVyYWJsZSkge1xuICAgICAgICAgICAgY29sdW1ucy5mb3JFYWNoKGNvbCA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUHJlc2VydmUgZXhwbGljaXQgb3JkZXJhYmxlOiBmYWxzZSwgYnV0IG92ZXJyaWRlIHRydWUgb3IgdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgaWYgKGNvbC5vcmRlcmFibGUgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbC5vcmRlcmFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0YW5kYXJkIGFjdGlvbiBjb2x1bW4gaWYgbm90IGFscmVhZHkgcHJlc2VudFxuICAgICAgICBpZiAoIWNvbHVtbnMuZmluZChjb2wgPT4gY29sLmlzQWN0aW9uQ29sdW1uKSkge1xuICAgICAgICAgICAgY29sdW1ucy5wdXNoKHRoaXMuY3JlYXRlQWN0aW9uQ29sdW1uKCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY29sdW1ucztcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHN0YW5kYXJkIGFjdGlvbiBjb2x1bW4gd2l0aCBwZXJtaXNzaW9uLWJhc2VkIHJlbmRlcmluZ1xuICAgICAqL1xuICAgIGNyZWF0ZUFjdGlvbkNvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBjbGFzc05hbWU6ICdyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmcnLFxuICAgICAgICAgICAgaXNBY3Rpb25Db2x1bW46IHRydWUsXG4gICAgICAgICAgICByZW5kZXI6IChkYXRhLCB0eXBlLCByb3cpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBidXR0b25zID0gW107XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSByZWNvcmQgSUQgLSBjaGVjayBmb3IgYm90aCB1bmlxaWQgYW5kIGlkIGZpZWxkc1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gcm93LnVuaXFpZCB8fCByb3cuaWQgfHwgJyc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRWRpdCBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdlZGl0JykgJiYgXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLnBlcm1pc3Npb25zLm1vZGlmeSB8fCB0aGlzLnBlcm1pc3Npb25zLmVkaXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgY3VzdG9tIGdldE1vZGlmeVVybCBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsID8gXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdldE1vZGlmeVVybChyZWNvcmRJZCkgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvJHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke21vZGlmeVVybH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGVkaXQgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGVkaXQgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uQnV0dG9ucy5pbmNsdWRlcygnY29weScpICYmIHRoaXMucGVybWlzc2lvbnMuY29weSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke3JlY29yZElkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBjb3B5IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBjb3B5IG91dGxpbmUgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEN1c3RvbSBidXR0b25zXG4gICAgICAgICAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zLmZvckVhY2goY3VzdG9tQnV0dG9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvbnMuY3VzdG9tICYmIHRoaXMucGVybWlzc2lvbnMuY3VzdG9tW2N1c3RvbUJ1dHRvbi5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaHJlZiA9IGN1c3RvbUJ1dHRvbi5ocmVmIHx8ICcjJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFWYWx1ZSA9IGN1c3RvbUJ1dHRvbi5pbmNsdWRlSWQgPyBgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCJgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2hyZWZ9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtkYXRhVmFsdWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gJHtjdXN0b21CdXR0b24uY2xhc3N9IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChjdXN0b21CdXR0b24udG9vbHRpcCl9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtjdXN0b21CdXR0b24uaWNvbn1cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBEZWxldGUgYnV0dG9uIChhbHdheXMgbGFzdClcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdkZWxldGUnKSAmJiB0aGlzLnBlcm1pc3Npb25zLmRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke3JlY29yZElkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlIHR3by1zdGVwcy1kZWxldGUgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1dHRvbnMubGVuZ3RoID4gMCA/IFxuICAgICAgICAgICAgICAgICAgICBgPGRpdiBjbGFzcz1cInVpIHRpbnkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+JHtidXR0b25zLmpvaW4oJycpfTwvZGl2PmAgOiBcbiAgICAgICAgICAgICAgICAgICAgJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBkYXRhIGxvYWQgYW5kIGVtcHR5IHN0YXRlIG1hbmFnZW1lbnRcbiAgICAgKiB2MyBBUEkgZm9ybWF0OiB7cmVzdWx0OiBib29sZWFuLCBkYXRhOiBhcnJheX0gb3Ige2RhdGE6IHtpdGVtczogYXJyYXl9fVxuICAgICAqL1xuICAgIGhhbmRsZURhdGFMb2FkKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIEhpZGUgbG9hZGVyIGZpcnN0XG4gICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICBcbiAgICAgICAgbGV0IGRhdGEgPSBbXTtcbiAgICAgICAgbGV0IGlzU3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGVycm9yIHJlc3BvbnNlXG4gICAgICAgIGlmICghcmVzcG9uc2UgfHwgcmVzcG9uc2UucmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgaXNTdWNjZXNzID0gZmFsc2U7XG4gICAgICAgICAgICBkYXRhID0gW107XG4gICAgICAgIH1cbiAgICAgICAgLy8gU3RhbmRhcmQgdjMgZm9ybWF0IHdpdGggZGF0YSBhcnJheVxuICAgICAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICBpc1N1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdjMgZm9ybWF0IHdpdGggaXRlbXMgcHJvcGVydHlcbiAgICAgICAgZWxzZSBpZiAocmVzcG9uc2UuZGF0YSAmJiBBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEuaXRlbXMpKSB7XG4gICAgICAgICAgICBpc1N1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgZGF0YSA9IHJlc3BvbnNlLmRhdGEuaXRlbXM7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmFsbGJhY2sgZm9yIHJlc3BvbnNlcyB3aXRoIHJlc3VsdDp0cnVlIGJ1dCBubyBkYXRhXG4gICAgICAgIGVsc2UgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaXNTdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgIGRhdGEgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgaXNFbXB0eSA9ICFpc1N1Y2Nlc3MgfHwgZGF0YS5sZW5ndGggPT09IDA7XG4gICAgICAgIHRoaXMudG9nZ2xlRW1wdHlQbGFjZWhvbGRlcihpc0VtcHR5KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0VtcHR5ICYmICFpc1N1Y2Nlc3MpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JMb2FkaW5nRGF0YSB8fCAnRmFpbGVkIHRvIGxvYWQgZGF0YScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vbkRhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgIC8vIFBhc3Mgbm9ybWFsaXplZCByZXNwb25zZSB0byBjYWxsYmFja1xuICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgICAgIHJlc3VsdDogaXNTdWNjZXNzLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLm9uRGF0YUxvYWRlZChub3JtYWxpemVkUmVzcG9uc2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRyYXcgY2FsbGJhY2sgZm9yIHBvc3QtcmVuZGVyIG9wZXJhdGlvbnNcbiAgICAgKi9cbiAgICBoYW5kbGVEcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgcG9wdXBzXG4gICAgICAgIHRoaXMuJHRhYmxlLmZpbmQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1vdmUgQWRkIE5ldyBidXR0b24gdG8gRGF0YVRhYmxlcyB3cmFwcGVyXG4gICAgICAgIHRoaXMucmVwb3NpdGlvbkFkZEJ1dHRvbigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZWRpdGluZ1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEN1c3RvbSBkcmF3IGNhbGxiYWNrXG4gICAgICAgIGlmICh0aGlzLm9uRHJhd0NhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLm9uRHJhd0NhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogRW5zdXJlIHRhYmxlIGhhcyBlbm91Z2ggaGVhZGVyIGNlbGxzIGZvciBhbGwgY29sdW1uc1xuICAgICAqIFRoaXMgaXMgbmVlZGVkIHdoZW4gd2UgYWRkIHRoZSBoaWRkZW4gc2VhcmNoX2luZGV4IGNvbHVtbiBwcm9ncmFtbWF0aWNhbGx5XG4gICAgICovXG4gICAgZW5zdXJlSGVhZGVyQ2VsbHMoKSB7XG4gICAgICAgIGlmICghdGhpcy5lbmFibGVTZWFyY2hJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkdGhlYWQgPSB0aGlzLiR0YWJsZS5maW5kKCd0aGVhZCcpO1xuICAgICAgICBpZiAoISR0aGVhZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSB0aGVhZCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICB0aGlzLiR0YWJsZS5wcmVwZW5kKCc8dGhlYWQ+PHRyPjwvdHI+PC90aGVhZD4nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgJGhlYWRlclJvdyA9IHRoaXMuJHRhYmxlLmZpbmQoJ3RoZWFkIHRyJykuZmlyc3QoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBhIGhpZGRlbiBoZWFkZXIgY2VsbCBhdCB0aGUgYmVnaW5uaW5nIGZvciBzZWFyY2hfaW5kZXhcbiAgICAgICAgLy8gRGF0YVRhYmxlcyByZXF1aXJlcyBtYXRjaGluZyBudW1iZXIgb2YgdGggZWxlbWVudHMgYW5kIGNvbHVtbnNcbiAgICAgICAgJGhlYWRlclJvdy5wcmVwZW5kKCc8dGggc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+U2VhcmNoIEluZGV4PC90aD4nKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUmVwb3NpdGlvbiBBZGQgTmV3IGJ1dHRvbiB0byBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgKi9cbiAgICByZXBvc2l0aW9uQWRkQnV0dG9uKCkge1xuICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gJChgIyR7dGhpcy50YWJsZUlkfV93cmFwcGVyYCk7XG4gICAgICAgIGNvbnN0ICRsZWZ0Q29sdW1uID0gJHdyYXBwZXIuZmluZCgnLmVpZ2h0LndpZGUuY29sdW1uJykuZmlyc3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkYWRkQnV0dG9uLmxlbmd0aCAmJiAkbGVmdENvbHVtbi5sZW5ndGggJiYgdGhpcy5wZXJtaXNzaW9ucy5zYXZlKSB7XG4gICAgICAgICAgICAkbGVmdENvbHVtbi5hcHBlbmQoJGFkZEJ1dHRvbik7XG4gICAgICAgICAgICAkYWRkQnV0dG9uLnNob3coKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRlbGV0ZSBoYW5kbGVyIHdpdGggdHdvLXN0ZXAgY29uZmlybWF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICAgIC8vIERlbGV0ZVNvbWV0aGluZy5qcyBoYW5kbGVzIGZpcnN0IGNsaWNrXG4gICAgICAgIC8vIFdlIGhhbmRsZSBzZWNvbmQgY2xpY2sgd2hlbiB0d28tc3RlcHMtZGVsZXRlIGNsYXNzIGlzIHJlbW92ZWRcbiAgICAgICAgdGhpcy4kdGFibGUub24oJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aGlzLmN1c3RvbURlbGV0ZUhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1c3RvbURlbGV0ZUhhbmRsZXIocmVjb3JkSWQsIChyZXNwb25zZSkgPT4gdGhpcy5jYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBpTW9kdWxlLmRlbGV0ZVJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB0aGlzLmNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY29weSBoYW5kbGVyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNvcHlIYW5kbGVyKCkge1xuICAgICAgICB0aGlzLiR0YWJsZS5vbignY2xpY2snLCAnYS5jb3B5JywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIHNhbWUgbG9naWMgYXMgbW9kaWZ5IFVSTCBidXQgYWRkIGNvcHkgcGFyYW1ldGVyXG4gICAgICAgICAgICBsZXQgY29weVVybDtcbiAgICAgICAgICAgIGlmICh0aGlzLmdldE1vZGlmeVVybCkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gZ2V0TW9kaWZ5VXJsIGFuZCBhZGQgY29weSBwYXJhbWV0ZXJcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RpZnlVcmwgPSB0aGlzLmdldE1vZGlmeVVybChyZWNvcmRJZCk7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGlmeVVybCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgcmVjb3JkSWQgZnJvbSBVUkwgYW5kIGFkZCBjb3B5IHBhcmFtZXRlclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlVXJsID0gbW9kaWZ5VXJsLnJlcGxhY2UoYC8ke3JlY29yZElkfWAsICcnKTtcbiAgICAgICAgICAgICAgICAgICAgY29weVVybCA9IGAke2Jhc2VVcmx9Lz9jb3B5PSR7cmVjb3JkSWR9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgVVJMIHBhdHRlcm5cbiAgICAgICAgICAgICAgICBjb3B5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH0ke3RoaXMucm91dGVQcmVmaXh9L21vZGlmeS8/Y29weT0ke3JlY29yZElkfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIGNvcHkgVVJMXG4gICAgICAgICAgICBpZiAoY29weVVybCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGNvcHlVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGN1c3RvbSBidXR0b24gaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ3VzdG9tSGFuZGxlcnMoKSB7XG4gICAgICAgIHRoaXMuY3VzdG9tQWN0aW9uQnV0dG9ucy5mb3JFYWNoKGN1c3RvbUJ1dHRvbiA9PiB7XG4gICAgICAgICAgICBpZiAoY3VzdG9tQnV0dG9uLm9uQ2xpY2spIHtcbiAgICAgICAgICAgICAgICB0aGlzLiR0YWJsZS5vbignY2xpY2snLCBgYS4ke2N1c3RvbUJ1dHRvbi5jbGFzc31gLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tQnV0dG9uLm9uQ2xpY2socmVjb3JkSWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgcmVjb3JkIGRlbGV0aW9uXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgdGFibGUgZGF0YSB3aXRoIGNhbGxiYWNrIHN1cHBvcnRcbiAgICAgICAgICAgIGNvbnN0IHJlbG9hZENhbGxiYWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENhbGwgY3VzdG9tIGFmdGVyLWRlbGV0ZSBjYWxsYmFjayBpZiBwcm92aWRlZFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5vbkFmdGVyRGVsZXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25BZnRlckRlbGV0ZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVsb2FkIHRhYmxlIGFuZCBleGVjdXRlIGNhbGxiYWNrXG4gICAgICAgICAgICB0aGlzLmRhdGFUYWJsZS5hamF4LnJlbG9hZChyZWxvYWRDYWxsYmFjaywgZmFsc2UpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVsYXRlZCBjb21wb25lbnRzXG4gICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbnMgIT09ICd1bmRlZmluZWQnICYmIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3VjY2VzcyBtZXNzYWdlIHJlbW92ZWQgLSBubyBuZWVkIHRvIHNob3cgc3VjY2VzcyBmb3IgZGVsZXRpb24gb3BlcmF0aW9uc1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJhbnNsYXRpb25zLmRlbGV0ZUVycm9yIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvRGVsZXRlUmVjb3JkO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlIGZyb20gYWxsIGRlbGV0ZSBidXR0b25zXG4gICAgICAgIHRoaXMuJHRhYmxlLmZpbmQoJ2EuZGVsZXRlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkZXIgd2hpbGUgbG9hZGluZyBkYXRhXG4gICAgICovXG4gICAgc2hvd0xvYWRlcigpIHtcbiAgICAgICAgLy8gSGlkZSBldmVyeXRoaW5nIGZpcnN0XG4gICAgICAgIC8vIEZpbmQgdGhlIHRhYmxlJ3MgcGFyZW50IGNvbnRhaW5lciAtIG5lZWQgdGhlIG9yaWdpbmFsIGNvbnRhaW5lciwgbm90IHRoZSBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgY29uc3QgJHdyYXBwZXIgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCdkaXZbaWQkPVwiX3dyYXBwZXJcIl0nKTtcbiAgICAgICAgbGV0ICRjb250YWluZXI7XG4gICAgICAgIGlmICgkd3JhcHBlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgcGFyZW50IG9mIHRoZSB3cmFwcGVyIChzaG91bGQgYmUgdGhlIG9yaWdpbmFsIGNvbnRhaW5lcilcbiAgICAgICAgICAgICRjb250YWluZXIgPSAkd3JhcHBlci5wYXJlbnQoJ2RpdltpZF0nKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGYWxsYmFjayBpZiBzdHJ1Y3R1cmUgaXMgZGlmZmVyZW50XG4gICAgICAgIGlmICghJGNvbnRhaW5lciB8fCAhJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICRjb250YWluZXIgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCdkaXZbaWRdOm5vdChbaWQkPVwiX3dyYXBwZXJcIl0pJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgJHBsYWNlaG9sZGVyID0gJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJyk7XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgXG4gICAgICAgICRjb250YWluZXIuaGlkZSgpO1xuICAgICAgICAkcGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAkYWRkQnV0dG9uLmhpZGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBhbmQgc2hvdyBsb2FkZXIgaWYgbm90IGV4aXN0c1xuICAgICAgICBsZXQgJGxvYWRlciA9ICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpO1xuICAgICAgICBpZiAoISRsb2FkZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBzZWdtZW50IHdpdGggbG9hZGVyIGZvciBiZXR0ZXIgdmlzdWFsIGFwcGVhcmFuY2VcbiAgICAgICAgICAgICRsb2FkZXIgPSAkKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVwidGFibGUtZGF0YS1sb2FkZXJcIiBjbGFzcz1cInVpIHNlZ21lbnRcIiBzdHlsZT1cIm1pbi1oZWlnaHQ6IDIwMHB4OyBwb3NpdGlvbjogcmVsYXRpdmU7XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3RpdmUgaW52ZXJ0ZWQgZGltbWVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dCBsb2FkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leF9Mb2FkaW5nRGF0YSB8fCAnTG9hZGluZy4uLid9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAvLyBJbnNlcnQgbG9hZGVyIGluIHRoZSBhcHByb3ByaWF0ZSBwbGFjZVxuICAgICAgICAgICAgaWYgKCRjb250YWluZXIubGVuZ3RoICYmICRjb250YWluZXIucGFyZW50KCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5iZWZvcmUoJGxvYWRlcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGggJiYgJHBsYWNlaG9sZGVyLnBhcmVudCgpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5iZWZvcmUoJGxvYWRlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBhcHBlbmQgdG8gYm9keSBvciBwYXJlbnQgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgY29uc3QgJHBhcmVudCA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJy5wdXNoZXInKSB8fCB0aGlzLiR0YWJsZS5wYXJlbnQoKTtcbiAgICAgICAgICAgICAgICAkcGFyZW50LmFwcGVuZCgkbG9hZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkbG9hZGVyLnNob3coKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBsb2FkZXJcbiAgICAgKi9cbiAgICBoaWRlTG9hZGVyKCkge1xuICAgICAgICAkKCcjdGFibGUtZGF0YS1sb2FkZXInKS5oaWRlKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBlbXB0eSB0YWJsZSBwbGFjZWhvbGRlciB2aXNpYmlsaXR5XG4gICAgICovXG4gICAgdG9nZ2xlRW1wdHlQbGFjZWhvbGRlcihpc0VtcHR5KSB7XG4gICAgICAgIC8vIEZpbmQgdGhlIHRhYmxlJ3MgcGFyZW50IGNvbnRhaW5lciAtIG5lZWQgdGhlIG9yaWdpbmFsIGNvbnRhaW5lciwgbm90IHRoZSBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgLy8gRGF0YVRhYmxlcyB3cmFwcyB0aGUgdGFibGUgaW4gYSBkaXYgd2l0aCBpZCBlbmRpbmcgaW4gJ193cmFwcGVyJ1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGZpbmQgdGhlIHBhcmVudCBvZiB0aGF0IHdyYXBwZXIgd2hpY2ggaXMgdGhlIG9yaWdpbmFsIGNvbnRhaW5lclxuICAgICAgICBjb25zdCAkd3JhcHBlciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZCQ9XCJfd3JhcHBlclwiXScpO1xuICAgICAgICBsZXQgJGNvbnRhaW5lcjtcbiAgICAgICAgaWYgKCR3cmFwcGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBwYXJlbnQgb2YgdGhlIHdyYXBwZXIgKHNob3VsZCBiZSB0aGUgb3JpZ2luYWwgY29udGFpbmVyKVxuICAgICAgICAgICAgJGNvbnRhaW5lciA9ICR3cmFwcGVyLnBhcmVudCgnZGl2W2lkXScpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZhbGxiYWNrIGlmIHN0cnVjdHVyZSBpcyBkaWZmZXJlbnRcbiAgICAgICAgaWYgKCEkY29udGFpbmVyIHx8ICEkY29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgJGNvbnRhaW5lciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZF06bm90KFtpZCQ9XCJfd3JhcHBlclwiXSknKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRwbGFjZWhvbGRlciA9ICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRW1wdHkpIHtcbiAgICAgICAgICAgICRjb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgJGFkZEJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgcGxhY2Vob2xkZXIgaXMgdmlzaWJsZVxuICAgICAgICAgICAgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkcGxhY2Vob2xkZXIuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkcGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvbnMuc2F2ZSkge1xuICAgICAgICAgICAgICAgICRhZGRCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGNvbnRhaW5lci5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgKiBFeGNsdWRlcyBhY3Rpb24gYnV0dG9uIGNlbGxzIHRvIGF2b2lkIGNvbmZsaWN0c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKSB7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9uKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmRhdGFUYWJsZS5yb3coZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCk7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHJlY29yZCBJRCAtIGNoZWNrIGZvciBib3RoIHVuaXFpZCBhbmQgaWQgZmllbGRzXG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9IGRhdGEgJiYgKGRhdGEudW5pcWlkIHx8IGRhdGEuaWQpO1xuICAgICAgICAgICAgaWYgKHJlY29yZElkICYmICh0aGlzLnBlcm1pc3Npb25zLm1vZGlmeSB8fCB0aGlzLnBlcm1pc3Npb25zLmVkaXQpKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBnZXRNb2RpZnlVcmwgaWYgcHJvdmlkZWQsIG90aGVyd2lzZSB1c2UgZGVmYXVsdFxuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsID8gXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0TW9kaWZ5VXJsKHJlY29yZElkKSA6IFxuICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxSb290VXJsfSR7dGhpcy5yb3V0ZVByZWZpeH0vbW9kaWZ5LyR7cmVjb3JkSWR9YDtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBtb2RpZnlVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSB1bmlmaWVkIGRlc2NyaXB0aW9uIHJlbmRlcmVyIHdpdGggdHJ1bmNhdGlvbiBzdXBwb3J0XG4gICAgICogXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZW5kZXJlciBmdW5jdGlvbiBmb3IgRGF0YVRhYmxlc1xuICAgICAqL1xuICAgIGNyZWF0ZURlc2NyaXB0aW9uUmVuZGVyZXIoKSB7XG4gICAgICAgIHJldHVybiAoZGF0YSwgdHlwZSwgcm93KSA9PiB7XG4gICAgICAgICAgICBpZiAoIWRhdGEgfHwgZGF0YS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICfigJQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Rpc3BsYXknKSB7XG4gICAgICAgICAgICAgICAgLy8gRXNjYXBlIEhUTUwgdG8gcHJldmVudCBYU1NcbiAgICAgICAgICAgICAgICBjb25zdCBzYWZlRGVzYyA9IHdpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRpb25MaW5lcyA9IHNhZmVEZXNjLnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKSAhPT0gJycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBtYXggbGluZXNcbiAgICAgICAgICAgICAgICBsZXQgbWF4TGluZXMgPSB0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MubWF4TGluZXM7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5keW5hbWljSGVpZ2h0ICYmIHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5jYWxjdWxhdGVMaW5lcykge1xuICAgICAgICAgICAgICAgICAgICBtYXhMaW5lcyA9IHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5jYWxjdWxhdGVMaW5lcyhyb3cpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZGVzY3JpcHRpb25MaW5lcy5sZW5ndGggPD0gbWF4TGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVzY3JpcHRpb24gZml0cyAtIHNob3cgd2l0aCBwcmVzZXJ2ZWQgZm9ybWF0dGluZ1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREZXNjID0gZGVzY3JpcHRpb25MaW5lcy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uLXRleHRcIiBzdHlsZT1cImxpbmUtaGVpZ2h0OiAxLjM7XCI+JHtmb3JtYXR0ZWREZXNjfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVzY3JpcHRpb24gdG9vIGxvbmcgLSB0cnVuY2F0ZSB3aXRoIHBvcHVwXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpc2libGVMaW5lcyA9IGRlc2NyaXB0aW9uTGluZXMuc2xpY2UoMCwgbWF4TGluZXMpO1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlTGluZXNbbWF4TGluZXMgLSAxXSArPSAnLi4uJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZERlc2MgPSB2aXNpYmxlTGluZXMuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsRGVzYyA9IGRlc2NyaXB0aW9uTGluZXMuam9pbignXFxuJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvbi10ZXh0IHRydW5jYXRlZCBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtmdWxsRGVzY31cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBvc2l0aW9uPVwidG9wIHJpZ2h0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJ3aWRlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogaGVscDsgYm9yZGVyLWJvdHRvbTogMXB4IGRvdHRlZCAjOTk5OyBsaW5lLWhlaWdodDogMS4zO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHt0cnVuY2F0ZWREZXNjfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIHNlYXJjaCBhbmQgb3RoZXIgb3BlcmF0aW9ucywgcmV0dXJuIHBsYWluIHRleHRcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IHRoZSBEYXRhVGFibGUgYW5kIGNsZWFudXBcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBSZW1vdmUgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJyk7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9mZignY2xpY2snLCAnYS5jb3B5Jyk7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9mZignZGJsY2xpY2snLCAndGJvZHkgdGQ6bm90KC5yaWdodC5hbGlnbmVkKScpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBEYXRhVGFibGUgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0aGlzLmRhdGFUYWJsZSAmJiB0eXBlb2YgdGhpcy5kYXRhVGFibGUuZGVzdHJveSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhpcy5kYXRhVGFibGUuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGVyXG4gICAgICAgICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpLnJlbW92ZSgpO1xuICAgIH1cbn1cblxuLy8gTWFrZSBhdmFpbGFibGUgZ2xvYmFsbHlcbndpbmRvdy5QYnhEYXRhVGFibGVJbmRleCA9IFBieERhdGFUYWJsZUluZGV4OyJdfQ==