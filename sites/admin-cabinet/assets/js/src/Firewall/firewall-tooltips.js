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
            content += `<p><strong>${globalTranslate.fw_ServicePortsInfo || 'Used ports'}:</strong></p>`;
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
            content += `<i class="warning icon"></i> ${globalTranslate.fw_DockerLimitedService || 'This service is always enabled in Docker environment. Firewall rules must be configured on the Docker host.'}`;
            content += `</div>`;
            content += `<p><strong>${globalTranslate.fw_DockerConfigureRules || 'Configure firewall rules on Docker host'}:</strong></p>`;
            content += '<div class="ui segment">';
            
            if (showCopyButton) {
                content += `<div class="ui top right attached label copy-command" style="cursor: pointer;">`;
                content += `<i class="copy icon"></i> ${globalTranslate.fw_CopyCommand || 'Copy'}`;
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
                content += `<p>${globalTranslate.fw_AccessAllowedForSubnet || 'Access will be allowed for subnet'} <strong>${network}</strong></p>`;
            } else {
                content += `<p>${globalTranslate.fw_AccessBlockedForSubnet || 'Access will be blocked for subnet'} <strong>${network}</strong></p>`;
            }
        } else {
            // Regular environment - show iptables rules
            content += `<p><strong>${globalTranslate.fw_IptablesRulesApplied || 'Following iptables rules will be applied'}:</strong></p>`;
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
        
        $element.popup(settings);
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
            $label.html(`<i class="check icon"></i> ${globalTranslate.fw_CommandCopied || 'Copied!'}`);
            setTimeout(() => {
                $label.html(`<i class="copy icon"></i> ${globalTranslate.fw_CopyCommand || 'Copy'}`);
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
     */
    updateContent($element, newContent) {
        $element.popup('destroy');
        $element.popup({
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
        });
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
            content += `<div class="header"><b>${globalTranslate.fw_NewerBlockIp || 'Never block IPs'}</b></div>`;
            content += `<div class="ui divider"></div>`;
            
            // Description
            content += `<p>${globalTranslate.fw_NewerBlockIpTooltip || 'IP addresses from this subnet will never be blocked by Fail2ban service, even after multiple failed login attempts. Use this option for trusted networks such as office network or VPN.'}</p>`;
            
            // Effect
            content += `<div class="ui divider"></div>`;
            content += `<p><strong>${globalTranslate.fw_Effect || 'Effect'}:</strong></p>`;
            
            if (isChecked) {
                content += `<div class="ui segment">`;
                content += `<i class="shield alternate icon"></i> ${globalTranslate.fw_Fail2banWillIgnore || 'Fail2ban will ignore failed authentication attempts from'} <strong>${network}</strong>`;
                content += `</div>`;
                content += `<p class="ui warning message">`;
                content += `<i class="warning icon"></i> ${globalTranslate.fw_SecurityWarning || 'Warning: This reduces security for the specified network. Use only for trusted networks.'}`;
                content += `</p>`;
            } else {
                content += `<p>${globalTranslate.fw_Fail2banWillMonitor || 'Fail2ban will monitor and may block IPs from'} <strong>${network}</strong> ${globalTranslate.fw_AfterFailedAttempts || 'after failed authentication attempts.'}</p>`;
            }
            
        } else if (type === 'local_network') {
            // Header
            content += `<div class="header"><b>${globalTranslate.fw_ItIsLocalNetwork || 'Local network or VPN'}</b></div>`;
            content += `<div class="ui divider"></div>`;
            
            // Description
            content += `<p>${globalTranslate.fw_LocalNetworkTooltip || 'Specify this option for local networks or VPN where devices connect to MikoPBX directly without NAT. This affects SIP packet processing and allows proper device address detection in the local network.'}</p>`;
            
            // Effect
            content += `<div class="ui divider"></div>`;
            content += `<p><strong>${globalTranslate.fw_Effect || 'Effect'}:</strong></p>`;
            
            if (isChecked) {
                content += `<div class="ui segment">`;
                content += `<ul class="ui list">`;
                content += `<li><i class="check icon"></i> ${globalTranslate.fw_DirectSIPRouting || 'SIP packets will be routed directly without NAT handling'}</li>`;
                content += `<li><i class="check icon"></i> ${globalTranslate.fw_NoContactRewriting || 'Contact headers will not be rewritten'}</li>`;
                content += `<li><i class="check icon"></i> ${globalTranslate.fw_LocalAddressDetection || 'Device addresses will be detected as local'}</li>`;
                content += `</ul>`;
                content += `</div>`;
            } else {
                content += `<p>${globalTranslate.fw_NATHandling || 'Network'} <strong>${network}</strong> ${globalTranslate.fw_WillBeHandledAsExternal || 'will be handled as external network with NAT traversal enabled.'}</p>`;
            }
        }
        
        content += '</div>';
        return content;
    }
};