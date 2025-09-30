<?php
/**
 * REST API translations for OpenAPI documentation
 * These translations are used in REST API controllers and OpenAPI specification generation
 */

return [
    // ============================================================================
    // Resource Names (for placeholder replacement in response messages)
    // ============================================================================
    'Call Queues' => 'Очередь',
    'Asterisk Managers' => 'AMI пользователь',
    'General Settings' => 'Настройка',
    'Mail Settings' => 'Настройка почты',

    // ============================================================================
    // CallQueues REST API
    // ============================================================================
    'rest_cq_GetList' => 'Получить список очередей',
    'rest_cq_GetListDesc' => 'Получить постраничный список всех очередей вызовов с возможностью фильтрации по стратегии, поиску и сортировке',
    'rest_cq_GetRecord' => 'Получить очередь по ID',
    'rest_cq_GetRecordDesc' => 'Получить детальную информацию об очереди включая все параметры конфигурации и список участников',
    'rest_cq_Create' => 'Создать новую очередь',
    'rest_cq_CreateDesc' => 'Создать новую очередь вызовов с заданными параметрами конфигурации',
    'rest_cq_Update' => 'Обновить очередь',
    'rest_cq_UpdateDesc' => 'Полностью заменить все параметры существующей очереди вызовов',
    'rest_cq_Patch' => 'Частично обновить очередь',
    'rest_cq_PatchDesc' => 'Обновить только указанные параметры очереди вызовов',
    'rest_cq_Delete' => 'Удалить очередь',
    'rest_cq_DeleteDesc' => 'Удалить очередь вызовов по идентификатору',
    'rest_cq_GetDefault' => 'Получить значения по умолчанию',
    'rest_cq_GetDefaultDesc' => 'Получить значения по умолчанию для создания новой очереди вызовов',
    'rest_cq_Copy' => 'Копировать очередь',
    'rest_cq_CopyDesc' => 'Создать копию существующей очереди вызовов с новым номером добавочного',

    // ============================================================================
    // ApiKeys REST API
    // ============================================================================
    'rest_ak_GetList' => 'Получить список API ключей',
    'rest_ak_GetListDesc' => 'Получить постраничный список всех API ключей с возможностью фильтрации и сортировки',
    'rest_ak_GetRecord' => 'Получить API ключ по ID',
    'rest_ak_GetRecordDesc' => 'Получить детальную информацию об API ключе включая разрешения и ограничения',
    'rest_ak_Create' => 'Создать новый API ключ',
    'rest_ak_CreateDesc' => 'Создать новый API ключ с заданными разрешениями и ограничениями',
    'rest_ak_Update' => 'Обновить API ключ',
    'rest_ak_UpdateDesc' => 'Полностью заменить все параметры существующего API ключа',
    'rest_ak_Patch' => 'Частично обновить API ключ',
    'rest_ak_PatchDesc' => 'Обновить только указанные параметры API ключа',
    'rest_ak_Delete' => 'Удалить API ключ',
    'rest_ak_DeleteDesc' => 'Удалить API ключ по идентификатору',
    'rest_ak_GetDefault' => 'Получить значения по умолчанию',
    'rest_ak_GetDefaultDesc' => 'Получить значения по умолчанию для создания нового API ключа',
    'rest_ak_GetAvailableControllers' => 'Получить список доступных контроллеров',
    'rest_ak_GetAvailableControllersDesc' => 'Получить список всех доступных API контроллеров и их endpoints для настройки разрешений',
    'rest_ak_GenerateKey' => 'Сгенерировать новый ключ',
    'rest_ak_GenerateKeyDesc' => 'Сгенерировать новый случайный API ключ',

    // ============================================================================
    // AsteriskManagers REST API
    // ============================================================================
    'rest_am_GetList' => 'Получить список AMI пользователей',
    'rest_am_GetListDesc' => 'Получить постраничный список всех пользователей Asterisk Manager Interface',
    'rest_am_GetRecord' => 'Получить AMI пользователя по ID',
    'rest_am_GetRecordDesc' => 'Получить детальную информацию о пользователе Asterisk Manager Interface',
    'rest_am_Create' => 'Создать нового AMI пользователя',
    'rest_am_CreateDesc' => 'Создать нового пользователя Asterisk Manager Interface с заданными правами доступа',
    'rest_am_Update' => 'Обновить AMI пользователя',
    'rest_am_UpdateDesc' => 'Полностью заменить все параметры существующего AMI пользователя',
    'rest_am_Patch' => 'Частично обновить AMI пользователя',
    'rest_am_PatchDesc' => 'Обновить только указанные параметры AMI пользователя',
    'rest_am_Delete' => 'Удалить AMI пользователя',
    'rest_am_DeleteDesc' => 'Удалить пользователя Asterisk Manager Interface',
    'rest_am_GetDefault' => 'Получить значения по умолчанию',
    'rest_am_GetDefaultDesc' => 'Получить значения по умолчанию для создания нового AMI пользователя',

    // ============================================================================
    // MailSettings REST API
    // ============================================================================
    'rest_ms_GetRecord' => 'Получить настройки почты',
    'rest_ms_GetRecordDesc' => 'Получить текущие настройки почтового сервера',
    'rest_ms_Update' => 'Обновить настройки почты',
    'rest_ms_UpdateDesc' => 'Обновить настройки почтового сервера',
    'rest_ms_Patch' => 'Частично обновить настройки почты',
    'rest_ms_PatchDesc' => 'Обновить только указанные параметры почтового сервера',
    'rest_ms_TestConnection' => 'Проверить подключение',
    'rest_ms_TestConnectionDesc' => 'Проверить подключение к почтовому серверу с текущими настройками',
    'rest_ms_GetDiagnostics' => 'Получить диагностику',
    'rest_ms_GetDiagnosticsDesc' => 'Получить детальную диагностическую информацию о почтовых настройках',
    'rest_ms_SendTestEmail' => 'Отправить тестовое письмо',
    'rest_ms_SendTestEmailDesc' => 'Отправить тестовое письмо на указанный адрес для проверки настроек',
    'rest_ms_GetDefault' => 'Получить значения по умолчанию',
    'rest_ms_GetDefaultDesc' => 'Получить значения по умолчанию для настройки почтового сервера',

    // ============================================================================
    // GeneralSettings REST API
    // ============================================================================
    'rest_gs_GetRecord' => 'Получить общие настройки',
    'rest_gs_GetRecordDesc' => 'Получить текущие общие настройки системы',
    'rest_gs_Update' => 'Обновить общие настройки',
    'rest_gs_UpdateDesc' => 'Обновить общие настройки системы',
    'rest_gs_Patch' => 'Частично обновить общие настройки',
    'rest_gs_PatchDesc' => 'Обновить только указанные параметры общих настроек',

    // ============================================================================
    // TimeSettings REST API
    // ============================================================================
    'rest_ts_GetRecord' => 'Получить настройки времени',
    'rest_ts_GetRecordDesc' => 'Получить текущие настройки времени и часового пояса',
    'rest_ts_Update' => 'Обновить настройки времени',
    'rest_ts_UpdateDesc' => 'Обновить настройки времени и часового пояса',

    // ============================================================================
    // Common Parameters
    // ============================================================================
    'rest_param_limit' => 'Максимальное количество записей для возврата',
    'rest_param_offset' => 'Количество записей для пропуска (используется для пагинации)',
    'rest_param_search' => 'Поисковый запрос для фильтрации результатов',
    'rest_param_order' => 'Поле для сортировки результатов',
    'rest_param_orderWay' => 'Направление сортировки',
    'rest_param_id' => 'Уникальный идентификатор ресурса',
    'rest_param_strategy' => 'Фильтр по стратегии распределения вызовов',

    // CallQueues specific parameters
    'rest_param_cq_name' => 'Отображаемое название очереди',
    'rest_param_cq_extension' => 'Номер внутреннего добавочного очереди (2-8 цифр)',
    'rest_param_cq_description' => 'Описание очереди',
    'rest_param_cq_strategy' => 'Стратегия распределения вызовов',
    'rest_param_cq_seconds_to_ring' => 'Время звонка каждому участнику (в секундах)',
    'rest_param_cq_seconds_for_wrapup' => 'Время на обработку после завершения вызова (в секундах)',
    'rest_param_cq_timeout_to_redirect' => 'Таймаут для переадресации (в секундах)',
    'rest_param_cq_recive_calls_while_on_call' => 'Принимать вызовы во время разговора',
    'rest_param_cq_caller_hear' => 'Что слышит звонящий в ожидании',
    'rest_param_cq_announce_position' => 'Объявлять позицию в очереди',
    'rest_param_cq_announce_hold_time' => 'Объявлять время ожидания',
    'rest_param_cq_moh_sound_id' => 'ID звукового файла для музыки ожидания',
    'rest_param_cq_members' => 'Массив конфигураций участников очереди',

    // CallQueues schema field descriptions
    'rest_schema_cq_id' => 'Уникальный идентификатор очереди',
    'rest_schema_cq_extension' => 'Номер внутреннего добавочного очереди',
    'rest_schema_cq_name' => 'Название очереди',
    'rest_schema_cq_description' => 'Описание очереди',
    'rest_schema_cq_represent' => 'HTML представление для отображения в выпадающих списках',
    'rest_schema_cq_strategy' => 'Стратегия распределения вызовов',
    'rest_schema_cq_seconds_to_ring_each_member' => 'Время звонка каждому участнику в секундах',
    'rest_schema_cq_seconds_for_wrapup' => 'Время на обработку после завершения вызова в секундах',
    'rest_schema_cq_recive_calls_while_on_a_call' => 'Разрешить прием вызовов во время разговора',
    'rest_schema_cq_announce_position' => 'Объявлять позицию звонящего в очереди',
    'rest_schema_cq_announce_hold_time' => 'Объявлять предполагаемое время ожидания',
    'rest_schema_cq_caller_hear' => 'Что слышит звонящий во время ожидания в очереди',
    'rest_schema_cq_periodic_announce_frequency' => 'Частота периодических объявлений в секундах',
    'rest_schema_cq_timeout_to_redirect_to_extension' => 'Таймаут перед переадресацией на добавочный',
    'rest_schema_cq_number_unanswered_calls_to_redirect' => 'Количество неотвеченных вызовов до переадресации',
    'rest_schema_cq_number_repeat_unanswered_to_redirect' => 'Количество повторных неотвеченных вызовов до переадресации',
    'rest_schema_cq_callerid_prefix' => 'Префикс CallerID для вызовов из очереди',
    'rest_schema_cq_timeout_extension' => 'Добавочный для переадресации по таймауту',
    'rest_schema_cq_timeout_extension_represent' => 'HTML представление добавочного для таймаута',
    'rest_schema_cq_redirect_to_extension_if_empty' => 'Добавочный для переадресации если очередь пуста',
    'rest_schema_cq_redirect_to_extension_if_empty_represent' => 'HTML представление добавочного для пустой очереди',
    'rest_schema_cq_redirect_to_extension_if_unanswered' => 'Добавочный для переадресации при неответе',
    'rest_schema_cq_redirect_to_extension_if_unanswered_represent' => 'HTML представление добавочного для неответа',
    'rest_schema_cq_redirect_to_extension_if_repeat_exceeded' => 'Добавочный для переадресации при превышении лимита повторов',
    'rest_schema_cq_redirect_to_extension_if_repeat_exceeded_represent' => 'HTML представление добавочного для превышения лимита',
    'rest_schema_cq_periodic_announce_sound_id' => 'ID звукового файла для периодических объявлений',
    'rest_schema_cq_periodic_announce_sound_id_represent' => 'HTML представление звукового файла объявлений',
    'rest_schema_cq_moh_sound_id' => 'ID звукового файла для музыки ожидания',
    'rest_schema_cq_moh_sound_id_represent' => 'HTML представление файла музыки ожидания',
    'rest_schema_cq_members' => 'Участники очереди',
    'rest_schema_cq_search_index' => 'Поисковый индекс для фильтрации',
    'rest_schema_cq_member_extension' => 'Номер добавочного участника',
    'rest_schema_cq_member_represent' => 'HTML представление участника',

    // ApiKeys specific parameters
    'rest_param_ak_description' => 'Описание назначения API ключа',
    'rest_param_ak_enabled' => 'Включить или отключить API ключ',
    'rest_param_ak_full_permissions' => 'Полные права доступа ко всем endpoints',
    'rest_param_ak_allowed_paths' => 'Список разрешенных API paths',
    'rest_param_ak_network_filter_id' => 'ID сетевого фильтра для ограничения доступа по IP',

    // ============================================================================
    // Common Responses (using neutral forms to avoid gender agreement issues)
    // ============================================================================
    'rest_response_200_list' => 'Список успешно получен',
    'rest_response_200_get' => 'Запись успешно получена',
    'rest_response_200_default' => 'Значения по умолчанию успешно получены',
    'rest_response_200_test' => 'Тест успешно выполнен',
    'rest_response_200_copied' => 'Копирование выполнено успешно',
    'rest_response_200_updated' => 'Обновление выполнено успешно',
    'rest_response_200_patched' => 'Изменение выполнено успешно',
    'rest_response_200_deleted' => 'Удаление выполнено успешно',
    'rest_response_201_created' => 'Создание выполнено успешно',
    'rest_response_204_deleted' => 'Удаление выполнено успешно',
    'rest_response_400_invalid' => 'Некорректные параметры запроса',
    'rest_response_400_bad_request' => 'Некорректный запрос',
    'rest_response_400_invalid_request' => 'Некорректные данные запроса',
    'rest_response_401_unauthorized' => 'Требуется аутентификация',
    'rest_response_403_forbidden' => 'Недостаточно прав доступа',
    'rest_response_404_notfound' => 'Запись не найдена',
    'rest_response_404_not_found' => 'Запись не найдена',
    'rest_response_409_conflict' => 'Конфликт с существующим ресурсом',
    'rest_response_409_extension_conflict' => 'Конфликт номера добавочного',
    'rest_response_409_active_calls' => 'Невозможно удалить очередь с активными вызовами',
    'rest_response_422_validation' => 'Ошибка валидации данных',
    'rest_response_500_error' => 'Внутренняя ошибка сервера',

    // ============================================================================
    // Resource Names (for use in responses with placeholders)
    // ============================================================================
    'rest_resource_callqueue' => 'Очередь вызовов',
    'rest_resource_apikey' => 'API ключ',
    'rest_resource_asteriskmanager' => 'AMI пользователь',
    'rest_resource_mailsettings' => 'Настройки почты',
    'rest_resource_generalsettings' => 'Общие настройки',
    'rest_resource_timesettings' => 'Настройки времени',

    // ============================================================================
    // PBXApiResult Schema Descriptions
    // ============================================================================
    'rest_schema_PBXApiResult' => 'Стандартный формат ответа REST API',
    'rest_schema_result' => 'Статус выполнения запроса (true - успех, false - ошибка)',
    'rest_schema_data' => 'Данные ответа (структура зависит от конкретного endpoint)',
    'rest_schema_messages' => 'Сообщения об ошибках, предупреждениях или информационные сообщения',
    'rest_schema_messages_error' => 'Массив сообщений об ошибках',
    'rest_schema_messages_info' => 'Массив информационных сообщений',
    'rest_schema_messages_warning' => 'Массив предупреждающих сообщений',
    'rest_schema_function' => 'Имя вызванной функции',
    'rest_schema_processor' => 'Класс-обработчик, который выполнил запрос',
    'rest_schema_pid' => 'Идентификатор процесса, обработавшего запрос',
    'rest_schema_reload' => 'Путь для перенаправления во фронтенде (используется для навигации после изменений)',

    // ============================================================================
    // Security Schemes
    // ============================================================================
    'rest_security_bearerAuth_description' => 'Аутентификация с помощью Bearer токена (JWT). API ключи можно создать в веб-интерфейсе в разделе Настройки → API Ключи.',
];