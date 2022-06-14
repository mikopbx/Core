{% for field in simplePasswords %}
    {% if field === 'SSHPassword' %}
       <div class="ui negative message">
         <div class="header">
           {{ t._('gs_SetPassword') }}
         </div>
         <p>{{ t._('gs_SetPasswordInfo') }}</p>
       </div>
    {% endif  %}
{% endfor  %}

<div class="field">
    <label>{{ t._('gs_SSHPort') }}</label>
    {{ form.render('SSHPort') }}
</div>
<div class="two fields">
    <div class="field">
        <label>{{ t._('gs_SSHPassword') }}</label>
        {{ form.render('SSHPassword') }}
    </div>
    <div class="field">
        <label>{{ t._('gs_SSHPasswordRepeat') }}</label>
        {{ form.render('SSHPasswordRepeat') }}
    </div>
</div>
<div class="ssh-password-score-section">
    <div class="two fields">
        <div class="field">
            <div class="ui indicating tiny progress ssh-password-score">
                <div class="bar"></div>
            </div>
        </div>
    </div>
</div>
<div class="field disability">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label>{{ t._('gs_SSHDisablePasswordLogins') }}</label>
            {{ form.render('SSHDisablePasswordLogins') }}
        </div>
    </div>
</div>
<div class="field">
    <label>{{ t._('gs_SSHAuthorizedKeys') }}</label>
    {{ form.render('SSHAuthorizedKeys') }}
</div>
{% if debugMode == true %}
    <div class="field">
        <label>{{ t._('gs_SSHecdsaKey') }}</label>
        {{ form.render('SSHecdsaKey') }}
    </div>
    <div class="field">
        <label>{{ t._('gs_SSHRsaKey') }}</label>
        {{ form.render('SSHRsaKey') }}
    </div>
    <div class="field">
        <label>{{ t._('gs_SSHDssKey') }}</label>
        {{ form.render('SSHDssKey') }}
    </div>
{% endif %}