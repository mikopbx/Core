<!--LEFT MENU-->
<div class="ui vertical menu left inverted {{ sidebarClass }}" id="{{sidebarId}}">
    {% if showLogo %}
        <a class="item logo top-left-logo" href="{{ logoHref }}">
            <img src="{{ urlToLogo }}" class="ui small image"/>
        </a>
    {% endif %}
    {{ elements.getMenu() }}
</div>
<!--/LEFT MENU-->