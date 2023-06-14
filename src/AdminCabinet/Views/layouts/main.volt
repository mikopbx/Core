{% set controller=dispatcher.getControllerName() %}
{% set action=dispatcher.getActionName() %}

{% if (controller!="Session") %}
    {{ partial("partials/topMenu") }}
    <div class="ui vertical menu left inverted sidebar sidebar-menu" id="toc">
        <a class="item logo top-left-logo" href="{{ url.get('index') }}">
            <img src="{{ urlToLogo }}" class="ui small image"/>
        </a>
        {{ elements.getMenu() }}
    </div>
    <div id="main" class="ui main-content-wrapper pusher">
        <div class="full height">
            <div class="toc">
                {{ partial("partials/leftsidebar") }}
            </div>
            <div class="article">
                <div id="debug-info"></div>
                <div class="ui container" id="main-content-container">

                    <!--ADVICES-->
                    <div class="ui flowing popup bottom left transition hidden" id="advices"></div>
                    <!--/ ADVICES-->

                    <!--HEADER-->
                    <h1 class="ui {% if (action=='index') %}dividing{% endif %} header">
                        {% if represent is empty %}
                            {{ elements.getIconByController(controller) }}
                            <div class="content">
                                {{ t._('Breadcrumb'~controller) }}
                                <div class="sub header">{{ t._('SubHeader'~controller) }}
                                    {% if not urlToWiki is empty %}
                                        <a href="{{ urlToWiki }}" target="_blank"
                                           data-content="{{ t._("GoToWikiDocumentation") }}"
                                           data-variation="wide"> <i class="blue question circle outline icon"></i></a>
                                    {% endif %}
                                </div>
                            </div>
                        {% else %}
                            <div class="content">
                                {{ represent }} {% if not urlToWiki is empty %}
                                    <a href="{{ urlToWiki }}" target="_blank"
                                       data-content="{{ t._("GoToWikiDocumentation") }}"
                                       data-variation="wide"> <i class="small blue question icon"></i></a>
                                {% endif %}
                            </div>
                        {% endif %}

                    </h1>
                    {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Header')]) }}
                    <!--/ HEADER-->

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
                    <!--/MAIN CONTENT-->
                    {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Footer')]) }}
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
        </div>
    </div>
{% else %}
    <div class="ui middle aligned grid">
        <div class="column">
            {{ content() }}
        </div>
    </div>
    <div id="pbx-version">MIKOPBX ver: {{ PBXVersion }}</div>
{% endif %}
