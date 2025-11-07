# Dev Server Connection Issue

## Problem
Next.js dev server starts successfully ("✓ Ready in 2.2s") but ALL connection attempts fail:
- `curl http://localhost:3000` → Connection refused
- `curl http://localhost:8080` → Connection refused  
- Browser → ERR_CONNECTION_REFUSED
- Invoke-WebRequest → Unable to connect

## Tested Configurations
1. ❌ `next dev --turbo --hostname localhost --port 8080`
2. ❌ `next dev --turbo --port 8080`
3. ❌ `next dev --port 8080`
4. ❌ `next dev` (default port 3000)

ALL configurations show "Ready" but refuse connections.

## Possible Causes

### 1. Windows Firewall Blocking Localhost
**Test:**
```powershell
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Node*"} | Format-Table DisplayName, Enabled, Direction
```

**Fix if blocked:**
```powershell
New-NetFirewallRule -DisplayName "Node.js Dev Server" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow
```

### 2. Antivirus Software (Real-Time Protection)
- Windows Defender
- Third-party antivirus  
Check antivirus logs for blocked Node.js connections

**Temporary test:**
Disable real-time protection and try again

### 3. VPN/Proxy Interfering
**Test:**
```powershell
Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Format-Table Name, InterfaceDescription
```

**Fix:**
Disconnect VPN and try again

### 4. IPv4/IPv6 Resolution Issue
**Test:**
```powershell
# Try explicit IPv4
curl http://127.0.0.1:3000

# Try explicit IPv6
curl http://[::1]:3000
```

### 5. Port Already in Use (Hidden Process)
**Test:**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
```

### 6. Next.js Build Cache Corruption
**Fix:**
```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

### 7. Node.js Permission Issue
**Test:**
Run PowerShell as Administrator and try:
```powershell
npm run dev
```

## Recommended Actions (In Order)

### Step 1: Clean Build
```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

### Step 2: Test with Simple HTTP Server
```powershell
# Stop Next.js dev server first (Ctrl+C)
python -m http.server 3000
# Then in browser: http://localhost:3000
# If this works, problem is Next.js-specific
# If this fails, problem is system-level
```

### Step 3: Run as Administrator
Right-click PowerShell → "Run as Administrator"
```powershell
cd C:\Users\sonal\benefitsaichatbot-383
npm run dev
```

### Step 4: Check Firewall
```powershell
# Run as Administrator
Get-NetFirewallProfile | Format-Table Name, Enabled
```

### Step 5: Try Different Network Interface
```powershell
# In package.json, change to:
"dev": "next dev --hostname 0.0.0.0"
# Then access via your machine's IP address instead of localhost
```

## Alternative: Use Production Testing

Since local dev is failing, test the deployed production version:

1. **Disable Vercel Password Protection** (requires Pro plan $150/month OR):
   - Contact Vercel support to temporarily disable for testing
   - Use Vercel CLI with authentication: `vercel logs --scope melodie-s-projects`

2. **Test via Vercel Logs:**
```powershell
vercel logs --scope melodie-s-projects --follow
# Then in another terminal:
curl https://benefitsaichatbot-oq7vnewuf-melodie-s-projects.vercel.app/subdomain/chat
```

## Summary

**Most Likely Cause:** Windows Firewall or Antivirus blocking Node.js localhost connections

**Quick Test:** Run PowerShell as Administrator and try `npm run dev`

**If Still Failing:** The issue is system-level, not code-level. Consider:
1. Reboot Windows
2. Disable antivirus temporarily
3. Test from a different Windows user account
4. Use production deployment for testing instead
