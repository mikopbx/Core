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

/* global globalTranslate */

/**
 * Unified tooltip generator for firewall rules
 * @module firewallTooltips
 */
const firewallTooltips = {
    /**
     * Generate tooltip content based on service, action and context
     * @param {string} service - Service category name
     * @param {string} action - Current action (allow/block)
     * @param {string} network - Network address with subnet
     * @param {boolean} isDocker - Whether running in Docker
     * @param {boolean} isLimited - Whether service is limited in Docker
     * @param {Object} portInfo - Port information for the service
     * @param {boolean} showCopyButton - Whether to show copy button
     * @returns {string} HTML content for tooltip
     */
    generateContent(service, action, network, isDocker, isLimited, portInfo, showCopyButton = false) {
        let content = '<div class="content">';
        
        // Service name header
        const serviceDescription = globalTranslate[`fw_${service.toLowerCase()}Description`] || service;
        content += `<div class="header"><b>${serviceDescription}</b></div>`;
        
        // Port information
        if (portInfo && portInfo.length > 0) {
            content += `<div class="ui divider"></div>`;
            content += `<p><strong>${globalTranslate.fw_ServicePortsInfo}:</strong></p>`;
            content += '<ul class="ui list">';
            
            portInfo.forEach(port => {
                let portStr = '';
                if (port.port !== undefined) {
                    portStr = `${port.protocol} ${port.port}`;
                } else if (port.range) {
                    portStr = `${port.protocol} ${port.range}`;
                } else if (port.protocol === 'ICMP') {
                    portStr = 'ICMP';
                }
                
                if (port.description && !port.description.startsWith('fw_')) {
                    portStr += ` - ${port.description}`;
                } else if (port.description && globalTranslate[port.description]) {
                    portStr += ` - ${globalTranslate[port.description]}`;
                }
                
                content += `<li>${portStr}</li>`;
            });
            
            content += '</ul>';
        }
        
        // Context-specific content
        content += `<div class="ui divider"></div>`;
        
        if (isDocker && isLimited) {
            // Docker limited service - always show host configuration
            content += `<div class="ui warning message">`;
            content += `<i class="warning icon"></i> ${globalTranslate.fw_DockerLimitedService}`;
            content += `</div>`;
            content += `<p><strong>${globalTranslate.fw_DockerConfigureRules}:</strong></p>`;
            content += '<div class="ui segment">';
            
            if (showCopyButton) {
                content += `<div class="ui top right attached label copy-command" style="cursor: pointer;">`;
                content += `<i class="copy icon"></i> ${globalTranslate.fw_CopyCommand}`;
                content += '</div>';
            }
            
            content += '<pre style="font-size: 0.85em; margin: 0;">';
            
            if (portInfo && portInfo.length > 0) {
                portInfo.forEach(port => {
                    const iptablesAction = action === 'allow' ? 'ACCEPT' : 'DROP';
                    
                    if (port.protocol === 'ICMP') {
                        content += `iptables -A DOCKER-USER -s ${network} -p icmp -j ${iptablesAction}\n`;
                    } else if (port.port !== undefined && port.port !== 0) {
                        content += `iptables -A DOCKER-USER -s ${network} -p ${port.protocol.toLowerCase()} --dport ${port.port} -j ${iptablesAction}\n`;
                    } else if (port.range) {
                        const [from, to] = port.range.split('-');
                        content += `iptables -A DOCKER-USER -s ${network} -p ${port.protocol.toLowerCase()} --dport ${from}:${to} -j ${iptablesAction}\n`;
                    }
                });
            }
            
            content += '</pre>';
            content += '</div>';
        } else if (isDocker) {
            // Docker supported service - just information
            if (action === 'allow') {
                content += `<p>${globalTranslate.fw_AccessAllowedForSubnet} <strong>${network}</strong></p>`;
            } else {
                content += `<p>${globalTranslate.fw_AccessBlockedForSubnet} <strong>${network}</strong></p>`;
            }
        } else {
            // Regular environment - show iptables rules
            content += `<p><strong>${globalTranslate.fw_IptablesRulesApplied}:</strong></p>`;
            content += '<div class="ui segment">';
            content += '<pre style="font-size: 0.85em; margin: 0;">';
            
            if (portInfo && portInfo.length > 0) {
                portInfo.forEach(port => {
                    const iptablesAction = action === 'allow' ? 'ACCEPT' : 'DROP';
                    
                    if (port.protocol === 'ICMP') {
                        content += `iptables -A INPUT -s ${network} -p icmp -j ${iptablesAction}\n`;
                    } else if (port.port !== undefined && port.port !== 0) {
                        content += `iptables -A INPUT -s ${network} -p ${port.protocol.toLowerCase()} --dport ${port.port} -j ${iptablesAction}\n`;
                    } else if (port.range) {
                        const [from, to] = port.range.split('-');
                        content += `iptables -A INPUT -s ${network} -p ${port.protocol.toLowerCase()} --dport ${from}:${to} -j ${iptablesAction}\n`;
                    }
                });
            }
            
            content += '</pre>';
            content += '</div>';
        }
        
        content += '</div>';
        return content;
    },
    
    /**
     * Initialize tooltip on element
     * @param {jQuery} $element - jQuery element to attach tooltip to
     * @param {Object} options - Tooltip options
     */
    initializeTooltip($element, options) {
        const defaults = {
            position: 'top center',
            hoverable: true,
            delay: {
                show: 300,
                hide: 100
            },
            variation: 'flowing'
        };
        
        const settings = $.extend({}, defaults, options);
        
        if (settings.onShow) {
            const originalOnShow = settings.onShow;
            settings.onShow = function() {
                originalOnShow.call(this);
                // Initialize copy buttons after popup is shown
                setTimeout(() => {
                    $('.copy-command').off('click').on('click', firewallTooltips.copyToClipboard);
                }, 100);
            };
        } else {
            settings.onShow = function() {
                setTimeout(() => {
                    $('.copy-command').off('click').on('click', firewallTooltips.copyToClipboard);
                }, 100);
            };
        }
        
        // Check if element is an icon inside a label (for checkbox toggle prevention)
        if ($element.is('.special-checkbox-info, .service-info-icon') && $element.closest('label').length > 0) {
            // Use manual control for icons inside labels
            settings.on = 'manual';
            $element.popup(settings);

            // Add click handler to show popup and prevent checkbox toggle
            $element.off('click.popup-trigger').on('click.popup-trigger', function(e) {
                e.stopPropagation();
                e.preventDefault();
                $(this).popup('toggle');
            });
        } else {
            // Regular popup initialization
            $element.popup(settings);
        }
    },
    
    /**
     * Copy command to clipboard
     */
    copyToClipboard(e) {
        e.preventDefault();
        const $label = $(e.currentTarget);
        const $pre = $label.siblings('pre');
        const text = $pre.text();
        
        // Create temporary textarea
        const $temp = $('<textarea>');
        $('body').append($temp);
        $temp.val(text).select();
        
        try {
            document.execCommand('copy');
            $label.html(`<i class="check icon"></i> ${globalTranslate.fw_CommandCopied}`);
            setTimeout(() => {
                $label.html(`<i class="copy icon"></i> ${globalTranslate.fw_CopyCommand}`);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
        
        $temp.remove();
    },
    
    /**
     * Update tooltip content dynamically
     * @param {jQuery} $element - Element with tooltip
     * @param {string} newContent - New HTML content
     * @param {Object} additionalOptions - Additional options to merge
     */
    updateContent($element, newContent, additionalOptions = {}) {
        const options = {
            html: newContent,
            position: 'top center',
            hoverable: true,
            delay: {
                show: 300,
                hide: 100
            },
            variation: 'flowing',
            onShow: function() {
                setTimeout(() => {
                    $('.copy-command').off('click').on('click', firewallTooltips.copyToClipboard);
                }, 100);
            }
        };
        
        // Merge additional options
        $.extend(options, additionalOptions);
        
        $element.popup('destroy');
        $element.popup(options);
    },
    
    /**
     * Generate tooltip content for special checkboxes (newer_block_ip and local_network)
     * @param {string} type - Type of checkbox ('newer_block_ip' or 'local_network')
     * @param {string} network - Network address with subnet
     * @param {boolean} isChecked - Whether checkbox is checked
     * @returns {string} HTML content for tooltip
     */
    generateSpecialCheckboxContent(type, network, isChecked) {
        let content = '<div class="content">';
        
        if (type === 'newer_block_ip') {
            // Header
            content += `<div class="header"><b>${globalTranslate.fw_NewerBlockIp}</b></div>`;
            content += `<div class="ui divider"></div>`;
            
            // Description
            content += `<p>${globalTranslate.fw_NewerBlockIpTooltip}</p>`;
            
            // Effect
            content += `<div class="ui divider"></div>`;
            content += `<p><strong>${globalTranslate.fw_Effect}:</strong></p>`;
            
            if (isChecked) {
                content += `<div class="ui segment">`;
                content += `<i class="shield alternate icon"></i> ${globalTranslate.fw_Fail2banWillIgnore} <strong>${network}</strong>`;
                content += `</div>`;
                content += `<p class="ui warning message">`;
                content += `<i class="warning icon"></i> ${globalTranslate.fw_SecurityWarning}`;
                content += `</p>`;
            } else {
                content += `<p>${globalTranslate.fw_Fail2banWillMonitor} <strong>${network}</strong> ${globalTranslate.fw_AfterFailedAttempts}</p>`;
            }
            
        } else if (type === 'local_network') {
            // Header
            content += `<div class="header"><b>${globalTranslate.fw_ItIsLocalNetwork}</b></div>`;
            content += `<div class="ui divider"></div>`;
            
            // Description
            content += `<p>${globalTranslate.fw_LocalNetworkTooltip}</p>`;
            
            // Effect
            content += `<div class="ui divider"></div>`;
            content += `<p><strong>${globalTranslate.fw_Effect}:</strong></p>`;
            
            if (isChecked) {
                content += `<div class="ui segment">`;
                content += `<ul class="ui list">`;
                content += `<li><i class="check icon"></i> ${globalTranslate.fw_DirectSIPRouting}</li>`;
                content += `<li><i class="check icon"></i> ${globalTranslate.fw_NoContactRewriting}</li>`;
                content += `<li><i class="check icon"></i> ${globalTranslate.fw_LocalAddressDetection}</li>`;
                content += `</ul>`;
                content += `</div>`;
            } else {
                content += `<p>${globalTranslate.fw_NATHandling} <strong>${network}</strong> ${globalTranslate.fw_WillBeHandledAsExternal}</p>`;
            }
        }
        
        content += '</div>';
        return content;
    }
};