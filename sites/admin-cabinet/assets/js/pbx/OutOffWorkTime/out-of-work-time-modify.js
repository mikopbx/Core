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
   IncomingRoutesAPI OutWorkTimesAPI DynamicDropdownBuilder ExtensionSelector */

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
    outOfWorkTimeRecord.$formObj.addClass('loading'); // Use recordId for existing records, empty string for new

    var recordIdToLoad = outOfWorkTimeRecord.recordId || ''; // Load record data via REST API - always returns data (with defaults for new records)

    OutWorkTimesAPI.getRecord(recordIdToLoad, function (response) {
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
      includeEmpty: true,
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
    // Use unified silent population approach
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
    Form.apiSettings.apiObject = OutWorkTimesAPI;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJvdXRPZldvcmtUaW1lUmVjb3JkIiwiJGZvcm1PYmoiLCIkIiwicmVjb3JkSWQiLCJyZWNvcmREYXRhIiwiJHRpbWVfZnJvbSIsIiR0aW1lX3RvIiwiJHJ1bGVzVGFibGUiLCIkaWRGaWVsZCIsIiR3ZWVrZGF5RnJvbUZpZWxkIiwiJHdlZWtkYXlUb0ZpZWxkIiwiJGFjdGlvbkZpZWxkIiwiJGNhbFR5cGVGaWVsZCIsIiRleHRlbnNpb25GaWVsZCIsIiRhbGxvd1Jlc3RyaWN0aW9uRmllbGQiLCIkZGVzY3JpcHRpb25GaWVsZCIsIiRhY3Rpb25Ecm9wZG93biIsIiRjYWxUeXBlRHJvcGRvd24iLCIkd2Vla2RheUZyb21Ecm9wZG93biIsIiR3ZWVrZGF5VG9Ecm9wZG93biIsIiR0YWJNZW51IiwiJHJ1bGVzVGFiIiwiJGdlbmVyYWxUYWIiLCIkcnVsZXNUYWJTZWdtZW50IiwiJGdlbmVyYWxUYWJTZWdtZW50IiwiJGV4dGVuc2lvblJvdyIsIiRhdWRpb01lc3NhZ2VSb3ciLCIkY2FsZW5kYXJUYWIiLCIkbWFpblRhYiIsIiRyYW5nZURheXNTdGFydCIsIiRyYW5nZURheXNFbmQiLCIkcmFuZ2VUaW1lU3RhcnQiLCIkcmFuZ2VUaW1lRW5kIiwiJGVyYXNlRGF0ZXNCdG4iLCIkZXJhc2VXZWVrZGF5c0J0biIsIiRlcmFzZVRpbWVwZXJpb2RCdG4iLCIkZXJyb3JNZXNzYWdlIiwiYXVkaW9NZXNzYWdlSWQiLCJhZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXMiLCJ0eXBlIiwidmFsdWUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJ0Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsIiwidmFsaWRhdGVSdWxlcyIsImV4dGVuc2lvbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJhdWRpb19tZXNzYWdlX2lkIiwidGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSIsImNhbFVybCIsInRmX1ZhbGlkYXRlQ2FsVXJpIiwidGltZWZyb20iLCJvcHRpb25hbCIsInRpbWV0byIsImluaXRpYWxpemUiLCJ2YWwiLCJ0YWIiLCJpbml0aWFsaXplRm9ybSIsImluaXRpYWxpemVDYWxlbmRhcnMiLCJpbml0aWFsaXplUm91dGluZ1RhYmxlIiwiaW5pdGlhbGl6ZUVyYXNlcnMiLCJpbml0aWFsaXplRGVzY3JpcHRpb25GaWVsZCIsImluaXRpYWxpemVUb29sdGlwcyIsImxvYWRGb3JtRGF0YSIsImFkZENsYXNzIiwicmVjb3JkSWRUb0xvYWQiLCJPdXRXb3JrVGltZXNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwicmVzdWx0IiwiZGF0YSIsInBvcHVsYXRlRm9ybSIsImxvYWRSb3V0aW5nVGFibGUiLCJzZXRUaW1lb3V0IiwiRm9ybSIsInNhdmVJbml0aWFsVmFsdWVzIiwiY2hlY2tWYWx1ZXMiLCJtZXNzYWdlcyIsImVycm9yIiwiZXJyb3JNZXNzYWdlIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJpbml0aWFsaXplRHJvcGRvd25zIiwid2Vla0RheXMiLCJ0ZXh0IiwiaSIsImRhdGUiLCJEYXRlIiwiZGF5TmFtZSIsInRvTG9jYWxlRGF0ZVN0cmluZyIsIndlZWtkYXkiLCJ0cmFuc2xhdGVkRGF5IiwicHVzaCIsIm5hbWUiLCJ0b1N0cmluZyIsImRyb3Bkb3duIiwidmFsdWVzIiwib25DaGFuZ2UiLCJkYXRhQ2hhbmdlZCIsIm9uQWN0aW9uQ2hhbmdlIiwib25DYWxUeXBlQ2hhbmdlIiwiaW5pdGlhbGl6ZVNvdW5kRmlsZVNlbGVjdG9yIiwiU291bmRGaWxlU2VsZWN0b3IiLCJpbml0IiwiY2F0ZWdvcnkiLCJpbmNsdWRlRW1wdHkiLCJhdWRpb19tZXNzYWdlX2lkX3JlcHJlc2VudCIsInNldFZhbHVlIiwiaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yIiwiRXh0ZW5zaW9uU2VsZWN0b3IiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImlkIiwidW5pcWlkIiwicHJpb3JpdHkiLCJkZXNjcmlwdGlvbiIsImNhbFR5cGUiLCJ3ZWVrZGF5X2Zyb20iLCJ3ZWVrZGF5X3RvIiwidGltZV9mcm9tIiwidGltZV90byIsImNhbFVzZXIiLCJjYWxTZWNyZXQiLCJhY3Rpb24iLCJhbGxvd1Jlc3RyaWN0aW9uIiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwiJGNhbFNlY3JldEZpZWxkIiwiYXR0ciIsInRmX1Bhc3N3b3JkTWFza2VkIiwidGZfRW50ZXJQYXNzd29yZCIsImRhdGVfZnJvbSIsInNldERhdGVGcm9tVGltZXN0YW1wIiwiZGF0ZV90byIsInRvZ2dsZVJ1bGVzVGFiIiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwiZm9ybSIsInNob3ciLCJoaWRlIiwiY2xlYXIiLCJjYWxlbmRhciIsImZpcnN0RGF5T2ZXZWVrIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJjYWxlbmRhckZpcnN0RGF5T2ZXZWVrIiwiY2FsZW5kYXJUZXh0IiwiZW5kQ2FsZW5kYXIiLCJpbmxpbmUiLCJtb250aEZpcnN0IiwicmVnRXhwIiwic3RhcnRDYWxlbmRhciIsImRpc2FibGVNaW51dGUiLCJhbXBtIiwicGFyZW50IiwiY2hlY2tib3giLCJpc0NoZWNrZWQiLCJmaW5kIiwiaGFzQ2xhc3MiLCJlbXB0eSIsImFzc29jaWF0ZWRJZHMiLCJpbmNvbWluZ1JvdXRlSWRzIiwiSW5jb21pbmdSb3V0ZXNBUEkiLCJnZXRMaXN0IiwiZ3JvdXBlZFJvdXRlcyIsImdyb3VwQW5kU29ydFJvdXRlcyIsInJlbmRlckdyb3VwZWRSb3V0ZXMiLCJpbml0aWFsaXplUm91dGluZ0NoZWNrYm94ZXMiLCJwb3B1cCIsInNob3dFbXB0eVJvdXRlc01lc3NhZ2UiLCJyb3V0ZXMiLCJncm91cHMiLCJmb3JFYWNoIiwicm91dGUiLCJwcm92aWRlcklkIiwicHJvdmlkZXIiLCJwcm92aWRlck5hbWUiLCJwcm92aWRlcmlkX3JlcHJlc2VudCIsImlyX05vQXNzaWduZWRQcm92aWRlciIsInRlbXBEaXYiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJpbm5lckhUTUwiLCJjbGVhblByb3ZpZGVyTmFtZSIsInRleHRDb250ZW50IiwiaW5uZXJUZXh0IiwicHJvdmlkZXJOYW1lSHRtbCIsInByb3ZpZGVyRGlzYWJsZWQiLCJnZW5lcmFsUnVsZXMiLCJzcGVjaWZpY1J1bGVzIiwibnVtYmVyIiwiT2JqZWN0Iiwia2V5cyIsInNvcnQiLCJhIiwiYiIsImRpZCIsInRib2R5IiwiaXNGaXJzdEdyb3VwIiwiZ3JvdXAiLCJhcHBlbmQiLCJyb3ciLCJjcmVhdGVSb3V0ZVJvdyIsImluZGV4IiwiaXNGaXJzdEluRElEIiwicnVsZUNsYXNzIiwic2hvd0RJREluZGljYXRvciIsImluY2x1ZGVzIiwicGFyc2VJbnQiLCJydWxlRGVzY3JpcHRpb24iLCJydWxlX3JlcHJlc2VudCIsIm5vdGVEaXNwbGF5Iiwibm90ZSIsImxlbmd0aCIsInNhZmVQcm92aWRlcklkIiwic2FmZURpZCIsImVtcHR5Um93IiwiaXJfTm9JbmNvbWluZ1JvdXRlcyIsImhvdmVyIiwiJHJvdyIsInNlbGVjdG9yIiwiJHJlbGF0ZWRSb3dzIiwiZWFjaCIsIiRjaGVja2JveCIsInRvb2x0aXBUZXh0IiwidGZfVG9vbHRpcFNwZWNpZmljUnVsZSIsInRmX1Rvb2x0aXBHZW5lcmFsUnVsZSIsInNlbGVjdG9yV2l0aERJRCIsIm5vdCIsInNlbGVjdG9yR2VuZXJhbCIsIm9uIiwic3R5bGUiLCJoZWlnaHQiLCJzY3JvbGxIZWlnaHQiLCJ0cmlnZ2VyIiwiZGF0ZVZhbHVlIiwidGVzdCIsImlzTmFOIiwiZ2V0VGltZSIsInRpbWVzdGFtcCIsImN1c3RvbVZhbGlkYXRlRm9ybSIsImh0bWwiLCJ0Zl9WYWxpZGF0ZUNoZWNrRGF0ZUludGVydmFsIiwiJHN1Ym1pdEJ1dHRvbiIsInRyYW5zaXRpb24iLCJ0Zl9WYWxpZGF0ZUNoZWNrV2Vla0RheUludGVydmFsIiwiaGFzRGF0ZVJhbmdlIiwiaGFzV2Vla2RheVJhbmdlIiwiaGFzVGltZVJhbmdlIiwidGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJrZXkiLCJzdGFydHNXaXRoIiwiZGF0ZUZyb20iLCJzZXRIb3VycyIsIk1hdGgiLCJmbG9vciIsImRhdGVUbyIsInNlbGVjdGVkUm91dGVzIiwicm91dGVJZCIsImNiQWZ0ZXJTZW5kRm9ybSIsIm5ld1VybCIsImdsb2JhbFJvb3RVcmwiLCJ3aW5kb3ciLCJoaXN0b3J5IiwicmVwbGFjZVN0YXRlIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsInRvb2x0aXBDb25maWdzIiwiaGVhZGVyIiwidGZfQ2FsVXJsVG9vbHRpcF9oZWFkZXIiLCJ0Zl9DYWxVcmxUb29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsInRmX0NhbFVybFRvb2x0aXBfY2FsZGF2X2hlYWRlciIsImRlZmluaXRpb24iLCJ0Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl9nb29nbGUiLCJ0Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl9uZXh0Y2xvdWQiLCJ0Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl95YW5kZXgiLCJsaXN0MiIsInRmX0NhbFVybFRvb2x0aXBfaWNhbGVuZGFyX2hlYWRlciIsInRmX0NhbFVybFRvb2x0aXBfaWNhbGVuZGFyX2Rlc2MiLCJleGFtcGxlcyIsInRmX0NhbFVybFRvb2x0aXBfZXhhbXBsZV9nb29nbGUiLCJ0Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVfbmV4dGNsb3VkIiwidGZfQ2FsVXJsVG9vbHRpcF9leGFtcGxlX2ljcyIsImV4YW1wbGVzSGVhZGVyIiwidGZfQ2FsVXJsVG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJ0Zl9DYWxVcmxUb29sdGlwX25vdGUiLCJUb29sdGlwQnVpbGRlciIsImZuIiwiY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGUiLCJjdXN0b21Ob3RFbXB0eUlmQ2FsVHlwZSIsIlVSTCIsIl8iLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsbUJBQW1CLEdBQUc7QUFDeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsdUJBQUQsQ0FMYTs7QUFPeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLElBWGM7QUFXUjs7QUFFaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLElBakJZO0FBbUJ4QjtBQUNBQyxFQUFBQSxVQUFVLEVBQUVILENBQUMsQ0FBQyxZQUFELENBcEJXO0FBcUJ4QkksRUFBQUEsUUFBUSxFQUFFSixDQUFDLENBQUMsVUFBRCxDQXJCYTtBQXNCeEJLLEVBQUFBLFdBQVcsRUFBRUwsQ0FBQyxDQUFDLGdCQUFELENBdEJVO0FBd0J4QjtBQUNBTSxFQUFBQSxRQUFRLEVBQUVOLENBQUMsQ0FBQyxLQUFELENBekJhO0FBMEJ4Qk8sRUFBQUEsaUJBQWlCLEVBQUVQLENBQUMsQ0FBQyxlQUFELENBMUJJO0FBMkJ4QlEsRUFBQUEsZUFBZSxFQUFFUixDQUFDLENBQUMsYUFBRCxDQTNCTTtBQTRCeEJTLEVBQUFBLFlBQVksRUFBRVQsQ0FBQyxDQUFDLFNBQUQsQ0E1QlM7QUE2QnhCVSxFQUFBQSxhQUFhLEVBQUVWLENBQUMsQ0FBQyxVQUFELENBN0JRO0FBOEJ4QlcsRUFBQUEsZUFBZSxFQUFFWCxDQUFDLENBQUMsWUFBRCxDQTlCTTtBQStCeEJZLEVBQUFBLHNCQUFzQixFQUFFWixDQUFDLENBQUMsbUJBQUQsQ0EvQkQ7QUFnQ3hC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LEdBWDhELENBYS9EOzs7QUFDQSxNQUFJO0FBQ0EsUUFBSW9GLEdBQUosQ0FBUXJRLEtBQVI7QUFDQSxXQUFPLElBQVA7QUFDSCxHQUhELENBR0UsT0FBT3NRLENBQVAsRUFBVTtBQUNSLFdBQU8sS0FBUDtBQUNIO0FBQ0osQ0FwQkQsQyxDQXNCQTs7O0FBQ0E1UyxDQUFDLENBQUNzTCxRQUFELENBQUQsQ0FBWXVILEtBQVosQ0FBa0IsWUFBTTtBQUNwQi9TLEVBQUFBLG1CQUFtQixDQUFDd0QsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQgZ2xvYmFsUm9vdFVybCBFeHRlbnNpb25zIG1vbWVudCBGb3JtIGdsb2JhbFRyYW5zbGF0ZSBcbiAgIFNlbWFudGljTG9jYWxpemF0aW9uIFNvdW5kRmlsZVNlbGVjdG9yIFVzZXJNZXNzYWdlIFNlY3VyaXR5VXRpbHNcbiAgIEluY29taW5nUm91dGVzQVBJIE91dFdvcmtUaW1lc0FQSSBEeW5hbWljRHJvcGRvd25CdWlsZGVyIEV4dGVuc2lvblNlbGVjdG9yICovXG5cbi8qKlxuICogTW9kdWxlIGZvciBtYW5hZ2luZyBvdXQtb2Ytd29yayB0aW1lIHNldHRpbmdzXG4gKiBcbiAqIFRoaXMgbW9kdWxlIGhhbmRsZXMgdGhlIGZvcm0gZm9yIGNyZWF0aW5nIGFuZCBlZGl0aW5nIG91dC1vZi13b3JrIHRpbWUgY29uZGl0aW9ucy5cbiAqIEl0IHVzZXMgYSB1bmlmaWVkIFJFU1QgQVBJIGFwcHJvYWNoIG1hdGNoaW5nIHRoZSBpbmNvbWluZyByb3V0ZXMgcGF0dGVybi5cbiAqIFxuICogQG1vZHVsZSBvdXRPZldvcmtUaW1lUmVjb3JkXG4gKi9cbmNvbnN0IG91dE9mV29ya1RpbWVSZWNvcmQgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBSZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHJlY29yZElkOiBudWxsLCAvLyBXaWxsIGJlIHNldCBpbiBpbml0aWFsaXplKClcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdG9yZSBsb2FkZWQgcmVjb3JkIGRhdGFcbiAgICAgKiBAdHlwZSB7b2JqZWN0fG51bGx9XG4gICAgICovXG4gICAgcmVjb3JkRGF0YTogbnVsbCxcblxuICAgIC8vIEZvcm0gZmllbGQgalF1ZXJ5IG9iamVjdHNcbiAgICAkdGltZV9mcm9tOiAkKCcjdGltZV9mcm9tJyksXG4gICAgJHRpbWVfdG86ICQoJyN0aW1lX3RvJyksXG4gICAgJHJ1bGVzVGFibGU6ICQoJyNyb3V0aW5nLXRhYmxlJyksXG4gICAgXG4gICAgLy8gSGlkZGVuIGlucHV0IGZpZWxkc1xuICAgICRpZEZpZWxkOiAkKCcjaWQnKSxcbiAgICAkd2Vla2RheUZyb21GaWVsZDogJCgnI3dlZWtkYXlfZnJvbScpLFxuICAgICR3ZWVrZGF5VG9GaWVsZDogJCgnI3dlZWtkYXlfdG8nKSxcbiAgICAkYWN0aW9uRmllbGQ6ICQoJyNhY3Rpb24nKSxcbiAgICAkY2FsVHlwZUZpZWxkOiAkKCcjY2FsVHlwZScpLFxuICAgICRleHRlbnNpb25GaWVsZDogJCgnI2V4dGVuc2lvbicpLFxuICAgICRhbGxvd1Jlc3RyaWN0aW9uRmllbGQ6ICQoJyNhbGxvd1Jlc3RyaWN0aW9uJyksXG4gICAgJGRlc2NyaXB0aW9uRmllbGQ6ICQoJyNkZXNjcmlwdGlvbicpLFxuICAgIFxuICAgIC8vIERyb3Bkb3duIGVsZW1lbnRzXG4gICAgJGFjdGlvbkRyb3Bkb3duOiAkKCcuYWN0aW9uLXNlbGVjdCcpLFxuICAgICRjYWxUeXBlRHJvcGRvd246ICQoJy5jYWxUeXBlLXNlbGVjdCcpLFxuICAgICR3ZWVrZGF5RnJvbURyb3Bkb3duOiAkKCcud2Vla2RheS1mcm9tLXNlbGVjdCcpLFxuICAgICR3ZWVrZGF5VG9Ecm9wZG93bjogJCgnLndlZWtkYXktdG8tc2VsZWN0JyksXG4gICAgXG4gICAgLy8gVGFiIGVsZW1lbnRzXG4gICAgJHRhYk1lbnU6ICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbScpLFxuICAgICRydWxlc1RhYjogbnVsbCwgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBsYXRlclxuICAgICRnZW5lcmFsVGFiOiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgJHJ1bGVzVGFiU2VnbWVudDogbnVsbCwgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBsYXRlclxuICAgICRnZW5lcmFsVGFiU2VnbWVudDogbnVsbCwgLy8gV2lsbCBiZSBpbml0aWFsaXplZCBsYXRlclxuICAgIFxuICAgIC8vIFJvdyBlbGVtZW50c1xuICAgICRleHRlbnNpb25Sb3c6ICQoJyNleHRlbnNpb24tcm93JyksXG4gICAgJGF1ZGlvTWVzc2FnZVJvdzogJCgnI2F1ZGlvLW1lc3NhZ2Utcm93JyksXG4gICAgXG4gICAgLy8gQ2FsZW5kYXIgdGFiIGVsZW1lbnRzXG4gICAgJGNhbGVuZGFyVGFiOiAkKCcjY2FsbC10eXBlLWNhbGVuZGFyLXRhYicpLFxuICAgICRtYWluVGFiOiAkKCcjY2FsbC10eXBlLW1haW4tdGFiJyksXG4gICAgXG4gICAgLy8gRGF0ZS90aW1lIGNhbGVuZGFyIGVsZW1lbnRzXG4gICAgJHJhbmdlRGF5c1N0YXJ0OiAkKCcjcmFuZ2UtZGF5cy1zdGFydCcpLFxuICAgICRyYW5nZURheXNFbmQ6ICQoJyNyYW5nZS1kYXlzLWVuZCcpLFxuICAgICRyYW5nZVRpbWVTdGFydDogJCgnI3JhbmdlLXRpbWUtc3RhcnQnKSxcbiAgICAkcmFuZ2VUaW1lRW5kOiAkKCcjcmFuZ2UtdGltZS1lbmQnKSxcbiAgICBcbiAgICAvLyBFcmFzZSBidXR0b25zXG4gICAgJGVyYXNlRGF0ZXNCdG46ICQoJyNlcmFzZS1kYXRlcycpLFxuICAgICRlcmFzZVdlZWtkYXlzQnRuOiAkKCcjZXJhc2Utd2Vla2RheXMnKSxcbiAgICAkZXJhc2VUaW1lcGVyaW9kQnRuOiAkKCcjZXJhc2UtdGltZXBlcmlvZCcpLFxuICAgIFxuICAgIC8vIEVycm9yIG1lc3NhZ2UgZWxlbWVudFxuICAgICRlcnJvck1lc3NhZ2U6ICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJyksXG4gICAgXG4gICAgLy8gQXVkaW8gbWVzc2FnZSBJRCBmb3Igc291bmQgZmlsZSBzZWxlY3RvclxuICAgIGF1ZGlvTWVzc2FnZUlkOiAnYXVkaW9fbWVzc2FnZV9pZCcsXG5cbiAgICAvKipcbiAgICAgKiBBZGRpdGlvbmFsIHRpbWUgaW50ZXJ2YWwgdmFsaWRhdGlvbiBydWxlc1xuICAgICAqIEB0eXBlIHthcnJheX1cbiAgICAgKi9cbiAgICBhZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXM6IFt7XG4gICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICB2YWx1ZTogL14oWzAxXT9bMC05XXwyWzAtM10pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICB9XSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybVxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZVtleHRlbnNpb25dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVFeHRlbnNpb25FbXB0eVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgYXVkaW9fbWVzc2FnZV9pZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2F1ZGlvX21lc3NhZ2VfaWQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZVtwbGF5bWVzc2FnZV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUF1ZGlvTWVzc2FnZUVtcHR5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBjYWxVcmw6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdjYWxVcmwnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjdXN0b21Ob3RFbXB0eUlmQ2FsVHlwZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2FsVXJpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB0aW1lZnJvbToge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndGltZV9mcm9tJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAvXihbMDFdP1swLTldfDJbMC0zXSk6KFswLTVdP1swLTldKSQvLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwsXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB0aW1ldG86IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX3RvJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKFswMV0/WzAtOV18MlswLTNdKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gU2V0IHJlY29yZCBJRCBmcm9tIERPTVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZElkID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kaWRGaWVsZC52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFiIHJlZmVyZW5jZXMgdGhhdCBkZXBlbmQgb24gRE9NXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiID0gJCgnI291dC10aW1lLW1vZGlmeS1tZW51IC5pdGVtW2RhdGEtdGFiPVwicnVsZXNcIl0nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYiA9ICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbVtkYXRhLXRhYj1cImdlbmVyYWxcIl0nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJTZWdtZW50ID0gJCgnLnVpLnRhYi5zZWdtZW50W2RhdGEtdGFiPVwicnVsZXNcIl0nKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYlNlZ21lbnQgPSAkKCcudWkudGFiLnNlZ21lbnRbZGF0YS10YWI9XCJnZW5lcmFsXCJdJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kdGFiTWVudS50YWIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSBzdWJtaXNzaW9uIGhhbmRsaW5nXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY29tcG9uZW50cyB0aGF0IGRvbid0IGRlcGVuZCBvbiBkYXRhXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUNhbGVuZGFycygpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVSb3V0aW5nVGFibGUoKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRXJhc2VycygpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVEZXNjcmlwdGlvbkZpZWxkKCk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGRhdGEgYW5kIGluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgIC8vIFRoaXMgdW5pZmllZCBhcHByb2FjaCBsb2FkcyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgb3IgZXhpc3RpbmcgZGF0YVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmxvYWRGb3JtRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICogVW5pZmllZCBhcHByb2FjaCBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHNcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgcmVjb3JkSWQgZm9yIGV4aXN0aW5nIHJlY29yZHMsIGVtcHR5IHN0cmluZyBmb3IgbmV3XG4gICAgICAgIGNvbnN0IHJlY29yZElkVG9Mb2FkID0gb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmRJZCB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgcmVjb3JkIGRhdGEgdmlhIFJFU1QgQVBJIC0gYWx3YXlzIHJldHVybnMgZGF0YSAod2l0aCBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMpXG4gICAgICAgIE91dFdvcmtUaW1lc0FQSS5nZXRSZWNvcmQocmVjb3JkSWRUb0xvYWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gU3VjY2VzczogcG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgKGRlZmF1bHRzIGZvciBuZXcsIHJlYWwgZGF0YSBmb3IgZXhpc3RpbmcpXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmREYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHJvdXRpbmcgcnVsZXNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmxvYWRSb3V0aW5nVGFibGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTYXZlIGluaXRpYWwgdmFsdWVzIHRvIHByZXZlbnQgc2F2ZSBidXR0b24gYWN0aXZhdGlvblxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICB9LCAyNTApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBBUEkgZXJyb3IgLSBzaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKTtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgZHJvcGRvd25zIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgd2Vla2RheSBkcm9wZG93bnMgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgb3JpZ2luYWwgaW1wbGVtZW50YXRpb25cbiAgICAgICAgY29uc3Qgd2Vla0RheXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnLTEnLCB0ZXh0OiAnLScgfSAvLyBEZWZhdWx0IGVtcHR5IG9wdGlvblxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRheXMgMS03IHVzaW5nIHRoZSBzYW1lIGxvZ2ljIGFzIG9yaWdpbmFsIGNvbnRyb2xsZXJcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gNzsgaSsrKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgZGF0ZSBmb3IgXCJTdW5kYXkgK2kgZGF5c1wiIHRvIG1hdGNoIG9yaWdpbmFsIGxvZ2ljXG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoMjAyMCwgMCwgNSArIGkpOyAvLyBKYW4gNSwgMjAyMCB3YXMgU3VuZGF5XG4gICAgICAgICAgICBjb25zdCBkYXlOYW1lID0gZGF0ZS50b0xvY2FsZURhdGVTdHJpbmcoJ2VuJywgeyB3ZWVrZGF5OiAnc2hvcnQnIH0pO1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB0cmFuc2xhdGlvbiBmb3IgdGhlIGRheSBhYmJyZXZpYXRpb25cbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWREYXkgPSBnbG9iYWxUcmFuc2xhdGVbZGF5TmFtZV0gfHwgZGF5TmFtZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgd2Vla0RheXMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogdHJhbnNsYXRlZERheSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHRleHQ6IHRyYW5zbGF0ZWREYXlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIHZhbHVlczogd2Vla0RheXMsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheUZyb21GaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICB2YWx1ZXM6IHdlZWtEYXlzLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlUb0ZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkFjdGlvbkNoYW5nZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2FsZW5kYXIgdHlwZSBkcm9wZG93blxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsVHlwZUZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkNhbFR5cGVDaGFuZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gc2VsZWN0b3Igd2lsbCBiZSBpbml0aWFsaXplZCBpbiBwb3B1bGF0ZUZvcm0gd2l0aCBBUEkgZGF0YVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yIHdpdGggQVBJIGRhdGFcbiAgICAgKiBTaW5nbGUgcG9pbnQgb2YgaW5pdGlhbGl6YXRpb24gYWZ0ZXIgcmVjZWl2aW5nIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEFQSSByZXNwb25zZSBkYXRhICh3aXRoIGRlZmF1bHRzIG9yIGV4aXN0aW5nIHZhbHVlcylcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3IoZGF0YSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFNvdW5kRmlsZVNlbGVjdG9yIHdpdGggY29tcGxldGUgQVBJIGRhdGEgY29udGV4dFxuICAgICAgICBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KG91dE9mV29ya1RpbWVSZWNvcmQuYXVkaW9NZXNzYWdlSWQsIHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEgLy8gUGFzcyBjb21wbGV0ZSBBUEkgZGF0YSBmb3IgcHJvcGVyIGluaXRpYWxpemF0aW9uXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgYXVkaW9fbWVzc2FnZV9pZCBleGlzdHMsIHNldCB0aGUgdmFsdWUgd2l0aCByZXByZXNlbnRhdGlvblxuICAgICAgICBpZiAoZGF0YS5hdWRpb19tZXNzYWdlX2lkICYmIGRhdGEuYXVkaW9fbWVzc2FnZV9pZF9yZXByZXNlbnQpIHtcbiAgICAgICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLnNldFZhbHVlKFxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuYXVkaW9NZXNzYWdlSWQsIFxuICAgICAgICAgICAgICAgIGRhdGEuYXVkaW9fbWVzc2FnZV9pZCwgXG4gICAgICAgICAgICAgICAgZGF0YS5hdWRpb19tZXNzYWdlX2lkX3JlcHJlc2VudFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3Igd2l0aCBBUEkgZGF0YVxuICAgICAqIFNpbmdsZSBwb2ludCBvZiBpbml0aWFsaXphdGlvbiBhZnRlciByZWNlaXZpbmcgZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gQVBJIHJlc3BvbnNlIGRhdGEgKHdpdGggZGVmYXVsdHMgb3IgZXhpc3RpbmcgdmFsdWVzKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVFeHRlbnNpb25TZWxlY3RvcihkYXRhKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgRXh0ZW5zaW9uU2VsZWN0b3IgZm9sbG93aW5nIFY1LjAgcGF0dGVyblxuICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5pbml0KCdleHRlbnNpb24nLCB7XG4gICAgICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFJlY29yZCBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSh7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgICAgIHVuaXFpZDogZGF0YS51bmlxaWQsXG4gICAgICAgICAgICBwcmlvcml0eTogZGF0YS5wcmlvcml0eSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkYXRhLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgY2FsVHlwZTogZGF0YS5jYWxUeXBlLFxuICAgICAgICAgICAgd2Vla2RheV9mcm9tOiBkYXRhLndlZWtkYXlfZnJvbSxcbiAgICAgICAgICAgIHdlZWtkYXlfdG86IGRhdGEud2Vla2RheV90byxcbiAgICAgICAgICAgIHRpbWVfZnJvbTogZGF0YS50aW1lX2Zyb20sXG4gICAgICAgICAgICB0aW1lX3RvOiBkYXRhLnRpbWVfdG8sXG4gICAgICAgICAgICBjYWxVcmw6IGRhdGEuY2FsVXJsLFxuICAgICAgICAgICAgY2FsVXNlcjogZGF0YS5jYWxVc2VyLFxuICAgICAgICAgICAgY2FsU2VjcmV0OiBkYXRhLmNhbFNlY3JldCxcbiAgICAgICAgICAgIGFjdGlvbjogZGF0YS5hY3Rpb24sXG4gICAgICAgICAgICBleHRlbnNpb246IGRhdGEuZXh0ZW5zaW9uLFxuICAgICAgICAgICAgYXVkaW9fbWVzc2FnZV9pZDogZGF0YS5hdWRpb19tZXNzYWdlX2lkLFxuICAgICAgICAgICAgYWxsb3dSZXN0cmljdGlvbjogZGF0YS5hbGxvd1Jlc3RyaWN0aW9uXG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBwYXNzd29yZCBmaWVsZCBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgIGNvbnN0ICRjYWxTZWNyZXRGaWVsZCA9ICQoJyNjYWxTZWNyZXQnKTtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5jYWxTZWNyZXQgPT09ICdYWFhYWFgnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhc3N3b3JkIGV4aXN0cyBidXQgaXMgbWFza2VkLCBzaG93IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgICAgICRjYWxTZWNyZXRGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS50Zl9QYXNzd29yZE1hc2tlZCB8fCAnUGFzc3dvcmQgc2F2ZWQgKGVudGVyIG5ldyB0byBjaGFuZ2UpJyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIG1hc2tlZCBzdGF0ZSB0byBkZXRlY3QgY2hhbmdlc1xuICAgICAgICAgICAgICAgICAgICAkY2FsU2VjcmV0RmllbGQuZGF0YSgnb3JpZ2luYWxNYXNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkY2FsU2VjcmV0RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUudGZfRW50ZXJQYXNzd29yZCB8fCAnRW50ZXIgcGFzc3dvcmQnKTtcbiAgICAgICAgICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmRhdGEoJ29yaWdpbmFsTWFza2VkJywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZURyb3Bkb3ducygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgc291bmQgZmlsZSBzZWxlY3RvciB3aXRoIEFQSSBkYXRhIChzaW5nbGUgcG9pbnQgb2YgaW5pdGlhbGl6YXRpb24pXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplU291bmRGaWxlU2VsZWN0b3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBleHRlbnNpb24gc2VsZWN0b3Igd2l0aCBBUEkgZGF0YVxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdG9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBkcm9wZG93biB2YWx1ZXMgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgICAvLyBTZXQgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLmFjdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBjYWxUeXBlIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuY2FsVHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuY2FsVHlwZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCB3ZWVrZGF5IGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLndlZWtkYXlfZnJvbSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLndlZWtkYXlfZnJvbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLndlZWtkYXlfdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheVRvRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEud2Vla2RheV90byk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBkYXRlcyBpZiBwcmVzZW50XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZGF0ZV9mcm9tKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2V0RGF0ZUZyb21UaW1lc3RhbXAoZGF0YS5kYXRlX2Zyb20sICcjcmFuZ2UtZGF5cy1zdGFydCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5kYXRlX3RvKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2V0RGF0ZUZyb21UaW1lc3RhbXAoZGF0YS5kYXRlX3RvLCAnI3JhbmdlLWRheXMtZW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBmaWVsZCB2aXNpYmlsaXR5IGJhc2VkIG9uIGFjdGlvblxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQub25BY3Rpb25DaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY2FsZW5kYXIgdHlwZSB2aXNpYmlsaXR5XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkNhbFR5cGVDaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgcnVsZXMgdGFiIHZpc2liaWxpdHkgYmFzZWQgb24gYWxsb3dSZXN0cmljdGlvblxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlUnVsZXNUYWIoZGF0YS5hbGxvd1Jlc3RyaWN0aW9uKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nXG4gICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBhY3Rpb24gZHJvcGRvd24gY2hhbmdlXG4gICAgICovXG4gICAgb25BY3Rpb25DaGFuZ2UoKSB7XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FjdGlvbicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ2V4dGVuc2lvbicpIHtcbiAgICAgICAgICAgIC8vIFNob3cgZXh0ZW5zaW9uLCBoaWRlIGF1ZGlvXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25Sb3cuc2hvdygpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYXVkaW9NZXNzYWdlUm93LmhpZGUoKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGF1ZGlvIG1lc3NhZ2VcbiAgICAgICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLmNsZWFyKG91dE9mV29ya1RpbWVSZWNvcmQuYXVkaW9NZXNzYWdlSWQpO1xuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gJ3BsYXltZXNzYWdlJykge1xuICAgICAgICAgICAgLy8gU2hvdyBhdWRpbywgaGlkZSBleHRlbnNpb25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGV4dGVuc2lvblJvdy5oaWRlKCk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhdWRpb01lc3NhZ2VSb3cuc2hvdygpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgZXh0ZW5zaW9uIHVzaW5nIEV4dGVuc2lvblNlbGVjdG9yXG4gICAgICAgICAgICBFeHRlbnNpb25TZWxlY3Rvci5jbGVhcignZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25GaWVsZC52YWwoJycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgY2FsZW5kYXIgdHlwZSBjaGFuZ2VcbiAgICAgKi9cbiAgICBvbkNhbFR5cGVDaGFuZ2UoKSB7XG4gICAgICAgIGNvbnN0IGNhbFR5cGUgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYWxUeXBlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyAndGltZWZyYW1lJyBhbmQgZW1wdHkgc3RyaW5nIG1lYW4gdGltZS1iYXNlZCBjb25kaXRpb25zIChzaG93IG1haW4gdGFiKVxuICAgICAgICBpZiAoIWNhbFR5cGUgfHwgY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScgfHwgY2FsVHlwZSA9PT0gJycpIHtcbiAgICAgICAgICAgIC8vIFNob3cgbWFpbiB0aW1lL2RhdGUgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsZW5kYXJUYWIuaGlkZSgpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kbWFpblRhYi5zaG93KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoY2FsVHlwZSA9PT0gJ0NBTERBVicgfHwgY2FsVHlwZSA9PT0gJ0lDQUwnKSB7XG4gICAgICAgICAgICAvLyBTaG93IGNhbGVuZGFyIFVSTCBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxlbmRhclRhYi5zaG93KCk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRtYWluVGFiLmhpZGUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjYWxlbmRhcnMgZm9yIGRhdGUgYW5kIHRpbWUgc2VsZWN0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNhbGVuZGFycygpIHtcbiAgICAgICAgLy8gRGF0ZSByYW5nZSBjYWxlbmRhcnNcbiAgICAgICAgLy8gVXNlIGNsYXNzIHZhcmlhYmxlcyBmb3IgY2FsZW5kYXJzXG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcih7XG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBzdGFydENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydCxcbiAgICAgICAgICAgIHR5cGU6ICdkYXRlJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRpbWUgcmFuZ2UgY2FsZW5kYXJzXG4gICAgICAgIC8vIFVzZSBjbGFzcyB2YXJpYWJsZXMgZm9yIHRpbWUgY2FsZW5kYXJzXG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVTdGFydC5jYWxlbmRhcih7XG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgc3RhcnRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICBhbXBtOiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcm91dGluZyB0YWJsZSBhbmQgYWxsb3dSZXN0cmljdGlvbiBjaGVja2JveFxuICAgICAqL1xuICAgIGluaXRpYWxpemVSb3V0aW5nVGFibGUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgYWxsb3dSZXN0cmljdGlvbiBjaGVja2JveFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhbGxvd1Jlc3RyaWN0aW9uRmllbGQucGFyZW50KCkuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGFsbG93UmVzdHJpY3Rpb25GaWVsZC5wYXJlbnQoKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlUnVsZXNUYWIoaXNDaGVja2VkKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBleGlzdGluZyBjaGVja2JveGVzIGluIHRhYmxlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBydWxlcyB0YWIgdmlzaWJpbGl0eVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNDaGVja2VkIC0gV2hldGhlciB0byBzaG93IHJ1bGVzIHRhYlxuICAgICAqL1xuICAgIHRvZ2dsZVJ1bGVzVGFiKGlzQ2hlY2tlZCkge1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIuaGlkZSgpO1xuICAgICAgICAgICAgLy8gU3dpdGNoIHRvIGdlbmVyYWwgdGFiIGlmIHJ1bGVzIHRhYiB3YXMgYWN0aXZlXG4gICAgICAgICAgICBpZiAob3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIuaGFzQ2xhc3MoJ2FjdGl2ZScpKSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiU2VnbWVudC5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYi5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZ2VuZXJhbFRhYlNlZ21lbnQuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIHJvdXRpbmcgdGFibGUgd2l0aCBpbmNvbWluZyByb3V0ZXNcbiAgICAgKi9cbiAgICBsb2FkUm91dGluZ1RhYmxlKCkge1xuICAgICAgICAvLyBDbGVhciB0YWJsZVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJ3Rib2R5JykuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBhc3NvY2lhdGVkIElEcyBmcm9tIHJlY29yZCBkYXRhXG4gICAgICAgIGNvbnN0IGFzc29jaWF0ZWRJZHMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZERhdGE/LmluY29taW5nUm91dGVJZHMgfHwgW107XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGFsbCBhdmFpbGFibGUgcm91dGVzIGZyb20gSW5jb21pbmdSb3V0ZXNBUElcbiAgICAgICAgSW5jb21pbmdSb3V0ZXNBUEkuZ2V0TGlzdCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIEdyb3VwIGFuZCBzb3J0IHJvdXRlc1xuICAgICAgICAgICAgICAgIGNvbnN0IGdyb3VwZWRSb3V0ZXMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmdyb3VwQW5kU29ydFJvdXRlcyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgZ3JvdXBlZCByb3V0ZXNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlbmRlckdyb3VwZWRSb3V0ZXMoZ3JvdXBlZFJvdXRlcywgYXNzb2NpYXRlZElkcyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzIHdpdGggZ3JvdXBlZCBjaGVja2JveCBsb2dpY1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZVJvdXRpbmdDaGVja2JveGVzKCk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCdbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuc2hvd0VtcHR5Um91dGVzTWVzc2FnZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdyb3VwIGFuZCBzb3J0IHJvdXRlcyBieSBwcm92aWRlciBhbmQgRElEXG4gICAgICogQHBhcmFtIHtBcnJheX0gcm91dGVzIC0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IEdyb3VwZWQgcm91dGVzXG4gICAgICovXG4gICAgZ3JvdXBBbmRTb3J0Um91dGVzKHJvdXRlcykge1xuICAgICAgICBjb25zdCBncm91cHMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNraXAgZGVmYXVsdCByb3V0ZSBhbmQgZ3JvdXAgYnkgcHJvdmlkZXJcbiAgICAgICAgcm91dGVzLmZvckVhY2goKHJvdXRlKSA9PiB7XG4gICAgICAgICAgICBpZiAocm91dGUuaWQgPT09IDEgfHwgcm91dGUuaWQgPT09ICcxJykgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBwcm92aWRlcklkID0gcm91dGUucHJvdmlkZXIgfHwgJ25vbmUnO1xuICAgICAgICAgICAgaWYgKCFncm91cHNbcHJvdmlkZXJJZF0pIHtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHBsYWluIHRleHQgcHJvdmlkZXIgbmFtZSBmcm9tIEhUTUwgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgbGV0IHByb3ZpZGVyTmFtZSA9IHJvdXRlLnByb3ZpZGVyaWRfcmVwcmVzZW50IHx8IGdsb2JhbFRyYW5zbGF0ZS5pcl9Ob0Fzc2lnbmVkUHJvdmlkZXIgfHwgJ0RpcmVjdCBjYWxscyc7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIEhUTUwgdGFncyB0byBnZXQgY2xlYW4gcHJvdmlkZXIgbmFtZSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICB0ZW1wRGl2LmlubmVySFRNTCA9IHByb3ZpZGVyTmFtZTtcbiAgICAgICAgICAgICAgICBjb25zdCBjbGVhblByb3ZpZGVyTmFtZSA9IHRlbXBEaXYudGV4dENvbnRlbnQgfHwgdGVtcERpdi5pbm5lclRleHQgfHwgcHJvdmlkZXJOYW1lO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJJZDogcHJvdmlkZXJJZCwgIC8vIFN0b3JlIGFjdHVhbCBwcm92aWRlciBJRFxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck5hbWU6IGNsZWFuUHJvdmlkZXJOYW1lLCAgLy8gQ2xlYW4gbmFtZSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck5hbWVIdG1sOiByb3V0ZS5wcm92aWRlcmlkX3JlcHJlc2VudCB8fCBwcm92aWRlck5hbWUsICAvLyBPcmlnaW5hbCBIVE1MIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlckRpc2FibGVkOiByb3V0ZS5wcm92aWRlckRpc2FibGVkIHx8IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsUnVsZXM6IFtdLFxuICAgICAgICAgICAgICAgICAgICBzcGVjaWZpY1J1bGVzOiB7fVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNlcGFyYXRlIGdlbmVyYWwgcnVsZXMgKG5vIERJRCkgZnJvbSBzcGVjaWZpYyBydWxlcyAod2l0aCBESUQpXG4gICAgICAgICAgICBpZiAoIXJvdXRlLm51bWJlciB8fCByb3V0ZS5udW1iZXIgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLmdlbmVyYWxSdWxlcy5wdXNoKHJvdXRlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlc1tyb3V0ZS5udW1iZXJdKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5zcGVjaWZpY1J1bGVzW3JvdXRlLm51bWJlcl0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXNbcm91dGUubnVtYmVyXS5wdXNoKHJvdXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTb3J0IHJ1bGVzIHdpdGhpbiBlYWNoIGdyb3VwIGJ5IHByaW9yaXR5XG4gICAgICAgIE9iamVjdC5rZXlzKGdyb3VwcykuZm9yRWFjaChwcm92aWRlcklkID0+IHtcbiAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5nZW5lcmFsUnVsZXMuc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXMpLmZvckVhY2goZGlkID0+IHtcbiAgICAgICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlc1tkaWRdLnNvcnQoKGEsIGIpID0+IGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBncm91cHM7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgZ3JvdXBlZCByb3V0ZXMgaW4gdGhlIHRhYmxlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGdyb3VwZWRSb3V0ZXMgLSBHcm91cGVkIHJvdXRlcyBvYmplY3RcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhc3NvY2lhdGVkSWRzIC0gQXJyYXkgb2YgYXNzb2NpYXRlZCByb3V0ZSBJRHNcbiAgICAgKi9cbiAgICByZW5kZXJHcm91cGVkUm91dGVzKGdyb3VwZWRSb3V0ZXMsIGFzc29jaWF0ZWRJZHMpIHtcbiAgICAgICAgY29uc3QgdGJvZHkgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJ3Rib2R5Jyk7XG4gICAgICAgIGxldCBpc0ZpcnN0R3JvdXAgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBlZFJvdXRlcykuZm9yRWFjaChwcm92aWRlcklkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGdyb3VwID0gZ3JvdXBlZFJvdXRlc1twcm92aWRlcklkXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIHByb3ZpZGVyIGdyb3VwIGhlYWRlclxuICAgICAgICAgICAgaWYgKCFpc0ZpcnN0R3JvdXApIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgc2VwYXJhdG9yIGJldHdlZW4gZ3JvdXBzXG4gICAgICAgICAgICAgICAgdGJvZHkuYXBwZW5kKCc8dHIgY2xhc3M9XCJwcm92aWRlci1zZXBhcmF0b3JcIj48dGQgY29sc3Bhbj1cIjNcIj48ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PjwvdGQ+PC90cj4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlzRmlyc3RHcm91cCA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgcHJvdmlkZXIgaGVhZGVyIHJvdyAtIHVzZSBwcm92aWRlck5hbWVIdG1sIGZvciByaWNoIGRpc3BsYXlcbiAgICAgICAgICAgIHRib2R5LmFwcGVuZChgXG4gICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwicHJvdmlkZXItaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjb2xzcGFuPVwiM1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z3JvdXAucHJvdmlkZXJOYW1lSHRtbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtncm91cC5wcm92aWRlckRpc2FibGVkID8gJzxzcGFuIGNsYXNzPVwidWkgbWluaSByZWQgbGFiZWxcIj5EaXNhYmxlZDwvc3Bhbj4nIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbmRlciBnZW5lcmFsIHJ1bGVzIGZpcnN0XG4gICAgICAgICAgICBncm91cC5nZW5lcmFsUnVsZXMuZm9yRWFjaCgocm91dGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmNyZWF0ZVJvdXRlUm93KHJvdXRlLCBhc3NvY2lhdGVkSWRzLCAncnVsZS1nZW5lcmFsJyk7XG4gICAgICAgICAgICAgICAgdGJvZHkuYXBwZW5kKHJvdyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVuZGVyIHNwZWNpZmljIHJ1bGVzIGdyb3VwZWQgYnkgRElEXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhncm91cC5zcGVjaWZpY1J1bGVzKS5zb3J0KCkuZm9yRWFjaChkaWQgPT4ge1xuICAgICAgICAgICAgICAgIGdyb3VwLnNwZWNpZmljUnVsZXNbZGlkXS5mb3JFYWNoKChyb3V0ZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNGaXJzdEluRElEID0gaW5kZXggPT09IDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IG91dE9mV29ya1RpbWVSZWNvcmQuY3JlYXRlUm91dGVSb3cocm91dGUsIGFzc29jaWF0ZWRJZHMsICdydWxlLXNwZWNpZmljJywgaXNGaXJzdEluRElEKTtcbiAgICAgICAgICAgICAgICAgICAgdGJvZHkuYXBwZW5kKHJvdyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBzaW5nbGUgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJvdXRlIC0gUm91dGUgb2JqZWN0XG4gICAgICogQHBhcmFtIHtBcnJheX0gYXNzb2NpYXRlZElkcyAtIEFzc29jaWF0ZWQgcm91dGUgSURzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJ1bGVDbGFzcyAtIENTUyBjbGFzcyBmb3IgdGhlIHJ1bGUgdHlwZVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gc2hvd0RJREluZGljYXRvciAtIFdoZXRoZXIgdG8gc2hvdyBESUQgaW5kaWNhdG9yXG4gICAgICogQHJldHVybnMge1N0cmluZ30gSFRNTCByb3dcbiAgICAgKi9cbiAgICBjcmVhdGVSb3V0ZVJvdyhyb3V0ZSwgYXNzb2NpYXRlZElkcywgcnVsZUNsYXNzID0gJycsIHNob3dESURJbmRpY2F0b3IgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBhc3NvY2lhdGVkSWRzLmluY2x1ZGVzKHBhcnNlSW50KHJvdXRlLmlkKSk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyRGlzYWJsZWQgPSByb3V0ZS5wcm92aWRlckRpc2FibGVkID8gJ2Rpc2FibGVkJyA6ICcnO1xuICAgICAgICBsZXQgcnVsZURlc2NyaXB0aW9uID0gcm91dGUucnVsZV9yZXByZXNlbnQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbnN1cmUgcHJvdmlkZXIgSUQgaXMgY2xlYW4gKG5vIEhUTUwpXG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSByb3V0ZS5wcm92aWRlciB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB2aXN1YWwgaW5kaWNhdG9ycyBmb3IgcnVsZSB0eXBlXG4gICAgICAgIGlmIChydWxlQ2xhc3MgPT09ICdydWxlLXNwZWNpZmljJykge1xuICAgICAgICAgICAgLy8gQWRkIGluZGVudCBhbmQgYXJyb3cgZm9yIHNwZWNpZmljIHJ1bGVzXG4gICAgICAgICAgICBydWxlRGVzY3JpcHRpb24gPSBgPHNwYW4gY2xhc3M9XCJydWxlLWluZGVudFwiPuKGszwvc3Bhbj4gJHtydWxlRGVzY3JpcHRpb259YDtcbiAgICAgICAgfSBlbHNlIGlmIChydWxlQ2xhc3MgPT09ICdydWxlLWdlbmVyYWwnKSB7XG4gICAgICAgICAgICAvLyBBZGQgaWNvbiBmb3IgZ2VuZXJhbCBydWxlc1xuICAgICAgICAgICAgcnVsZURlc2NyaXB0aW9uID0gYDxpIGNsYXNzPVwicmFuZG9tIGljb25cIj48L2k+ICR7cnVsZURlc2NyaXB0aW9ufWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG5vdGVEaXNwbGF5ID0gcm91dGUubm90ZSAmJiByb3V0ZS5ub3RlLmxlbmd0aCA+IDIwID8gXG4gICAgICAgICAgICBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uXCIgZGF0YS1jb250ZW50PVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocm91dGUubm90ZSl9XCIgZGF0YS12YXJpYXRpb249XCJ3aWRlXCIgZGF0YS1wb3NpdGlvbj1cInRvcCByaWdodFwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZmlsZSB0ZXh0IGljb25cIj48L2k+XG4gICAgICAgICAgICA8L2Rpdj5gIDogXG4gICAgICAgICAgICBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocm91dGUubm90ZSB8fCAnJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEYXRhIGF0dHJpYnV0ZXMgYWxyZWFkeSBzYWZlIGZyb20gQVBJXG4gICAgICAgIGNvbnN0IHNhZmVQcm92aWRlcklkID0gcHJvdmlkZXJJZDtcbiAgICAgICAgY29uc3Qgc2FmZURpZCA9IHJvdXRlLm51bWJlciB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8dHIgY2xhc3M9XCJydWxlLXJvdyAke3J1bGVDbGFzc31cIiBpZD1cIiR7cm91dGUuaWR9XCIgXG4gICAgICAgICAgICAgICAgZGF0YS1wcm92aWRlcj1cIiR7c2FmZVByb3ZpZGVySWR9XCIgXG4gICAgICAgICAgICAgICAgZGF0YS1kaWQ9XCIke3NhZmVEaWR9XCI+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiY29sbGFwc2luZ1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZml0dGVkIHRvZ2dsZSBjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtZGlkPVwiJHtzYWZlRGlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcHJvdmlkZXI9XCJ7JHtzYWZlUHJvdmlkZXJJZH19XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgJHtpc0NoZWNrZWQgPyAnY2hlY2tlZCcgOiAnJ30gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInJvdXRlLSR7cm91dGUuaWR9XCIgZGF0YS12YWx1ZT1cIiR7cm91dGUuaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCIke3Byb3ZpZGVyRGlzYWJsZWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICR7cnVsZURlc2NyaXB0aW9uIHx8ICc8c3BhbiBjbGFzcz1cInRleHQtbXV0ZWRcIj5ObyBkZXNjcmlwdGlvbjwvc3Bhbj4nfVxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiaGlkZS1vbi1tb2JpbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtub3RlRGlzcGxheX1cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgPC90cj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgZW1wdHkgcm91dGVzIG1lc3NhZ2UgaW4gdGFibGVcbiAgICAgKi9cbiAgICBzaG93RW1wdHlSb3V0ZXNNZXNzYWdlKCkge1xuICAgICAgICBjb25zdCBlbXB0eVJvdyA9IGBcbiAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjNcIiBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmlyX05vSW5jb21pbmdSb3V0ZXMgfHwgJ05vIGluY29taW5nIHJvdXRlcyBjb25maWd1cmVkJ31cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgPC90cj5cbiAgICAgICAgYDtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCd0Ym9keScpLmFwcGVuZChlbXB0eVJvdyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJvdXRpbmcgY2hlY2tib3hlcyB3aXRoIGdyb3VwZWQgbG9naWNcbiAgICAgKiBXaGVuIGNoZWNraW5nL3VuY2hlY2tpbmcgcnVsZXMgd2l0aCBzYW1lIHByb3ZpZGVyIGFuZCBESURcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUm91dGluZ0NoZWNrYm94ZXMoKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaG92ZXIgZWZmZWN0IHRvIGhpZ2hsaWdodCByZWxhdGVkIHJ1bGVzXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnJ1bGUtcm93JykuaG92ZXIoXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlciA9ICRyb3cuYXR0cignZGF0YS1wcm92aWRlcicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpZCA9ICRyb3cuYXR0cignZGF0YS1kaWQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgcHJldmlvdXMgaGlnaGxpZ2h0c1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnJ1bGUtcm93JykucmVtb3ZlQ2xhc3MoJ3JlbGF0ZWQtaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyICYmIHByb3ZpZGVyICE9PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGlnaGxpZ2h0IGFsbCBydWxlcyB3aXRoIHNhbWUgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYC5ydWxlLXJvd1tkYXRhLXByb3ZpZGVyPVwiJHtwcm92aWRlcn1cIl1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgaG92ZXJpbmcgb24gc3BlY2lmaWMgRElEIHJ1bGUsIGhpZ2hsaWdodCBhbGwgd2l0aCBzYW1lIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3IgKz0gYFtkYXRhLWRpZD1cIiR7ZGlkfVwiXWA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBob3ZlcmluZyBvbiBnZW5lcmFsIHJ1bGUsIGhpZ2hsaWdodCBhbGwgZ2VuZXJhbCBydWxlcyBmb3IgdGhpcyBwcm92aWRlclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3IgKz0gJ1tkYXRhLWRpZD1cIlwiXSc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRyZWxhdGVkUm93cyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgICRyZWxhdGVkUm93cy5hZGRDbGFzcygncmVsYXRlZC1oaWdobGlnaHQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGhpZ2hsaWdodHMgb24gbW91c2UgbGVhdmVcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLnJlbW92ZUNsYXNzKCdyZWxhdGVkLWhpZ2hsaWdodCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveCBiZWhhdmlvciB3aXRoIHRvb2x0aXBzXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnVpLmNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBkaWQgPSAkY2hlY2tib3guYXR0cignZGF0YS1kaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtcHJvdmlkZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIHRvb2x0aXAgdG8gZXhwbGFpbiBncm91cGluZ1xuICAgICAgICAgICAgaWYgKHByb3ZpZGVyICYmIHByb3ZpZGVyICE9PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICBsZXQgdG9vbHRpcFRleHQgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoZGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnRmX1Rvb2x0aXBTcGVjaWZpY1J1bGUgfHwgJ1RoaXMgcnVsZSBhcHBsaWVzIHRvIGNhbGxzIHRvIHNwZWNpZmljIG51bWJlci4gUmVsYXRlZCBydWxlcyB3aWxsIGJlIHN5bmNocm9uaXplZC4nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnRmX1Rvb2x0aXBHZW5lcmFsUnVsZSB8fCAnVGhpcyBydWxlIGFwcGxpZXMgdG8gYWxsIGNhbGxzIGZyb20gcHJvdmlkZXIuIFJlbGF0ZWQgcnVsZXMgd2lsbCBiZSBzeW5jaHJvbml6ZWQuJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNoZWNrYm94LmF0dHIoJ2RhdGEtY29udGVudCcsIHRvb2x0aXBUZXh0KTtcbiAgICAgICAgICAgICAgICAkY2hlY2tib3guYXR0cignZGF0YS12YXJpYXRpb24nLCAndGlueScpO1xuICAgICAgICAgICAgICAgICRjaGVja2JveC5wb3B1cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3ggY2hhbmdlIGJlaGF2aW9yXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcykucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlkID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkY2hlY2tib3guYXR0cignZGF0YS1wcm92aWRlcicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNraXAgc3luY2hyb25pemF0aW9uIGZvciAnbm9uZScgcHJvdmlkZXIgKGRpcmVjdCBjYWxscylcbiAgICAgICAgICAgICAgICBpZiAoIXByb3ZpZGVyIHx8IHByb3ZpZGVyID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZ3JvdXBlZCBsb2dpYyByZXF1aXJlbWVudHNcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYCNyb3V0aW5nLXRhYmxlIC51aS5jaGVja2JveFtkYXRhLXByb3ZpZGVyPVwiJHtwcm92aWRlcn1cIl1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpZCAmJiBkaWQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSdWxlIHdpdGggc3BlY2lmaWMgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBjaGVja2luZyBhIHJ1bGUgd2l0aCBESUQsIGNoZWNrIGFsbCBydWxlcyB3aXRoIHNhbWUgcHJvdmlkZXIgYW5kIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yV2l0aERJRCA9IGAke3NlbGVjdG9yfVtkYXRhLWRpZD1cIiR7ZGlkfVwiXWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChzZWxlY3RvcldpdGhESUQpLm5vdCgkY2hlY2tib3gpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHVuY2hlY2tpbmcgYSBydWxlIHdpdGggRElEOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIFVuY2hlY2sgYWxsIHJ1bGVzIHdpdGggc2FtZSBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvcldpdGhESUQgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JXaXRoRElEKS5ub3QoJGNoZWNrYm94KS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDIuIEFsc28gdW5jaGVjayBnZW5lcmFsIHJ1bGVzICh3aXRob3V0IERJRCkgZm9yIHNhbWUgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvckdlbmVyYWwgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCJcIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JHZW5lcmFsKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2VuZXJhbCBydWxlIHdpdGhvdXQgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gdW5jaGVja2luZyBnZW5lcmFsIHJ1bGUsIG9ubHkgdW5jaGVjayBvdGhlciBnZW5lcmFsIHJ1bGVzIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBjaGVja2luZyBnZW5lcmFsIHJ1bGUsIGNoZWNrIGFsbCBnZW5lcmFsIHJ1bGVzIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZVxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGVyYXNlIGJ1dHRvbnMgZm9yIGRhdGUvdGltZSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXJhc2VycygpIHtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJhc2VEYXRlc0J0bi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZVdlZWtkYXlzQnRuLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlGcm9tRHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZVRpbWVwZXJpb2RCdG4ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZXNjcmlwdGlvbiBmaWVsZCB3aXRoIGF1dG8tcmVzaXplXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlc2NyaXB0aW9uRmllbGQoKSB7XG4gICAgICAgIC8vIEF1dG8tcmVzaXplIG9uIGlucHV0XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgICAgICAgIHRoaXMuc3R5bGUuaGVpZ2h0ID0gKHRoaXMuc2Nyb2xsSGVpZ2h0KSArICdweCc7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCByZXNpemVcbiAgICAgICAgaWYgKG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGVscGVyIHRvIHNldCBkYXRlIGZyb20gdGltZXN0YW1wIG9yIGRhdGUgc3RyaW5nXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSBkYXRlVmFsdWUgLSBVbml4IHRpbWVzdGFtcCBvciBkYXRlIHN0cmluZyAoWVlZWS1NTS1ERClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3JcbiAgICAgKi9cbiAgICBzZXREYXRlRnJvbVRpbWVzdGFtcChkYXRlVmFsdWUsIHNlbGVjdG9yKSB7XG4gICAgICAgIGlmICghZGF0ZVZhbHVlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGEgZGF0ZSBzdHJpbmcgaW4gWVlZWS1NTS1ERCBmb3JtYXQgZmlyc3RcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlVmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgZGF0ZSBmb3JtYXQgWVlZWS1NTS1ERFxuICAgICAgICAgICAgaWYgKC9eXFxkezR9LVxcZHsyfS1cXGR7Mn0kLy50ZXN0KGRhdGVWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzTmFOKGRhdGUuZ2V0VGltZSgpKSkge1xuICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJ5IHRvIHBhcnNlIGFzIFVuaXggdGltZXN0YW1wIChhbGwgZGlnaXRzKVxuICAgICAgICAgICAgaWYgKC9eXFxkKyQvLnRlc3QoZGF0ZVZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IHBhcnNlSW50KGRhdGVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRpbWVzdGFtcCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBVbml4IHRpbWVzdGFtcCB0byBEYXRlXG4gICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3IpLmNhbGVuZGFyKCdzZXQgZGF0ZScsIG5ldyBEYXRlKHRpbWVzdGFtcCAqIDEwMDApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZGF0ZVZhbHVlID09PSAnbnVtYmVyJyAmJiBkYXRlVmFsdWUgPiAwKSB7XG4gICAgICAgICAgICAvLyBOdW1lcmljIFVuaXggdGltZXN0YW1wXG4gICAgICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBuZXcgRGF0ZShkYXRlVmFsdWUgKiAxMDAwKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gZm9yIHBhaXJlZCBmaWVsZHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gRm9ybSBkYXRhXG4gICAgICogQHJldHVybnMge29iamVjdHxib29sZWFufSBSZXN1bHQgb2JqZWN0IG9yIGZhbHNlIGlmIHZhbGlkYXRpb24gZmFpbHNcbiAgICAgKi9cbiAgICBjdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KSB7XG4gICAgICAgIC8vIENoZWNrIGRhdGUgZmllbGRzIC0gYm90aCBzaG91bGQgYmUgZmlsbGVkIG9yIGJvdGggZW1wdHlcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS5kYXRlX2Zyb20gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gPT09ICcnKSB8fFxuICAgICAgICAgICAgKHJlc3VsdC5kYXRhLmRhdGVfdG8gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9PT0gJycpKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdlZWtkYXkgZmllbGRzIC0gYm90aCBzaG91bGQgYmUgZmlsbGVkIG9yIGJvdGggZW1wdHlcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMScpIHx8XG4gICAgICAgICAgICAocmVzdWx0LmRhdGEud2Vla2RheV90byA+IDAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID09PSAnLTEnKSkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB0aW1lIGZpZWxkcyAtIGJvdGggc2hvdWxkIGJlIGZpbGxlZCBvciBib3RoIGVtcHR5XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApIHx8XG4gICAgICAgICAgICAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHRpbWVmcmFtZSB0eXBlLCBjaGVjayB0aGF0IGF0IGxlYXN0IG9uZSBjb25kaXRpb24gaXMgc3BlY2lmaWVkXG4gICAgICAgIGNvbnN0IGNhbFR5cGUgPSByZXN1bHQuZGF0YS5jYWxUeXBlIHx8ICd0aW1lZnJhbWUnO1xuICAgICAgICBpZiAoY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScgfHwgY2FsVHlwZSA9PT0gJycpIHtcbiAgICAgICAgICAgIGNvbnN0IGhhc0RhdGVSYW5nZSA9IHJlc3VsdC5kYXRhLmRhdGVfZnJvbSAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV90byAhPT0gJyc7XG4gICAgICAgICAgICBjb25zdCBoYXNXZWVrZGF5UmFuZ2UgPSByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPiAwO1xuICAgICAgICAgICAgY29uc3QgaGFzVGltZVJhbmdlID0gcmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWhhc0RhdGVSYW5nZSAmJiAhaGFzV2Vla2RheVJhbmdlICYmICFoYXNUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQpLnNob3coKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgc2VuZGluZyBmb3JtXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R8Ym9vbGVhbn0gVXBkYXRlZCBzZXR0aW5ncyBvciBmYWxzZVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyBmcm9tICdvbicvdW5kZWZpbmVkIHRvIHRydWUvZmFsc2VcbiAgICAgICAgLy8gUHJvY2VzcyBhbGwgcm91dGUgY2hlY2tib3hlc1xuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdyb3V0ZS0nKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2tleV0gPSByZXN1bHQuZGF0YVtrZXldID09PSAnb24nIHx8IHJlc3VsdC5kYXRhW2tleV0gPT09IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgIGlmICgnYWxsb3dSZXN0cmljdGlvbicgaW4gcmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFsbG93UmVzdHJpY3Rpb24gPSByZXN1bHQuZGF0YS5hbGxvd1Jlc3RyaWN0aW9uID09PSAnb24nIHx8IHJlc3VsdC5kYXRhLmFsbG93UmVzdHJpY3Rpb24gPT09IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjYWxUeXBlIGNvbnZlcnNpb24gKG1hdGNoZXMgb2xkIGNvbnRyb2xsZXI6ICgkZGF0YVskbmFtZV0gPT09ICd0aW1lZnJhbWUnKSA/ICcnIDogJGRhdGFbJG5hbWVdKVxuICAgICAgICAvLyBGb3Igc2F2aW5nIHdlIGNvbnZlcnQgJ3RpbWVmcmFtZScgdG8gZW1wdHkgc3RyaW5nXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5jYWxUeXBlID09PSAndGltZWZyYW1lJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuY2FsVHlwZSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgd2Vla2RheSB2YWx1ZXMgKG1hdGNoZXMgb2xkIGNvbnRyb2xsZXI6ICgkZGF0YVskbmFtZV0gPCAxKSA/IG51bGwgOiAkZGF0YVskbmFtZV0pXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPT09ICctMScgfHwgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tIDwgMSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMScgfHwgcmVzdWx0LmRhdGEud2Vla2RheV90byA8IDEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPSAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIGZpZWxkIC0gaWYgdXNlciBkaWRuJ3QgY2hhbmdlIHRoZSBtYXNrZWQgcGFzc3dvcmQsIGtlZXAgaXQgYXMgaXNcbiAgICAgICAgLy8gVGhlIGJhY2tlbmQgd2lsbCByZWNvZ25pemUgJ1hYWFhYWCcgYW5kIHdvbid0IHVwZGF0ZSB0aGUgcGFzc3dvcmRcbiAgICAgICAgLy8gSWYgdXNlciBjbGVhcmVkIHRoZSBmaWVsZCBvciBlbnRlcmVkIG5ldyB2YWx1ZSwgc2VuZCB0aGF0XG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5jYWxTZWNyZXQgPT09ICdYWFhYWFgnKSB7XG4gICAgICAgICAgICAvLyBVc2VyIGRpZG4ndCBjaGFuZ2UgdGhlIG1hc2tlZCBwYXNzd29yZCwgYmFja2VuZCB3aWxsIGtlZXAgZXhpc3RpbmcgdmFsdWVcbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQuZGF0YS5jYWxTZWNyZXQgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBVc2VyIGNsZWFyZWQgdGhlIHBhc3N3b3JkIGZpZWxkLCBiYWNrZW5kIHdpbGwgY2xlYXIgdGhlIHBhc3N3b3JkXG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlIHNlbmQgdGhlIG5ldyBwYXNzd29yZCB2YWx1ZSBhcyBlbnRlcmVkXG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGltZSB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIGNhbGVuZGFyIHR5cGVcbiAgICAgICAgY29uc3QgY2FsVHlwZSA9IHJlc3VsdC5kYXRhLmNhbFR5cGUgfHwgJ3RpbWVmcmFtZSc7XG4gICAgICAgIGlmIChjYWxUeXBlID09PSAnJyB8fCBjYWxUeXBlID09PSAndGltZWZyYW1lJykge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLnRpbWVmcm9tLnJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC5hZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXM7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZXRvLnJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC5hZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZWZyb20ucnVsZXMgPSBbXTtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy50aW1ldG8ucnVsZXMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBkYXRlcyB0byB0aW1lc3RhbXBzXG4gICAgICAgIGNvbnN0IGRhdGVGcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIGlmIChkYXRlRnJvbSkge1xuICAgICAgICAgICAgZGF0ZUZyb20uc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5kYXRlX2Zyb20gPSBNYXRoLmZsb29yKGRhdGVGcm9tLmdldFRpbWUoKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRhdGVUbyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignZ2V0IGRhdGUnKTtcbiAgICAgICAgaWYgKGRhdGVUbykge1xuICAgICAgICAgICAgZGF0ZVRvLnNldEhvdXJzKDIzLCA1OSwgNTksIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV90byA9IE1hdGguZmxvb3IoZGF0ZVRvLmdldFRpbWUoKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxlY3Qgc2VsZWN0ZWQgaW5jb21pbmcgcm91dGVzXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkUm91dGVzID0gW107XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgcm91dGVJZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKHJvdXRlSWQpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZFJvdXRlcy5wdXNoKHJvdXRlSWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmVzdWx0LmRhdGEuaW5jb21pbmdSb3V0ZUlkcyA9IHNlbGVjdGVkUm91dGVzO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgYWN0aW9uLWRlcGVuZGVudCBmaWVsZHMgYmFzZWQgb24gc2VsZWN0aW9uXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5hY3Rpb24gPT09ICdleHRlbnNpb24nKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdWRpb19tZXNzYWdlX2lkID0gJyc7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzdWx0LmRhdGEuYWN0aW9uID09PSAncGxheW1lc3NhZ2UnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5leHRlbnNpb24gPSAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUnVuIGN1c3RvbSB2YWxpZGF0aW9uIGZvciBwYWlyZWQgZmllbGRzXG4gICAgICAgIHJldHVybiBvdXRPZldvcmtUaW1lUmVjb3JkLmN1c3RvbVZhbGlkYXRlRm9ybShyZXN1bHQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGlmIHRoaXMgd2FzIGEgbmV3IHJlY29yZFxuICAgICAgICAgICAgaWYgKCFvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1vdXQtb2ZmLXdvcmstdGltZS9tb2RpZnkvJHtyZXNwb25zZS5kYXRhLmlkfWA7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQgPSByZXNwb25zZS5kYXRhLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWxvYWQgZGF0YSB0byBlbnN1cmUgY29uc2lzdGVuY3lcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZEZvcm1EYXRhKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9b3V0LW9mZi13b3JrLXRpbWUvc2F2ZWA7XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBPdXRXb3JrVGltZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHMgdXNpbmcgVG9vbHRpcEJ1aWxkZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGQgdG9vbHRpcFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIGNhbFVybDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgeyB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfaGVhZGVyLCBkZWZpbml0aW9uOiBudWxsIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl9nb29nbGUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl9uZXh0Y2xvdWQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl95YW5kZXhcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHsgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfaWNhbGVuZGFyX2hlYWRlciwgZGVmaW5pdGlvbjogbnVsbCB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9pY2FsZW5kYXJfZGVzY1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfZXhhbXBsZV9nb29nbGUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVfbmV4dGNsb3VkLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9leGFtcGxlX2ljc1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXNIZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgdGhhdCBjaGVja3MgaWYgYSB2YWx1ZSBpcyBub3QgZW1wdHkgYmFzZWQgb24gYSBzcGVjaWZpYyBhY3Rpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWRcbiAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHRvIGNvbXBhcmUgYWdhaW5zdFxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgdHJ1ZSBpZiB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZSA9IGZ1bmN0aW9uKHZhbHVlLCBhY3Rpb24pIHtcbiAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwICYmIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkZpZWxkLnZhbCgpID09PSBhY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgY2FsZW5kYXIgVVJMIGZpZWxkXG4gKiBWYWxpZGF0ZXMgVVJMIG9ubHkgd2hlbiBjYWxlbmRhciB0eXBlIGlzIG5vdCAnbm9uZScgb3IgJ3RpbWUnXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21Ob3RFbXB0eUlmQ2FsVHlwZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgY29uc3QgY2FsVHlwZSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbFR5cGVGaWVsZC52YWwoKTtcbiAgICBcbiAgICAvLyBJZiBjYWxlbmRhciB0eXBlIGlzIHRpbWVmcmFtZSBvciB0aW1lLCBVUkwgaXMgbm90IHJlcXVpcmVkXG4gICAgaWYgKCFjYWxUeXBlIHx8IGNhbFR5cGUgPT09ICd0aW1lZnJhbWUnIHx8IGNhbFR5cGUgPT09ICd0aW1lJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgLy8gSWYgY2FsZW5kYXIgdHlwZSBpcyBDQUxEQVYgb3IgSUNBTCwgdmFsaWRhdGUgVVJMXG4gICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICAvLyBDaGVjayBpZiBpdCdzIGEgdmFsaWQgVVJMXG4gICAgdHJ5IHtcbiAgICAgICAgbmV3IFVSTCh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==