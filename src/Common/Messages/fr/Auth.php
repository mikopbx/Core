<?php
return [
    'auth_RefreshTokenMissing' => 'Jeton d\'actualisation manquant dans le cookie',
    'rest_response_429_too_many_requests' => 'Trop de demandes',
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Autorisation de l\'utilisateur',
    'rest_auth_LoginDesc' => 'Authentification de l\'utilisateur et émission de jetons JWT. Prend en charge deux méthodes : mot de passe (identifiant + mot de passe) et clé d\'accès (jeton de session fourni par WebAuthn). Renvoie un jeton d\'accès (JWT, 15 minutes) et définit un jeton d\'actualisation dans le cookie httpOnly (30 jours).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Actualiser le jeton d\'accès',
    'rest_auth_RefreshDesc' => 'Actualise le jeton d\'accès JWT à l\'aide du jeton d\'actualisation contenu dans le cookie. Permet de renouveler le jeton d\'actualisation pour une sécurité renforcée.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Déconnexion',
    'rest_auth_LogoutDesc' => 'Supprimez le jeton d\'actualisation de la base de données et effacez le cookie. Le jeton d\'accès JWT expirera automatiquement au bout de 15 minutes.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Connexion utilisateur pour autorisation',
    'rest_param_auth_password' => 'Mot de passe de l\'utilisateur',
    'rest_param_auth_sessionToken' => 'Jeton de session à usage unique issu de l\'authentification par mot de passe (64 caractères hexadécimaux)',
    'rest_param_auth_rememberMe' => 'Se souvenir de moi (prolonger le jeton d\'actualisation)',
    'rest_param_auth_refreshToken' => 'Actualisez le jeton d\'accès à partir du cookie httpOnly.',
    'rest_param_auth_clientIp' => 'Adresse IP du client pour le suivi des appareils',
    'rest_param_auth_userAgent' => 'agent utilisateur de l\'application de suivi du navigateur/appareil',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'Jeton d\'accès JWT pour l\'autorisation des requêtes (valide pendant 15 minutes)',
    'rest_schema_auth_tokenType' => 'Type de jeton pour l\'en-tête d\'autorisation (toujours « Bearer »)',
    'rest_schema_auth_expiresIn' => 'Temps restant avant l\'expiration du jeton d\'accès (en secondes)',
    'rest_schema_auth_login' => 'Connexion de l\'utilisateur autorisé',
    'rest_schema_auth_message' => 'Message concernant le résultat de l\'opération',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Authentification réussie. Un jeton d\'accès a été renvoyé et un cookie de jeton d\'actualisation a été créé.',
    'rest_response_200_auth_refresh' => 'Le jeton d\'accès a été mis à jour avec succès. Le jeton d\'actualisation a peut-être été renouvelé.',
    'rest_response_200_auth_logout' => 'Sortie réussie. Le jeton d\'actualisation a été supprimé de la base de données et le cookie a été effacé.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Trop de tentatives de connexion. Veuillez réessayer dans {interval} secondes.',
    'auth_LoginPasswordRequired' => 'Vous devez spécifier un identifiant et un mot de passe ou un jeton de session.',
    'auth_WrongLoginPassword' => 'Identifiant ou mot de passe incorrect',
    'auth_TokenSaveFailed' => 'Erreur lors de l\'enregistrement du jeton dans la base de données',
    'auth_RefreshTokenInvalid' => 'Jeton d\'actualisation invalide',
    'auth_RefreshTokenExpired' => 'Le jeton d\'actualisation a expiré ou est introuvable.',
    'auth_InvalidSessionData' => 'Données de session invalides',
    'auth_TokenUpdateFailed' => 'Erreur d\'actualisation du jeton',
    'rest_response_401_invalid_credentials' => 'Identifiants incorrects',
    'rest_response_401_invalid_token' => 'Jeton invalide',
    'rest_response_403_token_expired' => 'Le jeton a expiré.',
];
