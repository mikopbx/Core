
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
        <table class="ui very basic table" id="passkeys-table">
            <tbody>
                <tr id="passkeys-empty-row" style="display: none;">
                    <td colspan="2">
                        <div class="ui placeholder segment">
                            <div class="ui icon header">
                                <i class="key icon"></i>
                                {{ t._('pk_NoPasskeys') }}
                            </div>
                            <div class="inline">
                                <div class="ui text">
                                    {{ t._('pk_EmptyDescription') }}
                                </div>
                            </div>
                            <div style="margin-top: 1em;">
                                <a href="#" 
                                data-controller="{{ controllerName }}" 
                                data-action="{{ actionName }}" 
                                target="_blank" 
                                class="ui basic tiny button prevent-word-wrap wiki-help-link">
                                    <i class="question circle outline icon"></i>
                                    {{ t._('pk_ReadDocs') }}
                                </a>
                            </div>
                            <div style="margin-top: 1em; text-align: center;">
                                <button type="button" class="ui blue button prevent-word-wrap" id="add-passkey-button">
                                    <i class="add circle icon"></i>
                                    {{ t._('pk_AddPasskey') }}
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>