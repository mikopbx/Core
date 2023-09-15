{{ form('asterisk-managers/save', 'role': 'form', 'class': 'ui large form', 'id':'save-ami-form') }}
{{ form.render('id') }}

<div class="two fields">
    <div class="field">
        <label>{{ t._('am_Username') }}</label>
        <div class="ui icon input username">
            <i class="search icon"></i>
            {{ form.render('username') }}
        </div>
        <div class="ui top pointing red label hidden" id="username-error">
            {{ t._("am_ErrorThisUsernameInNotAvailable") }}
        </div>
    </div>
    <div class="field">
        <label>{{ t._('am_Secret') }}</label>
        {{ form.render('secret') }}
    </div>
</div>

<div class="field">
    <label>{{ t._('am_NetworkFilter') }}</label>
    {{ form.render('networkfilterid') }}
</div>
<div class="field">
    <label>{{ t._('am_UserRights') }}</label>
    <div class="equal width fields">
        {% for index, checkbox in arrCheckBoxes %}
            {% if index is odd %}
                {% continue %}
            {% endif %}
            <div class="field">
                <div class="ui list">
                    <div class="item">
                        <div class="ui master checkbox">
                            {{ form.render(checkbox~'_main') }}
                            <label for="{{ checkbox~'_main' }}"><b>{{ checkbox|capitalize }}</b></label>
                        </div>
                        <div class="list">
                            <div class="item">
                                <div class="ui child checkbox">
                                    {{ form.render(checkbox~'_read') }}
                                    <label>{{ t._('am_Read') }}</label>
                                </div>
                            </div>
                            <div class="item">
                                <div class="ui child checkbox">
                                    {{ form.render(checkbox~'_write') }}
                                    <label>{{ t._('am_Write') }}</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {% endfor %}
    </div>


    <div class="equal width fields">
        {% for index, checkbox in arrCheckBoxes %}
            {% if index is even %}
                {% continue %}
            {% endif %}
            <div class="field">
                <div class="ui list">
                    <div class="item">
                        <div class="ui master checkbox">
                            {{ form.render(checkbox~'_main') }}
                            <label for="{{ checkbox~'_main' }}"><b>{{ checkbox|capitalize }}</b></label>
                        </div>
                        <div class="list">
                            <div class="item">
                                <div class="ui child checkbox">
                                    {{ form.render(checkbox~'_read') }}
                                    <label>{{ t._('am_Read') }}</label>
                                </div>
                            </div>
                            <div class="item">
                                <div class="ui child checkbox">
                                    {{ form.render(checkbox~'_write') }}
                                    <label>{{ t._('am_Write') }}</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {% endfor %}
    </div>
    <button class="ui large button uncheck"><i class="eraser icon"></i>{{ t._('bt_Clear') }}</button>
</div>
<div class="field">
    <label>{{ t._('am_Description') }}</label>
    {{ form.render('description') }}
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('MainFields')]) }}

{{ partial("partials/submitbutton",['indexurl':'asterisk-managers/index']) }}


{{ end_form() }}