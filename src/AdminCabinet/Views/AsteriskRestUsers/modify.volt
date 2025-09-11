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
    <label>{{ t._('ari_Applications') }}</label>
    <div class="ui fluid multiple search selection dropdown" id="applications">
        {{ form.render('applications') }}
        <i class="dropdown icon"></i>
        <div class="default text">{{ t._('ari_ApplicationsPlaceholder') }}</div>
        <div class="menu">
        </div>
    </div>
    <div class="ui info message">
        <p>{{ t._('ari_ApplicationsHelp') }}</p>
    </div>
</div>

<div class="ui segment">
    <h4 class="ui header">
        <i class="info circle icon"></i>
        <div class="content">
            {{ t._('ari_ConnectionInfo') }}
        </div>
    </h4>
    
    <div class="ui list">
        <div class="item">
            <i class="server icon"></i>
            <div class="content">
                <div class="header">{{ t._('ari_WebSocketURL') }}</div>
                <div class="description">
                    <code>ws://{{ serverIP }}:8088/ari/events?app=[application]&subscribe=all</code>
                </div>
            </div>
        </div>
        <div class="item">
            <i class="plug icon"></i>
            <div class="content">
                <div class="header">{{ t._('ari_RESTURL') }}</div>
                <div class="description">
                    <code>http://{{ serverIP }}:8088/ari/</code>
                </div>
            </div>
        </div>
        <div class="item">
            <i class="lock icon"></i>
            <div class="content">
                <div class="header">{{ t._('ari_SecureWebSocketURL') }}</div>
                <div class="description">
                    <code>wss://{{ serverIP }}:8089/ari/events?app=[application]&subscribe=all</code>
                </div>
            </div>
        </div>
    </div>
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('MainFields')]) }}

{{ partial("partials/submitbutton",['indexurl':'asterisk-rest-users/index']) }}

{{ close('form') }}