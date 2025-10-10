<h1 class="ui left aligned header">
    <img class="ui image" src="{{ urlToLogo }}" id="login-logo"/>
    <div class="content">
        {{ NameFromSettings }}
        <div class="sub header"> {{ DescriptionFromSettings }}</div>
    </div>
</h1>
{{ form(['action' : '','method': 'post', 'class': 'ui large form segment', 'id' :'login-form']) }}
<h6 class="ui center aligned header">
    {# Language dropdown - static list, no API calls on load #}
    <div class="ui dropdown" id="language-selector">
        <input type="hidden" name="WebAdminLanguage" value="{{ WebAdminLanguage }}">
        <div class="text">
            {% if availableLanguages[WebAdminLanguage] is defined %}
                <i class="flag {{ availableLanguages[WebAdminLanguage]['flag'] }}"></i>
                {{ availableLanguages[WebAdminLanguage]['name'] }}
            {% endif %}
        </div>
        <i class="dropdown icon"></i>
        <div class="menu">
            <a class="item" target="_blank" href="https://weblate.mikopbx.com/engage/mikopbx/">
                <i class="pencil alternate icon"></i> {{ t._('lang_HelpWithTranslateIt') }}
            </a>
            <div class="divider"></div>
            {% for code, info in availableLanguages %}
                <div class="item" data-value="{{ code }}">
                    <i class="flag {{ info['flag'] }}"></i>
                    {{ info['name'] }}
                </div>
            {% endfor %}
        </div>
    </div>
</h6>

{# Login field - always visible #}
<div class="field" id="login-field">
    <label>{{ t._('auth_Login') }}</label>
    <div class="ui left icon input">
        <i class="user icon"></i>
        <input type="text" name="login" id="login"
               autocomplete="username webauthn"
               autofocus
               placeholder="{{ t._('auth_Login') }}"
               required>
    </div>
</div>

{# Password field - always visible #}
<div class="field" id="password-field">
    <label>{{ t._('auth_Password') }}</label>
    <div class="ui left icon input">
        <i class="lock icon"></i>
        <input type="password" name="password" id="password"
               autocomplete="current-password webauthn"
               placeholder="{{ t._('auth_Password') }}"
               required>
    </div>
</div>

{# Remember me - always visible #}
<div class="field" id="remember-field">
    <div class="ui checkbox">
        <input type="checkbox" name="rememberMeCheckBox" id="rememberMeCheckBox">
        <label for="rememberMeCheckBox">{{ t._('auth_RememberMe') }}</label>
    </div>
</div>

<div class="ui error message"></div>

{# Main submit button for password authentication #}
<div class="ui fluid large black button" id="submitbutton">
    {{ t._('auth_SubmitButton') }}
</div>

{# OR divider between authentication methods #}
<div class="ui horizontal divider" style="margin: 1.5em 0;">
    {{ t._('pk_LoginOr') }}
</div>

{# Passkey authentication button #}
<div class="ui fluid large button" id="passkey-login-button">
    <i class="user lock icon"></i>
    {{ t._('pk_LoginButton') }}
</div>

{{ close('form') }}