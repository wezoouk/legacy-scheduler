$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aGFueWx5d3NkZWJsaGViaWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3NDQ1NzUsImV4cCI6MjA0MjMyMDU3NX0.yy9dHy_TA8CWqCcJdnpH8XjL0Y2uOsWQsLb3SN7A2iU"
    "Content-Type" = "application/json"
}

$body = "{}"

Write-Host "Testing DMS Edge Function..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "https://cvhanylywsdeblhebicj.supabase.co/functions/v1/process-scheduled-messages" -Method Post -Headers $headers -Body $body

Write-Host "Response:" -ForegroundColor Green
$response | ConvertTo-Json -Depth 10

