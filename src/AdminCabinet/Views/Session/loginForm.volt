<h1 class="ui left aligned header">
    <img class="ui image" src="{{ urlToLogo }}" id="login-logo"/>
    <div class="content">
        {{ NameFromSettings }}
        <div class="sub header"> {{ DescriptionFromSettings }}</div>
    </div>
</h1>

{{ form('session/start', 'role': 'form', 'class': 'ui large form segment', 'id' :'login-form') }}
<h6 class="ui center aligned header">
    <div class="ui dropdown" id="web-admin-language-selector">
        <input type="hidden" name="WebAdminLanguage">
        <div class="text"></div>
        <i class="dropdown icon"></i>
    </div>
</h6>
<div class="field">
    <label>{{ t._('auth_Login') }}</label>
    <div class="ui left icon input">
        <i class="user icon"></i>
        {{ form.render('login') }}
    </div>
</div>
<div class="field">
    <label>{{ t._('auth_Password') }}</label>
    <div class="ui left icon input">
        <i class="lock icon"></i>
        {{ form.render('password') }}
    </div>
</div>
<div class="field">
    <div class="ui checkbox">
        {{ form.render('rememberMeCheckBox') }}
        <label for="rememberMeCheckBox">{{ t._('auth_RememberMe') }}</label>
    </div>
</div>

<div class="ui error message"></div>
<div class="ui fluid large black button" id="submitbutton">
    {{ t._('auth_SubmitButton') }}
</div>
{{ end_form() }}