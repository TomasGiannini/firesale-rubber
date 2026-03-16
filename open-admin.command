#!/bin/bash
# Double-click this file to open the admin dashboard

cd "$(dirname "$0")"
echo "Starting admin server at http://localhost:8765/admin.html"
echo "Press Ctrl+C to stop."

# Open browser after short delay
(sleep 1 && open "http://localhost:8765/admin.html") &

# Start server
python3 -m http.server 8765
