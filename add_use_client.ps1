 = @("app\page.tsx", "app\help\page.tsx", "app\settings\page.tsx", "components\FaqAccordion.tsx")
foreach ( in ) {
     = Get-Content  -Raw
    if ( -notmatch '^"use client";') {
         = ""use client";
" + 
        [IO.File]::WriteAllText((Get-Item ).FullName, , [Text.Encoding]::UTF8)
    }
}
