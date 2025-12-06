<?php
return [
    'cm_InterfaceNotFound' => 'Interface niet gevonden',
    'cm_ConfiguringIpv4Address' => 'IPv4-adres configureren...',
    // Installation
    'cm_InstallOnHardDrive' => 'Installeren op harde schijf',
    'cm_Cancel' => 'Annuleren',
    'cm_EnterIPv6Address' => 'Voer het IPv6-adres in: ',
    // Subnet mask help
    'cm_SubnetMaskHelp' => 'Subnetmaskers worden ingevoerd als een aantal bits (volgens CIDR-notatie).',
    'cm_EnterIPv4Gateway' => 'Voer IPv4-gateway in: ',
    // Common validation
    'cm_Warning' => 'AANDACHT',
    'cm_ValidDisksNotFound' => 'Geen overeenkomende schijven gevonden...',
    'cm_ResizeStorage' => 'Opslaggrootte wijzigen',
    'cm_LanWillBeConfigured' => 'De LAN-interface wordt geconfigureerd...',
    'cm_Console' => 'Troosten',
    'cm_EnterPrimaryDNS6' => 'Voer de primaire IPv6 DNS-server in (optioneel, druk op Enter om dit over te slaan): ',
    'cm_ChangeLanguage' => 'Taal wijzigen',
    'cm_EnterIPv4Address' => 'Voer IPv4-adres in: ',
    'cm_ConfigurationSaved' => 'De configuratie is opgeslagen. Netwerkwijzigingen worden automatisch toegepast.',
    // Storage
    'cm_Storage' => 'Opslag',
    'cm_SubnetValidationFailed' => 'bijvoorbeeld IPv4: 32 = 255.255.255.255, 24 = 255.255.255.0; IPv6: 64, 128',
    'cm_SystemIntegrityBroken' => 'De integriteit van het systeem is in gevaar',
    // Wizard prompts
    'cm_SelectInterface' => 'Selecteer netwerkinterface',
    // Network configuration prompts
    'cm_EnterInterfaceName' => 'Voer interfacenaam in... %interfaces%: ',
    'cm_IPv4DHCP' => 'DHCP (automatisch)',
    'cm_IPv6Disabled' => 'Uitgeschakeld',
    'cm_EnterLanDnsIp' => 'Voer het DNS LAN IP-adres in: ',
    'cm_IPv6Manual' => 'Handmatig (statisch)',
    'cm_InstallOrRecover' => 'Installatie of restauratie',
    // Password reset
    'cm_ResetAdminPassword' => 'Beheerderswachtwoord opnieuw instellen',
    'cm_ApplyConfiguration' => 'Configuratie toepassen',
    'cm_EditConfiguration' => 'Bewerken (terug)',
    // Network configuration menu items
    'cm_QuickSetupWizard' => 'Snelle installatie (wizard)',
    'cm_EnterPrimaryDNS' => 'Voer de primaire DNS-server in (IPv4 of IPv6): ',
    'cm_PbxConsoleSetup' => 'PBX-consoleconfiguratie',
    'cm_ConfigureDNS' => 'DNS-servers configureren',
    'cm_IPv4KeepCurrent' => 'Laat de huidige IPv4-instellingen staan',
    'cm_SetInternetInterface' => 'Installeer de internetinterface',
    'cm_CurrentInterface' => 'Huidige interface: %interface%',
    'cm_FirewallDisabled' => 'De firewall is uitgeschakeld',
    'cm_EnterLanGatewayIp' => 'Voer het IP-adres van de LAN-gateway in: ',
    'cm_KeepCurrent' => 'Laat de huidige',
    'cm_PasswordSuccessfullyReset' => 'Wachtwoord succesvol gereset. Nieuwe login: %login%. Nieuw wachtwoord: %password%.',
    'cm_ConfiguringUsingDHCP' => 'Configuratie via DHCP',
    'cm_IPv4Static' => 'Statisch (handmatig)',
    'cm_ManualSetting' => 'Handmatige instelling',
    'cm_IPv6Auto' => 'Automatisch (SLAAC/DHCPv6)',
    // IPv6 configuration
    'cm_IPv6ConfigMode' => 'IPv6-configuratiemodus:',
    'cm_EnterIPv4Subnet' => 'Voer het IPv4-subnetmasker in (CIDR-bits, 1-32): ',
    // Firewall
    'cm_Firewall' => 'Firewall',
    // Validation errors
    'cm_InvalidIPv6Address' => 'Ongeldig IPv6-adres',
    // DNS configuration
    'cm_IsInternetInterface' => 'Is dit een webinterface? (j/n): ',
    'cm_IPv6KeepCurrent' => 'Laat de huidige IPv6-instellingen staan',
    'cm_DoYouWantResetPassword' => 'Wilt u uw wachtwoord opnieuw instellen? (j/n):',
    'cm_EnterSecondaryDNS6' => 'Voer een extra IPv6 DNS-server in (optioneel, druk op Enter om dit over te slaan): ',
    'cm_PingHost' => 'Hostping',
    'cm_EnterNewLanIpAddress' => 'Voer het nieuwe LAN IP-adres in: ',
    'cm_InvalidIPv6Gateway' => 'Ongeldige IPv6-gateway',
    // System status messages
    'cm_PbxLiveModeWarning' => 'PBX draait in de Live- of Herstelmodus',
    // System actions
    'cm_RebootSystem' => 'Systeem opnieuw opstarten',
    'cm_DoYouWantFirewallAction' => 'Wilt u %action% firewall? (j/n): ',
    'cm_Reboot' => 'Opnieuw opstarten',
    'cm_CheckStorage' => 'Controleer opslag',
    'cm_WebInterfaceUrl' => 'Webinterface',
    'cm_EnterHostnameOrIp' => 'Voer de hostnaam of het IP-adres in: (ESC om af te sluiten)',
    'cm_WizardCancelled' => 'De wizard is geannuleerd. Er zijn geen wijzigingen aangebracht.',
    'cm_ConnectStorage' => 'Opslag aansluiten',
    'cm_SetupLanIpAddress' => 'LAN IP-adres configureren',
    'cm_GoBack' => 'Rug',
    'cm_EnterIPv6Gateway' => 'Voer IPv6-gateway in: ',
    'cm_StorageUnmounted' => 'De opslag is niet gemonteerd',
    'cm_SubnetMaskRangeHelp' => 'IPv4: 1-32 (bijvoorbeeld 24 = 255.255.255.0), IPv6: 1-128 (bijvoorbeeld 64)',
    'cm_Disable' => 'Uitzetten',
    /**
 * Console menu translations (Russian)
 * Переводы для SSH консольного меню MikoPBX
 */
    // Menu titles and actions
    'cm_ChooseAction' => 'Kies een actie',
    'cm_IPv4Disabled' => 'Uitgeschakeld',
    'cm_EnterIPv6Subnet' => 'Voer de IPv6-prefixlengte in (CIDR-bits, 1-128): ',
    'cm_ConfiguringIpv6Address' => 'IPv6-adres configureren...',
    // IPv4 configuration
    'cm_IPv4ConfigMode' => 'IPv4-configuratiemodus:',
    // Review and confirmation
    'cm_ReviewConfiguration' => 'Controleer de configuratie:',
    'cm_EnterSecondaryDNS' => 'Voer een secundaire DNS-server in (optioneel, druk op Enter om dit over te slaan): ',
    // Network configuration messages
    'cm_LanWillBeConfiguredDhcp' => 'De LAN-interface wordt geconfigureerd via DHCP...',
    'cm_WarningYesNo' => 'LET OP: j/n',
    'cm_PowerOff' => 'Uitschakeling',
    'cm_ChooseShellLanguage' => 'Selecteer shelltaal',
    'cm_ThisIs' => 'Dit',
    'cm_AllProcessesWillBeCompleted' => 'Alle processen worden afgerond. Doorgaan? (j/n):',
];
