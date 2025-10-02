# PowerShell script to test the Edge Function
# Run this after waiting for the DMS to be overdue

Write-Host "Testing Edge Function..." -ForegroundColor Yellow

$response = Invoke-RestMethod -Uri "https://cvhanylywsdeblhebicj.supabase.co/functions/v1/process-scheduled-messages" `
  -Method Post `
  -Headers @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aGFueWx5d3NkZWJsaGViaWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MjQ3MjQsImV4cCI6MjA3NDIwMDcyNH0._nA5MbOSQciz-Xy_zv6Z-IIb0ssrY5ZLVqBtaVoDRM4"
    "Content-Type" = "application/json"
  } `
  -Body "{}"

Write-Host "`nEdge Function Result:" -ForegroundColor Cyan
$response | ConvertTo-Json -Depth 10

if ($response.processed -gt 0) {
  Write-Host "`n✅ SUCCESS! Processed $($response.processed) message(s)" -ForegroundColor Green
} elseif ($response.errors -gt 0) {
  Write-Host "`n❌ ERRORS! $($response.errors) error(s) occurred" -ForegroundColor Red
} else {
  Write-Host "`n⚠️  No messages processed. Either nothing is overdue or there's an issue." -ForegroundColor Yellow
}

