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
                                   data-variation="wide"> <i class="small blue question icon"></i></a>
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
        <!--  PASSWORD SECTION -->
        <div id='updatePasswordWindow' class="ui raised segment large modal">
            <form method="post" onsubmit="return false" autoComplete="off">
                <div class="ui form success">
                    <div class="ui icon negative message">
                      <i class="shield alternate icon"></i>
                      <div class="content">
                        <div class="header">
                          {{ t._("gs_SetPassword") }}
                        </div>
                        <p>{{ t._("gs_SetPasswordInfo") }}</p>
                      </div>
                    </div>
                    <input type="password" style="display: none">
                    <input type="password" style="display: none">
                    <input type="password" style="display: none">
                    <div id='WebAdminPassword-container' class="ui miko-settings-container">
                        <a class="ui teal ribbon label">{{ t._("gs_WebPasswordFieldName") }}</a>
                        <div class="two fields">
                            <div class="field">
                                <label>{{ t._("gs_WebAdminPassword") }}</label>
                                <input type="password" id="WebAdminPassword" name="WebAdminPassword" autocomplete="none">
                            </div>
                            <div class="field">
                                <label>{{ t._("gs_WebAdminPasswordRepeat") }}</label>
                                <input type="password" id="WebAdminPasswordRepeat" name="WebAdminPasswordRepeat" autocomplete="none">
                            </div>
                        </div>
                    </div>
                    <div id='SSHPassword-container' class="ui miko-settings-container">
                        <a class="ui teal ribbon label">{{ t._("gs_SshPasswordFieldName") }}</a>
                        <br>
                        <div class="two fields">
                            <div class="field">
                                <label>{{ t._("gs_WebAdminPassword") }}</label>
                                <input type="password" id="SSHPassword" name="SSHPassword" autocomplete="none">
                            </div>
                            <div class="field">
                                <label>{{ t._("gs_SSHPasswordRepeat") }}</label>
                                <input type="password" id="SSHPasswordRepeat" name="SSHPasswordRepeat" autocomplete="none">
                            </div>
                        </div>
                    </div>
                    <div id="updatePasswordWindowResult" class="ui warning message" style="display: none">
                        <div class="header"></div>
                        <p></p>
                    </div>
                    <button class="ui primary button" id='savePassword'>
                      {{ t._("bt_SaveSettings") }}
                    </button>
                </div>
            </form>
        </div>
        <!--/  PASSWORD SECTION -->
    </div>
{% else %}
    <div class="ui middle aligned grid">
        <div class="column">
            {{ content() }}
        </div>
    </div>
    <div id="pbx-version">MIKOPBX ver: {{ PBXVersion }}</div>
{% endif %}
