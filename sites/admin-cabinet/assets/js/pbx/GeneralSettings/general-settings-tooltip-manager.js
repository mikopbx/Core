"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

/* global globalTranslate, TooltipBuilder */

/**
 * GeneralSettingsTooltipManager - Manages tooltips for General Settings form
 * 
 * This class provides tooltip configurations for general settings fields,
 * helping users understand the purpose and implications of each setting.
 * 
 * Features:
 * - Tooltip configurations for system settings
 * - Integration with TooltipBuilder
 * - Consistent structure following the established pattern
 * 
 * @class GeneralSettingsTooltipManager
 */
var GeneralSettingsTooltipManager = /*#__PURE__*/function () {
  /**
   * Private constructor to prevent instantiation
   * This class uses static methods for utility functionality
   */
  function GeneralSettingsTooltipManager() {
    _classCallCheck(this, GeneralSettingsTooltipManager);

    throw new Error('GeneralSettingsTooltipManager is a static class and cannot be instantiated');
  }
  /**
   * Get all tooltip configurations for general settings
   * 
   * @static
   * @returns {Object} Tooltip configurations for general settings fields
   */


  _createClass(GeneralSettingsTooltipManager, null, [{
    key: "getTooltipConfigurations",
    value: function getTooltipConfigurations() {
      return {
        'RestartEveryNight': this.getRestartEveryNightTooltip(),
        'SendMetrics': this.getSendMetricsTooltip(),
        'PBXAllowGuestCalls': this.getAllowGuestCallsTooltip(),
        'PBXLanguage': this.getPBXLanguageTooltip(),
        'PBXInternalExtensionLength': this.getPBXInternalExtensionLengthTooltip(),
        'PBXManualTimeSettings': this.getManualTimeSettingsTooltip(),
        'PBXRecordCalls': this.getRecordCallsTooltip(),
        'PBXRecordCallsInner': this.getRecordCallsInnerTooltip(),
        'UseWebRTC': this.getUseWebRTCTooltip(),
        'RedirectToHttps': this.getRedirectToHttpsTooltip(),
        'SSHDisablePasswordLogins': this.getSSHDisablePasswordLoginsTooltip(),
        'AJAMEnabled': this.getAJAMEnabledTooltip(),
        'AMIEnabled': this.getAMIEnabledTooltip(),
        'ARIEnabled': this.getARIEnabledTooltip(),
        'ARIAllowedOrigins': this.getARIAllowedOriginsTooltip(),
        'PBXCallParkingExt': this.getPBXCallParkingExtTooltip(),
        'PBXFeatureAttendedTransfer': this.getPBXFeatureAttendedTransferTooltip(),
        'PBXFeatureBlindTransfer': this.getPBXFeatureBlindTransferTooltip(),
        'PBXFeaturePickupExten': this.getPBXFeaturePickupExtenTooltip(),
        'PBXFeatureAtxferNoAnswerTimeout': this.getPBXFeatureAtxferNoAnswerTimeoutTooltip(),
        'PBXFeatureDigitTimeout': this.getPBXFeatureDigitTimeoutTooltip(),
        'RTPPortRange': this.getRTPPortRangeTooltip(),
        'RTPStunServer': this.getRTPStunServerTooltip(),
        'SIPAuthPrefix': this.getSIPAuthPrefixTooltip(),
        'SIPDefaultExpiry': this.getSIPDefaultExpiryTooltip(),
        'SIPExpiryRange': this.getSIPExpiryRangeTooltip(),
        'SSHAuthorizedKeys': this.getSSHAuthorizedKeysTooltip(),
        'SSH_ID_RSA_PUB': this.getSSH_ID_RSA_PUBTooltip(),
        'WEBHTTPSPublicKey': this.getWEBHTTPSPublicKeyTooltip(),
        'WEBHTTPSPrivateKey': this.getWEBHTTPSPrivateKeyTooltip(),
        'Passkeys': this.getPasskeysTooltip()
      };
    }
    /**
     * Get RestartEveryNight tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for RestartEveryNight field
     */

  }, {
    key: "getRestartEveryNightTooltip",
    value: function getRestartEveryNightTooltip() {
      return {
        header: globalTranslate.gs_RestartEveryNightTooltip_header,
        description: globalTranslate.gs_RestartEveryNightTooltip_desc,
        list: [{
          term: globalTranslate.gs_RestartEveryNightTooltip_when,
          definition: globalTranslate.gs_RestartEveryNightTooltip_when_desc
        }, {
          term: globalTranslate.gs_RestartEveryNightTooltip_benefits,
          definition: null
        }],
        list2: [globalTranslate.gs_RestartEveryNightTooltip_benefit_memory, globalTranslate.gs_RestartEveryNightTooltip_benefit_stability],
        list3: [{
          term: globalTranslate.gs_RestartEveryNightTooltip_drawbacks,
          definition: null
        }],
        list4: [globalTranslate.gs_RestartEveryNightTooltip_drawback_calls, globalTranslate.gs_RestartEveryNightTooltip_drawback_registration],
        note: globalTranslate.gs_RestartEveryNightTooltip_recommendation
      };
    }
    /**
     * Get SendMetrics tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for SendMetrics field
     */

  }, {
    key: "getSendMetricsTooltip",
    value: function getSendMetricsTooltip() {
      return {
        header: globalTranslate.gs_SendMetricsTooltip_header,
        description: globalTranslate.gs_SendMetricsTooltip_desc,
        list: [{
          term: globalTranslate.gs_SendMetricsTooltip_purpose,
          definition: globalTranslate.gs_SendMetricsTooltip_purpose_desc
        }, {
          term: globalTranslate.gs_SendMetricsTooltip_what_collected,
          definition: null
        }],
        list2: [globalTranslate.gs_SendMetricsTooltip_collected_errors, globalTranslate.gs_SendMetricsTooltip_collected_crashes, globalTranslate.gs_SendMetricsTooltip_collected_performance, globalTranslate.gs_SendMetricsTooltip_collected_version, globalTranslate.gs_SendMetricsTooltip_collected_environment],
        list3: [{
          term: globalTranslate.gs_SendMetricsTooltip_benefits,
          definition: null
        }],
        list4: [globalTranslate.gs_SendMetricsTooltip_benefit_quick_fixes, globalTranslate.gs_SendMetricsTooltip_benefit_stability, globalTranslate.gs_SendMetricsTooltip_benefit_support],
        list5: [{
          term: globalTranslate.gs_SendMetricsTooltip_privacy,
          definition: globalTranslate.gs_SendMetricsTooltip_privacy_desc
        }],
        warning: {
          icon: 'info circle',
          text: globalTranslate.gs_SendMetricsTooltip_warning
        },
        note: globalTranslate.gs_SendMetricsTooltip_note
      };
    }
    /**
     * Get PBXAllowGuestCalls tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXAllowGuestCalls field
     */

  }, {
    key: "getAllowGuestCallsTooltip",
    value: function getAllowGuestCallsTooltip() {
      return {
        header: globalTranslate.gs_AllowGuestCallsTooltip_header,
        description: globalTranslate.gs_AllowGuestCallsTooltip_desc,
        warning: {
          header: globalTranslate.gs_AllowGuestCallsTooltip_warning_header,
          text: globalTranslate.gs_AllowGuestCallsTooltip_warning
        },
        list: [{
          term: globalTranslate.gs_AllowGuestCallsTooltip_when_enable,
          definition: null
        }],
        list2: [globalTranslate.gs_AllowGuestCallsTooltip_enable_anonymous, globalTranslate.gs_AllowGuestCallsTooltip_enable_intercom, globalTranslate.gs_AllowGuestCallsTooltip_enable_doorphone, globalTranslate.gs_AllowGuestCallsTooltip_enable_public],
        list3: [{
          term: globalTranslate.gs_AllowGuestCallsTooltip_technical,
          definition: null
        }],
        list4: [globalTranslate.gs_AllowGuestCallsTooltip_technical_endpoint, globalTranslate.gs_AllowGuestCallsTooltip_technical_context, globalTranslate.gs_AllowGuestCallsTooltip_technical_module],
        list5: [{
          term: globalTranslate.gs_AllowGuestCallsTooltip_security,
          definition: globalTranslate.gs_AllowGuestCallsTooltip_security_desc
        }],
        note: globalTranslate.gs_AllowGuestCallsTooltip_recommendation
      };
    }
    /**
     * Get PBXLanguage tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXLanguage field
     */

  }, {
    key: "getPBXLanguageTooltip",
    value: function getPBXLanguageTooltip() {
      return {
        header: globalTranslate.gs_PBXLanguageTooltip_header,
        description: globalTranslate.gs_PBXLanguageTooltip_desc,
        list: [{
          term: globalTranslate.gs_PBXLanguageTooltip_affects,
          definition: null
        }],
        list2: [globalTranslate.gs_PBXLanguageTooltip_affects_voice, globalTranslate.gs_PBXLanguageTooltip_affects_prompts, globalTranslate.gs_PBXLanguageTooltip_affects_ivr, globalTranslate.gs_PBXLanguageTooltip_affects_voicemail],
        list3: [{
          term: globalTranslate.gs_PBXLanguageTooltip_restart,
          definition: globalTranslate.gs_PBXLanguageTooltip_restart_desc
        }],
        note: globalTranslate.gs_PBXLanguageTooltip_note
      };
    }
    /**
     * Get PBXInternalExtensionLength tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXInternalExtensionLength field
     */

  }, {
    key: "getPBXInternalExtensionLengthTooltip",
    value: function getPBXInternalExtensionLengthTooltip() {
      return {
        header: globalTranslate.gs_PBXInternalExtensionLengthTooltip_header,
        description: globalTranslate.gs_PBXInternalExtensionLengthTooltip_desc,
        list: [{
          term: globalTranslate.gs_PBXInternalExtensionLengthTooltip_affects,
          definition: null
        }],
        list2: [globalTranslate.gs_PBXInternalExtensionLengthTooltip_affects_new, globalTranslate.gs_PBXInternalExtensionLengthTooltip_affects_validation, globalTranslate.gs_PBXInternalExtensionLengthTooltip_affects_search],
        list3: [{
          term: globalTranslate.gs_PBXInternalExtensionLengthTooltip_examples,
          definition: null
        }],
        list4: [globalTranslate.gs_PBXInternalExtensionLengthTooltip_example_3, globalTranslate.gs_PBXInternalExtensionLengthTooltip_example_4, globalTranslate.gs_PBXInternalExtensionLengthTooltip_example_5],
        warning: {
          text: globalTranslate.gs_PBXInternalExtensionLengthTooltip_warning
        },
        note: globalTranslate.gs_PBXInternalExtensionLengthTooltip_note
      };
    }
    /**
     * Get PBXManualTimeSettings tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXManualTimeSettings field
     */

  }, {
    key: "getManualTimeSettingsTooltip",
    value: function getManualTimeSettingsTooltip() {
      return {
        header: globalTranslate.gs_ManualTimeSettingsTooltip_header,
        description: globalTranslate.gs_ManualTimeSettingsTooltip_desc,
        list: [{
          term: globalTranslate.gs_ManualTimeSettingsTooltip_auto,
          definition: globalTranslate.gs_ManualTimeSettingsTooltip_auto_desc
        }, {
          term: globalTranslate.gs_ManualTimeSettingsTooltip_manual,
          definition: globalTranslate.gs_ManualTimeSettingsTooltip_manual_desc
        }],
        note: globalTranslate.gs_ManualTimeSettingsTooltip_note
      };
    }
    /**
     * Get PBXRecordCalls tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXRecordCalls field
     */

  }, {
    key: "getRecordCallsTooltip",
    value: function getRecordCallsTooltip() {
      return {
        header: globalTranslate.gs_RecordCallsTooltip_header,
        description: globalTranslate.gs_RecordCallsTooltip_desc,
        list: [{
          term: globalTranslate.gs_RecordCallsTooltip_storage,
          definition: globalTranslate.gs_RecordCallsTooltip_storage_desc
        }, {
          term: globalTranslate.gs_RecordCallsTooltip_legal,
          definition: globalTranslate.gs_RecordCallsTooltip_legal_desc
        }],
        warning: {
          text: globalTranslate.gs_RecordCallsTooltip_warning
        }
      };
    }
    /**
     * Get PBXRecordCallsInner tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXRecordCallsInner field
     */

  }, {
    key: "getRecordCallsInnerTooltip",
    value: function getRecordCallsInnerTooltip() {
      return {
        header: globalTranslate.gs_RecordCallsInnerTooltip_header,
        description: globalTranslate.gs_RecordCallsInnerTooltip_desc,
        list: [{
          term: globalTranslate.gs_RecordCallsInnerTooltip_usage,
          definition: null
        }],
        list2: [globalTranslate.gs_RecordCallsInnerTooltip_usage_training, globalTranslate.gs_RecordCallsInnerTooltip_usage_quality, globalTranslate.gs_RecordCallsInnerTooltip_usage_security],
        note: globalTranslate.gs_RecordCallsInnerTooltip_note
      };
    }
    /**
     * Get UseWebRTC tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for UseWebRTC field
     */

  }, {
    key: "getUseWebRTCTooltip",
    value: function getUseWebRTCTooltip() {
      return {
        header: globalTranslate.gs_UseWebRTCTooltip_header,
        description: globalTranslate.gs_UseWebRTCTooltip_desc,
        list: [{
          term: globalTranslate.gs_UseWebRTCTooltip_benefits,
          definition: null
        }],
        list2: [globalTranslate.gs_UseWebRTCTooltip_benefit_browser, globalTranslate.gs_UseWebRTCTooltip_benefit_no_software, globalTranslate.gs_UseWebRTCTooltip_benefit_encryption],
        list3: [{
          term: globalTranslate.gs_UseWebRTCTooltip_requirements,
          definition: globalTranslate.gs_UseWebRTCTooltip_requirements_desc
        }]
      };
    }
    /**
     * Get RedirectToHttps tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for RedirectToHttps field
     */

  }, {
    key: "getRedirectToHttpsTooltip",
    value: function getRedirectToHttpsTooltip() {
      return {
        header: globalTranslate.gs_RedirectToHttpsTooltip_header,
        description: globalTranslate.gs_RedirectToHttpsTooltip_desc,
        list: [{
          term: globalTranslate.gs_RedirectToHttpsTooltip_security,
          definition: globalTranslate.gs_RedirectToHttpsTooltip_security_desc
        }, {
          term: globalTranslate.gs_RedirectToHttpsTooltip_certificate,
          definition: globalTranslate.gs_RedirectToHttpsTooltip_certificate_desc
        }],
        note: globalTranslate.gs_RedirectToHttpsTooltip_note
      };
    }
    /**
     * Get SSHDisablePasswordLogins tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for SSHDisablePasswordLogins field
     */

  }, {
    key: "getSSHDisablePasswordLoginsTooltip",
    value: function getSSHDisablePasswordLoginsTooltip() {
      return {
        header: globalTranslate.gs_SSHDisablePasswordLoginsTooltip_header,
        description: globalTranslate.gs_SSHDisablePasswordLoginsTooltip_desc,
        warning: {
          header: globalTranslate.gs_SSHDisablePasswordLoginsTooltip_warning_header,
          text: globalTranslate.gs_SSHDisablePasswordLoginsTooltip_warning
        },
        list: [{
          term: globalTranslate.gs_SSHDisablePasswordLoginsTooltip_benefits,
          definition: null
        }],
        list2: [globalTranslate.gs_SSHDisablePasswordLoginsTooltip_benefit_security, globalTranslate.gs_SSHDisablePasswordLoginsTooltip_benefit_bruteforce, globalTranslate.gs_SSHDisablePasswordLoginsTooltip_benefit_compliance]
      };
    }
    /**
     * Get AJAMEnabled tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for AJAMEnabled field
     */

  }, {
    key: "getAJAMEnabledTooltip",
    value: function getAJAMEnabledTooltip() {
      return {
        header: globalTranslate.gs_AJAMEnabledTooltip_header,
        description: globalTranslate.gs_AJAMEnabledTooltip_desc,
        list: [{
          term: globalTranslate.gs_AJAMEnabledTooltip_what_is,
          definition: globalTranslate.gs_AJAMEnabledTooltip_what_is_desc
        }],
        list2: [{
          term: globalTranslate.gs_AJAMEnabledTooltip_usage,
          definition: null
        }],
        list3: [globalTranslate.gs_AJAMEnabledTooltip_usage_webapps, globalTranslate.gs_AJAMEnabledTooltip_usage_panels, globalTranslate.gs_AJAMEnabledTooltip_usage_widgets, globalTranslate.gs_AJAMEnabledTooltip_usage_monitoring],
        list4: [{
          term: globalTranslate.gs_AJAMEnabledTooltip_protocols,
          definition: globalTranslate.gs_AJAMEnabledTooltip_protocols_desc
        }],
        list5: [{
          term: globalTranslate.gs_AJAMEnabledTooltip_default,
          definition: globalTranslate.gs_AJAMEnabledTooltip_default_desc
        }],
        list6: [{
          term: globalTranslate.gs_AJAMEnabledTooltip_when_disable,
          definition: null
        }],
        list7: [globalTranslate.gs_AJAMEnabledTooltip_disable_1, globalTranslate.gs_AJAMEnabledTooltip_disable_2, globalTranslate.gs_AJAMEnabledTooltip_disable_3],
        warning: {
          header: globalTranslate.gs_AJAMEnabledTooltip_warning_header,
          text: globalTranslate.gs_AJAMEnabledTooltip_warning
        },
        note: globalTranslate.gs_AJAMEnabledTooltip_note
      };
    }
    /**
     * Get AMIEnabled tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for AMIEnabled field
     */

  }, {
    key: "getAMIEnabledTooltip",
    value: function getAMIEnabledTooltip() {
      return {
        header: globalTranslate.gs_AMIEnabledTooltip_header,
        description: globalTranslate.gs_AMIEnabledTooltip_desc,
        list: [{
          term: globalTranslate.gs_AMIEnabledTooltip_what_is,
          definition: globalTranslate.gs_AMIEnabledTooltip_what_is_desc
        }],
        list2: [{
          term: globalTranslate.gs_AMIEnabledTooltip_usage,
          definition: null
        }],
        list3: [globalTranslate.gs_AMIEnabledTooltip_usage_monitoring, globalTranslate.gs_AMIEnabledTooltip_usage_integration, globalTranslate.gs_AMIEnabledTooltip_usage_control, globalTranslate.gs_AMIEnabledTooltip_usage_events, globalTranslate.gs_AMIEnabledTooltip_usage_commands],
        list4: [{
          term: globalTranslate.gs_AMIEnabledTooltip_examples,
          definition: null
        }],
        list5: [globalTranslate.gs_AMIEnabledTooltip_example_crm, globalTranslate.gs_AMIEnabledTooltip_example_wallboard, globalTranslate.gs_AMIEnabledTooltip_example_cti, globalTranslate.gs_AMIEnabledTooltip_example_reporting],
        list6: [{
          term: globalTranslate.gs_AMIEnabledTooltip_default,
          definition: globalTranslate.gs_AMIEnabledTooltip_default_desc
        }],
        list7: [{
          term: globalTranslate.gs_AMIEnabledTooltip_when_disable,
          definition: null
        }],
        list8: [globalTranslate.gs_AMIEnabledTooltip_disable_1, globalTranslate.gs_AMIEnabledTooltip_disable_2, globalTranslate.gs_AMIEnabledTooltip_disable_3],
        warning: {
          header: globalTranslate.gs_AMIEnabledTooltip_warning_header,
          text: globalTranslate.gs_AMIEnabledTooltip_warning
        },
        footer: globalTranslate.gs_AMIEnabledTooltip_footer
      };
    }
    /**
     * Get ARIEnabled tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for ARIEnabled field
     */

  }, {
    key: "getARIEnabledTooltip",
    value: function getARIEnabledTooltip() {
      return {
        header: globalTranslate.gs_ARIEnabledTooltip_header,
        description: globalTranslate.gs_ARIEnabledTooltip_desc,
        list: [{
          term: globalTranslate.gs_ARIEnabledTooltip_what_is,
          definition: globalTranslate.gs_ARIEnabledTooltip_what_is_desc
        }],
        list2: [{
          term: globalTranslate.gs_ARIEnabledTooltip_usage,
          definition: null
        }],
        list3: [globalTranslate.gs_ARIEnabledTooltip_usage_webrtc, globalTranslate.gs_ARIEnabledTooltip_usage_ivr, globalTranslate.gs_ARIEnabledTooltip_usage_conference, globalTranslate.gs_ARIEnabledTooltip_usage_recording, globalTranslate.gs_ARIEnabledTooltip_usage_custom],
        list4: [{
          term: globalTranslate.gs_ARIEnabledTooltip_examples,
          definition: null
        }],
        list5: [globalTranslate.gs_ARIEnabledTooltip_example_webphone, globalTranslate.gs_ARIEnabledTooltip_example_bot, globalTranslate.gs_ARIEnabledTooltip_example_queue, globalTranslate.gs_ARIEnabledTooltip_example_analytics],
        list6: [{
          term: globalTranslate.gs_ARIEnabledTooltip_default,
          definition: globalTranslate.gs_ARIEnabledTooltip_default_desc
        }],
        list7: [{
          term: globalTranslate.gs_ARIEnabledTooltip_when_enable,
          definition: null
        }],
        list8: [globalTranslate.gs_ARIEnabledTooltip_enable_1, globalTranslate.gs_ARIEnabledTooltip_enable_2, globalTranslate.gs_ARIEnabledTooltip_enable_3],
        warning: {
          header: globalTranslate.gs_ARIEnabledTooltip_warning_header,
          text: globalTranslate.gs_ARIEnabledTooltip_warning
        },
        footer: globalTranslate.gs_ARIEnabledTooltip_footer
      };
    }
    /**
     * Get ARIAllowedOrigins tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for ARIAllowedOrigins field
     */

  }, {
    key: "getARIAllowedOriginsTooltip",
    value: function getARIAllowedOriginsTooltip() {
      return {
        header: globalTranslate.gs_ARIAllowedOriginsTooltip_header,
        description: globalTranslate.gs_ARIAllowedOriginsTooltip_desc,
        list: [{
          term: globalTranslate.gs_ARIAllowedOriginsTooltip_what_is,
          definition: globalTranslate.gs_ARIAllowedOriginsTooltip_what_is_desc
        }],
        list2: [{
          term: globalTranslate.gs_ARIAllowedOriginsTooltip_format,
          definition: globalTranslate.gs_ARIAllowedOriginsTooltip_format_desc
        }],
        list3: [{
          term: globalTranslate.gs_ARIAllowedOriginsTooltip_examples,
          definition: null
        }],
        list4: [globalTranslate.gs_ARIAllowedOriginsTooltip_example_1, globalTranslate.gs_ARIAllowedOriginsTooltip_example_2, globalTranslate.gs_ARIAllowedOriginsTooltip_example_3],
        list5: [{
          term: globalTranslate.gs_ARIAllowedOriginsTooltip_security,
          definition: null
        }],
        list6: [globalTranslate.gs_ARIAllowedOriginsTooltip_security_1, globalTranslate.gs_ARIAllowedOriginsTooltip_security_2, globalTranslate.gs_ARIAllowedOriginsTooltip_security_3],
        list7: [{
          term: globalTranslate.gs_ARIAllowedOriginsTooltip_default,
          definition: globalTranslate.gs_ARIAllowedOriginsTooltip_default_desc
        }],
        footer: globalTranslate.gs_ARIAllowedOriginsTooltip_footer
      };
    }
    /**
     * Get PBXCallParkingExt tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXCallParkingExt field
     */

  }, {
    key: "getPBXCallParkingExtTooltip",
    value: function getPBXCallParkingExtTooltip() {
      return {
        header: globalTranslate.gs_PBXCallParkingExtTooltip_header,
        description: globalTranslate.gs_PBXCallParkingExtTooltip_desc,
        list: [{
          term: globalTranslate.gs_PBXCallParkingExtTooltip_how,
          definition: null
        }],
        list2: [globalTranslate.gs_PBXCallParkingExtTooltip_how_dial, globalTranslate.gs_PBXCallParkingExtTooltip_how_announce, globalTranslate.gs_PBXCallParkingExtTooltip_how_retrieve],
        list3: [{
          term: globalTranslate.gs_PBXCallParkingExtTooltip_slots,
          definition: null
        }],
        list4: [globalTranslate.gs_PBXCallParkingExtTooltip_slots_range, globalTranslate.gs_PBXCallParkingExtTooltip_slots_capacity, globalTranslate.gs_PBXCallParkingExtTooltip_slots_automatic],
        list5: [{
          term: globalTranslate.gs_PBXCallParkingExtTooltip_example,
          definition: globalTranslate.gs_PBXCallParkingExtTooltip_example_desc
        }],
        note: globalTranslate.gs_PBXCallParkingExtTooltip_note
      };
    }
    /**
     * Get PBXFeatureAttendedTransfer tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXFeatureAttendedTransfer field
     */

  }, {
    key: "getPBXFeatureAttendedTransferTooltip",
    value: function getPBXFeatureAttendedTransferTooltip() {
      return {
        header: globalTranslate.gs_PBXFeatureAttendedTransferTooltip_header,
        description: globalTranslate.gs_PBXFeatureAttendedTransferTooltip_desc,
        list: [{
          term: globalTranslate.gs_PBXFeatureAttendedTransferTooltip_how,
          definition: null
        }],
        list2: [globalTranslate.gs_PBXFeatureAttendedTransferTooltip_how_press, globalTranslate.gs_PBXFeatureAttendedTransferTooltip_how_dial, globalTranslate.gs_PBXFeatureAttendedTransferTooltip_how_talk, globalTranslate.gs_PBXFeatureAttendedTransferTooltip_how_complete],
        list3: [{
          term: globalTranslate.gs_PBXFeatureAttendedTransferTooltip_benefits,
          definition: globalTranslate.gs_PBXFeatureAttendedTransferTooltip_benefits_desc
        }],
        note: globalTranslate.gs_PBXFeatureAttendedTransferTooltip_note
      };
    }
    /**
     * Get PBXFeatureBlindTransfer tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXFeatureBlindTransfer field
     */

  }, {
    key: "getPBXFeatureBlindTransferTooltip",
    value: function getPBXFeatureBlindTransferTooltip() {
      return {
        header: globalTranslate.gs_PBXFeatureBlindTransferTooltip_header,
        description: globalTranslate.gs_PBXFeatureBlindTransferTooltip_desc,
        list: [{
          term: globalTranslate.gs_PBXFeatureBlindTransferTooltip_how,
          definition: null
        }],
        list2: [globalTranslate.gs_PBXFeatureBlindTransferTooltip_how_press, globalTranslate.gs_PBXFeatureBlindTransferTooltip_how_dial, globalTranslate.gs_PBXFeatureBlindTransferTooltip_how_hangup],
        warning: {
          text: globalTranslate.gs_PBXFeatureBlindTransferTooltip_warning
        },
        note: globalTranslate.gs_PBXFeatureBlindTransferTooltip_note
      };
    }
    /**
     * Get PBXFeaturePickupExten tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXFeaturePickupExten field
     */

  }, {
    key: "getPBXFeaturePickupExtenTooltip",
    value: function getPBXFeaturePickupExtenTooltip() {
      return {
        header: globalTranslate.gs_PBXFeaturePickupExtenTooltip_header,
        description: globalTranslate.gs_PBXFeaturePickupExtenTooltip_desc,
        list: [{
          term: globalTranslate.gs_PBXFeaturePickupExtenTooltip_types,
          definition: null
        }],
        list2: [{
          term: globalTranslate.gs_PBXFeaturePickupExtenTooltip_type_general,
          definition: globalTranslate.gs_PBXFeaturePickupExtenTooltip_type_general_desc
        }, {
          term: globalTranslate.gs_PBXFeaturePickupExtenTooltip_type_directed,
          definition: globalTranslate.gs_PBXFeaturePickupExtenTooltip_type_directed_desc
        }],
        list3: [{
          term: globalTranslate.gs_PBXFeaturePickupExtenTooltip_usage,
          definition: globalTranslate.gs_PBXFeaturePickupExtenTooltip_usage_desc
        }]
      };
    }
    /**
     * Get PBXFeatureAtxferNoAnswerTimeout tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXFeatureAtxferNoAnswerTimeout field
     */

  }, {
    key: "getPBXFeatureAtxferNoAnswerTimeoutTooltip",
    value: function getPBXFeatureAtxferNoAnswerTimeoutTooltip() {
      return {
        header: globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_header,
        description: globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_desc,
        list: [{
          term: globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_scenario,
          definition: null
        }],
        list2: [globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_scenario_1, globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_scenario_2, globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_scenario_3],
        list3: [{
          term: globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_default,
          definition: globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_default_desc
        }],
        list4: [{
          term: globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_recommendations,
          definition: null
        }],
        list5: [globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_rec_standard, globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_rec_quick, globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_rec_extended]
      };
    }
    /**
     * Get PBXFeatureDigitTimeout tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXFeatureDigitTimeout field
     */

  }, {
    key: "getPBXFeatureDigitTimeoutTooltip",
    value: function getPBXFeatureDigitTimeoutTooltip() {
      return {
        header: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_header,
        description: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_desc,
        list: [{
          term: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_usage,
          definition: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_usage_desc
        }],
        list2: [{
          term: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_default,
          definition: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_default_desc
        }],
        list3: [{
          term: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_when_to_change,
          definition: null
        }],
        list4: [{
          term: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_change_increase,
          definition: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_change_increase_desc
        }, {
          term: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_change_decrease,
          definition: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_change_decrease_desc
        }],
        footer: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_footer
      };
    }
    /**
     * Get RTPPortRange tooltip configuration (for RTPPortFrom and RTPPortTo)
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for RTP port range fields
     */

  }, {
    key: "getRTPPortRangeTooltip",
    value: function getRTPPortRangeTooltip() {
      return {
        header: globalTranslate.gs_RTPPortRangeTooltip_header,
        description: globalTranslate.gs_RTPPortRangeTooltip_desc,
        list: [{
          term: globalTranslate.gs_RTPPortRangeTooltip_purpose,
          definition: null
        }],
        list2: [globalTranslate.gs_RTPPortRangeTooltip_purpose_media, globalTranslate.gs_RTPPortRangeTooltip_purpose_bidirectional, globalTranslate.gs_RTPPortRangeTooltip_purpose_unique],
        list3: [{
          term: globalTranslate.gs_RTPPortRangeTooltip_default,
          definition: globalTranslate.gs_RTPPortRangeTooltip_default_desc
        }],
        list4: [{
          term: globalTranslate.gs_RTPPortRangeTooltip_calculation,
          definition: globalTranslate.gs_RTPPortRangeTooltip_calculation_desc
        }],
        list5: [{
          term: globalTranslate.gs_RTPPortRangeTooltip_when_to_change,
          definition: null
        }],
        list6: [{
          term: globalTranslate.gs_RTPPortRangeTooltip_change_increase,
          definition: globalTranslate.gs_RTPPortRangeTooltip_change_increase_desc
        }, {
          term: globalTranslate.gs_RTPPortRangeTooltip_change_custom,
          definition: globalTranslate.gs_RTPPortRangeTooltip_change_custom_desc
        }, {
          term: globalTranslate.gs_RTPPortRangeTooltip_change_nat,
          definition: globalTranslate.gs_RTPPortRangeTooltip_change_nat_desc
        }],
        footer: globalTranslate.gs_RTPPortRangeTooltip_footer
      };
    }
    /**
     * Get RTPStunServer tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for RTPStunServer field
     */

  }, {
    key: "getRTPStunServerTooltip",
    value: function getRTPStunServerTooltip() {
      return {
        header: globalTranslate.gs_RTPStunServerTooltip_header,
        description: globalTranslate.gs_RTPStunServerTooltip_desc,
        list: [{
          term: globalTranslate.gs_RTPStunServerTooltip_purpose_header,
          definition: null
        }],
        list2: [globalTranslate.gs_RTPStunServerTooltip_purpose_1, globalTranslate.gs_RTPStunServerTooltip_purpose_2, globalTranslate.gs_RTPStunServerTooltip_purpose_3],
        list3: [{
          term: globalTranslate.gs_RTPStunServerTooltip_how_it_works,
          definition: globalTranslate.gs_RTPStunServerTooltip_how_it_works_desc
        }],
        list4: [{
          term: globalTranslate.gs_RTPStunServerTooltip_format,
          definition: globalTranslate.gs_RTPStunServerTooltip_format_desc
        }],
        list5: [{
          term: globalTranslate.gs_RTPStunServerTooltip_when_to_use,
          definition: null
        }],
        list6: [globalTranslate.gs_RTPStunServerTooltip_use_1, globalTranslate.gs_RTPStunServerTooltip_use_2, globalTranslate.gs_RTPStunServerTooltip_use_3],
        list7: [{
          term: globalTranslate.gs_RTPStunServerTooltip_examples,
          definition: null
        }],
        list8: [globalTranslate.gs_RTPStunServerTooltip_example_1, globalTranslate.gs_RTPStunServerTooltip_example_2, globalTranslate.gs_RTPStunServerTooltip_example_3],
        footer: globalTranslate.gs_RTPStunServerTooltip_footer
      };
    }
    /**
     * Get SIPAuthPrefix tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for SIPAuthPrefix field
     */

  }, {
    key: "getSIPAuthPrefixTooltip",
    value: function getSIPAuthPrefixTooltip() {
      return {
        header: globalTranslate.gs_SIPAuthPrefixTooltip_header,
        description: globalTranslate.gs_SIPAuthPrefixTooltip_desc,
        list: [{
          term: globalTranslate.gs_SIPAuthPrefixTooltip_purpose,
          definition: globalTranslate.gs_SIPAuthPrefixTooltip_purpose_desc
        }],
        list2: [{
          term: globalTranslate.gs_SIPAuthPrefixTooltip_how_it_works,
          definition: null
        }],
        list3: [globalTranslate.gs_SIPAuthPrefixTooltip_work_1, globalTranslate.gs_SIPAuthPrefixTooltip_work_2, globalTranslate.gs_SIPAuthPrefixTooltip_work_3],
        list4: [{
          term: globalTranslate.gs_SIPAuthPrefixTooltip_default,
          definition: globalTranslate.gs_SIPAuthPrefixTooltip_default_desc
        }],
        list5: [{
          term: globalTranslate.gs_SIPAuthPrefixTooltip_when_to_use,
          definition: null
        }],
        list6: [globalTranslate.gs_SIPAuthPrefixTooltip_use_1, globalTranslate.gs_SIPAuthPrefixTooltip_use_2, globalTranslate.gs_SIPAuthPrefixTooltip_use_3, globalTranslate.gs_SIPAuthPrefixTooltip_use_4],
        warning: {
          header: globalTranslate.gs_SIPAuthPrefixTooltip_warning_header,
          text: globalTranslate.gs_SIPAuthPrefixTooltip_warning
        }
      };
    }
    /**
     * Get SIPDefaultExpiry tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for SIPDefaultExpiry field
     */

  }, {
    key: "getSIPDefaultExpiryTooltip",
    value: function getSIPDefaultExpiryTooltip() {
      return {
        header: globalTranslate.gs_SIPDefaultExpiryTooltip_header,
        description: globalTranslate.gs_SIPDefaultExpiryTooltip_desc,
        list: [{
          term: globalTranslate.gs_SIPDefaultExpiryTooltip_purpose,
          definition: globalTranslate.gs_SIPDefaultExpiryTooltip_purpose_desc
        }],
        list2: [{
          term: globalTranslate.gs_SIPDefaultExpiryTooltip_how_it_works,
          definition: null
        }],
        list3: [globalTranslate.gs_SIPDefaultExpiryTooltip_work_1, globalTranslate.gs_SIPDefaultExpiryTooltip_work_2, globalTranslate.gs_SIPDefaultExpiryTooltip_work_3],
        list4: [{
          term: globalTranslate.gs_SIPDefaultExpiryTooltip_default,
          definition: globalTranslate.gs_SIPDefaultExpiryTooltip_default_desc
        }],
        list5: [{
          term: globalTranslate.gs_SIPDefaultExpiryTooltip_when_to_change,
          definition: null
        }],
        list6: [globalTranslate.gs_SIPDefaultExpiryTooltip_change_mobile, globalTranslate.gs_SIPDefaultExpiryTooltip_change_stable, globalTranslate.gs_SIPDefaultExpiryTooltip_change_battery],
        note: globalTranslate.gs_SIPDefaultExpiryTooltip_note
      };
    }
    /**
     * Get SIPExpiryRange tooltip configuration (combined Min and Max)
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for SIPExpiryRange fields
     */

  }, {
    key: "getSIPExpiryRangeTooltip",
    value: function getSIPExpiryRangeTooltip() {
      return {
        header: globalTranslate.gs_SIPExpiryRangeTooltip_header,
        description: globalTranslate.gs_SIPExpiryRangeTooltip_desc,
        list: [{
          term: globalTranslate.gs_SIPExpiryRangeTooltip_min_header,
          definition: globalTranslate.gs_SIPExpiryRangeTooltip_min_desc
        }],
        list2: [globalTranslate.gs_SIPExpiryRangeTooltip_min_protect, globalTranslate.gs_SIPExpiryRangeTooltip_min_default, globalTranslate.gs_SIPExpiryRangeTooltip_min_nat],
        list3: [{
          term: globalTranslate.gs_SIPExpiryRangeTooltip_max_header,
          definition: globalTranslate.gs_SIPExpiryRangeTooltip_max_desc
        }],
        list4: [globalTranslate.gs_SIPExpiryRangeTooltip_max_timeout, globalTranslate.gs_SIPExpiryRangeTooltip_max_default, globalTranslate.gs_SIPExpiryRangeTooltip_max_reduce],
        list5: [{
          term: globalTranslate.gs_SIPExpiryRangeTooltip_recommendations,
          definition: null
        }],
        list6: [globalTranslate.gs_SIPExpiryRangeTooltip_rec_local, globalTranslate.gs_SIPExpiryRangeTooltip_rec_internet, globalTranslate.gs_SIPExpiryRangeTooltip_rec_mobile, globalTranslate.gs_SIPExpiryRangeTooltip_rec_default],
        list7: [{
          term: globalTranslate.gs_SIPExpiryRangeTooltip_how_it_works,
          definition: globalTranslate.gs_SIPExpiryRangeTooltip_how_it_works_desc
        }],
        warning: {
          header: globalTranslate.gs_SIPExpiryRangeTooltip_warning_header,
          text: globalTranslate.gs_SIPExpiryRangeTooltip_warning
        },
        note: globalTranslate.gs_SIPExpiryRangeTooltip_note
      };
    }
    /**
     * Get SSHAuthorizedKeys tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for SSHAuthorizedKeys field
     */

  }, {
    key: "getSSHAuthorizedKeysTooltip",
    value: function getSSHAuthorizedKeysTooltip() {
      return {
        header: globalTranslate.gs_SSHAuthorizedKeysTooltip_header,
        description: globalTranslate.gs_SSHAuthorizedKeysTooltip_desc,
        list: [{
          term: globalTranslate.gs_SSHAuthorizedKeysTooltip_what_is,
          definition: globalTranslate.gs_SSHAuthorizedKeysTooltip_what_is_desc
        }],
        list2: [{
          term: globalTranslate.gs_SSHAuthorizedKeysTooltip_format,
          definition: globalTranslate.gs_SSHAuthorizedKeysTooltip_format_desc
        }],
        list3: [{
          term: globalTranslate.gs_SSHAuthorizedKeysTooltip_how_to_add,
          definition: null
        }],
        list4: [globalTranslate.gs_SSHAuthorizedKeysTooltip_add_1, globalTranslate.gs_SSHAuthorizedKeysTooltip_add_2, globalTranslate.gs_SSHAuthorizedKeysTooltip_add_3, globalTranslate.gs_SSHAuthorizedKeysTooltip_add_4],
        list5: [{
          term: globalTranslate.gs_SSHAuthorizedKeysTooltip_benefits,
          definition: null
        }],
        list6: [globalTranslate.gs_SSHAuthorizedKeysTooltip_benefit_1, globalTranslate.gs_SSHAuthorizedKeysTooltip_benefit_2, globalTranslate.gs_SSHAuthorizedKeysTooltip_benefit_3, globalTranslate.gs_SSHAuthorizedKeysTooltip_benefit_4],
        list7: [{
          term: globalTranslate.gs_SSHAuthorizedKeysTooltip_security,
          definition: null
        }],
        list8: [globalTranslate.gs_SSHAuthorizedKeysTooltip_security_1, globalTranslate.gs_SSHAuthorizedKeysTooltip_security_2, globalTranslate.gs_SSHAuthorizedKeysTooltip_security_3],
        warning: {
          header: globalTranslate.gs_SSHAuthorizedKeysTooltip_warning_header,
          text: globalTranslate.gs_SSHAuthorizedKeysTooltip_warning
        },
        note: globalTranslate.gs_SSHAuthorizedKeysTooltip_note
      };
    }
    /**
     * Get SSH_ID_RSA_PUB tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for SSH_ID_RSA_PUB field
     */

  }, {
    key: "getSSH_ID_RSA_PUBTooltip",
    value: function getSSH_ID_RSA_PUBTooltip() {
      return {
        header: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_header,
        description: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_desc,
        list: [{
          term: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_what_is,
          definition: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_what_is_desc
        }],
        list2: [{
          term: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_usage,
          definition: null
        }],
        list3: [globalTranslate.gs_SSH_ID_RSA_PUBTooltip_usage_1, globalTranslate.gs_SSH_ID_RSA_PUBTooltip_usage_2, globalTranslate.gs_SSH_ID_RSA_PUBTooltip_usage_3, globalTranslate.gs_SSH_ID_RSA_PUBTooltip_usage_4],
        list4: [{
          term: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_generation,
          definition: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_generation_desc
        }],
        list5: [{
          term: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_how_to_use,
          definition: null
        }],
        list6: [globalTranslate.gs_SSH_ID_RSA_PUBTooltip_use_1, globalTranslate.gs_SSH_ID_RSA_PUBTooltip_use_2, globalTranslate.gs_SSH_ID_RSA_PUBTooltip_use_3],
        list7: [{
          term: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_format,
          definition: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_format_desc
        }],
        warning: {
          header: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_warning_header,
          text: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_warning
        },
        note: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_note
      };
    }
    /**
     * Get WEBHTTPSPublicKey tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for WEBHTTPSPublicKey field
     */

  }, {
    key: "getWEBHTTPSPublicKeyTooltip",
    value: function getWEBHTTPSPublicKeyTooltip() {
      return {
        header: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_header,
        description: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_desc,
        list: [{
          term: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_what_is,
          definition: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_what_is_desc
        }],
        list2: [{
          term: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_where_used,
          definition: null
        }],
        list3: [globalTranslate.gs_WEBHTTPSPublicKeyTooltip_used_nginx, globalTranslate.gs_WEBHTTPSPublicKeyTooltip_used_webrtc, globalTranslate.gs_WEBHTTPSPublicKeyTooltip_used_ajam, globalTranslate.gs_WEBHTTPSPublicKeyTooltip_used_api],
        list4: [{
          term: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_format,
          definition: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_format_desc
        }],
        list5: [{
          term: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_obtain,
          definition: null
        }],
        list6: [globalTranslate.gs_WEBHTTPSPublicKeyTooltip_obtain_letsencrypt, globalTranslate.gs_WEBHTTPSPublicKeyTooltip_obtain_ca, globalTranslate.gs_WEBHTTPSPublicKeyTooltip_obtain_self],
        list7: [{
          term: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_chain,
          definition: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_chain_desc
        }],
        note: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_note,
        footer: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_footer
      };
    }
    /**
     * Get WEBHTTPSPrivateKey tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for WEBHTTPSPrivateKey field
     */

  }, {
    key: "getWEBHTTPSPrivateKeyTooltip",
    value: function getWEBHTTPSPrivateKeyTooltip() {
      return {
        header: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_header,
        description: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_desc,
        list: [{
          term: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_what_is,
          definition: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_what_is_desc
        }],
        list2: [{
          term: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_purpose,
          definition: null
        }],
        list3: [globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_purpose_1, globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_purpose_2, globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_purpose_3],
        list4: [{
          term: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_format,
          definition: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_format_desc
        }],
        warning: {
          header: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_warning_header,
          text: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_warning
        },
        list5: [{
          term: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_security,
          definition: null
        }],
        list6: [globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_security_1, globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_security_2, globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_security_3, globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_security_4],
        list7: [{
          term: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_compatibility,
          definition: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_compatibility_desc
        }],
        note: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_note,
        footer: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_footer
      };
    }
    /**
     * Get Passkeys tooltip configuration
     *
     * @private
     * @static
     * @returns {Object} Tooltip configuration for Passkeys field
     */

  }, {
    key: "getPasskeysTooltip",
    value: function getPasskeysTooltip() {
      return {
        header: globalTranslate.pk_PasskeysTooltip_header,
        description: globalTranslate.pk_PasskeysTooltip_desc,
        list: [{
          term: globalTranslate.pk_PasskeysTooltip_what_is,
          definition: globalTranslate.pk_PasskeysTooltip_what_is_desc
        }],
        list2: [{
          term: globalTranslate.pk_PasskeysTooltip_supported_methods,
          definition: null
        }],
        list3: [globalTranslate.pk_PasskeysTooltip_method_biometric, globalTranslate.pk_PasskeysTooltip_method_hardware, globalTranslate.pk_PasskeysTooltip_method_platform],
        list4: [{
          term: globalTranslate.pk_PasskeysTooltip_advantages,
          definition: null
        }],
        list5: [globalTranslate.pk_PasskeysTooltip_advantage_security, globalTranslate.pk_PasskeysTooltip_advantage_speed, globalTranslate.pk_PasskeysTooltip_advantage_no_passwords, globalTranslate.pk_PasskeysTooltip_advantage_unique],
        list6: [{
          term: globalTranslate.pk_PasskeysTooltip_how_to_use,
          definition: null
        }],
        list7: [globalTranslate.pk_PasskeysTooltip_use_step_1, globalTranslate.pk_PasskeysTooltip_use_step_2, globalTranslate.pk_PasskeysTooltip_use_step_3],
        list8: [{
          term: globalTranslate.pk_PasskeysTooltip_compatibility,
          definition: globalTranslate.pk_PasskeysTooltip_compatibility_desc
        }],
        list9: [{
          term: globalTranslate.pk_PasskeysTooltip_security,
          definition: globalTranslate.pk_PasskeysTooltip_security_desc
        }],
        note: globalTranslate.pk_PasskeysTooltip_note
      };
    }
    /**
     * Build HTML content for tooltip popup
     * @param {Object} config - Configuration object for tooltip content
     * @returns {string} - HTML string for tooltip content
     */

  }, {
    key: "buildTooltipContent",
    value: function buildTooltipContent(config) {
      var _this = this;

      if (!config) return '';
      var html = ''; // Add header if exists

      if (config.header) {
        html += "<div class=\"header\"><strong>".concat(config.header, "</strong></div>");
        html += '<div class="ui divider"></div>';
      } // Add description if exists


      if (config.description) {
        html += "<p>".concat(config.description, "</p>");
      } // Add list items if exist


      if (config.list) {
        if (Array.isArray(config.list) && config.list.length > 0) {
          html += '<ul>';
          config.list.forEach(function (item) {
            if (typeof item === 'string') {
              html += "<li>".concat(item, "</li>");
            } else if (item.term && item.definition === null) {
              // Header item without definition
              html += "</ul><p><strong>".concat(item.term, "</strong></p><ul>");
            } else if (item.term && item.definition) {
              html += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
            }
          });
          html += '</ul>';
        } else if (_typeof(config.list) === 'object') {
          // Old format - object with key-value pairs
          html += '<ul>';
          Object.entries(config.list).forEach(function (_ref) {
            var _ref2 = _slicedToArray(_ref, 2),
                term = _ref2[0],
                definition = _ref2[1];

            html += "<li><strong>".concat(term, ":</strong> ").concat(definition, "</li>");
          });
          html += '</ul>';
        }
      } // Add additional lists (list2, list3, etc.)


      for (var i = 2; i <= 10; i++) {
        var listName = "list".concat(i);

        if (config[listName] && config[listName].length > 0) {
          html += '<ul>';
          config[listName].forEach(function (item) {
            if (typeof item === 'string') {
              html += "<li>".concat(item, "</li>");
            } else if (item.term && item.definition === null) {
              html += "</ul><p><strong>".concat(item.term, "</strong></p><ul>");
            } else if (item.term && item.definition) {
              html += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
            }
          });
          html += '</ul>';
        }
      } // Add warning if exists


      if (config.warning) {
        html += '<div class="ui small orange message">';

        if (config.warning.header) {
          html += "<div class=\"header\">";
          html += "<i class=\"exclamation triangle icon\"></i> ";
          html += config.warning.header;
          html += "</div>";
        }

        html += config.warning.text;
        html += '</div>';
      } // Add code examples if exist


      if (config.examples && config.examples.length > 0) {
        if (config.examplesHeader) {
          html += "<p><strong>".concat(config.examplesHeader, ":</strong></p>");
        }

        html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
        html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">'; // Process examples with syntax highlighting for sections

        config.examples.forEach(function (example, index) {
          var escapedExample = _this.escapeHtml(example);

          if (example.startsWith('[') && example.endsWith(']')) {
            // Section header
            html += "<span style=\"color: #2185d0; font-weight: bold;\">".concat(escapedExample, "</span>");
          } else if (example.includes('=')) {
            // Key-value pair
            var _example$split$map = example.split('=').map(function (s) {
              return s.trim();
            }),
                _example$split$map2 = _slicedToArray(_example$split$map, 2),
                key = _example$split$map2[0],
                value = _example$split$map2[1];

            html += "<span style=\"color: #e91e63;\">".concat(_this.escapeHtml(key), "</span>");
            html += ' = ';
            html += "<span style=\"color: #21ba45;\">".concat(_this.escapeHtml(value || ''), "</span>");
          } else {
            // Regular text or empty line
            html += escapedExample;
          }

          if (index < config.examples.length - 1) {
            html += '\n';
          }
        });
        html += '</pre>';
        html += '</div>';
      } // Add note if exists


      if (config.note) {
        html += "<p class=\"ui small\" style=\"margin-top: 10px;\"><em>".concat(config.note, "</em></p>");
      }

      return html;
    }
    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */

  }, {
    key: "escapeHtml",
    value: function escapeHtml(text) {
      var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return String(text).replace(/[&<>"']/g, function (m) {
        return map[m];
      });
    }
    /**
     * Initialize all general settings tooltips
     *
     * This method builds the complete tooltip configurations and attaches
     * them to the corresponding field icons using TooltipBuilder for proper event handling.
     *
     * @static
     */

  }, {
    key: "initialize",
    value: function initialize() {
      var _this2 = this;

      try {
        // Check if TooltipBuilder is available
        if (typeof TooltipBuilder === 'undefined') {
          console.error('TooltipBuilder is not available, falling back to direct popup initialization');
          var tooltipConfigs = this.getTooltipConfigurations(); // Build HTML content for each tooltip configuration

          var htmlConfigs = {};
          Object.entries(tooltipConfigs).forEach(function (_ref3) {
            var _ref4 = _slicedToArray(_ref3, 2),
                fieldName = _ref4[0],
                config = _ref4[1];

            htmlConfigs[fieldName] = _this2.buildTooltipContent(config);
          }); // Initialize tooltip for each field info icon (fallback)

          $('.field-info-icon').each(function (index, element) {
            var $icon = $(element);
            var fieldName = $icon.data('field');
            var content = htmlConfigs[fieldName];

            if (content) {
              $icon.popup({
                html: content,
                position: 'top right',
                hoverable: true,
                delay: {
                  show: 300,
                  hide: 100
                },
                variation: 'flowing',
                on: 'click' // Show on click for better control

              });
            }
          });
        } else {
          // Use TooltipBuilder for proper event handling
          var _tooltipConfigs = this.getTooltipConfigurations(); // Build HTML content for each tooltip configuration


          var _htmlConfigs = {};
          Object.entries(_tooltipConfigs).forEach(function (_ref5) {
            var _ref6 = _slicedToArray(_ref5, 2),
                fieldName = _ref6[0],
                config = _ref6[1];

            _htmlConfigs[fieldName] = _this2.buildTooltipContent(config);
          }); // Initialize using TooltipBuilder which includes click prevention

          TooltipBuilder.initialize(_htmlConfigs, {
            selector: '.field-info-icon',
            position: 'top right',
            hoverable: true,
            showDelay: 300,
            hideDelay: 100,
            variation: 'flowing'
          });
        }
      } catch (error) {
        console.error('Failed to initialize general settings tooltips:', error);
      }
    }
    /**
     * Update specific tooltip content
     * 
     * @static
     * @param {string} fieldName - Field name to update
     * @param {Object|string} tooltipData - New tooltip data or HTML content
     */

  }, {
    key: "updateTooltip",
    value: function updateTooltip(fieldName, tooltipData) {
      try {
        if (typeof TooltipBuilder === 'undefined') {
          console.error('TooltipBuilder is not available');
          return;
        }

        TooltipBuilder.update(fieldName, tooltipData);
      } catch (error) {
        console.error("Failed to update tooltip for field '".concat(fieldName, "':"), error);
      }
    }
    /**
     * Destroy all general settings tooltips
     * 
     * @static
     * @param {string} [selector='.field-info-icon'] - jQuery selector for tooltip icons
     */

  }, {
    key: "destroy",
    value: function destroy() {
      var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '.field-info-icon';

      try {
        if (typeof TooltipBuilder === 'undefined') {
          console.error('TooltipBuilder is not available');
          return;
        }

        TooltipBuilder.destroy(selector);
      } catch (error) {
        console.error('Failed to destroy general settings tooltips:', error);
      }
    }
  }]);

  return GeneralSettingsTooltipManager;
}(); // Export for use in other modules


