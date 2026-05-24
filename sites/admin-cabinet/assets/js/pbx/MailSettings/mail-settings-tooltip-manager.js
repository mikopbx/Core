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

/* global globalTranslate, TooltipBuilder */

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
      }

      if (typeof TooltipBuilder === 'undefined') {
        console.error('MailSettingsTooltipManager: TooltipBuilder is not available');
        return;
      } // Delegate to TooltipBuilder so popups use `on: 'manual'` +
      // `click.popup-trigger` + `lastResort: true`. Hover-mode (the
      // raw $().popup() default) is unreliable for icons nested in
      // toggle-checkbox <label>s — Semantic UI's checkbox swallows
      // pointer events on the label area, so hover never fires on
      // the inner <i>. See docs/TOOLTIP_GUIDELINES.md.


      TooltipBuilder.initialize(this.getAllTooltipConfigurations(form), {
        selector: '.field-info-icon',
        position: 'top right',
        hoverable: true,
        showDelay: 300,
        hideDelay: 100,
        variation: 'flowing'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9NYWlsU2V0dGluZ3MvbWFpbC1zZXR0aW5ncy10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsImZvcm0iLCJidWlsZFRvb2x0aXBDb250ZW50IiwiY29uc29sZSIsImVycm9yIiwiVG9vbHRpcEJ1aWxkZXIiLCJpbml0aWFsaXplIiwiZ2V0QWxsVG9vbHRpcENvbmZpZ3VyYXRpb25zIiwic2VsZWN0b3IiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsInNob3dEZWxheSIsImhpZGVEZWxheSIsInZhcmlhdGlvbiIsImdldE1haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcCIsImdldFN5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXAiLCJnZXRTeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXAiLCJnZXRWb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwIiwiZ2V0TWFpbFNNVFBBdXRoVHlwZVRvb2x0aXAiLCJnZXRNYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwIiwiZ2V0TWFpbFNNVFBVc2VUTFNUb29sdGlwIiwiZ2V0TWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwIiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwibXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwibXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsIm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF93aGVuX2VuYWJsZWQiLCJkZWZpbml0aW9uIiwibGlzdDIiLCJtc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfbWlzc2VkX2NhbGxzIiwibXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3ZvaWNlbWFpbCIsIm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9zeXN0ZW1fZXZlbnRzIiwibXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX21vZHVsZV9ub3RpZmljYXRpb25zIiwibGlzdDMiLCJtc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfcmVxdWlyZW1lbnRzIiwibGlzdDQiLCJtc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfc210cF9jb25maWd1cmVkIiwibXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3NlbmRlcl9hZGRyZXNzIiwibXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3JlY2lwaWVudF9lbWFpbHMiLCJsaXN0NSIsIm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF93aGVuX2Rpc2FibGVkIiwibXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3doZW5fZGlzYWJsZWRfZGVzYyIsIndhcm5pbmciLCJ0ZXh0IiwibXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3dhcm5pbmciLCJub3RlIiwibXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX25vdGUiLCJtc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX2hlYWRlciIsIm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZGVzYyIsIm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfdXNhZ2UiLCJtc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX2NyaXRpY2FsX2Vycm9ycyIsIm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZGlza19zcGFjZSIsIm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfbGljZW5zZSIsIm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfdXBkYXRlcyIsIm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfc2VjdXJpdHkiLCJtc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3NzbF9jZXJ0IiwibXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9iYWNrdXBfc3RhdHVzIiwibXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9leGFtcGxlcyIsImV4YW1wbGVzIiwibXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnMiLCJtc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3VzZV9tb25pdG9yZWQiLCJtc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3NlcGFyYXRlX2FjY291bnQiLCJtc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX2Rpc3RyaWJ1dGlvbl9saXN0IiwibXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF93YXJuaW5nIiwibXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9ub3RlIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfaGVhZGVyIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfZGVzYyIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX2hlYWRlciIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX2Rlc2NfaGVhZGVyIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfZGVzYyIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX3Byb3MiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9wcm9fc2ltcGxlIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfcHJvX3VuaXZlcnNhbCIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX3Byb19ub2FwaSIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX2NvbnMiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9jb25fc2VjdXJpdHkiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9jb25fYXBwcGFzc3dvcmQiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9jb25fMmZhIiwibGlzdDYiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfaGVhZGVyIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX2Rlc2NfaGVhZGVyIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX2Rlc2MiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfcHJvcyIsImxpc3Q3IiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX3Byb19zZWN1cmUiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfcHJvX25vcGFzc3dvcmQiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfcHJvXzJmYSIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9wcm9fcmV2b2tlIiwibGlzdDgiLCJtc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfY29ucyIsImxpc3Q5IiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX2Nvbl9zZXR1cCIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9jb25fcHJvdmlkZXJzIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX2Nvbl9yZW5ldyIsImxpc3QxMCIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3JlY29tbWVuZGF0aW9uIiwibXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcmVjb21tZW5kYXRpb25fZGVzYyIsIm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3dhcm5pbmciLCJtc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfaGVhZGVyIiwibXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2Rlc2MiLCJtc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfaG93X2l0X3dvcmtzIiwibXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2ludGVybmFsX2NhbGxzIiwibXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2V4dGVybmFsX2NhbGxzIiwibXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX25vX3BlcnNvbmFsIiwibXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX3VzYWdlX2V4YW1wbGVzIiwibXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2V4YW1wbGVfcmVjZXB0aW9uIiwibXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2V4YW1wbGVfbWFuYWdlciIsIm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9leGFtcGxlX2NybSIsIm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnMiLCJtc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfdXNlX2dyb3VwIiwibXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2NvbmZpZ3VyZV9wZXJzb25hbCIsIm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9tb25pdG9yX3JlZ3VsYXJseSIsIm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9ub3RlIiwibXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9oZWFkZXIiLCJtc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2Rlc2MiLCJtc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2hvd19pdF93b3JrcyIsIm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfcHJpb3JpdHlfb3JkZXIiLCJtc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX3BlcnNvbmFsX2ZpcnN0IiwibXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9jb21tb25fc2Vjb25kIiwibXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9ub19zZW5kIiwibXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF91c2FnZV9leGFtcGxlcyIsIm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZXhhbXBsZV9zZWNyZXRhcnkiLCJtc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2V4YW1wbGVfYXJjaGl2ZSIsIm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZXhhbXBsZV90cmFuc2NyaXB0aW9uIiwibXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9mZWF0dXJlcyIsIm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfYXVkaW9fYXR0YWNobWVudCIsIm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfY2FsbGVyX2luZm8iLCJtc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2R1cmF0aW9uIiwibXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9ub3RlIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9oZWFkZXIiLCJtc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX2Rlc2MiLCJtc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX3doYXRpc2l0IiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF93aGF0aXNpdF9kZXNjIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF93aGVyZV9oZWFkZXIiLCJtc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX2dvb2dsZSIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfZ29vZ2xlX3N0ZXAxIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9nb29nbGVfc3RlcDIiLCJtc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX2dvb2dsZV9zdGVwMyIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfZ29vZ2xlX3N0ZXA0IiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9taWNyb3NvZnQiLCJtc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX21pY3Jvc29mdF9zdGVwMSIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfbWljcm9zb2Z0X3N0ZXAyIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9taWNyb3NvZnRfc3RlcDMiLCJtc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX21pY3Jvc29mdF9zdGVwNCIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfeWFuZGV4IiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF95YW5kZXhfc3RlcDEiLCJtc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX3lhbmRleF9zdGVwMiIsIm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfeWFuZGV4X3N0ZXAzIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9leGFtcGxlIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF93YXJuaW5nIiwibXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9ub3RlIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX2hlYWRlciIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9kZXNjIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3doYXRpc2l0IiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3doYXRpc2l0X2Rlc2MiLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfd2hlbl9lbmFibGVkIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3N0YXJ0dGxzX3VzZWQiLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfcG9ydF81ODciLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfZW5jcnlwdGlvbl91cGdyYWRlIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX21vZGVybl9zdGFuZGFyZCIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF93aGVuX2Rpc2FibGVkIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX25vX2VuY3J5cHRpb24iLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfcG9ydF8yNSIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9hdXRvX3Rsc19kaXNhYmxlZCIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9sZWdhY3lfc2VydmVycyIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9wb3J0X3JlY29tbWVuZGF0aW9ucyIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9wb3J0XzI1X2Rlc2MiLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfcG9ydF81ODdfZGVzYyIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9wb3J0XzQ2NV9kZXNjIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3Byb3ZpZGVyX3NldHRpbmdzIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX2dtYWlsIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX291dGxvb2siLCJtc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfeWFuZGV4IiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX21haWxydSIsIm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF93YXJuaW5nIiwibXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX25vdGUiLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfaGVhZGVyIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2Rlc2MiLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfd2hlbl9lbmFibGVkIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3ZlcmlmeV9jZXJ0aWZpY2F0ZSIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9jaGVja19ob3N0bmFtZSIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9yZWplY3Rfc2VsZnNpZ25lZCIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9wcm90ZWN0X21pdG0iLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfd2hlbl9kaXNhYmxlZCIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9hY2NlcHRfYW55X2NlcnQiLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfYWxsb3dfc2VsZnNpZ25lZCIsIm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9za2lwX2hvc3RuYW1lIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2xlc3Nfc2VjdXJlIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3doZW5fdXNlIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3B1YmxpY19zZXJ2ZXJzIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3Byb2R1Y3Rpb25fZW52IiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2NvbXBsaWFuY2UiLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfd2hlbl9kaXNhYmxlIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2ludGVybmFsX3NlcnZlcnMiLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfdGVzdF9lbnYiLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfc2VsZnNpZ25lZF9jZXJ0IiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX2xlZ2FjeV9zZXJ2ZXJzIiwibXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3dhcm5pbmciLCJtc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfbm90ZSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLDBCO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDSSx3Q0FBYztBQUFBOztBQUNWLFVBQU0sSUFBSUMsS0FBSixDQUFVLHlFQUFWLENBQU47QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7V0FDSSw0QkFBMEJDLElBQTFCLEVBQWdDO0FBQzVCLFVBQUksQ0FBQ0EsSUFBRCxJQUFTLE9BQU9BLElBQUksQ0FBQ0MsbUJBQVosS0FBb0MsVUFBakQsRUFBNkQ7QUFDekRDLFFBQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLHVGQUFkO0FBQ0E7QUFDSDs7QUFFRCxVQUFJLE9BQU9DLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDdkNGLFFBQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLDZEQUFkO0FBQ0E7QUFDSCxPQVQyQixDQVc1QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBQyxNQUFBQSxjQUFjLENBQUNDLFVBQWYsQ0FBMEIsS0FBS0MsMkJBQUwsQ0FBaUNOLElBQWpDLENBQTFCLEVBQWtFO0FBQzlETyxRQUFBQSxRQUFRLEVBQUUsa0JBRG9EO0FBRTlEQyxRQUFBQSxRQUFRLEVBQUUsV0FGb0Q7QUFHOURDLFFBQUFBLFNBQVMsRUFBRSxJQUhtRDtBQUk5REMsUUFBQUEsU0FBUyxFQUFFLEdBSm1EO0FBSzlEQyxRQUFBQSxTQUFTLEVBQUUsR0FMbUQ7QUFNOURDLFFBQUFBLFNBQVMsRUFBRTtBQU5tRCxPQUFsRTtBQVFIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSxxQ0FBbUNaLElBQW5DLEVBQXlDO0FBQ3JDLGFBQU87QUFDSCxtQ0FBMkJBLElBQUksQ0FBQ0MsbUJBQUwsQ0FBeUIsS0FBS1ksaUNBQUwsRUFBekIsQ0FEeEI7QUFFSCxvQ0FBNEJiLElBQUksQ0FBQ0MsbUJBQUwsQ0FBeUIsS0FBS2Esa0NBQUwsRUFBekIsQ0FGekI7QUFHSCxnQ0FBd0JkLElBQUksQ0FBQ0MsbUJBQUwsQ0FBeUIsS0FBS2MsOEJBQUwsRUFBekIsQ0FIckI7QUFJSCx1Q0FBK0JmLElBQUksQ0FBQ0MsbUJBQUwsQ0FBeUIsS0FBS2UscUNBQUwsRUFBekIsQ0FKNUI7QUFLSCw0QkFBb0JoQixJQUFJLENBQUNDLG1CQUFMLENBQXlCLEtBQUtnQiwwQkFBTCxFQUF6QixDQUxqQjtBQU1ILDhCQUFzQmpCLElBQUksQ0FBQ0MsbUJBQUwsQ0FBeUIsS0FBS2lCLDRCQUFMLEVBQXpCLENBTm5CO0FBT0gsMEJBQWtCbEIsSUFBSSxDQUFDQyxtQkFBTCxDQUF5QixLQUFLa0Isd0JBQUwsRUFBekIsQ0FQZjtBQVFILDZCQUFxQm5CLElBQUksQ0FBQ0MsbUJBQUwsQ0FBeUIsS0FBS21CLDJCQUFMLEVBQXpCO0FBUmxCLE9BQVA7QUFVSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksNkNBQTJDO0FBQ3ZDLGFBQU87QUFDSEMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDLHdDQURyQjtBQUVIQyxRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQ0csc0NBRjFCO0FBR0hDLFFBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDTSw4Q0FEMUI7QUFFSUMsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREUsQ0FISDtBQVNIQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSFIsZUFBZSxDQUFDUyw4Q0FEYixFQUVIVCxlQUFlLENBQUNVLDJDQUZiLEVBR0hWLGVBQWUsQ0FBQ1csK0NBSGIsRUFJSFgsZUFBZSxDQUFDWSxzREFKYixDQVRKO0FBZUhDLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lSLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDYyw4Q0FEMUI7QUFFSVAsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FmSjtBQXFCSFEsUUFBQUEsS0FBSyxFQUFFLENBQ0hmLGVBQWUsQ0FBQ2dCLGlEQURiLEVBRUhoQixlQUFlLENBQUNpQixnREFGYixFQUdIakIsZUFBZSxDQUFDa0Isa0RBSGIsQ0FyQko7QUEwQkhDLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lkLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDb0IsK0NBRDFCO0FBRUliLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDcUI7QUFGaEMsU0FERyxDQTFCSjtBQWdDSEMsUUFBQUEsT0FBTyxFQUFFO0FBQ0xDLFVBQUFBLElBQUksRUFBRXZCLGVBQWUsQ0FBQ3dCO0FBRGpCLFNBaENOO0FBbUNIQyxRQUFBQSxJQUFJLEVBQUV6QixlQUFlLENBQUMwQjtBQW5DbkIsT0FBUDtBQXFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksOENBQTRDO0FBQ3hDLGFBQU87QUFDSDNCLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDMkIseUNBRHJCO0FBRUh6QixRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQzRCLHVDQUYxQjtBQUdIeEIsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUM2Qix3Q0FEMUI7QUFFSXRCLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLENBSEg7QUFTSEMsUUFBQUEsS0FBSyxFQUFFLENBQ0hSLGVBQWUsQ0FBQzhCLGtEQURiLEVBRUg5QixlQUFlLENBQUMrQiw2Q0FGYixFQUdIL0IsZUFBZSxDQUFDZ0MsMENBSGIsRUFJSGhDLGVBQWUsQ0FBQ2lDLDBDQUpiLEVBS0hqQyxlQUFlLENBQUNrQywyQ0FMYixFQU1IbEMsZUFBZSxDQUFDbUMsMkNBTmIsRUFPSG5DLGVBQWUsQ0FBQ29DLGdEQVBiLENBVEo7QUFrQkh2QixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJUixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3FDLDJDQUQxQjtBQUVJOUIsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FsQko7QUF3QkgrQixRQUFBQSxRQUFRLEVBQUUsQ0FDTixtQkFETSxFQUVOLHNCQUZNLEVBR04sc0JBSE0sQ0F4QlA7QUE2Qkh2QixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJVixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3VDLGtEQUQxQjtBQUVJaEMsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0E3Qko7QUFtQ0hZLFFBQUFBLEtBQUssRUFBRSxDQUNIbkIsZUFBZSxDQUFDd0MsZ0RBRGIsRUFFSHhDLGVBQWUsQ0FBQ3lDLG1EQUZiLEVBR0h6QyxlQUFlLENBQUMwQyxvREFIYixDQW5DSjtBQXdDSHBCLFFBQUFBLE9BQU8sRUFBRTtBQUNMQyxVQUFBQSxJQUFJLEVBQUV2QixlQUFlLENBQUMyQztBQURqQixTQXhDTjtBQTJDSGxCLFFBQUFBLElBQUksRUFBRXpCLGVBQWUsQ0FBQzRDO0FBM0NuQixPQUFQO0FBNkNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSxzQ0FBb0M7QUFDaEMsYUFBTztBQUNIN0MsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUM2QyxpQ0FEckI7QUFFSDNDLFFBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDOEMsK0JBRjFCO0FBR0gxQyxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQytDLDBDQUQxQjtBQUVJeEMsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREUsQ0FISDtBQVNIQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJSCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2dELCtDQUQxQjtBQUVJekMsVUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUNpRDtBQUZoQyxTQURHLEVBS0g7QUFDSTVDLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDa0Qsd0NBRDFCO0FBRUkzQyxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FMRyxDQVRKO0FBbUJITSxRQUFBQSxLQUFLLEVBQUUsQ0FDSGIsZUFBZSxDQUFDbUQsOENBRGIsRUFFSG5ELGVBQWUsQ0FBQ29ELGlEQUZiLEVBR0hwRCxlQUFlLENBQUNxRCw2Q0FIYixDQW5CSjtBQXdCSHRDLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lWLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDc0Qsd0NBRDFCO0FBRUkvQyxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQXhCSjtBQThCSFksUUFBQUEsS0FBSyxFQUFFLENBQ0huQixlQUFlLENBQUN1RCxnREFEYixFQUVIdkQsZUFBZSxDQUFDd0QsbURBRmIsRUFHSHhELGVBQWUsQ0FBQ3lELDJDQUhiLENBOUJKO0FBbUNIQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJckQsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMyRCx3Q0FEMUI7QUFFSXBELFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLEVBS0g7QUFDSUYsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUM0RCw2Q0FEMUI7QUFFSXJELFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDNkQ7QUFGaEMsU0FMRyxFQVNIO0FBQ0l4RCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzhELHNDQUQxQjtBQUVJdkQsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBVEcsQ0FuQ0o7QUFpREh3RCxRQUFBQSxLQUFLLEVBQUUsQ0FDSC9ELGVBQWUsQ0FBQ2dFLDRDQURiLEVBRUhoRSxlQUFlLENBQUNpRSxnREFGYixFQUdIakUsZUFBZSxDQUFDa0UseUNBSGIsRUFJSGxFLGVBQWUsQ0FBQ21FLDRDQUpiLENBakRKO0FBdURIQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJL0QsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNxRSxzQ0FEMUI7QUFFSTlELFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBdkRKO0FBNkRIK0QsUUFBQUEsS0FBSyxFQUFFLENBQ0h0RSxlQUFlLENBQUN1RSwyQ0FEYixFQUVIdkUsZUFBZSxDQUFDd0UsK0NBRmIsRUFHSHhFLGVBQWUsQ0FBQ3lFLDJDQUhiLENBN0RKO0FBa0VIQyxRQUFBQSxNQUFNLEVBQUUsQ0FDSjtBQUNJckUsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMyRSx5Q0FEMUI7QUFFSXBFLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDNEU7QUFGaEMsU0FESSxDQWxFTDtBQXdFSHRELFFBQUFBLE9BQU8sRUFBRTtBQUNMQyxVQUFBQSxJQUFJLEVBQUV2QixlQUFlLENBQUM2RTtBQURqQjtBQXhFTixPQUFQO0FBNEVIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSwwQ0FBd0M7QUFDcEMsYUFBTztBQUNIOUUsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUM4RSxxQ0FEckI7QUFFSDVFLFFBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDK0UsbUNBRjFCO0FBR0gzRSxRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2dGLDJDQUQxQjtBQUVJekUsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREUsQ0FISDtBQVNIQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSFIsZUFBZSxDQUFDaUYsNkNBRGIsRUFFSGpGLGVBQWUsQ0FBQ2tGLDZDQUZiLEVBR0hsRixlQUFlLENBQUNtRiwwQ0FIYixDQVRKO0FBY0h0RSxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJUixVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ29GLDZDQUQxQjtBQUVJN0UsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FkSjtBQW9CSFEsUUFBQUEsS0FBSyxFQUFFLENBQ0hmLGVBQWUsQ0FBQ3FGLGdEQURiLEVBRUhyRixlQUFlLENBQUNzRiw4Q0FGYixFQUdIdEYsZUFBZSxDQUFDdUYsMENBSGIsQ0FwQko7QUF5QkhwRSxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJZCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3dGLDhDQUQxQjtBQUVJakYsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0F6Qko7QUErQkhtRCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDFELGVBQWUsQ0FBQ3lGLHdDQURiLEVBRUh6RixlQUFlLENBQUMwRixpREFGYixFQUdIMUYsZUFBZSxDQUFDMkYsZ0RBSGIsQ0EvQko7QUFvQ0hsRSxRQUFBQSxJQUFJLEVBQUV6QixlQUFlLENBQUM0RjtBQXBDbkIsT0FBUDtBQXNDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksaURBQStDO0FBQzNDLGFBQU87QUFDSDdGLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDNkYsNENBRHJCO0FBRUgzRixRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQzhGLDBDQUYxQjtBQUdIMUYsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMrRixrREFEMUI7QUFFSXhGLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURFLEVBS0Y7QUFDSUYsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNnRyxvREFEMUI7QUFFSXpGLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQUxFLENBSEg7QUFhSEMsUUFBQUEsS0FBSyxFQUFFLENBQ0hSLGVBQWUsQ0FBQ2lHLG9EQURiLEVBRUhqRyxlQUFlLENBQUNrRyxtREFGYixFQUdIbEcsZUFBZSxDQUFDbUcsNkNBSGIsQ0FiSjtBQWtCSHRGLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lSLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDb0csb0RBRDFCO0FBRUk3RixVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQWxCSjtBQXdCSFEsUUFBQUEsS0FBSyxFQUFFLENBQ0hmLGVBQWUsQ0FBQ3FHLHVEQURiLEVBRUhyRyxlQUFlLENBQUNzRyxxREFGYixFQUdIdEcsZUFBZSxDQUFDdUcsMkRBSGIsQ0F4Qko7QUE2QkhwRixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJZCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3dHLDhDQUQxQjtBQUVJakcsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0E3Qko7QUFtQ0htRCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDFELGVBQWUsQ0FBQ3lHLHNEQURiLEVBRUh6RyxlQUFlLENBQUMwRyxpREFGYixFQUdIMUcsZUFBZSxDQUFDMkcsOENBSGIsQ0FuQ0o7QUF3Q0hsRixRQUFBQSxJQUFJLEVBQUV6QixlQUFlLENBQUM0RztBQXhDbkIsT0FBUDtBQTBDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksd0NBQXNDO0FBQ2xDLGFBQU87QUFDSDdHLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDNkcsbUNBRHJCO0FBRUgzRyxRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQzhHLGlDQUYxQjtBQUdIMUcsUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUMrRyxxQ0FEMUI7QUFFSXhHLFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDZ0g7QUFGaEMsU0FERSxFQUtGO0FBQ0kzRyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2lILHlDQUQxQjtBQUVJMUcsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBTEUsQ0FISDtBQWFIQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJSCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2tILG1DQUQxQjtBQUVJM0csVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FiSjtBQW1CSE0sUUFBQUEsS0FBSyxFQUFFLENBQ0hiLGVBQWUsQ0FBQ21ILHlDQURiLEVBRUhuSCxlQUFlLENBQUNvSCx5Q0FGYixFQUdIcEgsZUFBZSxDQUFDcUgseUNBSGIsRUFJSHJILGVBQWUsQ0FBQ3NILHlDQUpiLENBbkJKO0FBeUJIdkcsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVYsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUN1SCxzQ0FEMUI7QUFFSWhILFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBekJKO0FBK0JIWSxRQUFBQSxLQUFLLEVBQUUsQ0FDSG5CLGVBQWUsQ0FBQ3dILDRDQURiLEVBRUh4SCxlQUFlLENBQUN5SCw0Q0FGYixFQUdIekgsZUFBZSxDQUFDMEgsNENBSGIsRUFJSDFILGVBQWUsQ0FBQzJILDRDQUpiLENBL0JKO0FBcUNIakUsUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSXJELFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDNEgsbUNBRDFCO0FBRUlySCxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQXJDSjtBQTJDSHdELFFBQUFBLEtBQUssRUFBRSxDQUNIL0QsZUFBZSxDQUFDNkgseUNBRGIsRUFFSDdILGVBQWUsQ0FBQzhILHlDQUZiLEVBR0g5SCxlQUFlLENBQUMrSCx5Q0FIYixDQTNDSjtBQWdESDNELFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0kvRCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2dJLG9DQUQxQjtBQUVJekgsVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FoREo7QUFzREgrQixRQUFBQSxRQUFRLEVBQUUsQ0FDTixrRkFETSxFQUVOLGlEQUZNLEVBR04sMENBSE0sQ0F0RFA7QUEyREhoQixRQUFBQSxPQUFPLEVBQUU7QUFDTEMsVUFBQUEsSUFBSSxFQUFFdkIsZUFBZSxDQUFDaUk7QUFEakIsU0EzRE47QUE4REh4RyxRQUFBQSxJQUFJLEVBQUV6QixlQUFlLENBQUNrSTtBQTlEbkIsT0FBUDtBQWdFSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksb0NBQWtDO0FBQzlCLGFBQU87QUFDSG5JLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDbUksK0JBRHJCO0FBRUhqSSxRQUFBQSxXQUFXLEVBQUVGLGVBQWUsQ0FBQ29JLDZCQUYxQjtBQUdIaEksUUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNxSSxpQ0FEMUI7QUFFSTlILFVBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDc0k7QUFGaEMsU0FERSxDQUhIO0FBU0g5SCxRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJSCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ3VJLHFDQUQxQjtBQUVJaEksVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FUSjtBQWVITSxRQUFBQSxLQUFLLEVBQUUsQ0FDSGIsZUFBZSxDQUFDd0ksc0NBRGIsRUFFSHhJLGVBQWUsQ0FBQ3lJLGlDQUZiLEVBR0h6SSxlQUFlLENBQUMwSSwyQ0FIYixFQUlIMUksZUFBZSxDQUFDMkksd0NBSmIsQ0FmSjtBQXFCSDVILFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lWLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDNEksc0NBRDFCO0FBRUlySSxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQXJCSjtBQTJCSFksUUFBQUEsS0FBSyxFQUFFLENBQ0huQixlQUFlLENBQUM2SSxzQ0FEYixFQUVIN0ksZUFBZSxDQUFDOEksZ0NBRmIsRUFHSDlJLGVBQWUsQ0FBQytJLDBDQUhiLEVBSUgvSSxlQUFlLENBQUNnSix1Q0FKYixDQTNCSjtBQWlDSHRGLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lyRCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQ2lKLDZDQUQxQjtBQUVJMUksVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0FqQ0o7QUF1Q0h3RCxRQUFBQSxLQUFLLEVBQUUsQ0FDSC9ELGVBQWUsQ0FBQ2tKLHFDQURiLEVBRUhsSixlQUFlLENBQUNtSixzQ0FGYixFQUdIbkosZUFBZSxDQUFDb0osc0NBSGIsQ0F2Q0o7QUE0Q0hoRixRQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJL0QsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNxSiwwQ0FEMUI7QUFFSTlJLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBNUNKO0FBa0RIK0QsUUFBQUEsS0FBSyxFQUFFLENBQ0h0RSxlQUFlLENBQUNzSiw4QkFEYixFQUVIdEosZUFBZSxDQUFDdUosZ0NBRmIsRUFHSHZKLGVBQWUsQ0FBQ3dKLCtCQUhiLEVBSUh4SixlQUFlLENBQUN5SiwrQkFKYixDQWxESjtBQXdESG5JLFFBQUFBLE9BQU8sRUFBRTtBQUNMQyxVQUFBQSxJQUFJLEVBQUV2QixlQUFlLENBQUMwSjtBQURqQixTQXhETjtBQTJESGpJLFFBQUFBLElBQUksRUFBRXpCLGVBQWUsQ0FBQzJKO0FBM0RuQixPQUFQO0FBNkRIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSx1Q0FBcUM7QUFDakMsYUFBTztBQUNINUosUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUM0SixrQ0FEckI7QUFFSDFKLFFBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDNkosZ0NBRjFCO0FBR0h6SixRQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzhKLHdDQUQxQjtBQUVJdkosVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREUsQ0FISDtBQVNIQyxRQUFBQSxLQUFLLEVBQUUsQ0FDSFIsZUFBZSxDQUFDK0osOENBRGIsRUFFSC9KLGVBQWUsQ0FBQ2dLLDBDQUZiLEVBR0hoSyxlQUFlLENBQUNpSyw2Q0FIYixFQUlIakssZUFBZSxDQUFDa0ssd0NBSmIsQ0FUSjtBQWVIckosUUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSVIsVUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNtSyx5Q0FEMUI7QUFFSTVKLFVBQUFBLFVBQVUsRUFBRTtBQUZoQixTQURHLENBZko7QUFxQkhRLFFBQUFBLEtBQUssRUFBRSxDQUNIZixlQUFlLENBQUNvSywyQ0FEYixFQUVIcEssZUFBZSxDQUFDcUssNENBRmIsRUFHSHJLLGVBQWUsQ0FBQ3NLLHlDQUhiLEVBSUh0SyxlQUFlLENBQUN1Syx1Q0FKYixDQXJCSjtBQTJCSHBKLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lkLFVBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDd0ssb0NBRDFCO0FBRUlqSyxVQUFBQSxVQUFVLEVBQUU7QUFGaEIsU0FERyxDQTNCSjtBQWlDSG1ELFFBQUFBLEtBQUssRUFBRSxDQUNIMUQsZUFBZSxDQUFDeUssMENBRGIsRUFFSHpLLGVBQWUsQ0FBQzBLLDBDQUZiLEVBR0gxSyxlQUFlLENBQUMySyxzQ0FIYixDQWpDSjtBQXNDSDVHLFFBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0kxRCxVQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzRLLHdDQUQxQjtBQUVJckssVUFBQUEsVUFBVSxFQUFFO0FBRmhCLFNBREcsQ0F0Q0o7QUE0Q0g2RCxRQUFBQSxLQUFLLEVBQUUsQ0FDSHBFLGVBQWUsQ0FBQzZLLDRDQURiLEVBRUg3SyxlQUFlLENBQUM4SyxvQ0FGYixFQUdIOUssZUFBZSxDQUFDK0ssMkNBSGIsRUFJSC9LLGVBQWUsQ0FBQ2dMLDBDQUpiLENBNUNKO0FBa0RIMUosUUFBQUEsT0FBTyxFQUFFO0FBQ0xDLFVBQUFBLElBQUksRUFBRXZCLGVBQWUsQ0FBQ2lMO0FBRGpCLFNBbEROO0FBcURIeEosUUFBQUEsSUFBSSxFQUFFekIsZUFBZSxDQUFDa0w7QUFyRG5CLE9BQVA7QUF1REg7Ozs7S0FHTDs7O0FBQ0EsSUFBSSxPQUFPQyxNQUFQLEtBQWtCLFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQTVDLEVBQXFEO0FBQ2pERCxFQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUI1TSwwQkFBakI7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXIgLSBUb29sdGlwIG1hbmFnZW1lbnQgZm9yIG1haWwgc2V0dGluZ3NcbiAqXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIHRvb2x0aXAgZnVuY3Rpb25hbGl0eSBmb3IgbWFpbCBzZXR0aW5ncyBmb3JtIGZpZWxkcyxcbiAqIG9mZmVyaW5nIGNvbXByZWhlbnNpdmUgaGVscCBhbmQgZ3VpZGFuY2UgZm9yIGVtYWlsIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogRmVhdHVyZXM6XG4gKiAtIFN0YXRpYyB1dGlsaXR5IGNsYXNzIGZvciBtYWlsIHNldHRpbmdzIHRvb2x0aXBzXG4gKiAtIENvbnNpc3RlbnQgdG9vbHRpcCBzdHJ1Y3R1cmUgZm9sbG93aW5nIFRPT0xUSVBfR1VJREVMSU5FU1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIGV4aXN0aW5nIHRvb2x0aXAgYnVpbGRlclxuICogLSBDb21wcmVoZW5zaXZlIGZpZWxkIGV4cGxhbmF0aW9uc1xuICpcbiAqIEBjbGFzcyBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlclxuICovXG5jbGFzcyBNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlciB7XG4gICAgLyoqXG4gICAgICogUHJpdmF0ZSBjb25zdHJ1Y3RvciB0byBwcmV2ZW50IGluc3RhbnRpYXRpb25cbiAgICAgKiBUaGlzIGNsYXNzIHVzZXMgc3RhdGljIG1ldGhvZHMgZm9yIHV0aWxpdHkgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01haWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyIGlzIGEgc3RhdGljIGNsYXNzIGFuZCBjYW5ub3QgYmUgaW5zdGFudGlhdGVkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgbWFpbCBzZXR0aW5ncyBmb3JtXG4gICAgICpcbiAgICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgY2FsbGVkIGFmdGVyIERPTSBpcyByZWFkeSB0byBhdHRhY2hcbiAgICAgKiB0b29sdGlwcyB0byBhbGwgY29uZmlndXJlZCBmb3JtIGZpZWxkcy5cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZm9ybSAtIFRoZSBmb3JtIG9iamVjdCBjb250YWluaW5nIGJ1aWxkVG9vbHRpcENvbnRlbnQgbWV0aG9kXG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemVUb29sdGlwcyhmb3JtKSB7XG4gICAgICAgIGlmICghZm9ybSB8fCB0eXBlb2YgZm9ybS5idWlsZFRvb2x0aXBDb250ZW50ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdNYWlsU2V0dGluZ3NUb29sdGlwTWFuYWdlcjogSW52YWxpZCBmb3JtIG9iamVjdCBvciBtaXNzaW5nIGJ1aWxkVG9vbHRpcENvbnRlbnQgbWV0aG9kJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTWFpbFNldHRpbmdzVG9vbHRpcE1hbmFnZXI6IFRvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlbGVnYXRlIHRvIFRvb2x0aXBCdWlsZGVyIHNvIHBvcHVwcyB1c2UgYG9uOiAnbWFudWFsJ2AgK1xuICAgICAgICAvLyBgY2xpY2sucG9wdXAtdHJpZ2dlcmAgKyBgbGFzdFJlc29ydDogdHJ1ZWAuIEhvdmVyLW1vZGUgKHRoZVxuICAgICAgICAvLyByYXcgJCgpLnBvcHVwKCkgZGVmYXVsdCkgaXMgdW5yZWxpYWJsZSBmb3IgaWNvbnMgbmVzdGVkIGluXG4gICAgICAgIC8vIHRvZ2dsZS1jaGVja2JveCA8bGFiZWw+cyDigJQgU2VtYW50aWMgVUkncyBjaGVja2JveCBzd2FsbG93c1xuICAgICAgICAvLyBwb2ludGVyIGV2ZW50cyBvbiB0aGUgbGFiZWwgYXJlYSwgc28gaG92ZXIgbmV2ZXIgZmlyZXMgb25cbiAgICAgICAgLy8gdGhlIGlubmVyIDxpPi4gU2VlIGRvY3MvVE9PTFRJUF9HVUlERUxJTkVTLm1kLlxuICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRoaXMuZ2V0QWxsVG9vbHRpcENvbmZpZ3VyYXRpb25zKGZvcm0pLCB7XG4gICAgICAgICAgICBzZWxlY3RvcjogJy5maWVsZC1pbmZvLWljb24nLFxuICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgc2hvd0RlbGF5OiAzMDAsXG4gICAgICAgICAgICBoaWRlRGVsYXk6IDEwMCxcbiAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgbWFpbCBzZXR0aW5ncyBmaWVsZHNcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZm9ybSAtIFRoZSBmb3JtIG9iamVjdCBjb250YWluaW5nIGJ1aWxkVG9vbHRpcENvbnRlbnQgbWV0aG9kXG4gICAgICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggZmllbGQgbmFtZXMgYXMga2V5cyBhbmQgSFRNTCBjb250ZW50IGFzIHZhbHVlc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRBbGxUb29sdGlwQ29uZmlndXJhdGlvbnMoZm9ybSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgJ01haWxFbmFibGVOb3RpZmljYXRpb25zJzogZm9ybS5idWlsZFRvb2x0aXBDb250ZW50KHRoaXMuZ2V0TWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwKCkpLFxuICAgICAgICAgICAgJ1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbCc6IGZvcm0uYnVpbGRUb29sdGlwQ29udGVudCh0aGlzLmdldFN5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXAoKSksXG4gICAgICAgICAgICAnU3lzdGVtRW1haWxGb3JNaXNzZWQnOiBmb3JtLmJ1aWxkVG9vbHRpcENvbnRlbnQodGhpcy5nZXRTeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXAoKSksXG4gICAgICAgICAgICAnVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsJzogZm9ybS5idWlsZFRvb2x0aXBDb250ZW50KHRoaXMuZ2V0Vm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcCgpKSxcbiAgICAgICAgICAgICdNYWlsU01UUEF1dGhUeXBlJzogZm9ybS5idWlsZFRvb2x0aXBDb250ZW50KHRoaXMuZ2V0TWFpbFNNVFBBdXRoVHlwZVRvb2x0aXAoKSksXG4gICAgICAgICAgICAnTWFpbE9BdXRoMkNsaWVudElkJzogZm9ybS5idWlsZFRvb2x0aXBDb250ZW50KHRoaXMuZ2V0TWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcCgpKSxcbiAgICAgICAgICAgICdNYWlsU01UUFVzZVRMUyc6IGZvcm0uYnVpbGRUb29sdGlwQ29udGVudCh0aGlzLmdldE1haWxTTVRQVXNlVExTVG9vbHRpcCgpKSxcbiAgICAgICAgICAgICdNYWlsU01UUENlcnRDaGVjayc6IGZvcm0uYnVpbGRUb29sdGlwQ29udGVudCh0aGlzLmdldE1haWxTTVRQQ2VydENoZWNrVG9vbHRpcCgpKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0b29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIE1haWxFbmFibGVOb3RpZmljYXRpb25zIGZpZWxkXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIG1haWwgbm90aWZpY2F0aW9ucyB0b2dnbGVcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0TWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3doZW5fZW5hYmxlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfbWlzc2VkX2NhbGxzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfdm9pY2VtYWlsLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfc3lzdGVtX2V2ZW50cyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX21vZHVsZV9ub3RpZmljYXRpb25zXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsRW5hYmxlTm90aWZpY2F0aW9uc1Rvb2x0aXBfcmVxdWlyZW1lbnRzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9zbXRwX2NvbmZpZ3VyZWQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9zZW5kZXJfYWRkcmVzcyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3JlY2lwaWVudF9lbWFpbHNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF93aGVuX2Rpc2FibGVkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbEVuYWJsZU5vdGlmaWNhdGlvbnNUb29sdGlwX3doZW5fZGlzYWJsZWRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxFbmFibGVOb3RpZmljYXRpb25zVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsIGZpZWxkXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIHN5c3RlbSBub3RpZmljYXRpb25zIGVtYWlsXG4gICAgICovXG4gICAgc3RhdGljIGdldFN5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfdXNhZ2UsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9jcml0aWNhbF9lcnJvcnMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZGlza19zcGFjZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9saWNlbnNlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3VwZGF0ZXMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfc2VjdXJpdHksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfc3NsX2NlcnQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfYmFja3VwX3N0YXR1c1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9leGFtcGxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdhZG1pbkBjb21wYW55LmNvbScsXG4gICAgICAgICAgICAgICAgJ3N5c2FkbWluQGV4YW1wbGUub3JnJyxcbiAgICAgICAgICAgICAgICAnbW9uaXRvcmluZ0Bkb21haW4ucnUnXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3JlY29tbWVuZGF0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1Ob3RpZmljYXRpb25zRW1haWxUb29sdGlwX3VzZV9tb25pdG9yZWQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfc2VwYXJhdGVfYWNjb3VudCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9kaXN0cmlidXRpb25fbGlzdFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbU5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0b29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIE1haWxTTVRQQXV0aFR5cGUgZmllbGRcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU01UUCBhdXRoZW50aWNhdGlvbiB0eXBlXG4gICAgICovXG4gICAgc3RhdGljIGdldE1haWxTTVRQQXV0aFR5cGVUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX2Rlc2NfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfcHJvcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9wcm9fc2ltcGxlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9wcm9fdW5pdmVyc2FsLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9wcm9fbm9hcGlcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX2NvbnMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcGFzc3dvcmRfY29uX3NlY3VyaXR5LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9wYXNzd29yZF9jb25fYXBwcGFzc3dvcmQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX3Bhc3N3b3JkX2Nvbl8yZmFcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9kZXNjX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfcHJvcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfcHJvX3NlY3VyZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX3Byb19ub3Bhc3N3b3JkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfcHJvXzJmYSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfb2F1dGgyX3Byb19yZXZva2VcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0ODogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9jb25zLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q5OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9jb25fc2V0dXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQXV0aFR5cGVUb29sdGlwX29hdXRoMl9jb25fcHJvdmlkZXJzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9vYXV0aDJfY29uX3JlbmV3XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDEwOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfcmVjb21tZW5kYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUEF1dGhUeXBlVG9vbHRpcF9yZWNvbW1lbmRhdGlvbl9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBBdXRoVHlwZVRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0b29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIFN5c3RlbUVtYWlsRm9yTWlzc2VkIGZpZWxkXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIG1pc3NlZCBjYWxscyBub3RpZmljYXRpb24gZW1haWxcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0U3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2hvd19pdF93b3JrcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfaW50ZXJuYWxfY2FsbHMsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9leHRlcm5hbF9jYWxscyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX25vX3BlcnNvbmFsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfdXNhZ2VfZXhhbXBsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDQ6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2V4YW1wbGVfcmVjZXB0aW9uLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfZXhhbXBsZV9tYW5hZ2VyLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19TeXN0ZW1FbWFpbEZvck1pc3NlZFRvb2x0aXBfZXhhbXBsZV9jcm1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDY6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX3VzZV9ncm91cCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX2NvbmZpZ3VyZV9wZXJzb25hbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfU3lzdGVtRW1haWxGb3JNaXNzZWRUb29sdGlwX21vbml0b3JfcmVndWxhcmx5XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm1zX1N5c3RlbUVtYWlsRm9yTWlzc2VkVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsIGZpZWxkXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIHZvaWNlbWFpbCBub3RpZmljYXRpb25zIGVtYWlsXG4gICAgICovXG4gICAgc3RhdGljIGdldFZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5tc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUubXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfaG93X2l0X3dvcmtzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX3ByaW9yaXR5X29yZGVyLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfcGVyc29uYWxfZmlyc3QsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfY29tbW9uX3NlY29uZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9ub19zZW5kXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX3VzYWdlX2V4YW1wbGVzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZXhhbXBsZV9zZWNyZXRhcnksXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZXhhbXBsZV9hcmNoaXZlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2V4YW1wbGVfdHJhbnNjcmlwdGlvblxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9mZWF0dXJlcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19Wb2ljZW1haWxOb3RpZmljYXRpb25zRW1haWxUb29sdGlwX2F1ZGlvX2F0dGFjaG1lbnQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfY2FsbGVyX2luZm8sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX1ZvaWNlbWFpbE5vdGlmaWNhdGlvbnNFbWFpbFRvb2x0aXBfZHVyYXRpb25cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUubXNfVm9pY2VtYWlsTm90aWZpY2F0aW9uc0VtYWlsVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgTWFpbE9BdXRoMkNsaWVudElkIGZpZWxkXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIE9BdXRoMiBDbGllbnQgSURcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0TWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcCgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF93aGF0aXNpdCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfd2hhdGlzaXRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF93aGVyZV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX2dvb2dsZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX2dvb2dsZV9zdGVwMSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9nb29nbGVfc3RlcDIsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfZ29vZ2xlX3N0ZXAzLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX2dvb2dsZV9zdGVwNFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9taWNyb3NvZnQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9taWNyb3NvZnRfc3RlcDEsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfbWljcm9zb2Z0X3N0ZXAyLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX21pY3Jvc29mdF9zdGVwMyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF9taWNyb3NvZnRfc3RlcDRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfeWFuZGV4LFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfeWFuZGV4X3N0ZXAxLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX3lhbmRleF9zdGVwMixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbE9BdXRoMkNsaWVudElkVG9vbHRpcF95YW5kZXhfc3RlcDNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0ODogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfZXhhbXBsZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdHb29nbGU6IDEyMzQ1Njc4OTAxMi1hYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbScsXG4gICAgICAgICAgICAgICAgJ01pY3Jvc29mdDogMTIzNDU2NzgtMTIzNC0xMjM0LTEyMzQtMTIzNDU2Nzg5MDEyJyxcbiAgICAgICAgICAgICAgICAnWWFuZGV4OiBhMWIyYzNkNGU1ZjZnN2g4aTlqMGsxbDJtM240bzVwNidcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxPQXV0aDJDbGllbnRJZFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsT0F1dGgyQ2xpZW50SWRUb29sdGlwX25vdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBNYWlsU01UUFVzZVRMUyBmaWVsZFxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBTTVRQIFRMUyB1c2FnZVxuICAgICAqL1xuICAgIHN0YXRpYyBnZXRNYWlsU01UUFVzZVRMU1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfd2hhdGlzaXQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfd2hhdGlzaXRfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF93aGVuX2VuYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3N0YXJ0dGxzX3VzZWQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9wb3J0XzU4NyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX2VuY3J5cHRpb25fdXBncmFkZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX21vZGVybl9zdGFuZGFyZFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3doZW5fZGlzYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDU6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX25vX2VuY3J5cHRpb24sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9wb3J0XzI1LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfYXV0b190bHNfZGlzYWJsZWQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9sZWdhY3lfc2VydmVyc1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3BvcnRfcmVjb21tZW5kYXRpb25zLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9wb3J0XzI1X2Rlc2MsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9wb3J0XzU4N19kZXNjLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUFVzZVRMU1Rvb2x0aXBfcG9ydF80NjVfZGVzY1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q4OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX3Byb3ZpZGVyX3NldHRpbmdzLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q5OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9nbWFpbCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBVc2VUTFNUb29sdGlwX291dGxvb2ssXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF95YW5kZXgsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9tYWlscnVcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQVXNlVExTVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgTWFpbFNNVFBDZXJ0Q2hlY2sgZmllbGRcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFRvb2x0aXAgY29uZmlndXJhdGlvbiBmb3IgU01UUCBjZXJ0aWZpY2F0ZSBjaGVja1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRNYWlsU01UUENlcnRDaGVja1Rvb2x0aXAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfd2hlbl9lbmFibGVkLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF92ZXJpZnlfY2VydGlmaWNhdGUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9jaGVja19ob3N0bmFtZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3JlamVjdF9zZWxmc2lnbmVkLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfcHJvdGVjdF9taXRtXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfd2hlbl9kaXNhYmxlZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0NDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfYWNjZXB0X2FueV9jZXJ0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfYWxsb3dfc2VsZnNpZ25lZCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3NraXBfaG9zdG5hbWUsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9sZXNzX3NlY3VyZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q1OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3doZW5fdXNlLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q2OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9wdWJsaWNfc2VydmVycyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3Byb2R1Y3Rpb25fZW52LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfY29tcGxpYW5jZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGxpc3Q3OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3doZW5fZGlzYWJsZSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBsaXN0ODogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfaW50ZXJuYWxfc2VydmVycyxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUubXNfTWFpbFNNVFBDZXJ0Q2hlY2tUb29sdGlwX3Rlc3RfZW52LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfc2VsZnNpZ25lZF9jZXJ0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5tc19NYWlsU01UUENlcnRDaGVja1Rvb2x0aXBfbGVnYWN5X3NlcnZlcnNcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm1zX01haWxTTVRQQ2VydENoZWNrVG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG4gICAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IE1haWxTZXR0aW5nc1Rvb2x0aXBNYW5hZ2VyO1xufSJdfQ==