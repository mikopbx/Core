<div class="ui segment" id="module-status-toggle-segment">
    <div class="ui toggle checkbox" data-value="{{ controllerName }}" id="module-status-toggle">
        <input type="checkbox" name="module-status"
               id="module-status" {% if module['disabled']!=='1' %} checked {% endif %}/>
        <label for="module-status">{{ t._('ext_ModuleDisabledStatus'~(module['disabled'] === '1' ? 'Disabled' : 'Enabled')) }}</label>
    </div>
    <a class="ui icon basic button right floated pbx-extensions-settings"
       href="{{ url('pbx-extension-modules/modify/'~controllerName) }}"><i class="cogs icon"></i></a>
</div>