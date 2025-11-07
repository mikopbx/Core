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
class GeneralSettingsTooltipManager {
    /**
     * Private constructor to prevent instantiation
     * This class uses static methods for utility functionality
     */
    constructor() {
        throw new Error('GeneralSettingsTooltipManager is a static class and cannot be instantiated');
    }

    /**
     * Get all tooltip configurations for general settings
     * 
     * @static
     * @returns {Object} Tooltip configurations for general settings fields
     */
    static getTooltipConfigurations() {
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
    static getRestartEveryNightTooltip() {
        return {
            header: globalTranslate.gs_RestartEveryNightTooltip_header,
            description: globalTranslate.gs_RestartEveryNightTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_RestartEveryNightTooltip_when,
                    definition: globalTranslate.gs_RestartEveryNightTooltip_when_desc
                },
                {
                    term: globalTranslate.gs_RestartEveryNightTooltip_benefits,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_RestartEveryNightTooltip_benefit_memory,
                globalTranslate.gs_RestartEveryNightTooltip_benefit_stability
            ],
            list3: [
                {
                    term: globalTranslate.gs_RestartEveryNightTooltip_drawbacks,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.gs_RestartEveryNightTooltip_drawback_calls,
                globalTranslate.gs_RestartEveryNightTooltip_drawback_registration
            ],
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
    static getSendMetricsTooltip() {
        return {
            header: globalTranslate.gs_SendMetricsTooltip_header,
            description: globalTranslate.gs_SendMetricsTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_SendMetricsTooltip_purpose,
                    definition: globalTranslate.gs_SendMetricsTooltip_purpose_desc
                },
                {
                    term: globalTranslate.gs_SendMetricsTooltip_what_collected,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_SendMetricsTooltip_collected_errors,
                globalTranslate.gs_SendMetricsTooltip_collected_crashes,
                globalTranslate.gs_SendMetricsTooltip_collected_performance,
                globalTranslate.gs_SendMetricsTooltip_collected_version,
                globalTranslate.gs_SendMetricsTooltip_collected_environment
            ],
            list3: [
                {
                    term: globalTranslate.gs_SendMetricsTooltip_benefits,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.gs_SendMetricsTooltip_benefit_quick_fixes,
                globalTranslate.gs_SendMetricsTooltip_benefit_stability,
                globalTranslate.gs_SendMetricsTooltip_benefit_support
            ],
            list5: [
                {
                    term: globalTranslate.gs_SendMetricsTooltip_privacy,
                    definition: globalTranslate.gs_SendMetricsTooltip_privacy_desc
                }
            ],
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
    static getAllowGuestCallsTooltip() {
        return {
            header: globalTranslate.gs_AllowGuestCallsTooltip_header,
            description: globalTranslate.gs_AllowGuestCallsTooltip_desc,
            warning: {
                header: globalTranslate.gs_AllowGuestCallsTooltip_warning_header,
                text: globalTranslate.gs_AllowGuestCallsTooltip_warning
            },
            list: [
                {
                    term: globalTranslate.gs_AllowGuestCallsTooltip_when_enable,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_AllowGuestCallsTooltip_enable_anonymous,
                globalTranslate.gs_AllowGuestCallsTooltip_enable_intercom,
                globalTranslate.gs_AllowGuestCallsTooltip_enable_doorphone,
                globalTranslate.gs_AllowGuestCallsTooltip_enable_public
            ],
            list3: [
                {
                    term: globalTranslate.gs_AllowGuestCallsTooltip_technical,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.gs_AllowGuestCallsTooltip_technical_endpoint,
                globalTranslate.gs_AllowGuestCallsTooltip_technical_context,
                globalTranslate.gs_AllowGuestCallsTooltip_technical_module
            ],
            list5: [
                {
                    term: globalTranslate.gs_AllowGuestCallsTooltip_security,
                    definition: globalTranslate.gs_AllowGuestCallsTooltip_security_desc
                }
            ],
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
    static getPBXLanguageTooltip() {
        return {
            header: globalTranslate.gs_PBXLanguageTooltip_header,
            description: globalTranslate.gs_PBXLanguageTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_PBXLanguageTooltip_affects,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_PBXLanguageTooltip_affects_voice,
                globalTranslate.gs_PBXLanguageTooltip_affects_prompts,
                globalTranslate.gs_PBXLanguageTooltip_affects_ivr,
                globalTranslate.gs_PBXLanguageTooltip_affects_voicemail
            ],
            list3: [
                {
                    term: globalTranslate.gs_PBXLanguageTooltip_restart,
                    definition: globalTranslate.gs_PBXLanguageTooltip_restart_desc
                }
            ],
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
    static getPBXInternalExtensionLengthTooltip() {
        return {
            header: globalTranslate.gs_PBXInternalExtensionLengthTooltip_header,
            description: globalTranslate.gs_PBXInternalExtensionLengthTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_PBXInternalExtensionLengthTooltip_affects,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_PBXInternalExtensionLengthTooltip_affects_new,
                globalTranslate.gs_PBXInternalExtensionLengthTooltip_affects_validation,
                globalTranslate.gs_PBXInternalExtensionLengthTooltip_affects_search
            ],
            list3: [
                {
                    term: globalTranslate.gs_PBXInternalExtensionLengthTooltip_examples,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.gs_PBXInternalExtensionLengthTooltip_example_3,
                globalTranslate.gs_PBXInternalExtensionLengthTooltip_example_4,
                globalTranslate.gs_PBXInternalExtensionLengthTooltip_example_5
            ],
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
    static getManualTimeSettingsTooltip() {
        return {
            header: globalTranslate.gs_ManualTimeSettingsTooltip_header,
            description: globalTranslate.gs_ManualTimeSettingsTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_ManualTimeSettingsTooltip_auto,
                    definition: globalTranslate.gs_ManualTimeSettingsTooltip_auto_desc
                },
                {
                    term: globalTranslate.gs_ManualTimeSettingsTooltip_manual,
                    definition: globalTranslate.gs_ManualTimeSettingsTooltip_manual_desc
                }
            ],
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
    static getRecordCallsTooltip() {
        return {
            header: globalTranslate.gs_RecordCallsTooltip_header,
            description: globalTranslate.gs_RecordCallsTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_RecordCallsTooltip_storage,
                    definition: globalTranslate.gs_RecordCallsTooltip_storage_desc
                },
                {
                    term: globalTranslate.gs_RecordCallsTooltip_legal,
                    definition: globalTranslate.gs_RecordCallsTooltip_legal_desc
                }
            ],
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
    static getRecordCallsInnerTooltip() {
        return {
            header: globalTranslate.gs_RecordCallsInnerTooltip_header,
            description: globalTranslate.gs_RecordCallsInnerTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_RecordCallsInnerTooltip_usage,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_RecordCallsInnerTooltip_usage_training,
                globalTranslate.gs_RecordCallsInnerTooltip_usage_quality,
                globalTranslate.gs_RecordCallsInnerTooltip_usage_security
            ],
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
    static getUseWebRTCTooltip() {
        return {
            header: globalTranslate.gs_UseWebRTCTooltip_header,
            description: globalTranslate.gs_UseWebRTCTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_UseWebRTCTooltip_benefits,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_UseWebRTCTooltip_benefit_browser,
                globalTranslate.gs_UseWebRTCTooltip_benefit_no_software,
                globalTranslate.gs_UseWebRTCTooltip_benefit_encryption
            ],
            list3: [
                {
                    term: globalTranslate.gs_UseWebRTCTooltip_requirements,
                    definition: globalTranslate.gs_UseWebRTCTooltip_requirements_desc
                }
            ]
        };
    }

    /**
     * Get RedirectToHttps tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for RedirectToHttps field
     */
    static getRedirectToHttpsTooltip() {
        return {
            header: globalTranslate.gs_RedirectToHttpsTooltip_header,
            description: globalTranslate.gs_RedirectToHttpsTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_RedirectToHttpsTooltip_security,
                    definition: globalTranslate.gs_RedirectToHttpsTooltip_security_desc
                },
                {
                    term: globalTranslate.gs_RedirectToHttpsTooltip_certificate,
                    definition: globalTranslate.gs_RedirectToHttpsTooltip_certificate_desc
                }
            ],
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
    static getSSHDisablePasswordLoginsTooltip() {
        return {
            header: globalTranslate.gs_SSHDisablePasswordLoginsTooltip_header,
            description: globalTranslate.gs_SSHDisablePasswordLoginsTooltip_desc,
            warning: {
                header: globalTranslate.gs_SSHDisablePasswordLoginsTooltip_warning_header,
                text: globalTranslate.gs_SSHDisablePasswordLoginsTooltip_warning
            },
            list: [
                {
                    term: globalTranslate.gs_SSHDisablePasswordLoginsTooltip_benefits,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_SSHDisablePasswordLoginsTooltip_benefit_security,
                globalTranslate.gs_SSHDisablePasswordLoginsTooltip_benefit_bruteforce,
                globalTranslate.gs_SSHDisablePasswordLoginsTooltip_benefit_compliance
            ]
        };
    }

    /**
     * Get AJAMEnabled tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for AJAMEnabled field
     */
    static getAJAMEnabledTooltip() {
        return {
            header: globalTranslate.gs_AJAMEnabledTooltip_header,
            description: globalTranslate.gs_AJAMEnabledTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_AJAMEnabledTooltip_what_is,
                    definition: globalTranslate.gs_AJAMEnabledTooltip_what_is_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.gs_AJAMEnabledTooltip_usage,
                    definition: null
                }
            ],
            list3: [
                globalTranslate.gs_AJAMEnabledTooltip_usage_webapps,
                globalTranslate.gs_AJAMEnabledTooltip_usage_panels,
                globalTranslate.gs_AJAMEnabledTooltip_usage_widgets,
                globalTranslate.gs_AJAMEnabledTooltip_usage_monitoring
            ],
            list4: [
                {
                    term: globalTranslate.gs_AJAMEnabledTooltip_protocols,
                    definition: globalTranslate.gs_AJAMEnabledTooltip_protocols_desc
                }
            ],
            list5: [
                {
                    term: globalTranslate.gs_AJAMEnabledTooltip_default,
                    definition: globalTranslate.gs_AJAMEnabledTooltip_default_desc
                }
            ],
            list6: [
                {
                    term: globalTranslate.gs_AJAMEnabledTooltip_when_disable,
                    definition: null
                }
            ],
            list7: [
                globalTranslate.gs_AJAMEnabledTooltip_disable_1,
                globalTranslate.gs_AJAMEnabledTooltip_disable_2,
                globalTranslate.gs_AJAMEnabledTooltip_disable_3
            ],
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
    static getAMIEnabledTooltip() {
        return {
            header: globalTranslate.gs_AMIEnabledTooltip_header,
            description: globalTranslate.gs_AMIEnabledTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_AMIEnabledTooltip_what_is,
                    definition: globalTranslate.gs_AMIEnabledTooltip_what_is_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.gs_AMIEnabledTooltip_usage,
                    definition: null
                }
            ],
            list3: [
                globalTranslate.gs_AMIEnabledTooltip_usage_monitoring,
                globalTranslate.gs_AMIEnabledTooltip_usage_integration,
                globalTranslate.gs_AMIEnabledTooltip_usage_control,
                globalTranslate.gs_AMIEnabledTooltip_usage_events,
                globalTranslate.gs_AMIEnabledTooltip_usage_commands
            ],
            list4: [
                {
                    term: globalTranslate.gs_AMIEnabledTooltip_examples,
                    definition: null
                }
            ],
            list5: [
                globalTranslate.gs_AMIEnabledTooltip_example_crm,
                globalTranslate.gs_AMIEnabledTooltip_example_wallboard,
                globalTranslate.gs_AMIEnabledTooltip_example_cti,
                globalTranslate.gs_AMIEnabledTooltip_example_reporting
            ],
            list6: [
                {
                    term: globalTranslate.gs_AMIEnabledTooltip_default,
                    definition: globalTranslate.gs_AMIEnabledTooltip_default_desc
                }
            ],
            list7: [
                {
                    term: globalTranslate.gs_AMIEnabledTooltip_when_disable,
                    definition: null
                }
            ],
            list8: [
                globalTranslate.gs_AMIEnabledTooltip_disable_1,
                globalTranslate.gs_AMIEnabledTooltip_disable_2,
                globalTranslate.gs_AMIEnabledTooltip_disable_3
            ],
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
    static getARIEnabledTooltip() {
        return {
            header: globalTranslate.gs_ARIEnabledTooltip_header,
            description: globalTranslate.gs_ARIEnabledTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_ARIEnabledTooltip_what_is,
                    definition: globalTranslate.gs_ARIEnabledTooltip_what_is_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.gs_ARIEnabledTooltip_usage,
                    definition: null
                }
            ],
            list3: [
                globalTranslate.gs_ARIEnabledTooltip_usage_webrtc,
                globalTranslate.gs_ARIEnabledTooltip_usage_ivr,
                globalTranslate.gs_ARIEnabledTooltip_usage_conference,
                globalTranslate.gs_ARIEnabledTooltip_usage_recording,
                globalTranslate.gs_ARIEnabledTooltip_usage_custom
            ],
            list4: [
                {
                    term: globalTranslate.gs_ARIEnabledTooltip_examples,
                    definition: null
                }
            ],
            list5: [
                globalTranslate.gs_ARIEnabledTooltip_example_webphone,
                globalTranslate.gs_ARIEnabledTooltip_example_bot,
                globalTranslate.gs_ARIEnabledTooltip_example_queue,
                globalTranslate.gs_ARIEnabledTooltip_example_analytics
            ],
            list6: [
                {
                    term: globalTranslate.gs_ARIEnabledTooltip_default,
                    definition: globalTranslate.gs_ARIEnabledTooltip_default_desc
                }
            ],
            list7: [
                {
                    term: globalTranslate.gs_ARIEnabledTooltip_when_enable,
                    definition: null
                }
            ],
            list8: [
                globalTranslate.gs_ARIEnabledTooltip_enable_1,
                globalTranslate.gs_ARIEnabledTooltip_enable_2,
                globalTranslate.gs_ARIEnabledTooltip_enable_3
            ],
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
    static getARIAllowedOriginsTooltip() {
        return {
            header: globalTranslate.gs_ARIAllowedOriginsTooltip_header,
            description: globalTranslate.gs_ARIAllowedOriginsTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_ARIAllowedOriginsTooltip_what_is,
                    definition: globalTranslate.gs_ARIAllowedOriginsTooltip_what_is_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.gs_ARIAllowedOriginsTooltip_format,
                    definition: globalTranslate.gs_ARIAllowedOriginsTooltip_format_desc
                }
            ],
            list3: [
                {
                    term: globalTranslate.gs_ARIAllowedOriginsTooltip_examples,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.gs_ARIAllowedOriginsTooltip_example_1,
                globalTranslate.gs_ARIAllowedOriginsTooltip_example_2,
                globalTranslate.gs_ARIAllowedOriginsTooltip_example_3
            ],
            list5: [
                {
                    term: globalTranslate.gs_ARIAllowedOriginsTooltip_security,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.gs_ARIAllowedOriginsTooltip_security_1,
                globalTranslate.gs_ARIAllowedOriginsTooltip_security_2,
                globalTranslate.gs_ARIAllowedOriginsTooltip_security_3
            ],
            list7: [
                {
                    term: globalTranslate.gs_ARIAllowedOriginsTooltip_default,
                    definition: globalTranslate.gs_ARIAllowedOriginsTooltip_default_desc
                }
            ],
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
    static getPBXCallParkingExtTooltip() {
        return {
            header: globalTranslate.gs_PBXCallParkingExtTooltip_header,
            description: globalTranslate.gs_PBXCallParkingExtTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_PBXCallParkingExtTooltip_how,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_PBXCallParkingExtTooltip_how_dial,
                globalTranslate.gs_PBXCallParkingExtTooltip_how_announce,
                globalTranslate.gs_PBXCallParkingExtTooltip_how_retrieve
            ],
            list3: [
                {
                    term: globalTranslate.gs_PBXCallParkingExtTooltip_slots,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.gs_PBXCallParkingExtTooltip_slots_range,
                globalTranslate.gs_PBXCallParkingExtTooltip_slots_capacity,
                globalTranslate.gs_PBXCallParkingExtTooltip_slots_automatic
            ],
            list5: [
                {
                    term: globalTranslate.gs_PBXCallParkingExtTooltip_example,
                    definition: globalTranslate.gs_PBXCallParkingExtTooltip_example_desc
                }
            ],
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
    static getPBXFeatureAttendedTransferTooltip() {
        return {
            header: globalTranslate.gs_PBXFeatureAttendedTransferTooltip_header,
            description: globalTranslate.gs_PBXFeatureAttendedTransferTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_PBXFeatureAttendedTransferTooltip_how,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_PBXFeatureAttendedTransferTooltip_how_press,
                globalTranslate.gs_PBXFeatureAttendedTransferTooltip_how_dial,
                globalTranslate.gs_PBXFeatureAttendedTransferTooltip_how_talk,
                globalTranslate.gs_PBXFeatureAttendedTransferTooltip_how_complete
            ],
            list3: [
                {
                    term: globalTranslate.gs_PBXFeatureAttendedTransferTooltip_benefits,
                    definition: globalTranslate.gs_PBXFeatureAttendedTransferTooltip_benefits_desc
                }
            ],
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
    static getPBXFeatureBlindTransferTooltip() {
        return {
            header: globalTranslate.gs_PBXFeatureBlindTransferTooltip_header,
            description: globalTranslate.gs_PBXFeatureBlindTransferTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_PBXFeatureBlindTransferTooltip_how,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_PBXFeatureBlindTransferTooltip_how_press,
                globalTranslate.gs_PBXFeatureBlindTransferTooltip_how_dial,
                globalTranslate.gs_PBXFeatureBlindTransferTooltip_how_hangup
            ],
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
    static getPBXFeaturePickupExtenTooltip() {
        return {
            header: globalTranslate.gs_PBXFeaturePickupExtenTooltip_header,
            description: globalTranslate.gs_PBXFeaturePickupExtenTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_PBXFeaturePickupExtenTooltip_types,
                    definition: null
                }
            ],
            list2: [
                {
                    term: globalTranslate.gs_PBXFeaturePickupExtenTooltip_type_general,
                    definition: globalTranslate.gs_PBXFeaturePickupExtenTooltip_type_general_desc
                },
                {
                    term: globalTranslate.gs_PBXFeaturePickupExtenTooltip_type_directed,
                    definition: globalTranslate.gs_PBXFeaturePickupExtenTooltip_type_directed_desc
                }
            ],
            list3: [
                {
                    term: globalTranslate.gs_PBXFeaturePickupExtenTooltip_usage,
                    definition: globalTranslate.gs_PBXFeaturePickupExtenTooltip_usage_desc
                }
            ]
        };
    }

    /**
     * Get PBXFeatureAtxferNoAnswerTimeout tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXFeatureAtxferNoAnswerTimeout field
     */
    static getPBXFeatureAtxferNoAnswerTimeoutTooltip() {
        return {
            header: globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_header,
            description: globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_scenario,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_scenario_1,
                globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_scenario_2,
                globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_scenario_3
            ],
            list3: [
                {
                    term: globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_default,
                    definition: globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_default_desc
                }
            ],
            list4: [
                {
                    term: globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_recommendations,
                    definition: null
                }
            ],
            list5: [
                globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_rec_standard,
                globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_rec_quick,
                globalTranslate.gs_PBXFeatureAtxferNoAnswerTimeoutTooltip_rec_extended
            ]
        };
    }

    /**
     * Get PBXFeatureDigitTimeout tooltip configuration
     * 
     * @private
     * @static
     * @returns {Object} Tooltip configuration for PBXFeatureDigitTimeout field
     */
    static getPBXFeatureDigitTimeoutTooltip() {
        return {
            header: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_header,
            description: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_usage,
                    definition: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_usage_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_default,
                    definition: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_default_desc
                }
            ],
            list3: [
                {
                    term: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_when_to_change,
                    definition: null
                }
            ],
            list4: [
                {
                    term: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_change_increase,
                    definition: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_change_increase_desc
                },
                {
                    term: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_change_decrease,
                    definition: globalTranslate.gs_PBXFeatureDigitTimeoutTooltip_change_decrease_desc
                }
            ],
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
    static getRTPPortRangeTooltip() {
        return {
            header: globalTranslate.gs_RTPPortRangeTooltip_header,
            description: globalTranslate.gs_RTPPortRangeTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_RTPPortRangeTooltip_purpose,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_RTPPortRangeTooltip_purpose_media,
                globalTranslate.gs_RTPPortRangeTooltip_purpose_bidirectional,
                globalTranslate.gs_RTPPortRangeTooltip_purpose_unique
            ],
            list3: [
                {
                    term: globalTranslate.gs_RTPPortRangeTooltip_default,
                    definition: globalTranslate.gs_RTPPortRangeTooltip_default_desc
                }
            ],
            list4: [
                {
                    term: globalTranslate.gs_RTPPortRangeTooltip_calculation,
                    definition: globalTranslate.gs_RTPPortRangeTooltip_calculation_desc
                }
            ],
            list5: [
                {
                    term: globalTranslate.gs_RTPPortRangeTooltip_when_to_change,
                    definition: null
                }
            ],
            list6: [
                {
                    term: globalTranslate.gs_RTPPortRangeTooltip_change_increase,
                    definition: globalTranslate.gs_RTPPortRangeTooltip_change_increase_desc
                },
                {
                    term: globalTranslate.gs_RTPPortRangeTooltip_change_custom,
                    definition: globalTranslate.gs_RTPPortRangeTooltip_change_custom_desc
                },
                {
                    term: globalTranslate.gs_RTPPortRangeTooltip_change_nat,
                    definition: globalTranslate.gs_RTPPortRangeTooltip_change_nat_desc
                }
            ],
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
    static getRTPStunServerTooltip() {
        return {
            header: globalTranslate.gs_RTPStunServerTooltip_header,
            description: globalTranslate.gs_RTPStunServerTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_RTPStunServerTooltip_purpose_header,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.gs_RTPStunServerTooltip_purpose_1,
                globalTranslate.gs_RTPStunServerTooltip_purpose_2,
                globalTranslate.gs_RTPStunServerTooltip_purpose_3
            ],
            list3: [
                {
                    term: globalTranslate.gs_RTPStunServerTooltip_how_it_works,
                    definition: globalTranslate.gs_RTPStunServerTooltip_how_it_works_desc
                }
            ],
            list4: [
                {
                    term: globalTranslate.gs_RTPStunServerTooltip_format,
                    definition: globalTranslate.gs_RTPStunServerTooltip_format_desc
                }
            ],
            list5: [
                {
                    term: globalTranslate.gs_RTPStunServerTooltip_when_to_use,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.gs_RTPStunServerTooltip_use_1,
                globalTranslate.gs_RTPStunServerTooltip_use_2,
                globalTranslate.gs_RTPStunServerTooltip_use_3
            ],
            list7: [
                {
                    term: globalTranslate.gs_RTPStunServerTooltip_examples,
                    definition: null
                }
            ],
            list8: [
                globalTranslate.gs_RTPStunServerTooltip_example_1,
                globalTranslate.gs_RTPStunServerTooltip_example_2,
                globalTranslate.gs_RTPStunServerTooltip_example_3
            ],
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
    static getSIPAuthPrefixTooltip() {
        return {
            header: globalTranslate.gs_SIPAuthPrefixTooltip_header,
            description: globalTranslate.gs_SIPAuthPrefixTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_SIPAuthPrefixTooltip_purpose,
                    definition: globalTranslate.gs_SIPAuthPrefixTooltip_purpose_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.gs_SIPAuthPrefixTooltip_how_it_works,
                    definition: null
                }
            ],
            list3: [
                globalTranslate.gs_SIPAuthPrefixTooltip_work_1,
                globalTranslate.gs_SIPAuthPrefixTooltip_work_2,
                globalTranslate.gs_SIPAuthPrefixTooltip_work_3
            ],
            list4: [
                {
                    term: globalTranslate.gs_SIPAuthPrefixTooltip_default,
                    definition: globalTranslate.gs_SIPAuthPrefixTooltip_default_desc
                }
            ],
            list5: [
                {
                    term: globalTranslate.gs_SIPAuthPrefixTooltip_when_to_use,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.gs_SIPAuthPrefixTooltip_use_1,
                globalTranslate.gs_SIPAuthPrefixTooltip_use_2,
                globalTranslate.gs_SIPAuthPrefixTooltip_use_3,
                globalTranslate.gs_SIPAuthPrefixTooltip_use_4
            ],
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
    static getSIPDefaultExpiryTooltip() {
        return {
            header: globalTranslate.gs_SIPDefaultExpiryTooltip_header,
            description: globalTranslate.gs_SIPDefaultExpiryTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_SIPDefaultExpiryTooltip_purpose,
                    definition: globalTranslate.gs_SIPDefaultExpiryTooltip_purpose_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.gs_SIPDefaultExpiryTooltip_how_it_works,
                    definition: null
                }
            ],
            list3: [
                globalTranslate.gs_SIPDefaultExpiryTooltip_work_1,
                globalTranslate.gs_SIPDefaultExpiryTooltip_work_2,
                globalTranslate.gs_SIPDefaultExpiryTooltip_work_3
            ],
            list4: [
                {
                    term: globalTranslate.gs_SIPDefaultExpiryTooltip_default,
                    definition: globalTranslate.gs_SIPDefaultExpiryTooltip_default_desc
                }
            ],
            list5: [
                {
                    term: globalTranslate.gs_SIPDefaultExpiryTooltip_when_to_change,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.gs_SIPDefaultExpiryTooltip_change_mobile,
                globalTranslate.gs_SIPDefaultExpiryTooltip_change_stable,
                globalTranslate.gs_SIPDefaultExpiryTooltip_change_battery
            ],
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
    static getSIPExpiryRangeTooltip() {
        return {
            header: globalTranslate.gs_SIPExpiryRangeTooltip_header,
            description: globalTranslate.gs_SIPExpiryRangeTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_SIPExpiryRangeTooltip_min_header,
                    definition: globalTranslate.gs_SIPExpiryRangeTooltip_min_desc
                }
            ],
            list2: [
                globalTranslate.gs_SIPExpiryRangeTooltip_min_protect,
                globalTranslate.gs_SIPExpiryRangeTooltip_min_default,
                globalTranslate.gs_SIPExpiryRangeTooltip_min_nat
            ],
            list3: [
                {
                    term: globalTranslate.gs_SIPExpiryRangeTooltip_max_header,
                    definition: globalTranslate.gs_SIPExpiryRangeTooltip_max_desc
                }
            ],
            list4: [
                globalTranslate.gs_SIPExpiryRangeTooltip_max_timeout,
                globalTranslate.gs_SIPExpiryRangeTooltip_max_default,
                globalTranslate.gs_SIPExpiryRangeTooltip_max_reduce
            ],
            list5: [
                {
                    term: globalTranslate.gs_SIPExpiryRangeTooltip_recommendations,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.gs_SIPExpiryRangeTooltip_rec_local,
                globalTranslate.gs_SIPExpiryRangeTooltip_rec_internet,
                globalTranslate.gs_SIPExpiryRangeTooltip_rec_mobile,
                globalTranslate.gs_SIPExpiryRangeTooltip_rec_default
            ],
            list7: [
                {
                    term: globalTranslate.gs_SIPExpiryRangeTooltip_how_it_works,
                    definition: globalTranslate.gs_SIPExpiryRangeTooltip_how_it_works_desc
                }
            ],
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
    static getSSHAuthorizedKeysTooltip() {
        return {
            header: globalTranslate.gs_SSHAuthorizedKeysTooltip_header,
            description: globalTranslate.gs_SSHAuthorizedKeysTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_SSHAuthorizedKeysTooltip_what_is,
                    definition: globalTranslate.gs_SSHAuthorizedKeysTooltip_what_is_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.gs_SSHAuthorizedKeysTooltip_format,
                    definition: globalTranslate.gs_SSHAuthorizedKeysTooltip_format_desc
                }
            ],
            list3: [
                {
                    term: globalTranslate.gs_SSHAuthorizedKeysTooltip_how_to_add,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.gs_SSHAuthorizedKeysTooltip_add_1,
                globalTranslate.gs_SSHAuthorizedKeysTooltip_add_2,
                globalTranslate.gs_SSHAuthorizedKeysTooltip_add_3,
                globalTranslate.gs_SSHAuthorizedKeysTooltip_add_4
            ],
            list5: [
                {
                    term: globalTranslate.gs_SSHAuthorizedKeysTooltip_benefits,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.gs_SSHAuthorizedKeysTooltip_benefit_1,
                globalTranslate.gs_SSHAuthorizedKeysTooltip_benefit_2,
                globalTranslate.gs_SSHAuthorizedKeysTooltip_benefit_3,
                globalTranslate.gs_SSHAuthorizedKeysTooltip_benefit_4
            ],
            list7: [
                {
                    term: globalTranslate.gs_SSHAuthorizedKeysTooltip_security,
                    definition: null
                }
            ],
            list8: [
                globalTranslate.gs_SSHAuthorizedKeysTooltip_security_1,
                globalTranslate.gs_SSHAuthorizedKeysTooltip_security_2,
                globalTranslate.gs_SSHAuthorizedKeysTooltip_security_3
            ],
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
    static getSSH_ID_RSA_PUBTooltip() {
        return {
            header: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_header,
            description: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_what_is,
                    definition: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_what_is_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_usage,
                    definition: null
                }
            ],
            list3: [
                globalTranslate.gs_SSH_ID_RSA_PUBTooltip_usage_1,
                globalTranslate.gs_SSH_ID_RSA_PUBTooltip_usage_2,
                globalTranslate.gs_SSH_ID_RSA_PUBTooltip_usage_3,
                globalTranslate.gs_SSH_ID_RSA_PUBTooltip_usage_4
            ],
            list4: [
                {
                    term: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_generation,
                    definition: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_generation_desc
                }
            ],
            list5: [
                {
                    term: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_how_to_use,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.gs_SSH_ID_RSA_PUBTooltip_use_1,
                globalTranslate.gs_SSH_ID_RSA_PUBTooltip_use_2,
                globalTranslate.gs_SSH_ID_RSA_PUBTooltip_use_3
            ],
            list7: [
                {
                    term: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_format,
                    definition: globalTranslate.gs_SSH_ID_RSA_PUBTooltip_format_desc
                }
            ],
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
    static getWEBHTTPSPublicKeyTooltip() {
        return {
            header: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_header,
            description: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_what_is,
                    definition: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_what_is_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_where_used,
                    definition: null
                }
            ],
            list3: [
                globalTranslate.gs_WEBHTTPSPublicKeyTooltip_used_nginx,
                globalTranslate.gs_WEBHTTPSPublicKeyTooltip_used_webrtc,
                globalTranslate.gs_WEBHTTPSPublicKeyTooltip_used_ajam,
                globalTranslate.gs_WEBHTTPSPublicKeyTooltip_used_api
            ],
            list4: [
                {
                    term: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_format,
                    definition: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_format_desc
                }
            ],
            list5: [
                {
                    term: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_obtain,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.gs_WEBHTTPSPublicKeyTooltip_obtain_letsencrypt,
                globalTranslate.gs_WEBHTTPSPublicKeyTooltip_obtain_ca,
                globalTranslate.gs_WEBHTTPSPublicKeyTooltip_obtain_self
            ],
            list7: [
                {
                    term: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_chain,
                    definition: globalTranslate.gs_WEBHTTPSPublicKeyTooltip_chain_desc
                }
            ],
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
    static getWEBHTTPSPrivateKeyTooltip() {
        return {
            header: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_header,
            description: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_desc,
            list: [
                {
                    term: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_what_is,
                    definition: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_what_is_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_purpose,
                    definition: null
                }
            ],
            list3: [
                globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_purpose_1,
                globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_purpose_2,
                globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_purpose_3
            ],
            list4: [
                {
                    term: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_format,
                    definition: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_format_desc
                }
            ],
            warning: {
                header: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_warning_header,
                text: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_warning
            },
            list5: [
                {
                    term: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_security,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_security_1,
                globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_security_2,
                globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_security_3,
                globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_security_4
            ],
            list7: [
                {
                    term: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_compatibility,
                    definition: globalTranslate.gs_WEBHTTPSPrivateKeyTooltip_compatibility_desc
                }
            ],
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
    static getPasskeysTooltip() {
        return {
            header: globalTranslate.pk_PasskeysTooltip_header,
            description: globalTranslate.pk_PasskeysTooltip_desc,
            list: [
                {
                    term: globalTranslate.pk_PasskeysTooltip_what_is,
                    definition: globalTranslate.pk_PasskeysTooltip_what_is_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.pk_PasskeysTooltip_supported_methods,
                    definition: null
                }
            ],
            list3: [
                globalTranslate.pk_PasskeysTooltip_method_biometric,
                globalTranslate.pk_PasskeysTooltip_method_hardware,
                globalTranslate.pk_PasskeysTooltip_method_platform
            ],
            list4: [
                {
                    term: globalTranslate.pk_PasskeysTooltip_advantages,
                    definition: null
                }
            ],
            list5: [
                globalTranslate.pk_PasskeysTooltip_advantage_security,
                globalTranslate.pk_PasskeysTooltip_advantage_speed,
                globalTranslate.pk_PasskeysTooltip_advantage_no_passwords,
                globalTranslate.pk_PasskeysTooltip_advantage_unique
            ],
            list6: [
                {
                    term: globalTranslate.pk_PasskeysTooltip_how_to_use,
                    definition: null
                }
            ],
            list7: [
                globalTranslate.pk_PasskeysTooltip_use_step_1,
                globalTranslate.pk_PasskeysTooltip_use_step_2,
                globalTranslate.pk_PasskeysTooltip_use_step_3
            ],
            list8: [
                {
                    term: globalTranslate.pk_PasskeysTooltip_compatibility,
                    definition: globalTranslate.pk_PasskeysTooltip_compatibility_desc
                }
            ],
            list9: [
                {
                    term: globalTranslate.pk_PasskeysTooltip_security,
                    definition: globalTranslate.pk_PasskeysTooltip_security_desc
                }
            ],
            note: globalTranslate.pk_PasskeysTooltip_note
        };
    }

    /**
     * Build HTML content for tooltip popup
     * @param {Object} config - Configuration object for tooltip content
     * @returns {string} - HTML string for tooltip content
     */
    static buildTooltipContent(config) {
        if (!config) return '';
        
        let html = '';
        
        // Add header if exists
        if (config.header) {
            html += `<div class="header"><strong>${config.header}</strong></div>`;
            html += '<div class="ui divider"></div>';
        }
        
        // Add description if exists
        if (config.description) {
            html += `<p>${config.description}</p>`;
        }
        
        // Add list items if exist
        if (config.list) {
            if (Array.isArray(config.list) && config.list.length > 0) {
                html += '<ul>';
                config.list.forEach(item => {
                    if (typeof item === 'string') {
                        html += `<li>${item}</li>`;
                    } else if (item.term && item.definition === null) {
                        // Header item without definition
                        html += `</ul><p><strong>${item.term}</strong></p><ul>`;
                    } else if (item.term && item.definition) {
                        html += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                    }
                });
                html += '</ul>';
            } else if (typeof config.list === 'object') {
                // Old format - object with key-value pairs
                html += '<ul>';
                Object.entries(config.list).forEach(([term, definition]) => {
                    html += `<li><strong>${term}:</strong> ${definition}</li>`;
                });
                html += '</ul>';
            }
        }
        
        // Add additional lists (list2, list3, etc.)
        for (let i = 2; i <= 10; i++) {
            const listName = `list${i}`;
            if (config[listName] && config[listName].length > 0) {
                html += '<ul>';
                config[listName].forEach(item => {
                    if (typeof item === 'string') {
                        html += `<li>${item}</li>`;
                    } else if (item.term && item.definition === null) {
                        html += `</ul><p><strong>${item.term}</strong></p><ul>`;
                    } else if (item.term && item.definition) {
                        html += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                    }
                });
                html += '</ul>';
            }
        }
        
        // Add warning if exists
        if (config.warning) {
            html += '<div class="ui small orange message">';
            if (config.warning.header) {
                html += `<div class="header">`;
                html += `<i class="exclamation triangle icon"></i> `;
                html += config.warning.header;
                html += `</div>`;
            }
            html += config.warning.text;
            html += '</div>';
        }
        
        // Add code examples if exist
        if (config.examples && config.examples.length > 0) {
            if (config.examplesHeader) {
                html += `<p><strong>${config.examplesHeader}:</strong></p>`;
            }
            html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
            html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">';
            
            // Process examples with syntax highlighting for sections
            config.examples.forEach((example, index) => {
                const escapedExample = this.escapeHtml(example);
                if (example.startsWith('[') && example.endsWith(']')) {
                    // Section header
                    html += `<span style="color: #2185d0; font-weight: bold;">${escapedExample}</span>`;
                } else if (example.includes('=')) {
                    // Key-value pair
                    const [key, value] = example.split('=').map(s => s.trim());
                    html += `<span style="color: #e91e63;">${this.escapeHtml(key)}</span>`;
                    html += ' = ';
                    html += `<span style="color: #21ba45;">${this.escapeHtml(value || '')}</span>`;
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
        }
        
        // Add note if exists
        if (config.note) {
            html += `<p class="ui small" style="margin-top: 10px;"><em>${config.note}</em></p>`;
        }
        
        return html;
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Initialize all general settings tooltips
     *
     * This method builds the complete tooltip configurations and attaches
     * them to the corresponding field icons using TooltipBuilder for proper event handling.
     *
     * @static
     */
    static initialize() {
        try {
            // Check if TooltipBuilder is available
            if (typeof TooltipBuilder === 'undefined') {
                console.error('TooltipBuilder is not available, falling back to direct popup initialization');

                const tooltipConfigs = this.getTooltipConfigurations();

                // Build HTML content for each tooltip configuration
                const htmlConfigs = {};
                Object.entries(tooltipConfigs).forEach(([fieldName, config]) => {
                    htmlConfigs[fieldName] = this.buildTooltipContent(config);
                });

                // Initialize tooltip for each field info icon (fallback)
                $('.field-info-icon').each((index, element) => {
                    const $icon = $(element);
                    const fieldName = $icon.data('field');
                    const content = htmlConfigs[fieldName];

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
                            on: 'click'  // Show on click for better control
                        });
                    }
                });
            } else {
                // Use TooltipBuilder for proper event handling
                const tooltipConfigs = this.getTooltipConfigurations();

                // Build HTML content for each tooltip configuration
                const htmlConfigs = {};
                Object.entries(tooltipConfigs).forEach(([fieldName, config]) => {
                    htmlConfigs[fieldName] = this.buildTooltipContent(config);
                });

                // Initialize using TooltipBuilder which includes click prevention
                TooltipBuilder.initialize(htmlConfigs, {
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
    static updateTooltip(fieldName, tooltipData) {
        try {
            if (typeof TooltipBuilder === 'undefined') {
                console.error('TooltipBuilder is not available');
                return;
            }
            
            TooltipBuilder.update(fieldName, tooltipData);
        } catch (error) {
            console.error(`Failed to update tooltip for field '${fieldName}':`, error);
        }
    }

    /**
     * Destroy all general settings tooltips
     * 
     * @static
     * @param {string} [selector='.field-info-icon'] - jQuery selector for tooltip icons
     */
    static destroy(selector = '.field-info-icon') {
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeneralSettingsTooltipManager;
}