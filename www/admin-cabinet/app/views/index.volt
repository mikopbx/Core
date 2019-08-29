<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        {{ get_title() }}
        {% cache 'headerAssetsBeforeMetatags'~cacheName~'Cache.volt.php' %}
            {{ assets.outputCss('SemanticUICSS') }}
            {{ assets.outputCss('headerCSS') }}
        {% endcache %}
        <link rel="apple-touch-icon" sizes="180x180" href="{{ url() }}public/img/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="32x32" href="{{ url() }}public/img/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="{{ url() }}public/img/favicon-16x16.png">
        <link rel="manifest" href="{{ url() }}public/img/site.webmanifest">
        <link rel="mask-icon" href="{{ url() }}public/img/safari-pinned-tab.svg" color="#5bbad5">
        <link rel="shortcut icon" href="{{ url() }}public/img/favicon.ico">
        <meta name="robots" content="noindex, nofollow"/>
        <meta name="msapplication-TileColor" content="#2b5797">
        <meta name="msapplication-config" content="{{ url() }}public/img/browserconfig.xml">
        <meta name="theme-color" content="#ffffff">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="{{t._("MetategHeadDescription")}}">
        <meta name="author" content="MIKO">
        <script type="text/javascript">
            var globalTranslate = '';
			var globalPBXVersion = '{{ PBXVersion }}';
			var globalRootUrl = '{{ url() }}';
			var globalDebugMode = '{{ debugMode }}';
			var globalPBXLicense = '{{ PBXLicense }}';
			var globalLastSentryEventId = '{{ lastSentryEventId }}';
			var globalPBXLanguage = '{{ PBXLanguage }}';
			var globalSSHPort = '{{ SSHPort }}';
        </script>
        {% cache 'headerAssetsAfterMetatags'~cacheName~'Cache.volt.php' %}

            {{ assets.outputJs('headerSentryJS') }}
            {{ assets.outputJs('headerPBXJS') }}
            {{ assets.outputJs('headerJS') }}

        {% endcache %}
    </head>
    <body>
        {{ content() }}

        {% cache 'foterAssets'~cacheName~'Cache.volt.php' %}

            {{ assets.outputJs('SemanticUIJS') }}
            {{ assets.outputJs('footerACE') }}
            {{ assets.outputJs('footerLoc') }}
            {{ assets.outputJs('footerPBXJS') }}
            {{ assets.outputInlineJs() }}
            {{ assets.outputJs('footerJS') }}

        {% endcache %}

    </body>
</html>


