<?php
/**
 * Console menu translations (Russian)
 * Переводы для SSH консольного меню MikoPBX
 */

return [
    // Menu titles and actions
    'cm_ChooseAction' => 'Выберите действие',
    'cm_Cancel' => 'Отмена',
    'cm_PbxConsoleSetup' => 'Консольная настройка PBX',
    'cm_ChooseShellLanguage' => 'Выберите язык оболочки',

    // Network configuration menu items
    'cm_QuickSetupWizard' => 'Быстрая настройка (мастер)',
    'cm_ConfiguringUsingDHCP' => 'Настройка через DHCP',
    'cm_ManualSetting' => 'Ручная настройка',
    'cm_SetInternetInterface' => 'Установить интернет-интерфейс',
    'cm_SetupLanIpAddress' => 'Настроить IP адрес LAN',

    // Network configuration prompts
    'cm_EnterInterfaceName' => 'Введите имя интерфейса... %interfaces%: ',
    'cm_EnterNewLanIpAddress' => 'Введите новый IP адрес LAN: ',
    'cm_EnterLanGatewayIp' => 'Введите IP адрес шлюза LAN: ',
    'cm_EnterLanDnsIp' => 'Введите IP адрес DNS LAN: ',
    'cm_EnterHostnameOrIp' => 'Введите имя хоста или IP адрес: (ESC для выхода)',

    // Network configuration messages
    'cm_LanWillBeConfiguredDhcp' => 'Интерфейс LAN будет настроен через DHCP...',
    'cm_LanWillBeConfigured' => 'Интерфейс LAN будет настроен ...',
    'cm_ConfiguringIpv4Address' => 'Настройка IPv4 адреса...',
    'cm_ConfiguringIpv6Address' => 'Настройка IPv6 адреса...',
    'cm_InterfaceNotFound' => 'Интерфейс не найден',

    // Subnet mask help
    'cm_SubnetMaskHelp' => 'Маски подсети вводятся в виде количества бит (как в нотации CIDR).',
    'cm_SubnetMaskRangeHelp' => 'IPv4: 1-32 (например, 24 = 255.255.255.0), IPv6: 1-128 (например, 64)',
    'cm_SubnetValidationFailed' => 'например IPv4: 32 = 255.255.255.255, 24 = 255.255.255.0; IPv6: 64, 128',

    // System actions
    'cm_RebootSystem' => 'Перезагрузка системы',
    'cm_Reboot' => 'Перезагрузка',
    'cm_PowerOff' => 'Выключение',
    'cm_PingHost' => 'Пинг хоста',
    'cm_Console' => 'Консоль',
    'cm_ChangeLanguage' => 'Изменить язык',

    // Firewall
    'cm_Firewall' => 'Межсетевой экран',
    'cm_FirewallDisabled' => 'Межсетевой экран отключен',
    'cm_DoYouWantFirewallAction' => 'Вы хотите %action% межсетевой экран? (y/n): ',

    // HTTP Redirect
    'cm_HttpRedirect' => 'Редирект HTTP на HTTPS',
    'cm_HttpRedirectEnabled' => 'включен',
    'cm_HttpRedirectDisabled' => 'отключен',
    'cm_DoYouWantHttpRedirectAction' => 'Вы хотите %action% редирект HTTP? (y/n): ',

    // Storage
    'cm_Storage' => 'Хранилище',
    'cm_ConnectStorage' => 'Подключить хранилище',
    'cm_CheckStorage' => 'Проверить хранилище',
    'cm_ResizeStorage' => 'Изменить размер хранилища',
    'cm_StorageUnmounted' => 'Хранилище не смонтировано',
    'cm_ValidDisksNotFound' => 'Подходящие диски не найдены...',
    'cm_AllProcessesWillBeCompleted' => 'Все процессы будут завершены. Продолжить? (y/n):',

    // Installation
    'cm_InstallOnHardDrive' => 'Установить на жесткий диск',
    'cm_InstallOrRecover' => 'Установка или восстановление',

    // Password reset
    'cm_ResetAdminPassword' => 'Сбросить пароль администратора',
    'cm_DoYouWantResetPassword' => 'Вы хотите сбросить пароль? (y/n):',
    'cm_PasswordSuccessfullyReset' => 'Пароль успешно сброшен. Новый логин: %login%. Новый пароль: %password%.',

    // System status messages
    'cm_PbxLiveModeWarning' => 'PBX работает в режиме Live или восстановления',
    'cm_SystemIntegrityBroken' => 'Целостность системы нарушена',
    'cm_ThisIs' => 'это',
    'cm_WebInterfaceUrl' => 'Веб-интерфейс',

    // Common validation
    'cm_Warning' => 'ВНИМАНИЕ',
    'cm_WarningYesNo' => 'ВНИМАНИЕ: y/n',

    // Wizard prompts
    'cm_SelectInterface' => 'Выберите сетевой интерфейс:',
    'cm_CurrentInterface' => 'Текущий интерфейс: %interface%',
    'cm_KeepCurrent' => 'Оставить текущие',
    'cm_GoBack' => 'Назад',
    'cm_Disable' => 'Отключить',

    // IPv4 configuration
    'cm_IPv4ConfigMode' => 'Режим настройки IPv4:',
    'cm_IPv4DHCP' => 'DHCP (автоматически)',
    'cm_IPv4Static' => 'Статический (вручную)',
    'cm_IPv4Disabled' => 'Отключен',
    'cm_IPv4KeepCurrent' => 'Оставить текущие настройки IPv4',
    'cm_EnterIPv4Address' => 'Введите IPv4 адрес: ',
    'cm_EnterIPv4Subnet' => 'Введите маску подсети IPv4 (биты CIDR, 1-32): ',
    'cm_EnterIPv4Gateway' => 'Введите IPv4 шлюз: ',

    // IPv6 configuration
    'cm_IPv6ConfigMode' => 'Режим настройки IPv6:',
    'cm_IPv6Auto' => 'Авто (SLAAC/DHCPv6)',
    'cm_IPv6Manual' => 'Вручную (статический)',
    'cm_IPv6Disabled' => 'Отключен',
    'cm_IPv6KeepCurrent' => 'Оставить текущие настройки IPv6',
    'cm_EnterIPv6Address' => 'Введите IPv6 адрес: ',
    'cm_EnterIPv6Subnet' => 'Введите длину префикса IPv6 (биты CIDR, 1-128): ',
    'cm_EnterIPv6Gateway' => 'Введите IPv6 шлюз: ',

    // DNS configuration
    'cm_IsInternetInterface' => 'Это интернет-интерфейс? (y/n): ',
    'cm_ConfigureDNS' => 'Настроить DNS серверы',
    'cm_EnterPrimaryDNS' => 'Введите основной DNS сервер (IPv4 или IPv6): ',
    'cm_EnterSecondaryDNS' => 'Введите дополнительный DNS сервер (необязательно, Enter чтобы пропустить): ',
    'cm_EnterPrimaryDNS6' => 'Введите основной IPv6 DNS сервер (необязательно, Enter чтобы пропустить): ',
    'cm_EnterSecondaryDNS6' => 'Введите дополнительный IPv6 DNS сервер (необязательно, Enter чтобы пропустить): ',

    // Review and confirmation
    'cm_ReviewConfiguration' => 'Проверьте конфигурацию:',
    'cm_ApplyConfiguration' => 'Применить конфигурацию',
    'cm_EditConfiguration' => 'Редактировать (назад)',
    'cm_ConfigurationSaved' => 'Конфигурация сохранена. Изменения сети будут применены автоматически...',
    'cm_WizardCancelled' => 'Мастер отменён. Изменения не были внесены.',

    // Validation errors
    'cm_InvalidIPv6Address' => 'Неверный IPv6 адрес',
    'cm_InvalidIPv6Gateway' => 'Неверный IPv6 шлюз',

    // New modular menu system (ESXi-style)
    'cm_Settings' => 'Настройки',
    'cm_MonitoringAndDiagnostics' => 'Мониторинг и диагностика',
    'cm_NetworkAndConnection' => 'Сеть и подключение',
    'cm_System' => 'Система',
    'cm_Services' => 'Службы',

    // Network info display
    'cm_NetworkInformation' => 'Информация о сети',
    'cm_CurrentNetworkConfiguration' => 'Текущая конфигурация сети',
    'cm_ConfigureInterfaces' => 'Настроить сетевые интерфейсы',
    'cm_ShowNetworkInfo' => 'Показать информацию о сети',
    'cm_Mtr' => 'MTR (диагностика сети)',
    'cm_MtrSelectHost' => 'Выберите хост для MTR',
    'cm_MtrGateway' => 'Шлюз',
    'cm_MtrCustomHost' => 'Ввести свой адрес',
    'cm_NoInterfacesConfigured' => 'Сетевые интерфейсы не настроены',
    'cm_NotConfigured' => 'Не настроено',
    'cm_RoutingTables' => 'Таблицы маршрутизации',
    'cm_DnsServers' => 'DNS серверы',

    // Log viewing
    'cm_ViewLogs' => 'Просмотр логов',
    'cm_SelectLogMode' => 'Выбрать режим просмотра',
    'cm_SelectLogAndMode' => 'Выбрать лог и режим просмотра',
    'cm_LogSystem' => 'Системный лог',
    'cm_LogAsterisk' => 'Лог Asterisk',
    'cm_LogPHP' => 'Лог PHP',
    'cm_LogNginx' => 'Лог Nginx',
    'cm_LogFail2ban' => 'Лог Fail2ban',
    'cm_LogFileNotFound' => 'Файл лога не найден',

    // vi commands help
    'cm_ViGoEnd' => 'в конец',
    'cm_ViExit' => 'выход',
    'cm_ViReload' => 'обновить',

    // Asterisk diagnostics
    'cm_AsteriskDiagnostics' => 'Диагностика Asterisk',
    'cm_Sngrep' => 'Sngrep (захват SIP пакетов)',
    'cm_AsteriskCLI' => 'Консоль Asterisk (asterisk -r)',
    'cm_ActiveChannels' => 'Активные каналы',
    'cm_PjsipEndpoints' => 'PJSIP конечные точки',
    'cm_PjsipRegistrations' => 'Регистрации провайдеров',

    // File manager and utilities
    'cm_FileManager' => 'Файловый менеджер (mc)',

    // Banner display
    'cm_PbxName' => 'Имя PBX',
    'cm_PbxDescription' => 'Описание',
    'cm_Uptime' => 'Время работы',
    'cm_PressAnyKey' => 'Нажмите любую клавишу...',
    'cm_BackToBanner' => 'Вернуться к экрану статуса',
    'cm_PressEnterToContinue' => 'Нажмите Enter для продолжения...',
    'cm_RestartingWizard' => 'Перезапуск мастера настройки...',
];
