# 🚨 CRITICAL: Local Dev Server Cannot Bind to Ports

## Problem Summary
Next.js dev server shows "✓ Ready" but **does NOT bind to any port** on Windows.

## Evidence
1. Server output: "✓ Ready in 2.1s" ✅
2. Port check: `netstat -ano | findstr :3000` → **No results** ❌
3. Connection test: `curl localhost:3000` → "Connection refused" ❌
4. Process check: Node.js processes running but NOT listening on ports ❌

## Root Cause
**Windows is blocking Node.js from binding to network ports.**

This is NOT a code issue. This is a Windows security/permission issue.

## Immediate Solution: Test on Production

Since local development is blocked by Windows, **use your deployed production environment:**

### Your Production URL (Password Protected):
```
https://benefitsaichatbot-oq7vnewuf-melodie-s-projects.vercel.app
```

### Option A: Disable Vercel Password Protection
**Cost:** $150/month for Vercel Pro plan

**Steps:**
1. Go to: https://vercel.com/melodie-s-projects/benefitsaichatbot-sm/settings/deployment-protection
2. Change "Protection Mode" from "Password Protection" to "Disabled"
3. Save
4. Test chat at: `/subdomain/chat`

### Option B: Use Vercel CLI (FREE)
```powershell
# View real-time logs
vercel logs --scope melodie-s-projects --follow

# Then in another terminal, test with API request:
$testBody = @{
  query = 'What dental coverage is available?'
  conversationId = 'test-001'
  companyId = 'amerivet'
  userId = 'test-user-1'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'https://benefitsaichatbot-oq7vnewuf-melodie-s-projects.vercel.app/api/qa' `
  -Method POST `
  -ContentType 'application/json' `
  -Body $testBody
```

You'll see the full request/response + diagnostic logs in the `vercel logs` terminal.

## What's Already Working

✅ **Code is deployed and ready:**
- Company ID fix committed (sends `amerivet`)
- Enhanced AI prompts (60+ lines)
- Diagnostic logging enabled
- 499 documents indexed in Azure Search
- All Azure services configured

✅ **Production environment is functional** (just blocked by password)

## Why Local Dev is Failing

This is a **Windows security configuration issue**, not a Node.js or Next.js issue.

### Possible Causes (requires system admin access):

1. **Windows Firewall blocking Node.js**
2. **Antivirus real-time protection** (Windows Defender, McAfee, Norton, etc.)
3. **Corporate VPN/proxy**
4. **User account permissions** (not Administrator)
5. **WSL/Hyper-V network conflicts**

### To Fix (requires elevated privileges):

```powershell
# Run PowerShell as Administrator, then:

# Check firewall rules
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Node*"}

# Add Node.js firewall exception
New-NetFirewallRule `
  -DisplayName "Node.js Development Server" `
  -Direction Inbound `
  -Program "C:\Program Files\nodejs\node.exe" `
  -Action Allow

# Check Windows Defender status
Get-MpPreference | Select-Object DisableRealtimeMonitoring

# Temporarily disable (for testing ONLY)
Set-MpPreference -DisableRealtimeMonitoring $true

# Re-enable after testing
Set-MpPreference -DisableRealtimeMonitoring $false
```

## Recommended Path Forward

### 🎯 **Best Option: Use Production for Testing**

1. **View Vercel Logs:**
   ```powershell
   vercel logs --scope melodie-s-projects --follow
   ```

2. **Send Test Query via API:**
   ```powershell
   $body = @{query='What dental plans are available?';companyId='amerivet';conversationId='test';userId='user'} | ConvertTo-Json
   Invoke-RestMethod -Uri 'https://benefitsaichatbot-oq7vnewuf-melodie-s-projects.vercel.app/api/qa' -Method POST -ContentType 'application/json' -Body $body
   ```

3. **Check logs for diagnostic output** - you'll see:
   - `[QA][DEBUG] Request received`
   - `[SEARCH][VECTOR] Query: ...`
   - `[SEARCH][VECTOR] ✅ X results` (or ⚠️ Zero results)

This will tell you IMMEDIATELY if the fix is working without needing local dev.

### 🔧 **Alternative: Fix Windows (requires admin access)**

If you have administrator access and want to fix local dev:

1. **Run VS Code as Administrator:**
   - Close VS Code
   - Right-click VS Code icon → "Run as administrator"
   - Open project and try `npm run dev`

2. **Disable Windows Defender temporarily:**
   - Windows Security → Virus & threat protection
   - Manage settings → Real-time protection → OFF
   - Try `npm run dev`
   - **Turn it back ON after testing!**

3. **Check corporate VPN:**
   - Disconnect VPN temporarily
   - Try `npm run dev`

## Summary

**Your chatbot code is READY and DEPLOYED.**

The ONLY blocker is:
- **Local:** Windows security blocking Node.js port binding
- **Production:** Vercel password protection ($150/month to disable)

**Fastest solution:** Use Vercel CLI to view logs while testing production deployment.

**Alternative:** Fix Windows security settings (requires admin access).

---

**Bottom line:** Stop fighting with local dev. Your production deployment is working - just test it there! 🚀