if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeneralSettingsTooltipManager;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsImdldFJlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcCIsImdldFNlbmRNZXRyaWNzVG9vbHRpcCIsImdldEFsbG93R3Vlc3RDYWxsc1Rvb2x0aXAiLCJnZXRQQlhMYW5ndWFnZVRvb2x0aXAiLCJnZXRQQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXAiLCJnZXRNYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwIiwiZ2V0UmVjb3JkQ2FsbHNUb29sdGlwIiwiZ2V0UmVjb3JkQ2FsbHNJbm5lclRvb2x0aXAiLCJnZXRVc2VXZWJSVENUb29sdGlwIiwiZ2V0UmVkaXJlY3RUb0h0dHBzVG9vbHRpcCIsImdldFNTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXAiLCJnZXRBSkFNRW5hYmxlZFRvb2x0aXAiLCJnZXRBTUlFbmFibGVkVG9vbHRpcCIsImdldEFSSUVuYWJsZWRUb29sdGlwIiwiZ2V0QVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwIiwiZ2V0UEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwIiwiZ2V0UEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwIiwiZ2V0UEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwIiwiZ2V0UEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcCIsImdldFBCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwIiwiZ2V0UEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXAiLCJnZXRSVFBQb3J0UmFuZ2VUb29sdGlwIiwiZ2V0UlRQU3R1blNlcnZlclRvb2x0aXAiLCJnZXRTSVBBdXRoUHJlZml4VG9vbHRpcCIsImdldFNJUERlZmF1bHRFeHBpcnlUb29sdGlwIiwiZ2V0U0lQRXhwaXJ5UmFuZ2VUb29sdGlwIiwiZ2V0U1NIQXV0aG9yaXplZEtleXNUb29sdGlwIiwiZ2V0U1NIX0lEX1JTQV9QVUJUb29sdGlwIiwiZ2V0V0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwIiwiZ2V0V0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcCIsImdldFBhc3NrZXlzVG9vbHRpcCIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJnc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfd2hlbiIsImRlZmluaXRpb24iLCJnc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfd2hlbl9kZXNjIiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2JlbmVmaXRzIiwibGlzdDIiLCJnc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfYmVuZWZpdF9tZW1vcnkiLCJnc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfYmVuZWZpdF9zdGFiaWxpdHkiLCJsaXN0MyIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kcmF3YmFja3MiLCJsaXN0NCIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kcmF3YmFja19jYWxscyIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kcmF3YmFja19yZWdpc3RyYXRpb24iLCJub3RlIiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX3JlY29tbWVuZGF0aW9uIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2hlYWRlciIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9kZXNjIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3B1cnBvc2UiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfcHVycG9zZV9kZXNjIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3doYXRfY29sbGVjdGVkIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2NvbGxlY3RlZF9lcnJvcnMiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX2NyYXNoZXMiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX3BlcmZvcm1hbmNlIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2NvbGxlY3RlZF92ZXJzaW9uIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2NvbGxlY3RlZF9lbnZpcm9ubWVudCIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9iZW5lZml0cyIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9iZW5lZml0X3F1aWNrX2ZpeGVzIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRfc3RhYmlsaXR5IiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRfc3VwcG9ydCIsImxpc3Q1IiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3ByaXZhY3kiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfcHJpdmFjeV9kZXNjIiwid2FybmluZyIsImljb24iLCJ0ZXh0IiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3dhcm5pbmciLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfbm90ZSIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfaGVhZGVyIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9kZXNjIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfd2FybmluZyIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfd2hlbl9lbmFibGUiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2VuYWJsZV9hbm9ueW1vdXMiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2VuYWJsZV9pbnRlcmNvbSIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX2Rvb3JwaG9uZSIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX3B1YmxpYyIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfdGVjaG5pY2FsIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF90ZWNobmljYWxfZW5kcG9pbnQiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3RlY2huaWNhbF9jb250ZXh0IiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF90ZWNobmljYWxfbW9kdWxlIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9zZWN1cml0eSIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfc2VjdXJpdHlfZGVzYyIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfcmVjb21tZW5kYXRpb24iLCJnc19QQlhMYW5ndWFnZVRvb2x0aXBfaGVhZGVyIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2Rlc2MiLCJnc19QQlhMYW5ndWFnZVRvb2x0aXBfYWZmZWN0cyIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzX3ZvaWNlIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHNfcHJvbXB0cyIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzX2l2ciIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzX3ZvaWNlbWFpbCIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9yZXN0YXJ0IiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX3Jlc3RhcnRfZGVzYyIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9ub3RlIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2hlYWRlciIsImdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9kZXNjIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2FmZmVjdHMiLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfYWZmZWN0c19uZXciLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfYWZmZWN0c192YWxpZGF0aW9uIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2FmZmVjdHNfc2VhcmNoIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVzIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVfMyIsImdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9leGFtcGxlXzQiLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfZXhhbXBsZV81IiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX3dhcm5pbmciLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfbm90ZSIsImdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfaGVhZGVyIiwiZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9kZXNjIiwiZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9hdXRvIiwiZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9hdXRvX2Rlc2MiLCJnc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX21hbnVhbCIsImdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfbWFudWFsX2Rlc2MiLCJnc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX25vdGUiLCJnc19SZWNvcmRDYWxsc1Rvb2x0aXBfaGVhZGVyIiwiZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX2Rlc2MiLCJnc19SZWNvcmRDYWxsc1Rvb2x0aXBfc3RvcmFnZSIsImdzX1JlY29yZENhbGxzVG9vbHRpcF9zdG9yYWdlX2Rlc2MiLCJnc19SZWNvcmRDYWxsc1Rvb2x0aXBfbGVnYWwiLCJnc19SZWNvcmRDYWxsc1Rvb2x0aXBfbGVnYWxfZGVzYyIsImdzX1JlY29yZENhbGxzVG9vbHRpcF93YXJuaW5nIiwiZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfaGVhZGVyIiwiZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfZGVzYyIsImdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlIiwiZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfdXNhZ2VfdHJhaW5pbmciLCJnc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF91c2FnZV9xdWFsaXR5IiwiZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfdXNhZ2Vfc2VjdXJpdHkiLCJnc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF9ub3RlIiwiZ3NfVXNlV2ViUlRDVG9vbHRpcF9oZWFkZXIiLCJnc19Vc2VXZWJSVENUb29sdGlwX2Rlc2MiLCJnc19Vc2VXZWJSVENUb29sdGlwX2JlbmVmaXRzIiwiZ3NfVXNlV2ViUlRDVG9vbHRpcF9iZW5lZml0X2Jyb3dzZXIiLCJnc19Vc2VXZWJSVENUb29sdGlwX2JlbmVmaXRfbm9fc29mdHdhcmUiLCJnc19Vc2VXZWJSVENUb29sdGlwX2JlbmVmaXRfZW5jcnlwdGlvbiIsImdzX1VzZVdlYlJUQ1Rvb2x0aXBfcmVxdWlyZW1lbnRzIiwiZ3NfVXNlV2ViUlRDVG9vbHRpcF9yZXF1aXJlbWVudHNfZGVzYyIsImdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfaGVhZGVyIiwiZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9kZXNjIiwiZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9zZWN1cml0eSIsImdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfc2VjdXJpdHlfZGVzYyIsImdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfY2VydGlmaWNhdGUiLCJnc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX2NlcnRpZmljYXRlX2Rlc2MiLCJnc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX25vdGUiLCJnc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2hlYWRlciIsImdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfZGVzYyIsImdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX3dhcm5pbmciLCJnc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2JlbmVmaXRzIiwiZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9iZW5lZml0X3NlY3VyaXR5IiwiZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9iZW5lZml0X2JydXRlZm9yY2UiLCJnc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2JlbmVmaXRfY29tcGxpYW5jZSIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9oZWFkZXIiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfZGVzYyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF93aGF0X2lzIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3doYXRfaXNfZGVzYyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZSIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZV93ZWJhcHBzIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3VzYWdlX3BhbmVscyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZV93aWRnZXRzIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3VzYWdlX21vbml0b3JpbmciLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfcHJvdG9jb2xzIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3Byb3RvY29sc19kZXNjIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2RlZmF1bHQiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfZGVmYXVsdF9kZXNjIiwibGlzdDYiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfd2hlbl9kaXNhYmxlIiwibGlzdDciLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8xIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMiIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9kaXNhYmxlXzMiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfd2FybmluZyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9ub3RlIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfaGVhZGVyIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGVzYyIsImdzX0FNSUVuYWJsZWRUb29sdGlwX3doYXRfaXMiLCJnc19BTUlFbmFibGVkVG9vbHRpcF93aGF0X2lzX2Rlc2MiLCJnc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZSIsImdzX0FNSUVuYWJsZWRUb29sdGlwX3VzYWdlX21vbml0b3JpbmciLCJnc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9pbnRlZ3JhdGlvbiIsImdzX0FNSUVuYWJsZWRUb29sdGlwX3VzYWdlX2NvbnRyb2wiLCJnc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9ldmVudHMiLCJnc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9jb21tYW5kcyIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVzIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9jcm0iLCJnc19BTUlFbmFibGVkVG9vbHRpcF9leGFtcGxlX3dhbGxib2FyZCIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfY3RpIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9yZXBvcnRpbmciLCJnc19BTUlFbmFibGVkVG9vbHRpcF9kZWZhdWx0IiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGVmYXVsdF9kZXNjIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2hlbl9kaXNhYmxlIiwibGlzdDgiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9kaXNhYmxlXzEiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9kaXNhYmxlXzIiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9kaXNhYmxlXzMiLCJnc19BTUlFbmFibGVkVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImdzX0FNSUVuYWJsZWRUb29sdGlwX3dhcm5pbmciLCJmb290ZXIiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9mb290ZXIiLCJnc19BUklFbmFibGVkVG9vbHRpcF9oZWFkZXIiLCJnc19BUklFbmFibGVkVG9vbHRpcF9kZXNjIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfd2hhdF9pcyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3doYXRfaXNfZGVzYyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfdXNhZ2Vfd2VicnRjIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfdXNhZ2VfaXZyIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfdXNhZ2VfY29uZmVyZW5jZSIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX3JlY29yZGluZyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX2N1c3RvbSIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVzIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV93ZWJwaG9uZSIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfYm90IiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9xdWV1ZSIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfYW5hbHl0aWNzIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZGVmYXVsdCIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2RlZmF1bHRfZGVzYyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3doZW5fZW5hYmxlIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZW5hYmxlXzEiLCJnc19BUklFbmFibGVkVG9vbHRpcF9lbmFibGVfMiIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2VuYWJsZV8zIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19BUklFbmFibGVkVG9vbHRpcF93YXJuaW5nIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZm9vdGVyIiwiZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2hlYWRlciIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9kZXNjIiwiZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3doYXRfaXMiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfd2hhdF9pc19kZXNjIiwiZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2Zvcm1hdCIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9mb3JtYXRfZGVzYyIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9leGFtcGxlcyIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9leGFtcGxlXzEiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZXhhbXBsZV8yIiwiZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2V4YW1wbGVfMyIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9zZWN1cml0eSIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9zZWN1cml0eV8xIiwiZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3NlY3VyaXR5XzIiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfc2VjdXJpdHlfMyIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9kZWZhdWx0IiwiZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2RlZmF1bHRfZGVzYyIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9mb290ZXIiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaGVhZGVyIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2Rlc2MiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaG93IiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hvd19kaWFsIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hvd19hbm5vdW5jZSIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ob3dfcmV0cmlldmUiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfc2xvdHMiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfc2xvdHNfcmFuZ2UiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfc2xvdHNfY2FwYWNpdHkiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfc2xvdHNfYXV0b21hdGljIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2V4YW1wbGUiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfZXhhbXBsZV9kZXNjIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX25vdGUiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaGVhZGVyIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2Rlc2MiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93IiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvd19wcmVzcyIsImdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ob3dfZGlhbCIsImdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ob3dfdGFsayIsImdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ob3dfY29tcGxldGUiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfYmVuZWZpdHMiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfYmVuZWZpdHNfZGVzYyIsImdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ub3RlIiwiZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hlYWRlciIsImdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9kZXNjIiwiZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hvdyIsImdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9ob3dfcHJlc3MiLCJnc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaG93X2RpYWwiLCJnc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaG93X2hhbmd1cCIsImdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF93YXJuaW5nIiwiZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX25vdGUiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX2hlYWRlciIsImdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfZGVzYyIsImdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdHlwZXMiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3R5cGVfZ2VuZXJhbCIsImdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdHlwZV9nZW5lcmFsX2Rlc2MiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3R5cGVfZGlyZWN0ZWQiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3R5cGVfZGlyZWN0ZWRfZGVzYyIsImdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdXNhZ2UiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3VzYWdlX2Rlc2MiLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9oZWFkZXIiLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9kZXNjIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfc2NlbmFyaW8iLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18xIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfc2NlbmFyaW9fMiIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3NjZW5hcmlvXzMiLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9kZWZhdWx0IiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfZGVmYXVsdF9kZXNjIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfcmVjb21tZW5kYXRpb25zIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfcmVjX3N0YW5kYXJkIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfcmVjX3F1aWNrIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfcmVjX2V4dGVuZGVkIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfaGVhZGVyIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfZGVzYyIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX3VzYWdlIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfdXNhZ2VfZGVzYyIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2RlZmF1bHQiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF93aGVuX3RvX2NoYW5nZSIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9pbmNyZWFzZSIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9pbmNyZWFzZV9kZXNjIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfY2hhbmdlX2RlY3JlYXNlIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfY2hhbmdlX2RlY3JlYXNlX2Rlc2MiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9mb290ZXIiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2hlYWRlciIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZGVzYyIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfcHVycG9zZSIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfcHVycG9zZV9tZWRpYSIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfcHVycG9zZV9iaWRpcmVjdGlvbmFsIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9wdXJwb3NlX3VuaXF1ZSIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZGVmYXVsdCIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZGVmYXVsdF9kZXNjIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jYWxjdWxhdGlvbiIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2FsY3VsYXRpb25fZGVzYyIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfd2hlbl90b19jaGFuZ2UiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NoYW5nZV9pbmNyZWFzZSIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX2luY3JlYXNlX2Rlc2MiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NoYW5nZV9jdXN0b20iLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NoYW5nZV9jdXN0b21fZGVzYyIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX25hdCIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX25hdF9kZXNjIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9mb290ZXIiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9oZWFkZXIiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9kZXNjIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfcHVycG9zZV9oZWFkZXIiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9wdXJwb3NlXzEiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9wdXJwb3NlXzIiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9wdXJwb3NlXzMiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9ob3dfaXRfd29ya3MiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9ob3dfaXRfd29ya3NfZGVzYyIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2Zvcm1hdCIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2Zvcm1hdF9kZXNjIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfd2hlbl90b191c2UiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF91c2VfMSIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3VzZV8yIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfdXNlXzMiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlcyIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2V4YW1wbGVfMSIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2V4YW1wbGVfMiIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2V4YW1wbGVfMyIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2Zvb3RlciIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX2hlYWRlciIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX2Rlc2MiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF9wdXJwb3NlIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfcHVycG9zZV9kZXNjIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfaG93X2l0X3dvcmtzIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfd29ya18xIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfd29ya18yIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfd29ya18zIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfZGVmYXVsdCIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX2RlZmF1bHRfZGVzYyIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3doZW5fdG9fdXNlIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfdXNlXzEiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF91c2VfMiIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV8zIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfdXNlXzQiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dhcm5pbmciLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9oZWFkZXIiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9kZXNjIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfcHVycG9zZSIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3B1cnBvc2VfZGVzYyIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2hvd19pdF93b3JrcyIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3dvcmtfMSIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3dvcmtfMiIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3dvcmtfMyIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2RlZmF1bHQiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF93aGVuX3RvX2NoYW5nZSIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9tb2JpbGUiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9jaGFuZ2Vfc3RhYmxlIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfY2hhbmdlX2JhdHRlcnkiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9ub3RlIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX2hlYWRlciIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9kZXNjIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9oZWFkZXIiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX2Rlc2MiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX3Byb3RlY3QiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX2RlZmF1bHQiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX25hdCIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfaGVhZGVyIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21heF9kZXNjIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21heF90aW1lb3V0IiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21heF9kZWZhdWx0IiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21heF9yZWR1Y2UiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjb21tZW5kYXRpb25zIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY19sb2NhbCIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9yZWNfaW50ZXJuZXQiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX21vYmlsZSIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9yZWNfZGVmYXVsdCIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9ob3dfaXRfd29ya3MiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfaG93X2l0X3dvcmtzX2Rlc2MiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfd2FybmluZyIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9ub3RlIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2hlYWRlciIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9kZXNjIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3doYXRfaXMiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfd2hhdF9pc19kZXNjIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2Zvcm1hdCIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9mb3JtYXRfZGVzYyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9ob3dfdG9fYWRkIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2FkZF8xIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2FkZF8yIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2FkZF8zIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2FkZF80IiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2JlbmVmaXRzIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2JlbmVmaXRfMSIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzIiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYmVuZWZpdF8zIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2JlbmVmaXRfNCIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9zZWN1cml0eSIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9zZWN1cml0eV8xIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3NlY3VyaXR5XzIiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfc2VjdXJpdHlfMyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF93YXJuaW5nIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX25vdGUiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfaGVhZGVyIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2Rlc2MiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfd2hhdF9pcyIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF93aGF0X2lzX2Rlc2MiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2UiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2VfMSIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2FnZV8yIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzMiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2VfNCIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9nZW5lcmF0aW9uIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2dlbmVyYXRpb25fZGVzYyIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9ob3dfdG9fdXNlIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzZV8xIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzZV8yIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzZV8zIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2Zvcm1hdCIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9mb3JtYXRfZGVzYyIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF93YXJuaW5nIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX25vdGUiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfaGVhZGVyIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2Rlc2MiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfd2hhdF9pcyIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF93aGF0X2lzX2Rlc2MiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfd2hlcmVfdXNlZCIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF91c2VkX25naW54IiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3VzZWRfd2VicnRjIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3VzZWRfYWphbSIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF91c2VkX2FwaSIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9mb3JtYXQiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfZm9ybWF0X2Rlc2MiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfb2J0YWluIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX29idGFpbl9sZXRzZW5jcnlwdCIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fY2EiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfb2J0YWluX3NlbGYiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfY2hhaW4iLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfY2hhaW5fZGVzYyIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9ub3RlIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2Zvb3RlciIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfaGVhZGVyIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9kZXNjIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93aGF0X2lzIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93aGF0X2lzX2Rlc2MiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3B1cnBvc2UiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3B1cnBvc2VfMSIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfcHVycG9zZV8yIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9wdXJwb3NlXzMiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2Zvcm1hdCIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfZm9ybWF0X2Rlc2MiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93YXJuaW5nIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9zZWN1cml0eSIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHlfMSIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHlfMiIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHlfMyIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHlfNCIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfY29tcGF0aWJpbGl0eSIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfY29tcGF0aWJpbGl0eV9kZXNjIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9ub3RlIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9mb290ZXIiLCJwa19QYXNza2V5c1Rvb2x0aXBfaGVhZGVyIiwicGtfUGFzc2tleXNUb29sdGlwX2Rlc2MiLCJwa19QYXNza2V5c1Rvb2x0aXBfd2hhdF9pcyIsInBrX1Bhc3NrZXlzVG9vbHRpcF93aGF0X2lzX2Rlc2MiLCJwa19QYXNza2V5c1Rvb2x0aXBfc3VwcG9ydGVkX21ldGhvZHMiLCJwa19QYXNza2V5c1Rvb2x0aXBfbWV0aG9kX2Jpb21ldHJpYyIsInBrX1Bhc3NrZXlzVG9vbHRpcF9tZXRob2RfaGFyZHdhcmUiLCJwa19QYXNza2V5c1Rvb2x0aXBfbWV0aG9kX3BsYXRmb3JtIiwicGtfUGFzc2tleXNUb29sdGlwX2FkdmFudGFnZXMiLCJwa19QYXNza2V5c1Rvb2x0aXBfYWR2YW50YWdlX3NlY3VyaXR5IiwicGtfUGFzc2tleXNUb29sdGlwX2FkdmFudGFnZV9zcGVlZCIsInBrX1Bhc3NrZXlzVG9vbHRpcF9hZHZhbnRhZ2Vfbm9fcGFzc3dvcmRzIiwicGtfUGFzc2tleXNUb29sdGlwX2FkdmFudGFnZV91bmlxdWUiLCJwa19QYXNza2V5c1Rvb2x0aXBfaG93X3RvX3VzZSIsInBrX1Bhc3NrZXlzVG9vbHRpcF91c2Vfc3RlcF8xIiwicGtfUGFzc2tleXNUb29sdGlwX3VzZV9zdGVwXzIiLCJwa19QYXNza2V5c1Rvb2x0aXBfdXNlX3N0ZXBfMyIsInBrX1Bhc3NrZXlzVG9vbHRpcF9jb21wYXRpYmlsaXR5IiwicGtfUGFzc2tleXNUb29sdGlwX2NvbXBhdGliaWxpdHlfZGVzYyIsImxpc3Q5IiwicGtfUGFzc2tleXNUb29sdGlwX3NlY3VyaXR5IiwicGtfUGFzc2tleXNUb29sdGlwX3NlY3VyaXR5X2Rlc2MiLCJwa19QYXNza2V5c1Rvb2x0aXBfbm90ZSIsImNvbmZpZyIsImh0bWwiLCJBcnJheSIsImlzQXJyYXkiLCJsZW5ndGgiLCJmb3JFYWNoIiwiaXRlbSIsIk9iamVjdCIsImVudHJpZXMiLCJpIiwibGlzdE5hbWUiLCJleGFtcGxlcyIsImV4YW1wbGVzSGVhZGVyIiwiZXhhbXBsZSIsImluZGV4IiwiZXNjYXBlZEV4YW1wbGUiLCJlc2NhcGVIdG1sIiwic3RhcnRzV2l0aCIsImVuZHNXaXRoIiwiaW5jbHVkZXMiLCJzcGxpdCIsIm1hcCIsInMiLCJ0cmltIiwia2V5IiwidmFsdWUiLCJTdHJpbmciLCJyZXBsYWNlIiwibSIsIlRvb2x0aXBCdWlsZGVyIiwiY29uc29sZSIsImVycm9yIiwidG9vbHRpcENvbmZpZ3MiLCJnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMiLCJodG1sQ29uZmlncyIsImZpZWxkTmFtZSIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCIkIiwiZWFjaCIsImVsZW1lbnQiLCIkaWNvbiIsImRhdGEiLCJjb250ZW50IiwicG9wdXAiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJ2YXJpYXRpb24iLCJvbiIsImluaXRpYWxpemUiLCJzZWxlY3RvciIsInNob3dEZWxheSIsImhpZGVEZWxheSIsInRvb2x0aXBEYXRhIiwidXBkYXRlIiwiZGVzdHJveSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLDZCO0FBQ0Y7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YyxDQUFDNEIsT0FBZixDQUF1QkwsUUFBdkI7QUFDSCxPQVBELENBT0UsT0FBT3JCLEtBQVAsRUFBYztBQUNaRCxRQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyw4Q0FBZCxFQUE4REEsS0FBOUQ7QUFDSDtBQUNKOzs7O0tBR0w7OztBQUNBLElBQUksT0FBTzJCLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQnZqQiw2QkFBakI7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgLSBNYW5hZ2VzIHRvb2x0aXBzIGZvciBHZW5lcmFsIFNldHRpbmdzIGZvcm1cbiAqIFxuICogVGhpcyBjbGFzcyBwcm92aWRlcyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBnZW5lcmFsIHNldHRpbmdzIGZpZWxkcyxcbiAqIGhlbHBpbmcgdXNlcnMgdW5kZXJzdGFuZCB0aGUgcHVycG9zZSBhbmQgaW1wbGljYXRpb25zIG9mIGVhY2ggc2V0dGluZy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIHN5c3RlbSBzZXR0aW5nc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIFRvb2x0aXBCdWlsZGVyXG4gKiAtIENvbnNpc3RlbnQgc3RydWN0dXJlIGZvbGxvd2luZyB0aGUgZXN0YWJsaXNoZWQgcGF0dGVyblxuICogXG4gKiBAY2xhc3MgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXJcbiAqL1xuY2xhc3MgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIge1xuICAgIC8qKlxuICAgICAqIFByaXZhdGUgY29uc3RydWN0b3IgdG8gcHJldmVudCBpbnN0YW50aWF0aW9uXG4gICAgICogVGhpcyBjbGFzcyB1c2VzIHN0YXRpYyBtZXRob2RzIGZvciB1dGlsaXR5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZ2VuZXJhbCBzZXR0aW5nc1xuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBnZW5lcmFsIHNldHRpbmdzIGZpZWxkc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAnUmVzdGFydEV2ZXJ5TmlnaHQnOiB0aGlzLmdldFJlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1NlbmRNZXRyaWNzJzogdGhpcy5nZXRTZW5kTWV0cmljc1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhBbGxvd0d1ZXN0Q2FsbHMnOiB0aGlzLmdldEFsbG93R3Vlc3RDYWxsc1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhMYW5ndWFnZSc6IHRoaXMuZ2V0UEJYTGFuZ3VhZ2VUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGgnOiB0aGlzLmdldFBCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWE1hbnVhbFRpbWVTZXR0aW5ncyc6IHRoaXMuZ2V0TWFudWFsVGltZVNldHRpbmdzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWFJlY29yZENhbGxzJzogdGhpcy5nZXRSZWNvcmRDYWxsc1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhSZWNvcmRDYWxsc0lubmVyJzogdGhpcy5nZXRSZWNvcmRDYWxsc0lubmVyVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1VzZVdlYlJUQyc6IHRoaXMuZ2V0VXNlV2ViUlRDVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1JlZGlyZWN0VG9IdHRwcyc6IHRoaXMuZ2V0UmVkaXJlY3RUb0h0dHBzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1NTSERpc2FibGVQYXNzd29yZExvZ2lucyc6IHRoaXMuZ2V0U1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ0FKQU1FbmFibGVkJzogdGhpcy5nZXRBSkFNRW5hYmxlZFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdBTUlFbmFibGVkJzogdGhpcy5nZXRBTUlFbmFibGVkVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ0FSSUVuYWJsZWQnOiB0aGlzLmdldEFSSUVuYWJsZWRUb29sdGlwKCksXG4gICAgICAgICAgICAnQVJJQWxsb3dlZE9yaWdpbnMnOiB0aGlzLmdldEFSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWENhbGxQYXJraW5nRXh0JzogdGhpcy5nZXRQQlhDYWxsUGFya2luZ0V4dFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2Zlcic6IHRoaXMuZ2V0UEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXInOiB0aGlzLmdldFBCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWEZlYXR1cmVQaWNrdXBFeHRlbic6IHRoaXMuZ2V0UEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXQnOiB0aGlzLmdldFBCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYRmVhdHVyZURpZ2l0VGltZW91dCc6IHRoaXMuZ2V0UEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdSVFBQb3J0UmFuZ2UnOiB0aGlzLmdldFJUUFBvcnRSYW5nZVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdSVFBTdHVuU2VydmVyJzogdGhpcy5nZXRSVFBTdHVuU2VydmVyVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1NJUEF1dGhQcmVmaXgnOiB0aGlzLmdldFNJUEF1dGhQcmVmaXhUb29sdGlwKCksXG4gICAgICAgICAgICAnU0lQRGVmYXVsdEV4cGlyeSc6IHRoaXMuZ2V0U0lQRGVmYXVsdEV4cGlyeVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdTSVBFeHBpcnlSYW5nZSc6IHRoaXMuZ2V0U0lQRXhwaXJ5UmFuZ2VUb29sdGlwKCksXG4gICAgICAgICAgICAnU1NIQXV0aG9yaXplZEtleXMnOiB0aGlzLmdldFNTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1NTSF9JRF9SU0FfUFVCJzogdGhpcy5nZXRTU0hfSURfUlNBX1BVQlRvb2x0aXAoKSxcbiAgICAgICAgICAgICdXRUJIVFRQU1B1YmxpY0tleSc6IHRoaXMuZ2V0V0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwKCksXG4gICAgICAgICAgICAnV0VCSFRUUFNQcml2YXRlS2V5JzogdGhpcy5nZXRXRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwKCksXG4gICAgICAgICAgICAnUGFzc2tleXMnOiB0aGlzLmdldFBhc3NrZXlzVG9vbHRpcCgpXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFJlc3RhcnRFdmVyeU5pZ2h0IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUmVzdGFydEV2ZXJ5TmlnaHQgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX3doZW4sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfd2hlbl9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfYmVuZWZpdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2JlbmVmaXRfbWVtb3J5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfYmVuZWZpdF9zdGFiaWxpdHlcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kcmF3YmFja3MsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2RyYXdiYWNrX2NhbGxzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfZHJhd2JhY2tfcmVnaXN0cmF0aW9uXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9yZWNvbW1lbmRhdGlvblxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBTZW5kTWV0cmljcyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFNlbmRNZXRyaWNzIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFNlbmRNZXRyaWNzVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9wdXJwb3NlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3B1cnBvc2VfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3doYXRfY29sbGVjdGVkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9jb2xsZWN0ZWRfZXJyb3JzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX2NyYXNoZXMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9jb2xsZWN0ZWRfcGVyZm9ybWFuY2UsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9jb2xsZWN0ZWRfdmVyc2lvbixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2NvbGxlY3RlZF9lbnZpcm9ubWVudFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9iZW5lZml0X3F1aWNrX2ZpeGVzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfYmVuZWZpdF9zdGFiaWxpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9iZW5lZml0X3N1cHBvcnRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9wcml2YWN5LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3ByaXZhY3lfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaWNvbjogJ2luZm8gY2lyY2xlJyxcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYQWxsb3dHdWVzdENhbGxzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYQWxsb3dHdWVzdENhbGxzIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldEFsbG93R3Vlc3RDYWxsc1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3doZW5fZW5hYmxlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX2Fub255bW91cyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9lbmFibGVfaW50ZXJjb20sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX2Rvb3JwaG9uZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9lbmFibGVfcHVibGljXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3RlY2huaWNhbCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3RlY2huaWNhbF9lbmRwb2ludCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF90ZWNobmljYWxfY29udGV4dCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF90ZWNobmljYWxfbW9kdWxlXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3NlY3VyaXR5LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9zZWN1cml0eV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3JlY29tbWVuZGF0aW9uXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWExhbmd1YWdlIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYTGFuZ3VhZ2UgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYTGFuZ3VhZ2VUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHNfdm9pY2UsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzX3Byb21wdHMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzX2l2cixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHNfdm9pY2VtYWlsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfcmVzdGFydCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9yZXN0YXJ0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGggZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2FmZmVjdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2FmZmVjdHNfbmV3LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfYWZmZWN0c192YWxpZGF0aW9uLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfYWZmZWN0c19zZWFyY2hcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9leGFtcGxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfZXhhbXBsZV8zLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfZXhhbXBsZV80LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfZXhhbXBsZV81XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhNYW51YWxUaW1lU2V0dGluZ3MgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhNYW51YWxUaW1lU2V0dGluZ3MgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0TWFudWFsVGltZVNldHRpbmdzVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9hdXRvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9hdXRvX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfbWFudWFsLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9tYW51YWxfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWFJlY29yZENhbGxzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYUmVjb3JkQ2FsbHMgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UmVjb3JkQ2FsbHNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX3N0b3JhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc1Rvb2x0aXBfc3RvcmFnZV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc1Rvb2x0aXBfbGVnYWwsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc1Rvb2x0aXBfbGVnYWxfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWFJlY29yZENhbGxzSW5uZXIgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhSZWNvcmRDYWxsc0lubmVyIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFJlY29yZENhbGxzSW5uZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlX3RyYWluaW5nLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF91c2FnZV9xdWFsaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF91c2FnZV9zZWN1cml0eVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFVzZVdlYlJUQyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFVzZVdlYlJUQyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRVc2VXZWJSVENUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfVXNlV2ViUlRDVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19Vc2VXZWJSVENUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdF9icm93c2VyLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19Vc2VXZWJSVENUb29sdGlwX2JlbmVmaXRfbm9fc29mdHdhcmUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdF9lbmNyeXB0aW9uXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19Vc2VXZWJSVENUb29sdGlwX3JlcXVpcmVtZW50cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfcmVxdWlyZW1lbnRzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFJlZGlyZWN0VG9IdHRwcyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFJlZGlyZWN0VG9IdHRwcyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRSZWRpcmVjdFRvSHR0cHNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX3NlY3VyaXR5LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9zZWN1cml0eV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX2NlcnRpZmljYXRlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9jZXJ0aWZpY2F0ZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFNTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfYmVuZWZpdF9zZWN1cml0eSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9iZW5lZml0X2JydXRlZm9yY2UsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfYmVuZWZpdF9jb21wbGlhbmNlXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IEFKQU1FbmFibGVkIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgQUpBTUVuYWJsZWQgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0QUpBTUVuYWJsZWRUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3doYXRfaXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZV93ZWJhcHBzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2VfcGFuZWxzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2Vfd2lkZ2V0cyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3VzYWdlX21vbml0b3JpbmdcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9wcm90b2NvbHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfcHJvdG9jb2xzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfd2hlbl9kaXNhYmxlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9kaXNhYmxlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9kaXNhYmxlXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9kaXNhYmxlXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBBTUlFbmFibGVkIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgQU1JRW5hYmxlZCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBTUlFbmFibGVkVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF93aGF0X2lzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfbW9uaXRvcmluZyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfaW50ZWdyYXRpb24sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX3VzYWdlX2NvbnRyb2wsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX3VzYWdlX2V2ZW50cyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfY29tbWFuZHNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfY3JtLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9leGFtcGxlX3dhbGxib2FyZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9jdGksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfcmVwb3J0aW5nXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGVmYXVsdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2hlbl9kaXNhYmxlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q4OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9kaXNhYmxlXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmb290ZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9mb290ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgQVJJRW5hYmxlZCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIEFSSUVuYWJsZWQgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0QVJJRW5hYmxlZFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfd2hhdF9pcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX3doYXRfaXNfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX3dlYnJ0YyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfdXNhZ2VfaXZyLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF91c2FnZV9jb25mZXJlbmNlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF91c2FnZV9yZWNvcmRpbmcsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX2N1c3RvbVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZXhhbXBsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV93ZWJwaG9uZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9ib3QsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfcXVldWUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfYW5hbHl0aWNzXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZGVmYXVsdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfd2hlbl9lbmFibGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDg6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZW5hYmxlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX2VuYWJsZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9lbmFibGVfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX2Zvb3RlclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBBUklBbGxvd2VkT3JpZ2lucyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIEFSSUFsbG93ZWRPcmlnaW5zIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldEFSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF93aGF0X2lzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3doYXRfaXNfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZXhhbXBsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2V4YW1wbGVfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2V4YW1wbGVfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2V4YW1wbGVfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3NlY3VyaXR5LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9zZWN1cml0eV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfc2VjdXJpdHlfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3NlY3VyaXR5XzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBmb290ZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZm9vdGVyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWENhbGxQYXJraW5nRXh0IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYQ2FsbFBhcmtpbmdFeHQgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hvdyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaG93X2RpYWwsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ob3dfYW5ub3VuY2UsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ob3dfcmV0cmlldmVcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9zbG90cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfc2xvdHNfcmFuZ2UsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9zbG90c19jYXBhY2l0eSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzX2F1dG9tYXRpY1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2V4YW1wbGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfZXhhbXBsZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlciB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFBCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ob3csXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvd19wcmVzcyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvd19kaWFsLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X3RhbGssXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ob3dfY29tcGxldGVcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9iZW5lZml0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9iZW5lZml0c19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhGZWF0dXJlQmxpbmRUcmFuc2ZlciB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWEZlYXR1cmVCbGluZFRyYW5zZmVyIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFBCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9ob3csXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hvd19wcmVzcyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hvd19kaWFsLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaG93X2hhbmd1cFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYRmVhdHVyZVBpY2t1cEV4dGVuIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYRmVhdHVyZVBpY2t1cEV4dGVuIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFBCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdHlwZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3R5cGVfZ2VuZXJhbCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdHlwZV9nZW5lcmFsX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdHlwZV9kaXJlY3RlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdHlwZV9kaXJlY3RlZF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF91c2FnZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdXNhZ2VfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXQgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfc2NlbmFyaW8sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfc2NlbmFyaW9fMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfc2NlbmFyaW9fMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfc2NlbmFyaW9fM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY29tbWVuZGF0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9yZWNfc3RhbmRhcmQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY19xdWljayxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfcmVjX2V4dGVuZGVkXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWEZlYXR1cmVEaWdpdFRpbWVvdXQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhGZWF0dXJlRGlnaXRUaW1lb3V0IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFBCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfdXNhZ2VfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF93aGVuX3RvX2NoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9pbmNyZWFzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9pbmNyZWFzZV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9jaGFuZ2VfZGVjcmVhc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9jaGFuZ2VfZGVjcmVhc2VfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBmb290ZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9mb290ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUlRQUG9ydFJhbmdlIHRvb2x0aXAgY29uZmlndXJhdGlvbiAoZm9yIFJUUFBvcnRGcm9tIGFuZCBSVFBQb3J0VG8pXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBSVFAgcG9ydCByYW5nZSBmaWVsZHNcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UlRQUG9ydFJhbmdlVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9wdXJwb3NlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfcHVycG9zZV9tZWRpYSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9wdXJwb3NlX2JpZGlyZWN0aW9uYWwsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfcHVycG9zZV91bmlxdWVcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZGVmYXVsdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jYWxjdWxhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2FsY3VsYXRpb25fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfd2hlbl90b19jaGFuZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NoYW5nZV9pbmNyZWFzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX2luY3JlYXNlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX2N1c3RvbSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX2N1c3RvbV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NoYW5nZV9uYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NoYW5nZV9uYXRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBmb290ZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX2Zvb3RlclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBSVFBTdHVuU2VydmVyIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUlRQU3R1blNlcnZlciBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRSVFBTdHVuU2VydmVyVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9wdXJwb3NlX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9wdXJwb3NlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3B1cnBvc2VfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfcHVycG9zZV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9ob3dfaXRfd29ya3MsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9ob3dfaXRfd29ya3NfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2Zvcm1hdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfd2hlbl90b191c2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfdXNlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3VzZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF91c2VfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZXhhbXBsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDg6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZXhhbXBsZV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2V4YW1wbGVfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2Zvb3RlclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBTSVBBdXRoUHJlZml4IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU0lQQXV0aFByZWZpeCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTSVBBdXRoUHJlZml4VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF9wdXJwb3NlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfcHVycG9zZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfaG93X2l0X3dvcmtzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dvcmtfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfd29ya18yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF93b3JrXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF93aGVuX3RvX3VzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF91c2VfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfdXNlXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV8zLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF91c2VfNFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBTSVBEZWZhdWx0RXhwaXJ5IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU0lQRGVmYXVsdEV4cGlyeSBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9wdXJwb3NlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfcHVycG9zZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfaG93X2l0X3dvcmtzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3dvcmtfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfd29ya18yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF93b3JrXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF93aGVuX3RvX2NoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9jaGFuZ2VfbW9iaWxlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9jaGFuZ2Vfc3RhYmxlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9jaGFuZ2VfYmF0dGVyeVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUEV4cGlyeVJhbmdlIHRvb2x0aXAgY29uZmlndXJhdGlvbiAoY29tYmluZWQgTWluIGFuZCBNYXgpXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTSVBFeHBpcnlSYW5nZSBmaWVsZHNcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0U0lQRXhwaXJ5UmFuZ2VUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9wcm90ZWN0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5fbmF0XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWF4X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWF4X3RpbWVvdXQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21heF9yZWR1Y2VcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY19sb2NhbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY19pbnRlcm5ldCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY19tb2JpbGUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9yZWNfZGVmYXVsdFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX2hvd19pdF93b3JrcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9ob3dfaXRfd29ya3NfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBTU0hBdXRob3JpemVkS2V5cyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFNTSEF1dGhvcml6ZWRLZXlzIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFNTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF93aGF0X2lzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3doYXRfaXNfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfaG93X3RvX2FkZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYWRkXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2FkZF8zLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYWRkXzRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYmVuZWZpdF8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYmVuZWZpdF8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYmVuZWZpdF8zLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYmVuZWZpdF80XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDg6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3NlY3VyaXR5XzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9zZWN1cml0eV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfc2VjdXJpdHlfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNTSF9JRF9SU0FfUFVCIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU1NIX0lEX1JTQV9QVUIgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0U1NIX0lEX1JTQV9QVUJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3doYXRfaXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2FnZV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2VfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2FnZV80XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZ2VuZXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9nZW5lcmF0aW9uX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfaG93X3RvX3VzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2VfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzZV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2Zvcm1hdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFdFQkhUVFBTUHVibGljS2V5IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgV0VCSFRUUFNQdWJsaWNLZXkgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0V0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3doYXRfaXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3doZXJlX3VzZWQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3VzZWRfbmdpbngsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF91c2VkX3dlYnJ0YyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3VzZWRfYWphbSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3VzZWRfYXBpXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2Zvcm1hdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX29idGFpbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfb2J0YWluX2xldHNlbmNyeXB0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfb2J0YWluX2NhLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfb2J0YWluX3NlbGZcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9jaGFpbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9jaGFpbl9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfbm90ZSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9mb290ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgV0VCSFRUUFNQcml2YXRlS2V5IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgV0VCSFRUUFNQcml2YXRlS2V5IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFdFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfd2hhdF9pcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9wdXJwb3NlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfcHVycG9zZV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3B1cnBvc2VfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9wdXJwb3NlXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHlfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9zZWN1cml0eV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5XzMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHlfNFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9jb21wYXRpYmlsaXR5LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9jb21wYXRpYmlsaXR5X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfbm90ZSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfZm9vdGVyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBhc3NrZXlzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQYXNza2V5cyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQYXNza2V5c1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfd2hhdF9pcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfc3VwcG9ydGVkX21ldGhvZHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX21ldGhvZF9iaW9tZXRyaWMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF9tZXRob2RfaGFyZHdhcmUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF9tZXRob2RfcGxhdGZvcm1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF9hZHZhbnRhZ2VzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF9hZHZhbnRhZ2Vfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF9hZHZhbnRhZ2Vfc3BlZWQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF9hZHZhbnRhZ2Vfbm9fcGFzc3dvcmRzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfYWR2YW50YWdlX3VuaXF1ZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX2hvd190b191c2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX3VzZV9zdGVwXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF91c2Vfc3RlcF8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfdXNlX3N0ZXBfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q4OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX2NvbXBhdGliaWxpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfY29tcGF0aWJpbGl0eV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q5OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX3NlY3VyaXR5LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX3NlY3VyaXR5X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0IGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEhUTUwgc3RyaW5nIGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRUb29sdGlwQ29udGVudChjb25maWcpIHtcbiAgICAgICAgaWYgKCFjb25maWcpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaGVhZGVyIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPjxzdHJvbmc+JHtjb25maWcuaGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvbiBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+JHtjb25maWcuZGVzY3JpcHRpb259PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBsaXN0IGl0ZW1zIGlmIGV4aXN0XG4gICAgICAgIGlmIChjb25maWcubGlzdCkge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY29uZmlnLmxpc3QpICYmIGNvbmZpZy5saXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBjb25maWcubGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIZWFkZXIgaXRlbSB3aXRob3V0IGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb25maWcubGlzdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAvLyBPbGQgZm9ybWF0IC0gb2JqZWN0IHdpdGgga2V5LXZhbHVlIHBhaXJzXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmVudHJpZXMoY29uZmlnLmxpc3QpLmZvckVhY2goKFt0ZXJtLCBkZWZpbml0aW9uXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke3Rlcm19Ojwvc3Ryb25nPiAke2RlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgbGlzdHMgKGxpc3QyLCBsaXN0MywgZXRjLilcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdE5hbWUgPSBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1tsaXN0TmFtZV0gJiYgY29uZmlnW2xpc3ROYW1lXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICAgICAgY29uZmlnW2xpc3ROYW1lXS5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8L3VsPjxwPjxzdHJvbmc+JHtpdGVtLnRlcm19PC9zdHJvbmc+PC9wPjx1bD5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgd2FybmluZyBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc21hbGwgb3JhbmdlIG1lc3NhZ2VcIj4nO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5gO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT4gYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGNvbmZpZy53YXJuaW5nLmhlYWRlcjtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSBjb25maWcud2FybmluZy50ZXh0O1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNvZGUgZXhhbXBsZXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlcyAmJiBjb25maWcuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlc0hlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxzdHJvbmc+JHtjb25maWcuZXhhbXBsZXNIZWFkZXJ9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICNmOGY4Zjg7IGJvcmRlcjogMXB4IHNvbGlkICNlMGUwZTA7XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxwcmUgc3R5bGU9XCJtYXJnaW46IDA7IGZvbnQtc2l6ZTogMC45ZW07IGxpbmUtaGVpZ2h0OiAxLjRlbTtcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcm9jZXNzIGV4YW1wbGVzIHdpdGggc3ludGF4IGhpZ2hsaWdodGluZyBmb3Igc2VjdGlvbnNcbiAgICAgICAgICAgIGNvbmZpZy5leGFtcGxlcy5mb3JFYWNoKChleGFtcGxlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVzY2FwZWRFeGFtcGxlID0gdGhpcy5lc2NhcGVIdG1sKGV4YW1wbGUpO1xuICAgICAgICAgICAgICAgIGlmIChleGFtcGxlLnN0YXJ0c1dpdGgoJ1snKSAmJiBleGFtcGxlLmVuZHNXaXRoKCddJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2VjdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzIxODVkMDsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JHtlc2NhcGVkRXhhbXBsZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV4YW1wbGUuaW5jbHVkZXMoJz0nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBLZXktdmFsdWUgcGFpclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBba2V5LCB2YWx1ZV0gPSBleGFtcGxlLnNwbGl0KCc9JykubWFwKHMgPT4gcy50cmltKCkpO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8c3BhbiBzdHlsZT1cImNvbG9yOiAjZTkxZTYzO1wiPiR7dGhpcy5lc2NhcGVIdG1sKGtleSl9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJyA9ICc7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICMyMWJhNDU7XCI+JHt0aGlzLmVzY2FwZUh0bWwodmFsdWUgfHwgJycpfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgdGV4dCBvciBlbXB0eSBsaW5lXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gZXNjYXBlZEV4YW1wbGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA8IGNvbmZpZy5leGFtcGxlcy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvcHJlPic7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbm90ZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cCBjbGFzcz1cInVpIHNtYWxsXCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAxMHB4O1wiPjxlbT4ke2NvbmZpZy5ub3RlfTwvZW0+PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIHN0YXRpYyBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgbWFwID0ge1xuICAgICAgICAgICAgJyYnOiAnJmFtcDsnLFxuICAgICAgICAgICAgJzwnOiAnJmx0OycsXG4gICAgICAgICAgICAnPic6ICcmZ3Q7JyxcbiAgICAgICAgICAgICdcIic6ICcmcXVvdDsnLFxuICAgICAgICAgICAgXCInXCI6ICcmIzAzOTsnXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBTdHJpbmcodGV4dCkucmVwbGFjZSgvWyY8PlwiJ10vZywgbSA9PiBtYXBbbV0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIGdlbmVyYWwgc2V0dGluZ3MgdG9vbHRpcHNcbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIGJ1aWxkcyB0aGUgY29tcGxldGUgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBhbmQgYXR0YWNoZXNcbiAgICAgKiB0aGVtIHRvIHRoZSBjb3JyZXNwb25kaW5nIGZpZWxkIGljb25zIHVzaW5nIFRvb2x0aXBCdWlsZGVyIGZvciBwcm9wZXIgZXZlbnQgaGFuZGxpbmcuXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBUb29sdGlwQnVpbGRlciBpcyBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZSwgZmFsbGluZyBiYWNrIHRvIGRpcmVjdCBwb3B1cCBpbml0aWFsaXphdGlvbicpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB0aGlzLmdldFRvb2x0aXBDb25maWd1cmF0aW9ucygpO1xuXG4gICAgICAgICAgICAgICAgLy8gQnVpbGQgSFRNTCBjb250ZW50IGZvciBlYWNoIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IGh0bWxDb25maWdzID0ge307XG4gICAgICAgICAgICAgICAgT2JqZWN0LmVudHJpZXModG9vbHRpcENvbmZpZ3MpLmZvckVhY2goKFtmaWVsZE5hbWUsIGNvbmZpZ10pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbENvbmZpZ3NbZmllbGROYW1lXSA9IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChjb25maWcpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwIGZvciBlYWNoIGZpZWxkIGluZm8gaWNvbiAoZmFsbGJhY2spXG4gICAgICAgICAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGh0bWxDb25maWdzW2ZpZWxkTmFtZV07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uOiAnY2xpY2snICAvLyBTaG93IG9uIGNsaWNrIGZvciBiZXR0ZXIgY29udHJvbFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIGZvciBwcm9wZXIgZXZlbnQgaGFuZGxpbmdcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHRoaXMuZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIGVhY2ggdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgaHRtbENvbmZpZ3MgPSB7fTtcbiAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyh0b29sdGlwQ29uZmlncykuZm9yRWFjaCgoW2ZpZWxkTmFtZSwgY29uZmlnXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBodG1sQ29uZmlnc1tmaWVsZE5hbWVdID0gdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZyk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHVzaW5nIFRvb2x0aXBCdWlsZGVyIHdoaWNoIGluY2x1ZGVzIGNsaWNrIHByZXZlbnRpb25cbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKGh0bWxDb25maWdzLCB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yOiAnLmZpZWxkLWluZm8taWNvbicsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93RGVsYXk6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgaGlkZURlbGF5OiAxMDAsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBnZW5lcmFsIHNldHRpbmdzIHRvb2x0aXBzOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzcGVjaWZpYyB0b29sdGlwIGNvbnRlbnRcbiAgICAgKiBcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWUgdG8gdXBkYXRlXG4gICAgICogQHBhcmFtIHtPYmplY3R8c3RyaW5nfSB0b29sdGlwRGF0YSAtIE5ldyB0b29sdGlwIGRhdGEgb3IgSFRNTCBjb250ZW50XG4gICAgICovXG4gICAgc3RhdGljIHVwZGF0ZVRvb2x0aXAoZmllbGROYW1lLCB0b29sdGlwRGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBUb29sdGlwQnVpbGRlci51cGRhdGUoZmllbGROYW1lLCB0b29sdGlwRGF0YSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIHRvb2x0aXAgZm9yIGZpZWxkICcke2ZpZWxkTmFtZX0nOmAsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgYWxsIGdlbmVyYWwgc2V0dGluZ3MgdG9vbHRpcHNcbiAgICAgKiBcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtzZWxlY3Rvcj0nLmZpZWxkLWluZm8taWNvbiddIC0galF1ZXJ5IHNlbGVjdG9yIGZvciB0b29sdGlwIGljb25zXG4gICAgICovXG4gICAgc3RhdGljIGRlc3Ryb3koc2VsZWN0b3IgPSAnLmZpZWxkLWluZm8taWNvbicpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZScpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuZGVzdHJveShzZWxlY3Rvcik7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZGVzdHJveSBnZW5lcmFsIHNldHRpbmdzIHRvb2x0aXBzOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlcjtcbn0iXX0=