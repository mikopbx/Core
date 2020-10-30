{% set controller=dispatcher.getControllerName() %}
{% set action=dispatcher.getActionName() %}

    {{ partial("partials/topMenu") }}
    {{ partial("partials/leftsidebar") }}

<div id="main" class="ui bottom attached main-content-wrapper pusher">
    <div id="debug-info"></div>
    <div class="ui container">
        <!--ADVICES-->
        <div class="ui flowing popup bottom left transition hidden" id="advices"></div>
        <!--/ ADVICES-->
        <!--HEADER-->
        <div class="ui hidden divider"></div>
        <div class="ui grid">
            <div class="ui left floated middle aligned thirteen wide column">
                <h1 class="ui header">
                    {{ elements.getIconByController(controller) }}
                    <div class="content">
                        {{ t._('Breadcrumb'~controller) }}
                        <div class="sub header">{{ t._('SubHeader'~controller) }}
                            ( {{ t._('ext_Version') }} {{ module.version }})
                            {% if not urlToWiki is empty %}
                                <a href="{{ urlToWiki }}" target="_blank"
                                   data-content="{{ t._("GoToWikiDocumentation") }}"
                                   data-variation="wide"><i class="small blue question icon circular label"></i></a>
                            {% endif %}
                        </div>
                    </div>
                </h1>
            </div>

            <div class="ui right floated middle aligned three wide column">
                {% if logoImagePath is not empty %}
                    <img class="ui tiny right floated image" src="{{ logoImagePath }}">
                {% endif %}
            </div>
        </div>
        <!-- /HEADER-->

        <!--LOADER-->
        <div class="row" id="loader-row">
            <div class="column">
                <div class="ui active inverted dimmer" id="loader">
                    <div class="ui large text loader">{{ t._("Loading") }}</div>
                </div>
            </div>
        </div>
        <!--/ LOADER-->

        <!--MAIN CONTENT-->
        <div class="row" id="content-frame">
            <div id="ajax-messages"></div>
            <div class="ui segment">
                <div class="ui toggle checkbox" data-value="{{ controller }}" id="module-status-toggle">
                    <input type="checkbox" name="module-status"
                           id="module-status" {% if module.disabled!=='1' %} checked {% endif %}/>
                    <label>{{ t._('ext_ModuleDisabledStatus'~(module.disabled === '1' ? 'Disabled' : 'Enabled')) }}</label>
                </div>
                <a class="ui icon basic button right floated pbx-extensions-settings"
                   href="{{ url('pbx-extension-modules/modify/'~controller) }}"><i class="cogs icon"></i></a>
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
        <!--/ MAIN CONTENT-->
        <div id="pbx-version">MIKOPBX ver: {{ PBXVersion }}</div>
    </div>
    <!--CONNECTION DIMMER-->
    <div class="ui page dimmer transition hidden" id="connection-dimmer">
        <div class="content">
            <h2 class="ui inverted icon header">
                <i class="asterisk loading icon"></i>
                {{ t._("DimmerWaitForPBXIsOnline") }}
            </h2>
            <div>{{ t._("DimmerWaitForPBXOnlineDescription") }}</div>
        </div>
    </div>
    <!--/ CONNECTION DIMMER-->
</div>
