# Set env vars without line endings
$employeePwd = "amerivet2024!"
$adminPwd = "admin2024!"

# Using -n flag to suppress newline (doesn't work in PowerShell echo, so write directly)
$employeePwd | vercel env add EMPLOYEE_PASSWORD production --scope melodie-s-projects
$adminPwd | vercel env add ADMIN_PASSWORD production --scope melodie-s-projects
