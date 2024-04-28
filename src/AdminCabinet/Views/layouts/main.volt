{{ partial("partials/topMenu") }}
{{ partial("partials/leftsidebar",['sidebarId':'toc', 'sidebarClass':'sidebar sidebar-menu', 'showLogo':true]) }}

<div id="main" class="ui main-content-wrapper pusher">
    <div class="full height">
        <div class="toc">
            {{ partial("partials/leftsidebar",['sidebarId':'sidebar-menu',  'sidebarClass':'sidebar-menu', 'showLogo':false]) }}
        </div>
        <!-- ARTICLE-->
        <div class="article">
            <div id="debug-info"></div>

            <div class="ui container" id="main-content-container">
                <!--ADVICE-->
                <div class="ui flowing popup bottom left transition hidden" id="advice"></div>
                <!--/ ADVICE-->

                <!--HEADER-->
                {% if (isExternalModuleController) %}
                    {{ partial("partials/modulesHeader") }}
                {% else %}
                    {{ partial("partials/mainHeader") }}
                {% endif %}
                <!--/ HEADER-->

                <!--MAIN CONTENT-->
                {% if (actionName=='index') %}
                    {%set contentClass='basic' %}
                {% else %}
                    {%set contentClass='grey' %}
                {% endif %}
                    <div class="ui {{ contentClass}} loading segment" id="content-frame">
                        {% if (isExternalModuleController) %}
                            {{ partial("partials/modulesStatusToggle") }}
                        {% endif %}
                        <div id="ajax-messages"></div>
                        {{ flash.output() }}
                        {{ content() }}
                    </div>
                <!--/MAIN CONTENT-->

                {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Footer')]) }}
                <div id="pbx-version">MIKOPBX ver: {{ PBXVersion }}</div>
            </div>

            <!--CONNECTION DIMMER-->
            {{ partial("partials/mainDimmer") }}
            <!--/ CONNECTION DIMMER-->
        </div>
        <!-- /ARTICLE-->
    </div>
</div>