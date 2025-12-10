<?php
/**
 * Console menu translations (English)
 * Translations for SSH console menu of MikoPBX
 */

return [
    // Menu titles and actions
    'cm_ChooseAction' => 'Choose action',
    'cm_Cancel' => 'Cancel',
    'cm_PbxConsoleSetup' => 'PBX console setup',
    'cm_ChooseShellLanguage' => 'Choose shell language',

    // Network configuration menu items
    'cm_QuickSetupWizard' => 'Quick Setup Wizard',
    'cm_ConfiguringUsingDHCP' => 'Configuring using DHCP',
    'cm_ManualSetting' => 'Manual setting',
    'cm_SetInternetInterface' => 'Set internet interface',
    'cm_SetupLanIpAddress' => 'Set up LAN IP address',

    // Network configuration prompts
    'cm_EnterInterfaceName' => 'Enter interface name... %interfaces%: ',
    'cm_EnterNewLanIpAddress' => 'Enter the new LAN IP address: ',
    'cm_EnterLanGatewayIp' => 'Enter the LAN gateway IP address: ',
    'cm_EnterLanDnsIp' => 'Enter the LAN DNS IP address: ',
    'cm_EnterHostnameOrIp' => 'Enter a host name or IP address: (Press ESC to exit)',

    // Network configuration messages
    'cm_LanWillBeConfiguredDhcp' => 'The LAN interface will now be configured via DHCP...',
    'cm_LanWillBeConfigured' => 'The LAN interface will now be configured ...',
    'cm_ConfiguringIpv4Address' => 'Configuring IPv4 address...',
    'cm_ConfiguringIpv6Address' => 'Configuring IPv6 address...',
    'cm_InterfaceNotFound' => 'Interface not found',

    // Subnet mask help
    'cm_SubnetMaskHelp' => 'Subnet masks are to be entered as bit counts (as in CIDR notation).',
    'cm_SubnetMaskRangeHelp' => 'IPv4: 1-32 (e.g., 24 = 255.255.255.0), IPv6: 1-128 (e.g., 64)',
    'cm_SubnetValidationFailed' => 'e.g. IPv4: 32 = 255.255.255.255, 24 = 255.255.255.0; IPv6: 64, 128',

    // System actions
    'cm_RebootSystem' => 'Reboot system',
    'cm_Reboot' => 'Reboot',
    'cm_PowerOff' => 'Power off',
    'cm_PingHost' => 'Ping host',
    'cm_Console' => 'Console',
    'cm_ChangeLanguage' => 'Change language',

    // Firewall
    'cm_Firewall' => 'Firewall',
    'cm_FirewallDisabled' => 'Firewall disabled',
    'cm_DoYouWantFirewallAction' => 'Do you want to %action% firewall now? (y/n): ',

    // HTTP Redirect
    'cm_HttpRedirect' => 'HTTP to HTTPS redirect',
    'cm_HttpRedirectEnabled' => 'enabled',
    'cm_HttpRedirectDisabled' => 'disabled',
    'cm_DoYouWantHttpRedirectAction' => 'Do you want to %action% HTTP redirect now? (y/n): ',

    // Storage
    'cm_Storage' => 'Storage',
    'cm_ConnectStorage' => 'Connect storage',
    'cm_CheckStorage' => 'Check storage',
    'cm_ResizeStorage' => 'Resize storage',
    'cm_StorageUnmounted' => 'Storage unmounted',
    'cm_ValidDisksNotFound' => 'Valid disks not found...',
    'cm_AllProcessesWillBeCompleted' => 'All processes will be completed. Continue? (y/n):',

    // Installation
    'cm_InstallOnHardDrive' => 'Install on Hard Drive',
    'cm_InstallOrRecover' => 'Install or recover',

    // Password reset
    'cm_ResetAdminPassword' => 'Reset admin password',
    'cm_DoYouWantResetPassword' => 'Do you want reset password? (y/n):',
    'cm_PasswordSuccessfullyReset' => 'Password successfully reset. New login: %login%. New password: %password%.',

    // System status messages
    'cm_PbxLiveModeWarning' => 'PBX is running in Live or Recovery mode',
    'cm_SystemIntegrityBroken' => 'The integrity of the system is broken',
    'cm_ThisIs' => 'this is',
    'cm_WebInterfaceUrl' => 'Web Interface',

    // Common validation
    'cm_Warning' => 'WARNING',
    'cm_WarningYesNo' => 'WARNING: y/n',

    // Wizard prompts
    'cm_SelectInterface' => 'Select network interface:',
    'cm_CurrentInterface' => 'Current interface: %interface%',
    'cm_KeepCurrent' => 'Keep current',
    'cm_GoBack' => 'Go back',
    'cm_Disable' => 'Disable',

    // IPv4 configuration
    'cm_IPv4ConfigMode' => 'IPv4 Configuration Mode:',
    'cm_IPv4DHCP' => 'DHCP (automatic)',
    'cm_IPv4Static' => 'Static (manual)',
    'cm_IPv4Disabled' => 'Disabled',
    'cm_IPv4KeepCurrent' => 'Keep current IPv4 settings',
    'cm_EnterIPv4Address' => 'Enter IPv4 address: ',
    'cm_EnterIPv4Subnet' => 'Enter IPv4 subnet mask (CIDR bits, 1-32): ',
    'cm_EnterIPv4Gateway' => 'Enter IPv4 gateway: ',

    // IPv6 configuration
    'cm_IPv6ConfigMode' => 'IPv6 Configuration Mode:',
    'cm_IPv6Auto' => 'Auto (SLAAC/DHCPv6)',
    'cm_IPv6Manual' => 'Manual (static)',
    'cm_IPv6Disabled' => 'Disabled',
    'cm_IPv6KeepCurrent' => 'Keep current IPv6 settings',
    'cm_EnterIPv6Address' => 'Enter IPv6 address: ',
    'cm_EnterIPv6Subnet' => 'Enter IPv6 prefix length (CIDR bits, 1-128): ',
    'cm_EnterIPv6Gateway' => 'Enter IPv6 gateway: ',

    // DNS configuration
    'cm_IsInternetInterface' => 'Is this the internet interface? (y/n): ',
    'cm_ConfigureDNS' => 'Configure DNS servers',
    'cm_EnterPrimaryDNS' => 'Enter primary DNS server (IPv4 or IPv6): ',
    'cm_EnterSecondaryDNS' => 'Enter secondary DNS server (optional, press Enter to skip): ',
    'cm_EnterPrimaryDNS6' => 'Enter primary IPv6 DNS server (optional, press Enter to skip): ',
    'cm_EnterSecondaryDNS6' => 'Enter secondary IPv6 DNS server (optional, press Enter to skip): ',

    // Review and confirmation
    'cm_ReviewConfiguration' => 'Review your configuration:',
    'cm_ApplyConfiguration' => 'Apply configuration',
    'cm_EditConfiguration' => 'Edit (go back)',
    'cm_ConfigurationSaved' => 'Configuration saved. Network changes will be applied automatically...',
    'cm_WizardCancelled' => 'Wizard cancelled. No changes were made.',

    // Validation errors
    'cm_InvalidIPv6Address' => 'Invalid IPv6 address',
    'cm_InvalidIPv6Gateway' => 'Invalid IPv6 gateway',

    // New modular menu system (ESXi-style)
    'cm_Settings' => 'Settings',
    'cm_MonitoringAndDiagnostics' => 'Monitoring and Diagnostics',
    'cm_NetworkAndConnection' => 'Network and Connection',
    'cm_System' => 'System',
    'cm_Services' => 'Services',

    // Network info display
    'cm_NetworkInformation' => 'Network Information',
    'cm_CurrentNetworkConfiguration' => 'Current Network Configuration',
    'cm_ConfigureInterfaces' => 'Configure network interfaces',
    'cm_ShowNetworkInfo' => 'Show network information',
    'cm_Mtr' => 'MTR (network diagnostics)',
    'cm_MtrSelectHost' => 'Select host for MTR',
    'cm_MtrGateway' => 'Gateway',
    'cm_MtrCustomHost' => 'Enter custom address',
    'cm_NoInterfacesConfigured' => 'No network interfaces configured',
    'cm_NotConfigured' => 'Not configured',
    'cm_RoutingTables' => 'Routing tables',
    'cm_DnsServers' => 'DNS servers',

    // Log viewing
    'cm_ViewLogs' => 'View logs',
    'cm_SelectLogMode' => 'Select viewing mode',
    'cm_SelectLogAndMode' => 'Select log and viewing mode',
    'cm_LogSystem' => 'System log',
    'cm_LogAsterisk' => 'Asterisk log',
    'cm_LogPHP' => 'PHP log',
    'cm_LogNginx' => 'Nginx log',
    'cm_LogFail2ban' => 'Fail2ban log',
    'cm_LogFileNotFound' => 'Log file not found',

    // vi commands help
    'cm_ViGoEnd' => 'go to end',
    'cm_ViExit' => 'exit',
    'cm_ViReload' => 'reload',

    // Asterisk diagnostics
    'cm_AsteriskDiagnostics' => 'Asterisk Diagnostics',
    'cm_Sngrep' => 'Sngrep (SIP packet capture)',
    'cm_AsteriskCLI' => 'Asterisk console (asterisk -r)',
    'cm_ActiveChannels' => 'Active channels',
    'cm_PjsipEndpoints' => 'PJSIP endpoints',
    'cm_PjsipRegistrations' => 'PJSIP registrations (providers)',

    // File manager and utilities
    'cm_FileManager' => 'File manager (mc)',

    // Banner display
    'cm_PbxName' => 'PBX Name',
    'cm_PbxDescription' => 'Description',
    'cm_Uptime' => 'Uptime',
    'cm_PressAnyKey' => 'Press any key...',
    'cm_BackToBanner' => 'Back to status screen',
    'cm_PressEnterToContinue' => 'Press Enter to continue...',
    'cm_RestartingWizard' => 'Restarting setup wizard...',
];
