{{ form(['action' : 'firewall/save', 'method': 'post', 'role': 'form', 'class': 'ui form large', 'id':'firewall-form']) }}

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
