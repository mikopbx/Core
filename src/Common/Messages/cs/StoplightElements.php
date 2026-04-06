<?php
/**
 * Stoplight Elements Web Components translations (Czech)
 * Překlady pro komponenty Stoplight Elements (dokumentace API)
 */
return [
    /**
     * API Container - Error messages
     */
    'sl_DocumentLoadError' => 'Dokument se nepodařilo načíst',
    'sl_DocumentLoadErrorDesc' => 'Nepodařilo se získat dokument popisu API. To může naznačovat problémy s připojením nebo problémy se serverem, na kterém je specifikace umístěna.',
    'sl_ParseError' => 'Nepodařilo se analyzovat soubor OpenAPI',
    'sl_ParseErrorDesc' => 'Ujistěte se prosím, že váš soubor OpenAPI je platný a zkuste to znovu',
    'sl_RequiredParametersNotProvided' => 'Neposkytli jste všechny povinné parametry!',

    /**
     * HttpOperation Request Component
     */
    'sl_Request' => 'Požadavek',
    'sl_PathParameters' => 'Parametry cesty',
    'sl_QueryParameters' => 'Parametry dotazu',
    'sl_Headers' => 'Hlavičky',
    'sl_Cookies' => 'Cookies',
    'sl_Parameters' => 'Parametry',

    /**
     * HttpOperation Responses Component
     */
    'sl_ResponseCode' => 'Kód odpovědi',
    'sl_Close' => 'Zavřít',
    'sl_Responses' => 'Odpovědi',
    'sl_Body' => 'Tělo',
    'sl_ResponseBodyContentType' => 'Typ obsahu těla odpovědi',

    /**
     * HttpOperation Callbacks Component
     */
    'sl_Callbacks' => 'Zpětná volání',

    /**
     * HttpOperation Body Component
     */
    'sl_RequestBodyContentType' => 'Typ obsahu těla požadavku',

    /**
     * BasicAuth Component
     */
    'sl_Username' => 'Uživatelské jméno',
    'sl_username' => 'uživatelské jméno',
    'sl_Password' => 'Heslo',
    'sl_password' => 'heslo',

    /**
     * DigestAuth Component
     */
    'sl_Authorization' => 'Autorizace',

    /**
     * FileUploadParameterEditors Component
     */
    'sl_pickFile' => 'vyberte soubor',
    'sl_RemoveFile' => 'Odebrat soubor',
    'sl_Upload' => 'Nahrát',

    /**
     * TryItAuth Component
     */
    'sl_SecuritySchemes' => 'Schémata zabezpečení',
    'sl_Auth' => 'Autentizace',
    'sl_ComingSoon' => 'Již brzy: %schemeName%',
    'sl_NoAuthSelected' => 'Není vybrána autentizace',

    /**
     * ExportButton Component
     */
    'sl_Original' => 'Originál',
    'sl_BundledReferences' => 'Sbalené reference',
    'sl_Export' => 'Export',

    /**
     * RequestSamples Component
     */
    'sl_UnableToGenerateCode' => 'Nelze vygenerovat ukázkový kód',
    'sl_RequestSampleLanguage' => 'Jazyk ukázky požadavku',
    'sl_RequestSample' => 'Ukázka požadavku: %languageName%',
    'sl_SendAPIRequest' => 'Odeslat API požadavek',

    /**
     * ResponseExamples Component
     */
    'sl_ResponseExample' => 'Ukázka odpovědi',
    'sl_ResponseExampleWith' => 'Ukázka odpovědi: %exampleName%',

    /**
     * LoadMore Component
     */
    'sl_Loading' => 'Načítání...',
    'sl_LoadExamples' => 'Načíst ukázky',
    'sl_LargeExamplesNotRendered' => 'Velké ukázky nejsou ve výchozím nastavení vykresleny.',

    /**
     * ServerInfo Component
     */
    'sl_APIBaseURL' => 'Základní URL API',
    'sl_CopyServerURL' => 'Zkopírovat URL serveru',
    'sl_CopiedServerURL' => 'URL serveru zkopírováno',

    /**
     * SecuritySchemes Component
     */
    'sl_Security' => 'Zabezpečení',
    'sl_ProvideBearerToken' => 'Při odesílání požadavků na chráněné zdroje poskytněte svůj bearer token v hlavičce Authorization.',

    /**
     * MockingButton Component
     */
    'sl_StaticallyGenerated' => 'Staticky vygenerováno',
    'sl_DynamicallyGenerated' => 'Dynamicky vygenerováno',
    'sl_Examples' => 'Ukázky',
    'sl_MockSettings' => 'Nastavení napodobení',

    /**
     * TryItResponse Component
     */
    'sl_Response' => 'Odpověď',
    'sl_NoSupportedResponseBody' => 'Tělo odpovědi v nepodporovaném formátu',
    'sl_Preview' => 'Náhled',
    'sl_Raw' => 'Surový',
    'sl_BodyFormat' => 'Formát těla',
    'sl_Error' => 'Chyba',
    'sl_NetworkError' => 'Došlo k síťové chybě.',
    'sl_NetworkErrorStep1' => '1. Zkontrolujte znovu, že je váš počítač připojen k internetu.',
    'sl_NetworkErrorStep2' => '2. Ujistěte se, že API skutečně běží a je dostupné pod uvedenou URL.',
    'sl_NetworkErrorStep3' => '3. Pokud jste zkontrolovali vše výše uvedené a stále máte problémy, ověřte, zda API podporuje',
    'sl_CORS' => 'CORS',

    /**
     * Model Component
     */
    'sl_Example' => 'Ukázka',
    'sl_ExampleWith' => 'Ukázka: %exampleName%',

    /**
     * ServersDropdown Component
     */
    'sl_Servers' => 'Servery',
    'sl_Server' => 'Server',

    /**
     * Additional sections
     */
    'sl_AdditionalInformation' => 'Dodatečné informace',
    'sl_Endpoints' => 'Koncové body',
    'sl_Overview' => 'Přehled',

    /**
     * Security descriptions
     */
    'sl_SecurityColon' => 'Zabezpečení:',
    'sl_ExampleColon' => 'Ukázka:',
    'sl_RolesColon' => 'Role:',

    /**
     * Schema and model properties
     */
    'sl_Required' => 'povinný',
    'sl_ReadOnly' => 'pouze pro čtení',
    'sl_WriteOnly' => 'pouze pro zápis',
    'sl_Deprecated' => 'zastaralé',
    'sl_AllowedValue' => 'Povolená hodnota',
    'sl_AllowedValues' => 'Povolené hodnoty',
    'sl_MultipleOf' => 'Násobek',
    'sl_MatchPattern' => 'Odpovídá vzoru',
    'sl_Default' => 'Výchozí',
    'sl_Style' => 'Styl',
    'sl_Roles' => 'Role',
];
