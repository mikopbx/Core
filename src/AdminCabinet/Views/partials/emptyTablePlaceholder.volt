{#
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 #}

{# 
Universal empty table placeholder partial
Parameters:
- icon: string - Semantic UI icon class (e.g., 'users', 'server', 'phone')
- title: string - Title message
- description: string - Description of functionality
- addButtonText: string - Text for add button
- addButtonLink: string - Link for add button
- showButton: boolean - Whether to show the button (permission check)
- documentationLink: string - URL to documentation (optional)
- showDocumentationLink: boolean - Whether to show documentation link (optional, defaults to true if link provided)
- dropdownItems: array - Array of dropdown menu items (optional, creates dropdown button instead of simple button)
  Each item should have: 'link', 'icon', 'text'
#}

<div class="ui placeholder segment">
    <div class="ui icon header">
        <i class="{{ icon }} icon"></i>
        {{ title }}
    </div>
    {% if description %}
        <div class="inline">
            <div class="ui text">
                {{ description }}
            </div>
        </div>
    {% endif %}
    {% if documentationLink and (showDocumentationLink is not defined or showDocumentationLink) %}
        <div style="margin-top: 1em;">
            <a href="#" 
            data-controller="{{ controllerName }}" 
            data-action="{{ actionName }}" 
            {% if globalModuleUniqueId %}data-module-id="{{ globalModuleUniqueId }}"{% endif %} 
            target="_blank" 
            class="ui basic tiny button prevent-word-wrap wiki-help-link">
                <i class="question circle outline icon"></i>
                {{ t._('et_ReadDocumentation') }}
            </a>
        </div>
    {% endif %}
    {% if showButton %}
        <div style="margin-top: 1em; text-align: center;">
            {% if dropdownItems is defined and dropdownItems|length > 0 %}
                {# Dropdown button with multiple actions #}
                <div class="ui buttons" style="display: inline-flex;">
                    {% if addButtonLink and addButtonText %}
                        {{ link_to(addButtonLink, addButtonText, "class": "ui blue button prevent-word-wrap") }}
                    {% endif %}
                    <div class="ui floating dropdown blue icon button">
                        <i class="dropdown icon"></i>
                        <div class="menu">
                            {% for item in dropdownItems %}
                                <a class="item" href="{{ item['link'] }}">
                                    <i class="{{ item['icon'] }} icon"></i>
                                    {{ item['text'] }}
                                </a>
                            {% endfor %}
                        </div>
                    </div>
                </div>
            {% elseif addButtonLink and addButtonText %}
                {# Simple button (backward compatibility) #}
                {{ link_to(addButtonLink, addButtonText, "class": "ui blue button prevent-word-wrap") }}
            {% endif %}
        </div>
    {% endif %}
</div>