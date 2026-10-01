# Mail notifications — agent notes

Builder-based HTML/plain-text email notifications. Everything ends in the legacy
`Core\System\Notifications::sendMail()` (PHPMailer, OAuth2 via `MailOAuth2Service`).
Repo-wide rules are in the root `AGENTS.md`; this file is subsystem gotchas only.

## Rendering
- `EmailTemplateEngine` does NOT escape anything (its class docblock is wrong). Only
  `buildDataTable()` rows and `SERVER_NAME` are escaped. `mainMessage`, `dynamicContent`,
  `INFO_BOX_CONTENT`, `HELP_TEXT`, `CTA_URL` go into the HTML raw: escape user/CDR data with
  `EmailTemplateRenderer::escapeHtml()` in the builder.
- Ground truth for placeholders is `mikopbx-email-template.html`. Only `{{#IF_...}}` blocks are
  conditional; unknown/mistyped `{{VAR}}` is silently stripped, never reported.
- `buildVariables()` is where a builder sets subject/mainMessage/dynamicContent, so
  `EmailNotificationService` calls `buildHtml()`/`buildPlainText()` BEFORE `validate()`.
  Keep `buildVariables()` side-effect safe; it is the only hook both formats share.
- Plain-text mode (`PbxSettings::MAIL_PLAIN_TEXT === '1'`) never touches the HTML template.
  It rebuilds the body from `dataTableRows` (captured only via `buildDataTable()`, not the
  renderer directly) plus `IF_INFO_BOX`/`IF_HELP_TEXT`/`IF_CTA_BUTTON` variables. HTML put
  into `dynamicContent` is flattened by `htmlBlockToPlain()`.
- The template is cached in a static per process; workers are long-lived, so restart the
  worker (or container) after editing the `.html`.

## Queueing and sending
- Use `NotificationQueueHelper::queueOrSend()`/`queueAuto()`. Do not use
  `EmailNotificationService::queueNotification()`: it publishes a payload without
  `notification_type` to a differently named tube, which `WorkerNotifyByEmail` would treat as
  a legacy missed-call batch. It has no callers.
- Async path serialises the builder with `toArray()`/`fromArray()`. Every builder-specific
  field must be added to both overrides, otherwise it is silently lost only in the queued
  path (the sync fallback when Beanstalk is down hides the bug).
- `getPriorityForType()` is an exhaustive `match` without `SECURITY_ALERT`; `queueAuto()` throws
  `UnhandledMatchError` for it. Extend the match when adding a `NotificationType` case.
- `NotificationType::SIP_CREDENTIALS` and `SYSTEM_UPDATES` have no builder yet.
- `Notifications` drops mail silently when `MAIL_ENABLE_NOTIFICATIONS !== '1'`;
  `SendTestEmailAction` bypasses that with reflection on `enableNotifications`.

## Misc
- Translation keys `ms_EmailNotification_*` live in `src/Common/Messages/<lang>/MailSettings.php`.
- `mikopbx-email-examples.php` is an unreferenced, non-autoloadable sample
  (namespace `MikoPBX\EmailTemplates`); do not import it.
