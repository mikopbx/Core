
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

<div class="ui hidden divider"></div>

{# Passkeys Section #}
<div class="field">
    <label>{{ t._('pk_PasskeysTitle') }}
        <i class="small info circle icon field-info-icon"
           data-field="Passkeys"></i>
    </label>
    <div id="passkeys-container">
        <!-- Passkeys table will be rendered here by JavaScript -->
    </div>
</div>