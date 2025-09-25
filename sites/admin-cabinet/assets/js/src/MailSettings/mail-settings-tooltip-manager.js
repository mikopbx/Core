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

/* global globalTranslate */

/**
 * MailSettingsTooltipManager - Tooltip management for mail settings
 *
 * This class provides tooltip functionality for mail settings form fields,
 * offering comprehensive help and guidance for email configuration.
 *
 * Features:
 * - Static utility class for mail settings tooltips
 * - Consistent tooltip structure following TOOLTIP_GUIDELINES
 * - Integration with existing tooltip builder
 * - Comprehensive field explanations
 *
 * @class MailSettingsTooltipManager
 */
class MailSettingsTooltipManager {
    /**
     * Private constructor to prevent instantiation
     * This class uses static methods for utility functionality
     */
    constructor() {
        throw new Error('MailSettingsTooltipManager is a static class and cannot be instantiated');
    }

    /**
     * Initialize tooltips for mail settings form
     *
     * This method should be called after DOM is ready to attach
     * tooltips to all configured form fields.
     *
     * @static
     * @param {Object} form - The form object containing buildTooltipContent method
     */
    static initializeTooltips(form) {
        if (!form || typeof form.buildTooltipContent !== 'function') {
            console.error('MailSettingsTooltipManager: Invalid form object or missing buildTooltipContent method');
            return;
        }

        // Get all tooltip configurations
        const tooltipConfigs = this.getAllTooltipConfigurations(form);

        // Initialize popup for each icon
        $('.field-info-icon').each((index, element) => {
            const $icon = $(element);
            const fieldName = $icon.data('field');
            const content = tooltipConfigs[fieldName];

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
    }

    /**
     * Get all tooltip configurations for mail settings fields
     *
     * @static
     * @param {Object} form - The form object containing buildTooltipContent method
     * @returns {Object} Object with field names as keys and HTML content as values
     */
    static getAllTooltipConfigurations(form) {
        return {
            'MailEnableNotifications': form.buildTooltipContent(this.getMailEnableNotificationsTooltip()),
            'SystemNotificationsEmail': form.buildTooltipContent(this.getSystemNotificationsEmailTooltip()),
            'SystemEmailForMissed': form.buildTooltipContent(this.getSystemEmailForMissedTooltip()),
            'VoicemailNotificationsEmail': form.buildTooltipContent(this.getVoicemailNotificationsEmailTooltip()),
            'MailSMTPAuthType': form.buildTooltipContent(this.getMailSMTPAuthTypeTooltip()),
            'MailOAuth2ClientId': form.buildTooltipContent(this.getMailOAuth2ClientIdTooltip()),
            'MailSMTPUseTLS': form.buildTooltipContent(this.getMailSMTPUseTLSTooltip()),
            'MailSMTPCertCheck': form.buildTooltipContent(this.getMailSMTPCertCheckTooltip())
        };
    }

    /**
     * Get tooltip configuration for MailEnableNotifications field
     *
     * @private
     * @static
     * @returns {Object} Tooltip configuration for mail notifications toggle
     */
    static getMailEnableNotificationsTooltip() {
        return {
            header: globalTranslate.ms_MailEnableNotificationsTooltip_header,
            description: globalTranslate.ms_MailEnableNotificationsTooltip_desc,
            list: [
                {
                    term: globalTranslate.ms_MailEnableNotificationsTooltip_when_enabled,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.ms_MailEnableNotificationsTooltip_missed_calls,
                globalTranslate.ms_MailEnableNotificationsTooltip_voicemail,
                globalTranslate.ms_MailEnableNotificationsTooltip_system_events,
                globalTranslate.ms_MailEnableNotificationsTooltip_module_notifications
            ],
            list3: [
                {
                    term: globalTranslate.ms_MailEnableNotificationsTooltip_requirements,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.ms_MailEnableNotificationsTooltip_smtp_configured,
                globalTranslate.ms_MailEnableNotificationsTooltip_sender_address,
                globalTranslate.ms_MailEnableNotificationsTooltip_recipient_emails
            ],
            list5: [
                {
                    term: globalTranslate.ms_MailEnableNotificationsTooltip_when_disabled,
                    definition: globalTranslate.ms_MailEnableNotificationsTooltip_when_disabled_desc
                }
            ],
            warning: {
                text: globalTranslate.ms_MailEnableNotificationsTooltip_warning
            },
            note: globalTranslate.ms_MailEnableNotificationsTooltip_note
        };
    }

    /**
     * Get tooltip configuration for SystemNotificationsEmail field
     *
     * @private
     * @static
     * @returns {Object} Tooltip configuration for system notifications email
     */
    static getSystemNotificationsEmailTooltip() {
        return {
            header: globalTranslate.ms_SystemNotificationsEmailTooltip_header,
            description: globalTranslate.ms_SystemNotificationsEmailTooltip_desc,
            list: [
                {
                    term: globalTranslate.ms_SystemNotificationsEmailTooltip_usage,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.ms_SystemNotificationsEmailTooltip_critical_errors,
                globalTranslate.ms_SystemNotificationsEmailTooltip_disk_space,
                globalTranslate.ms_SystemNotificationsEmailTooltip_license,
                globalTranslate.ms_SystemNotificationsEmailTooltip_updates,
                globalTranslate.ms_SystemNotificationsEmailTooltip_security,
                globalTranslate.ms_SystemNotificationsEmailTooltip_ssl_cert,
                globalTranslate.ms_SystemNotificationsEmailTooltip_backup_status
            ],
            list3: [
                {
                    term: globalTranslate.ms_SystemNotificationsEmailTooltip_examples,
                    definition: null
                }
            ],
            examples: [
                'admin@company.com',
                'sysadmin@example.org',
                'monitoring@domain.ru'
            ],
            list4: [
                {
                    term: globalTranslate.ms_SystemNotificationsEmailTooltip_recommendations,
                    definition: null
                }
            ],
            list5: [
                globalTranslate.ms_SystemNotificationsEmailTooltip_use_monitored,
                globalTranslate.ms_SystemNotificationsEmailTooltip_separate_account,
                globalTranslate.ms_SystemNotificationsEmailTooltip_distribution_list
            ],
            warning: {
                text: globalTranslate.ms_SystemNotificationsEmailTooltip_warning
            },
            note: globalTranslate.ms_SystemNotificationsEmailTooltip_note
        };
    }

    /**
     * Get tooltip configuration for MailSMTPAuthType field
     *
     * @private
     * @static
     * @returns {Object} Tooltip configuration for SMTP authentication type
     */
    static getMailSMTPAuthTypeTooltip() {
        return {
            header: globalTranslate.ms_MailSMTPAuthTypeTooltip_header,
            description: globalTranslate.ms_MailSMTPAuthTypeTooltip_desc,
            list: [
                {
                    term: globalTranslate.ms_MailSMTPAuthTypeTooltip_password_header,
                    definition: null
                }
            ],
            list2: [
                {
                    term: globalTranslate.ms_MailSMTPAuthTypeTooltip_password_desc_header,
                    definition: globalTranslate.ms_MailSMTPAuthTypeTooltip_password_desc
                },
                {
                    term: globalTranslate.ms_MailSMTPAuthTypeTooltip_password_pros,
                    definition: null
                }
            ],
            list3: [
                globalTranslate.ms_MailSMTPAuthTypeTooltip_password_pro_simple,
                globalTranslate.ms_MailSMTPAuthTypeTooltip_password_pro_universal,
                globalTranslate.ms_MailSMTPAuthTypeTooltip_password_pro_noapi
            ],
            list4: [
                {
                    term: globalTranslate.ms_MailSMTPAuthTypeTooltip_password_cons,
                    definition: null
                }
            ],
            list5: [
                globalTranslate.ms_MailSMTPAuthTypeTooltip_password_con_security,
                globalTranslate.ms_MailSMTPAuthTypeTooltip_password_con_apppassword,
                globalTranslate.ms_MailSMTPAuthTypeTooltip_password_con_2fa
            ],
            list6: [
                {
                    term: globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_header,
                    definition: null
                },
                {
                    term: globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_desc_header,
                    definition: globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_desc
                },
                {
                    term: globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_pros,
                    definition: null
                }
            ],
            list7: [
                globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_pro_secure,
                globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_pro_nopassword,
                globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_pro_2fa,
                globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_pro_revoke
            ],
            list8: [
                {
                    term: globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_cons,
                    definition: null
                }
            ],
            list9: [
                globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_con_setup,
                globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_con_providers,
                globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_con_renew
            ],
            list10: [
                {
                    term: globalTranslate.ms_MailSMTPAuthTypeTooltip_recommendation,
                    definition: globalTranslate.ms_MailSMTPAuthTypeTooltip_recommendation_desc
                }
            ],
            warning: {
                text: globalTranslate.ms_MailSMTPAuthTypeTooltip_warning
            }
        };
    }

    /**
     * Get tooltip configuration for SystemEmailForMissed field
     *
     * @private
     * @static
     * @returns {Object} Tooltip configuration for missed calls notification email
     */
    static getSystemEmailForMissedTooltip() {
        return {
            header: globalTranslate.ms_SystemEmailForMissedTooltip_header,
            description: globalTranslate.ms_SystemEmailForMissedTooltip_desc,
            list: [
                {
                    term: globalTranslate.ms_SystemEmailForMissedTooltip_how_it_works,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.ms_SystemEmailForMissedTooltip_internal_calls,
                globalTranslate.ms_SystemEmailForMissedTooltip_external_calls,
                globalTranslate.ms_SystemEmailForMissedTooltip_no_personal
            ],
            list3: [
                {
                    term: globalTranslate.ms_SystemEmailForMissedTooltip_usage_examples,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.ms_SystemEmailForMissedTooltip_example_reception,
                globalTranslate.ms_SystemEmailForMissedTooltip_example_manager,
                globalTranslate.ms_SystemEmailForMissedTooltip_example_crm
            ],
            list5: [
                {
                    term: globalTranslate.ms_SystemEmailForMissedTooltip_recommendations,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.ms_SystemEmailForMissedTooltip_use_group,
                globalTranslate.ms_SystemEmailForMissedTooltip_configure_personal,
                globalTranslate.ms_SystemEmailForMissedTooltip_monitor_regularly
            ],
            note: globalTranslate.ms_SystemEmailForMissedTooltip_note
        };
    }

    /**
     * Get tooltip configuration for VoicemailNotificationsEmail field
     *
     * @private
     * @static
     * @returns {Object} Tooltip configuration for voicemail notifications email
     */
    static getVoicemailNotificationsEmailTooltip() {
        return {
            header: globalTranslate.ms_VoicemailNotificationsEmailTooltip_header,
            description: globalTranslate.ms_VoicemailNotificationsEmailTooltip_desc,
            list: [
                {
                    term: globalTranslate.ms_VoicemailNotificationsEmailTooltip_how_it_works,
                    definition: null
                },
                {
                    term: globalTranslate.ms_VoicemailNotificationsEmailTooltip_priority_order,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.ms_VoicemailNotificationsEmailTooltip_personal_first,
                globalTranslate.ms_VoicemailNotificationsEmailTooltip_common_second,
                globalTranslate.ms_VoicemailNotificationsEmailTooltip_no_send
            ],
            list3: [
                {
                    term: globalTranslate.ms_VoicemailNotificationsEmailTooltip_usage_examples,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.ms_VoicemailNotificationsEmailTooltip_example_secretary,
                globalTranslate.ms_VoicemailNotificationsEmailTooltip_example_archive,
                globalTranslate.ms_VoicemailNotificationsEmailTooltip_example_transcription
            ],
            list5: [
                {
                    term: globalTranslate.ms_VoicemailNotificationsEmailTooltip_features,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.ms_VoicemailNotificationsEmailTooltip_audio_attachment,
                globalTranslate.ms_VoicemailNotificationsEmailTooltip_caller_info,
                globalTranslate.ms_VoicemailNotificationsEmailTooltip_duration
            ],
            note: globalTranslate.ms_VoicemailNotificationsEmailTooltip_note
        };
    }

    /**
     * Get tooltip configuration for MailOAuth2ClientId field
     *
     * @private
     * @static
     * @returns {Object} Tooltip configuration for OAuth2 Client ID
     */
    static getMailOAuth2ClientIdTooltip() {
        return {
            header: globalTranslate.ms_MailOAuth2ClientIdTooltip_header,
            description: globalTranslate.ms_MailOAuth2ClientIdTooltip_desc,
            list: [
                {
                    term: globalTranslate.ms_MailOAuth2ClientIdTooltip_whatisit,
                    definition: globalTranslate.ms_MailOAuth2ClientIdTooltip_whatisit_desc
                },
                {
                    term: globalTranslate.ms_MailOAuth2ClientIdTooltip_where_header,
                    definition: null
                }
            ],
            list2: [
                {
                    term: globalTranslate.ms_MailOAuth2ClientIdTooltip_google,
                    definition: null
                }
            ],
            list3: [
                globalTranslate.ms_MailOAuth2ClientIdTooltip_google_step1,
                globalTranslate.ms_MailOAuth2ClientIdTooltip_google_step2,
                globalTranslate.ms_MailOAuth2ClientIdTooltip_google_step3,
                globalTranslate.ms_MailOAuth2ClientIdTooltip_google_step4
            ],
            list4: [
                {
                    term: globalTranslate.ms_MailOAuth2ClientIdTooltip_microsoft,
                    definition: null
                }
            ],
            list5: [
                globalTranslate.ms_MailOAuth2ClientIdTooltip_microsoft_step1,
                globalTranslate.ms_MailOAuth2ClientIdTooltip_microsoft_step2,
                globalTranslate.ms_MailOAuth2ClientIdTooltip_microsoft_step3,
                globalTranslate.ms_MailOAuth2ClientIdTooltip_microsoft_step4
            ],
            list6: [
                {
                    term: globalTranslate.ms_MailOAuth2ClientIdTooltip_yandex,
                    definition: null
                }
            ],
            list7: [
                globalTranslate.ms_MailOAuth2ClientIdTooltip_yandex_step1,
                globalTranslate.ms_MailOAuth2ClientIdTooltip_yandex_step2,
                globalTranslate.ms_MailOAuth2ClientIdTooltip_yandex_step3
            ],
            list8: [
                {
                    term: globalTranslate.ms_MailOAuth2ClientIdTooltip_example,
                    definition: null
                }
            ],
            examples: [
                'Google: 123456789012-abcdefghijklmnopqrstuvwxyz012345.apps.googleusercontent.com',
                'Microsoft: 12345678-1234-1234-1234-123456789012',
                'Yandex: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
            ],
            warning: {
                text: globalTranslate.ms_MailOAuth2ClientIdTooltip_warning
            },
            note: globalTranslate.ms_MailOAuth2ClientIdTooltip_note
        };
    }

    /**
     * Get tooltip configuration for MailSMTPUseTLS field
     *
     * @private
     * @static
     * @returns {Object} Tooltip configuration for SMTP TLS usage
     */
    static getMailSMTPUseTLSTooltip() {
        return {
            header: globalTranslate.ms_MailSMTPUseTLSTooltip_header,
            description: globalTranslate.ms_MailSMTPUseTLSTooltip_desc,
            list: [
                {
                    term: globalTranslate.ms_MailSMTPUseTLSTooltip_whatisit,
                    definition: globalTranslate.ms_MailSMTPUseTLSTooltip_whatisit_desc
                }
            ],
            list2: [
                {
                    term: globalTranslate.ms_MailSMTPUseTLSTooltip_when_enabled,
                    definition: null
                }
            ],
            list3: [
                globalTranslate.ms_MailSMTPUseTLSTooltip_starttls_used,
                globalTranslate.ms_MailSMTPUseTLSTooltip_port_587,
                globalTranslate.ms_MailSMTPUseTLSTooltip_encryption_upgrade,
                globalTranslate.ms_MailSMTPUseTLSTooltip_modern_standard
            ],
            list4: [
                {
                    term: globalTranslate.ms_MailSMTPUseTLSTooltip_when_disabled,
                    definition: null
                }
            ],
            list5: [
                globalTranslate.ms_MailSMTPUseTLSTooltip_no_encryption,
                globalTranslate.ms_MailSMTPUseTLSTooltip_port_25,
                globalTranslate.ms_MailSMTPUseTLSTooltip_auto_tls_disabled,
                globalTranslate.ms_MailSMTPUseTLSTooltip_legacy_servers
            ],
            list6: [
                {
                    term: globalTranslate.ms_MailSMTPUseTLSTooltip_port_recommendations,
                    definition: null
                }
            ],
            list7: [
                globalTranslate.ms_MailSMTPUseTLSTooltip_port_25_desc,
                globalTranslate.ms_MailSMTPUseTLSTooltip_port_587_desc,
                globalTranslate.ms_MailSMTPUseTLSTooltip_port_465_desc
            ],
            list8: [
                {
                    term: globalTranslate.ms_MailSMTPUseTLSTooltip_provider_settings,
                    definition: null
                }
            ],
            list9: [
                globalTranslate.ms_MailSMTPUseTLSTooltip_gmail,
                globalTranslate.ms_MailSMTPUseTLSTooltip_outlook,
                globalTranslate.ms_MailSMTPUseTLSTooltip_yandex,
                globalTranslate.ms_MailSMTPUseTLSTooltip_mailru
            ],
            warning: {
                text: globalTranslate.ms_MailSMTPUseTLSTooltip_warning
            },
            note: globalTranslate.ms_MailSMTPUseTLSTooltip_note
        };
    }

    /**
     * Get tooltip configuration for MailSMTPCertCheck field
     *
     * @private
     * @static
     * @returns {Object} Tooltip configuration for SMTP certificate check
     */
    static getMailSMTPCertCheckTooltip() {
        return {
            header: globalTranslate.ms_MailSMTPCertCheckTooltip_header,
            description: globalTranslate.ms_MailSMTPCertCheckTooltip_desc,
            list: [
                {
                    term: globalTranslate.ms_MailSMTPCertCheckTooltip_when_enabled,
                    definition: null
                }
            ],
            list2: [
                globalTranslate.ms_MailSMTPCertCheckTooltip_verify_certificate,
                globalTranslate.ms_MailSMTPCertCheckTooltip_check_hostname,
                globalTranslate.ms_MailSMTPCertCheckTooltip_reject_selfsigned,
                globalTranslate.ms_MailSMTPCertCheckTooltip_protect_mitm
            ],
            list3: [
                {
                    term: globalTranslate.ms_MailSMTPCertCheckTooltip_when_disabled,
                    definition: null
                }
            ],
            list4: [
                globalTranslate.ms_MailSMTPCertCheckTooltip_accept_any_cert,
                globalTranslate.ms_MailSMTPCertCheckTooltip_allow_selfsigned,
                globalTranslate.ms_MailSMTPCertCheckTooltip_skip_hostname,
                globalTranslate.ms_MailSMTPCertCheckTooltip_less_secure
            ],
            list5: [
                {
                    term: globalTranslate.ms_MailSMTPCertCheckTooltip_when_use,
                    definition: null
                }
            ],
            list6: [
                globalTranslate.ms_MailSMTPCertCheckTooltip_public_servers,
                globalTranslate.ms_MailSMTPCertCheckTooltip_production_env,
                globalTranslate.ms_MailSMTPCertCheckTooltip_compliance
            ],
            list7: [
                {
                    term: globalTranslate.ms_MailSMTPCertCheckTooltip_when_disable,
                    definition: null
                }
            ],
            list8: [
                globalTranslate.ms_MailSMTPCertCheckTooltip_internal_servers,
                globalTranslate.ms_MailSMTPCertCheckTooltip_test_env,
                globalTranslate.ms_MailSMTPCertCheckTooltip_selfsigned_cert,
                globalTranslate.ms_MailSMTPCertCheckTooltip_legacy_servers
            ],
            warning: {
                text: globalTranslate.ms_MailSMTPCertCheckTooltip_warning
            },
            note: globalTranslate.ms_MailSMTPCertCheckTooltip_note
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MailSettingsTooltipManager;
}