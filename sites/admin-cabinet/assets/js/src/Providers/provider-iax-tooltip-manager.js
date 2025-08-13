/*
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
 */

/* global globalTranslate, TooltipBuilder, i18n, ProviderTooltipManager */

/**
 * ProviderIaxTooltipManager - Specialized tooltip management for IAX providers
 * 
 * This class extends the base ProviderTooltipManager to provide IAX-specific
 * tooltip configurations. It combines common provider tooltips with IAX-specific
 * field tooltips for comprehensive form guidance.
 * 
 * Features:
 * - Inherits common provider tooltip functionality
 * - IAX-specific tooltip configurations (port, manual attributes, etc.)
 * - Integration with existing TooltipBuilder
 * - Consistent error handling and validation
 * 
 * @class ProviderIaxTooltipManager
 * @extends ProviderTooltipManager
 */
class ProviderIaxTooltipManager extends ProviderTooltipManager {
    /**
     * Private constructor to prevent instantiation
     * This class uses static methods for utility functionality
     */
    constructor() {
        super();
        throw new Error('ProviderIaxTooltipManager is a static class and cannot be instantiated');
    }

    /**
     * Get IAX-specific tooltip configurations
     * 
     * This method implements the abstract method from ProviderTooltipManager
     * and provides all IAX-specific tooltip configurations.
     * 
     * @static
     * @returns {Object} IAX-specific tooltip configurations
     */
    static getProviderSpecificConfigurations() {
        return {
            provider_host: {
                header: globalTranslate.iax_ProviderHostTooltip_header,
                description: globalTranslate.iax_ProviderHostTooltip_desc,
                list: [
                    globalTranslate.iax_ProviderHostTooltip_format_ip,
                    globalTranslate.iax_ProviderHostTooltip_format_domain,
                    globalTranslate.iax_ProviderHostTooltip_outbound_use,
                    globalTranslate.iax_ProviderHostTooltip_none_use
                ],
                note: globalTranslate.iax_ProviderHostTooltip_note
            },

            iax_port: {
                header: globalTranslate.iax_PortTooltip_header,
                description: globalTranslate.iax_PortTooltip_desc,
                list: [
                    globalTranslate.iax_PortTooltip_default,
                    globalTranslate.iax_PortTooltip_info
                ],
                note: globalTranslate.iax_PortTooltip_note
            },

            manual_attributes: {
                header: i18n('iax_ManualAttributesTooltip_header'),
                description: i18n('iax_ManualAttributesTooltip_desc'),
                list: [
                    {
                        term: i18n('iax_ManualAttributesTooltip_format'),
                        definition: null
                    }
                ],
                examplesHeader: i18n('iax_ManualAttributesTooltip_examples_header'),
                examples: [
                    'language = ru',
                    'codecpriority = host',
                    'trunktimestamps = yes',
                    'trunk = yes'
                ],
                warning: {
                    header: i18n('iax_ManualAttributesTooltip_warning_header'),
                    text: i18n('iax_ManualAttributesTooltip_warning')
                }
            }
        };
    }



}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProviderIaxTooltipManager;
}