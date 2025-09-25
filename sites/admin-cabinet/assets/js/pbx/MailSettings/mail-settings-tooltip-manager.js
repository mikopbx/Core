"use strict";

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
var MailSettingsTooltipManager = /*#__PURE__*/function () {
  /**
   * Private constructor to prevent instantiation
   * This class uses static methods for utility functionality
   */
  function MailSettingsTooltipManager() {
    _classCallCheck(this, MailSettingsTooltipManager);

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


  _createClass(MailSettingsTooltipManager, null, [{
    key: "initializeTooltips",
    value: function initializeTooltips(form) {
      if (!form || typeof form.buildTooltipContent !== 'function') {
        console.error('MailSettingsTooltipManager: Invalid form object or missing buildTooltipContent method');
        return;
      } // Get all tooltip configurations


      var tooltipConfigs = this.getAllTooltipConfigurations(form); // Initialize popup for each icon

      $('.field-info-icon').each(function (index, element) {
        var $icon = $(element);
        var fieldName = $icon.data('field');
        var content = tooltipConfigs[fieldName];

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

  }, {
    key: "getAllTooltipConfigurations",
    value: function getAllTooltipConfigurations(form) {
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

  }, {
    key: "getMailEnableNotificationsTooltip",
    value: function getMailEnableNotificationsTooltip() {
      return {
        header: globalTranslate.ms_MailEnableNotificationsTooltip_header,
        description: globalTranslate.ms_MailEnableNotificationsTooltip_desc,
        list: [{
          term: globalTranslate.ms_MailEnableNotificationsTooltip_when_enabled,
          definition: null
        }],
        list2: [globalTranslate.ms_MailEnableNotificationsTooltip_missed_calls, globalTranslate.ms_MailEnableNotificationsTooltip_voicemail, globalTranslate.ms_MailEnableNotificationsTooltip_system_events, globalTranslate.ms_MailEnableNotificationsTooltip_module_notifications],
        list3: [{
          term: globalTranslate.ms_MailEnableNotificationsTooltip_requirements,
          definition: null
        }],
        list4: [globalTranslate.ms_MailEnableNotificationsTooltip_smtp_configured, globalTranslate.ms_MailEnableNotificationsTooltip_sender_address, globalTranslate.ms_MailEnableNotificationsTooltip_recipient_emails],
        list5: [{
          term: globalTranslate.ms_MailEnableNotificationsTooltip_when_disabled,
          definition: globalTranslate.ms_MailEnableNotificationsTooltip_when_disabled_desc
        }],
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

  }, {
    key: "getSystemNotificationsEmailTooltip",
    value: function getSystemNotificationsEmailTooltip() {
      return {
        header: globalTranslate.ms_SystemNotificationsEmailTooltip_header,
        description: globalTranslate.ms_SystemNotificationsEmailTooltip_desc,
        list: [{
          term: globalTranslate.ms_SystemNotificationsEmailTooltip_usage,
          definition: null
        }],
        list2: [globalTranslate.ms_SystemNotificationsEmailTooltip_critical_errors, globalTranslate.ms_SystemNotificationsEmailTooltip_disk_space, globalTranslate.ms_SystemNotificationsEmailTooltip_license, globalTranslate.ms_SystemNotificationsEmailTooltip_updates, globalTranslate.ms_SystemNotificationsEmailTooltip_security, globalTranslate.ms_SystemNotificationsEmailTooltip_ssl_cert, globalTranslate.ms_SystemNotificationsEmailTooltip_backup_status],
        list3: [{
          term: globalTranslate.ms_SystemNotificationsEmailTooltip_examples,
          definition: null
        }],
        examples: ['admin@company.com', 'sysadmin@example.org', 'monitoring@domain.ru'],
        list4: [{
          term: globalTranslate.ms_SystemNotificationsEmailTooltip_recommendations,
          definition: null
        }],
        list5: [globalTranslate.ms_SystemNotificationsEmailTooltip_use_monitored, globalTranslate.ms_SystemNotificationsEmailTooltip_separate_account, globalTranslate.ms_SystemNotificationsEmailTooltip_distribution_list],
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

  }, {
    key: "getMailSMTPAuthTypeTooltip",
    value: function getMailSMTPAuthTypeTooltip() {
      return {
        header: globalTranslate.ms_MailSMTPAuthTypeTooltip_header,
        description: globalTranslate.ms_MailSMTPAuthTypeTooltip_desc,
        list: [{
          term: globalTranslate.ms_MailSMTPAuthTypeTooltip_password_header,
          definition: null
        }],
        list2: [{
          term: globalTranslate.ms_MailSMTPAuthTypeTooltip_password_desc_header,
          definition: globalTranslate.ms_MailSMTPAuthTypeTooltip_password_desc
        }, {
          term: globalTranslate.ms_MailSMTPAuthTypeTooltip_password_pros,
          definition: null
        }],
        list3: [globalTranslate.ms_MailSMTPAuthTypeTooltip_password_pro_simple, globalTranslate.ms_MailSMTPAuthTypeTooltip_password_pro_universal, globalTranslate.ms_MailSMTPAuthTypeTooltip_password_pro_noapi],
        list4: [{
          term: globalTranslate.ms_MailSMTPAuthTypeTooltip_password_cons,
          definition: null
        }],
        list5: [globalTranslate.ms_MailSMTPAuthTypeTooltip_password_con_security, globalTranslate.ms_MailSMTPAuthTypeTooltip_password_con_apppassword, globalTranslate.ms_MailSMTPAuthTypeTooltip_password_con_2fa],
        list6: [{
          term: globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_header,
          definition: null
        }, {
          term: globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_desc_header,
          definition: globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_desc
        }, {
          term: globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_pros,
          definition: null
        }],
        list7: [globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_pro_secure, globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_pro_nopassword, globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_pro_2fa, globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_pro_revoke],
        list8: [{
          term: globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_cons,
          definition: null
        }],
        list9: [globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_con_setup, globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_con_providers, globalTranslate.ms_MailSMTPAuthTypeTooltip_oauth2_con_renew],
        list10: [{
          term: globalTranslate.ms_MailSMTPAuthTypeTooltip_recommendation,
          definition: globalTranslate.ms_MailSMTPAuthTypeTooltip_recommendation_desc
        }],
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

  }, {
    key: "getSystemEmailForMissedTooltip",
    value: function getSystemEmailForMissedTooltip() {
      return {
        header: globalTranslate.ms_SystemEmailForMissedTooltip_header,
        description: globalTranslate.ms_SystemEmailForMissedTooltip_desc,
        list: [{
          term: globalTranslate.ms_SystemEmailForMissedTooltip_how_it_works,
          definition: null
        }],
        list2: [globalTranslate.ms_SystemEmailForMissedTooltip_internal_calls, globalTranslate.ms_SystemEmailForMissedTooltip_external_calls, globalTranslate.ms_SystemEmailForMissedTooltip_no_personal],
        list3: [{
          term: globalTranslate.ms_SystemEmailForMissedTooltip_usage_examples,
          definition: null
        }],
        list4: [globalTranslate.ms_SystemEmailForMissedTooltip_example_reception, globalTranslate.ms_SystemEmailForMissedTooltip_example_manager, globalTranslate.ms_SystemEmailForMissedTooltip_example_crm],
        list5: [{
          term: globalTranslate.ms_SystemEmailForMissedTooltip_recommendations,
          definition: null
        }],
        list6: [globalTranslate.ms_SystemEmailForMissedTooltip_use_group, globalTranslate.ms_SystemEmailForMissedTooltip_configure_personal, globalTranslate.ms_SystemEmailForMissedTooltip_monitor_regularly],
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

  }, {
    key: "getVoicemailNotificationsEmailTooltip",
    value: function getVoicemailNotificationsEmailTooltip() {
      return {
        header: globalTranslate.ms_VoicemailNotificationsEmailTooltip_header,
        description: globalTranslate.ms_VoicemailNotificationsEmailTooltip_desc,
        list: [{
          term: globalTranslate.ms_VoicemailNotificationsEmailTooltip_how_it_works,
          definition: null
        }, {
          term: globalTranslate.ms_VoicemailNotificationsEmailTooltip_priority_order,
          definition: null
        }],
        list2: [globalTranslate.ms_VoicemailNotificationsEmailTooltip_personal_first, globalTranslate.ms_VoicemailNotificationsEmailTooltip_common_second, globalTranslate.ms_VoicemailNotificationsEmailTooltip_no_send],
        list3: [{
          term: globalTranslate.ms_VoicemailNotificationsEmailTooltip_usage_examples,
          definition: null
        }],
        list4: [globalTranslate.ms_VoicemailNotificationsEmailTooltip_example_secretary, globalTranslate.ms_VoicemailNotificationsEmailTooltip_example_archive, globalTranslate.ms_VoicemailNotificationsEmailTooltip_example_transcription],
        list5: [{
          term: globalTranslate.ms_VoicemailNotificationsEmailTooltip_features,
          definition: null
        }],
        list6: [globalTranslate.ms_VoicemailNotificationsEmailTooltip_audio_attachment, globalTranslate.ms_VoicemailNotificationsEmailTooltip_caller_info, globalTranslate.ms_VoicemailNotificationsEmailTooltip_duration],
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

  }, {
    key: "getMailOAuth2ClientIdTooltip",
    value: function getMailOAuth2ClientIdTooltip() {
      return {
        header: globalTranslate.ms_MailOAuth2ClientIdTooltip_header,
        description: globalTranslate.ms_MailOAuth2ClientIdTooltip_desc,
        list: [{
          term: globalTranslate.ms_MailOAuth2ClientIdTooltip_whatisit,
          definition: globalTranslate.ms_MailOAuth2ClientIdTooltip_whatisit_desc
        }, {
          term: globalTranslate.ms_MailOAuth2ClientIdTooltip_where_header,
          definition: null
        }],
        list2: [{
          term: globalTranslate.ms_MailOAuth2ClientIdTooltip_google,
          definition: null
        }],
        list3: [globalTranslate.ms_MailOAuth2ClientIdTooltip_google_step1, globalTranslate.ms_MailOAuth2ClientIdTooltip_google_step2, globalTranslate.ms_MailOAuth2ClientIdTooltip_google_step3, globalTranslate.ms_MailOAuth2ClientIdTooltip_google_step4],
        list4: [{
          term: globalTranslate.ms_MailOAuth2ClientIdTooltip_microsoft,
          definition: null
        }],
        list5: [globalTranslate.ms_MailOAuth2ClientIdTooltip_microsoft_step1, globalTranslate.ms_MailOAuth2ClientIdTooltip_microsoft_step2, globalTranslate.ms_MailOAuth2ClientIdTooltip_microsoft_step3, globalTranslate.ms_MailOAuth2ClientIdTooltip_microsoft_step4],
        list6: [{
          term: globalTranslate.ms_MailOAuth2ClientIdTooltip_yandex,
          definition: null
        }],
        list7: [globalTranslate.ms_MailOAuth2ClientIdTooltip_yandex_step1, globalTranslate.ms_MailOAuth2ClientIdTooltip_yandex_step2, globalTranslate.ms_MailOAuth2ClientIdTooltip_yandex_step3],
        list8: [{
          term: globalTranslate.ms_MailOAuth2ClientIdTooltip_example,
          definition: null
        }],
        examples: ['Google: 123456789012-abcdefghijklmnopqrstuvwxyz012345.apps.googleusercontent.com', 'Microsoft: 12345678-1234-1234-1234-123456789012', 'Yandex: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'],
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

  }, {
    key: "getMailSMTPUseTLSTooltip",
    value: function getMailSMTPUseTLSTooltip() {
      return {
        header: globalTranslate.ms_MailSMTPUseTLSTooltip_header,
        description: globalTranslate.ms_MailSMTPUseTLSTooltip_desc,
        list: [{
          term: globalTranslate.ms_MailSMTPUseTLSTooltip_whatisit,
          definition: globalTranslate.ms_MailSMTPUseTLSTooltip_whatisit_desc
        }],
        list2: [{
          term: globalTranslate.ms_MailSMTPUseTLSTooltip_when_enabled,
          definition: null
        }],
        list3: [globalTranslate.ms_MailSMTPUseTLSTooltip_starttls_used, globalTranslate.ms_MailSMTPUseTLSTooltip_port_587, globalTranslate.ms_MailSMTPUseTLSTooltip_encryption_upgrade, globalTranslate.ms_MailSMTPUseTLSTooltip_modern_standard],
        list4: [{
          term: globalTranslate.ms_MailSMTPUseTLSTooltip_when_disabled,
          definition: null
        }],
        list5: [globalTranslate.ms_MailSMTPUseTLSTooltip_no_encryption, globalTranslate.ms_MailSMTPUseTLSTooltip_port_25, globalTranslate.ms_MailSMTPUseTLSTooltip_auto_tls_disabled, globalTranslate.ms_MailSMTPUseTLSTooltip_legacy_servers],
        list6: [{
          term: globalTranslate.ms_MailSMTPUseTLSTooltip_port_recommendations,
          definition: null
        }],
        list7: [globalTranslate.ms_MailSMTPUseTLSTooltip_port_25_desc, globalTranslate.ms_MailSMTPUseTLSTooltip_port_587_desc, globalTranslate.ms_MailSMTPUseTLSTooltip_port_465_desc],
        list8: [{
          term: globalTranslate.ms_MailSMTPUseTLSTooltip_provider_settings,
          definition: null
        }],
        list9: [globalTranslate.ms_MailSMTPUseTLSTooltip_gmail, globalTranslate.ms_MailSMTPUseTLSTooltip_outlook, globalTranslate.ms_MailSMTPUseTLSTooltip_yandex, globalTranslate.ms_MailSMTPUseTLSTooltip_mailru],
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

  }, {
    key: "getMailSMTPCertCheckTooltip",
    value: function getMailSMTPCertCheckTooltip() {
      return {
        header: globalTranslate.ms_MailSMTPCertCheckTooltip_header,
        description: globalTranslate.ms_MailSMTPCertCheckTooltip_desc,
        list: [{
          term: globalTranslate.ms_MailSMTPCertCheckTooltip_when_enabled,
          definition: null
        }],
        list2: [globalTranslate.ms_MailSMTPCertCheckTooltip_verify_certificate, globalTranslate.ms_MailSMTPCertCheckTooltip_check_hostname, globalTranslate.ms_MailSMTPCertCheckTooltip_reject_selfsigned, globalTranslate.ms_MailSMTPCertCheckTooltip_protect_mitm],
        list3: [{
          term: globalTranslate.ms_MailSMTPCertCheckTooltip_when_disabled,
          definition: null
        }],
        list4: [globalTranslate.ms_MailSMTPCertCheckTooltip_accept_any_cert, globalTranslate.ms_MailSMTPCertCheckTooltip_allow_selfsigned, globalTranslate.ms_MailSMTPCertCheckTooltip_skip_hostname, globalTranslate.ms_MailSMTPCertCheckTooltip_less_secure],
        list5: [{
          term: globalTranslate.ms_MailSMTPCertCheckTooltip_when_use,
          definition: null
        }],
        list6: [globalTranslate.ms_MailSMTPCertCheckTooltip_public_servers, globalTranslate.ms_MailSMTPCertCheckTooltip_production_env, globalTranslate.ms_MailSMTPCertCheckTooltip_compliance],
        list7: [{
          term: globalTranslate.ms_MailSMTPCertCheckTooltip_when_disable,
          definition: null
        }],
        list8: [globalTranslate.ms_MailSMTPCertCheckTooltip_internal_servers, globalTranslate.ms_MailSMTPCertCheckTooltip_test_env, globalTranslate.ms_MailSMTPCertCheckTooltip_selfsigned_cert, globalTranslate.ms_MailSMTPCertCheckTooltip_legacy_servers],
        warning: {
          text: globalTranslate.ms_MailSMTPCertCheckTooltip_warning
        },
        note: globalTranslate.ms_MailSMTPCertCheckTooltip_note
      };
    }
  }]);

  return MailSettingsTooltipManager;
}(); // Export for use in other modules


if (typeof module !== 'undefined' && module.exports) {
  module.exports = MailSettingsTooltipManager;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsImZvcm0iLCJidWlsZFRvb2x0aXBDb250ZW50IiwiY29uc29sZSIsImVycm9yIiwidG9vbHRpcENvbmZpZ3MiLCJnZXRBbGxUb29sdGlwQ29uZmlndXJhdGlvbnMiLCIkIiwiZWFjaCIsImluZGV4IiwiZWxlbWVudCIsIiRpY29uIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbnRlbnQiLCJwb3B1cCIsImh0bWwiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJ2YXJpYXRpb24iLCJnZXRNYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXAiLCJnZXRTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwIiwiZ2V0U3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwIiwiZ2V0Vm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcCIsImdldE1haWxTTVRQQXV0aFR5cGVUb29sdGlwIiwiZ2V0TWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcCIsImdldE1haWxTTVRQVXNlVExTVG9vbHRpcCIsImdldE1haWxTTVRQQ2VydENoZWNrVG9vbHRpcCIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsIm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsIm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJtc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfd2hlbl9lbmFibGVkIiwiZGVmaW5pdGlvbiIsImxpc3QyIiwibXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX21pc3NlZF9jYWxscyIsIm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF92b2ljZW1haWwiLCJtc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfc3lzdGVtX2V2ZW50cyIsIm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9tb2R1bGVfbm90aWZpY2F0aW9ucyIsImxpc3QzIiwibXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3JlcXVpcmVtZW50cyIsImxpc3Q0IiwibXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3NtdHBfY29uZmlndXJlZCIsIm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9zZW5kZXJfYWRkcmVzcyIsIm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9yZWNpcGllbnRfZW1haWxzIiwibGlzdDUiLCJtc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfd2hlbl9kaXNhYmxlZCIsIm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF93aGVuX2Rpc2FibGVkX2Rlc2MiLCJ3YXJuaW5nIiwidGV4dCIsIm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF93YXJuaW5nIiwibm90ZSIsIm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9ub3RlIiwibXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9oZWFkZXIiLCJtc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX2Rlc2MiLCJtc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3VzYWdlIiwibXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9jcml0aWNhbF9lcnJvcnMiLCJtc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX2Rpc2tfc3BhY2UiLCJtc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX2xpY2Vuc2UiLCJtc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3VwZGF0ZXMiLCJtc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3NlY3VyaXR5IiwibXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9zc2xfY2VydCIsIm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfYmFja3VwX3N0YXR1cyIsIm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZXhhbXBsZXMiLCJleGFtcGxlcyIsIm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfcmVjb21tZW5kYXRpb25zIiwibXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF91c2VfbW9uaXRvcmVkIiwibXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9zZXBhcmF0ZV9hY2NvdW50IiwibXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9kaXN0cmlidXRpb25fbGlzdCIsIm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfd2FybmluZyIsIm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfbm90ZSIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX2hlYWRlciIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX2Rlc2MiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9oZWFkZXIiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9kZXNjX2hlYWRlciIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX2Rlc2MiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9wcm9zIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfcHJvX3NpbXBsZSIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX3Byb191bml2ZXJzYWwiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9wcm9fbm9hcGkiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9jb25zIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfY29uX3NlY3VyaXR5IiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfY29uX2FwcHBhc3N3b3JkIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfY29uXzJmYSIsImxpc3Q2IiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX2hlYWRlciIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9kZXNjX2hlYWRlciIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9kZXNjIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX3Byb3MiLCJsaXN0NyIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9wcm9fc2VjdXJlIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX3Byb19ub3Bhc3N3b3JkIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX3Byb18yZmEiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfcHJvX3Jldm9rZSIsImxpc3Q4IiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX2NvbnMiLCJsaXN0OSIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9jb25fc2V0dXAiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfY29uX3Byb3ZpZGVycyIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9jb25fcmVuZXciLCJsaXN0MTAiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9yZWNvbW1lbmRhdGlvbiIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3JlY29tbWVuZGF0aW9uX2Rlc2MiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF93YXJuaW5nIiwibXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2hlYWRlciIsIm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9kZXNjIiwibXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2hvd19pdF93b3JrcyIsIm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9pbnRlcm5hbF9jYWxscyIsIm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9leHRlcm5hbF9jYWxscyIsIm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9ub19wZXJzb25hbCIsIm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF91c2FnZV9leGFtcGxlcyIsIm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9leGFtcGxlX3JlY2VwdGlvbiIsIm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9leGFtcGxlX21hbmFnZXIiLCJtc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfZXhhbXBsZV9jcm0iLCJtc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfcmVjb21tZW5kYXRpb25zIiwibXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX3VzZV9ncm91cCIsIm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9jb25maWd1cmVfcGVyc29uYWwiLCJtc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfbW9uaXRvcl9yZWd1bGFybHkiLCJtc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfbm90ZSIsIm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfaGVhZGVyIiwibXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9kZXNjIiwibXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9ob3dfaXRfd29ya3MiLCJtc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX3ByaW9yaXR5X29yZGVyIiwibXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9wZXJzb25hbF9maXJzdCIsIm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfY29tbW9uX3NlY29uZCIsIm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfbm9fc2VuZCIsIm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfdXNhZ2VfZXhhbXBsZXMiLCJtc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2V4YW1wbGVfc2VjcmV0YXJ5IiwibXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9leGFtcGxlX2FyY2hpdmUiLCJtc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2V4YW1wbGVfdHJhbnNjcmlwdGlvbiIsIm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZmVhdHVyZXMiLCJtc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2F1ZGlvX2F0dGFjaG1lbnQiLCJtc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2NhbGxlcl9pbmZvIiwibXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9kdXJhdGlvbiIsIm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfbm90ZSIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfaGVhZGVyIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9kZXNjIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF93aGF0aXNpdCIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfd2hhdGlzaXRfZGVzYyIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfd2hlcmVfaGVhZGVyIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9nb29nbGUiLCJtc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX2dvb2dsZV9zdGVwMSIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfZ29vZ2xlX3N0ZXAyIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9nb29nbGVfc3RlcDMiLCJtc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX2dvb2dsZV9zdGVwNCIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfbWljcm9zb2Z0IiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9taWNyb3NvZnRfc3RlcDEiLCJtc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX21pY3Jvc29mdF9zdGVwMiIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfbWljcm9zb2Z0X3N0ZXAzIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9taWNyb3NvZnRfc3RlcDQiLCJtc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX3lhbmRleCIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfeWFuZGV4X3N0ZXAxIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF95YW5kZXhfc3RlcDIiLCJtc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX3lhbmRleF9zdGVwMyIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfZXhhbXBsZSIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfd2FybmluZyIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfbm90ZSIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9oZWFkZXIiLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfZGVzYyIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF93aGF0aXNpdCIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF93aGF0aXNpdF9kZXNjIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3doZW5fZW5hYmxlZCIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9zdGFydHRsc191c2VkIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3BvcnRfNTg3IiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX2VuY3J5cHRpb25fdXBncmFkZSIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9tb2Rlcm5fc3RhbmRhcmQiLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfd2hlbl9kaXNhYmxlZCIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9ub19lbmNyeXB0aW9uIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3BvcnRfMjUiLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfYXV0b190bHNfZGlzYWJsZWQiLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfbGVnYWN5X3NlcnZlcnMiLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfcG9ydF9yZWNvbW1lbmRhdGlvbnMiLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfcG9ydF8yNV9kZXNjIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3BvcnRfNTg3X2Rlc2MiLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfcG9ydF80NjVfZGVzYyIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9wcm92aWRlcl9zZXR0aW5ncyIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9nbWFpbCIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9vdXRsb29rIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3lhbmRleCIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9tYWlscnUiLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfd2FybmluZyIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9ub3RlIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2hlYWRlciIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9kZXNjIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3doZW5fZW5hYmxlZCIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF92ZXJpZnlfY2VydGlmaWNhdGUiLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfY2hlY2tfaG9zdG5hbWUiLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfcmVqZWN0X3NlbGZzaWduZWQiLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfcHJvdGVjdF9taXRtIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3doZW5fZGlzYWJsZWQiLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfYWNjZXB0X2FueV9jZXJ0IiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2FsbG93X3NlbGZzaWduZWQiLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfc2tpcF9ob3N0bmFtZSIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9sZXNzX3NlY3VyZSIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF93aGVuX3VzZSIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9wdWJsaWNfc2VydmVycyIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9wcm9kdWN0aW9uX2VudiIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9jb21wbGlhbmNlIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3doZW5fZGlzYWJsZSIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9pbnRlcm5hbF9zZXJ2ZXJzIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3Rlc3RfZW52IiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3NlbGZzaWduZWRfY2VydCIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9sZWdhY3lfc2VydmVycyIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF93YXJuaW5nIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX25vdGUiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSwwQjtBQUNGO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksd0NBQWM7QUFBQTs7QUFDVixVQUFNLElBQUlDLEtBQUosQ0FBVSx5RUFBVixDQUFOO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O1dBQ0ksNEJBQTBCQyxJQUExQixFQUFnQztBQUM1QixVQUFJLENBQUNBLElBQUQsSUFBUyxPQUFPQSxJQUFJLENBQUNDLG1CQUFaLEtBQW9DLFVBQWpELEVBQTZEO0FBQ3pEQyxRQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyx1RkFBZDtBQUNBO0FBQ0gsT0FKMkIsQ0FNNUI7OztBQUNBLFVBQU1DLGNBQWMsR0FBRyxLQUFLQywyQkFBTCxDQUFpQ0wsSUFBakMsQ0FBdkIsQ0FQNEIsQ0FTNUI7O0FBQ0FNLE1BQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCQyxJQUF0QixDQUEyQixVQUFDQyxLQUFELEVBQVFDLE9BQVIsRUFBb0I7QUFDM0MsWUFBTUMsS0FBSyxHQUFHSixDQUFDLENBQUNHLE9BQUQsQ0FBZjtBQUNBLFlBQU1FLFNBQVMsR0FBR0QsS0FBSyxDQUFDRSxJQUFOLENBQVcsT0FBWCxDQUFsQjtBQUNBLFlBQU1DLE9BQU8sR0FBR1QsY0FBYyxDQUFDTyxTQUFELENBQTlCOztBQUVBLFlBQUlFLE9BQUosRUFBYTtBQUNUSCxVQUFBQSxLQUFLLENBQUNJLEtBQU4sQ0FBWTtBQUNSQyxZQUFBQSxJQUFJLEVBQUVGLE9BREU7QUFFUkcsWUFBQUEsUUFBUSxFQUFFLFdBRkY7QUFHUkMsWUFBQUEsU0FBUyxFQUFFLElBSEg7QUFJUkMsWUFBQUEsS0FBSyxFQUFFO0FBQ0hDLGNBQUFBLElBQUksRUFBRSxHQURIO0FBRUhDLGNBQUFBLElBQUksRUFBRTtBQUZILGFBSkM7QUFRUkMsWUFBQUEsU0FBUyxFQUFFO0FBUkgsV0FBWjtBQVVIO0FBQ0osT0FqQkQ7QUFrQkg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLHFDQUFtQ3JCLElBQW5DLEVBQXlDO0FBQ3JDLGFBQU87QUFDSCxtQ0FBMkJBLElBQUksQ0FBQ0MsbUJBQUwsQ0FBeUIsS0FBS3FCLGlDQUFMLEVBQXpCLENBRHhCO0FBRUgsb0NBQTRCdEIsSUFBSSxDQUFDQyxtQkFBTCxDQUF5QixLQUFLc0Isa0NBQUwsRUFBekIsQ0FGekI7QUFHSCxnQ0FBd0J2QixJQUFJLENBQUNDLG1CQUFMLENBQXlCLEtBQUt1Qiw4QkFBTCxFQUF6QixDQUhyQjtBQUlILHVDQUErQnhCLElBQUksQ0FBQ0MsbUJBQUwsQ0FBeUIsS0FBS3dCLHFDQUFMLEVBQXpCLENBSjVCO0FBS0gsNEJBQW9CekIsSUFBSSxDQUFDQyxtQkFBTCxDQUF5QixLQUFLeUIsMEJBQUwsRUFBekIsQ0FMakI7QUFNSCw4QkFBc0IxQixJQUFJLENBQUNDLG1CQUFMLENBQXlCLEtBQUswQiw0QkFBTCxFQUF6QixDQU5uQjtBQU9ILDBCQUFrQjNCLElBQUksQ0FBQ0MsbUJBQUwsQ0FBeUIsS0FBSzJCLHdCQUFMLEVBQXpCLENBUGY7QUFRSCw2QkFBcUI1QixJQUFJLENBQUNDLG1CQUFMLENBQXlCLEtBQUs0QiwyQkFBTCxFQUF6QjtBQVJsQixPQUFQO0FBVUg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLDZDQUEyQztBQUN2QyxhQUFPO0FBQ0hDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQyx3Q0FEckI7QUFFSEMsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUNHLHNDQUYxQjtBQUdIQyxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ00sOENBRDFCO0FBRUlDLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLENBSEg7QUFTSEMsUUFBQUEsS0FBSyxFQUFFLENBQ0hSLGVBQWUsQ0FBQ1MsOENBRGIsRUFFSFQsZUFBZSxDQUFDVSwyQ0FGYixFQUdIVixlQUFlLENBQUNXLCtDQUhiLEVBSUhYLGVBQWUsQ0FBQ1ksc0RBSmIsQ0FUSjtBQWVIQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJUixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2MsOENBRDFCO0FBRUlQLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBZko7QUFxQkhRLFFBQUFBLEtBQUssRUFBRSxDQUNIZixlQUFlLENBQUNnQixpREFEYixFQUVIaEIsZUFBZSxDQUFDaUIsZ0RBRmIsRUFHSGpCLGVBQWUsQ0FBQ2tCLGtEQUhiLENBckJKO0FBMEJIQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJZCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ29CLCtDQUQxQjtBQUVJYixVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ3FCO0FBRmhDLFNBREcsQ0ExQko7QUFnQ0hDLFFBQUFBLE9BQU8sRUFBRTtBQUNMQyxVQUFBQSxJQUFJLEVBQUV2QixlQUFlLENBQUN3QjtBQURqQixTQWhDTjtBQW1DSEMsUUFBQUEsSUFBSSxFQUFFekIsZUFBZSxDQUFDMEI7QUFuQ25CLE9BQVA7QUFxQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLDhDQUE0QztBQUN4QyxhQUFPO0FBQ0gzQixRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQzJCLHlDQURyQjtBQUVIekIsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUM0Qix1Q0FGMUI7QUFHSHhCLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDNkIsd0NBRDFCO0FBRUl0QixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERSxDQUhIO0FBU0hDLFFBQUFBLEtBQUssRUFBRSxDQUNIUixlQUFlLENBQUM4QixrREFEYixFQUVIOUIsZUFBZSxDQUFDK0IsNkNBRmIsRUFHSC9CLGVBQWUsQ0FBQ2dDLDBDQUhiLEVBSUhoQyxlQUFlLENBQUNpQywwQ0FKYixFQUtIakMsZUFBZSxDQUFDa0MsMkNBTGIsRUFNSGxDLGVBQWUsQ0FBQ21DLDJDQU5iLEVBT0huQyxlQUFlLENBQUNvQyxnREFQYixDQVRKO0FBa0JIdkIsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVIsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNxQywyQ0FEMUI7QUFFSTlCLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBbEJKO0FBd0JIK0IsUUFBQUEsUUFBUSxFQUFFLENBQ04sbUJBRE0sRUFFTixzQkFGTSxFQUdOLHNCQUhNLENBeEJQO0FBNkJIdkIsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVYsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUN1QyxrREFEMUI7QUFFSWhDLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBN0JKO0FBbUNIWSxRQUFBQSxLQUFLLEVBQUUsQ0FDSG5CLGVBQWUsQ0FBQ3dDLGdEQURiLEVBRUh4QyxlQUFlLENBQUN5QyxtREFGYixFQUdIekMsZUFBZSxDQUFDMEMsb0RBSGIsQ0FuQ0o7QUF3Q0hwQixRQUFBQSxPQUFPLEVBQUU7QUFDTEMsVUFBQUEsSUFBSSxFQUFFdkIsZUFBZSxDQUFDMkM7QUFEakIsU0F4Q047QUEyQ0hsQixRQUFBQSxJQUFJLEVBQUV6QixlQUFlLENBQUM0QztBQTNDbkIsT0FBUDtBQTZDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksc0NBQW9DO0FBQ2hDLGFBQU87QUFDSDdDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDNkMsaUNBRHJCO0FBRUgzQyxRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQzhDLCtCQUYxQjtBQUdIMUMsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMrQywwQ0FEMUI7QUFFSXhDLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLENBSEg7QUFTSEMsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUgsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNnRCwrQ0FEMUI7QUFFSXpDLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDaUQ7QUFGaEMsU0FERyxFQUtIO0FBQ0k1QyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2tELHdDQUQxQjtBQUVJM0MsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBTEcsQ0FUSjtBQW1CSE0sUUFBQUEsS0FBSyxFQUFFLENBQ0hiLGVBQWUsQ0FBQ21ELDhDQURiLEVBRUhuRCxlQUFlLENBQUNvRCxpREFGYixFQUdIcEQsZUFBZSxDQUFDcUQsNkNBSGIsQ0FuQko7QUF3Qkh0QyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJVixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3NELHdDQUQxQjtBQUVJL0MsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0F4Qko7QUE4QkhZLFFBQUFBLEtBQUssRUFBRSxDQUNIbkIsZUFBZSxDQUFDdUQsZ0RBRGIsRUFFSHZELGVBQWUsQ0FBQ3dELG1EQUZiLEVBR0h4RCxlQUFlLENBQUN5RCwyQ0FIYixDQTlCSjtBQW1DSEMsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSXJELFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDMkQsd0NBRDFCO0FBRUlwRCxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxFQUtIO0FBQ0lGLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDNEQsNkNBRDFCO0FBRUlyRCxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzZEO0FBRmhDLFNBTEcsRUFTSDtBQUNJeEQsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUM4RCxzQ0FEMUI7QUFFSXZELFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQVRHLENBbkNKO0FBaURId0QsUUFBQUEsS0FBSyxFQUFFLENBQ0gvRCxlQUFlLENBQUNnRSw0Q0FEYixFQUVIaEUsZUFBZSxDQUFDaUUsZ0RBRmIsRUFHSGpFLGVBQWUsQ0FBQ2tFLHlDQUhiLEVBSUhsRSxlQUFlLENBQUNtRSw0Q0FKYixDQWpESjtBQXVESEMsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSS9ELFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDcUUsc0NBRDFCO0FBRUk5RCxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQXZESjtBQTZESCtELFFBQUFBLEtBQUssRUFBRSxDQUNIdEUsZUFBZSxDQUFDdUUsMkNBRGIsRUFFSHZFLGVBQWUsQ0FBQ3dFLCtDQUZiLEVBR0h4RSxlQUFlLENBQUN5RSwyQ0FIYixDQTdESjtBQWtFSEMsUUFBQUEsTUFBTSxFQUFFLENBQ0o7QUFDSXJFLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDMkUseUNBRDFCO0FBRUlwRSxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQzRFO0FBRmhDLFNBREksQ0FsRUw7QUF3RUh0RCxRQUFBQSxPQUFPLEVBQUU7QUFDTEMsVUFBQUEsSUFBSSxFQUFFdkIsZUFBZSxDQUFDNkU7QUFEakI7QUF4RU4sT0FBUDtBQTRFSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksMENBQXdDO0FBQ3BDLGFBQU87QUFDSDlFLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDOEUscUNBRHJCO0FBRUg1RSxRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQytFLG1DQUYxQjtBQUdIM0UsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNnRiwyQ0FEMUI7QUFFSXpFLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLENBSEg7QUFTSEMsUUFBQUEsS0FBSyxFQUFFLENBQ0hSLGVBQWUsQ0FBQ2lGLDZDQURiLEVBRUhqRixlQUFlLENBQUNrRiw2Q0FGYixFQUdIbEYsZUFBZSxDQUFDbUYsMENBSGIsQ0FUSjtBQWNIdEUsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVIsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNvRiw2Q0FEMUI7QUFFSTdFLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBZEo7QUFvQkhRLFFBQUFBLEtBQUssRUFBRSxDQUNIZixlQUFlLENBQUNxRixnREFEYixFQUVIckYsZUFBZSxDQUFDc0YsOENBRmIsRUFHSHRGLGVBQWUsQ0FBQ3VGLDBDQUhiLENBcEJKO0FBeUJIcEUsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSWQsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUN3Riw4Q0FEMUI7QUFFSWpGLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBekJKO0FBK0JIbUQsUUFBQUEsS0FBSyxFQUFFLENBQ0gxRCxlQUFlLENBQUN5Rix3Q0FEYixFQUVIekYsZUFBZSxDQUFDMEYsaURBRmIsRUFHSDFGLGVBQWUsQ0FBQzJGLGdEQUhiLENBL0JKO0FBb0NIbEUsUUFBQUEsSUFBSSxFQUFFekIsZUFBZSxDQUFDNEY7QUFwQ25CLE9BQVA7QUFzQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLGlEQUErQztBQUMzQyxhQUFPO0FBQ0g3RixRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQzZGLDRDQURyQjtBQUVIM0YsUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUM4RiwwQ0FGMUI7QUFHSDFGLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDK0Ysa0RBRDFCO0FBRUl4RixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERSxFQUtGO0FBQ0lGLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDZ0csb0RBRDFCO0FBRUl6RixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FMRSxDQUhIO0FBYUhDLFFBQUFBLEtBQUssRUFBRSxDQUNIUixlQUFlLENBQUNpRyxvREFEYixFQUVIakcsZUFBZSxDQUFDa0csbURBRmIsRUFHSGxHLGVBQWUsQ0FBQ21HLDZDQUhiLENBYko7QUFrQkh0RixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJUixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ29HLG9EQUQxQjtBQUVJN0YsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FsQko7QUF3QkhRLFFBQUFBLEtBQUssRUFBRSxDQUNIZixlQUFlLENBQUNxRyx1REFEYixFQUVIckcsZUFBZSxDQUFDc0cscURBRmIsRUFHSHRHLGVBQWUsQ0FBQ3VHLDJEQUhiLENBeEJKO0FBNkJIcEYsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSWQsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUN3Ryw4Q0FEMUI7QUFFSWpHLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBN0JKO0FBbUNIbUQsUUFBQUEsS0FBSyxFQUFFLENBQ0gxRCxlQUFlLENBQUN5RyxzREFEYixFQUVIekcsZUFBZSxDQUFDMEcsaURBRmIsRUFHSDFHLGVBQWUsQ0FBQzJHLDhDQUhiLENBbkNKO0FBd0NIbEYsUUFBQUEsSUFBSSxFQUFFekIsZUFBZSxDQUFDNEc7QUF4Q25CLE9BQVA7QUEwQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLHdDQUFzQztBQUNsQyxhQUFPO0FBQ0g3RyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQzZHLG1DQURyQjtBQUVIM0csUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUM4RyxpQ0FGMUI7QUFHSDFHLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDK0cscUNBRDFCO0FBRUl4RyxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ2dIO0FBRmhDLFNBREUsRUFLRjtBQUNJM0csVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNpSCx5Q0FEMUI7QUFFSTFHLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQUxFLENBSEg7QUFhSEMsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUgsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNrSCxtQ0FEMUI7QUFFSTNHLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBYko7QUFtQkhNLFFBQUFBLEtBQUssRUFBRSxDQUNIYixlQUFlLENBQUNtSCx5Q0FEYixFQUVIbkgsZUFBZSxDQUFDb0gseUNBRmIsRUFHSHBILGVBQWUsQ0FBQ3FILHlDQUhiLEVBSUhySCxlQUFlLENBQUNzSCx5Q0FKYixDQW5CSjtBQXlCSHZHLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lWLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDdUgsc0NBRDFCO0FBRUloSCxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQXpCSjtBQStCSFksUUFBQUEsS0FBSyxFQUFFLENBQ0huQixlQUFlLENBQUN3SCw0Q0FEYixFQUVIeEgsZUFBZSxDQUFDeUgsNENBRmIsRUFHSHpILGVBQWUsQ0FBQzBILDRDQUhiLEVBSUgxSCxlQUFlLENBQUMySCw0Q0FKYixDQS9CSjtBQXFDSGpFLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lyRCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzRILG1DQUQxQjtBQUVJckgsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FyQ0o7QUEyQ0h3RCxRQUFBQSxLQUFLLEVBQUUsQ0FDSC9ELGVBQWUsQ0FBQzZILHlDQURiLEVBRUg3SCxlQUFlLENBQUM4SCx5Q0FGYixFQUdIOUgsZUFBZSxDQUFDK0gseUNBSGIsQ0EzQ0o7QUFnREgzRCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJL0QsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNnSSxvQ0FEMUI7QUFFSXpILFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBaERKO0FBc0RIK0IsUUFBQUEsUUFBUSxFQUFFLENBQ04sa0ZBRE0sRUFFTixpREFGTSxFQUdOLDBDQUhNLENBdERQO0FBMkRIaEIsUUFBQUEsT0FBTyxFQUFFO0FBQ0xDLFVBQUFBLElBQUksRUFBRXZCLGVBQWUsQ0FBQ2lJO0FBRGpCLFNBM0ROO0FBOERIeEcsUUFBQUEsSUFBSSxFQUFFekIsZUFBZSxDQUFDa0k7QUE5RG5CLE9BQVA7QUFnRUg7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLG9DQUFrQztBQUM5QixhQUFPO0FBQ0huSSxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ21JLCtCQURyQjtBQUVIakksUUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUNvSSw2QkFGMUI7QUFHSGhJLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDcUksaUNBRDFCO0FBRUk5SCxVQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ3NJO0FBRmhDLFNBREUsQ0FISDtBQVNIOUgsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUgsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUN1SSxxQ0FEMUI7QUFFSWhJLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBVEo7QUFlSE0sUUFBQUEsS0FBSyxFQUFFLENBQ0hiLGVBQWUsQ0FBQ3dJLHNDQURiLEVBRUh4SSxlQUFlLENBQUN5SSxpQ0FGYixFQUdIekksZUFBZSxDQUFDMEksMkNBSGIsRUFJSDFJLGVBQWUsQ0FBQzJJLHdDQUpiLENBZko7QUFxQkg1SCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJVixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzRJLHNDQUQxQjtBQUVJckksVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FyQko7QUEyQkhZLFFBQUFBLEtBQUssRUFBRSxDQUNIbkIsZUFBZSxDQUFDNkksc0NBRGIsRUFFSDdJLGVBQWUsQ0FBQzhJLGdDQUZiLEVBR0g5SSxlQUFlLENBQUMrSSwwQ0FIYixFQUlIL0ksZUFBZSxDQUFDZ0osdUNBSmIsQ0EzQko7QUFpQ0h0RixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJckQsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNpSiw2Q0FEMUI7QUFFSTFJLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBakNKO0FBdUNId0QsUUFBQUEsS0FBSyxFQUFFLENBQ0gvRCxlQUFlLENBQUNrSixxQ0FEYixFQUVIbEosZUFBZSxDQUFDbUosc0NBRmIsRUFHSG5KLGVBQWUsQ0FBQ29KLHNDQUhiLENBdkNKO0FBNENIaEYsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSS9ELFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDcUosMENBRDFCO0FBRUk5SSxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQTVDSjtBQWtESCtELFFBQUFBLEtBQUssRUFBRSxDQUNIdEUsZUFBZSxDQUFDc0osOEJBRGIsRUFFSHRKLGVBQWUsQ0FBQ3VKLGdDQUZiLEVBR0h2SixlQUFlLENBQUN3SiwrQkFIYixFQUlIeEosZUFBZSxDQUFDeUosK0JBSmIsQ0FsREo7QUF3REhuSSxRQUFBQSxPQUFPLEVBQUU7QUFDTEMsVUFBQUEsSUFBSSxFQUFFdkIsZUFBZSxDQUFDMEo7QUFEakIsU0F4RE47QUEyREhqSSxRQUFBQSxJQUFJLEVBQUV6QixlQUFlLENBQUMySjtBQTNEbkIsT0FBUDtBQTZESDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksdUNBQXFDO0FBQ2pDLGFBQU87QUFDSDVKLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDNEosa0NBRHJCO0FBRUgxSixRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQzZKLGdDQUYxQjtBQUdIekosUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUM4Six3Q0FEMUI7QUFFSXZKLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLENBSEg7QUFTSEMsUUFBQUEsS0FBSyxFQUFFLENBQ0hSLGVBQWUsQ0FBQytKLDhDQURiLEVBRUgvSixlQUFlLENBQUNnSywwQ0FGYixFQUdIaEssZUFBZSxDQUFDaUssNkNBSGIsRUFJSGpLLGVBQWUsQ0FBQ2tLLHdDQUpiLENBVEo7QUFlSHJKLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lSLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDbUsseUNBRDFCO0FBRUk1SixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQWZKO0FBcUJIUSxRQUFBQSxLQUFLLEVBQUUsQ0FDSGYsZUFBZSxDQUFDb0ssMkNBRGIsRUFFSHBLLGVBQWUsQ0FBQ3FLLDRDQUZiLEVBR0hySyxlQUFlLENBQUNzSyx5Q0FIYixFQUlIdEssZUFBZSxDQUFDdUssdUNBSmIsQ0FyQko7QUEyQkhwSixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJZCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3dLLG9DQUQxQjtBQUVJakssVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0EzQko7QUFpQ0htRCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDFELGVBQWUsQ0FBQ3lLLDBDQURiLEVBRUh6SyxlQUFlLENBQUMwSywwQ0FGYixFQUdIMUssZUFBZSxDQUFDMkssc0NBSGIsQ0FqQ0o7QUFzQ0g1RyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJMUQsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUM0Syx3Q0FEMUI7QUFFSXJLLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBdENKO0FBNENINkQsUUFBQUEsS0FBSyxFQUFFLENBQ0hwRSxlQUFlLENBQUM2Syw0Q0FEYixFQUVIN0ssZUFBZSxDQUFDOEssb0NBRmIsRUFHSDlLLGVBQWUsQ0FBQytLLDJDQUhiLEVBSUgvSyxlQUFlLENBQUNnTCwwQ0FKYixDQTVDSjtBQWtESDFKLFFBQUFBLE9BQU8sRUFBRTtBQUNMQyxVQUFBQSxJQUFJLEVBQUV2QixlQUFlLENBQUNpTDtBQURqQixTQWxETjtBQXFESHhKLFFBQUFBLElBQUksRUFBRXpCLGVBQWUsQ0FBQ2tMO0FBckRuQixPQUFQO0FBdURIOzs7O0tBR0w7OztBQUNBLElBQUksT0FBT0MsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCck4sMEJBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgLSBUb29sdGlwIG1hbmFnZW1lbnQgZm9yIG1haWwgc2V0dGluZ3NcbiAqXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIHRvb2x0aXAgZnVuY3Rpb25hbGl0eSBmb3IgbWFpbCBzZXR0aW5ncyBmb3JtIGZpZWxkcyxcbiAqIG9mZmVyaW5nIGNvbXByZWhlbnNpdmUgaGVscCBhbmQgZ3VpZGFuY2UgZm9yIGVtYWlsIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogRmVhdHVyZXM6XG4gKiAtIFN0YXRpYyB1dGlsaXR5IGNsYXNzIGZvciBtYWlsIHNldHRpbmdzIHRvb2x0aXBzXG4gKiAtIENvbnNpc3RlbnQgdG9vbHRpcCBzdHJ1Y3R1cmUgZm9sbG93aW5nIFRPT0xUSVBfR1VJREVMSU5FU1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIGV4aXN0aW5nIHRvb2x0aXAgYnVpbGRlclxuICogLSBDb21wcmVoZW5zaXZlIGZpZWxkIGV4cGxhbmF0aW9uc1xuICpcbiAqIEBjbGFzcyBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlclxuICovXG5jbGFzcyBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlciB7XG4gICAgLyoqXG4gICAgICogUHJpdmF0ZSBjb25zdHJ1Y3RvciB0byBwcmV2ZW50IGluc3RhbnRpYXRpb25cbiAgICAgKiBUaGlzIGNsYXNzIHVzZXMgc3RhdGljIG1ldGhvZHMgZm9yIHV0aWxpdHkgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01haWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyIGlzIGEgc3RhdGljIGNsYXNzIGFuZCBjYW5ub3QgYmUgaW5zdGFudGlhdGVkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgbWFpbCBzZXR0aW5ncyBmb3JtXG4gICAgICpcbiAgICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIGFmdGVyIERPTSBpcyByZWFkeSB0byBhdHRhY2hcbiAgICAgKiB0b29sdGlwcyB0byBhbGwgY29uZmlndXJlZCBmb3JtIGZpZWxkcy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZm9ybSAtIFRoZSBmb3JtIG9iamVjdCBjb250YWluaW5nIGJ1aWxkVG9vbHRpcENvbnRlbnQgbWV0aG9kXG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemVUb29sdGlwcyhmb3JtKSB7XG4gICAgICAgIGlmICghZm9ybSB8fCB0eXBlb2YgZm9ybS5idWlsZFRvb2x0aXBDb250ZW50ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlcjogSW52YWxpZCBmb3JtIG9iamVjdCBvciBtaXNzaW5nIGJ1aWxkVG9vbHRpcENvbnRlbnQgbWV0aG9kJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgYWxsIHRvb2x0aXAgY29uZmlndXJhdGlvbnNcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB0aGlzLmdldEFsbFRvb2x0aXBDb25maWd1cmF0aW9ucyhmb3JtKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwIGZvciBlYWNoIGljb25cbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRvb2x0aXBDb25maWdzW2ZpZWxkTmFtZV07XG5cbiAgICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIG1haWwgc2V0dGluZ3MgZmllbGRzXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZvcm0gLSBUaGUgZm9ybSBvYmplY3QgY29udGFpbmluZyBidWlsZFRvb2x0aXBDb250ZW50IG1ldGhvZFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIGZpZWxkIG5hbWVzIGFzIGtleXMgYW5kIEhUTUwgY29udGVudCBhcyB2YWx1ZXNcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0QWxsVG9vbHRpcENvbmZpZ3VyYXRpb25zKGZvcm0pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICdNYWlsRW5hYmxlTm90aWZpY2F0aW9ucyc6IGZvcm0uYnVpbGRUb29sdGlwQ29udGVudCh0aGlzLmdldE1haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcCgpKSxcbiAgICAgICAgICAgICdTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWwnOiBmb3JtLmJ1aWxkVG9vbHRpcENvbnRlbnQodGhpcy5nZXRTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwKCkpLFxuICAgICAgICAgICAgJ1N5c3RlbUVtYWlsRm9yTWlzc2VkJzogZm9ybS5idWlsZFRvb2x0aXBDb250ZW50KHRoaXMuZ2V0U3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwKCkpLFxuICAgICAgICAgICAgJ1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCc6IGZvcm0uYnVpbGRUb29sdGlwQ29udGVudCh0aGlzLmdldFZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXAoKSksXG4gICAgICAgICAgICAnTWFpbFNNVFBBdXRoVHlwZSc6IGZvcm0uYnVpbGRUb29sdGlwQ29udGVudCh0aGlzLmdldE1haWxTTVRQQXV0aFR5cGVUb29sdGlwKCkpLFxuICAgICAgICAgICAgJ01haWxPQXV0aDJDbGllbnRJZCc6IGZvcm0uYnVpbGRUb29sdGlwQ29udGVudCh0aGlzLmdldE1haWxPQXV0aDJDbGllbnRJZFRvb2x0aXAoKSksXG4gICAgICAgICAgICAnTWFpbFNNVFBVc2VUTFMnOiBmb3JtLmJ1aWxkVG9vbHRpcENvbnRlbnQodGhpcy5nZXRNYWlsU01UUFVzZVRMU1Rvb2x0aXAoKSksXG4gICAgICAgICAgICAnTWFpbFNNVFBDZXJ0Q2hlY2snOiBmb3JtLmJ1aWxkVG9vbHRpcENvbnRlbnQodGhpcy5nZXRNYWlsU01UUENlcnRDaGVja1Rvb2x0aXAoKSlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBNYWlsRW5hYmxlTm90aWZpY2F0aW9ucyBmaWVsZFxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBtYWlsIG5vdGlmaWNhdGlvbnMgdG9nZ2xlXG4gICAgICovXG4gICAgc3RhdGljIGdldE1haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF93aGVuX2VuYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX21pc3NlZF9jYWxscyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3ZvaWNlbWFpbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3N5c3RlbV9ldmVudHMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9tb2R1bGVfbm90aWZpY2F0aW9uc1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3JlcXVpcmVtZW50cyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfc210cF9jb25maWd1cmVkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfc2VuZGVyX2FkZHJlc3MsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9yZWNpcGllbnRfZW1haWxzXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfd2hlbl9kaXNhYmxlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF93aGVuX2Rpc2FibGVkX2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0b29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFN5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCBmaWVsZFxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBzeXN0ZW0gbm90aWZpY2F0aW9ucyBlbWFpbFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRTeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3VzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfY3JpdGljYWxfZXJyb3JzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX2Rpc2tfc3BhY2UsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfbGljZW5zZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF91cGRhdGVzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3NlY3VyaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3NzbF9jZXJ0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX2JhY2t1cF9zdGF0dXNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZXhhbXBsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnYWRtaW5AY29tcGFueS5jb20nLFxuICAgICAgICAgICAgICAgICdzeXNhZG1pbkBleGFtcGxlLm9yZycsXG4gICAgICAgICAgICAgICAgJ21vbml0b3JpbmdAZG9tYWluLnJ1J1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF91c2VfbW9uaXRvcmVkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3NlcGFyYXRlX2FjY291bnQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZGlzdHJpYnV0aW9uX2xpc3RcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBNYWlsU01UUEF1dGhUeXBlIGZpZWxkXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFNNVFAgYXV0aGVudGljYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRNYWlsU01UUEF1dGhUeXBlVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9kZXNjX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX3Byb3MsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfcHJvX3NpbXBsZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfcHJvX3VuaXZlcnNhbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfcHJvX25vYXBpXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9jb25zLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX2Nvbl9zZWN1cml0eSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfY29uX2FwcHBhc3N3b3JkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9jb25fMmZhXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfZGVzY19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX3Byb3MsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDc6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX3Byb19zZWN1cmUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9wcm9fbm9wYXNzd29yZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX3Byb18yZmEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9wcm9fcmV2b2tlXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDg6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfY29ucyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0OTogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfY29uX3NldHVwLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfY29uX3Byb3ZpZGVycyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX2Nvbl9yZW5ld1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QxMDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3JlY29tbWVuZGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcmVjb21tZW5kYXRpb25fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTeXN0ZW1FbWFpbEZvck1pc3NlZCBmaWVsZFxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBtaXNzZWQgY2FsbHMgbm90aWZpY2F0aW9uIGVtYWlsXG4gICAgICovXG4gICAgc3RhdGljIGdldFN5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9ob3dfaXRfd29ya3MsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2ludGVybmFsX2NhbGxzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfZXh0ZXJuYWxfY2FsbHMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9ub19wZXJzb25hbFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX3VzYWdlX2V4YW1wbGVzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9leGFtcGxlX3JlY2VwdGlvbixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2V4YW1wbGVfbWFuYWdlcixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2V4YW1wbGVfY3JtXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfcmVjb21tZW5kYXRpb25zLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF91c2VfZ3JvdXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9jb25maWd1cmVfcGVyc29uYWwsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9tb25pdG9yX3JlZ3VsYXJseVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0b29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbCBmaWVsZFxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciB2b2ljZW1haWwgbm90aWZpY2F0aW9ucyBlbWFpbFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUubXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2hvd19pdF93b3JrcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9wcmlvcml0eV9vcmRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX3BlcnNvbmFsX2ZpcnN0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2NvbW1vbl9zZWNvbmQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfbm9fc2VuZFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF91c2FnZV9leGFtcGxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2V4YW1wbGVfc2VjcmV0YXJ5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2V4YW1wbGVfYXJjaGl2ZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9leGFtcGxlX3RyYW5zY3JpcHRpb25cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZmVhdHVyZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9hdWRpb19hdHRhY2htZW50LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2NhbGxlcl9pbmZvLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2R1cmF0aW9uXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0b29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIE1haWxPQXV0aDJDbGllbnRJZCBmaWVsZFxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBPQXV0aDIgQ2xpZW50IElEXG4gICAgICovXG4gICAgc3RhdGljIGdldE1haWxPQXV0aDJDbGllbnRJZFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfd2hhdGlzaXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX3doYXRpc2l0X2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfd2hlcmVfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9nb29nbGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9nb29nbGVfc3RlcDEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfZ29vZ2xlX3N0ZXAyLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX2dvb2dsZV9zdGVwMyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9nb29nbGVfc3RlcDRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfbWljcm9zb2Z0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfbWljcm9zb2Z0X3N0ZXAxLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX21pY3Jvc29mdF9zdGVwMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9taWNyb3NvZnRfc3RlcDMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfbWljcm9zb2Z0X3N0ZXA0XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX3lhbmRleCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX3lhbmRleF9zdGVwMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF95YW5kZXhfc3RlcDIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfeWFuZGV4X3N0ZXAzXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDg6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX2V4YW1wbGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnR29vZ2xlOiAxMjM0NTY3ODkwMTItYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDUuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20nLFxuICAgICAgICAgICAgICAgICdNaWNyb3NvZnQ6IDEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTAxMicsXG4gICAgICAgICAgICAgICAgJ1lhbmRleDogYTFiMmMzZDRlNWY2ZzdoOGk5ajBrMWwybTNuNG81cDYnXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgTWFpbFNNVFBVc2VUTFMgZmllbGRcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU01UUCBUTFMgdXNhZ2VcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0TWFpbFNNVFBVc2VUTFNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3doYXRpc2l0LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3doYXRpc2l0X2Rlc2NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfd2hlbl9lbmFibGVkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9zdGFydHRsc191c2VkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfcG9ydF81ODcsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9lbmNyeXB0aW9uX3VwZ3JhZGUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9tb2Rlcm5fc3RhbmRhcmRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF93aGVuX2Rpc2FibGVkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9ub19lbmNyeXB0aW9uLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfcG9ydF8yNSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX2F1dG9fdGxzX2Rpc2FibGVkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfbGVnYWN5X3NlcnZlcnNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9wb3J0X3JlY29tbWVuZGF0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfcG9ydF8yNV9kZXNjLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfcG9ydF81ODdfZGVzYyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3BvcnRfNDY1X2Rlc2NcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0ODogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9wcm92aWRlcl9zZXR0aW5ncyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0OTogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfZ21haWwsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9vdXRsb29rLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfeWFuZGV4LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfbWFpbHJ1XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0b29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIE1haWxTTVRQQ2VydENoZWNrIGZpZWxkXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFNNVFAgY2VydGlmaWNhdGUgY2hlY2tcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0TWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3doZW5fZW5hYmxlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfdmVyaWZ5X2NlcnRpZmljYXRlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfY2hlY2tfaG9zdG5hbWUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9yZWplY3Rfc2VsZnNpZ25lZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3Byb3RlY3RfbWl0bVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3doZW5fZGlzYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2FjY2VwdF9hbnlfY2VydCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2FsbG93X3NlbGZzaWduZWQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9za2lwX2hvc3RuYW1lLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfbGVzc19zZWN1cmVcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF93aGVuX3VzZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfcHVibGljX3NlcnZlcnMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9wcm9kdWN0aW9uX2VudixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2NvbXBsaWFuY2VcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF93aGVuX2Rpc2FibGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDg6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2ludGVybmFsX3NlcnZlcnMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF90ZXN0X2VudixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3NlbGZzaWduZWRfY2VydCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2xlZ2FjeV9zZXJ2ZXJzXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cbn1cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlcjtcbn0iXX0=