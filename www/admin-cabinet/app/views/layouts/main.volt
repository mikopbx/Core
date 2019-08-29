{% set controller=dispatcher.getControllerName() %}
{% set action=dispatcher.getActionName() %}


{% if (controller!="Session") %}
<div class="ui vertical menu left inverted sidebar visible" id="sidebarmenu">
    <a class="item" href="{{url.get('index')}}"><img src="{{ urlToLogo }}" class="ui medium image"/></a>
    {{ elements.getMenu() }}
</div>

    <div id="main" class="main-content-wrapper pusher">
        <div id="debug-info"></div>
        <div class="ui container">

                <div class="row" id="advices"></div>


            <h1 class="ui {% if (action=='index') %}dividing{% endif %} header">
                {{ elements.getIconByController(controller) }}
                <div class="content">
                    {{ t._('Breadcrumb'~controller) }}
                    <div class="sub header">{{ t._('SubHeader'~controller) }}
                        {% if not urlToWiki is empty %}
                            <a href="{{ urlToWiki }}" target="_blank"
                               data-content="{{ t._("GoToWikiDocumentation") }}"
                               data-variation="wide"> <i class="small blue question icon circular label"></i></a>
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
            <div>{{ t._("DimmerWaitForPBXOnlineDescription") }}</div>
        </div>
    </div>
    </div>
{% else %}
    <div class="ui middle aligned center aligned grid">
        <div class="column">
            {{ content() }}
        </div>
    </div>
{% endif %}
<div id="pbx-version">{{ PBXVersion }}</div>