{{ form(['action' : 'firewall/save', 'method': 'post', 'role': 'form', 'class': 'ui form large', 'id':'firewall-form']) }}

{{ form.render('id') }}

<div class="field">
    <label>{{ t._('fw_Description') }}</label>
    {{ form.render('description') }}
</div>
<div class="field">
    <div class="fields">
        <div class="field">
            <label>{{ t._('fw_IPv4Network') }}</label>
            {{ form.render('ipv4_network') }}
        </div>
        <div class="field">
            <label>{{ t._('fw_IPv4Subnet') }}</label>
            {{ form.render('ipv4_subnet') }}
        </div>
        {% if form.has('ipv6_network') %}
        <div class="field" style="display: flex; align-items: center; padding-top: 1.75em;">
            <div class="ui horizontal divider" style="margin: 0 1em;">{{ t._('fw_Or') }}</div>
        </div>
        <div class="field">
            <label>{{ t._('fw_IPv6Network') }}</label>
            {{ form.render('ipv6_network') }}
        </div>
        <div class="field">
            <label>{{ t._('fw_IPv6Subnet') }}</label>
            {{ form.render('ipv6_subnet') }}
        </div>
        {% endif %}
    </div>
    {% if form.has('ipv6_network') %}
    <div class="ui info message">
        <i class="info circle icon"></i>
        {{ t._('fw_IPv6OrIPv4Required') }}
    </div>
    {% endif %}
</div>
<div class="field">
    <h4 class="ui  header">{{ t._('fw_Rules') }}</h4>
    <div id="firewall-rules-container" class="ui loading segment" style="min-height: 200px;">
        <!-- Rules will be dynamically loaded via JavaScript -->
    </div>
</div>
<h4 class="ui  header">{{ t._('fw_AdditionalRules') }}</h4>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox rules">
            <label for="local_network">
                {{ t._('fw_ItIsLocalNetwork') }}
                <i class="small info circle icon special-checkbox-info"
                   data-type="local_network"></i>
            </label>
            {{ form.render('local_network') }}
        </div>
    </div>
</div>
<div class="field">
    <div class="ui segment">
        <div class="ui toggle checkbox rules">
            <label for="newer_block_ip">
                {{ t._('fw_NewerBlockIp') }}
                <i class="small info circle icon special-checkbox-info"
                   data-type="newer_block_ip"></i>
            </label>
            {{ form.render('newer_block_ip') }}
        </div>
    </div>
</div>

{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Fields')]) }}

{{ partial("partials/submitbutton",['indexurl':'firewall/index/']) }}
{{ close('form') }}
