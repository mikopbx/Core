<?php
/**
 * Asterisk REST Interface (ARI) users translations
 */

return [
    // Menu and breadcrumbs
    'mm_AsteriskRestUsers' => 'Pristup ARI',
    'ari_BreadcrumbAsteriskRestUsers' => 'ARI korisnici',
    'ari_BreadcrumbCreate' => 'Stvori',
    'ari_BreadcrumbModify' => 'Uredi',
    
    // Page titles and descriptions
    'ari_Title' => 'Upravljanje ARI korisnicima',
    'ari_Description' => 'Asterisk REST Interface (ARI) omogućuje upravljanje Asteriskom putem WebSocketa i REST API-ja',
    'ari_UserSettingsDescription' => 'Postavke korisnika za pristup Asterisk REST Interfaceu',
    'ari_NewUser' => 'Novi ARI korisnik',
    'ari_EditUser' => 'Uređivanje ARI korisnika',
    
    // Buttons
    'ari_AddNewUser' => 'Dodaj korisnika',
    'ari_CreateFirstUser' => 'Stvori prvog korisnika',
    'ari_SaveUser' => 'Spremi korisnika',
    'ari_DeleteUser' => 'Izbriši korisnika',
    
    // Table columns
    'ari_Username' => 'Korisničko ime',
    'ari_Password' => 'Lozinka',
    'ari_Applications' => 'Aplikacije',
    'ari_Status' => 'Status',
    'ari_Enabled' => 'Uključen',
    'ari_Disabled' => 'Isključen',
    'ari_EnableUser' => 'Uključi korisnika',
    
    // Form fields and placeholders
    'ari_UsernamePlaceholder' => 'na primjer, ari_user',
    'ari_PasswordPlaceholder' => 'Unesite lozinku ili generirajte novu',
    'ari_DescriptionPlaceholder' => 'Opis korisnika (nije obavezno)',
    'ari_ApplicationsPlaceholder' => 'Sve aplikacije (ako nije navedeno)',
    'ari_EnabledTooltip' => 'Uključi ili isključi pristup za ovog korisnika',
    
    // Applications help
    'ari_ApplicationsHelp' => 'Navedite nazive Stasis aplikacija kojima korisnik ima pristup. Ostavite prazno za pristup svim aplikacijama.',
    
    // Connection info
    'ari_ConnectionInfo' => 'Podaci za povezivanje',
    'ari_WebSocketURL' => 'WebSocket URL',
    'ari_RESTURL' => 'REST API URL',
    'ari_SecureWebSocketURL' => 'Zaštićeni WebSocket URL (TLS)',
    
    // Messages
    'ari_NoUsersFound' => 'ARI korisnici nisu pronađeni',
    'ari_PasswordGenerated' => 'Generirana je nova lozinka',
    'ari_SaveSuccess' => 'ARI korisnik je uspješno spremljen',
    'ari_SaveError' => 'Pogreška pri spremanju ARI korisnika',
    'ari_DeleteSuccess' => 'ARI korisnik je uspješno izbrisan',
    'ari_DeleteError' => 'Pogreška pri brisanju ARI korisnika',
    'ari_ConfirmDelete' => 'Jeste li sigurni da želite izbrisati korisnika "{0}"?',
    'ari_UsernameNotUnique' => 'Ovo korisničko ime već se koristi',
    'ari_EmptyTableTitle' => 'ARI korisnici još nisu stvoreni',
    'ari_EmptyTableDescription' => 'Stvorite prvog korisnika za pristup Asterisk REST Interfaceu',
    'ari_ErrorThisUsernameInNotAvailable' => 'Ovo korisničko ime je već zauzeto',
    
    // Validation messages
    'ari_ValidateUsernameEmpty' => 'Korisničko ime ne može biti prazno',
    'ari_ValidateUsernameFormat' => 'Korisničko ime može sadržavati samo latinična slova, brojeve i podvlaku',
    'ari_ValidatePasswordEmpty' => 'Lozinka ne može biti prazna',
    
    // Info messages
    'ari_InfoSystemUser' => 'Ovo je sistemski korisnik i ne može se izbrisati',
    'ari_InfoWebSocketConnection' => 'Koristite ove URL-ove za povezivanje s ARI putem WebSocketa ili REST API-ja',
    'ari_InfoApplicationsAccess' => 'Korisnik ima pristup samo navedenim Stasis aplikacijama',
    'ari_InfoFullAccess' => 'Korisnik ima pristup svim Stasis aplikacijama',
    
    // Settings
    'ari_SettingsEnabled' => 'ARI uključen',
    'ari_SettingsAllowedOrigins' => 'Dopušteni CORS izvori',
    'ari_SettingsAllowedOriginsHelp' => 'Popis domena za CORS (odvojenih zarezom). Koristite * za dopuštanje svih izvora.',
    
    // Connection info summary
    'ari_ConnectionInfoSummary' => 'Koristite korisničke vjerodajnice za povezivanje s ARI putem WebSocketa ili REST API-ja',
    
    // Tooltips for Applications field
    'ari_ApplicationsTooltip_header' => 'Stasis aplikacije',
    'ari_ApplicationsTooltip_desc' => 'Navedite nazive Stasis aplikacija kojima korisnik ima pristup',
    'ari_ApplicationsTooltip_usage_header' => 'Upotreba',
    'ari_ApplicationsTooltip_usage_desc' => 'Ostavite polje prazno za pristup svim aplikacijama. Navedite određene aplikacije za ograničavanje pristupa.',
    'ari_ApplicationsTooltip_common_header' => 'Uobičajene aplikacije',
    'ari_ApplicationsTooltip_common_ari_app' => 'Glavna aplikacija za ARI',
    'ari_ApplicationsTooltip_common_stasis' => 'Osnovna Stasis aplikacija',
    'ari_ApplicationsTooltip_common_external_media' => 'Rad s vanjskim medijskim tokovima',
    'ari_ApplicationsTooltip_common_bridge_app' => 'Upravljanje mostovima poziva',
    'ari_ApplicationsTooltip_common_channel_spy' => 'Prisluškivanje kanala',
    'ari_ApplicationsTooltip_warning_header' => 'Pažnja',
    'ari_ApplicationsTooltip_warning' => 'Ograničavanje pristupa aplikacijama utječe na funkcionalnost ARI klijenta',
    
    // Tooltips for Connection Info
    'ari_ConnectionInfoTooltip_header' => 'Parametri povezivanja',
    'ari_ConnectionInfoTooltip_desc' => 'Koristite ove parametre za postavljanje povezivanja s Asterisk REST Interfaceom',
    'ari_ConnectionInfoTooltip_websocket_header' => 'WebSocket veza',
    'ari_ConnectionInfoTooltip_websocket_url' => 'Obični WebSocket',
    'ari_ConnectionInfoTooltip_websocket_secure' => 'Zaštićeni WebSocket (TLS)',
    'ari_ConnectionInfoTooltip_rest_header' => 'REST API',
    'ari_ConnectionInfoTooltip_rest_url' => 'HTTP endpoint',
    'ari_ConnectionInfoTooltip_rest_secure' => 'HTTPS endpoint',
    'ari_ConnectionInfoTooltip_auth_header' => 'Autentifikacija',
    'ari_ConnectionInfoTooltip_auth_desc' => 'Koristite korisničko ime i lozinku iz ovog obrasca za Basic Authentication',
    'ari_ConnectionInfoTooltip_examples_header' => 'Primjer povezivanja',
    'ari_ConnectionInfoTooltip_examples' => '# WebSocket s autentifikacijom|ws://username:password@server:8088/ari/events?app=my-app&subscribe=all||# REST API zahtjev|curl -u username:password http://server:8088/ari/channels',
    'ari_ConnectionInfoTooltip_note' => 'Zamijenite [application] nazivom vaše Stasis aplikacije',
    'ari_ConnectionInfoTooltip_server_placeholder' => 'vaš-poslužitelj',
    
    // Other tooltips
    'ari_SystemUserReadOnly' => 'Sistemski korisnik dostupan je samo za čitanje',
    'ari_ErrorLoadingUser' => 'Pogreška pri učitavanju podataka korisnika',

    // REST API parameter descriptions (request fields)
    'rest_param_aru_username' => 'Korisničko ime za pristup ARI',
    'rest_param_aru_password' => 'Lozinka za autentifikaciju u ARI',
    'rest_param_aru_applications' => 'Popis Stasis aplikacija kojima korisnik ima pristup (prazan niz = sve aplikacije)',
    'rest_param_aru_description' => 'Opis ARI korisnika',
    'rest_param_aru_weak_password' => 'Pokazatelj jačine lozinke (0 - nepoznato, 1 - jaka, 2 - slaba)',
    'rest_param_aru_object' => 'Objekt korisnika Asterisk REST Interfacea (ARI)',

    // REST API schema descriptions (response fields)
    'rest_schema_aru_id' => 'Jedinstveni identifikator ARI korisnika',
    'rest_schema_aru_applications_summary' => 'Kratak opis dostupnih aplikacija',
    'rest_schema_aru_applications_count' => 'Broj aplikacija kojima korisnik ima pristup',
    'rest_schema_aru_object' => 'Objekt korisnika Asterisk REST Interfacea (ARI)',
    'rest_schema_aru_represent' => 'Tekstualni prikaz ARI korisnika za prikaz u padajućim popisima',

    // REST API operation descriptions
    'rest_aru_GetList' => 'Dohvati popis ARI korisnika',
    'rest_aru_GetListDesc' => 'Vraća popis svih korisnika Asterisk REST Interfacea s podrškom za straničenje i filtriranje',
    'rest_aru_GetRecord' => 'Dohvati ARI korisnika',
    'rest_aru_GetRecordDesc' => 'Vraća detaljne podatke o određenom ARI korisniku prema njegovom identifikatoru',
    'rest_aru_Create' => 'Stvori ARI korisnika',
    'rest_aru_CreateDesc' => 'Stvara novog korisnika za pristup Asterisk REST Interfaceu s navedenim parametrima',
    'rest_aru_Update' => 'Ažuriraj ARI korisnika',
    'rest_aru_UpdateDesc' => 'Potpuno zamjenjuje podatke postojećeg ARI korisnika (sva su polja obavezna)',
    'rest_aru_Patch' => 'Djelomično ažuriraj ARI korisnika',
    'rest_aru_PatchDesc' => 'Ažurira samo navedena polja postojećeg ARI korisnika',
    'rest_aru_Delete' => 'Izbriši ARI korisnika',
    'rest_aru_DeleteDesc' => 'Briše ARI korisnika iz sustava prema njegovom identifikatoru',
    'rest_aru_GetDefault' => 'Dohvati predložak novog ARI korisnika',
    'rest_aru_GetDefaultDesc' => 'Vraća objekt sa zadanim postavkama za stvaranje novog ARI korisnika',
];