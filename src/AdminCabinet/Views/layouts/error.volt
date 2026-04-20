<!DOCTYPE html>
<html lang="{{ WebAdminLanguage }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ get_title() }}</title>
    <link rel="shortcut icon" href="/admin-cabinet/assets/img/favicon.ico">
    <link rel="stylesheet" type="text/css" href="/admin-cabinet/assets/css/vendor/semantic/reset.min.css">
    <link rel="stylesheet" type="text/css" href="/admin-cabinet/assets/css/vendor/semantic/site.min.css">
    <link rel="stylesheet" type="text/css" href="/admin-cabinet/assets/css/vendor/semantic/grid.min.css">
    <link rel="stylesheet" type="text/css" href="/admin-cabinet/assets/css/vendor/semantic/segment.min.css">
    <link rel="stylesheet" type="text/css" href="/admin-cabinet/assets/css/vendor/semantic/header.min.css">
    <link rel="stylesheet" type="text/css" href="/admin-cabinet/assets/css/vendor/semantic/icon.min.css">
    <link rel="stylesheet" type="text/css" href="/admin-cabinet/assets/css/vendor/semantic/button.min.css">
    <link rel="stylesheet" type="text/css" href="/admin-cabinet/assets/css/vendor/semantic/image.min.css">
    <style>
        html, body { height: 100%; }
        body { background: #f7f7f9; margin: 0; font-family: 'Lato','Helvetica Neue',Arial,sans-serif; }
        #error-page { min-height: 100vh; margin: 0 !important; }
        #error-page .column { max-width: 520px; }
        #error-page .logo-wrap img { max-width: 160px; height: auto; margin: 0 auto 1.5em; display: block; }
        #error-page .ui.segment { padding: 2.5em 2em; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
        #error-page .icon.header { color: #888; margin-bottom: 1.2em; }
        #error-page .icon.header .icon { font-size: 3em; }
        #error-page .sub.header { margin-top: .6em; color: #888; font-weight: normal; }
        #error-page .ui.primary.button { margin-top: 1.6em; }
        #pbx-version { text-align: center; color: #aaa; margin-top: 1em; font-size: .85em; }
    </style>
</head>
<body>
<div class="ui middle aligned center aligned grid" id="error-page">
    <div class="column">
        <div class="logo-wrap">
            <a href="{{ logoHref }}">
                <img src="{{ urlToLogo }}" alt="MikoPBX">
            </a>
        </div>

        <div class="ui segment">
            {{ content() }}

            {% if isUserAuthenticated %}
                <a href="{{ url('extensions/index') }}" class="ui primary button">
                    <i class="home icon"></i>{{ t._('er_Home') }}
                </a>
            {% else %}
                <a href="{{ url('session/index') }}" class="ui primary button">
                    <i class="sign in icon"></i>{{ t._('er_Home') }}
                </a>
            {% endif %}
        </div>

        <div id="pbx-version">{{ PBXName }}</div>
    </div>
</div>
</body>
</html>
