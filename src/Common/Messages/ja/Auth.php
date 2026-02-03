<?php
return [
    'rest_auth_LogoutDesc' => 'データベースからリフレッシュトークンを削除し、Cookieをクリアしてください。JWTアクセストークンは15分後に自然に期限切れになります。',
    /**
     * Parameters
     */
    'rest_param_auth_login' => '認証のためのユーザーログイン',
    'rest_param_auth_password' => 'ユーザーのパスワード',
    'rest_param_auth_sessionToken' => 'パスキー認証からのワンタイムセッショントークン（64桁の16進数）',
    'rest_param_auth_rememberMe' => 'ログイン情報を記憶する（リフレッシュトークンを延長）',
    'rest_param_auth_refreshToken' => 'アクセス トークンを更新するには、httpOnly Cookie からトークンを更新します。',
    'rest_param_auth_clientIp' => 'デバイス追跡用のクライアント IP アドレス',
    'rest_param_auth_userAgent' => 'ブラウザ/デバイス追跡アプリのユーザーエージェント',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'リクエストを承認するための JWT アクセス トークン (有効期間 15 分)',
    'rest_schema_auth_tokenType' => 'Authorization ヘッダーのトークン タイプ (常に "Bearer")',
    'rest_schema_auth_expiresIn' => 'アクセストークンの有効期限（秒）',
    'rest_schema_auth_login' => '承認されたユーザーのログイン',
    'rest_schema_auth_message' => '操作結果に関するメッセージ',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => '認証に成功しました。アクセス トークンが返され、リフレッシュ トークン クッキーが設定されました。',
    'rest_response_200_auth_refresh' => 'アクセストークンは正常に更新されました。リフレッシュトークンがローテーションされている可能性があります。',
    'rest_response_200_auth_logout' => '正常に終了しました。リフレッシュトークンはデータベースから削除され、Cookieはクリアされました。',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'ログイン試行回数が多すぎます。{interval} 秒後にもう一度お試しください。',
    'auth_WrongLoginPassword' => 'ログインまたはパスワードが間違っています',
    'auth_TokenSaveFailed' => 'トークンをデータベースに保存中にエラーが発生しました',
    'auth_RefreshTokenMissing' => 'クッキーからリフレッシュトークンが見つかりません',
    'auth_RefreshTokenInvalid' => '無効なリフレッシュトークン',
    'auth_RefreshTokenExpired' => 'リフレッシュトークンの有効期限が切れているか、見つかりません',
    'auth_InvalidSessionData' => '無効なセッションデータ',
    'auth_TokenUpdateFailed' => 'トークン更新エラー',
    'rest_response_401_invalid_credentials' => '資格情報が正しくありません',
    'rest_response_401_invalid_token' => '無効なトークン',
    'rest_response_403_token_expired' => 'トークンの有効期限が切れました',
    'rest_response_429_too_many_requests' => 'リクエストが多すぎます',
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'ユーザー認証',
    'rest_auth_LoginDesc' => 'ユーザー認証とJWTトークンの発行。パスワード（ログイン+パスワード）とパスキー（WebAuthnのセッショントークン）の2つの方法をサポートします。アクセストークン（JWT、15分）を返し、httpOnly Cookie（30日間）にリフレッシュトークンを設定します。',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'アクセストークンを更新する',
    'rest_auth_RefreshDesc' => 'Cookie から取得したリフレッシュトークンを使用して、JWT アクセストークンを更新します。セキュリティ強化のため、リフレッシュトークンをローテーションすることもできます。',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'ログアウト',
    'auth_LoginPasswordRequired' => 'login+password または sessionToken を指定する必要があります',
];
