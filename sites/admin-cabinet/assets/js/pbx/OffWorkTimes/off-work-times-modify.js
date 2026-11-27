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

/* global $ globalRootUrl Extensions moment Form globalTranslate
   SemanticLocalization SoundFileSelector UserMessage SecurityUtils
   IncomingRoutesAPI OffWorkTimesAPI DynamicDropdownBuilder ExtensionSelector OffWorkTimesTooltipManager */

/**
 * Module for managing out-of-work time settings
 * 
 * This module handles the form for creating and editing out-of-work time conditions.
 * It uses a unified REST API approach matching the incoming routes pattern.
 * 
 * @module outOfWorkTimeRecord
 */
var outOfWorkTimeRecord = {
  /**
   * jQuery object for the form.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * Record ID from URL
   * @type {string}
   */
  recordId: null,
  // Will be set in initialize()

  /**
   * Store loaded record data
   * @type {object|null}
   */
  recordData: null,
  // Form field jQuery objects
  $time_from: null,
  $time_to: null,
  $rulesTable: null,
  // Hidden input fields
  $idField: null,
  $weekdayFromField: null,
  $weekdayToField: null,
  $actionField: null,
  $calTypeField: null,
  $extensionField: null,
  $allowRestrictionField: null,
  $descriptionField: null,
  // Dropdown elements
  $actionDropdown: null,
  $calTypeDropdown: null,
  $weekdayFromDropdown: null,
  $weekdayToDropdown: null,
  // Tab elements
  $tabMenu: null,
  $rulesTab: null,
  // Will be initialized later
  $generalTab: null,
  // Will be initialized later
  $rulesTabSegment: null,
  // Will be initialized later
  $generalTabSegment: null,
  // Will be initialized later
  // Row elements
  $extensionRow: null,
  $audioMessageRow: null,
  // Calendar tab elements
  $calendarTab: null,
  $mainTab: null,
  // Date/time calendar elements
  $rangeDaysStart: null,
  $rangeDaysEnd: null,
  $rangeTimeStart: null,
  $rangeTimeEnd: null,
  // Erase buttons
  $eraseDatesBtn: null,
  $eraseWeekdaysBtn: null,
  $eraseTimeperiodBtn: null,
  // Error message element
  $errorMessage: null,
  // Audio message ID for sound file selector
  audioMessageId: 'audio_message_id',

  /**
   * Additional time interval validation rules
   * @type {array}
   */
  additionalTimeIntervalRules: [{
    type: 'regExp',
    value: /^([01]?[0-9]|2[0-3]):([0-5]?[0-9])$/,
    prompt: globalTranslate.tf_ValidateCheckTimeInterval
  }],

  /**
   * Validation rules for the form
   * @type {object}
   */
  validateRules: {
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'customNotEmptyIfActionRule[extension]',
        prompt: globalTranslate.tf_ValidateExtensionEmpty
      }]
    },
    audio_message_id: {
      identifier: 'audio_message_id',
      rules: [{
        type: 'customNotEmptyIfActionRule[playmessage]',
        prompt: globalTranslate.tf_ValidateAudioMessageEmpty
      }]
    },
    calUrl: {
      identifier: 'calUrl',
      rules: [{
        type: 'customNotEmptyIfCalType',
        prompt: globalTranslate.tf_ValidateCalUri
      }]
    },
    timefrom: {
      optional: true,
      identifier: 'time_from',
      rules: [{
        type: 'regExp',
        value: /^([01]?[0-9]|2[0-3]):([0-5]?[0-9])$/,
        prompt: globalTranslate.tf_ValidateCheckTimeInterval
      }]
    },
    timeto: {
      identifier: 'time_to',
      optional: true,
      rules: [{
        type: 'regExp',
        value: /^([01]?[0-9]|2[0-3]):([0-5]?[0-9])$/,
        prompt: globalTranslate.tf_ValidateCheckTimeInterval
      }]
    }
  },

  /**
   * Initialize the module
   */
  initialize: function initialize() {
    // Resolve jQuery wrappers here — at module-load time jQuery may
    // not yet be defined (Sentry MIKOPBX-MG9 pattern).
    outOfWorkTimeRecord.$formObj = $('#save-outoffwork-form');
    outOfWorkTimeRecord.$time_from = $('#time_from');
    outOfWorkTimeRecord.$time_to = $('#time_to');
    outOfWorkTimeRecord.$rulesTable = $('#routing-table');
    outOfWorkTimeRecord.$idField = $('#id');
    outOfWorkTimeRecord.$weekdayFromField = $('#weekday_from');
    outOfWorkTimeRecord.$weekdayToField = $('#weekday_to');
    outOfWorkTimeRecord.$actionField = $('#action');
    outOfWorkTimeRecord.$calTypeField = $('#calType');
    outOfWorkTimeRecord.$extensionField = $('#extension');
    outOfWorkTimeRecord.$allowRestrictionField = $('#allowRestriction');
    outOfWorkTimeRecord.$descriptionField = $('#description');
    outOfWorkTimeRecord.$actionDropdown = $('#action-dropdown');
    outOfWorkTimeRecord.$calTypeDropdown = $('.calType-select');
    outOfWorkTimeRecord.$weekdayFromDropdown = $('.weekday-from-select');
    outOfWorkTimeRecord.$weekdayToDropdown = $('.weekday-to-select');
    outOfWorkTimeRecord.$tabMenu = $('#out-time-modify-menu .item');
    outOfWorkTimeRecord.$extensionRow = $('#extension-row');
    outOfWorkTimeRecord.$audioMessageRow = $('#audio-message-row');
    outOfWorkTimeRecord.$calendarTab = $('#call-type-calendar-tab');
    outOfWorkTimeRecord.$mainTab = $('#call-type-main-tab');
    outOfWorkTimeRecord.$rangeDaysStart = $('#range-days-start');
    outOfWorkTimeRecord.$rangeDaysEnd = $('#range-days-end');
    outOfWorkTimeRecord.$rangeTimeStart = $('#range-time-start');
    outOfWorkTimeRecord.$rangeTimeEnd = $('#range-time-end');
    outOfWorkTimeRecord.$eraseDatesBtn = $('#erase-dates');
    outOfWorkTimeRecord.$eraseWeekdaysBtn = $('#erase-weekdays');
    outOfWorkTimeRecord.$eraseTimeperiodBtn = $('#erase-timeperiod');
    outOfWorkTimeRecord.$errorMessage = $('.form .error.message'); // Set record ID from DOM

    outOfWorkTimeRecord.recordId = outOfWorkTimeRecord.$idField.val(); // Initialize tab references that depend on DOM

    outOfWorkTimeRecord.$rulesTab = $('#out-time-modify-menu .item[data-tab="rules"]');
    outOfWorkTimeRecord.$generalTab = $('#out-time-modify-menu .item[data-tab="general"]');
    outOfWorkTimeRecord.$rulesTabSegment = $('.ui.tab.segment[data-tab="rules"]');
    outOfWorkTimeRecord.$generalTabSegment = $('.ui.tab.segment[data-tab="general"]'); // Initialize tabs

    outOfWorkTimeRecord.$tabMenu.tab(); // Initialize form submission handling

    outOfWorkTimeRecord.initializeForm(); // Initialize components that don't depend on data

    outOfWorkTimeRecord.initializeCalendars();
    outOfWorkTimeRecord.initializeRoutingTable();
    outOfWorkTimeRecord.initializeErasers();
    outOfWorkTimeRecord.initializeDescriptionField();
    outOfWorkTimeRecord.initializeTooltips(); // Load data and initialize dropdowns
    // This unified approach loads defaults for new records or existing data

    outOfWorkTimeRecord.loadFormData();
  },

  /**
   * Load form data via REST API
   * Unified approach for both new and existing records
   */
  loadFormData: function loadFormData() {
    // Show loading state
    outOfWorkTimeRecord.$formObj.addClass('loading'); // Check if this is a copy operation

    var urlParams = new URLSearchParams(window.location.search);
    var copyId = urlParams.get('copy');

    if (copyId) {
      // Copy operation - use the new RESTful copy endpoint
      OffWorkTimesAPI.callCustomMethod('copy', {
        id: copyId
      }, function (response) {
        // Remove loading state
        outOfWorkTimeRecord.$formObj.removeClass('loading');

        if (response.result && response.data) {
          // Success: populate form with copied data
          outOfWorkTimeRecord.recordData = response.data;
          outOfWorkTimeRecord.populateForm(response.data); // Load routing rules

          outOfWorkTimeRecord.loadRoutingTable(); // Mark as modified to enable save button

          setTimeout(function () {
            Form.dataChanged();
          }, 250);
        } else {
          // API error - show error message
          if (response.messages && response.messages.error) {
            var errorMessage = response.messages.error.join(', ');
            UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
          }
        }
      });
    } else {
      // Normal load - either existing record or new
      var recordIdToLoad = outOfWorkTimeRecord.recordId || ''; // Load record data via REST API - always returns data (with defaults for new records)

      OffWorkTimesAPI.getRecord(recordIdToLoad, function (response) {
        // Remove loading state
        outOfWorkTimeRecord.$formObj.removeClass('loading');

        if (response.result && response.data) {
          // Success: populate form with data (defaults for new, real data for existing)
          outOfWorkTimeRecord.recordData = response.data;
          outOfWorkTimeRecord.populateForm(response.data); // Load routing rules

          outOfWorkTimeRecord.loadRoutingTable(); // Save initial values to prevent save button activation

          setTimeout(function () {
            Form.saveInitialValues();
            Form.checkValues();
          }, 250);
        } else {
          // API error - show error message
          if (response.messages && response.messages.error) {
            var errorMessage = response.messages.error.join(', ');
            UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
          }
        }
      });
    }
  },

  /**
   * Initialize all dropdowns for the form
   */
  initializeDropdowns: function initializeDropdowns() {
    // Initialize weekday dropdowns with values matching original implementation
    var weekDays = [{
      value: '-1',
      text: '-'
    } // Default empty option
    ]; // Add days 1-7 using the same logic as original controller

    for (var i = 1; i <= 7; i++) {
      // Create date for "Sunday +i days" to match original logic
      var date = new Date(2020, 0, 5 + i); // Jan 5, 2020 was Sunday

      var dayName = date.toLocaleDateString('en', {
        weekday: 'short'
      }); // Try to get translation for the day abbreviation

      var translatedDay = globalTranslate[dayName] || dayName;
      weekDays.push({
        name: translatedDay,
        value: i.toString(),
        text: translatedDay
      });
    }

    outOfWorkTimeRecord.$weekdayFromDropdown.dropdown({
      values: weekDays,
      onChange: function onChange(value) {
        outOfWorkTimeRecord.$weekdayFromField.val(value);
        Form.dataChanged();
      }
    });
    outOfWorkTimeRecord.$weekdayToDropdown.dropdown({
      values: weekDays,
      onChange: function onChange(value) {
        outOfWorkTimeRecord.$weekdayToField.val(value);
        Form.dataChanged();
      }
    }); // Initialize action dropdown

    outOfWorkTimeRecord.$actionDropdown.dropdown({
      onChange: function onChange(value) {
        outOfWorkTimeRecord.$actionField.val(value);
        outOfWorkTimeRecord.onActionChange();
      }
    }); // Initialize calendar type dropdown

    outOfWorkTimeRecord.$calTypeDropdown.dropdown({
      onChange: function onChange(value) {
        outOfWorkTimeRecord.$calTypeField.val(value);
        outOfWorkTimeRecord.onCalTypeChange();
      }
    }); // Extension selector will be initialized in populateForm with API data
  },

  /**
   * Initialize sound file selector with API data
   * Single point of initialization after receiving data from API
   * @param {object} data - API response data (with defaults or existing values)
   */
  initializeSoundFileSelector: function initializeSoundFileSelector(data) {
    // Initialize SoundFileSelector with complete API data context
    SoundFileSelector.init(outOfWorkTimeRecord.audioMessageId, {
      category: 'custom',
      includeEmpty: false,
      // Out of work time must always have a sound file
      data: data // Pass complete API data for proper initialization

    }); // If audio_message_id exists, set the value with representation

    if (data.audio_message_id && data.audio_message_id_represent) {
      SoundFileSelector.setValue(outOfWorkTimeRecord.audioMessageId, data.audio_message_id, data.audio_message_id_represent);
    }
  },

  /**
   * Initialize extension selector with API data
   * Single point of initialization after receiving data from API
   * @param {object} data - API response data (with defaults or existing values)
   */
  initializeExtensionSelector: function initializeExtensionSelector(data) {
    // Initialize ExtensionSelector following V5.0 pattern
    ExtensionSelector.init('extension', {
      type: 'routing',
      includeEmpty: true,
      data: data
    });
  },

  /**
   * Populate form with data
   * @param {object} data - Record data from API
   */
  populateForm: function populateForm(data) {
    // Check if this is a copy operation
    var urlParams = new URLSearchParams(window.location.search);
    var isCopy = urlParams.has('copy'); // For copy operation, clear ID and priority

    if (isCopy) {
      data.id = '';
      data.priority = '';
    } // Use unified silent population approach


    Form.populateFormSilently({
      id: data.id,
      uniqid: data.uniqid,
      priority: data.priority,
      description: data.description,
      calType: data.calType,
      weekday_from: data.weekday_from,
      weekday_to: data.weekday_to,
      time_from: data.time_from,
      time_to: data.time_to,
      calUrl: data.calUrl,
      calUser: data.calUser,
      calSecret: data.calSecret,
      action: data.action,
      extension: data.extension,
      audio_message_id: data.audio_message_id,
      allowRestriction: data.allowRestriction
    }, {
      afterPopulate: function afterPopulate(formData) {
        // Handle password field placeholder
        var $calSecretField = $('#calSecret');

        if (data.calSecret === 'XXXXXX') {
          // Password exists but is masked, show placeholder
          $calSecretField.attr('placeholder', globalTranslate.tf_PasswordMasked); // Store original masked state to detect changes

          $calSecretField.data('originalMasked', true);
        } else {
          $calSecretField.attr('placeholder', globalTranslate.tf_EnterPassword);
          $calSecretField.data('originalMasked', false);
        } // Initialize dropdowns


        outOfWorkTimeRecord.initializeDropdowns(); // Initialize sound file selector with API data (single point of initialization)

        outOfWorkTimeRecord.initializeSoundFileSelector(data); // Initialize extension selector with API data

        outOfWorkTimeRecord.initializeExtensionSelector(data); // Set dropdown values after initialization
        // Set action dropdown

        if (data.action) {
          outOfWorkTimeRecord.$actionDropdown.dropdown('set selected', data.action);
        } // Set calType dropdown


        if (data.calType) {
          outOfWorkTimeRecord.$calTypeDropdown.dropdown('set selected', data.calType); // Manually set hidden field value since onChange doesn't fire on programmatic set

          outOfWorkTimeRecord.$calTypeField.val(data.calType);
        } // Set weekday dropdowns


        if (data.weekday_from) {
          outOfWorkTimeRecord.$weekdayFromDropdown.dropdown('set selected', data.weekday_from);
        }

        if (data.weekday_to) {
          outOfWorkTimeRecord.$weekdayToDropdown.dropdown('set selected', data.weekday_to);
        } // Set dates if present


        if (data.date_from) {
          outOfWorkTimeRecord.setDateFromValue(data.date_from, '#range-days-start');
        }

        if (data.date_to) {
          outOfWorkTimeRecord.setDateFromValue(data.date_to, '#range-days-end');
        } // Update field visibility based on action


        outOfWorkTimeRecord.onActionChange(); // Update calendar type visibility

        outOfWorkTimeRecord.onCalTypeChange(); // Set rules tab visibility based on allowRestriction

        outOfWorkTimeRecord.toggleRulesTab(data.allowRestriction); // Re-initialize dirty checking

        if (Form.enableDirrity) {
          Form.initializeDirrity();
        }
      }
    });
  },

  /**
   * Handle action dropdown change
   */
  onActionChange: function onActionChange() {
    var action = outOfWorkTimeRecord.$formObj.form('get value', 'action');

    if (action === 'extension') {
      // Show extension, hide audio
      outOfWorkTimeRecord.$extensionRow.show();
      outOfWorkTimeRecord.$audioMessageRow.hide(); // Clear audio message

      SoundFileSelector.clear(outOfWorkTimeRecord.audioMessageId);
    } else if (action === 'playmessage') {
      // Show audio, hide extension
      outOfWorkTimeRecord.$extensionRow.hide();
      outOfWorkTimeRecord.$audioMessageRow.show(); // Clear extension using ExtensionSelector

      ExtensionSelector.clear('extension');
      outOfWorkTimeRecord.$extensionField.val('');
    }

    Form.dataChanged();
  },

  /**
   * Handle calendar type change
   */
  onCalTypeChange: function onCalTypeChange() {
    var calType = outOfWorkTimeRecord.$formObj.form('get value', 'calType'); // 'timeframe' and empty string mean time-based conditions (show main tab)

    if (!calType || calType === 'timeframe' || calType === '') {
      // Show main time/date configuration
      outOfWorkTimeRecord.$calendarTab.hide();
      outOfWorkTimeRecord.$mainTab.show();
    } else if (calType === 'caldav' || calType === 'ical') {
      // Show calendar URL configuration
      outOfWorkTimeRecord.$calendarTab.show();
      outOfWorkTimeRecord.$mainTab.hide();
    }

    Form.dataChanged();
  },

  /**
   * Initialize calendars for date and time selection
   */
  initializeCalendars: function initializeCalendars() {
    // Date range calendars
    // Use class variables for calendars
    outOfWorkTimeRecord.$rangeDaysStart.calendar({
      firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
      text: SemanticLocalization.calendarText,
      endCalendar: outOfWorkTimeRecord.$rangeDaysEnd,
      type: 'date',
      inline: false,
      monthFirst: false,
      regExp: SemanticLocalization.regExp,
      onChange: function onChange() {
        return Form.dataChanged();
      }
    });
    outOfWorkTimeRecord.$rangeDaysEnd.calendar({
      firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
      text: SemanticLocalization.calendarText,
      startCalendar: outOfWorkTimeRecord.$rangeDaysStart,
      type: 'date',
      inline: false,
      monthFirst: false,
      regExp: SemanticLocalization.regExp,
      onChange: function onChange() {
        return Form.dataChanged();
      }
    }); // Time range calendars
    // Note: Unlike date calendars, time calendars are NOT linked with startCalendar/endCalendar
    // This allows selecting time ranges that cross midnight (e.g., 18:00 - 08:00 for off-work hours)

    outOfWorkTimeRecord.$rangeTimeStart.calendar({
      firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
      text: SemanticLocalization.calendarText,
      type: 'time',
      inline: false,
      disableMinute: false,
      monthFirst: false,
      ampm: false,
      regExp: SemanticLocalization.regExp,
      onChange: function onChange() {
        return Form.dataChanged();
      }
    });
    outOfWorkTimeRecord.$rangeTimeEnd.calendar({
      firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
      text: SemanticLocalization.calendarText,
      type: 'time',
      inline: false,
      monthFirst: false,
      ampm: false,
      regExp: SemanticLocalization.regExp,
      onChange: function onChange() {
        return Form.dataChanged();
      }
    });
  },

  /**
   * Initialize routing table and allowRestriction checkbox
   */
  initializeRoutingTable: function initializeRoutingTable() {
    // Initialize allowRestriction checkbox
    outOfWorkTimeRecord.$allowRestrictionField.parent().checkbox({
      onChange: function onChange() {
        var isChecked = outOfWorkTimeRecord.$allowRestrictionField.parent().checkbox('is checked');
        outOfWorkTimeRecord.toggleRulesTab(isChecked);
        Form.dataChanged();
      }
    }); // Initialize existing checkboxes in table

    outOfWorkTimeRecord.$rulesTable.find('.ui.checkbox').checkbox({
      onChange: function onChange() {
        return Form.dataChanged();
      }
    });
  },

  /**
   * Toggle rules tab visibility
   * @param {boolean} isChecked - Whether to show rules tab
   */
  toggleRulesTab: function toggleRulesTab(isChecked) {
    if (isChecked) {
      outOfWorkTimeRecord.$rulesTab.show();
    } else {
      outOfWorkTimeRecord.$rulesTab.hide(); // Switch to general tab if rules tab was active

      if (outOfWorkTimeRecord.$rulesTab.hasClass('active')) {
        outOfWorkTimeRecord.$rulesTab.removeClass('active');
        outOfWorkTimeRecord.$rulesTabSegment.removeClass('active');
        outOfWorkTimeRecord.$generalTab.addClass('active');
        outOfWorkTimeRecord.$generalTabSegment.addClass('active');
      }
    }
  },

  /**
   * Load routing table with incoming routes
   */
  loadRoutingTable: function loadRoutingTable() {
    var _outOfWorkTimeRecord$;

    // Clear table
    outOfWorkTimeRecord.$rulesTable.find('tbody').empty(); // Get associated IDs from record data

    var associatedIds = ((_outOfWorkTimeRecord$ = outOfWorkTimeRecord.recordData) === null || _outOfWorkTimeRecord$ === void 0 ? void 0 : _outOfWorkTimeRecord$.incomingRouteIds) || []; // Load all available routes from IncomingRoutesAPI

    IncomingRoutesAPI.getList(function (response) {
      if (response.result && response.data) {
        // Group and sort routes
        var groupedRoutes = outOfWorkTimeRecord.groupAndSortRoutes(response.data); // Render grouped routes

        outOfWorkTimeRecord.renderGroupedRoutes(groupedRoutes, associatedIds); // Initialize UI components with grouped checkbox logic

        outOfWorkTimeRecord.initializeRoutingCheckboxes();
        outOfWorkTimeRecord.$rulesTable.find('[data-content]').popup();
      } else {
        outOfWorkTimeRecord.showEmptyRoutesMessage();
      }
    });
  },

  /**
   * Group and sort routes by provider and DID
   * @param {Array} routes - Array of route objects
   * @returns {Object} Grouped routes
   */
  groupAndSortRoutes: function groupAndSortRoutes(routes) {
    var groups = {}; // Skip default route and group by provider

    routes.forEach(function (route) {
      if (route.id === 1 || route.id === '1') return;
      var providerId = route.provider || 'none';

      if (!groups[providerId]) {
        // Extract plain text provider name from HTML if needed
        var providerName = route.providerid_represent || globalTranslate.ir_NoAssignedProvider; // Remove HTML tags to get clean provider name for display

        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = providerName;
        var cleanProviderName = tempDiv.textContent || tempDiv.innerText || providerName;
        groups[providerId] = {
          providerId: providerId,
          // Store actual provider ID
          providerName: cleanProviderName,
          // Clean name for display
          providerNameHtml: route.providerid_represent || providerName,
          // Original HTML if needed
          providerDisabled: route.providerDisabled || false,
          generalRules: [],
          specificRules: {}
        };
      } // Separate general rules (no DID) from specific rules (with DID)


      if (!route.number || route.number === '') {
        groups[providerId].generalRules.push(route);
      } else {
        if (!groups[providerId].specificRules[route.number]) {
          groups[providerId].specificRules[route.number] = [];
        }

        groups[providerId].specificRules[route.number].push(route);
      }
    }); // Sort rules within each group by priority

    Object.keys(groups).forEach(function (providerId) {
      groups[providerId].generalRules.sort(function (a, b) {
        return a.priority - b.priority;
      });
      Object.keys(groups[providerId].specificRules).forEach(function (did) {
        groups[providerId].specificRules[did].sort(function (a, b) {
          return a.priority - b.priority;
        });
      });
    });
    return groups;
  },

  /**
   * Render grouped routes in the table
   * @param {Object} groupedRoutes - Grouped routes object
   * @param {Array} associatedIds - Array of associated route IDs
   */
  renderGroupedRoutes: function renderGroupedRoutes(groupedRoutes, associatedIds) {
    var tbody = outOfWorkTimeRecord.$rulesTable.find('tbody');
    var isFirstGroup = true;
    Object.keys(groupedRoutes).forEach(function (providerId) {
      var group = groupedRoutes[providerId]; // Add provider group header

      if (!isFirstGroup) {
        // Add separator between groups
        tbody.append('<tr class="provider-separator"><td colspan="3"><div class="ui divider"></div></td></tr>');
      }

      isFirstGroup = false; // Add provider header row - use providerNameHtml for rich display

      tbody.append("\n                <tr class=\"provider-header\">\n                    <td colspan=\"3\">\n                        <div class=\"ui small header\">\n                            <div class=\"content\">\n                                ".concat(group.providerNameHtml, "\n                                ").concat(group.providerDisabled ? '<span class="ui mini red label">Disabled</span>' : '', "\n                            </div>\n                        </div>\n                    </td>\n                </tr>\n            ")); // Render general rules first

      group.generalRules.forEach(function (route) {
        var row = outOfWorkTimeRecord.createRouteRow(route, associatedIds, 'rule-general');
        tbody.append(row);
      }); // Render specific rules grouped by DID

      Object.keys(group.specificRules).sort().forEach(function (did) {
        group.specificRules[did].forEach(function (route, index) {
          var isFirstInDID = index === 0;
          var row = outOfWorkTimeRecord.createRouteRow(route, associatedIds, 'rule-specific', isFirstInDID);
          tbody.append(row);
        });
      });
    });
  },

  /**
   * Create a single route row
   * @param {Object} route - Route object
   * @param {Array} associatedIds - Associated route IDs
   * @param {String} ruleClass - CSS class for the rule type
   * @param {Boolean} showDIDIndicator - Whether to show DID indicator
   * @returns {String} HTML row
   */
  createRouteRow: function createRouteRow(route, associatedIds) {
    var ruleClass = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
    var showDIDIndicator = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    var isChecked = associatedIds.includes(parseInt(route.id));
    var providerDisabled = route.providerDisabled ? 'disabled' : '';
    var ruleDescription = route.rule_represent || ''; // Ensure provider ID is clean (no HTML)

    var providerId = route.provider || ''; // Add visual indicators for rule type

    if (ruleClass === 'rule-specific') {
      // Add indent and arrow for specific rules
      ruleDescription = "<span class=\"rule-indent\">\u21B3</span> ".concat(ruleDescription);
    } else if (ruleClass === 'rule-general') {
      // Add icon for general rules
      ruleDescription = "<i class=\"random icon\"></i> ".concat(ruleDescription);
    }

    var noteDisplay = route.note && route.note.length > 20 ? "<div class=\"ui basic icon button\" data-content=\"".concat(SecurityUtils.escapeHtml(route.note), "\" data-variation=\"wide\" data-position=\"top right\">\n                <i class=\"file text icon\"></i>\n            </div>") : SecurityUtils.escapeHtml(route.note || ''); // Data attributes already safe from API

    var safeProviderId = providerId;
    var safeDid = route.number || '';
    return "\n            <tr class=\"rule-row ".concat(ruleClass, "\" id=\"").concat(route.id, "\" \n                data-provider=\"").concat(safeProviderId, "\" \n                data-did=\"").concat(safeDid, "\">\n                <td class=\"collapsing\">\n                    <div class=\"ui fitted toggle checkbox\" \n                         data-did=\"").concat(safeDid, "\" \n                         data-provider=\"").concat(safeProviderId, "\">\n                        <input type=\"checkbox\" ").concat(isChecked ? 'checked' : '', " \n                               name=\"route-").concat(route.id, "\" data-value=\"").concat(route.id, "\">\n                        <label></label>\n                    </div>\n                </td>\n                <td class=\"").concat(providerDisabled, "\">\n                    ").concat(ruleDescription || '<span class="text-muted">No description</span>', "\n                </td>\n                <td class=\"hide-on-mobile\">\n                    ").concat(noteDisplay, "\n                </td>\n            </tr>\n        ");
  },

  /**
   * Show empty routes message in table
   */
  showEmptyRoutesMessage: function showEmptyRoutesMessage() {
    var emptyRow = "\n            <tr>\n                <td colspan=\"3\" class=\"center aligned\">\n                    ".concat(globalTranslate.ir_NoIncomingRoutes, "\n                </td>\n            </tr>\n        ");
    outOfWorkTimeRecord.$rulesTable.find('tbody').append(emptyRow);
  },

  /**
   * Initialize routing checkboxes with grouped logic
   * When checking/unchecking rules with same provider and DID
   */
  initializeRoutingCheckboxes: function initializeRoutingCheckboxes() {
    // Add hover effect to highlight related rules
    outOfWorkTimeRecord.$rulesTable.find('.rule-row').hover(function () {
      var $row = $(this);
      var provider = $row.attr('data-provider');
      var did = $row.attr('data-did'); // Remove previous highlights

      outOfWorkTimeRecord.$rulesTable.find('.rule-row').removeClass('related-highlight');

      if (provider && provider !== 'none') {
        // Highlight all rules with same provider
        var selector = ".rule-row[data-provider=\"".concat(provider, "\"]");

        if (did) {
          // If hovering on specific DID rule, highlight all with same DID
          selector += "[data-did=\"".concat(did, "\"]");
        } else {
          // If hovering on general rule, highlight all general rules for this provider
          selector += '[data-did=""]';
        }

        var $relatedRows = outOfWorkTimeRecord.$rulesTable.find(selector);
        $relatedRows.addClass('related-highlight');
      }
    }, function () {
      // Remove highlights on mouse leave
      outOfWorkTimeRecord.$rulesTable.find('.rule-row').removeClass('related-highlight');
    }); // Initialize checkbox behavior with tooltips

    outOfWorkTimeRecord.$rulesTable.find('.ui.checkbox').each(function () {
      var $checkbox = $(this);
      var did = $checkbox.attr('data-did');
      var provider = $checkbox.attr('data-provider'); // Add tooltip to explain grouping

      if (provider && provider !== 'none') {
        var tooltipText = '';

        if (did) {
          tooltipText = globalTranslate.tf_TooltipSpecificRule;
        } else {
          tooltipText = globalTranslate.tf_TooltipGeneralRule;
        }

        $checkbox.attr('data-content', tooltipText);
        $checkbox.attr('data-variation', 'tiny');
        $checkbox.popup();
      }
    }); // Initialize checkbox change behavior

    outOfWorkTimeRecord.$rulesTable.find('.ui.checkbox').checkbox({
      onChange: function onChange() {
        var $checkbox = $(this).parent();
        var isChecked = $checkbox.checkbox('is checked');
        var did = $checkbox.attr('data-did');
        var provider = $checkbox.attr('data-provider'); // Skip synchronization for 'none' provider (direct calls)

        if (!provider || provider === 'none') {
          Form.dataChanged();
          return;
        } // If we have grouped logic requirements


        if (provider) {
          var selector = "#routing-table .ui.checkbox[data-provider=\"".concat(provider, "\"]");

          if (did && did !== '') {
            // Rule with specific DID
            if (isChecked) {
              // When checking a rule with DID, check all rules with same provider and DID
              var selectorWithDID = "".concat(selector, "[data-did=\"").concat(did, "\"]");
              $(selectorWithDID).not($checkbox).checkbox('set checked');
            } else {
              // When unchecking a rule with DID:
              // 1. Uncheck all rules with same DID
              var _selectorWithDID = "".concat(selector, "[data-did=\"").concat(did, "\"]");

              $(_selectorWithDID).not($checkbox).checkbox('set unchecked'); // 2. Also uncheck general rules (without DID) for same provider

              var selectorGeneral = "".concat(selector, "[data-did=\"\"]");
              $(selectorGeneral).checkbox('set unchecked');
            }
          } else {
            // General rule without DID
            if (!isChecked) {
              // When unchecking general rule, only uncheck other general rules for same provider
              var _selectorGeneral = "".concat(selector, "[data-did=\"\"]");

              $(_selectorGeneral).not($checkbox).checkbox('set unchecked');
            } else {
              // When checking general rule, check all general rules for same provider
              var _selectorGeneral2 = "".concat(selector, "[data-did=\"\"]");

              $(_selectorGeneral2).not($checkbox).checkbox('set checked');
            }
          }
        } // Trigger form change


        Form.dataChanged();
      }
    });
  },

  /**
   * Initialize erase buttons for date/time fields
   */
  initializeErasers: function initializeErasers() {
    outOfWorkTimeRecord.$eraseDatesBtn.on('click', function () {
      outOfWorkTimeRecord.$rangeDaysStart.calendar('clear');
      outOfWorkTimeRecord.$rangeDaysEnd.calendar('clear');
      Form.dataChanged();
    });
    outOfWorkTimeRecord.$eraseWeekdaysBtn.on('click', function () {
      outOfWorkTimeRecord.$weekdayFromDropdown.dropdown('clear');
      outOfWorkTimeRecord.$weekdayToDropdown.dropdown('clear');
      Form.dataChanged();
    });
    outOfWorkTimeRecord.$eraseTimeperiodBtn.on('click', function () {
      outOfWorkTimeRecord.$rangeTimeStart.calendar('clear');
      outOfWorkTimeRecord.$rangeTimeEnd.calendar('clear');
      Form.dataChanged();
    });
  },

  /**
   * Initialize description field with auto-resize
   */
  initializeDescriptionField: function initializeDescriptionField() {
    // Auto-resize on input
    outOfWorkTimeRecord.$descriptionField.on('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    }); // Initial resize

    if (outOfWorkTimeRecord.$descriptionField.val()) {
      outOfWorkTimeRecord.$descriptionField.trigger('input');
    }
  },

  /**
   * Put a stored date into a calendar.
   * Dates are calendar days of the PBX timezone ('YYYY-MM-DD'); they are built from
   * local components because new Date('YYYY-MM-DD') parses as UTC midnight and shows
   * the previous day in browsers west of UTC.
   * @param {string} dateValue - Date in YYYY-MM-DD format
   * @param {string} selector - jQuery selector
   */
  setDateFromValue: function setDateFromValue(dateValue, selector) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ''));

    if (!match) {
      return;
    }

    var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    $(selector).calendar('set date', date);
  },

  /**
   * Format a calendar date as YYYY-MM-DD from its local components, so the picked day
   * does not depend on the browser timezone.
   * @param {Date} date - Date picked in the calendar
   * @returns {string} Date in YYYY-MM-DD format
   */
  formatCalendarDate: function formatCalendarDate(date) {
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return "".concat(date.getFullYear(), "-").concat(month, "-").concat(day);
  },

  /**
   * Custom form validation for paired fields
   * @param {object} result - Form data
   * @returns {object|boolean} Result object or false if validation fails
   */
  customValidateForm: function customValidateForm(result) {
    // Check date fields - both should be filled or both empty
    if (result.data.date_from !== '' && result.data.date_to === '' || result.data.date_to !== '' && result.data.date_from === '') {
      outOfWorkTimeRecord.$errorMessage.html(globalTranslate.tf_ValidateCheckDateInterval).show();
      Form.$submitButton.transition('shake').removeClass('loading disabled');
      return false;
    } // Check weekday fields - both should be filled or both empty


    if (result.data.weekday_from > 0 && result.data.weekday_to === '-1' || result.data.weekday_to > 0 && result.data.weekday_from === '-1') {
      outOfWorkTimeRecord.$errorMessage.html(globalTranslate.tf_ValidateCheckWeekDayInterval).show();
      Form.$submitButton.transition('shake').removeClass('loading disabled');
      return false;
    } // Check time fields - both should be filled or both empty


    if (result.data.time_from.length > 0 && result.data.time_to.length === 0 || result.data.time_to.length > 0 && result.data.time_from.length === 0) {
      outOfWorkTimeRecord.$errorMessage.html(globalTranslate.tf_ValidateCheckTimeInterval).show();
      Form.$submitButton.transition('shake').removeClass('loading disabled');
      return false;
    } // For timeframe type, check that at least one condition is specified


    var calType = result.data.calType || 'timeframe';

    if (calType === 'timeframe' || calType === '') {
      var hasDateRange = result.data.date_from !== '' && result.data.date_to !== '';
      var hasWeekdayRange = result.data.weekday_from > 0 && result.data.weekday_to > 0;
      var hasTimeRange = result.data.time_from.length > 0 && result.data.time_to.length > 0;

      if (!hasDateRange && !hasWeekdayRange && !hasTimeRange) {
        outOfWorkTimeRecord.$errorMessage.html(globalTranslate.tf_ValidateNoRulesSelected).show();
        Form.$submitButton.transition('shake').removeClass('loading disabled');
        return false;
      }
    }

    return result;
  },

  /**
   * Callback before sending form
   * @param {object} settings - Form settings
   * @returns {object|boolean} Updated settings or false
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = outOfWorkTimeRecord.$formObj.form('get values'); // Convert checkbox values from 'on'/undefined to true/false
    // Process all route checkboxes

    Object.keys(result.data).forEach(function (key) {
      if (key.startsWith('route-')) {
        result.data[key] = result.data[key] === 'on' || result.data[key] === true;
      }
    }); // Convert allowRestriction checkbox

    if ('allowRestriction' in result.data) {
      result.data.allowRestriction = result.data.allowRestriction === 'on' || result.data.allowRestriction === true;
    } // Note: calType can be 'timeframe', 'caldav', 'ical', or empty string
    // Backend accepts all these values (empty string is treated as 'timeframe' in DB)
    // No conversion needed - send value as-is
    // Handle weekday values (matches old controller: ($data[$name] < 1) ? null : $data[$name])


    if (result.data.weekday_from === '-1' || result.data.weekday_from < 1) {
      result.data.weekday_from = '';
    }

    if (result.data.weekday_to === '-1' || result.data.weekday_to < 1) {
      result.data.weekday_to = '';
    } // Handle password field - if user didn't change the masked password, keep it as is
    // The backend will recognize 'XXXXXX' and won't update the password
    // If user cleared the field or entered new value, send that


    if (result.data.calSecret === 'XXXXXX') {// User didn't change the masked password, backend will keep existing value
    } else if (result.data.calSecret === '') {// User cleared the password field, backend will clear the password
    } // Otherwise send the new password value as entered
    // Update time validation rules based on calendar type


    var calType = result.data.calType || 'timeframe';

    if (calType === '' || calType === 'timeframe') {
      Form.validateRules.timefrom.rules = outOfWorkTimeRecord.additionalTimeIntervalRules;
      Form.validateRules.timeto.rules = outOfWorkTimeRecord.additionalTimeIntervalRules;
    } else {
      Form.validateRules.timefrom.rules = [];
      Form.validateRules.timeto.rules = [];
    } // Send dates as calendar days (YYYY-MM-DD); the PBX applies them in its own timezone


    var dateFrom = outOfWorkTimeRecord.$rangeDaysStart.calendar('get date');

    if (dateFrom) {
      result.data.date_from = outOfWorkTimeRecord.formatCalendarDate(dateFrom);
    }

    var dateTo = outOfWorkTimeRecord.$rangeDaysEnd.calendar('get date');

    if (dateTo) {
      result.data.date_to = outOfWorkTimeRecord.formatCalendarDate(dateTo);
    } // Collect selected incoming routes


    var selectedRoutes = [];
    outOfWorkTimeRecord.$rulesTable.find('input[type="checkbox"]:checked').each(function () {
      var routeId = $(this).attr('data-value');

      if (routeId) {
        selectedRoutes.push(routeId);
      }
    });
    result.data.incomingRouteIds = selectedRoutes; // Clear action-dependent fields based on selection

    if (result.data.action === 'extension') {
      result.data.audio_message_id = '';
    } else if (result.data.action === 'playmessage') {
      result.data.extension = '';
    } // Run custom validation for paired fields


    return outOfWorkTimeRecord.customValidateForm(result);
  },

  /**
   * Callback after form submission
   * @param {object} response - Server response
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result && response.data && response.data.id) {
      // Update URL if this was a new record
      if (!outOfWorkTimeRecord.recordId) {
        var newUrl = "".concat(globalRootUrl, "off-work-times/modify/").concat(response.data.id);
        window.history.replaceState(null, '', newUrl);
        outOfWorkTimeRecord.recordId = response.data.id;
      } // Reload data to ensure consistency


      outOfWorkTimeRecord.loadFormData();
    }
  },

  /**
   * Initialize form with REST API integration
   */
  initializeForm: function initializeForm() {
    Form.$formObj = outOfWorkTimeRecord.$formObj;
    Form.url = "".concat(globalRootUrl, "off-work-times/save");
    Form.validateRules = outOfWorkTimeRecord.validateRules;
    Form.cbBeforeSendForm = outOfWorkTimeRecord.cbBeforeSendForm;
    Form.cbAfterSendForm = outOfWorkTimeRecord.cbAfterSendForm; // REST API integration

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = OffWorkTimesAPI;
    Form.apiSettings.saveMethod = 'saveRecord';
    Form.initialize();
  },

  /**
   * Initialize tooltips for form fields using OffWorkTimesTooltipManager
   */
  initializeTooltips: function initializeTooltips() {
    // Delegate tooltip initialization to OffWorkTimesTooltipManager
    OffWorkTimesTooltipManager.initialize();
  }
};
/**
 * Custom validation rule that checks if a value is not empty based on a specific action
 * @param {string} value - The value to be validated
 * @param {string} action - The action to compare against
 * @returns {boolean} Returns true if valid, false otherwise
 */

