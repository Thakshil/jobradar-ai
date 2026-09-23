# JobRadar load test runner — sets PYTHONIOENCODING to avoid Windows cp1252 issue in job_search.py
$env:PYTHONIOENCODING = "utf-8"
Write-Host "[JobRadar] Starting load test..."
Write-Host "[JobRadar] FastAPI must be running at http://127.0.0.1:8000"
Write-Host ""
python -m locust -f tests/load/locustfile.py --host http://127.0.0.1:8000 @args
