<!--TOP MENU-->
<div class="ui fixed inverted menu">
    <a class="item logo hide-on-mobile" href="{{ url.get('index') }}" id="top-left-logo">
        <img src="{{ urlToLogo }}" class="ui small image"/>
    </a>

    <div class="ui item black launch left floated fixed button" id="sidebar-menu-button">
        <i class="content icon"></i>
        <span class="text">{{ t._("topMenu_SidebarButton") }}</span>
    </div>
    <div class="ui right aligned selection dropdown search item" id="top-menu-search">
        <input type="hidden" name="search-result">
        <div class="ui inverted transparent icon input">
            <input class="search" autocomplete="off" tabindex="0" placeholder="{{ t._("topMenu_SearchPlaceholder") }}"
                   value="">
            <i class="search link icon"></i>
        </div>
        <div class="results"></div>
    </div>
    <a class="item hide-on-mobile hide-on-tablet" href="{{ urlToWiki }}" target="_blank" data-content="{{ t._("GoToWikiDocumentation") }}"
       data-variation="wide">
        <i class="question icon"></i>
    </a>
    <a class="item hide-on-mobile hide-on-tablet" href="{{ urlToSupport }}" target="_blank"><i
                class="icon conversation"></i> {{ t._("topMenu_Support") }}</a>
    <div class="ui search dropdown item" id="web-admin-language-selector">
        <input type="hidden" name="WebAdminLanguage">
        <div class="text"></div>
        <i class="dropdown icon"></i>
    </div>
    <a class="item hide-on-mobile" id="show-advice-button"><i class="grey icon bell"></i></a>
    <a class="item" href="{{ url.get('session') }}/end"><i class="icon sign out"></i> {{ t._("mm_Logout") }}</a>
</div>
<!--/ TOP MENU-->