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

                <!--ADVICES-->
                <div class="ui flowing popup bottom left transition hidden" id="advices"></div>
                <!--/ ADVICES-->

                <!--HEADER-->
                {% if (isExternalModuleController) %}
                    {{ partial("partials/modulesHeader") }}
                {% else %}
                    {{ partial("partials/mainHeader") }}
                {% endif %}
                <!--/ HEADER-->

                <!--MAIN CONTENT-->
                <div class="row" id="content-frame">
                    <div id="ajax-messages"></div>

                    {% if (isExternalModuleController) %}
                        {{ partial("partials/modulesStatusToggle") }}
                    {% endif %}

                    {% if (actionName=='index') %}
                        {{ flash.output() }}
                        {{ content() }}
                    {% else %}
                        <div class="ui grey segment">
                            {{ flash.output() }}
                            {{ content() }}
                        </div>
                    {% endif %}
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