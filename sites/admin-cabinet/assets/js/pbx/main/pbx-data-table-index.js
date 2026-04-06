"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

/* global globalRootUrl, SemanticLocalization, globalTranslate, UserMessage, ExtensionsAPI, SecurityUtils */

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
   * @param {Function} [config.customDeletePermissionCheck] - Function to check if delete is allowed for a row
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
    this.showInfo = config.showInfo || false;
    this.dataTableOptions = config.dataTableOptions || {}; // Sorting configuration (backward compatible)

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
    this.customDeletePermissionCheck = config.customDeletePermissionCheck;
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
        UserMessage.showError(globalTranslate.ex_ErrorInitializingTable);
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

      var config = _objectSpread({
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
      }, this.dataTableOptions);

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
            // Check if custom delete permission check is needed
            var canDelete = true;

            if (_this2.customDeletePermissionCheck && typeof _this2.customDeletePermissionCheck === 'function') {
              canDelete = _this2.customDeletePermissionCheck(row);
            }

            if (canDelete) {
              buttons.push("\n                            <a href=\"#\"\n                               data-value=\"".concat(recordId, "\"\n                               class=\"ui button delete two-steps-delete popuped\"\n                               data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                                <i class=\"icon trash red\"></i>\n                            </a>\n                        "));
            } else {
              // Show disabled delete button with explanation
              buttons.push("\n                            <a href=\"#\"\n                               class=\"ui button delete disabled popuped\"\n                               data-content=\"".concat(_this2.translations.deleteDisabledTooltip || globalTranslate.bt_CannotDelete, "\">\n                                <i class=\"icon trash grey\"></i>\n                            </a>\n                        "));
            }
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
        UserMessage.showError(globalTranslate.ex_ErrorLoadingData);
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

      this.initializeDoubleClickEdit(); // Hide pagination controls when all records fit on one page

      this.togglePaginationVisibility(); // Custom draw callback

      if (this.onDrawCallback) {
        this.onDrawCallback();
      }
    }
    /**
     * Toggle pagination visibility based on page count
     * Hides pagination when all records fit on a single page
     */

  }, {
    key: "togglePaginationVisibility",
    value: function togglePaginationVisibility() {
      var _this3 = this;

      // Use setTimeout to ensure DataTable is fully initialized
      setTimeout(function () {
        // Get the DataTable instance
        var table = _this3.$table.DataTable();

        if (table && table.page) {
          var info = table.page.info();

          var tableId = _this3.$table.attr('id');

          var $paginateContainer = $("#".concat(tableId, "_paginate"));

          if ($paginateContainer.length) {
            if (info.pages <= 1) {
              // Hide pagination when there's only one page
              $paginateContainer.hide();
            } else {
              // Show pagination when there are multiple pages
              $paginateContainer.show();
            }
          }
        }
      }, 0);
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
      var _this4 = this;

      // DeleteSomething.js handles first click
      // We handle second click when two-steps-delete class is removed
      this.$table.on('click', 'a.delete:not(.two-steps-delete)', function (e) {
        e.preventDefault();
        var $button = $(e.currentTarget);
        var recordId = $button.attr('data-value'); // Add loading state

        $button.addClass('loading disabled');

        if (_this4.customDeleteHandler) {
          _this4.customDeleteHandler(recordId, function (response) {
            return _this4.cbAfterDeleteRecord(response);
          });
        } else {
          _this4.apiModule.deleteRecord(recordId, function (response) {
            return _this4.cbAfterDeleteRecord(response);
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
      var _this5 = this;

      this.$table.on('click', 'a.copy', function (e) {
        e.preventDefault();
        var recordId = $(e.currentTarget).attr('data-value'); // Use same logic as modify URL but add copy parameter

        var copyUrl;

        if (_this5.getModifyUrl) {
          // Use custom getModifyUrl and add copy parameter
          var modifyUrl = _this5.getModifyUrl(recordId);

          if (modifyUrl) {
            // Remove recordId from URL and add copy parameter
            var baseUrl = modifyUrl.replace("/".concat(recordId), '');
            copyUrl = "".concat(baseUrl, "/?copy=").concat(recordId);
          }
        } else {
          // Default URL pattern
          copyUrl = "".concat(globalRootUrl).concat(_this5.routePrefix, "/modify/?copy=").concat(recordId);
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
      var _this6 = this;

      this.customActionButtons.forEach(function (customButton) {
        if (customButton.onClick) {
          _this6.$table.on('click', "a.".concat(customButton["class"]), function (e) {
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
      var _this7 = this;

      if (response.result === true) {
        // Reload table data with callback support
        var reloadCallback = function reloadCallback() {
          // Call custom after-delete callback if provided
          if (typeof _this7.onAfterDelete === 'function') {
            _this7.onAfterDelete(response);
          }
        }; // Reload table and execute callback


        this.dataTable.ajax.reload(reloadCallback, false); // Update related components

        if (typeof ExtensionsAPI !== 'undefined' && ExtensionsAPI.cbOnDataChanged) {
          ExtensionsAPI.cbOnDataChanged();
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
        $loader = $("\n                <div id=\"table-data-loader\" class=\"ui segment\" style=\"min-height: 200px; position: relative;\">\n                    <div class=\"ui active inverted dimmer\">\n                        <div class=\"ui text loader\">".concat(globalTranslate.ex_LoadingData, "</div>\n                    </div>\n                </div>\n            ")); // Insert loader in the appropriate place

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
      var _this8 = this;

      this.$table.on('dblclick', 'tbody td:not(.right.aligned)', function (e) {
        var data = _this8.dataTable.row(e.currentTarget).data(); // Get the record ID - check for both uniqid and id fields


        var recordId = data && (data.uniqid || data.id);

        if (recordId && (_this8.permissions.modify || _this8.permissions.edit)) {
          // Use custom getModifyUrl if provided, otherwise use default
          var modifyUrl = _this8.getModifyUrl ? _this8.getModifyUrl(recordId) : "".concat(globalRootUrl).concat(_this8.routePrefix, "/modify/").concat(recordId);
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
      var _this9 = this;

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

          var maxLines = _this9.descriptionSettings.maxLines;

          if (_this9.descriptionSettings.dynamicHeight && _this9.descriptionSettings.calculateLines) {
            maxLines = _this9.descriptionSettings.calculateLines(row);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL3BieC1kYXRhLXRhYmxlLWluZGV4LmpzIl0sIm5hbWVzIjpbIlBieERhdGFUYWJsZUluZGV4IiwiY29uZmlnIiwidGFibGVJZCIsImFwaU1vZHVsZSIsInJvdXRlUHJlZml4IiwidHJhbnNsYXRpb25zIiwiY29sdW1ucyIsInNob3dTdWNjZXNzTWVzc2FnZXMiLCJzaG93SW5mbyIsImRhdGFUYWJsZU9wdGlvbnMiLCJvcmRlcmFibGUiLCJ1bmRlZmluZWQiLCJlbmFibGVTZWFyY2hJbmRleCIsIm9yZGVyIiwicGVybWlzc2lvbnMiLCJzYXZlIiwibW9kaWZ5IiwiZWRpdCIsImNvcHkiLCJjdXN0b20iLCJhY3Rpb25CdXR0b25zIiwiY3VzdG9tQWN0aW9uQnV0dG9ucyIsImRlc2NyaXB0aW9uU2V0dGluZ3MiLCJPYmplY3QiLCJhc3NpZ24iLCJtYXhMaW5lcyIsImR5bmFtaWNIZWlnaHQiLCJjYWxjdWxhdGVMaW5lcyIsIiR0YWJsZSIsIiQiLCJkYXRhVGFibGUiLCJvbkRhdGFMb2FkZWQiLCJvbkRyYXdDYWxsYmFjayIsIm9uUGVybWlzc2lvbnNMb2FkZWQiLCJjdXN0b21EZWxldGVIYW5kbGVyIiwib25BZnRlckRlbGV0ZSIsImdldE1vZGlmeVVybCIsImN1c3RvbURlbGV0ZVBlcm1pc3Npb25DaGVjayIsImFqYXhEYXRhIiwic2VydmVyU2lkZSIsInNob3dMb2FkZXIiLCJsb2FkUGVybWlzc2lvbnMiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiZXJyb3IiLCJjb25zb2xlIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9FcnJvckluaXRpYWxpemluZ1RhYmxlIiwiaGlkZUxvYWRlciIsInRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIiLCJyZXNwb25zZSIsImFqYXgiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiZGF0YSIsImNvbnRyb2xsZXIiLCJkYXRhVHlwZSIsInN1Y2Nlc3MiLCJ3YXJuIiwiYWRkQ2xhc3MiLCJlbnN1cmVIZWFkZXJDZWxscyIsInByb2Nlc3NlZENvbHVtbnMiLCJwcm9jZXNzQ29sdW1ucyIsImFqYXhDb25maWciLCJnZXRMaXN0IiwiY2FsbGJhY2siLCJzZXR0aW5ncyIsInByb2Nlc3NlZERhdGEiLCJoYW5kbGVEYXRhTG9hZCIsIm9yZGVyaW5nIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwic2VhcmNoaW5nIiwiaW5mbyIsImF1dG9XaWR0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJkcmF3Q2FsbGJhY2siLCJoYW5kbGVEcmF3Q2FsbGJhY2siLCJEYXRhVGFibGUiLCJpbml0aWFsaXplRGVsZXRlSGFuZGxlciIsImluaXRpYWxpemVDb3B5SGFuZGxlciIsImluaXRpYWxpemVDdXN0b21IYW5kbGVycyIsImZpbmQiLCJjb2wiLCJ1bnNoaWZ0IiwidmlzaWJsZSIsInNlYXJjaGFibGUiLCJkZWZhdWx0Q29udGVudCIsInJlbmRlciIsInR5cGUiLCJyb3ciLCJzZWFyY2hhYmxlRmllbGRzIiwia2V5cyIsImZvckVhY2giLCJrZXkiLCJlbmRzV2l0aCIsInZhbHVlIiwiY2xlYW5WYWx1ZSIsInJlcGxhY2UiLCJ0cmltIiwicHVzaCIsInRvU3RyaW5nIiwiU3RyaW5nIiwiam9pbiIsInRvTG93ZXJDYXNlIiwiaXNBY3Rpb25Db2x1bW4iLCJjcmVhdGVBY3Rpb25Db2x1bW4iLCJjbGFzc05hbWUiLCJidXR0b25zIiwicmVjb3JkSWQiLCJ1bmlxaWQiLCJpZCIsImluY2x1ZGVzIiwibW9kaWZ5VXJsIiwiYnRfVG9vbFRpcEVkaXQiLCJidF9Ub29sVGlwQ29weSIsImN1c3RvbUJ1dHRvbiIsIm5hbWUiLCJocmVmIiwiZGF0YVZhbHVlIiwiaW5jbHVkZUlkIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJ0b29sdGlwIiwiaWNvbiIsImNhbkRlbGV0ZSIsImJ0X1Rvb2xUaXBEZWxldGUiLCJkZWxldGVEaXNhYmxlZFRvb2x0aXAiLCJidF9DYW5ub3REZWxldGUiLCJsZW5ndGgiLCJpc1N1Y2Nlc3MiLCJyZXN1bHQiLCJBcnJheSIsImlzQXJyYXkiLCJpdGVtcyIsImlzRW1wdHkiLCJleF9FcnJvckxvYWRpbmdEYXRhIiwibm9ybWFsaXplZFJlc3BvbnNlIiwicG9wdXAiLCJyZXBvc2l0aW9uQWRkQnV0dG9uIiwiaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCIsInRvZ2dsZVBhZ2luYXRpb25WaXNpYmlsaXR5Iiwic2V0VGltZW91dCIsInRhYmxlIiwicGFnZSIsImF0dHIiLCIkcGFnaW5hdGVDb250YWluZXIiLCJwYWdlcyIsImhpZGUiLCJzaG93IiwiJHRoZWFkIiwicHJlcGVuZCIsIiRoZWFkZXJSb3ciLCJmaXJzdCIsIiRhZGRCdXR0b24iLCIkd3JhcHBlciIsIiRsZWZ0Q29sdW1uIiwiYXBwZW5kIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwiY3VycmVudFRhcmdldCIsImNiQWZ0ZXJEZWxldGVSZWNvcmQiLCJkZWxldGVSZWNvcmQiLCJjb3B5VXJsIiwiYmFzZVVybCIsIndpbmRvdyIsImxvY2F0aW9uIiwib25DbGljayIsInJlbG9hZENhbGxiYWNrIiwicmVsb2FkIiwiRXh0ZW5zaW9uc0FQSSIsImNiT25EYXRhQ2hhbmdlZCIsImVycm9yTWVzc2FnZSIsIm1lc3NhZ2VzIiwiZGVsZXRlRXJyb3IiLCJleF9JbXBvc3NpYmxlVG9EZWxldGVSZWNvcmQiLCJyZW1vdmVDbGFzcyIsImNsb3Nlc3QiLCIkY29udGFpbmVyIiwicGFyZW50IiwiJHBsYWNlaG9sZGVyIiwiJGxvYWRlciIsImV4X0xvYWRpbmdEYXRhIiwiYmVmb3JlIiwiJHBhcmVudCIsInNhZmVEZXNjIiwiZGVzY3JpcHRpb25MaW5lcyIsInNwbGl0IiwiZmlsdGVyIiwibGluZSIsImZvcm1hdHRlZERlc2MiLCJ2aXNpYmxlTGluZXMiLCJzbGljZSIsInRydW5jYXRlZERlc2MiLCJmdWxsRGVzYyIsIm9mZiIsImRlc3Ryb3kiLCJyZW1vdmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLGlCO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJLDZCQUFZQyxNQUFaLEVBQW9CO0FBQUE7O0FBQ2hCO0FBQ0EsU0FBS0MsT0FBTCxHQUFlRCxNQUFNLENBQUNDLE9BQXRCO0FBQ0EsU0FBS0MsU0FBTCxHQUFpQkYsTUFBTSxDQUFDRSxTQUF4QjtBQUNBLFNBQUtDLFdBQUwsR0FBbUJILE1BQU0sQ0FBQ0csV0FBMUI7QUFDQSxTQUFLQyxZQUFMLEdBQW9CSixNQUFNLENBQUNJLFlBQVAsSUFBdUIsRUFBM0M7QUFDQSxTQUFLQyxPQUFMLEdBQWVMLE1BQU0sQ0FBQ0ssT0FBUCxJQUFrQixFQUFqQztBQUNBLFNBQUtDLG1CQUFMLEdBQTJCTixNQUFNLENBQUNNLG1CQUFQLElBQThCLEtBQXpEO0FBQ0EsU0FBS0MsUUFBTCxHQUFnQlAsTUFBTSxDQUFDTyxRQUFQLElBQW1CLEtBQW5DO0FBQ0EsU0FBS0MsZ0JBQUwsR0FBd0JSLE1BQU0sQ0FBQ1EsZ0JBQVAsSUFBMkIsRUFBbkQsQ0FUZ0IsQ0FXaEI7O0FBQ0EsU0FBS0MsU0FBTCxHQUFpQlQsTUFBTSxDQUFDUyxTQUFQLEtBQXFCQyxTQUFyQixHQUFpQ1YsTUFBTSxDQUFDUyxTQUF4QyxHQUFvRCxJQUFyRTtBQUNBLFNBQUtFLGlCQUFMLEdBQXlCWCxNQUFNLENBQUNXLGlCQUFQLEtBQTZCLEtBQXRELENBYmdCLENBYTZDO0FBQzdEOztBQUNBLFNBQUtDLEtBQUwsR0FBYVosTUFBTSxDQUFDWSxLQUFQLEtBQWlCLEtBQUtELGlCQUFMLEdBQXlCLENBQUMsQ0FBQyxDQUFELEVBQUksS0FBSixDQUFELENBQXpCLEdBQXdDLENBQUMsQ0FBQyxDQUFELEVBQUksS0FBSixDQUFELENBQXpELENBQWIsQ0FmZ0IsQ0FpQmhCOztBQUNBLFNBQUtFLFdBQUwsR0FBbUI7QUFDZkMsTUFBQUEsSUFBSSxFQUFFLEtBRFM7QUFFZkMsTUFBQUEsTUFBTSxFQUFFLEtBRk87QUFHZkMsTUFBQUEsSUFBSSxFQUFFLEtBSFM7QUFJZixnQkFBUSxLQUpPO0FBS2ZDLE1BQUFBLElBQUksRUFBRSxLQUxTO0FBTWZDLE1BQUFBLE1BQU0sRUFBRTtBQU5PLEtBQW5CLENBbEJnQixDQTJCaEI7O0FBQ0EsU0FBS0MsYUFBTCxHQUFxQm5CLE1BQU0sQ0FBQ21CLGFBQVAsSUFBd0IsQ0FBQyxNQUFELEVBQVMsUUFBVCxDQUE3QztBQUNBLFNBQUtDLG1CQUFMLEdBQTJCcEIsTUFBTSxDQUFDb0IsbUJBQVAsSUFBOEIsRUFBekQsQ0E3QmdCLENBK0JoQjs7QUFDQSxTQUFLQyxtQkFBTCxHQUEyQkMsTUFBTSxDQUFDQyxNQUFQLENBQWM7QUFDckNDLE1BQUFBLFFBQVEsRUFBRSxDQUQyQjtBQUVyQ0MsTUFBQUEsYUFBYSxFQUFFLEtBRnNCO0FBR3JDQyxNQUFBQSxjQUFjLEVBQUU7QUFIcUIsS0FBZCxFQUl4QjFCLE1BQU0sQ0FBQ3FCLG1CQUFQLElBQThCLEVBSk4sQ0FBM0IsQ0FoQ2dCLENBc0NoQjs7QUFDQSxTQUFLTSxNQUFMLEdBQWNDLENBQUMsWUFBSyxLQUFLM0IsT0FBVixFQUFmO0FBQ0EsU0FBSzRCLFNBQUwsR0FBaUIsRUFBakIsQ0F4Q2dCLENBMENoQjs7QUFDQSxTQUFLQyxZQUFMLEdBQW9COUIsTUFBTSxDQUFDOEIsWUFBM0I7QUFDQSxTQUFLQyxjQUFMLEdBQXNCL0IsTUFBTSxDQUFDK0IsY0FBN0I7QUFDQSxTQUFLQyxtQkFBTCxHQUEyQmhDLE1BQU0sQ0FBQ2dDLG1CQUFsQztBQUNBLFNBQUtDLG1CQUFMLEdBQTJCakMsTUFBTSxDQUFDaUMsbUJBQWxDO0FBQ0EsU0FBS0MsYUFBTCxHQUFxQmxDLE1BQU0sQ0FBQ2tDLGFBQTVCO0FBQ0EsU0FBS0MsWUFBTCxHQUFvQm5DLE1BQU0sQ0FBQ21DLFlBQTNCO0FBQ0EsU0FBS0MsMkJBQUwsR0FBbUNwQyxNQUFNLENBQUNvQywyQkFBMUM7QUFDQSxTQUFLQyxRQUFMLEdBQWdCckMsTUFBTSxDQUFDcUMsUUFBUCxJQUFtQixFQUFuQztBQUNBLFNBQUtDLFVBQUwsR0FBa0J0QyxNQUFNLENBQUNzQyxVQUFQLElBQXFCLEtBQXZDO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7Ozs7O1dBQ0ksNEJBQW1CO0FBQ2YsVUFBSTtBQUNBO0FBQ0EsYUFBS0MsVUFBTCxHQUZBLENBSUE7O0FBQ0EsY0FBTSxLQUFLQyxlQUFMLEVBQU4sQ0FMQSxDQU9BOztBQUNBLGFBQUtDLG1CQUFMO0FBQ0gsT0FURCxDQVNFLE9BQU9DLEtBQVAsRUFBYztBQUNaQyxRQUFBQSxPQUFPLENBQUNELEtBQVIsQ0FBYyx5Q0FBZCxFQUF5REEsS0FBekQ7QUFDQUUsUUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCQyxlQUFlLENBQUNDLHlCQUF0QztBQUNBLGFBQUtDLFVBQUw7QUFDQSxhQUFLQyxzQkFBTCxDQUE0QixJQUE1QjtBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSxpQ0FBd0I7QUFDcEIsVUFBSTtBQUNBLFlBQU1DLFFBQVEsR0FBRyxNQUFNdEIsQ0FBQyxDQUFDdUIsSUFBRixDQUFPO0FBQzFCQyxVQUFBQSxHQUFHLFlBQUtDLGFBQUwseUJBRHVCO0FBRTFCQyxVQUFBQSxNQUFNLEVBQUUsS0FGa0I7QUFHMUJDLFVBQUFBLElBQUksRUFBRTtBQUNGQyxZQUFBQSxVQUFVLEVBQUUsS0FBS3JEO0FBRGYsV0FIb0I7QUFNMUJzRCxVQUFBQSxRQUFRLEVBQUU7QUFOZ0IsU0FBUCxDQUF2Qjs7QUFTQSxZQUFJUCxRQUFRLENBQUNRLE9BQVQsSUFBb0JSLFFBQVEsQ0FBQ0ssSUFBakMsRUFBdUM7QUFDbkNqQyxVQUFBQSxNQUFNLENBQUNDLE1BQVAsQ0FBYyxLQUFLVixXQUFuQixFQUFnQ3FDLFFBQVEsQ0FBQ0ssSUFBekM7O0FBRUEsY0FBSSxLQUFLdkIsbUJBQVQsRUFBOEI7QUFDMUIsaUJBQUtBLG1CQUFMLENBQXlCLEtBQUtuQixXQUE5QjtBQUNIO0FBQ0o7QUFDSixPQWpCRCxDQWlCRSxPQUFPNkIsS0FBUCxFQUFjO0FBQ1pDLFFBQUFBLE9BQU8sQ0FBQ2dCLElBQVIsQ0FBYSw2Q0FBYixFQUE0RGpCLEtBQTVELEVBRFksQ0FFWjtBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSwrQkFBc0I7QUFBQTs7QUFDbEI7QUFDQSxXQUFLZixNQUFMLENBQVlpQyxRQUFaLENBQXFCLDZCQUFyQixFQUZrQixDQUlsQjs7QUFDQSxXQUFLQyxpQkFBTDtBQUVBLFVBQU1DLGdCQUFnQixHQUFHLEtBQUtDLGNBQUwsRUFBekIsQ0FQa0IsQ0FTbEI7O0FBQ0EsVUFBSUMsVUFBSjs7QUFFQSxVQUFJLE9BQU8sS0FBSzlELFNBQUwsQ0FBZStELE9BQXRCLEtBQWtDLFVBQXRDLEVBQWtEO0FBQzlDO0FBQ0FELFFBQUFBLFVBQVUsR0FBRyxvQkFBQ1QsSUFBRCxFQUFPVyxRQUFQLEVBQWlCQyxRQUFqQixFQUE4QjtBQUN2QyxVQUFBLEtBQUksQ0FBQ2pFLFNBQUwsQ0FBZStELE9BQWYsQ0FBdUIsS0FBSSxDQUFDNUIsUUFBNUIsRUFBc0MsVUFBQ2EsUUFBRCxFQUFjO0FBQ2hELGdCQUFNa0IsYUFBYSxHQUFHLEtBQUksQ0FBQ0MsY0FBTCxDQUFvQm5CLFFBQXBCLENBQXRCOztBQUNBZ0IsWUFBQUEsUUFBUSxDQUFDO0FBQ0xYLGNBQUFBLElBQUksRUFBRWE7QUFERCxhQUFELENBQVI7QUFHSCxXQUxEO0FBTUgsU0FQRDtBQVFILE9BVkQsTUFVTztBQUNIekIsUUFBQUEsT0FBTyxDQUFDRCxLQUFSLENBQWMseUNBQWQ7QUFDQXNCLFFBQUFBLFVBQVUsR0FBRztBQUFDVCxVQUFBQSxJQUFJLEVBQUU7QUFBUCxTQUFiO0FBQ0g7O0FBRUQsVUFBTXZELE1BQU07QUFDUm1ELFFBQUFBLElBQUksRUFBRWEsVUFERTtBQUVSM0QsUUFBQUEsT0FBTyxFQUFFeUQsZ0JBRkQ7QUFHUmxELFFBQUFBLEtBQUssRUFBRSxLQUFLQSxLQUhKO0FBSVIwRCxRQUFBQSxRQUFRLEVBQUUsS0FBSzdELFNBSlA7QUFLUjhELFFBQUFBLFlBQVksRUFBRSxLQUxOO0FBTVJDLFFBQUFBLE1BQU0sRUFBRSxLQU5BO0FBT1JDLFFBQUFBLFNBQVMsRUFBRSxJQVBIO0FBUVJDLFFBQUFBLElBQUksRUFBRSxLQUFLbkUsUUFSSDtBQVNSb0UsUUFBQUEsU0FBUyxFQUFFLEtBVEg7QUFVUkMsUUFBQUEsUUFBUSxFQUFFQyxvQkFBb0IsQ0FBQ0MscUJBVnZCO0FBV1JDLFFBQUFBLFlBQVksRUFBRTtBQUFBLGlCQUFNLEtBQUksQ0FBQ0Msa0JBQUwsRUFBTjtBQUFBO0FBWE4sU0FhTCxLQUFLeEUsZ0JBYkEsQ0FBWjs7QUFnQkEsV0FBS3FCLFNBQUwsR0FBaUIsS0FBS0YsTUFBTCxDQUFZc0QsU0FBWixDQUFzQmpGLE1BQXRCLENBQWpCLENBM0NrQixDQTZDbEI7O0FBQ0EsV0FBS2tGLHVCQUFMO0FBQ0EsV0FBS0MscUJBQUw7QUFDQSxXQUFLQyx3QkFBTDtBQUNIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksMEJBQWlCO0FBQ2IsVUFBTS9FLE9BQU8sc0JBQU8sS0FBS0EsT0FBWixDQUFiLENBRGEsQ0FHYjtBQUNBOzs7QUFDQSxVQUFJLEtBQUtNLGlCQUFMLElBQTBCLENBQUNOLE9BQU8sQ0FBQ2dGLElBQVIsQ0FBYSxVQUFBQyxHQUFHO0FBQUEsZUFBSUEsR0FBRyxDQUFDL0IsSUFBSixLQUFhLGNBQWpCO0FBQUEsT0FBaEIsQ0FBL0IsRUFBaUY7QUFDN0VsRCxRQUFBQSxPQUFPLENBQUNrRixPQUFSLENBQWdCO0FBQ1poQyxVQUFBQSxJQUFJLEVBQUUsY0FETTtBQUVaaUMsVUFBQUEsT0FBTyxFQUFFLEtBRkc7QUFHWkMsVUFBQUEsVUFBVSxFQUFFLElBSEE7QUFJWmhGLFVBQUFBLFNBQVMsRUFBRSxLQUpDO0FBS1ppRixVQUFBQSxjQUFjLEVBQUUsRUFMSjtBQU1aQyxVQUFBQSxNQUFNLEVBQUUsZ0JBQVNwQyxJQUFULEVBQWVxQyxJQUFmLEVBQXFCQyxHQUFyQixFQUEwQjtBQUM5QjtBQUNBLGdCQUFJdEMsSUFBSixFQUFVO0FBQ04scUJBQU9BLElBQVA7QUFDSCxhQUo2QixDQU05Qjs7O0FBQ0EsZ0JBQU11QyxnQkFBZ0IsR0FBRyxFQUF6QjtBQUNBeEUsWUFBQUEsTUFBTSxDQUFDeUUsSUFBUCxDQUFZRixHQUFaLEVBQWlCRyxPQUFqQixDQUF5QixVQUFBQyxHQUFHLEVBQUk7QUFDNUI7QUFDQSxrQkFBSUEsR0FBRyxLQUFLLGNBQVIsSUFBMEJBLEdBQUcsS0FBSyxJQUFsQyxJQUEwQ0EsR0FBRyxLQUFLLFFBQWxELElBQ0FBLEdBQUcsS0FBSyxVQURSLElBQ3NCLENBQUNBLEdBQUcsQ0FBQ0MsUUFBSixDQUFhLFlBQWIsQ0FEM0IsRUFDdUQ7QUFDbkQsb0JBQU1DLEtBQUssR0FBR04sR0FBRyxDQUFDSSxHQUFELENBQWpCOztBQUNBLG9CQUFJRSxLQUFLLElBQUksT0FBT0EsS0FBUCxLQUFpQixRQUE5QixFQUF3QztBQUNwQztBQUNBLHNCQUFNQyxVQUFVLEdBQUdELEtBQUssQ0FBQ0UsT0FBTixDQUFjLFVBQWQsRUFBMEIsRUFBMUIsRUFBOEJDLElBQTlCLEVBQW5COztBQUNBLHNCQUFJRixVQUFKLEVBQWdCO0FBQ1pOLG9CQUFBQSxnQkFBZ0IsQ0FBQ1MsSUFBakIsQ0FBc0JILFVBQXRCO0FBQ0g7QUFDSixpQkFORCxNQU1PLElBQUlELEtBQUssSUFBSSxPQUFPQSxLQUFQLEtBQWlCLFFBQTlCLEVBQXdDO0FBQzNDTCxrQkFBQUEsZ0JBQWdCLENBQUNTLElBQWpCLENBQXNCSixLQUFLLENBQUNLLFFBQU4sRUFBdEI7QUFDSDtBQUNKO0FBQ0osYUFmRCxFQVI4QixDQXdCOUI7O0FBQ0FsRixZQUFBQSxNQUFNLENBQUN5RSxJQUFQLENBQVlGLEdBQVosRUFBaUJHLE9BQWpCLENBQXlCLFVBQUFDLEdBQUcsRUFBSTtBQUM1QixrQkFBSUEsR0FBRyxDQUFDQyxRQUFKLENBQWEsWUFBYixLQUE4QkwsR0FBRyxDQUFDSSxHQUFELENBQXJDLEVBQTRDO0FBQ3hDLG9CQUFNRyxVQUFVLEdBQUdLLE1BQU0sQ0FBQ1osR0FBRyxDQUFDSSxHQUFELENBQUosQ0FBTixDQUFpQkksT0FBakIsQ0FBeUIsVUFBekIsRUFBcUMsRUFBckMsRUFBeUNDLElBQXpDLEVBQW5COztBQUNBLG9CQUFJRixVQUFKLEVBQWdCO0FBQ1pOLGtCQUFBQSxnQkFBZ0IsQ0FBQ1MsSUFBakIsQ0FBc0JILFVBQXRCO0FBQ0g7QUFDSjtBQUNKLGFBUEQ7QUFRQSxtQkFBT04sZ0JBQWdCLENBQUNZLElBQWpCLENBQXNCLEdBQXRCLEVBQTJCQyxXQUEzQixFQUFQO0FBQ0g7QUF4Q1csU0FBaEI7QUEwQ0gsT0FoRFksQ0FrRGI7OztBQUNBLFVBQUksQ0FBQyxLQUFLbEcsU0FBVixFQUFxQjtBQUNqQkosUUFBQUEsT0FBTyxDQUFDMkYsT0FBUixDQUFnQixVQUFBVixHQUFHLEVBQUk7QUFDbkI7QUFDQSxjQUFJQSxHQUFHLENBQUM3RSxTQUFKLEtBQWtCLEtBQXRCLEVBQTZCO0FBQ3pCNkUsWUFBQUEsR0FBRyxDQUFDN0UsU0FBSixHQUFnQixLQUFoQjtBQUNIO0FBQ0osU0FMRDtBQU1ILE9BMURZLENBNERiOzs7QUFDQSxVQUFJLENBQUNKLE9BQU8sQ0FBQ2dGLElBQVIsQ0FBYSxVQUFBQyxHQUFHO0FBQUEsZUFBSUEsR0FBRyxDQUFDc0IsY0FBUjtBQUFBLE9BQWhCLENBQUwsRUFBOEM7QUFDMUN2RyxRQUFBQSxPQUFPLENBQUNrRyxJQUFSLENBQWEsS0FBS00sa0JBQUwsRUFBYjtBQUNIOztBQUVELGFBQU94RyxPQUFQO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSw4QkFBcUI7QUFBQTs7QUFDakIsYUFBTztBQUNIa0QsUUFBQUEsSUFBSSxFQUFFLElBREg7QUFFSDlDLFFBQUFBLFNBQVMsRUFBRSxLQUZSO0FBR0hnRixRQUFBQSxVQUFVLEVBQUUsS0FIVDtBQUlIcUIsUUFBQUEsU0FBUyxFQUFFLDBCQUpSO0FBS0hGLFFBQUFBLGNBQWMsRUFBRSxJQUxiO0FBTUhqQixRQUFBQSxNQUFNLEVBQUUsZ0JBQUNwQyxJQUFELEVBQU9xQyxJQUFQLEVBQWFDLEdBQWIsRUFBcUI7QUFDekIsY0FBTWtCLE9BQU8sR0FBRyxFQUFoQixDQUR5QixDQUV6Qjs7QUFDQSxjQUFNQyxRQUFRLEdBQUduQixHQUFHLENBQUNvQixNQUFKLElBQWNwQixHQUFHLENBQUNxQixFQUFsQixJQUF3QixFQUF6QyxDQUh5QixDQUt6Qjs7QUFDQSxjQUFJLE1BQUksQ0FBQy9GLGFBQUwsQ0FBbUJnRyxRQUFuQixDQUE0QixNQUE1QixNQUNDLE1BQUksQ0FBQ3RHLFdBQUwsQ0FBaUJFLE1BQWpCLElBQTJCLE1BQUksQ0FBQ0YsV0FBTCxDQUFpQkcsSUFEN0MsQ0FBSixFQUN3RDtBQUVwRDtBQUNBLGdCQUFNb0csU0FBUyxHQUFHLE1BQUksQ0FBQ2pGLFlBQUwsR0FDZCxNQUFJLENBQUNBLFlBQUwsQ0FBa0I2RSxRQUFsQixDQURjLGFBRVgzRCxhQUZXLFNBRUssTUFBSSxDQUFDbEQsV0FGVixxQkFFZ0M2RyxRQUZoQyxDQUFsQjtBQUlBRCxZQUFBQSxPQUFPLENBQUNSLElBQVIsK0NBQ2VhLFNBRGYsMEhBR3VCdEUsZUFBZSxDQUFDdUUsY0FIdkM7QUFPSCxXQXJCd0IsQ0F1QnpCOzs7QUFDQSxjQUFJLE1BQUksQ0FBQ2xHLGFBQUwsQ0FBbUJnRyxRQUFuQixDQUE0QixNQUE1QixLQUF1QyxNQUFJLENBQUN0RyxXQUFMLENBQWlCSSxJQUE1RCxFQUFrRTtBQUM5RDhGLFlBQUFBLE9BQU8sQ0FBQ1IsSUFBUiw2RkFFcUJTLFFBRnJCLHlIQUl1QmxFLGVBQWUsQ0FBQ3dFLGNBSnZDO0FBUUgsV0FqQ3dCLENBbUN6Qjs7O0FBQ0EsVUFBQSxNQUFJLENBQUNsRyxtQkFBTCxDQUF5QjRFLE9BQXpCLENBQWlDLFVBQUF1QixZQUFZLEVBQUk7QUFDN0MsZ0JBQUksTUFBSSxDQUFDMUcsV0FBTCxDQUFpQkssTUFBakIsSUFBMkIsTUFBSSxDQUFDTCxXQUFMLENBQWlCSyxNQUFqQixDQUF3QnFHLFlBQVksQ0FBQ0MsSUFBckMsQ0FBL0IsRUFBMkU7QUFDdkUsa0JBQU1DLElBQUksR0FBR0YsWUFBWSxDQUFDRSxJQUFiLElBQXFCLEdBQWxDO0FBQ0Esa0JBQU1DLFNBQVMsR0FBR0gsWUFBWSxDQUFDSSxTQUFiLDBCQUF3Q1gsUUFBeEMsVUFBc0QsRUFBeEU7QUFDQUQsY0FBQUEsT0FBTyxDQUFDUixJQUFSLG1EQUNla0IsSUFEZixpREFFU0MsU0FGVCxnRUFHMEJILFlBQVksU0FIdEMsd0VBSXVCSyxhQUFhLENBQUNDLFVBQWQsQ0FBeUJOLFlBQVksQ0FBQ08sT0FBdEMsQ0FKdkIsNkRBS29CUCxZQUFZLENBQUNRLElBTGpDO0FBUUg7QUFDSixXQWJELEVBcEN5QixDQW1EekI7OztBQUNBLGNBQUksTUFBSSxDQUFDNUcsYUFBTCxDQUFtQmdHLFFBQW5CLENBQTRCLFFBQTVCLEtBQXlDLE1BQUksQ0FBQ3RHLFdBQUwsVUFBN0MsRUFBc0U7QUFDbEU7QUFDQSxnQkFBSW1ILFNBQVMsR0FBRyxJQUFoQjs7QUFDQSxnQkFBSSxNQUFJLENBQUM1RiwyQkFBTCxJQUFvQyxPQUFPLE1BQUksQ0FBQ0EsMkJBQVosS0FBNEMsVUFBcEYsRUFBZ0c7QUFDNUY0RixjQUFBQSxTQUFTLEdBQUcsTUFBSSxDQUFDNUYsMkJBQUwsQ0FBaUN5RCxHQUFqQyxDQUFaO0FBQ0g7O0FBRUQsZ0JBQUltQyxTQUFKLEVBQWU7QUFDWGpCLGNBQUFBLE9BQU8sQ0FBQ1IsSUFBUixvR0FFcUJTLFFBRnJCLG1KQUl1QmxFLGVBQWUsQ0FBQ21GLGdCQUp2QztBQVFILGFBVEQsTUFTTztBQUNIO0FBQ0FsQixjQUFBQSxPQUFPLENBQUNSLElBQVIsa0xBR3VCLE1BQUksQ0FBQ25HLFlBQUwsQ0FBa0I4SCxxQkFBbEIsSUFBMkNwRixlQUFlLENBQUNxRixlQUhsRjtBQU9IO0FBQ0o7O0FBRUQsaUJBQU9wQixPQUFPLENBQUNxQixNQUFSLEdBQWlCLENBQWpCLHNFQUN1RHJCLE9BQU8sQ0FBQ0wsSUFBUixDQUFhLEVBQWIsQ0FEdkQsY0FFSCxFQUZKO0FBR0g7QUF6RkUsT0FBUDtBQTJGSDtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7O1dBQ0ksd0JBQWV4RCxRQUFmLEVBQXlCO0FBQ3JCO0FBQ0EsV0FBS0YsVUFBTDtBQUVBLFVBQUlPLElBQUksR0FBRyxFQUFYO0FBQ0EsVUFBSThFLFNBQVMsR0FBRyxLQUFoQixDQUxxQixDQU9yQjs7QUFDQSxVQUFJLENBQUNuRixRQUFELElBQWFBLFFBQVEsQ0FBQ29GLE1BQVQsS0FBb0IsS0FBckMsRUFBNEM7QUFDeENELFFBQUFBLFNBQVMsR0FBRyxLQUFaO0FBQ0E5RSxRQUFBQSxJQUFJLEdBQUcsRUFBUDtBQUNILE9BSEQsQ0FJQTtBQUpBLFdBS0ssSUFBSWdGLEtBQUssQ0FBQ0MsT0FBTixDQUFjdEYsUUFBUSxDQUFDSyxJQUF2QixDQUFKLEVBQWtDO0FBQ25DOEUsUUFBQUEsU0FBUyxHQUFHLElBQVo7QUFDQTlFLFFBQUFBLElBQUksR0FBR0wsUUFBUSxDQUFDSyxJQUFoQjtBQUNILE9BSEksQ0FJTDtBQUpLLFdBS0EsSUFBSUwsUUFBUSxDQUFDSyxJQUFULElBQWlCZ0YsS0FBSyxDQUFDQyxPQUFOLENBQWN0RixRQUFRLENBQUNLLElBQVQsQ0FBY2tGLEtBQTVCLENBQXJCLEVBQXlEO0FBQzFESixRQUFBQSxTQUFTLEdBQUcsSUFBWjtBQUNBOUUsUUFBQUEsSUFBSSxHQUFHTCxRQUFRLENBQUNLLElBQVQsQ0FBY2tGLEtBQXJCO0FBQ0gsT0FISSxDQUlMO0FBSkssV0FLQSxJQUFJdkYsUUFBUSxDQUFDb0YsTUFBVCxLQUFvQixJQUF4QixFQUE4QjtBQUMvQkQsUUFBQUEsU0FBUyxHQUFHLElBQVo7QUFDQTlFLFFBQUFBLElBQUksR0FBRyxFQUFQO0FBQ0g7O0FBRUQsVUFBTW1GLE9BQU8sR0FBRyxDQUFDTCxTQUFELElBQWM5RSxJQUFJLENBQUM2RSxNQUFMLEtBQWdCLENBQTlDO0FBQ0EsV0FBS25GLHNCQUFMLENBQTRCeUYsT0FBNUI7O0FBRUEsVUFBSUEsT0FBTyxJQUFJLENBQUNMLFNBQWhCLEVBQTJCO0FBQ3ZCekYsUUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCQyxlQUFlLENBQUM2RixtQkFBdEM7QUFDSDs7QUFFRCxVQUFJLEtBQUs3RyxZQUFULEVBQXVCO0FBQ25CO0FBQ0EsWUFBTThHLGtCQUFrQixHQUFHO0FBQ3ZCTixVQUFBQSxNQUFNLEVBQUVELFNBRGU7QUFFdkI5RSxVQUFBQSxJQUFJLEVBQUVBO0FBRmlCLFNBQTNCO0FBSUEsYUFBS3pCLFlBQUwsQ0FBa0I4RyxrQkFBbEI7QUFDSDs7QUFFRCxhQUFPckYsSUFBUDtBQUNIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksOEJBQXFCO0FBQ2pCO0FBQ0EsV0FBSzVCLE1BQUwsQ0FBWTBELElBQVosQ0FBaUIsVUFBakIsRUFBNkJ3RCxLQUE3QixHQUZpQixDQUlqQjs7QUFDQSxXQUFLQyxtQkFBTCxHQUxpQixDQU9qQjs7QUFDQSxXQUFLQyx5QkFBTCxHQVJpQixDQVVqQjs7QUFDQSxXQUFLQywwQkFBTCxHQVhpQixDQWFqQjs7QUFDQSxVQUFJLEtBQUtqSCxjQUFULEVBQXlCO0FBQ3JCLGFBQUtBLGNBQUw7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSxzQ0FBNkI7QUFBQTs7QUFDekI7QUFDQWtILE1BQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2I7QUFDQSxZQUFNQyxLQUFLLEdBQUcsTUFBSSxDQUFDdkgsTUFBTCxDQUFZc0QsU0FBWixFQUFkOztBQUNBLFlBQUlpRSxLQUFLLElBQUlBLEtBQUssQ0FBQ0MsSUFBbkIsRUFBeUI7QUFDckIsY0FBTXpFLElBQUksR0FBR3dFLEtBQUssQ0FBQ0MsSUFBTixDQUFXekUsSUFBWCxFQUFiOztBQUNBLGNBQU16RSxPQUFPLEdBQUcsTUFBSSxDQUFDMEIsTUFBTCxDQUFZeUgsSUFBWixDQUFpQixJQUFqQixDQUFoQjs7QUFDQSxjQUFNQyxrQkFBa0IsR0FBR3pILENBQUMsWUFBSzNCLE9BQUwsZUFBNUI7O0FBRUEsY0FBSW9KLGtCQUFrQixDQUFDakIsTUFBdkIsRUFBK0I7QUFDM0IsZ0JBQUkxRCxJQUFJLENBQUM0RSxLQUFMLElBQWMsQ0FBbEIsRUFBcUI7QUFDakI7QUFDQUQsY0FBQUEsa0JBQWtCLENBQUNFLElBQW5CO0FBQ0gsYUFIRCxNQUdPO0FBQ0g7QUFDQUYsY0FBQUEsa0JBQWtCLENBQUNHLElBQW5CO0FBQ0g7QUFDSjtBQUNKO0FBQ0osT0FsQlMsRUFrQlAsQ0FsQk8sQ0FBVjtBQW1CSDtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7O1dBQ0ksNkJBQW9CO0FBQ2hCLFVBQUksQ0FBQyxLQUFLN0ksaUJBQVYsRUFBNkI7QUFDekI7QUFDSDs7QUFFRCxVQUFNOEksTUFBTSxHQUFHLEtBQUs5SCxNQUFMLENBQVkwRCxJQUFaLENBQWlCLE9BQWpCLENBQWY7O0FBQ0EsVUFBSSxDQUFDb0UsTUFBTSxDQUFDckIsTUFBWixFQUFvQjtBQUNoQjtBQUNBLGFBQUt6RyxNQUFMLENBQVkrSCxPQUFaLENBQW9CLDBCQUFwQjtBQUNIOztBQUVELFVBQU1DLFVBQVUsR0FBRyxLQUFLaEksTUFBTCxDQUFZMEQsSUFBWixDQUFpQixVQUFqQixFQUE2QnVFLEtBQTdCLEVBQW5CLENBWGdCLENBYWhCO0FBQ0E7O0FBQ0FELE1BQUFBLFVBQVUsQ0FBQ0QsT0FBWCxDQUFtQiw2Q0FBbkI7QUFDSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLCtCQUFzQjtBQUNsQixVQUFNRyxVQUFVLEdBQUdqSSxDQUFDLENBQUMsaUJBQUQsQ0FBcEI7QUFDQSxVQUFNa0ksUUFBUSxHQUFHbEksQ0FBQyxZQUFLLEtBQUszQixPQUFWLGNBQWxCO0FBQ0EsVUFBTThKLFdBQVcsR0FBR0QsUUFBUSxDQUFDekUsSUFBVCxDQUFjLG9CQUFkLEVBQW9DdUUsS0FBcEMsRUFBcEI7O0FBRUEsVUFBSUMsVUFBVSxDQUFDekIsTUFBWCxJQUFxQjJCLFdBQVcsQ0FBQzNCLE1BQWpDLElBQTJDLEtBQUt2SCxXQUFMLENBQWlCQyxJQUFoRSxFQUFzRTtBQUNsRWlKLFFBQUFBLFdBQVcsQ0FBQ0MsTUFBWixDQUFtQkgsVUFBbkI7QUFDQUEsUUFBQUEsVUFBVSxDQUFDTCxJQUFYO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLG1DQUEwQjtBQUFBOztBQUN0QjtBQUNBO0FBQ0EsV0FBSzdILE1BQUwsQ0FBWXNJLEVBQVosQ0FBZSxPQUFmLEVBQXdCLGlDQUF4QixFQUEyRCxVQUFDQyxDQUFELEVBQU87QUFDOURBLFFBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLFlBQU1DLE9BQU8sR0FBR3hJLENBQUMsQ0FBQ3NJLENBQUMsQ0FBQ0csYUFBSCxDQUFqQjtBQUNBLFlBQU1yRCxRQUFRLEdBQUdvRCxPQUFPLENBQUNoQixJQUFSLENBQWEsWUFBYixDQUFqQixDQUg4RCxDQUs5RDs7QUFDQWdCLFFBQUFBLE9BQU8sQ0FBQ3hHLFFBQVIsQ0FBaUIsa0JBQWpCOztBQUVBLFlBQUksTUFBSSxDQUFDM0IsbUJBQVQsRUFBOEI7QUFDMUIsVUFBQSxNQUFJLENBQUNBLG1CQUFMLENBQXlCK0UsUUFBekIsRUFBbUMsVUFBQzlELFFBQUQ7QUFBQSxtQkFBYyxNQUFJLENBQUNvSCxtQkFBTCxDQUF5QnBILFFBQXpCLENBQWQ7QUFBQSxXQUFuQztBQUNILFNBRkQsTUFFTztBQUNILFVBQUEsTUFBSSxDQUFDaEQsU0FBTCxDQUFlcUssWUFBZixDQUE0QnZELFFBQTVCLEVBQXNDLFVBQUM5RCxRQUFEO0FBQUEsbUJBQWMsTUFBSSxDQUFDb0gsbUJBQUwsQ0FBeUJwSCxRQUF6QixDQUFkO0FBQUEsV0FBdEM7QUFDSDtBQUNKLE9BYkQ7QUFjSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLGlDQUF3QjtBQUFBOztBQUNwQixXQUFLdkIsTUFBTCxDQUFZc0ksRUFBWixDQUFlLE9BQWYsRUFBd0IsUUFBeEIsRUFBa0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3JDQSxRQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxZQUFNbkQsUUFBUSxHQUFHcEYsQ0FBQyxDQUFDc0ksQ0FBQyxDQUFDRyxhQUFILENBQUQsQ0FBbUJqQixJQUFuQixDQUF3QixZQUF4QixDQUFqQixDQUZxQyxDQUlyQzs7QUFDQSxZQUFJb0IsT0FBSjs7QUFDQSxZQUFJLE1BQUksQ0FBQ3JJLFlBQVQsRUFBdUI7QUFDbkI7QUFDQSxjQUFNaUYsU0FBUyxHQUFHLE1BQUksQ0FBQ2pGLFlBQUwsQ0FBa0I2RSxRQUFsQixDQUFsQjs7QUFDQSxjQUFJSSxTQUFKLEVBQWU7QUFDWDtBQUNBLGdCQUFNcUQsT0FBTyxHQUFHckQsU0FBUyxDQUFDZixPQUFWLFlBQXNCVyxRQUF0QixHQUFrQyxFQUFsQyxDQUFoQjtBQUNBd0QsWUFBQUEsT0FBTyxhQUFNQyxPQUFOLG9CQUF1QnpELFFBQXZCLENBQVA7QUFDSDtBQUNKLFNBUkQsTUFRTztBQUNIO0FBQ0F3RCxVQUFBQSxPQUFPLGFBQU1uSCxhQUFOLFNBQXNCLE1BQUksQ0FBQ2xELFdBQTNCLDJCQUF1RDZHLFFBQXZELENBQVA7QUFDSCxTQWpCb0MsQ0FtQnJDOzs7QUFDQSxZQUFJd0QsT0FBSixFQUFhO0FBQ1RFLFVBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxHQUFrQkgsT0FBbEI7QUFDSDtBQUNKLE9BdkJEO0FBd0JIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksb0NBQTJCO0FBQUE7O0FBQ3ZCLFdBQUtwSixtQkFBTCxDQUF5QjRFLE9BQXpCLENBQWlDLFVBQUF1QixZQUFZLEVBQUk7QUFDN0MsWUFBSUEsWUFBWSxDQUFDcUQsT0FBakIsRUFBMEI7QUFDdEIsVUFBQSxNQUFJLENBQUNqSixNQUFMLENBQVlzSSxFQUFaLENBQWUsT0FBZixjQUE2QjFDLFlBQVksU0FBekMsR0FBbUQsVUFBQzJDLENBQUQsRUFBTztBQUN0REEsWUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsZ0JBQU1uRCxRQUFRLEdBQUdwRixDQUFDLENBQUNzSSxDQUFDLENBQUNHLGFBQUgsQ0FBRCxDQUFtQmpCLElBQW5CLENBQXdCLFlBQXhCLENBQWpCO0FBQ0E3QixZQUFBQSxZQUFZLENBQUNxRCxPQUFiLENBQXFCNUQsUUFBckI7QUFDSCxXQUpEO0FBS0g7QUFDSixPQVJEO0FBU0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSw2QkFBb0I5RCxRQUFwQixFQUE4QjtBQUFBOztBQUMxQixVQUFJQSxRQUFRLENBQUNvRixNQUFULEtBQW9CLElBQXhCLEVBQThCO0FBQzFCO0FBQ0EsWUFBTXVDLGNBQWMsR0FBRyxTQUFqQkEsY0FBaUIsR0FBTTtBQUN6QjtBQUNBLGNBQUksT0FBTyxNQUFJLENBQUMzSSxhQUFaLEtBQThCLFVBQWxDLEVBQThDO0FBQzFDLFlBQUEsTUFBSSxDQUFDQSxhQUFMLENBQW1CZ0IsUUFBbkI7QUFDSDtBQUNKLFNBTEQsQ0FGMEIsQ0FTMUI7OztBQUNBLGFBQUtyQixTQUFMLENBQWVzQixJQUFmLENBQW9CMkgsTUFBcEIsQ0FBMkJELGNBQTNCLEVBQTJDLEtBQTNDLEVBVjBCLENBWTFCOztBQUNBLFlBQUksT0FBT0UsYUFBUCxLQUF5QixXQUF6QixJQUF3Q0EsYUFBYSxDQUFDQyxlQUExRCxFQUEyRTtBQUN2RUQsVUFBQUEsYUFBYSxDQUFDQyxlQUFkO0FBQ0gsU0FmeUIsQ0FpQjFCOztBQUNILE9BbEJELE1Ba0JPO0FBQUE7O0FBQ0g7QUFDQSxZQUFNQyxZQUFZLEdBQUcsdUJBQUEvSCxRQUFRLENBQUNnSSxRQUFULDBFQUFtQnhJLEtBQW5CLEtBQ0QsS0FBS3RDLFlBQUwsQ0FBa0IrSyxXQURqQixJQUVEckksZUFBZSxDQUFDc0ksMkJBRnBDO0FBR0F4SSxRQUFBQSxXQUFXLENBQUNDLFNBQVosQ0FBc0JvSSxZQUF0QjtBQUNILE9BekJ5QixDQTJCMUI7OztBQUNBLFdBQUt0SixNQUFMLENBQVkwRCxJQUFaLENBQWlCLFVBQWpCLEVBQTZCZ0csV0FBN0IsQ0FBeUMsa0JBQXpDO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSxzQkFBYTtBQUNUO0FBQ0E7QUFDQSxVQUFNdkIsUUFBUSxHQUFHLEtBQUtuSSxNQUFMLENBQVkySixPQUFaLENBQW9CLHFCQUFwQixDQUFqQjtBQUNBLFVBQUlDLFVBQUo7O0FBQ0EsVUFBSXpCLFFBQVEsQ0FBQzFCLE1BQWIsRUFBcUI7QUFDakI7QUFDQW1ELFFBQUFBLFVBQVUsR0FBR3pCLFFBQVEsQ0FBQzBCLE1BQVQsQ0FBZ0IsU0FBaEIsQ0FBYjtBQUNILE9BUlEsQ0FTVDs7O0FBQ0EsVUFBSSxDQUFDRCxVQUFELElBQWUsQ0FBQ0EsVUFBVSxDQUFDbkQsTUFBL0IsRUFBdUM7QUFDbkNtRCxRQUFBQSxVQUFVLEdBQUcsS0FBSzVKLE1BQUwsQ0FBWTJKLE9BQVosQ0FBb0IsK0JBQXBCLENBQWI7QUFDSDs7QUFDRCxVQUFNRyxZQUFZLEdBQUc3SixDQUFDLENBQUMsMEJBQUQsQ0FBdEI7QUFDQSxVQUFNaUksVUFBVSxHQUFHakksQ0FBQyxDQUFDLGlCQUFELENBQXBCO0FBRUEySixNQUFBQSxVQUFVLENBQUNoQyxJQUFYO0FBQ0FrQyxNQUFBQSxZQUFZLENBQUNsQyxJQUFiO0FBQ0FNLE1BQUFBLFVBQVUsQ0FBQ04sSUFBWCxHQWxCUyxDQW9CVDs7QUFDQSxVQUFJbUMsT0FBTyxHQUFHOUosQ0FBQyxDQUFDLG9CQUFELENBQWY7O0FBQ0EsVUFBSSxDQUFDOEosT0FBTyxDQUFDdEQsTUFBYixFQUFxQjtBQUNqQjtBQUNBc0QsUUFBQUEsT0FBTyxHQUFHOUosQ0FBQyx3UEFHK0JrQixlQUFlLENBQUM2SSxjQUgvQyw4RUFBWCxDQUZpQixDQVNqQjs7QUFDQSxZQUFJSixVQUFVLENBQUNuRCxNQUFYLElBQXFCbUQsVUFBVSxDQUFDQyxNQUFYLEdBQW9CcEQsTUFBN0MsRUFBcUQ7QUFDakRtRCxVQUFBQSxVQUFVLENBQUNLLE1BQVgsQ0FBa0JGLE9BQWxCO0FBQ0gsU0FGRCxNQUVPLElBQUlELFlBQVksQ0FBQ3JELE1BQWIsSUFBdUJxRCxZQUFZLENBQUNELE1BQWIsR0FBc0JwRCxNQUFqRCxFQUF5RDtBQUM1RHFELFVBQUFBLFlBQVksQ0FBQ0csTUFBYixDQUFvQkYsT0FBcEI7QUFDSCxTQUZNLE1BRUE7QUFDSDtBQUNBLGNBQU1HLE9BQU8sR0FBRyxLQUFLbEssTUFBTCxDQUFZMkosT0FBWixDQUFvQixTQUFwQixLQUFrQyxLQUFLM0osTUFBTCxDQUFZNkosTUFBWixFQUFsRDtBQUNBSyxVQUFBQSxPQUFPLENBQUM3QixNQUFSLENBQWUwQixPQUFmO0FBQ0g7QUFDSjs7QUFDREEsTUFBQUEsT0FBTyxDQUFDbEMsSUFBUjtBQUNIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksc0JBQWE7QUFDVDVILE1BQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCMkgsSUFBeEI7QUFDSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLGdDQUF1QmIsT0FBdkIsRUFBZ0M7QUFDNUI7QUFDQTtBQUNBO0FBQ0EsVUFBTW9CLFFBQVEsR0FBRyxLQUFLbkksTUFBTCxDQUFZMkosT0FBWixDQUFvQixxQkFBcEIsQ0FBakI7QUFDQSxVQUFJQyxVQUFKOztBQUNBLFVBQUl6QixRQUFRLENBQUMxQixNQUFiLEVBQXFCO0FBQ2pCO0FBQ0FtRCxRQUFBQSxVQUFVLEdBQUd6QixRQUFRLENBQUMwQixNQUFULENBQWdCLFNBQWhCLENBQWI7QUFDSCxPQVQyQixDQVU1Qjs7O0FBQ0EsVUFBSSxDQUFDRCxVQUFELElBQWUsQ0FBQ0EsVUFBVSxDQUFDbkQsTUFBL0IsRUFBdUM7QUFDbkNtRCxRQUFBQSxVQUFVLEdBQUcsS0FBSzVKLE1BQUwsQ0FBWTJKLE9BQVosQ0FBb0IsK0JBQXBCLENBQWI7QUFDSDs7QUFDRCxVQUFNekIsVUFBVSxHQUFHakksQ0FBQyxDQUFDLGlCQUFELENBQXBCO0FBQ0EsVUFBTTZKLFlBQVksR0FBRzdKLENBQUMsQ0FBQywwQkFBRCxDQUF0Qjs7QUFFQSxVQUFJOEcsT0FBSixFQUFhO0FBQ1Q2QyxRQUFBQSxVQUFVLENBQUNoQyxJQUFYO0FBQ0FNLFFBQUFBLFVBQVUsQ0FBQ04sSUFBWCxHQUZTLENBR1Q7O0FBQ0EsWUFBSWtDLFlBQVksQ0FBQ3JELE1BQWpCLEVBQXlCO0FBQ3JCcUQsVUFBQUEsWUFBWSxDQUFDakMsSUFBYjtBQUNIO0FBQ0osT0FQRCxNQU9PO0FBQ0gsWUFBSWlDLFlBQVksQ0FBQ3JELE1BQWpCLEVBQXlCO0FBQ3JCcUQsVUFBQUEsWUFBWSxDQUFDbEMsSUFBYjtBQUNIOztBQUNELFlBQUksS0FBSzFJLFdBQUwsQ0FBaUJDLElBQXJCLEVBQTJCO0FBQ3ZCK0ksVUFBQUEsVUFBVSxDQUFDTCxJQUFYO0FBQ0g7O0FBQ0QrQixRQUFBQSxVQUFVLENBQUMvQixJQUFYO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7O1dBQ0kscUNBQTRCO0FBQUE7O0FBQ3hCLFdBQUs3SCxNQUFMLENBQVlzSSxFQUFaLENBQWUsVUFBZixFQUEyQiw4QkFBM0IsRUFBMkQsVUFBQ0MsQ0FBRCxFQUFPO0FBQzlELFlBQU0zRyxJQUFJLEdBQUcsTUFBSSxDQUFDMUIsU0FBTCxDQUFlZ0UsR0FBZixDQUFtQnFFLENBQUMsQ0FBQ0csYUFBckIsRUFBb0M5RyxJQUFwQyxFQUFiLENBRDhELENBRTlEOzs7QUFDQSxZQUFNeUQsUUFBUSxHQUFHekQsSUFBSSxLQUFLQSxJQUFJLENBQUMwRCxNQUFMLElBQWUxRCxJQUFJLENBQUMyRCxFQUF6QixDQUFyQjs7QUFDQSxZQUFJRixRQUFRLEtBQUssTUFBSSxDQUFDbkcsV0FBTCxDQUFpQkUsTUFBakIsSUFBMkIsTUFBSSxDQUFDRixXQUFMLENBQWlCRyxJQUFqRCxDQUFaLEVBQW9FO0FBQ2hFO0FBQ0EsY0FBTW9HLFNBQVMsR0FBRyxNQUFJLENBQUNqRixZQUFMLEdBQ2QsTUFBSSxDQUFDQSxZQUFMLENBQWtCNkUsUUFBbEIsQ0FEYyxhQUVYM0QsYUFGVyxTQUVLLE1BQUksQ0FBQ2xELFdBRlYscUJBRWdDNkcsUUFGaEMsQ0FBbEI7QUFHQTBELFVBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxHQUFrQnZELFNBQWxCO0FBQ0g7QUFDSixPQVhEO0FBWUg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0kscUNBQTRCO0FBQUE7O0FBQ3hCLGFBQU8sVUFBQzdELElBQUQsRUFBT3FDLElBQVAsRUFBYUMsR0FBYixFQUFxQjtBQUN4QixZQUFJLENBQUN0QyxJQUFELElBQVNBLElBQUksQ0FBQytDLElBQUwsT0FBZ0IsRUFBN0IsRUFBaUM7QUFDN0IsaUJBQU8sR0FBUDtBQUNIOztBQUVELFlBQUlWLElBQUksS0FBSyxTQUFiLEVBQXdCO0FBQ3BCO0FBQ0EsY0FBTWtHLFFBQVEsR0FBR3BCLE1BQU0sQ0FBQzlDLGFBQVAsQ0FBcUJDLFVBQXJCLENBQWdDdEUsSUFBaEMsQ0FBakI7QUFDQSxjQUFNd0ksZ0JBQWdCLEdBQUdELFFBQVEsQ0FBQ0UsS0FBVCxDQUFlLElBQWYsRUFBcUJDLE1BQXJCLENBQTRCLFVBQUFDLElBQUk7QUFBQSxtQkFBSUEsSUFBSSxDQUFDNUYsSUFBTCxPQUFnQixFQUFwQjtBQUFBLFdBQWhDLENBQXpCLENBSG9CLENBS3BCOztBQUNBLGNBQUk5RSxRQUFRLEdBQUcsTUFBSSxDQUFDSCxtQkFBTCxDQUF5QkcsUUFBeEM7O0FBQ0EsY0FBSSxNQUFJLENBQUNILG1CQUFMLENBQXlCSSxhQUF6QixJQUEwQyxNQUFJLENBQUNKLG1CQUFMLENBQXlCSyxjQUF2RSxFQUF1RjtBQUNuRkYsWUFBQUEsUUFBUSxHQUFHLE1BQUksQ0FBQ0gsbUJBQUwsQ0FBeUJLLGNBQXpCLENBQXdDbUUsR0FBeEMsQ0FBWDtBQUNIOztBQUVELGNBQUlrRyxnQkFBZ0IsQ0FBQzNELE1BQWpCLElBQTJCNUcsUUFBL0IsRUFBeUM7QUFDckM7QUFDQSxnQkFBTTJLLGFBQWEsR0FBR0osZ0JBQWdCLENBQUNyRixJQUFqQixDQUFzQixNQUF0QixDQUF0QjtBQUNBLHlGQUFrRXlGLGFBQWxFO0FBQ0gsV0FKRCxNQUlPO0FBQ0g7QUFDQSxnQkFBTUMsWUFBWSxHQUFHTCxnQkFBZ0IsQ0FBQ00sS0FBakIsQ0FBdUIsQ0FBdkIsRUFBMEI3SyxRQUExQixDQUFyQjtBQUNBNEssWUFBQUEsWUFBWSxDQUFDNUssUUFBUSxHQUFHLENBQVosQ0FBWixJQUE4QixLQUE5QjtBQUVBLGdCQUFNOEssYUFBYSxHQUFHRixZQUFZLENBQUMxRixJQUFiLENBQWtCLE1BQWxCLENBQXRCO0FBQ0EsZ0JBQU02RixRQUFRLEdBQUdSLGdCQUFnQixDQUFDckYsSUFBakIsQ0FBc0IsSUFBdEIsQ0FBakI7QUFFQSwrSEFDMkI2RixRQUQzQiwwUUFLTUQsYUFMTjtBQU9IO0FBQ0osU0FwQ3VCLENBc0N4Qjs7O0FBQ0EsZUFBTy9JLElBQVA7QUFDSCxPQXhDRDtBQXlDSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLG1CQUFVO0FBQ047QUFDQSxXQUFLNUIsTUFBTCxDQUFZNkssR0FBWixDQUFnQixPQUFoQixFQUF5QixpQ0FBekI7QUFDQSxXQUFLN0ssTUFBTCxDQUFZNkssR0FBWixDQUFnQixPQUFoQixFQUF5QixRQUF6QjtBQUNBLFdBQUs3SyxNQUFMLENBQVk2SyxHQUFaLENBQWdCLFVBQWhCLEVBQTRCLDhCQUE1QixFQUpNLENBTU47O0FBQ0EsVUFBSSxLQUFLM0ssU0FBTCxJQUFrQixPQUFPLEtBQUtBLFNBQUwsQ0FBZTRLLE9BQXRCLEtBQWtDLFVBQXhELEVBQW9FO0FBQ2hFLGFBQUs1SyxTQUFMLENBQWU0SyxPQUFmO0FBQ0gsT0FUSyxDQVdOOzs7QUFDQTdLLE1BQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCOEssTUFBeEI7QUFDSDs7OztLQUdMOzs7QUFDQWhDLE1BQU0sQ0FBQzNLLGlCQUFQLEdBQTJCQSxpQkFBM0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24sIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIEV4dGVuc2lvbnNBUEksIFNlY3VyaXR5VXRpbHMgKi9cblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBNaWtvUEJYIGluZGV4IHRhYmxlIG1hbmFnZW1lbnQgd2l0aCBBQ0wgc3VwcG9ydFxuICogXG4gKiBQcm92aWRlcyBjb21tb24gZnVuY3Rpb25hbGl0eSBmb3IgRGF0YVRhYmxlLWJhc2VkIGluZGV4IHBhZ2VzIGluY2x1ZGluZzpcbiAqIC0gU2VydmVyLXNpZGUgQUNMIHBlcm1pc3Npb24gY2hlY2tpbmdcbiAqIC0gRHluYW1pYyBhY3Rpb24gYnV0dG9uIHJlbmRlcmluZyBiYXNlZCBvbiBwZXJtaXNzaW9uc1xuICogLSBVbmlmaWVkIGRlc2NyaXB0aW9uIHRydW5jYXRpb24gd2l0aCBwb3B1cCBzdXBwb3J0XG4gKiAtIENvcHkgZnVuY3Rpb25hbGl0eSBzdXBwb3J0XG4gKiAtIEN1c3RvbSBhY3Rpb24gYnV0dG9uc1xuICogLSBUd28tc3RlcCBkZWxldGUgY29uZmlybWF0aW9uXG4gKiAtIERvdWJsZS1jbGljayBlZGl0aW5nXG4gKiBcbiAqIEBjbGFzcyBQYnhEYXRhVGFibGVJbmRleCBcbiAqL1xuY2xhc3MgUGJ4RGF0YVRhYmxlSW5kZXgge1xuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyBQYnhEYXRhVGFibGVJbmRleCBpbnN0YW5jZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcudGFibGVJZCAtIEhUTUwgdGFibGUgZWxlbWVudCBJRFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcuYXBpTW9kdWxlIC0gQVBJIG1vZHVsZSBmb3IgZGF0YSBvcGVyYXRpb25zXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy5yb3V0ZVByZWZpeCAtIFVSTCByb3V0ZSBwcmVmaXggKGUuZy4sICdjYWxsLXF1ZXVlcycpXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZy50cmFuc2xhdGlvbnMgLSBUcmFuc2xhdGlvbiBrZXlzIGZvciBtZXNzYWdlc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNvbmZpZy5jb2x1bW5zIC0gRGF0YVRhYmxlIGNvbHVtbiBkZWZpbml0aW9uc1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5zaG93U3VjY2Vzc01lc3NhZ2VzPWZhbHNlXSAtIFNob3cgc3VjY2VzcyBtZXNzYWdlcyBvbiBkZWxldGVcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2hvd0luZm89ZmFsc2VdIC0gU2hvdyBEYXRhVGFibGUgaW5mb1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtjb25maWcuYWN0aW9uQnV0dG9ucz1bJ2VkaXQnLCAnZGVsZXRlJ11dIC0gU3RhbmRhcmQgYWN0aW9uIGJ1dHRvbnMgdG8gc2hvd1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtjb25maWcuY3VzdG9tQWN0aW9uQnV0dG9ucz1bXV0gLSBDdXN0b20gYWN0aW9uIGJ1dHRvbiBkZWZpbml0aW9uc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnLmRlc2NyaXB0aW9uU2V0dGluZ3NdIC0gRGVzY3JpcHRpb24gdHJ1bmNhdGlvbiBzZXR0aW5nc1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25EYXRhTG9hZGVkXSAtIENhbGxiYWNrIGFmdGVyIGRhdGEgbG9hZGVkXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5vbkRyYXdDYWxsYmFja10gLSBDYWxsYmFjayBhZnRlciB0YWJsZSBkcmF3XG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5vblBlcm1pc3Npb25zTG9hZGVkXSAtIENhbGxiYWNrIGFmdGVyIHBlcm1pc3Npb25zIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcuY3VzdG9tRGVsZXRlSGFuZGxlcl0gLSBDdXN0b20gZGVsZXRlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLm9uQWZ0ZXJEZWxldGVdIC0gQ2FsbGJhY2sgYWZ0ZXIgc3VjY2Vzc2Z1bCBkZWxldGlvblxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcuZ2V0TW9kaWZ5VXJsXSAtIEN1c3RvbSBVUkwgZ2VuZXJhdG9yIGZvciBtb2RpZnkvZWRpdCBhY3Rpb25zXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLm9yZGVyYWJsZT10cnVlXSAtIEVuYWJsZS9kaXNhYmxlIHNvcnRpbmcgZm9yIGFsbCBjb2x1bW5zXG4gICAgICogQHBhcmFtIHtBcnJheX0gW2NvbmZpZy5vcmRlcj1bWzAsICdhc2MnXV1dIC0gRGVmYXVsdCBzb3J0IG9yZGVyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtjb25maWcuYWpheERhdGFdIC0gQWRkaXRpb25hbCBkYXRhIHBhcmFtZXRlcnMgZm9yIEFKQVggcmVxdWVzdHNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2VydmVyU2lkZT1mYWxzZV0gLSBFbmFibGUgc2VydmVyLXNpZGUgcHJvY2Vzc2luZ1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcuY3VzdG9tRGVsZXRlUGVybWlzc2lvbkNoZWNrXSAtIEZ1bmN0aW9uIHRvIGNoZWNrIGlmIGRlbGV0ZSBpcyBhbGxvd2VkIGZvciBhIHJvd1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZykge1xuICAgICAgICAvLyBDb3JlIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy50YWJsZUlkID0gY29uZmlnLnRhYmxlSWQ7XG4gICAgICAgIHRoaXMuYXBpTW9kdWxlID0gY29uZmlnLmFwaU1vZHVsZTtcbiAgICAgICAgdGhpcy5yb3V0ZVByZWZpeCA9IGNvbmZpZy5yb3V0ZVByZWZpeDtcbiAgICAgICAgdGhpcy50cmFuc2xhdGlvbnMgPSBjb25maWcudHJhbnNsYXRpb25zIHx8IHt9O1xuICAgICAgICB0aGlzLmNvbHVtbnMgPSBjb25maWcuY29sdW1ucyB8fCBbXTtcbiAgICAgICAgdGhpcy5zaG93U3VjY2Vzc01lc3NhZ2VzID0gY29uZmlnLnNob3dTdWNjZXNzTWVzc2FnZXMgfHwgZmFsc2U7XG4gICAgICAgIHRoaXMuc2hvd0luZm8gPSBjb25maWcuc2hvd0luZm8gfHwgZmFsc2U7XG4gICAgICAgIHRoaXMuZGF0YVRhYmxlT3B0aW9ucyA9IGNvbmZpZy5kYXRhVGFibGVPcHRpb25zIHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gU29ydGluZyBjb25maWd1cmF0aW9uIChiYWNrd2FyZCBjb21wYXRpYmxlKVxuICAgICAgICB0aGlzLm9yZGVyYWJsZSA9IGNvbmZpZy5vcmRlcmFibGUgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5vcmRlcmFibGUgOiB0cnVlO1xuICAgICAgICB0aGlzLmVuYWJsZVNlYXJjaEluZGV4ID0gY29uZmlnLmVuYWJsZVNlYXJjaEluZGV4ICE9PSBmYWxzZTsgLy8gRGVmYXVsdCB0cnVlXG4gICAgICAgIC8vIEFkanVzdCBkZWZhdWx0IHNvcnQgb3JkZXIgaWYgc2VhcmNoX2luZGV4IGlzIGFkZGVkIChpdCB3aWxsIGJlIGNvbHVtbiAwKVxuICAgICAgICB0aGlzLm9yZGVyID0gY29uZmlnLm9yZGVyIHx8ICh0aGlzLmVuYWJsZVNlYXJjaEluZGV4ID8gW1sxLCAnYXNjJ11dIDogW1swLCAnYXNjJ11dKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBlcm1pc3Npb24gc3RhdGUgKGxvYWRlZCBmcm9tIHNlcnZlcilcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IHtcbiAgICAgICAgICAgIHNhdmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9kaWZ5OiBmYWxzZSxcbiAgICAgICAgICAgIGVkaXQ6IGZhbHNlLFxuICAgICAgICAgICAgZGVsZXRlOiBmYWxzZSxcbiAgICAgICAgICAgIGNvcHk6IGZhbHNlLFxuICAgICAgICAgICAgY3VzdG9tOiB7fVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWN0aW9uIGJ1dHRvbnMgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmFjdGlvbkJ1dHRvbnMgPSBjb25maWcuYWN0aW9uQnV0dG9ucyB8fCBbJ2VkaXQnLCAnZGVsZXRlJ107XG4gICAgICAgIHRoaXMuY3VzdG9tQWN0aW9uQnV0dG9ucyA9IGNvbmZpZy5jdXN0b21BY3Rpb25CdXR0b25zIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzY3JpcHRpb24gdHJ1bmNhdGlvbiBzZXR0aW5nc1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIG1heExpbmVzOiAzLFxuICAgICAgICAgICAgZHluYW1pY0hlaWdodDogZmFsc2UsXG4gICAgICAgICAgICBjYWxjdWxhdGVMaW5lczogbnVsbFxuICAgICAgICB9LCBjb25maWcuZGVzY3JpcHRpb25TZXR0aW5ncyB8fCB7fSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnRlcm5hbCBwcm9wZXJ0aWVzXG4gICAgICAgIHRoaXMuJHRhYmxlID0gJChgIyR7dGhpcy50YWJsZUlkfWApO1xuICAgICAgICB0aGlzLmRhdGFUYWJsZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gT3B0aW9uYWwgY2FsbGJhY2tzXG4gICAgICAgIHRoaXMub25EYXRhTG9hZGVkID0gY29uZmlnLm9uRGF0YUxvYWRlZDtcbiAgICAgICAgdGhpcy5vbkRyYXdDYWxsYmFjayA9IGNvbmZpZy5vbkRyYXdDYWxsYmFjaztcbiAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkID0gY29uZmlnLm9uUGVybWlzc2lvbnNMb2FkZWQ7XG4gICAgICAgIHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlciA9IGNvbmZpZy5jdXN0b21EZWxldGVIYW5kbGVyO1xuICAgICAgICB0aGlzLm9uQWZ0ZXJEZWxldGUgPSBjb25maWcub25BZnRlckRlbGV0ZTtcbiAgICAgICAgdGhpcy5nZXRNb2RpZnlVcmwgPSBjb25maWcuZ2V0TW9kaWZ5VXJsO1xuICAgICAgICB0aGlzLmN1c3RvbURlbGV0ZVBlcm1pc3Npb25DaGVjayA9IGNvbmZpZy5jdXN0b21EZWxldGVQZXJtaXNzaW9uQ2hlY2s7XG4gICAgICAgIHRoaXMuYWpheERhdGEgPSBjb25maWcuYWpheERhdGEgfHwge307XG4gICAgICAgIHRoaXMuc2VydmVyU2lkZSA9IGNvbmZpZy5zZXJ2ZXJTaWRlIHx8IGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGUgd2l0aCBwZXJtaXNzaW9uIGxvYWRpbmdcbiAgICAgKi9cbiAgICBhc3luYyBpbml0aWFsaXplKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gU2hvdyBsb2FkZXIgd2hpbGUgaW5pdGlhbGl6aW5nXG4gICAgICAgICAgICB0aGlzLnNob3dMb2FkZXIoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmlyc3QsIGxvYWQgcGVybWlzc2lvbnMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubG9hZFBlcm1pc3Npb25zKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgRGF0YVRhYmxlICh3aWxsIGhhbmRsZSBsb2FkZXIvZW1wdHkgc3RhdGUgaW4gZGF0YSBjYWxsYmFjaylcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGluaXRpYWxpemUgUGJ4RGF0YVRhYmxlSW5kZXg6JywgZXJyb3IpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5leF9FcnJvckluaXRpYWxpemluZ1RhYmxlKTtcbiAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcGVybWlzc2lvbnMgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBhc3luYyBsb2FkUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWFjbC9jaGVja1Blcm1pc3Npb25zYCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogdGhpcy5yb3V0ZVByZWZpeFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMucGVybWlzc2lvbnMsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uUGVybWlzc2lvbnNMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkKHRoaXMucGVybWlzc2lvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGxvYWQgcGVybWlzc2lvbnMsIHVzaW5nIGRlZmF1bHRzOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIE9uIGVycm9yLCBkZWZhdWx0IHRvIG5vIHBlcm1pc3Npb25zIGZvciBzYWZldHlcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIGNvbW1vbiBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgLy8gQWRkIHRoZSBkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQgY2xhc3MgdG8gdGhlIHRhYmxlXG4gICAgICAgIHRoaXMuJHRhYmxlLmFkZENsYXNzKCdkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBtaXNzaW5nIGhlYWRlciBjZWxscyBpZiBuZWVkZWQgZm9yIHNlYXJjaF9pbmRleCBjb2x1bW5cbiAgICAgICAgdGhpcy5lbnN1cmVIZWFkZXJDZWxscygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJvY2Vzc2VkQ29sdW1ucyA9IHRoaXMucHJvY2Vzc0NvbHVtbnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHYzIEFQSSBmb3JtYXQgd2l0aCBnZXRMaXN0IG1ldGhvZFxuICAgICAgICBsZXQgYWpheENvbmZpZztcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5hcGlNb2R1bGUuZ2V0TGlzdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gdjMgZm9ybWF0IHdpdGggZ2V0TGlzdCBtZXRob2QgLSB1c2UgY3VzdG9tIGFqYXggZnVuY3Rpb25cbiAgICAgICAgICAgIGFqYXhDb25maWcgPSAoZGF0YSwgY2FsbGJhY2ssIHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGlNb2R1bGUuZ2V0TGlzdCh0aGlzLmFqYXhEYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc2VkRGF0YSA9IHRoaXMuaGFuZGxlRGF0YUxvYWQocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBwcm9jZXNzZWREYXRhXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBtb2R1bGUgZG9lcyBub3QgaGF2ZSBnZXRMaXN0IG1ldGhvZCcpO1xuICAgICAgICAgICAgYWpheENvbmZpZyA9IHtkYXRhOiBbXX07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgICAgICAgIGFqYXg6IGFqYXhDb25maWcsXG4gICAgICAgICAgICBjb2x1bW5zOiBwcm9jZXNzZWRDb2x1bW5zLFxuICAgICAgICAgICAgb3JkZXI6IHRoaXMub3JkZXIsXG4gICAgICAgICAgICBvcmRlcmluZzogdGhpcy5vcmRlcmFibGUsXG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IHRoaXMuc2hvd0luZm8sXG4gICAgICAgICAgICBhdXRvV2lkdGg6IGZhbHNlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjazogKCkgPT4gdGhpcy5oYW5kbGVEcmF3Q2FsbGJhY2soKSxcbiAgICAgICAgICAgIC8vIEFwcGx5IGN1c3RvbSBEYXRhVGFibGUgb3B0aW9ucywgb3ZlcnJpZGluZyBkZWZhdWx0cyBpZiBwcm92aWRlZFxuICAgICAgICAgICAgLi4udGhpcy5kYXRhVGFibGVPcHRpb25zXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB0aGlzLiR0YWJsZS5EYXRhVGFibGUoY29uZmlnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGVsZXRlSGFuZGxlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDb3B5SGFuZGxlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDdXN0b21IYW5kbGVycygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGNvbHVtbiBkZWZpbml0aW9ucyBhbmQgYWRkIGFjdGlvbiBjb2x1bW4gaWYgbmVlZGVkXG4gICAgICovXG4gICAgcHJvY2Vzc0NvbHVtbnMoKSB7XG4gICAgICAgIGNvbnN0IGNvbHVtbnMgPSBbLi4udGhpcy5jb2x1bW5zXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoaWRkZW4gc2VhcmNoX2luZGV4IGNvbHVtbiBhdCB0aGUgYmVnaW5uaW5nIGlmIGVuYWJsZWQgYW5kIG5vdCBwcmVzZW50XG4gICAgICAgIC8vIFRoaXMgY29sdW1uIGNvbnRhaW5zIGFsbCBzZWFyY2hhYmxlIHRleHQgd2l0aG91dCBIVE1MIGZvcm1hdHRpbmdcbiAgICAgICAgaWYgKHRoaXMuZW5hYmxlU2VhcmNoSW5kZXggJiYgIWNvbHVtbnMuZmluZChjb2wgPT4gY29sLmRhdGEgPT09ICdzZWFyY2hfaW5kZXgnKSkge1xuICAgICAgICAgICAgY29sdW1ucy51bnNoaWZ0KHtcbiAgICAgICAgICAgICAgICBkYXRhOiAnc2VhcmNoX2luZGV4JyxcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGVmYXVsdENvbnRlbnQ6ICcnLFxuICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHNlYXJjaF9pbmRleCBpcyBub3QgcHJvdmlkZWQgYnkgYmFja2VuZCwgZ2VuZXJhdGUgaXQgZnJvbSByb3cgZGF0YVxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBnZW5lcmF0ZSBzZWFyY2ggaW5kZXggZnJvbSB2aXNpYmxlIGZpZWxkc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hhYmxlRmllbGRzID0gW107XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHJvdykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBpbnRlcm5hbCBmaWVsZHMgYW5kIHJlcHJlc2VudCBmaWVsZHMgKHRoZXkncmUgb2Z0ZW4gZHVwbGljYXRlcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgIT09ICdzZWFyY2hfaW5kZXgnICYmIGtleSAhPT0gJ2lkJyAmJiBrZXkgIT09ICd1bmlxaWQnICYmIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSAhPT0gJ0RUX1Jvd0lkJyAmJiAha2V5LmVuZHNXaXRoKCdfcmVwcmVzZW50JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHJvd1trZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0cmlwIEhUTUwgdGFncyBhbmQgYWRkIHRvIHNlYXJjaGFibGUgZmllbGRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuVmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC88W14+XSo+L2csICcnKS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGVhblZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlRmllbGRzLnB1c2goY2xlYW5WYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZUZpZWxkcy5wdXNoKHZhbHVlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFsc28gcHJvY2VzcyBfcmVwcmVzZW50IGZpZWxkcyBhcyB0aGV5IGNvbnRhaW4gdXNlci1mcmllbmRseSB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHJvdykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5lbmRzV2l0aCgnX3JlcHJlc2VudCcpICYmIHJvd1trZXldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xlYW5WYWx1ZSA9IFN0cmluZyhyb3dba2V5XSkucmVwbGFjZSgvPFtePl0qPi9nLCAnJykudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGVhblZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGVGaWVsZHMucHVzaChjbGVhblZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VhcmNoYWJsZUZpZWxkcy5qb2luKCcgJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgc29ydGluZyBpcyBnbG9iYWxseSBkaXNhYmxlZCwgZW5zdXJlIGFsbCBjb2x1bW5zIHJlc3BlY3QgaXRcbiAgICAgICAgaWYgKCF0aGlzLm9yZGVyYWJsZSkge1xuICAgICAgICAgICAgY29sdW1ucy5mb3JFYWNoKGNvbCA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUHJlc2VydmUgZXhwbGljaXQgb3JkZXJhYmxlOiBmYWxzZSwgYnV0IG92ZXJyaWRlIHRydWUgb3IgdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgaWYgKGNvbC5vcmRlcmFibGUgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbC5vcmRlcmFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0YW5kYXJkIGFjdGlvbiBjb2x1bW4gaWYgbm90IGFscmVhZHkgcHJlc2VudFxuICAgICAgICBpZiAoIWNvbHVtbnMuZmluZChjb2wgPT4gY29sLmlzQWN0aW9uQ29sdW1uKSkge1xuICAgICAgICAgICAgY29sdW1ucy5wdXNoKHRoaXMuY3JlYXRlQWN0aW9uQ29sdW1uKCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY29sdW1ucztcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHN0YW5kYXJkIGFjdGlvbiBjb2x1bW4gd2l0aCBwZXJtaXNzaW9uLWJhc2VkIHJlbmRlcmluZ1xuICAgICAqL1xuICAgIGNyZWF0ZUFjdGlvbkNvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBjbGFzc05hbWU6ICdyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmcnLFxuICAgICAgICAgICAgaXNBY3Rpb25Db2x1bW46IHRydWUsXG4gICAgICAgICAgICByZW5kZXI6IChkYXRhLCB0eXBlLCByb3cpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBidXR0b25zID0gW107XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSByZWNvcmQgSUQgLSBjaGVjayBmb3IgYm90aCB1bmlxaWQgYW5kIGlkIGZpZWxkc1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gcm93LnVuaXFpZCB8fCByb3cuaWQgfHwgJyc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRWRpdCBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdlZGl0JykgJiYgXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLnBlcm1pc3Npb25zLm1vZGlmeSB8fCB0aGlzLnBlcm1pc3Npb25zLmVkaXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgY3VzdG9tIGdldE1vZGlmeVVybCBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsID8gXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdldE1vZGlmeVVybChyZWNvcmRJZCkgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvJHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke21vZGlmeVVybH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGVkaXQgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGVkaXQgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uQnV0dG9ucy5pbmNsdWRlcygnY29weScpICYmIHRoaXMucGVybWlzc2lvbnMuY29weSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke3JlY29yZElkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBjb3B5IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBjb3B5IG91dGxpbmUgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEN1c3RvbSBidXR0b25zXG4gICAgICAgICAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zLmZvckVhY2goY3VzdG9tQnV0dG9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvbnMuY3VzdG9tICYmIHRoaXMucGVybWlzc2lvbnMuY3VzdG9tW2N1c3RvbUJ1dHRvbi5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaHJlZiA9IGN1c3RvbUJ1dHRvbi5ocmVmIHx8ICcjJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFWYWx1ZSA9IGN1c3RvbUJ1dHRvbi5pbmNsdWRlSWQgPyBgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCJgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2hyZWZ9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtkYXRhVmFsdWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gJHtjdXN0b21CdXR0b24uY2xhc3N9IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChjdXN0b21CdXR0b24udG9vbHRpcCl9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtjdXN0b21CdXR0b24uaWNvbn1cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBEZWxldGUgYnV0dG9uIChhbHdheXMgbGFzdClcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdkZWxldGUnKSAmJiB0aGlzLnBlcm1pc3Npb25zLmRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBjdXN0b20gZGVsZXRlIHBlcm1pc3Npb24gY2hlY2sgaXMgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgIGxldCBjYW5EZWxldGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXN0b21EZWxldGVQZXJtaXNzaW9uQ2hlY2sgJiYgdHlwZW9mIHRoaXMuY3VzdG9tRGVsZXRlUGVybWlzc2lvbkNoZWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5EZWxldGUgPSB0aGlzLmN1c3RvbURlbGV0ZVBlcm1pc3Npb25DaGVjayhyb3cpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhbkRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBkaXNhYmxlZCBkZWxldGUgYnV0dG9uIHdpdGggZXhwbGFuYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZSBkaXNhYmxlZCBwb3B1cGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke3RoaXMudHJhbnNsYXRpb25zLmRlbGV0ZURpc2FibGVkVG9vbHRpcCB8fCBnbG9iYWxUcmFuc2xhdGUuYnRfQ2Fubm90RGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggZ3JleVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gYnV0dG9ucy5sZW5ndGggPiAwID8gXG4gICAgICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj4ke2J1dHRvbnMuam9pbignJyl9PC9kaXY+YCA6IFxuICAgICAgICAgICAgICAgICAgICAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRhdGEgbG9hZCBhbmQgZW1wdHkgc3RhdGUgbWFuYWdlbWVudFxuICAgICAqIHYzIEFQSSBmb3JtYXQ6IHtyZXN1bHQ6IGJvb2xlYW4sIGRhdGE6IGFycmF5fSBvciB7ZGF0YToge2l0ZW1zOiBhcnJheX19XG4gICAgICovXG4gICAgaGFuZGxlRGF0YUxvYWQocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGlkZSBsb2FkZXIgZmlyc3RcbiAgICAgICAgdGhpcy5oaWRlTG9hZGVyKCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgZGF0YSA9IFtdO1xuICAgICAgICBsZXQgaXNTdWNjZXNzID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgZXJyb3IgcmVzcG9uc2VcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCByZXNwb25zZS5yZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBpc1N1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIGRhdGEgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTdGFuZGFyZCB2MyBmb3JtYXQgd2l0aCBkYXRhIGFycmF5XG4gICAgICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgIGlzU3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfVxuICAgICAgICAvLyB2MyBmb3JtYXQgd2l0aCBpdGVtcyBwcm9wZXJ0eVxuICAgICAgICBlbHNlIGlmIChyZXNwb25zZS5kYXRhICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YS5pdGVtcykpIHtcbiAgICAgICAgICAgIGlzU3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICBkYXRhID0gcmVzcG9uc2UuZGF0YS5pdGVtcztcbiAgICAgICAgfVxuICAgICAgICAvLyBGYWxsYmFjayBmb3IgcmVzcG9uc2VzIHdpdGggcmVzdWx0OnRydWUgYnV0IG5vIGRhdGFcbiAgICAgICAgZWxzZSBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpc1N1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgZGF0YSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBpc0VtcHR5ID0gIWlzU3VjY2VzcyB8fCBkYXRhLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKGlzRW1wdHkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRW1wdHkgJiYgIWlzU3VjY2Vzcykge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5leF9FcnJvckxvYWRpbmdEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMub25EYXRhTG9hZGVkKSB7XG4gICAgICAgICAgICAvLyBQYXNzIG5vcm1hbGl6ZWQgcmVzcG9uc2UgdG8gY2FsbGJhY2tcbiAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGlzU3VjY2VzcyxcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5vbkRhdGFMb2FkZWQobm9ybWFsaXplZFJlc3BvbnNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBkcmF3IGNhbGxiYWNrIGZvciBwb3N0LXJlbmRlciBvcGVyYXRpb25zXG4gICAgICovXG4gICAgaGFuZGxlRHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIHBvcHVwc1xuICAgICAgICB0aGlzLiR0YWJsZS5maW5kKCcucG9wdXBlZCcpLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gTW92ZSBBZGQgTmV3IGJ1dHRvbiB0byBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgdGhpcy5yZXBvc2l0aW9uQWRkQnV0dG9uKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZWRpdGluZ1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKTtcblxuICAgICAgICAvLyBIaWRlIHBhZ2luYXRpb24gY29udHJvbHMgd2hlbiBhbGwgcmVjb3JkcyBmaXQgb24gb25lIHBhZ2VcbiAgICAgICAgdGhpcy50b2dnbGVQYWdpbmF0aW9uVmlzaWJpbGl0eSgpO1xuXG4gICAgICAgIC8vIEN1c3RvbSBkcmF3IGNhbGxiYWNrXG4gICAgICAgIGlmICh0aGlzLm9uRHJhd0NhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLm9uRHJhd0NhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgcGFnaW5hdGlvbiB2aXNpYmlsaXR5IGJhc2VkIG9uIHBhZ2UgY291bnRcbiAgICAgKiBIaWRlcyBwYWdpbmF0aW9uIHdoZW4gYWxsIHJlY29yZHMgZml0IG9uIGEgc2luZ2xlIHBhZ2VcbiAgICAgKi9cbiAgICB0b2dnbGVQYWdpbmF0aW9uVmlzaWJpbGl0eSgpIHtcbiAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIERhdGFUYWJsZSBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgRGF0YVRhYmxlIGluc3RhbmNlXG4gICAgICAgICAgICBjb25zdCB0YWJsZSA9IHRoaXMuJHRhYmxlLkRhdGFUYWJsZSgpO1xuICAgICAgICAgICAgaWYgKHRhYmxlICYmIHRhYmxlLnBhZ2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gdGFibGUucGFnZS5pbmZvKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFibGVJZCA9IHRoaXMuJHRhYmxlLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHBhZ2luYXRlQ29udGFpbmVyID0gJChgIyR7dGFibGVJZH1fcGFnaW5hdGVgKTtcblxuICAgICAgICAgICAgICAgIGlmICgkcGFnaW5hdGVDb250YWluZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmZvLnBhZ2VzIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgcGFnaW5hdGlvbiB3aGVuIHRoZXJlJ3Mgb25seSBvbmUgcGFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgJHBhZ2luYXRlQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNob3cgcGFnaW5hdGlvbiB3aGVuIHRoZXJlIGFyZSBtdWx0aXBsZSBwYWdlc1xuICAgICAgICAgICAgICAgICAgICAgICAgJHBhZ2luYXRlQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEVuc3VyZSB0YWJsZSBoYXMgZW5vdWdoIGhlYWRlciBjZWxscyBmb3IgYWxsIGNvbHVtbnNcbiAgICAgKiBUaGlzIGlzIG5lZWRlZCB3aGVuIHdlIGFkZCB0aGUgaGlkZGVuIHNlYXJjaF9pbmRleCBjb2x1bW4gcHJvZ3JhbW1hdGljYWxseVxuICAgICAqL1xuICAgIGVuc3VyZUhlYWRlckNlbGxzKCkge1xuICAgICAgICBpZiAoIXRoaXMuZW5hYmxlU2VhcmNoSW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgJHRoZWFkID0gdGhpcy4kdGFibGUuZmluZCgndGhlYWQnKTtcbiAgICAgICAgaWYgKCEkdGhlYWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgdGhlYWQgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgdGhpcy4kdGFibGUucHJlcGVuZCgnPHRoZWFkPjx0cj48L3RyPjwvdGhlYWQ+Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRoZWFkZXJSb3cgPSB0aGlzLiR0YWJsZS5maW5kKCd0aGVhZCB0cicpLmZpcnN0KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYSBoaWRkZW4gaGVhZGVyIGNlbGwgYXQgdGhlIGJlZ2lubmluZyBmb3Igc2VhcmNoX2luZGV4XG4gICAgICAgIC8vIERhdGFUYWJsZXMgcmVxdWlyZXMgbWF0Y2hpbmcgbnVtYmVyIG9mIHRoIGVsZW1lbnRzIGFuZCBjb2x1bW5zXG4gICAgICAgICRoZWFkZXJSb3cucHJlcGVuZCgnPHRoIHN0eWxlPVwiZGlzcGxheTpub25lO1wiPlNlYXJjaCBJbmRleDwvdGg+Jyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcG9zaXRpb24gQWRkIE5ldyBidXR0b24gdG8gRGF0YVRhYmxlcyB3cmFwcGVyXG4gICAgICovXG4gICAgcmVwb3NpdGlvbkFkZEJ1dHRvbigpIHtcbiAgICAgICAgY29uc3QgJGFkZEJ1dHRvbiA9ICQoJyNhZGQtbmV3LWJ1dHRvbicpO1xuICAgICAgICBjb25zdCAkd3JhcHBlciA9ICQoYCMke3RoaXMudGFibGVJZH1fd3JhcHBlcmApO1xuICAgICAgICBjb25zdCAkbGVmdENvbHVtbiA9ICR3cmFwcGVyLmZpbmQoJy5laWdodC53aWRlLmNvbHVtbicpLmZpcnN0KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGFkZEJ1dHRvbi5sZW5ndGggJiYgJGxlZnRDb2x1bW4ubGVuZ3RoICYmIHRoaXMucGVybWlzc2lvbnMuc2F2ZSkge1xuICAgICAgICAgICAgJGxlZnRDb2x1bW4uYXBwZW5kKCRhZGRCdXR0b24pO1xuICAgICAgICAgICAgJGFkZEJ1dHRvbi5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZWxldGUgaGFuZGxlciB3aXRoIHR3by1zdGVwIGNvbmZpcm1hdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVEZWxldGVIYW5kbGVyKCkge1xuICAgICAgICAvLyBEZWxldGVTb21ldGhpbmcuanMgaGFuZGxlcyBmaXJzdCBjbGlja1xuICAgICAgICAvLyBXZSBoYW5kbGUgc2Vjb25kIGNsaWNrIHdoZW4gdHdvLXN0ZXBzLWRlbGV0ZSBjbGFzcyBpcyByZW1vdmVkXG4gICAgICAgIHRoaXMuJHRhYmxlLm9uKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodGhpcy5jdXN0b21EZWxldGVIYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXN0b21EZWxldGVIYW5kbGVyKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHRoaXMuY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaU1vZHVsZS5kZWxldGVSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4gdGhpcy5jYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNvcHkgaGFuZGxlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVDb3B5SGFuZGxlcigpIHtcbiAgICAgICAgdGhpcy4kdGFibGUub24oJ2NsaWNrJywgJ2EuY29weScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSBzYW1lIGxvZ2ljIGFzIG1vZGlmeSBVUkwgYnV0IGFkZCBjb3B5IHBhcmFtZXRlclxuICAgICAgICAgICAgbGV0IGNvcHlVcmw7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRNb2RpZnlVcmwpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgY3VzdG9tIGdldE1vZGlmeVVybCBhbmQgYWRkIGNvcHkgcGFyYW1ldGVyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9kaWZ5VXJsID0gdGhpcy5nZXRNb2RpZnlVcmwocmVjb3JkSWQpO1xuICAgICAgICAgICAgICAgIGlmIChtb2RpZnlVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHJlY29yZElkIGZyb20gVVJMIGFuZCBhZGQgY29weSBwYXJhbWV0ZXJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZVVybCA9IG1vZGlmeVVybC5yZXBsYWNlKGAvJHtyZWNvcmRJZH1gLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvcHlVcmwgPSBgJHtiYXNlVXJsfS8/Y29weT0ke3JlY29yZElkfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBEZWZhdWx0IFVSTCBwYXR0ZXJuXG4gICAgICAgICAgICAgICAgY29weVVybCA9IGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvP2NvcHk9JHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWRpcmVjdCB0byBjb3B5IFVSTFxuICAgICAgICAgICAgaWYgKGNvcHlVcmwpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBjb3B5VXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjdXN0b20gYnV0dG9uIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUN1c3RvbUhhbmRsZXJzKCkge1xuICAgICAgICB0aGlzLmN1c3RvbUFjdGlvbkJ1dHRvbnMuZm9yRWFjaChjdXN0b21CdXR0b24gPT4ge1xuICAgICAgICAgICAgaWYgKGN1c3RvbUJ1dHRvbi5vbkNsaWNrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kdGFibGUub24oJ2NsaWNrJywgYGEuJHtjdXN0b21CdXR0b24uY2xhc3N9YCwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUJ1dHRvbi5vbkNsaWNrKHJlY29yZElkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHJlY29yZCBkZWxldGlvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gUmVsb2FkIHRhYmxlIGRhdGEgd2l0aCBjYWxsYmFjayBzdXBwb3J0XG4gICAgICAgICAgICBjb25zdCByZWxvYWRDYWxsYmFjayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDYWxsIGN1c3RvbSBhZnRlci1kZWxldGUgY2FsbGJhY2sgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMub25BZnRlckRlbGV0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQWZ0ZXJEZWxldGUocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbG9hZCB0YWJsZSBhbmQgZXhlY3V0ZSBjYWxsYmFja1xuICAgICAgICAgICAgdGhpcy5kYXRhVGFibGUuYWpheC5yZWxvYWQocmVsb2FkQ2FsbGJhY2ssIGZhbHNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHJlbGF0ZWQgY29tcG9uZW50c1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25zQVBJICE9PSAndW5kZWZpbmVkJyAmJiBFeHRlbnNpb25zQVBJLmNiT25EYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkuY2JPbkRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN1Y2Nlc3MgbWVzc2FnZSByZW1vdmVkIC0gbm8gbmVlZCB0byBzaG93IHN1Y2Nlc3MgZm9yIGRlbGV0aW9uIG9wZXJhdGlvbnNcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyYW5zbGF0aW9ucy5kZWxldGVFcnJvciB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4X0ltcG9zc2libGVUb0RlbGV0ZVJlY29yZDtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZSBmcm9tIGFsbCBkZWxldGUgYnV0dG9uc1xuICAgICAgICB0aGlzLiR0YWJsZS5maW5kKCdhLmRlbGV0ZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgbG9hZGVyIHdoaWxlIGxvYWRpbmcgZGF0YVxuICAgICAqL1xuICAgIHNob3dMb2FkZXIoKSB7XG4gICAgICAgIC8vIEhpZGUgZXZlcnl0aGluZyBmaXJzdFxuICAgICAgICAvLyBGaW5kIHRoZSB0YWJsZSdzIHBhcmVudCBjb250YWluZXIgLSBuZWVkIHRoZSBvcmlnaW5hbCBjb250YWluZXIsIG5vdCB0aGUgRGF0YVRhYmxlcyB3cmFwcGVyXG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkJD1cIl93cmFwcGVyXCJdJyk7XG4gICAgICAgIGxldCAkY29udGFpbmVyO1xuICAgICAgICBpZiAoJHdyYXBwZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHBhcmVudCBvZiB0aGUgd3JhcHBlciAoc2hvdWxkIGJlIHRoZSBvcmlnaW5hbCBjb250YWluZXIpXG4gICAgICAgICAgICAkY29udGFpbmVyID0gJHdyYXBwZXIucGFyZW50KCdkaXZbaWRdJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmFsbGJhY2sgaWYgc3RydWN0dXJlIGlzIGRpZmZlcmVudFxuICAgICAgICBpZiAoISRjb250YWluZXIgfHwgISRjb250YWluZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAkY29udGFpbmVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkXTpub3QoW2lkJD1cIl93cmFwcGVyXCJdKScpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0ICRwbGFjZWhvbGRlciA9ICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpO1xuICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIFxuICAgICAgICAkY29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgJHBsYWNlaG9sZGVyLmhpZGUoKTtcbiAgICAgICAgJGFkZEJ1dHRvbi5oaWRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYW5kIHNob3cgbG9hZGVyIGlmIG5vdCBleGlzdHNcbiAgICAgICAgbGV0ICRsb2FkZXIgPSAkKCcjdGFibGUtZGF0YS1sb2FkZXInKTtcbiAgICAgICAgaWYgKCEkbG9hZGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgc2VnbWVudCB3aXRoIGxvYWRlciBmb3IgYmV0dGVyIHZpc3VhbCBhcHBlYXJhbmNlXG4gICAgICAgICAgICAkbG9hZGVyID0gJChgXG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cInRhYmxlLWRhdGEtbG9hZGVyXCIgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJtaW4taGVpZ2h0OiAyMDBweDsgcG9zaXRpb246IHJlbGF0aXZlO1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aXZlIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHQgbG9hZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXhfTG9hZGluZ0RhdGF9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAvLyBJbnNlcnQgbG9hZGVyIGluIHRoZSBhcHByb3ByaWF0ZSBwbGFjZVxuICAgICAgICAgICAgaWYgKCRjb250YWluZXIubGVuZ3RoICYmICRjb250YWluZXIucGFyZW50KCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5iZWZvcmUoJGxvYWRlcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGggJiYgJHBsYWNlaG9sZGVyLnBhcmVudCgpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5iZWZvcmUoJGxvYWRlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBhcHBlbmQgdG8gYm9keSBvciBwYXJlbnQgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgY29uc3QgJHBhcmVudCA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJy5wdXNoZXInKSB8fCB0aGlzLiR0YWJsZS5wYXJlbnQoKTtcbiAgICAgICAgICAgICAgICAkcGFyZW50LmFwcGVuZCgkbG9hZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkbG9hZGVyLnNob3coKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBsb2FkZXJcbiAgICAgKi9cbiAgICBoaWRlTG9hZGVyKCkge1xuICAgICAgICAkKCcjdGFibGUtZGF0YS1sb2FkZXInKS5oaWRlKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBlbXB0eSB0YWJsZSBwbGFjZWhvbGRlciB2aXNpYmlsaXR5XG4gICAgICovXG4gICAgdG9nZ2xlRW1wdHlQbGFjZWhvbGRlcihpc0VtcHR5KSB7XG4gICAgICAgIC8vIEZpbmQgdGhlIHRhYmxlJ3MgcGFyZW50IGNvbnRhaW5lciAtIG5lZWQgdGhlIG9yaWdpbmFsIGNvbnRhaW5lciwgbm90IHRoZSBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgLy8gRGF0YVRhYmxlcyB3cmFwcyB0aGUgdGFibGUgaW4gYSBkaXYgd2l0aCBpZCBlbmRpbmcgaW4gJ193cmFwcGVyJ1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGZpbmQgdGhlIHBhcmVudCBvZiB0aGF0IHdyYXBwZXIgd2hpY2ggaXMgdGhlIG9yaWdpbmFsIGNvbnRhaW5lclxuICAgICAgICBjb25zdCAkd3JhcHBlciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZCQ9XCJfd3JhcHBlclwiXScpO1xuICAgICAgICBsZXQgJGNvbnRhaW5lcjtcbiAgICAgICAgaWYgKCR3cmFwcGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBwYXJlbnQgb2YgdGhlIHdyYXBwZXIgKHNob3VsZCBiZSB0aGUgb3JpZ2luYWwgY29udGFpbmVyKVxuICAgICAgICAgICAgJGNvbnRhaW5lciA9ICR3cmFwcGVyLnBhcmVudCgnZGl2W2lkXScpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZhbGxiYWNrIGlmIHN0cnVjdHVyZSBpcyBkaWZmZXJlbnRcbiAgICAgICAgaWYgKCEkY29udGFpbmVyIHx8ICEkY29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgJGNvbnRhaW5lciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZF06bm90KFtpZCQ9XCJfd3JhcHBlclwiXSknKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRwbGFjZWhvbGRlciA9ICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRW1wdHkpIHtcbiAgICAgICAgICAgICRjb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgJGFkZEJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgcGxhY2Vob2xkZXIgaXMgdmlzaWJsZVxuICAgICAgICAgICAgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkcGxhY2Vob2xkZXIuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkcGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvbnMuc2F2ZSkge1xuICAgICAgICAgICAgICAgICRhZGRCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGNvbnRhaW5lci5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgKiBFeGNsdWRlcyBhY3Rpb24gYnV0dG9uIGNlbGxzIHRvIGF2b2lkIGNvbmZsaWN0c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKSB7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9uKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmRhdGFUYWJsZS5yb3coZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCk7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHJlY29yZCBJRCAtIGNoZWNrIGZvciBib3RoIHVuaXFpZCBhbmQgaWQgZmllbGRzXG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9IGRhdGEgJiYgKGRhdGEudW5pcWlkIHx8IGRhdGEuaWQpO1xuICAgICAgICAgICAgaWYgKHJlY29yZElkICYmICh0aGlzLnBlcm1pc3Npb25zLm1vZGlmeSB8fCB0aGlzLnBlcm1pc3Npb25zLmVkaXQpKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBnZXRNb2RpZnlVcmwgaWYgcHJvdmlkZWQsIG90aGVyd2lzZSB1c2UgZGVmYXVsdFxuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsID8gXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0TW9kaWZ5VXJsKHJlY29yZElkKSA6IFxuICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxSb290VXJsfSR7dGhpcy5yb3V0ZVByZWZpeH0vbW9kaWZ5LyR7cmVjb3JkSWR9YDtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBtb2RpZnlVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSB1bmlmaWVkIGRlc2NyaXB0aW9uIHJlbmRlcmVyIHdpdGggdHJ1bmNhdGlvbiBzdXBwb3J0XG4gICAgICogXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZW5kZXJlciBmdW5jdGlvbiBmb3IgRGF0YVRhYmxlc1xuICAgICAqL1xuICAgIGNyZWF0ZURlc2NyaXB0aW9uUmVuZGVyZXIoKSB7XG4gICAgICAgIHJldHVybiAoZGF0YSwgdHlwZSwgcm93KSA9PiB7XG4gICAgICAgICAgICBpZiAoIWRhdGEgfHwgZGF0YS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICfigJQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Rpc3BsYXknKSB7XG4gICAgICAgICAgICAgICAgLy8gRXNjYXBlIEhUTUwgdG8gcHJldmVudCBYU1NcbiAgICAgICAgICAgICAgICBjb25zdCBzYWZlRGVzYyA9IHdpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRpb25MaW5lcyA9IHNhZmVEZXNjLnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKSAhPT0gJycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBtYXggbGluZXNcbiAgICAgICAgICAgICAgICBsZXQgbWF4TGluZXMgPSB0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MubWF4TGluZXM7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5keW5hbWljSGVpZ2h0ICYmIHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5jYWxjdWxhdGVMaW5lcykge1xuICAgICAgICAgICAgICAgICAgICBtYXhMaW5lcyA9IHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5jYWxjdWxhdGVMaW5lcyhyb3cpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZGVzY3JpcHRpb25MaW5lcy5sZW5ndGggPD0gbWF4TGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVzY3JpcHRpb24gZml0cyAtIHNob3cgd2l0aCBwcmVzZXJ2ZWQgZm9ybWF0dGluZ1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREZXNjID0gZGVzY3JpcHRpb25MaW5lcy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uLXRleHRcIiBzdHlsZT1cImxpbmUtaGVpZ2h0OiAxLjM7XCI+JHtmb3JtYXR0ZWREZXNjfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVzY3JpcHRpb24gdG9vIGxvbmcgLSB0cnVuY2F0ZSB3aXRoIHBvcHVwXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpc2libGVMaW5lcyA9IGRlc2NyaXB0aW9uTGluZXMuc2xpY2UoMCwgbWF4TGluZXMpO1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlTGluZXNbbWF4TGluZXMgLSAxXSArPSAnLi4uJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZERlc2MgPSB2aXNpYmxlTGluZXMuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsRGVzYyA9IGRlc2NyaXB0aW9uTGluZXMuam9pbignXFxuJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvbi10ZXh0IHRydW5jYXRlZCBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtmdWxsRGVzY31cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBvc2l0aW9uPVwidG9wIHJpZ2h0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJ3aWRlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogaGVscDsgYm9yZGVyLWJvdHRvbTogMXB4IGRvdHRlZCAjOTk5OyBsaW5lLWhlaWdodDogMS4zO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHt0cnVuY2F0ZWREZXNjfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIHNlYXJjaCBhbmQgb3RoZXIgb3BlcmF0aW9ucywgcmV0dXJuIHBsYWluIHRleHRcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IHRoZSBEYXRhVGFibGUgYW5kIGNsZWFudXBcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBSZW1vdmUgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJyk7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9mZignY2xpY2snLCAnYS5jb3B5Jyk7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9mZignZGJsY2xpY2snLCAndGJvZHkgdGQ6bm90KC5yaWdodC5hbGlnbmVkKScpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBEYXRhVGFibGUgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0aGlzLmRhdGFUYWJsZSAmJiB0eXBlb2YgdGhpcy5kYXRhVGFibGUuZGVzdHJveSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhpcy5kYXRhVGFibGUuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGVyXG4gICAgICAgICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpLnJlbW92ZSgpO1xuICAgIH1cbn1cblxuLy8gTWFrZSBhdmFpbGFibGUgZ2xvYmFsbHlcbndpbmRvdy5QYnhEYXRhVGFibGVJbmRleCA9IFBieERhdGFUYWJsZUluZGV4OyJdfQ==