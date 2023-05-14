{{ form('mail-settings/save', 'role': 'form', 'class': 'ui form large', 'id': 'mail-settings-form') }}
<div class="ui top attached tabular menu" id="mail-settings-menu">
    <a class="item active" data-tab="smtp">{{ t._('ms_SMTPSettings') }}</a>
    <a class="item" data-tab="missed">{{ t._('ms_NotificationTemplatesMissed') }}</a>
    <a class="item" data-tab="voicemail">{{ t._('ms_NotificationTemplatesVoicemail') }}</a>
    {{ partial("PbxExtensionModules/hookVoltBlock",
        ['arrayOfPartials':hookVoltBlock('TabularMenu')])
    }}
</div>

<div class="ui bottom attached tab segment active" data-tab="smtp">
    <div class="three fields">
        <div class="field">
            <label for="MailSMTPHost">{{ t._('ms_SMTPHost') }}</label>

            {{ form.render('MailSMTPHost') }}

        </div>
        <div class="field">
            <label for="MailSMTPPort">{{ t._('ms_SMTPPort') }}</label>

            {{ form.render('MailSMTPPort') }}

        </div>
    </div>

    <div class="three fields">

        <div class="field">
            <label>{{ t._('ms_SMTPUsername') }}</label>
            {{ form.render('MailSMTPUsername') }}

        </div>
        <div class="field">
            <label>{{ t._('ms_SMTPPassword') }}</label>
            {{ form.render('MailSMTPPassword') }}
        </div>

    </div>

    <div class="five wide field">
        <label>{{ t._('ms_SMTPSenderAddress') }}</label>
        {{ form.render('MailSMTPSenderAddress') }}
    </div>
    <div class="five wide field">
        <label>{{ t._('ms_SMTPFromUsername') }}</label>
        {{ form.render('MailSMTPFromUsername') }}
    </div>
    <div class=" field">
        <div class="ui segment">
            <div class="ui toggle checkbox">
                <label>{{ t._('ms_SMTPUseTLS') }}</label>
                {{ form.render('MailSMTPUseTLS') }}
            </div>
        </div>
    </div>
    <div class=" field">
        <div class="ui segment">
            <div class="ui toggle checkbox">
                <label>{{ t._('ms_SMTPCertCheck') }}</label>
                {{ form.render('MailSMTPCertCheck') }}
            </div>
        </div>
    </div>
    <div class=" field">
        <div class="ui segment">
            <div class="ui toggle checkbox">
                <label>{{ t._('ms_MailEnableNotifications') }}</label>
                {{ form.render('MailEnableNotifications') }}
            </div>
        </div>
    </div>
    <div class="five wide field">
        <label>{{ t._('ms_MailSysadminEmail') }}</label>
        {{ form.render('SystemNotificationsEmail') }}
    </div>
    {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('SMTPTabFields')]) }}
</div>
<div class="ui bottom attached tab segment" data-tab="missed">
    <div class="five wide field">
        <label>{{ t._('ms_SystemEmailForMissed') }}</label>
        {{ form.render('SystemEmailForMissed') }}
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

<div class="ui bottom attached tab segment" data-tab="voicemail">
    <div class="ten wide field">
        <label for="VoicemailNotificationsEmail">{{ t._('ms_VoicemailCommonEmail') }}</label>
        {{ form.render('VoicemailNotificationsEmail') }}
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
{{ partial("partials/submitbutton",['indexurl':'']) }}
<div class="ui clearing hidden divider"></div>
{{ end_form() }}