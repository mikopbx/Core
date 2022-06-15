
{% for field in simplePasswords %}
    {% if field === 'WebAdminPassword' %}
       <div class="ui negative message password-validate">
         <div class="header">
           {{ t._('gs_SetPassword') }}
         </div>
         <p>{{ t._('gs_SetPasswordInfo') }}</p>
       </div>
    {% endif  %}
{% endfor  %}

<div class="field">
    <label>{{ t._('gs_WebAdminLogin') }}</label>
    {{ form.render('WebAdminLogin') }}
</div>
<div class="two fields">
    <div class="field">
        <label>{{ t._('gs_WebAdminPassword') }}</label>
        {{ form.render('WebAdminPassword') }}
    </div>
    <div class="field">
        <label>{{ t._('gs_WebAdminPasswordRepeat') }}</label>
        {{ form.render('WebAdminPasswordRepeat') }}
    </div>
</div>
<div class="password-score-section">
    <div class="two fields">
        <div class="field">
            <div class="ui indicating tiny progress password-score">
                <div class="bar"></div>
            </div>
        </div>
    </div>
</div>
<div class="ui message">
    {{ t._('gs_DefaultPasswordWarning') }}
</div>