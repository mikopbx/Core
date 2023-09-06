{% set controller=dispatcher.getControllerName() %}
{% set action=dispatcher.getActionName() %}


{% if (controller!="Session") %}
    {{ partial("partials/topMenu") }}
    {{ partial("partials/leftsidebar") }}
    <div id="main" class="ui main-content-wrapper pusher">
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
{% else %}
    <div class="ui middle aligned grid">
        <div class="column">
            {{ content() }}
        </div>
    </div>
    <div id="pbx-version">MIKOPBX ver: {{ PBXVersion }}</div>
{% endif %}
