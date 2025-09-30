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
   IncomingRoutesAPI OffWorkTimesAPI DynamicDropdownBuilder ExtensionSelector */

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
   * @type {jQuery}
   */
  $formObj: $('#save-outoffwork-form'),

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
  $time_from: $('#time_from'),
  $time_to: $('#time_to'),
  $rulesTable: $('#routing-table'),
  // Hidden input fields
  $idField: $('#id'),
  $weekdayFromField: $('#weekday_from'),
  $weekdayToField: $('#weekday_to'),
  $actionField: $('#action'),
  $calTypeField: $('#calType'),
  $extensionField: $('#extension'),
  $allowRestrictionField: $('#allowRestriction'),
  $descriptionField: $('#description'),
  // Dropdown elements
  $actionDropdown: $('#action-dropdown'),
  $calTypeDropdown: $('.calType-select'),
  $weekdayFromDropdown: $('.weekday-from-select'),
  $weekdayToDropdown: $('.weekday-to-select'),
  // Tab elements
  $tabMenu: $('#out-time-modify-menu .item'),
  $rulesTab: null,
  // Will be initialized later
  $generalTab: null,
  // Will be initialized later
  $rulesTabSegment: null,
  // Will be initialized later
  $generalTabSegment: null,
  // Will be initialized later
  // Row elements
  $extensionRow: $('#extension-row'),
  $audioMessageRow: $('#audio-message-row'),
  // Calendar tab elements
  $calendarTab: $('#call-type-calendar-tab'),
  $mainTab: $('#call-type-main-tab'),
  // Date/time calendar elements
  $rangeDaysStart: $('#range-days-start'),
  $rangeDaysEnd: $('#range-days-end'),
  $rangeTimeStart: $('#range-time-start'),
  $rangeTimeEnd: $('#range-time-end'),
  // Erase buttons
  $eraseDatesBtn: $('#erase-dates'),
  $eraseWeekdaysBtn: $('#erase-weekdays'),
  $eraseTimeperiodBtn: $('#erase-timeperiod'),
  // Error message element
  $errorMessage: $('.form .error.message'),
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
    // Set record ID from DOM
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
          outOfWorkTimeRecord.$calTypeDropdown.dropdown('set selected', data.calType);
        } // Set weekday dropdowns


        if (data.weekday_from) {
          outOfWorkTimeRecord.$weekdayFromDropdown.dropdown('set selected', data.weekday_from);
        }

        if (data.weekday_to) {
          outOfWorkTimeRecord.$weekdayToDropdown.dropdown('set selected', data.weekday_to);
        } // Set dates if present


        if (data.date_from) {
          outOfWorkTimeRecord.setDateFromTimestamp(data.date_from, '#range-days-start');
        }

        if (data.date_to) {
          outOfWorkTimeRecord.setDateFromTimestamp(data.date_to, '#range-days-end');
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
    } else if (calType === 'CALDAV' || calType === 'ICAL') {
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
    // Use class variables for time calendars

    outOfWorkTimeRecord.$rangeTimeStart.calendar({
      firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
      text: SemanticLocalization.calendarText,
      endCalendar: outOfWorkTimeRecord.$rangeTimeEnd,
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
      startCalendar: outOfWorkTimeRecord.$rangeTimeStart,
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
    return "\n            <tr class=\"rule-row ".concat(ruleClass, "\" id=\"").concat(route.id, "\" \n                data-provider=\"").concat(safeProviderId, "\" \n                data-did=\"").concat(safeDid, "\">\n                <td class=\"collapsing\">\n                    <div class=\"ui fitted toggle checkbox\" \n                         data-did=\"").concat(safeDid, "\" \n                         data-provider=\"{").concat(safeProviderId, "}\">\n                        <input type=\"checkbox\" ").concat(isChecked ? 'checked' : '', " \n                               name=\"route-").concat(route.id, "\" data-value=\"").concat(route.id, "\">\n                        <label></label>\n                    </div>\n                </td>\n                <td class=\"").concat(providerDisabled, "\">\n                    ").concat(ruleDescription || '<span class="text-muted">No description</span>', "\n                </td>\n                <td class=\"hide-on-mobile\">\n                    ").concat(noteDisplay, "\n                </td>\n            </tr>\n        ");
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
   * Helper to set date from timestamp or date string
   * @param {string|number} dateValue - Unix timestamp or date string (YYYY-MM-DD)
   * @param {string} selector - jQuery selector
   */
  setDateFromTimestamp: function setDateFromTimestamp(dateValue, selector) {
    if (!dateValue) return; // Check if it's a date string in YYYY-MM-DD format first

    if (typeof dateValue === 'string') {
      // Check for date format YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        var date = new Date(dateValue);

        if (!isNaN(date.getTime())) {
          $(selector).calendar('set date', date);
          return;
        }
      } // Try to parse as Unix timestamp (all digits)


      if (/^\d+$/.test(dateValue)) {
        var timestamp = parseInt(dateValue);

        if (timestamp > 0) {
          // Convert Unix timestamp to Date
          $(selector).calendar('set date', new Date(timestamp * 1000));
          return;
        }
      }
    } else if (typeof dateValue === 'number' && dateValue > 0) {
      // Numeric Unix timestamp
      $(selector).calendar('set date', new Date(dateValue * 1000));
    }
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
    } // Handle calType conversion (matches old controller: ($data[$name] === 'timeframe') ? '' : $data[$name])
    // For saving we convert 'timeframe' to empty string


    if (result.data.calType === 'timeframe') {
      result.data.calType = '';
    } // Handle weekday values (matches old controller: ($data[$name] < 1) ? null : $data[$name])


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
    } // Convert dates to timestamps


    var dateFrom = outOfWorkTimeRecord.$rangeDaysStart.calendar('get date');

    if (dateFrom) {
      dateFrom.setHours(0, 0, 0, 0);
      result.data.date_from = Math.floor(dateFrom.getTime() / 1000).toString();
    }

    var dateTo = outOfWorkTimeRecord.$rangeDaysEnd.calendar('get date');

    if (dateTo) {
      dateTo.setHours(23, 59, 59, 0);
      result.data.date_to = Math.floor(dateTo.getTime() / 1000).toString();
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
   * Initialize tooltips for form fields using TooltipBuilder
   */
  initializeTooltips: function initializeTooltips() {
    // Configuration for each field tooltip
    var tooltipConfigs = {
      calUrl: {
        header: globalTranslate.tf_CalUrlTooltip_header,
        description: globalTranslate.tf_CalUrlTooltip_desc,
        list: [{
          term: globalTranslate.tf_CalUrlTooltip_caldav_header,
          definition: null
        }, globalTranslate.tf_CalUrlTooltip_caldav_google, globalTranslate.tf_CalUrlTooltip_caldav_nextcloud, globalTranslate.tf_CalUrlTooltip_caldav_yandex],
        list2: [{
          term: globalTranslate.tf_CalUrlTooltip_icalendar_header,
          definition: null
        }, globalTranslate.tf_CalUrlTooltip_icalendar_desc],
        examples: [globalTranslate.tf_CalUrlTooltip_example_google, globalTranslate.tf_CalUrlTooltip_example_nextcloud, globalTranslate.tf_CalUrlTooltip_example_ics],
        examplesHeader: globalTranslate.tf_CalUrlTooltip_examples_header,
        note: globalTranslate.tf_CalUrlTooltip_note
      }
    }; // Use TooltipBuilder to initialize tooltips

    TooltipBuilder.initialize(tooltipConfigs);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PZmZXb3JrVGltZXMvb2ZmLXdvcmstdGltZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm91dE9mV29ya1RpbWVSZWNvcmQiLCIkZm9ybU9iaiIsIiQiLCJyZWNvcmRJZCIsInJlY29yZERhdGEiLCIkdGltZV9mcm9tIiwiJHRpbWVfdG8iLCIkcnVsZXNUYWJsZSIsIiRpZEZpZWxkIiwiJHdlZWtkYXlGcm9tRmllbGQiLCIkd2Vla2RheVRvRmllbGQiLCIkYWN0aW9uRmllbGQiLCIkY2FsVHlwZUZpZWxkIiwiJGV4dGVuc2lvbkZpZWxkIiwiJGFsbG93UmVzdHJpY3Rpb25GaWVsZCIsIiRkZXNjcmlwdGlvbkZpZWxkIiwiJGFjdGlvbkRyb3Bkb3duIiwiJGNhbFR5cGVEcm9wZG93biIsIiR3ZWVrZGF5RnJvbURyb3Bkb3duIiwiJHdlZWtkYXlUb0Ryb3Bkb3duIiwiJHRhYk1lbnUiLCIkcnVsZXNUYWIiLCIkZ2VuZXJhbFRhYiIsIiRydWxlc1RhYlNlZ21lbnQiLCIkZ2VuZXJhbFRhYlNlZ21lbnQiLCIkZXh0ZW5zaW9uUm93IiwiJGF1ZGlvTWVzc2FnZVJvdyIsIiRjYWxlbmRhclRhYiIsIiRtYWluVGFiIiwiJHJhbmdlRGF5c1N0YXJ0IiwiJHJhbmdlRGF5c0VuZCIsIiRyYW5nZVRpbWVTdGFydCIsIiRyYW5nZVRpbWVFbmQiLCIkZXJhc2VEYXRlc0J0biIsIiRlcmFzZVdlZWtkYXlzQnRuIiwiJGVyYXNlVGltZXBlcmlvZEJ0biIsIiRlcnJvck1lc3NhZ2UiLCJhdWRpb01lc3NhZ2VJZCIsImFkZGl0aW9uYWxUaW1lSW50ZXJ2YWxSdWxlcyIsInR5cGUiLCJ2YWx1ZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZXh0ZW5zaW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidGZfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSIsImF1ZGlvX21lc3NhZ2VfaWQiLCJ0Zl9WYWxpZGF0ZUF1ZGlvTWVzc2FnZUVtcHR5IiwiY2FsVXJsIiwidGZfVmFsaWRhdGVDYWxVcmkiLCJ0aW1lZnJvbSIsIm9wdGlvbmFsIiwidGltZXRvIiwiaW5pdGlhbGl6ZSIsInZhbCIsInRhYiIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZUNhbGVuZGFycyIsImluaXRpYWxpemVSb3V0aW5nVGFibGUiLCJpbml0aWFsaXplRXJhc2VycyIsImluaXRpYWxpemVEZXNjcmlwdGlvbkZpZWxkIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwibG9hZEZvcm1EYXRhIiwiYWRkQ2xhc3MiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlYXJjaCIsImNvcHlJZCIsImdldCIsIk9mZldvcmtUaW1lc0FQSSIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwicG9wdWxhdGVGb3JtIiwibG9hZFJvdXRpbmdUYWJsZSIsInNldFRpbWVvdXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJtZXNzYWdlcyIsImVycm9yIiwiZXJyb3JNZXNzYWdlIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJyZWNvcmRJZFRvTG9hZCIsImdldFJlY29yZCIsInNhdmVJbml0aWFsVmFsdWVzIiwiY2hlY2tWYWx1ZXMiLCJpbml0aWFsaXplRHJvcGRvd25zIiwid2Vla0RheXMiLCJ0ZXh0IiwiaSIsImRhdGUiLCJEYXRlIiwiZGF5TmFtZSIsInRvTG9jYWxlRGF0ZVN0cmluZyIsIndlZWtkYXkiLCJ0cmFuc2xhdGVkRGF5IiwicHVzaCIsIm5hbWUiLCJ0b1N0cmluZyIsImRyb3Bkb3duIiwidmFsdWVzIiwib25DaGFuZ2UiLCJvbkFjdGlvbkNoYW5nZSIsIm9uQ2FsVHlwZUNoYW5nZSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvciIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiaW5pdCIsImNhdGVnb3J5IiwiaW5jbHVkZUVtcHR5IiwiYXVkaW9fbWVzc2FnZV9pZF9yZXByZXNlbnQiLCJzZXRWYWx1ZSIsImluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvciIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaXNDb3B5IiwiaGFzIiwicHJpb3JpdHkiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsInVuaXFpZCIsImRlc2NyaXB0aW9uIiwiY2FsVHlwZSIsIndlZWtkYXlfZnJvbSIsIndlZWtkYXlfdG8iLCJ0aW1lX2Zyb20iLCJ0aW1lX3RvIiwiY2FsVXNlciIsImNhbFNlY3JldCIsImFjdGlvbiIsImFsbG93UmVzdHJpY3Rpb24iLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCIkY2FsU2VjcmV0RmllbGQiLCJhdHRyIiwidGZfUGFzc3dvcmRNYXNrZWQiLCJ0Zl9FbnRlclBhc3N3b3JkIiwiZGF0ZV9mcm9tIiwic2V0RGF0ZUZyb21UaW1lc3RhbXAiLCJkYXRlX3RvIiwidG9nZ2xlUnVsZXNUYWIiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJmb3JtIiwic2hvdyIsImhpZGUiLCJjbGVhciIsImNhbGVuZGFyIiwiZmlyc3REYXlPZldlZWsiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImNhbGVuZGFyRmlyc3REYXlPZldlZWsiLCJjYWxlbmRhclRleHQiLCJlbmRDYWxlbmRhciIsImlubGluZSIsIm1vbnRoRmlyc3QiLCJyZWdFeHAiLCJzdGFydENhbGVuZGFyIiwiZGlzYWJsZU1pbnV0ZSIsImFtcG0iLCJwYXJlbnQiLCJjaGVja2JveCIsImlzQ2hlY2tlZCIsImZpbmQiLCJoYXNDbGFzcyIsImVtcHR5IiwiYXNzb2NpYXRlZElkcyIsImluY29taW5nUm91dGVJZHMiLCJJbmNvbWluZ1JvdXRlc0FQSSIsImdldExpc3QiLCJncm91cGVkUm91dGVzIiwiZ3JvdXBBbmRTb3J0Um91dGVzIiwicmVuZGVyR3JvdXBlZFJvdXRlcyIsImluaXRpYWxpemVSb3V0aW5nQ2hlY2tib3hlcyIsInBvcHVwIiwic2hvd0VtcHR5Um91dGVzTWVzc2FnZSIsInJvdXRlcyIsImdyb3VwcyIsImZvckVhY2giLCJyb3V0ZSIsInByb3ZpZGVySWQiLCJwcm92aWRlciIsInByb3ZpZGVyTmFtZSIsInByb3ZpZGVyaWRfcmVwcmVzZW50IiwiaXJfTm9Bc3NpZ25lZFByb3ZpZGVyIiwidGVtcERpdiIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImlubmVySFRNTCIsImNsZWFuUHJvdmlkZXJOYW1lIiwidGV4dENvbnRlbnQiLCJpbm5lclRleHQiLCJwcm92aWRlck5hbWVIdG1sIiwicHJvdmlkZXJEaXNhYmxlZCIsImdlbmVyYWxSdWxlcyIsInNwZWNpZmljUnVsZXMiLCJudW1iZXIiLCJPYmplY3QiLCJrZXlzIiwic29ydCIsImEiLCJiIiwiZGlkIiwidGJvZHkiLCJpc0ZpcnN0R3JvdXAiLCJncm91cCIsImFwcGVuZCIsInJvdyIsImNyZWF0ZVJvdXRlUm93IiwiaW5kZXgiLCJpc0ZpcnN0SW5ESUQiLCJydWxlQ2xhc3MiLCJzaG93RElESW5kaWNhdG9yIiwiaW5jbHVkZXMiLCJwYXJzZUludCIsInJ1bGVEZXNjcmlwdGlvbiIsInJ1bGVfcmVwcmVzZW50Iiwibm90ZURpc3BsYXkiLCJub3RlIiwibGVuZ3RoIiwic2FmZVByb3ZpZGVySWQiLCJzYWZlRGlkIiwiZW1wdHlSb3ciLCJpcl9Ob0luY29taW5nUm91dGVzIiwiaG92ZXIiLCIkcm93Iiwic2VsZWN0b3IiLCIkcmVsYXRlZFJvd3MiLCJlYWNoIiwiJGNoZWNrYm94IiwidG9vbHRpcFRleHQiLCJ0Zl9Ub29sdGlwU3BlY2lmaWNSdWxlIiwidGZfVG9vbHRpcEdlbmVyYWxSdWxlIiwic2VsZWN0b3JXaXRoRElEIiwibm90Iiwic2VsZWN0b3JHZW5lcmFsIiwib24iLCJzdHlsZSIsImhlaWdodCIsInNjcm9sbEhlaWdodCIsInRyaWdnZXIiLCJkYXRlVmFsdWUiLCJ0ZXN0IiwiaXNOYU4iLCJnZXRUaW1lIiwidGltZXN0YW1wIiwiY3VzdG9tVmFsaWRhdGVGb3JtIiwiaHRtbCIsInRmX1ZhbGlkYXRlQ2hlY2tEYXRlSW50ZXJ2YWwiLCIkc3VibWl0QnV0dG9uIiwidHJhbnNpdGlvbiIsInRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwiLCJoYXNEYXRlUmFuZ2UiLCJoYXNXZWVrZGF5UmFuZ2UiLCJoYXNUaW1lUmFuZ2UiLCJ0Zl9WYWxpZGF0ZU5vUnVsZXNTZWxlY3RlZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImtleSIsInN0YXJ0c1dpdGgiLCJkYXRlRnJvbSIsInNldEhvdXJzIiwiTWF0aCIsImZsb29yIiwiZGF0ZVRvIiwic2VsZWN0ZWRSb3V0ZXMiLCJyb3V0ZUlkIiwiY2JBZnRlclNlbmRGb3JtIiwibmV3VXJsIiwiZ2xvYmFsUm9vdFVybCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwidG9vbHRpcENvbmZpZ3MiLCJoZWFkZXIiLCJ0Zl9DYWxVcmxUb29sdGlwX2hlYWRlciIsInRmX0NhbFVybFRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwidGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfaGVhZGVyIiwiZGVmaW5pdGlvbiIsInRmX0NhbFVybFRvb2x0aXBfY2FsZGF2X2dvb2dsZSIsInRmX0NhbFVybFRvb2x0aXBfY2FsZGF2X25leHRjbG91ZCIsInRmX0NhbFVybFRvb2x0aXBfY2FsZGF2X3lhbmRleCIsImxpc3QyIiwidGZfQ2FsVXJsVG9vbHRpcF9pY2FsZW5kYXJfaGVhZGVyIiwidGZfQ2FsVXJsVG9vbHRpcF9pY2FsZW5kYXJfZGVzYyIsImV4YW1wbGVzIiwidGZfQ2FsVXJsVG9vbHRpcF9leGFtcGxlX2dvb2dsZSIsInRmX0NhbFVybFRvb2x0aXBfZXhhbXBsZV9uZXh0Y2xvdWQiLCJ0Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVfaWNzIiwiZXhhbXBsZXNIZWFkZXIiLCJ0Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsInRmX0NhbFVybFRvb2x0aXBfbm90ZSIsIlRvb2x0aXBCdWlsZGVyIiwiZm4iLCJjdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZSIsImN1c3RvbU5vdEVtcHR5SWZDYWxUeXBlIiwiVVJMIiwiXyIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxtQkFBbUIsR0FBRztBQUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx1QkFBRCxDQUxhOztBQU94QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFYYztBQVdSOztBQUVoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUFqQlk7QUFtQnhCO0FBQ0FDLEVBQUFBLFVBQVUsRUFBRUgsQ0FBQyxDQUFDLFlBQUQsQ0FwQlc7QUFxQnhCSSxFQUFBQSxRQUFRLEVBQUVKLENBQUMsQ0FBQyxVQUFELENBckJhO0FBc0J4QkssRUFBQUEsV0FBVyxFQUFFTCxDQUFDLENBQUMsZ0JBQUQsQ0F0QlU7QUF3QnhCO0FBQ0FNLEVBQUFBLFFBQVEsRUFBRU4sQ0FBQyxDQUFDLEtBQUQsQ0F6QmE7QUEwQnhCTyxFQUFBQSxpQkFBaUIsRUFBRVAsQ0FBQyxDQUFDLGVBQUQsQ0ExQkk7QUEyQnhCUSxFQUFBQSxlQUFlLEVBQUVSLENBQUMsQ0FBQyxhQUFELENBM0JNO0FBNEJ4QlMsRUFBQUEsWUFBWSxFQUFFVCxDQUFDLENBQUMsU0FBRCxDQTVCUztBQTZCeEJVLEVBQUFBLGFBQWEsRUFBRVYsQ0FBQyxDQUFDLFVBQUQsQ0E3QlE7QUE4QnhC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QW5CLENBQXlCc1EsdUJBQXpCLEdBQW1ELFVBQVM3USxLQUFULEVBQWdCO0FBQy9ELE1BQU0yRixPQUFPLEdBQUduSSxtQkFBbUIsQ0FBQ1ksYUFBcEIsQ0FBa0M2QyxHQUFsQyxFQUFoQixDQUQrRCxDQUcvRDs7QUFDQSxNQUFJLENBQUMwRSxPQUFELElBQVlBLE9BQU8sS0FBSyxXQUF4QixJQUF1Q0EsT0FBTyxLQUFLLE1BQXZELEVBQStEO0FBQzNELFdBQU8sSUFBUDtBQUNILEdBTjhELENBUS9EOzs7QUFDQSxNQUFJLENBQUMzRixLQUFELElBQVVBLEtBQUssQ0FBQzJMLE1BQU4sS0FBaUIsQ0FBL0IsRUFBa0M7QUFDOUIsV0FBTyxLQUFQO0FBQ0gsR0FYOEQsQ0FhL0Q7OztBQUNBLE1BQUk7QUFDQSxRQUFJbUYsR0FBSixDQUFROVEsS0FBUjtBQUNBLFdBQU8sSUFBUDtBQUNILEdBSEQsQ0FHRSxPQUFPK1EsQ0FBUCxFQUFVO0FBQ1IsV0FBTyxLQUFQO0FBQ0g7QUFDSixDQXBCRCxDLENBc0JBOzs7QUFDQXJULENBQUMsQ0FBQ2dNLFFBQUQsQ0FBRCxDQUFZc0gsS0FBWixDQUFrQixZQUFNO0FBQ3BCeFQsRUFBQUEsbUJBQW1CLENBQUN3RCxVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCBnbG9iYWxSb290VXJsIEV4dGVuc2lvbnMgbW9tZW50IEZvcm0gZ2xvYmFsVHJhbnNsYXRlIFxuICAgU2VtYW50aWNMb2NhbGl6YXRpb24gU291bmRGaWxlU2VsZWN0b3IgVXNlck1lc3NhZ2UgU2VjdXJpdHlVdGlsc1xuICAgSW5jb21pbmdSb3V0ZXNBUEkgT2ZmV29ya1RpbWVzQVBJIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgRXh0ZW5zaW9uU2VsZWN0b3IgKi9cblxuLyoqXG4gKiBNb2R1bGUgZm9yIG1hbmFnaW5nIG91dC1vZi13b3JrIHRpbWUgc2V0dGluZ3NcbiAqIFxuICogVGhpcyBtb2R1bGUgaGFuZGxlcyB0aGUgZm9ybSBmb3IgY3JlYXRpbmcgYW5kIGVkaXRpbmcgb3V0LW9mLXdvcmsgdGltZSBjb25kaXRpb25zLlxuICogSXQgdXNlcyBhIHVuaWZpZWQgUkVTVCBBUEkgYXBwcm9hY2ggbWF0Y2hpbmcgdGhlIGluY29taW5nIHJvdXRlcyBwYXR0ZXJuLlxuICogXG4gKiBAbW9kdWxlIG91dE9mV29ya1RpbWVSZWNvcmRcbiAqL1xuY29uc3Qgb3V0T2ZXb3JrVGltZVJlY29yZCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIFJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcmVjb3JkSWQ6IG51bGwsIC8vIFdpbGwgYmUgc2V0IGluIGluaXRpYWxpemUoKVxuICAgIFxuICAgIC8qKlxuICAgICAqIFN0b3JlIGxvYWRlZCByZWNvcmQgZGF0YVxuICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgKi9cbiAgICByZWNvcmREYXRhOiBudWxsLFxuXG4gICAgLy8gRm9ybSBmaWVsZCBqUXVlcnkgb2JqZWN0c1xuICAgICR0aW1lX2Zyb206ICQoJyN0aW1lX2Zyb20nKSxcbiAgICAkdGltZV90bzogJCgnI3RpbWVfdG8nKSxcbiAgICAkcnVsZXNUYWJsZTogJCgnI3JvdXRpbmctdGFibGUnKSxcbiAgICBcbiAgICAvLyBIaWRkZW4gaW5wdXQgZmllbGRzXG4gICAgJGlkRmllbGQ6ICQoJyNpZCcpLFxuICAgICR3ZWVrZGF5RnJvbUZpZWxkOiAkKCcjd2Vla2RheV9mcm9tJyksXG4gICAgJHdlZWtkYXlUb0ZpZWxkOiAkKCcjd2Vla2RheV90bycpLFxuICAgICRhY3Rpb25GaWVsZDogJCgnI2FjdGlvbicpLFxuICAgICRjYWxUeXBlRmllbGQ6ICQoJyNjYWxUeXBlJyksXG4gICAgJGV4dGVuc2lvbkZpZWxkOiAkKCcjZXh0ZW5zaW9uJyksXG4gICAgJGFsbG93UmVzdHJpY3Rpb25GaWVsZDogJCgnI2FsbG93UmVzdHJpY3Rpb24nKSxcbiAgICAkZGVzY3JpcHRpb25GaWVsZDogJCgnI2Rlc2NyaXB0aW9uJyksXG4gICAgXG4gICAgLy8gRHJvcGRvd24gZWxlbWVudHNcbiAgICAkYWN0aW9uRHJvcGRvd246ICQoJyNhY3Rpb24tZHJvcGRvd24nKSxcbiAgICAkY2FsVHlwZURyb3Bkb3duOiAkKCcuY2FsVHlwZS1zZWxlY3QnKSxcbiAgICAkd2Vla2RheUZyb21Ecm9wZG93bjogJCgnLndlZWtkYXktZnJvbS1zZWxlY3QnKSxcbiAgICAkd2Vla2RheVRvRHJvcGRvd246ICQoJy53ZWVrZGF5LXRvLXNlbGVjdCcpLFxuICAgIFxuICAgIC8vIFRhYiBlbGVtZW50c1xuICAgICR0YWJNZW51OiAkKCcjb3V0LXRpbWUtbW9kaWZ5LW1lbnUgLml0ZW0nKSxcbiAgICAkcnVsZXNUYWI6IG51bGwsIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgbGF0ZXJcbiAgICAkZ2VuZXJhbFRhYjogbnVsbCwgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBsYXRlclxuICAgICRydWxlc1RhYlNlZ21lbnQ6IG51bGwsIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgbGF0ZXJcbiAgICAkZ2VuZXJhbFRhYlNlZ21lbnQ6IG51bGwsIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgbGF0ZXJcbiAgICBcbiAgICAvLyBSb3cgZWxlbWVudHNcbiAgICAkZXh0ZW5zaW9uUm93OiAkKCcjZXh0ZW5zaW9uLXJvdycpLFxuICAgICRhdWRpb01lc3NhZ2VSb3c6ICQoJyNhdWRpby1tZXNzYWdlLXJvdycpLFxuICAgIFxuICAgIC8vIENhbGVuZGFyIHRhYiBlbGVtZW50c1xuICAgICRjYWxlbmRhclRhYjogJCgnI2NhbGwtdHlwZS1jYWxlbmRhci10YWInKSxcbiAgICAkbWFpblRhYjogJCgnI2NhbGwtdHlwZS1tYWluLXRhYicpLFxuICAgIFxuICAgIC8vIERhdGUvdGltZSBjYWxlbmRhciBlbGVtZW50c1xuICAgICRyYW5nZURheXNTdGFydDogJCgnI3JhbmdlLWRheXMtc3RhcnQnKSxcbiAgICAkcmFuZ2VEYXlzRW5kOiAkKCcjcmFuZ2UtZGF5cy1lbmQnKSxcbiAgICAkcmFuZ2VUaW1lU3RhcnQ6ICQoJyNyYW5nZS10aW1lLXN0YXJ0JyksXG4gICAgJHJhbmdlVGltZUVuZDogJCgnI3JhbmdlLXRpbWUtZW5kJyksXG4gICAgXG4gICAgLy8gRXJhc2UgYnV0dG9uc1xuICAgICRlcmFzZURhdGVzQnRuOiAkKCcjZXJhc2UtZGF0ZXMnKSxcbiAgICAkZXJhc2VXZWVrZGF5c0J0bjogJCgnI2VyYXNlLXdlZWtkYXlzJyksXG4gICAgJGVyYXNlVGltZXBlcmlvZEJ0bjogJCgnI2VyYXNlLXRpbWVwZXJpb2QnKSxcbiAgICBcbiAgICAvLyBFcnJvciBtZXNzYWdlIGVsZW1lbnRcbiAgICAkZXJyb3JNZXNzYWdlOiAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLFxuICAgIFxuICAgIC8vIEF1ZGlvIG1lc3NhZ2UgSUQgZm9yIHNvdW5kIGZpbGUgc2VsZWN0b3JcbiAgICBhdWRpb01lc3NhZ2VJZDogJ2F1ZGlvX21lc3NhZ2VfaWQnLFxuXG4gICAgLyoqXG4gICAgICogQWRkaXRpb25hbCB0aW1lIGludGVydmFsIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgKiBAdHlwZSB7YXJyYXl9XG4gICAgICovXG4gICAgYWRkaXRpb25hbFRpbWVJbnRlcnZhbFJ1bGVzOiBbe1xuICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgdmFsdWU6IC9eKFswMV0/WzAtOV18MlswLTNdKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwsXG4gICAgfV0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm1cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbZXh0ZW5zaW9uXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhdWRpb19tZXNzYWdlX2lkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbcGxheW1lc3NhZ2VdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgY2FsVXJsOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY2FsVXJsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNhbFVyaVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgdGltZWZyb206IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVfZnJvbScsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogL14oWzAxXT9bMC05XXwyWzAtM10pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAgdGltZXRvOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndGltZV90bycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAvXihbMDFdP1swLTldfDJbMC0zXSk6KFswLTVdP1swLTldKSQvLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwsXG4gICAgICAgICAgICB9XVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFNldCByZWNvcmQgSUQgZnJvbSBET01cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmRJZCA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGlkRmllbGQudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYiByZWZlcmVuY2VzIHRoYXQgZGVwZW5kIG9uIERPTVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYiA9ICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbVtkYXRhLXRhYj1cInJ1bGVzXCJdJyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGdlbmVyYWxUYWIgPSAkKCcjb3V0LXRpbWUtbW9kaWZ5LW1lbnUgLml0ZW1bZGF0YS10YWI9XCJnZW5lcmFsXCJdJyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiU2VnbWVudCA9ICQoJy51aS50YWIuc2VnbWVudFtkYXRhLXRhYj1cInJ1bGVzXCJdJyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGdlbmVyYWxUYWJTZWdtZW50ID0gJCgnLnVpLnRhYi5zZWdtZW50W2RhdGEtdGFiPVwiZ2VuZXJhbFwiXScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHRhYk1lbnUudGFiKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gc3VibWlzc2lvbiBoYW5kbGluZ1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNvbXBvbmVudHMgdGhhdCBkb24ndCBkZXBlbmQgb24gZGF0YVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVDYWxlbmRhcnMoKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplUm91dGluZ1RhYmxlKCk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUVyYXNlcnMoKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRGVzY3JpcHRpb25GaWVsZCgpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBkYXRhIGFuZCBpbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICAvLyBUaGlzIHVuaWZpZWQgYXBwcm9hY2ggbG9hZHMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzIG9yIGV4aXN0aW5nIGRhdGFcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5sb2FkRm9ybURhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAqIFVuaWZpZWQgYXBwcm9hY2ggZm9yIGJvdGggbmV3IGFuZCBleGlzdGluZyByZWNvcmRzXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5SWQgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG5cbiAgICAgICAgaWYgKGNvcHlJZCkge1xuICAgICAgICAgICAgLy8gQ29weSBvcGVyYXRpb24gLSB1c2UgdGhlIG5ldyBSRVNUZnVsIGNvcHkgZW5kcG9pbnRcbiAgICAgICAgICAgIE9mZldvcmtUaW1lc0FQSS5jYWxsQ3VzdG9tTWV0aG9kKCdjb3B5Jywge2lkOiBjb3B5SWR9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdWNjZXNzOiBwb3B1bGF0ZSBmb3JtIHdpdGggY29waWVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmREYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCByb3V0aW5nIHJ1bGVzXG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZFJvdXRpbmdUYWJsZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbW9kaWZpZWQgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9LCAyNTApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFQSSBlcnJvciAtIHNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOb3JtYWwgbG9hZCAtIGVpdGhlciBleGlzdGluZyByZWNvcmQgb3IgbmV3XG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZFRvTG9hZCA9IG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQgfHwgJyc7XG5cbiAgICAgICAgICAgIC8vIExvYWQgcmVjb3JkIGRhdGEgdmlhIFJFU1QgQVBJIC0gYWx3YXlzIHJldHVybnMgZGF0YSAod2l0aCBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMpXG4gICAgICAgICAgICBPZmZXb3JrVGltZXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkVG9Mb2FkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdWNjZXNzOiBwb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSAoZGVmYXVsdHMgZm9yIG5ldywgcmVhbCBkYXRhIGZvciBleGlzdGluZylcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmREYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCByb3V0aW5nIHJ1bGVzXG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZFJvdXRpbmdUYWJsZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNhdmUgaW5pdGlhbCB2YWx1ZXMgdG8gcHJldmVudCBzYXZlIGJ1dHRvbiBhY3RpdmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9LCAyNTApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFQSSBlcnJvciAtIHNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIGRyb3Bkb3ducyBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHdlZWtkYXkgZHJvcGRvd25zIHdpdGggdmFsdWVzIG1hdGNoaW5nIG9yaWdpbmFsIGltcGxlbWVudGF0aW9uXG4gICAgICAgIGNvbnN0IHdlZWtEYXlzID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJy0xJywgdGV4dDogJy0nIH0gLy8gRGVmYXVsdCBlbXB0eSBvcHRpb25cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkYXlzIDEtNyB1c2luZyB0aGUgc2FtZSBsb2dpYyBhcyBvcmlnaW5hbCBjb250cm9sbGVyXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IDc7IGkrKykge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGRhdGUgZm9yIFwiU3VuZGF5ICtpIGRheXNcIiB0byBtYXRjaCBvcmlnaW5hbCBsb2dpY1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKDIwMjAsIDAsIDUgKyBpKTsgLy8gSmFuIDUsIDIwMjAgd2FzIFN1bmRheVxuICAgICAgICAgICAgY29uc3QgZGF5TmFtZSA9IGRhdGUudG9Mb2NhbGVEYXRlU3RyaW5nKCdlbicsIHsgd2Vla2RheTogJ3Nob3J0JyB9KTtcbiAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgdHJhbnNsYXRpb24gZm9yIHRoZSBkYXkgYWJicmV2aWF0aW9uXG4gICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVkRGF5ID0gZ2xvYmFsVHJhbnNsYXRlW2RheU5hbWVdIHx8IGRheU5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHdlZWtEYXlzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6IHRyYW5zbGF0ZWREYXksXG4gICAgICAgICAgICAgICAgdmFsdWU6IGkudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICB0ZXh0OiB0cmFuc2xhdGVkRGF5XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheUZyb21Ecm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICB2YWx1ZXM6IHdlZWtEYXlzLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlGcm9tRmllbGQudmFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheVRvRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgdmFsdWVzOiB3ZWVrRGF5cyxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9GaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGFjdGlvbiBkcm9wZG93blxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhY3Rpb25Ecm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhY3Rpb25GaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQub25BY3Rpb25DaGFuZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNhbGVuZGFyIHR5cGUgZHJvcGRvd25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsVHlwZURyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbFR5cGVGaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQub25DYWxUeXBlQ2hhbmdlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRXh0ZW5zaW9uIHNlbGVjdG9yIHdpbGwgYmUgaW5pdGlhbGl6ZWQgaW4gcG9wdWxhdGVGb3JtIHdpdGggQVBJIGRhdGFcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIEFQSSBkYXRhXG4gICAgICogU2luZ2xlIHBvaW50IG9mIGluaXRpYWxpemF0aW9uIGFmdGVyIHJlY2VpdmluZyBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBBUEkgcmVzcG9uc2UgZGF0YSAod2l0aCBkZWZhdWx0cyBvciBleGlzdGluZyB2YWx1ZXMpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9yKGRhdGEpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTb3VuZEZpbGVTZWxlY3RvciB3aXRoIGNvbXBsZXRlIEFQSSBkYXRhIGNvbnRleHRcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdChvdXRPZldvcmtUaW1lUmVjb3JkLmF1ZGlvTWVzc2FnZUlkLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLCAgLy8gT3V0IG9mIHdvcmsgdGltZSBtdXN0IGFsd2F5cyBoYXZlIGEgc291bmQgZmlsZVxuICAgICAgICAgICAgZGF0YTogZGF0YSAvLyBQYXNzIGNvbXBsZXRlIEFQSSBkYXRhIGZvciBwcm9wZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBhdWRpb19tZXNzYWdlX2lkIGV4aXN0cywgc2V0IHRoZSB2YWx1ZSB3aXRoIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIGlmIChkYXRhLmF1ZGlvX21lc3NhZ2VfaWQgJiYgZGF0YS5hdWRpb19tZXNzYWdlX2lkX3JlcHJlc2VudCkge1xuICAgICAgICAgICAgU291bmRGaWxlU2VsZWN0b3Iuc2V0VmFsdWUoXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5hdWRpb01lc3NhZ2VJZCwgXG4gICAgICAgICAgICAgICAgZGF0YS5hdWRpb19tZXNzYWdlX2lkLCBcbiAgICAgICAgICAgICAgICBkYXRhLmF1ZGlvX21lc3NhZ2VfaWRfcmVwcmVzZW50XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciB3aXRoIEFQSSBkYXRhXG4gICAgICogU2luZ2xlIHBvaW50IG9mIGluaXRpYWxpemF0aW9uIGFmdGVyIHJlY2VpdmluZyBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBBUEkgcmVzcG9uc2UgZGF0YSAod2l0aCBkZWZhdWx0cyBvciBleGlzdGluZyB2YWx1ZXMpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKGRhdGEpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBFeHRlbnNpb25TZWxlY3RvciBmb2xsb3dpbmcgVjUuMCBwYXR0ZXJuXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2V4dGVuc2lvbicsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUmVjb3JkIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29weSBvcGVyYXRpb25cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgaXNDb3B5ID0gdXJsUGFyYW1zLmhhcygnY29weScpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGNvcHkgb3BlcmF0aW9uLCBjbGVhciBJRCBhbmQgcHJpb3JpdHlcbiAgICAgICAgaWYgKGlzQ29weSkge1xuICAgICAgICAgICAgZGF0YS5pZCA9ICcnO1xuICAgICAgICAgICAgZGF0YS5wcmlvcml0eSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgdW5pcWlkOiBkYXRhLnVuaXFpZCxcbiAgICAgICAgICAgIHByaW9yaXR5OiBkYXRhLnByaW9yaXR5LFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICBjYWxUeXBlOiBkYXRhLmNhbFR5cGUsXG4gICAgICAgICAgICB3ZWVrZGF5X2Zyb206IGRhdGEud2Vla2RheV9mcm9tLFxuICAgICAgICAgICAgd2Vla2RheV90bzogZGF0YS53ZWVrZGF5X3RvLFxuICAgICAgICAgICAgdGltZV9mcm9tOiBkYXRhLnRpbWVfZnJvbSxcbiAgICAgICAgICAgIHRpbWVfdG86IGRhdGEudGltZV90byxcbiAgICAgICAgICAgIGNhbFVybDogZGF0YS5jYWxVcmwsXG4gICAgICAgICAgICBjYWxVc2VyOiBkYXRhLmNhbFVzZXIsXG4gICAgICAgICAgICBjYWxTZWNyZXQ6IGRhdGEuY2FsU2VjcmV0LFxuICAgICAgICAgICAgYWN0aW9uOiBkYXRhLmFjdGlvbixcbiAgICAgICAgICAgIGV4dGVuc2lvbjogZGF0YS5leHRlbnNpb24sXG4gICAgICAgICAgICBhdWRpb19tZXNzYWdlX2lkOiBkYXRhLmF1ZGlvX21lc3NhZ2VfaWQsXG4gICAgICAgICAgICBhbGxvd1Jlc3RyaWN0aW9uOiBkYXRhLmFsbG93UmVzdHJpY3Rpb25cbiAgICAgICAgfSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIGZpZWxkIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgJGNhbFNlY3JldEZpZWxkID0gJCgnI2NhbFNlY3JldCcpO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbFNlY3JldCA9PT0gJ1hYWFhYWCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUGFzc3dvcmQgZXhpc3RzIGJ1dCBpcyBtYXNrZWQsIHNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLnRmX1Bhc3N3b3JkTWFza2VkKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgbWFza2VkIHN0YXRlIHRvIGRldGVjdCBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgICAgICRjYWxTZWNyZXRGaWVsZC5kYXRhKCdvcmlnaW5hbE1hc2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRjYWxTZWNyZXRGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS50Zl9FbnRlclBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmRhdGEoJ29yaWdpbmFsTWFza2VkJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZURyb3Bkb3ducygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIEFQSSBkYXRhIChzaW5nbGUgcG9pbnQgb2YgaW5pdGlhbGl6YXRpb24pXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3Igd2l0aCBBUEkgZGF0YVxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBkcm9wZG93biB2YWx1ZXMgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgICAvLyBTZXQgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLmFjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBjYWxUeXBlIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuY2FsVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuY2FsVHlwZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCB3ZWVrZGF5IGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLndlZWtkYXlfZnJvbSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLndlZWtkYXlfZnJvbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLndlZWtkYXlfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheVRvRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEud2Vla2RheV90byk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBkYXRlcyBpZiBwcmVzZW50XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZGF0ZV9mcm9tKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2V0RGF0ZUZyb21UaW1lc3RhbXAoZGF0YS5kYXRlX2Zyb20sICcjcmFuZ2UtZGF5cy1zdGFydCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5kYXRlX3RvKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2V0RGF0ZUZyb21UaW1lc3RhbXAoZGF0YS5kYXRlX3RvLCAnI3JhbmdlLWRheXMtZW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBmaWVsZCB2aXNpYmlsaXR5IGJhc2VkIG9uIGFjdGlvblxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQub25BY3Rpb25DaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY2FsZW5kYXIgdHlwZSB2aXNpYmlsaXR5XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkNhbFR5cGVDaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgcnVsZXMgdGFiIHZpc2liaWxpdHkgYmFzZWQgb24gYWxsb3dSZXN0cmljdGlvblxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlUnVsZXNUYWIoZGF0YS5hbGxvd1Jlc3RyaWN0aW9uKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nXG4gICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBhY3Rpb24gZHJvcGRvd24gY2hhbmdlXG4gICAgICovXG4gICAgb25BY3Rpb25DaGFuZ2UoKSB7XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FjdGlvbicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ2V4dGVuc2lvbicpIHtcbiAgICAgICAgICAgIC8vIFNob3cgZXh0ZW5zaW9uLCBoaWRlIGF1ZGlvXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25Sb3cuc2hvdygpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYXVkaW9NZXNzYWdlUm93LmhpZGUoKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGF1ZGlvIG1lc3NhZ2VcbiAgICAgICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmNsZWFyKG91dE9mV29ya1RpbWVSZWNvcmQuYXVkaW9NZXNzYWdlSWQpO1xuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gJ3BsYXltZXNzYWdlJykge1xuICAgICAgICAgICAgLy8gU2hvdyBhdWRpbywgaGlkZSBleHRlbnNpb25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGV4dGVuc2lvblJvdy5oaWRlKCk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhdWRpb01lc3NhZ2VSb3cuc2hvdygpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgZXh0ZW5zaW9uIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25GaWVsZC52YWwoJycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY2FsZW5kYXIgdHlwZSBjaGFuZ2VcbiAgICAgKi9cbiAgICBvbkNhbFR5cGVDaGFuZ2UoKSB7XG4gICAgICAgIGNvbnN0IGNhbFR5cGUgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYWxUeXBlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyAndGltZWZyYW1lJyBhbmQgZW1wdHkgc3RyaW5nIG1lYW4gdGltZS1iYXNlZCBjb25kaXRpb25zIChzaG93IG1haW4gdGFiKVxuICAgICAgICBpZiAoIWNhbFR5cGUgfHwgY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScgfHwgY2FsVHlwZSA9PT0gJycpIHtcbiAgICAgICAgICAgIC8vIFNob3cgbWFpbiB0aW1lL2RhdGUgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsZW5kYXJUYWIuaGlkZSgpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kbWFpblRhYi5zaG93KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY2FsVHlwZSA9PT0gJ0NBTERBVicgfHwgY2FsVHlwZSA9PT0gJ0lDQUwnKSB7XG4gICAgICAgICAgICAvLyBTaG93IGNhbGVuZGFyIFVSTCBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxlbmRhclRhYi5zaG93KCk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRtYWluVGFiLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjYWxlbmRhcnMgZm9yIGRhdGUgYW5kIHRpbWUgc2VsZWN0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNhbGVuZGFycygpIHtcbiAgICAgICAgLy8gRGF0ZSByYW5nZSBjYWxlbmRhcnNcbiAgICAgICAgLy8gVXNlIGNsYXNzIHZhcmlhYmxlcyBmb3IgY2FsZW5kYXJzXG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcih7XG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBzdGFydENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydCxcbiAgICAgICAgICAgIHR5cGU6ICdkYXRlJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRpbWUgcmFuZ2UgY2FsZW5kYXJzXG4gICAgICAgIC8vIFVzZSBjbGFzcyB2YXJpYWJsZXMgZm9yIHRpbWUgY2FsZW5kYXJzXG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVTdGFydC5jYWxlbmRhcih7XG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgc3RhcnRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICBhbXBtOiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcm91dGluZyB0YWJsZSBhbmQgYWxsb3dSZXN0cmljdGlvbiBjaGVja2JveFxuICAgICAqL1xuICAgIGluaXRpYWxpemVSb3V0aW5nVGFibGUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgYWxsb3dSZXN0cmljdGlvbiBjaGVja2JveFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhbGxvd1Jlc3RyaWN0aW9uRmllbGQucGFyZW50KCkuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGFsbG93UmVzdHJpY3Rpb25GaWVsZC5wYXJlbnQoKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlUnVsZXNUYWIoaXNDaGVja2VkKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleGlzdGluZyBjaGVja2JveGVzIGluIHRhYmxlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBydWxlcyB0YWIgdmlzaWJpbGl0eVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNDaGVja2VkIC0gV2hldGhlciB0byBzaG93IHJ1bGVzIHRhYlxuICAgICAqL1xuICAgIHRvZ2dsZVJ1bGVzVGFiKGlzQ2hlY2tlZCkge1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIuaGlkZSgpO1xuICAgICAgICAgICAgLy8gU3dpdGNoIHRvIGdlbmVyYWwgdGFiIGlmIHJ1bGVzIHRhYiB3YXMgYWN0aXZlXG4gICAgICAgICAgICBpZiAob3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIuaGFzQ2xhc3MoJ2FjdGl2ZScpKSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiU2VnbWVudC5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYi5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYlNlZ21lbnQuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIHJvdXRpbmcgdGFibGUgd2l0aCBpbmNvbWluZyByb3V0ZXNcbiAgICAgKi9cbiAgICBsb2FkUm91dGluZ1RhYmxlKCkge1xuICAgICAgICAvLyBDbGVhciB0YWJsZVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJ3Rib2R5JykuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBhc3NvY2lhdGVkIElEcyBmcm9tIHJlY29yZCBkYXRhXG4gICAgICAgIGNvbnN0IGFzc29jaWF0ZWRJZHMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZERhdGE/LmluY29taW5nUm91dGVJZHMgfHwgW107XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGFsbCBhdmFpbGFibGUgcm91dGVzIGZyb20gSW5jb21pbmdSb3V0ZXNBUElcbiAgICAgICAgSW5jb21pbmdSb3V0ZXNBUEkuZ2V0TGlzdCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIEdyb3VwIGFuZCBzb3J0IHJvdXRlc1xuICAgICAgICAgICAgICAgIGNvbnN0IGdyb3VwZWRSb3V0ZXMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmdyb3VwQW5kU29ydFJvdXRlcyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgZ3JvdXBlZCByb3V0ZXNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlbmRlckdyb3VwZWRSb3V0ZXMoZ3JvdXBlZFJvdXRlcywgYXNzb2NpYXRlZElkcyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzIHdpdGggZ3JvdXBlZCBjaGVja2JveCBsb2dpY1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZVJvdXRpbmdDaGVja2JveGVzKCk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2hvd0VtcHR5Um91dGVzTWVzc2FnZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdyb3VwIGFuZCBzb3J0IHJvdXRlcyBieSBwcm92aWRlciBhbmQgRElEXG4gICAgICogQHBhcmFtIHtBcnJheX0gcm91dGVzIC0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEdyb3VwZWQgcm91dGVzXG4gICAgICovXG4gICAgZ3JvdXBBbmRTb3J0Um91dGVzKHJvdXRlcykge1xuICAgICAgICBjb25zdCBncm91cHMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgZGVmYXVsdCByb3V0ZSBhbmQgZ3JvdXAgYnkgcHJvdmlkZXJcbiAgICAgICAgcm91dGVzLmZvckVhY2goKHJvdXRlKSA9PiB7XG4gICAgICAgICAgICBpZiAocm91dGUuaWQgPT09IDEgfHwgcm91dGUuaWQgPT09ICcxJykgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBwcm92aWRlcklkID0gcm91dGUucHJvdmlkZXIgfHwgJ25vbmUnO1xuICAgICAgICAgICAgaWYgKCFncm91cHNbcHJvdmlkZXJJZF0pIHtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHBsYWluIHRleHQgcHJvdmlkZXIgbmFtZSBmcm9tIEhUTUwgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgbGV0IHByb3ZpZGVyTmFtZSA9IHJvdXRlLnByb3ZpZGVyaWRfcmVwcmVzZW50IHx8IGdsb2JhbFRyYW5zbGF0ZS5pcl9Ob0Fzc2lnbmVkUHJvdmlkZXI7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIEhUTUwgdGFncyB0byBnZXQgY2xlYW4gcHJvdmlkZXIgbmFtZSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICB0ZW1wRGl2LmlubmVySFRNTCA9IHByb3ZpZGVyTmFtZTtcbiAgICAgICAgICAgICAgICBjb25zdCBjbGVhblByb3ZpZGVyTmFtZSA9IHRlbXBEaXYudGV4dENvbnRlbnQgfHwgdGVtcERpdi5pbm5lclRleHQgfHwgcHJvdmlkZXJOYW1lO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJJZDogcHJvdmlkZXJJZCwgIC8vIFN0b3JlIGFjdHVhbCBwcm92aWRlciBJRFxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck5hbWU6IGNsZWFuUHJvdmlkZXJOYW1lLCAgLy8gQ2xlYW4gbmFtZSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck5hbWVIdG1sOiByb3V0ZS5wcm92aWRlcmlkX3JlcHJlc2VudCB8fCBwcm92aWRlck5hbWUsICAvLyBPcmlnaW5hbCBIVE1MIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlckRpc2FibGVkOiByb3V0ZS5wcm92aWRlckRpc2FibGVkIHx8IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsUnVsZXM6IFtdLFxuICAgICAgICAgICAgICAgICAgICBzcGVjaWZpY1J1bGVzOiB7fVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNlcGFyYXRlIGdlbmVyYWwgcnVsZXMgKG5vIERJRCkgZnJvbSBzcGVjaWZpYyBydWxlcyAod2l0aCBESUQpXG4gICAgICAgICAgICBpZiAoIXJvdXRlLm51bWJlciB8fCByb3V0ZS5udW1iZXIgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLmdlbmVyYWxSdWxlcy5wdXNoKHJvdXRlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlc1tyb3V0ZS5udW1iZXJdKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5zcGVjaWZpY1J1bGVzW3JvdXRlLm51bWJlcl0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXNbcm91dGUubnVtYmVyXS5wdXNoKHJvdXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTb3J0IHJ1bGVzIHdpdGhpbiBlYWNoIGdyb3VwIGJ5IHByaW9yaXR5XG4gICAgICAgIE9iamVjdC5rZXlzKGdyb3VwcykuZm9yRWFjaChwcm92aWRlcklkID0+IHtcbiAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5nZW5lcmFsUnVsZXMuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXMpLmZvckVhY2goZGlkID0+IHtcbiAgICAgICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlc1tkaWRdLnNvcnQoKGEsIGIpID0+IGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBncm91cHM7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgZ3JvdXBlZCByb3V0ZXMgaW4gdGhlIHRhYmxlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGdyb3VwZWRSb3V0ZXMgLSBHcm91cGVkIHJvdXRlcyBvYmplY3RcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhc3NvY2lhdGVkSWRzIC0gQXJyYXkgb2YgYXNzb2NpYXRlZCByb3V0ZSBJRHNcbiAgICAgKi9cbiAgICByZW5kZXJHcm91cGVkUm91dGVzKGdyb3VwZWRSb3V0ZXMsIGFzc29jaWF0ZWRJZHMpIHtcbiAgICAgICAgY29uc3QgdGJvZHkgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJ3Rib2R5Jyk7XG4gICAgICAgIGxldCBpc0ZpcnN0R3JvdXAgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBlZFJvdXRlcykuZm9yRWFjaChwcm92aWRlcklkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGdyb3VwID0gZ3JvdXBlZFJvdXRlc1twcm92aWRlcklkXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIHByb3ZpZGVyIGdyb3VwIGhlYWRlclxuICAgICAgICAgICAgaWYgKCFpc0ZpcnN0R3JvdXApIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgc2VwYXJhdG9yIGJldHdlZW4gZ3JvdXBzXG4gICAgICAgICAgICAgICAgdGJvZHkuYXBwZW5kKCc8dHIgY2xhc3M9XCJwcm92aWRlci1zZXBhcmF0b3JcIj48dGQgY29sc3Bhbj1cIjNcIj48ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjwvdGQ+PC90cj4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlzRmlyc3RHcm91cCA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgcHJvdmlkZXIgaGVhZGVyIHJvdyAtIHVzZSBwcm92aWRlck5hbWVIdG1sIGZvciByaWNoIGRpc3BsYXlcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZChgXG4gICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwicHJvdmlkZXItaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjb2xzcGFuPVwiM1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z3JvdXAucHJvdmlkZXJOYW1lSHRtbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtncm91cC5wcm92aWRlckRpc2FibGVkID8gJzxzcGFuIGNsYXNzPVwidWkgbWluaSByZWQgbGFiZWxcIj5EaXNhYmxlZDwvc3Bhbj4nIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbmRlciBnZW5lcmFsIHJ1bGVzIGZpcnN0XG4gICAgICAgICAgICBncm91cC5nZW5lcmFsUnVsZXMuZm9yRWFjaCgocm91dGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmNyZWF0ZVJvdXRlUm93KHJvdXRlLCBhc3NvY2lhdGVkSWRzLCAncnVsZS1nZW5lcmFsJyk7XG4gICAgICAgICAgICAgICAgdGJvZHkuYXBwZW5kKHJvdyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVuZGVyIHNwZWNpZmljIHJ1bGVzIGdyb3VwZWQgYnkgRElEXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhncm91cC5zcGVjaWZpY1J1bGVzKS5zb3J0KCkuZm9yRWFjaChkaWQgPT4ge1xuICAgICAgICAgICAgICAgIGdyb3VwLnNwZWNpZmljUnVsZXNbZGlkXS5mb3JFYWNoKChyb3V0ZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNGaXJzdEluRElEID0gaW5kZXggPT09IDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IG91dE9mV29ya1RpbWVSZWNvcmQuY3JlYXRlUm91dGVSb3cocm91dGUsIGFzc29jaWF0ZWRJZHMsICdydWxlLXNwZWNpZmljJywgaXNGaXJzdEluRElEKTtcbiAgICAgICAgICAgICAgICAgICAgdGJvZHkuYXBwZW5kKHJvdyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBzaW5nbGUgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJvdXRlIC0gUm91dGUgb2JqZWN0XG4gICAgICogQHBhcmFtIHtBcnJheX0gYXNzb2NpYXRlZElkcyAtIEFzc29jaWF0ZWQgcm91dGUgSURzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJ1bGVDbGFzcyAtIENTUyBjbGFzcyBmb3IgdGhlIHJ1bGUgdHlwZVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gc2hvd0RJREluZGljYXRvciAtIFdoZXRoZXIgdG8gc2hvdyBESUQgaW5kaWNhdG9yXG4gICAgICogQHJldHVybnMge1N0cmluZ30gSFRNTCByb3dcbiAgICAgKi9cbiAgICBjcmVhdGVSb3V0ZVJvdyhyb3V0ZSwgYXNzb2NpYXRlZElkcywgcnVsZUNsYXNzID0gJycsIHNob3dESURJbmRpY2F0b3IgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBhc3NvY2lhdGVkSWRzLmluY2x1ZGVzKHBhcnNlSW50KHJvdXRlLmlkKSk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyRGlzYWJsZWQgPSByb3V0ZS5wcm92aWRlckRpc2FibGVkID8gJ2Rpc2FibGVkJyA6ICcnO1xuICAgICAgICBsZXQgcnVsZURlc2NyaXB0aW9uID0gcm91dGUucnVsZV9yZXByZXNlbnQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbnN1cmUgcHJvdmlkZXIgSUQgaXMgY2xlYW4gKG5vIEhUTUwpXG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSByb3V0ZS5wcm92aWRlciB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB2aXN1YWwgaW5kaWNhdG9ycyBmb3IgcnVsZSB0eXBlXG4gICAgICAgIGlmIChydWxlQ2xhc3MgPT09ICdydWxlLXNwZWNpZmljJykge1xuICAgICAgICAgICAgLy8gQWRkIGluZGVudCBhbmQgYXJyb3cgZm9yIHNwZWNpZmljIHJ1bGVzXG4gICAgICAgICAgICBydWxlRGVzY3JpcHRpb24gPSBgPHNwYW4gY2xhc3M9XCJydWxlLWluZGVudFwiPuKGszwvc3Bhbj4gJHtydWxlRGVzY3JpcHRpb259YDtcbiAgICAgICAgfSBlbHNlIGlmIChydWxlQ2xhc3MgPT09ICdydWxlLWdlbmVyYWwnKSB7XG4gICAgICAgICAgICAvLyBBZGQgaWNvbiBmb3IgZ2VuZXJhbCBydWxlc1xuICAgICAgICAgICAgcnVsZURlc2NyaXB0aW9uID0gYDxpIGNsYXNzPVwicmFuZG9tIGljb25cIj48L2k+ICR7cnVsZURlc2NyaXB0aW9ufWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG5vdGVEaXNwbGF5ID0gcm91dGUubm90ZSAmJiByb3V0ZS5ub3RlLmxlbmd0aCA+IDIwID8gXG4gICAgICAgICAgICBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uXCIgZGF0YS1jb250ZW50PVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocm91dGUubm90ZSl9XCIgZGF0YS12YXJpYXRpb249XCJ3aWRlXCIgZGF0YS1wb3NpdGlvbj1cInRvcCByaWdodFwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZmlsZSB0ZXh0IGljb25cIj48L2k+XG4gICAgICAgICAgICA8L2Rpdj5gIDogXG4gICAgICAgICAgICBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocm91dGUubm90ZSB8fCAnJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEYXRhIGF0dHJpYnV0ZXMgYWxyZWFkeSBzYWZlIGZyb20gQVBJXG4gICAgICAgIGNvbnN0IHNhZmVQcm92aWRlcklkID0gcHJvdmlkZXJJZDtcbiAgICAgICAgY29uc3Qgc2FmZURpZCA9IHJvdXRlLm51bWJlciB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8dHIgY2xhc3M9XCJydWxlLXJvdyAke3J1bGVDbGFzc31cIiBpZD1cIiR7cm91dGUuaWR9XCIgXG4gICAgICAgICAgICAgICAgZGF0YS1wcm92aWRlcj1cIiR7c2FmZVByb3ZpZGVySWR9XCIgXG4gICAgICAgICAgICAgICAgZGF0YS1kaWQ9XCIke3NhZmVEaWR9XCI+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiY29sbGFwc2luZ1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZml0dGVkIHRvZ2dsZSBjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtZGlkPVwiJHtzYWZlRGlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcHJvdmlkZXI9XCJ7JHtzYWZlUHJvdmlkZXJJZH19XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgJHtpc0NoZWNrZWQgPyAnY2hlY2tlZCcgOiAnJ30gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInJvdXRlLSR7cm91dGUuaWR9XCIgZGF0YS12YWx1ZT1cIiR7cm91dGUuaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCIke3Byb3ZpZGVyRGlzYWJsZWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICR7cnVsZURlc2NyaXB0aW9uIHx8ICc8c3BhbiBjbGFzcz1cInRleHQtbXV0ZWRcIj5ObyBkZXNjcmlwdGlvbjwvc3Bhbj4nfVxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiaGlkZS1vbi1tb2JpbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtub3RlRGlzcGxheX1cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgPC90cj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgZW1wdHkgcm91dGVzIG1lc3NhZ2UgaW4gdGFibGVcbiAgICAgKi9cbiAgICBzaG93RW1wdHlSb3V0ZXNNZXNzYWdlKCkge1xuICAgICAgICBjb25zdCBlbXB0eVJvdyA9IGBcbiAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjNcIiBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmlyX05vSW5jb21pbmdSb3V0ZXN9XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgIGA7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQoZW1wdHlSb3cpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByb3V0aW5nIGNoZWNrYm94ZXMgd2l0aCBncm91cGVkIGxvZ2ljXG4gICAgICogV2hlbiBjaGVja2luZy91bmNoZWNraW5nIHJ1bGVzIHdpdGggc2FtZSBwcm92aWRlciBhbmQgRElEXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJvdXRpbmdDaGVja2JveGVzKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhvdmVyIGVmZmVjdCB0byBoaWdobGlnaHQgcmVsYXRlZCBydWxlc1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLmhvdmVyKFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkcm93LmF0dHIoJ2RhdGEtcHJvdmlkZXInKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkaWQgPSAkcm93LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHByZXZpb3VzIGhpZ2hsaWdodHNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLnJlbW92ZUNsYXNzKCdyZWxhdGVkLWhpZ2hsaWdodCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhpZ2hsaWdodCBhbGwgcnVsZXMgd2l0aCBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzZWxlY3RvciA9IGAucnVsZS1yb3dbZGF0YS1wcm92aWRlcj1cIiR7cHJvdmlkZXJ9XCJdYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGhvdmVyaW5nIG9uIHNwZWNpZmljIERJRCBydWxlLCBoaWdobGlnaHQgYWxsIHdpdGggc2FtZSBESURcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9IGBbZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgaG92ZXJpbmcgb24gZ2VuZXJhbCBydWxlLCBoaWdobGlnaHQgYWxsIGdlbmVyYWwgcnVsZXMgZm9yIHRoaXMgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9ICdbZGF0YS1kaWQ9XCJcIl0nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCAkcmVsYXRlZFJvd3MgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICAkcmVsYXRlZFJvd3MuYWRkQ2xhc3MoJ3JlbGF0ZWQtaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBoaWdobGlnaHRzIG9uIG1vdXNlIGxlYXZlXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCcucnVsZS1yb3cnKS5yZW1vdmVDbGFzcygncmVsYXRlZC1oaWdobGlnaHQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3ggYmVoYXZpb3Igd2l0aCB0b29sdGlwc1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy51aS5jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgZGlkID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlciA9ICRjaGVja2JveC5hdHRyKCdkYXRhLXByb3ZpZGVyJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCB0b29sdGlwIHRvIGV4cGxhaW4gZ3JvdXBpbmdcbiAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgbGV0IHRvb2x0aXBUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGRpZCkge1xuICAgICAgICAgICAgICAgICAgICB0b29sdGlwVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS50Zl9Ub29sdGlwU3BlY2lmaWNSdWxlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnRmX1Rvb2x0aXBHZW5lcmFsUnVsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNoZWNrYm94LmF0dHIoJ2RhdGEtY29udGVudCcsIHRvb2x0aXBUZXh0KTtcbiAgICAgICAgICAgICAgICAkY2hlY2tib3guYXR0cignZGF0YS12YXJpYXRpb24nLCAndGlueScpO1xuICAgICAgICAgICAgICAgICRjaGVja2JveC5wb3B1cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3ggY2hhbmdlIGJlaGF2aW9yXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcykucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlkID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkY2hlY2tib3guYXR0cignZGF0YS1wcm92aWRlcicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNraXAgc3luY2hyb25pemF0aW9uIGZvciAnbm9uZScgcHJvdmlkZXIgKGRpcmVjdCBjYWxscylcbiAgICAgICAgICAgICAgICBpZiAoIXByb3ZpZGVyIHx8IHByb3ZpZGVyID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZ3JvdXBlZCBsb2dpYyByZXF1aXJlbWVudHNcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYCNyb3V0aW5nLXRhYmxlIC51aS5jaGVja2JveFtkYXRhLXByb3ZpZGVyPVwiJHtwcm92aWRlcn1cIl1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpZCAmJiBkaWQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSdWxlIHdpdGggc3BlY2lmaWMgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBjaGVja2luZyBhIHJ1bGUgd2l0aCBESUQsIGNoZWNrIGFsbCBydWxlcyB3aXRoIHNhbWUgcHJvdmlkZXIgYW5kIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yV2l0aERJRCA9IGAke3NlbGVjdG9yfVtkYXRhLWRpZD1cIiR7ZGlkfVwiXWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChzZWxlY3RvcldpdGhESUQpLm5vdCgkY2hlY2tib3gpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHVuY2hlY2tpbmcgYSBydWxlIHdpdGggRElEOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIFVuY2hlY2sgYWxsIHJ1bGVzIHdpdGggc2FtZSBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvcldpdGhESUQgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JXaXRoRElEKS5ub3QoJGNoZWNrYm94KS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDIuIEFsc28gdW5jaGVjayBnZW5lcmFsIHJ1bGVzICh3aXRob3V0IERJRCkgZm9yIHNhbWUgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvckdlbmVyYWwgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCJcIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JHZW5lcmFsKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2VuZXJhbCBydWxlIHdpdGhvdXQgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gdW5jaGVja2luZyBnZW5lcmFsIHJ1bGUsIG9ubHkgdW5jaGVjayBvdGhlciBnZW5lcmFsIHJ1bGVzIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBjaGVja2luZyBnZW5lcmFsIHJ1bGUsIGNoZWNrIGFsbCBnZW5lcmFsIHJ1bGVzIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZVxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGVyYXNlIGJ1dHRvbnMgZm9yIGRhdGUvdGltZSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXJhc2VycygpIHtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJhc2VEYXRlc0J0bi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZVdlZWtkYXlzQnRuLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlGcm9tRHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZVRpbWVwZXJpb2RCdG4ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZXNjcmlwdGlvbiBmaWVsZCB3aXRoIGF1dG8tcmVzaXplXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlc2NyaXB0aW9uRmllbGQoKSB7XG4gICAgICAgIC8vIEF1dG8tcmVzaXplIG9uIGlucHV0XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgICAgICAgIHRoaXMuc3R5bGUuaGVpZ2h0ID0gKHRoaXMuc2Nyb2xsSGVpZ2h0KSArICdweCc7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCByZXNpemVcbiAgICAgICAgaWYgKG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGVscGVyIHRvIHNldCBkYXRlIGZyb20gdGltZXN0YW1wIG9yIGRhdGUgc3RyaW5nXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSBkYXRlVmFsdWUgLSBVbml4IHRpbWVzdGFtcCBvciBkYXRlIHN0cmluZyAoWVlZWS1NTS1ERClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3JcbiAgICAgKi9cbiAgICBzZXREYXRlRnJvbVRpbWVzdGFtcChkYXRlVmFsdWUsIHNlbGVjdG9yKSB7XG4gICAgICAgIGlmICghZGF0ZVZhbHVlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGEgZGF0ZSBzdHJpbmcgaW4gWVlZWS1NTS1ERCBmb3JtYXQgZmlyc3RcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlVmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgZGF0ZSBmb3JtYXQgWVlZWS1NTS1ERFxuICAgICAgICAgICAgaWYgKC9eXFxkezR9LVxcZHsyfS1cXGR7Mn0kLy50ZXN0KGRhdGVWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzTmFOKGRhdGUuZ2V0VGltZSgpKSkge1xuICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJ5IHRvIHBhcnNlIGFzIFVuaXggdGltZXN0YW1wIChhbGwgZGlnaXRzKVxuICAgICAgICAgICAgaWYgKC9eXFxkKyQvLnRlc3QoZGF0ZVZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IHBhcnNlSW50KGRhdGVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRpbWVzdGFtcCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBVbml4IHRpbWVzdGFtcCB0byBEYXRlXG4gICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3IpLmNhbGVuZGFyKCdzZXQgZGF0ZScsIG5ldyBEYXRlKHRpbWVzdGFtcCAqIDEwMDApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZGF0ZVZhbHVlID09PSAnbnVtYmVyJyAmJiBkYXRlVmFsdWUgPiAwKSB7XG4gICAgICAgICAgICAvLyBOdW1lcmljIFVuaXggdGltZXN0YW1wXG4gICAgICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBuZXcgRGF0ZShkYXRlVmFsdWUgKiAxMDAwKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gZm9yIHBhaXJlZCBmaWVsZHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gRm9ybSBkYXRhXG4gICAgICogQHJldHVybnMge29iamVjdHxib29sZWFufSBSZXN1bHQgb2JqZWN0IG9yIGZhbHNlIGlmIHZhbGlkYXRpb24gZmFpbHNcbiAgICAgKi9cbiAgICBjdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KSB7XG4gICAgICAgIC8vIENoZWNrIGRhdGUgZmllbGRzIC0gYm90aCBzaG91bGQgYmUgZmlsbGVkIG9yIGJvdGggZW1wdHlcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS5kYXRlX2Zyb20gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gPT09ICcnKSB8fFxuICAgICAgICAgICAgKHJlc3VsdC5kYXRhLmRhdGVfdG8gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9PT0gJycpKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdlZWtkYXkgZmllbGRzIC0gYm90aCBzaG91bGQgYmUgZmlsbGVkIG9yIGJvdGggZW1wdHlcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMScpIHx8XG4gICAgICAgICAgICAocmVzdWx0LmRhdGEud2Vla2RheV90byA+IDAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID09PSAnLTEnKSkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB0aW1lIGZpZWxkcyAtIGJvdGggc2hvdWxkIGJlIGZpbGxlZCBvciBib3RoIGVtcHR5XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApIHx8XG4gICAgICAgICAgICAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHRpbWVmcmFtZSB0eXBlLCBjaGVjayB0aGF0IGF0IGxlYXN0IG9uZSBjb25kaXRpb24gaXMgc3BlY2lmaWVkXG4gICAgICAgIGNvbnN0IGNhbFR5cGUgPSByZXN1bHQuZGF0YS5jYWxUeXBlIHx8ICd0aW1lZnJhbWUnO1xuICAgICAgICBpZiAoY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScgfHwgY2FsVHlwZSA9PT0gJycpIHtcbiAgICAgICAgICAgIGNvbnN0IGhhc0RhdGVSYW5nZSA9IHJlc3VsdC5kYXRhLmRhdGVfZnJvbSAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV90byAhPT0gJyc7XG4gICAgICAgICAgICBjb25zdCBoYXNXZWVrZGF5UmFuZ2UgPSByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPiAwO1xuICAgICAgICAgICAgY29uc3QgaGFzVGltZVJhbmdlID0gcmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWhhc0RhdGVSYW5nZSAmJiAhaGFzV2Vla2RheVJhbmdlICYmICFoYXNUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQpLnNob3coKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgc2VuZGluZyBmb3JtXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R8Ym9vbGVhbn0gVXBkYXRlZCBzZXR0aW5ncyBvciBmYWxzZVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyBmcm9tICdvbicvdW5kZWZpbmVkIHRvIHRydWUvZmFsc2VcbiAgICAgICAgLy8gUHJvY2VzcyBhbGwgcm91dGUgY2hlY2tib3hlc1xuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdyb3V0ZS0nKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2tleV0gPSByZXN1bHQuZGF0YVtrZXldID09PSAnb24nIHx8IHJlc3VsdC5kYXRhW2tleV0gPT09IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgIGlmICgnYWxsb3dSZXN0cmljdGlvbicgaW4gcmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFsbG93UmVzdHJpY3Rpb24gPSByZXN1bHQuZGF0YS5hbGxvd1Jlc3RyaWN0aW9uID09PSAnb24nIHx8IHJlc3VsdC5kYXRhLmFsbG93UmVzdHJpY3Rpb24gPT09IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjYWxUeXBlIGNvbnZlcnNpb24gKG1hdGNoZXMgb2xkIGNvbnRyb2xsZXI6ICgkZGF0YVskbmFtZV0gPT09ICd0aW1lZnJhbWUnKSA/ICcnIDogJGRhdGFbJG5hbWVdKVxuICAgICAgICAvLyBGb3Igc2F2aW5nIHdlIGNvbnZlcnQgJ3RpbWVmcmFtZScgdG8gZW1wdHkgc3RyaW5nXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5jYWxUeXBlID09PSAndGltZWZyYW1lJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuY2FsVHlwZSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgd2Vla2RheSB2YWx1ZXMgKG1hdGNoZXMgb2xkIGNvbnRyb2xsZXI6ICgkZGF0YVskbmFtZV0gPCAxKSA/IG51bGwgOiAkZGF0YVskbmFtZV0pXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPT09ICctMScgfHwgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tIDwgMSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMScgfHwgcmVzdWx0LmRhdGEud2Vla2RheV90byA8IDEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPSAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIGZpZWxkIC0gaWYgdXNlciBkaWRuJ3QgY2hhbmdlIHRoZSBtYXNrZWQgcGFzc3dvcmQsIGtlZXAgaXQgYXMgaXNcbiAgICAgICAgLy8gVGhlIGJhY2tlbmQgd2lsbCByZWNvZ25pemUgJ1hYWFhYWCcgYW5kIHdvbid0IHVwZGF0ZSB0aGUgcGFzc3dvcmRcbiAgICAgICAgLy8gSWYgdXNlciBjbGVhcmVkIHRoZSBmaWVsZCBvciBlbnRlcmVkIG5ldyB2YWx1ZSwgc2VuZCB0aGF0XG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5jYWxTZWNyZXQgPT09ICdYWFhYWFgnKSB7XG4gICAgICAgICAgICAvLyBVc2VyIGRpZG4ndCBjaGFuZ2UgdGhlIG1hc2tlZCBwYXNzd29yZCwgYmFja2VuZCB3aWxsIGtlZXAgZXhpc3RpbmcgdmFsdWVcbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQuZGF0YS5jYWxTZWNyZXQgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBVc2VyIGNsZWFyZWQgdGhlIHBhc3N3b3JkIGZpZWxkLCBiYWNrZW5kIHdpbGwgY2xlYXIgdGhlIHBhc3N3b3JkXG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlIHNlbmQgdGhlIG5ldyBwYXNzd29yZCB2YWx1ZSBhcyBlbnRlcmVkXG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGltZSB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIGNhbGVuZGFyIHR5cGVcbiAgICAgICAgY29uc3QgY2FsVHlwZSA9IHJlc3VsdC5kYXRhLmNhbFR5cGUgfHwgJ3RpbWVmcmFtZSc7XG4gICAgICAgIGlmIChjYWxUeXBlID09PSAnJyB8fCBjYWxUeXBlID09PSAndGltZWZyYW1lJykge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLnRpbWVmcm9tLnJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC5hZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXM7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZXRvLnJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC5hZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZWZyb20ucnVsZXMgPSBbXTtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy50aW1ldG8ucnVsZXMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBkYXRlcyB0byB0aW1lc3RhbXBzXG4gICAgICAgIGNvbnN0IGRhdGVGcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIGlmIChkYXRlRnJvbSkge1xuICAgICAgICAgICAgZGF0ZUZyb20uc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5kYXRlX2Zyb20gPSBNYXRoLmZsb29yKGRhdGVGcm9tLmdldFRpbWUoKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRhdGVUbyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignZ2V0IGRhdGUnKTtcbiAgICAgICAgaWYgKGRhdGVUbykge1xuICAgICAgICAgICAgZGF0ZVRvLnNldEhvdXJzKDIzLCA1OSwgNTksIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV90byA9IE1hdGguZmxvb3IoZGF0ZVRvLmdldFRpbWUoKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxlY3Qgc2VsZWN0ZWQgaW5jb21pbmcgcm91dGVzXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkUm91dGVzID0gW107XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgcm91dGVJZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKHJvdXRlSWQpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZFJvdXRlcy5wdXNoKHJvdXRlSWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmVzdWx0LmRhdGEuaW5jb21pbmdSb3V0ZUlkcyA9IHNlbGVjdGVkUm91dGVzO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgYWN0aW9uLWRlcGVuZGVudCBmaWVsZHMgYmFzZWQgb24gc2VsZWN0aW9uXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5hY3Rpb24gPT09ICdleHRlbnNpb24nKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdWRpb19tZXNzYWdlX2lkID0gJyc7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzdWx0LmRhdGEuYWN0aW9uID09PSAncGxheW1lc3NhZ2UnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5leHRlbnNpb24gPSAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUnVuIGN1c3RvbSB2YWxpZGF0aW9uIGZvciBwYWlyZWQgZmllbGRzXG4gICAgICAgIHJldHVybiBvdXRPZldvcmtUaW1lUmVjb3JkLmN1c3RvbVZhbGlkYXRlRm9ybShyZXN1bHQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGlmIHRoaXMgd2FzIGEgbmV3IHJlY29yZFxuICAgICAgICAgICAgaWYgKCFvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1vZmYtd29yay10aW1lcy9tb2RpZnkvJHtyZXNwb25zZS5kYXRhLmlkfWA7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQgPSByZXNwb25zZS5kYXRhLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWxvYWQgZGF0YSB0byBlbnN1cmUgY29uc2lzdGVuY3lcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZEZvcm1EYXRhKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9b2ZmLXdvcmstdGltZXMvc2F2ZWA7XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBPZmZXb3JrVGltZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHMgdXNpbmcgVG9vbHRpcEJ1aWxkZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGQgdG9vbHRpcFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIGNhbFVybDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgeyB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfaGVhZGVyLCBkZWZpbml0aW9uOiBudWxsIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl9nb29nbGUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl9uZXh0Y2xvdWQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl95YW5kZXhcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHsgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfaWNhbGVuZGFyX2hlYWRlciwgZGVmaW5pdGlvbjogbnVsbCB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9pY2FsZW5kYXJfZGVzY1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfZXhhbXBsZV9nb29nbGUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVfbmV4dGNsb3VkLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9leGFtcGxlX2ljc1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXNIZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgdGhhdCBjaGVja3MgaWYgYSB2YWx1ZSBpcyBub3QgZW1wdHkgYmFzZWQgb24gYSBzcGVjaWZpYyBhY3Rpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWRcbiAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHRvIGNvbXBhcmUgYWdhaW5zdFxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgdHJ1ZSBpZiB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZSA9IGZ1bmN0aW9uKHZhbHVlLCBhY3Rpb24pIHtcbiAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwICYmIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkZpZWxkLnZhbCgpID09PSBhY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgY2FsZW5kYXIgVVJMIGZpZWxkXG4gKiBWYWxpZGF0ZXMgVVJMIG9ubHkgd2hlbiBjYWxlbmRhciB0eXBlIGlzIG5vdCAnbm9uZScgb3IgJ3RpbWUnXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21Ob3RFbXB0eUlmQ2FsVHlwZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgY29uc3QgY2FsVHlwZSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbFR5cGVGaWVsZC52YWwoKTtcbiAgICBcbiAgICAvLyBJZiBjYWxlbmRhciB0eXBlIGlzIHRpbWVmcmFtZSBvciB0aW1lLCBVUkwgaXMgbm90IHJlcXVpcmVkXG4gICAgaWYgKCFjYWxUeXBlIHx8IGNhbFR5cGUgPT09ICd0aW1lZnJhbWUnIHx8IGNhbFR5cGUgPT09ICd0aW1lJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgLy8gSWYgY2FsZW5kYXIgdHlwZSBpcyBDQUxEQVYgb3IgSUNBTCwgdmFsaWRhdGUgVVJMXG4gICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICAvLyBDaGVjayBpZiBpdCdzIGEgdmFsaWQgVVJMXG4gICAgdHJ5IHtcbiAgICAgICAgbmV3IFVSTCh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==