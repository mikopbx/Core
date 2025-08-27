<?php
return [
    'ak_Title' => 'API ключи',
    'ak_AddNewKey' => 'Добавить новый ключ',
    'ak_AddNewApiKey' => 'Добавить API ключ',
    
    // Columns
    'ak_ColumnName' => 'Название',
    'ak_ColumnKeyId' => 'ID ключа',
    'ak_ColumnCreated' => 'Создан',
    'ak_ColumnLastUsed' => 'Последнее использование',
    'ak_ColumnStatus' => 'Статус',
    'ak_ColumnNetworkFilter' => 'Сетевой фильтр',
    'ak_ColumnDescription' => 'Описание',
    'ak_ColumnRestrictions' => 'Ограничения доступа',
    
    // Form fields
    'ak_Name' => 'Название',
    'ak_NamePlaceholder' => 'например, Интеграция с CRM',
    'ak_Description' => 'Описание',
    'ak_DescriptionPlaceholder' => 'например, Интеграция с CRM системой',
    'ak_NetworkFilter' => 'Сетевой фильтр',
    'ak_NetworkFilterHelp' => 'Ограничить доступ по IP адресам. Если не указано, доступ разрешен со всех IP.',
    'ak_Enabled' => 'Активен',
    'ak_EditApiKey' => 'Редактировать API ключ',
    'ak_NewApiKey' => 'Новый API ключ',
    
    // Tabs
    'ak_TabGeneral' => 'Основные',
    'ak_TabPermissions' => 'Разрешения',
    
    // Permissions
    'ak_ApiPermissions' => 'Права доступа API',
    'ak_ApiEndpoint' => 'API конечная точка',
    'ak_EndpointAccess' => 'Доступ к конечным точкам',
    'ak_Allowed' => 'Разрешено',
    'ak_AllowedEndpoints' => 'Разрешенные конечные точки',
    'ak_AllowedEndpointsHelp' => 'Выберите API endpoints, к которым будет иметь доступ этот ключ. Если не выбрано ни одного, доступ будет ко всем endpoints.',
    'ak_AllControllers' => 'Все контроллеры (без ограничений)',
    'ak_AvailableEndpoints' => 'Доступные конечные точки',
    'ak_FullPermissions' => 'Полные права доступа',
    'ak_FullPermissionsHelp' => 'При включении этой опции API ключ будет иметь доступ ко всем конечным точкам. Отключите для выборочной настройки прав.',
    
    // Messages
    'ak_ApiKeyGenerated' => 'API ключ создан',
    'ak_ApiKeyCreated' => 'API ключ успешно сохранен',
    'ak_ApiKeyWarning' => 'Сохраните этот ключ сейчас! В целях безопасности он больше не будет показан.',
    'ak_ApiKeyWarningCopy' => 'Скопируйте и сохраните этот ключ в безопасном месте. После закрытия этого окна вы больше не сможете его увидеть.',
    'ak_ApiKeyWillBeGenerated' => 'API ключ будет сгенерирован автоматически при сохранении.',
    'ak_YourApiKey' => 'Ваш API ключ',
    'ak_ApiKey' => 'API ключ',
    'ak_ApiKeyCopySuccess' => 'API ключ скопирован в буфер обмена',
    'ak_ShowHideApiKey' => 'Показать/скрыть API ключ',
    'ak_RegenerateApiKey' => 'Сгенерировать новый ключ',
    'ak_CopyApiKey' => 'Скопировать ключ в буфер',
    'ak_KeyHidden' => 'Ключ скрыт в целях безопасности',
    'ak_ExistingApiKeyInfo' => 'Для безопасности существующие ключи скрыты. Используйте регенерацию для создания нового ключа.',
    'ak_FullPermissionsWarningTitle' => 'Внимание: Полный доступ к системе!',
    'ak_FullPermissionsWarningText' => 'Этот API ключ получит полный доступ ко всем функциям системы, включая управление пользователями, настройки безопасности, резервное копирование и другие критичные операции. Используйте с осторожностью.',
    'ak_ApiKeyRevoke' => 'Отозвать ключ',
    'ak_ApiKeyRevokeConfirm' => 'Вы уверены, что хотите отозвать этот API ключ? Это действие нельзя отменить.',
    'ak_ApiKeyRevoked' => 'API ключ отозван',
    
    // Status
    'ak_StatusEnabled' => 'Активен',
    'ak_StatusDisabled' => 'Отключен',
    'ak_NeverUsed' => 'Не использовался',
    
    // Validation
    'ak_ValidateNameEmpty' => 'Название не может быть пустым',
    
    // Breadcrumb
    'ak_BreadcrumbApiKeys' => 'API ключи',
    'ak_BreadcrumbCreate' => 'Создать',
    'ak_BreadcrumbModify' => 'Редактировать',
    
    // API Endpoints descriptions
    'ak_EndpointExtensions' => 'Управление внутренними номерами',
    'ak_EndpointSipProviders' => 'SIP провайдеры и транки',
    'ak_EndpointCallQueues' => 'Управление очередями вызовов',
    'ak_EndpointIvrMenu' => 'Управление IVR меню',
    'ak_EndpointConferenceRooms' => 'Конференц-комнаты',
    'ak_EndpointIncomingRoutes' => 'Маршрутизация входящих вызовов',
    'ak_EndpointOutgoingRoutes' => 'Маршрутизация исходящих вызовов',
    'ak_EndpointSystem' => 'Системные операции',
    'ak_EndpointFiles' => 'Управление файлами',
    'ak_EndpointCdr' => 'История вызовов (CDR)',
    'ak_EndpointApiKeys' => 'Управление API ключами',
    'ak_EndpointFirewall' => 'Брандмауэр и безопасность',
    'ak_EndpointStorage' => 'Управление хранилищем',
    'ak_EndpointSyslog' => 'Системные логи',
    'ak_EndpointModules' => 'Управление модулями',
    'ak_EndpointLicense' => 'Операции с лицензией',
    'ak_EndpointDialplanApplications' => 'Приложения диалплана',
    'ak_EndpointAsteriskManagers' => 'AMI менеджеры',
    'ak_EndpointCustomFiles' => 'Пользовательские файлы',
    'ak_EndpointNetworkFilters' => 'Сетевые фильтры',
    'ak_EndpointTimeSettings' => 'Настройки времени',
    'ak_EndpointSoundFiles' => 'Звуковые файлы',
    'ak_EndpointPjSip' => 'PJSIP настройки',
    'ak_EndpointIaxProviders' => 'IAX провайдеры',
    'ak_EndpointBackup' => 'Резервное копирование',
    'ak_EndpointAdvices' => 'Советы и рекомендации',
    
    // Additional missing endpoints
    'ak_EndpointAdvice' => 'Советы системы',
    'ak_EndpointGeneralSettings' => 'Общие настройки',
    'ak_EndpointIax' => 'IAX настройки',
    'ak_EndpointOutboundRoutes' => 'Маршрутизация исходящих вызовов',
    'ak_EndpointOutWorkTimes' => 'Нерабочее время',
    'ak_EndpointPasswords' => 'Управление паролями',
    'ak_EndpointProviders' => 'Провайдеры связи',
    'ak_EndpointSip' => 'SIP настройки',
    'ak_EndpointSysinfo' => 'Информация о системе',
    
    // Table display
    'ak_NetworkRestricted' => 'IP ограничен',
    'ak_Endpoints' => 'эндпоинтов',
];