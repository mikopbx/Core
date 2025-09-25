{{ form(['action' : 'mail-settings/save', 'method': 'post', 'role': 'form', 'class': 'ui form', 'id': 'mail-settings-form']) }}
<div class="ui grid">
    <div class="four wide column">
        <div class="ui vertical fluid tabular menu" id="mail-settings-menu">
            <a class="item active" data-tab="general">{{ t._('ms_GeneralSettings') }}</a>
            <a class="item" data-tab="smtp">{{ t._('ms_SMTPSettings') }}</a>
            <a class="item" data-tab="missed">{{ t._('ms_NotificationTemplatesMissed') }}</a>
            <a class="item" data-tab="voicemail">{{ t._('ms_NotificationTemplatesVoicemail') }}</a>
            {{ partial("PbxExtensionModules/hookVoltBlock",
                ['arrayOfPartials':hookVoltBlock('TabularMenu')])
            }}
        </div>
    </div>
    <div class="twelve wide column">

        {# General settings tab #}
        <div class="ui tab segment active" data-tab="general">
            <div class="field">
                <div class="ui segment">
                    <div class="ui toggle checkbox">
                        {{ form.render('MailEnableNotifications') }}
                        <label for="MailEnableNotifications">{{ t._('ms_MailEnableNotifications') }}
                            <i class="small info circle icon field-info-icon" data-field="MailEnableNotifications"></i>
                        </label>
                    </div>
                </div>
            </div>

            {# System notifications email #}
            <div class="field max-width-400">
                <label>{{ t._('ms_MailSysadminEmail') }}
                    <i class="small info circle icon field-info-icon" data-field="SystemNotificationsEmail"></i>
                </label>
                {{ form.render('SystemNotificationsEmail') }}
            </div>

            {# Sender settings section #}
            <div class="two fields">
                <div class="field">
                    <label>{{ t._('ms_SMTPSenderAddress') }}</label>
                    {{ form.render('MailSMTPSenderAddress') }}
                </div>
                <div class="field">
                    <label>{{ t._('ms_SMTPFromUsername') }}</label>
                    {{ form.render('MailSMTPFromUsername') }}
                </div>
            </div>

            {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('GeneralTabFields')]) }}
        </div>

        {# SMTP settings tab #}
        <div class="ui tab segment" data-tab="smtp">

            {# Authentication section - moved to top #}
            <div class="smtp-auth-section">
                <div class="field">
                    <label>{{ t._('ms_AuthenticationType') }}
                        <i class="small info circle icon field-info-icon" data-field="MailSMTPAuthType"></i>
                    </label>
                    <div class="ui segment">
                        <div class="field">
                            <div class="ui radio checkbox">
                                <input type="radio" name="MailSMTPAuthType" value="password" checked tabindex="0" class="hidden">
                                <label>{{ t._('ms_AuthTypePassword') }}</label>
                            </div>
                        </div>
                        <div class="field">
                            <div class="ui radio checkbox">
                                <input type="radio" name="MailSMTPAuthType" value="oauth2" tabindex="0" class="hidden">
                                <label>{{ t._('ms_AuthTypeOAuth2') }}</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="password-auth-section">
                    <div class="two fields">
                        <div class="field">
                            <label>{{ t._('ms_SMTPUsername') }}</label>
                            {{ form.render('MailSMTPUsername') }}
                        </div>
                        <div class="field">
                            <label>{{ t._('ms_SMTPPassword') }}</label>
                            {{ form.render('MailSMTPPassword') }}
                        </div>
                    </div>
                </div>

                <div id="oauth2-auth-section" style="display: none;">
                    <div class="field max-width-400">
                        <label for="MailOAuth2Provider">{{ t._('ms_OAuth2Provider') }}</label>
                        {{ form.render('MailOAuth2Provider') }}
                    </div>
                    <div class="two fields">
                        <div class="field">
                            <label for="MailOAuth2ClientId">{{ t._('ms_OAuth2ClientId') }}
                                <i class="small info circle icon field-info-icon" data-field="MailOAuth2ClientId"></i>
                            </label>
                            {{ form.render('MailOAuth2ClientId') }}
                        </div>
                        <div class="field">
                            <label for="MailOAuth2ClientSecret">{{ t._('ms_OAuth2ClientSecret') }}</label>
                            {{ form.render('MailOAuth2ClientSecret') }}
                        </div>
                    </div>
                    <div id="oauth2-status" class="field"></div>
                    <div class="field">
                        <button id="oauth2-connect" class="ui primary button" type="button">
                            <i class="sign in alternate icon"></i>
                            {{ t._('ms_ConnectWithOAuth2') }}
                        </button>
                        <button id="oauth2-disconnect" class="ui button" type="button" style="display: none;">
                            <i class="sign out alternate icon"></i>
                            {{ t._('ms_DisconnectOAuth2') }}
                        </button>
                    </div>
                    <div id="provider-hint" class="ui info message" style="display: none;"></div>
                </div>

            </div>

            {# SMTP Server settings section #}
            <div class="smtp-field-section">
                <div class="fields">
                    <div class="ten wide field">
                        <label for="MailSMTPHost">{{ t._('ms_SMTPHost') }}</label>
                        {{ form.render('MailSMTPHost') }}
                    </div>
                    <div class="three wide field max-width-150">
                        <label for="MailSMTPPort">{{ t._('ms_SMTPPort') }}</label>
                        {{ form.render('MailSMTPPort') }}
                    </div>
                </div>

                {# Encryption type #}
                <div class="field">
                    <label for="MailSMTPUseTLS">{{ t._('ms_SMTPEncryption') }}
                        <i class="small info circle icon field-info-icon" data-field="MailSMTPUseTLS"></i>
                    </label>
                    {{ form.render('MailSMTPUseTLS') }}
                </div>

                {# Certificate check - shown only for encrypted connections #}
                <div class="field" id="cert-check-field">
                    <div class="ui segment">
                        <div class="ui toggle checkbox">
                            {{ form.render('MailSMTPCertCheck') }}
                            <label for="MailSMTPCertCheck">{{ t._('ms_SMTPCertCheck') }}
                                <i class="small info circle icon field-info-icon" data-field="MailSMTPCertCheck"></i>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="ui segment">
                <h4 class="ui header">{{ t._('ms_TestMailSettings') }}</h4>
                <div class="field">
                    <button id="test-connection-button" class="ui button" type="button">
                        <i class="plug icon"></i>
                        {{ t._('ms_TestConnection') }}
                    </button>
                    <button id="send-test-email-button" class="ui button" type="button">
                        <i class="mail icon"></i>
                        {{ t._('ms_SendTestEmail') }}
                    </button>
                </div>
            </div>

            {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('SMTPTabFields')]) }}
        </div>

        {# Missed calls template tab #}
        <div class="ui tab segment" data-tab="missed">
            <div class="field max-width-400">
                <label>{{ t._('ms_SystemEmailForMissed') }}
                    <i class="small info circle icon field-info-icon" data-field="SystemEmailForMissed"></i>
                </label>
                {{ form.render('SystemEmailForMissed') }}
            </div>

            {# Macros info segment #}
            <div class="ui segment">
                <h4 class="ui header">
                    <i class="code icon"></i>
                    <div class="content">{{ t._('ms_MissedCallMacros_header') }}</div>
                </h4>
                <p>{{ t._('ms_MissedCallMacros_description') }}</p>
                <div class="ui list">
                    <div class="item"><code>NOTIFICATION_CALLERID</code> - {{ t._('ms_MissedCallMacro_NOTIFICATION_CALLERID') }}</div>
                    <div class="item"><code>NOTIFICATION_TO</code> - {{ t._('ms_MissedCallMacro_NOTIFICATION_TO') }}</div>
                    <div class="item"><code>NOTIFICATION_NAME_TO</code> - {{ t._('ms_MissedCallMacro_NOTIFICATION_NAME_TO') }}</div>
                    <div class="item"><code>NOTIFICATION_NAME_FROM</code> - {{ t._('ms_MissedCallMacro_NOTIFICATION_NAME_FROM') }}</div>
                    <div class="item"><code>NOTIFICATION_DURATION</code> - {{ t._('ms_MissedCallMacro_NOTIFICATION_DURATION') }}</div>
                    <div class="item"><code>NOTIFICATION_DATE</code> - {{ t._('ms_MissedCallMacro_NOTIFICATION_DATE') }}</div>
                    <div class="item"><code>NOTIFICATION_MISSEDCAUSE</code> - {{ t._('ms_MissedCallMacro_NOTIFICATION_MISSEDCAUSE') }}</div>
                </div>
                <div class="ui divider"></div>
                <p><strong>{{ t._('ms_MissedCallMacros_usage_example') }}</strong></p>
                <div class="ui message">
                    <code>{{ t._('ms_MissedCallMacros_example_text') }}</code>
                </div>
            </div>

            <div class="field">
                <label for="MailTplMissedCallSubject">{{ t._('ms_MissedCallSubject') }}</label>
                {{ form.render('MailTplMissedCallSubject') }}
            </div>
            <div class="field">
                <label for="MailTplMissedCallBody">{{ t._('ms_MissedCallBody') }}</label>
                {{ form.render('MailTplMissedCallBody') }}
            </div>
            <div class="field">
                <label for="MailTplMissedCallBody">{{ t._('ms_MissedCallFooter') }}</label>
                {{ form.render('MailTplMissedCallFooter') }}
            </div>
            {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('MissedTabFields')]) }}
        </div>

        {# Voicemail template tab #}
        <div class="ui tab segment" data-tab="voicemail">
            <div class="field max-width-400">
                <label for="VoicemailNotificationsEmail">{{ t._('ms_VoicemailCommonEmail') }}
                    <i class="small info circle icon field-info-icon" data-field="VoicemailNotificationsEmail"></i>
                </label>
                {{ form.render('VoicemailNotificationsEmail') }}
            </div>

            {# Macros info segment for voicemail #}
            <div class="ui segment">
                <h4 class="ui header">
                    <i class="code icon"></i>
                    <div class="content">{{ t._('ms_VoicemailMacros_header') }}</div>
                </h4>
                <p>{{ t._('ms_VoicemailMacros_description') }}</p>
                <div class="ui list">
                    <div class="item"><code>VM_NAME</code> - {{ t._('ms_VoicemailMacro_VM_NAME') }}</div>
                    <div class="item"><code>VM_DUR</code> - {{ t._('ms_VoicemailMacro_VM_DUR') }}</div>
                    <div class="item"><code>VM_MSGNUM</code> - {{ t._('ms_VoicemailMacro_VM_MSGNUM') }}</div>
                    <div class="item"><code>VM_MAILBOX</code> - {{ t._('ms_VoicemailMacro_VM_MAILBOX') }}</div>
                    <div class="item"><code>VM_CALLERID</code> - {{ t._('ms_VoicemailMacro_VM_CALLERID') }}</div>
                    <div class="item"><code>VM_DATE</code> - {{ t._('ms_VoicemailMacro_VM_DATE') }}</div>
                </div>
                <div class="ui divider"></div>
                <p><strong>{{ t._('ms_VoicemailMacros_usage_example') }}</strong></p>
                <div class="ui message">
                    <code>{{ t._('ms_VoicemailMacros_example_text') }}</code>
                </div>
            </div>

            <div class="field">
                <label for="MailTplVoicemailSubject">{{ t._('ms_VoicemailSubject') }}</label>
                {{ form.render('MailTplVoicemailSubject') }}
            </div>

            <div class="field">
                <label for="MailTplVoicemailBody">{{ t._('ms_VoicemailBody') }}</label>
                {{ form.render('MailTplVoicemailBody') }}
            </div>

            <div class="field">
                <label for="MailTplVoicemailFooter">{{ t._('ms_VoicemailFooter') }}</label>
                {{ form.render('MailTplVoicemailFooter') }}
            </div>

            {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('VoicemailTabFields')]) }}
        </div>

        {{ partial("PbxExtensionModules/hookVoltBlock",
            ['arrayOfPartials':hookVoltBlock('AdditionalTab')])
        }}

    </div>
</div>

{{ partial("partials/submitbutton",['indexurl':'']) }}
<div class="ui clearing hidden divider"></div>
{{ close('form') }}