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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PZmZXb3JrVGltZXMvb2ZmLXdvcmstdGltZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm91dE9mV29ya1RpbWVSZWNvcmQiLCIkZm9ybU9iaiIsIiQiLCJyZWNvcmRJZCIsInJlY29yZERhdGEiLCIkdGltZV9mcm9tIiwiJHRpbWVfdG8iLCIkcnVsZXNUYWJsZSIsIiRpZEZpZWxkIiwiJHdlZWtkYXlGcm9tRmllbGQiLCIkd2Vla2RheVRvRmllbGQiLCIkYWN0aW9uRmllbGQiLCIkY2FsVHlwZUZpZWxkIiwiJGV4dGVuc2lvbkZpZWxkIiwiJGFsbG93UmVzdHJpY3Rpb25GaWVsZCIsIiRkZXNjcmlwdGlvbkZpZWxkIiwiJGFjdGlvbkRyb3Bkb3duIiwiJGNhbFR5cGVEcm9wZG93biIsIiR3ZWVrZGF5RnJvbURyb3Bkb3duIiwiJHdlZWtkYXlUb0Ryb3Bkb3duIiwiJHRhYk1lbnUiLCIkcnVsZXNUYWIiLCIkZ2VuZXJhbFRhYiIsIiRydWxlc1RhYlNlZ21lbnQiLCIkZ2VuZXJhbFRhYlNlZ21lbnQiLCIkZXh0ZW5zaW9uUm93IiwiJGF1ZGlvTWVzc2FnZVJvdyIsIiRjYWxlbmRhclRhYiIsIiRtYWluVGFiIiwiJHJhbmdlRGF5c1N0YXJ0IiwiJHJhbmdlRGF5c0VuZCIsIiRyYW5nZVRpbWVTdGFydCIsIiRyYW5nZVRpbWVFbmQiLCIkZXJhc2VEYXRlc0J0biIsIiRlcmFzZVdlZWtkYXlzQnRuIiwiJGVyYXNlVGltZXBlcmlvZEJ0biIsIiRlcnJvck1lc3NhZ2UiLCJhdWRpb01lc3NhZ2VJZCIsImFkZGl0aW9uYWxUaW1lSW50ZXJ2YWxSdWxlcyIsInR5cGUiLCJ2YWx1ZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZXh0ZW5zaW9uIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidGZfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSIsImF1ZGlvX21lc3NhZ2VfaWQiLCJ0Zl9WYWxpZGF0ZUF1ZGlvTWVzc2FnZUVtcHR5IiwiY2FsVXJsIiwidGZfVmFsaWRhdGVDYWxVcmkiLCJ0aW1lZnJvbSIsIm9wdGlvbmFsIiwidGltZXRvIiwiaW5pdGlhbGl6ZSIsInZhbCIsInRhYiIsImluaXRpYWxpemVGb3JtIiwiaW5pdGlhbGl6ZUNhbGVuZGFycyIsImluaXRpYWxpemVSb3V0aW5nVGFibGUiLCJpbml0aWFsaXplRXJhc2VycyIsImluaXRpYWxpemVEZXNjcmlwdGlvbkZpZWxkIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwibG9hZEZvcm1EYXRhIiwiYWRkQ2xhc3MiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlYXJjaCIsImNvcHlJZCIsImdldCIsIk9mZldvcmtUaW1lc0FQSSIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwicG9wdWxhdGVGb3JtIiwibG9hZFJvdXRpbmdUYWJsZSIsInNldFRpbWVvdXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJtZXNzYWdlcyIsImVycm9yIiwiZXJyb3JNZXNzYWdlIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJyZWNvcmRJZFRvTG9hZCIsImdldFJlY29yZCIsInNhdmVJbml0aWFsVmFsdWVzIiwiY2hlY2tWYWx1ZXMiLCJpbml0aWFsaXplRHJvcGRvd25zIiwid2Vla0RheXMiLCJ0ZXh0IiwiaSIsImRhdGUiLCJEYXRlIiwiZGF5TmFtZSIsInRvTG9jYWxlRGF0ZVN0cmluZyIsIndlZWtkYXkiLCJ0cmFuc2xhdGVkRGF5IiwicHVzaCIsIm5hbWUiLCJ0b1N0cmluZyIsImRyb3Bkb3duIiwidmFsdWVzIiwib25DaGFuZ2UiLCJvbkFjdGlvbkNoYW5nZSIsIm9uQ2FsVHlwZUNoYW5nZSIsImluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvciIsIlNvdW5kRmlsZVNlbGVjdG9yIiwiaW5pdCIsImNhdGVnb3J5IiwiaW5jbHVkZUVtcHR5IiwiYXVkaW9fbWVzc2FnZV9pZF9yZXByZXNlbnQiLCJzZXRWYWx1ZSIsImluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvciIsIkV4dGVuc2lvblNlbGVjdG9yIiwiaXNDb3B5IiwiaGFzIiwicHJpb3JpdHkiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsInVuaXFpZCIsImRlc2NyaXB0aW9uIiwiY2FsVHlwZSIsIndlZWtkYXlfZnJvbSIsIndlZWtkYXlfdG8iLCJ0aW1lX2Zyb20iLCJ0aW1lX3RvIiwiY2FsVXNlciIsImNhbFNlY3JldCIsImFjdGlvbiIsImFsbG93UmVzdHJpY3Rpb24iLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCIkY2FsU2VjcmV0RmllbGQiLCJhdHRyIiwidGZfUGFzc3dvcmRNYXNrZWQiLCJ0Zl9FbnRlclBhc3N3b3JkIiwiZGF0ZV9mcm9tIiwic2V0RGF0ZUZyb21UaW1lc3RhbXAiLCJkYXRlX3RvIiwidG9nZ2xlUnVsZXNUYWIiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJmb3JtIiwic2hvdyIsImhpZGUiLCJjbGVhciIsImNhbGVuZGFyIiwiZmlyc3REYXlPZldlZWsiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImNhbGVuZGFyRmlyc3REYXlPZldlZWsiLCJjYWxlbmRhclRleHQiLCJlbmRDYWxlbmRhciIsImlubGluZSIsIm1vbnRoRmlyc3QiLCJyZWdFeHAiLCJzdGFydENhbGVuZGFyIiwiZGlzYWJsZU1pbnV0ZSIsImFtcG0iLCJwYXJlbnQiLCJjaGVja2JveCIsImlzQ2hlY2tlZCIsImZpbmQiLCJoYXNDbGFzcyIsImVtcHR5IiwiYXNzb2NpYXRlZElkcyIsImluY29taW5nUm91dGVJZHMiLCJJbmNvbWluZ1JvdXRlc0FQSSIsImdldExpc3QiLCJncm91cGVkUm91dGVzIiwiZ3JvdXBBbmRTb3J0Um91dGVzIiwicmVuZGVyR3JvdXBlZFJvdXRlcyIsImluaXRpYWxpemVSb3V0aW5nQ2hlY2tib3hlcyIsInBvcHVwIiwic2hvd0VtcHR5Um91dGVzTWVzc2FnZSIsInJvdXRlcyIsImdyb3VwcyIsImZvckVhY2giLCJyb3V0ZSIsInByb3ZpZGVySWQiLCJwcm92aWRlciIsInByb3ZpZGVyTmFtZSIsInByb3ZpZGVyaWRfcmVwcmVzZW50IiwiaXJfTm9Bc3NpZ25lZFByb3ZpZGVyIiwidGVtcERpdiIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsImlubmVySFRNTCIsImNsZWFuUHJvdmlkZXJOYW1lIiwidGV4dENvbnRlbnQiLCJpbm5lclRleHQiLCJwcm92aWRlck5hbWVIdG1sIiwicHJvdmlkZXJEaXNhYmxlZCIsImdlbmVyYWxSdWxlcyIsInNwZWNpZmljUnVsZXMiLCJudW1iZXIiLCJPYmplY3QiLCJrZXlzIiwic29ydCIsImEiLCJiIiwiZGlkIiwidGJvZHkiLCJpc0ZpcnN0R3JvdXAiLCJncm91cCIsImFwcGVuZCIsInJvdyIsImNyZWF0ZVJvdXRlUm93IiwiaW5kZXgiLCJpc0ZpcnN0SW5ESUQiLCJydWxlQ2xhc3MiLCJzaG93RElESW5kaWNhdG9yIiwiaW5jbHVkZXMiLCJwYXJzZUludCIsInJ1bGVEZXNjcmlwdGlvbiIsInJ1bGVfcmVwcmVzZW50Iiwibm90ZURpc3BsYXkiLCJub3RlIiwibGVuZ3RoIiwic2FmZVByb3ZpZGVySWQiLCJzYWZlRGlkIiwiZW1wdHlSb3ciLCJpcl9Ob0luY29taW5nUm91dGVzIiwiaG92ZXIiLCIkcm93Iiwic2VsZWN0b3IiLCIkcmVsYXRlZFJvd3MiLCJlYWNoIiwiJGNoZWNrYm94IiwidG9vbHRpcFRleHQiLCJ0Zl9Ub29sdGlwU3BlY2lmaWNSdWxlIiwidGZfVG9vbHRpcEdlbmVyYWxSdWxlIiwic2VsZWN0b3JXaXRoRElEIiwibm90Iiwic2VsZWN0b3JHZW5lcmFsIiwib24iLCJzdHlsZSIsImhlaWdodCIsInNjcm9sbEhlaWdodCIsInRyaWdnZXIiLCJkYXRlVmFsdWUiLCJ0ZXN0IiwiaXNOYU4iLCJnZXRUaW1lIiwidGltZXN0YW1wIiwiY3VzdG9tVmFsaWRhdGVGb3JtIiwiaHRtbCIsInRmX1ZhbGlkYXRlQ2hlY2tEYXRlSW50ZXJ2YWwiLCIkc3VibWl0QnV0dG9uIiwidHJhbnNpdGlvbiIsInRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwiLCJoYXNEYXRlUmFuZ2UiLCJoYXNXZWVrZGF5UmFuZ2UiLCJoYXNUaW1lUmFuZ2UiLCJ0Zl9WYWxpZGF0ZU5vUnVsZXNTZWxlY3RlZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImtleSIsInN0YXJ0c1dpdGgiLCJkYXRlRnJvbSIsInNldEhvdXJzIiwiTWF0aCIsImZsb29yIiwiZGF0ZVRvIiwic2VsZWN0ZWRSb3V0ZXMiLCJyb3V0ZUlkIiwiY2JBZnRlclNlbmRGb3JtIiwibmV3VXJsIiwiZ2xvYmFsUm9vdFVybCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiT2ZmV29ya1RpbWVzVG9vbHRpcE1hbmFnZXIiLCJmbiIsImN1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlIiwiY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUiLCJVUkwiLCJfIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG1CQUFtQixHQUFHO0FBQ3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHVCQUFELENBTGE7O0FBT3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQVhjO0FBV1I7O0FBRWhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVB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R0FYOEQsQ0FhL0Q7OztBQUNBLE1BQUk7QUFDQSxRQUFJOEQsR0FBSixDQUFRelAsS0FBUjtBQUNBLFdBQU8sSUFBUDtBQUNILEdBSEQsQ0FHRSxPQUFPMFAsQ0FBUCxFQUFVO0FBQ1IsV0FBTyxLQUFQO0FBQ0g7QUFDSixDQXBCRCxDLENBc0JBOzs7QUFDQWhTLENBQUMsQ0FBQ2dNLFFBQUQsQ0FBRCxDQUFZaUcsS0FBWixDQUFrQixZQUFNO0FBQ3BCblMsRUFBQUEsbUJBQW1CLENBQUN3RCxVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCBnbG9iYWxSb290VXJsIEV4dGVuc2lvbnMgbW9tZW50IEZvcm0gZ2xvYmFsVHJhbnNsYXRlXG4gICBTZW1hbnRpY0xvY2FsaXphdGlvbiBTb3VuZEZpbGVTZWxlY3RvciBVc2VyTWVzc2FnZSBTZWN1cml0eVV0aWxzXG4gICBJbmNvbWluZ1JvdXRlc0FQSSBPZmZXb3JrVGltZXNBUEkgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciBFeHRlbnNpb25TZWxlY3RvciBPZmZXb3JrVGltZXNUb29sdGlwTWFuYWdlciAqL1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgbWFuYWdpbmcgb3V0LW9mLXdvcmsgdGltZSBzZXR0aW5nc1xuICogXG4gKiBUaGlzIG1vZHVsZSBoYW5kbGVzIHRoZSBmb3JtIGZvciBjcmVhdGluZyBhbmQgZWRpdGluZyBvdXQtb2Ytd29yayB0aW1lIGNvbmRpdGlvbnMuXG4gKiBJdCB1c2VzIGEgdW5pZmllZCBSRVNUIEFQSSBhcHByb2FjaCBtYXRjaGluZyB0aGUgaW5jb21pbmcgcm91dGVzIHBhdHRlcm4uXG4gKiBcbiAqIEBtb2R1bGUgb3V0T2ZXb3JrVGltZVJlY29yZFxuICovXG5jb25zdCBvdXRPZldvcmtUaW1lUmVjb3JkID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLW91dG9mZndvcmstZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogUmVjb3JkIElEIGZyb20gVVJMXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICByZWNvcmRJZDogbnVsbCwgLy8gV2lsbCBiZSBzZXQgaW4gaW5pdGlhbGl6ZSgpXG4gICAgXG4gICAgLyoqXG4gICAgICogU3RvcmUgbG9hZGVkIHJlY29yZCBkYXRhXG4gICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAqL1xuICAgIHJlY29yZERhdGE6IG51bGwsXG5cbiAgICAvLyBGb3JtIGZpZWxkIGpRdWVyeSBvYmplY3RzXG4gICAgJHRpbWVfZnJvbTogJCgnI3RpbWVfZnJvbScpLFxuICAgICR0aW1lX3RvOiAkKCcjdGltZV90bycpLFxuICAgICRydWxlc1RhYmxlOiAkKCcjcm91dGluZy10YWJsZScpLFxuICAgIFxuICAgIC8vIEhpZGRlbiBpbnB1dCBmaWVsZHNcbiAgICAkaWRGaWVsZDogJCgnI2lkJyksXG4gICAgJHdlZWtkYXlGcm9tRmllbGQ6ICQoJyN3ZWVrZGF5X2Zyb20nKSxcbiAgICAkd2Vla2RheVRvRmllbGQ6ICQoJyN3ZWVrZGF5X3RvJyksXG4gICAgJGFjdGlvbkZpZWxkOiAkKCcjYWN0aW9uJyksXG4gICAgJGNhbFR5cGVGaWVsZDogJCgnI2NhbFR5cGUnKSxcbiAgICAkZXh0ZW5zaW9uRmllbGQ6ICQoJyNleHRlbnNpb24nKSxcbiAgICAkYWxsb3dSZXN0cmljdGlvbkZpZWxkOiAkKCcjYWxsb3dSZXN0cmljdGlvbicpLFxuICAgICRkZXNjcmlwdGlvbkZpZWxkOiAkKCcjZGVzY3JpcHRpb24nKSxcbiAgICBcbiAgICAvLyBEcm9wZG93biBlbGVtZW50c1xuICAgICRhY3Rpb25Ecm9wZG93bjogJCgnI2FjdGlvbi1kcm9wZG93bicpLFxuICAgICRjYWxUeXBlRHJvcGRvd246ICQoJy5jYWxUeXBlLXNlbGVjdCcpLFxuICAgICR3ZWVrZGF5RnJvbURyb3Bkb3duOiAkKCcud2Vla2RheS1mcm9tLXNlbGVjdCcpLFxuICAgICR3ZWVrZGF5VG9Ecm9wZG93bjogJCgnLndlZWtkYXktdG8tc2VsZWN0JyksXG4gICAgXG4gICAgLy8gVGFiIGVsZW1lbnRzXG4gICAgJHRhYk1lbnU6ICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbScpLFxuICAgICRydWxlc1RhYjogbnVsbCwgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBsYXRlclxuICAgICRnZW5lcmFsVGFiOiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgJHJ1bGVzVGFiU2VnbWVudDogbnVsbCwgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBsYXRlclxuICAgICRnZW5lcmFsVGFiU2VnbWVudDogbnVsbCwgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBsYXRlclxuICAgIFxuICAgIC8vIFJvdyBlbGVtZW50c1xuICAgICRleHRlbnNpb25Sb3c6ICQoJyNleHRlbnNpb24tcm93JyksXG4gICAgJGF1ZGlvTWVzc2FnZVJvdzogJCgnI2F1ZGlvLW1lc3NhZ2Utcm93JyksXG4gICAgXG4gICAgLy8gQ2FsZW5kYXIgdGFiIGVsZW1lbnRzXG4gICAgJGNhbGVuZGFyVGFiOiAkKCcjY2FsbC10eXBlLWNhbGVuZGFyLXRhYicpLFxuICAgICRtYWluVGFiOiAkKCcjY2FsbC10eXBlLW1haW4tdGFiJyksXG4gICAgXG4gICAgLy8gRGF0ZS90aW1lIGNhbGVuZGFyIGVsZW1lbnRzXG4gICAgJHJhbmdlRGF5c1N0YXJ0OiAkKCcjcmFuZ2UtZGF5cy1zdGFydCcpLFxuICAgICRyYW5nZURheXNFbmQ6ICQoJyNyYW5nZS1kYXlzLWVuZCcpLFxuICAgICRyYW5nZVRpbWVTdGFydDogJCgnI3JhbmdlLXRpbWUtc3RhcnQnKSxcbiAgICAkcmFuZ2VUaW1lRW5kOiAkKCcjcmFuZ2UtdGltZS1lbmQnKSxcbiAgICBcbiAgICAvLyBFcmFzZSBidXR0b25zXG4gICAgJGVyYXNlRGF0ZXNCdG46ICQoJyNlcmFzZS1kYXRlcycpLFxuICAgICRlcmFzZVdlZWtkYXlzQnRuOiAkKCcjZXJhc2Utd2Vla2RheXMnKSxcbiAgICAkZXJhc2VUaW1lcGVyaW9kQnRuOiAkKCcjZXJhc2UtdGltZXBlcmlvZCcpLFxuICAgIFxuICAgIC8vIEVycm9yIG1lc3NhZ2UgZWxlbWVudFxuICAgICRlcnJvck1lc3NhZ2U6ICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJyksXG4gICAgXG4gICAgLy8gQXVkaW8gbWVzc2FnZSBJRCBmb3Igc291bmQgZmlsZSBzZWxlY3RvclxuICAgIGF1ZGlvTWVzc2FnZUlkOiAnYXVkaW9fbWVzc2FnZV9pZCcsXG5cbiAgICAvKipcbiAgICAgKiBBZGRpdGlvbmFsIHRpbWUgaW50ZXJ2YWwgdmFsaWRhdGlvbiBydWxlc1xuICAgICAqIEB0eXBlIHthcnJheX1cbiAgICAgKi9cbiAgICBhZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXM6IFt7XG4gICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICB2YWx1ZTogL14oWzAxXT9bMC05XXwyWzAtM10pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICB9XSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZVtleHRlbnNpb25dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVFeHRlbnNpb25FbXB0eVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgYXVkaW9fbWVzc2FnZV9pZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2F1ZGlvX21lc3NhZ2VfaWQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZVtwbGF5bWVzc2FnZV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUF1ZGlvTWVzc2FnZUVtcHR5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBjYWxVcmw6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjYWxVcmwnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjdXN0b21Ob3RFbXB0eUlmQ2FsVHlwZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2FsVXJpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB0aW1lZnJvbToge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndGltZV9mcm9tJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAvXihbMDFdP1swLTldfDJbMC0zXSk6KFswLTVdP1swLTldKSQvLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwsXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB0aW1ldG86IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX3RvJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKFswMV0/WzAtOV18MlswLTNdKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gU2V0IHJlY29yZCBJRCBmcm9tIERPTVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZElkID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kaWRGaWVsZC52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFiIHJlZmVyZW5jZXMgdGhhdCBkZXBlbmQgb24gRE9NXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiID0gJCgnI291dC10aW1lLW1vZGlmeS1tZW51IC5pdGVtW2RhdGEtdGFiPVwicnVsZXNcIl0nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYiA9ICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbVtkYXRhLXRhYj1cImdlbmVyYWxcIl0nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJTZWdtZW50ID0gJCgnLnVpLnRhYi5zZWdtZW50W2RhdGEtdGFiPVwicnVsZXNcIl0nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYlNlZ21lbnQgPSAkKCcudWkudGFiLnNlZ21lbnRbZGF0YS10YWI9XCJnZW5lcmFsXCJdJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kdGFiTWVudS50YWIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBzdWJtaXNzaW9uIGhhbmRsaW5nXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY29tcG9uZW50cyB0aGF0IGRvbid0IGRlcGVuZCBvbiBkYXRhXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUNhbGVuZGFycygpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVSb3V0aW5nVGFibGUoKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRXJhc2VycygpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVEZXNjcmlwdGlvbkZpZWxkKCk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGRhdGEgYW5kIGluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgIC8vIFRoaXMgdW5pZmllZCBhcHByb2FjaCBsb2FkcyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgb3IgZXhpc3RpbmcgZGF0YVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmxvYWRGb3JtRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICogVW5pZmllZCBhcHByb2FjaCBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHNcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvcHkgb3BlcmF0aW9uXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGNvcHlJZCA9IHVybFBhcmFtcy5nZXQoJ2NvcHknKTtcblxuICAgICAgICBpZiAoY29weUlkKSB7XG4gICAgICAgICAgICAvLyBDb3B5IG9wZXJhdGlvbiAtIHVzZSB0aGUgbmV3IFJFU1RmdWwgY29weSBlbmRwb2ludFxuICAgICAgICAgICAgT2ZmV29ya1RpbWVzQVBJLmNhbGxDdXN0b21NZXRob2QoJ2NvcHknLCB7aWQ6IGNvcHlJZH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN1Y2Nlc3M6IHBvcHVsYXRlIGZvcm0gd2l0aCBjb3BpZWQgZGF0YVxuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZERhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIHJvdXRpbmcgcnVsZXNcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5sb2FkUm91dGluZ1RhYmxlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBhcyBtb2RpZmllZCB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDI1MCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIGVycm9yIC0gc2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vcm1hbCBsb2FkIC0gZWl0aGVyIGV4aXN0aW5nIHJlY29yZCBvciBuZXdcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkVG9Mb2FkID0gb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmRJZCB8fCAnJztcblxuICAgICAgICAgICAgLy8gTG9hZCByZWNvcmQgZGF0YSB2aWEgUkVTVCBBUEkgLSBhbHdheXMgcmV0dXJucyBkYXRhICh3aXRoIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcylcbiAgICAgICAgICAgIE9mZldvcmtUaW1lc0FQSS5nZXRSZWNvcmQocmVjb3JkSWRUb0xvYWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN1Y2Nlc3M6IHBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIChkZWZhdWx0cyBmb3IgbmV3LCByZWFsIGRhdGEgZm9yIGV4aXN0aW5nKVxuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZERhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIHJvdXRpbmcgcnVsZXNcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5sb2FkUm91dGluZ1RhYmxlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2F2ZSBpbml0aWFsIHZhbHVlcyB0byBwcmV2ZW50IHNhdmUgYnV0dG9uIGFjdGl2YXRpb25cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDI1MCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIGVycm9yIC0gc2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgZHJvcGRvd25zIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgd2Vla2RheSBkcm9wZG93bnMgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgb3JpZ2luYWwgaW1wbGVtZW50YXRpb25cbiAgICAgICAgY29uc3Qgd2Vla0RheXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnLTEnLCB0ZXh0OiAnLScgfSAvLyBEZWZhdWx0IGVtcHR5IG9wdGlvblxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRheXMgMS03IHVzaW5nIHRoZSBzYW1lIGxvZ2ljIGFzIG9yaWdpbmFsIGNvbnRyb2xsZXJcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gNzsgaSsrKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgZGF0ZSBmb3IgXCJTdW5kYXkgK2kgZGF5c1wiIHRvIG1hdGNoIG9yaWdpbmFsIGxvZ2ljXG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoMjAyMCwgMCwgNSArIGkpOyAvLyBKYW4gNSwgMjAyMCB3YXMgU3VuZGF5XG4gICAgICAgICAgICBjb25zdCBkYXlOYW1lID0gZGF0ZS50b0xvY2FsZURhdGVTdHJpbmcoJ2VuJywgeyB3ZWVrZGF5OiAnc2hvcnQnIH0pO1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB0cmFuc2xhdGlvbiBmb3IgdGhlIGRheSBhYmJyZXZpYXRpb25cbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWREYXkgPSBnbG9iYWxUcmFuc2xhdGVbZGF5TmFtZV0gfHwgZGF5TmFtZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgd2Vla0RheXMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogdHJhbnNsYXRlZERheSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHRleHQ6IHRyYW5zbGF0ZWREYXlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIHZhbHVlczogd2Vla0RheXMsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheUZyb21GaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICB2YWx1ZXM6IHdlZWtEYXlzLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlUb0ZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkFjdGlvbkNoYW5nZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2FsZW5kYXIgdHlwZSBkcm9wZG93blxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsVHlwZUZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkNhbFR5cGVDaGFuZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gc2VsZWN0b3Igd2lsbCBiZSBpbml0aWFsaXplZCBpbiBwb3B1bGF0ZUZvcm0gd2l0aCBBUEkgZGF0YVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggQVBJIGRhdGFcbiAgICAgKiBTaW5nbGUgcG9pbnQgb2YgaW5pdGlhbGl6YXRpb24gYWZ0ZXIgcmVjZWl2aW5nIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEFQSSByZXNwb25zZSBkYXRhICh3aXRoIGRlZmF1bHRzIG9yIGV4aXN0aW5nIHZhbHVlcylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3IoZGF0YSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFNvdW5kRmlsZVNlbGVjdG9yIHdpdGggY29tcGxldGUgQVBJIGRhdGEgY29udGV4dFxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KG91dE9mV29ya1RpbWVSZWNvcmQuYXVkaW9NZXNzYWdlSWQsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogZmFsc2UsICAvLyBPdXQgb2Ygd29yayB0aW1lIG11c3QgYWx3YXlzIGhhdmUgYSBzb3VuZCBmaWxlXG4gICAgICAgICAgICBkYXRhOiBkYXRhIC8vIFBhc3MgY29tcGxldGUgQVBJIGRhdGEgZm9yIHByb3BlciBpbml0aWFsaXphdGlvblxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGF1ZGlvX21lc3NhZ2VfaWQgZXhpc3RzLCBzZXQgdGhlIHZhbHVlIHdpdGggcmVwcmVzZW50YXRpb25cbiAgICAgICAgaWYgKGRhdGEuYXVkaW9fbWVzc2FnZV9pZCAmJiBkYXRhLmF1ZGlvX21lc3NhZ2VfaWRfcmVwcmVzZW50KSB7XG4gICAgICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5zZXRWYWx1ZShcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmF1ZGlvTWVzc2FnZUlkLCBcbiAgICAgICAgICAgICAgICBkYXRhLmF1ZGlvX21lc3NhZ2VfaWQsIFxuICAgICAgICAgICAgICAgIGRhdGEuYXVkaW9fbWVzc2FnZV9pZF9yZXByZXNlbnRcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yIHdpdGggQVBJIGRhdGFcbiAgICAgKiBTaW5nbGUgcG9pbnQgb2YgaW5pdGlhbGl6YXRpb24gYWZ0ZXIgcmVjZWl2aW5nIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEFQSSByZXNwb25zZSBkYXRhICh3aXRoIGRlZmF1bHRzIG9yIGV4aXN0aW5nIHZhbHVlcylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoZGF0YSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIEV4dGVuc2lvblNlbGVjdG9yIGZvbGxvd2luZyBWNS4wIHBhdHRlcm5cbiAgICAgICAgRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZXh0ZW5zaW9uJywge1xuICAgICAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBSZWNvcmQgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb3B5IG9wZXJhdGlvblxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBpc0NvcHkgPSB1cmxQYXJhbXMuaGFzKCdjb3B5Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgY29weSBvcGVyYXRpb24sIGNsZWFyIElEIGFuZCBwcmlvcml0eVxuICAgICAgICBpZiAoaXNDb3B5KSB7XG4gICAgICAgICAgICBkYXRhLmlkID0gJyc7XG4gICAgICAgICAgICBkYXRhLnByaW9yaXR5ID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoe1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgICAgICB1bmlxaWQ6IGRhdGEudW5pcWlkLFxuICAgICAgICAgICAgcHJpb3JpdHk6IGRhdGEucHJpb3JpdHksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgIGNhbFR5cGU6IGRhdGEuY2FsVHlwZSxcbiAgICAgICAgICAgIHdlZWtkYXlfZnJvbTogZGF0YS53ZWVrZGF5X2Zyb20sXG4gICAgICAgICAgICB3ZWVrZGF5X3RvOiBkYXRhLndlZWtkYXlfdG8sXG4gICAgICAgICAgICB0aW1lX2Zyb206IGRhdGEudGltZV9mcm9tLFxuICAgICAgICAgICAgdGltZV90bzogZGF0YS50aW1lX3RvLFxuICAgICAgICAgICAgY2FsVXJsOiBkYXRhLmNhbFVybCxcbiAgICAgICAgICAgIGNhbFVzZXI6IGRhdGEuY2FsVXNlcixcbiAgICAgICAgICAgIGNhbFNlY3JldDogZGF0YS5jYWxTZWNyZXQsXG4gICAgICAgICAgICBhY3Rpb246IGRhdGEuYWN0aW9uLFxuICAgICAgICAgICAgZXh0ZW5zaW9uOiBkYXRhLmV4dGVuc2lvbixcbiAgICAgICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IGRhdGEuYXVkaW9fbWVzc2FnZV9pZCxcbiAgICAgICAgICAgIGFsbG93UmVzdHJpY3Rpb246IGRhdGEuYWxsb3dSZXN0cmljdGlvblxuICAgICAgICB9LCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcGFzc3dvcmQgZmllbGQgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICBjb25zdCAkY2FsU2VjcmV0RmllbGQgPSAkKCcjY2FsU2VjcmV0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuY2FsU2VjcmV0ID09PSAnWFhYWFhYJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBQYXNzd29yZCBleGlzdHMgYnV0IGlzIG1hc2tlZCwgc2hvdyBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICAgICAkY2FsU2VjcmV0RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUudGZfUGFzc3dvcmRNYXNrZWQpO1xuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBtYXNrZWQgc3RhdGUgdG8gZGV0ZWN0IGNoYW5nZXNcbiAgICAgICAgICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmRhdGEoJ29yaWdpbmFsTWFza2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLnRmX0VudGVyUGFzc3dvcmQpO1xuICAgICAgICAgICAgICAgICAgICAkY2FsU2VjcmV0RmllbGQuZGF0YSgnb3JpZ2luYWxNYXNrZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRHJvcGRvd25zKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggQVBJIGRhdGEgKHNpbmdsZSBwb2ludCBvZiBpbml0aWFsaXphdGlvbilcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVTb3VuZEZpbGVTZWxlY3RvcihkYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvciB3aXRoIEFQSSBkYXRhXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0b3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IGRyb3Bkb3duIHZhbHVlcyBhZnRlciBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgICAgIC8vIFNldCBhY3Rpb24gZHJvcGRvd25cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYWN0aW9uRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuYWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IGNhbFR5cGUgZHJvcGRvd25cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5jYWxUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbFR5cGVEcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5jYWxUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgc2V0IGhpZGRlbiBmaWVsZCB2YWx1ZSBzaW5jZSBvbkNoYW5nZSBkb2Vzbid0IGZpcmUgb24gcHJvZ3JhbW1hdGljIHNldFxuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRmllbGQudmFsKGRhdGEuY2FsVHlwZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCB3ZWVrZGF5IGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLndlZWtkYXlfZnJvbSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLndlZWtkYXlfZnJvbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLndlZWtkYXlfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheVRvRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEud2Vla2RheV90byk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBkYXRlcyBpZiBwcmVzZW50XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZGF0ZV9mcm9tKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2V0RGF0ZUZyb21UaW1lc3RhbXAoZGF0YS5kYXRlX2Zyb20sICcjcmFuZ2UtZGF5cy1zdGFydCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5kYXRlX3RvKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2V0RGF0ZUZyb21UaW1lc3RhbXAoZGF0YS5kYXRlX3RvLCAnI3JhbmdlLWRheXMtZW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBmaWVsZCB2aXNpYmlsaXR5IGJhc2VkIG9uIGFjdGlvblxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQub25BY3Rpb25DaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY2FsZW5kYXIgdHlwZSB2aXNpYmlsaXR5XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkNhbFR5cGVDaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgcnVsZXMgdGFiIHZpc2liaWxpdHkgYmFzZWQgb24gYWxsb3dSZXN0cmljdGlvblxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlUnVsZXNUYWIoZGF0YS5hbGxvd1Jlc3RyaWN0aW9uKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nXG4gICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBhY3Rpb24gZHJvcGRvd24gY2hhbmdlXG4gICAgICovXG4gICAgb25BY3Rpb25DaGFuZ2UoKSB7XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FjdGlvbicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ2V4dGVuc2lvbicpIHtcbiAgICAgICAgICAgIC8vIFNob3cgZXh0ZW5zaW9uLCBoaWRlIGF1ZGlvXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25Sb3cuc2hvdygpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYXVkaW9NZXNzYWdlUm93LmhpZGUoKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGF1ZGlvIG1lc3NhZ2VcbiAgICAgICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmNsZWFyKG91dE9mV29ya1RpbWVSZWNvcmQuYXVkaW9NZXNzYWdlSWQpO1xuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gJ3BsYXltZXNzYWdlJykge1xuICAgICAgICAgICAgLy8gU2hvdyBhdWRpbywgaGlkZSBleHRlbnNpb25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGV4dGVuc2lvblJvdy5oaWRlKCk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhdWRpb01lc3NhZ2VSb3cuc2hvdygpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgZXh0ZW5zaW9uIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25GaWVsZC52YWwoJycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY2FsZW5kYXIgdHlwZSBjaGFuZ2VcbiAgICAgKi9cbiAgICBvbkNhbFR5cGVDaGFuZ2UoKSB7XG4gICAgICAgIGNvbnN0IGNhbFR5cGUgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYWxUeXBlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyAndGltZWZyYW1lJyBhbmQgZW1wdHkgc3RyaW5nIG1lYW4gdGltZS1iYXNlZCBjb25kaXRpb25zIChzaG93IG1haW4gdGFiKVxuICAgICAgICBpZiAoIWNhbFR5cGUgfHwgY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScgfHwgY2FsVHlwZSA9PT0gJycpIHtcbiAgICAgICAgICAgIC8vIFNob3cgbWFpbiB0aW1lL2RhdGUgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsZW5kYXJUYWIuaGlkZSgpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kbWFpblRhYi5zaG93KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY2FsVHlwZSA9PT0gJ0NBTERBVicgfHwgY2FsVHlwZSA9PT0gJ0lDQUwnKSB7XG4gICAgICAgICAgICAvLyBTaG93IGNhbGVuZGFyIFVSTCBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxlbmRhclRhYi5zaG93KCk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRtYWluVGFiLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjYWxlbmRhcnMgZm9yIGRhdGUgYW5kIHRpbWUgc2VsZWN0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNhbGVuZGFycygpIHtcbiAgICAgICAgLy8gRGF0ZSByYW5nZSBjYWxlbmRhcnNcbiAgICAgICAgLy8gVXNlIGNsYXNzIHZhcmlhYmxlcyBmb3IgY2FsZW5kYXJzXG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcih7XG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBzdGFydENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydCxcbiAgICAgICAgICAgIHR5cGU6ICdkYXRlJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRpbWUgcmFuZ2UgY2FsZW5kYXJzXG4gICAgICAgIC8vIFVzZSBjbGFzcyB2YXJpYWJsZXMgZm9yIHRpbWUgY2FsZW5kYXJzXG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVTdGFydC5jYWxlbmRhcih7XG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgc3RhcnRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICBhbXBtOiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcm91dGluZyB0YWJsZSBhbmQgYWxsb3dSZXN0cmljdGlvbiBjaGVja2JveFxuICAgICAqL1xuICAgIGluaXRpYWxpemVSb3V0aW5nVGFibGUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgYWxsb3dSZXN0cmljdGlvbiBjaGVja2JveFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhbGxvd1Jlc3RyaWN0aW9uRmllbGQucGFyZW50KCkuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGFsbG93UmVzdHJpY3Rpb25GaWVsZC5wYXJlbnQoKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlUnVsZXNUYWIoaXNDaGVja2VkKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleGlzdGluZyBjaGVja2JveGVzIGluIHRhYmxlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBydWxlcyB0YWIgdmlzaWJpbGl0eVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNDaGVja2VkIC0gV2hldGhlciB0byBzaG93IHJ1bGVzIHRhYlxuICAgICAqL1xuICAgIHRvZ2dsZVJ1bGVzVGFiKGlzQ2hlY2tlZCkge1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIuaGlkZSgpO1xuICAgICAgICAgICAgLy8gU3dpdGNoIHRvIGdlbmVyYWwgdGFiIGlmIHJ1bGVzIHRhYiB3YXMgYWN0aXZlXG4gICAgICAgICAgICBpZiAob3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIuaGFzQ2xhc3MoJ2FjdGl2ZScpKSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiU2VnbWVudC5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYi5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYlNlZ21lbnQuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIHJvdXRpbmcgdGFibGUgd2l0aCBpbmNvbWluZyByb3V0ZXNcbiAgICAgKi9cbiAgICBsb2FkUm91dGluZ1RhYmxlKCkge1xuICAgICAgICAvLyBDbGVhciB0YWJsZVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJ3Rib2R5JykuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBhc3NvY2lhdGVkIElEcyBmcm9tIHJlY29yZCBkYXRhXG4gICAgICAgIGNvbnN0IGFzc29jaWF0ZWRJZHMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZERhdGE/LmluY29taW5nUm91dGVJZHMgfHwgW107XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGFsbCBhdmFpbGFibGUgcm91dGVzIGZyb20gSW5jb21pbmdSb3V0ZXNBUElcbiAgICAgICAgSW5jb21pbmdSb3V0ZXNBUEkuZ2V0TGlzdCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIEdyb3VwIGFuZCBzb3J0IHJvdXRlc1xuICAgICAgICAgICAgICAgIGNvbnN0IGdyb3VwZWRSb3V0ZXMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmdyb3VwQW5kU29ydFJvdXRlcyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgZ3JvdXBlZCByb3V0ZXNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlbmRlckdyb3VwZWRSb3V0ZXMoZ3JvdXBlZFJvdXRlcywgYXNzb2NpYXRlZElkcyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzIHdpdGggZ3JvdXBlZCBjaGVja2JveCBsb2dpY1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZVJvdXRpbmdDaGVja2JveGVzKCk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2hvd0VtcHR5Um91dGVzTWVzc2FnZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdyb3VwIGFuZCBzb3J0IHJvdXRlcyBieSBwcm92aWRlciBhbmQgRElEXG4gICAgICogQHBhcmFtIHtBcnJheX0gcm91dGVzIC0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEdyb3VwZWQgcm91dGVzXG4gICAgICovXG4gICAgZ3JvdXBBbmRTb3J0Um91dGVzKHJvdXRlcykge1xuICAgICAgICBjb25zdCBncm91cHMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgZGVmYXVsdCByb3V0ZSBhbmQgZ3JvdXAgYnkgcHJvdmlkZXJcbiAgICAgICAgcm91dGVzLmZvckVhY2goKHJvdXRlKSA9PiB7XG4gICAgICAgICAgICBpZiAocm91dGUuaWQgPT09IDEgfHwgcm91dGUuaWQgPT09ICcxJykgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBwcm92aWRlcklkID0gcm91dGUucHJvdmlkZXIgfHwgJ25vbmUnO1xuICAgICAgICAgICAgaWYgKCFncm91cHNbcHJvdmlkZXJJZF0pIHtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHBsYWluIHRleHQgcHJvdmlkZXIgbmFtZSBmcm9tIEhUTUwgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgbGV0IHByb3ZpZGVyTmFtZSA9IHJvdXRlLnByb3ZpZGVyaWRfcmVwcmVzZW50IHx8IGdsb2JhbFRyYW5zbGF0ZS5pcl9Ob0Fzc2lnbmVkUHJvdmlkZXI7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIEhUTUwgdGFncyB0byBnZXQgY2xlYW4gcHJvdmlkZXIgbmFtZSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICB0ZW1wRGl2LmlubmVySFRNTCA9IHByb3ZpZGVyTmFtZTtcbiAgICAgICAgICAgICAgICBjb25zdCBjbGVhblByb3ZpZGVyTmFtZSA9IHRlbXBEaXYudGV4dENvbnRlbnQgfHwgdGVtcERpdi5pbm5lclRleHQgfHwgcHJvdmlkZXJOYW1lO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJJZDogcHJvdmlkZXJJZCwgIC8vIFN0b3JlIGFjdHVhbCBwcm92aWRlciBJRFxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck5hbWU6IGNsZWFuUHJvdmlkZXJOYW1lLCAgLy8gQ2xlYW4gbmFtZSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck5hbWVIdG1sOiByb3V0ZS5wcm92aWRlcmlkX3JlcHJlc2VudCB8fCBwcm92aWRlck5hbWUsICAvLyBPcmlnaW5hbCBIVE1MIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlckRpc2FibGVkOiByb3V0ZS5wcm92aWRlckRpc2FibGVkIHx8IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsUnVsZXM6IFtdLFxuICAgICAgICAgICAgICAgICAgICBzcGVjaWZpY1J1bGVzOiB7fVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNlcGFyYXRlIGdlbmVyYWwgcnVsZXMgKG5vIERJRCkgZnJvbSBzcGVjaWZpYyBydWxlcyAod2l0aCBESUQpXG4gICAgICAgICAgICBpZiAoIXJvdXRlLm51bWJlciB8fCByb3V0ZS5udW1iZXIgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLmdlbmVyYWxSdWxlcy5wdXNoKHJvdXRlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlc1tyb3V0ZS5udW1iZXJdKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5zcGVjaWZpY1J1bGVzW3JvdXRlLm51bWJlcl0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXNbcm91dGUubnVtYmVyXS5wdXNoKHJvdXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTb3J0IHJ1bGVzIHdpdGhpbiBlYWNoIGdyb3VwIGJ5IHByaW9yaXR5XG4gICAgICAgIE9iamVjdC5rZXlzKGdyb3VwcykuZm9yRWFjaChwcm92aWRlcklkID0+IHtcbiAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5nZW5lcmFsUnVsZXMuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXMpLmZvckVhY2goZGlkID0+IHtcbiAgICAgICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlc1tkaWRdLnNvcnQoKGEsIGIpID0+IGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBncm91cHM7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgZ3JvdXBlZCByb3V0ZXMgaW4gdGhlIHRhYmxlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGdyb3VwZWRSb3V0ZXMgLSBHcm91cGVkIHJvdXRlcyBvYmplY3RcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhc3NvY2lhdGVkSWRzIC0gQXJyYXkgb2YgYXNzb2NpYXRlZCByb3V0ZSBJRHNcbiAgICAgKi9cbiAgICByZW5kZXJHcm91cGVkUm91dGVzKGdyb3VwZWRSb3V0ZXMsIGFzc29jaWF0ZWRJZHMpIHtcbiAgICAgICAgY29uc3QgdGJvZHkgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJ3Rib2R5Jyk7XG4gICAgICAgIGxldCBpc0ZpcnN0R3JvdXAgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBlZFJvdXRlcykuZm9yRWFjaChwcm92aWRlcklkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGdyb3VwID0gZ3JvdXBlZFJvdXRlc1twcm92aWRlcklkXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIHByb3ZpZGVyIGdyb3VwIGhlYWRlclxuICAgICAgICAgICAgaWYgKCFpc0ZpcnN0R3JvdXApIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgc2VwYXJhdG9yIGJldHdlZW4gZ3JvdXBzXG4gICAgICAgICAgICAgICAgdGJvZHkuYXBwZW5kKCc8dHIgY2xhc3M9XCJwcm92aWRlci1zZXBhcmF0b3JcIj48dGQgY29sc3Bhbj1cIjNcIj48ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjwvdGQ+PC90cj4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlzRmlyc3RHcm91cCA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgcHJvdmlkZXIgaGVhZGVyIHJvdyAtIHVzZSBwcm92aWRlck5hbWVIdG1sIGZvciByaWNoIGRpc3BsYXlcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZChgXG4gICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwicHJvdmlkZXItaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjb2xzcGFuPVwiM1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z3JvdXAucHJvdmlkZXJOYW1lSHRtbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtncm91cC5wcm92aWRlckRpc2FibGVkID8gJzxzcGFuIGNsYXNzPVwidWkgbWluaSByZWQgbGFiZWxcIj5EaXNhYmxlZDwvc3Bhbj4nIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbmRlciBnZW5lcmFsIHJ1bGVzIGZpcnN0XG4gICAgICAgICAgICBncm91cC5nZW5lcmFsUnVsZXMuZm9yRWFjaCgocm91dGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmNyZWF0ZVJvdXRlUm93KHJvdXRlLCBhc3NvY2lhdGVkSWRzLCAncnVsZS1nZW5lcmFsJyk7XG4gICAgICAgICAgICAgICAgdGJvZHkuYXBwZW5kKHJvdyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVuZGVyIHNwZWNpZmljIHJ1bGVzIGdyb3VwZWQgYnkgRElEXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhncm91cC5zcGVjaWZpY1J1bGVzKS5zb3J0KCkuZm9yRWFjaChkaWQgPT4ge1xuICAgICAgICAgICAgICAgIGdyb3VwLnNwZWNpZmljUnVsZXNbZGlkXS5mb3JFYWNoKChyb3V0ZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNGaXJzdEluRElEID0gaW5kZXggPT09IDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IG91dE9mV29ya1RpbWVSZWNvcmQuY3JlYXRlUm91dGVSb3cocm91dGUsIGFzc29jaWF0ZWRJZHMsICdydWxlLXNwZWNpZmljJywgaXNGaXJzdEluRElEKTtcbiAgICAgICAgICAgICAgICAgICAgdGJvZHkuYXBwZW5kKHJvdyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBzaW5nbGUgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJvdXRlIC0gUm91dGUgb2JqZWN0XG4gICAgICogQHBhcmFtIHtBcnJheX0gYXNzb2NpYXRlZElkcyAtIEFzc29jaWF0ZWQgcm91dGUgSURzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJ1bGVDbGFzcyAtIENTUyBjbGFzcyBmb3IgdGhlIHJ1bGUgdHlwZVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gc2hvd0RJREluZGljYXRvciAtIFdoZXRoZXIgdG8gc2hvdyBESUQgaW5kaWNhdG9yXG4gICAgICogQHJldHVybnMge1N0cmluZ30gSFRNTCByb3dcbiAgICAgKi9cbiAgICBjcmVhdGVSb3V0ZVJvdyhyb3V0ZSwgYXNzb2NpYXRlZElkcywgcnVsZUNsYXNzID0gJycsIHNob3dESURJbmRpY2F0b3IgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBhc3NvY2lhdGVkSWRzLmluY2x1ZGVzKHBhcnNlSW50KHJvdXRlLmlkKSk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyRGlzYWJsZWQgPSByb3V0ZS5wcm92aWRlckRpc2FibGVkID8gJ2Rpc2FibGVkJyA6ICcnO1xuICAgICAgICBsZXQgcnVsZURlc2NyaXB0aW9uID0gcm91dGUucnVsZV9yZXByZXNlbnQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbnN1cmUgcHJvdmlkZXIgSUQgaXMgY2xlYW4gKG5vIEhUTUwpXG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSByb3V0ZS5wcm92aWRlciB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB2aXN1YWwgaW5kaWNhdG9ycyBmb3IgcnVsZSB0eXBlXG4gICAgICAgIGlmIChydWxlQ2xhc3MgPT09ICdydWxlLXNwZWNpZmljJykge1xuICAgICAgICAgICAgLy8gQWRkIGluZGVudCBhbmQgYXJyb3cgZm9yIHNwZWNpZmljIHJ1bGVzXG4gICAgICAgICAgICBydWxlRGVzY3JpcHRpb24gPSBgPHNwYW4gY2xhc3M9XCJydWxlLWluZGVudFwiPuKGszwvc3Bhbj4gJHtydWxlRGVzY3JpcHRpb259YDtcbiAgICAgICAgfSBlbHNlIGlmIChydWxlQ2xhc3MgPT09ICdydWxlLWdlbmVyYWwnKSB7XG4gICAgICAgICAgICAvLyBBZGQgaWNvbiBmb3IgZ2VuZXJhbCBydWxlc1xuICAgICAgICAgICAgcnVsZURlc2NyaXB0aW9uID0gYDxpIGNsYXNzPVwicmFuZG9tIGljb25cIj48L2k+ICR7cnVsZURlc2NyaXB0aW9ufWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG5vdGVEaXNwbGF5ID0gcm91dGUubm90ZSAmJiByb3V0ZS5ub3RlLmxlbmd0aCA+IDIwID8gXG4gICAgICAgICAgICBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uXCIgZGF0YS1jb250ZW50PVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocm91dGUubm90ZSl9XCIgZGF0YS12YXJpYXRpb249XCJ3aWRlXCIgZGF0YS1wb3NpdGlvbj1cInRvcCByaWdodFwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZmlsZSB0ZXh0IGljb25cIj48L2k+XG4gICAgICAgICAgICA8L2Rpdj5gIDogXG4gICAgICAgICAgICBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocm91dGUubm90ZSB8fCAnJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEYXRhIGF0dHJpYnV0ZXMgYWxyZWFkeSBzYWZlIGZyb20gQVBJXG4gICAgICAgIGNvbnN0IHNhZmVQcm92aWRlcklkID0gcHJvdmlkZXJJZDtcbiAgICAgICAgY29uc3Qgc2FmZURpZCA9IHJvdXRlLm51bWJlciB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8dHIgY2xhc3M9XCJydWxlLXJvdyAke3J1bGVDbGFzc31cIiBpZD1cIiR7cm91dGUuaWR9XCIgXG4gICAgICAgICAgICAgICAgZGF0YS1wcm92aWRlcj1cIiR7c2FmZVByb3ZpZGVySWR9XCIgXG4gICAgICAgICAgICAgICAgZGF0YS1kaWQ9XCIke3NhZmVEaWR9XCI+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiY29sbGFwc2luZ1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZml0dGVkIHRvZ2dsZSBjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtZGlkPVwiJHtzYWZlRGlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcHJvdmlkZXI9XCJ7JHtzYWZlUHJvdmlkZXJJZH19XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgJHtpc0NoZWNrZWQgPyAnY2hlY2tlZCcgOiAnJ30gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInJvdXRlLSR7cm91dGUuaWR9XCIgZGF0YS12YWx1ZT1cIiR7cm91dGUuaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCIke3Byb3ZpZGVyRGlzYWJsZWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICR7cnVsZURlc2NyaXB0aW9uIHx8ICc8c3BhbiBjbGFzcz1cInRleHQtbXV0ZWRcIj5ObyBkZXNjcmlwdGlvbjwvc3Bhbj4nfVxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiaGlkZS1vbi1tb2JpbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtub3RlRGlzcGxheX1cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgPC90cj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgZW1wdHkgcm91dGVzIG1lc3NhZ2UgaW4gdGFibGVcbiAgICAgKi9cbiAgICBzaG93RW1wdHlSb3V0ZXNNZXNzYWdlKCkge1xuICAgICAgICBjb25zdCBlbXB0eVJvdyA9IGBcbiAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjNcIiBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmlyX05vSW5jb21pbmdSb3V0ZXN9XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgIGA7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQoZW1wdHlSb3cpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByb3V0aW5nIGNoZWNrYm94ZXMgd2l0aCBncm91cGVkIGxvZ2ljXG4gICAgICogV2hlbiBjaGVja2luZy91bmNoZWNraW5nIHJ1bGVzIHdpdGggc2FtZSBwcm92aWRlciBhbmQgRElEXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJvdXRpbmdDaGVja2JveGVzKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhvdmVyIGVmZmVjdCB0byBoaWdobGlnaHQgcmVsYXRlZCBydWxlc1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLmhvdmVyKFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkcm93LmF0dHIoJ2RhdGEtcHJvdmlkZXInKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkaWQgPSAkcm93LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHByZXZpb3VzIGhpZ2hsaWdodHNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLnJlbW92ZUNsYXNzKCdyZWxhdGVkLWhpZ2hsaWdodCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhpZ2hsaWdodCBhbGwgcnVsZXMgd2l0aCBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzZWxlY3RvciA9IGAucnVsZS1yb3dbZGF0YS1wcm92aWRlcj1cIiR7cHJvdmlkZXJ9XCJdYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGhvdmVyaW5nIG9uIHNwZWNpZmljIERJRCBydWxlLCBoaWdobGlnaHQgYWxsIHdpdGggc2FtZSBESURcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9IGBbZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgaG92ZXJpbmcgb24gZ2VuZXJhbCBydWxlLCBoaWdobGlnaHQgYWxsIGdlbmVyYWwgcnVsZXMgZm9yIHRoaXMgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9ICdbZGF0YS1kaWQ9XCJcIl0nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCAkcmVsYXRlZFJvd3MgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICAkcmVsYXRlZFJvd3MuYWRkQ2xhc3MoJ3JlbGF0ZWQtaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBoaWdobGlnaHRzIG9uIG1vdXNlIGxlYXZlXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCcucnVsZS1yb3cnKS5yZW1vdmVDbGFzcygncmVsYXRlZC1oaWdobGlnaHQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3ggYmVoYXZpb3Igd2l0aCB0b29sdGlwc1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy51aS5jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgZGlkID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlciA9ICRjaGVja2JveC5hdHRyKCdkYXRhLXByb3ZpZGVyJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCB0b29sdGlwIHRvIGV4cGxhaW4gZ3JvdXBpbmdcbiAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgbGV0IHRvb2x0aXBUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGRpZCkge1xuICAgICAgICAgICAgICAgICAgICB0b29sdGlwVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS50Zl9Ub29sdGlwU3BlY2lmaWNSdWxlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnRmX1Rvb2x0aXBHZW5lcmFsUnVsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNoZWNrYm94LmF0dHIoJ2RhdGEtY29udGVudCcsIHRvb2x0aXBUZXh0KTtcbiAgICAgICAgICAgICAgICAkY2hlY2tib3guYXR0cignZGF0YS12YXJpYXRpb24nLCAndGlueScpO1xuICAgICAgICAgICAgICAgICRjaGVja2JveC5wb3B1cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3ggY2hhbmdlIGJlaGF2aW9yXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcykucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlkID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkY2hlY2tib3guYXR0cignZGF0YS1wcm92aWRlcicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNraXAgc3luY2hyb25pemF0aW9uIGZvciAnbm9uZScgcHJvdmlkZXIgKGRpcmVjdCBjYWxscylcbiAgICAgICAgICAgICAgICBpZiAoIXByb3ZpZGVyIHx8IHByb3ZpZGVyID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZ3JvdXBlZCBsb2dpYyByZXF1aXJlbWVudHNcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYCNyb3V0aW5nLXRhYmxlIC51aS5jaGVja2JveFtkYXRhLXByb3ZpZGVyPVwiJHtwcm92aWRlcn1cIl1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpZCAmJiBkaWQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSdWxlIHdpdGggc3BlY2lmaWMgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBjaGVja2luZyBhIHJ1bGUgd2l0aCBESUQsIGNoZWNrIGFsbCBydWxlcyB3aXRoIHNhbWUgcHJvdmlkZXIgYW5kIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yV2l0aERJRCA9IGAke3NlbGVjdG9yfVtkYXRhLWRpZD1cIiR7ZGlkfVwiXWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChzZWxlY3RvcldpdGhESUQpLm5vdCgkY2hlY2tib3gpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHVuY2hlY2tpbmcgYSBydWxlIHdpdGggRElEOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIFVuY2hlY2sgYWxsIHJ1bGVzIHdpdGggc2FtZSBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvcldpdGhESUQgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JXaXRoRElEKS5ub3QoJGNoZWNrYm94KS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDIuIEFsc28gdW5jaGVjayBnZW5lcmFsIHJ1bGVzICh3aXRob3V0IERJRCkgZm9yIHNhbWUgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvckdlbmVyYWwgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCJcIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JHZW5lcmFsKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2VuZXJhbCBydWxlIHdpdGhvdXQgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gdW5jaGVja2luZyBnZW5lcmFsIHJ1bGUsIG9ubHkgdW5jaGVjayBvdGhlciBnZW5lcmFsIHJ1bGVzIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBjaGVja2luZyBnZW5lcmFsIHJ1bGUsIGNoZWNrIGFsbCBnZW5lcmFsIHJ1bGVzIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZVxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGVyYXNlIGJ1dHRvbnMgZm9yIGRhdGUvdGltZSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXJhc2VycygpIHtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJhc2VEYXRlc0J0bi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZVdlZWtkYXlzQnRuLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlGcm9tRHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZVRpbWVwZXJpb2RCdG4ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZXNjcmlwdGlvbiBmaWVsZCB3aXRoIGF1dG8tcmVzaXplXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlc2NyaXB0aW9uRmllbGQoKSB7XG4gICAgICAgIC8vIEF1dG8tcmVzaXplIG9uIGlucHV0XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgICAgICAgIHRoaXMuc3R5bGUuaGVpZ2h0ID0gKHRoaXMuc2Nyb2xsSGVpZ2h0KSArICdweCc7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCByZXNpemVcbiAgICAgICAgaWYgKG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGVscGVyIHRvIHNldCBkYXRlIGZyb20gdGltZXN0YW1wIG9yIGRhdGUgc3RyaW5nXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSBkYXRlVmFsdWUgLSBVbml4IHRpbWVzdGFtcCBvciBkYXRlIHN0cmluZyAoWVlZWS1NTS1ERClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3JcbiAgICAgKi9cbiAgICBzZXREYXRlRnJvbVRpbWVzdGFtcChkYXRlVmFsdWUsIHNlbGVjdG9yKSB7XG4gICAgICAgIGlmICghZGF0ZVZhbHVlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGEgZGF0ZSBzdHJpbmcgaW4gWVlZWS1NTS1ERCBmb3JtYXQgZmlyc3RcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlVmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgZGF0ZSBmb3JtYXQgWVlZWS1NTS1ERFxuICAgICAgICAgICAgaWYgKC9eXFxkezR9LVxcZHsyfS1cXGR7Mn0kLy50ZXN0KGRhdGVWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzTmFOKGRhdGUuZ2V0VGltZSgpKSkge1xuICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJ5IHRvIHBhcnNlIGFzIFVuaXggdGltZXN0YW1wIChhbGwgZGlnaXRzKVxuICAgICAgICAgICAgaWYgKC9eXFxkKyQvLnRlc3QoZGF0ZVZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IHBhcnNlSW50KGRhdGVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRpbWVzdGFtcCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBVbml4IHRpbWVzdGFtcCB0byBEYXRlXG4gICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3IpLmNhbGVuZGFyKCdzZXQgZGF0ZScsIG5ldyBEYXRlKHRpbWVzdGFtcCAqIDEwMDApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZGF0ZVZhbHVlID09PSAnbnVtYmVyJyAmJiBkYXRlVmFsdWUgPiAwKSB7XG4gICAgICAgICAgICAvLyBOdW1lcmljIFVuaXggdGltZXN0YW1wXG4gICAgICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBuZXcgRGF0ZShkYXRlVmFsdWUgKiAxMDAwKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gZm9yIHBhaXJlZCBmaWVsZHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gRm9ybSBkYXRhXG4gICAgICogQHJldHVybnMge29iamVjdHxib29sZWFufSBSZXN1bHQgb2JqZWN0IG9yIGZhbHNlIGlmIHZhbGlkYXRpb24gZmFpbHNcbiAgICAgKi9cbiAgICBjdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KSB7XG4gICAgICAgIC8vIENoZWNrIGRhdGUgZmllbGRzIC0gYm90aCBzaG91bGQgYmUgZmlsbGVkIG9yIGJvdGggZW1wdHlcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS5kYXRlX2Zyb20gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gPT09ICcnKSB8fFxuICAgICAgICAgICAgKHJlc3VsdC5kYXRhLmRhdGVfdG8gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9PT0gJycpKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdlZWtkYXkgZmllbGRzIC0gYm90aCBzaG91bGQgYmUgZmlsbGVkIG9yIGJvdGggZW1wdHlcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMScpIHx8XG4gICAgICAgICAgICAocmVzdWx0LmRhdGEud2Vla2RheV90byA+IDAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID09PSAnLTEnKSkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB0aW1lIGZpZWxkcyAtIGJvdGggc2hvdWxkIGJlIGZpbGxlZCBvciBib3RoIGVtcHR5XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApIHx8XG4gICAgICAgICAgICAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHRpbWVmcmFtZSB0eXBlLCBjaGVjayB0aGF0IGF0IGxlYXN0IG9uZSBjb25kaXRpb24gaXMgc3BlY2lmaWVkXG4gICAgICAgIGNvbnN0IGNhbFR5cGUgPSByZXN1bHQuZGF0YS5jYWxUeXBlIHx8ICd0aW1lZnJhbWUnO1xuICAgICAgICBpZiAoY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScgfHwgY2FsVHlwZSA9PT0gJycpIHtcbiAgICAgICAgICAgIGNvbnN0IGhhc0RhdGVSYW5nZSA9IHJlc3VsdC5kYXRhLmRhdGVfZnJvbSAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV90byAhPT0gJyc7XG4gICAgICAgICAgICBjb25zdCBoYXNXZWVrZGF5UmFuZ2UgPSByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPiAwO1xuICAgICAgICAgICAgY29uc3QgaGFzVGltZVJhbmdlID0gcmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWhhc0RhdGVSYW5nZSAmJiAhaGFzV2Vla2RheVJhbmdlICYmICFoYXNUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQpLnNob3coKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgc2VuZGluZyBmb3JtXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R8Ym9vbGVhbn0gVXBkYXRlZCBzZXR0aW5ncyBvciBmYWxzZVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyBmcm9tICdvbicvdW5kZWZpbmVkIHRvIHRydWUvZmFsc2VcbiAgICAgICAgLy8gUHJvY2VzcyBhbGwgcm91dGUgY2hlY2tib3hlc1xuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdyb3V0ZS0nKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2tleV0gPSByZXN1bHQuZGF0YVtrZXldID09PSAnb24nIHx8IHJlc3VsdC5kYXRhW2tleV0gPT09IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgIGlmICgnYWxsb3dSZXN0cmljdGlvbicgaW4gcmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFsbG93UmVzdHJpY3Rpb24gPSByZXN1bHQuZGF0YS5hbGxvd1Jlc3RyaWN0aW9uID09PSAnb24nIHx8IHJlc3VsdC5kYXRhLmFsbG93UmVzdHJpY3Rpb24gPT09IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGU6IGNhbFR5cGUgY2FuIGJlICd0aW1lZnJhbWUnLCAnY2FsZGF2JywgJ2ljYWwnLCBvciBlbXB0eSBzdHJpbmdcbiAgICAgICAgLy8gQmFja2VuZCBhY2NlcHRzIGFsbCB0aGVzZSB2YWx1ZXMgKGVtcHR5IHN0cmluZyBpcyB0cmVhdGVkIGFzICd0aW1lZnJhbWUnIGluIERCKVxuICAgICAgICAvLyBObyBjb252ZXJzaW9uIG5lZWRlZCAtIHNlbmQgdmFsdWUgYXMtaXNcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSB3ZWVrZGF5IHZhbHVlcyAobWF0Y2hlcyBvbGQgY29udHJvbGxlcjogKCRkYXRhWyRuYW1lXSA8IDEpID8gbnVsbCA6ICRkYXRhWyRuYW1lXSlcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA9PT0gJy0xJyB8fCByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPCAxKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPSAnJztcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0LmRhdGEud2Vla2RheV90byA9PT0gJy0xJyB8fCByZXN1bHQuZGF0YS53ZWVrZGF5X3RvIDwgMSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEud2Vla2RheV90byA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgcGFzc3dvcmQgZmllbGQgLSBpZiB1c2VyIGRpZG4ndCBjaGFuZ2UgdGhlIG1hc2tlZCBwYXNzd29yZCwga2VlcCBpdCBhcyBpc1xuICAgICAgICAvLyBUaGUgYmFja2VuZCB3aWxsIHJlY29nbml6ZSAnWFhYWFhYJyBhbmQgd29uJ3QgdXBkYXRlIHRoZSBwYXNzd29yZFxuICAgICAgICAvLyBJZiB1c2VyIGNsZWFyZWQgdGhlIGZpZWxkIG9yIGVudGVyZWQgbmV3IHZhbHVlLCBzZW5kIHRoYXRcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLmNhbFNlY3JldCA9PT0gJ1hYWFhYWCcpIHtcbiAgICAgICAgICAgIC8vIFVzZXIgZGlkbid0IGNoYW5nZSB0aGUgbWFza2VkIHBhc3N3b3JkLCBiYWNrZW5kIHdpbGwga2VlcCBleGlzdGluZyB2YWx1ZVxuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdC5kYXRhLmNhbFNlY3JldCA9PT0gJycpIHtcbiAgICAgICAgICAgIC8vIFVzZXIgY2xlYXJlZCB0aGUgcGFzc3dvcmQgZmllbGQsIGJhY2tlbmQgd2lsbCBjbGVhciB0aGUgcGFzc3dvcmRcbiAgICAgICAgfVxuICAgICAgICAvLyBPdGhlcndpc2Ugc2VuZCB0aGUgbmV3IHBhc3N3b3JkIHZhbHVlIGFzIGVudGVyZWRcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0aW1lIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gY2FsZW5kYXIgdHlwZVxuICAgICAgICBjb25zdCBjYWxUeXBlID0gcmVzdWx0LmRhdGEuY2FsVHlwZSB8fCAndGltZWZyYW1lJztcbiAgICAgICAgaWYgKGNhbFR5cGUgPT09ICcnIHx8IGNhbFR5cGUgPT09ICd0aW1lZnJhbWUnKSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZWZyb20ucnVsZXMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmFkZGl0aW9uYWxUaW1lSW50ZXJ2YWxSdWxlcztcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy50aW1ldG8ucnVsZXMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmFkZGl0aW9uYWxUaW1lSW50ZXJ2YWxSdWxlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy50aW1lZnJvbS5ydWxlcyA9IFtdO1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLnRpbWV0by5ydWxlcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGRhdGVzIHRvIHRpbWVzdGFtcHNcbiAgICAgICAgY29uc3QgZGF0ZUZyb20gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignZ2V0IGRhdGUnKTtcbiAgICAgICAgaWYgKGRhdGVGcm9tKSB7XG4gICAgICAgICAgICBkYXRlRnJvbS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9IE1hdGguZmxvb3IoZGF0ZUZyb20uZ2V0VGltZSgpIC8gMTAwMCkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgZGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICBpZiAoZGF0ZVRvKSB7XG4gICAgICAgICAgICBkYXRlVG8uc2V0SG91cnMoMjMsIDU5LCA1OSwgMCk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5kYXRlX3RvID0gTWF0aC5mbG9vcihkYXRlVG8uZ2V0VGltZSgpIC8gMTAwMCkudG9TdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29sbGVjdCBzZWxlY3RlZCBpbmNvbWluZyByb3V0ZXNcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRSb3V0ZXMgPSBbXTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCByb3V0ZUlkID0gJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBpZiAocm91dGVJZCkge1xuICAgICAgICAgICAgICAgIHNlbGVjdGVkUm91dGVzLnB1c2gocm91dGVJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXN1bHQuZGF0YS5pbmNvbWluZ1JvdXRlSWRzID0gc2VsZWN0ZWRSb3V0ZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBhY3Rpb24tZGVwZW5kZW50IGZpZWxkcyBiYXNlZCBvbiBzZWxlY3Rpb25cbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLmFjdGlvbiA9PT0gJ2V4dGVuc2lvbicpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmF1ZGlvX21lc3NhZ2VfaWQgPSAnJztcbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQuZGF0YS5hY3Rpb24gPT09ICdwbGF5bWVzc2FnZScpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmV4dGVuc2lvbiA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSdW4gY3VzdG9tIHZhbGlkYXRpb24gZm9yIHBhaXJlZCBmaWVsZHNcbiAgICAgICAgcmV0dXJuIG91dE9mV29ya1RpbWVSZWNvcmQuY3VzdG9tVmFsaWRhdGVGb3JtKHJlc3VsdCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgaWYgdGhpcyB3YXMgYSBuZXcgcmVjb3JkXG4gICAgICAgICAgICBpZiAoIW91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdVcmwgPSBgJHtnbG9iYWxSb290VXJsfW9mZi13b3JrLXRpbWVzL21vZGlmeS8ke3Jlc3BvbnNlLmRhdGEuaWR9YDtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUobnVsbCwgJycsIG5ld1VybCk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmRJZCA9IHJlc3BvbnNlLmRhdGEuaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbG9hZCBkYXRhIHRvIGVuc3VyZSBjb25zaXN0ZW5jeVxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5sb2FkRm9ybURhdGEoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1vZmYtd29yay10aW1lcy9zYXZlYDtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBvdXRPZldvcmtUaW1lUmVjb3JkLmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IE9mZldvcmtUaW1lc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkcyB1c2luZyBPZmZXb3JrVGltZXNUb29sdGlwTWFuYWdlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG9vbHRpcCBpbml0aWFsaXphdGlvbiB0byBPZmZXb3JrVGltZXNUb29sdGlwTWFuYWdlclxuICAgICAgICBPZmZXb3JrVGltZXNUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIHRoYXQgY2hlY2tzIGlmIGEgdmFsdWUgaXMgbm90IGVtcHR5IGJhc2VkIG9uIGEgc3BlY2lmaWMgYWN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gYmUgdmFsaWRhdGVkXG4gKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiB0byBjb21wYXJlIGFnYWluc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIHRydWUgaWYgdmFsaWQsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGUgPSBmdW5jdGlvbih2YWx1ZSwgYWN0aW9uKSB7XG4gICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCAmJiBvdXRPZldvcmtUaW1lUmVjb3JkLiRhY3Rpb25GaWVsZC52YWwoKSA9PT0gYWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNhbGVuZGFyIFVSTCBmaWVsZFxuICogVmFsaWRhdGVzIFVSTCBvbmx5IHdoZW4gY2FsZW5kYXIgdHlwZSBpcyBub3QgJ25vbmUnIG9yICd0aW1lJ1xuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGNvbnN0IGNhbFR5cGUgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRmllbGQudmFsKCk7XG4gICAgXG4gICAgLy8gSWYgY2FsZW5kYXIgdHlwZSBpcyB0aW1lZnJhbWUgb3IgdGltZSwgVVJMIGlzIG5vdCByZXF1aXJlZFxuICAgIGlmICghY2FsVHlwZSB8fCBjYWxUeXBlID09PSAndGltZWZyYW1lJyB8fCBjYWxUeXBlID09PSAndGltZScpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIFxuICAgIC8vIElmIGNhbGVuZGFyIHR5cGUgaXMgQ0FMREFWIG9yIElDQUwsIHZhbGlkYXRlIFVSTFxuICAgIGlmICghdmFsdWUgfHwgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgaWYgaXQncyBhIHZhbGlkIFVSTFxuICAgIHRyeSB7XG4gICAgICAgIG5ldyBVUkwodmFsdWUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gRE9NIGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplKCk7XG59KTsiXX0=