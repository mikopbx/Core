<?php
return [
    // General errors
    'pk_InvalidRequest' => 'Invalid request',

    // Authentication errors
    'pk_LoginRequired' => 'Login is required',
    'pk_OriginRequired' => 'Origin is required for WebAuthn',
    'pk_NoPasskeysFound' => 'No passkeys found for this login',
    'pk_ChallengeIdRequired' => 'Challenge ID is required',
    'pk_CredentialIdRequired' => 'Credential ID is required',
    'pk_ChallengeNotFound' => 'Challenge not found or expired',
    'pk_PasskeyNotFound' => 'Passkey not found',
    'pk_LoginMismatch' => 'Login mismatch',
    'pk_SessionBuildFailed' => 'Failed to build session parameters',

    // Registration errors
    'pk_SessionIdRequired' => 'Session ID is required',
    'pk_UserNotAuthenticated' => 'User not authenticated',

    // CRUD errors
    'pk_PasskeyIdRequired' => 'Passkey ID is required',
    'pk_PasskeyNotFoundOrDenied' => 'Passkey not found or access denied',
    'pk_NameRequired' => 'Passkey name is required',

    // Success messages
    'pk_PasskeyDeleted' => 'Passkey successfully deleted',
    'pk_PasskeyUpdated' => 'Passkey successfully updated',

        // Passkeys section
        'pk_PasskeysTitle' => 'Passkeys (biometric authentication)',
        'pk_PasskeysDescription' => 'Passkeys allow you to sign in using biometrics (Face ID, Touch ID, Windows Hello) or a hardware security key.',
        'Passkeys' => 'Passkeys are a modern passwordless authentication method. Use biometrics or hardware keys for quick and secure sign-in.',
        'pk_AddPasskey' => 'Add Passkey',
        'pk_NoPasskeys' => 'Here will be your Passkeys',
        'pk_EmptyDescription' => 'Passkeys allow you to sign in without a password using biometrics (Face ID, Touch ID, Windows Hello) or a hardware security key (YubiKey). It\'s faster and more secure than traditional passwords.',
        'pk_ReadDocs' => 'Read documentation',
    
        // Table columns
        'pk_ColumnName' => 'Name',
        'pk_ColumnCreated' => 'Created',
        'pk_ColumnLastUsed' => 'Last Used',
        'pk_ColumnActions' => 'Actions',
    
        // Actions
        'pk_Rename' => 'Rename',
        'pk_Delete' => 'Delete',
        'pk_DeleteConfirm' => 'Are you sure you want to delete this Passkey?',
    
        // Registration dialog
        'pk_RegisterTitle' => 'Register new Passkey',
        'pk_RegisterName' => 'Name (e.g.: iPhone 15, YubiKey)',
        'pk_RegisterButton' => 'Register',
        'pk_RegisterCancel' => 'Cancel',
        'pk_RegisterProcessing' => 'Follow the on-screen instructions to complete registration...',
    
        // Messages
        'pk_RegisterSuccess' => 'Passkey registered successfully',
        'pk_RegisterError' => 'Error registering Passkey',
        'pk_RegisterCancelled' => 'Passkey registration was cancelled',
        'pk_DeleteSuccess' => 'Passkey deleted successfully',
        'pk_DeleteError' => 'Error deleting Passkey',
        'pk_RenameSuccess' => 'Passkey renamed successfully',
        'pk_RenameError' => 'Error renaming Passkey',
        'pk_NotSupported' => 'Your browser does not support Passkeys',
    
        // Login page
        'pk_LoginButton' => 'Sign in with Passkey',
        'pk_LoginOr' => 'or',
        'pk_LoginProcessing' => 'Signing in with Passkey...',
        'pk_LoginError' => 'Error signing in with Passkey',
        'pk_LoginNoPasskeys' => 'No registered Passkeys for this user',
];
