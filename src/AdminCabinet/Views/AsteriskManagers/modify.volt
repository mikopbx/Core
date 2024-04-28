{{ form('asterisk-managers/save', 'role': 'form', 'class': 'ui large form', 'id':'save-ami-form') }}
{{ form.render('id') }}

<div class="six wide field">
    <label>{{ t._('am_Username') }}</label>
    <div class="ui icon input username">
        <i class="search icon"></i>
        {{ form.render('username') }}
    </div>
    <div class="ui top pointing red label hidden" id="username-error">
        {{ t._("am_ErrorThisUsernameInNotAvailable") }}
    </div>
</div>
<div class="six wide field">
    <label>{{ t._('am_Secret') }}</label>
    {{ form.render('secret') }}
</div>
<div class="field">
    <label>{{ t._('am_UserRights') }}</label>
    <table class="ui selectable very basic compact unstackable table collapsing" id="ami-table">
        <thead>
        <tr>
            <th></th>
            {% for index, checkbox in arrCheckBoxes %}
            <th width="20px" class="ami-category"> <div><span>{{ checkbox }}</span></div></th>
            {% endfor %}
        </tr>
        </thead>
        <tbody>
            <tr class="rule-row list">
                <td class='collaps'>{{ t._('am_Read') }}</td>
                {% for index, checkbox in arrCheckBoxes %}
                <td class="center aligned marks">
                    <div class="ui child checkbox">
                        {{ form.render(checkbox~'_read') }}
                        <label></label>
                    </div>
                </td>
                {% endfor %}
    		</tr>
            <tr class="rule-row list">
                <td>{{ t._('am_Write') }}</td>
                {% for index, checkbox in arrCheckBoxes %}
                <td class="center aligned marks">
                    <div class="ui child checkbox">
                        {{ form.render(checkbox~'_write') }}
                        <label></label>
                    </div>
                </td>
                {% endfor %}
    		</tr>
        </tbody>
    </table>
</div>
<div class="six wide field">
    <label>{{ t._('am_NetworkFilter') }}</label>
    {{ form.render('networkfilterid') }}
</div>
<div class="field">
    <label>{{ t._('am_Description') }}</label>
    {{ form.render('description') }}
</div>
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('MainFields')]) }}

{{ partial("partials/submitbutton",['indexurl':'asterisk-managers/index']) }}
<button class="ui large button uncheck"><i class="eraser icon"></i>{{ t._('bt_Clear') }}</button>


{{ end_form() }}