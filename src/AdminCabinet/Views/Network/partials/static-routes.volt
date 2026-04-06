<div id="static-routes-section" style="display: none;">
    <h4 class="ui dividing header">{{ t._("nw_StaticRoutes") }}</h4>

    <!-- Empty state placeholder -->
    <div id="static-routes-empty-placeholder" style="display: none;">
        <div class="ui placeholder segment">
            <div class="ui icon header">
                <i class="route icon"></i>
                {{ t._('nw_NoStaticRoutes') }}
            </div>
            <div class="inline">
                <div class="ui text">
                    {{ t._('nw_NoStaticRoutesDescription') }}
                </div>
            </div>
            <div style="margin-top: 1em;">
                <a href="#" 
                data-controller="{{ controllerName }}" 
                data-action="{{ actionName }}" 
                target="_blank" 
                class="ui basic tiny button prevent-word-wrap wiki-help-link">
                    <i class="question circle outline icon"></i>
                    {{ t._('et_ReadDocumentation') }}
                </a>
            </div>
            <div style="margin-top: 1em; text-align: center;">
                <button type="button" class="ui blue button prevent-word-wrap" id="add-first-route-button">
                    <i class="add circle icon"></i>
                    {{ t._("nw_AddNewRoute") }}
                </button>
            </div>
        </div>
    </div>

    <!-- Routes table -->
    <div id="static-routes-table-container" style="display: none;">
        <div class="ui basic compact segment">
            <table class="ui selectable small very compact unstackable table" id="static-routes-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th style="width: 30px;"></th>
                        <th>{{ t._("nw_Network") }}</th>
                        <th>{{ t._("nw_Subnet") }}</th>
                        <th>{{ t._("nw_Gateway") }}</th>
                        <th>{{ t._("nw_Interface") }}</th>
                        <th>{{ t._("nw_RouteDescription") }}</th>
                        <th style="width: 50px;"></th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Template row for cloning -->
                    <tr class="route-row-template" style="display: none">
                        <td class="dragHandle"><i class="sort grey icon"></i></td>
                        <td>
                            <input type="text" class="network-input ipaddress" placeholder="192.168.10.0" />
                        </td>
                        <td>
                            <div class="subnet-dropdown-container"></div>
                        </td>
                        <td>
                            <input type="text" class="gateway-input ipaddress" placeholder="192.168.1.1" />
                        </td>
                        <td>
                            <div class="interface-dropdown-container"></div>
                        </td>
                        <td>
                            <input type="text" class="description-input" placeholder="{{ t._('nw_RouteDescriptionPlaceholder') }}" />
                        </td>
                        <td class="right aligned collapsing">
                            <div class="ui tiny basic icon buttons action-buttons">
                                <a class="ui button copy-route-button"
                                   data-variation="basic"
                                   data-content="{{ t._('bt_ToolTipCopyRoute') }}">
                                    <i class="copy icon blue"></i>
                                </a>
                                <a class="ui button delete-route-button"
                                   data-content="{{ t._('bt_ToolTipDelete') }}">
                                    <i class="trash icon red"></i>
                                </a>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <button type="button" class="ui labeled icon button" id="add-new-route">
            <i class="plus icon"></i>
            {{ t._("nw_AddNewRoute") }}
        </button>
    </div>
    <div class="ui hidden divider"></div>
</div>
