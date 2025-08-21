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
        'PBXSplitAudioThread': this.getSplitAudioThreadTooltip(),
        'PBXRecordCalls': this.getRecordCallsTooltip(),
        'PBXRecordCallsInner': this.getRecordCallsInnerTooltip(),
        'UseWebRTC': this.getUseWebRTCTooltip(),
        'RedirectToHttps': this.getRedirectToHttpsTooltip(),
        'SSHDisablePasswordLogins': this.getSSHDisablePasswordLoginsTooltip(),
        'AJAMEnabled': this.getAJAMEnabledTooltip(),
        'AMIEnabled': this.getAMIEnabledTooltip(),
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
        'WEBHTTPSPrivateKey': this.getWEBHTTPSPrivateKeyTooltip()
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
     * Get PBXSplitAudioThread tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXSplitAudioThread field
     */

  }, {
    key: "getSplitAudioThreadTooltip",
    value: function getSplitAudioThreadTooltip() {
      return {
        header: globalTranslate.gs_SplitAudioThreadTooltip_header,
        description: globalTranslate.gs_SplitAudioThreadTooltip_desc,
        list: [{
          term: globalTranslate.gs_SplitAudioThreadTooltip_mono,
          definition: globalTranslate.gs_SplitAudioThreadTooltip_mono_desc
        }, {
          term: globalTranslate.gs_SplitAudioThreadTooltip_stereo,
          definition: globalTranslate.gs_SplitAudioThreadTooltip_stereo_desc
        }],
        list2: [{
          term: globalTranslate.gs_SplitAudioThreadTooltip_benefits,
          definition: null
        }],
        list3: [globalTranslate.gs_SplitAudioThreadTooltip_benefit_analysis, globalTranslate.gs_SplitAudioThreadTooltip_benefit_quality, globalTranslate.gs_SplitAudioThreadTooltip_benefit_processing],
        note: globalTranslate.gs_SplitAudioThreadTooltip_note
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
     * them to the corresponding field icons using Fomantic UI popup.
     * 
     * @static
     */

  }, {
    key: "initialize",
    value: function initialize() {
      var _this2 = this;

      try {
        var tooltipConfigs = this.getTooltipConfigurations(); // Build HTML content for each tooltip configuration

        var htmlConfigs = {};
        Object.entries(tooltipConfigs).forEach(function (_ref3) {
          var _ref4 = _slicedToArray(_ref3, 2),
              fieldName = _ref4[0],
              config = _ref4[1];

          htmlConfigs[fieldName] = _this2.buildTooltipContent(config);
        }); // Initialize tooltip for each field info icon

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
              variation: 'flowing'
            });
          }
        });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsImdldFJlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcCIsImdldFNlbmRNZXRyaWNzVG9vbHRpcCIsImdldEFsbG93R3Vlc3RDYWxsc1Rvb2x0aXAiLCJnZXRQQlhMYW5ndWFnZVRvb2x0aXAiLCJnZXRQQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXAiLCJnZXRNYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwIiwiZ2V0U3BsaXRBdWRpb1RocmVhZFRvb2x0aXAiLCJnZXRSZWNvcmRDYWxsc1Rvb2x0aXAiLCJnZXRSZWNvcmRDYWxsc0lubmVyVG9vbHRpcCIsImdldFVzZVdlYlJUQ1Rvb2x0aXAiLCJnZXRSZWRpcmVjdFRvSHR0cHNUb29sdGlwIiwiZ2V0U1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcCIsImdldEFKQU1FbmFibGVkVG9vbHRpcCIsImdldEFNSUVuYWJsZWRUb29sdGlwIiwiZ2V0UEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwIiwiZ2V0UEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwIiwiZ2V0UEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwIiwiZ2V0UEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcCIsImdldFBCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwIiwiZ2V0UEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXAiLCJnZXRSVFBQb3J0UmFuZ2VUb29sdGlwIiwiZ2V0UlRQU3R1blNlcnZlclRvb2x0aXAiLCJnZXRTSVBBdXRoUHJlZml4VG9vbHRpcCIsImdldFNJUERlZmF1bHRFeHBpcnlUb29sdGlwIiwiZ2V0U0lQRXhwaXJ5UmFuZ2VUb29sdGlwIiwiZ2V0U1NIQXV0aG9yaXplZEtleXNUb29sdGlwIiwiZ2V0U1NIX0lEX1JTQV9QVUJUb29sdGlwIiwiZ2V0V0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwIiwiZ2V0V0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcCIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJnc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfd2hlbiIsImRlZmluaXRpb24iLCJnc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfd2hlbl9kZXNjIiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2JlbmVmaXRzIiwibGlzdDIiLCJnc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfYmVuZWZpdF9tZW1vcnkiLCJnc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfYmVuZWZpdF9zdGFiaWxpdHkiLCJsaXN0MyIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kcmF3YmFja3MiLCJsaXN0NCIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kcmF3YmFja19jYWxscyIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kcmF3YmFja19yZWdpc3RyYXRpb24iLCJub3RlIiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX3JlY29tbWVuZGF0aW9uIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2hlYWRlciIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9kZXNjIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3B1cnBvc2UiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfcHVycG9zZV9kZXNjIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3doYXRfY29sbGVjdGVkIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2NvbGxlY3RlZF9lcnJvcnMiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX2NyYXNoZXMiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX3BlcmZvcm1hbmNlIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2NvbGxlY3RlZF92ZXJzaW9uIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2NvbGxlY3RlZF9lbnZpcm9ubWVudCIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9iZW5lZml0cyIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9iZW5lZml0X3F1aWNrX2ZpeGVzIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRfc3RhYmlsaXR5IiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRfc3VwcG9ydCIsImxpc3Q1IiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3ByaXZhY3kiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfcHJpdmFjeV9kZXNjIiwid2FybmluZyIsImljb24iLCJ0ZXh0IiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3dhcm5pbmciLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfbm90ZSIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfaGVhZGVyIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9kZXNjIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfd2FybmluZyIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfd2hlbl9lbmFibGUiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2VuYWJsZV9hbm9ueW1vdXMiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2VuYWJsZV9pbnRlcmNvbSIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX2Rvb3JwaG9uZSIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX3B1YmxpYyIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfdGVjaG5pY2FsIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF90ZWNobmljYWxfZW5kcG9pbnQiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3RlY2huaWNhbF9jb250ZXh0IiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF90ZWNobmljYWxfbW9kdWxlIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9zZWN1cml0eSIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfc2VjdXJpdHlfZGVzYyIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfcmVjb21tZW5kYXRpb24iLCJnc19QQlhMYW5ndWFnZVRvb2x0aXBfaGVhZGVyIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2Rlc2MiLCJnc19QQlhMYW5ndWFnZVRvb2x0aXBfYWZmZWN0cyIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzX3ZvaWNlIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHNfcHJvbXB0cyIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzX2l2ciIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzX3ZvaWNlbWFpbCIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9yZXN0YXJ0IiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX3Jlc3RhcnRfZGVzYyIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9ub3RlIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2hlYWRlciIsImdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9kZXNjIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2FmZmVjdHMiLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfYWZmZWN0c19uZXciLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfYWZmZWN0c192YWxpZGF0aW9uIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2FmZmVjdHNfc2VhcmNoIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVzIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVfMyIsImdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9leGFtcGxlXzQiLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfZXhhbXBsZV81IiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX3dhcm5pbmciLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfbm90ZSIsImdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfaGVhZGVyIiwiZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9kZXNjIiwiZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9hdXRvIiwiZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9hdXRvX2Rlc2MiLCJnc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX21hbnVhbCIsImdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfbWFudWFsX2Rlc2MiLCJnc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX25vdGUiLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9oZWFkZXIiLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9kZXNjIiwiZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfbW9ubyIsImdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX21vbm9fZGVzYyIsImdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX3N0ZXJlbyIsImdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX3N0ZXJlb19kZXNjIiwiZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfYmVuZWZpdHMiLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9iZW5lZml0X2FuYWx5c2lzIiwiZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfYmVuZWZpdF9xdWFsaXR5IiwiZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfYmVuZWZpdF9wcm9jZXNzaW5nIiwiZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfbm90ZSIsImdzX1JlY29yZENhbGxzVG9vbHRpcF9oZWFkZXIiLCJnc19SZWNvcmRDYWxsc1Rvb2x0aXBfZGVzYyIsImdzX1JlY29yZENhbGxzVG9vbHRpcF9zdG9yYWdlIiwiZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX3N0b3JhZ2VfZGVzYyIsImdzX1JlY29yZENhbGxzVG9vbHRpcF9sZWdhbCIsImdzX1JlY29yZENhbGxzVG9vbHRpcF9sZWdhbF9kZXNjIiwiZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX3dhcm5pbmciLCJnc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF9oZWFkZXIiLCJnc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF9kZXNjIiwiZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfdXNhZ2UiLCJnc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF91c2FnZV90cmFpbmluZyIsImdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlX3F1YWxpdHkiLCJnc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF91c2FnZV9zZWN1cml0eSIsImdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX25vdGUiLCJnc19Vc2VXZWJSVENUb29sdGlwX2hlYWRlciIsImdzX1VzZVdlYlJUQ1Rvb2x0aXBfZGVzYyIsImdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdHMiLCJnc19Vc2VXZWJSVENUb29sdGlwX2JlbmVmaXRfYnJvd3NlciIsImdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdF9ub19zb2Z0d2FyZSIsImdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdF9lbmNyeXB0aW9uIiwiZ3NfVXNlV2ViUlRDVG9vbHRpcF9yZXF1aXJlbWVudHMiLCJnc19Vc2VXZWJSVENUb29sdGlwX3JlcXVpcmVtZW50c19kZXNjIiwiZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9oZWFkZXIiLCJnc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX2Rlc2MiLCJnc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX3NlY3VyaXR5IiwiZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9zZWN1cml0eV9kZXNjIiwiZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9jZXJ0aWZpY2F0ZSIsImdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfY2VydGlmaWNhdGVfZGVzYyIsImdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfbm90ZSIsImdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfaGVhZGVyIiwiZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9kZXNjIiwiZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfd2FybmluZyIsImdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfYmVuZWZpdHMiLCJnc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2JlbmVmaXRfc2VjdXJpdHkiLCJnc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2JlbmVmaXRfYnJ1dGVmb3JjZSIsImdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfYmVuZWZpdF9jb21wbGlhbmNlIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2hlYWRlciIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9kZXNjIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3doYXRfaXMiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfd2hhdF9pc19kZXNjIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3VzYWdlIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3VzYWdlX3dlYmFwcHMiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2VfcGFuZWxzIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3VzYWdlX3dpZGdldHMiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2VfbW9uaXRvcmluZyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9wcm90b2NvbHMiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfcHJvdG9jb2xzX2Rlc2MiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfZGVmYXVsdCIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJsaXN0NiIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF93aGVuX2Rpc2FibGUiLCJsaXN0NyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9kaXNhYmxlXzEiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8yIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF93YXJuaW5nIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX25vdGUiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9oZWFkZXIiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9kZXNjIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2hhdF9pcyIsImdzX0FNSUVuYWJsZWRUb29sdGlwX3doYXRfaXNfZGVzYyIsImdzX0FNSUVuYWJsZWRUb29sdGlwX3VzYWdlIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfbW9uaXRvcmluZyIsImdzX0FNSUVuYWJsZWRUb29sdGlwX3VzYWdlX2ludGVncmF0aW9uIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfY29udHJvbCIsImdzX0FNSUVuYWJsZWRUb29sdGlwX3VzYWdlX2V2ZW50cyIsImdzX0FNSUVuYWJsZWRUb29sdGlwX3VzYWdlX2NvbW1hbmRzIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZXMiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9leGFtcGxlX2NybSIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfd2FsbGJvYXJkIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9jdGkiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9leGFtcGxlX3JlcG9ydGluZyIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2RlZmF1bHQiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJnc19BTUlFbmFibGVkVG9vbHRpcF93aGVuX2Rpc2FibGUiLCJsaXN0OCIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMSIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMiIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMyIsImdzX0FNSUVuYWJsZWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2FybmluZyIsImZvb3RlciIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2Zvb3RlciIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9oZWFkZXIiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfZGVzYyIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ob3ciLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaG93X2RpYWwiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaG93X2Fubm91bmNlIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hvd19yZXRyaWV2ZSIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9zbG90cyIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9zbG90c19yYW5nZSIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9zbG90c19jYXBhY2l0eSIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9zbG90c19hdXRvbWF0aWMiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfZXhhbXBsZSIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9leGFtcGxlX2Rlc2MiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfbm90ZSIsImdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9oZWFkZXIiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfZGVzYyIsImdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ob3ciLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X3ByZXNzIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvd19kaWFsIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvd190YWxrIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvd19jb21wbGV0ZSIsImdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9iZW5lZml0cyIsImdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9iZW5lZml0c19kZXNjIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX25vdGUiLCJnc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaGVhZGVyIiwiZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2Rlc2MiLCJnc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaG93IiwiZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hvd19wcmVzcyIsImdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9ob3dfZGlhbCIsImdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9ob3dfaGFuZ3VwIiwiZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX3dhcm5pbmciLCJnc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfbm90ZSIsImdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfaGVhZGVyIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF9kZXNjIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlcyIsImdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdHlwZV9nZW5lcmFsIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2dlbmVyYWxfZGVzYyIsImdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdHlwZV9kaXJlY3RlZCIsImdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdHlwZV9kaXJlY3RlZF9kZXNjIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF91c2FnZSIsImdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdXNhZ2VfZGVzYyIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX2hlYWRlciIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX2Rlc2MiLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpbyIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3NjZW5hcmlvXzEiLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18yIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfc2NlbmFyaW9fMyIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX2RlZmF1bHQiLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnMiLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9yZWNfc3RhbmRhcmQiLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9yZWNfcXVpY2siLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9yZWNfZXh0ZW5kZWQiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9oZWFkZXIiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9kZXNjIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfdXNhZ2UiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF91c2FnZV9kZXNjIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfZGVmYXVsdCIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2RlZmF1bHRfZGVzYyIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX3doZW5fdG9fY2hhbmdlIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfY2hhbmdlX2luY3JlYXNlIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfY2hhbmdlX2luY3JlYXNlX2Rlc2MiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9jaGFuZ2VfZGVjcmVhc2UiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9jaGFuZ2VfZGVjcmVhc2VfZGVzYyIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2Zvb3RlciIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfaGVhZGVyIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9kZXNjIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9wdXJwb3NlIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9wdXJwb3NlX21lZGlhIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9wdXJwb3NlX2JpZGlyZWN0aW9uYWwiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2VfdW5pcXVlIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9kZWZhdWx0IiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NhbGN1bGF0aW9uIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jYWxjdWxhdGlvbl9kZXNjIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF93aGVuX3RvX2NoYW5nZSIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX2luY3JlYXNlIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfaW5jcmVhc2VfZGVzYyIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX2N1c3RvbSIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX2N1c3RvbV9kZXNjIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfbmF0IiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfbmF0X2Rlc2MiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2Zvb3RlciIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2hlYWRlciIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2Rlc2MiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9wdXJwb3NlX2hlYWRlciIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3B1cnBvc2VfMSIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3B1cnBvc2VfMiIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3B1cnBvc2VfMyIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2hvd19pdF93b3JrcyIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZm9ybWF0IiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZm9ybWF0X2Rlc2MiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF93aGVuX3RvX3VzZSIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3VzZV8xIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfdXNlXzIiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF91c2VfMyIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2V4YW1wbGVzIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZXhhbXBsZV8xIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZXhhbXBsZV8yIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZXhhbXBsZV8zIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZm9vdGVyIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfaGVhZGVyIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfZGVzYyIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3B1cnBvc2UiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF9wdXJwb3NlX2Rlc2MiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF9ob3dfaXRfd29ya3MiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF93b3JrXzEiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF93b3JrXzIiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF93b3JrXzMiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF9kZWZhdWx0IiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfZGVmYXVsdF9kZXNjIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfd2hlbl90b191c2UiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF91c2VfMSIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV8yIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfdXNlXzMiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF91c2VfNCIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfd2FybmluZyIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2hlYWRlciIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2Rlc2MiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9wdXJwb3NlIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfcHVycG9zZV9kZXNjIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfaG93X2l0X3dvcmtzIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfd29ya18xIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfd29ya18yIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfd29ya18zIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfZGVmYXVsdCIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2RlZmF1bHRfZGVzYyIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3doZW5fdG9fY2hhbmdlIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfY2hhbmdlX21vYmlsZSIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9zdGFibGUiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9jaGFuZ2VfYmF0dGVyeSIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX25vdGUiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfaGVhZGVyIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX2Rlc2MiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX2hlYWRlciIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5fZGVzYyIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5fcHJvdGVjdCIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5fZGVmYXVsdCIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5fbmF0IiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21heF9oZWFkZXIiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWF4X2Rlc2MiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWF4X3RpbWVvdXQiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWF4X2RlZmF1bHQiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWF4X3JlZHVjZSIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnMiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX2xvY2FsIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY19pbnRlcm5ldCIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9yZWNfbW9iaWxlIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY19kZWZhdWx0IiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX2hvd19pdF93b3JrcyIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9ob3dfaXRfd29ya3NfZGVzYyIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF93YXJuaW5nIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX25vdGUiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfaGVhZGVyIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2Rlc2MiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfd2hhdF9pcyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF93aGF0X2lzX2Rlc2MiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfZm9ybWF0IiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2Zvcm1hdF9kZXNjIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2hvd190b19hZGQiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYWRkXzEiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYWRkXzIiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYWRkXzMiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYWRkXzQiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYmVuZWZpdHMiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYmVuZWZpdF8xIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2JlbmVmaXRfMiIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzMiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYmVuZWZpdF80IiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3NlY3VyaXR5IiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3NlY3VyaXR5XzEiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfc2VjdXJpdHlfMiIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9zZWN1cml0eV8zIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3dhcm5pbmciLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfbm90ZSIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9oZWFkZXIiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZGVzYyIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF93aGF0X2lzIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3doYXRfaXNfZGVzYyIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2FnZSIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2FnZV8xIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzIiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2VfMyIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2FnZV80IiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2dlbmVyYXRpb24iLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZ2VuZXJhdGlvbl9kZXNjIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2hvd190b191c2UiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNlXzEiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNlXzIiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNlXzMiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZm9ybWF0IiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2Zvcm1hdF9kZXNjIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3dhcm5pbmciLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfbm90ZSIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9oZWFkZXIiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfZGVzYyIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF93aGF0X2lzIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3doYXRfaXNfZGVzYyIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF93aGVyZV91c2VkIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3VzZWRfbmdpbngiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF93ZWJydGMiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9hamFtIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3VzZWRfYXBpIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2Zvcm1hdCIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9mb3JtYXRfZGVzYyIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW4iLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfb2J0YWluX2xldHNlbmNyeXB0IiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX29idGFpbl9jYSIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fc2VsZiIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9jaGFpbiIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9jaGFpbl9kZXNjIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX25vdGUiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfZm9vdGVyIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9oZWFkZXIiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2Rlc2MiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3doYXRfaXMiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3doYXRfaXNfZGVzYyIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfcHVycG9zZSIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfcHVycG9zZV8xIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9wdXJwb3NlXzIiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3B1cnBvc2VfMyIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfZm9ybWF0IiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9mb3JtYXRfZGVzYyIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3dhcm5pbmciLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5IiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9zZWN1cml0eV8xIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9zZWN1cml0eV8yIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9zZWN1cml0eV8zIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9zZWN1cml0eV80IiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9jb21wYXRpYmlsaXR5IiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9jb21wYXRpYmlsaXR5X2Rlc2MiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX25vdGUiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2Zvb3RlciIsImNvbmZpZyIsImh0bWwiLCJBcnJheSIsImlzQXJyYXkiLCJsZW5ndGgiLCJmb3JFYWNoIiwiaXRlbSIsIk9iamVjdCIsImVudHJpZXMiLCJpIiwibGlzdE5hbWUiLCJleGFtcGxlcyIsImV4YW1wbGVzSGVhZGVyIiwiZXhhbXBsZSIsImluZGV4IiwiZXNjYXBlZEV4YW1wbGUiLCJlc2NhcGVIdG1sIiwic3RhcnRzV2l0aCIsImVuZHNXaXRoIiwiaW5jbHVkZXMiLCJzcGxpdCIsIm1hcCIsInMiLCJ0cmltIiwia2V5IiwidmFsdWUiLCJTdHJpbmciLCJyZXBsYWNlIiwibSIsInRvb2x0aXBDb25maWdzIiwiZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zIiwiaHRtbENvbmZpZ3MiLCJmaWVsZE5hbWUiLCJidWlsZFRvb2x0aXBDb250ZW50IiwiJCIsImVhY2giLCJlbGVtZW50IiwiJGljb24iLCJkYXRhIiwiY29udGVudCIsInBvcHVwIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJkZWxheSIsInNob3ciLCJoaWRlIiwidmFyaWF0aW9uIiwiZXJyb3IiLCJjb25zb2xlIiwidG9vbHRpcERhdGEiLCJUb29sdGlwQnVpbGRlciIsInVwZGF0ZSIsInNlbGVjdG9yIiwiZGVzdHJveSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLDZCO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDSSwyQ0FBYztBQUFBOztBQUNWLFVBQU0sSUFBSUMsS0FBSixDQUFVLDRFQUFWLENBQU47QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7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QUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCNWYsNkJBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBUb29sdGlwQnVpbGRlciAqL1xuXG4vKipcbiAqIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyIC0gTWFuYWdlcyB0b29sdGlwcyBmb3IgR2VuZXJhbCBTZXR0aW5ncyBmb3JtXG4gKiBcbiAqIFRoaXMgY2xhc3MgcHJvdmlkZXMgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZ2VuZXJhbCBzZXR0aW5ncyBmaWVsZHMsXG4gKiBoZWxwaW5nIHVzZXJzIHVuZGVyc3RhbmQgdGhlIHB1cnBvc2UgYW5kIGltcGxpY2F0aW9ucyBvZiBlYWNoIHNldHRpbmcuXG4gKiBcbiAqIEZlYXR1cmVzOlxuICogLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBzeXN0ZW0gc2V0dGluZ3NcbiAqIC0gSW50ZWdyYXRpb24gd2l0aCBUb29sdGlwQnVpbGRlclxuICogLSBDb25zaXN0ZW50IHN0cnVjdHVyZSBmb2xsb3dpbmcgdGhlIGVzdGFibGlzaGVkIHBhdHRlcm5cbiAqIFxuICogQGNsYXNzIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyXG4gKi9cbmNsYXNzIEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyIHtcbiAgICAvKipcbiAgICAgKiBQcml2YXRlIGNvbnN0cnVjdG9yIHRvIHByZXZlbnQgaW5zdGFudGlhdGlvblxuICAgICAqIFRoaXMgY2xhc3MgdXNlcyBzdGF0aWMgbWV0aG9kcyBmb3IgdXRpbGl0eSBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgaXMgYSBzdGF0aWMgY2xhc3MgYW5kIGNhbm5vdCBiZSBpbnN0YW50aWF0ZWQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGdlbmVyYWwgc2V0dGluZ3NcbiAgICAgKiBcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZ2VuZXJhbCBzZXR0aW5ncyBmaWVsZHNcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgJ1Jlc3RhcnRFdmVyeU5pZ2h0JzogdGhpcy5nZXRSZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdTZW5kTWV0cmljcyc6IHRoaXMuZ2V0U2VuZE1ldHJpY3NUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYQWxsb3dHdWVzdENhbGxzJzogdGhpcy5nZXRBbGxvd0d1ZXN0Q2FsbHNUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYTGFuZ3VhZ2UnOiB0aGlzLmdldFBCWExhbmd1YWdlVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoJzogdGhpcy5nZXRQQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhNYW51YWxUaW1lU2V0dGluZ3MnOiB0aGlzLmdldE1hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhTcGxpdEF1ZGlvVGhyZWFkJzogdGhpcy5nZXRTcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWFJlY29yZENhbGxzJzogdGhpcy5nZXRSZWNvcmRDYWxsc1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhSZWNvcmRDYWxsc0lubmVyJzogdGhpcy5nZXRSZWNvcmRDYWxsc0lubmVyVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1VzZVdlYlJUQyc6IHRoaXMuZ2V0VXNlV2ViUlRDVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1JlZGlyZWN0VG9IdHRwcyc6IHRoaXMuZ2V0UmVkaXJlY3RUb0h0dHBzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1NTSERpc2FibGVQYXNzd29yZExvZ2lucyc6IHRoaXMuZ2V0U1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ0FKQU1FbmFibGVkJzogdGhpcy5nZXRBSkFNRW5hYmxlZFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdBTUlFbmFibGVkJzogdGhpcy5nZXRBTUlFbmFibGVkVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWENhbGxQYXJraW5nRXh0JzogdGhpcy5nZXRQQlhDYWxsUGFya2luZ0V4dFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2Zlcic6IHRoaXMuZ2V0UEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXInOiB0aGlzLmdldFBCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWEZlYXR1cmVQaWNrdXBFeHRlbic6IHRoaXMuZ2V0UEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXQnOiB0aGlzLmdldFBCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYRmVhdHVyZURpZ2l0VGltZW91dCc6IHRoaXMuZ2V0UEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdSVFBQb3J0UmFuZ2UnOiB0aGlzLmdldFJUUFBvcnRSYW5nZVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdSVFBTdHVuU2VydmVyJzogdGhpcy5nZXRSVFBTdHVuU2VydmVyVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1NJUEF1dGhQcmVmaXgnOiB0aGlzLmdldFNJUEF1dGhQcmVmaXhUb29sdGlwKCksXG4gICAgICAgICAgICAnU0lQRGVmYXVsdEV4cGlyeSc6IHRoaXMuZ2V0U0lQRGVmYXVsdEV4cGlyeVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdTSVBFeHBpcnlSYW5nZSc6IHRoaXMuZ2V0U0lQRXhwaXJ5UmFuZ2VUb29sdGlwKCksXG4gICAgICAgICAgICAnU1NIQXV0aG9yaXplZEtleXMnOiB0aGlzLmdldFNTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1NTSF9JRF9SU0FfUFVCJzogdGhpcy5nZXRTU0hfSURfUlNBX1BVQlRvb2x0aXAoKSxcbiAgICAgICAgICAgICdXRUJIVFRQU1B1YmxpY0tleSc6IHRoaXMuZ2V0V0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwKCksXG4gICAgICAgICAgICAnV0VCSFRUUFNQcml2YXRlS2V5JzogdGhpcy5nZXRXRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwKClcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUmVzdGFydEV2ZXJ5TmlnaHQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBSZXN0YXJ0RXZlcnlOaWdodCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRSZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfd2hlbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF93aGVuX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9iZW5lZml0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfYmVuZWZpdF9tZW1vcnksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9iZW5lZml0X3N0YWJpbGl0eVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2RyYXdiYWNrcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfZHJhd2JhY2tfY2FsbHMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kcmF3YmFja19yZWdpc3RyYXRpb25cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX3JlY29tbWVuZGF0aW9uXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNlbmRNZXRyaWNzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU2VuZE1ldHJpY3MgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0U2VuZE1ldHJpY3NUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfcHVycG9zZV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfd2hhdF9jb2xsZWN0ZWQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2NvbGxlY3RlZF9lcnJvcnMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9jb2xsZWN0ZWRfY3Jhc2hlcyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2NvbGxlY3RlZF9wZXJmb3JtYW5jZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2NvbGxlY3RlZF92ZXJzaW9uLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX2Vudmlyb25tZW50XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfYmVuZWZpdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRfcXVpY2tfZml4ZXMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9iZW5lZml0X3N0YWJpbGl0eSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRfc3VwcG9ydFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX3ByaXZhY3ksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfcHJpdmFjeV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBpY29uOiAnaW5mbyBjaXJjbGUnLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhBbGxvd0d1ZXN0Q2FsbHMgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhBbGxvd0d1ZXN0Q2FsbHMgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0QWxsb3dHdWVzdENhbGxzVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfd2hlbl9lbmFibGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9lbmFibGVfYW5vbnltb3VzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2VuYWJsZV9pbnRlcmNvbSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9lbmFibGVfZG9vcnBob25lLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2VuYWJsZV9wdWJsaWNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfdGVjaG5pY2FsLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfdGVjaG5pY2FsX2VuZHBvaW50LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3RlY2huaWNhbF9jb250ZXh0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3RlY2huaWNhbF9tb2R1bGVcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3NlY3VyaXR5X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfcmVjb21tZW5kYXRpb25cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYTGFuZ3VhZ2UgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhMYW5ndWFnZSBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQQlhMYW5ndWFnZVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfYWZmZWN0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfYWZmZWN0c192b2ljZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHNfcHJvbXB0cyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHNfaXZyLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfYWZmZWN0c192b2ljZW1haWxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9yZXN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX3Jlc3RhcnRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGggdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfYWZmZWN0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfYWZmZWN0c19uZXcsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9hZmZlY3RzX3ZhbGlkYXRpb24sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9hZmZlY3RzX3NlYXJjaFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9leGFtcGxlXzMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9leGFtcGxlXzQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9leGFtcGxlXzVcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWE1hbnVhbFRpbWVTZXR0aW5ncyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWE1hbnVhbFRpbWVTZXR0aW5ncyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRNYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX2F1dG8sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX2F1dG9fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9tYW51YWwsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX21hbnVhbF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYU3BsaXRBdWRpb1RocmVhZCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWFNwbGl0QXVkaW9UaHJlYWQgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0U3BsaXRBdWRpb1RocmVhZFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfbW9ubyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX21vbm9fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfc3RlcmVvLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfc3RlcmVvX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9iZW5lZml0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9iZW5lZml0X2FuYWx5c2lzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9iZW5lZml0X3F1YWxpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2JlbmVmaXRfcHJvY2Vzc2luZ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWFJlY29yZENhbGxzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYUmVjb3JkQ2FsbHMgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UmVjb3JkQ2FsbHNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX3N0b3JhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc1Rvb2x0aXBfc3RvcmFnZV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc1Rvb2x0aXBfbGVnYWwsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc1Rvb2x0aXBfbGVnYWxfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWFJlY29yZENhbGxzSW5uZXIgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhSZWNvcmRDYWxsc0lubmVyIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFJlY29yZENhbGxzSW5uZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlX3RyYWluaW5nLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF91c2FnZV9xdWFsaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF91c2FnZV9zZWN1cml0eVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFVzZVdlYlJUQyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFVzZVdlYlJUQyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRVc2VXZWJSVENUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfVXNlV2ViUlRDVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19Vc2VXZWJSVENUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdF9icm93c2VyLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19Vc2VXZWJSVENUb29sdGlwX2JlbmVmaXRfbm9fc29mdHdhcmUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdF9lbmNyeXB0aW9uXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19Vc2VXZWJSVENUb29sdGlwX3JlcXVpcmVtZW50cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfcmVxdWlyZW1lbnRzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFJlZGlyZWN0VG9IdHRwcyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFJlZGlyZWN0VG9IdHRwcyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRSZWRpcmVjdFRvSHR0cHNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX3NlY3VyaXR5LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9zZWN1cml0eV9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX2NlcnRpZmljYXRlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9jZXJ0aWZpY2F0ZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFNTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfYmVuZWZpdF9zZWN1cml0eSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9iZW5lZml0X2JydXRlZm9yY2UsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfYmVuZWZpdF9jb21wbGlhbmNlXG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IEFKQU1FbmFibGVkIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgQUpBTUVuYWJsZWQgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0QUpBTUVuYWJsZWRUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3doYXRfaXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZV93ZWJhcHBzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2VfcGFuZWxzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2Vfd2lkZ2V0cyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3VzYWdlX21vbml0b3JpbmdcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9wcm90b2NvbHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfcHJvdG9jb2xzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfd2hlbl9kaXNhYmxlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9kaXNhYmxlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9kaXNhYmxlXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9kaXNhYmxlXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBBTUlFbmFibGVkIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgQU1JRW5hYmxlZCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBTUlFbmFibGVkVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF93aGF0X2lzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfbW9uaXRvcmluZyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfaW50ZWdyYXRpb24sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX3VzYWdlX2NvbnRyb2wsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX3VzYWdlX2V2ZW50cyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfY29tbWFuZHNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfY3JtLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9leGFtcGxlX3dhbGxib2FyZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9jdGksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfcmVwb3J0aW5nXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGVmYXVsdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2hlbl9kaXNhYmxlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q4OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9kaXNhYmxlXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmb290ZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9mb290ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYQ2FsbFBhcmtpbmdFeHQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhDYWxsUGFya2luZ0V4dCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQQlhDYWxsUGFya2luZ0V4dFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaG93LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ob3dfZGlhbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hvd19hbm5vdW5jZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hvd19yZXRyaWV2ZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9zbG90c19yYW5nZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzX2NhcGFjaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfc2xvdHNfYXV0b21hdGljXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfZXhhbXBsZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9leGFtcGxlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXIgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvdyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X3ByZXNzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X2RpYWwsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ob3dfdGFsayxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvd19jb21wbGV0ZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2JlbmVmaXRzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWEZlYXR1cmVCbGluZFRyYW5zZmVyIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXIgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hvdyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaG93X3ByZXNzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaG93X2RpYWwsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9ob3dfaGFuZ3VwXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhGZWF0dXJlUGlja3VwRXh0ZW4gdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhGZWF0dXJlUGlja3VwRXh0ZW4gZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdHlwZV9nZW5lcmFsLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2dlbmVyYWxfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2RpcmVjdGVkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2RpcmVjdGVkX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF91c2FnZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpbyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfZGVmYXVsdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfcmVjb21tZW5kYXRpb25zLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY19zdGFuZGFyZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfcmVjX3F1aWNrLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9yZWNfZXh0ZW5kZWRcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYRmVhdHVyZURpZ2l0VGltZW91dCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWEZlYXR1cmVEaWdpdFRpbWVvdXQgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF91c2FnZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX3doZW5fdG9fY2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfY2hhbmdlX2luY3JlYXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfY2hhbmdlX2luY3JlYXNlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9kZWNyZWFzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9kZWNyZWFzZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2Zvb3RlclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBSVFBQb3J0UmFuZ2UgdG9vbHRpcCBjb25maWd1cmF0aW9uIChmb3IgUlRQUG9ydEZyb20gYW5kIFJUUFBvcnRUbylcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFJUUCBwb3J0IHJhbmdlIGZpZWxkc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRSVFBQb3J0UmFuZ2VUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9wdXJwb3NlX21lZGlhLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2VfYmlkaXJlY3Rpb25hbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9wdXJwb3NlX3VuaXF1ZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NhbGN1bGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jYWxjdWxhdGlvbl9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF93aGVuX3RvX2NoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX2luY3JlYXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfaW5jcmVhc2VfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfY3VzdG9tLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfY3VzdG9tX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX25hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX25hdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZm9vdGVyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFJUUFN0dW5TZXJ2ZXIgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBSVFBTdHVuU2VydmVyIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFJUUFN0dW5TZXJ2ZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3B1cnBvc2VfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3B1cnBvc2VfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfcHVycG9zZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9wdXJwb3NlXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2hvd19pdF93b3JrcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF93aGVuX3RvX3VzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF91c2VfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfdXNlXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3VzZV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0ODogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2V4YW1wbGVfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZXhhbXBsZV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZm9vdGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZm9vdGVyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUEF1dGhQcmVmaXggdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTSVBBdXRoUHJlZml4IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFNJUEF1dGhQcmVmaXhUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF9ob3dfaXRfd29ya3MsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfd29ya18xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF93b3JrXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dvcmtfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3doZW5fdG9fdXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF91c2VfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfdXNlXzMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV80XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUERlZmF1bHRFeHBpcnkgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTSVBEZWZhdWx0RXhwaXJ5IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFNJUERlZmF1bHRFeHBpcnlUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9ob3dfaXRfd29ya3MsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfd29ya18xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF93b3JrXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3dvcmtfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3doZW5fdG9fY2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9tb2JpbGUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9zdGFibGUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9iYXR0ZXJ5XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU0lQRXhwaXJ5UmFuZ2UgdG9vbHRpcCBjb25maWd1cmF0aW9uIChjb21iaW5lZCBNaW4gYW5kIE1heClcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFNJUEV4cGlyeVJhbmdlIGZpZWxkc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTSVBFeHBpcnlSYW5nZVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX3Byb3RlY3QsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5fZGVmYXVsdCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9uYXRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21heF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfdGltZW91dCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21heF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWF4X3JlZHVjZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY29tbWVuZGF0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX2xvY2FsLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX2ludGVybmV0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX21vYmlsZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY19kZWZhdWx0XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfaG93X2l0X3dvcmtzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNTSEF1dGhvcml6ZWRLZXlzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU1NIQXV0aG9yaXplZEtleXMgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0U1NIQXV0aG9yaXplZEtleXNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3doYXRfaXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9ob3dfdG9fYWRkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2FkZF8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYWRkXzMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfNFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9zZWN1cml0eSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0ODogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfc2VjdXJpdHlfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3NlY3VyaXR5XzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9zZWN1cml0eV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU1NIX0lEX1JTQV9QVUIgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTU0hfSURfUlNBX1BVQiBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTU0hfSURfUlNBX1BVQlRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfd2hhdF9pcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2FnZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2VfMyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9nZW5lcmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2dlbmVyYXRpb25fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9ob3dfdG9fdXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2VfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNlXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgV0VCSFRUUFNQdWJsaWNLZXkgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBXRUJIVFRQU1B1YmxpY0tleSBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRXRUJIVFRQU1B1YmxpY0tleVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfd2hhdF9pcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfd2hlcmVfdXNlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9uZ2lueCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3VzZWRfd2VicnRjLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9hamFtLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9hcGlcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfb2J0YWluLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fbGV0c2VuY3J5cHQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fY2EsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fc2VsZlxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2NoYWluLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2NoYWluX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9ub3RlLFxuICAgICAgICAgICAgZm9vdGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2Zvb3RlclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBXRUJIVFRQU1ByaXZhdGVLZXkgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBXRUJIVFRQU1ByaXZhdGVLZXkgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0V0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93aGF0X2lzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9wdXJwb3NlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfcHVycG9zZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3B1cnBvc2VfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2Zvcm1hdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9zZWN1cml0eV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5XzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHlfMyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9zZWN1cml0eV80XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2NvbXBhdGliaWxpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2NvbXBhdGliaWxpdHlfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9ub3RlLFxuICAgICAgICAgICAgZm9vdGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9mb290ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWFkZXIgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3QgaXRlbXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0KSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjb25maWcubGlzdCkgJiYgY29uZmlnLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzx1bD4nO1xuICAgICAgICAgICAgICAgIGNvbmZpZy5saXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhlYWRlciBpdGVtIHdpdGhvdXQgZGVmaW5pdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWw+YDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZy5saXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIC8vIE9sZCBmb3JtYXQgLSBvYmplY3Qgd2l0aCBrZXktdmFsdWUgcGFpcnNcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhjb25maWcubGlzdCkuZm9yRWFjaCgoW3Rlcm0sIGRlZmluaXRpb25dKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7dGVybX06PC9zdHJvbmc+ICR7ZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBsaXN0cyAobGlzdDIsIGxpc3QzLCBldGMuKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0TmFtZSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3ROYW1lXSAmJiBjb25maWdbbGlzdE5hbWVdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBjb25maWdbbGlzdE5hbWVdLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB3YXJuaW5nIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPmA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gY29uZmlnLndhcm5pbmcuaGVhZGVyO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGNvbmZpZy53YXJuaW5nLnRleHQ7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29kZSBleGFtcGxlcyBpZiBleGlzdFxuICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke2NvbmZpZy5leGFtcGxlc0hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODsgYm9yZGVyOiAxcHggc29saWQgI2UwZTBlMDtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTsgbGluZS1oZWlnaHQ6IDEuNGVtO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByb2Nlc3MgZXhhbXBsZXMgd2l0aCBzeW50YXggaGlnaGxpZ2h0aW5nIGZvciBzZWN0aW9uc1xuICAgICAgICAgICAgY29uZmlnLmV4YW1wbGVzLmZvckVhY2goKGV4YW1wbGUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXNjYXBlZEV4YW1wbGUgPSB0aGlzLmVzY2FwZUh0bWwoZXhhbXBsZSk7XG4gICAgICAgICAgICAgICAgaWYgKGV4YW1wbGUuc3RhcnRzV2l0aCgnWycpICYmIGV4YW1wbGUuZW5kc1dpdGgoJ10nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8c3BhbiBzdHlsZT1cImNvbG9yOiAjMjE4NWQwOyBmb250LXdlaWdodDogYm9sZDtcIj4ke2VzY2FwZWRFeGFtcGxlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXhhbXBsZS5pbmNsdWRlcygnPScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEtleS12YWx1ZSBwYWlyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IFtrZXksIHZhbHVlXSA9IGV4YW1wbGUuc3BsaXQoJz0nKS5tYXAocyA9PiBzLnRyaW0oKSk7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICNlOTFlNjM7XCI+JHt0aGlzLmVzY2FwZUh0bWwoa2V5KX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnID0gJztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzIxYmE0NTtcIj4ke3RoaXMuZXNjYXBlSHRtbCh2YWx1ZSB8fCAnJyl9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVndWxhciB0ZXh0IG9yIGVtcHR5IGxpbmVcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBlc2NhcGVkRXhhbXBsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgY29uZmlnLmV4YW1wbGVzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnXFxuJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub3RlIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwIGNsYXNzPVwidWkgc21hbGxcIiBzdHlsZT1cIm1hcmdpbi10b3A6IDEwcHg7XCI+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgc3RhdGljIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBtYXAgPSB7XG4gICAgICAgICAgICAnJic6ICcmYW1wOycsXG4gICAgICAgICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICAgICAgICc+JzogJyZndDsnLFxuICAgICAgICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICAgICAgICBcIidcIjogJyYjMDM5OydcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIFN0cmluZyh0ZXh0KS5yZXBsYWNlKC9bJjw+XCInXS9nLCBtID0+IG1hcFttXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgZ2VuZXJhbCBzZXR0aW5ncyB0b29sdGlwc1xuICAgICAqIFxuICAgICAqIFRoaXMgbWV0aG9kIGJ1aWxkcyB0aGUgY29tcGxldGUgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBhbmQgYXR0YWNoZXNcbiAgICAgKiB0aGVtIHRvIHRoZSBjb3JyZXNwb25kaW5nIGZpZWxkIGljb25zIHVzaW5nIEZvbWFudGljIFVJIHBvcHVwLlxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5nZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQnVpbGQgSFRNTCBjb250ZW50IGZvciBlYWNoIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgY29uc3QgaHRtbENvbmZpZ3MgPSB7fTtcbiAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKHRvb2x0aXBDb25maWdzKS5mb3JFYWNoKChbZmllbGROYW1lLCBjb25maWddKSA9PiB7XG4gICAgICAgICAgICAgICAgaHRtbENvbmZpZ3NbZmllbGROYW1lXSA9IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChjb25maWcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcCBmb3IgZWFjaCBmaWVsZCBpbmZvIGljb25cbiAgICAgICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBodG1sQ29uZmlnc1tmaWVsZE5hbWVdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIGdlbmVyYWwgc2V0dGluZ3MgdG9vbHRpcHM6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHNwZWNpZmljIHRvb2x0aXAgY29udGVudFxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSB0byB1cGRhdGVcbiAgICAgKiBAcGFyYW0ge09iamVjdHxzdHJpbmd9IHRvb2x0aXBEYXRhIC0gTmV3IHRvb2x0aXAgZGF0YSBvciBIVE1MIGNvbnRlbnRcbiAgICAgKi9cbiAgICBzdGF0aWMgdXBkYXRlVG9vbHRpcChmaWVsZE5hbWUsIHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Rvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLnVwZGF0ZShmaWVsZE5hbWUsIHRvb2x0aXBEYXRhKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgdG9vbHRpcCBmb3IgZmllbGQgJyR7ZmllbGROYW1lfSc6YCwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBhbGwgZ2VuZXJhbCBzZXR0aW5ncyB0b29sdGlwc1xuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NlbGVjdG9yPScuZmllbGQtaW5mby1pY29uJ10gLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBzdGF0aWMgZGVzdHJveShzZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBUb29sdGlwQnVpbGRlci5kZXN0cm95KHNlbGVjdG9yKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZXN0cm95IGdlbmVyYWwgc2V0dGluZ3MgdG9vbHRpcHM6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyO1xufSJdfQ==