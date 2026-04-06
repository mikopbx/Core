{{ form(['action' : 'asterisk-rest-users/save', 'method': 'post', 'role': 'form', 'class': 'ui form', 'id':'asterisk-rest-user-form', 'data-id': id]) }}
{{ form.render('id') }}

<div class="max-width-500 field">
    <label>{{ t._('ari_Username') }}</label>
    <div class="ui icon input username">
        <i class="search icon"></i>
        {{ form.render('username') }}
    </div>
    <div class="ui top pointing red label hidden" id="username-error">
        {{ t._("ari_ErrorThisUsernameInNotAvailable") }}
    </div>
</div>

<div class="max-width-500 field">
    <label>{{ t._('ari_Password') }}</label>
    <div class="ui input">
        {{ form.render('password') }}
    </div>
</div>

<div class="field">
    <label>{{ t._('ari_Description') }}</label>
    {{ form.render('description') }}
</div>

<div class="field">
    <label>{{ t._('ari_Applications') }}
        <i class="small info circle icon field-info-icon" data-field="applications"></i>
    </label>
    <div class="ui fluid multiple search selection dropdown" id="applications">
        {{ form.render('applications') }}
        <i class="dropdown icon"></i>
        <div class="default text">{{ t._('ari_ApplicationsPlaceholder') }}</div>
        <div class="menu">
        </div>
    </div>
</div>

<div class="field">
    <label>{{ t._('ari_ConnectionInfo') }}
        <i class="small info circle icon field-info-icon" data-field="connection_info"></i>
    </label>
    <div class="ui segment">
        <p>{{ t._('ari_ConnectionInfoSummary') }}</p>
    </div>
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('MainFields')]) }}

{{ partial("partials/submitbutton",['indexurl':'asterisk-rest-users/index']) }}

{{ close('form') }}