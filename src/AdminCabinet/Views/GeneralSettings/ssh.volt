<div class="inline field">
    <label>{{ t._('gs_SSHPort') }}</label>
    {{ form.render('SSHPort') }}
</div>
<div class="field">
    <label>{{ t._('gs_SSHLogin') }}</label>
    {{ form.render('SSHLogin') }}
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox">
            <label>{{ t._('gs_SSHDisablePasswordLogins') }}
                <i class="small info circle icon field-info-icon" 
                   data-field="SSHDisablePasswordLogins"></i>
            </label>
            {{ form.render('SSHDisablePasswordLogins') }}
        </div>
    </div>
</div>
<div class="ui basic segment" id="only-if-password-enabled">
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
</div>
<div class="field">
    <label>{{ t._('gs_SSHAuthorizedKeys') }}
        <i class="small info circle icon field-info-icon" 
           data-field="SSHAuthorizedKeys"></i>
    </label>
    <div id="ssh-keys-container">
        <!-- SSH keys table will be rendered here by JavaScript -->
    </div>
    {{ form.render('SSHAuthorizedKeys', ['style': 'display:none;']) }}
</div>
<div class="field">
    <label>{{ t._('gs_SSH_ID_RSA_PUB') }}
        <i class="small info circle icon field-info-icon" 
           data-field="SSH_ID_RSA_PUB"></i>
    </label>
    {{ form.render('SSH_ID_RSA_PUB', ['data-field-type': 'ssh-public-key']) }}
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