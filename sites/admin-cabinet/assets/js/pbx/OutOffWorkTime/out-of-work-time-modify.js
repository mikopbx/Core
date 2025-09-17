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
   IncomingRoutesAPI OutOffWorkTimeAPI DynamicDropdownBuilder ExtensionSelector */

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
  $actionDropdown: $('.action-select'),
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
      OutOffWorkTimeAPI.callCustomMethod('copy', {
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

      OutOffWorkTimeAPI.getRecord(recordIdToLoad, function (response) {
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
          $calSecretField.attr('placeholder', globalTranslate.tf_PasswordMasked || 'Password saved (enter new to change)'); // Store original masked state to detect changes

          $calSecretField.data('originalMasked', true);
        } else {
          $calSecretField.attr('placeholder', globalTranslate.tf_EnterPassword || 'Enter password');
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
        var providerName = route.providerid_represent || globalTranslate.ir_NoAssignedProvider || 'Direct calls'; // Remove HTML tags to get clean provider name for display

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
    var emptyRow = "\n            <tr>\n                <td colspan=\"3\" class=\"center aligned\">\n                    ".concat(globalTranslate.ir_NoIncomingRoutes || 'No incoming routes configured', "\n                </td>\n            </tr>\n        ");
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
          tooltipText = globalTranslate.tf_TooltipSpecificRule || 'This rule applies to calls to specific number. Related rules will be synchronized.';
        } else {
          tooltipText = globalTranslate.tf_TooltipGeneralRule || 'This rule applies to all calls from provider. Related rules will be synchronized.';
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
        var newUrl = "".concat(globalRootUrl, "out-off-work-time/modify/").concat(response.data.id);
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
    Form.url = "".concat(globalRootUrl, "out-off-work-time/save");
    Form.validateRules = outOfWorkTimeRecord.validateRules;
    Form.cbBeforeSendForm = outOfWorkTimeRecord.cbBeforeSendForm;
    Form.cbAfterSendForm = outOfWorkTimeRecord.cbAfterSendForm; // REST API integration

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = OutOffWorkTimeAPI;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJvdXRPZldvcmtUaW1lUmVjb3JkIiwiJGZvcm1PYmoiLCIkIiwicmVjb3JkSWQiLCJyZWNvcmREYXRhIiwiJHRpbWVfZnJvbSIsIiR0aW1lX3RvIiwiJHJ1bGVzVGFibGUiLCIkaWRGaWVsZCIsIiR3ZWVrZGF5RnJvbUZpZWxkIiwiJHdlZWtkYXlUb0ZpZWxkIiwiJGFjdGlvbkZpZWxkIiwiJGNhbFR5cGVGaWVsZCIsIiRleHRlbnNpb25GaWVsZCIsIiRhbGxvd1Jlc3RyaWN0aW9uRmllbGQiLCIkZGVzY3JpcHRpb25GaWVsZCIsIiRhY3Rpb25Ecm9wZG93biIsIiRjYWxUeXBlRHJvcGRvd24iLCIkd2Vla2RheUZyb21Ecm9wZG93biIsIiR3ZWVrZGF5VG9Ecm9wZG93biIsIiR0YWJNZW51IiwiJHJ1bGVzVGFiIiwiJGdlbmVyYWxUYWIiLCIkcnVsZXNUYWJTZWdtZW50IiwiJGdlbmVyYWxUYWJTZWdtZW50IiwiJGV4dGVuc2lvblJvdyIsIiRhdWRpb01lc3NhZ2VSb3ciLCIkY2FsZW5kYXJUYWIiLCIkbWFpblRhYiIsIiRyYW5nZURheXNTdGFydCIsIiRyYW5nZURheXNFbmQiLCIkcmFuZ2VUaW1lU3RhcnQiLCIkcmFuZ2VUaW1lRW5kIiwiJGVyYXNlRGF0ZXNCdG4iLCIkZXJhc2VXZWVrZGF5c0J0biIsIiRlcmFzZVRpbWVwZXJpb2RCdG4iLCIkZXJyb3JNZXNzYWdlIiwiYXVkaW9NZXNzYWdlSWQiLCJhZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXMiLCJ0eXBlIiwidmFsdWUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJ0Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsIiwidmFsaWRhdGVSdWxlcyIsImV4dGVuc2lvbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJhdWRpb19tZXNzYWdlX2lkIiwidGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSIsImNhbFVybCIsInRmX1ZhbGlkYXRlQ2FsVXJpIiwidGltZWZyb20iLCJvcHRpb25hbCIsInRpbWV0byIsImluaXRpYWxpemUiLCJ2YWwiLCJ0YWIiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVDYWxlbmRhcnMiLCJpbml0aWFsaXplUm91dGluZ1RhYmxlIiwiaW5pdGlhbGl6ZUVyYXNlcnMiLCJpbml0aWFsaXplRGVzY3JpcHRpb25GaWVsZCIsImluaXRpYWxpemVUb29sdGlwcyIsImxvYWRGb3JtRGF0YSIsImFkZENsYXNzIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5SWQiLCJnZXQiLCJPdXRPZmZXb3JrVGltZUFQSSIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwicG9wdWxhdGVGb3JtIiwibG9hZFJvdXRpbmdUYWJsZSIsInNldFRpbWVvdXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJtZXNzYWdlcyIsImVycm9yIiwiZXJyb3JNZXNzYWdlIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJyZWNvcmRJZFRvTG9hZCIsImdldFJlY29yZCIsInNhdmVJbml0aWFsVmFsdWVzIiwiY2hlY2tWYWx1ZXMiLCJpbml0aWFsaXplRHJvcGRvd25zIiwid2Vla0RheXMiLCJ0ZXh0IiwiaSIsImRhdGUiLCJEYXRlIiwiZGF5TmFtZSIsInRvTG9jYWxlRGF0ZVN0cmluZyIsIndlZWtkYXkiLCJ0cmFuc2xhdGVkRGF5IiwicHVzaCIsIm5hbWUiLCJ0b1N0cmluZyIsImRyb3Bkb3duIiwidmFsdWVzIiwib25DaGFuZ2UiLCJvbkFjdGlvbkNoYW5nZSIsIm9uQ2FsVHlwZUNoYW5nZSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvciIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiaW5pdCIsImNhdGVnb3J5IiwiaW5jbHVkZUVtcHR5IiwiYXVkaW9fbWVzc2FnZV9pZF9yZXByZXNlbnQiLCJzZXRWYWx1ZSIsImluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvciIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaXNDb3B5IiwiaGFzIiwicHJpb3JpdHkiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsInVuaXFpZCIsImRlc2NyaXB0aW9uIiwiY2FsVHlwZSIsIndlZWtkYXlfZnJvbSIsIndlZWtkYXlfdG8iLCJ0aW1lX2Zyb20iLCJ0aW1lX3RvIiwiY2FsVXNlciIsImNhbFNlY3JldCIsImFjdGlvbiIsImFsbG93UmVzdHJpY3Rpb24iLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCIkY2FsU2VjcmV0RmllbGQiLCJhdHRyIiwidGZfUGFzc3dvcmRNYXNrZWQiLCJ0Zl9FbnRlclBhc3N3b3JkIiwiZGF0ZV9mcm9tIiwic2V0RGF0ZUZyb21UaW1lc3RhbXAiLCJkYXRlX3RvIiwidG9nZ2xlUnVsZXNUYWIiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJmb3JtIiwic2hvdyIsImhpZGUiLCJjbGVhciIsImNhbGVuZGFyIiwiZmlyc3REYXlPZldlZWsiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImNhbGVuZGFyRmlyc3REYXlPZldlZWsiLCJjYWxlbmRhclRleHQiLCJlbmRDYWxlbmRhciIsImlubGluZSIsIm1vbnRoRmlyc3QiLCJyZWdFeHAiLCJzdGFydENhbGVuZGFyIiwiZGlzYWJsZU1pbnV0ZSIsImFtcG0iLCJwYXJlbnQiLCJjaGVja2JveCIsImlzQ2hlY2tlZCIsImZpbmQiLCJoYXNDbGFzcyIsImVtcHR5IiwiYXNzb2NpYXRlZElkcyIsImluY29taW5nUm91dGVJZHMiLCJJbmNvbWluZ1JvdXRlc0FQSSIsImdldExpc3QiLCJncm91cGVkUm91dGVzIiwiZ3JvdXBBbmRTb3J0Um91dGVzIiwicmVuZGVyR3JvdXBlZFJvdXRlcyIsImluaXRpYWxpemVSb3V0aW5nQ2hlY2tib3hlcyIsInBvcHVwIiwic2hvd0VtcHR5Um91dGVzTWVzc2FnZSIsInJvdXRlcyIsImdyb3VwcyIsImZvckVhY2giLCJyb3V0ZSIsInByb3ZpZGVySWQiLCJwcm92aWRlciIsInByb3ZpZGVyTmFtZSIsInByb3ZpZGVyaWRfcmVwcmVzZW50IiwiaXJfTm9Bc3NpZ25lZFByb3ZpZGVyIiwidGVtcERpdiIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImlubmVySFRNTCIsImNsZWFuUHJvdmlkZXJOYW1lIiwidGV4dENvbnRlbnQiLCJpbm5lclRleHQiLCJwcm92aWRlck5hbWVIdG1sIiwicHJvdmlkZXJEaXNhYmxlZCIsImdlbmVyYWxSdWxlcyIsInNwZWNpZmljUnVsZXMiLCJudW1iZXIiLCJPYmplY3QiLCJrZXlzIiwic29ydCIsImEiLCJiIiwiZGlkIiwidGJvZHkiLCJpc0ZpcnN0R3JvdXAiLCJncm91cCIsImFwcGVuZCIsInJvdyIsImNyZWF0ZVJvdXRlUm93IiwiaW5kZXgiLCJpc0ZpcnN0SW5ESUQiLCJydWxlQ2xhc3MiLCJzaG93RElESW5kaWNhdG9yIiwiaW5jbHVkZXMiLCJwYXJzZUludCIsInJ1bGVEZXNjcmlwdGlvbiIsInJ1bGVfcmVwcmVzZW50Iiwibm90ZURpc3BsYXkiLCJub3RlIiwibGVuZ3RoIiwic2FmZVByb3ZpZGVySWQiLCJzYWZlRGlkIiwiZW1wdHlSb3ciLCJpcl9Ob0luY29taW5nUm91dGVzIiwiaG92ZXIiLCIkcm93Iiwic2VsZWN0b3IiLCIkcmVsYXRlZFJvd3MiLCJlYWNoIiwiJGNoZWNrYm94IiwidG9vbHRpcFRleHQiLCJ0Zl9Ub29sdGlwU3BlY2lmaWNSdWxlIiwidGZfVG9vbHRpcEdlbmVyYWxSdWxlIiwic2VsZWN0b3JXaXRoRElEIiwibm90Iiwic2VsZWN0b3JHZW5lcmFsIiwib24iLCJzdHlsZSIsImhlaWdodCIsInNjcm9sbEhlaWdodCIsInRyaWdnZXIiLCJkYXRlVmFsdWUiLCJ0ZXN0IiwiaXNOYU4iLCJnZXRUaW1lIiwidGltZXN0YW1wIiwiY3VzdG9tVmFsaWRhdGVGb3JtIiwiaHRtbCIsInRmX1ZhbGlkYXRlQ2hlY2tEYXRlSW50ZXJ2YWwiLCIkc3VibWl0QnV0dG9uIiwidHJhbnNpdGlvbiIsInRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwiLCJoYXNEYXRlUmFuZ2UiLCJoYXNXZWVrZGF5UmFuZ2UiLCJoYXNUaW1lUmFuZ2UiLCJ0Zl9WYWxpZGF0ZU5vUnVsZXNTZWxlY3RlZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImtleSIsInN0YXJ0c1dpdGgiLCJkYXRlRnJvbSIsInNldEhvdXJzIiwiTWF0aCIsImZsb29yIiwiZGF0ZVRvIiwic2VsZWN0ZWRSb3V0ZXMiLCJyb3V0ZUlkIiwiY2JBZnRlclNlbmRGb3JtIiwibmV3VXJsIiwiZ2xvYmFsUm9vdFVybCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwidG9vbHRpcENvbmZpZ3MiLCJoZWFkZXIiLCJ0Zl9DYWxVcmxUb29sdGlwX2hlYWRlciIsInRmX0NhbFVybFRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwidGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfaGVhZGVyIiwiZGVmaW5pdGlvbiIsInRmX0NhbFVybFRvb2x0aXBfY2FsZGF2X2dvb2dsZSIsInRmX0NhbFVybFRvb2x0aXBfY2FsZGF2X25leHRjbG91ZCIsInRmX0NhbFVybFRvb2x0aXBfY2FsZGF2X3lhbmRleCIsImxpc3QyIiwidGZfQ2FsVXJsVG9vbHRpcF9pY2FsZW5kYXJfaGVhZGVyIiwidGZfQ2FsVXJsVG9vbHRpcF9pY2FsZW5kYXJfZGVzYyIsImV4YW1wbGVzIiwidGZfQ2FsVXJsVG9vbHRpcF9leGFtcGxlX2dvb2dsZSIsInRmX0NhbFVybFRvb2x0aXBfZXhhbXBsZV9uZXh0Y2xvdWQiLCJ0Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVfaWNzIiwiZXhhbXBsZXNIZWFkZXIiLCJ0Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsInRmX0NhbFVybFRvb2x0aXBfbm90ZSIsIlRvb2x0aXBCdWlsZGVyIiwiZm4iLCJjdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZSIsImN1c3RvbU5vdEVtcHR5SWZDYWxUeXBlIiwiVVJMIiwiXyIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxtQkFBbUIsR0FBRztBQUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx1QkFBRCxDQUxhOztBQU94QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFYYztBQVdSOztBQUVoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUFqQlk7QUFtQnhCO0FBQ0FDLEVBQUFBLFVBQVUsRUFBRUgsQ0FBQyxDQUFDLFlBQUQsQ0FwQlc7QUFxQnhCSSxFQUFBQSxRQUFRLEVBQUVKLENBQUMsQ0FBQyxVQUFELENBckJhO0FBc0J4QkssRUFBQUEsV0FBVyxFQUFFTCxDQUFDLENBQUMsZ0JBQUQsQ0F0QlU7QUF3QnhCO0FBQ0FNLEVBQUFBLFFBQVEsRUFBRU4sQ0FBQyxDQUFDLEtBQUQsQ0F6QmE7QUEwQnhCTyxFQUFBQSxpQkFBaUIsRUFBRVAsQ0FBQyxDQUFDLGVBQUQsQ0ExQkk7QUEyQnhCUSxFQUFBQSxlQUFlLEVBQUVSLENBQUMsQ0FBQyxhQUFELENBM0JNO0FBNEJ4QlMsRUFBQUEsWUFBWSxFQUFFVCxDQUFDLENBQUMsU0FBRCxDQTVCUztBQTZCeEJVLEVBQUFBLGFBQWEsRUFBRVYsQ0FBQyxDQUFDLFVBQUQsQ0E3QlE7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Q0gsQ0FMRDtBQU9BO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQXhJLENBQUMsQ0FBQ2lULEVBQUYsQ0FBSzNKLElBQUwsQ0FBVWlILFFBQVYsQ0FBbUIxTixLQUFuQixDQUF5QnNRLHVCQUF6QixHQUFtRCxVQUFTN1EsS0FBVCxFQUFnQjtBQUMvRCxNQUFNMkYsT0FBTyxHQUFHbkksbUJBQW1CLENBQUNZLGFBQXBCLENBQWtDNkMsR0FBbEMsRUFBaEIsQ0FEK0QsQ0FHL0Q7O0FBQ0EsTUFBSSxDQUFDMEUsT0FBRCxJQUFZQSxPQUFPLEtBQUssV0FBeEIsSUFBdUNBLE9BQU8sS0FBSyxNQUF2RCxFQUErRDtBQUMzRCxXQUFPLElBQVA7QUFDSCxHQU44RCxDQVEvRDs7O0FBQ0EsTUFBSSxDQUFDM0YsS0FBRCxJQUFVQSxLQUFLLENBQUMyTCxNQUFOLEtBQWlCLENBQS9CLEVBQWtDO0FBQzlCLFdBQU8sS0FBUDtBQUNILEdBWDhELENBYS9EOzs7QUFDQSxNQUFJO0FBQ0EsUUFBSW1GLEdBQUosQ0FBUTlRLEtBQVI7QUFDQSxXQUFPLElBQVA7QUFDSCxHQUhELENBR0UsT0FBTytRLENBQVAsRUFBVTtBQUNSLFdBQU8sS0FBUDtBQUNIO0FBQ0osQ0FwQkQsQyxDQXNCQTs7O0FBQ0FyVCxDQUFDLENBQUNnTSxRQUFELENBQUQsQ0FBWXNILEtBQVosQ0FBa0IsWUFBTTtBQUNwQnhULEVBQUFBLG1CQUFtQixDQUFDd0QsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQgZ2xvYmFsUm9vdFVybCBFeHRlbnNpb25zIG1vbWVudCBGb3JtIGdsb2JhbFRyYW5zbGF0ZSBcbiAgIFNlbWFudGljTG9jYWxpemF0aW9uIFNvdW5kRmlsZVNlbGVjdG9yIFVzZXJNZXNzYWdlIFNlY3VyaXR5VXRpbHNcbiAgIEluY29taW5nUm91dGVzQVBJIE91dE9mZldvcmtUaW1lQVBJIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgRXh0ZW5zaW9uU2VsZWN0b3IgKi9cblxuLyoqXG4gKiBNb2R1bGUgZm9yIG1hbmFnaW5nIG91dC1vZi13b3JrIHRpbWUgc2V0dGluZ3NcbiAqIFxuICogVGhpcyBtb2R1bGUgaGFuZGxlcyB0aGUgZm9ybSBmb3IgY3JlYXRpbmcgYW5kIGVkaXRpbmcgb3V0LW9mLXdvcmsgdGltZSBjb25kaXRpb25zLlxuICogSXQgdXNlcyBhIHVuaWZpZWQgUkVTVCBBUEkgYXBwcm9hY2ggbWF0Y2hpbmcgdGhlIGluY29taW5nIHJvdXRlcyBwYXR0ZXJuLlxuICogXG4gKiBAbW9kdWxlIG91dE9mV29ya1RpbWVSZWNvcmRcbiAqL1xuY29uc3Qgb3V0T2ZXb3JrVGltZVJlY29yZCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIFJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcmVjb3JkSWQ6IG51bGwsIC8vIFdpbGwgYmUgc2V0IGluIGluaXRpYWxpemUoKVxuICAgIFxuICAgIC8qKlxuICAgICAqIFN0b3JlIGxvYWRlZCByZWNvcmQgZGF0YVxuICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgKi9cbiAgICByZWNvcmREYXRhOiBudWxsLFxuXG4gICAgLy8gRm9ybSBmaWVsZCBqUXVlcnkgb2JqZWN0c1xuICAgICR0aW1lX2Zyb206ICQoJyN0aW1lX2Zyb20nKSxcbiAgICAkdGltZV90bzogJCgnI3RpbWVfdG8nKSxcbiAgICAkcnVsZXNUYWJsZTogJCgnI3JvdXRpbmctdGFibGUnKSxcbiAgICBcbiAgICAvLyBIaWRkZW4gaW5wdXQgZmllbGRzXG4gICAgJGlkRmllbGQ6ICQoJyNpZCcpLFxuICAgICR3ZWVrZGF5RnJvbUZpZWxkOiAkKCcjd2Vla2RheV9mcm9tJyksXG4gICAgJHdlZWtkYXlUb0ZpZWxkOiAkKCcjd2Vla2RheV90bycpLFxuICAgICRhY3Rpb25GaWVsZDogJCgnI2FjdGlvbicpLFxuICAgICRjYWxUeXBlRmllbGQ6ICQoJyNjYWxUeXBlJyksXG4gICAgJGV4dGVuc2lvbkZpZWxkOiAkKCcjZXh0ZW5zaW9uJyksXG4gICAgJGFsbG93UmVzdHJpY3Rpb25GaWVsZDogJCgnI2FsbG93UmVzdHJpY3Rpb24nKSxcbiAgICAkZGVzY3JpcHRpb25GaWVsZDogJCgnI2Rlc2NyaXB0aW9uJyksXG4gICAgXG4gICAgLy8gRHJvcGRvd24gZWxlbWVudHNcbiAgICAkYWN0aW9uRHJvcGRvd246ICQoJy5hY3Rpb24tc2VsZWN0JyksXG4gICAgJGNhbFR5cGVEcm9wZG93bjogJCgnLmNhbFR5cGUtc2VsZWN0JyksXG4gICAgJHdlZWtkYXlGcm9tRHJvcGRvd246ICQoJy53ZWVrZGF5LWZyb20tc2VsZWN0JyksXG4gICAgJHdlZWtkYXlUb0Ryb3Bkb3duOiAkKCcud2Vla2RheS10by1zZWxlY3QnKSxcbiAgICBcbiAgICAvLyBUYWIgZWxlbWVudHNcbiAgICAkdGFiTWVudTogJCgnI291dC10aW1lLW1vZGlmeS1tZW51IC5pdGVtJyksXG4gICAgJHJ1bGVzVGFiOiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgJGdlbmVyYWxUYWI6IG51bGwsIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgbGF0ZXJcbiAgICAkcnVsZXNUYWJTZWdtZW50OiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgJGdlbmVyYWxUYWJTZWdtZW50OiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgXG4gICAgLy8gUm93IGVsZW1lbnRzXG4gICAgJGV4dGVuc2lvblJvdzogJCgnI2V4dGVuc2lvbi1yb3cnKSxcbiAgICAkYXVkaW9NZXNzYWdlUm93OiAkKCcjYXVkaW8tbWVzc2FnZS1yb3cnKSxcbiAgICBcbiAgICAvLyBDYWxlbmRhciB0YWIgZWxlbWVudHNcbiAgICAkY2FsZW5kYXJUYWI6ICQoJyNjYWxsLXR5cGUtY2FsZW5kYXItdGFiJyksXG4gICAgJG1haW5UYWI6ICQoJyNjYWxsLXR5cGUtbWFpbi10YWInKSxcbiAgICBcbiAgICAvLyBEYXRlL3RpbWUgY2FsZW5kYXIgZWxlbWVudHNcbiAgICAkcmFuZ2VEYXlzU3RhcnQ6ICQoJyNyYW5nZS1kYXlzLXN0YXJ0JyksXG4gICAgJHJhbmdlRGF5c0VuZDogJCgnI3JhbmdlLWRheXMtZW5kJyksXG4gICAgJHJhbmdlVGltZVN0YXJ0OiAkKCcjcmFuZ2UtdGltZS1zdGFydCcpLFxuICAgICRyYW5nZVRpbWVFbmQ6ICQoJyNyYW5nZS10aW1lLWVuZCcpLFxuICAgIFxuICAgIC8vIEVyYXNlIGJ1dHRvbnNcbiAgICAkZXJhc2VEYXRlc0J0bjogJCgnI2VyYXNlLWRhdGVzJyksXG4gICAgJGVyYXNlV2Vla2RheXNCdG46ICQoJyNlcmFzZS13ZWVrZGF5cycpLFxuICAgICRlcmFzZVRpbWVwZXJpb2RCdG46ICQoJyNlcmFzZS10aW1lcGVyaW9kJyksXG4gICAgXG4gICAgLy8gRXJyb3IgbWVzc2FnZSBlbGVtZW50XG4gICAgJGVycm9yTWVzc2FnZTogJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKSxcbiAgICBcbiAgICAvLyBBdWRpbyBtZXNzYWdlIElEIGZvciBzb3VuZCBmaWxlIHNlbGVjdG9yXG4gICAgYXVkaW9NZXNzYWdlSWQ6ICdhdWRpb19tZXNzYWdlX2lkJyxcblxuICAgIC8qKlxuICAgICAqIEFkZGl0aW9uYWwgdGltZSBpbnRlcnZhbCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICogQHR5cGUge2FycmF5fVxuICAgICAqL1xuICAgIGFkZGl0aW9uYWxUaW1lSW50ZXJ2YWxSdWxlczogW3tcbiAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgIHZhbHVlOiAvXihbMDFdP1swLTldfDJbMC0zXSk6KFswLTVdP1swLTldKSQvLFxuICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgIH1dLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlW2V4dGVuc2lvbl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBhdWRpb19tZXNzYWdlX2lkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnYXVkaW9fbWVzc2FnZV9pZCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlW3BsYXltZXNzYWdlXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQXVkaW9NZXNzYWdlRW1wdHlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIGNhbFVybDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NhbFVybCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZDYWxUeXBlJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDYWxVcmlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVmcm9tOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX2Zyb20nLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKFswMV0/WzAtOV18MlswLTNdKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWV0bzoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVfdG8nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogL14oWzAxXT9bMC05XXwyWzAtM10pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTZXQgcmVjb3JkIElEIGZyb20gRE9NXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRpZEZpZWxkLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgcmVmZXJlbmNlcyB0aGF0IGRlcGVuZCBvbiBET01cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIgPSAkKCcjb3V0LXRpbWUtbW9kaWZ5LW1lbnUgLml0ZW1bZGF0YS10YWI9XCJydWxlc1wiXScpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRnZW5lcmFsVGFiID0gJCgnI291dC10aW1lLW1vZGlmeS1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZ2VuZXJhbFwiXScpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYlNlZ21lbnQgPSAkKCcudWkudGFiLnNlZ21lbnRbZGF0YS10YWI9XCJydWxlc1wiXScpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRnZW5lcmFsVGFiU2VnbWVudCA9ICQoJy51aS50YWIuc2VnbWVudFtkYXRhLXRhYj1cImdlbmVyYWxcIl0nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR0YWJNZW51LnRhYigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHN1Ym1pc3Npb24gaGFuZGxpbmdcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjb21wb25lbnRzIHRoYXQgZG9uJ3QgZGVwZW5kIG9uIGRhdGFcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplQ2FsZW5kYXJzKCk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZVJvdXRpbmdUYWJsZSgpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVFcmFzZXJzKCk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZURlc2NyaXB0aW9uRmllbGQoKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZGF0YSBhbmQgaW5pdGlhbGl6ZSBkcm9wZG93bnNcbiAgICAgICAgLy8gVGhpcyB1bmlmaWVkIGFwcHJvYWNoIGxvYWRzIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyBvciBleGlzdGluZyBkYXRhXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZEZvcm1EYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKiBVbmlmaWVkIGFwcHJvYWNoIGZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAqL1xuICAgIGxvYWRGb3JtRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29weSBvcGVyYXRpb25cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weUlkID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuXG4gICAgICAgIGlmIChjb3B5SWQpIHtcbiAgICAgICAgICAgIC8vIENvcHkgb3BlcmF0aW9uIC0gdXNlIHRoZSBuZXcgUkVTVGZ1bCBjb3B5IGVuZHBvaW50XG4gICAgICAgICAgICBPdXRPZmZXb3JrVGltZUFQSS5jYWxsQ3VzdG9tTWV0aG9kKCdjb3B5Jywge2lkOiBjb3B5SWR9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdWNjZXNzOiBwb3B1bGF0ZSBmb3JtIHdpdGggY29waWVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmREYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCByb3V0aW5nIHJ1bGVzXG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZFJvdXRpbmdUYWJsZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbW9kaWZpZWQgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9LCAyNTApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFQSSBlcnJvciAtIHNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOb3JtYWwgbG9hZCAtIGVpdGhlciBleGlzdGluZyByZWNvcmQgb3IgbmV3XG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZFRvTG9hZCA9IG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQgfHwgJyc7XG5cbiAgICAgICAgICAgIC8vIExvYWQgcmVjb3JkIGRhdGEgdmlhIFJFU1QgQVBJIC0gYWx3YXlzIHJldHVybnMgZGF0YSAod2l0aCBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMpXG4gICAgICAgICAgICBPdXRPZmZXb3JrVGltZUFQSS5nZXRSZWNvcmQocmVjb3JkSWRUb0xvYWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN1Y2Nlc3M6IHBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIChkZWZhdWx0cyBmb3IgbmV3LCByZWFsIGRhdGEgZm9yIGV4aXN0aW5nKVxuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZERhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIHJvdXRpbmcgcnVsZXNcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5sb2FkUm91dGluZ1RhYmxlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2F2ZSBpbml0aWFsIHZhbHVlcyB0byBwcmV2ZW50IHNhdmUgYnV0dG9uIGFjdGl2YXRpb25cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDI1MCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIGVycm9yIC0gc2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgZHJvcGRvd25zIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgd2Vla2RheSBkcm9wZG93bnMgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgb3JpZ2luYWwgaW1wbGVtZW50YXRpb25cbiAgICAgICAgY29uc3Qgd2Vla0RheXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnLTEnLCB0ZXh0OiAnLScgfSAvLyBEZWZhdWx0IGVtcHR5IG9wdGlvblxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRheXMgMS03IHVzaW5nIHRoZSBzYW1lIGxvZ2ljIGFzIG9yaWdpbmFsIGNvbnRyb2xsZXJcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gNzsgaSsrKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgZGF0ZSBmb3IgXCJTdW5kYXkgK2kgZGF5c1wiIHRvIG1hdGNoIG9yaWdpbmFsIGxvZ2ljXG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoMjAyMCwgMCwgNSArIGkpOyAvLyBKYW4gNSwgMjAyMCB3YXMgU3VuZGF5XG4gICAgICAgICAgICBjb25zdCBkYXlOYW1lID0gZGF0ZS50b0xvY2FsZURhdGVTdHJpbmcoJ2VuJywgeyB3ZWVrZGF5OiAnc2hvcnQnIH0pO1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB0cmFuc2xhdGlvbiBmb3IgdGhlIGRheSBhYmJyZXZpYXRpb25cbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWREYXkgPSBnbG9iYWxUcmFuc2xhdGVbZGF5TmFtZV0gfHwgZGF5TmFtZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgd2Vla0RheXMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogdHJhbnNsYXRlZERheSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHRleHQ6IHRyYW5zbGF0ZWREYXlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIHZhbHVlczogd2Vla0RheXMsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheUZyb21GaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICB2YWx1ZXM6IHdlZWtEYXlzLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlUb0ZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkFjdGlvbkNoYW5nZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2FsZW5kYXIgdHlwZSBkcm9wZG93blxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsVHlwZUZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkNhbFR5cGVDaGFuZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gc2VsZWN0b3Igd2lsbCBiZSBpbml0aWFsaXplZCBpbiBwb3B1bGF0ZUZvcm0gd2l0aCBBUEkgZGF0YVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggQVBJIGRhdGFcbiAgICAgKiBTaW5nbGUgcG9pbnQgb2YgaW5pdGlhbGl6YXRpb24gYWZ0ZXIgcmVjZWl2aW5nIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEFQSSByZXNwb25zZSBkYXRhICh3aXRoIGRlZmF1bHRzIG9yIGV4aXN0aW5nIHZhbHVlcylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3IoZGF0YSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFNvdW5kRmlsZVNlbGVjdG9yIHdpdGggY29tcGxldGUgQVBJIGRhdGEgY29udGV4dFxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KG91dE9mV29ya1RpbWVSZWNvcmQuYXVkaW9NZXNzYWdlSWQsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsICAvLyBPdXQgb2Ygd29yayB0aW1lIG11c3QgYWx3YXlzIGhhdmUgYSBzb3VuZCBmaWxlXG4gICAgICAgICAgICBkYXRhOiBkYXRhIC8vIFBhc3MgY29tcGxldGUgQVBJIGRhdGEgZm9yIHByb3BlciBpbml0aWFsaXphdGlvblxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGF1ZGlvX21lc3NhZ2VfaWQgZXhpc3RzLCBzZXQgdGhlIHZhbHVlIHdpdGggcmVwcmVzZW50YXRpb25cbiAgICAgICAgaWYgKGRhdGEuYXVkaW9fbWVzc2FnZV9pZCAmJiBkYXRhLmF1ZGlvX21lc3NhZ2VfaWRfcmVwcmVzZW50KSB7XG4gICAgICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmF1ZGlvTWVzc2FnZUlkLCBcbiAgICAgICAgICAgICAgICBkYXRhLmF1ZGlvX21lc3NhZ2VfaWQsIFxuICAgICAgICAgICAgICAgIGRhdGEuYXVkaW9fbWVzc2FnZV9pZF9yZXByZXNlbnRcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yIHdpdGggQVBJIGRhdGFcbiAgICAgKiBTaW5nbGUgcG9pbnQgb2YgaW5pdGlhbGl6YXRpb24gYWZ0ZXIgcmVjZWl2aW5nIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEFQSSByZXNwb25zZSBkYXRhICh3aXRoIGRlZmF1bHRzIG9yIGV4aXN0aW5nIHZhbHVlcylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoZGF0YSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIEV4dGVuc2lvblNlbGVjdG9yIGZvbGxvd2luZyBWNS4wIHBhdHRlcm5cbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZXh0ZW5zaW9uJywge1xuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBSZWNvcmQgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBpc0NvcHkgPSB1cmxQYXJhbXMuaGFzKCdjb3B5Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgY29weSBvcGVyYXRpb24sIGNsZWFyIElEIGFuZCBwcmlvcml0eVxuICAgICAgICBpZiAoaXNDb3B5KSB7XG4gICAgICAgICAgICBkYXRhLmlkID0gJyc7XG4gICAgICAgICAgICBkYXRhLnByaW9yaXR5ID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoe1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgICAgICB1bmlxaWQ6IGRhdGEudW5pcWlkLFxuICAgICAgICAgICAgcHJpb3JpdHk6IGRhdGEucHJpb3JpdHksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgIGNhbFR5cGU6IGRhdGEuY2FsVHlwZSxcbiAgICAgICAgICAgIHdlZWtkYXlfZnJvbTogZGF0YS53ZWVrZGF5X2Zyb20sXG4gICAgICAgICAgICB3ZWVrZGF5X3RvOiBkYXRhLndlZWtkYXlfdG8sXG4gICAgICAgICAgICB0aW1lX2Zyb206IGRhdGEudGltZV9mcm9tLFxuICAgICAgICAgICAgdGltZV90bzogZGF0YS50aW1lX3RvLFxuICAgICAgICAgICAgY2FsVXJsOiBkYXRhLmNhbFVybCxcbiAgICAgICAgICAgIGNhbFVzZXI6IGRhdGEuY2FsVXNlcixcbiAgICAgICAgICAgIGNhbFNlY3JldDogZGF0YS5jYWxTZWNyZXQsXG4gICAgICAgICAgICBhY3Rpb246IGRhdGEuYWN0aW9uLFxuICAgICAgICAgICAgZXh0ZW5zaW9uOiBkYXRhLmV4dGVuc2lvbixcbiAgICAgICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IGRhdGEuYXVkaW9fbWVzc2FnZV9pZCxcbiAgICAgICAgICAgIGFsbG93UmVzdHJpY3Rpb246IGRhdGEuYWxsb3dSZXN0cmljdGlvblxuICAgICAgICB9LCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcGFzc3dvcmQgZmllbGQgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICBjb25zdCAkY2FsU2VjcmV0RmllbGQgPSAkKCcjY2FsU2VjcmV0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuY2FsU2VjcmV0ID09PSAnWFhYWFhYJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBQYXNzd29yZCBleGlzdHMgYnV0IGlzIG1hc2tlZCwgc2hvdyBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICAgICAkY2FsU2VjcmV0RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUudGZfUGFzc3dvcmRNYXNrZWQgfHwgJ1Bhc3N3b3JkIHNhdmVkIChlbnRlciBuZXcgdG8gY2hhbmdlKScpO1xuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBtYXNrZWQgc3RhdGUgdG8gZGV0ZWN0IGNoYW5nZXNcbiAgICAgICAgICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmRhdGEoJ29yaWdpbmFsTWFza2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLnRmX0VudGVyUGFzc3dvcmQgfHwgJ0VudGVyIHBhc3N3b3JkJyk7XG4gICAgICAgICAgICAgICAgICAgICRjYWxTZWNyZXRGaWVsZC5kYXRhKCdvcmlnaW5hbE1hc2tlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVEcm9wZG93bnMoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3Igd2l0aCBBUEkgZGF0YSAoc2luZ2xlIHBvaW50IG9mIGluaXRpYWxpemF0aW9uKVxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yIHdpdGggQVBJIGRhdGFcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcihkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgZHJvcGRvd24gdmFsdWVzIGFmdGVyIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICAgICAgLy8gU2V0IGFjdGlvbiBkcm9wZG93blxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhY3Rpb25Ecm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5hY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgY2FsVHlwZSBkcm9wZG93blxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsVHlwZURyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLmNhbFR5cGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgd2Vla2RheSBkcm9wZG93bnNcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS53ZWVrZGF5X2Zyb20pIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheUZyb21Ecm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS53ZWVrZGF5X2Zyb20pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS53ZWVrZGF5X3RvKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlUb0Ryb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLndlZWtkYXlfdG8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgZGF0ZXMgaWYgcHJlc2VudFxuICAgICAgICAgICAgICAgIGlmIChkYXRhLmRhdGVfZnJvbSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnNldERhdGVGcm9tVGltZXN0YW1wKGRhdGEuZGF0ZV9mcm9tLCAnI3JhbmdlLWRheXMtc3RhcnQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZGF0ZV90bykge1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnNldERhdGVGcm9tVGltZXN0YW1wKGRhdGEuZGF0ZV90bywgJyNyYW5nZS1kYXlzLWVuZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZmllbGQgdmlzaWJpbGl0eSBiYXNlZCBvbiBhY3Rpb25cbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLm9uQWN0aW9uQ2hhbmdlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGNhbGVuZGFyIHR5cGUgdmlzaWJpbGl0eVxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQub25DYWxUeXBlQ2hhbmdlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IHJ1bGVzIHRhYiB2aXNpYmlsaXR5IGJhc2VkIG9uIGFsbG93UmVzdHJpY3Rpb25cbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnRvZ2dsZVJ1bGVzVGFiKGRhdGEuYWxsb3dSZXN0cmljdGlvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZ1xuICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgYWN0aW9uIGRyb3Bkb3duIGNoYW5nZVxuICAgICAqL1xuICAgIG9uQWN0aW9uQ2hhbmdlKCkge1xuICAgICAgICBjb25zdCBhY3Rpb24gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdhY3Rpb24nKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhY3Rpb24gPT09ICdleHRlbnNpb24nKSB7XG4gICAgICAgICAgICAvLyBTaG93IGV4dGVuc2lvbiwgaGlkZSBhdWRpb1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXh0ZW5zaW9uUm93LnNob3coKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGF1ZGlvTWVzc2FnZVJvdy5oaWRlKCk7XG4gICAgICAgICAgICAvLyBDbGVhciBhdWRpbyBtZXNzYWdlXG4gICAgICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5jbGVhcihvdXRPZldvcmtUaW1lUmVjb3JkLmF1ZGlvTWVzc2FnZUlkKTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09ICdwbGF5bWVzc2FnZScpIHtcbiAgICAgICAgICAgIC8vIFNob3cgYXVkaW8sIGhpZGUgZXh0ZW5zaW9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25Sb3cuaGlkZSgpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYXVkaW9NZXNzYWdlUm93LnNob3coKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGV4dGVuc2lvbiB1c2luZyBFeHRlbnNpb25TZWxlY3RvclxuICAgICAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuY2xlYXIoJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXh0ZW5zaW9uRmllbGQudmFsKCcnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGNhbGVuZGFyIHR5cGUgY2hhbmdlXG4gICAgICovXG4gICAgb25DYWxUeXBlQ2hhbmdlKCkge1xuICAgICAgICBjb25zdCBjYWxUeXBlID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2FsVHlwZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gJ3RpbWVmcmFtZScgYW5kIGVtcHR5IHN0cmluZyBtZWFuIHRpbWUtYmFzZWQgY29uZGl0aW9ucyAoc2hvdyBtYWluIHRhYilcbiAgICAgICAgaWYgKCFjYWxUeXBlIHx8IGNhbFR5cGUgPT09ICd0aW1lZnJhbWUnIHx8IGNhbFR5cGUgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBTaG93IG1haW4gdGltZS9kYXRlIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbGVuZGFyVGFiLmhpZGUoKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJG1haW5UYWIuc2hvdygpO1xuICAgICAgICB9IGVsc2UgaWYgKGNhbFR5cGUgPT09ICdDQUxEQVYnIHx8IGNhbFR5cGUgPT09ICdJQ0FMJykge1xuICAgICAgICAgICAgLy8gU2hvdyBjYWxlbmRhciBVUkwgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsZW5kYXJUYWIuc2hvdygpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kbWFpblRhYi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2FsZW5kYXJzIGZvciBkYXRlIGFuZCB0aW1lIHNlbGVjdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVDYWxlbmRhcnMoKSB7XG4gICAgICAgIC8vIERhdGUgcmFuZ2UgY2FsZW5kYXJzXG4gICAgICAgIC8vIFVzZSBjbGFzcyB2YXJpYWJsZXMgZm9yIGNhbGVuZGFyc1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBlbmRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLFxuICAgICAgICAgICAgdHlwZTogJ2RhdGUnLFxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIG1vbnRoRmlyc3Q6IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgc3RhcnRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBUaW1lIHJhbmdlIGNhbGVuZGFyc1xuICAgICAgICAvLyBVc2UgY2xhc3MgdmFyaWFibGVzIGZvciB0aW1lIGNhbGVuZGFyc1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBlbmRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLFxuICAgICAgICAgICAgdHlwZTogJ3RpbWUnLFxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIGRpc2FibGVNaW51dGU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICBhbXBtOiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZUVuZC5jYWxlbmRhcih7XG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIHN0YXJ0Q2FsZW5kYXI6IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZVN0YXJ0LFxuICAgICAgICAgICAgdHlwZTogJ3RpbWUnLFxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIG1vbnRoRmlyc3Q6IGZhbHNlLFxuICAgICAgICAgICAgYW1wbTogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJvdXRpbmcgdGFibGUgYW5kIGFsbG93UmVzdHJpY3Rpb24gY2hlY2tib3hcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUm91dGluZ1RhYmxlKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGFsbG93UmVzdHJpY3Rpb24gY2hlY2tib3hcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYWxsb3dSZXN0cmljdGlvbkZpZWxkLnBhcmVudCgpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRhbGxvd1Jlc3RyaWN0aW9uRmllbGQucGFyZW50KCkuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnRvZ2dsZVJ1bGVzVGFiKGlzQ2hlY2tlZCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZXhpc3RpbmcgY2hlY2tib3hlcyBpbiB0YWJsZVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy51aS5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUb2dnbGUgcnVsZXMgdGFiIHZpc2liaWxpdHlcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzQ2hlY2tlZCAtIFdoZXRoZXIgdG8gc2hvdyBydWxlcyB0YWJcbiAgICAgKi9cbiAgICB0b2dnbGVSdWxlc1RhYihpc0NoZWNrZWQpIHtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiLmhpZGUoKTtcbiAgICAgICAgICAgIC8vIFN3aXRjaCB0byBnZW5lcmFsIHRhYiBpZiBydWxlcyB0YWIgd2FzIGFjdGl2ZVxuICAgICAgICAgICAgaWYgKG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiLmhhc0NsYXNzKCdhY3RpdmUnKSkge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYlNlZ21lbnQucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGdlbmVyYWxUYWIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGdlbmVyYWxUYWJTZWdtZW50LmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCByb3V0aW5nIHRhYmxlIHdpdGggaW5jb21pbmcgcm91dGVzXG4gICAgICovXG4gICAgbG9hZFJvdXRpbmdUYWJsZSgpIHtcbiAgICAgICAgLy8gQ2xlYXIgdGFibGVcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCd0Ym9keScpLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgYXNzb2NpYXRlZCBJRHMgZnJvbSByZWNvcmQgZGF0YVxuICAgICAgICBjb25zdCBhc3NvY2lhdGVkSWRzID0gb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmREYXRhPy5pbmNvbWluZ1JvdXRlSWRzIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBhbGwgYXZhaWxhYmxlIHJvdXRlcyBmcm9tIEluY29taW5nUm91dGVzQVBJXG4gICAgICAgIEluY29taW5nUm91dGVzQVBJLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBHcm91cCBhbmQgc29ydCByb3V0ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBncm91cGVkUm91dGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC5ncm91cEFuZFNvcnRSb3V0ZXMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVuZGVyIGdyb3VwZWQgcm91dGVzXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5yZW5kZXJHcm91cGVkUm91dGVzKGdyb3VwZWRSb3V0ZXMsIGFzc29jaWF0ZWRJZHMpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgVUkgY29tcG9uZW50cyB3aXRoIGdyb3VwZWQgY2hlY2tib3ggbG9naWNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVSb3V0aW5nQ2hlY2tib3hlcygpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnNob3dFbXB0eVJvdXRlc01lc3NhZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHcm91cCBhbmQgc29ydCByb3V0ZXMgYnkgcHJvdmlkZXIgYW5kIERJRFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJvdXRlcyAtIEFycmF5IG9mIHJvdXRlIG9iamVjdHNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBHcm91cGVkIHJvdXRlc1xuICAgICAqL1xuICAgIGdyb3VwQW5kU29ydFJvdXRlcyhyb3V0ZXMpIHtcbiAgICAgICAgY29uc3QgZ3JvdXBzID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBTa2lwIGRlZmF1bHQgcm91dGUgYW5kIGdyb3VwIGJ5IHByb3ZpZGVyXG4gICAgICAgIHJvdXRlcy5mb3JFYWNoKChyb3V0ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJvdXRlLmlkID09PSAxIHx8IHJvdXRlLmlkID09PSAnMScpIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9IHJvdXRlLnByb3ZpZGVyIHx8ICdub25lJztcbiAgICAgICAgICAgIGlmICghZ3JvdXBzW3Byb3ZpZGVySWRdKSB7XG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBwbGFpbiB0ZXh0IHByb3ZpZGVyIG5hbWUgZnJvbSBIVE1MIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGxldCBwcm92aWRlck5hbWUgPSByb3V0ZS5wcm92aWRlcmlkX3JlcHJlc2VudCB8fCBnbG9iYWxUcmFuc2xhdGUuaXJfTm9Bc3NpZ25lZFByb3ZpZGVyIHx8ICdEaXJlY3QgY2FsbHMnO1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBIVE1MIHRhZ3MgdG8gZ2V0IGNsZWFuIHByb3ZpZGVyIG5hbWUgZm9yIGRpc3BsYXlcbiAgICAgICAgICAgICAgICBjb25zdCB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgdGVtcERpdi5pbm5lckhUTUwgPSBwcm92aWRlck5hbWU7XG4gICAgICAgICAgICAgICAgY29uc3QgY2xlYW5Qcm92aWRlck5hbWUgPSB0ZW1wRGl2LnRleHRDb250ZW50IHx8IHRlbXBEaXYuaW5uZXJUZXh0IHx8IHByb3ZpZGVyTmFtZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0gPSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVySWQ6IHByb3ZpZGVySWQsICAvLyBTdG9yZSBhY3R1YWwgcHJvdmlkZXIgSURcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJOYW1lOiBjbGVhblByb3ZpZGVyTmFtZSwgIC8vIENsZWFuIG5hbWUgZm9yIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJOYW1lSHRtbDogcm91dGUucHJvdmlkZXJpZF9yZXByZXNlbnQgfHwgcHJvdmlkZXJOYW1lLCAgLy8gT3JpZ2luYWwgSFRNTCBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJEaXNhYmxlZDogcm91dGUucHJvdmlkZXJEaXNhYmxlZCB8fCBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFJ1bGVzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgc3BlY2lmaWNSdWxlczoge31cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXBhcmF0ZSBnZW5lcmFsIHJ1bGVzIChubyBESUQpIGZyb20gc3BlY2lmaWMgcnVsZXMgKHdpdGggRElEKVxuICAgICAgICAgICAgaWYgKCFyb3V0ZS5udW1iZXIgfHwgcm91dGUubnVtYmVyID09PSAnJykge1xuICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5nZW5lcmFsUnVsZXMucHVzaChyb3V0ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXNbcm91dGUubnVtYmVyXSkge1xuICAgICAgICAgICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlc1tyb3V0ZS5udW1iZXJdID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5zcGVjaWZpY1J1bGVzW3JvdXRlLm51bWJlcl0ucHVzaChyb3V0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU29ydCBydWxlcyB3aXRoaW4gZWFjaCBncm91cCBieSBwcmlvcml0eVxuICAgICAgICBPYmplY3Qua2V5cyhncm91cHMpLmZvckVhY2gocHJvdmlkZXJJZCA9PiB7XG4gICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0uZ2VuZXJhbFJ1bGVzLnNvcnQoKGEsIGIpID0+IGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KTtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGdyb3Vwc1twcm92aWRlcklkXS5zcGVjaWZpY1J1bGVzKS5mb3JFYWNoKGRpZCA9PiB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXNbZGlkXS5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZ3JvdXBzO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVuZGVyIGdyb3VwZWQgcm91dGVzIGluIHRoZSB0YWJsZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBncm91cGVkUm91dGVzIC0gR3JvdXBlZCByb3V0ZXMgb2JqZWN0XG4gICAgICogQHBhcmFtIHtBcnJheX0gYXNzb2NpYXRlZElkcyAtIEFycmF5IG9mIGFzc29jaWF0ZWQgcm91dGUgSURzXG4gICAgICovXG4gICAgcmVuZGVyR3JvdXBlZFJvdXRlcyhncm91cGVkUm91dGVzLCBhc3NvY2lhdGVkSWRzKSB7XG4gICAgICAgIGNvbnN0IHRib2R5ID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCd0Ym9keScpO1xuICAgICAgICBsZXQgaXNGaXJzdEdyb3VwID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIE9iamVjdC5rZXlzKGdyb3VwZWRSb3V0ZXMpLmZvckVhY2gocHJvdmlkZXJJZCA9PiB7XG4gICAgICAgICAgICBjb25zdCBncm91cCA9IGdyb3VwZWRSb3V0ZXNbcHJvdmlkZXJJZF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBwcm92aWRlciBncm91cCBoZWFkZXJcbiAgICAgICAgICAgIGlmICghaXNGaXJzdEdyb3VwKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIHNlcGFyYXRvciBiZXR3ZWVuIGdyb3Vwc1xuICAgICAgICAgICAgICAgIHRib2R5LmFwcGVuZCgnPHRyIGNsYXNzPVwicHJvdmlkZXItc2VwYXJhdG9yXCI+PHRkIGNvbHNwYW49XCIzXCI+PGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48L3RkPjwvdHI+Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpc0ZpcnN0R3JvdXAgPSBmYWxzZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIHByb3ZpZGVyIGhlYWRlciByb3cgLSB1c2UgcHJvdmlkZXJOYW1lSHRtbCBmb3IgcmljaCBkaXNwbGF5XG4gICAgICAgICAgICB0Ym9keS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cInByb3ZpZGVyLWhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dyb3VwLnByb3ZpZGVyTmFtZUh0bWx9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z3JvdXAucHJvdmlkZXJEaXNhYmxlZCA/ICc8c3BhbiBjbGFzcz1cInVpIG1pbmkgcmVkIGxhYmVsXCI+RGlzYWJsZWQ8L3NwYW4+JyA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW5kZXIgZ2VuZXJhbCBydWxlcyBmaXJzdFxuICAgICAgICAgICAgZ3JvdXAuZ2VuZXJhbFJ1bGVzLmZvckVhY2goKHJvdXRlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jcmVhdGVSb3V0ZVJvdyhyb3V0ZSwgYXNzb2NpYXRlZElkcywgJ3J1bGUtZ2VuZXJhbCcpO1xuICAgICAgICAgICAgICAgIHRib2R5LmFwcGVuZChyb3cpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbmRlciBzcGVjaWZpYyBydWxlcyBncm91cGVkIGJ5IERJRFxuICAgICAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXAuc3BlY2lmaWNSdWxlcykuc29ydCgpLmZvckVhY2goZGlkID0+IHtcbiAgICAgICAgICAgICAgICBncm91cC5zcGVjaWZpY1J1bGVzW2RpZF0uZm9yRWFjaCgocm91dGUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzRmlyc3RJbkRJRCA9IGluZGV4ID09PSAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmNyZWF0ZVJvdXRlUm93KHJvdXRlLCBhc3NvY2lhdGVkSWRzLCAncnVsZS1zcGVjaWZpYycsIGlzRmlyc3RJbkRJRCk7XG4gICAgICAgICAgICAgICAgICAgIHRib2R5LmFwcGVuZChyb3cpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgc2luZ2xlIHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByb3V0ZSAtIFJvdXRlIG9iamVjdFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFzc29jaWF0ZWRJZHMgLSBBc3NvY2lhdGVkIHJvdXRlIElEc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBydWxlQ2xhc3MgLSBDU1MgY2xhc3MgZm9yIHRoZSBydWxlIHR5cGVcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IHNob3dESURJbmRpY2F0b3IgLSBXaGV0aGVyIHRvIHNob3cgRElEIGluZGljYXRvclxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IEhUTUwgcm93XG4gICAgICovXG4gICAgY3JlYXRlUm91dGVSb3cocm91dGUsIGFzc29jaWF0ZWRJZHMsIHJ1bGVDbGFzcyA9ICcnLCBzaG93RElESW5kaWNhdG9yID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgaXNDaGVja2VkID0gYXNzb2NpYXRlZElkcy5pbmNsdWRlcyhwYXJzZUludChyb3V0ZS5pZCkpO1xuICAgICAgICBjb25zdCBwcm92aWRlckRpc2FibGVkID0gcm91dGUucHJvdmlkZXJEaXNhYmxlZCA/ICdkaXNhYmxlZCcgOiAnJztcbiAgICAgICAgbGV0IHJ1bGVEZXNjcmlwdGlvbiA9IHJvdXRlLnJ1bGVfcmVwcmVzZW50IHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5zdXJlIHByb3ZpZGVyIElEIGlzIGNsZWFuIChubyBIVE1MKVxuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gcm91dGUucHJvdmlkZXIgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgdmlzdWFsIGluZGljYXRvcnMgZm9yIHJ1bGUgdHlwZVxuICAgICAgICBpZiAocnVsZUNsYXNzID09PSAncnVsZS1zcGVjaWZpYycpIHtcbiAgICAgICAgICAgIC8vIEFkZCBpbmRlbnQgYW5kIGFycm93IGZvciBzcGVjaWZpYyBydWxlc1xuICAgICAgICAgICAgcnVsZURlc2NyaXB0aW9uID0gYDxzcGFuIGNsYXNzPVwicnVsZS1pbmRlbnRcIj7ihrM8L3NwYW4+ICR7cnVsZURlc2NyaXB0aW9ufWA7XG4gICAgICAgIH0gZWxzZSBpZiAocnVsZUNsYXNzID09PSAncnVsZS1nZW5lcmFsJykge1xuICAgICAgICAgICAgLy8gQWRkIGljb24gZm9yIGdlbmVyYWwgcnVsZXNcbiAgICAgICAgICAgIHJ1bGVEZXNjcmlwdGlvbiA9IGA8aSBjbGFzcz1cInJhbmRvbSBpY29uXCI+PC9pPiAke3J1bGVEZXNjcmlwdGlvbn1gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBub3RlRGlzcGxheSA9IHJvdXRlLm5vdGUgJiYgcm91dGUubm90ZS5sZW5ndGggPiAyMCA/IFxuICAgICAgICAgICAgYDxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvblwiIGRhdGEtY29udGVudD1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJvdXRlLm5vdGUpfVwiIGRhdGEtdmFyaWF0aW9uPVwid2lkZVwiIGRhdGEtcG9zaXRpb249XCJ0b3AgcmlnaHRcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImZpbGUgdGV4dCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgPC9kaXY+YCA6IFxuICAgICAgICAgICAgU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJvdXRlLm5vdGUgfHwgJycpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGF0YSBhdHRyaWJ1dGVzIGFscmVhZHkgc2FmZSBmcm9tIEFQSVxuICAgICAgICBjb25zdCBzYWZlUHJvdmlkZXJJZCA9IHByb3ZpZGVySWQ7XG4gICAgICAgIGNvbnN0IHNhZmVEaWQgPSByb3V0ZS5udW1iZXIgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPHRyIGNsYXNzPVwicnVsZS1yb3cgJHtydWxlQ2xhc3N9XCIgaWQ9XCIke3JvdXRlLmlkfVwiIFxuICAgICAgICAgICAgICAgIGRhdGEtcHJvdmlkZXI9XCIke3NhZmVQcm92aWRlcklkfVwiIFxuICAgICAgICAgICAgICAgIGRhdGEtZGlkPVwiJHtzYWZlRGlkfVwiPlxuICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cImNvbGxhcHNpbmdcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGZpdHRlZCB0b2dnbGUgY2hlY2tib3hcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWRpZD1cIiR7c2FmZURpZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXByb3ZpZGVyPVwieyR7c2FmZVByb3ZpZGVySWR9fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiICR7aXNDaGVja2VkID8gJ2NoZWNrZWQnIDogJyd9IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJyb3V0ZS0ke3JvdXRlLmlkfVwiIGRhdGEtdmFsdWU9XCIke3JvdXRlLmlkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPjwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiJHtwcm92aWRlckRpc2FibGVkfVwiPlxuICAgICAgICAgICAgICAgICAgICAke3J1bGVEZXNjcmlwdGlvbiB8fCAnPHNwYW4gY2xhc3M9XCJ0ZXh0LW11dGVkXCI+Tm8gZGVzY3JpcHRpb248L3NwYW4+J31cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cImhpZGUtb24tbW9iaWxlXCI+XG4gICAgICAgICAgICAgICAgICAgICR7bm90ZURpc3BsYXl9XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGVtcHR5IHJvdXRlcyBtZXNzYWdlIGluIHRhYmxlXG4gICAgICovXG4gICAgc2hvd0VtcHR5Um91dGVzTWVzc2FnZSgpIHtcbiAgICAgICAgY29uc3QgZW1wdHlSb3cgPSBgXG4gICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgICAgPHRkIGNvbHNwYW49XCIzXCIgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5pcl9Ob0luY29taW5nUm91dGVzIHx8ICdObyBpbmNvbWluZyByb3V0ZXMgY29uZmlndXJlZCd9XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgIGA7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQoZW1wdHlSb3cpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByb3V0aW5nIGNoZWNrYm94ZXMgd2l0aCBncm91cGVkIGxvZ2ljXG4gICAgICogV2hlbiBjaGVja2luZy91bmNoZWNraW5nIHJ1bGVzIHdpdGggc2FtZSBwcm92aWRlciBhbmQgRElEXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJvdXRpbmdDaGVja2JveGVzKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhvdmVyIGVmZmVjdCB0byBoaWdobGlnaHQgcmVsYXRlZCBydWxlc1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLmhvdmVyKFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkcm93LmF0dHIoJ2RhdGEtcHJvdmlkZXInKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkaWQgPSAkcm93LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHByZXZpb3VzIGhpZ2hsaWdodHNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLnJlbW92ZUNsYXNzKCdyZWxhdGVkLWhpZ2hsaWdodCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhpZ2hsaWdodCBhbGwgcnVsZXMgd2l0aCBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzZWxlY3RvciA9IGAucnVsZS1yb3dbZGF0YS1wcm92aWRlcj1cIiR7cHJvdmlkZXJ9XCJdYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGhvdmVyaW5nIG9uIHNwZWNpZmljIERJRCBydWxlLCBoaWdobGlnaHQgYWxsIHdpdGggc2FtZSBESURcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9IGBbZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgaG92ZXJpbmcgb24gZ2VuZXJhbCBydWxlLCBoaWdobGlnaHQgYWxsIGdlbmVyYWwgcnVsZXMgZm9yIHRoaXMgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9ICdbZGF0YS1kaWQ9XCJcIl0nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCAkcmVsYXRlZFJvd3MgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICAkcmVsYXRlZFJvd3MuYWRkQ2xhc3MoJ3JlbGF0ZWQtaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBoaWdobGlnaHRzIG9uIG1vdXNlIGxlYXZlXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCcucnVsZS1yb3cnKS5yZW1vdmVDbGFzcygncmVsYXRlZC1oaWdobGlnaHQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3ggYmVoYXZpb3Igd2l0aCB0b29sdGlwc1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy51aS5jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgZGlkID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlciA9ICRjaGVja2JveC5hdHRyKCdkYXRhLXByb3ZpZGVyJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCB0b29sdGlwIHRvIGV4cGxhaW4gZ3JvdXBpbmdcbiAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgbGV0IHRvb2x0aXBUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGRpZCkge1xuICAgICAgICAgICAgICAgICAgICB0b29sdGlwVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS50Zl9Ub29sdGlwU3BlY2lmaWNSdWxlIHx8ICdUaGlzIHJ1bGUgYXBwbGllcyB0byBjYWxscyB0byBzcGVjaWZpYyBudW1iZXIuIFJlbGF0ZWQgcnVsZXMgd2lsbCBiZSBzeW5jaHJvbml6ZWQuJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0b29sdGlwVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS50Zl9Ub29sdGlwR2VuZXJhbFJ1bGUgfHwgJ1RoaXMgcnVsZSBhcHBsaWVzIHRvIGFsbCBjYWxscyBmcm9tIHByb3ZpZGVyLiBSZWxhdGVkIHJ1bGVzIHdpbGwgYmUgc3luY2hyb25pemVkLic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjaGVja2JveC5hdHRyKCdkYXRhLWNvbnRlbnQnLCB0b29sdGlwVGV4dCk7XG4gICAgICAgICAgICAgICAgJGNoZWNrYm94LmF0dHIoJ2RhdGEtdmFyaWF0aW9uJywgJ3RpbnknKTtcbiAgICAgICAgICAgICAgICAkY2hlY2tib3gucG9wdXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94IGNoYW5nZSBiZWhhdmlvclxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy51aS5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpLnBhcmVudCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICRjaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpZCA9ICRjaGVja2JveC5hdHRyKCdkYXRhLWRpZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtcHJvdmlkZXInKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTa2lwIHN5bmNocm9uaXphdGlvbiBmb3IgJ25vbmUnIHByb3ZpZGVyIChkaXJlY3QgY2FsbHMpXG4gICAgICAgICAgICAgICAgaWYgKCFwcm92aWRlciB8fCBwcm92aWRlciA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGdyb3VwZWQgbG9naWMgcmVxdWlyZW1lbnRzXG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzZWxlY3RvciA9IGAjcm91dGluZy10YWJsZSAudWkuY2hlY2tib3hbZGF0YS1wcm92aWRlcj1cIiR7cHJvdmlkZXJ9XCJdYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWQgJiYgZGlkICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUnVsZSB3aXRoIHNwZWNpZmljIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gY2hlY2tpbmcgYSBydWxlIHdpdGggRElELCBjaGVjayBhbGwgcnVsZXMgd2l0aCBzYW1lIHByb3ZpZGVyIGFuZCBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvcldpdGhESUQgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JXaXRoRElEKS5ub3QoJGNoZWNrYm94KS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiB1bmNoZWNraW5nIGEgcnVsZSB3aXRoIERJRDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAxLiBVbmNoZWNrIGFsbCBydWxlcyB3aXRoIHNhbWUgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JXaXRoRElEID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiJHtkaWR9XCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yV2l0aERJRCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiBBbHNvIHVuY2hlY2sgZ2VuZXJhbCBydWxlcyAod2l0aG91dCBESUQpIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdlbmVyYWwgcnVsZSB3aXRob3V0IERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHVuY2hlY2tpbmcgZ2VuZXJhbCBydWxlLCBvbmx5IHVuY2hlY2sgb3RoZXIgZ2VuZXJhbCBydWxlcyBmb3Igc2FtZSBwcm92aWRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yR2VuZXJhbCA9IGAke3NlbGVjdG9yfVtkYXRhLWRpZD1cIlwiXWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChzZWxlY3RvckdlbmVyYWwpLm5vdCgkY2hlY2tib3gpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gY2hlY2tpbmcgZ2VuZXJhbCBydWxlLCBjaGVjayBhbGwgZ2VuZXJhbCBydWxlcyBmb3Igc2FtZSBwcm92aWRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yR2VuZXJhbCA9IGAke3NlbGVjdG9yfVtkYXRhLWRpZD1cIlwiXWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChzZWxlY3RvckdlbmVyYWwpLm5vdCgkY2hlY2tib3gpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2VcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBlcmFzZSBidXR0b25zIGZvciBkYXRlL3RpbWUgZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUVyYXNlcnMoKSB7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGVyYXNlRGF0ZXNCdG4ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJhc2VXZWVrZGF5c0J0bi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheVRvRHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJhc2VUaW1lcGVyaW9kQnRuLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZVN0YXJ0LmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVzY3JpcHRpb24gZmllbGQgd2l0aCBhdXRvLXJlc2l6ZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEZXNjcmlwdGlvbkZpZWxkKCkge1xuICAgICAgICAvLyBBdXRvLXJlc2l6ZSBvbiBpbnB1dFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRkZXNjcmlwdGlvbkZpZWxkLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XG4gICAgICAgICAgICB0aGlzLnN0eWxlLmhlaWdodCA9ICh0aGlzLnNjcm9sbEhlaWdodCkgKyAncHgnO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWwgcmVzaXplXG4gICAgICAgIGlmIChvdXRPZldvcmtUaW1lUmVjb3JkLiRkZXNjcmlwdGlvbkZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRkZXNjcmlwdGlvbkZpZWxkLnRyaWdnZXIoJ2lucHV0Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhlbHBlciB0byBzZXQgZGF0ZSBmcm9tIHRpbWVzdGFtcCBvciBkYXRlIHN0cmluZ1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcn0gZGF0ZVZhbHVlIC0gVW5peCB0aW1lc3RhbXAgb3IgZGF0ZSBzdHJpbmcgKFlZWVktTU0tREQpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yIC0galF1ZXJ5IHNlbGVjdG9yXG4gICAgICovXG4gICAgc2V0RGF0ZUZyb21UaW1lc3RhbXAoZGF0ZVZhbHVlLCBzZWxlY3Rvcikge1xuICAgICAgICBpZiAoIWRhdGVWYWx1ZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyBhIGRhdGUgc3RyaW5nIGluIFlZWVktTU0tREQgZm9ybWF0IGZpcnN0XG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZVZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGRhdGUgZm9ybWF0IFlZWVktTU0tRERcbiAgICAgICAgICAgIGlmICgvXlxcZHs0fS1cXGR7Mn0tXFxkezJ9JC8udGVzdChkYXRlVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGRhdGVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc05hTihkYXRlLmdldFRpbWUoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgJChzZWxlY3RvcikuY2FsZW5kYXIoJ3NldCBkYXRlJywgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRyeSB0byBwYXJzZSBhcyBVbml4IHRpbWVzdGFtcCAoYWxsIGRpZ2l0cylcbiAgICAgICAgICAgIGlmICgvXlxcZCskLy50ZXN0KGRhdGVWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBwYXJzZUludChkYXRlVmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmICh0aW1lc3RhbXAgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgVW5peCB0aW1lc3RhbXAgdG8gRGF0ZVxuICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRhdGVWYWx1ZSA9PT0gJ251bWJlcicgJiYgZGF0ZVZhbHVlID4gMCkge1xuICAgICAgICAgICAgLy8gTnVtZXJpYyBVbml4IHRpbWVzdGFtcFxuICAgICAgICAgICAgJChzZWxlY3RvcikuY2FsZW5kYXIoJ3NldCBkYXRlJywgbmV3IERhdGUoZGF0ZVZhbHVlICogMTAwMCkpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIGZvciBwYWlyZWQgZmllbGRzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCAtIEZvcm0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R8Ym9vbGVhbn0gUmVzdWx0IG9iamVjdCBvciBmYWxzZSBpZiB2YWxpZGF0aW9uIGZhaWxzXG4gICAgICovXG4gICAgY3VzdG9tVmFsaWRhdGVGb3JtKHJlc3VsdCkge1xuICAgICAgICAvLyBDaGVjayBkYXRlIGZpZWxkcyAtIGJvdGggc2hvdWxkIGJlIGZpbGxlZCBvciBib3RoIGVtcHR5XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEuZGF0ZV9mcm9tICE9PSAnJyAmJiByZXN1bHQuZGF0YS5kYXRlX3RvID09PSAnJykgfHxcbiAgICAgICAgICAgIChyZXN1bHQuZGF0YS5kYXRlX3RvICE9PSAnJyAmJiByZXN1bHQuZGF0YS5kYXRlX2Zyb20gPT09ICcnKSkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tEYXRlSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB3ZWVrZGF5IGZpZWxkcyAtIGJvdGggc2hvdWxkIGJlIGZpbGxlZCBvciBib3RoIGVtcHR5XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID4gMCAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X3RvID09PSAnLTEnKSB8fFxuICAgICAgICAgICAgKHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA9PT0gJy0xJykpIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGVycm9yTWVzc2FnZS5odG1sKGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrV2Vla0RheUludGVydmFsKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgdGltZSBmaWVsZHMgLSBib3RoIHNob3VsZCBiZSBmaWxsZWQgb3IgYm90aCBlbXB0eVxuICAgICAgICBpZiAoKHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID09PSAwKSB8fFxuICAgICAgICAgICAgKHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID4gMCAmJiByZXN1bHQuZGF0YS50aW1lX2Zyb20ubGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvciB0aW1lZnJhbWUgdHlwZSwgY2hlY2sgdGhhdCBhdCBsZWFzdCBvbmUgY29uZGl0aW9uIGlzIHNwZWNpZmllZFxuICAgICAgICBjb25zdCBjYWxUeXBlID0gcmVzdWx0LmRhdGEuY2FsVHlwZSB8fCAndGltZWZyYW1lJztcbiAgICAgICAgaWYgKGNhbFR5cGUgPT09ICd0aW1lZnJhbWUnIHx8IGNhbFR5cGUgPT09ICcnKSB7XG4gICAgICAgICAgICBjb25zdCBoYXNEYXRlUmFuZ2UgPSByZXN1bHQuZGF0YS5kYXRlX2Zyb20gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gIT09ICcnO1xuICAgICAgICAgICAgY29uc3QgaGFzV2Vla2RheVJhbmdlID0gcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID4gMCAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X3RvID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGhhc1RpbWVSYW5nZSA9IHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFoYXNEYXRlUmFuZ2UgJiYgIWhhc1dlZWtkYXlSYW5nZSAmJiAhaGFzVGltZVJhbmdlKSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlTm9SdWxlc1NlbGVjdGVkKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIHNlbmRpbmcgZm9ybVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fGJvb2xlYW59IFVwZGF0ZWQgc2V0dGluZ3Mgb3IgZmFsc2VcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBjaGVja2JveCB2YWx1ZXMgZnJvbSAnb24nL3VuZGVmaW5lZCB0byB0cnVlL2ZhbHNlXG4gICAgICAgIC8vIFByb2Nlc3MgYWxsIHJvdXRlIGNoZWNrYm94ZXNcbiAgICAgICAgT2JqZWN0LmtleXMocmVzdWx0LmRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgncm91dGUtJykpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtrZXldID0gcmVzdWx0LmRhdGFba2V5XSA9PT0gJ29uJyB8fCByZXN1bHQuZGF0YVtrZXldID09PSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgYWxsb3dSZXN0cmljdGlvbiBjaGVja2JveFxuICAgICAgICBpZiAoJ2FsbG93UmVzdHJpY3Rpb24nIGluIHJlc3VsdC5kYXRhKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hbGxvd1Jlc3RyaWN0aW9uID0gcmVzdWx0LmRhdGEuYWxsb3dSZXN0cmljdGlvbiA9PT0gJ29uJyB8fCByZXN1bHQuZGF0YS5hbGxvd1Jlc3RyaWN0aW9uID09PSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2FsVHlwZSBjb252ZXJzaW9uIChtYXRjaGVzIG9sZCBjb250cm9sbGVyOiAoJGRhdGFbJG5hbWVdID09PSAndGltZWZyYW1lJykgPyAnJyA6ICRkYXRhWyRuYW1lXSlcbiAgICAgICAgLy8gRm9yIHNhdmluZyB3ZSBjb252ZXJ0ICd0aW1lZnJhbWUnIHRvIGVtcHR5IHN0cmluZ1xuICAgICAgICBpZiAocmVzdWx0LmRhdGEuY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNhbFR5cGUgPSAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHdlZWtkYXkgdmFsdWVzIChtYXRjaGVzIG9sZCBjb250cm9sbGVyOiAoJGRhdGFbJG5hbWVdIDwgMSkgPyBudWxsIDogJGRhdGFbJG5hbWVdKVxuICAgICAgICBpZiAocmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID09PSAnLTEnIHx8IHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA8IDEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS53ZWVrZGF5X3RvID09PSAnLTEnIHx8IHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPCAxKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS53ZWVrZGF5X3RvID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBwYXNzd29yZCBmaWVsZCAtIGlmIHVzZXIgZGlkbid0IGNoYW5nZSB0aGUgbWFza2VkIHBhc3N3b3JkLCBrZWVwIGl0IGFzIGlzXG4gICAgICAgIC8vIFRoZSBiYWNrZW5kIHdpbGwgcmVjb2duaXplICdYWFhYWFgnIGFuZCB3b24ndCB1cGRhdGUgdGhlIHBhc3N3b3JkXG4gICAgICAgIC8vIElmIHVzZXIgY2xlYXJlZCB0aGUgZmllbGQgb3IgZW50ZXJlZCBuZXcgdmFsdWUsIHNlbmQgdGhhdFxuICAgICAgICBpZiAocmVzdWx0LmRhdGEuY2FsU2VjcmV0ID09PSAnWFhYWFhYJykge1xuICAgICAgICAgICAgLy8gVXNlciBkaWRuJ3QgY2hhbmdlIHRoZSBtYXNrZWQgcGFzc3dvcmQsIGJhY2tlbmQgd2lsbCBrZWVwIGV4aXN0aW5nIHZhbHVlXG4gICAgICAgIH0gZWxzZSBpZiAocmVzdWx0LmRhdGEuY2FsU2VjcmV0ID09PSAnJykge1xuICAgICAgICAgICAgLy8gVXNlciBjbGVhcmVkIHRoZSBwYXNzd29yZCBmaWVsZCwgYmFja2VuZCB3aWxsIGNsZWFyIHRoZSBwYXNzd29yZFxuICAgICAgICB9XG4gICAgICAgIC8vIE90aGVyd2lzZSBzZW5kIHRoZSBuZXcgcGFzc3dvcmQgdmFsdWUgYXMgZW50ZXJlZFxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRpbWUgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBjYWxlbmRhciB0eXBlXG4gICAgICAgIGNvbnN0IGNhbFR5cGUgPSByZXN1bHQuZGF0YS5jYWxUeXBlIHx8ICd0aW1lZnJhbWUnO1xuICAgICAgICBpZiAoY2FsVHlwZSA9PT0gJycgfHwgY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy50aW1lZnJvbS5ydWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQuYWRkaXRpb25hbFRpbWVJbnRlcnZhbFJ1bGVzO1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLnRpbWV0by5ydWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQuYWRkaXRpb25hbFRpbWVJbnRlcnZhbFJ1bGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLnRpbWVmcm9tLnJ1bGVzID0gW107XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZXRvLnJ1bGVzID0gW107XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgZGF0ZXMgdG8gdGltZXN0YW1wc1xuICAgICAgICBjb25zdCBkYXRlRnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICBpZiAoZGF0ZUZyb20pIHtcbiAgICAgICAgICAgIGRhdGVGcm9tLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID0gTWF0aC5mbG9vcihkYXRlRnJvbS5nZXRUaW1lKCkgLyAxMDAwKS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkYXRlVG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIGlmIChkYXRlVG8pIHtcbiAgICAgICAgICAgIGRhdGVUby5zZXRIb3VycygyMywgNTksIDU5LCAwKTtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmRhdGVfdG8gPSBNYXRoLmZsb29yKGRhdGVUby5nZXRUaW1lKCkgLyAxMDAwKS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDb2xsZWN0IHNlbGVjdGVkIGluY29taW5nIHJvdXRlc1xuICAgICAgICBjb25zdCBzZWxlY3RlZFJvdXRlcyA9IFtdO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlSWQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGlmIChyb3V0ZUlkKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRSb3V0ZXMucHVzaChyb3V0ZUlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5kYXRhLmluY29taW5nUm91dGVJZHMgPSBzZWxlY3RlZFJvdXRlcztcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGFjdGlvbi1kZXBlbmRlbnQgZmllbGRzIGJhc2VkIG9uIHNlbGVjdGlvblxuICAgICAgICBpZiAocmVzdWx0LmRhdGEuYWN0aW9uID09PSAnZXh0ZW5zaW9uJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXVkaW9fbWVzc2FnZV9pZCA9ICcnO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdC5kYXRhLmFjdGlvbiA9PT0gJ3BsYXltZXNzYWdlJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZXh0ZW5zaW9uID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJ1biBjdXN0b20gdmFsaWRhdGlvbiBmb3IgcGFpcmVkIGZpZWxkc1xuICAgICAgICByZXR1cm4gb3V0T2ZXb3JrVGltZVJlY29yZC5jdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBpZiB0aGlzIHdhcyBhIG5ldyByZWNvcmRcbiAgICAgICAgICAgIGlmICghb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IGAke2dsb2JhbFJvb3RVcmx9b3V0LW9mZi13b3JrLXRpbWUvbW9kaWZ5LyR7cmVzcG9uc2UuZGF0YS5pZH1gO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZElkID0gcmVzcG9uc2UuZGF0YS5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVsb2FkIGRhdGEgdG8gZW5zdXJlIGNvbnNpc3RlbmN5XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmxvYWRGb3JtRGF0YSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfW91dC1vZmYtd29yay10aW1lL3NhdmVgO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBvdXRPZldvcmtUaW1lUmVjb3JkLmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gT3V0T2ZmV29ya1RpbWVBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHMgdXNpbmcgVG9vbHRpcEJ1aWxkZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGQgdG9vbHRpcFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIGNhbFVybDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgeyB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfaGVhZGVyLCBkZWZpbml0aW9uOiBudWxsIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl9nb29nbGUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl9uZXh0Y2xvdWQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl95YW5kZXhcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHsgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfaWNhbGVuZGFyX2hlYWRlciwgZGVmaW5pdGlvbjogbnVsbCB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9pY2FsZW5kYXJfZGVzY1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfZXhhbXBsZV9nb29nbGUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVfbmV4dGNsb3VkLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9leGFtcGxlX2ljc1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXNIZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgdGhhdCBjaGVja3MgaWYgYSB2YWx1ZSBpcyBub3QgZW1wdHkgYmFzZWQgb24gYSBzcGVjaWZpYyBhY3Rpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWRcbiAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHRvIGNvbXBhcmUgYWdhaW5zdFxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgdHJ1ZSBpZiB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZSA9IGZ1bmN0aW9uKHZhbHVlLCBhY3Rpb24pIHtcbiAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwICYmIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkZpZWxkLnZhbCgpID09PSBhY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgY2FsZW5kYXIgVVJMIGZpZWxkXG4gKiBWYWxpZGF0ZXMgVVJMIG9ubHkgd2hlbiBjYWxlbmRhciB0eXBlIGlzIG5vdCAnbm9uZScgb3IgJ3RpbWUnXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21Ob3RFbXB0eUlmQ2FsVHlwZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgY29uc3QgY2FsVHlwZSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbFR5cGVGaWVsZC52YWwoKTtcbiAgICBcbiAgICAvLyBJZiBjYWxlbmRhciB0eXBlIGlzIHRpbWVmcmFtZSBvciB0aW1lLCBVUkwgaXMgbm90IHJlcXVpcmVkXG4gICAgaWYgKCFjYWxUeXBlIHx8IGNhbFR5cGUgPT09ICd0aW1lZnJhbWUnIHx8IGNhbFR5cGUgPT09ICd0aW1lJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgLy8gSWYgY2FsZW5kYXIgdHlwZSBpcyBDQUxEQVYgb3IgSUNBTCwgdmFsaWRhdGUgVVJMXG4gICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICAvLyBDaGVjayBpZiBpdCdzIGEgdmFsaWQgVVJMXG4gICAgdHJ5IHtcbiAgICAgICAgbmV3IFVSTCh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==