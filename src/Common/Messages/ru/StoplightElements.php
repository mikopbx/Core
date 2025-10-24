<?php
/**
 * Stoplight Elements Web Components translations
 * Переводы для компонентов Stoplight Elements (документация API)
 */
return [
    /**
     * API Container - Error messages
     */
    'sl_DocumentLoadError' => 'Не удалось загрузить документ',
    'sl_DocumentLoadErrorDesc' => 'Не удалось получить документ описания API. Это может указывать на проблемы с подключением или проблемы с сервером, на котором размещена спецификация.',
    'sl_ParseError' => 'Не удалось разобрать файл OpenAPI',
    'sl_ParseErrorDesc' => 'Пожалуйста, убедитесь, что ваш файл OpenAPI корректен и попробуйте снова',
    'sl_RequiredParametersNotProvided' => 'Вы не предоставили все обязательные параметры!',

    /**
     * HttpOperation Request Component
     */
    'sl_Request' => 'Запрос',
    'sl_PathParameters' => 'Параметры пути',
    'sl_QueryParameters' => 'Параметры запроса',
    'sl_Headers' => 'Заголовки',
    'sl_Cookies' => 'Куки',
    'sl_Parameters' => 'Параметры',

    /**
     * HttpOperation Responses Component
     */
    'sl_ResponseCode' => 'Код ответа',
    'sl_Close' => 'Закрыть',
    'sl_Responses' => 'Ответы',
    'sl_Body' => 'Тело',
    'sl_ResponseBodyContentType' => 'Тип содержимого тела ответа',

    /**
     * HttpOperation Callbacks Component
     */
    'sl_Callbacks' => 'Обратные вызовы',

    /**
     * HttpOperation Body Component
     */
    'sl_RequestBodyContentType' => 'Тип содержимого тела запроса',

    /**
     * BasicAuth Component
     */
    'sl_Username' => 'Имя пользователя',
    'sl_username' => 'имя пользователя',
    'sl_Password' => 'Пароль',
    'sl_password' => 'пароль',

    /**
     * DigestAuth Component
     */
    'sl_Authorization' => 'Авторизация',

    /**
     * FileUploadParameterEditors Component
     */
    'sl_pickFile' => 'выберите файл',
    'sl_RemoveFile' => 'Удалить файл',
    'sl_Upload' => 'Загрузить',

    /**
     * TryItAuth Component
     */
    'sl_SecuritySchemes' => 'Схемы безопасности',
    'sl_Auth' => 'Аутентификация',
    'sl_ComingSoon' => 'Скоро: %schemeName%',
    'sl_NoAuthSelected' => 'Аутентификация не выбрана',

    /**
     * ExportButton Component
     */
    'sl_Original' => 'Оригинал',
    'sl_BundledReferences' => 'Объединённые ссылки',
    'sl_Export' => 'Экспорт',

    /**
     * RequestSamples Component
     */
    'sl_UnableToGenerateCode' => 'Не удалось сгенерировать пример кода',
    'sl_RequestSampleLanguage' => 'Язык примера запроса',
    'sl_RequestSample' => 'Пример запроса: %languageName%',
    'sl_SendAPIRequest' => 'Отправить API запрос',

    /**
     * ResponseExamples Component
     */
    'sl_ResponseExample' => 'Пример ответа',
    'sl_ResponseExampleWith' => 'Пример ответа: %exampleName%',

    /**
     * LoadMore Component
     */
    'sl_Loading' => 'Загрузка...',
    'sl_LoadExamples' => 'Загрузить примеры',
    'sl_LargeExamplesNotRendered' => 'Большие примеры не отображаются по умолчанию.',

    /**
     * ServerInfo Component
     */
    'sl_APIBaseURL' => 'Базовый URL API',
    'sl_CopyServerURL' => 'Скопировать URL сервера',
    'sl_CopiedServerURL' => 'URL сервера скопирован',

    /**
     * SecuritySchemes Component
     */
    'sl_Security' => 'Безопасность',
    'sl_ProvideBearerToken' => 'Предоставьте ваш bearer токен в заголовке Authorization при выполнении запросов к защищённым ресурсам.',

    /**
     * MockingButton Component
     */
    'sl_StaticallyGenerated' => 'Статически сгенерировано',
    'sl_DynamicallyGenerated' => 'Динамически сгенерировано',
    'sl_Examples' => 'Примеры',
    'sl_MockSettings' => 'Настройки имитации',

    /**
     * TryItResponse Component
     */
    'sl_Response' => 'Ответ',
    'sl_NoSupportedResponseBody' => 'Тело ответа в неподдерживаемом формате',
    'sl_Preview' => 'Предпросмотр',
    'sl_Raw' => 'Исходный',
    'sl_BodyFormat' => 'Формат тела',
    'sl_Error' => 'Ошибка',
    'sl_NetworkError' => 'Произошла сетевая ошибка.',
    'sl_NetworkErrorStep1' => '1. Дважды проверьте, что ваш компьютер подключен к интернету.',
    'sl_NetworkErrorStep2' => '2. Убедитесь, что API действительно запущен и доступен по указанному URL.',
    'sl_NetworkErrorStep3' => '3. Если вы проверили всё вышеперечисленное и всё ещё испытываете проблемы, проверьте, поддерживает ли API',
    'sl_CORS' => 'CORS',

    /**
     * RequestBody Component
     */
    // 'sl_Body' => 'Тело', // Already defined above
    // 'sl_Examples' => 'Примеры', // Already defined above

    /**
     * Model Component
     */
    'sl_Example' => 'Пример',
    'sl_ExampleWith' => 'Пример: %exampleName%',

    /**
     * ServersDropdown Component
     */
    'sl_Servers' => 'Серверы',
    'sl_Server' => 'Сервер',

    /**
     * Additional sections
     */
    'sl_AdditionalInformation' => 'Дополнительная информация',
    'sl_Endpoints' => 'Конечные точки',
    'sl_Overview' => 'Обзор',

    /**
     * Security descriptions
     */
    'sl_SecurityColon' => 'Безопасность:',
    'sl_ExampleColon' => 'Пример:',
    'sl_RolesColon' => 'Роли:',

    /**
     * Schema and model properties
     */
    'sl_Required' => 'обязательный',
    'sl_ReadOnly' => 'только для чтения',
    'sl_WriteOnly' => 'только для записи',
    'sl_Deprecated' => 'устарело',
    'sl_AllowedValue' => 'Допустимое значение',
    'sl_AllowedValues' => 'Допустимые значения',
    'sl_MultipleOf' => 'Кратно',
    'sl_MatchPattern' => 'Соответствует шаблону',
    'sl_Default' => 'По умолчанию',
    'sl_Style' => 'Стиль',
    'sl_Roles' => 'Роли',
];
