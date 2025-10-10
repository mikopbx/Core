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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiR2VuZXJhbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsImdldFJlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcCIsImdldFNlbmRNZXRyaWNzVG9vbHRpcCIsImdldEFsbG93R3Vlc3RDYWxsc1Rvb2x0aXAiLCJnZXRQQlhMYW5ndWFnZVRvb2x0aXAiLCJnZXRQQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXAiLCJnZXRNYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwIiwiZ2V0U3BsaXRBdWRpb1RocmVhZFRvb2x0aXAiLCJnZXRSZWNvcmRDYWxsc1Rvb2x0aXAiLCJnZXRSZWNvcmRDYWxsc0lubmVyVG9vbHRpcCIsImdldFVzZVdlYlJUQ1Rvb2x0aXAiLCJnZXRSZWRpcmVjdFRvSHR0cHNUb29sdGlwIiwiZ2V0U1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcCIsImdldEFKQU1FbmFibGVkVG9vbHRpcCIsImdldEFNSUVuYWJsZWRUb29sdGlwIiwiZ2V0QVJJRW5hYmxlZFRvb2x0aXAiLCJnZXRBUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXAiLCJnZXRQQlhDYWxsUGFya2luZ0V4dFRvb2x0aXAiLCJnZXRQQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXAiLCJnZXRQQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXAiLCJnZXRQQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwIiwiZ2V0UEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXAiLCJnZXRQQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcCIsImdldFJUUFBvcnRSYW5nZVRvb2x0aXAiLCJnZXRSVFBTdHVuU2VydmVyVG9vbHRpcCIsImdldFNJUEF1dGhQcmVmaXhUb29sdGlwIiwiZ2V0U0lQRGVmYXVsdEV4cGlyeVRvb2x0aXAiLCJnZXRTSVBFeHBpcnlSYW5nZVRvb2x0aXAiLCJnZXRTU0hBdXRob3JpemVkS2V5c1Rvb2x0aXAiLCJnZXRTU0hfSURfUlNBX1BVQlRvb2x0aXAiLCJnZXRXRUJIVFRQU1B1YmxpY0tleVRvb2x0aXAiLCJnZXRXRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwIiwiZ2V0UGFzc2tleXNUb29sdGlwIiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF93aGVuIiwiZGVmaW5pdGlvbiIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF93aGVuX2Rlc2MiLCJnc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfYmVuZWZpdHMiLCJsaXN0MiIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9iZW5lZml0X21lbW9yeSIsImdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9iZW5lZml0X3N0YWJpbGl0eSIsImxpc3QzIiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2RyYXdiYWNrcyIsImxpc3Q0IiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2RyYXdiYWNrX2NhbGxzIiwiZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2RyYXdiYWNrX3JlZ2lzdHJhdGlvbiIsIm5vdGUiLCJnc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfcmVjb21tZW5kYXRpb24iLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfaGVhZGVyIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2Rlc2MiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfcHVycG9zZSIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9wdXJwb3NlX2Rlc2MiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfd2hhdF9jb2xsZWN0ZWQiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX2Vycm9ycyIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9jb2xsZWN0ZWRfY3Jhc2hlcyIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9jb2xsZWN0ZWRfcGVyZm9ybWFuY2UiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX3ZlcnNpb24iLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX2Vudmlyb25tZW50IiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRzIiwiZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRfcXVpY2tfZml4ZXMiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfYmVuZWZpdF9zdGFiaWxpdHkiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfYmVuZWZpdF9zdXBwb3J0IiwibGlzdDUiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfcHJpdmFjeSIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9wcml2YWN5X2Rlc2MiLCJ3YXJuaW5nIiwiaWNvbiIsInRleHQiLCJnc19TZW5kTWV0cmljc1Rvb2x0aXBfd2FybmluZyIsImdzX1NlbmRNZXRyaWNzVG9vbHRpcF9ub3RlIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9oZWFkZXIiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2Rlc2MiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF93YXJuaW5nIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF93aGVuX2VuYWJsZSIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX2Fub255bW91cyIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX2ludGVyY29tIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9lbmFibGVfZG9vcnBob25lIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9lbmFibGVfcHVibGljIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF90ZWNobmljYWwiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3RlY2huaWNhbF9lbmRwb2ludCIsImdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfdGVjaG5pY2FsX2NvbnRleHQiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3RlY2huaWNhbF9tb2R1bGUiLCJnc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3NlY3VyaXR5IiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9zZWN1cml0eV9kZXNjIiwiZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9yZWNvbW1lbmRhdGlvbiIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9oZWFkZXIiLCJnc19QQlhMYW5ndWFnZVRvb2x0aXBfZGVzYyIsImdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHNfdm9pY2UiLCJnc19QQlhMYW5ndWFnZVRvb2x0aXBfYWZmZWN0c19wcm9tcHRzIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHNfaXZyIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX2FmZmVjdHNfdm9pY2VtYWlsIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX3Jlc3RhcnQiLCJnc19QQlhMYW5ndWFnZVRvb2x0aXBfcmVzdGFydF9kZXNjIiwiZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX25vdGUiLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfaGVhZGVyIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2Rlc2MiLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfYWZmZWN0cyIsImdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9hZmZlY3RzX25ldyIsImdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9hZmZlY3RzX3ZhbGlkYXRpb24iLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfYWZmZWN0c19zZWFyY2giLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfZXhhbXBsZXMiLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfZXhhbXBsZV8zIiwiZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVfNCIsImdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9leGFtcGxlXzUiLCJnc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfd2FybmluZyIsImdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9ub3RlIiwiZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9oZWFkZXIiLCJnc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX2Rlc2MiLCJnc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX2F1dG8iLCJnc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX2F1dG9fZGVzYyIsImdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfbWFudWFsIiwiZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9tYW51YWxfZGVzYyIsImdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfbm90ZSIsImdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2hlYWRlciIsImdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2Rlc2MiLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9tb25vIiwiZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfbW9ub19kZXNjIiwiZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfc3RlcmVvIiwiZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfc3RlcmVvX2Rlc2MiLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9iZW5lZml0cyIsImdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2JlbmVmaXRfYW5hbHlzaXMiLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9iZW5lZml0X3F1YWxpdHkiLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9iZW5lZml0X3Byb2Nlc3NpbmciLCJnc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9ub3RlIiwiZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX2hlYWRlciIsImdzX1JlY29yZENhbGxzVG9vbHRpcF9kZXNjIiwiZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX3N0b3JhZ2UiLCJnc19SZWNvcmRDYWxsc1Rvb2x0aXBfc3RvcmFnZV9kZXNjIiwiZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX2xlZ2FsIiwiZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX2xlZ2FsX2Rlc2MiLCJnc19SZWNvcmRDYWxsc1Rvb2x0aXBfd2FybmluZyIsImdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX2hlYWRlciIsImdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX2Rlc2MiLCJnc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF91c2FnZSIsImdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlX3RyYWluaW5nIiwiZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfdXNhZ2VfcXVhbGl0eSIsImdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlX3NlY3VyaXR5IiwiZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfbm90ZSIsImdzX1VzZVdlYlJUQ1Rvb2x0aXBfaGVhZGVyIiwiZ3NfVXNlV2ViUlRDVG9vbHRpcF9kZXNjIiwiZ3NfVXNlV2ViUlRDVG9vbHRpcF9iZW5lZml0cyIsImdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdF9icm93c2VyIiwiZ3NfVXNlV2ViUlRDVG9vbHRpcF9iZW5lZml0X25vX3NvZnR3YXJlIiwiZ3NfVXNlV2ViUlRDVG9vbHRpcF9iZW5lZml0X2VuY3J5cHRpb24iLCJnc19Vc2VXZWJSVENUb29sdGlwX3JlcXVpcmVtZW50cyIsImdzX1VzZVdlYlJUQ1Rvb2x0aXBfcmVxdWlyZW1lbnRzX2Rlc2MiLCJnc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX2hlYWRlciIsImdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfZGVzYyIsImdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfc2VjdXJpdHkiLCJnc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX3NlY3VyaXR5X2Rlc2MiLCJnc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX2NlcnRpZmljYXRlIiwiZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9jZXJ0aWZpY2F0ZV9kZXNjIiwiZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9ub3RlIiwiZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9oZWFkZXIiLCJnc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2Rlc2MiLCJnc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF93YXJuaW5nIiwiZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9iZW5lZml0cyIsImdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfYmVuZWZpdF9zZWN1cml0eSIsImdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfYmVuZWZpdF9icnV0ZWZvcmNlIiwiZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9iZW5lZml0X2NvbXBsaWFuY2UiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfaGVhZGVyIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rlc2MiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfd2hhdF9pcyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF93aGF0X2lzX2Rlc2MiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2UiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2Vfd2ViYXBwcyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZV9wYW5lbHMiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2Vfd2lkZ2V0cyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZV9tb25pdG9yaW5nIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3Byb3RvY29scyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9wcm90b2NvbHNfZGVzYyIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9kZWZhdWx0IiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2RlZmF1bHRfZGVzYyIsImxpc3Q2IiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3doZW5fZGlzYWJsZSIsImxpc3Q3IiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMSIsImdzX0FKQU1FbmFibGVkVG9vbHRpcF9kaXNhYmxlXzIiLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8zIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3dhcm5pbmciLCJnc19BSkFNRW5hYmxlZFRvb2x0aXBfbm90ZSIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2hlYWRlciIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2Rlc2MiLCJnc19BTUlFbmFibGVkVG9vbHRpcF93aGF0X2lzIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2hhdF9pc19kZXNjIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2UiLCJnc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9tb25pdG9yaW5nIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfaW50ZWdyYXRpb24iLCJnc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9jb250cm9sIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfZXZlbnRzIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfY29tbWFuZHMiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9leGFtcGxlcyIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfY3JtIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV93YWxsYm9hcmQiLCJnc19BTUlFbmFibGVkVG9vbHRpcF9leGFtcGxlX2N0aSIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfcmVwb3J0aW5nIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGVmYXVsdCIsImdzX0FNSUVuYWJsZWRUb29sdGlwX2RlZmF1bHRfZGVzYyIsImdzX0FNSUVuYWJsZWRUb29sdGlwX3doZW5fZGlzYWJsZSIsImxpc3Q4IiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8xIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8yIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8zIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19BTUlFbmFibGVkVG9vbHRpcF93YXJuaW5nIiwiZm9vdGVyIiwiZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZm9vdGVyIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfaGVhZGVyIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZGVzYyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3doYXRfaXMiLCJnc19BUklFbmFibGVkVG9vbHRpcF93aGF0X2lzX2Rlc2MiLCJnc19BUklFbmFibGVkVG9vbHRpcF91c2FnZSIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX3dlYnJ0YyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX2l2ciIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX2NvbmZlcmVuY2UiLCJnc19BUklFbmFibGVkVG9vbHRpcF91c2FnZV9yZWNvcmRpbmciLCJnc19BUklFbmFibGVkVG9vbHRpcF91c2FnZV9jdXN0b20iLCJnc19BUklFbmFibGVkVG9vbHRpcF9leGFtcGxlcyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfd2VicGhvbmUiLCJnc19BUklFbmFibGVkVG9vbHRpcF9leGFtcGxlX2JvdCIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfcXVldWUiLCJnc19BUklFbmFibGVkVG9vbHRpcF9leGFtcGxlX2FuYWx5dGljcyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2RlZmF1bHQiLCJnc19BUklFbmFibGVkVG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJnc19BUklFbmFibGVkVG9vbHRpcF93aGVuX2VuYWJsZSIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2VuYWJsZV8xIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZW5hYmxlXzIiLCJnc19BUklFbmFibGVkVG9vbHRpcF9lbmFibGVfMyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfQVJJRW5hYmxlZFRvb2x0aXBfd2FybmluZyIsImdzX0FSSUVuYWJsZWRUb29sdGlwX2Zvb3RlciIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9oZWFkZXIiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZGVzYyIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF93aGF0X2lzIiwiZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3doYXRfaXNfZGVzYyIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9mb3JtYXQiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZm9ybWF0X2Rlc2MiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZXhhbXBsZXMiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZXhhbXBsZV8xIiwiZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2V4YW1wbGVfMiIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9leGFtcGxlXzMiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfc2VjdXJpdHkiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfc2VjdXJpdHlfMSIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9zZWN1cml0eV8yIiwiZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3NlY3VyaXR5XzMiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZGVmYXVsdCIsImdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJnc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZm9vdGVyIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hlYWRlciIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9kZXNjIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hvdyIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ob3dfZGlhbCIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ob3dfYW5ub3VuY2UiLCJnc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaG93X3JldHJpZXZlIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzX3JhbmdlIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzX2NhcGFjaXR5IiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzX2F1dG9tYXRpYyIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9leGFtcGxlIiwiZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2V4YW1wbGVfZGVzYyIsImdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ub3RlIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hlYWRlciIsImdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9kZXNjIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvdyIsImdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ob3dfcHJlc3MiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X2RpYWwiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X3RhbGsiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X2NvbXBsZXRlIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2JlbmVmaXRzIiwiZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2JlbmVmaXRzX2Rlc2MiLCJnc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfbm90ZSIsImdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9oZWFkZXIiLCJnc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfZGVzYyIsImdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9ob3ciLCJnc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaG93X3ByZXNzIiwiZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hvd19kaWFsIiwiZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hvd19oYW5ndXAiLCJnc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfd2FybmluZyIsImdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9ub3RlIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF9oZWFkZXIiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX2Rlc2MiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3R5cGVzIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2dlbmVyYWwiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3R5cGVfZ2VuZXJhbF9kZXNjIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2RpcmVjdGVkIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2RpcmVjdGVkX2Rlc2MiLCJnc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3VzYWdlIiwiZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF91c2FnZV9kZXNjIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfaGVhZGVyIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfZGVzYyIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3NjZW5hcmlvIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfc2NlbmFyaW9fMSIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3NjZW5hcmlvXzIiLCJnc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18zIiwiZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfZGVmYXVsdCIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX2RlZmF1bHRfZGVzYyIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY29tbWVuZGF0aW9ucyIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY19zdGFuZGFyZCIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY19xdWljayIsImdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY19leHRlbmRlZCIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2hlYWRlciIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2Rlc2MiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF91c2FnZSIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX3VzYWdlX2Rlc2MiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9kZWZhdWx0IiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfZGVmYXVsdF9kZXNjIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfd2hlbl90b19jaGFuZ2UiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9jaGFuZ2VfaW5jcmVhc2UiLCJnc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9jaGFuZ2VfaW5jcmVhc2VfZGVzYyIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9kZWNyZWFzZSIsImdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9kZWNyZWFzZV9kZXNjIiwiZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfZm9vdGVyIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9oZWFkZXIiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2Rlc2MiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2UiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2VfbWVkaWEiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2VfYmlkaXJlY3Rpb25hbCIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfcHVycG9zZV91bmlxdWUiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2RlZmF1bHQiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2RlZmF1bHRfZGVzYyIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2FsY3VsYXRpb24iLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NhbGN1bGF0aW9uX2Rlc2MiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX3doZW5fdG9fY2hhbmdlIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfaW5jcmVhc2UiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NoYW5nZV9pbmNyZWFzZV9kZXNjIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfY3VzdG9tIiwiZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfY3VzdG9tX2Rlc2MiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NoYW5nZV9uYXQiLCJnc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NoYW5nZV9uYXRfZGVzYyIsImdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZm9vdGVyIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfaGVhZGVyIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZGVzYyIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3B1cnBvc2VfaGVhZGVyIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfcHVycG9zZV8xIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfcHVycG9zZV8yIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfcHVycG9zZV8zIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfaG93X2l0X3dvcmtzIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfaG93X2l0X3dvcmtzX2Rlc2MiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9mb3JtYXQiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9mb3JtYXRfZGVzYyIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3doZW5fdG9fdXNlIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfdXNlXzEiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF91c2VfMiIsImdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3VzZV8zIiwiZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZXhhbXBsZXMiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlXzEiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlXzIiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlXzMiLCJnc19SVFBTdHVuU2VydmVyVG9vbHRpcF9mb290ZXIiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF9oZWFkZXIiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF9kZXNjIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfcHVycG9zZSIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3B1cnBvc2VfZGVzYyIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX2hvd19pdF93b3JrcyIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dvcmtfMSIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dvcmtfMiIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dvcmtfMyIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX2RlZmF1bHQiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF9kZWZhdWx0X2Rlc2MiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF93aGVuX3RvX3VzZSIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV8xIiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfdXNlXzIiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF91c2VfMyIsImdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV80IiwiZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19TSVBBdXRoUHJlZml4VG9vbHRpcF93YXJuaW5nIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfaGVhZGVyIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfZGVzYyIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3B1cnBvc2UiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9wdXJwb3NlX2Rlc2MiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9ob3dfaXRfd29ya3MiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF93b3JrXzEiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF93b3JrXzIiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF93b3JrXzMiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9kZWZhdWx0IiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfZGVmYXVsdF9kZXNjIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfd2hlbl90b19jaGFuZ2UiLCJnc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9jaGFuZ2VfbW9iaWxlIiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfY2hhbmdlX3N0YWJsZSIsImdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9iYXR0ZXJ5IiwiZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfbm90ZSIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9oZWFkZXIiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfZGVzYyIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5faGVhZGVyIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9kZXNjIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9wcm90ZWN0IiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9kZWZhdWx0IiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9uYXQiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWF4X2hlYWRlciIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfZGVzYyIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfdGltZW91dCIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfZGVmYXVsdCIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfcmVkdWNlIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY29tbWVuZGF0aW9ucyIsImdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9yZWNfbG9jYWwiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX2ludGVybmV0IiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY19tb2JpbGUiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX2RlZmF1bHQiLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfaG93X2l0X3dvcmtzIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3dhcm5pbmciLCJnc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbm90ZSIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9oZWFkZXIiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfZGVzYyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF93aGF0X2lzIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3doYXRfaXNfZGVzYyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9mb3JtYXQiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfZm9ybWF0X2Rlc2MiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfaG93X3RvX2FkZCIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfMSIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfMiIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfMyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfNCIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0cyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzEiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYmVuZWZpdF8yIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2JlbmVmaXRfMyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzQiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfc2VjdXJpdHkiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfc2VjdXJpdHlfMSIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9zZWN1cml0eV8yIiwiZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3NlY3VyaXR5XzMiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfd2FybmluZyIsImdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9ub3RlIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2hlYWRlciIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9kZXNjIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3doYXRfaXMiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfd2hhdF9pc19kZXNjIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzEiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2VfMiIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2FnZV8zIiwiZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzQiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZ2VuZXJhdGlvbiIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9nZW5lcmF0aW9uX2Rlc2MiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfaG93X3RvX3VzZSIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2VfMSIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2VfMiIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2VfMyIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9mb3JtYXQiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZm9ybWF0X2Rlc2MiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJnc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfd2FybmluZyIsImdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9ub3RlIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2hlYWRlciIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9kZXNjIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3doYXRfaXMiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfd2hhdF9pc19kZXNjIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3doZXJlX3VzZWQiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9uZ2lueCIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF91c2VkX3dlYnJ0YyIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF91c2VkX2FqYW0iLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9hcGkiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfZm9ybWF0IiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2Zvcm1hdF9kZXNjIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX29idGFpbiIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fbGV0c2VuY3J5cHQiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfb2J0YWluX2NhIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX29idGFpbl9zZWxmIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2NoYWluIiwiZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2NoYWluX2Rlc2MiLCJnc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfbm90ZSIsImdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9mb290ZXIiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2hlYWRlciIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfZGVzYyIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfd2hhdF9pcyIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfd2hhdF9pc19kZXNjIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9wdXJwb3NlIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9wdXJwb3NlXzEiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3B1cnBvc2VfMiIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfcHVycG9zZV8zIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9mb3JtYXQiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2Zvcm1hdF9kZXNjIiwiZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfd2FybmluZyIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHkiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5XzEiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5XzIiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5XzMiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5XzQiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2NvbXBhdGliaWxpdHkiLCJnc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2NvbXBhdGliaWxpdHlfZGVzYyIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfbm90ZSIsImdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfZm9vdGVyIiwicGtfUGFzc2tleXNUb29sdGlwX2hlYWRlciIsInBrX1Bhc3NrZXlzVG9vbHRpcF9kZXNjIiwicGtfUGFzc2tleXNUb29sdGlwX3doYXRfaXMiLCJwa19QYXNza2V5c1Rvb2x0aXBfd2hhdF9pc19kZXNjIiwicGtfUGFzc2tleXNUb29sdGlwX3N1cHBvcnRlZF9tZXRob2RzIiwicGtfUGFzc2tleXNUb29sdGlwX21ldGhvZF9iaW9tZXRyaWMiLCJwa19QYXNza2V5c1Rvb2x0aXBfbWV0aG9kX2hhcmR3YXJlIiwicGtfUGFzc2tleXNUb29sdGlwX21ldGhvZF9wbGF0Zm9ybSIsInBrX1Bhc3NrZXlzVG9vbHRpcF9hZHZhbnRhZ2VzIiwicGtfUGFzc2tleXNUb29sdGlwX2FkdmFudGFnZV9zZWN1cml0eSIsInBrX1Bhc3NrZXlzVG9vbHRpcF9hZHZhbnRhZ2Vfc3BlZWQiLCJwa19QYXNza2V5c1Rvb2x0aXBfYWR2YW50YWdlX25vX3Bhc3N3b3JkcyIsInBrX1Bhc3NrZXlzVG9vbHRpcF9hZHZhbnRhZ2VfdW5pcXVlIiwicGtfUGFzc2tleXNUb29sdGlwX2hvd190b191c2UiLCJwa19QYXNza2V5c1Rvb2x0aXBfdXNlX3N0ZXBfMSIsInBrX1Bhc3NrZXlzVG9vbHRpcF91c2Vfc3RlcF8yIiwicGtfUGFzc2tleXNUb29sdGlwX3VzZV9zdGVwXzMiLCJwa19QYXNza2V5c1Rvb2x0aXBfY29tcGF0aWJpbGl0eSIsInBrX1Bhc3NrZXlzVG9vbHRpcF9jb21wYXRpYmlsaXR5X2Rlc2MiLCJsaXN0OSIsInBrX1Bhc3NrZXlzVG9vbHRpcF9zZWN1cml0eSIsInBrX1Bhc3NrZXlzVG9vbHRpcF9zZWN1cml0eV9kZXNjIiwicGtfUGFzc2tleXNUb29sdGlwX25vdGUiLCJjb25maWciLCJodG1sIiwiQXJyYXkiLCJpc0FycmF5IiwibGVuZ3RoIiwiZm9yRWFjaCIsIml0ZW0iLCJPYmplY3QiLCJlbnRyaWVzIiwiaSIsImxpc3ROYW1lIiwiZXhhbXBsZXMiLCJleGFtcGxlc0hlYWRlciIsImV4YW1wbGUiLCJpbmRleCIsImVzY2FwZWRFeGFtcGxlIiwiZXNjYXBlSHRtbCIsInN0YXJ0c1dpdGgiLCJlbmRzV2l0aCIsImluY2x1ZGVzIiwic3BsaXQiLCJtYXAiLCJzIiwidHJpbSIsImtleSIsInZhbHVlIiwiU3RyaW5nIiwicmVwbGFjZSIsIm0iLCJUb29sdGlwQnVpbGRlciIsImNvbnNvbGUiLCJlcnJvciIsInRvb2x0aXBDb25maWdzIiwiZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zIiwiaHRtbENvbmZpZ3MiLCJmaWVsZE5hbWUiLCJidWlsZFRvb2x0aXBDb250ZW50IiwiJCIsImVhY2giLCJlbGVtZW50IiwiJGljb24iLCJkYXRhIiwiY29udGVudCIsInBvcHVwIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJkZWxheSIsInNob3ciLCJoaWRlIiwidmFyaWF0aW9uIiwib24iLCJpbml0aWFsaXplIiwic2VsZWN0b3IiLCJzaG93RGVsYXkiLCJoaWRlRGVsYXkiLCJ0b29sdGlwRGF0YSIsInVwZGF0ZSIsImRlc3Ryb3kiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSw2QjtBQUNGO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksMkNBQWM7QUFBQTs7QUFDVixVQUFNLElBQUlDLEtBQUosQ0FBVSw0RUFBVixDQUFOO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O1dBQ0ksb0NBQWtDO0FBQzlCLGFBQU87QUFDSCw2QkFBcUIsS0FBS0MsMkJBQUwsRUFEbEI7QUFFSCx1QkFBZSxLQUFLQyxxQkFBTCxFQUZaO0FBR0gsOEJBQXNCLEtBQUtDLHlCQUFMLEVBSG5CO0FBSUgsdUJBQWUsS0FBS0MscUJBQUwsRUFKWjtBQUtILHNDQUE4QixLQUFLQyxvQ0FBTCxFQUwzQjtBQU1ILGlDQUF5QixLQUFLQyw0QkFBTCxFQU50QjtBQU9ILCtCQUF1QixLQUFLQywwQkFBTCxFQVBwQjtBQVFILDBCQUFrQixLQUFLQyxxQkFBTCxFQVJmO0FBU0gsK0JBQXVCLEtBQUtDLDBCQUFMLEVBVHBCO0FBVUgscUJBQWEsS0FBS0MsbUJBQUwsRUFWVjtBQVdILDJCQUFtQixLQUFL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QUFyRCxTQUFvRUosS0FBcEU7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksbUJBQThDO0FBQUEsVUFBL0JxQixRQUErQix1RUFBcEIsa0JBQW9COztBQUMxQyxVQUFJO0FBQ0EsWUFBSSxPQUFPdkIsY0FBUCxLQUEwQixXQUE5QixFQUEyQztBQUN2Q0MsVUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsaUNBQWQ7QUFDQTtBQUNIOztBQUVERixRQUFBQSxjQUFjLENBQUM0QixPQUFmLENBQXVCTCxRQUF2QjtBQUNILE9BUEQsQ0FPRSxPQUFPckIsS0FBUCxFQUFjO0FBQ1pELFFBQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLDhDQUFkLEVBQThEQSxLQUE5RDtBQUNIO0FBQ0o7Ozs7S0FHTDs7O0FBQ0EsSUFBSSxPQUFPMkIsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCbmtCLDZCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciAtIE1hbmFnZXMgdG9vbHRpcHMgZm9yIEdlbmVyYWwgU2V0dGluZ3MgZm9ybVxuICogXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGdlbmVyYWwgc2V0dGluZ3MgZmllbGRzLFxuICogaGVscGluZyB1c2VycyB1bmRlcnN0YW5kIHRoZSBwdXJwb3NlIGFuZCBpbXBsaWNhdGlvbnMgb2YgZWFjaCBzZXR0aW5nLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3Igc3lzdGVtIHNldHRpbmdzXG4gKiAtIEludGVncmF0aW9uIHdpdGggVG9vbHRpcEJ1aWxkZXJcbiAqIC0gQ29uc2lzdGVudCBzdHJ1Y3R1cmUgZm9sbG93aW5nIHRoZSBlc3RhYmxpc2hlZCBwYXR0ZXJuXG4gKiBcbiAqIEBjbGFzcyBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlclxuICovXG5jbGFzcyBHZW5lcmFsU2V0dGluZ3NUb29sdGlwTWFuYWdlciB7XG4gICAgLyoqXG4gICAgICogUHJpdmF0ZSBjb25zdHJ1Y3RvciB0byBwcmV2ZW50IGluc3RhbnRpYXRpb25cbiAgICAgKiBUaGlzIGNsYXNzIHVzZXMgc3RhdGljIG1ldGhvZHMgZm9yIHV0aWxpdHkgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0dlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyIGlzIGEgc3RhdGljIGNsYXNzIGFuZCBjYW5ub3QgYmUgaW5zdGFudGlhdGVkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBnZW5lcmFsIHNldHRpbmdzXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGdlbmVyYWwgc2V0dGluZ3MgZmllbGRzXG4gICAgICovXG4gICAgc3RhdGljIGdldFRvb2x0aXBDb25maWd1cmF0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICdSZXN0YXJ0RXZlcnlOaWdodCc6IHRoaXMuZ2V0UmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwKCksXG4gICAgICAgICAgICAnU2VuZE1ldHJpY3MnOiB0aGlzLmdldFNlbmRNZXRyaWNzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWEFsbG93R3Vlc3RDYWxscyc6IHRoaXMuZ2V0QWxsb3dHdWVzdENhbGxzVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWExhbmd1YWdlJzogdGhpcy5nZXRQQlhMYW5ndWFnZVRvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aCc6IHRoaXMuZ2V0UEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYTWFudWFsVGltZVNldHRpbmdzJzogdGhpcy5nZXRNYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYU3BsaXRBdWRpb1RocmVhZCc6IHRoaXMuZ2V0U3BsaXRBdWRpb1RocmVhZFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhSZWNvcmRDYWxscyc6IHRoaXMuZ2V0UmVjb3JkQ2FsbHNUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYUmVjb3JkQ2FsbHNJbm5lcic6IHRoaXMuZ2V0UmVjb3JkQ2FsbHNJbm5lclRvb2x0aXAoKSxcbiAgICAgICAgICAgICdVc2VXZWJSVEMnOiB0aGlzLmdldFVzZVdlYlJUQ1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdSZWRpcmVjdFRvSHR0cHMnOiB0aGlzLmdldFJlZGlyZWN0VG9IdHRwc1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMnOiB0aGlzLmdldFNTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdBSkFNRW5hYmxlZCc6IHRoaXMuZ2V0QUpBTUVuYWJsZWRUb29sdGlwKCksXG4gICAgICAgICAgICAnQU1JRW5hYmxlZCc6IHRoaXMuZ2V0QU1JRW5hYmxlZFRvb2x0aXAoKSxcbiAgICAgICAgICAgICdBUklFbmFibGVkJzogdGhpcy5nZXRBUklFbmFibGVkVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ0FSSUFsbG93ZWRPcmlnaW5zJzogdGhpcy5nZXRBUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhDYWxsUGFya2luZ0V4dCc6IHRoaXMuZ2V0UEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwKCksXG4gICAgICAgICAgICAnUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXInOiB0aGlzLmdldFBCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyJzogdGhpcy5nZXRQQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhGZWF0dXJlUGlja3VwRXh0ZW4nOiB0aGlzLmdldFBCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXAoKSxcbiAgICAgICAgICAgICdQQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0JzogdGhpcy5nZXRQQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1BCWEZlYXR1cmVEaWdpdFRpbWVvdXQnOiB0aGlzLmdldFBCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwKCksXG4gICAgICAgICAgICAnUlRQUG9ydFJhbmdlJzogdGhpcy5nZXRSVFBQb3J0UmFuZ2VUb29sdGlwKCksXG4gICAgICAgICAgICAnUlRQU3R1blNlcnZlcic6IHRoaXMuZ2V0UlRQU3R1blNlcnZlclRvb2x0aXAoKSxcbiAgICAgICAgICAgICdTSVBBdXRoUHJlZml4JzogdGhpcy5nZXRTSVBBdXRoUHJlZml4VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1NJUERlZmF1bHRFeHBpcnknOiB0aGlzLmdldFNJUERlZmF1bHRFeHBpcnlUb29sdGlwKCksXG4gICAgICAgICAgICAnU0lQRXhwaXJ5UmFuZ2UnOiB0aGlzLmdldFNJUEV4cGlyeVJhbmdlVG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1NTSEF1dGhvcml6ZWRLZXlzJzogdGhpcy5nZXRTU0hBdXRob3JpemVkS2V5c1Rvb2x0aXAoKSxcbiAgICAgICAgICAgICdTU0hfSURfUlNBX1BVQic6IHRoaXMuZ2V0U1NIX0lEX1JTQV9QVUJUb29sdGlwKCksXG4gICAgICAgICAgICAnV0VCSFRUUFNQdWJsaWNLZXknOiB0aGlzLmdldFdFQkhUVFBTUHVibGljS2V5VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1dFQkhUVFBTUHJpdmF0ZUtleSc6IHRoaXMuZ2V0V0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcCgpLFxuICAgICAgICAgICAgJ1Bhc3NrZXlzJzogdGhpcy5nZXRQYXNza2V5c1Rvb2x0aXAoKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBSZXN0YXJ0RXZlcnlOaWdodCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFJlc3RhcnRFdmVyeU5pZ2h0IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFJlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF93aGVuLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX3doZW5fZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9iZW5lZml0X21lbW9yeSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2JlbmVmaXRfc3RhYmlsaXR5XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfZHJhd2JhY2tzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1Jlc3RhcnRFdmVyeU5pZ2h0VG9vbHRpcF9kcmF3YmFja19jYWxscyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVzdGFydEV2ZXJ5TmlnaHRUb29sdGlwX2RyYXdiYWNrX3JlZ2lzdHJhdGlvblxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZXN0YXJ0RXZlcnlOaWdodFRvb2x0aXBfcmVjb21tZW5kYXRpb25cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU2VuZE1ldHJpY3MgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTZW5kTWV0cmljcyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTZW5kTWV0cmljc1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfcHVycG9zZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF93aGF0X2NvbGxlY3RlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX2Vycm9ycyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2NvbGxlY3RlZF9jcmFzaGVzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX3BlcmZvcm1hbmNlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfY29sbGVjdGVkX3ZlcnNpb24sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9jb2xsZWN0ZWRfZW52aXJvbm1lbnRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9iZW5lZml0cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfYmVuZWZpdF9xdWlja19maXhlcyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU2VuZE1ldHJpY3NUb29sdGlwX2JlbmVmaXRfc3RhYmlsaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfYmVuZWZpdF9zdXBwb3J0XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TZW5kTWV0cmljc1Rvb2x0aXBfcHJpdmFjeSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9wcml2YWN5X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGljb246ICdpbmZvIGNpcmNsZScsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NlbmRNZXRyaWNzVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWEFsbG93R3Vlc3RDYWxscyB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWEFsbG93R3Vlc3RDYWxscyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBbGxvd0d1ZXN0Q2FsbHNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF93aGVuX2VuYWJsZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2VuYWJsZV9hbm9ueW1vdXMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX2ludGVyY29tLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxvd0d1ZXN0Q2FsbHNUb29sdGlwX2VuYWJsZV9kb29ycGhvbmUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfZW5hYmxlX3B1YmxpY1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF90ZWNobmljYWwsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF90ZWNobmljYWxfZW5kcG9pbnQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfdGVjaG5pY2FsX2NvbnRleHQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfdGVjaG5pY2FsX21vZHVsZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9zZWN1cml0eSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbG93R3Vlc3RDYWxsc1Rvb2x0aXBfc2VjdXJpdHlfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQWxsb3dHdWVzdENhbGxzVG9vbHRpcF9yZWNvbW1lbmRhdGlvblxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhMYW5ndWFnZSB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWExhbmd1YWdlIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFBCWExhbmd1YWdlVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzX3ZvaWNlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfYWZmZWN0c19wcm9tcHRzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfYWZmZWN0c19pdnIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWExhbmd1YWdlVG9vbHRpcF9hZmZlY3RzX3ZvaWNlbWFpbFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYTGFuZ3VhZ2VUb29sdGlwX3Jlc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfcmVzdGFydF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhMYW5ndWFnZVRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFBCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9hZmZlY3RzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEludGVybmFsRXh0ZW5zaW9uTGVuZ3RoVG9vbHRpcF9hZmZlY3RzX25ldyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2FmZmVjdHNfdmFsaWRhdGlvbixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2FmZmVjdHNfc2VhcmNoXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhJbnRlcm5hbEV4dGVuc2lvbkxlbmd0aFRvb2x0aXBfZXhhbXBsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVfMyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVfNCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX2V4YW1wbGVfNVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYSW50ZXJuYWxFeHRlbnNpb25MZW5ndGhUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYTWFudWFsVGltZVNldHRpbmdzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYTWFudWFsVGltZVNldHRpbmdzIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldE1hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfTWFudWFsVGltZVNldHRpbmdzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfYXV0byxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfYXV0b19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19NYW51YWxUaW1lU2V0dGluZ3NUb29sdGlwX21hbnVhbCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfbWFudWFsX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX01hbnVhbFRpbWVTZXR0aW5nc1Rvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhTcGxpdEF1ZGlvVGhyZWFkIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYU3BsaXRBdWRpb1RocmVhZCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9tb25vLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfbW9ub19kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9zdGVyZW8sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TcGxpdEF1ZGlvVGhyZWFkVG9vbHRpcF9zdGVyZW9fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2JlbmVmaXRfYW5hbHlzaXMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX2JlbmVmaXRfcXVhbGl0eSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3BsaXRBdWRpb1RocmVhZFRvb2x0aXBfYmVuZWZpdF9wcm9jZXNzaW5nXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NwbGl0QXVkaW9UaHJlYWRUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYUmVjb3JkQ2FsbHMgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhSZWNvcmRDYWxscyBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRSZWNvcmRDYWxsc1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc1Rvb2x0aXBfc3RvcmFnZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzVG9vbHRpcF9zdG9yYWdlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzVG9vbHRpcF9sZWdhbCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzVG9vbHRpcF9sZWdhbF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYUmVjb3JkQ2FsbHNJbm5lciB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWFJlY29yZENhbGxzSW5uZXIgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UmVjb3JkQ2FsbHNJbm5lclRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWNvcmRDYWxsc0lubmVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVjb3JkQ2FsbHNJbm5lclRvb2x0aXBfdXNhZ2VfdHJhaW5pbmcsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlX3F1YWxpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX3VzYWdlX3NlY3VyaXR5XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlY29yZENhbGxzSW5uZXJUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgVXNlV2ViUlRDIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgVXNlV2ViUlRDIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFVzZVdlYlJUQ1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19Vc2VXZWJSVENUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfVXNlV2ViUlRDVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfVXNlV2ViUlRDVG9vbHRpcF9iZW5lZml0X2Jyb3dzZXIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfYmVuZWZpdF9ub19zb2Z0d2FyZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfVXNlV2ViUlRDVG9vbHRpcF9iZW5lZml0X2VuY3J5cHRpb25cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1VzZVdlYlJUQ1Rvb2x0aXBfcmVxdWlyZW1lbnRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfVXNlV2ViUlRDVG9vbHRpcF9yZXF1aXJlbWVudHNfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUmVkaXJlY3RUb0h0dHBzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUmVkaXJlY3RUb0h0dHBzIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFJlZGlyZWN0VG9IdHRwc1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUmVkaXJlY3RUb0h0dHBzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX3NlY3VyaXR5X2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfY2VydGlmaWNhdGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SZWRpcmVjdFRvSHR0cHNUb29sdGlwX2NlcnRpZmljYXRlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JlZGlyZWN0VG9IdHRwc1Rvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnMgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0U1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSERpc2FibGVQYXNzd29yZExvZ2luc1Rvb2x0aXBfYmVuZWZpdHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9iZW5lZml0X3NlY3VyaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hEaXNhYmxlUGFzc3dvcmRMb2dpbnNUb29sdGlwX2JlbmVmaXRfYnJ1dGVmb3JjZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIRGlzYWJsZVBhc3N3b3JkTG9naW5zVG9vbHRpcF9iZW5lZml0X2NvbXBsaWFuY2VcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgQUpBTUVuYWJsZWQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBBSkFNRW5hYmxlZCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBSkFNRW5hYmxlZFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfd2hhdF9pcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3VzYWdlX3dlYmFwcHMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZV9wYW5lbHMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF91c2FnZV93aWRnZXRzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfdXNhZ2VfbW9uaXRvcmluZ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX3Byb3RvY29scyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9wcm90b2NvbHNfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF93aGVuX2Rpc2FibGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQUpBTUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BSkFNRW5hYmxlZFRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FKQU1FbmFibGVkVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IEFNSUVuYWJsZWQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBBTUlFbmFibGVkIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldEFNSUVuYWJsZWRUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX3doYXRfaXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9tb25pdG9yaW5nLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9pbnRlZ3JhdGlvbixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfY29udHJvbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfdXNhZ2VfZXZlbnRzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF91c2FnZV9jb21tYW5kc1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9jcm0sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2V4YW1wbGVfd2FsbGJvYXJkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9leGFtcGxlX2N0aSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9yZXBvcnRpbmdcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF93aGVuX2Rpc2FibGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDg6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfZGlzYWJsZV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF9kaXNhYmxlXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2Rpc2FibGVfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19BTUlFbmFibGVkVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfQU1JRW5hYmxlZFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FNSUVuYWJsZWRUb29sdGlwX2Zvb3RlclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBBUklFbmFibGVkIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgQVJJRW5hYmxlZCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBUklFbmFibGVkVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF93aGF0X2lzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfdXNhZ2Vfd2VicnRjLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF91c2FnZV9pdnIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX2NvbmZlcmVuY2UsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX3VzYWdlX3JlY29yZGluZyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfdXNhZ2VfY3VzdG9tXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9leGFtcGxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9leGFtcGxlX3dlYnBob25lLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9leGFtcGxlX2JvdCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9xdWV1ZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZXhhbXBsZV9hbmFseXRpY3NcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF93aGVuX2VuYWJsZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0ODogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF9lbmFibGVfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZW5hYmxlXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX2VuYWJsZV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUVuYWJsZWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklFbmFibGVkVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZm9vdGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJRW5hYmxlZFRvb2x0aXBfZm9vdGVyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IEFSSUFsbG93ZWRPcmlnaW5zIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgQVJJQWxsb3dlZE9yaWdpbnMgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0QVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3doYXRfaXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9leGFtcGxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZXhhbXBsZV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZXhhbXBsZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZXhhbXBsZV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX3NlY3VyaXR5XzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9zZWN1cml0eV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfc2VjdXJpdHlfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfQVJJQWxsb3dlZE9yaWdpbnNUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19BUklBbGxvd2VkT3JpZ2luc1Rvb2x0aXBfZGVmYXVsdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX0FSSUFsbG93ZWRPcmlnaW5zVG9vbHRpcF9mb290ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYQ2FsbFBhcmtpbmdFeHQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhDYWxsUGFya2luZ0V4dCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQQlhDYWxsUGFya2luZ0V4dFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfaG93LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ob3dfZGlhbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hvd19hbm5vdW5jZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX2hvd19yZXRyaWV2ZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9zbG90c19yYW5nZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYQ2FsbFBhcmtpbmdFeHRUb29sdGlwX3Nsb3RzX2NhcGFjaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfc2xvdHNfYXV0b21hdGljXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhDYWxsUGFya2luZ0V4dFRvb2x0aXBfZXhhbXBsZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9leGFtcGxlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWENhbGxQYXJraW5nRXh0VG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXIgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvdyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X3ByZXNzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR0ZW5kZWRUcmFuc2ZlclRvb2x0aXBfaG93X2RpYWwsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ob3dfdGFsayxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2hvd19jb21wbGV0ZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0dGVuZGVkVHJhbnNmZXJUb29sdGlwX2JlbmVmaXRzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHRlbmRlZFRyYW5zZmVyVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFBCWEZlYXR1cmVCbGluZFRyYW5zZmVyIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXIgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUJsaW5kVHJhbnNmZXJUb29sdGlwX2hvdyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaG93X3ByZXNzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfaG93X2RpYWwsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVCbGluZFRyYW5zZmVyVG9vbHRpcF9ob3dfaGFuZ3VwXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQmxpbmRUcmFuc2ZlclRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhGZWF0dXJlUGlja3VwRXh0ZW4gdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBQQlhGZWF0dXJlUGlja3VwRXh0ZW4gZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVQaWNrdXBFeHRlblRvb2x0aXBfdHlwZV9nZW5lcmFsLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2dlbmVyYWxfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2RpcmVjdGVkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF90eXBlX2RpcmVjdGVkX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlUGlja3VwRXh0ZW5Ub29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZVBpY2t1cEV4dGVuVG9vbHRpcF91c2FnZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBQQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0IHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dCBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpbyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9zY2VuYXJpb18zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfZGVmYXVsdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfcmVjb21tZW5kYXRpb25zLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVBdHhmZXJOb0Fuc3dlclRpbWVvdXRUb29sdGlwX3JlY19zdGFuZGFyZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZUF0eGZlck5vQW5zd2VyVGltZW91dFRvb2x0aXBfcmVjX3F1aWNrLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlQXR4ZmVyTm9BbnN3ZXJUaW1lb3V0VG9vbHRpcF9yZWNfZXh0ZW5kZWRcbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUEJYRmVhdHVyZURpZ2l0VGltZW91dCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBCWEZlYXR1cmVEaWdpdFRpbWVvdXQgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0UEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19QQlhGZWF0dXJlRGlnaXRUaW1lb3V0VG9vbHRpcF91c2FnZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX3doZW5fdG9fY2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfY2hhbmdlX2luY3JlYXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUEJYRmVhdHVyZURpZ2l0VGltZW91dFRvb2x0aXBfY2hhbmdlX2luY3JlYXNlX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9kZWNyZWFzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2NoYW5nZV9kZWNyZWFzZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1BCWEZlYXR1cmVEaWdpdFRpbWVvdXRUb29sdGlwX2Zvb3RlclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBSVFBQb3J0UmFuZ2UgdG9vbHRpcCBjb25maWd1cmF0aW9uIChmb3IgUlRQUG9ydEZyb20gYW5kIFJUUFBvcnRUbylcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFJUUCBwb3J0IHJhbmdlIGZpZWxkc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRSVFBQb3J0UmFuZ2VUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9wdXJwb3NlX21lZGlhLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX3B1cnBvc2VfYmlkaXJlY3Rpb25hbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9wdXJwb3NlX3VuaXF1ZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9kZWZhdWx0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBQb3J0UmFuZ2VUb29sdGlwX2NhbGN1bGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jYWxjdWxhdGlvbl9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF93aGVuX3RvX2NoYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX2luY3JlYXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfaW5jcmVhc2VfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfY3VzdG9tLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQUG9ydFJhbmdlVG9vbHRpcF9jaGFuZ2VfY3VzdG9tX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX25hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfY2hhbmdlX25hdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGZvb3RlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFBvcnRSYW5nZVRvb2x0aXBfZm9vdGVyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFJUUFN0dW5TZXJ2ZXIgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBSVFBTdHVuU2VydmVyIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFJUUFN0dW5TZXJ2ZXJUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3B1cnBvc2VfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3B1cnBvc2VfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfcHVycG9zZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9wdXJwb3NlXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2hvd19pdF93b3JrcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF93aGVuX3RvX3VzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF91c2VfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfdXNlXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX3VzZV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0ODogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19SVFBTdHVuU2VydmVyVG9vbHRpcF9leGFtcGxlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1JUUFN0dW5TZXJ2ZXJUb29sdGlwX2V4YW1wbGVfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZXhhbXBsZV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZm9vdGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfUlRQU3R1blNlcnZlclRvb2x0aXBfZm9vdGVyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUEF1dGhQcmVmaXggdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTSVBBdXRoUHJlZml4IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFNJUEF1dGhQcmVmaXhUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF9ob3dfaXRfd29ya3MsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfd29ya18xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF93b3JrXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dvcmtfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3doZW5fdG9fdXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF91c2VfMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQQXV0aFByZWZpeFRvb2x0aXBfdXNlXzMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3VzZV80XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEF1dGhQcmVmaXhUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBBdXRoUHJlZml4VG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNJUERlZmF1bHRFeHBpcnkgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTSVBEZWZhdWx0RXhwaXJ5IGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFNJUERlZmF1bHRFeHBpcnlUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9wdXJwb3NlX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF9ob3dfaXRfd29ya3MsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfd29ya18xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBEZWZhdWx0RXhwaXJ5VG9vbHRpcF93b3JrXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3dvcmtfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRGVmYXVsdEV4cGlyeVRvb2x0aXBfZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2RlZmF1bHRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX3doZW5fdG9fY2hhbmdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9tb2JpbGUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9zdGFibGUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX2NoYW5nZV9iYXR0ZXJ5XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUERlZmF1bHRFeHBpcnlUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU0lQRXhwaXJ5UmFuZ2UgdG9vbHRpcCBjb25maWd1cmF0aW9uIChjb21iaW5lZCBNaW4gYW5kIE1heClcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFNJUEV4cGlyeVJhbmdlIGZpZWxkc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTSVBFeHBpcnlSYW5nZVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWluX3Byb3RlY3QsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9taW5fZGVmYXVsdCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21pbl9uYXRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21heF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9tYXhfdGltZW91dCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX21heF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfbWF4X3JlZHVjZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY29tbWVuZGF0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX2xvY2FsLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX2ludGVybmV0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfcmVjX21vYmlsZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX3JlY19kZWZhdWx0XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfaG93X2l0X3dvcmtzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU0lQRXhwaXJ5UmFuZ2VUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TSVBFeHBpcnlSYW5nZVRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NJUEV4cGlyeVJhbmdlVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IFNTSEF1dGhvcml6ZWRLZXlzIHRvb2x0aXAgY29uZmlndXJhdGlvblxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU1NIQXV0aG9yaXplZEtleXMgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0U1NIQXV0aG9yaXplZEtleXNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3doYXRfaXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfd2hhdF9pc19kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9ob3dfdG9fYWRkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2FkZF8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfYWRkXzMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9hZGRfNFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX2JlbmVmaXRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9iZW5lZml0XzRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9zZWN1cml0eSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0ODogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hBdXRob3JpemVkS2V5c1Rvb2x0aXBfc2VjdXJpdHlfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3NlY3VyaXR5XzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF9zZWN1cml0eV8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSEF1dGhvcml6ZWRLZXlzVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIQXV0aG9yaXplZEtleXNUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgU1NIX0lEX1JTQV9QVUIgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTU0hfSURfUlNBX1BVQiBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTU0hfSURfUlNBX1BVQlRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfd2hhdF9pcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2FnZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNhZ2VfMyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzYWdlXzRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9nZW5lcmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX2dlbmVyYXRpb25fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9ob3dfdG9fdXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF91c2VfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3VzZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfdXNlXzNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19TU0hfSURfUlNBX1BVQlRvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1NTSF9JRF9SU0FfUFVCVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfU1NIX0lEX1JTQV9QVUJUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgV0VCSFRUUFNQdWJsaWNLZXkgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBXRUJIVFRQU1B1YmxpY0tleSBmaWVsZFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRXRUJIVFRQU1B1YmxpY0tleVRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfd2hhdF9pcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfd2hlcmVfdXNlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9uZ2lueCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX3VzZWRfd2VicnRjLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9hamFtLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfdXNlZF9hcGlcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1B1YmxpY0tleVRvb2x0aXBfb2J0YWluLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fbGV0c2VuY3J5cHQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fY2EsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9vYnRhaW5fc2VsZlxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2NoYWluLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2NoYWluX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHVibGljS2V5VG9vbHRpcF9ub3RlLFxuICAgICAgICAgICAgZm9vdGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQdWJsaWNLZXlUb29sdGlwX2Zvb3RlclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBXRUJIVFRQU1ByaXZhdGVLZXkgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBXRUJIVFRQU1ByaXZhdGVLZXkgZmllbGRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0V0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93aGF0X2lzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF93aGF0X2lzX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3B1cnBvc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9wdXJwb3NlXzEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfcHVycG9zZV8yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3B1cnBvc2VfM1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2Zvcm1hdF9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9zZWN1cml0eV8xLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX3NlY3VyaXR5XzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1dFQkhUVFBTUHJpdmF0ZUtleVRvb2x0aXBfc2VjdXJpdHlfMyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9zZWN1cml0eV80XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2NvbXBhdGliaWxpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5nc19XRUJIVFRQU1ByaXZhdGVLZXlUb29sdGlwX2NvbXBhdGliaWxpdHlfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9ub3RlLFxuICAgICAgICAgICAgZm9vdGVyOiBnbG9iYWxUcmFuc2xhdGUuZ3NfV0VCSFRUUFNQcml2YXRlS2V5VG9vbHRpcF9mb290ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgUGFzc2tleXMgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFBhc3NrZXlzIGZpZWxkXG4gICAgICovXG4gICAgc3RhdGljIGdldFBhc3NrZXlzVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF93aGF0X2lzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX3doYXRfaXNfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF9zdXBwb3J0ZWRfbWV0aG9kcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfbWV0aG9kX2Jpb21ldHJpYyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX21ldGhvZF9oYXJkd2FyZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX21ldGhvZF9wbGF0Zm9ybVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX2FkdmFudGFnZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX2FkdmFudGFnZV9zZWN1cml0eSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX2FkdmFudGFnZV9zcGVlZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX2FkdmFudGFnZV9ub19wYXNzd29yZHMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF9hZHZhbnRhZ2VfdW5pcXVlXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfaG93X3RvX3VzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfdXNlX3N0ZXBfMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX3VzZV9zdGVwXzIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF91c2Vfc3RlcF8zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDg6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfY29tcGF0aWJpbGl0eSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnBrX1Bhc3NrZXlzVG9vbHRpcF9jb21wYXRpYmlsaXR5X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDk6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wa19QYXNza2V5c1Rvb2x0aXBfc2VjdXJpdHlfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUucGtfUGFzc2tleXNUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWFkZXIgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3QgaXRlbXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0KSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjb25maWcubGlzdCkgJiYgY29uZmlnLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzx1bD4nO1xuICAgICAgICAgICAgICAgIGNvbmZpZy5saXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhlYWRlciBpdGVtIHdpdGhvdXQgZGVmaW5pdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWw+YDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZy5saXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIC8vIE9sZCBmb3JtYXQgLSBvYmplY3Qgd2l0aCBrZXktdmFsdWUgcGFpcnNcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhjb25maWcubGlzdCkuZm9yRWFjaCgoW3Rlcm0sIGRlZmluaXRpb25dKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7dGVybX06PC9zdHJvbmc+ICR7ZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBsaXN0cyAobGlzdDIsIGxpc3QzLCBldGMuKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0TmFtZSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3ROYW1lXSAmJiBjb25maWdbbGlzdE5hbWVdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBjb25maWdbbGlzdE5hbWVdLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB3YXJuaW5nIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPmA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gY29uZmlnLndhcm5pbmcuaGVhZGVyO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGNvbmZpZy53YXJuaW5nLnRleHQ7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29kZSBleGFtcGxlcyBpZiBleGlzdFxuICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke2NvbmZpZy5leGFtcGxlc0hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODsgYm9yZGVyOiAxcHggc29saWQgI2UwZTBlMDtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTsgbGluZS1oZWlnaHQ6IDEuNGVtO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByb2Nlc3MgZXhhbXBsZXMgd2l0aCBzeW50YXggaGlnaGxpZ2h0aW5nIGZvciBzZWN0aW9uc1xuICAgICAgICAgICAgY29uZmlnLmV4YW1wbGVzLmZvckVhY2goKGV4YW1wbGUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXNjYXBlZEV4YW1wbGUgPSB0aGlzLmVzY2FwZUh0bWwoZXhhbXBsZSk7XG4gICAgICAgICAgICAgICAgaWYgKGV4YW1wbGUuc3RhcnRzV2l0aCgnWycpICYmIGV4YW1wbGUuZW5kc1dpdGgoJ10nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8c3BhbiBzdHlsZT1cImNvbG9yOiAjMjE4NWQwOyBmb250LXdlaWdodDogYm9sZDtcIj4ke2VzY2FwZWRFeGFtcGxlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXhhbXBsZS5pbmNsdWRlcygnPScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEtleS12YWx1ZSBwYWlyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IFtrZXksIHZhbHVlXSA9IGV4YW1wbGUuc3BsaXQoJz0nKS5tYXAocyA9PiBzLnRyaW0oKSk7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICNlOTFlNjM7XCI+JHt0aGlzLmVzY2FwZUh0bWwoa2V5KX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnID0gJztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzIxYmE0NTtcIj4ke3RoaXMuZXNjYXBlSHRtbCh2YWx1ZSB8fCAnJyl9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVndWxhciB0ZXh0IG9yIGVtcHR5IGxpbmVcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBlc2NhcGVkRXhhbXBsZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgY29uZmlnLmV4YW1wbGVzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnXFxuJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub3RlIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwIGNsYXNzPVwidWkgc21hbGxcIiBzdHlsZT1cIm1hcmdpbi10b3A6IDEwcHg7XCI+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgc3RhdGljIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBtYXAgPSB7XG4gICAgICAgICAgICAnJic6ICcmYW1wOycsXG4gICAgICAgICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICAgICAgICc+JzogJyZndDsnLFxuICAgICAgICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICAgICAgICBcIidcIjogJyYjMDM5OydcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIFN0cmluZyh0ZXh0KS5yZXBsYWNlKC9bJjw+XCInXS9nLCBtID0+IG1hcFttXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgZ2VuZXJhbCBzZXR0aW5ncyB0b29sdGlwc1xuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgYnVpbGRzIHRoZSBjb21wbGV0ZSB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGFuZCBhdHRhY2hlc1xuICAgICAqIHRoZW0gdG8gdGhlIGNvcnJlc3BvbmRpbmcgZmllbGQgaWNvbnMgdXNpbmcgVG9vbHRpcEJ1aWxkZXIgZm9yIHByb3BlciBldmVudCBoYW5kbGluZy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIFRvb2x0aXBCdWlsZGVyIGlzIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlLCBmYWxsaW5nIGJhY2sgdG8gZGlyZWN0IHBvcHVwIGluaXRpYWxpemF0aW9uJyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHRoaXMuZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIGVhY2ggdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgaHRtbENvbmZpZ3MgPSB7fTtcbiAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyh0b29sdGlwQ29uZmlncykuZm9yRWFjaCgoW2ZpZWxkTmFtZSwgY29uZmlnXSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBodG1sQ29uZmlnc1tmaWVsZE5hbWVdID0gdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZyk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXAgZm9yIGVhY2ggZmllbGQgaW5mbyBpY29uIChmYWxsYmFjaylcbiAgICAgICAgICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gaHRtbENvbmZpZ3NbZmllbGROYW1lXTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb246ICdjbGljaycgIC8vIFNob3cgb24gY2xpY2sgZm9yIGJldHRlciBjb250cm9sXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgZm9yIHByb3BlciBldmVudCBoYW5kbGluZ1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5nZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKTtcblxuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgZWFjaCB0b29sdGlwIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBodG1sQ29uZmlncyA9IHt9O1xuICAgICAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKHRvb2x0aXBDb25maWdzKS5mb3JFYWNoKChbZmllbGROYW1lLCBjb25maWddKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWxDb25maWdzW2ZpZWxkTmFtZV0gPSB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQoY29uZmlnKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdXNpbmcgVG9vbHRpcEJ1aWxkZXIgd2hpY2ggaW5jbHVkZXMgY2xpY2sgcHJldmVudGlvblxuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUoaHRtbENvbmZpZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dEZWxheTogMzAwLFxuICAgICAgICAgICAgICAgICAgICBoaWRlRGVsYXk6IDEwMCxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIGdlbmVyYWwgc2V0dGluZ3MgdG9vbHRpcHM6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHNwZWNpZmljIHRvb2x0aXAgY29udGVudFxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSB0byB1cGRhdGVcbiAgICAgKiBAcGFyYW0ge09iamVjdHxzdHJpbmd9IHRvb2x0aXBEYXRhIC0gTmV3IHRvb2x0aXAgZGF0YSBvciBIVE1MIGNvbnRlbnRcbiAgICAgKi9cbiAgICBzdGF0aWMgdXBkYXRlVG9vbHRpcChmaWVsZE5hbWUsIHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Rvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLnVwZGF0ZShmaWVsZE5hbWUsIHRvb2x0aXBEYXRhKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgdG9vbHRpcCBmb3IgZmllbGQgJyR7ZmllbGROYW1lfSc6YCwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBhbGwgZ2VuZXJhbCBzZXR0aW5ncyB0b29sdGlwc1xuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NlbGVjdG9yPScuZmllbGQtaW5mby1pY29uJ10gLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBzdGF0aWMgZGVzdHJveShzZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBUb29sdGlwQnVpbGRlci5kZXN0cm95KHNlbGVjdG9yKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZXN0cm95IGdlbmVyYWwgc2V0dGluZ3MgdG9vbHRpcHM6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEdlbmVyYWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyO1xufSJdfQ==