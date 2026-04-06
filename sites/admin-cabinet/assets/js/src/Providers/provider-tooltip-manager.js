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

/* global globalTranslate, TooltipBuilder */

/**
 * ProviderTooltipManager - Base class for provider tooltip management
 * 
 * This abstract base class provides common functionality for managing tooltips
 * in provider configuration forms. It defines the interface and shared methods
 * that all provider-specific tooltip managers should implement.
 * 
 * Features:
 * - Abstract base class pattern
 * - Common tooltip configurations shared across providers
 * - Standardized tooltip management interface
 * - Integration with existing TooltipBuilder
 * - Extensible architecture for provider-specific implementations
 * 
 * @abstract
 * @class ProviderTooltipManager
 */
class ProviderTooltipManager {
    /**
     * Private constructor to prevent instantiation
     * This class serves as an abstract base and should be extended
     */
    constructor() {
        if (new.target === ProviderTooltipManager) {
            throw new Error('ProviderTooltipManager is an abstract class and cannot be instantiated directly');
        }
    }

    /**
     * Get common tooltip configurations shared between all provider types
     * 
     * These are the tooltips that apply to all provider types (SIP, IAX, etc.)
     * 
     * @static
     * @returns {Object} Common tooltip configurations
     */
    static getCommonTooltipConfigurations() {
        return {
            registration_type: {
                header: globalTranslate.pr_RegistrationTypeTooltip_header,
                list: [
                    {
                        term: globalTranslate.pr_RegistrationTypeTooltip_outbound,
                        definition: globalTranslate.pr_RegistrationTypeTooltip_outbound_desc
                    },
                    {
                        term: globalTranslate.pr_RegistrationTypeTooltip_inbound,
                        definition: globalTranslate.pr_RegistrationTypeTooltip_inbound_desc
                    },
                    {
                        term: globalTranslate.pr_RegistrationTypeTooltip_none,
                        definition: globalTranslate.pr_RegistrationTypeTooltip_none_desc
                    }
                ]
            },

            network_filter: {
                header: globalTranslate.pr_NetworkFilterTooltip_header,
                description: globalTranslate.pr_NetworkFilterTooltip_desc,
                list: [
                    {
                        term: globalTranslate.pr_NetworkFilterTooltip_inbound,
                        definition: globalTranslate.pr_NetworkFilterTooltip_inbound_desc
                    },
                    {
                        term: globalTranslate.pr_NetworkFilterTooltip_outbound,
                        definition: globalTranslate.pr_NetworkFilterTooltip_outbound_desc
                    },
                    {
                        term: globalTranslate.pr_NetworkFilterTooltip_none,
                        definition: globalTranslate.pr_NetworkFilterTooltip_none_desc
                    }
                ]
            }
        };
    }

    /**
     * Get provider-specific tooltip configurations
     *
     * This method should be implemented by subclasses to provide tooltips
     * that are specific to their provider type.
     *
     * @abstract
     * @static
     * @returns {Object} Provider-specific tooltip configurations
     * @throws {Error} Must be implemented by subclasses
     */
    static getProviderSpecificConfigurations() {
        throw new Error('getProviderSpecificConfigurations() must be implemented by subclasses');
    }

    /**
     * Build complete tooltip configurations by merging common and provider-specific configurations
     * 
     * This method combines the common tooltip configurations with provider-specific ones,
     * allowing for override and extension of tooltip data.
     * 
     * @static
     * @returns {Object} Complete tooltip configurations
     */
    static buildTooltipConfigurations() {
        const commonConfigs = this.getCommonTooltipConfigurations();
        const providerSpecificConfigs = this.getProviderSpecificConfigurations();
        
        // Merge configurations, provider-specific configs override common ones
        return { ...commonConfigs, ...providerSpecificConfigs };
    }

    /**
     * Initialize all provider tooltips
     * 
     * This method builds the complete tooltip configurations and delegates
     * to TooltipBuilder for the actual popup initialization.
     * 
     * @static
     */
    static initialize() {
        try {
            const tooltipConfigs = this.buildTooltipConfigurations();
            
            if (typeof TooltipBuilder === 'undefined') {
                throw new Error('TooltipBuilder is not available');
            }
            
            TooltipBuilder.initialize(tooltipConfigs);
        } catch (error) {
            console.error('Failed to initialize provider tooltips:', error);
        }
    }

    /**
     * Update specific tooltip content
     * 
     * @static
     * @param {string} fieldName - Field name to update
     * @param {Object|string} tooltipData - New tooltip data or HTML content
     */
    static updateTooltip(fieldName, tooltipData) {
        try {
            if (typeof TooltipBuilder === 'undefined') {
                throw new Error('TooltipBuilder is not available');
            }
            
            TooltipBuilder.update(fieldName, tooltipData);
        } catch (error) {
            console.error(`Failed to update tooltip for field '${fieldName}':`, error);
        }
    }

    /**
     * Destroy all provider tooltips
     * 
     * @static
     * @param {string} [selector='.field-info-icon'] - jQuery selector for tooltip icons
     */
    static destroy(selector = '.field-info-icon') {
        try {
            if (typeof TooltipBuilder === 'undefined') {
                throw new Error('TooltipBuilder is not available');
            }
            
            TooltipBuilder.destroy(selector);
        } catch (error) {
            console.error('Failed to destroy provider tooltips:', error);
        }
    }

    /**
     * Hide all provider tooltips
     * 
     * @static
     * @param {string} [selector='.field-info-icon'] - jQuery selector for tooltip icons
     */
    static hide(selector = '.field-info-icon') {
        try {
            if (typeof TooltipBuilder === 'undefined') {
                throw new Error('TooltipBuilder is not available');
            }
            
            TooltipBuilder.hide(selector);
        } catch (error) {
            console.error('Failed to hide provider tooltips:', error);
        }
    }

    /**
     * Get tooltip configuration for a specific field
     * 
     * @static
     * @param {string} fieldName - Name of the field
     * @returns {Object|null} Tooltip configuration or null if not found
     */
    static getTooltipConfiguration(fieldName) {
        try {
            const tooltipConfigs = this.buildTooltipConfigurations();
            return tooltipConfigs[fieldName] || null;
        } catch (error) {
            console.error(`Failed to get tooltip configuration for field '${fieldName}':`, error);
            return null;
        }
    }

    /**
     * Check if tooltip builder is available
     * 
     * @static
     * @returns {boolean} True if TooltipBuilder is available
     */
    static isTooltipBuilderAvailable() {
        return typeof TooltipBuilder !== 'undefined' && 
               TooltipBuilder.initialize && 
               typeof TooltipBuilder.initialize === 'function';
    }

    /**
     * Validate tooltip configuration structure
     * 
     * @static
     * @param {Object} config - Tooltip configuration to validate
     * @returns {boolean} True if configuration is valid
     */
    static validateTooltipConfiguration(config) {
        if (!config || typeof config !== 'object') {
            return false;
        }

        // Check for required structure - at minimum should have header or description
        return config.header || config.description || config.list || config.examples;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProviderTooltipManager;
}