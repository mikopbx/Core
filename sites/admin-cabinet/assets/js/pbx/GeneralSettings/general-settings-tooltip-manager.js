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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsImdldFJlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcCIsImdldFNlbmRNZXRyaWNzVG9vbHRpcCIsImdldEFsbG93R3Vlc3RDYWxsc1Rvb2x0aXAiLCJnZXRQQlhMYW5ndWFnZVRvb2x0aXAiLCJnZXRQQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXAiLCJnZXRNYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwIiwiZ2V0U3BsaXRBdWRpb1RocmVhZFRvb2x0aXAiLCJnZXRSZWNvcmRDYWxsc1Rvb2x0aXAiLCJnZXRSZWNvcmRDYWxsc0lubmVyVG9vbHRpcCIsImdldFVzZVdlYlJUQ1Rvb2x0aXAiLCJnZXRSZWRpcmVjdFRvSHR0cHNUb29sdGlwIiwiZ2V0U1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcCIsImdldEFKQU1FbmFibGVkVG9vbHRpcCIsImdldEFNSUVuYWJsZWRUb29sdGlwIiwiZ2V0QVJJRW5hYmxlZFRvb2x0aXAiLCJnZXRBUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXAiLCJnZXRQQlhDYWxsUGFya2luZ0V4dFRvb2x0aXAiLCJnZXRQQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXAiLCJnZXRQQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXAiLCJnZXRQQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwIiwiZ2V0UEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXAiLCJnZXRQQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcCIsImdldFJUUFBvcnRSYW5nZVRvb2x0aXAiLCJnZXRSVFBTdHVuU2VydmVyVG9vbHRpcCIsImdldFNJUEF1dGhQcmVmaXhUb29sdGlwIiwiZ2V0U0lQRGVmYXVsdEV4cGlyeVRvb2x0aXAiLCJnZXRTSVBFeHBpcnlSYW5nZVRvb2x0aXAiLCJnZXRTU0hBdXRob3JpemVkS2V5c1Rvb2x0aXAiLCJnZXRTU0hfSURfUlNBX1BVQlRvb2x0aXAiLCJnZXRXRUJIVFRQU1B1YmxpY0tleVRvb2x0aXAiLCJnZXRXRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwIiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF93aGVuIiwiZGVmaW5pdGlvbiIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF93aGVuX2Rlc2MiLCJnc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfYmVuZWZpdHMiLCJsaXN0MiIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9iZW5lZml0X21lbW9yeSIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9iZW5lZml0X3N0YWJpbGl0eSIsImxpc3QzIiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2RyYXdiYWNrcyIsImxpc3Q0IiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2RyYXdiYWNrX2NhbGxzIiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2RyYXdiYWNrX3JlZ2lzdHJhdGlvbiIsIm5vdGUiLCJnc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfcmVjb21tZW5kYXRpb24iLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfaGVhZGVyIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2Rlc2MiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfcHVycG9zZSIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9wdXJwb3NlX2Rlc2MiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfd2hhdF9jb2xsZWN0ZWQiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX2Vycm9ycyIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9jb2xsZWN0ZWRfY3Jhc2hlcyIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9jb2xsZWN0ZWRfcGVyZm9ybWFuY2UiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX3ZlcnNpb24iLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX2Vudmlyb25tZW50IiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRzIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRfcXVpY2tfZml4ZXMiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfYmVuZWZpdF9zdGFiaWxpdHkiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfYmVuZWZpdF9zdXBwb3J0IiwibGlzdDUiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfcHJpdmFjeSIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9wcml2YWN5X2Rlc2MiLCJ3YXJuaW5nIiwiaWNvbiIsInRleHQiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfd2FybmluZyIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9ub3RlIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9oZWFkZXIiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2Rlc2MiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF93YXJuaW5nIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF93aGVuX2VuYWJsZSIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX2Fub255bW91cyIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX2ludGVyY29tIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9lbmFibGVfZG9vcnBob25lIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9lbmFibGVfcHVibGljIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF90ZWNobmljYWwiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3RlY2huaWNhbF9lbmRwb2ludCIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfdGVjaG5pY2FsX2NvbnRleHQiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3RlY2huaWNhbF9tb2R1bGUiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3NlY3VyaXR5IiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9zZWN1cml0eV9kZXNjIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9yZWNvbW1lbmRhdGlvbiIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9oZWFkZXIiLCJnc19QQlhMYW5ndWFnZVRvb2x0aXBfZGVzYyIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHNfdm9pY2UiLCJnc19QQlhMYW5ndWFnZVRvb2x0aXBfYWZmZWN0c19wcm9tcHRzIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHNfaXZyIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHNfdm9pY2VtYWlsIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX3Jlc3RhcnQiLCJnc19QQlhMYW5ndWFnZVRvb2x0aXBfcmVzdGFydF9kZXNjIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX25vdGUiLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfaGVhZGVyIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2Rlc2MiLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfYWZmZWN0cyIsImdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9hZmZlY3RzX25ldyIsImdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9hZmZlY3RzX3ZhbGlkYXRpb24iLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfYWZmZWN0c19zZWFyY2giLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfZXhhbXBsZXMiLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfZXhhbXBsZV8zIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVfNCIsImdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9leGFtcGxlXzUiLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfd2FybmluZyIsImdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9ub3RlIiwiZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9oZWFkZXIiLCJnc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX2Rlc2MiLCJnc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX2F1dG8iLCJnc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX2F1dG9fZGVzYyIsImdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfbWFudWFsIiwiZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9tYW51YWxfZGVzYyIsImdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfbm90ZSIsImdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2hlYWRlciIsImdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2Rlc2MiLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9tb25vIiwiZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfbW9ub19kZXNjIiwiZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfc3RlcmVvIiwiZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfc3RlcmVvX2Rlc2MiLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9iZW5lZml0cyIsImdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2JlbmVmaXRfYW5hbHlzaXMiLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9iZW5lZml0X3F1YWxpdHkiLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9iZW5lZml0X3Byb2Nlc3NpbmciLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9ub3RlIiwiZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX2hlYWRlciIsImdzX1JlY29yZENhbGxzVG9vbHRpcF9kZXNjIiwiZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX3N0b3JhZ2UiLCJnc19SZWNvcmRDYWxsc1Rvb2x0aXBfc3RvcmFnZV9kZXNjIiwiZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX2xlZ2FsIiwiZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX2xlZ2FsX2Rlc2MiLCJnc19SZWNvcmRDYWxsc1Rvb2x0aXBfd2FybmluZyIsImdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX2hlYWRlciIsImdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX2Rlc2MiLCJnc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF91c2FnZSIsImdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlX3RyYWluaW5nIiwiZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfdXNhZ2VfcXVhbGl0eSIsImdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlX3NlY3VyaXR5IiwiZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfbm90ZSIsImdzX1VzZVdlYlJUQ1Rvb2x0aXBfaGVhZGVyIiwiZ3NfVXNlV2ViUlRDVG9vbHRpcF9kZXNjIiwiZ3NfVXNlV2ViUlRDVG9vbHRpcF9iZW5lZml0cyIsImdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdF9icm93c2VyIiwiZ3NfVXNlV2ViUlRDVG9vbHRpcF9iZW5lZml0X25vX3NvZnR3YXJlIiwiZ3NfVXNlV2ViUlRDVG9vbHRpcF9iZW5lZml0X2VuY3J5cHRpb24iLCJnc19Vc2VXZWJSVENUb29sdGlwX3JlcXVpcmVtZW50cyIsImdzX1VzZVdlYlJUQ1Rvb2x0aXBfcmVxdWlyZW1lbnRzX2Rlc2MiLCJnc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX2hlYWRlciIsImdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfZGVzYyIsImdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfc2VjdXJpdHkiLCJnc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX3NlY3VyaXR5X2Rlc2MiLCJnc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX2NlcnRpZmljYXRlIiwiZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9jZXJ0aWZpY2F0ZV9kZXNjIiwiZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9ub3RlIiwiZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9oZWFkZXIiLCJnc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2Rlc2MiLCJnc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF93YXJuaW5nIiwiZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9iZW5lZml0cyIsImdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfYmVuZWZpdF9zZWN1cml0eSIsImdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfYmVuZWZpdF9icnV0ZWZvcmNlIiwiZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9iZW5lZml0X2NvbXBsaWFuY2UiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfaGVhZGVyIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rlc2MiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfd2hhdF9pcyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF93aGF0X2lzX2Rlc2MiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2UiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2Vfd2ViYXBwcyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZV9wYW5lbHMiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2Vfd2lkZ2V0cyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZV9tb25pdG9yaW5nIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3Byb3RvY29scyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9wcm90b2NvbHNfZGVzYyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9kZWZhdWx0IiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2RlZmF1bHRfZGVzYyIsImxpc3Q2IiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3doZW5fZGlzYWJsZSIsImxpc3Q3IiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMSIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9kaXNhYmxlXzIiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8zIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3dhcm5pbmciLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfbm90ZSIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2hlYWRlciIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2Rlc2MiLCJnc19BTUlFbmFibGVkVG9vbHRpcF93aGF0X2lzIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2hhdF9pc19kZXNjIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2UiLCJnc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9tb25pdG9yaW5nIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfaW50ZWdyYXRpb24iLCJnc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9jb250cm9sIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfZXZlbnRzIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfY29tbWFuZHMiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9leGFtcGxlcyIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfY3JtIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV93YWxsYm9hcmQiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9leGFtcGxlX2N0aSIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfcmVwb3J0aW5nIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGVmYXVsdCIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2RlZmF1bHRfZGVzYyIsImdzX0FNSUVuYWJsZWRUb29sdGlwX3doZW5fZGlzYWJsZSIsImxpc3Q4IiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8xIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8yIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8zIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19BTUlFbmFibGVkVG9vbHRpcF93YXJuaW5nIiwiZm9vdGVyIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZm9vdGVyIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfaGVhZGVyIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZGVzYyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3doYXRfaXMiLCJnc19BUklFbmFibGVkVG9vbHRpcF93aGF0X2lzX2Rlc2MiLCJnc19BUklFbmFibGVkVG9vbHRpcF91c2FnZSIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX3dlYnJ0YyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX2l2ciIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX2NvbmZlcmVuY2UiLCJnc19BUklFbmFibGVkVG9vbHRpcF91c2FnZV9yZWNvcmRpbmciLCJnc19BUklFbmFibGVkVG9vbHRpcF91c2FnZV9jdXN0b20iLCJnc19BUklFbmFibGVkVG9vbHRpcF9leGFtcGxlcyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfd2VicGhvbmUiLCJnc19BUklFbmFibGVkVG9vbHRpcF9leGFtcGxlX2JvdCIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfcXVldWUiLCJnc19BUklFbmFibGVkVG9vbHRpcF9leGFtcGxlX2FuYWx5dGljcyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2RlZmF1bHQiLCJnc19BUklFbmFibGVkVG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJnc19BUklFbmFibGVkVG9vbHRpcF93aGVuX2VuYWJsZSIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2VuYWJsZV8xIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZW5hYmxlXzIiLCJnc19BUklFbmFibGVkVG9vbHRpcF9lbmFibGVfMyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfd2FybmluZyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2Zvb3RlciIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9oZWFkZXIiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZGVzYyIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF93aGF0X2lzIiwiZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3doYXRfaXNfZGVzYyIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9mb3JtYXQiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZm9ybWF0X2Rlc2MiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZXhhbXBsZXMiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZXhhbXBsZV8xIiwiZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2V4YW1wbGVfMiIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9leGFtcGxlXzMiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfc2VjdXJpdHkiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfc2VjdXJpdHlfMSIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9zZWN1cml0eV8yIiwiZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3NlY3VyaXR5XzMiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZGVmYXVsdCIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZm9vdGVyIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hlYWRlciIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9kZXNjIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hvdyIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ob3dfZGlhbCIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ob3dfYW5ub3VuY2UiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaG93X3JldHJpZXZlIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzX3JhbmdlIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzX2NhcGFjaXR5IiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzX2F1dG9tYXRpYyIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9leGFtcGxlIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2V4YW1wbGVfZGVzYyIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ub3RlIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hlYWRlciIsImdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9kZXNjIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvdyIsImdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ob3dfcHJlc3MiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X2RpYWwiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X3RhbGsiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X2NvbXBsZXRlIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2JlbmVmaXRzIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2JlbmVmaXRzX2Rlc2MiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfbm90ZSIsImdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9oZWFkZXIiLCJnc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfZGVzYyIsImdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9ob3ciLCJnc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaG93X3ByZXNzIiwiZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hvd19kaWFsIiwiZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hvd19oYW5ndXAiLCJnc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfd2FybmluZyIsImdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9ub3RlIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF9oZWFkZXIiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX2Rlc2MiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3R5cGVzIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2dlbmVyYWwiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3R5cGVfZ2VuZXJhbF9kZXNjIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2RpcmVjdGVkIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2RpcmVjdGVkX2Rlc2MiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3VzYWdlIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF91c2FnZV9kZXNjIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfaGVhZGVyIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfZGVzYyIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3NjZW5hcmlvIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfc2NlbmFyaW9fMSIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3NjZW5hcmlvXzIiLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18zIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfZGVmYXVsdCIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX2RlZmF1bHRfZGVzYyIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY29tbWVuZGF0aW9ucyIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY19zdGFuZGFyZCIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY19xdWljayIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY19leHRlbmRlZCIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2hlYWRlciIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2Rlc2MiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF91c2FnZSIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX3VzYWdlX2Rlc2MiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9kZWZhdWx0IiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfZGVmYXVsdF9kZXNjIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfd2hlbl90b19jaGFuZ2UiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9jaGFuZ2VfaW5jcmVhc2UiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9jaGFuZ2VfaW5jcmVhc2VfZGVzYyIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9kZWNyZWFzZSIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9kZWNyZWFzZV9kZXNjIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfZm9vdGVyIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9oZWFkZXIiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2Rlc2MiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2UiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2VfbWVkaWEiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2VfYmlkaXJlY3Rpb25hbCIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfcHVycG9zZV91bmlxdWUiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2RlZmF1bHQiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2RlZmF1bHRfZGVzYyIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2FsY3VsYXRpb24iLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NhbGN1bGF0aW9uX2Rlc2MiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX3doZW5fdG9fY2hhbmdlIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfaW5jcmVhc2UiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NoYW5nZV9pbmNyZWFzZV9kZXNjIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfY3VzdG9tIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfY3VzdG9tX2Rlc2MiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NoYW5nZV9uYXQiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NoYW5nZV9uYXRfZGVzYyIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZm9vdGVyIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfaGVhZGVyIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZGVzYyIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3B1cnBvc2VfaGVhZGVyIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfcHVycG9zZV8xIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfcHVycG9zZV8yIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfcHVycG9zZV8zIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfaG93X2l0X3dvcmtzIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfaG93X2l0X3dvcmtzX2Rlc2MiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9mb3JtYXQiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9mb3JtYXRfZGVzYyIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3doZW5fdG9fdXNlIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfdXNlXzEiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF91c2VfMiIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3VzZV8zIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZXhhbXBsZXMiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlXzEiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlXzIiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlXzMiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9mb290ZXIiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF9oZWFkZXIiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF9kZXNjIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfcHVycG9zZSIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3B1cnBvc2VfZGVzYyIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX2hvd19pdF93b3JrcyIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dvcmtfMSIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dvcmtfMiIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dvcmtfMyIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX2RlZmF1bHQiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF93aGVuX3RvX3VzZSIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV8xIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfdXNlXzIiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF91c2VfMyIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV80IiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF93YXJuaW5nIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfaGVhZGVyIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfZGVzYyIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3B1cnBvc2UiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9wdXJwb3NlX2Rlc2MiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9ob3dfaXRfd29ya3MiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF93b3JrXzEiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF93b3JrXzIiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF93b3JrXzMiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9kZWZhdWx0IiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfZGVmYXVsdF9kZXNjIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfd2hlbl90b19jaGFuZ2UiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9jaGFuZ2VfbW9iaWxlIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfY2hhbmdlX3N0YWJsZSIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9iYXR0ZXJ5IiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfbm90ZSIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9oZWFkZXIiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfZGVzYyIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5faGVhZGVyIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9kZXNjIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9wcm90ZWN0IiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9kZWZhdWx0IiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9uYXQiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWF4X2hlYWRlciIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfZGVzYyIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfdGltZW91dCIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfZGVmYXVsdCIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfcmVkdWNlIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY29tbWVuZGF0aW9ucyIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9yZWNfbG9jYWwiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX2ludGVybmV0IiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY19tb2JpbGUiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX2RlZmF1bHQiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfaG93X2l0X3dvcmtzIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3dhcm5pbmciLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbm90ZSIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9oZWFkZXIiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfZGVzYyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF93aGF0X2lzIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3doYXRfaXNfZGVzYyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9mb3JtYXQiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfZm9ybWF0X2Rlc2MiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfaG93X3RvX2FkZCIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfMSIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfMiIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfMyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfNCIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0cyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzEiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYmVuZWZpdF8yIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2JlbmVmaXRfMyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzQiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfc2VjdXJpdHkiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfc2VjdXJpdHlfMSIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9zZWN1cml0eV8yIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3NlY3VyaXR5XzMiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfd2FybmluZyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9ub3RlIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2hlYWRlciIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9kZXNjIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3doYXRfaXMiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfd2hhdF9pc19kZXNjIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzEiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2VfMiIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2FnZV8zIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzQiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZ2VuZXJhdGlvbiIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9nZW5lcmF0aW9uX2Rlc2MiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfaG93X3RvX3VzZSIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2VfMSIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2VfMiIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2VfMyIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9mb3JtYXQiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZm9ybWF0X2Rlc2MiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfd2FybmluZyIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9ub3RlIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2hlYWRlciIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9kZXNjIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3doYXRfaXMiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfd2hhdF9pc19kZXNjIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3doZXJlX3VzZWQiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9uZ2lueCIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF91c2VkX3dlYnJ0YyIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF91c2VkX2FqYW0iLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9hcGkiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfZm9ybWF0IiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2Zvcm1hdF9kZXNjIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX29idGFpbiIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fbGV0c2VuY3J5cHQiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfb2J0YWluX2NhIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX29idGFpbl9zZWxmIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2NoYWluIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2NoYWluX2Rlc2MiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfbm90ZSIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9mb290ZXIiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2hlYWRlciIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfZGVzYyIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfd2hhdF9pcyIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfd2hhdF9pc19kZXNjIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9wdXJwb3NlIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9wdXJwb3NlXzEiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3B1cnBvc2VfMiIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfcHVycG9zZV8zIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9mb3JtYXQiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2Zvcm1hdF9kZXNjIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfd2FybmluZyIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHkiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5XzEiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5XzIiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5XzMiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5XzQiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2NvbXBhdGliaWxpdHkiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2NvbXBhdGliaWxpdHlfZGVzYyIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfbm90ZSIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfZm9vdGVyIiwiY29uZmlnIiwiaHRtbCIsIkFycmF5IiwiaXNBcnJheSIsImxlbmd0aCIsImZvckVhY2giLCJpdGVtIiwiT2JqZWN0IiwiZW50cmllcyIsImkiLCJsaXN0TmFtZSIsImV4YW1wbGVzIiwiZXhhbXBsZXNIZWFkZXIiLCJleGFtcGxlIiwiaW5kZXgiLCJlc2NhcGVkRXhhbXBsZSIsImVzY2FwZUh0bWwiLCJzdGFydHNXaXRoIiwiZW5kc1dpdGgiLCJpbmNsdWRlcyIsInNwbGl0IiwibWFwIiwicyIsInRyaW0iLCJrZXkiLCJ2YWx1ZSIsIlN0cmluZyIsInJlcGxhY2UiLCJtIiwiVG9vbHRpcEJ1aWxkZXIiLCJjb25zb2xlIiwiZXJyb3IiLCJ0b29sdGlwQ29uZmlncyIsImdldFRvb2x0aXBDb25maWd1cmF0aW9ucyIsImh0bWxDb25maWdzIiwiZmllbGROYW1lIiwiYnVpbGRUb29sdGlwQ29udGVudCIsIiQiLCJlYWNoIiwiZWxlbWVudCIsIiRpY29uIiwiZGF0YSIsImNvbnRlbnQiLCJwb3B1cCIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsInZhcmlhdGlvbiIsIm9uIiwiaW5pdGlhbGl6ZSIsInNlbGVjdG9yIiwic2hvd0RlbGF5IiwiaGlkZURlbGF5IiwidG9vbHRpcERhdGEiLCJ1cGRhdGUiLCJkZXN0cm95IiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsNkI7QUFDRjtBQUNKO0FBQ0E7QUFDQTtBQUNJLDJDQUFjO0FBQUE7O0FBQ1YsVUFBTSxJQUFJQyxLQUFKLENBQVUsNEVBQVYsQ0FBTjtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztXQUNJLG9DQUFrQztBQUM5QixhQUFPO0FBQ0gsNkJBQXFCLEtBQUtDLDJCQUFMLEVBRGxCO0FBRUgsdUJBQWUsS0FBS0MscUJBQUwsRUFGWjtBQUdILDhCQUFzQixLQUFLQyx5QkFBTCxFQUhuQjtBQUlILHVCQUFlLEtBQUtDLHFCQUFMLEVBSlo7QUFLSCxzQ0FBOEIsS0FBS0Msb0NBQUwsRUFMM0I7QUFNSCxpQ0FBeUIsS0FBS0MsNEJBQUwsRUFOdEI7QUFPSCwrQkFBdUIsS0FBS0MsMEJBQUwsRUFQcEI7QUFRSCwwQkFBa0IsS0FBS0MscUJBQUwsRUFSZjtBQVNILCtCQUF1QixLQUFLQywwQkFBTCxFQVRwQjtBQVVILHFCQUFhLEtBQUtDLG1CQUFMLEVBVlY7QUFXSCwyQkFBbUIsS0FBS0MseUJBQUwsRUFYaEI7QUFZSCxvQ0FBNEIsS0FBS0Msa0NBQUwsRUFaekI7QUFhSCx1QkFBZSxLQUFLQyxxQkFBTCxFQWJaO0FBY0gsc0JBQWMsS0FBS0Msb0JBQUwsRUFkWDtBQWVILHNCQUFjLEtBQUtDLG9CQUFMLEVBZlg7QUFnQkgsNkJBQXFCLEtBQUtDLDJCQUFMLEVBaEJsQjtBQWlCSCw2QkFBcUIsS0FBS0MsMkJBQUwsRUFqQmxCO0FBa0JILHNDQUE4QixLQUFLQyxvQ0FBTCxFQWxCM0I7QUFtQkgsbUNBQTJCLEtBQUtDLGlDQUFMLEVBbkJ4QjtBQW9CSCxpQ0FBeUIsS0FBS0MsK0JBQUwsRUFwQnRCO0FBcUJILDJDQUFtQyxLQUFLQyx5Q0FBTCxFQXJCaEM7QUFzQkgsa0NBQTBCLEtBQUtDLGdDQUFMLEVBdEJ2QjtBQXVCSCx3QkFBZ0IsS0FBS0Msc0JBQUwsRUF2QmI7QUF3QkgseUJBQWlCLEtBQUtDLHVCQUFMLEVBeEJkO0FBeUJILHlCQUFpQixLQUFLQyx1QkFBTCxFQXpCZDtBQTBCSCw0QkFBb0IsS0FBS0MsMEJBQUwsRUExQmpCO0FBMkJILDBCQUFrQixLQUFLQyx3QkFBTCxFQTNCZjtBQTRCSCw2QkFBcUIsS0FBS0MsMkJBQUwsRUE1QmxCO0FBNkJILDBCQUFrQixLQUFLQyx3QkFBTCxFQTdCZjtBQThCSCw2QkFBcUIsS0FBS0MsMkJBQUwsRUE5QmxCO0FBK0JILDhCQUFzQixLQUFLQyw0QkFBTDtBQS9CbkIsT0FBUDtBQWlDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksdUNBQXFDO0FBQ2pDLGFBQU87QUFDSEMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDLGtDQURyQjtBQUVIQyxRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQ0csZ0NBRjFCO0FBR0hDLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDTSxnQ0FEMUI7QUFFSUMsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUNRO0FBRmhDLFNBREUsRUFLRjtBQUNJSCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ1Msb0NBRDFCO0FBRUlGLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQUxFLENBSEg7QUFhSEcsUUFBQUEsS0FBSyxFQUFFLENBQ0hWLGVBQWUsQ0FBQ1csMENBRGIsRUFFSFgsZUFBZSxDQUFDWSw2Q0FGYixDQWJKO0FBaUJIQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJUixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2MscUNBRDFCO0FBRUlQLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBakJKO0FBdUJIUSxRQUFBQSxLQUFLLEVBQUUsQ0FDSGYsZUFBZSxDQUFDZ0IsMENBRGIsRUFFSGhCLGVBQWUsQ0FBQ2lCLGlEQUZiLENBdkJKO0FBMkJIQyxRQUFBQSxJQUFJLEVBQUVsQixlQUFlLENBQUNtQjtBQTNCbkIsT0FBUDtBQTZCSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksaUNBQStCO0FBQzNCLGFBQU87QUFDSHBCLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDb0IsNEJBRHJCO0FBRUhsQixRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQ3FCLDBCQUYxQjtBQUdIakIsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNzQiw2QkFEMUI7QUFFSWYsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUN1QjtBQUZoQyxTQURFLEVBS0Y7QUFDSWxCLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDd0Isb0NBRDFCO0FBRUlqQixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FMRSxDQUhIO0FBYUhHLFFBQUFBLEtBQUssRUFBRSxDQUNIVixlQUFlLENBQUN5QixzQ0FEYixFQUVIekIsZUFBZSxDQUFDMEIsdUNBRmIsRUFHSDFCLGVBQWUsQ0FBQzJCLDJDQUhiLEVBSUgzQixlQUFlLENBQUM0Qix1Q0FKYixFQUtINUIsZUFBZSxDQUFDNkIsMkNBTGIsQ0FiSjtBQW9CSGhCLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lSLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDOEIsOEJBRDFCO0FBRUl2QixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQXBCSjtBQTBCSFEsUUFBQUEsS0FBSyxFQUFFLENBQ0hmLGVBQWUsQ0FBQytCLHlDQURiLEVBRUgvQixlQUFlLENBQUNnQyx1Q0FGYixFQUdIaEMsZUFBZSxDQUFDaUMscUNBSGIsQ0ExQko7QUErQkhDLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0k3QixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ21DLDZCQUQxQjtBQUVJNUIsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUNvQztBQUZoQyxTQURHLENBL0JKO0FBcUNIQyxRQUFBQSxPQUFPLEVBQUU7QUFDTEMsVUFBQUEsSUFBSSxFQUFFLGFBREQ7QUFFTEMsVUFBQUEsSUFBSSxFQUFFdkMsZUFBZSxDQUFDd0M7QUFGakIsU0FyQ047QUF5Q0h0QixRQUFBQSxJQUFJLEVBQUVsQixlQUFlLENBQUN5QztBQXpDbkIsT0FBUDtBQTJDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0kscUNBQW1DO0FBQy9CLGFBQU87QUFDSDFDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDMEMsZ0NBRHJCO0FBRUh4QyxRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQzJDLDhCQUYxQjtBQUdITixRQUFBQSxPQUFPLEVBQUU7QUFDTHRDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDNEMsd0NBRG5CO0FBRUxMLFVBQUFBLElBQUksRUFBRXZDLGVBQWUsQ0FBQzZDO0FBRmpCLFNBSE47QUFPSHpDLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDOEMscUNBRDFCO0FBRUl2QyxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERSxDQVBIO0FBYUhHLFFBQUFBLEtBQUssRUFBRSxDQUNIVixlQUFlLENBQUMrQywwQ0FEYixFQUVIL0MsZUFBZSxDQUFDZ0QseUNBRmIsRUFHSGhELGVBQWUsQ0FBQ2lELDBDQUhiLEVBSUhqRCxlQUFlLENBQUNrRCx1Q0FKYixDQWJKO0FBbUJIckMsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVIsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNtRCxtQ0FEMUI7QUFFSTVDLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBbkJKO0FBeUJIUSxRQUFBQSxLQUFLLEVBQUUsQ0FDSGYsZUFBZSxDQUFDb0QsNENBRGIsRUFFSHBELGVBQWUsQ0FBQ3FELDJDQUZiLEVBR0hyRCxlQUFlLENBQUNzRCwwQ0FIYixDQXpCSjtBQThCSHBCLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0k3QixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3VELGtDQUQxQjtBQUVJaEQsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUN3RDtBQUZoQyxTQURHLENBOUJKO0FBb0NIdEMsUUFBQUEsSUFBSSxFQUFFbEIsZUFBZSxDQUFDeUQ7QUFwQ25CLE9BQVA7QUFzQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLGlDQUErQjtBQUMzQixhQUFPO0FBQ0gxRCxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQzBELDRCQURyQjtBQUVIeEQsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUMyRCwwQkFGMUI7QUFHSHZELFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDNEQsNkJBRDFCO0FBRUlyRCxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERSxDQUhIO0FBU0hHLFFBQUFBLEtBQUssRUFBRSxDQUNIVixlQUFlLENBQUM2RCxtQ0FEYixFQUVIN0QsZUFBZSxDQUFDOEQscUNBRmIsRUFHSDlELGVBQWUsQ0FBQytELGlDQUhiLEVBSUgvRCxlQUFlLENBQUNnRSx1Q0FKYixDQVRKO0FBZUhuRCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJUixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2lFLDZCQUQxQjtBQUVJMUQsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUNrRTtBQUZoQyxTQURHLENBZko7QUFxQkhoRCxRQUFBQSxJQUFJLEVBQUVsQixlQUFlLENBQUNtRTtBQXJCbkIsT0FBUDtBQXVCSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksZ0RBQThDO0FBQzFDLGFBQU87QUFDSHBFLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDb0UsMkNBRHJCO0FBRUhsRSxRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQ3FFLHlDQUYxQjtBQUdIakUsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNzRSw0Q0FEMUI7QUFFSS9ELFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLENBSEg7QUFTSEcsUUFBQUEsS0FBSyxFQUFFLENBQ0hWLGVBQWUsQ0FBQ3VFLGdEQURiLEVBRUh2RSxlQUFlLENBQUN3RSx1REFGYixFQUdIeEUsZUFBZSxDQUFDeUUsbURBSGIsQ0FUSjtBQWNINUQsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVIsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMwRSw2Q0FEMUI7QUFFSW5FLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBZEo7QUFvQkhRLFFBQUFBLEtBQUssRUFBRSxDQUNIZixlQUFlLENBQUMyRSw4Q0FEYixFQUVIM0UsZUFBZSxDQUFDNEUsOENBRmIsRUFHSDVFLGVBQWUsQ0FBQzZFLDhDQUhiLENBcEJKO0FBeUJIeEMsUUFBQUEsT0FBTyxFQUFFO0FBQ0xFLFVBQUFBLElBQUksRUFBRXZDLGVBQWUsQ0FBQzhFO0FBRGpCLFNBekJOO0FBNEJINUQsUUFBQUEsSUFBSSxFQUFFbEIsZUFBZSxDQUFDK0U7QUE1Qm5CLE9BQVA7QUE4Qkg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLHdDQUFzQztBQUNsQyxhQUFPO0FBQ0hoRixRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2dGLG1DQURyQjtBQUVIOUUsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUNpRixpQ0FGMUI7QUFHSDdFLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDa0YsaUNBRDFCO0FBRUkzRSxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ21GO0FBRmhDLFNBREUsRUFLRjtBQUNJOUUsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNvRixtQ0FEMUI7QUFFSTdFLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDcUY7QUFGaEMsU0FMRSxDQUhIO0FBYUhuRSxRQUFBQSxJQUFJLEVBQUVsQixlQUFlLENBQUNzRjtBQWJuQixPQUFQO0FBZUg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLHNDQUFvQztBQUNoQyxhQUFPO0FBQ0h2RixRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ3VGLGlDQURyQjtBQUVIckYsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUN3RiwrQkFGMUI7QUFHSHBGLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDeUYsK0JBRDFCO0FBRUlsRixVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzBGO0FBRmhDLFNBREUsRUFLRjtBQUNJckYsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMyRixpQ0FEMUI7QUFFSXBGLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDNEY7QUFGaEMsU0FMRSxDQUhIO0FBYUhsRixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJTCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzZGLG1DQUQxQjtBQUVJdEYsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FiSjtBQW1CSE0sUUFBQUEsS0FBSyxFQUFFLENBQ0hiLGVBQWUsQ0FBQzhGLDJDQURiLEVBRUg5RixlQUFlLENBQUMrRiwwQ0FGYixFQUdIL0YsZUFBZSxDQUFDZ0csNkNBSGIsQ0FuQko7QUF3Qkg5RSxRQUFBQSxJQUFJLEVBQUVsQixlQUFlLENBQUNpRztBQXhCbkIsT0FBUDtBQTBCSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksaUNBQStCO0FBQzNCLGFBQU87QUFDSGxHLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDa0csNEJBRHJCO0FBRUhoRyxRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQ21HLDBCQUYxQjtBQUdIL0YsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNvRyw2QkFEMUI7QUFFSTdGLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDcUc7QUFGaEMsU0FERSxFQUtGO0FBQ0loRyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3NHLDJCQUQxQjtBQUVJL0YsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUN1RztBQUZoQyxTQUxFLENBSEg7QUFhSGxFLFFBQUFBLE9BQU8sRUFBRTtBQUNMRSxVQUFBQSxJQUFJLEVBQUV2QyxlQUFlLENBQUN3RztBQURqQjtBQWJOLE9BQVA7QUFpQkg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLHNDQUFvQztBQUNoQyxhQUFPO0FBQ0h6RyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ3lHLGlDQURyQjtBQUVIdkcsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUMwRywrQkFGMUI7QUFHSHRHLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDMkcsZ0NBRDFCO0FBRUlwRyxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERSxDQUhIO0FBU0hHLFFBQUFBLEtBQUssRUFBRSxDQUNIVixlQUFlLENBQUM0Ryx5Q0FEYixFQUVINUcsZUFBZSxDQUFDNkcsd0NBRmIsRUFHSDdHLGVBQWUsQ0FBQzhHLHlDQUhiLENBVEo7QUFjSDVGLFFBQUFBLElBQUksRUFBRWxCLGVBQWUsQ0FBQytHO0FBZG5CLE9BQVA7QUFnQkg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLCtCQUE2QjtBQUN6QixhQUFPO0FBQ0hoSCxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2dILDBCQURyQjtBQUVIOUcsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUNpSCx3QkFGMUI7QUFHSDdHLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDa0gsNEJBRDFCO0FBRUkzRyxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERSxDQUhIO0FBU0hHLFFBQUFBLEtBQUssRUFBRSxDQUNIVixlQUFlLENBQUNtSCxtQ0FEYixFQUVIbkgsZUFBZSxDQUFDb0gsdUNBRmIsRUFHSHBILGVBQWUsQ0FBQ3FILHNDQUhiLENBVEo7QUFjSHhHLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lSLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDc0gsZ0NBRDFCO0FBRUkvRyxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ3VIO0FBRmhDLFNBREc7QUFkSixPQUFQO0FBcUJIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSxxQ0FBbUM7QUFDL0IsYUFBTztBQUNIeEgsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUN3SCxnQ0FEckI7QUFFSHRILFFBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDeUgsOEJBRjFCO0FBR0hySCxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzBILGtDQUQxQjtBQUVJbkgsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUMySDtBQUZoQyxTQURFLEVBS0Y7QUFDSXRILFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDNEgscUNBRDFCO0FBRUlySCxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzZIO0FBRmhDLFNBTEUsQ0FISDtBQWFIM0csUUFBQUEsSUFBSSxFQUFFbEIsZUFBZSxDQUFDOEg7QUFibkIsT0FBUDtBQWVIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSw4Q0FBNEM7QUFDeEMsYUFBTztBQUNIL0gsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUMrSCx5Q0FEckI7QUFFSDdILFFBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDZ0ksdUNBRjFCO0FBR0gzRixRQUFBQSxPQUFPLEVBQUU7QUFDTHRDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDaUksaURBRG5CO0FBRUwxRixVQUFBQSxJQUFJLEVBQUV2QyxlQUFlLENBQUNrSTtBQUZqQixTQUhOO0FBT0g5SCxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ21JLDJDQUQxQjtBQUVJNUgsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREUsQ0FQSDtBQWFIRyxRQUFBQSxLQUFLLEVBQUUsQ0FDSFYsZUFBZSxDQUFDb0ksbURBRGIsRUFFSHBJLGVBQWUsQ0FBQ3FJLHFEQUZiLEVBR0hySSxlQUFlLENBQUNzSSxxREFIYjtBQWJKLE9BQVA7QUFtQkg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLGlDQUErQjtBQUMzQixhQUFPO0FBQ0h2SSxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ3VJLDRCQURyQjtBQUVIckksUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUN3SSwwQkFGMUI7QUFHSHBJLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDeUksNkJBRDFCO0FBRUlsSSxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzBJO0FBRmhDLFNBREUsQ0FISDtBQVNIaEksUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUwsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMySSwyQkFEMUI7QUFFSXBJLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBVEo7QUFlSE0sUUFBQUEsS0FBSyxFQUFFLENBQ0hiLGVBQWUsQ0FBQzRJLG1DQURiLEVBRUg1SSxlQUFlLENBQUM2SSxrQ0FGYixFQUdIN0ksZUFBZSxDQUFDOEksbUNBSGIsRUFJSDlJLGVBQWUsQ0FBQytJLHNDQUpiLENBZko7QUFxQkhoSSxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJVixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2dKLCtCQUQxQjtBQUVJekksVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUNpSjtBQUZoQyxTQURHLENBckJKO0FBMkJIL0csUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSTdCLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDa0osNkJBRDFCO0FBRUkzSSxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ21KO0FBRmhDLFNBREcsQ0EzQko7QUFpQ0hDLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0kvSSxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3FKLGtDQUQxQjtBQUVJOUksVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FqQ0o7QUF1Q0grSSxRQUFBQSxLQUFLLEVBQUUsQ0FDSHRKLGVBQWUsQ0FBQ3VKLCtCQURiLEVBRUh2SixlQUFlLENBQUN3SiwrQkFGYixFQUdIeEosZUFBZSxDQUFDeUosK0JBSGIsQ0F2Q0o7QUE0Q0hwSCxRQUFBQSxPQUFPLEVBQUU7QUFDTHRDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDMEosb0NBRG5CO0FBRUxuSCxVQUFBQSxJQUFJLEVBQUV2QyxlQUFlLENBQUMySjtBQUZqQixTQTVDTjtBQWdESHpJLFFBQUFBLElBQUksRUFBRWxCLGVBQWUsQ0FBQzRKO0FBaERuQixPQUFQO0FBa0RIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSxnQ0FBOEI7QUFDMUIsYUFBTztBQUNIN0osUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUM2SiwyQkFEckI7QUFFSDNKLFFBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDOEoseUJBRjFCO0FBR0gxSixRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQytKLDRCQUQxQjtBQUVJeEosVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUNnSztBQUZoQyxTQURFLENBSEg7QUFTSHRKLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lMLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDaUssMEJBRDFCO0FBRUkxSixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQVRKO0FBZUhNLFFBQUFBLEtBQUssRUFBRSxDQUNIYixlQUFlLENBQUNrSyxxQ0FEYixFQUVIbEssZUFBZSxDQUFDbUssc0NBRmIsRUFHSG5LLGVBQWUsQ0FBQ29LLGtDQUhiLEVBSUhwSyxlQUFlLENBQUNxSyxpQ0FKYixFQUtIckssZUFBZSxDQUFDc0ssbUNBTGIsQ0FmSjtBQXNCSHZKLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lWLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDdUssNkJBRDFCO0FBRUloSyxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQXRCSjtBQTRCSDJCLFFBQUFBLEtBQUssRUFBRSxDQUNIbEMsZUFBZSxDQUFDd0ssZ0NBRGIsRUFFSHhLLGVBQWUsQ0FBQ3lLLHNDQUZiLEVBR0h6SyxlQUFlLENBQUMwSyxnQ0FIYixFQUlIMUssZUFBZSxDQUFDMkssc0NBSmIsQ0E1Qko7QUFrQ0h2QixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJL0ksVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUM0Syw0QkFEMUI7QUFFSXJLLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDNks7QUFGaEMsU0FERyxDQWxDSjtBQXdDSHZCLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lqSixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzhLLGlDQUQxQjtBQUVJdkssVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0F4Q0o7QUE4Q0h3SyxRQUFBQSxLQUFLLEVBQUUsQ0FDSC9LLGVBQWUsQ0FBQ2dMLDhCQURiLEVBRUhoTCxlQUFlLENBQUNpTCw4QkFGYixFQUdIakwsZUFBZSxDQUFDa0wsOEJBSGIsQ0E5Q0o7QUFtREg3SSxRQUFBQSxPQUFPLEVBQUU7QUFDTHRDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDbUwsbUNBRG5CO0FBRUw1SSxVQUFBQSxJQUFJLEVBQUV2QyxlQUFlLENBQUNvTDtBQUZqQixTQW5ETjtBQXVESEMsUUFBQUEsTUFBTSxFQUFFckwsZUFBZSxDQUFDc0w7QUF2RHJCLE9BQVA7QUF5REg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLGdDQUE4QjtBQUMxQixhQUFPO0FBQ0h2TCxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ3VMLDJCQURyQjtBQUVIckwsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUN3TCx5QkFGMUI7QUFHSHBMLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDeUwsNEJBRDFCO0FBRUlsTCxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzBMO0FBRmhDLFNBREUsQ0FISDtBQVNIaEwsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUwsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMyTCwwQkFEMUI7QUFFSXBMLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBVEo7QUFlSE0sUUFBQUEsS0FBSyxFQUFFLENBQ0hiLGVBQWUsQ0FBQzRMLGlDQURiLEVBRUg1TCxlQUFlLENBQUM2TCw4QkFGYixFQUdIN0wsZUFBZSxDQUFDOEwscUNBSGIsRUFJSDlMLGVBQWUsQ0FBQytMLG9DQUpiLEVBS0gvTCxlQUFlLENBQUNnTSxpQ0FMYixDQWZKO0FBc0JIakwsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVYsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNpTSw2QkFEMUI7QUFFSTFMLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBdEJKO0FBNEJIMkIsUUFBQUEsS0FBSyxFQUFFLENBQ0hsQyxlQUFlLENBQUNrTSxxQ0FEYixFQUVIbE0sZUFBZSxDQUFDbU0sZ0NBRmIsRUFHSG5NLGVBQWUsQ0FBQ29NLGtDQUhiLEVBSUhwTSxlQUFlLENBQUNxTSxzQ0FKYixDQTVCSjtBQWtDSGpELFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0kvSSxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3NNLDRCQUQxQjtBQUVJL0wsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUN1TTtBQUZoQyxTQURHLENBbENKO0FBd0NIakQsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSWpKLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDd00sZ0NBRDFCO0FBRUlqTSxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQXhDSjtBQThDSHdLLFFBQUFBLEtBQUssRUFBRSxDQUNIL0ssZUFBZSxDQUFDeU0sNkJBRGIsRUFFSHpNLGVBQWUsQ0FBQzBNLDZCQUZiLEVBR0gxTSxlQUFlLENBQUMyTSw2QkFIYixDQTlDSjtBQW1ESHRLLFFBQUFBLE9BQU8sRUFBRTtBQUNMdEMsVUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUM0TSxtQ0FEbkI7QUFFTHJLLFVBQUFBLElBQUksRUFBRXZDLGVBQWUsQ0FBQzZNO0FBRmpCLFNBbkROO0FBdURIeEIsUUFBQUEsTUFBTSxFQUFFckwsZUFBZSxDQUFDOE07QUF2RHJCLE9BQVA7QUF5REg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLHVDQUFxQztBQUNqQyxhQUFPO0FBQ0gvTSxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQytNLGtDQURyQjtBQUVIN00sUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUNnTixnQ0FGMUI7QUFHSDVNLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDaU4sbUNBRDFCO0FBRUkxTSxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ2tOO0FBRmhDLFNBREUsQ0FISDtBQVNIeE0sUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUwsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNtTixrQ0FEMUI7QUFFSTVNLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDb047QUFGaEMsU0FERyxDQVRKO0FBZUh2TSxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJUixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3FOLG9DQUQxQjtBQUVJOU0sVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FmSjtBQXFCSFEsUUFBQUEsS0FBSyxFQUFFLENBQ0hmLGVBQWUsQ0FBQ3NOLHFDQURiLEVBRUh0TixlQUFlLENBQUN1TixxQ0FGYixFQUdIdk4sZUFBZSxDQUFDd04scUNBSGIsQ0FyQko7QUEwQkh0TCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJN0IsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUN5TixvQ0FEMUI7QUFFSWxOLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBMUJKO0FBZ0NINkksUUFBQUEsS0FBSyxFQUFFLENBQ0hwSixlQUFlLENBQUMwTixzQ0FEYixFQUVIMU4sZUFBZSxDQUFDMk4sc0NBRmIsRUFHSDNOLGVBQWUsQ0FBQzROLHNDQUhiLENBaENKO0FBcUNIdEUsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSWpKLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDNk4sbUNBRDFCO0FBRUl0TixVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzhOO0FBRmhDLFNBREcsQ0FyQ0o7QUEyQ0h6QyxRQUFBQSxNQUFNLEVBQUVyTCxlQUFlLENBQUMrTjtBQTNDckIsT0FBUDtBQTZDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksdUNBQXFDO0FBQ2pDLGFBQU87QUFDSGhPLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDZ08sa0NBRHJCO0FBRUg5TixRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQ2lPLGdDQUYxQjtBQUdIN04sUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNrTywrQkFEMUI7QUFFSTNOLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLENBSEg7QUFTSEcsUUFBQUEsS0FBSyxFQUFFLENBQ0hWLGVBQWUsQ0FBQ21PLG9DQURiLEVBRUhuTyxlQUFlLENBQUNvTyx3Q0FGYixFQUdIcE8sZUFBZSxDQUFDcU8sd0NBSGIsQ0FUSjtBQWNIeE4sUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVIsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNzTyxpQ0FEMUI7QUFFSS9OLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBZEo7QUFvQkhRLFFBQUFBLEtBQUssRUFBRSxDQUNIZixlQUFlLENBQUN1Tyx1Q0FEYixFQUVIdk8sZUFBZSxDQUFDd08sMENBRmIsRUFHSHhPLGVBQWUsQ0FBQ3lPLDJDQUhiLENBcEJKO0FBeUJIdk0sUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSTdCLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDME8sbUNBRDFCO0FBRUluTyxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzJPO0FBRmhDLFNBREcsQ0F6Qko7QUErQkh6TixRQUFBQSxJQUFJLEVBQUVsQixlQUFlLENBQUM0TztBQS9CbkIsT0FBUDtBQWlDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksZ0RBQThDO0FBQzFDLGFBQU87QUFDSDdPLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDNk8sMkNBRHJCO0FBRUgzTyxRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQzhPLHlDQUYxQjtBQUdIMU8sUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMrTyx3Q0FEMUI7QUFFSXhPLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLENBSEg7QUFTSEcsUUFBQUEsS0FBSyxFQUFFLENBQ0hWLGVBQWUsQ0FBQ2dQLDhDQURiLEVBRUhoUCxlQUFlLENBQUNpUCw2Q0FGYixFQUdIalAsZUFBZSxDQUFDa1AsNkNBSGIsRUFJSGxQLGVBQWUsQ0FBQ21QLGlEQUpiLENBVEo7QUFlSHRPLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lSLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDb1AsNkNBRDFCO0FBRUk3TyxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ3FQO0FBRmhDLFNBREcsQ0FmSjtBQXFCSG5PLFFBQUFBLElBQUksRUFBRWxCLGVBQWUsQ0FBQ3NQO0FBckJuQixPQUFQO0FBdUJIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSw2Q0FBMkM7QUFDdkMsYUFBTztBQUNIdlAsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUN1UCx3Q0FEckI7QUFFSHJQLFFBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDd1Asc0NBRjFCO0FBR0hwUCxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3lQLHFDQUQxQjtBQUVJbFAsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREUsQ0FISDtBQVNIRyxRQUFBQSxLQUFLLEVBQUUsQ0FDSFYsZUFBZSxDQUFDMFAsMkNBRGIsRUFFSDFQLGVBQWUsQ0FBQzJQLDBDQUZiLEVBR0gzUCxlQUFlLENBQUM0UCw0Q0FIYixDQVRKO0FBY0h2TixRQUFBQSxPQUFPLEVBQUU7QUFDTEUsVUFBQUEsSUFBSSxFQUFFdkMsZUFBZSxDQUFDNlA7QUFEakIsU0FkTjtBQWlCSDNPLFFBQUFBLElBQUksRUFBRWxCLGVBQWUsQ0FBQzhQO0FBakJuQixPQUFQO0FBbUJIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSwyQ0FBeUM7QUFDckMsYUFBTztBQUNIL1AsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUMrUCxzQ0FEckI7QUFFSDdQLFFBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDZ1Esb0NBRjFCO0FBR0g1UCxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2lRLHFDQUQxQjtBQUVJMVAsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREUsQ0FISDtBQVNIRyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJTCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2tRLDRDQUQxQjtBQUVJM1AsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUNtUTtBQUZoQyxTQURHLEVBS0g7QUFDSTlQLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDb1EsNkNBRDFCO0FBRUk3UCxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ3FRO0FBRmhDLFNBTEcsQ0FUSjtBQW1CSHhQLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lSLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDc1EscUNBRDFCO0FBRUkvUCxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ3VRO0FBRmhDLFNBREc7QUFuQkosT0FBUDtBQTBCSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0kscURBQW1EO0FBQy9DLGFBQU87QUFDSHhRLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDd1EsZ0RBRHJCO0FBRUh0USxRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQ3lRLDhDQUYxQjtBQUdIclEsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMwUSxrREFEMUI7QUFFSW5RLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLENBSEg7QUFTSEcsUUFBQUEsS0FBSyxFQUFFLENBQ0hWLGVBQWUsQ0FBQzJRLG9EQURiLEVBRUgzUSxlQUFlLENBQUM0USxvREFGYixFQUdINVEsZUFBZSxDQUFDNlEsb0RBSGIsQ0FUSjtBQWNIaFEsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVIsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUM4USxpREFEMUI7QUFFSXZRLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDK1E7QUFGaEMsU0FERyxDQWRKO0FBb0JIaFEsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVYsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNnUix5REFEMUI7QUFFSXpRLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBcEJKO0FBMEJIMkIsUUFBQUEsS0FBSyxFQUFFLENBQ0hsQyxlQUFlLENBQUNpUixzREFEYixFQUVIalIsZUFBZSxDQUFDa1IsbURBRmIsRUFHSGxSLGVBQWUsQ0FBQ21SLHNEQUhiO0FBMUJKLE9BQVA7QUFnQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLDRDQUEwQztBQUN0QyxhQUFPO0FBQ0hwUixRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ29SLHVDQURyQjtBQUVIbFIsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUNxUixxQ0FGMUI7QUFHSGpSLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDc1Isc0NBRDFCO0FBRUkvUSxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ3VSO0FBRmhDLFNBREUsQ0FISDtBQVNIN1EsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUwsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUN3Uix3Q0FEMUI7QUFFSWpSLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDeVI7QUFGaEMsU0FERyxDQVRKO0FBZUg1USxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJUixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzBSLCtDQUQxQjtBQUVJblIsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FmSjtBQXFCSFEsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVYsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMyUixnREFEMUI7QUFFSXBSLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDNFI7QUFGaEMsU0FERyxFQUtIO0FBQ0l2UixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzZSLGdEQUQxQjtBQUVJdFIsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUM4UjtBQUZoQyxTQUxHLENBckJKO0FBK0JIekcsUUFBQUEsTUFBTSxFQUFFckwsZUFBZSxDQUFDK1I7QUEvQnJCLE9BQVA7QUFpQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLGtDQUFnQztBQUM1QixhQUFPO0FBQ0hoUyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2dTLDZCQURyQjtBQUVIOVIsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUNpUywyQkFGMUI7QUFHSDdSLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDa1MsOEJBRDFCO0FBRUkzUixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERSxDQUhIO0FBU0hHLFFBQUFBLEtBQUssRUFBRSxDQUNIVixlQUFlLENBQUNtUyxvQ0FEYixFQUVIblMsZUFBZSxDQUFDb1MsNENBRmIsRUFHSHBTLGVBQWUsQ0FBQ3FTLHFDQUhiLENBVEo7QUFjSHhSLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lSLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDc1MsOEJBRDFCO0FBRUkvUixVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ3VTO0FBRmhDLFNBREcsQ0FkSjtBQW9CSHhSLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lWLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDd1Msa0NBRDFCO0FBRUlqUyxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ3lTO0FBRmhDLFNBREcsQ0FwQko7QUEwQkh2USxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJN0IsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMwUyxxQ0FEMUI7QUFFSW5TLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBMUJKO0FBZ0NINkksUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSS9JLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDMlMsc0NBRDFCO0FBRUlwUyxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzRTO0FBRmhDLFNBREcsRUFLSDtBQUNJdlMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUM2UyxvQ0FEMUI7QUFFSXRTLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDOFM7QUFGaEMsU0FMRyxFQVNIO0FBQ0l6UyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQytTLGlDQUQxQjtBQUVJeFMsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUNnVDtBQUZoQyxTQVRHLENBaENKO0FBOENIM0gsUUFBQUEsTUFBTSxFQUFFckwsZUFBZSxDQUFDaVQ7QUE5Q3JCLE9BQVA7QUFnREg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLG1DQUFpQztBQUM3QixhQUFPO0FBQ0hsVCxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ2tULDhCQURyQjtBQUVIaFQsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUNtVCw0QkFGMUI7QUFHSC9TLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDb1Qsc0NBRDFCO0FBRUk3UyxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERSxDQUhIO0FBU0hHLFFBQUFBLEtBQUssRUFBRSxDQUNIVixlQUFlLENBQUNxVCxpQ0FEYixFQUVIclQsZUFBZSxDQUFDc1QsaUNBRmIsRUFHSHRULGVBQWUsQ0FBQ3VULGlDQUhiLENBVEo7QUFjSDFTLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lSLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDd1Qsb0NBRDFCO0FBRUlqVCxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ3lUO0FBRmhDLFNBREcsQ0FkSjtBQW9CSDFTLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lWLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDMFQsOEJBRDFCO0FBRUluVCxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzJUO0FBRmhDLFNBREcsQ0FwQko7QUEwQkh6UixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJN0IsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUM0VCxtQ0FEMUI7QUFFSXJULFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBMUJKO0FBZ0NINkksUUFBQUEsS0FBSyxFQUFFLENBQ0hwSixlQUFlLENBQUM2VCw2QkFEYixFQUVIN1QsZUFBZSxDQUFDOFQsNkJBRmIsRUFHSDlULGVBQWUsQ0FBQytULDZCQUhiLENBaENKO0FBcUNIekssUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSWpKLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDZ1UsZ0NBRDFCO0FBRUl6VCxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQXJDSjtBQTJDSHdLLFFBQUFBLEtBQUssRUFBRSxDQUNIL0ssZUFBZSxDQUFDaVUsaUNBRGIsRUFFSGpVLGVBQWUsQ0FBQ2tVLGlDQUZiLEVBR0hsVSxlQUFlLENBQUNtVSxpQ0FIYixDQTNDSjtBQWdESDlJLFFBQUFBLE1BQU0sRUFBRXJMLGVBQWUsQ0FBQ29VO0FBaERyQixPQUFQO0FBa0RIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSxtQ0FBaUM7QUFDN0IsYUFBTztBQUNIclUsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNxVSw4QkFEckI7QUFFSG5VLFFBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDc1UsNEJBRjFCO0FBR0hsVSxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3VVLCtCQUQxQjtBQUVJaFUsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUN3VTtBQUZoQyxTQURFLENBSEg7QUFTSDlULFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lMLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDeVUsb0NBRDFCO0FBRUlsVSxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQVRKO0FBZUhNLFFBQUFBLEtBQUssRUFBRSxDQUNIYixlQUFlLENBQUMwVSw4QkFEYixFQUVIMVUsZUFBZSxDQUFDMlUsOEJBRmIsRUFHSDNVLGVBQWUsQ0FBQzRVLDhCQUhiLENBZko7QUFvQkg3VCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJVixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzZVLCtCQUQxQjtBQUVJdFUsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUM4VTtBQUZoQyxTQURHLENBcEJKO0FBMEJINVMsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSTdCLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDK1UsbUNBRDFCO0FBRUl4VSxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQTFCSjtBQWdDSDZJLFFBQUFBLEtBQUssRUFBRSxDQUNIcEosZUFBZSxDQUFDZ1YsNkJBRGIsRUFFSGhWLGVBQWUsQ0FBQ2lWLDZCQUZiLEVBR0hqVixlQUFlLENBQUNrViw2QkFIYixFQUlIbFYsZUFBZSxDQUFDbVYsNkJBSmIsQ0FoQ0o7QUFzQ0g5UyxRQUFBQSxPQUFPLEVBQUU7QUFDTHRDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDb1Ysc0NBRG5CO0FBRUw3UyxVQUFBQSxJQUFJLEVBQUV2QyxlQUFlLENBQUNxVjtBQUZqQjtBQXRDTixPQUFQO0FBMkNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSxzQ0FBb0M7QUFDaEMsYUFBTztBQUNIdFYsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNzVixpQ0FEckI7QUFFSHBWLFFBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDdVYsK0JBRjFCO0FBR0huVixRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3dWLGtDQUQxQjtBQUVJalYsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUN5VjtBQUZoQyxTQURFLENBSEg7QUFTSC9VLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lMLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDMFYsdUNBRDFCO0FBRUluVixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQVRKO0FBZUhNLFFBQUFBLEtBQUssRUFBRSxDQUNIYixlQUFlLENBQUMyVixpQ0FEYixFQUVIM1YsZUFBZSxDQUFDNFYsaUNBRmIsRUFHSDVWLGVBQWUsQ0FBQzZWLGlDQUhiLENBZko7QUFvQkg5VSxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJVixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzhWLGtDQUQxQjtBQUVJdlYsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUMrVjtBQUZoQyxTQURHLENBcEJKO0FBMEJIN1QsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSTdCLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDZ1cseUNBRDFCO0FBRUl6VixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQTFCSjtBQWdDSDZJLFFBQUFBLEtBQUssRUFBRSxDQUNIcEosZUFBZSxDQUFDaVcsd0NBRGIsRUFFSGpXLGVBQWUsQ0FBQ2tXLHdDQUZiLEVBR0hsVyxlQUFlLENBQUNtVyx5Q0FIYixDQWhDSjtBQXFDSGpWLFFBQUFBLElBQUksRUFBRWxCLGVBQWUsQ0FBQ29XO0FBckNuQixPQUFQO0FBdUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSxvQ0FBa0M7QUFDOUIsYUFBTztBQUNIclcsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNxVywrQkFEckI7QUFFSG5XLFFBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDc1csNkJBRjFCO0FBR0hsVyxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3VXLG1DQUQxQjtBQUVJaFcsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUN3VztBQUZoQyxTQURFLENBSEg7QUFTSDlWLFFBQUFBLEtBQUssRUFBRSxDQUNIVixlQUFlLENBQUN5VyxvQ0FEYixFQUVIelcsZUFBZSxDQUFDMFcsb0NBRmIsRUFHSDFXLGVBQWUsQ0FBQzJXLGdDQUhiLENBVEo7QUFjSDlWLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lSLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDNFcsbUNBRDFCO0FBRUlyVyxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzZXO0FBRmhDLFNBREcsQ0FkSjtBQW9CSDlWLFFBQUFBLEtBQUssRUFBRSxDQUNIZixlQUFlLENBQUM4VyxvQ0FEYixFQUVIOVcsZUFBZSxDQUFDK1csb0NBRmIsRUFHSC9XLGVBQWUsQ0FBQ2dYLG1DQUhiLENBcEJKO0FBeUJIOVUsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSTdCLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDaVgsd0NBRDFCO0FBRUkxVyxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQXpCSjtBQStCSDZJLFFBQUFBLEtBQUssRUFBRSxDQUNIcEosZUFBZSxDQUFDa1gsa0NBRGIsRUFFSGxYLGVBQWUsQ0FBQ21YLHFDQUZiLEVBR0huWCxlQUFlLENBQUNvWCxtQ0FIYixFQUlIcFgsZUFBZSxDQUFDcVgsb0NBSmIsQ0EvQko7QUFxQ0gvTixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJakosVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNzWCxxQ0FEMUI7QUFFSS9XLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDdVg7QUFGaEMsU0FERyxDQXJDSjtBQTJDSGxWLFFBQUFBLE9BQU8sRUFBRTtBQUNMdEMsVUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUN3WCx1Q0FEbkI7QUFFTGpWLFVBQUFBLElBQUksRUFBRXZDLGVBQWUsQ0FBQ3lYO0FBRmpCLFNBM0NOO0FBK0NIdlcsUUFBQUEsSUFBSSxFQUFFbEIsZUFBZSxDQUFDMFg7QUEvQ25CLE9BQVA7QUFpREg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLHVDQUFxQztBQUNqQyxhQUFPO0FBQ0gzWCxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQzJYLGtDQURyQjtBQUVIelgsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUM0WCxnQ0FGMUI7QUFHSHhYLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDNlgsbUNBRDFCO0FBRUl0WCxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzhYO0FBRmhDLFNBREUsQ0FISDtBQVNIcFgsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUwsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMrWCxrQ0FEMUI7QUFFSXhYLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDZ1k7QUFGaEMsU0FERyxDQVRKO0FBZUhuWCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJUixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2lZLHNDQUQxQjtBQUVJMVgsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FmSjtBQXFCSFEsUUFBQUEsS0FBSyxFQUFFLENBQ0hmLGVBQWUsQ0FBQ2tZLGlDQURiLEVBRUhsWSxlQUFlLENBQUNtWSxpQ0FGYixFQUdIblksZUFBZSxDQUFDb1ksaUNBSGIsRUFJSHBZLGVBQWUsQ0FBQ3FZLGlDQUpiLENBckJKO0FBMkJIblcsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSTdCLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDc1ksb0NBRDFCO0FBRUkvWCxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQTNCSjtBQWlDSDZJLFFBQUFBLEtBQUssRUFBRSxDQUNIcEosZUFBZSxDQUFDdVkscUNBRGIsRUFFSHZZLGVBQWUsQ0FBQ3dZLHFDQUZiLEVBR0h4WSxlQUFlLENBQUN5WSxxQ0FIYixFQUlIelksZUFBZSxDQUFDMFkscUNBSmIsQ0FqQ0o7QUF1Q0hwUCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJakosVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMyWSxvQ0FEMUI7QUFFSXBZLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBdkNKO0FBNkNId0ssUUFBQUEsS0FBSyxFQUFFLENBQ0gvSyxlQUFlLENBQUM0WSxzQ0FEYixFQUVINVksZUFBZSxDQUFDNlksc0NBRmIsRUFHSDdZLGVBQWUsQ0FBQzhZLHNDQUhiLENBN0NKO0FBa0RIelcsUUFBQUEsT0FBTyxFQUFFO0FBQ0x0QyxVQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQytZLDBDQURuQjtBQUVMeFcsVUFBQUEsSUFBSSxFQUFFdkMsZUFBZSxDQUFDZ1o7QUFGakIsU0FsRE47QUFzREg5WCxRQUFBQSxJQUFJLEVBQUVsQixlQUFlLENBQUNpWjtBQXREbkIsT0FBUDtBQXdESDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksb0NBQWtDO0FBQzlCLGFBQU87QUFDSGxaLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDa1osK0JBRHJCO0FBRUhoWixRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQ21aLDZCQUYxQjtBQUdIL1ksUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNvWixnQ0FEMUI7QUFFSTdZLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDcVo7QUFGaEMsU0FERSxDQUhIO0FBU0gzWSxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJTCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3NaLDhCQUQxQjtBQUVJL1ksVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FUSjtBQWVITSxRQUFBQSxLQUFLLEVBQUUsQ0FDSGIsZUFBZSxDQUFDdVosZ0NBRGIsRUFFSHZaLGVBQWUsQ0FBQ3daLGdDQUZiLEVBR0h4WixlQUFlLENBQUN5WixnQ0FIYixFQUlIelosZUFBZSxDQUFDMFosZ0NBSmIsQ0FmSjtBQXFCSDNZLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lWLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDMlosbUNBRDFCO0FBRUlwWixVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzRaO0FBRmhDLFNBREcsQ0FyQko7QUEyQkgxWCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJN0IsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUM2WixtQ0FEMUI7QUFFSXRaLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBM0JKO0FBaUNINkksUUFBQUEsS0FBSyxFQUFFLENBQ0hwSixlQUFlLENBQUM4Wiw4QkFEYixFQUVIOVosZUFBZSxDQUFDK1osOEJBRmIsRUFHSC9aLGVBQWUsQ0FBQ2dhLDhCQUhiLENBakNKO0FBc0NIMVEsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSWpKLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDaWEsK0JBRDFCO0FBRUkxWixVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ2thO0FBRmhDLFNBREcsQ0F0Q0o7QUE0Q0g3WCxRQUFBQSxPQUFPLEVBQUU7QUFDTHRDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDbWEsdUNBRG5CO0FBRUw1WCxVQUFBQSxJQUFJLEVBQUV2QyxlQUFlLENBQUNvYTtBQUZqQixTQTVDTjtBQWdESGxaLFFBQUFBLElBQUksRUFBRWxCLGVBQWUsQ0FBQ3FhO0FBaERuQixPQUFQO0FBa0RIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSx1Q0FBcUM7QUFDakMsYUFBTztBQUNIdGEsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNzYSxrQ0FEckI7QUFFSHBhLFFBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDdWEsZ0NBRjFCO0FBR0huYSxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3dhLG1DQUQxQjtBQUVJamEsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUN5YTtBQUZoQyxTQURFLENBSEg7QUFTSC9aLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lMLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDMGEsc0NBRDFCO0FBRUluYSxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQVRKO0FBZUhNLFFBQUFBLEtBQUssRUFBRSxDQUNIYixlQUFlLENBQUMyYSxzQ0FEYixFQUVIM2EsZUFBZSxDQUFDNGEsdUNBRmIsRUFHSDVhLGVBQWUsQ0FBQzZhLHFDQUhiLEVBSUg3YSxlQUFlLENBQUM4YSxvQ0FKYixDQWZKO0FBcUJIL1osUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVYsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMrYSxrQ0FEMUI7QUFFSXhhLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDZ2I7QUFGaEMsU0FERyxDQXJCSjtBQTJCSDlZLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0k3QixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2liLGtDQUQxQjtBQUVJMWEsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0EzQko7QUFpQ0g2SSxRQUFBQSxLQUFLLEVBQUUsQ0FDSHBKLGVBQWUsQ0FBQ2tiLDhDQURiLEVBRUhsYixlQUFlLENBQUNtYixxQ0FGYixFQUdIbmIsZUFBZSxDQUFDb2IsdUNBSGIsQ0FqQ0o7QUFzQ0g5UixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJakosVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNxYixpQ0FEMUI7QUFFSTlhLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDc2I7QUFGaEMsU0FERyxDQXRDSjtBQTRDSHBhLFFBQUFBLElBQUksRUFBRWxCLGVBQWUsQ0FBQ3ViLGdDQTVDbkI7QUE2Q0hsUSxRQUFBQSxNQUFNLEVBQUVyTCxlQUFlLENBQUN3YjtBQTdDckIsT0FBUDtBQStDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksd0NBQXNDO0FBQ2xDLGFBQU87QUFDSHpiLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDeWIsbUNBRHJCO0FBRUh2YixRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQzBiLGlDQUYxQjtBQUdIdGIsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMyYixvQ0FEMUI7QUFFSXBiLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDNGI7QUFGaEMsU0FERSxDQUhIO0FBU0hsYixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJTCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzZiLG9DQUQxQjtBQUVJdGIsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FUSjtBQWVITSxRQUFBQSxLQUFLLEVBQUUsQ0FDSGIsZUFBZSxDQUFDOGIsc0NBRGIsRUFFSDliLGVBQWUsQ0FBQytiLHNDQUZiLEVBR0gvYixlQUFlLENBQUNnYyxzQ0FIYixDQWZKO0FBb0JIamIsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVYsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNpYyxtQ0FEMUI7QUFFSTFiLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDa2M7QUFGaEMsU0FERyxDQXBCSjtBQTBCSDdaLFFBQUFBLE9BQU8sRUFBRTtBQUNMdEMsVUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNtYywyQ0FEbkI7QUFFTDVaLFVBQUFBLElBQUksRUFBRXZDLGVBQWUsQ0FBQ29jO0FBRmpCLFNBMUJOO0FBOEJIbGEsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSTdCLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDcWMscUNBRDFCO0FBRUk5YixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQTlCSjtBQW9DSDZJLFFBQUFBLEtBQUssRUFBRSxDQUNIcEosZUFBZSxDQUFDc2MsdUNBRGIsRUFFSHRjLGVBQWUsQ0FBQ3VjLHVDQUZiLEVBR0h2YyxlQUFlLENBQUN3Yyx1Q0FIYixFQUlIeGMsZUFBZSxDQUFDeWMsdUNBSmIsQ0FwQ0o7QUEwQ0huVCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJakosVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMwYywwQ0FEMUI7QUFFSW5jLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDMmM7QUFGaEMsU0FERyxDQTFDSjtBQWdESHpiLFFBQUFBLElBQUksRUFBRWxCLGVBQWUsQ0FBQzRjLGlDQWhEbkI7QUFpREh2UixRQUFBQSxNQUFNLEVBQUVyTCxlQUFlLENBQUM2YztBQWpEckIsT0FBUDtBQW1ESDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSw2QkFBMkJDLE1BQTNCLEVBQW1DO0FBQUE7O0FBQy9CLFVBQUksQ0FBQ0EsTUFBTCxFQUFhLE9BQU8sRUFBUDtBQUViLFVBQUlDLElBQUksR0FBRyxFQUFYLENBSCtCLENBSy9COztBQUNBLFVBQUlELE1BQU0sQ0FBQy9jLE1BQVgsRUFBbUI7QUFDZmdkLFFBQUFBLElBQUksNENBQW1DRCxNQUFNLENBQUMvYyxNQUExQyxvQkFBSjtBQUNBZ2QsUUFBQUEsSUFBSSxJQUFJLGdDQUFSO0FBQ0gsT0FUOEIsQ0FXL0I7OztBQUNBLFVBQUlELE1BQU0sQ0FBQzVjLFdBQVgsRUFBd0I7QUFDcEI2YyxRQUFBQSxJQUFJLGlCQUFVRCxNQUFNLENBQUM1YyxXQUFqQixTQUFKO0FBQ0gsT0FkOEIsQ0FnQi9COzs7QUFDQSxVQUFJNGMsTUFBTSxDQUFDMWMsSUFBWCxFQUFpQjtBQUNiLFlBQUk0YyxLQUFLLENBQUNDLE9BQU4sQ0FBY0gsTUFBTSxDQUFDMWMsSUFBckIsS0FBOEIwYyxNQUFNLENBQUMxYyxJQUFQLENBQVk4YyxNQUFaLEdBQXFCLENBQXZELEVBQTBEO0FBQ3RESCxVQUFBQSxJQUFJLElBQUksTUFBUjtBQUNBRCxVQUFBQSxNQUFNLENBQUMxYyxJQUFQLENBQVkrYyxPQUFaLENBQW9CLFVBQUFDLElBQUksRUFBSTtBQUN4QixnQkFBSSxPQUFPQSxJQUFQLEtBQWdCLFFBQXBCLEVBQThCO0FBQzFCTCxjQUFBQSxJQUFJLGtCQUFXSyxJQUFYLFVBQUo7QUFDSCxhQUZELE1BRU8sSUFBSUEsSUFBSSxDQUFDL2MsSUFBTCxJQUFhK2MsSUFBSSxDQUFDN2MsVUFBTCxLQUFvQixJQUFyQyxFQUEyQztBQUM5QztBQUNBd2MsY0FBQUEsSUFBSSw4QkFBdUJLLElBQUksQ0FBQy9jLElBQTVCLHNCQUFKO0FBQ0gsYUFITSxNQUdBLElBQUkrYyxJQUFJLENBQUMvYyxJQUFMLElBQWErYyxJQUFJLENBQUM3YyxVQUF0QixFQUFrQztBQUNyQ3djLGNBQUFBLElBQUksMEJBQW1CSyxJQUFJLENBQUMvYyxJQUF4Qix3QkFBMEMrYyxJQUFJLENBQUM3YyxVQUEvQyxVQUFKO0FBQ0g7QUFDSixXQVREO0FBVUF3YyxVQUFBQSxJQUFJLElBQUksT0FBUjtBQUNILFNBYkQsTUFhTyxJQUFJLFFBQU9ELE1BQU0sQ0FBQzFjLElBQWQsTUFBdUIsUUFBM0IsRUFBcUM7QUFDeEM7QUFDQTJjLFVBQUFBLElBQUksSUFBSSxNQUFSO0FBQ0FNLFVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxDQUFlUixNQUFNLENBQUMxYyxJQUF0QixFQUE0QitjLE9BQTVCLENBQW9DLGdCQUF3QjtBQUFBO0FBQUEsZ0JBQXRCOWMsSUFBc0I7QUFBQSxnQkFBaEJFLFVBQWdCOztBQUN4RHdjLFlBQUFBLElBQUksMEJBQW1CMWMsSUFBbkIsd0JBQXFDRSxVQUFyQyxVQUFKO0FBQ0gsV0FGRDtBQUdBd2MsVUFBQUEsSUFBSSxJQUFJLE9BQVI7QUFDSDtBQUNKLE9BdkM4QixDQXlDL0I7OztBQUNBLFdBQUssSUFBSVEsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsSUFBSSxFQUFyQixFQUF5QkEsQ0FBQyxFQUExQixFQUE4QjtBQUMxQixZQUFNQyxRQUFRLGlCQUFVRCxDQUFWLENBQWQ7O0FBQ0EsWUFBSVQsTUFBTSxDQUFDVSxRQUFELENBQU4sSUFBb0JWLE1BQU0sQ0FBQ1UsUUFBRCxDQUFOLENBQWlCTixNQUFqQixHQUEwQixDQUFsRCxFQUFxRDtBQUNqREgsVUFBQUEsSUFBSSxJQUFJLE1BQVI7QUFDQUQsVUFBQUEsTUFBTSxDQUFDVSxRQUFELENBQU4sQ0FBaUJMLE9BQWpCLENBQXlCLFVBQUFDLElBQUksRUFBSTtBQUM3QixnQkFBSSxPQUFPQSxJQUFQLEtBQWdCLFFBQXBCLEVBQThCO0FBQzFCTCxjQUFBQSxJQUFJLGtCQUFXSyxJQUFYLFVBQUo7QUFDSCxhQUZELE1BRU8sSUFBSUEsSUFBSSxDQUFDL2MsSUFBTCxJQUFhK2MsSUFBSSxDQUFDN2MsVUFBTCxLQUFvQixJQUFyQyxFQUEyQztBQUM5Q3djLGNBQUFBLElBQUksOEJBQXVCSyxJQUFJLENBQUMvYyxJQUE1QixzQkFBSjtBQUNILGFBRk0sTUFFQSxJQUFJK2MsSUFBSSxDQUFDL2MsSUFBTCxJQUFhK2MsSUFBSSxDQUFDN2MsVUFBdEIsRUFBa0M7QUFDckN3YyxjQUFBQSxJQUFJLDBCQUFtQkssSUFBSSxDQUFDL2MsSUFBeEIsd0JBQTBDK2MsSUFBSSxDQUFDN2MsVUFBL0MsVUFBSjtBQUNIO0FBQ0osV0FSRDtBQVNBd2MsVUFBQUEsSUFBSSxJQUFJLE9BQVI7QUFDSDtBQUNKLE9BekQ4QixDQTJEL0I7OztBQUNBLFVBQUlELE1BQU0sQ0FBQ3phLE9BQVgsRUFBb0I7QUFDaEIwYSxRQUFBQSxJQUFJLElBQUksdUNBQVI7O0FBQ0EsWUFBSUQsTUFBTSxDQUFDemEsT0FBUCxDQUFldEMsTUFBbkIsRUFBMkI7QUFDdkJnZCxVQUFBQSxJQUFJLDRCQUFKO0FBQ0FBLFVBQUFBLElBQUksa0RBQUo7QUFDQUEsVUFBQUEsSUFBSSxJQUFJRCxNQUFNLENBQUN6YSxPQUFQLENBQWV0QyxNQUF2QjtBQUNBZ2QsVUFBQUEsSUFBSSxZQUFKO0FBQ0g7O0FBQ0RBLFFBQUFBLElBQUksSUFBSUQsTUFBTSxDQUFDemEsT0FBUCxDQUFlRSxJQUF2QjtBQUNBd2EsUUFBQUEsSUFBSSxJQUFJLFFBQVI7QUFDSCxPQXRFOEIsQ0F3RS9COzs7QUFDQSxVQUFJRCxNQUFNLENBQUNXLFFBQVAsSUFBbUJYLE1BQU0sQ0FBQ1csUUFBUCxDQUFnQlAsTUFBaEIsR0FBeUIsQ0FBaEQsRUFBbUQ7QUFDL0MsWUFBSUosTUFBTSxDQUFDWSxjQUFYLEVBQTJCO0FBQ3ZCWCxVQUFBQSxJQUFJLHlCQUFrQkQsTUFBTSxDQUFDWSxjQUF6QixtQkFBSjtBQUNIOztBQUNEWCxRQUFBQSxJQUFJLElBQUksd0ZBQVI7QUFDQUEsUUFBQUEsSUFBSSxJQUFJLGdFQUFSLENBTCtDLENBTy9DOztBQUNBRCxRQUFBQSxNQUFNLENBQUNXLFFBQVAsQ0FBZ0JOLE9BQWhCLENBQXdCLFVBQUNRLE9BQUQsRUFBVUMsS0FBVixFQUFvQjtBQUN4QyxjQUFNQyxjQUFjLEdBQUcsS0FBSSxDQUFDQyxVQUFMLENBQWdCSCxPQUFoQixDQUF2Qjs7QUFDQSxjQUFJQSxPQUFPLENBQUNJLFVBQVIsQ0FBbUIsR0FBbkIsS0FBMkJKLE9BQU8sQ0FBQ0ssUUFBUixDQUFpQixHQUFqQixDQUEvQixFQUFzRDtBQUNsRDtBQUNBakIsWUFBQUEsSUFBSSxpRUFBd0RjLGNBQXhELFlBQUo7QUFDSCxXQUhELE1BR08sSUFBSUYsT0FBTyxDQUFDTSxRQUFSLENBQWlCLEdBQWpCLENBQUosRUFBMkI7QUFDOUI7QUFDQSxxQ0FBcUJOLE9BQU8sQ0FBQ08sS0FBUixDQUFjLEdBQWQsRUFBbUJDLEdBQW5CLENBQXVCLFVBQUFDLENBQUM7QUFBQSxxQkFBSUEsQ0FBQyxDQUFDQyxJQUFGLEVBQUo7QUFBQSxhQUF4QixDQUFyQjtBQUFBO0FBQUEsZ0JBQU9DLEdBQVA7QUFBQSxnQkFBWUMsS0FBWjs7QUFDQXhCLFlBQUFBLElBQUksOENBQXFDLEtBQUksQ0FBQ2UsVUFBTCxDQUFnQlEsR0FBaEIsQ0FBckMsWUFBSjtBQUNBdkIsWUFBQUEsSUFBSSxJQUFJLEtBQVI7QUFDQUEsWUFBQUEsSUFBSSw4Q0FBcUMsS0FBSSxDQUFDZSxVQUFMLENBQWdCUyxLQUFLLElBQUksRUFBekIsQ0FBckMsWUFBSjtBQUNILFdBTk0sTUFNQTtBQUNIO0FBQ0F4QixZQUFBQSxJQUFJLElBQUljLGNBQVI7QUFDSDs7QUFFRCxjQUFJRCxLQUFLLEdBQUdkLE1BQU0sQ0FBQ1csUUFBUCxDQUFnQlAsTUFBaEIsR0FBeUIsQ0FBckMsRUFBd0M7QUFDcENILFlBQUFBLElBQUksSUFBSSxJQUFSO0FBQ0g7QUFDSixTQW5CRDtBQXFCQUEsUUFBQUEsSUFBSSxJQUFJLFFBQVI7QUFDQUEsUUFBQUEsSUFBSSxJQUFJLFFBQVI7QUFDSCxPQXhHOEIsQ0EwRy9COzs7QUFDQSxVQUFJRCxNQUFNLENBQUM1YixJQUFYLEVBQWlCO0FBQ2I2YixRQUFBQSxJQUFJLG9FQUF5REQsTUFBTSxDQUFDNWIsSUFBaEUsY0FBSjtBQUNIOztBQUVELGFBQU82YixJQUFQO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksb0JBQWtCeGEsSUFBbEIsRUFBd0I7QUFDcEIsVUFBTTRiLEdBQUcsR0FBRztBQUNSLGFBQUssT0FERztBQUVSLGFBQUssTUFGRztBQUdSLGFBQUssTUFIRztBQUlSLGFBQUssUUFKRztBQUtSLGFBQUs7QUFMRyxPQUFaO0FBT0EsYUFBT0ssTUFBTSxDQUFDamMsSUFBRCxDQUFOLENBQWFrYyxPQUFiLENBQXFCLFVBQXJCLEVBQWlDLFVBQUFDLENBQUM7QUFBQSxlQUFJUCxHQUFHLENBQUNPLENBQUQsQ0FBUDtBQUFBLE9BQWxDLENBQVA7QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSxzQkFBb0I7QUFBQTs7QUFDaEIsVUFBSTtBQUNBO0FBQ0EsWUFBSSxPQUFPQyxjQUFQLEtBQTBCLFdBQTlCLEVBQTJDO0FBQ3ZDQyxVQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyw4RUFBZDtBQUVBLGNBQU1DLGNBQWMsR0FBRyxLQUFLQyx3QkFBTCxFQUF2QixDQUh1QyxDQUt2Qzs7QUFDQSxjQUFNQyxXQUFXLEdBQUcsRUFBcEI7QUFDQTNCLFVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxDQUFld0IsY0FBZixFQUErQjNCLE9BQS9CLENBQXVDLGlCQUF5QjtBQUFBO0FBQUEsZ0JBQXZCOEIsU0FBdUI7QUFBQSxnQkFBWm5DLE1BQVk7O0FBQzVEa0MsWUFBQUEsV0FBVyxDQUFDQyxTQUFELENBQVgsR0FBeUIsTUFBSSxDQUFDQyxtQkFBTCxDQUF5QnBDLE1BQXpCLENBQXpCO0FBQ0gsV0FGRCxFQVB1QyxDQVd2Qzs7QUFDQXFDLFVBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCQyxJQUF0QixDQUEyQixVQUFDeEIsS0FBRCxFQUFReUIsT0FBUixFQUFvQjtBQUMzQyxnQkFBTUMsS0FBSyxHQUFHSCxDQUFDLENBQUNFLE9BQUQsQ0FBZjtBQUNBLGdCQUFNSixTQUFTLEdBQUdLLEtBQUssQ0FBQ0MsSUFBTixDQUFXLE9BQVgsQ0FBbEI7QUFDQSxnQkFBTUMsT0FBTyxHQUFHUixXQUFXLENBQUNDLFNBQUQsQ0FBM0I7O0FBRUEsZ0JBQUlPLE9BQUosRUFBYTtBQUNURixjQUFBQSxLQUFLLENBQUNHLEtBQU4sQ0FBWTtBQUNSMUMsZ0JBQUFBLElBQUksRUFBRXlDLE9BREU7QUFFUkUsZ0JBQUFBLFFBQVEsRUFBRSxXQUZGO0FBR1JDLGdCQUFBQSxTQUFTLEVBQUUsSUFISDtBQUlSQyxnQkFBQUEsS0FBSyxFQUFFO0FBQ0hDLGtCQUFBQSxJQUFJLEVBQUUsR0FESDtBQUVIQyxrQkFBQUEsSUFBSSxFQUFFO0FBRkgsaUJBSkM7QUFRUkMsZ0JBQUFBLFNBQVMsRUFBRSxTQVJIO0FBU1JDLGdCQUFBQSxFQUFFLEVBQUUsT0FUSSxDQVNLOztBQVRMLGVBQVo7QUFXSDtBQUNKLFdBbEJEO0FBbUJILFNBL0JELE1BK0JPO0FBQ0g7QUFDQSxjQUFNbEIsZUFBYyxHQUFHLEtBQUtDLHdCQUFMLEVBQXZCLENBRkcsQ0FJSDs7O0FBQ0EsY0FBTUMsWUFBVyxHQUFHLEVBQXBCO0FBQ0EzQixVQUFBQSxNQUFNLENBQUNDLE9BQVAsQ0FBZXdCLGVBQWYsRUFBK0IzQixPQUEvQixDQUF1QyxpQkFBeUI7QUFBQTtBQUFBLGdCQUF2QjhCLFNBQXVCO0FBQUEsZ0JBQVpuQyxNQUFZOztBQUM1RGtDLFlBQUFBLFlBQVcsQ0FBQ0MsU0FBRCxDQUFYLEdBQXlCLE1BQUksQ0FBQ0MsbUJBQUwsQ0FBeUJwQyxNQUF6QixDQUF6QjtBQUNILFdBRkQsRUFORyxDQVVIOztBQUNBNkIsVUFBQUEsY0FBYyxDQUFDc0IsVUFBZixDQUEwQmpCLFlBQTFCLEVBQXVDO0FBQ25Da0IsWUFBQUEsUUFBUSxFQUFFLGtCQUR5QjtBQUVuQ1IsWUFBQUEsUUFBUSxFQUFFLFdBRnlCO0FBR25DQyxZQUFBQSxTQUFTLEVBQUUsSUFId0I7QUFJbkNRLFlBQUFBLFNBQVMsRUFBRSxHQUp3QjtBQUtuQ0MsWUFBQUEsU0FBUyxFQUFFLEdBTHdCO0FBTW5DTCxZQUFBQSxTQUFTLEVBQUU7QUFOd0IsV0FBdkM7QUFRSDtBQUNKLE9BckRELENBcURFLE9BQU9sQixLQUFQLEVBQWM7QUFDWkQsUUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsaURBQWQsRUFBaUVBLEtBQWpFO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksdUJBQXFCSSxTQUFyQixFQUFnQ29CLFdBQWhDLEVBQTZDO0FBQ3pDLFVBQUk7QUFDQSxZQUFJLE9BQU8xQixjQUFQLEtBQTBCLFdBQTlCLEVBQTJDO0FBQ3ZDQyxVQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyxpQ0FBZDtBQUNBO0FBQ0g7O0FBRURGLFFBQUFBLGNBQWMsQ0FBQzJCLE1BQWYsQ0FBc0JyQixTQUF0QixFQUFpQ29CLFdBQWpDO0FBQ0gsT0FQRCxDQU9FLE9BQU94QixLQUFQLEVBQWM7QUFDWkQsUUFBQUEsT0FBTyxDQUFDQyxLQUFSLCtDQUFxREksU0FBckQsU0FBb0VKLEtBQXBFO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLG1CQUE4QztBQUFBLFVBQS9CcUIsUUFBK0IsdUVBQXBCLGtCQUFvQjs7QUFDMUMsVUFBSTtBQUNBLFlBQUksT0FBT3ZCLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDdkNDLFVBQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLGlDQUFkO0FBQ0E7QUFDSDs7QUFFREYsUUFBQUEsY0FBYyxDQUFDNEIsT0FBZixDQUF1QkwsUUFBdkI7QUFDSCxPQVBELENBT0UsT0FBT3JCLEtBQVAsRUFBYztBQUNaRCxRQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyw4Q0FBZCxFQUE4REEsS0FBOUQ7QUFDSDtBQUNKOzs7O0tBR0w7OztBQUNBLElBQUksT0FBTzJCLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjNpQiw2QkFBakI7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgLSBNYW5hZ2VzIHRvb2x0aXBzIGZvciBHZW5lcmFsIFNldHRpbmdzIGZvcm1cbiAqIFxuICogVGhpcyBjbGFzcyBwcm92aWRlcyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBnZW5lcmFsIHNldHRpbmdzIGZpZWxkcyxcbiAqIGhlbHBpbmcgdXNlcnMgdW5kZXJzdGFuZCB0aGUgcHVycG9zZSBhbmQgaW1wbGljYXRpb25zIG9mIGVhY2ggc2V0dGluZy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIHN5c3RlbSBzZXR0aW5nc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIFRvb2x0aXBCdWlsZGVyXG4gKiAtIENvbnNpc3RlbnQgc3RydWN0dXJlIGZvbGxvd2luZyB0aGUgZXN0YWJsaXNoZWQgcGF0dGVyblxuICogXG4gKiBAY2xhc3MgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXJcbiAqL1xuY2xhc3MgR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIge1xuICAgIC8qKlxuICAgICAqIFByaXZhdGUgY29uc3RydWN0b3IgdG8gcHJldmVudCBpbnN0YW50aWF0aW9uXG4gICAgICogVGhpcyBjbGFzcyB1c2VzIHN0YXRpYyBtZXRob2RzIGZvciB1dGlsaXR5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZ2VuZXJhbCBzZXR0aW5nc1xuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBnZW5lcmFsIHNldHRpbmdzIGZpZWxkc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAnUmVzdGFydEV2ZXJ5TmlnaHQnOiB0aGlzLmdldFJlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1NlbmRNZXRyaWNzJzogdGhpcy5nZXRTZW5kTWV0cmljc1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhBbGxvd0d1ZXN0Q2FsbHMnOiB0aGlzLmdldEFsbG93R3Vlc3RDYWxsc1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhMYW5ndWFnZSc6IHRoaXMuZ2V0UEJYTGFuZ3VhZ2VUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGgnOiB0aGlzLmdldFBCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWE1hbnVhbFRpbWVTZXR0aW5ncyc6IHRoaXMuZ2V0TWFudWFsVGltZVNldHRpbmdzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWFNwbGl0QXVkaW9UaHJlYWQnOiB0aGlzLmdldFNwbGl0QXVkaW9UaHJlYWRUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYUmVjb3JkQ2FsbHMnOiB0aGlzLmdldFJlY29yZENhbGxzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWFJlY29yZENhbGxzSW5uZXInOiB0aGlzLmdldFJlY29yZENhbGxzSW5uZXJUb29sdGlwKCksXG4gICAgICAgICAgICAnVXNlV2ViUlRDJzogdGhpcy5nZXRVc2VXZWJSVENUb29sdGlwKCksXG4gICAgICAgICAgICAnUmVkaXJlY3RUb0h0dHBzJzogdGhpcy5nZXRSZWRpcmVjdFRvSHR0cHNUb29sdGlwKCksXG4gICAgICAgICAgICAnU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zJzogdGhpcy5nZXRTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwKCksXG4gICAgICAgICAgICAnQUpBTUVuYWJsZWQnOiB0aGlzLmdldEFKQU1FbmFibGVkVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ0FNSUVuYWJsZWQnOiB0aGlzLmdldEFNSUVuYWJsZWRUb29sdGlwKCksXG4gICAgICAgICAgICAnQVJJRW5hYmxlZCc6IHRoaXMuZ2V0QVJJRW5hYmxlZFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdBUklBbGxvd2VkT3JpZ2lucyc6IHRoaXMuZ2V0QVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYQ2FsbFBhcmtpbmdFeHQnOiB0aGlzLmdldFBCWENhbGxQYXJraW5nRXh0VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyJzogdGhpcy5nZXRQQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhGZWF0dXJlQmxpbmRUcmFuc2Zlcic6IHRoaXMuZ2V0UEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYRmVhdHVyZVBpY2t1cEV4dGVuJzogdGhpcy5nZXRQQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwKCksXG4gICAgICAgICAgICAnUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dCc6IHRoaXMuZ2V0UEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhGZWF0dXJlRGlnaXRUaW1lb3V0JzogdGhpcy5nZXRQQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1JUUFBvcnRSYW5nZSc6IHRoaXMuZ2V0UlRQUG9ydFJhbmdlVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1JUUFN0dW5TZXJ2ZXInOiB0aGlzLmdldFJUUFN0dW5TZXJ2ZXJUb29sdGlwKCksXG4gICAgICAgICAgICAnU0lQQXV0aFByZWZpeCc6IHRoaXMuZ2V0U0lQQXV0aFByZWZpeFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdTSVBEZWZhdWx0RXhwaXJ5JzogdGhpcy5nZXRTSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1NJUEV4cGlyeVJhbmdlJzogdGhpcy5nZXRTSVBFeHBpcnlSYW5nZVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdTU0hBdXRob3JpemVkS2V5cyc6IHRoaXMuZ2V0U1NIQXV0aG9yaXplZEtleXNUb29sdGlwKCksXG4gICAgICAgICAgICAnU1NIX0lEX1JTQV9QVUInOiB0aGlzLmdldFNTSF9JRF9SU0FfUFVCVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1dFQkhUVFBTUHVibGljS2V5JzogdGhpcy5nZXRXRUJIVFRQU1B1YmxpY0tleVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdXRUJIVFRQU1ByaXZhdGVLZXknOiB0aGlzLmdldFdFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXAoKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBSZXN0YXJ0RXZlcnlOaWdodCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFJlc3RhcnRFdmVyeU5pZ2h0IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFJlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF93aGVuLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX3doZW5fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9iZW5lZml0X21lbW9yeSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2JlbmVmaXRfc3RhYmlsaXR5XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfZHJhd2JhY2tzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kcmF3YmFja19jYWxscyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2RyYXdiYWNrX3JlZ2lzdHJhdGlvblxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfcmVjb21tZW5kYXRpb25cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU2VuZE1ldHJpY3MgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTZW5kTWV0cmljcyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTZW5kTWV0cmljc1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfcHVycG9zZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF93aGF0X2NvbGxlY3RlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX2Vycm9ycyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2NvbGxlY3RlZF9jcmFzaGVzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX3BlcmZvcm1hbmNlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX3ZlcnNpb24sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9jb2xsZWN0ZWRfZW52aXJvbm1lbnRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9iZW5lZml0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfYmVuZWZpdF9xdWlja19maXhlcyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRfc3RhYmlsaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfYmVuZWZpdF9zdXBwb3J0XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfcHJpdmFjeSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9wcml2YWN5X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGljb246ICdpbmZvIGNpcmNsZScsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWEFsbG93R3Vlc3RDYWxscyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWEFsbG93R3Vlc3RDYWxscyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBbGxvd0d1ZXN0Q2FsbHNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF93aGVuX2VuYWJsZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2VuYWJsZV9hbm9ueW1vdXMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX2ludGVyY29tLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2VuYWJsZV9kb29ycGhvbmUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX3B1YmxpY1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF90ZWNobmljYWwsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF90ZWNobmljYWxfZW5kcG9pbnQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfdGVjaG5pY2FsX2NvbnRleHQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfdGVjaG5pY2FsX21vZHVsZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9zZWN1cml0eSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfc2VjdXJpdHlfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9yZWNvbW1lbmRhdGlvblxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhMYW5ndWFnZSB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWExhbmd1YWdlIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFBCWExhbmd1YWdlVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzX3ZvaWNlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfYWZmZWN0c19wcm9tcHRzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfYWZmZWN0c19pdnIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzX3ZvaWNlbWFpbFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX3Jlc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfcmVzdGFydF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFBCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9hZmZlY3RzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9hZmZlY3RzX25ldyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2FmZmVjdHNfdmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2FmZmVjdHNfc2VhcmNoXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfZXhhbXBsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVfMyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVfNCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVfNVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYTWFudWFsVGltZVNldHRpbmdzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYTWFudWFsVGltZVNldHRpbmdzIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldE1hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfYXV0byxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfYXV0b19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX21hbnVhbCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfbWFudWFsX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhTcGxpdEF1ZGlvVGhyZWFkIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYU3BsaXRBdWRpb1RocmVhZCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9tb25vLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfbW9ub19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9zdGVyZW8sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9zdGVyZW9fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2JlbmVmaXRfYW5hbHlzaXMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2JlbmVmaXRfcXVhbGl0eSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfYmVuZWZpdF9wcm9jZXNzaW5nXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYUmVjb3JkQ2FsbHMgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhSZWNvcmRDYWxscyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRSZWNvcmRDYWxsc1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc1Rvb2x0aXBfc3RvcmFnZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzVG9vbHRpcF9zdG9yYWdlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzVG9vbHRpcF9sZWdhbCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzVG9vbHRpcF9sZWdhbF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYUmVjb3JkQ2FsbHNJbm5lciB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWFJlY29yZENhbGxzSW5uZXIgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UmVjb3JkQ2FsbHNJbm5lclRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfdXNhZ2VfdHJhaW5pbmcsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlX3F1YWxpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlX3NlY3VyaXR5XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgVXNlV2ViUlRDIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgVXNlV2ViUlRDIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFVzZVdlYlJUQ1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19Vc2VXZWJSVENUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfVXNlV2ViUlRDVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfVXNlV2ViUlRDVG9vbHRpcF9iZW5lZml0X2Jyb3dzZXIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdF9ub19zb2Z0d2FyZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfVXNlV2ViUlRDVG9vbHRpcF9iZW5lZml0X2VuY3J5cHRpb25cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfcmVxdWlyZW1lbnRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfVXNlV2ViUlRDVG9vbHRpcF9yZXF1aXJlbWVudHNfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUmVkaXJlY3RUb0h0dHBzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUmVkaXJlY3RUb0h0dHBzIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFJlZGlyZWN0VG9IdHRwc1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX3NlY3VyaXR5X2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfY2VydGlmaWNhdGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX2NlcnRpZmljYXRlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0U1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfYmVuZWZpdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9iZW5lZml0X3NlY3VyaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2JlbmVmaXRfYnJ1dGVmb3JjZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9iZW5lZml0X2NvbXBsaWFuY2VcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgQUpBTUVuYWJsZWQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBBSkFNRW5hYmxlZCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBSkFNRW5hYmxlZFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfd2hhdF9pcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3VzYWdlX3dlYmFwcHMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZV9wYW5lbHMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZV93aWRnZXRzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2VfbW9uaXRvcmluZ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3Byb3RvY29scyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9wcm90b2NvbHNfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF93aGVuX2Rpc2FibGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IEFNSUVuYWJsZWQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBBTUlFbmFibGVkIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldEFNSUVuYWJsZWRUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX3doYXRfaXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9tb25pdG9yaW5nLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9pbnRlZ3JhdGlvbixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfY29udHJvbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfZXZlbnRzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9jb21tYW5kc1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9jcm0sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfd2FsbGJvYXJkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9leGFtcGxlX2N0aSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9yZXBvcnRpbmdcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF93aGVuX2Rpc2FibGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDg6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9kaXNhYmxlXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2Zvb3RlclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBBUklFbmFibGVkIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgQVJJRW5hYmxlZCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBUklFbmFibGVkVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF93aGF0X2lzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfdXNhZ2Vfd2VicnRjLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF91c2FnZV9pdnIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX2NvbmZlcmVuY2UsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX3JlY29yZGluZyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfdXNhZ2VfY3VzdG9tXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9leGFtcGxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9leGFtcGxlX3dlYnBob25lLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9leGFtcGxlX2JvdCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9xdWV1ZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9hbmFseXRpY3NcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF93aGVuX2VuYWJsZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0ODogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9lbmFibGVfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZW5hYmxlXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX2VuYWJsZV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZm9vdGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZm9vdGVyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IEFSSUFsbG93ZWRPcmlnaW5zIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgQVJJQWxsb3dlZE9yaWdpbnMgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0QVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3doYXRfaXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9leGFtcGxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZXhhbXBsZV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZXhhbXBsZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZXhhbXBsZV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3NlY3VyaXR5XzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9zZWN1cml0eV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfc2VjdXJpdHlfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZGVmYXVsdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9mb290ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYQ2FsbFBhcmtpbmdFeHQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhDYWxsUGFya2luZ0V4dCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQQlhDYWxsUGFya2luZ0V4dFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaG93LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ob3dfZGlhbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hvd19hbm5vdW5jZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hvd19yZXRyaWV2ZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9zbG90c19yYW5nZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzX2NhcGFjaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfc2xvdHNfYXV0b21hdGljXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfZXhhbXBsZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9leGFtcGxlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXIgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvdyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X3ByZXNzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X2RpYWwsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ob3dfdGFsayxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvd19jb21wbGV0ZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2JlbmVmaXRzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWEZlYXR1cmVCbGluZFRyYW5zZmVyIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXIgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hvdyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaG93X3ByZXNzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaG93X2RpYWwsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9ob3dfaGFuZ3VwXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhGZWF0dXJlUGlja3VwRXh0ZW4gdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhGZWF0dXJlUGlja3VwRXh0ZW4gZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdHlwZV9nZW5lcmFsLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2dlbmVyYWxfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2RpcmVjdGVkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2RpcmVjdGVkX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF91c2FnZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpbyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfZGVmYXVsdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfcmVjb21tZW5kYXRpb25zLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY19zdGFuZGFyZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfcmVjX3F1aWNrLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9yZWNfZXh0ZW5kZWRcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYRmVhdHVyZURpZ2l0VGltZW91dCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWEZlYXR1cmVEaWdpdFRpbWVvdXQgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF91c2FnZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX3doZW5fdG9fY2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfY2hhbmdlX2luY3JlYXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfY2hhbmdlX2luY3JlYXNlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9kZWNyZWFzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9kZWNyZWFzZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2Zvb3RlclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBSVFBQb3J0UmFuZ2UgdG9vbHRpcCBjb25maWd1cmF0aW9uIChmb3IgUlRQUG9ydEZyb20gYW5kIFJUUFBvcnRUbylcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFJUUCBwb3J0IHJhbmdlIGZpZWxkc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRSVFBQb3J0UmFuZ2VUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9wdXJwb3NlX21lZGlhLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2VfYmlkaXJlY3Rpb25hbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9wdXJwb3NlX3VuaXF1ZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NhbGN1bGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jYWxjdWxhdGlvbl9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF93aGVuX3RvX2NoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX2luY3JlYXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfaW5jcmVhc2VfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfY3VzdG9tLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfY3VzdG9tX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX25hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX25hdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZm9vdGVyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFJUUFN0dW5TZXJ2ZXIgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBSVFBTdHVuU2VydmVyIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFJUUFN0dW5TZXJ2ZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3B1cnBvc2VfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3B1cnBvc2VfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfcHVycG9zZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9wdXJwb3NlXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2hvd19pdF93b3JrcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF93aGVuX3RvX3VzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF91c2VfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfdXNlXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3VzZV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0ODogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2V4YW1wbGVfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZXhhbXBsZV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZm9vdGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZm9vdGVyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUEF1dGhQcmVmaXggdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTSVBBdXRoUHJlZml4IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFNJUEF1dGhQcmVmaXhUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF9ob3dfaXRfd29ya3MsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfd29ya18xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF93b3JrXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dvcmtfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3doZW5fdG9fdXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF91c2VfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfdXNlXzMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV80XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUERlZmF1bHRFeHBpcnkgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTSVBEZWZhdWx0RXhwaXJ5IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFNJUERlZmF1bHRFeHBpcnlUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9ob3dfaXRfd29ya3MsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfd29ya18xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF93b3JrXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3dvcmtfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3doZW5fdG9fY2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9tb2JpbGUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9zdGFibGUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9iYXR0ZXJ5XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU0lQRXhwaXJ5UmFuZ2UgdG9vbHRpcCBjb25maWd1cmF0aW9uIChjb21iaW5lZCBNaW4gYW5kIE1heClcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFNJUEV4cGlyeVJhbmdlIGZpZWxkc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTSVBFeHBpcnlSYW5nZVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX3Byb3RlY3QsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5fZGVmYXVsdCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9uYXRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21heF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfdGltZW91dCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21heF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWF4X3JlZHVjZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY29tbWVuZGF0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX2xvY2FsLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX2ludGVybmV0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX21vYmlsZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY19kZWZhdWx0XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfaG93X2l0X3dvcmtzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNTSEF1dGhvcml6ZWRLZXlzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU1NIQXV0aG9yaXplZEtleXMgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0U1NIQXV0aG9yaXplZEtleXNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3doYXRfaXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9ob3dfdG9fYWRkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2FkZF8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYWRkXzMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfNFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9zZWN1cml0eSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0ODogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfc2VjdXJpdHlfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3NlY3VyaXR5XzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9zZWN1cml0eV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU1NIX0lEX1JTQV9QVUIgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTU0hfSURfUlNBX1BVQiBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTU0hfSURfUlNBX1BVQlRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfd2hhdF9pcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2FnZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2VfMyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9nZW5lcmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2dlbmVyYXRpb25fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9ob3dfdG9fdXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2VfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNlXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgV0VCSFRUUFNQdWJsaWNLZXkgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBXRUJIVFRQU1B1YmxpY0tleSBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRXRUJIVFRQU1B1YmxpY0tleVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfd2hhdF9pcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfd2hlcmVfdXNlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9uZ2lueCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3VzZWRfd2VicnRjLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9hamFtLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9hcGlcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfb2J0YWluLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fbGV0c2VuY3J5cHQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fY2EsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fc2VsZlxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2NoYWluLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2NoYWluX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9ub3RlLFxuICAgICAgICAgICAgZm9vdGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2Zvb3RlclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBXRUJIVFRQU1ByaXZhdGVLZXkgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBXRUJIVFRQU1ByaXZhdGVLZXkgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0V0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93aGF0X2lzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9wdXJwb3NlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfcHVycG9zZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3B1cnBvc2VfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2Zvcm1hdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9zZWN1cml0eV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5XzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHlfMyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9zZWN1cml0eV80XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2NvbXBhdGliaWxpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2NvbXBhdGliaWxpdHlfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9ub3RlLFxuICAgICAgICAgICAgZm9vdGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9mb290ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWFkZXIgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3QgaXRlbXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0KSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjb25maWcubGlzdCkgJiYgY29uZmlnLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzx1bD4nO1xuICAgICAgICAgICAgICAgIGNvbmZpZy5saXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhlYWRlciBpdGVtIHdpdGhvdXQgZGVmaW5pdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWw+YDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZy5saXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIC8vIE9sZCBmb3JtYXQgLSBvYmplY3Qgd2l0aCBrZXktdmFsdWUgcGFpcnNcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhjb25maWcubGlzdCkuZm9yRWFjaCgoW3Rlcm0sIGRlZmluaXRpb25dKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7dGVybX06PC9zdHJvbmc+ICR7ZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBsaXN0cyAobGlzdDIsIGxpc3QzLCBldGMuKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0TmFtZSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3ROYW1lXSAmJiBjb25maWdbbGlzdE5hbWVdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBjb25maWdbbGlzdE5hbWVdLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB3YXJuaW5nIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPmA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gY29uZmlnLndhcm5pbmcuaGVhZGVyO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGNvbmZpZy53YXJuaW5nLnRleHQ7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29kZSBleGFtcGxlcyBpZiBleGlzdFxuICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke2NvbmZpZy5leGFtcGxlc0hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODsgYm9yZGVyOiAxcHggc29saWQgI2UwZTBlMDtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTsgbGluZS1oZWlnaHQ6IDEuNGVtO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByb2Nlc3MgZXhhbXBsZXMgd2l0aCBzeW50YXggaGlnaGxpZ2h0aW5nIGZvciBzZWN0aW9uc1xuICAgICAgICAgICAgY29uZmlnLmV4YW1wbGVzLmZvckVhY2goKGV4YW1wbGUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXNjYXBlZEV4YW1wbGUgPSB0aGlzLmVzY2FwZUh0bWwoZXhhbXBsZSk7XG4gICAgICAgICAgICAgICAgaWYgKGV4YW1wbGUuc3RhcnRzV2l0aCgnWycpICYmIGV4YW1wbGUuZW5kc1dpdGgoJ10nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8c3BhbiBzdHlsZT1cImNvbG9yOiAjMjE4NWQwOyBmb250LXdlaWdodDogYm9sZDtcIj4ke2VzY2FwZWRFeGFtcGxlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXhhbXBsZS5pbmNsdWRlcygnPScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEtleS12YWx1ZSBwYWlyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IFtrZXksIHZhbHVlXSA9IGV4YW1wbGUuc3BsaXQoJz0nKS5tYXAocyA9PiBzLnRyaW0oKSk7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICNlOTFlNjM7XCI+JHt0aGlzLmVzY2FwZUh0bWwoa2V5KX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnID0gJztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzIxYmE0NTtcIj4ke3RoaXMuZXNjYXBlSHRtbCh2YWx1ZSB8fCAnJyl9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVndWxhciB0ZXh0IG9yIGVtcHR5IGxpbmVcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBlc2NhcGVkRXhhbXBsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgY29uZmlnLmV4YW1wbGVzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnXFxuJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub3RlIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwIGNsYXNzPVwidWkgc21hbGxcIiBzdHlsZT1cIm1hcmdpbi10b3A6IDEwcHg7XCI+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgc3RhdGljIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBtYXAgPSB7XG4gICAgICAgICAgICAnJic6ICcmYW1wOycsXG4gICAgICAgICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICAgICAgICc+JzogJyZndDsnLFxuICAgICAgICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICAgICAgICBcIidcIjogJyYjMDM5OydcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIFN0cmluZyh0ZXh0KS5yZXBsYWNlKC9bJjw+XCInXS9nLCBtID0+IG1hcFttXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgZ2VuZXJhbCBzZXR0aW5ncyB0b29sdGlwc1xuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgYnVpbGRzIHRoZSBjb21wbGV0ZSB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGFuZCBhdHRhY2hlc1xuICAgICAqIHRoZW0gdG8gdGhlIGNvcnJlc3BvbmRpbmcgZmllbGQgaWNvbnMgdXNpbmcgVG9vbHRpcEJ1aWxkZXIgZm9yIHByb3BlciBldmVudCBoYW5kbGluZy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIFRvb2x0aXBCdWlsZGVyIGlzIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlLCBmYWxsaW5nIGJhY2sgdG8gZGlyZWN0IHBvcHVwIGluaXRpYWxpemF0aW9uJyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHRoaXMuZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIGVhY2ggdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgaHRtbENvbmZpZ3MgPSB7fTtcbiAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyh0b29sdGlwQ29uZmlncykuZm9yRWFjaCgoW2ZpZWxkTmFtZSwgY29uZmlnXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBodG1sQ29uZmlnc1tmaWVsZE5hbWVdID0gdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZyk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXAgZm9yIGVhY2ggZmllbGQgaW5mbyBpY29uIChmYWxsYmFjaylcbiAgICAgICAgICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gaHRtbENvbmZpZ3NbZmllbGROYW1lXTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb246ICdjbGljaycgIC8vIFNob3cgb24gY2xpY2sgZm9yIGJldHRlciBjb250cm9sXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgZm9yIHByb3BlciBldmVudCBoYW5kbGluZ1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5nZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKTtcblxuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgZWFjaCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBodG1sQ29uZmlncyA9IHt9O1xuICAgICAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKHRvb2x0aXBDb25maWdzKS5mb3JFYWNoKChbZmllbGROYW1lLCBjb25maWddKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWxDb25maWdzW2ZpZWxkTmFtZV0gPSB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQoY29uZmlnKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdXNpbmcgVG9vbHRpcEJ1aWxkZXIgd2hpY2ggaW5jbHVkZXMgY2xpY2sgcHJldmVudGlvblxuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUoaHRtbENvbmZpZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dEZWxheTogMzAwLFxuICAgICAgICAgICAgICAgICAgICBoaWRlRGVsYXk6IDEwMCxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIGdlbmVyYWwgc2V0dGluZ3MgdG9vbHRpcHM6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHNwZWNpZmljIHRvb2x0aXAgY29udGVudFxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSB0byB1cGRhdGVcbiAgICAgKiBAcGFyYW0ge09iamVjdHxzdHJpbmd9IHRvb2x0aXBEYXRhIC0gTmV3IHRvb2x0aXAgZGF0YSBvciBIVE1MIGNvbnRlbnRcbiAgICAgKi9cbiAgICBzdGF0aWMgdXBkYXRlVG9vbHRpcChmaWVsZE5hbWUsIHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Rvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLnVwZGF0ZShmaWVsZE5hbWUsIHRvb2x0aXBEYXRhKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgdG9vbHRpcCBmb3IgZmllbGQgJyR7ZmllbGROYW1lfSc6YCwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBhbGwgZ2VuZXJhbCBzZXR0aW5ncyB0b29sdGlwc1xuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NlbGVjdG9yPScuZmllbGQtaW5mby1pY29uJ10gLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBzdGF0aWMgZGVzdHJveShzZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBUb29sdGlwQnVpbGRlci5kZXN0cm95KHNlbGVjdG9yKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZXN0cm95IGdlbmVyYWwgc2V0dGluZ3MgdG9vbHRpcHM6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyO1xufSJdfQ==