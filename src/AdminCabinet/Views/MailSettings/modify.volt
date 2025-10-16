{{ form(['action' : 'mail-settings/save', 'method': 'post', 'role': 'form', 'class': 'ui form', 'id': 'mail-settings-form']) }}
<div class="ui grid">
    <div class="four wide column">
        <div class="ui vertical fluid tabular menu" id="mail-settings-menu">
            <a class="item active" data-tab="general">{{ t._('ms_GeneralSettings') }}</a>
            <a class="item" data-tab="smtp">{{ t._('ms_SMTPSettings') }}</a>
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

            {# Notification type toggles - shown only when MailEnableNotifications is enabled #}
            <div id="notification-types-section">
                <div class="field">
                    <div class="ui segment">
                        <div class="ui toggle checkbox">
                            {{ form.render('SendMissedCallNotifications') }}
                            <label for="SendMissedCallNotifications">{{ t._('ms_SendMissedCallNotifications') }}
                                <i class="small info circle icon field-info-icon" data-field="SendMissedCallNotifications"></i>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="field max-width-400">
                    <label>{{ t._('ms_SystemEmailForMissed') }}
                        <i class="small info circle icon field-info-icon" data-field="SystemEmailForMissed"></i>
                    </label>
                    {{ form.render('SystemEmailForMissed') }}
                </div>

                <div class="field">
                    <div class="ui segment">
                        <div class="ui toggle checkbox">
                            {{ form.render('SendVoicemailNotifications') }}
                            <label for="SendVoicemailNotifications">{{ t._('ms_SendVoicemailNotifications') }}
                                <i class="small info circle icon field-info-icon" data-field="SendVoicemailNotifications"></i>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="field max-width-400">
                    <label>{{ t._('ms_VoicemailCommonEmail') }}
                        <i class="small info circle icon field-info-icon" data-field="VoicemailNotificationsEmail"></i>
                    </label>
                    {{ form.render('VoicemailNotificationsEmail') }}
                </div>

                <div class="field">
                    <div class="ui segment">
                        <div class="ui toggle checkbox">
                            {{ form.render('SendLoginNotifications') }}
                            <label for="SendLoginNotifications">{{ t._('ms_SendLoginNotifications') }}
                                <i class="small info circle icon field-info-icon" data-field="SendLoginNotifications"></i>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="field">
                    <div class="ui segment">
                        <div class="ui toggle checkbox">
                            {{ form.render('SendSystemNotifications') }}
                            <label for="SendSystemNotifications">{{ t._('ms_SendSystemNotifications') }}
                                <i class="small info circle icon field-info-icon" data-field="SendSystemNotifications"></i>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {# Email addresses section - always visible #}

            <div class="field max-width-400">
                <label>{{ t._('ms_MailSysadminEmail') }}
                    <i class="small info circle icon field-info-icon" data-field="SystemNotificationsEmail"></i>
                </label>
                {{ form.render('SystemNotificationsEmail') }}
            </div>

            {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('GeneralTabFields')]) }}
        </div>

        {# SMTP settings tab #}
        <div class="ui tab segment" data-tab="smtp">

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

        {{ partial("PbxExtensionModules/hookVoltBlock",
            ['arrayOfPartials':hookVoltBlock('AdditionalTab')])
        }}

    </div>
</div>

{{ partial("partials/submitbutton",['indexurl':'']) }}
<div class="ui clearing hidden divider"></div>
{{ close('form') }}