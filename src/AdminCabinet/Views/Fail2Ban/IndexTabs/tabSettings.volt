{{ form('fail2-ban/save', 'role': 'form', 'class': 'ui form large', 'id':'fail2ban-settings-form') }}
        {{ form.render('id') }}
<div class="three fields disability">
    <div class="field ">
        <label>{{ t._('f2b_MaxRetry') }}</label>
        {{ form.render('maxretry') }}
    </div>
    <div class="field">
        <label>{{ t._('f2b_FindTime') }}</label>
        {{ form.render('findtime') }}
    </div>
    <div class="field">
        <label>{{ t._('f2b_BanTime') }}</label>
        {{ form.render('bantime') }}
    </div>
</div>
<div class="field disability">
    <label>{{ t._('f2b_WhiteList') }}</label>
    {{ form.render('whitelist') }}
</div>
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

    {{ partial("partials/submitbutton") }}
    <div class="ui clearing hidden divider"></div>
{{ end_form() }}
