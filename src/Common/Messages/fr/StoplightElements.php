<?php
/**
 * Stoplight Elements Web Components translations (French)
 * Traductions pour les composants Stoplight Elements (documentation API)
 */
return [
    /**
     * API Container - Error messages
     */
    'sl_DocumentLoadError' => 'Le document n\'a pas pu être chargé',
    'sl_DocumentLoadErrorDesc' => 'Le document de description de l\'API n\'a pas pu être récupéré. Cela peut indiquer des problèmes de connectivité ou des problèmes avec le serveur hébergeant la spécification.',
    'sl_ParseError' => 'Échec de l\'analyse du fichier OpenAPI',
    'sl_ParseErrorDesc' => 'Veuillez vous assurer que votre fichier OpenAPI est valide et réessayez',
    'sl_RequiredParametersNotProvided' => 'Vous n\'avez pas fourni tous les paramètres requis !',

    /**
     * HttpOperation Request Component
     */
    'sl_Request' => 'Requête',
    'sl_PathParameters' => 'Paramètres de Chemin',
    'sl_QueryParameters' => 'Paramètres de Requête',
    'sl_Headers' => 'En-têtes',
    'sl_Cookies' => 'Cookies',
    'sl_Parameters' => 'Paramètres',

    /**
     * HttpOperation Responses Component
     */
    'sl_ResponseCode' => 'Code de Réponse',
    'sl_Close' => 'Fermer',
    'sl_Responses' => 'Réponses',
    'sl_Body' => 'Corps',
    'sl_ResponseBodyContentType' => 'Type de Contenu du Corps de Réponse',

    /**
     * HttpOperation Callbacks Component
     */
    'sl_Callbacks' => 'Rappels',

    /**
     * HttpOperation Body Component
     */
    'sl_RequestBodyContentType' => 'Type de Contenu du Corps de Requête',

    /**
     * BasicAuth Component
     */
    'sl_Username' => 'Nom d\'utilisateur',
    'sl_username' => 'nom d\'utilisateur',
    'sl_Password' => 'Mot de passe',
    'sl_password' => 'mot de passe',

    /**
     * DigestAuth Component
     */
    'sl_Authorization' => 'Autorisation',

    /**
     * FileUploadParameterEditors Component
     */
    'sl_pickFile' => 'choisir un fichier',
    'sl_RemoveFile' => 'Supprimer le fichier',
    'sl_Upload' => 'Télécharger',

    /**
     * TryItAuth Component
     */
    'sl_SecuritySchemes' => 'Schémas de Sécurité',
    'sl_Auth' => 'Authentification',
    'sl_ComingSoon' => 'Bientôt disponible : %schemeName%',
    'sl_NoAuthSelected' => 'Aucune authentification sélectionnée',

    /**
     * ExportButton Component
     */
    'sl_Original' => 'Original',
    'sl_BundledReferences' => 'Références Groupées',
    'sl_Export' => 'Exporter',

    /**
     * RequestSamples Component
     */
    'sl_UnableToGenerateCode' => 'Impossible de générer l\'exemple de code',
    'sl_RequestSampleLanguage' => 'Langue de l\'Exemple de Requête',
    'sl_RequestSample' => 'Exemple de Requête : %languageName%',
    'sl_SendAPIRequest' => 'Envoyer la Requête API',

    /**
     * ResponseExamples Component
     */
    'sl_ResponseExample' => 'Exemple de Réponse',
    'sl_ResponseExampleWith' => 'Exemple de Réponse : %exampleName%',

    /**
     * LoadMore Component
     */
    'sl_Loading' => 'Chargement...',
    'sl_LoadExamples' => 'Charger les exemples',
    'sl_LargeExamplesNotRendered' => 'Les exemples volumineux ne sont pas affichés par défaut.',

    /**
     * ServerInfo Component
     */
    'sl_APIBaseURL' => 'URL de Base de l\'API',
    'sl_CopyServerURL' => 'Copier l\'URL du Serveur',
    'sl_CopiedServerURL' => 'URL du Serveur copiée',

    /**
     * SecuritySchemes Component
     */
    'sl_Security' => 'Sécurité',
    'sl_ProvideBearerToken' => 'Fournissez votre jeton bearer dans l\'en-tête Authorization lors de requêtes vers des ressources protégées.',

    /**
     * MockingButton Component
     */
    'sl_StaticallyGenerated' => 'Généré Statiquement',
    'sl_DynamicallyGenerated' => 'Généré Dynamiquement',
    'sl_Examples' => 'Exemples',
    'sl_MockSettings' => 'Paramètres de Simulation',

    /**
     * TryItResponse Component
     */
    'sl_Response' => 'Réponse',
    'sl_NoSupportedResponseBody' => 'Corps de réponse dans un format non pris en charge',
    'sl_Preview' => 'Aperçu',
    'sl_Raw' => 'Brut',
    'sl_BodyFormat' => 'Format du Corps',
    'sl_Error' => 'Erreur',
    'sl_NetworkError' => 'Une erreur réseau s\'est produite.',
    'sl_NetworkErrorStep1' => '1. Vérifiez à nouveau que votre ordinateur est connecté à Internet.',
    'sl_NetworkErrorStep2' => '2. Assurez-vous que l\'API est réellement en cours d\'exécution et disponible sous l\'URL spécifiée.',
    'sl_NetworkErrorStep3' => '3. Si vous avez vérifié tout ce qui précède et rencontrez toujours des problèmes, vérifiez si l\'API prend en charge',
    'sl_CORS' => 'CORS',

    /**
     * Model Component
     */
    'sl_Example' => 'Exemple',
    'sl_ExampleWith' => 'Exemple : %exampleName%',

    /**
     * ServersDropdown Component
     */
    'sl_Servers' => 'Serveurs',
    'sl_Server' => 'Serveur',

    /**
     * Additional sections
     */
    'sl_AdditionalInformation' => 'Informations Supplémentaires',
    'sl_Endpoints' => 'Points de Terminaison',
    'sl_Overview' => 'Aperçu',

    /**
     * Security descriptions
     */
    'sl_SecurityColon' => 'Sécurité :',
    'sl_ExampleColon' => 'Exemple :',
    'sl_RolesColon' => 'Rôles :',

    /**
     * Schema and model properties
     */
    'sl_Required' => 'requis',
    'sl_ReadOnly' => 'lecture seule',
    'sl_WriteOnly' => 'écriture seule',
    'sl_Deprecated' => 'obsolète',
    'sl_AllowedValue' => 'Valeur autorisée',
    'sl_AllowedValues' => 'Valeurs autorisées',
    'sl_MultipleOf' => 'Multiple de',
    'sl_MatchPattern' => 'Correspond au modèle',
    'sl_Default' => 'Par défaut',
    'sl_Style' => 'Style',
    'sl_Roles' => 'Rôles',
];
