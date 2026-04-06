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
    'psw_GeneratePassword' => 'Gerar Senha',
    'psw_UseGenerateButton' => 'Use o botão gerar para criar uma senha segura.',
    'psw_PasswordGenerated' => 'Senha segura gerada com sucesso',
    'psw_DefaultPasswordWarning' => 'Senha padrão detectada',
    'psw_ChangeDefaultPassword' => 'Está a usar uma senha padrão. Altere-a por segurança.',
    'psw_WeakPassword' => 'Senha fraca',
    'psw_PasswordTooCommon' => 'Esta senha é muito comum e fácil de adivinhar.',
    'psw_PasswordTooShort' => 'Senha muito curta (mínimo %min% caracteres)',
    'psw_PasswordTooLong' => 'Senha muito longa (máximo %max% caracteres)',
    'psw_PasswordMinLength' => 'A senha deve conter pelo menos 8 caracteres.',
    'psw_PasswordRequirements' => 'Requisitos da senha',
    'psw_PasswordSuggestions' => 'Sugestões para melhorar a segurança da senha',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Muito Fraca',
    'psw_Weak' => 'Fraca',
    'psw_Fair' => 'Razoável',
    'psw_Good' => 'Boa',
    'psw_Strong' => 'Segura',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'A senha não pode estar vazia',
    'psw_EmptyPassword' => 'A senha não pode estar vazia',
    'psw_PasswordInDictionary' => 'Senha encontrada no dicionário de senhas comuns',
    'psw_PasswordAcceptable' => 'A senha é aceitável',
    'psw_PasswordGenerateFailed' => 'Falha ao gerar senha',
    'psw_PasswordsArrayRequired' => 'Array de senhas necessário',
    'psw_InvalidPasswordsFormat' => 'Formato de dados de senha inválido',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Adicionar letras maiúsculas',
    'psw_AddLowercase' => 'Adicionar letras minúsculas',
    'psw_AddNumbers' => 'Adicionar números',
    'psw_AddSpecialChars' => 'Adicionar caracteres especiais',
    'psw_IncreaseLength' => 'Aumentar comprimento da senha',
    'psw_AvoidRepeating' => 'Evitar caracteres repetidos',
    'psw_AvoidSequential' => 'Evitar caracteres sequenciais',
    'psw_AvoidCommonWords' => 'Evitar palavras comuns',
    
    // Password validation errors
    'psw_PasswordSimple' => 'A senha a ser definida é muito simples.',
    'psw_SetPassword' => 'Definir nova senha',
    'psw_SetPasswordError' => 'Senha - %password% não pode ser usada, está no dicionário de senhas simples.',
    'psw_SetPasswordInfo' => 'A senha especificada não pode ser usada, está no dicionário de senhas simples.',
    'psw_PasswordNoNumbers' => 'A senha deve conter números',
    'psw_PasswordNoLowSimvol' => 'A senha deve conter caracteres minúsculos',
    'psw_PasswordNoUpperSimvol' => 'A senha deve conter caracteres maiúsculos',
    'psw_PasswordIsDefault' => 'Senha padrão está a ser usada',
    'psw_PasswordNoSpecialChars' => 'Adicionar caracteres especiais (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Use uma mistura de letras, números e símbolos',
    'psw_PasswordAvoidCommon' => 'Evitar palavras e frases comuns',
    'psw_PasswordUsePassphrase' => 'Considere usar uma frase-senha',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Fraca',
    'psw_PasswordStrengthFair' => 'Razoável',
    'psw_PasswordStrengthGood' => 'Boa',
    'psw_PasswordStrengthStrong' => 'Forte',
    'psw_PasswordStrengthVeryStrong' => 'Muito Forte',
    'psw_PasswordSecurityRequiresFair' => 'Para segurança, a senha deve ter pelo menos força razoável',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Senha',
    'psw_WebAdminPasswordRepeat' => 'Repetir entrada da senha',
    'psw_Passwords' => 'Senha da interface WEB',
    'psw_ValidateEmptyWebPassword' => 'A senha do administrador não pode estar vazia',
    'psw_ValidateWeakWebPassword' => 'A senha WEB deve ter mais de 4 caracteres',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Senha da interface web inserida incorretamente',
    
    // SSH password specific
    'psw_SSHPassword' => 'Senha SSH',
    'psw_SSHPasswordRepeat' => 'Repetir entrada da senha',
    'psw_SSHDisablePasswordLogins' => 'Desativar autenticação por senha',
    'psw_ValidateEmptySSHPassword' => 'A senha SSH não pode estar vazia',
    'psw_ValidateWeakSSHPassword' => 'A senha SSH deve ter mais de 4 caracteres',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'Senha SSH inserida incorretamente. Insira a senha novamente.',
];