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
    outOfWorkTimeRecord.$forwardingSelectDropdown.dropdown(extensionSettings); // Initialize sound file selector

    SoundFileSelector.init(outOfWorkTimeRecord.audioMessageId, {
      category: 'custom',
      includeEmpty: true,
      onChange: function onChange() {
        Form.dataChanged();
      }
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
    } // Setup audio message value


    if (data.audio_message_id) {
      SoundFileSelector.setValue(outOfWorkTimeRecord.audioMessageId, data.audio_message_id, data.audio_message_id_Represent);
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

      SoundFileSelector.clear(outOfWorkTimeRecord.audioMessageId);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJvdXRPZldvcmtUaW1lUmVjb3JkIiwiJGZvcm1PYmoiLCIkIiwicmVjb3JkSWQiLCJyZWNvcmREYXRhIiwiJHRpbWVfZnJvbSIsIiR0aW1lX3RvIiwiJHJ1bGVzVGFibGUiLCIkaWRGaWVsZCIsIiR3ZWVrZGF5RnJvbUZpZWxkIiwiJHdlZWtkYXlUb0ZpZWxkIiwiJGFjdGlvbkZpZWxkIiwiJGNhbFR5cGVGaWVsZCIsIiRleHRlbnNpb25GaWVsZCIsIiRhbGxvd1Jlc3RyaWN0aW9uRmllbGQiLCIkZGVzY3JpcHRpb25GaWVsZCIsIiRhY3Rpb25Ecm9wZG93biIsIiRjYWxUeXBlRHJvcGRvd24iLCIkd2Vla2RheUZyb21Ecm9wZG93biIsIiR3ZWVrZGF5VG9Ecm9wZG93biIsIiRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd24iLCIkdGFiTWVudSIsIiRydWxlc1RhYiIsIiRnZW5lcmFsVGFiIiwiJHJ1bGVzVGFiU2VnbWVudCIsIiRnZW5lcmFsVGFiU2VnbWVudCIsIiRleHRlbnNpb25Sb3ciLCIkYXVkaW9NZXNzYWdlUm93IiwiJGNhbGVuZGFyVGFiIiwiJG1haW5UYWIiLCIkcmFuZ2VEYXlzU3RhcnQiLCIkcmFuZ2VEYXlzRW5kIiwiJHJhbmdlVGltZVN0YXJ0IiwiJHJhbmdlVGltZUVuZCIsIiRlcmFzZURhdGVzQnRuIiwiJGVyYXNlV2Vla2RheXNCdG4iLCIkZXJhc2VUaW1lcGVyaW9kQnRuIiwiJGVycm9yTWVzc2FnZSIsImF1ZGlvTWVzc2FnZUlkIiwiYWRkaXRpb25hbFRpbWVJbnRlcnZhbFJ1bGVzIiwidHlwZSIsInZhbHVlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCIsInZhbGlkYXRlUnVsZXMiLCJleHRlbnNpb24iLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0Zl9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5IiwiYXVkaW9fbWVzc2FnZV9pZCIsInRmX1ZhbGlkYXRlQXVkaW9NZXNzYWdlRW1wdHkiLCJjYWxVcmwiLCJ0Zl9WYWxpZGF0ZUNhbFVyaSIsInRpbWVmcm9tIiwib3B0aW9uYWwiLCJ0aW1ldG8iLCJpbml0aWFsaXplIiwidmFsIiwidGFiIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplQ2FsZW5kYXJzIiwiaW5pdGlhbGl6ZVJvdXRpbmdUYWJsZSIsImluaXRpYWxpemVFcmFzZXJzIiwiaW5pdGlhbGl6ZURlc2NyaXB0aW9uRmllbGQiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJsb2FkRm9ybURhdGEiLCJhZGRDbGFzcyIsInJlY29yZElkVG9Mb2FkIiwiT3V0V29ya1RpbWVzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwicG9wdWxhdGVGb3JtIiwibG9hZFJvdXRpbmdUYWJsZSIsInNldFRpbWVvdXQiLCJGb3JtIiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJjaGVja1ZhbHVlcyIsImluaXRpYWxpemVEcm9wZG93bnMiLCJtZXNzYWdlcyIsImVycm9yIiwiZXJyb3JNZXNzYWdlIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJyZW1vdmVDbGFzcyIsIndlZWtEYXlzIiwidGV4dCIsImkiLCJkYXRlIiwiRGF0ZSIsImRheU5hbWUiLCJ0b0xvY2FsZURhdGVTdHJpbmciLCJ3ZWVrZGF5IiwidHJhbnNsYXRlZERheSIsInB1c2giLCJuYW1lIiwidG9TdHJpbmciLCJkcm9wZG93biIsInZhbHVlcyIsIm9uQ2hhbmdlIiwiZGF0YUNoYW5nZWQiLCJvbkFjdGlvbkNoYW5nZSIsIm9uQ2FsVHlwZUNoYW5nZSIsImV4dGVuc2lvblNldHRpbmdzIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nIiwiU291bmRGaWxlU2VsZWN0b3IiLCJpbml0IiwiY2F0ZWdvcnkiLCJpbmNsdWRlRW1wdHkiLCJmb3JtIiwiaWQiLCJ1bmlxaWQiLCJwcmlvcml0eSIsImRlc2NyaXB0aW9uIiwiY2FsVHlwZSIsIndlZWtkYXlfZnJvbSIsIndlZWtkYXlfdG8iLCJ0aW1lX2Zyb20iLCJ0aW1lX3RvIiwiY2FsVXNlciIsImNhbFNlY3JldCIsImFjdGlvbiIsImFsbG93UmVzdHJpY3Rpb24iLCIkY2FsU2VjcmV0RmllbGQiLCJhdHRyIiwidGZfUGFzc3dvcmRNYXNrZWQiLCJ0Zl9FbnRlclBhc3N3b3JkIiwiZGF0ZV9mcm9tIiwic2V0RGF0ZUZyb21UaW1lc3RhbXAiLCJkYXRlX3RvIiwiZXh0ZW5zaW9uUmVwcmVzZW50Iiwic2FmZVRleHQiLCJzYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50IiwiZmluZCIsImh0bWwiLCJzZXRWYWx1ZSIsImF1ZGlvX21lc3NhZ2VfaWRfUmVwcmVzZW50IiwidG9nZ2xlUnVsZXNUYWIiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJzaG93IiwiaGlkZSIsImNsZWFyIiwiY2FsZW5kYXIiLCJmaXJzdERheU9mV2VlayIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiY2FsZW5kYXJGaXJzdERheU9mV2VlayIsImNhbGVuZGFyVGV4dCIsImVuZENhbGVuZGFyIiwiaW5saW5lIiwibW9udGhGaXJzdCIsInJlZ0V4cCIsInN0YXJ0Q2FsZW5kYXIiLCJkaXNhYmxlTWludXRlIiwiYW1wbSIsInBhcmVudCIsImNoZWNrYm94IiwiaXNDaGVja2VkIiwiaGFzQ2xhc3MiLCJlbXB0eSIsImFzc29jaWF0ZWRJZHMiLCJpbmNvbWluZ1JvdXRlSWRzIiwiSW5jb21pbmdSb3V0ZXNBUEkiLCJnZXRMaXN0IiwiZ3JvdXBlZFJvdXRlcyIsImdyb3VwQW5kU29ydFJvdXRlcyIsInJlbmRlckdyb3VwZWRSb3V0ZXMiLCJpbml0aWFsaXplUm91dGluZ0NoZWNrYm94ZXMiLCJwb3B1cCIsInNob3dFbXB0eVJvdXRlc01lc3NhZ2UiLCJyb3V0ZXMiLCJncm91cHMiLCJmb3JFYWNoIiwicm91dGUiLCJwcm92aWRlcklkIiwicHJvdmlkZXIiLCJwcm92aWRlck5hbWUiLCJwcm92aWRlclJlcHJlc2VudCIsImlyX05vQXNzaWduZWRQcm92aWRlciIsInRlbXBEaXYiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJpbm5lckhUTUwiLCJjbGVhblByb3ZpZGVyTmFtZSIsInRleHRDb250ZW50IiwiaW5uZXJUZXh0IiwicHJvdmlkZXJOYW1lSHRtbCIsInByb3ZpZGVyRGlzYWJsZWQiLCJnZW5lcmFsUnVsZXMiLCJzcGVjaWZpY1J1bGVzIiwibnVtYmVyIiwiT2JqZWN0Iiwia2V5cyIsInNvcnQiLCJhIiwiYiIsImRpZCIsInRib2R5IiwiaXNGaXJzdEdyb3VwIiwiZ3JvdXAiLCJhcHBlbmQiLCJyb3ciLCJjcmVhdGVSb3V0ZVJvdyIsImluZGV4IiwiaXNGaXJzdEluRElEIiwicnVsZUNsYXNzIiwic2hvd0RJREluZGljYXRvciIsImluY2x1ZGVzIiwicGFyc2VJbnQiLCJydWxlRGVzY3JpcHRpb24iLCJydWxlUmVwcmVzZW50Iiwibm90ZURpc3BsYXkiLCJub3RlIiwibGVuZ3RoIiwic2FmZVByb3ZpZGVySWQiLCJzYWZlRGlkIiwiZW1wdHlSb3ciLCJpcl9Ob0luY29taW5nUm91dGVzIiwiaG92ZXIiLCIkcm93Iiwic2VsZWN0b3IiLCIkcmVsYXRlZFJvd3MiLCJlYWNoIiwiJGNoZWNrYm94IiwidG9vbHRpcFRleHQiLCJ0Zl9Ub29sdGlwU3BlY2lmaWNSdWxlIiwidGZfVG9vbHRpcEdlbmVyYWxSdWxlIiwic2VsZWN0b3JXaXRoRElEIiwibm90Iiwic2VsZWN0b3JHZW5lcmFsIiwib24iLCJzdHlsZSIsImhlaWdodCIsInNjcm9sbEhlaWdodCIsInRyaWdnZXIiLCJkYXRlVmFsdWUiLCJ0ZXN0IiwiaXNOYU4iLCJnZXRUaW1lIiwidGltZXN0YW1wIiwiY3VzdG9tVmFsaWRhdGVGb3JtIiwidGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCIsIiRzdWJtaXRCdXR0b24iLCJ0cmFuc2l0aW9uIiwidGZfVmFsaWRhdGVDaGVja1dlZWtEYXlJbnRlcnZhbCIsImhhc0RhdGVSYW5nZSIsImhhc1dlZWtkYXlSYW5nZSIsImhhc1RpbWVSYW5nZSIsInRmX1ZhbGlkYXRlTm9SdWxlc1NlbGVjdGVkIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwia2V5Iiwic3RhcnRzV2l0aCIsImRhdGVGcm9tIiwic2V0SG91cnMiLCJNYXRoIiwiZmxvb3IiLCJkYXRlVG8iLCJzZWxlY3RlZFJvdXRlcyIsInJvdXRlSWQiLCJjYkFmdGVyU2VuZEZvcm0iLCJuZXdVcmwiLCJnbG9iYWxSb290VXJsIiwid2luZG93IiwiaGlzdG9yeSIsInJlcGxhY2VTdGF0ZSIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJ0b29sdGlwQ29uZmlncyIsImhlYWRlciIsInRmX0NhbFVybFRvb2x0aXBfaGVhZGVyIiwidGZfQ2FsVXJsVG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJ0Zl9DYWxVcmxUb29sdGlwX2NhbGRhdl9oZWFkZXIiLCJkZWZpbml0aW9uIiwidGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfZ29vZ2xlIiwidGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfbmV4dGNsb3VkIiwidGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfeWFuZGV4IiwibGlzdDIiLCJ0Zl9DYWxVcmxUb29sdGlwX2ljYWxlbmRhcl9oZWFkZXIiLCJ0Zl9DYWxVcmxUb29sdGlwX2ljYWxlbmRhcl9kZXNjIiwiZXhhbXBsZXMiLCJ0Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVfZ29vZ2xlIiwidGZfQ2FsVXJsVG9vbHRpcF9leGFtcGxlX25leHRjbG91ZCIsInRmX0NhbFVybFRvb2x0aXBfZXhhbXBsZV9pY3MiLCJleGFtcGxlc0hlYWRlciIsInRmX0NhbFVybFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwidGZfQ2FsVXJsVG9vbHRpcF9ub3RlIiwiVG9vbHRpcEJ1aWxkZXIiLCJmbiIsImN1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlIiwiY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUiLCJVUkwiLCJfIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG1CQUFtQixHQUFHO0FBQ3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHVCQUFELENBTGE7O0FBT3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQVhjO0FBV1I7O0FBRWhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxJQWpCWTtBQW1CeEI7QUFDQUMsRUFBQUEsVUFBVSxFQUFFSCxDQUFDLENBQUMsWUFBRCxDQXBCVztBQXFCeEJJLEVBQUFBLFFBQVEsRUFBRUosQ0FBQyxDQUFDLFVBQUQsQ0FyQmE7QUFzQnhCSyxFQUFBQSxXQUFXLEVBQUVMLENBQUMsQ0FBQyxnQkFBRCxDQXRCVTtBQXdCeEI7QUFDQU0sRUFBQUEsUUFBUSxFQUFFTixDQUFDLENBQUMsS0FBRCxDQXpCYTtBQTBCeEJPLEVBQUFBLGlCQUFpQixFQUFFUCxDQUFDLENBQUMsZUFBRCxDQTFCSTtBQTJCeEJRLEVBQUFBLGVBQWUsRUFBRVIsQ0FBQyxDQUFDLGFBQUQsQ0EzQk07QUE0QnhCUyxFQUFBQSxZQUFZLEVBQUVULENBQUMsQ0FBQyxTQUFELENBNUJTO0FBNkJ4QlUsRUFBQUEsYUFBYSxFQUFFVixDQUFDLENBQUMsVUFBRCxDQTdCUTtBQThCeEJXLEVBQUFBLGVBQWUsRUFBRVgsQ0FBQyxDQUFDLFlBQUQsQ0E5Qk07QUErQnhCWSxFQUFBQSxzQkFBc0IsRUFBRVosQ0FBQyxD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bUIsQ0FBQ1csWUFBcEIsQ0FBaUMrQyxHQUFqQyxPQUEyQ3FFLE1BQXJFLEVBQTZFO0FBQ3pFLFdBQU8sS0FBUDtBQUNIOztBQUNELFNBQU8sSUFBUDtBQUNILENBTEQ7QUFPQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0E3SCxDQUFDLENBQUN5UyxFQUFGLENBQUt4TCxJQUFMLENBQVU2SSxRQUFWLENBQW1CaE4sS0FBbkIsQ0FBeUI2UCx1QkFBekIsR0FBbUQsVUFBU3BRLEtBQVQsRUFBZ0I7QUFDL0QsTUFBTStFLE9BQU8sR0FBR3hILG1CQUFtQixDQUFDWSxhQUFwQixDQUFrQzhDLEdBQWxDLEVBQWhCLENBRCtELENBRy9EOztBQUNBLE1BQUksQ0FBQzhELE9BQUQsSUFBWUEsT0FBTyxLQUFLLFdBQXhCLElBQXVDQSxPQUFPLEtBQUssTUFBdkQsRUFBK0Q7QUFDM0QsV0FBTyxJQUFQO0FBQ0gsR0FOOEQsQ0FRL0Q7OztBQUNBLE1BQUksQ0FBQy9FLEtBQUQsSUFBVUEsS0FBSyxDQUFDa0wsTUFBTixLQUFpQixDQUEvQixFQUFrQztBQUM5QixXQUFPLEtBQVA7QUFDSCxHQVg4RCxDQWEvRDs7O0FBQ0EsTUFBSTtBQUNBLFFBQUltRixHQUFKLENBQVFyUSxLQUFSO0FBQ0EsV0FBTyxJQUFQO0FBQ0gsR0FIRCxDQUdFLE9BQU9zUSxDQUFQLEVBQVU7QUFDUixXQUFPLEtBQVA7QUFDSDtBQUNKLENBcEJELEMsQ0FzQkE7OztBQUNBN1MsQ0FBQyxDQUFDd0wsUUFBRCxDQUFELENBQVlzSCxLQUFaLENBQWtCLFlBQU07QUFDcEJoVCxFQUFBQSxtQkFBbUIsQ0FBQ3lELFVBQXBCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkIGdsb2JhbFJvb3RVcmwgRXh0ZW5zaW9ucyBtb21lbnQgRm9ybSBnbG9iYWxUcmFuc2xhdGUgXG4gICBTZW1hbnRpY0xvY2FsaXphdGlvbiBTb3VuZEZpbGVTZWxlY3RvciBVc2VyTWVzc2FnZSBTZWN1cml0eVV0aWxzXG4gICBJbmNvbWluZ1JvdXRlc0FQSSBPdXRXb3JrVGltZXNBUEkgKi9cblxuLyoqXG4gKiBNb2R1bGUgZm9yIG1hbmFnaW5nIG91dC1vZi13b3JrIHRpbWUgc2V0dGluZ3NcbiAqIFxuICogVGhpcyBtb2R1bGUgaGFuZGxlcyB0aGUgZm9ybSBmb3IgY3JlYXRpbmcgYW5kIGVkaXRpbmcgb3V0LW9mLXdvcmsgdGltZSBjb25kaXRpb25zLlxuICogSXQgdXNlcyBhIHVuaWZpZWQgUkVTVCBBUEkgYXBwcm9hY2ggbWF0Y2hpbmcgdGhlIGluY29taW5nIHJvdXRlcyBwYXR0ZXJuLlxuICogXG4gKiBAbW9kdWxlIG91dE9mV29ya1RpbWVSZWNvcmRcbiAqL1xuY29uc3Qgb3V0T2ZXb3JrVGltZVJlY29yZCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIFJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcmVjb3JkSWQ6IG51bGwsIC8vIFdpbGwgYmUgc2V0IGluIGluaXRpYWxpemUoKVxuICAgIFxuICAgIC8qKlxuICAgICAqIFN0b3JlIGxvYWRlZCByZWNvcmQgZGF0YVxuICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgKi9cbiAgICByZWNvcmREYXRhOiBudWxsLFxuXG4gICAgLy8gRm9ybSBmaWVsZCBqUXVlcnkgb2JqZWN0c1xuICAgICR0aW1lX2Zyb206ICQoJyN0aW1lX2Zyb20nKSxcbiAgICAkdGltZV90bzogJCgnI3RpbWVfdG8nKSxcbiAgICAkcnVsZXNUYWJsZTogJCgnI3JvdXRpbmctdGFibGUnKSxcbiAgICBcbiAgICAvLyBIaWRkZW4gaW5wdXQgZmllbGRzXG4gICAgJGlkRmllbGQ6ICQoJyNpZCcpLFxuICAgICR3ZWVrZGF5RnJvbUZpZWxkOiAkKCcjd2Vla2RheV9mcm9tJyksXG4gICAgJHdlZWtkYXlUb0ZpZWxkOiAkKCcjd2Vla2RheV90bycpLFxuICAgICRhY3Rpb25GaWVsZDogJCgnI2FjdGlvbicpLFxuICAgICRjYWxUeXBlRmllbGQ6ICQoJyNjYWxUeXBlJyksXG4gICAgJGV4dGVuc2lvbkZpZWxkOiAkKCcjZXh0ZW5zaW9uJyksXG4gICAgJGFsbG93UmVzdHJpY3Rpb25GaWVsZDogJCgnI2FsbG93UmVzdHJpY3Rpb24nKSxcbiAgICAkZGVzY3JpcHRpb25GaWVsZDogJCgnI2Rlc2NyaXB0aW9uJyksXG4gICAgXG4gICAgLy8gRHJvcGRvd24gZWxlbWVudHNcbiAgICAkYWN0aW9uRHJvcGRvd246ICQoJy5hY3Rpb24tc2VsZWN0JyksXG4gICAgJGNhbFR5cGVEcm9wZG93bjogJCgnLmNhbFR5cGUtc2VsZWN0JyksXG4gICAgJHdlZWtkYXlGcm9tRHJvcGRvd246ICQoJy53ZWVrZGF5LWZyb20tc2VsZWN0JyksXG4gICAgJHdlZWtkYXlUb0Ryb3Bkb3duOiAkKCcud2Vla2RheS10by1zZWxlY3QnKSxcbiAgICAkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duOiAkKCcuZm9yd2FyZGluZy1zZWxlY3QnKSxcbiAgICBcbiAgICAvLyBUYWIgZWxlbWVudHNcbiAgICAkdGFiTWVudTogJCgnI291dC10aW1lLW1vZGlmeS1tZW51IC5pdGVtJyksXG4gICAgJHJ1bGVzVGFiOiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgJGdlbmVyYWxUYWI6IG51bGwsIC8vIFdpbGwgYmUgaW5pdGlhbGl6ZWQgbGF0ZXJcbiAgICAkcnVsZXNUYWJTZWdtZW50OiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgJGdlbmVyYWxUYWJTZWdtZW50OiBudWxsLCAvLyBXaWxsIGJlIGluaXRpYWxpemVkIGxhdGVyXG4gICAgXG4gICAgLy8gUm93IGVsZW1lbnRzXG4gICAgJGV4dGVuc2lvblJvdzogJCgnI2V4dGVuc2lvbi1yb3cnKSxcbiAgICAkYXVkaW9NZXNzYWdlUm93OiAkKCcjYXVkaW8tbWVzc2FnZS1yb3cnKSxcbiAgICBcbiAgICAvLyBDYWxlbmRhciB0YWIgZWxlbWVudHNcbiAgICAkY2FsZW5kYXJUYWI6ICQoJyNjYWxsLXR5cGUtY2FsZW5kYXItdGFiJyksXG4gICAgJG1haW5UYWI6ICQoJyNjYWxsLXR5cGUtbWFpbi10YWInKSxcbiAgICBcbiAgICAvLyBEYXRlL3RpbWUgY2FsZW5kYXIgZWxlbWVudHNcbiAgICAkcmFuZ2VEYXlzU3RhcnQ6ICQoJyNyYW5nZS1kYXlzLXN0YXJ0JyksXG4gICAgJHJhbmdlRGF5c0VuZDogJCgnI3JhbmdlLWRheXMtZW5kJyksXG4gICAgJHJhbmdlVGltZVN0YXJ0OiAkKCcjcmFuZ2UtdGltZS1zdGFydCcpLFxuICAgICRyYW5nZVRpbWVFbmQ6ICQoJyNyYW5nZS10aW1lLWVuZCcpLFxuICAgIFxuICAgIC8vIEVyYXNlIGJ1dHRvbnNcbiAgICAkZXJhc2VEYXRlc0J0bjogJCgnI2VyYXNlLWRhdGVzJyksXG4gICAgJGVyYXNlV2Vla2RheXNCdG46ICQoJyNlcmFzZS13ZWVrZGF5cycpLFxuICAgICRlcmFzZVRpbWVwZXJpb2RCdG46ICQoJyNlcmFzZS10aW1lcGVyaW9kJyksXG4gICAgXG4gICAgLy8gRXJyb3IgbWVzc2FnZSBlbGVtZW50XG4gICAgJGVycm9yTWVzc2FnZTogJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKSxcbiAgICBcbiAgICAvLyBBdWRpbyBtZXNzYWdlIElEIGZvciBzb3VuZCBmaWxlIHNlbGVjdG9yXG4gICAgYXVkaW9NZXNzYWdlSWQ6ICdhdWRpb19tZXNzYWdlX2lkJyxcblxuICAgIC8qKlxuICAgICAqIEFkZGl0aW9uYWwgdGltZSBpbnRlcnZhbCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICogQHR5cGUge2FycmF5fVxuICAgICAqL1xuICAgIGFkZGl0aW9uYWxUaW1lSW50ZXJ2YWxSdWxlczogW3tcbiAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgIHZhbHVlOiAvXihbMDFdP1swLTldfDJbMC0zXSk6KFswLTVdP1swLTldKSQvLFxuICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgIH1dLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlW2V4dGVuc2lvbl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBhdWRpb19tZXNzYWdlX2lkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnYXVkaW9fbWVzc2FnZV9pZCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlW3BsYXltZXNzYWdlXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQXVkaW9NZXNzYWdlRW1wdHlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIGNhbFVybDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NhbFVybCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZDYWxUeXBlJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDYWxVcmlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVmcm9tOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX2Zyb20nLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKFswMV0/WzAtOV18MlswLTNdKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWV0bzoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVfdG8nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogL14oWzAxXT9bMC05XXwyWzAtM10pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgICAgICAgICAgfV1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTZXQgcmVjb3JkIElEIGZyb20gRE9NXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkSWQgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRpZEZpZWxkLnZhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgcmVmZXJlbmNlcyB0aGF0IGRlcGVuZCBvbiBET01cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWIgPSAkKCcjb3V0LXRpbWUtbW9kaWZ5LW1lbnUgLml0ZW1bZGF0YS10YWI9XCJydWxlc1wiXScpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRnZW5lcmFsVGFiID0gJCgnI291dC10aW1lLW1vZGlmeS1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZ2VuZXJhbFwiXScpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYlNlZ21lbnQgPSAkKCcudWkudGFiLnNlZ21lbnRbZGF0YS10YWI9XCJydWxlc1wiXScpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRnZW5lcmFsVGFiU2VnbWVudCA9ICQoJy51aS50YWIuc2VnbWVudFtkYXRhLXRhYj1cImdlbmVyYWxcIl0nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR0YWJNZW51LnRhYigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHN1Ym1pc3Npb24gaGFuZGxpbmdcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjb21wb25lbnRzIHRoYXQgZG9uJ3QgZGVwZW5kIG9uIGRhdGFcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplQ2FsZW5kYXJzKCk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZVJvdXRpbmdUYWJsZSgpO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVFcmFzZXJzKCk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZURlc2NyaXB0aW9uRmllbGQoKTtcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplVG9vbHRpcHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZGF0YSBhbmQgaW5pdGlhbGl6ZSBkcm9wZG93bnNcbiAgICAgICAgLy8gVGhpcyB1bmlmaWVkIGFwcHJvYWNoIGxvYWRzIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyBvciBleGlzdGluZyBkYXRhXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZEZvcm1EYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKiBVbmlmaWVkIGFwcHJvYWNoIGZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAqL1xuICAgIGxvYWRGb3JtRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSByZWNvcmRJZCBmb3IgZXhpc3RpbmcgcmVjb3JkcywgZW1wdHkgc3RyaW5nIGZvciBuZXdcbiAgICAgICAgY29uc3QgcmVjb3JkSWRUb0xvYWQgPSBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZElkIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCByZWNvcmQgZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgT3V0V29ya1RpbWVzQVBJLmdldFJlY29yZChyZWNvcmRJZFRvTG9hZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZERhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIExvYWQgcm91dGluZyBydWxlcyBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHNcbiAgICAgICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIHRoaXMgd2lsbCBzaG93IGFsbCBhdmFpbGFibGUgcm91dGVzIHVuY2hlY2tlZFxuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQubG9hZFJvdXRpbmdUYWJsZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNhdmUgaW5pdGlhbCB2YWx1ZXMgdG8gcHJldmVudCBzYXZlIGJ1dHRvbiBhY3RpdmF0aW9uXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgICAgIH0sIDI1MCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEVycm9yIGxvYWRpbmcsIGJ1dCBzdGlsbCBpbml0aWFsaXplIGVtcHR5IGZvcm1cbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVEcm9wZG93bnMoKTtcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHJvdXRpbmcgdGFibGUgZXZlbiBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmxvYWRSb3V0aW5nVGFibGUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKTtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgZHJvcGRvd25zIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgd2Vla2RheSBkcm9wZG93bnMgd2l0aCB2YWx1ZXMgbWF0Y2hpbmcgb3JpZ2luYWwgaW1wbGVtZW50YXRpb25cbiAgICAgICAgY29uc3Qgd2Vla0RheXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnLTEnLCB0ZXh0OiAnLScgfSAvLyBEZWZhdWx0IGVtcHR5IG9wdGlvblxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRheXMgMS03IHVzaW5nIHRoZSBzYW1lIGxvZ2ljIGFzIG9yaWdpbmFsIGNvbnRyb2xsZXJcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gNzsgaSsrKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgZGF0ZSBmb3IgXCJTdW5kYXkgK2kgZGF5c1wiIHRvIG1hdGNoIG9yaWdpbmFsIGxvZ2ljXG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoMjAyMCwgMCwgNSArIGkpOyAvLyBKYW4gNSwgMjAyMCB3YXMgU3VuZGF5XG4gICAgICAgICAgICBjb25zdCBkYXlOYW1lID0gZGF0ZS50b0xvY2FsZURhdGVTdHJpbmcoJ2VuJywgeyB3ZWVrZGF5OiAnc2hvcnQnIH0pO1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB0cmFuc2xhdGlvbiBmb3IgdGhlIGRheSBhYmJyZXZpYXRpb25cbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWREYXkgPSBnbG9iYWxUcmFuc2xhdGVbZGF5TmFtZV0gfHwgZGF5TmFtZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgd2Vla0RheXMucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogdHJhbnNsYXRlZERheSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHRleHQ6IHRyYW5zbGF0ZWREYXlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIHZhbHVlczogd2Vla0RheXMsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheUZyb21GaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICB2YWx1ZXM6IHdlZWtEYXlzLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlUb0ZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFjdGlvbkZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkFjdGlvbkNoYW5nZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2FsZW5kYXIgdHlwZSBkcm9wZG93blxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kY2FsVHlwZUZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5vbkNhbFR5cGVDaGFuZ2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGV4dGVuc2lvbiBkcm9wZG93biB1c2luZyByb3V0aW5nIHNldHRpbmdzXG4gICAgICAgIGNvbnN0IGV4dGVuc2lvblNldHRpbmdzID0gRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZygpO1xuICAgICAgICBleHRlbnNpb25TZXR0aW5ncy5vbkNoYW5nZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRleHRlbnNpb25GaWVsZC52YWwodmFsdWUpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmRyb3Bkb3duKCdkZXN0cm95Jyk7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bi5kcm9wZG93bihleHRlbnNpb25TZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JcbiAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuaW5pdChvdXRPZldvcmtUaW1lUmVjb3JkLmF1ZGlvTWVzc2FnZUlkLCB7XG4gICAgICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgICAgICAgICBpbmNsdWRlRW1wdHk6IHRydWUsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUmVjb3JkIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTZXQgYmFzaWMgZm9ybSB2YWx1ZXMgLSBhbGwgZGVmYXVsdHMgY29tZSBmcm9tIFJFU1QgQVBJXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgdW5pcWlkOiBkYXRhLnVuaXFpZCxcbiAgICAgICAgICAgIHByaW9yaXR5OiBkYXRhLnByaW9yaXR5LFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICBjYWxUeXBlOiBkYXRhLmNhbFR5cGUsXG4gICAgICAgICAgICB3ZWVrZGF5X2Zyb206IGRhdGEud2Vla2RheV9mcm9tLFxuICAgICAgICAgICAgd2Vla2RheV90bzogZGF0YS53ZWVrZGF5X3RvLFxuICAgICAgICAgICAgdGltZV9mcm9tOiBkYXRhLnRpbWVfZnJvbSxcbiAgICAgICAgICAgIHRpbWVfdG86IGRhdGEudGltZV90byxcbiAgICAgICAgICAgIGNhbFVybDogZGF0YS5jYWxVcmwsXG4gICAgICAgICAgICBjYWxVc2VyOiBkYXRhLmNhbFVzZXIsXG4gICAgICAgICAgICBjYWxTZWNyZXQ6IGRhdGEuY2FsU2VjcmV0LFxuICAgICAgICAgICAgYWN0aW9uOiBkYXRhLmFjdGlvbixcbiAgICAgICAgICAgIGV4dGVuc2lvbjogZGF0YS5leHRlbnNpb24sXG4gICAgICAgICAgICBhdWRpb19tZXNzYWdlX2lkOiBkYXRhLmF1ZGlvX21lc3NhZ2VfaWQsXG4gICAgICAgICAgICBhbGxvd1Jlc3RyaWN0aW9uOiBkYXRhLmFsbG93UmVzdHJpY3Rpb25cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgcGFzc3dvcmQgZmllbGQgcGxhY2Vob2xkZXJcbiAgICAgICAgY29uc3QgJGNhbFNlY3JldEZpZWxkID0gJCgnI2NhbFNlY3JldCcpO1xuICAgICAgICBpZiAoZGF0YS5jYWxTZWNyZXQgPT09ICdYWFhYWFgnKSB7XG4gICAgICAgICAgICAvLyBQYXNzd29yZCBleGlzdHMgYnV0IGlzIG1hc2tlZCwgc2hvdyBwbGFjZWhvbGRlclxuICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmF0dHIoJ3BsYWNlaG9sZGVyJywgZ2xvYmFsVHJhbnNsYXRlLnRmX1Bhc3N3b3JkTWFza2VkIHx8ICdQYXNzd29yZCBzYXZlZCAoZW50ZXIgbmV3IHRvIGNoYW5nZSknKTtcbiAgICAgICAgICAgIC8vIFN0b3JlIG9yaWdpbmFsIG1hc2tlZCBzdGF0ZSB0byBkZXRlY3QgY2hhbmdlc1xuICAgICAgICAgICAgJGNhbFNlY3JldEZpZWxkLmRhdGEoJ29yaWdpbmFsTWFza2VkJywgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkY2FsU2VjcmV0RmllbGQuYXR0cigncGxhY2Vob2xkZXInLCBnbG9iYWxUcmFuc2xhdGUudGZfRW50ZXJQYXNzd29yZCB8fCAnRW50ZXIgcGFzc3dvcmQnKTtcbiAgICAgICAgICAgICRjYWxTZWNyZXRGaWVsZC5kYXRhKCdvcmlnaW5hbE1hc2tlZCcsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnNcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRHJvcGRvd25zKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgZHJvcGRvd24gdmFsdWVzIGFmdGVyIGluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIFNldCBhY3Rpb24gZHJvcGRvd25cbiAgICAgICAgaWYgKGRhdGEuYWN0aW9uKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhY3Rpb25Ecm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS5hY3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgY2FsVHlwZSBkcm9wZG93blxuICAgICAgICBpZiAoZGF0YS5jYWxUeXBlKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEuY2FsVHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB3ZWVrZGF5IGRyb3Bkb3duc1xuICAgICAgICBpZiAoZGF0YS53ZWVrZGF5X2Zyb20pIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHdlZWtkYXlGcm9tRHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEud2Vla2RheV9mcm9tKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS53ZWVrZGF5X3RvKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5VG9Ecm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZGF0YS53ZWVrZGF5X3RvKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGRhdGVzIGlmIHByZXNlbnRcbiAgICAgICAgaWYgKGRhdGEuZGF0ZV9mcm9tKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnNldERhdGVGcm9tVGltZXN0YW1wKGRhdGEuZGF0ZV9mcm9tLCAnI3JhbmdlLWRheXMtc3RhcnQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5kYXRlX3RvKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnNldERhdGVGcm9tVGltZXN0YW1wKGRhdGEuZGF0ZV90bywgJyNyYW5nZS1kYXlzLWVuZCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgZXh0ZW5zaW9uIHZhbHVlIGFuZCBkaXNwbGF5IHRleHQgaWYgZXhpc3RzXG4gICAgICAgIGlmIChkYXRhLmV4dGVuc2lvbikge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBkYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGRpc3BsYXkgdGV4dCBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5leHRlbnNpb25SZXByZXNlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQoZGF0YS5leHRlbnNpb25SZXByZXNlbnQpO1xuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd24uZmluZCgnLnRleHQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkZWZhdWx0JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5odG1sKHNhZmVUZXh0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTZXR1cCBhdWRpbyBtZXNzYWdlIHZhbHVlXG4gICAgICAgIGlmIChkYXRhLmF1ZGlvX21lc3NhZ2VfaWQpIHtcbiAgICAgICAgICAgIFNvdW5kRmlsZVNlbGVjdG9yLnNldFZhbHVlKG91dE9mV29ya1RpbWVSZWNvcmQuYXVkaW9NZXNzYWdlSWQsIGRhdGEuYXVkaW9fbWVzc2FnZV9pZCwgZGF0YS5hdWRpb19tZXNzYWdlX2lkX1JlcHJlc2VudCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBmaWVsZCB2aXNpYmlsaXR5IGJhc2VkIG9uIGFjdGlvblxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLm9uQWN0aW9uQ2hhbmdlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY2FsZW5kYXIgdHlwZSB2aXNpYmlsaXR5XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQub25DYWxUeXBlQ2hhbmdlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgcnVsZXMgdGFiIHZpc2liaWxpdHkgYmFzZWQgb24gYWxsb3dSZXN0cmljdGlvblxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnRvZ2dsZVJ1bGVzVGFiKGRhdGEuYWxsb3dSZXN0cmljdGlvbik7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGFjdGlvbiBkcm9wZG93biBjaGFuZ2VcbiAgICAgKi9cbiAgICBvbkFjdGlvbkNoYW5nZSgpIHtcbiAgICAgICAgY29uc3QgYWN0aW9uID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYWN0aW9uJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYWN0aW9uID09PSAnZXh0ZW5zaW9uJykge1xuICAgICAgICAgICAgLy8gU2hvdyBleHRlbnNpb24sIGhpZGUgYXVkaW9cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGV4dGVuc2lvblJvdy5zaG93KCk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRhdWRpb01lc3NhZ2VSb3cuaGlkZSgpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgYXVkaW8gbWVzc2FnZVxuICAgICAgICAgICAgU291bmRGaWxlU2VsZWN0b3IuY2xlYXIob3V0T2ZXb3JrVGltZVJlY29yZC5hdWRpb01lc3NhZ2VJZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoYWN0aW9uID09PSAncGxheW1lc3NhZ2UnKSB7XG4gICAgICAgICAgICAvLyBTaG93IGF1ZGlvLCBoaWRlIGV4dGVuc2lvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXh0ZW5zaW9uUm93LmhpZGUoKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGF1ZGlvTWVzc2FnZVJvdy5zaG93KCk7XG4gICAgICAgICAgICAvLyBDbGVhciBleHRlbnNpb25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGV4dGVuc2lvbkZpZWxkLnZhbCgnJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBjYWxlbmRhciB0eXBlIGNoYW5nZVxuICAgICAqL1xuICAgIG9uQ2FsVHlwZUNoYW5nZSgpIHtcbiAgICAgICAgY29uc3QgY2FsVHlwZSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2NhbFR5cGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vICd0aW1lZnJhbWUnIGFuZCBlbXB0eSBzdHJpbmcgbWVhbiB0aW1lLWJhc2VkIGNvbmRpdGlvbnMgKHNob3cgbWFpbiB0YWIpXG4gICAgICAgIGlmICghY2FsVHlwZSB8fCBjYWxUeXBlID09PSAndGltZWZyYW1lJyB8fCBjYWxUeXBlID09PSAnJykge1xuICAgICAgICAgICAgLy8gU2hvdyBtYWluIHRpbWUvZGF0ZSBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxlbmRhclRhYi5oaWRlKCk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRtYWluVGFiLnNob3coKTtcbiAgICAgICAgfSBlbHNlIGlmIChjYWxUeXBlID09PSAnQ0FMREFWJyB8fCBjYWxUeXBlID09PSAnSUNBTCcpIHtcbiAgICAgICAgICAgIC8vIFNob3cgY2FsZW5kYXIgVVJMIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGNhbGVuZGFyVGFiLnNob3coKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJG1haW5UYWIuaGlkZSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNhbGVuZGFycyBmb3IgZGF0ZSBhbmQgdGltZSBzZWxlY3Rpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ2FsZW5kYXJzKCkge1xuICAgICAgICAvLyBEYXRlIHJhbmdlIGNhbGVuZGFyc1xuICAgICAgICAvLyBVc2UgY2xhc3MgdmFyaWFibGVzIGZvciBjYWxlbmRhcnNcbiAgICAgICAgXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKHtcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgZW5kQ2FsZW5kYXI6IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZCxcbiAgICAgICAgICAgIHR5cGU6ICdkYXRlJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcih7XG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIHN0YXJ0Q2FsZW5kYXI6IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LFxuICAgICAgICAgICAgdHlwZTogJ2RhdGUnLFxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIG1vbnRoRmlyc3Q6IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVGltZSByYW5nZSBjYWxlbmRhcnNcbiAgICAgICAgLy8gVXNlIGNsYXNzIHZhcmlhYmxlcyBmb3IgdGltZSBjYWxlbmRhcnNcbiAgICAgICAgXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZVN0YXJ0LmNhbGVuZGFyKHtcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgZW5kQ2FsZW5kYXI6IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZUVuZCxcbiAgICAgICAgICAgIHR5cGU6ICd0aW1lJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBkaXNhYmxlTWludXRlOiBmYWxzZSxcbiAgICAgICAgICAgIG1vbnRoRmlyc3Q6IGZhbHNlLFxuICAgICAgICAgICAgYW1wbTogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBzdGFydENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVTdGFydCxcbiAgICAgICAgICAgIHR5cGU6ICd0aW1lJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByb3V0aW5nIHRhYmxlIGFuZCBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJvdXRpbmdUYWJsZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGFsbG93UmVzdHJpY3Rpb25GaWVsZC5wYXJlbnQoKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kYWxsb3dSZXN0cmljdGlvbkZpZWxkLnBhcmVudCgpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC50b2dnbGVSdWxlc1RhYihpc0NoZWNrZWQpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGV4aXN0aW5nIGNoZWNrYm94ZXMgaW4gdGFibGVcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCcudWkuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHJ1bGVzIHRhYiB2aXNpYmlsaXR5XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0NoZWNrZWQgLSBXaGV0aGVyIHRvIHNob3cgcnVsZXMgdGFiXG4gICAgICovXG4gICAgdG9nZ2xlUnVsZXNUYWIoaXNDaGVja2VkKSB7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYi5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYi5oaWRlKCk7XG4gICAgICAgICAgICAvLyBTd2l0Y2ggdG8gZ2VuZXJhbCB0YWIgaWYgcnVsZXMgdGFiIHdhcyBhY3RpdmVcbiAgICAgICAgICAgIGlmIChvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYi5oYXNDbGFzcygnYWN0aXZlJykpIHtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYi5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJTZWdtZW50LnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRnZW5lcmFsVGFiLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRnZW5lcmFsVGFiU2VnbWVudC5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcm91dGluZyB0YWJsZSB3aXRoIGluY29taW5nIHJvdXRlc1xuICAgICAqL1xuICAgIGxvYWRSb3V0aW5nVGFibGUoKSB7XG4gICAgICAgIC8vIENsZWFyIHRhYmxlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgndGJvZHknKS5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGFzc29jaWF0ZWQgSURzIGZyb20gcmVjb3JkIGRhdGFcbiAgICAgICAgY29uc3QgYXNzb2NpYXRlZElkcyA9IG91dE9mV29ya1RpbWVSZWNvcmQucmVjb3JkRGF0YT8uaW5jb21pbmdSb3V0ZUlkcyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgYWxsIGF2YWlsYWJsZSByb3V0ZXMgZnJvbSBJbmNvbWluZ1JvdXRlc0FQSVxuICAgICAgICBJbmNvbWluZ1JvdXRlc0FQSS5nZXRMaXN0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gR3JvdXAgYW5kIHNvcnQgcm91dGVzXG4gICAgICAgICAgICAgICAgY29uc3QgZ3JvdXBlZFJvdXRlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQuZ3JvdXBBbmRTb3J0Um91dGVzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlbmRlciBncm91cGVkIHJvdXRlc1xuICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQucmVuZGVyR3JvdXBlZFJvdXRlcyhncm91cGVkUm91dGVzLCBhc3NvY2lhdGVkSWRzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGNvbXBvbmVudHMgd2l0aCBncm91cGVkIGNoZWNrYm94IGxvZ2ljXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplUm91dGluZ0NoZWNrYm94ZXMoKTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJ1tkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5zaG93RW1wdHlSb3V0ZXNNZXNzYWdlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR3JvdXAgYW5kIHNvcnQgcm91dGVzIGJ5IHByb3ZpZGVyIGFuZCBESURcbiAgICAgKiBAcGFyYW0ge0FycmF5fSByb3V0ZXMgLSBBcnJheSBvZiByb3V0ZSBvYmplY3RzXG4gICAgICogQHJldHVybnMge09iamVjdH0gR3JvdXBlZCByb3V0ZXNcbiAgICAgKi9cbiAgICBncm91cEFuZFNvcnRSb3V0ZXMocm91dGVzKSB7XG4gICAgICAgIGNvbnN0IGdyb3VwcyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gU2tpcCBkZWZhdWx0IHJvdXRlIGFuZCBncm91cCBieSBwcm92aWRlclxuICAgICAgICByb3V0ZXMuZm9yRWFjaCgocm91dGUpID0+IHtcbiAgICAgICAgICAgIGlmIChyb3V0ZS5pZCA9PT0gMSB8fCByb3V0ZS5pZCA9PT0gJzEnKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSByb3V0ZS5wcm92aWRlciB8fCAnbm9uZSc7XG4gICAgICAgICAgICBpZiAoIWdyb3Vwc1twcm92aWRlcklkXSkge1xuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgcGxhaW4gdGV4dCBwcm92aWRlciBuYW1lIGZyb20gSFRNTCBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBsZXQgcHJvdmlkZXJOYW1lID0gcm91dGUucHJvdmlkZXJSZXByZXNlbnQgfHwgZ2xvYmFsVHJhbnNsYXRlLmlyX05vQXNzaWduZWRQcm92aWRlciB8fCAnRGlyZWN0IGNhbGxzJztcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgSFRNTCB0YWdzIHRvIGdldCBjbGVhbiBwcm92aWRlciBuYW1lIGZvciBkaXNwbGF5XG4gICAgICAgICAgICAgICAgY29uc3QgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgIHRlbXBEaXYuaW5uZXJIVE1MID0gcHJvdmlkZXJOYW1lO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuUHJvdmlkZXJOYW1lID0gdGVtcERpdi50ZXh0Q29udGVudCB8fCB0ZW1wRGl2LmlubmVyVGV4dCB8fCBwcm92aWRlck5hbWU7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdID0ge1xuICAgICAgICAgICAgICAgICAgICBwcm92aWRlcklkOiBwcm92aWRlcklkLCAgLy8gU3RvcmUgYWN0dWFsIHByb3ZpZGVyIElEXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTmFtZTogY2xlYW5Qcm92aWRlck5hbWUsICAvLyBDbGVhbiBuYW1lIGZvciBkaXNwbGF5XG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTmFtZUh0bWw6IHJvdXRlLnByb3ZpZGVyUmVwcmVzZW50IHx8IHByb3ZpZGVyTmFtZSwgIC8vIE9yaWdpbmFsIEhUTUwgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyRGlzYWJsZWQ6IHJvdXRlLnByb3ZpZGVyRGlzYWJsZWQgfHwgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxSdWxlczogW10sXG4gICAgICAgICAgICAgICAgICAgIHNwZWNpZmljUnVsZXM6IHt9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2VwYXJhdGUgZ2VuZXJhbCBydWxlcyAobm8gRElEKSBmcm9tIHNwZWNpZmljIHJ1bGVzICh3aXRoIERJRClcbiAgICAgICAgICAgIGlmICghcm91dGUubnVtYmVyIHx8IHJvdXRlLm51bWJlciA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0uZ2VuZXJhbFJ1bGVzLnB1c2gocm91dGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIWdyb3Vwc1twcm92aWRlcklkXS5zcGVjaWZpY1J1bGVzW3JvdXRlLm51bWJlcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLnNwZWNpZmljUnVsZXNbcm91dGUubnVtYmVyXSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlc1tyb3V0ZS5udW1iZXJdLnB1c2gocm91dGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNvcnQgcnVsZXMgd2l0aGluIGVhY2ggZ3JvdXAgYnkgcHJpb3JpdHlcbiAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBzKS5mb3JFYWNoKHByb3ZpZGVySWQgPT4ge1xuICAgICAgICAgICAgZ3JvdXBzW3Byb3ZpZGVySWRdLmdlbmVyYWxSdWxlcy5zb3J0KChhLCBiKSA9PiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eSk7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhncm91cHNbcHJvdmlkZXJJZF0uc3BlY2lmaWNSdWxlcykuZm9yRWFjaChkaWQgPT4ge1xuICAgICAgICAgICAgICAgIGdyb3Vwc1twcm92aWRlcklkXS5zcGVjaWZpY1J1bGVzW2RpZF0uc29ydCgoYSwgYikgPT4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGdyb3VwcztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciBncm91cGVkIHJvdXRlcyBpbiB0aGUgdGFibGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZ3JvdXBlZFJvdXRlcyAtIEdyb3VwZWQgcm91dGVzIG9iamVjdFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFzc29jaWF0ZWRJZHMgLSBBcnJheSBvZiBhc3NvY2lhdGVkIHJvdXRlIElEc1xuICAgICAqL1xuICAgIHJlbmRlckdyb3VwZWRSb3V0ZXMoZ3JvdXBlZFJvdXRlcywgYXNzb2NpYXRlZElkcykge1xuICAgICAgICBjb25zdCB0Ym9keSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgndGJvZHknKTtcbiAgICAgICAgbGV0IGlzRmlyc3RHcm91cCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICBPYmplY3Qua2V5cyhncm91cGVkUm91dGVzKS5mb3JFYWNoKHByb3ZpZGVySWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgZ3JvdXAgPSBncm91cGVkUm91dGVzW3Byb3ZpZGVySWRdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgcHJvdmlkZXIgZ3JvdXAgaGVhZGVyXG4gICAgICAgICAgICBpZiAoIWlzRmlyc3RHcm91cCkge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBzZXBhcmF0b3IgYmV0d2VlbiBncm91cHNcbiAgICAgICAgICAgICAgICB0Ym9keS5hcHBlbmQoJzx0ciBjbGFzcz1cInByb3ZpZGVyLXNlcGFyYXRvclwiPjx0ZCBjb2xzcGFuPVwiM1wiPjxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+PC90ZD48L3RyPicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaXNGaXJzdEdyb3VwID0gZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBwcm92aWRlciBoZWFkZXIgcm93IC0gdXNlIHByb3ZpZGVyTmFtZUh0bWwgZm9yIHJpY2ggZGlzcGxheVxuICAgICAgICAgICAgdGJvZHkuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8dHIgY2xhc3M9XCJwcm92aWRlci1oZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNvbHNwYW49XCIzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtncm91cC5wcm92aWRlck5hbWVIdG1sfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dyb3VwLnByb3ZpZGVyRGlzYWJsZWQgPyAnPHNwYW4gY2xhc3M9XCJ1aSBtaW5pIHJlZCBsYWJlbFwiPkRpc2FibGVkPC9zcGFuPicgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVuZGVyIGdlbmVyYWwgcnVsZXMgZmlyc3RcbiAgICAgICAgICAgIGdyb3VwLmdlbmVyYWxSdWxlcy5mb3JFYWNoKChyb3V0ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IG91dE9mV29ya1RpbWVSZWNvcmQuY3JlYXRlUm91dGVSb3cocm91dGUsIGFzc29jaWF0ZWRJZHMsICdydWxlLWdlbmVyYWwnKTtcbiAgICAgICAgICAgICAgICB0Ym9keS5hcHBlbmQocm93KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW5kZXIgc3BlY2lmaWMgcnVsZXMgZ3JvdXBlZCBieSBESURcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGdyb3VwLnNwZWNpZmljUnVsZXMpLnNvcnQoKS5mb3JFYWNoKGRpZCA9PiB7XG4gICAgICAgICAgICAgICAgZ3JvdXAuc3BlY2lmaWNSdWxlc1tkaWRdLmZvckVhY2goKHJvdXRlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0ZpcnN0SW5ESUQgPSBpbmRleCA9PT0gMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jcmVhdGVSb3V0ZVJvdyhyb3V0ZSwgYXNzb2NpYXRlZElkcywgJ3J1bGUtc3BlY2lmaWMnLCBpc0ZpcnN0SW5ESUQpO1xuICAgICAgICAgICAgICAgICAgICB0Ym9keS5hcHBlbmQocm93KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHNpbmdsZSByb3V0ZSByb3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcm91dGUgLSBSb3V0ZSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBhc3NvY2lhdGVkSWRzIC0gQXNzb2NpYXRlZCByb3V0ZSBJRHNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcnVsZUNsYXNzIC0gQ1NTIGNsYXNzIGZvciB0aGUgcnVsZSB0eXBlXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBzaG93RElESW5kaWNhdG9yIC0gV2hldGhlciB0byBzaG93IERJRCBpbmRpY2F0b3JcbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBIVE1MIHJvd1xuICAgICAqL1xuICAgIGNyZWF0ZVJvdXRlUm93KHJvdXRlLCBhc3NvY2lhdGVkSWRzLCBydWxlQ2xhc3MgPSAnJywgc2hvd0RJREluZGljYXRvciA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IGFzc29jaWF0ZWRJZHMuaW5jbHVkZXMocGFyc2VJbnQocm91dGUuaWQpKTtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJEaXNhYmxlZCA9IHJvdXRlLnByb3ZpZGVyRGlzYWJsZWQgPyAnZGlzYWJsZWQnIDogJyc7XG4gICAgICAgIGxldCBydWxlRGVzY3JpcHRpb24gPSByb3V0ZS5ydWxlUmVwcmVzZW50IHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5zdXJlIHByb3ZpZGVyIElEIGlzIGNsZWFuIChubyBIVE1MKVxuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gcm91dGUucHJvdmlkZXIgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgdmlzdWFsIGluZGljYXRvcnMgZm9yIHJ1bGUgdHlwZVxuICAgICAgICBpZiAocnVsZUNsYXNzID09PSAncnVsZS1zcGVjaWZpYycpIHtcbiAgICAgICAgICAgIC8vIEFkZCBpbmRlbnQgYW5kIGFycm93IGZvciBzcGVjaWZpYyBydWxlc1xuICAgICAgICAgICAgcnVsZURlc2NyaXB0aW9uID0gYDxzcGFuIGNsYXNzPVwicnVsZS1pbmRlbnRcIj7ihrM8L3NwYW4+ICR7cnVsZURlc2NyaXB0aW9ufWA7XG4gICAgICAgIH0gZWxzZSBpZiAocnVsZUNsYXNzID09PSAncnVsZS1nZW5lcmFsJykge1xuICAgICAgICAgICAgLy8gQWRkIGljb24gZm9yIGdlbmVyYWwgcnVsZXNcbiAgICAgICAgICAgIHJ1bGVEZXNjcmlwdGlvbiA9IGA8aSBjbGFzcz1cInJhbmRvbSBpY29uXCI+PC9pPiAke3J1bGVEZXNjcmlwdGlvbn1gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBub3RlRGlzcGxheSA9IHJvdXRlLm5vdGUgJiYgcm91dGUubm90ZS5sZW5ndGggPiAyMCA/IFxuICAgICAgICAgICAgYDxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvblwiIGRhdGEtY29udGVudD1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJvdXRlLm5vdGUpfVwiIGRhdGEtdmFyaWF0aW9uPVwid2lkZVwiIGRhdGEtcG9zaXRpb249XCJ0b3AgcmlnaHRcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImZpbGUgdGV4dCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgPC9kaXY+YCA6IFxuICAgICAgICAgICAgU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJvdXRlLm5vdGUgfHwgJycpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGF0YSBhdHRyaWJ1dGVzIGFscmVhZHkgc2FmZSBmcm9tIEFQSVxuICAgICAgICBjb25zdCBzYWZlUHJvdmlkZXJJZCA9IHByb3ZpZGVySWQ7XG4gICAgICAgIGNvbnN0IHNhZmVEaWQgPSByb3V0ZS5udW1iZXIgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPHRyIGNsYXNzPVwicnVsZS1yb3cgJHtydWxlQ2xhc3N9XCIgaWQ9XCIke3JvdXRlLmlkfVwiIFxuICAgICAgICAgICAgICAgIGRhdGEtcHJvdmlkZXI9XCIke3NhZmVQcm92aWRlcklkfVwiIFxuICAgICAgICAgICAgICAgIGRhdGEtZGlkPVwiJHtzYWZlRGlkfVwiPlxuICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cImNvbGxhcHNpbmdcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGZpdHRlZCB0b2dnbGUgY2hlY2tib3hcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWRpZD1cIiR7c2FmZURpZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXByb3ZpZGVyPVwieyR7c2FmZVByb3ZpZGVySWR9fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiICR7aXNDaGVja2VkID8gJ2NoZWNrZWQnIDogJyd9IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJyb3V0ZS0ke3JvdXRlLmlkfVwiIGRhdGEtdmFsdWU9XCIke3JvdXRlLmlkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPjwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiJHtwcm92aWRlckRpc2FibGVkfVwiPlxuICAgICAgICAgICAgICAgICAgICAke3J1bGVEZXNjcmlwdGlvbiB8fCAnPHNwYW4gY2xhc3M9XCJ0ZXh0LW11dGVkXCI+Tm8gZGVzY3JpcHRpb248L3NwYW4+J31cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cImhpZGUtb24tbW9iaWxlXCI+XG4gICAgICAgICAgICAgICAgICAgICR7bm90ZURpc3BsYXl9XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGVtcHR5IHJvdXRlcyBtZXNzYWdlIGluIHRhYmxlXG4gICAgICovXG4gICAgc2hvd0VtcHR5Um91dGVzTWVzc2FnZSgpIHtcbiAgICAgICAgY29uc3QgZW1wdHlSb3cgPSBgXG4gICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgICAgPHRkIGNvbHNwYW49XCIzXCIgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5pcl9Ob0luY29taW5nUm91dGVzIHx8ICdObyBpbmNvbWluZyByb3V0ZXMgY29uZmlndXJlZCd9XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgIGA7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJ1bGVzVGFibGUuZmluZCgndGJvZHknKS5hcHBlbmQoZW1wdHlSb3cpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByb3V0aW5nIGNoZWNrYm94ZXMgd2l0aCBncm91cGVkIGxvZ2ljXG4gICAgICogV2hlbiBjaGVja2luZy91bmNoZWNraW5nIHJ1bGVzIHdpdGggc2FtZSBwcm92aWRlciBhbmQgRElEXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJvdXRpbmdDaGVja2JveGVzKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhvdmVyIGVmZmVjdCB0byBoaWdobGlnaHQgcmVsYXRlZCBydWxlc1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLmhvdmVyKFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSAkcm93LmF0dHIoJ2RhdGEtcHJvdmlkZXInKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkaWQgPSAkcm93LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHByZXZpb3VzIGhpZ2hsaWdodHNcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy5ydWxlLXJvdycpLnJlbW92ZUNsYXNzKCdyZWxhdGVkLWhpZ2hsaWdodCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhpZ2hsaWdodCBhbGwgcnVsZXMgd2l0aCBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzZWxlY3RvciA9IGAucnVsZS1yb3dbZGF0YS1wcm92aWRlcj1cIiR7cHJvdmlkZXJ9XCJdYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGhvdmVyaW5nIG9uIHNwZWNpZmljIERJRCBydWxlLCBoaWdobGlnaHQgYWxsIHdpdGggc2FtZSBESURcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9IGBbZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgaG92ZXJpbmcgb24gZ2VuZXJhbCBydWxlLCBoaWdobGlnaHQgYWxsIGdlbmVyYWwgcnVsZXMgZm9yIHRoaXMgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yICs9ICdbZGF0YS1kaWQ9XCJcIl0nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCAkcmVsYXRlZFJvd3MgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICAkcmVsYXRlZFJvd3MuYWRkQ2xhc3MoJ3JlbGF0ZWQtaGlnaGxpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBoaWdobGlnaHRzIG9uIG1vdXNlIGxlYXZlXG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcnVsZXNUYWJsZS5maW5kKCcucnVsZS1yb3cnKS5yZW1vdmVDbGFzcygncmVsYXRlZC1oaWdobGlnaHQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3ggYmVoYXZpb3Igd2l0aCB0b29sdGlwc1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy51aS5jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgZGlkID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlciA9ICRjaGVja2JveC5hdHRyKCdkYXRhLXByb3ZpZGVyJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCB0b29sdGlwIHRvIGV4cGxhaW4gZ3JvdXBpbmdcbiAgICAgICAgICAgIGlmIChwcm92aWRlciAmJiBwcm92aWRlciAhPT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgbGV0IHRvb2x0aXBUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGRpZCkge1xuICAgICAgICAgICAgICAgICAgICB0b29sdGlwVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS50Zl9Ub29sdGlwU3BlY2lmaWNSdWxlIHx8ICdUaGlzIHJ1bGUgYXBwbGllcyB0byBjYWxscyB0byBzcGVjaWZpYyBudW1iZXIuIFJlbGF0ZWQgcnVsZXMgd2lsbCBiZSBzeW5jaHJvbml6ZWQuJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0b29sdGlwVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS50Zl9Ub29sdGlwR2VuZXJhbFJ1bGUgfHwgJ1RoaXMgcnVsZSBhcHBsaWVzIHRvIGFsbCBjYWxscyBmcm9tIHByb3ZpZGVyLiBSZWxhdGVkIHJ1bGVzIHdpbGwgYmUgc3luY2hyb25pemVkLic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICRjaGVja2JveC5hdHRyKCdkYXRhLWNvbnRlbnQnLCB0b29sdGlwVGV4dCk7XG4gICAgICAgICAgICAgICAgJGNoZWNrYm94LmF0dHIoJ2RhdGEtdmFyaWF0aW9uJywgJ3RpbnknKTtcbiAgICAgICAgICAgICAgICAkY2hlY2tib3gucG9wdXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNoZWNrYm94IGNoYW5nZSBiZWhhdmlvclxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJy51aS5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpLnBhcmVudCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICRjaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpZCA9ICRjaGVja2JveC5hdHRyKCdkYXRhLWRpZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyID0gJGNoZWNrYm94LmF0dHIoJ2RhdGEtcHJvdmlkZXInKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTa2lwIHN5bmNocm9uaXphdGlvbiBmb3IgJ25vbmUnIHByb3ZpZGVyIChkaXJlY3QgY2FsbHMpXG4gICAgICAgICAgICAgICAgaWYgKCFwcm92aWRlciB8fCBwcm92aWRlciA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGdyb3VwZWQgbG9naWMgcmVxdWlyZW1lbnRzXG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzZWxlY3RvciA9IGAjcm91dGluZy10YWJsZSAudWkuY2hlY2tib3hbZGF0YS1wcm92aWRlcj1cIiR7cHJvdmlkZXJ9XCJdYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaWQgJiYgZGlkICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUnVsZSB3aXRoIHNwZWNpZmljIERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gY2hlY2tpbmcgYSBydWxlIHdpdGggRElELCBjaGVjayBhbGwgcnVsZXMgd2l0aCBzYW1lIHByb3ZpZGVyIGFuZCBESURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RvcldpdGhESUQgPSBgJHtzZWxlY3Rvcn1bZGF0YS1kaWQ9XCIke2RpZH1cIl1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc2VsZWN0b3JXaXRoRElEKS5ub3QoJGNoZWNrYm94KS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiB1bmNoZWNraW5nIGEgcnVsZSB3aXRoIERJRDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAxLiBVbmNoZWNrIGFsbCBydWxlcyB3aXRoIHNhbWUgRElEXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JXaXRoRElEID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiJHtkaWR9XCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yV2l0aERJRCkubm90KCRjaGVja2JveCkuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAyLiBBbHNvIHVuY2hlY2sgZ2VuZXJhbCBydWxlcyAod2l0aG91dCBESUQpIGZvciBzYW1lIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JHZW5lcmFsID0gYCR7c2VsZWN0b3J9W2RhdGEtZGlkPVwiXCJdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yR2VuZXJhbCkuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdlbmVyYWwgcnVsZSB3aXRob3V0IERJRFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHVuY2hlY2tpbmcgZ2VuZXJhbCBydWxlLCBvbmx5IHVuY2hlY2sgb3RoZXIgZ2VuZXJhbCBydWxlcyBmb3Igc2FtZSBwcm92aWRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yR2VuZXJhbCA9IGAke3NlbGVjdG9yfVtkYXRhLWRpZD1cIlwiXWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChzZWxlY3RvckdlbmVyYWwpLm5vdCgkY2hlY2tib3gpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gY2hlY2tpbmcgZ2VuZXJhbCBydWxlLCBjaGVjayBhbGwgZ2VuZXJhbCBydWxlcyBmb3Igc2FtZSBwcm92aWRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yR2VuZXJhbCA9IGAke3NlbGVjdG9yfVtkYXRhLWRpZD1cIlwiXWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChzZWxlY3RvckdlbmVyYWwpLm5vdCgkY2hlY2tib3gpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZm9ybSBjaGFuZ2VcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBlcmFzZSBidXR0b25zIGZvciBkYXRlL3RpbWUgZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUVyYXNlcnMoKSB7XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGVyYXNlRGF0ZXNCdG4ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJhc2VXZWVrZGF5c0J0bi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR3ZWVrZGF5RnJvbURyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kd2Vla2RheVRvRHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJhc2VUaW1lcGVyaW9kQnRuLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZVN0YXJ0LmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVzY3JpcHRpb24gZmllbGQgd2l0aCBhdXRvLXJlc2l6ZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEZXNjcmlwdGlvbkZpZWxkKCkge1xuICAgICAgICAvLyBBdXRvLXJlc2l6ZSBvbiBpbnB1dFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRkZXNjcmlwdGlvbkZpZWxkLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5zdHlsZS5oZWlnaHQgPSAnYXV0byc7XG4gICAgICAgICAgICB0aGlzLnN0eWxlLmhlaWdodCA9ICh0aGlzLnNjcm9sbEhlaWdodCkgKyAncHgnO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWwgcmVzaXplXG4gICAgICAgIGlmIChvdXRPZldvcmtUaW1lUmVjb3JkLiRkZXNjcmlwdGlvbkZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRkZXNjcmlwdGlvbkZpZWxkLnRyaWdnZXIoJ2lucHV0Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhlbHBlciB0byBzZXQgZGF0ZSBmcm9tIHRpbWVzdGFtcCBvciBkYXRlIHN0cmluZ1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcn0gZGF0ZVZhbHVlIC0gVW5peCB0aW1lc3RhbXAgb3IgZGF0ZSBzdHJpbmcgKFlZWVktTU0tREQpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yIC0galF1ZXJ5IHNlbGVjdG9yXG4gICAgICovXG4gICAgc2V0RGF0ZUZyb21UaW1lc3RhbXAoZGF0ZVZhbHVlLCBzZWxlY3Rvcikge1xuICAgICAgICBpZiAoIWRhdGVWYWx1ZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyBhIGRhdGUgc3RyaW5nIGluIFlZWVktTU0tREQgZm9ybWF0IGZpcnN0XG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZVZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGRhdGUgZm9ybWF0IFlZWVktTU0tRERcbiAgICAgICAgICAgIGlmICgvXlxcZHs0fS1cXGR7Mn0tXFxkezJ9JC8udGVzdChkYXRlVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGRhdGVWYWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc05hTihkYXRlLmdldFRpbWUoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgJChzZWxlY3RvcikuY2FsZW5kYXIoJ3NldCBkYXRlJywgZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRyeSB0byBwYXJzZSBhcyBVbml4IHRpbWVzdGFtcCAoYWxsIGRpZ2l0cylcbiAgICAgICAgICAgIGlmICgvXlxcZCskLy50ZXN0KGRhdGVWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBwYXJzZUludChkYXRlVmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmICh0aW1lc3RhbXAgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgVW5peCB0aW1lc3RhbXAgdG8gRGF0ZVxuICAgICAgICAgICAgICAgICAgICAkKHNlbGVjdG9yKS5jYWxlbmRhcignc2V0IGRhdGUnLCBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRhdGVWYWx1ZSA9PT0gJ251bWJlcicgJiYgZGF0ZVZhbHVlID4gMCkge1xuICAgICAgICAgICAgLy8gTnVtZXJpYyBVbml4IHRpbWVzdGFtcFxuICAgICAgICAgICAgJChzZWxlY3RvcikuY2FsZW5kYXIoJ3NldCBkYXRlJywgbmV3IERhdGUoZGF0ZVZhbHVlICogMTAwMCkpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIGZvciBwYWlyZWQgZmllbGRzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3VsdCAtIEZvcm0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R8Ym9vbGVhbn0gUmVzdWx0IG9iamVjdCBvciBmYWxzZSBpZiB2YWxpZGF0aW9uIGZhaWxzXG4gICAgICovXG4gICAgY3VzdG9tVmFsaWRhdGVGb3JtKHJlc3VsdCkge1xuICAgICAgICAvLyBDaGVjayBkYXRlIGZpZWxkcyAtIGJvdGggc2hvdWxkIGJlIGZpbGxlZCBvciBib3RoIGVtcHR5XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEuZGF0ZV9mcm9tICE9PSAnJyAmJiByZXN1bHQuZGF0YS5kYXRlX3RvID09PSAnJykgfHxcbiAgICAgICAgICAgIChyZXN1bHQuZGF0YS5kYXRlX3RvICE9PSAnJyAmJiByZXN1bHQuZGF0YS5kYXRlX2Zyb20gPT09ICcnKSkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tEYXRlSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB3ZWVrZGF5IGZpZWxkcyAtIGJvdGggc2hvdWxkIGJlIGZpbGxlZCBvciBib3RoIGVtcHR5XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID4gMCAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X3RvID09PSAnLTEnKSB8fFxuICAgICAgICAgICAgKHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA9PT0gJy0xJykpIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGVycm9yTWVzc2FnZS5odG1sKGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrV2Vla0RheUludGVydmFsKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgdGltZSBmaWVsZHMgLSBib3RoIHNob3VsZCBiZSBmaWxsZWQgb3IgYm90aCBlbXB0eVxuICAgICAgICBpZiAoKHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID09PSAwKSB8fFxuICAgICAgICAgICAgKHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID4gMCAmJiByZXN1bHQuZGF0YS50aW1lX2Zyb20ubGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvciB0aW1lZnJhbWUgdHlwZSwgY2hlY2sgdGhhdCBhdCBsZWFzdCBvbmUgY29uZGl0aW9uIGlzIHNwZWNpZmllZFxuICAgICAgICBjb25zdCBjYWxUeXBlID0gcmVzdWx0LmRhdGEuY2FsVHlwZSB8fCAndGltZWZyYW1lJztcbiAgICAgICAgaWYgKGNhbFR5cGUgPT09ICd0aW1lZnJhbWUnIHx8IGNhbFR5cGUgPT09ICcnKSB7XG4gICAgICAgICAgICBjb25zdCBoYXNEYXRlUmFuZ2UgPSByZXN1bHQuZGF0YS5kYXRlX2Zyb20gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gIT09ICcnO1xuICAgICAgICAgICAgY29uc3QgaGFzV2Vla2RheVJhbmdlID0gcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID4gMCAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X3RvID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGhhc1RpbWVSYW5nZSA9IHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFoYXNEYXRlUmFuZ2UgJiYgIWhhc1dlZWtkYXlSYW5nZSAmJiAhaGFzVGltZVJhbmdlKSB7XG4gICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZXJyb3JNZXNzYWdlLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlTm9SdWxlc1NlbGVjdGVkKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIHNlbmRpbmcgZm9ybVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fGJvb2xlYW59IFVwZGF0ZWQgc2V0dGluZ3Mgb3IgZmFsc2VcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBjaGVja2JveCB2YWx1ZXMgZnJvbSAnb24nL3VuZGVmaW5lZCB0byB0cnVlL2ZhbHNlXG4gICAgICAgIC8vIFByb2Nlc3MgYWxsIHJvdXRlIGNoZWNrYm94ZXNcbiAgICAgICAgT2JqZWN0LmtleXMocmVzdWx0LmRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgncm91dGUtJykpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtrZXldID0gcmVzdWx0LmRhdGFba2V5XSA9PT0gJ29uJyB8fCByZXN1bHQuZGF0YVtrZXldID09PSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgYWxsb3dSZXN0cmljdGlvbiBjaGVja2JveFxuICAgICAgICBpZiAoJ2FsbG93UmVzdHJpY3Rpb24nIGluIHJlc3VsdC5kYXRhKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hbGxvd1Jlc3RyaWN0aW9uID0gcmVzdWx0LmRhdGEuYWxsb3dSZXN0cmljdGlvbiA9PT0gJ29uJyB8fCByZXN1bHQuZGF0YS5hbGxvd1Jlc3RyaWN0aW9uID09PSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2FsVHlwZSBjb252ZXJzaW9uIChtYXRjaGVzIG9sZCBjb250cm9sbGVyOiAoJGRhdGFbJG5hbWVdID09PSAndGltZWZyYW1lJykgPyAnJyA6ICRkYXRhWyRuYW1lXSlcbiAgICAgICAgLy8gRm9yIHNhdmluZyB3ZSBjb252ZXJ0ICd0aW1lZnJhbWUnIHRvIGVtcHR5IHN0cmluZ1xuICAgICAgICBpZiAocmVzdWx0LmRhdGEuY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNhbFR5cGUgPSAnJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHdlZWtkYXkgdmFsdWVzIChtYXRjaGVzIG9sZCBjb250cm9sbGVyOiAoJGRhdGFbJG5hbWVdIDwgMSkgPyBudWxsIDogJGRhdGFbJG5hbWVdKVxuICAgICAgICBpZiAocmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID09PSAnLTEnIHx8IHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA8IDEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS53ZWVrZGF5X3RvID09PSAnLTEnIHx8IHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPCAxKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS53ZWVrZGF5X3RvID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBwYXNzd29yZCBmaWVsZCAtIGlmIHVzZXIgZGlkbid0IGNoYW5nZSB0aGUgbWFza2VkIHBhc3N3b3JkLCBrZWVwIGl0IGFzIGlzXG4gICAgICAgIC8vIFRoZSBiYWNrZW5kIHdpbGwgcmVjb2duaXplICdYWFhYWFgnIGFuZCB3b24ndCB1cGRhdGUgdGhlIHBhc3N3b3JkXG4gICAgICAgIC8vIElmIHVzZXIgY2xlYXJlZCB0aGUgZmllbGQgb3IgZW50ZXJlZCBuZXcgdmFsdWUsIHNlbmQgdGhhdFxuICAgICAgICBpZiAocmVzdWx0LmRhdGEuY2FsU2VjcmV0ID09PSAnWFhYWFhYJykge1xuICAgICAgICAgICAgLy8gVXNlciBkaWRuJ3QgY2hhbmdlIHRoZSBtYXNrZWQgcGFzc3dvcmQsIGJhY2tlbmQgd2lsbCBrZWVwIGV4aXN0aW5nIHZhbHVlXG4gICAgICAgIH0gZWxzZSBpZiAocmVzdWx0LmRhdGEuY2FsU2VjcmV0ID09PSAnJykge1xuICAgICAgICAgICAgLy8gVXNlciBjbGVhcmVkIHRoZSBwYXNzd29yZCBmaWVsZCwgYmFja2VuZCB3aWxsIGNsZWFyIHRoZSBwYXNzd29yZFxuICAgICAgICB9XG4gICAgICAgIC8vIE90aGVyd2lzZSBzZW5kIHRoZSBuZXcgcGFzc3dvcmQgdmFsdWUgYXMgZW50ZXJlZFxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRpbWUgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBjYWxlbmRhciB0eXBlXG4gICAgICAgIGNvbnN0IGNhbFR5cGUgPSByZXN1bHQuZGF0YS5jYWxUeXBlIHx8ICd0aW1lZnJhbWUnO1xuICAgICAgICBpZiAoY2FsVHlwZSA9PT0gJycgfHwgY2FsVHlwZSA9PT0gJ3RpbWVmcmFtZScpIHtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy50aW1lZnJvbS5ydWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQuYWRkaXRpb25hbFRpbWVJbnRlcnZhbFJ1bGVzO1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLnRpbWV0by5ydWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQuYWRkaXRpb25hbFRpbWVJbnRlcnZhbFJ1bGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLnRpbWVmcm9tLnJ1bGVzID0gW107XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZXRvLnJ1bGVzID0gW107XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgZGF0ZXMgdG8gdGltZXN0YW1wc1xuICAgICAgICBjb25zdCBkYXRlRnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICBpZiAoZGF0ZUZyb20pIHtcbiAgICAgICAgICAgIGRhdGVGcm9tLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID0gTWF0aC5mbG9vcihkYXRlRnJvbS5nZXRUaW1lKCkgLyAxMDAwKS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkYXRlVG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIGlmIChkYXRlVG8pIHtcbiAgICAgICAgICAgIGRhdGVUby5zZXRIb3VycygyMywgNTksIDU5LCAwKTtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmRhdGVfdG8gPSBNYXRoLmZsb29yKGRhdGVUby5nZXRUaW1lKCkgLyAxMDAwKS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDb2xsZWN0IHNlbGVjdGVkIGluY29taW5nIHJvdXRlc1xuICAgICAgICBjb25zdCBzZWxlY3RlZFJvdXRlcyA9IFtdO1xuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRydWxlc1RhYmxlLmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlSWQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGlmIChyb3V0ZUlkKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRSb3V0ZXMucHVzaChyb3V0ZUlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5kYXRhLmluY29taW5nUm91dGVJZHMgPSBzZWxlY3RlZFJvdXRlcztcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGFjdGlvbi1kZXBlbmRlbnQgZmllbGRzIGJhc2VkIG9uIHNlbGVjdGlvblxuICAgICAgICBpZiAocmVzdWx0LmRhdGEuYWN0aW9uID09PSAnZXh0ZW5zaW9uJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXVkaW9fbWVzc2FnZV9pZCA9ICcnO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdC5kYXRhLmFjdGlvbiA9PT0gJ3BsYXltZXNzYWdlJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZXh0ZW5zaW9uID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJ1biBjdXN0b20gdmFsaWRhdGlvbiBmb3IgcGFpcmVkIGZpZWxkc1xuICAgICAgICByZXR1cm4gb3V0T2ZXb3JrVGltZVJlY29yZC5jdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBpZiB0aGlzIHdhcyBhIG5ldyByZWNvcmRcbiAgICAgICAgICAgIGlmICghb3V0T2ZXb3JrVGltZVJlY29yZC5yZWNvcmRJZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IGAke2dsb2JhbFJvb3RVcmx9b3V0LW9mZi13b3JrLXRpbWUvbW9kaWZ5LyR7cmVzcG9uc2UuZGF0YS5pZH1gO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnJlY29yZElkID0gcmVzcG9uc2UuZGF0YS5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVsb2FkIGRhdGEgdG8gZW5zdXJlIGNvbnNpc3RlbmN5XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmxvYWRGb3JtRGF0YSgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfW91dC1vZmYtd29yay10aW1lL3NhdmVgO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBvdXRPZldvcmtUaW1lUmVjb3JkLmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gT3V0V29ya1RpbWVzQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzIHVzaW5nIFRvb2x0aXBCdWlsZGVyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIGZpZWxkIHRvb2x0aXBcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBjYWxVcmw6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHsgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfY2FsZGF2X2hlYWRlciwgZGVmaW5pdGlvbjogbnVsbCB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfZ29vZ2xlLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfbmV4dGNsb3VkLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9jYWxkYXZfeWFuZGV4XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7IHRlcm06IGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2ljYWxlbmRhcl9oZWFkZXIsIGRlZmluaXRpb246IG51bGwgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfaWNhbGVuZGFyX2Rlc2NcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS50Zl9DYWxVcmxUb29sdGlwX2V4YW1wbGVfZ29vZ2xlLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9leGFtcGxlX25leHRjbG91ZCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfZXhhbXBsZV9pY3NcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzSGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUudGZfQ2FsVXJsVG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnRmX0NhbFVybFRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIHRoYXQgY2hlY2tzIGlmIGEgdmFsdWUgaXMgbm90IGVtcHR5IGJhc2VkIG9uIGEgc3BlY2lmaWMgYWN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gYmUgdmFsaWRhdGVkXG4gKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiB0byBjb21wYXJlIGFnYWluc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIHRydWUgaWYgdmFsaWQsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGUgPSBmdW5jdGlvbih2YWx1ZSwgYWN0aW9uKSB7XG4gICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCAmJiBvdXRPZldvcmtUaW1lUmVjb3JkLiRhY3Rpb25GaWVsZC52YWwoKSA9PT0gYWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNhbGVuZGFyIFVSTCBmaWVsZFxuICogVmFsaWRhdGVzIFVSTCBvbmx5IHdoZW4gY2FsZW5kYXIgdHlwZSBpcyBub3QgJ25vbmUnIG9yICd0aW1lJ1xuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGNvbnN0IGNhbFR5cGUgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRjYWxUeXBlRmllbGQudmFsKCk7XG4gICAgXG4gICAgLy8gSWYgY2FsZW5kYXIgdHlwZSBpcyB0aW1lZnJhbWUgb3IgdGltZSwgVVJMIGlzIG5vdCByZXF1aXJlZFxuICAgIGlmICghY2FsVHlwZSB8fCBjYWxUeXBlID09PSAndGltZWZyYW1lJyB8fCBjYWxUeXBlID09PSAndGltZScpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIFxuICAgIC8vIElmIGNhbGVuZGFyIHR5cGUgaXMgQ0FMREFWIG9yIElDQUwsIHZhbGlkYXRlIFVSTFxuICAgIGlmICghdmFsdWUgfHwgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgaWYgaXQncyBhIHZhbGlkIFVSTFxuICAgIHRyeSB7XG4gICAgICAgIG5ldyBVUkwodmFsdWUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gRE9NIGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplKCk7XG59KTsiXX0=