{% set controller=dispatcher.getControllerName() %}
{% set action=dispatcher.getActionName() %}

<div class="ui vertical menu left inverted sidebar visible" id="sidebarmenu">
    {{ elements.getMenu() }}
</div>

<div id="main" class="main-content-wrapper pusher">
    <div id="debug-info"></div>
    <div class="ui container">
        {% if StorageDiskUnMounted %}
            <div class="row">
                <div class="ui icon negative message">
                    <i class="hdd icon"></i>
                    <div class="content">
                        <div class="header">
                            {{ t._("adv_MessagesHeaderError") }}
                        </div>
                        {{ t._("adv_StorageDiskUnMounted") }}
                    </div>
                </div>
            </div>
        {% else %}
            <div class="row" id="advices"></div>
        {% endif %}

        <h1 class="ui {% if (action=='index') %}dividing{% endif %} header">
            {{ elements.getIconByController(controller) }}
            <div class="content">
                {{ t._('Breadcrumb'~controller) }}
                <div class="sub header">{{ t._('SubHeader'~controller) }}
                    {% if not urlToWiki is empty %}
                        <a href="{{ urlToWiki }}" target="_blank"
                           data-content="{{ t._("GoToWikiDocumentation") }}"
                           class="ui circular label" data-variation="wide">?</a>
                    {% endif %}
                </div>
            </div>
        </h1>
        <div class="row" id="loader-row">
            <div class="column">
                <div class="ui active inverted dimmer" id="loader">
                    <div class="ui large text loader">{{ t._("Loading") }}</div>
                </div>
            </div>
        </div>
        <div class="row" id="content-frame">
            <div id="ajax-messages"></div>
            <div class="ui segment">
                <div class="ui toggle checkbox" data-value="{{ controller }}" id="module-status-toggle">
                    <input type="checkbox" name="module-status"
                           id="module-status" {% if module.disabled!='1' %} checked {% endif %}/>
                    <label>{{ t._('ext_ModuleDisabledStatus'~(module.disabled == '1' ? 'Disabled' : 'Enabled')) }}</label>
                </div>
            </div>
            {% if (action=='index') %}
                {{ flash.output() }}
                {{ content() }}
            {% else %}
                <div class="ui grey segment">
                    {{ flash.output() }}
                    {{ content() }}
                </div>
            {% endif %}
        </div>
    </div>
<div class="ui page dimmer transition hidden" id="connection-dimmer">
    <div class="content">
        <h2 class="ui inverted icon header">
            <i class="asterisk loading icon"></i>
            {{ t._("DimmerWaitForPBXIsOnline") }}
        </h2>
    </div>
</div>
</div>
<div id="pbx-version">{{ PBXVersion }}</div>