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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PZmZXb3JrVGltZXMvb2ZmLXdvcmstdGltZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm91dE9mV29ya1RpbWVSZWNvcmQiLCIkZm9ybU9iaiIsIiQiLCJyZWNvcmRJZCIsInJlY29yZERhdGEiLCIkdGltZV9mcm9tIiwiJHRpbWVfdG8iLCIkcnVsZXNUYWJsZSIsIiRpZEZpZWxkIiwiJHdlZWtkYXlGcm9tRmllbGQiLCIkd2Vla2RheVRvRmllbGQiLCIkYWN0aW9uRmllbGQiLCIkY2FsVHlwZUZpZWxkIiwiJGV4dGVuc2lvbkZpZWxkIiwiJGFsbG93UmVzdHJpY3Rpb25GaWVsZCIsIiRkZXNjcmlwdGlvbkZpZWxkIiwiJGFjdGlvbkRyb3Bkb3duIiwiJGNhbFR5cGVEcm9wZG93biIsIiR3ZWVrZGF5RnJvbURyb3Bkb3duIiwiJHdlZWtkYXlUb0Ryb3Bkb3duIiwiJHRhYk1lbnUiLCIkcnVsZXNUYWIiLCIkZ2VuZXJhbFRhYiIsIiRydWxlc1RhYlNlZ21lbnQiLCIkZ2VuZXJhbFRhYlNlZ21lbnQiLCIkZXh0ZW5zaW9uUm93IiwiJGF1ZGlvTWVzc2FnZVJvdyIsIiRjYWxlbmRhclRhYiIsIiRtYWluVGFiIiwiJHJhbmdlRGF5c1N0YXJ0IiwiJHJhbmdlRGF5c0VuZCIsIiRyYW5nZVRpbWVTdGFydCIsIiRyYW5nZVRpbWVFbmQiLCIkZXJhc2VEYXRlc0J0biIsIiRlcmFzZVdlZWtkYXlzQnRuIiwiJGVyYXNlVGltZXBlcmlvZEJ0biIsIiRlcnJvck1lc3NhZ2UiLCJhdWRpb01lc3NhZ2VJZCIsImFkZGl0aW9uYWxUaW1lSW50ZXJ2YWxSdWxlcyIsInR5cGUiLCJ2YWx1ZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZXh0ZW5zaW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidGZfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSIsImF1ZGlvX21lc3NhZ2VfaWQiLCJ0Zl9WYWxpZGF0ZUF1ZGlvTWVzc2FnZUVtcHR5IiwiY2FsVXJsIiwidGZfVmFsaWRhdGVDYWxVcmkiLCJ0aW1lZnJvbSIsIm9wdGlvbmFsIiwidGltZXRvIiwiaW5pdGlhbGl6ZSIsInZhbCIsInRhYiIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZUNhbGVuZGFycyIsImluaXRpYWxpemVSb3V0aW5nVGFibGUiLCJpbml0aWFsaXplRXJhc2VycyIsImluaXRpYWxpemVEZXNjcmlwdGlvbkZpZWxkIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwibG9hZEZvcm1EYXRhIiwiYWRkQ2xhc3MiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlYXJjaCIsImNvcHlJZCIsImdldCIsIk9mZldvcmtUaW1lc0FQSSIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwicG9wdWxhdGVGb3JtIiwibG9hZFJvdXRpbmdUYWJsZSIsInNldFRpbWVvdXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJtZXNzYWdlcyIsImVycm9yIiwiZXJyb3JNZXNzYWdlIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJyZWNvcmRJZFRvTG9hZCIsImdldFJlY29yZCIsInNhdmVJbml0aWFsVmFsdWVzIiwiY2hlY2tWYWx1ZXMiLCJpbml0aWFsaXplRHJvcGRvd25zIiwid2Vla0RheXMiLCJ0ZXh0IiwiaSIsImRhdGUiLCJEYXRlIiwiZGF5TmFtZSIsInRvTG9jYWxlRGF0ZVN0cmluZyIsIndlZWtkYXkiLCJ0cmFuc2xhdGVkRGF5IiwicHVzaCIsIm5hbWUiLCJ0b1N0cmluZyIsImRyb3Bkb3duIiwidmFsdWVzIiwib25DaGFuZ2UiLCJvbkFjdGlvbkNoYW5nZSIsIm9uQ2FsVHlwZUNoYW5nZSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvciIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiaW5pdCIsImNhdGVnb3J5IiwiaW5jbHVkZUVtcHR5IiwiYXVkaW9fbWVzc2FnZV9pZF9yZXByZXNlbnQiLCJzZXRWYWx1ZSIsImluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvciIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaXNDb3B5IiwiaGFzIiwicHJpb3JpdHkiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsInVuaXFpZCIsImRlc2NyaXB0aW9uIiwiY2FsVHlwZSIsIndlZWtkYXlfZnJvbSIsIndlZWtkYXlfdG8iLCJ0aW1lX2Zyb20iLCJ0aW1lX3RvIiwiY2FsVXNlciIsImNhbFNlY3JldCIsImFjdGlvbiIsImFsbG93UmVzdHJpY3Rpb24iLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCIkY2FsU2VjcmV0RmllbGQiLCJhdHRyIiwidGZfUGFzc3dvcmRNYXNrZWQiLCJ0Zl9FbnRlclBhc3N3b3JkIiwiZGF0ZV9mcm9tIiwic2V0RGF0ZUZyb21UaW1lc3RhbXAiLCJkYXRlX3RvIiwidG9nZ2xlUnVsZXNUYWIiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJmb3JtIiwic2hvdyIsImhpZGUiLCJjbGVhciIsImNhbGVuZGFyIiwiZmlyc3REYXlPZldlZWsiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImNhbGVuZGFyRmlyc3REYXlPZldlZWsiLCJjYWxlbmRhclRleHQiLCJlbmRDYWxlbmRhciIsImlubGluZSIsIm1vbnRoRmlyc3QiLCJyZWdFeHAiLCJzdGFydENhbGVuZGFyIiwiZGlzYWJsZU1pbnV0ZSIsImFtcG0iLCJwYXJlbnQiLCJjaGVja2JveCIsImlzQ2hlY2tlZCIsImZpbmQiLCJoYXNDbGFzcyIsImVtcHR5IiwiYXNzb2NpYXRlZElkcyIsImluY29taW5nUm91dGVJZHMiLCJJbmNvbWluZ1JvdXRlc0FQSSIsImdldExpc3QiLCJncm91cGVkUm91dGVzIiwiZ3JvdXBBbmRTb3J0Um91dGVzIiwicmVuZGVyR3JvdXBlZFJvdXRlcyIsImluaXRpYWxpemVSb3V0aW5nQ2hlY2tib3hlcyIsInBvcHVwIiwic2hvd0VtcHR5Um91dGVzTWVzc2FnZSIsInJvdXRlcyIsImdyb3VwcyIsImZvckVhY2giLCJyb3V0ZSIsInByb3ZpZGVySWQiLCJwcm92aWRlciIsInByb3ZpZGVyTmFtZSIsInByb3ZpZGVyaWRfcmVwcmVzZW50IiwiaXJfTm9Bc3NpZ25lZFByb3ZpZGVyIiwidGVtcERpdiIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImlubmVySFRNTCIsImNsZWFuUHJvdmlkZXJOYW1lIiwidGV4dENvbnRlbnQiLCJpbm5lclRleHQiLCJwcm92aWRlck5hbWVIdG1sIiwicHJvdmlkZXJEaXNhYmxlZCIsImdlbmVyYWxSdWxlcyIsInNwZWNpZmljUnVsZXMiLCJudW1iZXIiLCJPYmplY3QiLCJrZXlzIiwic29ydCIsImEiLCJiIiwiZGlkIiwidGJvZHkiLCJpc0ZpcnN0R3JvdXAiLCJncm91cCIsImFwcGVuZCIsInJvdyIsImNyZWF0ZVJvdXRlUm93IiwiaW5kZXgiLCJpc0ZpcnN0SW5ESUQiLCJydWxlQ2xhc3MiLCJzaG93RElESW5kaWNhdG9yIiwiaW5jbHVkZXMiLCJwYXJzZUludCIsInJ1bGVEZXNjcmlwdGlvbiIsInJ1bGVfcmVwcmVzZW50Iiwibm90ZURpc3BsYXkiLCJub3RlIiwibGVuZ3RoIiwic2FmZVByb3ZpZGVySWQiLCJzYWZlRGlkIiwiZW1wdHlSb3ciLCJpcl9Ob0luY29taW5nUm91dGVzIiwiaG92ZXIiLCIkcm93Iiwic2VsZWN0b3IiLCIkcmVsYXRlZFJvd3MiLCJlYWNoIiwiJGNoZWNrYm94IiwidG9vbHRpcFRleHQiLCJ0Zl9Ub29sdGlwU3BlY2lmaWNSdWxlIiwidGZfVG9vbHRpcEdlbmVyYWxSdWxlIiwic2VsZWN0b3JXaXRoRElEIiwibm90Iiwic2VsZWN0b3JHZW5lcmFsIiwib24iLCJzdHlsZSIsImhlaWdodCIsInNjcm9sbEhlaWdodCIsInRyaWdnZXIiLCJkYXRlVmFsdWUiLCJ0ZXN0IiwiaXNOYU4iLCJnZXRUaW1lIiwidGltZXN0YW1wIiwiY3VzdG9tVmFsaWRhdGVGb3JtIiwiaHRtbCIsInRmX1ZhbGlkYXRlQ2hlY2tEYXRlSW50ZXJ2YWwiLCIkc3VibWl0QnV0dG9uIiwidHJhbnNpdGlvbiIsInRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwiLCJoYXNEYXRlUmFuZ2UiLCJoYXNXZWVrZGF5UmFuZ2UiLCJoYXNUaW1lUmFuZ2UiLCJ0Zl9WYWxpZGF0ZU5vUnVsZXNTZWxlY3RlZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImtleSIsInN0YXJ0c1dpdGgiLCJkYXRlRnJvbSIsInNldEhvdXJzIiwiTWF0aCIsImZsb29yIiwiZGF0ZVRvIiwic2VsZWN0ZWRSb3V0ZXMiLCJyb3V0ZUlkIiwiY2JBZnRlclNlbmRGb3JtIiwibmV3VXJsIiwiZ2xvYmFsUm9vdFVybCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiT2ZmV29ya1RpbWVzVG9vbHRpcE1hbmFnZXIiLCJmbiIsImN1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlIiwiY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUiLCJVUkwiLCJfIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG1CQUFtQixHQUFHO0FBQ3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHVCQUFELENBTGE7O0FBT3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQVhjO0FBV1I7O0FBRWhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVB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LEtBQWlCLENBQS9CLEVBQWtDO0FBQzlCLFdBQU8sS0FBUDtBQUNILEdBWDhELENBYS9EOzs7QUFDQSxNQUFJO0FBQ0EsUUFBSThELEdBQUosQ0FBUXpQLEtBQVI7QUFDQSxXQUFPLElBQVA7QUFDSCxHQUhELENBR0UsT0FBTzBQLENBQVAsRUFBVTtBQUNSLFdBQU8sS0FBUDtBQUNIO0FBQ0osQ0FwQkQsQyxDQXNCQTs7O0FBQ0FoUyxDQUFDLENBQUNnTSxRQUFELENBQUQsQ0FBWWlHLEtBQVosQ0FBa0IsWUFBTTtBQUNwQm5TLEVBQUFBLG1CQUFtQixDQUFDd0QsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQgZ2xvYmFsUm9vdFVybCBFeHRlbnNpb25zIG1vbWVudCBGb3JtIGdsb2JhbFRyYW5zbGF0ZVxuICAgU2VtYW50aWNMb2NhbGl6YXRpb24gU291bmRGaWxlU2VsZWN0b3IgVXNlck1lc3NhZ2UgU2VjdXJpdHlVdGlsc1xuICAgSW5jb21pbmdSb3V0ZXNBUEkgT2ZmV29ya1RpbWVzQVBJIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgRXh0ZW5zaW9uU2VsZWN0b3IgT2ZmV29ya1RpbWVzVG9vbHRpcE1hbmFnZXIgKi9cblxuLyoqXG4gKiBNb2R1bGUgZm9yIG1hbmFnaW5nIG91dC1vZi13b3JrIHRpbWUgc2V0dGluZ3NcbiAqIFxuICogVGhpcyBtb2R1bGUgaGFuZGxlcyB0aGUgZm9ybSBmb3IgY3JlYXRpbmcgYW5kIGVkaXRpbmcgb3V0LW9mLXdvcmsgdGltZSBjb25kaXRpb25zLlxuICogSXQgdXNlcyBhIHVuaWZpZWQgUkVTVCBBUEkgYXBwcm9hY2ggbWF0Y2hpbmcgdGhlIGluY29taW5nIHJvdXRlcyBwYXR0ZXJuLlxuICogXG4gKiBAbW9kdWxlIG91dE9mV29ya1RpbWVSZWNvcmRcbiAqL1xuY29uc3Qgb3V0T2ZXb3JrVGltZVJlY29yZCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIFJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcmVjb3JkSWQ6IG51bGwsIC8vIFdpbGwgYmUgc2V0IGluIGluaXRpYWxpemUoKVxuICAgIFxuICAgIC8qKlxuICAgICAqIFN0b3JlIGxvYWRlZCByZWNvcmQgZGF0YVxuICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgKi9cbiAgICByZWNvcmREYXRhOiBudWxsLFxuXG4gICAgLy8gRm9ybSBmaWVsZCBqUXVlcnkgb2JqZWN0c1xuICAgICR0aW1lX2Zyb206ICQoJyN0aW1lX2Zyb20nKSxcbiAgICAkdGltZV90bzogJCgnI3RpbWVfdG8nKSxcbiAgICAkcnVsZXNUYWJsZTogJCgnI3JvdXRpbmctdGFibGUnKSxcbiAgICBcbiAgICAvLyBIaWRkZW4gaW5wdXQgZmllbGRzXG4gICAgJGlkRmllbGQ6ICQoJyNpZCcpLFxuICAgICR3ZWVrZGF5RnJvbUZpZWxkOiAkKCcjd2Vla2RheV9mcm9tJyksXG4gICAgJHdlZWtkYXlUb0ZpZWxkOiAkKCcjd2Vla2RheV90bycpLFxuICAgICRhY3Rpb25GaWVsZDogJCgnI2FjdGlvbicpLFxuICAgICRjYWxUeXBlRmllbGQ6ICQoJyNjYWxUeXBlJyksXG4gICAgJGV4dGVuc2lvbkZpZWxkOiAkKCcjZXh0ZW5zaW9uJyksXG4gICAgJGFsbG93UmVzdHJpY3Rpb25GaWVsZDogJCgnI2FsbG93UmVzdHJpY3Rpb24nKSxcbiAgICAkZGVzY3JpcHRpb25GaWVsZDogJCgnI2Rlc2NyaXB0aW9uJyksXG4gICAgXG4gICAgLy8gRHJvcGRvd24gZWxlbWVudHNcbiAgICAkYWN0aW9uRHJvcGRvd246ICQoJyNhY3Rpb24tZHJvcGRvd24nKSxcbiAgICAkY2FsVHlwZURyb3Bkb3duOiAkKCcuY2FsVHlwZS1zZWxlY3QnKSxcbiAgICAkd2Vla2RheUZyb21Ecm9wZG93bjogJCgnLndlZWtkYXktZnJvbS1zZWxlY3QnKSxcbiAgICAkd2Vla2RheVRvRHJvcGRvd246ICQoJy53ZWVrZGF5LXRvLXNlbGVjdCcpLFxuICAgIFxuICAgIC8vIFRhYiBlbGVtZW50c1xuICAgICR0YWJNZW51OiAkKCcjb3V0LXRpbWUtbW9kaWZ5LW1lbnUgLml0ZW0nKSxcbiAgICAkcnVsZXNUYWI6IG51bGwsIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgbGF0ZXJcbiAgICAkZ2VuZXJhbFRhYjogbnVsbCwgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBsYXRlclxuICAgICRydWxlc1RhYlNlZ21lbnQ6IG51bGwsIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgbGF0ZXJcbiAgICAkZ2VuZXJhbFRhYlNlZ21lbnQ6IG51bGwsIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgbGF0ZXJcbiAgICBcbiAgICAvLyBSb3cgZWxlbWVudHNcbiAgICAkZXh0ZW5zaW9uUm93OiAkKCcjZXh0ZW5zaW9uLXJvdycpLFxuICAgICRhdWRpb01lc3NhZ2VSb3c6ICQoJyNhdWRpby1tZXNzYWdlLXJvdycpLFxuICAgIFxuICAgIC8vIENhbGVuZGFyIHRhYiBlbGVtZW50c1xuICAgICRjYWxlbmRhclRhYjogJCgnI2NhbGwtdHlwZS1jYWxlbmRhci10YWInKSxcbiAgICAkbWFpblRhYjogJCgnI2NhbGwtdHlwZS1tYWluLXRhYicpLFxuICAgIFxuICAgIC8vIERhdGUvdGltZSBjYWxlbmRhciBlbGVtZW50c1xuICAgICRyYW5nZURheXNTdGFydDogJCgnI3JhbmdlLWRheXMtc3RhcnQnKSxcbiAgICAkcmFuZ2VEYXlzRW5kOiAkKCcjcmFuZ2UtZGF5cy1lbmQnKSxcbiAgICAkcmFuZ2VUaW1lU3RhcnQ6ICQoJyNyYW5nZS10aW1lLXN0YXJ0JyksXG4gICAgJHJhbmdlVGltZUVuZDogJCgnI3JhbmdlLXRpbWUtZW5kJyksXG4gICAgXG4gICAgLy8gRXJhc2UgYnV0dG9uc1xuICAgICRlcmFzZURhdGVzQnRuOiAkKCcjZXJhc2UtZGF0ZXMnKSxcbiAgICAkZXJhc2VXZWVrZGF5c0J0bjogJCgnI2VyYXNlLXdlZWtkYXlzJyksXG4gICAgJGVyYXNlVGltZXBlcmlvZEJ0bjogJCgnI2VyYXNlLXRpbWVwZXJpb2QnKSxcbiAgICBcbiAgICAvLyBFcnJvciBtZXNzYWdlIGVsZW1lbnRcbiAgICAkZXJyb3JNZXNzYWdlOiAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLFxuICAgIFxuICAgIC8vIEF1ZGlvIG1lc3NhZ2UgSUQgZm9yIHNvdW5kIGZpbGUgc2VsZWN0b3JcbiAgICBhdWRpb01lc3NhZ2VJZDogJ2F1ZGlvX21lc3NhZ2VfaWQnLFxuXG4gICAgLyoqXG4gICAgICogQWRkaXRpb25hbCB0aW1lIGludGVydmFsIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgKiBAdHlwZSB7YXJyYXl9XG4gICAgICovXG4gICAgYWRkaXRpb25hbFRpbWVJbnRlcnZhbFJ1bGVzOiBbe1xuICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgdmFsdWU6IC9eKFswMV0/WzAtOV18MlswLTNdKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwsXG4gICAgfV0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm1cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbZXh0ZW5zaW9uXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhdWRpb19tZXNzYWdlX2lkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbcGxheW1lc3NhZ2VdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgY2FsVXJsOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY2FsVXJsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNhbFVyaVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgdGltZWZyb206IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVfZnJvbScsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogL14oWzAxXT9bMC05XXwyWzAtM10pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAgdGltZXRvOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndGltZV90bycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAvXihbMDFdP1swLTldfDJbMC0zXSk6KFswLTVdP1swLTldKSQvLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwsXG4gICAgICAgICAgICB9XVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFNldCByZWNvcmQgSUQgZnJvbSBET01cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmRJZCA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGlkRmllbGQudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYiByZWZlcmVuY2VzIHRoYXQgZGVwZW5kIG9uIERPTVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYiA9ICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbVtkYXRhLXRhYj1cInJ1bGVzXCJdJyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGdlbmVyYWxUYWIgPSAkKCcjb3V0LXRpbWUtbW9kaWZ5LW1lbnUgLml0ZW1bZGF0YS10YWI9XCJnZW5lcmFsXCJdJyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiU2VnbWVudCA9ICQoJy51aS50YWIuc2VnbWVudFtkYXRhLXRhYj1cInJ1bGVzXCJdJyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGdlbmVyYWxUYWJTZWdtZW50ID0gJCgnLnVpLnRhYi5zZWdtZW50W2RhdGEtdGFiPVwiZ2VuZXJhbFwiXScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHRhYk1lbnUudGFiKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gc3VibWlzc2lvbiBoYW5kbGluZ1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNvbXBvbmVudHMgdGhhdCBkb24ndCBkZXBlbmQgb24gZGF0YVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVDYWxlbmRhcnMoKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplUm91dGluZ1RhYmxlKCk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUVyYXNlcnMoKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRGVzY3JpcHRpb25GaWVsZCgpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBkYXRhIGFuZCBpbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICAvLyBUaGlzIHVuaWZpZWQgYXBwcm9hY2ggbG9hZHMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzIG9yIGV4aXN0aW5nIGRhdGFcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5sb2FkRm9ybURhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAqIFVuaWZpZWQgYXBwcm9hY2ggZm9yIGJvdGggbmV3IGFuZCBleGlzdGluZyByZWNvcmRzXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5SWQgPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG5cbiAgICAgICAgaWYgKGNvcHlJZCkge1xuICAgICAgICAgICAgLy8gQ29weSBvcGVyYXRpb24gLSB1c2UgdGhlIG5ldyBSRVNUZnVsIGNvcHkgZW5kcG9pbnRcbiAgICAgICAgICAgIE9mZldvcmtUaW1lc0FQSS5jYWxsQ3VzdG9tTWV0aG9kKCdjb3B5Jywge2lkOiBjb3B5SWR9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdWNjZXNzOiBwb3B1bGF0ZSBmb3JtIHdpdGggY29waWVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmREYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCByb3V0aW5nIHJ1bGVzXG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZFJvdXRpbmdUYWJsZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbW9kaWZpZWQgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9LCAyNTApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFQSSBlcnJvciAtIHNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOb3JtYWwgbG9hZCAtIGVpdGhlciBleGlzdGluZyByZWNvcmQgb3IgbmV3XG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZFRvTG9hZCA9IG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQgfHwgJyc7XG5cbiAgICAgICAgICAgIC8vIExvYWQgcmVjb3JkIGRhdGEgdmlhIFJFU1QgQVBJIC0gYWx3YXlzIHJldHVybnMgZGF0YSAod2l0aCBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMpXG4gICAgICAgICAgICBPZmZXb3JrVGltZXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkVG9Mb2FkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdWNjZXNzOiBwb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSAoZGVmYXVsdHMgZm9yIG5ldywgcmVhbCBkYXRhIGZvciBleGlzdGluZylcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmREYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCByb3V0aW5nIHJ1bGVzXG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZFJvdXRpbmdUYWJsZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNhdmUgaW5pdGlhbCB2YWx1ZXMgdG8gcHJldmVudCBzYXZlIGJ1dHRvbiBhY3RpdmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgICAgICB9LCAyNTApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFQSSBlcnJvciAtIHNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIGRyb3Bkb3ducyBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHdlZWtkYXkgZHJvcGRvd25zIHdpdGggdmFsdWVzIG1hdGNoaW5nIG9yaWdpbmFsIGltcGxlbWVudGF0aW9uXG4gICAgICAgIGNvbnN0IHdlZWtEYXlzID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJy0xJywgdGV4dDogJy0nIH0gLy8gRGVmYXVsdCBlbXB0eSBvcHRpb25cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkYXlzIDEtNyB1c2luZyB0aGUgc2FtZSBsb2dpYyBhcyBvcmlnaW5hbCBjb250cm9sbGVyXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IDc7IGkrKykge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGRhdGUgZm9yIFwiU3VuZGF5ICtpIGRheXNcIiB0byBtYXRjaCBvcmlnaW5hbCBsb2dpY1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKDIwMjAsIDAsIDUgKyBpKTsgLy8gSmFuIDUsIDIwMjAgd2FzIFN1bmRheVxuICAgICAgICAgICAgY29uc3QgZGF5TmFtZSA9IGRhdGUudG9Mb2NhbGVEYXRlU3RyaW5nKCdlbicsIHsgd2Vla2RheTogJ3Nob3J0JyB9KTtcbiAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgdHJhbnNsYXRpb24gZm9yIHRoZSBkYXkgYWJicmV2aWF0aW9uXG4gICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVkRGF5ID0gZ2xvYmFsVHJhbnNsYXRlW2RheU5hbWVdIHx8IGRheU5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHdlZWtEYXlzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6IHRyYW5zbGF0ZWREYXksXG4gICAgICAgICAgICAgICAgdmFsdWU6IGkudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICB0ZXh0OiB0cmFuc2xhdGVkRGF5XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheUZyb21Ecm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICB2YWx1ZXM6IHdlZWtEYXlzLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlGcm9tRmllbGQudmFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheVRvRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgdmFsdWVzOiB3ZWVrRGF5cyxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9GaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGFjdGlvbiBkcm9wZG93blxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhY3Rpb25Ecm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhY3Rpb25GaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQub25BY3Rpb25DaGFuZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNhbGVuZGFyIHR5cGUgZHJvcGRvd25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsVHlwZURyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbFR5cGVGaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQub25DYWxUeXBlQ2hhbmdlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRXh0ZW5zaW9uIHNlbGVjdG9yIHdpbGwgYmUgaW5pdGlhbGl6ZWQgaW4gcG9wdWxhdGVGb3JtIHdpdGggQVBJIGRhdGFcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIEFQSSBkYXRhXG4gICAgICogU2luZ2xlIHBvaW50IG9mIGluaXRpYWxpemF0aW9uIGFmdGVyIHJlY2VpdmluZyBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBBUEkgcmVzcG9uc2UgZGF0YSAod2l0aCBkZWZhdWx0cyBvciBleGlzdGluZyB2YWx1ZXMpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9yKGRhdGEpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTb3VuZEZpbGVTZWxlY3RvciB3aXRoIGNvbXBsZXRlIEFQSSBkYXRhIGNvbnRleHRcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdChvdXRPZldvcmtUaW1lUmVjb3JkLmF1ZGlvTWVzc2FnZUlkLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLCAgLy8gT3V0IG9mIHdvcmsgdGltZSBtdXN0IGFsd2F5cyBoYXZlIGEgc291bmQgZmlsZVxuICAgICAgICAgICAgZGF0YTogZGF0YSAvLyBQYXNzIGNvbXBsZXRlIEFQSSBkYXRhIGZvciBwcm9wZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBhdWRpb19tZXNzYWdlX2lkIGV4aXN0cywgc2V0IHRoZSB2YWx1ZSB3aXRoIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIGlmIChkYXRhLmF1ZGlvX21lc3NhZ2VfaWQgJiYgZGF0YS5hdWRpb19tZXNzYWdlX2lkX3JlcHJlc2VudCkge1xuICAgICAgICAgICAgU291bmRGaWxlU2VsZWN0b3Iuc2V0VmFsdWUoXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5hdWRpb01lc3NhZ2VJZCwgXG4gICAgICAgICAgICAgICAgZGF0YS5hdWRpb19tZXNzYWdlX2lkLCBcbiAgICAgICAgICAgICAgICBkYXRhLmF1ZGlvX21lc3NhZ2VfaWRfcmVwcmVzZW50XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciB3aXRoIEFQSSBkYXRhXG4gICAgICogU2luZ2xlIHBvaW50IG9mIGluaXRpYWxpemF0aW9uIGFmdGVyIHJlY2VpdmluZyBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBBUEkgcmVzcG9uc2UgZGF0YSAod2l0aCBkZWZhdWx0cyBvciBleGlzdGluZyB2YWx1ZXMpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKGRhdGEpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBFeHRlbnNpb25TZWxlY3RvciBmb2xsb3dpbmcgVjUuMCBwYXR0ZXJuXG4gICAgICAgIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2V4dGVuc2lvbicsIHtcbiAgICAgICAgICAgIHR5cGU6ICdyb3V0aW5nJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUmVjb3JkIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29weSBvcGVyYXRpb25cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgaXNDb3B5ID0gdXJsUGFyYW1zLmhhcygnY29weScpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGNvcHkgb3BlcmF0aW9uLCBjbGVhciBJRCBhbmQgcHJpb3JpdHlcbiAgICAgICAgaWYgKGlzQ29weSkge1xuICAgICAgICAgICAgZGF0YS5pZCA9ICcnO1xuICAgICAgICAgICAgZGF0YS5wcmlvcml0eSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgdW5pcWlkOiBkYXRhLnVuaXFpZCxcbiAgICAgICAgICAgIHByaW9yaXR5OiBkYXRhLnByaW9yaXR5LFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICBjYWxUeXBlOiBkYXRhLmNhbFR5cGUsXG4gICAgICAgICAgICB3ZWVrZGF5X2Zyb206IGRhdGEud2Vla2RheV9mcm9tLFxuICAgICAgICAgICAgd2Vla2RheV90bzogZGF0YS53ZWVrZGF5X3RvLFxuICAgICAgICAgICAgdGltZV9mcm9tOiBkYXRhLnRpbWVfZnJvbSxcbiAgICAgICAgICAgIHRpbWVfdG86IGRhdGEudGltZV90byxcbiAgICAgICAgICAgIGNhbFVybDogZGF0YS5jYWxVcmwsXG4gICAgICAgICAgICBjYWxVc2VyOiBkYXRhLmNhbFVzZXIsXG4gICAgICAgICAgICBjYWxTZWNyZXQ6IGRhdGEuY2FsU2VjcmV0LFxuICAgICAgICAgICAgYWN0aW9uOiBkYXRhLmFjdGlvbixcbiAgICAgICAgICAgIGV4dGVuc2lvbjogZGF0YS5leHRlbnNpb24sXG4gICAgICAgICAgICBhdWRpb19tZXNzYWdlX2lkOiBkYXRhLmF1ZGlvX21lc3NhZ2VfaWQsXG4gICAgICAgICAgICBhbGxvd1Jlc3RyaWN0aW9uOiBkYXRhLmFsbG93UmVzdHJpY3Rpb25cbiAgICAgICAgfSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIGZpZWxkIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgJGNhbFNlY3JldEZpZWxkID0gJCgnI2NhbFNlY3JldCcpO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbFNlY3JldCA9PT0gJ1hYWFhYWCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUGFzc3dvcmQgZXhpc3RzIGJ1dCBpcyBtYXNrZWQsIHNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLnRmX1Bhc3N3b3JkTWFza2VkKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgb3JpZ2luYWwgbWFza2VkIHN0YXRlIHRvIGRldGVjdCBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgICAgICRjYWxTZWNyZXRGaWVsZC5kYXRhKCdvcmlnaW5hbE1hc2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRjYWxTZWNyZXRGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS50Zl9FbnRlclBhc3N3b3JkKTtcbiAgICAgICAgICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmRhdGEoJ29yaWdpbmFsTWFza2VkJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZURyb3Bkb3ducygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIEFQSSBkYXRhIChzaW5nbGUgcG9pbnQgb2YgaW5pdGlhbGl6YXRpb24pXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3Igd2l0aCBBUEkgZGF0YVxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBkcm9wZG93biB2YWx1ZXMgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgICAvLyBTZXQgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLmFjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBjYWxUeXBlIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuY2FsVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuY2FsVHlwZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCB3ZWVrZGF5IGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLndlZWtkYXlfZnJvbSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLndlZWtkYXlfZnJvbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLndlZWtkYXlfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheVRvRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEud2Vla2RheV90byk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBkYXRlcyBpZiBwcmVzZW50XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZGF0ZV9mcm9tKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2V0RGF0ZUZyb21UaW1lc3RhbXAoZGF0YS5kYXRlX2Zyb20sICcjcmFuZ2UtZGF5cy1zdGFydCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5kYXRlX3RvKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2V0RGF0ZUZyb21UaW1lc3RhbXAoZGF0YS5kYXRlX3RvLCAnI3JhbmdlLWRheXMtZW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBmaWVsZCB2aXNpYmlsaXR5IGJhc2VkIG9uIGFjdGlvblxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQub25BY3Rpb25DaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY2FsZW5kYXIgdHlwZSB2aXNpYmlsaXR5XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkNhbFR5cGVDaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgcnVsZXMgdGFiIHZpc2liaWxpdHkgYmFzZWQgb24gYWxsb3dSZXN0cmljdGlvblxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlUnVsZXNUYWIoZGF0YS5hbGxvd1Jlc3RyaWN0aW9uKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nXG4gICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBhY3Rpb24gZHJvcGRvd24gY2hhbmdlXG4gICAgICovXG4gICAgb25BY3Rpb25DaGFuZ2UoKSB7XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FjdGlvbicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ2V4dGVuc2lvbicpIHtcbiAgICAgICAgICAgIC8vIFNob3cgZXh0ZW5zaW9uLCBoaWRlIGF1ZGlvXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25Sb3cuc2hvdygpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYXVkaW9NZXNzYWdlUm93LmhpZGUoKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGF1ZGlvIG1lc3NhZ2VcbiAgICAgICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmNsZWFyKG91dE9mV29ya1RpbWVSZWNvcmQuYXVkaW9NZXNzYWdlSWQpO1xuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gJ3BsYXltZXNzYWdlJykge1xuICAgICAgICAgICAgLy8gU2hvdyBhdWRpbywgaGlkZSBleHRlbnNpb25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGV4dGVuc2lvblJvdy5oaWRlKCk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhdWRpb01lc3NhZ2VSb3cuc2hvdygpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgZXh0ZW5zaW9uIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25GaWVsZC52YWwoJycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY2FsZW5kYXIgdHlwZSBjaGFuZ2VcbiAgICAgKi9cbiAgICBvbkNhbFR5cGVDaGFuZ2UoKSB7XG4gICAgICAgIGNvbnN0IGNhbFR5cGUgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYWxUeXBlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyAndGltZWZyYW1lJyBhbmQgZW1wdHkgc3RyaW5nIG1lYW4gdGltZS1iYXNlZCBjb25kaXRpb25zIChzaG93IG1haW4gdGFiKVxuICAgICAgICBpZiAoIWNhbFR5cGUgfHwgY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScgfHwgY2FsVHlwZSA9PT0gJycpIHtcbiAgICAgICAgICAgIC8vIFNob3cgbWFpbiB0aW1lL2RhdGUgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsZW5kYXJUYWIuaGlkZSgpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kbWFpblRhYi5zaG93KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY2FsVHlwZSA9PT0gJ0NBTERBVicgfHwgY2FsVHlwZSA9PT0gJ0lDQUwnKSB7XG4gICAgICAgICAgICAvLyBTaG93IGNhbGVuZGFyIFVSTCBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxlbmRhclRhYi5zaG93KCk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRtYWluVGFiLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjYWxlbmRhcnMgZm9yIGRhdGUgYW5kIHRpbWUgc2VsZWN0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNhbGVuZGFycygpIHtcbiAgICAgICAgLy8gRGF0ZSByYW5nZSBjYWxlbmRhcnNcbiAgICAgICAgLy8gVXNlIGNsYXNzIHZhcmlhYmxlcyBmb3IgY2FsZW5kYXJzXG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcih7XG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBzdGFydENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydCxcbiAgICAgICAgICAgIHR5cGU6ICdkYXRlJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRpbWUgcmFuZ2UgY2FsZW5kYXJzXG4gICAgICAgIC8vIFVzZSBjbGFzcyB2YXJpYWJsZXMgZm9yIHRpbWUgY2FsZW5kYXJzXG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVTdGFydC5jYWxlbmRhcih7XG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgc3RhcnRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICBhbXBtOiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcm91dGluZyB0YWJsZSBhbmQgYWxsb3dSZXN0cmljdGlvbiBjaGVja2JveFxuICAgICAqL1xuICAgIGluaXRpYWxpemVSb3V0aW5nVGFibGUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgYWxsb3dSZXN0cmljdGlvbiBjaGVja2JveFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhbGxvd1Jlc3RyaWN0aW9uRmllbGQucGFyZW50KCkuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGFsbG93UmVzdHJpY3Rpb25GaWVsZC5wYXJlbnQoKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlUnVsZXNUYWIoaXNDaGVja2VkKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleGlzdGluZyBjaGVja2JveGVzIGluIHRhYmxlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBydWxlcyB0YWIgdmlzaWJpbGl0eVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNDaGVja2VkIC0gV2hldGhlciB0byBzaG93IHJ1bGVzIHRhYlxuICAgICAqL1xuICAgIHRvZ2dsZVJ1bGVzVGFiKGlzQ2hlY2tlZCkge1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIuaGlkZSgpO1xuICAgICAgICAgICAgLy8gU3dpdGNoIHRvIGdlbmVyYWwgdGFiIGlmIHJ1bGVzIHRhYiB3YXMgYWN0aXZlXG4gICAgICAgICAgICBpZiAob3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIuaGFzQ2xhc3MoJ2FjdGl2ZScpKSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiU2VnbWVudC5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYi5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYlNlZ21lbnQuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIHJvdXRpbmcgdGFibGUgd2l0aCBpbmNvbWluZyByb3V0ZXNcbiAgICAgKi9cbiAgICBsb2FkUm91dGluZ1RhYmxlKCkge1xuICAgICAgICAvLyBDbGVhciB0YWJsZVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJ3Rib2R5JykuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBhc3NvY2lhdGVkIElEcyBmcm9tIHJlY29yZCBkYXRhXG4gICAgICAgIGNvbnN0IGFzc29jaWF0ZWRJZHMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZERhdGE/LmluY29taW5nUm91dGVJZHMgfHwgW107XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGFsbCBhdmFpbGFibGUgcm91dGVzIGZyb20gSW5jb21pbmdSb3V0ZXNBUElcbiAgICAgICAgSW5jb21pbmdSb3V0ZXNBUEkuZ2V0TGlzdCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIEdyb3VwIGFuZCBzb3J0IHJvdXRlc1xuICAgICAgICAgICAgICAgIGNvbnN0IGdyb3VwZWRSb3V0ZXMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmdyb3VwQW5kU29ydFJvdXRlcyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgZ3JvdXBlZCByb3V0ZXNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlbmRlckdyb3VwZWRSb3V0ZXMoZ3JvdXBlZFJvdXRlcywgYXNzb2NpYXRlZElkcyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzIHdpdGggZ3JvdXBlZCBjaGVja2JveCBsb2dpY1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZVJvdXRpbmdDaGVja2JveGVzKCk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2hvd0VtcHR5Um91dGVzTWVzc2FnZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdyb3VwIGFuZCBzb3J0IHJvdXRlcyBieSBwcm92aWRlciBhbmQgRElEXG4gICAgICogQHBhcmFtIHtBcnJheX0gcm91dGVzIC0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEdyb3VwZWQgcm91dGVzXG4gICAgICovXG4gICAgZ3JvdXBBbmRTb3J0Um91dGVzKHJvdXRlcykge1xuICAgICAgICBjb25zdCBncm91cHMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgZGVmYXVsdCByb3V0ZSBhbmQgZ3JvdXAgYnkgcHJvdmlkZXJcbiAgICAgICAgcm91dGVzLmZvckVhY2goKHJvdXRlKSA9PiB7XG4gICAgICAgICAgICBpZiAocm91dGUuaWQgPT09IDEgfHwgcm91dGUuaWQgPT09ICcxJykgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBwcm92aWRlcklkID0gcm91dGUucHJvdmlkZXIgfHwgJ25vbmUnO1xuICAgICAgICAgICAgaWYgKCFncm91cHNbcHJvdmlkZXJJZF0pIHtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHBsYWluIHRleHQgcHJvdmlkZXIgbmFtZSBmcm9tIEhUTUwgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgbGV0IHByb3ZpZGVyTmFtZSA9IHJvdXRlLnByb3ZpZGVyaWRfcmVwcmVzZW50IHx8IGdsb2JhbFRyYW5zbGF0ZS5pcl9Ob0Fzc2lnbmVkUHJvdmlkZXI7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIEhUTUwgdGFncyB0byBnZXQgY2xlYW4gcHJvdmlkZXIgbmFtZSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICB0ZW1wRGl2LmlubmVySFRNTCA9IHByb3ZpZGVyTmFtZTtcbiAgICAgICAgICAgICAgICBjb25zdCBjbGVhblByb3ZpZGVyTmFtZSA9IHRlbXBEaXYudGV4dENvbnRlbnQgfHwgdGVtcERpdi5pbm5lclRleHQgfHwgcHJvdmlkZXJOYW1lO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJJZDogcHJvdmlkZXJJZCwgIC8vIFN0b3JlIGFjdHVhbCBwcm92aWRlciBJRFxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck5hbWU6IGNsZWFuUHJvdmlkZXJOYW1lLCAgLy8gQ2xlYW4gbmFtZSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck5hbWVIdG1sOiByb3V0ZS5wcm92aWRlcmlkX3JlcHJlc2VudCB8fCBwcm92aWRlck5hbWUsICAvLyBPcmlnaW5hbCBIVE1MIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlckRpc2FibGVkOiByb3V0ZS5wcm92aWRlckRpc2FibGVkIHx8IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsUnVsZXM6IFtdLFxuICAgICAgICAgICAgICAgICAgICBzcGVjaWZpY1J1bGVzOiB7fVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNlcGFyYXRlIGdlbmVyYWwgcnVsZXMgKG5vIERJRCkgZnJvbSBzcGVjaWZpYyBydWxlcyAod2l0aCBESUQpXG4gICAgICAgICAgICBpZiAoIXJvdXRlLm51bWJlciB8fCByb3V0ZS5udW1iZXIgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLmdlbmVyYWxSdWxlcy5wdXNoKHJvdXRlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlc1tyb3V0ZS5udW1iZXJdKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5zcGVjaWZpY1J1bGVzW3JvdXRlLm51bWJlcl0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXNbcm91dGUubnVtYmVyXS5wdXNoKHJvdXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTb3J0IHJ1bGVzIHdpdGhpbiBlYWNoIGdyb3VwIGJ5IHByaW9yaXR5XG4gICAgICAgIE9iamVjdC5rZXlzKGdyb3VwcykuZm9yRWFjaChwcm92aWRlcklkID0+IHtcbiAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5nZW5lcmFsUnVsZXMuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXMpLmZvckVhY2goZGlkID0+IHtcbiAgICAgICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlc1tkaWRdLnNvcnQoKGEsIGIpID0+IGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBncm91cHM7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgZ3JvdXBlZCByb3V0ZXMgaW4gdGhlIHRhYmxlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGdyb3VwZWRSb3V0ZXMgLSBHcm91cGVkIHJvdXRlcyBvYmplY3RcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhc3NvY2lhdGVkSWRzIC0gQXJyYXkgb2YgYXNzb2NpYXRlZCByb3V0ZSBJRHNcbiAgICAgKi9cbiAgICByZW5kZXJHcm91cGVkUm91dGVzKGdyb3VwZWRSb3V0ZXMsIGFzc29jaWF0ZWRJZHMpIHtcbiAgICAgICAgY29uc3QgdGJvZHkgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJ3Rib2R5Jyk7XG4gICAgICAgIGxldCBpc0ZpcnN0R3JvdXAgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBlZFJvdXRlcykuZm9yRWFjaChwcm92aWRlcklkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGdyb3VwID0gZ3JvdXBlZFJvdXRlc1twcm92aWRlcklkXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIHByb3ZpZGVyIGdyb3VwIGhlYWRlclxuICAgICAgICAgICAgaWYgKCFpc0ZpcnN0R3JvdXApIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgc2VwYXJhdG9yIGJldHdlZW4gZ3JvdXBzXG4gICAgICAgICAgICAgICAgdGJvZHkuYXBwZW5kKCc8dHIgY2xhc3M9XCJwcm92aWRlci1zZXBhcmF0b3JcIj48dGQgY29sc3Bhbj1cIjNcIj48ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjwvdGQ+PC90cj4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlzRmlyc3RHcm91cCA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgcHJvdmlkZXIgaGVhZGVyIHJvdyAtIHVzZSBwcm92aWRlck5hbWVIdG1sIGZvciByaWNoIGRpc3BsYXlcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZChgXG4gICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwicHJvdmlkZXItaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjb2xzcGFuPVwiM1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z3JvdXAucHJvdmlkZXJOYW1lSHRtbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtncm91cC5wcm92aWRlckRpc2FibGVkID8gJzxzcGFuIGNsYXNzPVwidWkgbWluaSByZWQgbGFiZWxcIj5EaXNhYmxlZDwvc3Bhbj4nIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbmRlciBnZW5lcmFsIHJ1bGVzIGZpcnN0XG4gICAgICAgICAgICBncm91cC5nZW5lcmFsUnVsZXMuZm9yRWFjaCgocm91dGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmNyZWF0ZVJvdXRlUm93KHJvdXRlLCBhc3NvY2lhdGVkSWRzLCAncnVsZS1nZW5lcmFsJyk7XG4gICAgICAgICAgICAgICAgdGJvZHkuYXBwZW5kKHJvdyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVuZGVyIHNwZWNpZmljIHJ1bGVzIGdyb3VwZWQgYnkgRElEXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhncm91cC5zcGVjaWZpY1J1bGVzKS5zb3J0KCkuZm9yRWFjaChkaWQgPT4ge1xuICAgICAgICAgICAgICAgIGdyb3VwLnNwZWNpZmljUnVsZXNbZGlkXS5mb3JFYWNoKChyb3V0ZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNGaXJzdEluRElEID0gaW5kZXggPT09IDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IG91dE9mV29ya1RpbWVSZWNvcmQuY3JlYXRlUm91dGVSb3cocm91dGUsIGFzc29jaWF0ZWRJZHMsICdydWxlLXNwZWNpZmljJywgaXNGaXJzdEluRElEKTtcbiAgICAgICAgICAgICAgICAgICAgdGJvZHkuYXBwZW5kKHJvdyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBzaW5nbGUgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJvdXRlIC0gUm91dGUgb2JqZWN0XG4gICAgICogQHBhcmFtIHtBcnJheX0gYXNzb2NpYXRlZElkcyAtIEFzc29jaWF0ZWQgcm91dGUgSURzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJ1bGVDbGFzcyAtIENTUyBjbGFzcyBmb3IgdGhlIHJ1bGUgdHlwZVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gc2hvd0RJREluZGljYXRvciAtIFdoZXRoZXIgdG8gc2hvdyBESUQgaW5kaWNhdG9yXG4gICAgICogQHJldHVybnMge1N0cmluZ30gSFRNTCByb3dcbiAgICAgKi9cbiAgICBjcmVhdGVSb3V0ZVJvdyhyb3V0ZSwgYXNzb2NpYXRlZElkcywgcnVsZUNsYXNzID0gJycsIHNob3dESURJbmRpY2F0b3IgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBhc3NvY2lhdGVkSWRzLmluY2x1ZGVzKHBhcnNlSW50KHJvdXRlLmlkKSk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyRGlzYWJsZWQgPSByb3V0ZS5wcm92aWRlckRpc2FibGVkID8gJ2Rpc2FibGVkJyA6ICcnO1xuICAgICAgICBsZXQgcnVsZURlc2NyaXB0aW9uID0gcm91dGUucnVsZV9yZXByZXNlbnQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbnN1cmUgcHJvdmlkZXIgSUQgaXMgY2xlYW4gKG5vIEhUTUwpXG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSByb3V0ZS5wcm92aWRlciB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB2aXN1YWwgaW5kaWNhdG9ycyBmb3IgcnVsZSB0eXBlXG4gICAgICAgIGlmIChydWxlQ2xhc3MgPT09ICdydWxlLXNwZWNpZmljJykge1xuICAgICAgICAgICAgLy8gQWRkIGluZGVudCBhbmQgYXJyb3cgZm9yIHNwZWNpZmljIHJ1bGVzXG4gICAgICAgICAgICBydWxlRGVzY3JpcHRpb24gPSBgPHNwYW4gY2xhc3M9XCJydWxlLWluZGVudFwiPuKGszwvc3Bhbj4gJHtydWxlRGVzY3JpcHRpb259YDtcbiAgICAgICAgfSBlbHNlIGlmIChydWxlQ2xhc3MgPT09ICdydWxlLWdlbmVyYWwnKSB7XG4gICAgICAgICAgICAvLyBBZGQgaWNvbiBmb3IgZ2VuZXJhbCBydWxlc1xuICAgICAgICAgICAgcnVsZURlc2NyaXB0aW9uID0gYDxpIGNsYXNzPVwicmFuZG9tIGljb25cIj48L2k+ICR7cnVsZURlc2NyaXB0aW9ufWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG5vdGVEaXNwbGF5ID0gcm91dGUubm90ZSAmJiByb3V0ZS5ub3RlLmxlbmd0aCA+IDIwID8gXG4gICAgICAgICAgICBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uXCIgZGF0YS1jb250ZW50PVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocm91dGUubm90ZSl9XCIgZGF0YS12YXJpYXRpb249XCJ3aWRlXCIgZGF0YS1wb3NpdGlvbj1cInRvcCByaWdodFwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZmlsZSB0ZXh0IGljb25cIj48L2k+XG4gICAgICAgICAgICA8L2Rpdj5gIDogXG4gICAgICAgICAgICBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocm91dGUubm90ZSB8fCAnJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEYXRhIGF0dHJpYnV0ZXMgYWxyZWFkeSBzYWZlIGZyb20gQVBJXG4gICAgICAgIGNvbnN0IHNhZmVQcm92aWRlcklkID0gcHJvdmlkZXJJZDtcbiAgICAgICAgY29uc3Qgc2FmZURpZCA9IHJvdXRlLm51bWJlciB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8dHIgY2xhc3M9XCJydWxlLXJvdyAke3J1bGVDbGFzc31cIiBpZD1cIiR7cm91dGUuaWR9XCIgXG4gICAgICAgICAgICAgICAgZGF0YS1wcm92aWRlcj1cIiR7c2FmZVByb3ZpZGVySWR9XCIgXG4gICAgICAgICAgICAgICAgZGF0YS1kaWQ9XCIke3NhZmVEaWR9XCI+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiY29sbGFwc2luZ1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZml0dGVkIHRvZ2dsZSBjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtZGlkPVwiJHtzYWZlRGlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcHJvdmlkZXI9XCJ7JHtzYWZlUHJvdmlkZXJJZH19XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgJHtpc0NoZWNrZWQgPyAnY2hlY2tlZCcgOiAnJ30gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInJvdXRlLSR7cm91dGUuaWR9XCIgZGF0YS12YWx1ZT1cIiR7cm91dGUuaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCIke3Byb3ZpZGVyRGlzYWJsZWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICR7cnVsZURlc2NyaXB0aW9uIHx8ICc8c3BhbiBjbGFzcz1cInRleHQtbXV0ZWRcIj5ObyBkZXNjcmlwdGlvbjwvc3Bhbj4nfVxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiaGlkZS1vbi1tb2JpbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtub3RlRGlzcGxheX1cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgPC90cj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgZW1wdHkgcm91dGVzIG1lc3NhZ2UgaW4gdGFibGVcbiAgICAgKi9cbiAgICBzaG93RW1wdHlSb3V0ZXNNZXNzYWdlKCkge1xuICAgICAgICBjb25zdCBlbXB0eVJvdyA9IGBcbiAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjNcIiBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmlyX05vSW5jb21pbmdSb3V0ZXN9XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgIGA7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQoZW1wdHlSb3cpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByb3V0aW5nIGNoZWNrYm94ZXMgd2l0aCBncm91cGVkIGxvZ2ljXG4gICAgICogV2hlbiBjaGVja2luZy91bmNoZWNraW5nIHJ1bGVzIHdpdGggc2FtZSBwcm92aWRlciBhbmQgRElEXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJvdXRpbmdDaGVja2JveGVzKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhvdmVyIGVmZmVjdCB0byBoaWdobGlnaHQgcmVsYXRlZCBydWxlc1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLmhvdmVyKFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkcm93LmF0dHIoJ2RhdGEtcHJvdmlkZXInKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkaWQgPSAkcm93LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHByZXZpb3VzIGhpZ2hsaWdodHNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLnJlbW92ZUNsYXNzKCdyZWxhdGVkLWhpZ2hsaWdodCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhpZ2hsaWdodCBhbGwgcnVsZXMgd2l0aCBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzZWxlY3RvciA9IGAucnVsZS1yb3dbZGF0YS1wcm92aWRlcj1cIiR7cHJvdmlkZXJ9XCJdYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGhvdmVyaW5nIG9uIHNwZWNpZmljIERJRCBydWxlLCBoaWdobGlnaHQgYWxsIHdpdGggc2FtZSBESURcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9IGBbZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgaG92ZXJpbmcgb24gZ2VuZXJhbCBydWxlLCBoaWdobGlnaHQgYWxsIGdlbmVyYWwgcnVsZXMgZm9yIHRoaXMgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9ICdbZGF0YS1kaWQ9XCJcIl0nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCAkcmVsYXRlZFJvd3MgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICAkcmVsYXRlZFJvd3MuYWRkQ2xhc3MoJ3JlbGF0ZWQtaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBoaWdobGlnaHRzIG9uIG1vdXNlIGxlYXZlXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCcucnVsZS1yb3cnKS5yZW1vdmVDbGFzcygncmVsYXRlZC1oaWdobGlnaHQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3ggYmVoYXZpb3Igd2l0aCB0b29sdGlwc1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy51aS5jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgZGlkID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlciA9ICRjaGVja2JveC5hdHRyKCdkYXRhLXByb3ZpZGVyJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCB0b29sdGlwIHRvIGV4cGxhaW4gZ3JvdXBpbmdcbiAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgbGV0IHRvb2x0aXBUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGRpZCkge1xuICAgICAgICAgICAgICAgICAgICB0b29sdGlwVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS50Zl9Ub29sdGlwU3BlY2lmaWNSdWxlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnRmX1Rvb2x0aXBHZW5lcmFsUnVsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNoZWNrYm94LmF0dHIoJ2RhdGEtY29udGVudCcsIHRvb2x0aXBUZXh0KTtcbiAgICAgICAgICAgICAgICAkY2hlY2tib3guYXR0cignZGF0YS12YXJpYXRpb24nLCAndGlueScpO1xuICAgICAgICAgICAgICAgICRjaGVja2JveC5wb3B1cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3ggY2hhbmdlIGJlaGF2aW9yXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcykucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlkID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkY2hlY2tib3guYXR0cignZGF0YS1wcm92aWRlcicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNraXAgc3luY2hyb25pemF0aW9uIGZvciAnbm9uZScgcHJvdmlkZXIgKGRpcmVjdCBjYWxscylcbiAgICAgICAgICAgICAgICBpZiAoIXByb3ZpZGVyIHx8IHByb3ZpZGVyID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZ3JvdXBlZCBsb2dpYyByZXF1aXJlbWVudHNcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYCNyb3V0aW5nLXRhYmxlIC51aS5jaGVja2JveFtkYXRhLXByb3ZpZGVyPVwiJHtwcm92aWRlcn1cIl1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpZCAmJiBkaWQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSdWxlIHdpdGggc3BlY2lmaWMgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBjaGVja2luZyBhIHJ1bGUgd2l0aCBESUQsIGNoZWNrIGFsbCBydWxlcyB3aXRoIHNhbWUgcHJvdmlkZXIgYW5kIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yV2l0aERJRCA9IGAke3NlbGVjdG9yfVtkYXRhLWRpZD1cIiR7ZGlkfVwiXWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChzZWxlY3RvcldpdGhESUQpLm5vdCgkY2hlY2tib3gpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHVuY2hlY2tpbmcgYSBydWxlIHdpdGggRElEOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIFVuY2hlY2sgYWxsIHJ1bGVzIHdpdGggc2FtZSBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvcldpdGhESUQgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JXaXRoRElEKS5ub3QoJGNoZWNrYm94KS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDIuIEFsc28gdW5jaGVjayBnZW5lcmFsIHJ1bGVzICh3aXRob3V0IERJRCkgZm9yIHNhbWUgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvckdlbmVyYWwgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCJcIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JHZW5lcmFsKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2VuZXJhbCBydWxlIHdpdGhvdXQgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gdW5jaGVja2luZyBnZW5lcmFsIHJ1bGUsIG9ubHkgdW5jaGVjayBvdGhlciBnZW5lcmFsIHJ1bGVzIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBjaGVja2luZyBnZW5lcmFsIHJ1bGUsIGNoZWNrIGFsbCBnZW5lcmFsIHJ1bGVzIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZVxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGVyYXNlIGJ1dHRvbnMgZm9yIGRhdGUvdGltZSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXJhc2VycygpIHtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJhc2VEYXRlc0J0bi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZVdlZWtkYXlzQnRuLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlGcm9tRHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZVRpbWVwZXJpb2RCdG4ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZXNjcmlwdGlvbiBmaWVsZCB3aXRoIGF1dG8tcmVzaXplXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlc2NyaXB0aW9uRmllbGQoKSB7XG4gICAgICAgIC8vIEF1dG8tcmVzaXplIG9uIGlucHV0XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgICAgICAgIHRoaXMuc3R5bGUuaGVpZ2h0ID0gKHRoaXMuc2Nyb2xsSGVpZ2h0KSArICdweCc7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCByZXNpemVcbiAgICAgICAgaWYgKG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGVscGVyIHRvIHNldCBkYXRlIGZyb20gdGltZXN0YW1wIG9yIGRhdGUgc3RyaW5nXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSBkYXRlVmFsdWUgLSBVbml4IHRpbWVzdGFtcCBvciBkYXRlIHN0cmluZyAoWVlZWS1NTS1ERClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3JcbiAgICAgKi9cbiAgICBzZXREYXRlRnJvbVRpbWVzdGFtcChkYXRlVmFsdWUsIHNlbGVjdG9yKSB7XG4gICAgICAgIGlmICghZGF0ZVZhbHVlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGEgZGF0ZSBzdHJpbmcgaW4gWVlZWS1NTS1ERCBmb3JtYXQgZmlyc3RcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlVmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgZGF0ZSBmb3JtYXQgWVlZWS1NTS1ERFxuICAgICAgICAgICAgaWYgKC9eXFxkezR9LVxcZHsyfS1cXGR7Mn0kLy50ZXN0KGRhdGVWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzTmFOKGRhdGUuZ2V0VGltZSgpKSkge1xuICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJ5IHRvIHBhcnNlIGFzIFVuaXggdGltZXN0YW1wIChhbGwgZGlnaXRzKVxuICAgICAgICAgICAgaWYgKC9eXFxkKyQvLnRlc3QoZGF0ZVZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IHBhcnNlSW50KGRhdGVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRpbWVzdGFtcCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBVbml4IHRpbWVzdGFtcCB0byBEYXRlXG4gICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3IpLmNhbGVuZGFyKCdzZXQgZGF0ZScsIG5ldyBEYXRlKHRpbWVzdGFtcCAqIDEwMDApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZGF0ZVZhbHVlID09PSAnbnVtYmVyJyAmJiBkYXRlVmFsdWUgPiAwKSB7XG4gICAgICAgICAgICAvLyBOdW1lcmljIFVuaXggdGltZXN0YW1wXG4gICAgICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBuZXcgRGF0ZShkYXRlVmFsdWUgKiAxMDAwKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gZm9yIHBhaXJlZCBmaWVsZHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gRm9ybSBkYXRhXG4gICAgICogQHJldHVybnMge29iamVjdHxib29sZWFufSBSZXN1bHQgb2JqZWN0IG9yIGZhbHNlIGlmIHZhbGlkYXRpb24gZmFpbHNcbiAgICAgKi9cbiAgICBjdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KSB7XG4gICAgICAgIC8vIENoZWNrIGRhdGUgZmllbGRzIC0gYm90aCBzaG91bGQgYmUgZmlsbGVkIG9yIGJvdGggZW1wdHlcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS5kYXRlX2Zyb20gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gPT09ICcnKSB8fFxuICAgICAgICAgICAgKHJlc3VsdC5kYXRhLmRhdGVfdG8gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9PT0gJycpKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdlZWtkYXkgZmllbGRzIC0gYm90aCBzaG91bGQgYmUgZmlsbGVkIG9yIGJvdGggZW1wdHlcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMScpIHx8XG4gICAgICAgICAgICAocmVzdWx0LmRhdGEud2Vla2RheV90byA+IDAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID09PSAnLTEnKSkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB0aW1lIGZpZWxkcyAtIGJvdGggc2hvdWxkIGJlIGZpbGxlZCBvciBib3RoIGVtcHR5XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApIHx8XG4gICAgICAgICAgICAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHRpbWVmcmFtZSB0eXBlLCBjaGVjayB0aGF0IGF0IGxlYXN0IG9uZSBjb25kaXRpb24gaXMgc3BlY2lmaWVkXG4gICAgICAgIGNvbnN0IGNhbFR5cGUgPSByZXN1bHQuZGF0YS5jYWxUeXBlIHx8ICd0aW1lZnJhbWUnO1xuICAgICAgICBpZiAoY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScgfHwgY2FsVHlwZSA9PT0gJycpIHtcbiAgICAgICAgICAgIGNvbnN0IGhhc0RhdGVSYW5nZSA9IHJlc3VsdC5kYXRhLmRhdGVfZnJvbSAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV90byAhPT0gJyc7XG4gICAgICAgICAgICBjb25zdCBoYXNXZWVrZGF5UmFuZ2UgPSByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPiAwO1xuICAgICAgICAgICAgY29uc3QgaGFzVGltZVJhbmdlID0gcmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWhhc0RhdGVSYW5nZSAmJiAhaGFzV2Vla2RheVJhbmdlICYmICFoYXNUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQpLnNob3coKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgc2VuZGluZyBmb3JtXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R8Ym9vbGVhbn0gVXBkYXRlZCBzZXR0aW5ncyBvciBmYWxzZVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyBmcm9tICdvbicvdW5kZWZpbmVkIHRvIHRydWUvZmFsc2VcbiAgICAgICAgLy8gUHJvY2VzcyBhbGwgcm91dGUgY2hlY2tib3hlc1xuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdyb3V0ZS0nKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2tleV0gPSByZXN1bHQuZGF0YVtrZXldID09PSAnb24nIHx8IHJlc3VsdC5kYXRhW2tleV0gPT09IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgIGlmICgnYWxsb3dSZXN0cmljdGlvbicgaW4gcmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFsbG93UmVzdHJpY3Rpb24gPSByZXN1bHQuZGF0YS5hbGxvd1Jlc3RyaWN0aW9uID09PSAnb24nIHx8IHJlc3VsdC5kYXRhLmFsbG93UmVzdHJpY3Rpb24gPT09IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjYWxUeXBlIGNvbnZlcnNpb24gKG1hdGNoZXMgb2xkIGNvbnRyb2xsZXI6ICgkZGF0YVskbmFtZV0gPT09ICd0aW1lZnJhbWUnKSA/ICcnIDogJGRhdGFbJG5hbWVdKVxuICAgICAgICAvLyBGb3Igc2F2aW5nIHdlIGNvbnZlcnQgJ3RpbWVmcmFtZScgdG8gZW1wdHkgc3RyaW5nXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5jYWxUeXBlID09PSAndGltZWZyYW1lJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuY2FsVHlwZSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgd2Vla2RheSB2YWx1ZXMgKG1hdGNoZXMgb2xkIGNvbnRyb2xsZXI6ICgkZGF0YVskbmFtZV0gPCAxKSA/IG51bGwgOiAkZGF0YVskbmFtZV0pXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPT09ICctMScgfHwgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tIDwgMSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMScgfHwgcmVzdWx0LmRhdGEud2Vla2RheV90byA8IDEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPSAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIGZpZWxkIC0gaWYgdXNlciBkaWRuJ3QgY2hhbmdlIHRoZSBtYXNrZWQgcGFzc3dvcmQsIGtlZXAgaXQgYXMgaXNcbiAgICAgICAgLy8gVGhlIGJhY2tlbmQgd2lsbCByZWNvZ25pemUgJ1hYWFhYWCcgYW5kIHdvbid0IHVwZGF0ZSB0aGUgcGFzc3dvcmRcbiAgICAgICAgLy8gSWYgdXNlciBjbGVhcmVkIHRoZSBmaWVsZCBvciBlbnRlcmVkIG5ldyB2YWx1ZSwgc2VuZCB0aGF0XG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5jYWxTZWNyZXQgPT09ICdYWFhYWFgnKSB7XG4gICAgICAgICAgICAvLyBVc2VyIGRpZG4ndCBjaGFuZ2UgdGhlIG1hc2tlZCBwYXNzd29yZCwgYmFja2VuZCB3aWxsIGtlZXAgZXhpc3RpbmcgdmFsdWVcbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQuZGF0YS5jYWxTZWNyZXQgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBVc2VyIGNsZWFyZWQgdGhlIHBhc3N3b3JkIGZpZWxkLCBiYWNrZW5kIHdpbGwgY2xlYXIgdGhlIHBhc3N3b3JkXG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlIHNlbmQgdGhlIG5ldyBwYXNzd29yZCB2YWx1ZSBhcyBlbnRlcmVkXG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGltZSB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIGNhbGVuZGFyIHR5cGVcbiAgICAgICAgY29uc3QgY2FsVHlwZSA9IHJlc3VsdC5kYXRhLmNhbFR5cGUgfHwgJ3RpbWVmcmFtZSc7XG4gICAgICAgIGlmIChjYWxUeXBlID09PSAnJyB8fCBjYWxUeXBlID09PSAndGltZWZyYW1lJykge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLnRpbWVmcm9tLnJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC5hZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXM7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZXRvLnJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC5hZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZWZyb20ucnVsZXMgPSBbXTtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy50aW1ldG8ucnVsZXMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBkYXRlcyB0byB0aW1lc3RhbXBzXG4gICAgICAgIGNvbnN0IGRhdGVGcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIGlmIChkYXRlRnJvbSkge1xuICAgICAgICAgICAgZGF0ZUZyb20uc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5kYXRlX2Zyb20gPSBNYXRoLmZsb29yKGRhdGVGcm9tLmdldFRpbWUoKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRhdGVUbyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignZ2V0IGRhdGUnKTtcbiAgICAgICAgaWYgKGRhdGVUbykge1xuICAgICAgICAgICAgZGF0ZVRvLnNldEhvdXJzKDIzLCA1OSwgNTksIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV90byA9IE1hdGguZmxvb3IoZGF0ZVRvLmdldFRpbWUoKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxlY3Qgc2VsZWN0ZWQgaW5jb21pbmcgcm91dGVzXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkUm91dGVzID0gW107XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgcm91dGVJZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKHJvdXRlSWQpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZFJvdXRlcy5wdXNoKHJvdXRlSWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmVzdWx0LmRhdGEuaW5jb21pbmdSb3V0ZUlkcyA9IHNlbGVjdGVkUm91dGVzO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgYWN0aW9uLWRlcGVuZGVudCBmaWVsZHMgYmFzZWQgb24gc2VsZWN0aW9uXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5hY3Rpb24gPT09ICdleHRlbnNpb24nKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdWRpb19tZXNzYWdlX2lkID0gJyc7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzdWx0LmRhdGEuYWN0aW9uID09PSAncGxheW1lc3NhZ2UnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5leHRlbnNpb24gPSAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUnVuIGN1c3RvbSB2YWxpZGF0aW9uIGZvciBwYWlyZWQgZmllbGRzXG4gICAgICAgIHJldHVybiBvdXRPZldvcmtUaW1lUmVjb3JkLmN1c3RvbVZhbGlkYXRlRm9ybShyZXN1bHQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGlmIHRoaXMgd2FzIGEgbmV3IHJlY29yZFxuICAgICAgICAgICAgaWYgKCFvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1vZmYtd29yay10aW1lcy9tb2RpZnkvJHtyZXNwb25zZS5kYXRhLmlkfWA7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQgPSByZXNwb25zZS5kYXRhLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWxvYWQgZGF0YSB0byBlbnN1cmUgY29uc2lzdGVuY3lcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZEZvcm1EYXRhKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9b2ZmLXdvcmstdGltZXMvc2F2ZWA7XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBPZmZXb3JrVGltZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHMgdXNpbmcgT2ZmV29ya1RpbWVzVG9vbHRpcE1hbmFnZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIERlbGVnYXRlIHRvb2x0aXAgaW5pdGlhbGl6YXRpb24gdG8gT2ZmV29ya1RpbWVzVG9vbHRpcE1hbmFnZXJcbiAgICAgICAgT2ZmV29ya1RpbWVzVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSB0aGF0IGNoZWNrcyBpZiBhIHZhbHVlIGlzIG5vdCBlbXB0eSBiYXNlZCBvbiBhIHNwZWNpZmljIGFjdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIGJlIHZhbGlkYXRlZFxuICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbiAtIFRoZSBhY3Rpb24gdG8gY29tcGFyZSBhZ2FpbnN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHZhbGlkLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmN1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlID0gZnVuY3Rpb24odmFsdWUsIGFjdGlvbikge1xuICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDAgJiYgb3V0T2ZXb3JrVGltZVJlY29yZC4kYWN0aW9uRmllbGQudmFsKCkgPT09IGFjdGlvbikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBjYWxlbmRhciBVUkwgZmllbGRcbiAqIFZhbGlkYXRlcyBVUkwgb25seSB3aGVuIGNhbGVuZGFyIHR5cGUgaXMgbm90ICdub25lJyBvciAndGltZSdcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmN1c3RvbU5vdEVtcHR5SWZDYWxUeXBlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBjb25zdCBjYWxUeXBlID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsVHlwZUZpZWxkLnZhbCgpO1xuICAgIFxuICAgIC8vIElmIGNhbGVuZGFyIHR5cGUgaXMgdGltZWZyYW1lIG9yIHRpbWUsIFVSTCBpcyBub3QgcmVxdWlyZWRcbiAgICBpZiAoIWNhbFR5cGUgfHwgY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScgfHwgY2FsVHlwZSA9PT0gJ3RpbWUnKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBcbiAgICAvLyBJZiBjYWxlbmRhciB0eXBlIGlzIENBTERBViBvciBJQ0FMLCB2YWxpZGF0ZSBVUkxcbiAgICBpZiAoIXZhbHVlIHx8IHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIC8vIENoZWNrIGlmIGl0J3MgYSB2YWxpZCBVUkxcbiAgICB0cnkge1xuICAgICAgICBuZXcgVVJMKHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoXykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuLy8gSW5pdGlhbGl6ZSB3aGVuIERPTSBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZSgpO1xufSk7Il19