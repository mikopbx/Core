<?php
return [
    'rest_schema_auth_login' => 'ავტორიზებული მომხმარებლის შესვლა',
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'მომხმარებლის ავტორიზაცია',
    'rest_auth_LoginDesc' => 'მომხმარებლის ავტორიზაცია და JWT ტოკენების გაცემა. მხარს უჭერს ორ მეთოდს: პაროლი (login+password) და პაროლის გასაღები (sessionToken WebAuthn-დან). აბრუნებს accessToken-ს (JWT, 15 წუთი) და ათავსებს refreshToken-ს httpOnly ქუქი-ფაილში (30 დღე).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'წვდომის ტოკენის განახლება',
    'rest_auth_RefreshDesc' => 'განაახლებს JWT წვდომის ტოკენს ქუქი-ფაილიდან მიღებული განახლების ტოკენის გამოყენებით. უსაფრთხოების გაზრდის მიზნით, სურვილისამებრ, აბრუნებს განახლების ტოკენს.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'გასვლა',
    'rest_auth_LogoutDesc' => 'წაშალეთ განახლების ტოკენი მონაცემთა ბაზიდან და გაასუფთავეთ ქუქი-ფაილი. JWT წვდომის ტოკენი ბუნებრივად იწურება 15 წუთის შემდეგ.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'მომხმარებლის შესვლა ავტორიზაციისთვის',
    'rest_param_auth_password' => 'Მომხმარებლის პაროლი',
    'rest_param_auth_sessionToken' => 'ერთჯერადი სესიის ტოკენი პაროლის ავთენტიფიკაციიდან (64 თექვსმეტობითი სიმბოლო)',
    'rest_param_auth_rememberMe' => 'დამიმახსოვრე (გაახანგრძლივე განახლების ტოკენი)',
    'rest_param_auth_refreshToken' => 'წვდომის ტოკენის განახლებისთვის განაახლეთ httpOnly ქუქი-ფაილის ტოკენი',
    'rest_param_auth_clientIp' => 'კლიენტის IP მისამართი მოწყობილობის თვალთვალისთვის',
    'rest_param_auth_userAgent' => 'ბრაუზერის/მოწყობილობის თვალთვალის აპლიკაციის მომხმარებლის აგენტი',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'JWT წვდომის ნიშანი მოთხოვნების ავტორიზაციისთვის (მოქმედებს 15 წუთის განმავლობაში)',
    'rest_schema_auth_tokenType' => 'ავტორიზაციის სათაურის ტოკენის ტიპი (ყოველთვის "მატარებელი")',
    'rest_schema_auth_expiresIn' => 'წვდომის ტოკენის ვადის გასვლამდე დრო წამებში',
    'rest_schema_auth_message' => 'შეტყობინება ოპერაციის შედეგის შესახებ',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'ავტორიზაცია წარმატებით დასრულდა. დაბრუნებულია წვდომის ნიშანი და დაყენებულია განახლების ტოკენის ქუქი.',
    'rest_response_200_auth_refresh' => 'წვდომის ტოკენი წარმატებით განახლდა. შესაძლოა, განახლების ტოკენი შეცვლილიყო.',
    'rest_response_200_auth_logout' => 'წარმატებით დასრულდა გასვლა. განახლების ტოკენი წაიშალა მონაცემთა ბაზიდან და ქუქი-ფაილი წაიშალა.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'ძალიან ბევრი შესვლის მცდელობა. სცადეთ ხელახლა {interval} წამში.',
    'auth_LoginPasswordRequired' => 'თქვენ უნდა მიუთითოთ შესვლა+პაროლი ან სესიის ტოკენი',
    'auth_WrongLoginPassword' => 'არასწორი შესვლა ან პაროლი',
    'auth_TokenSaveFailed' => 'შეცდომა ტოკენის მონაცემთა ბაზაში შენახვისას მოხდა. მოხდა შეცდომა.',
    'auth_RefreshTokenMissing' => 'ქუქი-ფაილს განახლების ტოკენი აკლია',
    'auth_RefreshTokenInvalid' => 'არასწორი განახლების ტოკენი',
    'auth_RefreshTokenExpired' => 'განახლების ტოკენი ვადაგასულია ან ვერ მოიძებნა',
    'auth_InvalidSessionData' => 'არასწორი სესიის მონაცემები',
    'auth_TokenUpdateFailed' => 'ტოკენის განახლების შეცდომა',
    'rest_response_401_invalid_credentials' => 'არასწორი ავტორიზაციის მონაცემები',
    'rest_response_401_invalid_token' => 'არასწორი ტოკენი',
    'rest_response_403_token_expired' => 'ტოკენის ვადა ამოიწურა',
    'rest_response_429_too_many_requests' => 'ძალიან ბევრი მოთხოვნაა',
];