$.fn.form.settings.rules.customNotEmptyIfActionRule = function (value, action) {
  if (value.length === 0 && outOfWorkTimeRecord.$actionField.val() === action) {
    return false;
  }

  return true;
};
/**
 * Custom validation rule for calendar URL field
 * Validates URL only when calendar type is not 'none' or 'time'
 */


$.fn.form.settings.rules.customNotEmptyIfCalType = function (value) {
  var calType = outOfWorkTimeRecord.$calTypeField.val(); // If calendar type is timeframe or time, URL is not required

  if (!calType || calType === 'timeframe' || calType === 'time') {
    return true;
  } // If calendar type is CALDAV or ICAL, validate URL


  if (!value || value.length === 0) {
    return false;
  } // Check if it's a valid URL


  try {
    new URL(value);
    return true;
  } catch (_) {
    return false;
  }
}; // Initialize when DOM is ready


$(document).ready(function () {
  outOfWorkTimeRecord.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PZmZXb3JrVGltZXMvb2ZmLXdvcmstdGltZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm91dE9mV29ya1RpbWVSZWNvcmQiLCIkZm9ybU9iaiIsInJlY29yZElkIiwicmVjb3JkRGF0YSIsIiR0aW1lX2Zyb20iLCIkdGltZV90byIsIiRydWxlc1RhYmxlIiwiJGlkRmllbGQiLCIkd2Vla2RheUZyb21GaWVsZCIsIiR3ZWVrZGF5VG9GaWVsZCIsIiRhY3Rpb25GaWVsZCIsIiRjYWxUeXBlRmllbGQiLCIkZXh0ZW5zaW9uRmllbGQiLCIkYWxsb3dSZXN0cmljdGlvbkZpZWxkIiwiJGRlc2NyaXB0aW9uRmllbGQiLCIkYWN0aW9uRHJvcGRvd24iLCIkY2FsVHlwZURyb3Bkb3duIiwiJHdlZWtkYXlGcm9tRHJvcGRvd24iLCIkd2Vla2RheVRvRHJvcGRvd24iLCIkdGFiTWVudSIsIiRydWxlc1RhYiIsIiRnZW5lcmFsVGFiIiwiJHJ1bGVzVGFiU2VnbWVudCIsIiRnZW5lcmFsVGFiU2VnbWVudCIsIiRleHRlbnNpb25Sb3ciLCIkYXVkaW9NZXNzYWdlUm93IiwiJGNhbGVuZGFyVGFiIiwiJG1haW5UYWIiLCIkcmFuZ2VEYXlzU3RhcnQiLCIkcmFuZ2VEYXlzRW5kIiwiJHJhbmdlVGltZVN0YXJ0IiwiJHJhbmdlVGltZUVuZCIsIiRlcmFzZURhdGVzQnRuIiwiJGVyYXNlV2Vla2RheXNCdG4iLCIkZXJhc2VUaW1lcGVyaW9kQnRuIiwiJGVycm9yTWVzc2FnZSIsImF1ZGlvTWVzc2FnZUlkIiwiYWRkaXRpb25hbFRpbWVJbnRlcnZhbFJ1bGVzIiwidHlwZSIsInZhbHVlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCIsInZhbGlkYXRlUnVsZXMiLCJleHRlbnNpb24iLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0Zl9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5IiwiYXVkaW9fbWVzc2FnZV9pZCIsInRmX1ZhbGlkYXRlQXVkaW9NZXNzYWdlRW1wdHkiLCJjYWxVcmwiLCJ0Zl9WYWxpZGF0ZUNhbFVyaSIsInRpbWVmcm9tIiwib3B0aW9uYWwiLCJ0aW1ldG8iLCJpbml0aWFsaXplIiwiJCIsInZhbCIsInRhYiIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZUNhbGVuZGFycyIsImluaXRpYWxpemVSb3V0aW5nVGFibGUiLCJpbml0aWFsaXplRXJhc2VycyIsImluaXRpYWxpemVEZXNjcmlwdGlvbkZpZWxkIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwibG9hZEZvcm1EYXRhIiwiYWRkQ2xhc3MiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlYXJjaCIsImNvcHlJZCIsImdldCIsIk9mZldvcmtUaW1lc0FQSSIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwicG9wdWxhdGVGb3JtIiwibG9hZFJvdXRpbmdUYWJsZSIsInNldFRpbWVvdXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJtZXNzYWdlcyIsImVycm9yIiwiZXJyb3JNZXNzYWdlIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJyZWNvcmRJZFRvTG9hZCIsImdldFJlY29yZCIsInNhdmVJbml0aWFsVmFsdWVzIiwiY2hlY2tWYWx1ZXMiLCJpbml0aWFsaXplRHJvcGRvd25zIiwid2Vla0RheXMiLCJ0ZXh0IiwiaSIsImRhdGUiLCJEYXRlIiwiZGF5TmFtZSIsInRvTG9jYWxlRGF0ZVN0cmluZyIsIndlZWtkYXkiLCJ0cmFuc2xhdGVkRGF5IiwicHVzaCIsIm5hbWUiLCJ0b1N0cmluZyIsImRyb3Bkb3duIiwidmFsdWVzIiwib25DaGFuZ2UiLCJvbkFjdGlvbkNoYW5nZSIsIm9uQ2FsVHlwZUNoYW5nZSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvciIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiaW5pdCIsImNhdGVnb3J5IiwiaW5jbHVkZUVtcHR5IiwiYXVkaW9fbWVzc2FnZV9pZF9yZXByZXNlbnQiLCJzZXRWYWx1ZSIsImluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvciIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaXNDb3B5IiwiaGFzIiwicHJpb3JpdHkiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsInVuaXFpZCIsImRlc2NyaXB0aW9uIiwiY2FsVHlwZSIsIndlZWtkYXlfZnJvbSIsIndlZWtkYXlfdG8iLCJ0aW1lX2Zyb20iLCJ0aW1lX3RvIiwiY2FsVXNlciIsImNhbFNlY3JldCIsImFjdGlvbiIsImFsbG93UmVzdHJpY3Rpb24iLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCIkY2FsU2VjcmV0RmllbGQiLCJhdHRyIiwidGZfUGFzc3dvcmRNYXNrZWQiLCJ0Zl9FbnRlclBhc3N3b3JkIiwiZGF0ZV9mcm9tIiwic2V0RGF0ZUZyb21WYWx1ZSIsImRhdGVfdG8iLCJ0b2dnbGVSdWxlc1RhYiIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsImZvcm0iLCJzaG93IiwiaGlkZSIsImNsZWFyIiwiY2FsZW5kYXIiLCJmaXJzdERheU9mV2VlayIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiY2FsZW5kYXJGaXJzdERheU9mV2VlayIsImNhbGVuZGFyVGV4dCIsImVuZENhbGVuZGFyIiwiaW5saW5lIiwibW9udGhGaXJzdCIsInJlZ0V4cCIsInN0YXJ0Q2FsZW5kYXIiLCJkaXNhYmxlTWludXRlIiwiYW1wbSIsInBhcmVudCIsImNoZWNrYm94IiwiaXNDaGVja2VkIiwiZmluZCIsImhhc0NsYXNzIiwiZW1wdHkiLCJhc3NvY2lhdGVkSWRzIiwiaW5jb21pbmdSb3V0ZUlkcyIsIkluY29taW5nUm91dGVzQVBJIiwiZ2V0TGlzdCIsImdyb3VwZWRSb3V0ZXMiLCJncm91cEFuZFNvcnRSb3V0ZXMiLCJyZW5kZXJHcm91cGVkUm91dGVzIiwiaW5pdGlhbGl6ZVJvdXRpbmdDaGVja2JveGVzIiwicG9wdXAiLCJzaG93RW1wdHlSb3V0ZXNNZXNzYWdlIiwicm91dGVzIiwiZ3JvdXBzIiwiZm9yRWFjaCIsInJvdXRlIiwicHJvdmlkZXJJZCIsInByb3ZpZGVyIiwicHJvdmlkZXJOYW1lIiwicHJvdmlkZXJpZF9yZXByZXNlbnQiLCJpcl9Ob0Fzc2lnbmVkUHJvdmlkZXIiLCJ0ZW1wRGl2IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiaW5uZXJIVE1MIiwiY2xlYW5Qcm92aWRlck5hbWUiLCJ0ZXh0Q29udGVudCIsImlubmVyVGV4dCIsInByb3ZpZGVyTmFtZUh0bWwiLCJwcm92aWRlckRpc2FibGVkIiwiZ2VuZXJhbFJ1bGVzIiwic3BlY2lmaWNSdWxlcyIsIm51bWJlciIsIk9iamVjdCIsImtleXMiLCJzb3J0IiwiYSIsImIiLCJkaWQiLCJ0Ym9keSIsImlzRmlyc3RHcm91cCIsImdyb3VwIiwiYXBwZW5kIiwicm93IiwiY3JlYXRlUm91dGVSb3ciLCJpbmRleCIsImlzRmlyc3RJbkRJRCIsInJ1bGVDbGFzcyIsInNob3dESURJbmRpY2F0b3IiLCJpbmNsdWRlcyIsInBhcnNlSW50IiwicnVsZURlc2NyaXB0aW9uIiwicnVsZV9yZXByZXNlbnQiLCJub3RlRGlzcGxheSIsIm5vdGUiLCJsZW5ndGgiLCJzYWZlUHJvdmlkZXJJZCIsInNhZmVEaWQiLCJlbXB0eVJvdyIsImlyX05vSW5jb21pbmdSb3V0ZXMiLCJob3ZlciIsIiRyb3ciLCJzZWxlY3RvciIsIiRyZWxhdGVkUm93cyIsImVhY2giLCIkY2hlY2tib3giLCJ0b29sdGlwVGV4dCIsInRmX1Rvb2x0aXBTcGVjaWZpY1J1bGUiLCJ0Zl9Ub29sdGlwR2VuZXJhbFJ1bGUiLCJzZWxlY3RvcldpdGhESUQiLCJub3QiLCJzZWxlY3RvckdlbmVyYWwiLCJvbiIsInN0eWxlIiwiaGVpZ2h0Iiwic2Nyb2xsSGVpZ2h0IiwidHJpZ2dlciIsImRhdGVWYWx1ZSIsIm1hdGNoIiwiZXhlYyIsIlN0cmluZyIsIk51bWJlciIsImZvcm1hdENhbGVuZGFyRGF0ZSIsIm1vbnRoIiwiZ2V0TW9udGgiLCJwYWRTdGFydCIsImRheSIsImdldERhdGUiLCJnZXRGdWxsWWVhciIsImN1c3RvbVZhbGlkYXRlRm9ybSIsImh0bWwiLCJ0Zl9WYWxpZGF0ZUNoZWNrRGF0ZUludGVydmFsIiwiJHN1Ym1pdEJ1dHRvbiIsInRyYW5zaXRpb24iLCJ0Zl9WYWxpZGF0ZUNoZWNrV2Vla0RheUludGVydmFsIiwiaGFzRGF0ZVJhbmdlIiwiaGFzV2Vla2RheVJhbmdlIiwiaGFzVGltZVJhbmdlIiwidGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJrZXkiLCJzdGFydHNXaXRoIiwiZGF0ZUZyb20iLCJkYXRlVG8iLCJzZWxlY3RlZFJvdXRlcyIsInJvdXRlSWQiLCJjYkFmdGVyU2VuZEZvcm0iLCJuZXdVcmwiLCJnbG9iYWxSb290VXJsIiwiaGlzdG9yeSIsInJlcGxhY2VTdGF0ZSIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJPZmZXb3JrVGltZXNUb29sdGlwTWFuYWdlciIsImZuIiwiY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGUiLCJjdXN0b21Ob3RFbXB0eUlmQ2FsVHlwZSIsIlVSTCIsIl8iLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsbUJBQW1CLEdBQUc7QUFDeEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFOYzs7QUFReEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLElBWmM7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QUF1Q0EsT0FBTyxLQUFLLE1BQXZELEVBQStEO0FBQzNELFdBQU8sSUFBUDtBQUNILEdBTjhELENBUS9EOzs7QUFDQSxNQUFJLENBQUM1RixLQUFELElBQVVBLEtBQUssQ0FBQzRMLE1BQU4sS0FBaUIsQ0FBL0IsRUFBa0M7QUFDOUIsV0FBTyxLQUFQO0FBQ0gsR0FYOEQsQ0FhL0Q7OztBQUNBLE1BQUk7QUFDQSxRQUFJa0UsR0FBSixDQUFROVAsS0FBUjtBQUNBLFdBQU8sSUFBUDtBQUNILEdBSEQsQ0FHRSxPQUFPK1AsQ0FBUCxFQUFVO0FBQ1IsV0FBTyxLQUFQO0FBQ0g7QUFDSixDQXBCRCxDLENBc0JBOzs7QUFDQTlPLENBQUMsQ0FBQzBJLFFBQUQsQ0FBRCxDQUFZcUcsS0FBWixDQUFrQixZQUFNO0FBQ3BCdlMsRUFBQUEsbUJBQW1CLENBQUN1RCxVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCBnbG9iYWxSb290VXJsIEV4dGVuc2lvbnMgbW9tZW50IEZvcm0gZ2xvYmFsVHJhbnNsYXRlXG4gICBTZW1hbnRpY0xvY2FsaXphdGlvbiBTb3VuZEZpbGVTZWxlY3RvciBVc2VyTWVzc2FnZSBTZWN1cml0eVV0aWxzXG4gICBJbmNvbWluZ1JvdXRlc0FQSSBPZmZXb3JrVGltZXNBUEkgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciBFeHRlbnNpb25TZWxlY3RvciBPZmZXb3JrVGltZXNUb29sdGlwTWFuYWdlciAqL1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgbWFuYWdpbmcgb3V0LW9mLXdvcmsgdGltZSBzZXR0aW5nc1xuICogXG4gKiBUaGlzIG1vZHVsZSBoYW5kbGVzIHRoZSBmb3JtIGZvciBjcmVhdGluZyBhbmQgZWRpdGluZyBvdXQtb2Ytd29yayB0aW1lIGNvbmRpdGlvbnMuXG4gKiBJdCB1c2VzIGEgdW5pZmllZCBSRVNUIEFQSSBhcHByb2FjaCBtYXRjaGluZyB0aGUgaW5jb21pbmcgcm91dGVzIHBhdHRlcm4uXG4gKiBcbiAqIEBtb2R1bGUgb3V0T2ZXb3JrVGltZVJlY29yZFxuICovXG5jb25zdCBvdXRPZldvcmtUaW1lUmVjb3JkID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogUmVjb3JkIElEIGZyb20gVVJMXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICByZWNvcmRJZDogbnVsbCwgLy8gV2lsbCBiZSBzZXQgaW4gaW5pdGlhbGl6ZSgpXG5cbiAgICAvKipcbiAgICAgKiBTdG9yZSBsb2FkZWQgcmVjb3JkIGRhdGFcbiAgICAgKiBAdHlwZSB7b2JqZWN0fG51bGx9XG4gICAgICovXG4gICAgcmVjb3JkRGF0YTogbnVsbCxcblxuICAgIC8vIEZvcm0gZmllbGQgalF1ZXJ5IG9iamVjdHNcbiAgICAkdGltZV9mcm9tOiBudWxsLFxuICAgICR0aW1lX3RvOiBudWxsLFxuICAgICRydWxlc1RhYmxlOiBudWxsLFxuXG4gICAgLy8gSGlkZGVuIGlucHV0IGZpZWxkc1xuICAgICRpZEZpZWxkOiBudWxsLFxuICAgICR3ZWVrZGF5RnJvbUZpZWxkOiBudWxsLFxuICAgICR3ZWVrZGF5VG9GaWVsZDogbnVsbCxcbiAgICAkYWN0aW9uRmllbGQ6IG51bGwsXG4gICAgJGNhbFR5cGVGaWVsZDogbnVsbCxcbiAgICAkZXh0ZW5zaW9uRmllbGQ6IG51bGwsXG4gICAgJGFsbG93UmVzdHJpY3Rpb25GaWVsZDogbnVsbCxcbiAgICAkZGVzY3JpcHRpb25GaWVsZDogbnVsbCxcblxuICAgIC8vIERyb3Bkb3duIGVsZW1lbnRzXG4gICAgJGFjdGlvbkRyb3Bkb3duOiBudWxsLFxuICAgICRjYWxUeXBlRHJvcGRvd246IG51bGwsXG4gICAgJHdlZWtkYXlGcm9tRHJvcGRvd246IG51bGwsXG4gICAgJHdlZWtkYXlUb0Ryb3Bkb3duOiBudWxsLFxuXG4gICAgLy8gVGFiIGVsZW1lbnRzXG4gICAgJHRhYk1lbnU6IG51bGwsXG4gICAgJHJ1bGVzVGFiOiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgJGdlbmVyYWxUYWI6IG51bGwsIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgbGF0ZXJcbiAgICAkcnVsZXNUYWJTZWdtZW50OiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgJGdlbmVyYWxUYWJTZWdtZW50OiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG5cbiAgICAvLyBSb3cgZWxlbWVudHNcbiAgICAkZXh0ZW5zaW9uUm93OiBudWxsLFxuICAgICRhdWRpb01lc3NhZ2VSb3c6IG51bGwsXG5cbiAgICAvLyBDYWxlbmRhciB0YWIgZWxlbWVudHNcbiAgICAkY2FsZW5kYXJUYWI6IG51bGwsXG4gICAgJG1haW5UYWI6IG51bGwsXG5cbiAgICAvLyBEYXRlL3RpbWUgY2FsZW5kYXIgZWxlbWVudHNcbiAgICAkcmFuZ2VEYXlzU3RhcnQ6IG51bGwsXG4gICAgJHJhbmdlRGF5c0VuZDogbnVsbCxcbiAgICAkcmFuZ2VUaW1lU3RhcnQ6IG51bGwsXG4gICAgJHJhbmdlVGltZUVuZDogbnVsbCxcblxuICAgIC8vIEVyYXNlIGJ1dHRvbnNcbiAgICAkZXJhc2VEYXRlc0J0bjogbnVsbCxcbiAgICAkZXJhc2VXZWVrZGF5c0J0bjogbnVsbCxcbiAgICAkZXJhc2VUaW1lcGVyaW9kQnRuOiBudWxsLFxuXG4gICAgLy8gRXJyb3IgbWVzc2FnZSBlbGVtZW50XG4gICAgJGVycm9yTWVzc2FnZTogbnVsbCxcbiAgICBcbiAgICAvLyBBdWRpbyBtZXNzYWdlIElEIGZvciBzb3VuZCBmaWxlIHNlbGVjdG9yXG4gICAgYXVkaW9NZXNzYWdlSWQ6ICdhdWRpb19tZXNzYWdlX2lkJyxcblxuICAgIC8qKlxuICAgICAqIEFkZGl0aW9uYWwgdGltZSBpbnRlcnZhbCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICogQHR5cGUge2FycmF5fVxuICAgICAqL1xuICAgIGFkZGl0aW9uYWxUaW1lSW50ZXJ2YWxSdWxlczogW3tcbiAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgIHZhbHVlOiAvXihbMDFdP1swLTldfDJbMC0zXSk6KFswLTVdP1swLTldKSQvLFxuICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgIH1dLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlW2V4dGVuc2lvbl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBhdWRpb19tZXNzYWdlX2lkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnYXVkaW9fbWVzc2FnZV9pZCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlW3BsYXltZXNzYWdlXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQXVkaW9NZXNzYWdlRW1wdHlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIGNhbFVybDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NhbFVybCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZDYWxUeXBlJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDYWxVcmlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVmcm9tOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX2Zyb20nLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKFswMV0/WzAtOV18MlswLTNdKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWV0bzoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVfdG8nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogL14oWzAxXT9bMC05XXwyWzAtM10pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBSZXNvbHZlIGpRdWVyeSB3cmFwcGVycyBoZXJlIOKAlCBhdCBtb2R1bGUtbG9hZCB0aW1lIGpRdWVyeSBtYXlcbiAgICAgICAgLy8gbm90IHlldCBiZSBkZWZpbmVkIChTZW50cnkgTUlLT1BCWC1NRzkgcGF0dGVybikuXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmogPSAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kdGltZV9mcm9tID0gJCgnI3RpbWVfZnJvbScpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR0aW1lX3RvID0gJCgnI3RpbWVfdG8nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZSA9ICQoJyNyb3V0aW5nLXRhYmxlJyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGlkRmllbGQgPSAkKCcjaWQnKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheUZyb21GaWVsZCA9ICQoJyN3ZWVrZGF5X2Zyb20nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheVRvRmllbGQgPSAkKCcjd2Vla2RheV90bycpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhY3Rpb25GaWVsZCA9ICQoJyNhY3Rpb24nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsVHlwZUZpZWxkID0gJCgnI2NhbFR5cGUnKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXh0ZW5zaW9uRmllbGQgPSAkKCcjZXh0ZW5zaW9uJyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFsbG93UmVzdHJpY3Rpb25GaWVsZCA9ICQoJyNhbGxvd1Jlc3RyaWN0aW9uJyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQgPSAkKCcjZGVzY3JpcHRpb24nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYWN0aW9uRHJvcGRvd24gPSAkKCcjYWN0aW9uLWRyb3Bkb3duJyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbFR5cGVEcm9wZG93biA9ICQoJy5jYWxUeXBlLXNlbGVjdCcpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duID0gJCgnLndlZWtkYXktZnJvbS1zZWxlY3QnKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheVRvRHJvcGRvd24gPSAkKCcud2Vla2RheS10by1zZWxlY3QnKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kdGFiTWVudSA9ICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbScpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25Sb3cgPSAkKCcjZXh0ZW5zaW9uLXJvdycpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhdWRpb01lc3NhZ2VSb3cgPSAkKCcjYXVkaW8tbWVzc2FnZS1yb3cnKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsZW5kYXJUYWIgPSAkKCcjY2FsbC10eXBlLWNhbGVuZGFyLXRhYicpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRtYWluVGFiID0gJCgnI2NhbGwtdHlwZS1tYWluLXRhYicpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydCA9ICQoJyNyYW5nZS1kYXlzLXN0YXJ0Jyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZCA9ICQoJyNyYW5nZS1kYXlzLWVuZCcpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVTdGFydCA9ICQoJyNyYW5nZS10aW1lLXN0YXJ0Jyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZUVuZCA9ICQoJyNyYW5nZS10aW1lLWVuZCcpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZURhdGVzQnRuID0gJCgnI2VyYXNlLWRhdGVzJyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGVyYXNlV2Vla2RheXNCdG4gPSAkKCcjZXJhc2Utd2Vla2RheXMnKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJhc2VUaW1lcGVyaW9kQnRuID0gJCgnI2VyYXNlLXRpbWVwZXJpb2QnKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlID0gJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKTtcblxuICAgICAgICAvLyBTZXQgcmVjb3JkIElEIGZyb20gRE9NXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRpZEZpZWxkLnZhbCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFiIHJlZmVyZW5jZXMgdGhhdCBkZXBlbmQgb24gRE9NXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiID0gJCgnI291dC10aW1lLW1vZGlmeS1tZW51IC5pdGVtW2RhdGEtdGFiPVwicnVsZXNcIl0nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYiA9ICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbVtkYXRhLXRhYj1cImdlbmVyYWxcIl0nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJTZWdtZW50ID0gJCgnLnVpLnRhYi5zZWdtZW50W2RhdGEtdGFiPVwicnVsZXNcIl0nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYlNlZ21lbnQgPSAkKCcudWkudGFiLnNlZ21lbnRbZGF0YS10YWI9XCJnZW5lcmFsXCJdJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kdGFiTWVudS50YWIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBzdWJtaXNzaW9uIGhhbmRsaW5nXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY29tcG9uZW50cyB0aGF0IGRvbid0IGRlcGVuZCBvbiBkYXRhXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUNhbGVuZGFycygpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVSb3V0aW5nVGFibGUoKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRXJhc2VycygpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVEZXNjcmlwdGlvbkZpZWxkKCk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGRhdGEgYW5kIGluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgIC8vIFRoaXMgdW5pZmllZCBhcHByb2FjaCBsb2FkcyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgb3IgZXhpc3RpbmcgZGF0YVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmxvYWRGb3JtRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICogVW5pZmllZCBhcHByb2FjaCBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHNcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGNvcHlJZCA9IHVybFBhcmFtcy5nZXQoJ2NvcHknKTtcblxuICAgICAgICBpZiAoY29weUlkKSB7XG4gICAgICAgICAgICAvLyBDb3B5IG9wZXJhdGlvbiAtIHVzZSB0aGUgbmV3IFJFU1RmdWwgY29weSBlbmRwb2ludFxuICAgICAgICAgICAgT2ZmV29ya1RpbWVzQVBJLmNhbGxDdXN0b21NZXRob2QoJ2NvcHknLCB7aWQ6IGNvcHlJZH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN1Y2Nlc3M6IHBvcHVsYXRlIGZvcm0gd2l0aCBjb3BpZWQgZGF0YVxuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZERhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIHJvdXRpbmcgcnVsZXNcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5sb2FkUm91dGluZ1RhYmxlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBhcyBtb2RpZmllZCB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDI1MCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIGVycm9yIC0gc2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vcm1hbCBsb2FkIC0gZWl0aGVyIGV4aXN0aW5nIHJlY29yZCBvciBuZXdcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkVG9Mb2FkID0gb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmRJZCB8fCAnJztcblxuICAgICAgICAgICAgLy8gTG9hZCByZWNvcmQgZGF0YSB2aWEgUkVTVCBBUEkgLSBhbHdheXMgcmV0dXJucyBkYXRhICh3aXRoIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcylcbiAgICAgICAgICAgIE9mZldvcmtUaW1lc0FQSS5nZXRSZWNvcmQocmVjb3JkSWRUb0xvYWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN1Y2Nlc3M6IHBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIChkZWZhdWx0cyBmb3IgbmV3LCByZWFsIGRhdGEgZm9yIGV4aXN0aW5nKVxuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZERhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIHJvdXRpbmcgcnVsZXNcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5sb2FkUm91dGluZ1RhYmxlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2F2ZSBpbml0aWFsIHZhbHVlcyB0byBwcmV2ZW50IHNhdmUgYnV0dG9uIGFjdGl2YXRpb25cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDI1MCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIGVycm9yIC0gc2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgZHJvcGRvd25zIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgd2Vla2RheSBkcm9wZG93bnMgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgb3JpZ2luYWwgaW1wbGVtZW50YXRpb25cbiAgICAgICAgY29uc3Qgd2Vla0RheXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnLTEnLCB0ZXh0OiAnLScgfSAvLyBEZWZhdWx0IGVtcHR5IG9wdGlvblxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRheXMgMS03IHVzaW5nIHRoZSBzYW1lIGxvZ2ljIGFzIG9yaWdpbmFsIGNvbnRyb2xsZXJcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gNzsgaSsrKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgZGF0ZSBmb3IgXCJTdW5kYXkgK2kgZGF5c1wiIHRvIG1hdGNoIG9yaWdpbmFsIGxvZ2ljXG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoMjAyMCwgMCwgNSArIGkpOyAvLyBKYW4gNSwgMjAyMCB3YXMgU3VuZGF5XG4gICAgICAgICAgICBjb25zdCBkYXlOYW1lID0gZGF0ZS50b0xvY2FsZURhdGVTdHJpbmcoJ2VuJywgeyB3ZWVrZGF5OiAnc2hvcnQnIH0pO1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB0cmFuc2xhdGlvbiBmb3IgdGhlIGRheSBhYmJyZXZpYXRpb25cbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWREYXkgPSBnbG9iYWxUcmFuc2xhdGVbZGF5TmFtZV0gfHwgZGF5TmFtZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgd2Vla0RheXMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogdHJhbnNsYXRlZERheSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHRleHQ6IHRyYW5zbGF0ZWREYXlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIHZhbHVlczogd2Vla0RheXMsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheUZyb21GaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICB2YWx1ZXM6IHdlZWtEYXlzLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlUb0ZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkFjdGlvbkNoYW5nZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2FsZW5kYXIgdHlwZSBkcm9wZG93blxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsVHlwZUZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkNhbFR5cGVDaGFuZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gc2VsZWN0b3Igd2lsbCBiZSBpbml0aWFsaXplZCBpbiBwb3B1bGF0ZUZvcm0gd2l0aCBBUEkgZGF0YVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggQVBJIGRhdGFcbiAgICAgKiBTaW5nbGUgcG9pbnQgb2YgaW5pdGlhbGl6YXRpb24gYWZ0ZXIgcmVjZWl2aW5nIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEFQSSByZXNwb25zZSBkYXRhICh3aXRoIGRlZmF1bHRzIG9yIGV4aXN0aW5nIHZhbHVlcylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3IoZGF0YSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFNvdW5kRmlsZVNlbGVjdG9yIHdpdGggY29tcGxldGUgQVBJIGRhdGEgY29udGV4dFxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KG91dE9mV29ya1RpbWVSZWNvcmQuYXVkaW9NZXNzYWdlSWQsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsICAvLyBPdXQgb2Ygd29yayB0aW1lIG11c3QgYWx3YXlzIGhhdmUgYSBzb3VuZCBmaWxlXG4gICAgICAgICAgICBkYXRhOiBkYXRhIC8vIFBhc3MgY29tcGxldGUgQVBJIGRhdGEgZm9yIHByb3BlciBpbml0aWFsaXphdGlvblxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGF1ZGlvX21lc3NhZ2VfaWQgZXhpc3RzLCBzZXQgdGhlIHZhbHVlIHdpdGggcmVwcmVzZW50YXRpb25cbiAgICAgICAgaWYgKGRhdGEuYXVkaW9fbWVzc2FnZV9pZCAmJiBkYXRhLmF1ZGlvX21lc3NhZ2VfaWRfcmVwcmVzZW50KSB7XG4gICAgICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmF1ZGlvTWVzc2FnZUlkLCBcbiAgICAgICAgICAgICAgICBkYXRhLmF1ZGlvX21lc3NhZ2VfaWQsIFxuICAgICAgICAgICAgICAgIGRhdGEuYXVkaW9fbWVzc2FnZV9pZF9yZXByZXNlbnRcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yIHdpdGggQVBJIGRhdGFcbiAgICAgKiBTaW5nbGUgcG9pbnQgb2YgaW5pdGlhbGl6YXRpb24gYWZ0ZXIgcmVjZWl2aW5nIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEFQSSByZXNwb25zZSBkYXRhICh3aXRoIGRlZmF1bHRzIG9yIGV4aXN0aW5nIHZhbHVlcylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoZGF0YSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIEV4dGVuc2lvblNlbGVjdG9yIGZvbGxvd2luZyBWNS4wIHBhdHRlcm5cbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZXh0ZW5zaW9uJywge1xuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBSZWNvcmQgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBpc0NvcHkgPSB1cmxQYXJhbXMuaGFzKCdjb3B5Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgY29weSBvcGVyYXRpb24sIGNsZWFyIElEIGFuZCBwcmlvcml0eVxuICAgICAgICBpZiAoaXNDb3B5KSB7XG4gICAgICAgICAgICBkYXRhLmlkID0gJyc7XG4gICAgICAgICAgICBkYXRhLnByaW9yaXR5ID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoe1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgICAgICB1bmlxaWQ6IGRhdGEudW5pcWlkLFxuICAgICAgICAgICAgcHJpb3JpdHk6IGRhdGEucHJpb3JpdHksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgIGNhbFR5cGU6IGRhdGEuY2FsVHlwZSxcbiAgICAgICAgICAgIHdlZWtkYXlfZnJvbTogZGF0YS53ZWVrZGF5X2Zyb20sXG4gICAgICAgICAgICB3ZWVrZGF5X3RvOiBkYXRhLndlZWtkYXlfdG8sXG4gICAgICAgICAgICB0aW1lX2Zyb206IGRhdGEudGltZV9mcm9tLFxuICAgICAgICAgICAgdGltZV90bzogZGF0YS50aW1lX3RvLFxuICAgICAgICAgICAgY2FsVXJsOiBkYXRhLmNhbFVybCxcbiAgICAgICAgICAgIGNhbFVzZXI6IGRhdGEuY2FsVXNlcixcbiAgICAgICAgICAgIGNhbFNlY3JldDogZGF0YS5jYWxTZWNyZXQsXG4gICAgICAgICAgICBhY3Rpb246IGRhdGEuYWN0aW9uLFxuICAgICAgICAgICAgZXh0ZW5zaW9uOiBkYXRhLmV4dGVuc2lvbixcbiAgICAgICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IGRhdGEuYXVkaW9fbWVzc2FnZV9pZCxcbiAgICAgICAgICAgIGFsbG93UmVzdHJpY3Rpb246IGRhdGEuYWxsb3dSZXN0cmljdGlvblxuICAgICAgICB9LCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcGFzc3dvcmQgZmllbGQgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICBjb25zdCAkY2FsU2VjcmV0RmllbGQgPSAkKCcjY2FsU2VjcmV0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuY2FsU2VjcmV0ID09PSAnWFhYWFhYJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBQYXNzd29yZCBleGlzdHMgYnV0IGlzIG1hc2tlZCwgc2hvdyBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICAgICAkY2FsU2VjcmV0RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUudGZfUGFzc3dvcmRNYXNrZWQpO1xuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBtYXNrZWQgc3RhdGUgdG8gZGV0ZWN0IGNoYW5nZXNcbiAgICAgICAgICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmRhdGEoJ29yaWdpbmFsTWFza2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLnRmX0VudGVyUGFzc3dvcmQpO1xuICAgICAgICAgICAgICAgICAgICAkY2FsU2VjcmV0RmllbGQuZGF0YSgnb3JpZ2luYWxNYXNrZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRHJvcGRvd25zKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggQVBJIGRhdGEgKHNpbmdsZSBwb2ludCBvZiBpbml0aWFsaXphdGlvbilcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcihkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciB3aXRoIEFQSSBkYXRhXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IGRyb3Bkb3duIHZhbHVlcyBhZnRlciBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgICAgIC8vIFNldCBhY3Rpb24gZHJvcGRvd25cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYWN0aW9uRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuYWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IGNhbFR5cGUgZHJvcGRvd25cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5jYWxUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbFR5cGVEcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5jYWxUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgc2V0IGhpZGRlbiBmaWVsZCB2YWx1ZSBzaW5jZSBvbkNoYW5nZSBkb2Vzbid0IGZpcmUgb24gcHJvZ3JhbW1hdGljIHNldFxuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRmllbGQudmFsKGRhdGEuY2FsVHlwZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCB3ZWVrZGF5IGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLndlZWtkYXlfZnJvbSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLndlZWtkYXlfZnJvbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLndlZWtkYXlfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheVRvRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEud2Vla2RheV90byk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBkYXRlcyBpZiBwcmVzZW50XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZGF0ZV9mcm9tKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2V0RGF0ZUZyb21WYWx1ZShkYXRhLmRhdGVfZnJvbSwgJyNyYW5nZS1kYXlzLXN0YXJ0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmRhdGVfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5zZXREYXRlRnJvbVZhbHVlKGRhdGEuZGF0ZV90bywgJyNyYW5nZS1kYXlzLWVuZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZmllbGQgdmlzaWJpbGl0eSBiYXNlZCBvbiBhY3Rpb25cbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLm9uQWN0aW9uQ2hhbmdlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGNhbGVuZGFyIHR5cGUgdmlzaWJpbGl0eVxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQub25DYWxUeXBlQ2hhbmdlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IHJ1bGVzIHRhYiB2aXNpYmlsaXR5IGJhc2VkIG9uIGFsbG93UmVzdHJpY3Rpb25cbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnRvZ2dsZVJ1bGVzVGFiKGRhdGEuYWxsb3dSZXN0cmljdGlvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZ1xuICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgYWN0aW9uIGRyb3Bkb3duIGNoYW5nZVxuICAgICAqL1xuICAgIG9uQWN0aW9uQ2hhbmdlKCkge1xuICAgICAgICBjb25zdCBhY3Rpb24gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdhY3Rpb24nKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhY3Rpb24gPT09ICdleHRlbnNpb24nKSB7XG4gICAgICAgICAgICAvLyBTaG93IGV4dGVuc2lvbiwgaGlkZSBhdWRpb1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXh0ZW5zaW9uUm93LnNob3coKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGF1ZGlvTWVzc2FnZVJvdy5oaWRlKCk7XG4gICAgICAgICAgICAvLyBDbGVhciBhdWRpbyBtZXNzYWdlXG4gICAgICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5jbGVhcihvdXRPZldvcmtUaW1lUmVjb3JkLmF1ZGlvTWVzc2FnZUlkKTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09ICdwbGF5bWVzc2FnZScpIHtcbiAgICAgICAgICAgIC8vIFNob3cgYXVkaW8sIGhpZGUgZXh0ZW5zaW9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25Sb3cuaGlkZSgpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYXVkaW9NZXNzYWdlUm93LnNob3coKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGV4dGVuc2lvbiB1c2luZyBFeHRlbnNpb25TZWxlY3RvclxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuY2xlYXIoJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXh0ZW5zaW9uRmllbGQudmFsKCcnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGNhbGVuZGFyIHR5cGUgY2hhbmdlXG4gICAgICovXG4gICAgb25DYWxUeXBlQ2hhbmdlKCkge1xuICAgICAgICBjb25zdCBjYWxUeXBlID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2FsVHlwZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gJ3RpbWVmcmFtZScgYW5kIGVtcHR5IHN0cmluZyBtZWFuIHRpbWUtYmFzZWQgY29uZGl0aW9ucyAoc2hvdyBtYWluIHRhYilcbiAgICAgICAgaWYgKCFjYWxUeXBlIHx8IGNhbFR5cGUgPT09ICd0aW1lZnJhbWUnIHx8IGNhbFR5cGUgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBTaG93IG1haW4gdGltZS9kYXRlIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbGVuZGFyVGFiLmhpZGUoKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJG1haW5UYWIuc2hvdygpO1xuICAgICAgICB9IGVsc2UgaWYgKGNhbFR5cGUgPT09ICdjYWxkYXYnIHx8IGNhbFR5cGUgPT09ICdpY2FsJykge1xuICAgICAgICAgICAgLy8gU2hvdyBjYWxlbmRhciBVUkwgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsZW5kYXJUYWIuc2hvdygpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kbWFpblRhYi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2FsZW5kYXJzIGZvciBkYXRlIGFuZCB0aW1lIHNlbGVjdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVDYWxlbmRhcnMoKSB7XG4gICAgICAgIC8vIERhdGUgcmFuZ2UgY2FsZW5kYXJzXG4gICAgICAgIC8vIFVzZSBjbGFzcyB2YXJpYWJsZXMgZm9yIGNhbGVuZGFyc1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBlbmRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLFxuICAgICAgICAgICAgdHlwZTogJ2RhdGUnLFxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIG1vbnRoRmlyc3Q6IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgc3RhcnRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBUaW1lIHJhbmdlIGNhbGVuZGFyc1xuICAgICAgICAvLyBOb3RlOiBVbmxpa2UgZGF0ZSBjYWxlbmRhcnMsIHRpbWUgY2FsZW5kYXJzIGFyZSBOT1QgbGlua2VkIHdpdGggc3RhcnRDYWxlbmRhci9lbmRDYWxlbmRhclxuICAgICAgICAvLyBUaGlzIGFsbG93cyBzZWxlY3RpbmcgdGltZSByYW5nZXMgdGhhdCBjcm9zcyBtaWRuaWdodCAoZS5nLiwgMTg6MDAgLSAwODowMCBmb3Igb2ZmLXdvcmsgaG91cnMpXG5cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZUVuZC5jYWxlbmRhcih7XG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIHR5cGU6ICd0aW1lJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByb3V0aW5nIHRhYmxlIGFuZCBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJvdXRpbmdUYWJsZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFsbG93UmVzdHJpY3Rpb25GaWVsZC5wYXJlbnQoKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kYWxsb3dSZXN0cmljdGlvbkZpZWxkLnBhcmVudCgpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC50b2dnbGVSdWxlc1RhYihpc0NoZWNrZWQpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGV4aXN0aW5nIGNoZWNrYm94ZXMgaW4gdGFibGVcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCcudWkuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHJ1bGVzIHRhYiB2aXNpYmlsaXR5XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0NoZWNrZWQgLSBXaGV0aGVyIHRvIHNob3cgcnVsZXMgdGFiXG4gICAgICovXG4gICAgdG9nZ2xlUnVsZXNUYWIoaXNDaGVja2VkKSB7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYi5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYi5oaWRlKCk7XG4gICAgICAgICAgICAvLyBTd2l0Y2ggdG8gZ2VuZXJhbCB0YWIgaWYgcnVsZXMgdGFiIHdhcyBhY3RpdmVcbiAgICAgICAgICAgIGlmIChvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYi5oYXNDbGFzcygnYWN0aXZlJykpIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYi5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJTZWdtZW50LnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRnZW5lcmFsVGFiLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRnZW5lcmFsVGFiU2VnbWVudC5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcm91dGluZyB0YWJsZSB3aXRoIGluY29taW5nIHJvdXRlc1xuICAgICAqL1xuICAgIGxvYWRSb3V0aW5nVGFibGUoKSB7XG4gICAgICAgIC8vIENsZWFyIHRhYmxlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgndGJvZHknKS5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGFzc29jaWF0ZWQgSURzIGZyb20gcmVjb3JkIGRhdGFcbiAgICAgICAgY29uc3QgYXNzb2NpYXRlZElkcyA9IG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkRGF0YT8uaW5jb21pbmdSb3V0ZUlkcyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgYWxsIGF2YWlsYWJsZSByb3V0ZXMgZnJvbSBJbmNvbWluZ1JvdXRlc0FQSVxuICAgICAgICBJbmNvbWluZ1JvdXRlc0FQSS5nZXRMaXN0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gR3JvdXAgYW5kIHNvcnQgcm91dGVzXG4gICAgICAgICAgICAgICAgY29uc3QgZ3JvdXBlZFJvdXRlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQuZ3JvdXBBbmRTb3J0Um91dGVzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlbmRlciBncm91cGVkIHJvdXRlc1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQucmVuZGVyR3JvdXBlZFJvdXRlcyhncm91cGVkUm91dGVzLCBhc3NvY2lhdGVkSWRzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGNvbXBvbmVudHMgd2l0aCBncm91cGVkIGNoZWNrYm94IGxvZ2ljXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplUm91dGluZ0NoZWNrYm94ZXMoKTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJ1tkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5zaG93RW1wdHlSb3V0ZXNNZXNzYWdlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR3JvdXAgYW5kIHNvcnQgcm91dGVzIGJ5IHByb3ZpZGVyIGFuZCBESURcbiAgICAgKiBAcGFyYW0ge0FycmF5fSByb3V0ZXMgLSBBcnJheSBvZiByb3V0ZSBvYmplY3RzXG4gICAgICogQHJldHVybnMge09iamVjdH0gR3JvdXBlZCByb3V0ZXNcbiAgICAgKi9cbiAgICBncm91cEFuZFNvcnRSb3V0ZXMocm91dGVzKSB7XG4gICAgICAgIGNvbnN0IGdyb3VwcyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCBkZWZhdWx0IHJvdXRlIGFuZCBncm91cCBieSBwcm92aWRlclxuICAgICAgICByb3V0ZXMuZm9yRWFjaCgocm91dGUpID0+IHtcbiAgICAgICAgICAgIGlmIChyb3V0ZS5pZCA9PT0gMSB8fCByb3V0ZS5pZCA9PT0gJzEnKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSByb3V0ZS5wcm92aWRlciB8fCAnbm9uZSc7XG4gICAgICAgICAgICBpZiAoIWdyb3Vwc1twcm92aWRlcklkXSkge1xuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgcGxhaW4gdGV4dCBwcm92aWRlciBuYW1lIGZyb20gSFRNTCBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBsZXQgcHJvdmlkZXJOYW1lID0gcm91dGUucHJvdmlkZXJpZF9yZXByZXNlbnQgfHwgZ2xvYmFsVHJhbnNsYXRlLmlyX05vQXNzaWduZWRQcm92aWRlcjtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgSFRNTCB0YWdzIHRvIGdldCBjbGVhbiBwcm92aWRlciBuYW1lIGZvciBkaXNwbGF5XG4gICAgICAgICAgICAgICAgY29uc3QgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgIHRlbXBEaXYuaW5uZXJIVE1MID0gcHJvdmlkZXJOYW1lO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuUHJvdmlkZXJOYW1lID0gdGVtcERpdi50ZXh0Q29udGVudCB8fCB0ZW1wRGl2LmlubmVyVGV4dCB8fCBwcm92aWRlck5hbWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdID0ge1xuICAgICAgICAgICAgICAgICAgICBwcm92aWRlcklkOiBwcm92aWRlcklkLCAgLy8gU3RvcmUgYWN0dWFsIHByb3ZpZGVyIElEXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTmFtZTogY2xlYW5Qcm92aWRlck5hbWUsICAvLyBDbGVhbiBuYW1lIGZvciBkaXNwbGF5XG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTmFtZUh0bWw6IHJvdXRlLnByb3ZpZGVyaWRfcmVwcmVzZW50IHx8IHByb3ZpZGVyTmFtZSwgIC8vIE9yaWdpbmFsIEhUTUwgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyRGlzYWJsZWQ6IHJvdXRlLnByb3ZpZGVyRGlzYWJsZWQgfHwgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxSdWxlczogW10sXG4gICAgICAgICAgICAgICAgICAgIHNwZWNpZmljUnVsZXM6IHt9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2VwYXJhdGUgZ2VuZXJhbCBydWxlcyAobm8gRElEKSBmcm9tIHNwZWNpZmljIHJ1bGVzICh3aXRoIERJRClcbiAgICAgICAgICAgIGlmICghcm91dGUubnVtYmVyIHx8IHJvdXRlLm51bWJlciA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0uZ2VuZXJhbFJ1bGVzLnB1c2gocm91dGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIWdyb3Vwc1twcm92aWRlcklkXS5zcGVjaWZpY1J1bGVzW3JvdXRlLm51bWJlcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXNbcm91dGUubnVtYmVyXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlc1tyb3V0ZS5udW1iZXJdLnB1c2gocm91dGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNvcnQgcnVsZXMgd2l0aGluIGVhY2ggZ3JvdXAgYnkgcHJpb3JpdHlcbiAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBzKS5mb3JFYWNoKHByb3ZpZGVySWQgPT4ge1xuICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLmdlbmVyYWxSdWxlcy5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlcykuZm9yRWFjaChkaWQgPT4ge1xuICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5zcGVjaWZpY1J1bGVzW2RpZF0uc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGdyb3VwcztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciBncm91cGVkIHJvdXRlcyBpbiB0aGUgdGFibGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZ3JvdXBlZFJvdXRlcyAtIEdyb3VwZWQgcm91dGVzIG9iamVjdFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFzc29jaWF0ZWRJZHMgLSBBcnJheSBvZiBhc3NvY2lhdGVkIHJvdXRlIElEc1xuICAgICAqL1xuICAgIHJlbmRlckdyb3VwZWRSb3V0ZXMoZ3JvdXBlZFJvdXRlcywgYXNzb2NpYXRlZElkcykge1xuICAgICAgICBjb25zdCB0Ym9keSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgndGJvZHknKTtcbiAgICAgICAgbGV0IGlzRmlyc3RHcm91cCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICBPYmplY3Qua2V5cyhncm91cGVkUm91dGVzKS5mb3JFYWNoKHByb3ZpZGVySWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgZ3JvdXAgPSBncm91cGVkUm91dGVzW3Byb3ZpZGVySWRdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgcHJvdmlkZXIgZ3JvdXAgaGVhZGVyXG4gICAgICAgICAgICBpZiAoIWlzRmlyc3RHcm91cCkge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBzZXBhcmF0b3IgYmV0d2VlbiBncm91cHNcbiAgICAgICAgICAgICAgICB0Ym9keS5hcHBlbmQoJzx0ciBjbGFzcz1cInByb3ZpZGVyLXNlcGFyYXRvclwiPjx0ZCBjb2xzcGFuPVwiM1wiPjxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PC90ZD48L3RyPicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaXNGaXJzdEdyb3VwID0gZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBwcm92aWRlciBoZWFkZXIgcm93IC0gdXNlIHByb3ZpZGVyTmFtZUh0bWwgZm9yIHJpY2ggZGlzcGxheVxuICAgICAgICAgICAgdGJvZHkuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8dHIgY2xhc3M9XCJwcm92aWRlci1oZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNvbHNwYW49XCIzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtncm91cC5wcm92aWRlck5hbWVIdG1sfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dyb3VwLnByb3ZpZGVyRGlzYWJsZWQgPyAnPHNwYW4gY2xhc3M9XCJ1aSBtaW5pIHJlZCBsYWJlbFwiPkRpc2FibGVkPC9zcGFuPicgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVuZGVyIGdlbmVyYWwgcnVsZXMgZmlyc3RcbiAgICAgICAgICAgIGdyb3VwLmdlbmVyYWxSdWxlcy5mb3JFYWNoKChyb3V0ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IG91dE9mV29ya1RpbWVSZWNvcmQuY3JlYXRlUm91dGVSb3cocm91dGUsIGFzc29jaWF0ZWRJZHMsICdydWxlLWdlbmVyYWwnKTtcbiAgICAgICAgICAgICAgICB0Ym9keS5hcHBlbmQocm93KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW5kZXIgc3BlY2lmaWMgcnVsZXMgZ3JvdXBlZCBieSBESURcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGdyb3VwLnNwZWNpZmljUnVsZXMpLnNvcnQoKS5mb3JFYWNoKGRpZCA9PiB7XG4gICAgICAgICAgICAgICAgZ3JvdXAuc3BlY2lmaWNSdWxlc1tkaWRdLmZvckVhY2goKHJvdXRlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0ZpcnN0SW5ESUQgPSBpbmRleCA9PT0gMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jcmVhdGVSb3V0ZVJvdyhyb3V0ZSwgYXNzb2NpYXRlZElkcywgJ3J1bGUtc3BlY2lmaWMnLCBpc0ZpcnN0SW5ESUQpO1xuICAgICAgICAgICAgICAgICAgICB0Ym9keS5hcHBlbmQocm93KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHNpbmdsZSByb3V0ZSByb3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcm91dGUgLSBSb3V0ZSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhc3NvY2lhdGVkSWRzIC0gQXNzb2NpYXRlZCByb3V0ZSBJRHNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcnVsZUNsYXNzIC0gQ1NTIGNsYXNzIGZvciB0aGUgcnVsZSB0eXBlXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBzaG93RElESW5kaWNhdG9yIC0gV2hldGhlciB0byBzaG93IERJRCBpbmRpY2F0b3JcbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBIVE1MIHJvd1xuICAgICAqL1xuICAgIGNyZWF0ZVJvdXRlUm93KHJvdXRlLCBhc3NvY2lhdGVkSWRzLCBydWxlQ2xhc3MgPSAnJywgc2hvd0RJREluZGljYXRvciA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IGFzc29jaWF0ZWRJZHMuaW5jbHVkZXMocGFyc2VJbnQocm91dGUuaWQpKTtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJEaXNhYmxlZCA9IHJvdXRlLnByb3ZpZGVyRGlzYWJsZWQgPyAnZGlzYWJsZWQnIDogJyc7XG4gICAgICAgIGxldCBydWxlRGVzY3JpcHRpb24gPSByb3V0ZS5ydWxlX3JlcHJlc2VudCB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEVuc3VyZSBwcm92aWRlciBJRCBpcyBjbGVhbiAobm8gSFRNTClcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9IHJvdXRlLnByb3ZpZGVyIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHZpc3VhbCBpbmRpY2F0b3JzIGZvciBydWxlIHR5cGVcbiAgICAgICAgaWYgKHJ1bGVDbGFzcyA9PT0gJ3J1bGUtc3BlY2lmaWMnKSB7XG4gICAgICAgICAgICAvLyBBZGQgaW5kZW50IGFuZCBhcnJvdyBmb3Igc3BlY2lmaWMgcnVsZXNcbiAgICAgICAgICAgIHJ1bGVEZXNjcmlwdGlvbiA9IGA8c3BhbiBjbGFzcz1cInJ1bGUtaW5kZW50XCI+4oazPC9zcGFuPiAke3J1bGVEZXNjcmlwdGlvbn1gO1xuICAgICAgICB9IGVsc2UgaWYgKHJ1bGVDbGFzcyA9PT0gJ3J1bGUtZ2VuZXJhbCcpIHtcbiAgICAgICAgICAgIC8vIEFkZCBpY29uIGZvciBnZW5lcmFsIHJ1bGVzXG4gICAgICAgICAgICBydWxlRGVzY3JpcHRpb24gPSBgPGkgY2xhc3M9XCJyYW5kb20gaWNvblwiPjwvaT4gJHtydWxlRGVzY3JpcHRpb259YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgbm90ZURpc3BsYXkgPSByb3V0ZS5ub3RlICYmIHJvdXRlLm5vdGUubGVuZ3RoID4gMjAgPyBcbiAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b25cIiBkYXRhLWNvbnRlbnQ9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChyb3V0ZS5ub3RlKX1cIiBkYXRhLXZhcmlhdGlvbj1cIndpZGVcIiBkYXRhLXBvc2l0aW9uPVwidG9wIHJpZ2h0XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJmaWxlIHRleHQgaWNvblwiPjwvaT5cbiAgICAgICAgICAgIDwvZGl2PmAgOiBcbiAgICAgICAgICAgIFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChyb3V0ZS5ub3RlIHx8ICcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERhdGEgYXR0cmlidXRlcyBhbHJlYWR5IHNhZmUgZnJvbSBBUElcbiAgICAgICAgY29uc3Qgc2FmZVByb3ZpZGVySWQgPSBwcm92aWRlcklkO1xuICAgICAgICBjb25zdCBzYWZlRGlkID0gcm91dGUubnVtYmVyIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDx0ciBjbGFzcz1cInJ1bGUtcm93ICR7cnVsZUNsYXNzfVwiIGlkPVwiJHtyb3V0ZS5pZH1cIiBcbiAgICAgICAgICAgICAgICBkYXRhLXByb3ZpZGVyPVwiJHtzYWZlUHJvdmlkZXJJZH1cIiBcbiAgICAgICAgICAgICAgICBkYXRhLWRpZD1cIiR7c2FmZURpZH1cIj5cbiAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJjb2xsYXBzaW5nXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBmaXR0ZWQgdG9nZ2xlIGNoZWNrYm94XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1kaWQ9XCIke3NhZmVEaWR9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wcm92aWRlcj1cIiR7c2FmZVByb3ZpZGVySWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgJHtpc0NoZWNrZWQgPyAnY2hlY2tlZCcgOiAnJ30gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInJvdXRlLSR7cm91dGUuaWR9XCIgZGF0YS12YWx1ZT1cIiR7cm91dGUuaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCIke3Byb3ZpZGVyRGlzYWJsZWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICR7cnVsZURlc2NyaXB0aW9uIHx8ICc8c3BhbiBjbGFzcz1cInRleHQtbXV0ZWRcIj5ObyBkZXNjcmlwdGlvbjwvc3Bhbj4nfVxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiaGlkZS1vbi1tb2JpbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtub3RlRGlzcGxheX1cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgPC90cj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgZW1wdHkgcm91dGVzIG1lc3NhZ2UgaW4gdGFibGVcbiAgICAgKi9cbiAgICBzaG93RW1wdHlSb3V0ZXNNZXNzYWdlKCkge1xuICAgICAgICBjb25zdCBlbXB0eVJvdyA9IGBcbiAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjNcIiBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmlyX05vSW5jb21pbmdSb3V0ZXN9XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgIGA7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQoZW1wdHlSb3cpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByb3V0aW5nIGNoZWNrYm94ZXMgd2l0aCBncm91cGVkIGxvZ2ljXG4gICAgICogV2hlbiBjaGVja2luZy91bmNoZWNraW5nIHJ1bGVzIHdpdGggc2FtZSBwcm92aWRlciBhbmQgRElEXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJvdXRpbmdDaGVja2JveGVzKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhvdmVyIGVmZmVjdCB0byBoaWdobGlnaHQgcmVsYXRlZCBydWxlc1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLmhvdmVyKFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkcm93LmF0dHIoJ2RhdGEtcHJvdmlkZXInKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkaWQgPSAkcm93LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHByZXZpb3VzIGhpZ2hsaWdodHNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLnJlbW92ZUNsYXNzKCdyZWxhdGVkLWhpZ2hsaWdodCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhpZ2hsaWdodCBhbGwgcnVsZXMgd2l0aCBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzZWxlY3RvciA9IGAucnVsZS1yb3dbZGF0YS1wcm92aWRlcj1cIiR7cHJvdmlkZXJ9XCJdYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGhvdmVyaW5nIG9uIHNwZWNpZmljIERJRCBydWxlLCBoaWdobGlnaHQgYWxsIHdpdGggc2FtZSBESURcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9IGBbZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgaG92ZXJpbmcgb24gZ2VuZXJhbCBydWxlLCBoaWdobGlnaHQgYWxsIGdlbmVyYWwgcnVsZXMgZm9yIHRoaXMgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9ICdbZGF0YS1kaWQ9XCJcIl0nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCAkcmVsYXRlZFJvd3MgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICAkcmVsYXRlZFJvd3MuYWRkQ2xhc3MoJ3JlbGF0ZWQtaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBoaWdobGlnaHRzIG9uIG1vdXNlIGxlYXZlXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCcucnVsZS1yb3cnKS5yZW1vdmVDbGFzcygncmVsYXRlZC1oaWdobGlnaHQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3ggYmVoYXZpb3Igd2l0aCB0b29sdGlwc1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy51aS5jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgZGlkID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlciA9ICRjaGVja2JveC5hdHRyKCdkYXRhLXByb3ZpZGVyJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCB0b29sdGlwIHRvIGV4cGxhaW4gZ3JvdXBpbmdcbiAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgbGV0IHRvb2x0aXBUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGRpZCkge1xuICAgICAgICAgICAgICAgICAgICB0b29sdGlwVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS50Zl9Ub29sdGlwU3BlY2lmaWNSdWxlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnRmX1Rvb2x0aXBHZW5lcmFsUnVsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNoZWNrYm94LmF0dHIoJ2RhdGEtY29udGVudCcsIHRvb2x0aXBUZXh0KTtcbiAgICAgICAgICAgICAgICAkY2hlY2tib3guYXR0cignZGF0YS12YXJpYXRpb24nLCAndGlueScpO1xuICAgICAgICAgICAgICAgICRjaGVja2JveC5wb3B1cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3ggY2hhbmdlIGJlaGF2aW9yXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcykucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlkID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkY2hlY2tib3guYXR0cignZGF0YS1wcm92aWRlcicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNraXAgc3luY2hyb25pemF0aW9uIGZvciAnbm9uZScgcHJvdmlkZXIgKGRpcmVjdCBjYWxscylcbiAgICAgICAgICAgICAgICBpZiAoIXByb3ZpZGVyIHx8IHByb3ZpZGVyID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZ3JvdXBlZCBsb2dpYyByZXF1aXJlbWVudHNcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYCNyb3V0aW5nLXRhYmxlIC51aS5jaGVja2JveFtkYXRhLXByb3ZpZGVyPVwiJHtwcm92aWRlcn1cIl1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpZCAmJiBkaWQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSdWxlIHdpdGggc3BlY2lmaWMgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBjaGVja2luZyBhIHJ1bGUgd2l0aCBESUQsIGNoZWNrIGFsbCBydWxlcyB3aXRoIHNhbWUgcHJvdmlkZXIgYW5kIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yV2l0aERJRCA9IGAke3NlbGVjdG9yfVtkYXRhLWRpZD1cIiR7ZGlkfVwiXWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChzZWxlY3RvcldpdGhESUQpLm5vdCgkY2hlY2tib3gpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHVuY2hlY2tpbmcgYSBydWxlIHdpdGggRElEOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIFVuY2hlY2sgYWxsIHJ1bGVzIHdpdGggc2FtZSBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvcldpdGhESUQgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JXaXRoRElEKS5ub3QoJGNoZWNrYm94KS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDIuIEFsc28gdW5jaGVjayBnZW5lcmFsIHJ1bGVzICh3aXRob3V0IERJRCkgZm9yIHNhbWUgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvckdlbmVyYWwgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCJcIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JHZW5lcmFsKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2VuZXJhbCBydWxlIHdpdGhvdXQgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gdW5jaGVja2luZyBnZW5lcmFsIHJ1bGUsIG9ubHkgdW5jaGVjayBvdGhlciBnZW5lcmFsIHJ1bGVzIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBjaGVja2luZyBnZW5lcmFsIHJ1bGUsIGNoZWNrIGFsbCBnZW5lcmFsIHJ1bGVzIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZVxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGVyYXNlIGJ1dHRvbnMgZm9yIGRhdGUvdGltZSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXJhc2VycygpIHtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJhc2VEYXRlc0J0bi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZVdlZWtkYXlzQnRuLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlGcm9tRHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZVRpbWVwZXJpb2RCdG4ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZXNjcmlwdGlvbiBmaWVsZCB3aXRoIGF1dG8tcmVzaXplXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlc2NyaXB0aW9uRmllbGQoKSB7XG4gICAgICAgIC8vIEF1dG8tcmVzaXplIG9uIGlucHV0XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgICAgICAgIHRoaXMuc3R5bGUuaGVpZ2h0ID0gKHRoaXMuc2Nyb2xsSGVpZ2h0KSArICdweCc7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCByZXNpemVcbiAgICAgICAgaWYgKG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHV0IGEgc3RvcmVkIGRhdGUgaW50byBhIGNhbGVuZGFyLlxuICAgICAqIERhdGVzIGFyZSBjYWxlbmRhciBkYXlzIG9mIHRoZSBQQlggdGltZXpvbmUgKCdZWVlZLU1NLUREJyk7IHRoZXkgYXJlIGJ1aWx0IGZyb21cbiAgICAgKiBsb2NhbCBjb21wb25lbnRzIGJlY2F1c2UgbmV3IERhdGUoJ1lZWVktTU0tREQnKSBwYXJzZXMgYXMgVVRDIG1pZG5pZ2h0IGFuZCBzaG93c1xuICAgICAqIHRoZSBwcmV2aW91cyBkYXkgaW4gYnJvd3NlcnMgd2VzdCBvZiBVVEMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRhdGVWYWx1ZSAtIERhdGUgaW4gWVlZWS1NTS1ERCBmb3JtYXRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3JcbiAgICAgKi9cbiAgICBzZXREYXRlRnJvbVZhbHVlKGRhdGVWYWx1ZSwgc2VsZWN0b3IpIHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvXihcXGR7NH0pLShcXGR7Mn0pLShcXGR7Mn0pJC8uZXhlYyhTdHJpbmcoZGF0ZVZhbHVlIHx8ICcnKSk7XG4gICAgICAgIGlmICghbWF0Y2gpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoTnVtYmVyKG1hdGNoWzFdKSwgTnVtYmVyKG1hdGNoWzJdKSAtIDEsIE51bWJlcihtYXRjaFszXSkpO1xuICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBkYXRlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGEgY2FsZW5kYXIgZGF0ZSBhcyBZWVlZLU1NLUREIGZyb20gaXRzIGxvY2FsIGNvbXBvbmVudHMsIHNvIHRoZSBwaWNrZWQgZGF5XG4gICAgICogZG9lcyBub3QgZGVwZW5kIG9uIHRoZSBicm93c2VyIHRpbWV6b25lLlxuICAgICAqIEBwYXJhbSB7RGF0ZX0gZGF0ZSAtIERhdGUgcGlja2VkIGluIHRoZSBjYWxlbmRhclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IERhdGUgaW4gWVlZWS1NTS1ERCBmb3JtYXRcbiAgICAgKi9cbiAgICBmb3JtYXRDYWxlbmRhckRhdGUoZGF0ZSkge1xuICAgICAgICBjb25zdCBtb250aCA9IFN0cmluZyhkYXRlLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBkYXkgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIHJldHVybiBgJHtkYXRlLmdldEZ1bGxZZWFyKCl9LSR7bW9udGh9LSR7ZGF5fWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gZm9yIHBhaXJlZCBmaWVsZHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gRm9ybSBkYXRhXG4gICAgICogQHJldHVybnMge29iamVjdHxib29sZWFufSBSZXN1bHQgb2JqZWN0IG9yIGZhbHNlIGlmIHZhbGlkYXRpb24gZmFpbHNcbiAgICAgKi9cbiAgICBjdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KSB7XG4gICAgICAgIC8vIENoZWNrIGRhdGUgZmllbGRzIC0gYm90aCBzaG91bGQgYmUgZmlsbGVkIG9yIGJvdGggZW1wdHlcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS5kYXRlX2Zyb20gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gPT09ICcnKSB8fFxuICAgICAgICAgICAgKHJlc3VsdC5kYXRhLmRhdGVfdG8gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9PT0gJycpKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdlZWtkYXkgZmllbGRzIC0gYm90aCBzaG91bGQgYmUgZmlsbGVkIG9yIGJvdGggZW1wdHlcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMScpIHx8XG4gICAgICAgICAgICAocmVzdWx0LmRhdGEud2Vla2RheV90byA+IDAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID09PSAnLTEnKSkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB0aW1lIGZpZWxkcyAtIGJvdGggc2hvdWxkIGJlIGZpbGxlZCBvciBib3RoIGVtcHR5XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApIHx8XG4gICAgICAgICAgICAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHRpbWVmcmFtZSB0eXBlLCBjaGVjayB0aGF0IGF0IGxlYXN0IG9uZSBjb25kaXRpb24gaXMgc3BlY2lmaWVkXG4gICAgICAgIGNvbnN0IGNhbFR5cGUgPSByZXN1bHQuZGF0YS5jYWxUeXBlIHx8ICd0aW1lZnJhbWUnO1xuICAgICAgICBpZiAoY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScgfHwgY2FsVHlwZSA9PT0gJycpIHtcbiAgICAgICAgICAgIGNvbnN0IGhhc0RhdGVSYW5nZSA9IHJlc3VsdC5kYXRhLmRhdGVfZnJvbSAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV90byAhPT0gJyc7XG4gICAgICAgICAgICBjb25zdCBoYXNXZWVrZGF5UmFuZ2UgPSByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPiAwO1xuICAgICAgICAgICAgY29uc3QgaGFzVGltZVJhbmdlID0gcmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWhhc0RhdGVSYW5nZSAmJiAhaGFzV2Vla2RheVJhbmdlICYmICFoYXNUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQpLnNob3coKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgc2VuZGluZyBmb3JtXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R8Ym9vbGVhbn0gVXBkYXRlZCBzZXR0aW5ncyBvciBmYWxzZVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyBmcm9tICdvbicvdW5kZWZpbmVkIHRvIHRydWUvZmFsc2VcbiAgICAgICAgLy8gUHJvY2VzcyBhbGwgcm91dGUgY2hlY2tib3hlc1xuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdyb3V0ZS0nKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2tleV0gPSByZXN1bHQuZGF0YVtrZXldID09PSAnb24nIHx8IHJlc3VsdC5kYXRhW2tleV0gPT09IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgIGlmICgnYWxsb3dSZXN0cmljdGlvbicgaW4gcmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFsbG93UmVzdHJpY3Rpb24gPSByZXN1bHQuZGF0YS5hbGxvd1Jlc3RyaWN0aW9uID09PSAnb24nIHx8IHJlc3VsdC5kYXRhLmFsbG93UmVzdHJpY3Rpb24gPT09IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGU6IGNhbFR5cGUgY2FuIGJlICd0aW1lZnJhbWUnLCAnY2FsZGF2JywgJ2ljYWwnLCBvciBlbXB0eSBzdHJpbmdcbiAgICAgICAgLy8gQmFja2VuZCBhY2NlcHRzIGFsbCB0aGVzZSB2YWx1ZXMgKGVtcHR5IHN0cmluZyBpcyB0cmVhdGVkIGFzICd0aW1lZnJhbWUnIGluIERCKVxuICAgICAgICAvLyBObyBjb252ZXJzaW9uIG5lZWRlZCAtIHNlbmQgdmFsdWUgYXMtaXNcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSB3ZWVrZGF5IHZhbHVlcyAobWF0Y2hlcyBvbGQgY29udHJvbGxlcjogKCRkYXRhWyRuYW1lXSA8IDEpID8gbnVsbCA6ICRkYXRhWyRuYW1lXSlcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA9PT0gJy0xJyB8fCByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPCAxKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPSAnJztcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0LmRhdGEud2Vla2RheV90byA9PT0gJy0xJyB8fCByZXN1bHQuZGF0YS53ZWVrZGF5X3RvIDwgMSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEud2Vla2RheV90byA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgcGFzc3dvcmQgZmllbGQgLSBpZiB1c2VyIGRpZG4ndCBjaGFuZ2UgdGhlIG1hc2tlZCBwYXNzd29yZCwga2VlcCBpdCBhcyBpc1xuICAgICAgICAvLyBUaGUgYmFja2VuZCB3aWxsIHJlY29nbml6ZSAnWFhYWFhYJyBhbmQgd29uJ3QgdXBkYXRlIHRoZSBwYXNzd29yZFxuICAgICAgICAvLyBJZiB1c2VyIGNsZWFyZWQgdGhlIGZpZWxkIG9yIGVudGVyZWQgbmV3IHZhbHVlLCBzZW5kIHRoYXRcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLmNhbFNlY3JldCA9PT0gJ1hYWFhYWCcpIHtcbiAgICAgICAgICAgIC8vIFVzZXIgZGlkbid0IGNoYW5nZSB0aGUgbWFza2VkIHBhc3N3b3JkLCBiYWNrZW5kIHdpbGwga2VlcCBleGlzdGluZyB2YWx1ZVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdC5kYXRhLmNhbFNlY3JldCA9PT0gJycpIHtcbiAgICAgICAgICAgIC8vIFVzZXIgY2xlYXJlZCB0aGUgcGFzc3dvcmQgZmllbGQsIGJhY2tlbmQgd2lsbCBjbGVhciB0aGUgcGFzc3dvcmRcbiAgICAgICAgfVxuICAgICAgICAvLyBPdGhlcndpc2Ugc2VuZCB0aGUgbmV3IHBhc3N3b3JkIHZhbHVlIGFzIGVudGVyZWRcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0aW1lIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gY2FsZW5kYXIgdHlwZVxuICAgICAgICBjb25zdCBjYWxUeXBlID0gcmVzdWx0LmRhdGEuY2FsVHlwZSB8fCAndGltZWZyYW1lJztcbiAgICAgICAgaWYgKGNhbFR5cGUgPT09ICcnIHx8IGNhbFR5cGUgPT09ICd0aW1lZnJhbWUnKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZWZyb20ucnVsZXMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmFkZGl0aW9uYWxUaW1lSW50ZXJ2YWxSdWxlcztcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy50aW1ldG8ucnVsZXMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmFkZGl0aW9uYWxUaW1lSW50ZXJ2YWxSdWxlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy50aW1lZnJvbS5ydWxlcyA9IFtdO1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLnRpbWV0by5ydWxlcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTZW5kIGRhdGVzIGFzIGNhbGVuZGFyIGRheXMgKFlZWVktTU0tREQpOyB0aGUgUEJYIGFwcGxpZXMgdGhlbSBpbiBpdHMgb3duIHRpbWV6b25lXG4gICAgICAgIGNvbnN0IGRhdGVGcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIGlmIChkYXRlRnJvbSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC5mb3JtYXRDYWxlbmRhckRhdGUoZGF0ZUZyb20pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICBpZiAoZGF0ZVRvKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5kYXRlX3RvID0gb3V0T2ZXb3JrVGltZVJlY29yZC5mb3JtYXRDYWxlbmRhckRhdGUoZGF0ZVRvKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGVjdCBzZWxlY3RlZCBpbmNvbWluZyByb3V0ZXNcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRSb3V0ZXMgPSBbXTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCByb3V0ZUlkID0gJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBpZiAocm91dGVJZCkge1xuICAgICAgICAgICAgICAgIHNlbGVjdGVkUm91dGVzLnB1c2gocm91dGVJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXN1bHQuZGF0YS5pbmNvbWluZ1JvdXRlSWRzID0gc2VsZWN0ZWRSb3V0ZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBhY3Rpb24tZGVwZW5kZW50IGZpZWxkcyBiYXNlZCBvbiBzZWxlY3Rpb25cbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLmFjdGlvbiA9PT0gJ2V4dGVuc2lvbicpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmF1ZGlvX21lc3NhZ2VfaWQgPSAnJztcbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQuZGF0YS5hY3Rpb24gPT09ICdwbGF5bWVzc2FnZScpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmV4dGVuc2lvbiA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSdW4gY3VzdG9tIHZhbGlkYXRpb24gZm9yIHBhaXJlZCBmaWVsZHNcbiAgICAgICAgcmV0dXJuIG91dE9mV29ya1RpbWVSZWNvcmQuY3VzdG9tVmFsaWRhdGVGb3JtKHJlc3VsdCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgaWYgdGhpcyB3YXMgYSBuZXcgcmVjb3JkXG4gICAgICAgICAgICBpZiAoIW91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdVcmwgPSBgJHtnbG9iYWxSb290VXJsfW9mZi13b3JrLXRpbWVzL21vZGlmeS8ke3Jlc3BvbnNlLmRhdGEuaWR9YDtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUobnVsbCwgJycsIG5ld1VybCk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmRJZCA9IHJlc3BvbnNlLmRhdGEuaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbG9hZCBkYXRhIHRvIGVuc3VyZSBjb25zaXN0ZW5jeVxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5sb2FkRm9ybURhdGEoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1vZmYtd29yay10aW1lcy9zYXZlYDtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBvdXRPZldvcmtUaW1lUmVjb3JkLmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IE9mZldvcmtUaW1lc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkcyB1c2luZyBPZmZXb3JrVGltZXNUb29sdGlwTWFuYWdlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG9vbHRpcCBpbml0aWFsaXphdGlvbiB0byBPZmZXb3JrVGltZXNUb29sdGlwTWFuYWdlclxuICAgICAgICBPZmZXb3JrVGltZXNUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIHRoYXQgY2hlY2tzIGlmIGEgdmFsdWUgaXMgbm90IGVtcHR5IGJhc2VkIG9uIGEgc3BlY2lmaWMgYWN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gYmUgdmFsaWRhdGVkXG4gKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiB0byBjb21wYXJlIGFnYWluc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIHRydWUgaWYgdmFsaWQsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGUgPSBmdW5jdGlvbih2YWx1ZSwgYWN0aW9uKSB7XG4gICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCAmJiBvdXRPZldvcmtUaW1lUmVjb3JkLiRhY3Rpb25GaWVsZC52YWwoKSA9PT0gYWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNhbGVuZGFyIFVSTCBmaWVsZFxuICogVmFsaWRhdGVzIFVSTCBvbmx5IHdoZW4gY2FsZW5kYXIgdHlwZSBpcyBub3QgJ25vbmUnIG9yICd0aW1lJ1xuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGNvbnN0IGNhbFR5cGUgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRmllbGQudmFsKCk7XG4gICAgXG4gICAgLy8gSWYgY2FsZW5kYXIgdHlwZSBpcyB0aW1lZnJhbWUgb3IgdGltZSwgVVJMIGlzIG5vdCByZXF1aXJlZFxuICAgIGlmICghY2FsVHlwZSB8fCBjYWxUeXBlID09PSAndGltZWZyYW1lJyB8fCBjYWxUeXBlID09PSAndGltZScpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIFxuICAgIC8vIElmIGNhbGVuZGFyIHR5cGUgaXMgQ0FMREFWIG9yIElDQUwsIHZhbGlkYXRlIFVSTFxuICAgIGlmICghdmFsdWUgfHwgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgaWYgaXQncyBhIHZhbGlkIFVSTFxuICAgIHRyeSB7XG4gICAgICAgIG5ldyBVUkwodmFsdWUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gRE9NIGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplKCk7XG59KTsiXX0=