{{ form('firewall/save', 'role': 'form', 'class': 'ui form large', 'id':'firewall-form') }}

{{ form.render('id') }}

<div class="field">
    <label>{{ t._('fw_Description') }}</label>
    {{ form.render('description') }}
</div>
<div class="fields">
    <div class="field">
        <label>{{ t._('fw_Permit') }}</label>
        <div class="field max-width-400">
            {{ form.render('network') }}
        </div>
    </div>
    <div class="field">
        <label>{{ t._('fw_Subnet') }}</label>
        <div class="field max-width-400">
            {{ form.render('subnet') }}
        </div>
    </div>
</div>
<div class="field">
    <h4 class="ui  header">{{ t._('fw_Rules') }}</h4>
    {% for name, value in firewallRules %}
        <div class="ui segment">
            <div class="field">
                <div class="ui toggle checkbox rules">
                    <input type="checkbox"
                           name="rule_{{ name|upper }}" {% if value['action']=='allow' %} checked {% endif %}
                           tabindex="0" class="hidden">
                    <label>{{ t._('fw_'~name|lower~'Description') }}</label>
                </div>
            </div>
        </div>
    {% endfor %}
</div>
<h4 class="ui  header">{{ t._('fw_AdditionalRules') }}</h4>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox rules">
            <label>{{ t._('fw_ItIsLocalNetwork') }}</label>
            {{ form.render('local_network') }}
        </div>
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox rules">
            <label>{{ t._('fw_NewerBlockIp') }}</label>
            {{ form.render('newer_block_ip') }}
        </div>
    </div>
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

{{ partial("partials/submitbutton",['indexurl':'firewall/index/']) }}
{{ end_form() }}
