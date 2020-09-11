<!--TOP MENU-->
<div class="ui fixed inverted menu">
    <a class="item logo" href="{{ url.get('index') }}"><img src="{{ urlToLogo }}" class="ui small image"/></a>
    {# <div class="item"> #}
    {# CPU 20% #}
    {# </div> #}
    {# <div class="item"> #}
    {# MEM 20% #}
    {# </div> #}
    {# <div class="item"> #}
    {# HDD 20% #}
    {# </div> #}

    <div class="ui right aligned selection dropdown search item" id="top-menu-search">
        <input type="hidden" name="search-result">
        <div class="ui inverted transparent icon input">
            <input class="search" autocomplete="off" tabindex="0" placeholder="{{ t._("topMenu_SearchPlaceholder") }}"
                   value="">
            <i class="search link icon"></i>
        </div>
        <div class="results"></div>
    </div>
    <a class="item" href="{{ urlToWiki }}" target="_blank" data-content="{{ t._("GoToWikiDocumentation") }}"
       data-variation="wide">
        <i class="question icon"></i>
    </a>
    <a class="item" href="{{ urlToSupport }}" target="_blank"><i
                class="icon conversation"></i> {{ t._("topMenu_Support") }}</a>
    <div class="ui dropdown item" id="web-admin-language-selector">
        <input type="hidden" name="WebAdminLanguage">
        <div class="text"></div>
        <i class="dropdown icon"></i>
    </div>
    <a class="item ui label" id="show-advices-button"><i class="grey icon bell"></i></a>
    <a class="item" href="{{ url.get('session') }}/end"><i class="icon sign out"></i> {{ t._("mm_Logout") }}</a>
</div>
<!--/ TOP MENU-->