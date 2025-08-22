{{ form(['action' : 'asterisk-managers/save', 'method': 'post', 'role': 'form', 'class': 'ui form', 'id':'save-ami-form']) }}
{{ form.render('id') }}

<div class="max-width-500 field">
    <label>{{ t._('am_Username') }}</label>
    <div class="ui icon input username">
        <i class="search icon"></i>
        {{ form.render('username') }}
    </div>
    <div class="ui top pointing red label hidden" id="username-error">
        {{ t._("am_ErrorThisUsernameInNotAvailable") }}
    </div>
</div>
<div class="max-width-500 field">
    <label>{{ t._('am_Secret') }}</label>
    <div class="ui input">
        {{ form.render('secret') }}
    </div>
</div>
<div class="field">
    <label>{{ t._('am_UserRights') }}</label>
    {% set permissions = ['call', 'cdr', 'originate', 'reporting', 'agent', 'config', 'dialplan', 'dtmf', 'log', 'system', 'user', 'verbose', 'command'] %}
    <table class="ui selectable very basic compact unstackable table collapsing" id="ami-table">
        <thead>
        <tr>
            <th></th>
            {% for permission in permissions %}
            <th width="20px" class="ami-category"> <div><span>{{ permission }}</span></div></th>
            {% endfor %}
        </tr>
        </thead>
        <tbody>
            <tr class="rule-row list">
                <td class='collaps'>{{ t._('am_Read') }}</td>
                {% for permission in permissions %}
                <td class="center aligned marks">
                    <div class="ui child checkbox">
                        {{ form.render(permission~'_read') }}
                        <label></label>
                    </div>
                </td>
                {% endfor %}
    		</tr>
            <tr class="rule-row list">
                <td>{{ t._('am_Write') }}</td>
                {% for permission in permissions %}
                <td class="center aligned marks">
                    <div class="ui child checkbox">
                        {{ form.render(permission~'_write') }}
                        <label></label>
                    </div>
                </td>
                {% endfor %}
    		</tr>
        </tbody>
    </table>
    <div class="ui buttons" style="margin-top: 1em;">
        <button type="button" class="ui positive button check-all">
            <i class="check square icon"></i>
            {{ t._('bt_SelectAll') }}
        </button>
        <div class="or" data-text="{{ t._('bt_Or') }}"></div>
        <button type="button" class="ui button uncheck">
            <i class="square outline icon"></i>
            {{ t._('bt_ClearAll') }}
        </button>
    </div>
</div>
<div class="max-width-500 field">
    <label>{{ t._('am_NetworkFilter') }}</label>
    {{ form.render('networkfilterid') }}
</div>
<div class="field">
    <label>{{ t._('am_Description') }}</label>
    {{ form.render('description') }}
</div>
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('MainFields')]) }}

{{ partial("partials/submitbutton",['indexurl':'asterisk-managers/index']) }}

{{ close('form') }}