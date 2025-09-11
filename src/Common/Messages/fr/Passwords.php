<?php

return [
    /*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

    // Password validation messages
    'psw_GeneratePassword' => 'Générer un mot de passe',
    'psw_UseGenerateButton' => 'Utilisez le bouton de génération pour créer un mot de passe sécurisé.',
    'psw_PasswordGenerated' => 'Mot de passe sécurisé généré avec succès',
    'psw_DefaultPasswordWarning' => 'Mot de passe par défaut détecté',
    'psw_ChangeDefaultPassword' => 'Vous utilisez un mot de passe par défaut. Veuillez le changer pour la sécurité.',
    'psw_WeakPassword' => 'Mot de passe faible',
    'psw_PasswordTooCommon' => 'Ce mot de passe est trop courant et facile à deviner.',
    'psw_PasswordTooShort' => 'Mot de passe trop court (minimum %min% caractères)',
    'psw_PasswordTooLong' => 'Mot de passe trop long (maximum %max% caractères)',
    'psw_PasswordMinLength' => 'Le mot de passe doit contenir au moins 8 caractères.',
    'psw_PasswordRequirements' => 'Exigences du mot de passe',
    'psw_PasswordSuggestions' => 'Suggestions pour améliorer la sécurité du mot de passe',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Très Faible',
    'psw_Weak' => 'Faible',
    'psw_Fair' => 'Correct',
    'psw_Good' => 'Bon',
    'psw_Strong' => 'Sécurisé',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Le mot de passe ne peut pas être vide',
    'psw_EmptyPassword' => 'Le mot de passe ne peut pas être vide',
    'psw_PasswordInDictionary' => 'Mot de passe trouvé dans le dictionnaire des mots de passe courants',
    'psw_PasswordAcceptable' => 'Le mot de passe est acceptable',
    'psw_PasswordGenerateFailed' => 'Échec de la génération du mot de passe',
    'psw_PasswordsArrayRequired' => 'Tableau de mots de passe requis',
    'psw_InvalidPasswordsFormat' => 'Format de données de mot de passe invalide',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Ajouter des lettres majuscules',
    'psw_AddLowercase' => 'Ajouter des lettres minuscules',
    'psw_AddNumbers' => 'Ajouter des chiffres',
    'psw_AddSpecialChars' => 'Ajouter des caractères spéciaux',
    'psw_IncreaseLength' => 'Augmenter la longueur du mot de passe',
    'psw_AvoidRepeating' => 'Éviter les caractères répétés',
    'psw_AvoidSequential' => 'Éviter les caractères séquentiels',
    'psw_AvoidCommonWords' => 'Éviter les mots courants',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Le mot de passe en cours de définition est trop simple.',
    'psw_SetPassword' => 'Définir un nouveau mot de passe',
    'psw_SetPasswordError' => 'Mot de passe - %password% ne peut pas être utilisé, il est dans le dictionnaire des mots de passe simples.',
    'psw_SetPasswordInfo' => 'Le mot de passe spécifié ne peut pas être utilisé, il est dans le dictionnaire des mots de passe simples.',
    'psw_PasswordNoNumbers' => 'Le mot de passe doit contenir des chiffres',
    'psw_PasswordNoLowSimvol' => 'Le mot de passe doit contenir des caractères minuscules',
    'psw_PasswordNoUpperSimvol' => 'Le mot de passe doit contenir des caractères majuscules',
    'psw_PasswordIsDefault' => 'Mot de passe par défaut utilisé',
    'psw_PasswordNoSpecialChars' => 'Ajouter des caractères spéciaux (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Utilisez un mélange de lettres, chiffres et symboles',
    'psw_PasswordAvoidCommon' => 'Éviter les mots et phrases courants',
    'psw_PasswordUsePassphrase' => 'Envisagez d\'utiliser une phrase de passe',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Faible',
    'psw_PasswordStrengthFair' => 'Correct',
    'psw_PasswordStrengthGood' => 'Bon',
    'psw_PasswordStrengthStrong' => 'Fort',
    'psw_PasswordStrengthVeryStrong' => 'Très Fort',
    'psw_PasswordSecurityRequiresFair' => 'Pour la sécurité, le mot de passe doit avoir au moins une force correcte',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Mot de passe',
    'psw_WebAdminPasswordRepeat' => 'Répéter la saisie du mot de passe',
    'psw_Passwords' => 'Mot de passe de l\'interface WEB',
    'psw_ValidateEmptyWebPassword' => 'Le mot de passe administrateur ne peut pas être vide',
    'psw_ValidateWeakWebPassword' => 'Le mot de passe WEB doit faire plus de 4 caractères',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Mot de passe de l\'interface web saisi incorrectement',
    
    // SSH password specific
    'psw_SSHPassword' => 'Mot de passe SSH',
    'psw_SSHPasswordRepeat' => 'Répéter la saisie du mot de passe',
    'psw_SSHDisablePasswordLogins' => 'Désactiver l\'authentification par mot de passe',
    'psw_ValidateEmptySSHPassword' => 'Le mot de passe SSH ne peut pas être vide',
    'psw_ValidateWeakSSHPassword' => 'Le mot de passe SSH doit faire plus de 4 caractères',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'Mot de passe SSH saisi incorrectement. Veuillez saisir à nouveau le mot de passe.',
];