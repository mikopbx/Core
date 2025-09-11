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
    'psw_GeneratePassword' => 'Generar Contraseña',
    'psw_UseGenerateButton' => 'Use el botón de generar para crear una contraseña segura.',
    'psw_PasswordGenerated' => 'Contraseña segura generada exitosamente',
    'psw_DefaultPasswordWarning' => 'Contraseña predeterminada detectada',
    'psw_ChangeDefaultPassword' => 'Está usando una contraseña predeterminada. Cámbiela por seguridad.',
    'psw_WeakPassword' => 'Contraseña débil',
    'psw_PasswordTooCommon' => 'Esta contraseña es demasiado común y fácil de adivinar.',
    'psw_PasswordTooShort' => 'Contraseña demasiado corta (mínimo %min% caracteres)',
    'psw_PasswordTooLong' => 'Contraseña demasiado larga (máximo %max% caracteres)',
    'psw_PasswordMinLength' => 'La contraseña debe contener al menos 8 caracteres.',
    'psw_PasswordRequirements' => 'Requisitos de contraseña',
    'psw_PasswordSuggestions' => 'Sugerencias para mejorar la seguridad de la contraseña',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Muy Débil',
    'psw_Weak' => 'Débil',
    'psw_Fair' => 'Regular',
    'psw_Good' => 'Buena',
    'psw_Strong' => 'Segura',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'La contraseña no puede estar vacía',
    'psw_EmptyPassword' => 'La contraseña no puede estar vacía',
    'psw_PasswordInDictionary' => 'Contraseña encontrada en el diccionario de contraseñas comunes',
    'psw_PasswordAcceptable' => 'La contraseña es aceptable',
    'psw_PasswordGenerateFailed' => 'Error al generar contraseña',
    'psw_PasswordsArrayRequired' => 'Se requiere matriz de contraseñas',
    'psw_InvalidPasswordsFormat' => 'Formato de datos de contraseña inválido',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Agregar letras mayúsculas',
    'psw_AddLowercase' => 'Agregar letras minúsculas',
    'psw_AddNumbers' => 'Agregar números',
    'psw_AddSpecialChars' => 'Agregar caracteres especiales',
    'psw_IncreaseLength' => 'Aumentar longitud de la contraseña',
    'psw_AvoidRepeating' => 'Evitar caracteres repetidos',
    'psw_AvoidSequential' => 'Evitar caracteres secuenciales',
    'psw_AvoidCommonWords' => 'Evitar palabras comunes',
    
    // Password validation errors
    'psw_PasswordSimple' => 'La contraseña que se está configurando es demasiado simple.',
    'psw_SetPassword' => 'Configurar nueva contraseña',
    'psw_SetPasswordError' => 'Contraseña - %password% no se puede usar, está en el diccionario de contraseñas simples.',
    'psw_SetPasswordInfo' => 'La contraseña especificada no se puede usar, está en el diccionario de contraseñas simples.',
    'psw_PasswordNoNumbers' => 'La contraseña debe contener números',
    'psw_PasswordNoLowSimvol' => 'La contraseña debe contener caracteres en minúsculas',
    'psw_PasswordNoUpperSimvol' => 'La contraseña debe contener caracteres en mayúsculas',
    'psw_PasswordIsDefault' => 'Se está usando contraseña predeterminada',
    'psw_PasswordNoSpecialChars' => 'Agregar caracteres especiales (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Use una mezcla de letras, números y símbolos',
    'psw_PasswordAvoidCommon' => 'Evitar palabras y frases comunes',
    'psw_PasswordUsePassphrase' => 'Considere usar una frase de contraseña',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Débil',
    'psw_PasswordStrengthFair' => 'Regular',
    'psw_PasswordStrengthGood' => 'Buena',
    'psw_PasswordStrengthStrong' => 'Fuerte',
    'psw_PasswordStrengthVeryStrong' => 'Muy Fuerte',
    'psw_PasswordSecurityRequiresFair' => 'Para la seguridad, la contraseña debe tener al menos fuerza regular',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Contraseña',
    'psw_WebAdminPasswordRepeat' => 'Repetir entrada de contraseña',
    'psw_Passwords' => 'Contraseña de la interfaz WEB',
    'psw_ValidateEmptyWebPassword' => 'La contraseña de administración no puede estar vacía',
    'psw_ValidateWeakWebPassword' => 'La contraseña WEB debe ser mayor a 4 caracteres',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Contraseña de la interfaz web ingresada incorrectamente',
    
    // SSH password specific
    'psw_SSHPassword' => 'Contraseña SSH',
    'psw_SSHPasswordRepeat' => 'Repetir entrada de contraseña',
    'psw_SSHDisablePasswordLogins' => 'Desactivar autenticación por contraseña',
    'psw_ValidateEmptySSHPassword' => 'La contraseña SSH no puede estar vacía',
    'psw_ValidateWeakSSHPassword' => 'La contraseña SSH debe ser mayor a 4 caracteres',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'Contraseña SSH ingresada incorrectamente. Ingrese la contraseña nuevamente.',
];