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
   SemanticLocalization SoundFilesSelector UserMessage SecurityUtils
   IncomingRoutesAPI OutWorkTimesAPI */

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
  $forwardingSelectDropdown: $('.forwarding-select'),
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

    var recordIdToLoad = outOfWorkTimeRecord.recordId || ''; // Load record data via REST API

    OutWorkTimesAPI.getRecord(recordIdToLoad, function (response) {
      if (response.result && response.data) {
        outOfWorkTimeRecord.recordData = response.data;
        outOfWorkTimeRecord.populateForm(response.data); // Load routing rules for both new and existing records
        // For new records, this will show all available routes unchecked

        outOfWorkTimeRecord.loadRoutingTable(); // Save initial values to prevent save button activation

        setTimeout(function () {
          Form.saveInitialValues();
          Form.checkValues();
        }, 250);
      } else {
        // Error loading, but still initialize empty form
        outOfWorkTimeRecord.initializeDropdowns(); // Load routing table even for new records

        outOfWorkTimeRecord.loadRoutingTable();

        if (response.messages && response.messages.error) {
          var errorMessage = response.messages.error.join(', ');
          UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
      } // Remove loading state


      outOfWorkTimeRecord.$formObj.removeClass('loading');
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
    }); // Initialize extension dropdown using routing settings

    var extensionSettings = Extensions.getDropdownSettingsForRouting();

    extensionSettings.onChange = function (value) {
      outOfWorkTimeRecord.$extensionField.val(value);
      Form.dataChanged();
    };

    outOfWorkTimeRecord.$forwardingSelectDropdown.dropdown('destroy');
    outOfWorkTimeRecord.$forwardingSelectDropdown.dropdown(extensionSettings); // Initialize audio message dropdown with icons

    SoundFilesSelector.initializeWithIcons(outOfWorkTimeRecord.audioMessageId, function () {
      Form.dataChanged();
    });
  },

  /**
   * Populate form with data
   * @param {object} data - Record data from API
   */
  populateForm: function populateForm(data) {
    // Set basic form values - all defaults come from REST API
    outOfWorkTimeRecord.$formObj.form('set values', {
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
    }); // Handle password field placeholder

    var $calSecretField = $('#calSecret');

    if (data.calSecret === 'XXXXXX') {
      // Password exists but is masked, show placeholder
      $calSecretField.attr('placeholder', globalTranslate.tf_PasswordMasked || 'Password saved (enter new to change)'); // Store original masked state to detect changes

      $calSecretField.data('originalMasked', true);
    } else {
      $calSecretField.attr('placeholder', globalTranslate.tf_EnterPassword || 'Enter password');
      $calSecretField.data('originalMasked', false);
    } // Initialize dropdowns


    outOfWorkTimeRecord.initializeDropdowns(); // Set dropdown values after initialization
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
    } // Set extension value and display text if exists


    if (data.extension) {
      setTimeout(function () {
        outOfWorkTimeRecord.$forwardingSelectDropdown.dropdown('set selected', data.extension); // Update display text if available

        if (data.extensionRepresent) {
          var safeText = SecurityUtils.sanitizeExtensionsApiContent(data.extensionRepresent);
          outOfWorkTimeRecord.$forwardingSelectDropdown.find('.text').removeClass('default').html(safeText);
        }
      }, 100);
    } // Setup audio message with representation


    if (data.audio_message_id && data.audio_message_id_Represent) {
      SoundFilesSelector.setInitialValueWithIcon(outOfWorkTimeRecord.audioMessageId, data.audio_message_id, data.audio_message_id_Represent);
    } else if (data.audio_message_id) {
      $(".".concat(outOfWorkTimeRecord.audioMessageId, "-select")).dropdown('set selected', data.audio_message_id);
    } // Update field visibility based on action


    outOfWorkTimeRecord.onActionChange(); // Update calendar type visibility

    outOfWorkTimeRecord.onCalTypeChange(); // Set rules tab visibility based on allowRestriction

    outOfWorkTimeRecord.toggleRulesTab(data.allowRestriction); // Re-initialize dirty checking

    if (Form.enableDirrity) {
      Form.initializeDirrity();
    }
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

      $(".".concat(outOfWorkTimeRecord.audioMessageId, "-select")).dropdown('clear');
      $("#".concat(outOfWorkTimeRecord.audioMessageId)).val('');
    } else if (action === 'playmessage') {
      // Show audio, hide extension
      outOfWorkTimeRecord.$extensionRow.hide();
      outOfWorkTimeRecord.$audioMessageRow.show(); // Clear extension

      outOfWorkTimeRecord.$forwardingSelectDropdown.dropdown('clear');
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
        var providerName = route.providerRepresent || globalTranslate.ir_NoAssignedProvider || 'Direct calls'; // Remove HTML tags to get clean provider name for display

        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = providerName;
        var cleanProviderName = tempDiv.textContent || tempDiv.innerText || providerName;
        groups[providerId] = {
          providerId: providerId,
          // Store actual provider ID
          providerName: cleanProviderName,
          // Clean name for display
          providerNameHtml: route.providerRepresent || providerName,
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
    var ruleDescription = route.ruleRepresent || ''; // Ensure provider ID is clean (no HTML)

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJvdXRPZldvcmtUaW1lUmVjb3JkIiwiJGZvcm1PYmoiLCIkIiwicmVjb3JkSWQiLCJyZWNvcmREYXRhIiwiJHRpbWVfZnJvbSIsIiR0aW1lX3RvIiwiJHJ1bGVzVGFibGUiLCIkaWRGaWVsZCIsIiR3ZWVrZGF5RnJvbUZpZWxkIiwiJHdlZWtkYXlUb0ZpZWxkIiwiJGFjdGlvbkZpZWxkIiwiJGNhbFR5cGVGaWVsZCIsIiRleHRlbnNpb25GaWVsZCIsIiRhbGxvd1Jlc3RyaWN0aW9uRmllbGQiLCIkZGVzY3JpcHRpb25GaWVsZCIsIiRhY3Rpb25Ecm9wZG93biIsIiRjYWxUeXBlRHJvcGRvd24iLCIkd2Vla2RheUZyb21Ecm9wZG93biIsIiR3ZWVrZGF5VG9Ecm9wZG93biIsIiRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd24iLCIkdGFiTWVudSIsIiRydWxlc1RhYiIsIiRnZW5lcmFsVGFiIiwiJHJ1bGVzVGFiU2VnbWVudCIsIiRnZW5lcmFsVGFiU2VnbWVudCIsIiRleHRlbnNpb25Sb3ciLCIkYXVkaW9NZXNzYWdlUm93IiwiJGNhbGVuZGFyVGFiIiwiJG1haW5UYWIiLCIkcmFuZ2VEYXlzU3RhcnQiLCIkcmFuZ2VEYXlzRW5kIiwiJHJhbmdlVGltZVN0YXJ0IiwiJHJhbmdlVGltZUVuZCIsIiRlcmFzZURhdGVzQnRuIiwiJGVyYXNlV2Vla2RheXNCdG4iLCIkZXJhc2VUaW1lcGVyaW9kQnRuIiwiJGVycm9yTWVzc2FnZSIsImF1ZGlvTWVzc2FnZUlkIiwiYWRkaXRpb25hbFRpbWVJbnRlcnZhbFJ1bGVzIiwidHlwZSIsInZhbHVlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCIsInZhbGlkYXRlUnVsZXMiLCJleHRlbnNpb24iLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0Zl9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5IiwiYXVkaW9fbWVzc2FnZV9pZCIsInRmX1ZhbGlkYXRlQXVkaW9NZXNzYWdlRW1wdHkiLCJjYWxVcmwiLCJ0Zl9WYWxpZGF0ZUNhbFVyaSIsInRpbWVmcm9tIiwib3B0aW9uYWwiLCJ0aW1ldG8iLCJpbml0aWFsaXplIiwidmFsIiwidGFiIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplQ2FsZW5kYXJzIiwiaW5pdGlhbGl6ZVJvdXRpbmdUYWJsZSIsImluaXRpYWxpemVFcmFzZXJzIiwiaW5pdGlhbGl6ZURlc2NyaXB0aW9uRmllbGQiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJhZGRDbGFzcyIsInJlY29yZElkVG9Mb2FkIiwiT3V0V29ya1RpbWVzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwicG9wdWxhdGVGb3JtIiwibG9hZFJvdXRpbmdUYWJsZSIsInNldFRpbWVvdXQiLCJGb3JtIiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJjaGVja1ZhbHVlcyIsImluaXRpYWxpemVEcm9wZG93bnMiLCJtZXNzYWdlcyIsImVycm9yIiwiZXJyb3JNZXNzYWdlIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJyZW1vdmVDbGFzcyIsIndlZWtEYXlzIiwidGV4dCIsImkiLCJkYXRlIiwiRGF0ZSIsImRheU5hbWUiLCJ0b0xvY2FsZURhdGVTdHJpbmciLCJ3ZWVrZGF5IiwidHJhbnNsYXRlZERheSIsInB1c2giLCJuYW1lIiwidG9TdHJpbmciLCJkcm9wZG93biIsInZhbHVlcyIsIm9uQ2hhbmdlIiwiZGF0YUNoYW5nZWQiLCJvbkFjdGlvbkNoYW5nZSIsIm9uQ2FsVHlwZUNoYW5nZSIsImV4dGVuc2lvblNldHRpbmdzIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nIiwiU291bmRGaWxlc1NlbGVjdG9yIiwiaW5pdGlhbGl6ZVdpdGhJY29ucyIsImZvcm0iLCJpZCIsInVuaXFpZCIsInByaW9yaXR5IiwiZGVzY3JpcHRpb24iLCJjYWxUeXBlIiwid2Vla2RheV9mcm9tIiwid2Vla2RheV90byIsInRpbWVfZnJvbSIsInRpbWVfdG8iLCJjYWxVc2VyIiwiY2FsU2VjcmV0IiwiYWN0aW9uIiwiYWxsb3dSZXN0cmljdGlvbiIsIiRjYWxTZWNyZXRGaWVsZCIsImF0dHIiLCJ0Zl9QYXNzd29yZE1hc2tlZCIsInRmX0VudGVyUGFzc3dvcmQiLCJkYXRlX2Zyb20iLCJzZXREYXRlRnJvbVRpbWVzdGFtcCIsImRhdGVfdG8iLCJleHRlbnNpb25SZXByZXNlbnQiLCJzYWZlVGV4dCIsInNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQiLCJmaW5kIiwiaHRtbCIsImF1ZGlvX21lc3NhZ2VfaWRfUmVwcmVzZW50Iiwic2V0SW5pdGlhbFZhbHVlV2l0aEljb24iLCJ0b2dnbGVSdWxlc1RhYiIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsInNob3ciLCJoaWRlIiwiY2FsZW5kYXIiLCJmaXJzdERheU9mV2VlayIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiY2FsZW5kYXJGaXJzdERheU9mV2VlayIsImNhbGVuZGFyVGV4dCIsImVuZENhbGVuZGFyIiwiaW5saW5lIiwibW9udGhGaXJzdCIsInJlZ0V4cCIsInN0YXJ0Q2FsZW5kYXIiLCJkaXNhYmxlTWludXRlIiwiYW1wbSIsInBhcmVudCIsImNoZWNrYm94IiwiaXNDaGVja2VkIiwiaGFzQ2xhc3MiLCJlbXB0eSIsImFzc29jaWF0ZWRJZHMiLCJpbmNvbWluZ1JvdXRlSWRzIiwiSW5jb21pbmdSb3V0ZXNBUEkiLCJnZXRMaXN0IiwiZ3JvdXBlZFJvdXRlcyIsImdyb3VwQW5kU29ydFJvdXRlcyIsInJlbmRlckdyb3VwZWRSb3V0ZXMiLCJpbml0aWFsaXplUm91dGluZ0NoZWNrYm94ZXMiLCJwb3B1cCIsInNob3dFbXB0eVJvdXRlc01lc3NhZ2UiLCJyb3V0ZXMiLCJncm91cHMiLCJmb3JFYWNoIiwicm91dGUiLCJwcm92aWRlcklkIiwicHJvdmlkZXIiLCJwcm92aWRlck5hbWUiLCJwcm92aWRlclJlcHJlc2VudCIsImlyX05vQXNzaWduZWRQcm92aWRlciIsInRlbXBEaXYiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJpbm5lckhUTUwiLCJjbGVhblByb3ZpZGVyTmFtZSIsInRleHRDb250ZW50IiwiaW5uZXJUZXh0IiwicHJvdmlkZXJOYW1lSHRtbCIsInByb3ZpZGVyRGlzYWJsZWQiLCJnZW5lcmFsUnVsZXMiLCJzcGVjaWZpY1J1bGVzIiwibnVtYmVyIiwiT2JqZWN0Iiwia2V5cyIsInNvcnQiLCJhIiwiYiIsImRpZCIsInRib2R5IiwiaXNGaXJzdEdyb3VwIiwiZ3JvdXAiLCJhcHBlbmQiLCJyb3ciLCJjcmVhdGVSb3V0ZVJvdyIsImluZGV4IiwiaXNGaXJzdEluRElEIiwicnVsZUNsYXNzIiwic2hvd0RJREluZGljYXRvciIsImluY2x1ZGVzIiwicGFyc2VJbnQiLCJydWxlRGVzY3JpcHRpb24iLCJydWxlUmVwcmVzZW50Iiwibm90ZURpc3BsYXkiLCJub3RlIiwibGVuZ3RoIiwic2FmZVByb3ZpZGVySWQiLCJzYWZlRGlkIiwiZW1wdHlSb3ciLCJpcl9Ob0luY29taW5nUm91dGVzIiwiaG92ZXIiLCIkcm93Iiwic2VsZWN0b3IiLCIkcmVsYXRlZFJvd3MiLCJlYWNoIiwiJGNoZWNrYm94IiwidG9vbHRpcFRleHQiLCJ0Zl9Ub29sdGlwU3BlY2lmaWNSdWxlIiwidGZfVG9vbHRpcEdlbmVyYWxSdWxlIiwic2VsZWN0b3JXaXRoRElEIiwibm90Iiwic2VsZWN0b3JHZW5lcmFsIiwib24iLCJzdHlsZSIsImhlaWdodCIsInNjcm9sbEhlaWdodCIsInRyaWdnZXIiLCJkYXRlVmFsdWUiLCJ0ZXN0IiwiaXNOYU4iLCJnZXRUaW1lIiwidGltZXN0YW1wIiwiY3VzdG9tVmFsaWRhdGVGb3JtIiwidGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCIsIiRzdWJtaXRCdXR0b24iLCJ0cmFuc2l0aW9uIiwidGZfVmFsaWRhdGVDaGVja1dlZWtEYXlJbnRlcnZhbCIsImhhc0RhdGVSYW5nZSIsImhhc1dlZWtkYXlSYW5nZSIsImhhc1RpbWVSYW5nZSIsInRmX1ZhbGlkYXRlTm9SdWxlc1NlbGVjdGVkIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwia2V5Iiwic3RhcnRzV2l0aCIsImRhdGVGcm9tIiwic2V0SG91cnMiLCJNYXRoIiwiZmxvb3IiLCJkYXRlVG8iLCJzZWxlY3RlZFJvdXRlcyIsInJvdXRlSWQiLCJjYkFmdGVyU2VuZEZvcm0iLCJuZXdVcmwiLCJnbG9iYWxSb290VXJsIiwid2luZG93IiwiaGlzdG9yeSIsInJlcGxhY2VTdGF0ZSIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJ0b29sdGlwQ29uZmlncyIsImhlYWRlciIsInRmX0NhbFVybFRvb2x0aXBfaGVhZGVyIiwidGZfQ2FsVXJsVG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJ0Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl9oZWFkZXIiLCJkZWZpbml0aW9uIiwidGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfZ29vZ2xlIiwidGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfbmV4dGNsb3VkIiwidGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfeWFuZGV4IiwibGlzdDIiLCJ0Zl9DYWxVcmxUb29sdGlwX2ljYWxlbmRhcl9oZWFkZXIiLCJ0Zl9DYWxVcmxUb29sdGlwX2ljYWxlbmRhcl9kZXNjIiwiZXhhbXBsZXMiLCJ0Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVfZ29vZ2xlIiwidGZfQ2FsVXJsVG9vbHRpcF9leGFtcGxlX25leHRjbG91ZCIsInRmX0NhbFVybFRvb2x0aXBfZXhhbXBsZV9pY3MiLCJleGFtcGxlc0hlYWRlciIsInRmX0NhbFVybFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwidGZfQ2FsVXJsVG9vbHRpcF9ub3RlIiwiVG9vbHRpcEJ1aWxkZXIiLCJmbiIsImN1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlIiwiY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUiLCJVUkwiLCJfIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG1CQUFtQixHQUFHO0FBQ3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHVCQUFELENBTGE7O0FBT3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQVhjO0FBV1I7O0FBRWhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxJQWpCWTtBQW1CeEI7QUFDQUMsRUFBQUEsVUFBVSxFQUFFSCxDQUFDLENBQUMsWUFBRCxDQXBCVztBQXFCeEJJLEVBQUFBLFFBQVEsRUFBRUosQ0FBQyxDQUFDLFVBQUQsQ0FyQmE7QUFzQnhCSyxFQUFBQSxXQUFXLEVBQUVMLENBQUMsQ0FBQyxnQkFBRCxDQXRCVTtBQXdCeEI7QUFDQU0sRUFBQUEsUUFBUSxFQUFFTixDQUFDLENBQUMsS0FBRCxDQXpCYTtBQTBCeEJPLEVBQUFBLGlCQUFpQixFQUFFUCxDQUFDLENBQUMsZUFBRCxDQTFCSTtBQTJCeEJRLEVBQUFBLGVBQWUsRUFBRVIsQ0FBQyxDQUFDLGFBQUQsQ0EzQk07QUE0QnhCUyxFQUFBQSxZQUFZLEVBQUVULENBQUMsQ0FBQyxTQUFELENBNUJTO0FBNkJ4QlUsRUFBQUEsYUFBYSxFQUFFVixDQUFDLENBQUMsVUFBRCxDQTdCUTtBQThCeEJXLEVBQUFBLGVBQWUsRUFBRVgsQ0FBQyxDQUFDLFlBQUQsQ0E5Qk07QUErQnhCWSxFQUFBQSxzQkFBc0IsRUFBRVosQ0FBQyxDQUFD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cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQgZ2xvYmFsUm9vdFVybCBFeHRlbnNpb25zIG1vbWVudCBGb3JtIGdsb2JhbFRyYW5zbGF0ZSBcbiAgIFNlbWFudGljTG9jYWxpemF0aW9uIFNvdW5kRmlsZXNTZWxlY3RvciBVc2VyTWVzc2FnZSBTZWN1cml0eVV0aWxzXG4gICBJbmNvbWluZ1JvdXRlc0FQSSBPdXRXb3JrVGltZXNBUEkgKi9cblxuLyoqXG4gKiBNb2R1bGUgZm9yIG1hbmFnaW5nIG91dC1vZi13b3JrIHRpbWUgc2V0dGluZ3NcbiAqIFxuICogVGhpcyBtb2R1bGUgaGFuZGxlcyB0aGUgZm9ybSBmb3IgY3JlYXRpbmcgYW5kIGVkaXRpbmcgb3V0LW9mLXdvcmsgdGltZSBjb25kaXRpb25zLlxuICogSXQgdXNlcyBhIHVuaWZpZWQgUkVTVCBBUEkgYXBwcm9hY2ggbWF0Y2hpbmcgdGhlIGluY29taW5nIHJvdXRlcyBwYXR0ZXJuLlxuICogXG4gKiBAbW9kdWxlIG91dE9mV29ya1RpbWVSZWNvcmRcbiAqL1xuY29uc3Qgb3V0T2ZXb3JrVGltZVJlY29yZCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIFJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcmVjb3JkSWQ6IG51bGwsIC8vIFdpbGwgYmUgc2V0IGluIGluaXRpYWxpemUoKVxuICAgIFxuICAgIC8qKlxuICAgICAqIFN0b3JlIGxvYWRlZCByZWNvcmQgZGF0YVxuICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgKi9cbiAgICByZWNvcmREYXRhOiBudWxsLFxuXG4gICAgLy8gRm9ybSBmaWVsZCBqUXVlcnkgb2JqZWN0c1xuICAgICR0aW1lX2Zyb206ICQoJyN0aW1lX2Zyb20nKSxcbiAgICAkdGltZV90bzogJCgnI3RpbWVfdG8nKSxcbiAgICAkcnVsZXNUYWJsZTogJCgnI3JvdXRpbmctdGFibGUnKSxcbiAgICBcbiAgICAvLyBIaWRkZW4gaW5wdXQgZmllbGRzXG4gICAgJGlkRmllbGQ6ICQoJyNpZCcpLFxuICAgICR3ZWVrZGF5RnJvbUZpZWxkOiAkKCcjd2Vla2RheV9mcm9tJyksXG4gICAgJHdlZWtkYXlUb0ZpZWxkOiAkKCcjd2Vla2RheV90bycpLFxuICAgICRhY3Rpb25GaWVsZDogJCgnI2FjdGlvbicpLFxuICAgICRjYWxUeXBlRmllbGQ6ICQoJyNjYWxUeXBlJyksXG4gICAgJGV4dGVuc2lvbkZpZWxkOiAkKCcjZXh0ZW5zaW9uJyksXG4gICAgJGFsbG93UmVzdHJpY3Rpb25GaWVsZDogJCgnI2FsbG93UmVzdHJpY3Rpb24nKSxcbiAgICAkZGVzY3JpcHRpb25GaWVsZDogJCgnI2Rlc2NyaXB0aW9uJyksXG4gICAgXG4gICAgLy8gRHJvcGRvd24gZWxlbWVudHNcbiAgICAkYWN0aW9uRHJvcGRvd246ICQoJy5hY3Rpb24tc2VsZWN0JyksXG4gICAgJGNhbFR5cGVEcm9wZG93bjogJCgnLmNhbFR5cGUtc2VsZWN0JyksXG4gICAgJHdlZWtkYXlGcm9tRHJvcGRvd246ICQoJy53ZWVrZGF5LWZyb20tc2VsZWN0JyksXG4gICAgJHdlZWtkYXlUb0Ryb3Bkb3duOiAkKCcud2Vla2RheS10by1zZWxlY3QnKSxcbiAgICAkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duOiAkKCcuZm9yd2FyZGluZy1zZWxlY3QnKSxcbiAgICBcbiAgICAvLyBUYWIgZWxlbWVudHNcbiAgICAkdGFiTWVudTogJCgnI291dC10aW1lLW1vZGlmeS1tZW51IC5pdGVtJyksXG4gICAgJHJ1bGVzVGFiOiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgJGdlbmVyYWxUYWI6IG51bGwsIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgbGF0ZXJcbiAgICAkcnVsZXNUYWJTZWdtZW50OiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgJGdlbmVyYWxUYWJTZWdtZW50OiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgXG4gICAgLy8gUm93IGVsZW1lbnRzXG4gICAgJGV4dGVuc2lvblJvdzogJCgnI2V4dGVuc2lvbi1yb3cnKSxcbiAgICAkYXVkaW9NZXNzYWdlUm93OiAkKCcjYXVkaW8tbWVzc2FnZS1yb3cnKSxcbiAgICBcbiAgICAvLyBDYWxlbmRhciB0YWIgZWxlbWVudHNcbiAgICAkY2FsZW5kYXJUYWI6ICQoJyNjYWxsLXR5cGUtY2FsZW5kYXItdGFiJyksXG4gICAgJG1haW5UYWI6ICQoJyNjYWxsLXR5cGUtbWFpbi10YWInKSxcbiAgICBcbiAgICAvLyBEYXRlL3RpbWUgY2FsZW5kYXIgZWxlbWVudHNcbiAgICAkcmFuZ2VEYXlzU3RhcnQ6ICQoJyNyYW5nZS1kYXlzLXN0YXJ0JyksXG4gICAgJHJhbmdlRGF5c0VuZDogJCgnI3JhbmdlLWRheXMtZW5kJyksXG4gICAgJHJhbmdlVGltZVN0YXJ0OiAkKCcjcmFuZ2UtdGltZS1zdGFydCcpLFxuICAgICRyYW5nZVRpbWVFbmQ6ICQoJyNyYW5nZS10aW1lLWVuZCcpLFxuICAgIFxuICAgIC8vIEVyYXNlIGJ1dHRvbnNcbiAgICAkZXJhc2VEYXRlc0J0bjogJCgnI2VyYXNlLWRhdGVzJyksXG4gICAgJGVyYXNlV2Vla2RheXNCdG46ICQoJyNlcmFzZS13ZWVrZGF5cycpLFxuICAgICRlcmFzZVRpbWVwZXJpb2RCdG46ICQoJyNlcmFzZS10aW1lcGVyaW9kJyksXG4gICAgXG4gICAgLy8gRXJyb3IgbWVzc2FnZSBlbGVtZW50XG4gICAgJGVycm9yTWVzc2FnZTogJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKSxcbiAgICBcbiAgICAvLyBBdWRpbyBtZXNzYWdlIElEIGZvciBzb3VuZCBmaWxlIHNlbGVjdG9yXG4gICAgYXVkaW9NZXNzYWdlSWQ6ICdhdWRpb19tZXNzYWdlX2lkJyxcblxuICAgIC8qKlxuICAgICAqIEFkZGl0aW9uYWwgdGltZSBpbnRlcnZhbCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICogQHR5cGUge2FycmF5fVxuICAgICAqL1xuICAgIGFkZGl0aW9uYWxUaW1lSW50ZXJ2YWxSdWxlczogW3tcbiAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgIHZhbHVlOiAvXihbMDFdP1swLTldfDJbMC0zXSk6KFswLTVdP1swLTldKSQvLFxuICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgIH1dLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlW2V4dGVuc2lvbl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBhdWRpb19tZXNzYWdlX2lkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnYXVkaW9fbWVzc2FnZV9pZCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlW3BsYXltZXNzYWdlXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQXVkaW9NZXNzYWdlRW1wdHlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIGNhbFVybDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NhbFVybCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZDYWxUeXBlJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDYWxVcmlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVmcm9tOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX2Zyb20nLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKFswMV0/WzAtOV18MlswLTNdKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWV0bzoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVfdG8nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogL14oWzAxXT9bMC05XXwyWzAtM10pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTZXQgcmVjb3JkIElEIGZyb20gRE9NXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRpZEZpZWxkLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgcmVmZXJlbmNlcyB0aGF0IGRlcGVuZCBvbiBET01cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIgPSAkKCcjb3V0LXRpbWUtbW9kaWZ5LW1lbnUgLml0ZW1bZGF0YS10YWI9XCJydWxlc1wiXScpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRnZW5lcmFsVGFiID0gJCgnI291dC10aW1lLW1vZGlmeS1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZ2VuZXJhbFwiXScpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYlNlZ21lbnQgPSAkKCcudWkudGFiLnNlZ21lbnRbZGF0YS10YWI9XCJydWxlc1wiXScpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRnZW5lcmFsVGFiU2VnbWVudCA9ICQoJy51aS50YWIuc2VnbWVudFtkYXRhLXRhYj1cImdlbmVyYWxcIl0nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR0YWJNZW51LnRhYigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHN1Ym1pc3Npb24gaGFuZGxpbmdcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjb21wb25lbnRzIHRoYXQgZG9uJ3QgZGVwZW5kIG9uIGRhdGFcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplQ2FsZW5kYXJzKCk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZVJvdXRpbmdUYWJsZSgpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVFcmFzZXJzKCk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZURlc2NyaXB0aW9uRmllbGQoKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZGF0YSBhbmQgaW5pdGlhbGl6ZSBkcm9wZG93bnNcbiAgICAgICAgLy8gVGhpcyB1bmlmaWVkIGFwcHJvYWNoIGxvYWRzIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyBvciBleGlzdGluZyBkYXRhXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZEZvcm1EYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKiBVbmlmaWVkIGFwcHJvYWNoIGZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAqL1xuICAgIGxvYWRGb3JtRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSByZWNvcmRJZCBmb3IgZXhpc3RpbmcgcmVjb3JkcywgZW1wdHkgc3RyaW5nIGZvciBuZXdcbiAgICAgICAgY29uc3QgcmVjb3JkSWRUb0xvYWQgPSBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZElkIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCByZWNvcmQgZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgT3V0V29ya1RpbWVzQVBJLmdldFJlY29yZChyZWNvcmRJZFRvTG9hZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZERhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIExvYWQgcm91dGluZyBydWxlcyBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHNcbiAgICAgICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIHRoaXMgd2lsbCBzaG93IGFsbCBhdmFpbGFibGUgcm91dGVzIHVuY2hlY2tlZFxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZFJvdXRpbmdUYWJsZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNhdmUgaW5pdGlhbCB2YWx1ZXMgdG8gcHJldmVudCBzYXZlIGJ1dHRvbiBhY3RpdmF0aW9uXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgIH0sIDI1MCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEVycm9yIGxvYWRpbmcsIGJ1dCBzdGlsbCBpbml0aWFsaXplIGVtcHR5IGZvcm1cbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVEcm9wZG93bnMoKTtcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHJvdXRpbmcgdGFibGUgZXZlbiBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmxvYWRSb3V0aW5nVGFibGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKTtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgZHJvcGRvd25zIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgd2Vla2RheSBkcm9wZG93bnMgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgb3JpZ2luYWwgaW1wbGVtZW50YXRpb25cbiAgICAgICAgY29uc3Qgd2Vla0RheXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnLTEnLCB0ZXh0OiAnLScgfSAvLyBEZWZhdWx0IGVtcHR5IG9wdGlvblxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRheXMgMS03IHVzaW5nIHRoZSBzYW1lIGxvZ2ljIGFzIG9yaWdpbmFsIGNvbnRyb2xsZXJcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gNzsgaSsrKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgZGF0ZSBmb3IgXCJTdW5kYXkgK2kgZGF5c1wiIHRvIG1hdGNoIG9yaWdpbmFsIGxvZ2ljXG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoMjAyMCwgMCwgNSArIGkpOyAvLyBKYW4gNSwgMjAyMCB3YXMgU3VuZGF5XG4gICAgICAgICAgICBjb25zdCBkYXlOYW1lID0gZGF0ZS50b0xvY2FsZURhdGVTdHJpbmcoJ2VuJywgeyB3ZWVrZGF5OiAnc2hvcnQnIH0pO1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB0cmFuc2xhdGlvbiBmb3IgdGhlIGRheSBhYmJyZXZpYXRpb25cbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWREYXkgPSBnbG9iYWxUcmFuc2xhdGVbZGF5TmFtZV0gfHwgZGF5TmFtZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgd2Vla0RheXMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogdHJhbnNsYXRlZERheSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHRleHQ6IHRyYW5zbGF0ZWREYXlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIHZhbHVlczogd2Vla0RheXMsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheUZyb21GaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICB2YWx1ZXM6IHdlZWtEYXlzLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlUb0ZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkFjdGlvbkNoYW5nZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2FsZW5kYXIgdHlwZSBkcm9wZG93blxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsVHlwZUZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkNhbFR5cGVDaGFuZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBkcm9wZG93biB1c2luZyByb3V0aW5nIHNldHRpbmdzXG4gICAgICAgIGNvbnN0IGV4dGVuc2lvblNldHRpbmdzID0gRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZygpO1xuICAgICAgICBleHRlbnNpb25TZXR0aW5ncy5vbkNoYW5nZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25GaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmRyb3Bkb3duKCdkZXN0cm95Jyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bi5kcm9wZG93bihleHRlbnNpb25TZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGF1ZGlvIG1lc3NhZ2UgZHJvcGRvd24gd2l0aCBpY29uc1xuICAgICAgICBTb3VuZEZpbGVzU2VsZWN0b3IuaW5pdGlhbGl6ZVdpdGhJY29ucyhvdXRPZldvcmtUaW1lUmVjb3JkLmF1ZGlvTWVzc2FnZUlkLCAoKSA9PiB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFJlY29yZCBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gU2V0IGJhc2ljIGZvcm0gdmFsdWVzIC0gYWxsIGRlZmF1bHRzIGNvbWUgZnJvbSBSRVNUIEFQSVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgICAgIHVuaXFpZDogZGF0YS51bmlxaWQsXG4gICAgICAgICAgICBwcmlvcml0eTogZGF0YS5wcmlvcml0eSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkYXRhLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgY2FsVHlwZTogZGF0YS5jYWxUeXBlLFxuICAgICAgICAgICAgd2Vla2RheV9mcm9tOiBkYXRhLndlZWtkYXlfZnJvbSxcbiAgICAgICAgICAgIHdlZWtkYXlfdG86IGRhdGEud2Vla2RheV90byxcbiAgICAgICAgICAgIHRpbWVfZnJvbTogZGF0YS50aW1lX2Zyb20sXG4gICAgICAgICAgICB0aW1lX3RvOiBkYXRhLnRpbWVfdG8sXG4gICAgICAgICAgICBjYWxVcmw6IGRhdGEuY2FsVXJsLFxuICAgICAgICAgICAgY2FsVXNlcjogZGF0YS5jYWxVc2VyLFxuICAgICAgICAgICAgY2FsU2VjcmV0OiBkYXRhLmNhbFNlY3JldCxcbiAgICAgICAgICAgIGFjdGlvbjogZGF0YS5hY3Rpb24sXG4gICAgICAgICAgICBleHRlbnNpb246IGRhdGEuZXh0ZW5zaW9uLFxuICAgICAgICAgICAgYXVkaW9fbWVzc2FnZV9pZDogZGF0YS5hdWRpb19tZXNzYWdlX2lkLFxuICAgICAgICAgICAgYWxsb3dSZXN0cmljdGlvbjogZGF0YS5hbGxvd1Jlc3RyaWN0aW9uXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIGZpZWxkIHBsYWNlaG9sZGVyXG4gICAgICAgIGNvbnN0ICRjYWxTZWNyZXRGaWVsZCA9ICQoJyNjYWxTZWNyZXQnKTtcbiAgICAgICAgaWYgKGRhdGEuY2FsU2VjcmV0ID09PSAnWFhYWFhYJykge1xuICAgICAgICAgICAgLy8gUGFzc3dvcmQgZXhpc3RzIGJ1dCBpcyBtYXNrZWQsIHNob3cgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICRjYWxTZWNyZXRGaWVsZC5hdHRyKCdwbGFjZWhvbGRlcicsIGdsb2JhbFRyYW5zbGF0ZS50Zl9QYXNzd29yZE1hc2tlZCB8fCAnUGFzc3dvcmQgc2F2ZWQgKGVudGVyIG5ldyB0byBjaGFuZ2UpJyk7XG4gICAgICAgICAgICAvLyBTdG9yZSBvcmlnaW5hbCBtYXNrZWQgc3RhdGUgdG8gZGV0ZWN0IGNoYW5nZXNcbiAgICAgICAgICAgICRjYWxTZWNyZXRGaWVsZC5kYXRhKCdvcmlnaW5hbE1hc2tlZCcsIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLnRmX0VudGVyUGFzc3dvcmQgfHwgJ0VudGVyIHBhc3N3b3JkJyk7XG4gICAgICAgICAgICAkY2FsU2VjcmV0RmllbGQuZGF0YSgnb3JpZ2luYWxNYXNrZWQnLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZURyb3Bkb3ducygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGRyb3Bkb3duIHZhbHVlcyBhZnRlciBpbml0aWFsaXphdGlvblxuICAgICAgICAvLyBTZXQgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgIGlmIChkYXRhLmFjdGlvbikge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYWN0aW9uRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuYWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGNhbFR5cGUgZHJvcGRvd25cbiAgICAgICAgaWYgKGRhdGEuY2FsVHlwZSkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsVHlwZURyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLmNhbFR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgd2Vla2RheSBkcm9wZG93bnNcbiAgICAgICAgaWYgKGRhdGEud2Vla2RheV9mcm9tKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLndlZWtkYXlfZnJvbSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEud2Vla2RheV90bykge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheVRvRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEud2Vla2RheV90byk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBkYXRlcyBpZiBwcmVzZW50XG4gICAgICAgIGlmIChkYXRhLmRhdGVfZnJvbSkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5zZXREYXRlRnJvbVRpbWVzdGFtcChkYXRhLmRhdGVfZnJvbSwgJyNyYW5nZS1kYXlzLXN0YXJ0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuZGF0ZV90bykge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5zZXREYXRlRnJvbVRpbWVzdGFtcChkYXRhLmRhdGVfdG8sICcjcmFuZ2UtZGF5cy1lbmQnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGV4dGVuc2lvbiB2YWx1ZSBhbmQgZGlzcGxheSB0ZXh0IGlmIGV4aXN0c1xuICAgICAgICBpZiAoZGF0YS5leHRlbnNpb24pIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5leHRlbnNpb24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBkaXNwbGF5IHRleHQgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZXh0ZW5zaW9uUmVwcmVzZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KGRhdGEuZXh0ZW5zaW9uUmVwcmVzZW50KTtcbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmZpbmQoJy50ZXh0JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAuaHRtbChzYWZlVGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2V0dXAgYXVkaW8gbWVzc2FnZSB3aXRoIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIGlmIChkYXRhLmF1ZGlvX21lc3NhZ2VfaWQgJiYgZGF0YS5hdWRpb19tZXNzYWdlX2lkX1JlcHJlc2VudCkge1xuICAgICAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLnNldEluaXRpYWxWYWx1ZVdpdGhJY29uKFxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuYXVkaW9NZXNzYWdlSWQsXG4gICAgICAgICAgICAgICAgZGF0YS5hdWRpb19tZXNzYWdlX2lkLFxuICAgICAgICAgICAgICAgIGRhdGEuYXVkaW9fbWVzc2FnZV9pZF9SZXByZXNlbnRcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5hdWRpb19tZXNzYWdlX2lkKSB7XG4gICAgICAgICAgICAkKGAuJHtvdXRPZldvcmtUaW1lUmVjb3JkLmF1ZGlvTWVzc2FnZUlkfS1zZWxlY3RgKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5hdWRpb19tZXNzYWdlX2lkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGZpZWxkIHZpc2liaWxpdHkgYmFzZWQgb24gYWN0aW9uXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQub25BY3Rpb25DaGFuZ2UoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBjYWxlbmRhciB0eXBlIHZpc2liaWxpdHlcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkNhbFR5cGVDaGFuZ2UoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBydWxlcyB0YWIgdmlzaWJpbGl0eSBiYXNlZCBvbiBhbGxvd1Jlc3RyaWN0aW9uXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlUnVsZXNUYWIoZGF0YS5hbGxvd1Jlc3RyaWN0aW9uKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgYWN0aW9uIGRyb3Bkb3duIGNoYW5nZVxuICAgICAqL1xuICAgIG9uQWN0aW9uQ2hhbmdlKCkge1xuICAgICAgICBjb25zdCBhY3Rpb24gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdhY3Rpb24nKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhY3Rpb24gPT09ICdleHRlbnNpb24nKSB7XG4gICAgICAgICAgICAvLyBTaG93IGV4dGVuc2lvbiwgaGlkZSBhdWRpb1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXh0ZW5zaW9uUm93LnNob3coKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGF1ZGlvTWVzc2FnZVJvdy5oaWRlKCk7XG4gICAgICAgICAgICAvLyBDbGVhciBhdWRpbyBtZXNzYWdlXG4gICAgICAgICAgICAkKGAuJHtvdXRPZldvcmtUaW1lUmVjb3JkLmF1ZGlvTWVzc2FnZUlkfS1zZWxlY3RgKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICQoYCMke291dE9mV29ya1RpbWVSZWNvcmQuYXVkaW9NZXNzYWdlSWR9YCkudmFsKCcnKTtcbiAgICAgICAgfSBlbHNlIGlmIChhY3Rpb24gPT09ICdwbGF5bWVzc2FnZScpIHtcbiAgICAgICAgICAgIC8vIFNob3cgYXVkaW8sIGhpZGUgZXh0ZW5zaW9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25Sb3cuaGlkZSgpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYXVkaW9NZXNzYWdlUm93LnNob3coKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGV4dGVuc2lvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXh0ZW5zaW9uRmllbGQudmFsKCcnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGNhbGVuZGFyIHR5cGUgY2hhbmdlXG4gICAgICovXG4gICAgb25DYWxUeXBlQ2hhbmdlKCkge1xuICAgICAgICBjb25zdCBjYWxUeXBlID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2FsVHlwZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gJ3RpbWVmcmFtZScgYW5kIGVtcHR5IHN0cmluZyBtZWFuIHRpbWUtYmFzZWQgY29uZGl0aW9ucyAoc2hvdyBtYWluIHRhYilcbiAgICAgICAgaWYgKCFjYWxUeXBlIHx8IGNhbFR5cGUgPT09ICd0aW1lZnJhbWUnIHx8IGNhbFR5cGUgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBTaG93IG1haW4gdGltZS9kYXRlIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbGVuZGFyVGFiLmhpZGUoKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJG1haW5UYWIuc2hvdygpO1xuICAgICAgICB9IGVsc2UgaWYgKGNhbFR5cGUgPT09ICdDQUxEQVYnIHx8IGNhbFR5cGUgPT09ICdJQ0FMJykge1xuICAgICAgICAgICAgLy8gU2hvdyBjYWxlbmRhciBVUkwgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsZW5kYXJUYWIuc2hvdygpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kbWFpblRhYi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY2FsZW5kYXJzIGZvciBkYXRlIGFuZCB0aW1lIHNlbGVjdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVDYWxlbmRhcnMoKSB7XG4gICAgICAgIC8vIERhdGUgcmFuZ2UgY2FsZW5kYXJzXG4gICAgICAgIC8vIFVzZSBjbGFzcyB2YXJpYWJsZXMgZm9yIGNhbGVuZGFyc1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBlbmRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLFxuICAgICAgICAgICAgdHlwZTogJ2RhdGUnLFxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIG1vbnRoRmlyc3Q6IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgc3RhcnRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBUaW1lIHJhbmdlIGNhbGVuZGFyc1xuICAgICAgICAvLyBVc2UgY2xhc3MgdmFyaWFibGVzIGZvciB0aW1lIGNhbGVuZGFyc1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBlbmRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLFxuICAgICAgICAgICAgdHlwZTogJ3RpbWUnLFxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIGRpc2FibGVNaW51dGU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICBhbXBtOiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZUVuZC5jYWxlbmRhcih7XG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIHN0YXJ0Q2FsZW5kYXI6IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZVN0YXJ0LFxuICAgICAgICAgICAgdHlwZTogJ3RpbWUnLFxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIG1vbnRoRmlyc3Q6IGZhbHNlLFxuICAgICAgICAgICAgYW1wbTogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJvdXRpbmcgdGFibGUgYW5kIGFsbG93UmVzdHJpY3Rpb24gY2hlY2tib3hcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUm91dGluZ1RhYmxlKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGFsbG93UmVzdHJpY3Rpb24gY2hlY2tib3hcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kYWxsb3dSZXN0cmljdGlvbkZpZWxkLnBhcmVudCgpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRhbGxvd1Jlc3RyaWN0aW9uRmllbGQucGFyZW50KCkuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnRvZ2dsZVJ1bGVzVGFiKGlzQ2hlY2tlZCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZXhpc3RpbmcgY2hlY2tib3hlcyBpbiB0YWJsZVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy51aS5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUb2dnbGUgcnVsZXMgdGFiIHZpc2liaWxpdHlcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzQ2hlY2tlZCAtIFdoZXRoZXIgdG8gc2hvdyBydWxlcyB0YWJcbiAgICAgKi9cbiAgICB0b2dnbGVSdWxlc1RhYihpc0NoZWNrZWQpIHtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiLmhpZGUoKTtcbiAgICAgICAgICAgIC8vIFN3aXRjaCB0byBnZW5lcmFsIHRhYiBpZiBydWxlcyB0YWIgd2FzIGFjdGl2ZVxuICAgICAgICAgICAgaWYgKG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiLmhhc0NsYXNzKCdhY3RpdmUnKSkge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFiLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYlNlZ21lbnQucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGdlbmVyYWxUYWIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGdlbmVyYWxUYWJTZWdtZW50LmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCByb3V0aW5nIHRhYmxlIHdpdGggaW5jb21pbmcgcm91dGVzXG4gICAgICovXG4gICAgbG9hZFJvdXRpbmdUYWJsZSgpIHtcbiAgICAgICAgLy8gQ2xlYXIgdGFibGVcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCd0Ym9keScpLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgYXNzb2NpYXRlZCBJRHMgZnJvbSByZWNvcmQgZGF0YVxuICAgICAgICBjb25zdCBhc3NvY2lhdGVkSWRzID0gb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmREYXRhPy5pbmNvbWluZ1JvdXRlSWRzIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBhbGwgYXZhaWxhYmxlIHJvdXRlcyBmcm9tIEluY29taW5nUm91dGVzQVBJXG4gICAgICAgIEluY29taW5nUm91dGVzQVBJLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBHcm91cCBhbmQgc29ydCByb3V0ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBncm91cGVkUm91dGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC5ncm91cEFuZFNvcnRSb3V0ZXMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVuZGVyIGdyb3VwZWQgcm91dGVzXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5yZW5kZXJHcm91cGVkUm91dGVzKGdyb3VwZWRSb3V0ZXMsIGFzc29jaWF0ZWRJZHMpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgVUkgY29tcG9uZW50cyB3aXRoIGdyb3VwZWQgY2hlY2tib3ggbG9naWNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVSb3V0aW5nQ2hlY2tib3hlcygpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnNob3dFbXB0eVJvdXRlc01lc3NhZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHcm91cCBhbmQgc29ydCByb3V0ZXMgYnkgcHJvdmlkZXIgYW5kIERJRFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJvdXRlcyAtIEFycmF5IG9mIHJvdXRlIG9iamVjdHNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBHcm91cGVkIHJvdXRlc1xuICAgICAqL1xuICAgIGdyb3VwQW5kU29ydFJvdXRlcyhyb3V0ZXMpIHtcbiAgICAgICAgY29uc3QgZ3JvdXBzID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBTa2lwIGRlZmF1bHQgcm91dGUgYW5kIGdyb3VwIGJ5IHByb3ZpZGVyXG4gICAgICAgIHJvdXRlcy5mb3JFYWNoKChyb3V0ZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJvdXRlLmlkID09PSAxIHx8IHJvdXRlLmlkID09PSAnMScpIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9IHJvdXRlLnByb3ZpZGVyIHx8ICdub25lJztcbiAgICAgICAgICAgIGlmICghZ3JvdXBzW3Byb3ZpZGVySWRdKSB7XG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBwbGFpbiB0ZXh0IHByb3ZpZGVyIG5hbWUgZnJvbSBIVE1MIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGxldCBwcm92aWRlck5hbWUgPSByb3V0ZS5wcm92aWRlclJlcHJlc2VudCB8fCBnbG9iYWxUcmFuc2xhdGUuaXJfTm9Bc3NpZ25lZFByb3ZpZGVyIHx8ICdEaXJlY3QgY2FsbHMnO1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBIVE1MIHRhZ3MgdG8gZ2V0IGNsZWFuIHByb3ZpZGVyIG5hbWUgZm9yIGRpc3BsYXlcbiAgICAgICAgICAgICAgICBjb25zdCB0ZW1wRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgdGVtcERpdi5pbm5lckhUTUwgPSBwcm92aWRlck5hbWU7XG4gICAgICAgICAgICAgICAgY29uc3QgY2xlYW5Qcm92aWRlck5hbWUgPSB0ZW1wRGl2LnRleHRDb250ZW50IHx8IHRlbXBEaXYuaW5uZXJUZXh0IHx8IHByb3ZpZGVyTmFtZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0gPSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVySWQ6IHByb3ZpZGVySWQsICAvLyBTdG9yZSBhY3R1YWwgcHJvdmlkZXIgSURcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJOYW1lOiBjbGVhblByb3ZpZGVyTmFtZSwgIC8vIENsZWFuIG5hbWUgZm9yIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJOYW1lSHRtbDogcm91dGUucHJvdmlkZXJSZXByZXNlbnQgfHwgcHJvdmlkZXJOYW1lLCAgLy8gT3JpZ2luYWwgSFRNTCBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJEaXNhYmxlZDogcm91dGUucHJvdmlkZXJEaXNhYmxlZCB8fCBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFJ1bGVzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgc3BlY2lmaWNSdWxlczoge31cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXBhcmF0ZSBnZW5lcmFsIHJ1bGVzIChubyBESUQpIGZyb20gc3BlY2lmaWMgcnVsZXMgKHdpdGggRElEKVxuICAgICAgICAgICAgaWYgKCFyb3V0ZS5udW1iZXIgfHwgcm91dGUubnVtYmVyID09PSAnJykge1xuICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5nZW5lcmFsUnVsZXMucHVzaChyb3V0ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXNbcm91dGUubnVtYmVyXSkge1xuICAgICAgICAgICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlc1tyb3V0ZS5udW1iZXJdID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5zcGVjaWZpY1J1bGVzW3JvdXRlLm51bWJlcl0ucHVzaChyb3V0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU29ydCBydWxlcyB3aXRoaW4gZWFjaCBncm91cCBieSBwcmlvcml0eVxuICAgICAgICBPYmplY3Qua2V5cyhncm91cHMpLmZvckVhY2gocHJvdmlkZXJJZCA9PiB7XG4gICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0uZ2VuZXJhbFJ1bGVzLnNvcnQoKGEsIGIpID0+IGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KTtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGdyb3Vwc1twcm92aWRlcklkXS5zcGVjaWZpY1J1bGVzKS5mb3JFYWNoKGRpZCA9PiB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXNbZGlkXS5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZ3JvdXBzO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVuZGVyIGdyb3VwZWQgcm91dGVzIGluIHRoZSB0YWJsZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBncm91cGVkUm91dGVzIC0gR3JvdXBlZCByb3V0ZXMgb2JqZWN0XG4gICAgICogQHBhcmFtIHtBcnJheX0gYXNzb2NpYXRlZElkcyAtIEFycmF5IG9mIGFzc29jaWF0ZWQgcm91dGUgSURzXG4gICAgICovXG4gICAgcmVuZGVyR3JvdXBlZFJvdXRlcyhncm91cGVkUm91dGVzLCBhc3NvY2lhdGVkSWRzKSB7XG4gICAgICAgIGNvbnN0IHRib2R5ID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCd0Ym9keScpO1xuICAgICAgICBsZXQgaXNGaXJzdEdyb3VwID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIE9iamVjdC5rZXlzKGdyb3VwZWRSb3V0ZXMpLmZvckVhY2gocHJvdmlkZXJJZCA9PiB7XG4gICAgICAgICAgICBjb25zdCBncm91cCA9IGdyb3VwZWRSb3V0ZXNbcHJvdmlkZXJJZF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBwcm92aWRlciBncm91cCBoZWFkZXJcbiAgICAgICAgICAgIGlmICghaXNGaXJzdEdyb3VwKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIHNlcGFyYXRvciBiZXR3ZWVuIGdyb3Vwc1xuICAgICAgICAgICAgICAgIHRib2R5LmFwcGVuZCgnPHRyIGNsYXNzPVwicHJvdmlkZXItc2VwYXJhdG9yXCI+PHRkIGNvbHNwYW49XCIzXCI+PGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj48L3RkPjwvdHI+Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpc0ZpcnN0R3JvdXAgPSBmYWxzZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIHByb3ZpZGVyIGhlYWRlciByb3cgLSB1c2UgcHJvdmlkZXJOYW1lSHRtbCBmb3IgcmljaCBkaXNwbGF5XG4gICAgICAgICAgICB0Ym9keS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cInByb3ZpZGVyLWhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dyb3VwLnByb3ZpZGVyTmFtZUh0bWx9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z3JvdXAucHJvdmlkZXJEaXNhYmxlZCA/ICc8c3BhbiBjbGFzcz1cInVpIG1pbmkgcmVkIGxhYmVsXCI+RGlzYWJsZWQ8L3NwYW4+JyA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW5kZXIgZ2VuZXJhbCBydWxlcyBmaXJzdFxuICAgICAgICAgICAgZ3JvdXAuZ2VuZXJhbFJ1bGVzLmZvckVhY2goKHJvdXRlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jcmVhdGVSb3V0ZVJvdyhyb3V0ZSwgYXNzb2NpYXRlZElkcywgJ3J1bGUtZ2VuZXJhbCcpO1xuICAgICAgICAgICAgICAgIHRib2R5LmFwcGVuZChyb3cpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbmRlciBzcGVjaWZpYyBydWxlcyBncm91cGVkIGJ5IERJRFxuICAgICAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXAuc3BlY2lmaWNSdWxlcykuc29ydCgpLmZvckVhY2goZGlkID0+IHtcbiAgICAgICAgICAgICAgICBncm91cC5zcGVjaWZpY1J1bGVzW2RpZF0uZm9yRWFjaCgocm91dGUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzRmlyc3RJbkRJRCA9IGluZGV4ID09PSAwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBvdXRPZldvcmtUaW1lUmVjb3JkLmNyZWF0ZVJvdXRlUm93KHJvdXRlLCBhc3NvY2lhdGVkSWRzLCAncnVsZS1zcGVjaWZpYycsIGlzRmlyc3RJbkRJRCk7XG4gICAgICAgICAgICAgICAgICAgIHRib2R5LmFwcGVuZChyb3cpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgc2luZ2xlIHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByb3V0ZSAtIFJvdXRlIG9iamVjdFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFzc29jaWF0ZWRJZHMgLSBBc3NvY2lhdGVkIHJvdXRlIElEc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBydWxlQ2xhc3MgLSBDU1MgY2xhc3MgZm9yIHRoZSBydWxlIHR5cGVcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IHNob3dESURJbmRpY2F0b3IgLSBXaGV0aGVyIHRvIHNob3cgRElEIGluZGljYXRvclxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IEhUTUwgcm93XG4gICAgICovXG4gICAgY3JlYXRlUm91dGVSb3cocm91dGUsIGFzc29jaWF0ZWRJZHMsIHJ1bGVDbGFzcyA9ICcnLCBzaG93RElESW5kaWNhdG9yID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgaXNDaGVja2VkID0gYXNzb2NpYXRlZElkcy5pbmNsdWRlcyhwYXJzZUludChyb3V0ZS5pZCkpO1xuICAgICAgICBjb25zdCBwcm92aWRlckRpc2FibGVkID0gcm91dGUucHJvdmlkZXJEaXNhYmxlZCA/ICdkaXNhYmxlZCcgOiAnJztcbiAgICAgICAgbGV0IHJ1bGVEZXNjcmlwdGlvbiA9IHJvdXRlLnJ1bGVSZXByZXNlbnQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbnN1cmUgcHJvdmlkZXIgSUQgaXMgY2xlYW4gKG5vIEhUTUwpXG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSByb3V0ZS5wcm92aWRlciB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB2aXN1YWwgaW5kaWNhdG9ycyBmb3IgcnVsZSB0eXBlXG4gICAgICAgIGlmIChydWxlQ2xhc3MgPT09ICdydWxlLXNwZWNpZmljJykge1xuICAgICAgICAgICAgLy8gQWRkIGluZGVudCBhbmQgYXJyb3cgZm9yIHNwZWNpZmljIHJ1bGVzXG4gICAgICAgICAgICBydWxlRGVzY3JpcHRpb24gPSBgPHNwYW4gY2xhc3M9XCJydWxlLWluZGVudFwiPuKGszwvc3Bhbj4gJHtydWxlRGVzY3JpcHRpb259YDtcbiAgICAgICAgfSBlbHNlIGlmIChydWxlQ2xhc3MgPT09ICdydWxlLWdlbmVyYWwnKSB7XG4gICAgICAgICAgICAvLyBBZGQgaWNvbiBmb3IgZ2VuZXJhbCBydWxlc1xuICAgICAgICAgICAgcnVsZURlc2NyaXB0aW9uID0gYDxpIGNsYXNzPVwicmFuZG9tIGljb25cIj48L2k+ICR7cnVsZURlc2NyaXB0aW9ufWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG5vdGVEaXNwbGF5ID0gcm91dGUubm90ZSAmJiByb3V0ZS5ub3RlLmxlbmd0aCA+IDIwID8gXG4gICAgICAgICAgICBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uXCIgZGF0YS1jb250ZW50PVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocm91dGUubm90ZSl9XCIgZGF0YS12YXJpYXRpb249XCJ3aWRlXCIgZGF0YS1wb3NpdGlvbj1cInRvcCByaWdodFwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZmlsZSB0ZXh0IGljb25cIj48L2k+XG4gICAgICAgICAgICA8L2Rpdj5gIDogXG4gICAgICAgICAgICBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocm91dGUubm90ZSB8fCAnJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEYXRhIGF0dHJpYnV0ZXMgYWxyZWFkeSBzYWZlIGZyb20gQVBJXG4gICAgICAgIGNvbnN0IHNhZmVQcm92aWRlcklkID0gcHJvdmlkZXJJZDtcbiAgICAgICAgY29uc3Qgc2FmZURpZCA9IHJvdXRlLm51bWJlciB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8dHIgY2xhc3M9XCJydWxlLXJvdyAke3J1bGVDbGFzc31cIiBpZD1cIiR7cm91dGUuaWR9XCIgXG4gICAgICAgICAgICAgICAgZGF0YS1wcm92aWRlcj1cIiR7c2FmZVByb3ZpZGVySWR9XCIgXG4gICAgICAgICAgICAgICAgZGF0YS1kaWQ9XCIke3NhZmVEaWR9XCI+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiY29sbGFwc2luZ1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZml0dGVkIHRvZ2dsZSBjaGVja2JveFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtZGlkPVwiJHtzYWZlRGlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcHJvdmlkZXI9XCJ7JHtzYWZlUHJvdmlkZXJJZH19XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgJHtpc0NoZWNrZWQgPyAnY2hlY2tlZCcgOiAnJ30gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInJvdXRlLSR7cm91dGUuaWR9XCIgZGF0YS12YWx1ZT1cIiR7cm91dGUuaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCIke3Byb3ZpZGVyRGlzYWJsZWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICR7cnVsZURlc2NyaXB0aW9uIHx8ICc8c3BhbiBjbGFzcz1cInRleHQtbXV0ZWRcIj5ObyBkZXNjcmlwdGlvbjwvc3Bhbj4nfVxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiaGlkZS1vbi1tb2JpbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtub3RlRGlzcGxheX1cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgPC90cj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgZW1wdHkgcm91dGVzIG1lc3NhZ2UgaW4gdGFibGVcbiAgICAgKi9cbiAgICBzaG93RW1wdHlSb3V0ZXNNZXNzYWdlKCkge1xuICAgICAgICBjb25zdCBlbXB0eVJvdyA9IGBcbiAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjNcIiBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+XG4gICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmlyX05vSW5jb21pbmdSb3V0ZXMgfHwgJ05vIGluY29taW5nIHJvdXRlcyBjb25maWd1cmVkJ31cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgPC90cj5cbiAgICAgICAgYDtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCd0Ym9keScpLmFwcGVuZChlbXB0eVJvdyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJvdXRpbmcgY2hlY2tib3hlcyB3aXRoIGdyb3VwZWQgbG9naWNcbiAgICAgKiBXaGVuIGNoZWNraW5nL3VuY2hlY2tpbmcgcnVsZXMgd2l0aCBzYW1lIHByb3ZpZGVyIGFuZCBESURcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUm91dGluZ0NoZWNrYm94ZXMoKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaG92ZXIgZWZmZWN0IHRvIGhpZ2hsaWdodCByZWxhdGVkIHJ1bGVzXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnJ1bGUtcm93JykuaG92ZXIoXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkcm93ID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlciA9ICRyb3cuYXR0cignZGF0YS1wcm92aWRlcicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpZCA9ICRyb3cuYXR0cignZGF0YS1kaWQnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgcHJldmlvdXMgaGlnaGxpZ2h0c1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnJ1bGUtcm93JykucmVtb3ZlQ2xhc3MoJ3JlbGF0ZWQtaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyICYmIHByb3ZpZGVyICE9PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGlnaGxpZ2h0IGFsbCBydWxlcyB3aXRoIHNhbWUgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYC5ydWxlLXJvd1tkYXRhLXByb3ZpZGVyPVwiJHtwcm92aWRlcn1cIl1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgaG92ZXJpbmcgb24gc3BlY2lmaWMgRElEIHJ1bGUsIGhpZ2hsaWdodCBhbGwgd2l0aCBzYW1lIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3IgKz0gYFtkYXRhLWRpZD1cIiR7ZGlkfVwiXWA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBob3ZlcmluZyBvbiBnZW5lcmFsIHJ1bGUsIGhpZ2hsaWdodCBhbGwgZ2VuZXJhbCBydWxlcyBmb3IgdGhpcyBwcm92aWRlclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3IgKz0gJ1tkYXRhLWRpZD1cIlwiXSc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRyZWxhdGVkUm93cyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgICRyZWxhdGVkUm93cy5hZGRDbGFzcygncmVsYXRlZC1oaWdobGlnaHQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGhpZ2hsaWdodHMgb24gbW91c2UgbGVhdmVcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLnJlbW92ZUNsYXNzKCdyZWxhdGVkLWhpZ2hsaWdodCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveCBiZWhhdmlvciB3aXRoIHRvb2x0aXBzXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnVpLmNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBkaWQgPSAkY2hlY2tib3guYXR0cignZGF0YS1kaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtcHJvdmlkZXInKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIHRvb2x0aXAgdG8gZXhwbGFpbiBncm91cGluZ1xuICAgICAgICAgICAgaWYgKHByb3ZpZGVyICYmIHByb3ZpZGVyICE9PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICBsZXQgdG9vbHRpcFRleHQgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAoZGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnRmX1Rvb2x0aXBTcGVjaWZpY1J1bGUgfHwgJ1RoaXMgcnVsZSBhcHBsaWVzIHRvIGNhbGxzIHRvIHNwZWNpZmljIG51bWJlci4gUmVsYXRlZCBydWxlcyB3aWxsIGJlIHN5bmNocm9uaXplZC4nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXBUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnRmX1Rvb2x0aXBHZW5lcmFsUnVsZSB8fCAnVGhpcyBydWxlIGFwcGxpZXMgdG8gYWxsIGNhbGxzIGZyb20gcHJvdmlkZXIuIFJlbGF0ZWQgcnVsZXMgd2lsbCBiZSBzeW5jaHJvbml6ZWQuJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGNoZWNrYm94LmF0dHIoJ2RhdGEtY29udGVudCcsIHRvb2x0aXBUZXh0KTtcbiAgICAgICAgICAgICAgICAkY2hlY2tib3guYXR0cignZGF0YS12YXJpYXRpb24nLCAndGlueScpO1xuICAgICAgICAgICAgICAgICRjaGVja2JveC5wb3B1cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3ggY2hhbmdlIGJlaGF2aW9yXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcykucGFyZW50KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlkID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkY2hlY2tib3guYXR0cignZGF0YS1wcm92aWRlcicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNraXAgc3luY2hyb25pemF0aW9uIGZvciAnbm9uZScgcHJvdmlkZXIgKGRpcmVjdCBjYWxscylcbiAgICAgICAgICAgICAgICBpZiAoIXByb3ZpZGVyIHx8IHByb3ZpZGVyID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgZ3JvdXBlZCBsb2dpYyByZXF1aXJlbWVudHNcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYCNyb3V0aW5nLXRhYmxlIC51aS5jaGVja2JveFtkYXRhLXByb3ZpZGVyPVwiJHtwcm92aWRlcn1cIl1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpZCAmJiBkaWQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSdWxlIHdpdGggc3BlY2lmaWMgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBjaGVja2luZyBhIHJ1bGUgd2l0aCBESUQsIGNoZWNrIGFsbCBydWxlcyB3aXRoIHNhbWUgcHJvdmlkZXIgYW5kIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yV2l0aERJRCA9IGAke3NlbGVjdG9yfVtkYXRhLWRpZD1cIiR7ZGlkfVwiXWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChzZWxlY3RvcldpdGhESUQpLm5vdCgkY2hlY2tib3gpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHVuY2hlY2tpbmcgYSBydWxlIHdpdGggRElEOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIFVuY2hlY2sgYWxsIHJ1bGVzIHdpdGggc2FtZSBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvcldpdGhESUQgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JXaXRoRElEKS5ub3QoJGNoZWNrYm94KS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDIuIEFsc28gdW5jaGVjayBnZW5lcmFsIHJ1bGVzICh3aXRob3V0IERJRCkgZm9yIHNhbWUgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvckdlbmVyYWwgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCJcIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JHZW5lcmFsKS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2VuZXJhbCBydWxlIHdpdGhvdXQgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gdW5jaGVja2luZyBnZW5lcmFsIHJ1bGUsIG9ubHkgdW5jaGVjayBvdGhlciBnZW5lcmFsIHJ1bGVzIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBjaGVja2luZyBnZW5lcmFsIHJ1bGUsIGNoZWNrIGFsbCBnZW5lcmFsIHJ1bGVzIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZVxuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGVyYXNlIGJ1dHRvbnMgZm9yIGRhdGUvdGltZSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXJhc2VycygpIHtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJhc2VEYXRlc0J0bi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZVdlZWtkYXlzQnRuLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlGcm9tRHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcmFzZVRpbWVwZXJpb2RCdG4ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZXNjcmlwdGlvbiBmaWVsZCB3aXRoIGF1dG8tcmVzaXplXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlc2NyaXB0aW9uRmllbGQoKSB7XG4gICAgICAgIC8vIEF1dG8tcmVzaXplIG9uIGlucHV0XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgICAgICAgIHRoaXMuc3R5bGUuaGVpZ2h0ID0gKHRoaXMuc2Nyb2xsSGVpZ2h0KSArICdweCc7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCByZXNpemVcbiAgICAgICAgaWYgKG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlc2NyaXB0aW9uRmllbGQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGVscGVyIHRvIHNldCBkYXRlIGZyb20gdGltZXN0YW1wIG9yIGRhdGUgc3RyaW5nXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSBkYXRlVmFsdWUgLSBVbml4IHRpbWVzdGFtcCBvciBkYXRlIHN0cmluZyAoWVlZWS1NTS1ERClcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3JcbiAgICAgKi9cbiAgICBzZXREYXRlRnJvbVRpbWVzdGFtcChkYXRlVmFsdWUsIHNlbGVjdG9yKSB7XG4gICAgICAgIGlmICghZGF0ZVZhbHVlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGEgZGF0ZSBzdHJpbmcgaW4gWVlZWS1NTS1ERCBmb3JtYXQgZmlyc3RcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlVmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgZGF0ZSBmb3JtYXQgWVlZWS1NTS1ERFxuICAgICAgICAgICAgaWYgKC9eXFxkezR9LVxcZHsyfS1cXGR7Mn0kLy50ZXN0KGRhdGVWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzTmFOKGRhdGUuZ2V0VGltZSgpKSkge1xuICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJ5IHRvIHBhcnNlIGFzIFVuaXggdGltZXN0YW1wIChhbGwgZGlnaXRzKVxuICAgICAgICAgICAgaWYgKC9eXFxkKyQvLnRlc3QoZGF0ZVZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IHBhcnNlSW50KGRhdGVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRpbWVzdGFtcCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBVbml4IHRpbWVzdGFtcCB0byBEYXRlXG4gICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3IpLmNhbGVuZGFyKCdzZXQgZGF0ZScsIG5ldyBEYXRlKHRpbWVzdGFtcCAqIDEwMDApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZGF0ZVZhbHVlID09PSAnbnVtYmVyJyAmJiBkYXRlVmFsdWUgPiAwKSB7XG4gICAgICAgICAgICAvLyBOdW1lcmljIFVuaXggdGltZXN0YW1wXG4gICAgICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBuZXcgRGF0ZShkYXRlVmFsdWUgKiAxMDAwKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gZm9yIHBhaXJlZCBmaWVsZHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzdWx0IC0gRm9ybSBkYXRhXG4gICAgICogQHJldHVybnMge29iamVjdHxib29sZWFufSBSZXN1bHQgb2JqZWN0IG9yIGZhbHNlIGlmIHZhbGlkYXRpb24gZmFpbHNcbiAgICAgKi9cbiAgICBjdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KSB7XG4gICAgICAgIC8vIENoZWNrIGRhdGUgZmllbGRzIC0gYm90aCBzaG91bGQgYmUgZmlsbGVkIG9yIGJvdGggZW1wdHlcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS5kYXRlX2Zyb20gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gPT09ICcnKSB8fFxuICAgICAgICAgICAgKHJlc3VsdC5kYXRhLmRhdGVfdG8gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9PT0gJycpKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdlZWtkYXkgZmllbGRzIC0gYm90aCBzaG91bGQgYmUgZmlsbGVkIG9yIGJvdGggZW1wdHlcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMScpIHx8XG4gICAgICAgICAgICAocmVzdWx0LmRhdGEud2Vla2RheV90byA+IDAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID09PSAnLTEnKSkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB0aW1lIGZpZWxkcyAtIGJvdGggc2hvdWxkIGJlIGZpbGxlZCBvciBib3RoIGVtcHR5XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApIHx8XG4gICAgICAgICAgICAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHRpbWVmcmFtZSB0eXBlLCBjaGVjayB0aGF0IGF0IGxlYXN0IG9uZSBjb25kaXRpb24gaXMgc3BlY2lmaWVkXG4gICAgICAgIGNvbnN0IGNhbFR5cGUgPSByZXN1bHQuZGF0YS5jYWxUeXBlIHx8ICd0aW1lZnJhbWUnO1xuICAgICAgICBpZiAoY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScgfHwgY2FsVHlwZSA9PT0gJycpIHtcbiAgICAgICAgICAgIGNvbnN0IGhhc0RhdGVSYW5nZSA9IHJlc3VsdC5kYXRhLmRhdGVfZnJvbSAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV90byAhPT0gJyc7XG4gICAgICAgICAgICBjb25zdCBoYXNXZWVrZGF5UmFuZ2UgPSByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPiAwO1xuICAgICAgICAgICAgY29uc3QgaGFzVGltZVJhbmdlID0gcmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWhhc0RhdGVSYW5nZSAmJiAhaGFzV2Vla2RheVJhbmdlICYmICFoYXNUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRlcnJvck1lc3NhZ2UuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQpLnNob3coKTtcbiAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgc2VuZGluZyBmb3JtXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R8Ym9vbGVhbn0gVXBkYXRlZCBzZXR0aW5ncyBvciBmYWxzZVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyBmcm9tICdvbicvdW5kZWZpbmVkIHRvIHRydWUvZmFsc2VcbiAgICAgICAgLy8gUHJvY2VzcyBhbGwgcm91dGUgY2hlY2tib3hlc1xuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdyb3V0ZS0nKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2tleV0gPSByZXN1bHQuZGF0YVtrZXldID09PSAnb24nIHx8IHJlc3VsdC5kYXRhW2tleV0gPT09IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgIGlmICgnYWxsb3dSZXN0cmljdGlvbicgaW4gcmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmFsbG93UmVzdHJpY3Rpb24gPSByZXN1bHQuZGF0YS5hbGxvd1Jlc3RyaWN0aW9uID09PSAnb24nIHx8IHJlc3VsdC5kYXRhLmFsbG93UmVzdHJpY3Rpb24gPT09IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjYWxUeXBlIGNvbnZlcnNpb24gKG1hdGNoZXMgb2xkIGNvbnRyb2xsZXI6ICgkZGF0YVskbmFtZV0gPT09ICd0aW1lZnJhbWUnKSA/ICcnIDogJGRhdGFbJG5hbWVdKVxuICAgICAgICAvLyBGb3Igc2F2aW5nIHdlIGNvbnZlcnQgJ3RpbWVmcmFtZScgdG8gZW1wdHkgc3RyaW5nXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5jYWxUeXBlID09PSAndGltZWZyYW1lJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuY2FsVHlwZSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgd2Vla2RheSB2YWx1ZXMgKG1hdGNoZXMgb2xkIGNvbnRyb2xsZXI6ICgkZGF0YVskbmFtZV0gPCAxKSA/IG51bGwgOiAkZGF0YVskbmFtZV0pXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPT09ICctMScgfHwgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tIDwgMSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMScgfHwgcmVzdWx0LmRhdGEud2Vla2RheV90byA8IDEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPSAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIGZpZWxkIC0gaWYgdXNlciBkaWRuJ3QgY2hhbmdlIHRoZSBtYXNrZWQgcGFzc3dvcmQsIGtlZXAgaXQgYXMgaXNcbiAgICAgICAgLy8gVGhlIGJhY2tlbmQgd2lsbCByZWNvZ25pemUgJ1hYWFhYWCcgYW5kIHdvbid0IHVwZGF0ZSB0aGUgcGFzc3dvcmRcbiAgICAgICAgLy8gSWYgdXNlciBjbGVhcmVkIHRoZSBmaWVsZCBvciBlbnRlcmVkIG5ldyB2YWx1ZSwgc2VuZCB0aGF0XG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5jYWxTZWNyZXQgPT09ICdYWFhYWFgnKSB7XG4gICAgICAgICAgICAvLyBVc2VyIGRpZG4ndCBjaGFuZ2UgdGhlIG1hc2tlZCBwYXNzd29yZCwgYmFja2VuZCB3aWxsIGtlZXAgZXhpc3RpbmcgdmFsdWVcbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQuZGF0YS5jYWxTZWNyZXQgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBVc2VyIGNsZWFyZWQgdGhlIHBhc3N3b3JkIGZpZWxkLCBiYWNrZW5kIHdpbGwgY2xlYXIgdGhlIHBhc3N3b3JkXG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlIHNlbmQgdGhlIG5ldyBwYXNzd29yZCB2YWx1ZSBhcyBlbnRlcmVkXG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGltZSB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIGNhbGVuZGFyIHR5cGVcbiAgICAgICAgY29uc3QgY2FsVHlwZSA9IHJlc3VsdC5kYXRhLmNhbFR5cGUgfHwgJ3RpbWVmcmFtZSc7XG4gICAgICAgIGlmIChjYWxUeXBlID09PSAnJyB8fCBjYWxUeXBlID09PSAndGltZWZyYW1lJykge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLnRpbWVmcm9tLnJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC5hZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXM7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZXRvLnJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC5hZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZWZyb20ucnVsZXMgPSBbXTtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy50aW1ldG8ucnVsZXMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBkYXRlcyB0byB0aW1lc3RhbXBzXG4gICAgICAgIGNvbnN0IGRhdGVGcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIGlmIChkYXRlRnJvbSkge1xuICAgICAgICAgICAgZGF0ZUZyb20uc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5kYXRlX2Zyb20gPSBNYXRoLmZsb29yKGRhdGVGcm9tLmdldFRpbWUoKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRhdGVUbyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignZ2V0IGRhdGUnKTtcbiAgICAgICAgaWYgKGRhdGVUbykge1xuICAgICAgICAgICAgZGF0ZVRvLnNldEhvdXJzKDIzLCA1OSwgNTksIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV90byA9IE1hdGguZmxvb3IoZGF0ZVRvLmdldFRpbWUoKSAvIDEwMDApLnRvU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbGxlY3Qgc2VsZWN0ZWQgaW5jb21pbmcgcm91dGVzXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkUm91dGVzID0gW107XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgcm91dGVJZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKHJvdXRlSWQpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RlZFJvdXRlcy5wdXNoKHJvdXRlSWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmVzdWx0LmRhdGEuaW5jb21pbmdSb3V0ZUlkcyA9IHNlbGVjdGVkUm91dGVzO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgYWN0aW9uLWRlcGVuZGVudCBmaWVsZHMgYmFzZWQgb24gc2VsZWN0aW9uXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5hY3Rpb24gPT09ICdleHRlbnNpb24nKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdWRpb19tZXNzYWdlX2lkID0gJyc7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzdWx0LmRhdGEuYWN0aW9uID09PSAncGxheW1lc3NhZ2UnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5leHRlbnNpb24gPSAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUnVuIGN1c3RvbSB2YWxpZGF0aW9uIGZvciBwYWlyZWQgZmllbGRzXG4gICAgICAgIHJldHVybiBvdXRPZldvcmtUaW1lUmVjb3JkLmN1c3RvbVZhbGlkYXRlRm9ybShyZXN1bHQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGlmIHRoaXMgd2FzIGEgbmV3IHJlY29yZFxuICAgICAgICAgICAgaWYgKCFvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZElkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1vdXQtb2ZmLXdvcmstdGltZS9tb2RpZnkvJHtyZXNwb25zZS5kYXRhLmlkfWA7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQgPSByZXNwb25zZS5kYXRhLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWxvYWQgZGF0YSB0byBlbnN1cmUgY29uc2lzdGVuY3lcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZEZvcm1EYXRhKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9b3V0LW9mZi13b3JrLXRpbWUvc2F2ZWA7XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBPdXRXb3JrVGltZXNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHMgdXNpbmcgVG9vbHRpcEJ1aWxkZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGQgdG9vbHRpcFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIGNhbFVybDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgeyB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfaGVhZGVyLCBkZWZpbml0aW9uOiBudWxsIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl9nb29nbGUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl9uZXh0Y2xvdWQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl95YW5kZXhcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHsgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfaWNhbGVuZGFyX2hlYWRlciwgZGVmaW5pdGlvbjogbnVsbCB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9pY2FsZW5kYXJfZGVzY1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfZXhhbXBsZV9nb29nbGUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVfbmV4dGNsb3VkLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9leGFtcGxlX2ljc1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXNIZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgdGhhdCBjaGVja3MgaWYgYSB2YWx1ZSBpcyBub3QgZW1wdHkgYmFzZWQgb24gYSBzcGVjaWZpYyBhY3Rpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWRcbiAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHRvIGNvbXBhcmUgYWdhaW5zdFxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgdHJ1ZSBpZiB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZSA9IGZ1bmN0aW9uKHZhbHVlLCBhY3Rpb24pIHtcbiAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwICYmIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkZpZWxkLnZhbCgpID09PSBhY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgY2FsZW5kYXIgVVJMIGZpZWxkXG4gKiBWYWxpZGF0ZXMgVVJMIG9ubHkgd2hlbiBjYWxlbmRhciB0eXBlIGlzIG5vdCAnbm9uZScgb3IgJ3RpbWUnXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21Ob3RFbXB0eUlmQ2FsVHlwZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgY29uc3QgY2FsVHlwZSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbFR5cGVGaWVsZC52YWwoKTtcbiAgICBcbiAgICAvLyBJZiBjYWxlbmRhciB0eXBlIGlzIHRpbWVmcmFtZSBvciB0aW1lLCBVUkwgaXMgbm90IHJlcXVpcmVkXG4gICAgaWYgKCFjYWxUeXBlIHx8IGNhbFR5cGUgPT09ICd0aW1lZnJhbWUnIHx8IGNhbFR5cGUgPT09ICd0aW1lJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgLy8gSWYgY2FsZW5kYXIgdHlwZSBpcyBDQUxEQVYgb3IgSUNBTCwgdmFsaWRhdGUgVVJMXG4gICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICAvLyBDaGVjayBpZiBpdCdzIGEgdmFsaWQgVVJMXG4gICAgdHJ5IHtcbiAgICAgICAgbmV3IFVSTCh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==