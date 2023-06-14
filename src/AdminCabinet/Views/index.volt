{% set controller=dispatcher.getControllerName() %}
{% set action=dispatcher.getActionName() %}

<!DOCTYPE html>
<html lang="{{ WebAdminLanguage }}">
<head>
    <meta charset="utf-8">
    <title>{{ get_title() }}</title>
    {{ assets.outputCombinedHeaderCSS(controller, action) }}
{#    {{ assets.outputCss('SemanticUICSS') }}#}
{#    {{ assets.outputCss('headerCSS') }}#}
    <link rel="apple-touch-icon" sizes="180x180" href="{{ url() }}assets/img/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="{{ url() }}assets/img/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="{{ url() }}assets/img/favicon-16x16.png">
    <link rel="manifest" href="{{ url() }}assets/img/site.webmanifest">
    <link rel="mask-icon" href="{{ url() }}assets/img/safari-pinned-tab.svg" color="#5bbad5">
    <link rel="shortcut icon" href="{{ url() }}assets/img/favicon.ico">
    <meta name="robots" content="noindex, nofollow"/>
    <meta name="msapplication-TileColor" content="#2b5797">
    <meta name="msapplication-config" content="{{ url() }}assets/img/browserconfig.xml">
    <meta name="theme-color" content="#ffffff">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{{ MetaTegHeadDescription }}">
    <meta name="author" content="MIKO">
    <script type="text/javascript">
		var globalTranslate = '';
		var globalPBXVersion = '{{ PBXVersion }}';
		var globalRootUrl = '{{ url() }}';
		var globalDebugMode = '{{ debugMode }}';
		var globalPBXLicense = '{{ PBXLicense }}';
        var globalModuleUniqueId = '{{ globalModuleUniqueId }}';
		var globalLastSentryEventId = '{{ lastSentryEventId }}';
		var globalWebAdminLanguage = '{{ WebAdminLanguage }}';
		var globalAvailableLanguages = '{{ AvailableLanguages }}';
    </script>

    {{ assets.outputCombinedHeaderJs(controller, action) }}
{#    {{ assets.outputJs('headerSentryJS') }}#}
{#    {{ assets.outputJs('headerPBXJS') }}#}
{#    {{ assets.outputJs('headerJS') }}#}

</head>
<body>
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
            <!-- ARTICLE-->
            <div class="article">
                <div id="debug-info"></div>

                {{ content() }}
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
            <!-- /ARTICLE-->
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

{{ assets.outputCombinedFooterJs(controller, action) }}
{#{{ assets.outputJs('SemanticUIJS') }}#}
{#{{ assets.outputJs('footerACE') }}#}
{#{{ assets.outputJs('footerLoc') }}#}
{#{{ assets.outputJs('footerPBXJS') }}#}
{{ assets.outputInlineJs() }}
{{ assets.outputJs('footerJS') }}

</body>
</html>

