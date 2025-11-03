# Azure Key Rotation - Complete Runbook
**DO NOT SKIP ANY STEP - Execute in exact order**

---

## ✅ PRE-FLIGHT VERIFICATION (MUST PASS FIRST)

```powershell
.\scripts\verify-rotation-ready.ps1
```

**Expected output:**
```
✅ ALL CHECKS PASSED - READY FOR ROTATION
```

**If any check fails**, fix it before proceeding. Do NOT continue with failures.

---

## 🔄 STEP 1: Execute Key Rotation

```powershell
.\scripts\rotate-keys-NOW.ps1
```

**What happens:**
1. Displays resource names for confirmation
2. Shows warning about invalidating current keys
3. Prompts you to type `ROTATE` to confirm
4. Regenerates all 3 Azure credentials:
   - Cosmos DB primary key
   - Redis access key
   - Storage account connection string
5. Saves new credentials to: `C:\Users\sonal\secrets\benefitsaichatbot-383\.env.production`
6. Attempts to update GitHub Secrets (if `gh` CLI installed)

**Duration:** 2-3 minutes

**⚠️ CRITICAL:** After this step, any running apps with old keys will fail!

---

## ✅ STEP 2: Verify New Keys Work

```powershell
.\scripts\test-new-keys.ps1
```

**Expected output:**
```
✅ ALL TESTS PASSED - New keys are working!
```

**If tests fail:**
- Check Azure Portal for resource status
- Verify keys were actually regenerated (check portal)
- Re-run rotation if needed

---

## 🧪 STEP 3: Test Local Development

```powershell
# Copy new .env.production to project root (for local testing only)
Copy-Item "$env:USERPROFILE\secrets\benefitsaichatbot-383\.env.production" -Destination ".env.local" -Force

# Start dev server
npm run dev
```

**Manual verification checklist:**
- [ ] App starts without errors
- [ ] Visit http://localhost:8080
- [ ] Test chat functionality (sends/receives messages)
- [ ] Check browser console - no Azure connection errors
- [ ] Stop dev server (Ctrl+C)

**Clean up:**
```powershell
# Remove .env.local immediately after testing
Remove-Item ".env.local" -Force
```

---

## 🚀 STEP 4: Update Vercel Production

### Option A: Using Vercel CLI (Recommended)

```powershell
# Pull current env vars (backup)
vercel env pull .env.vercel.backup

# Read new credentials
$envFile = Get-Content "$env:USERPROFILE\secrets\benefitsaichatbot-383\.env.production"

# Update each secret individually
vercel env add AZURE_COSMOS_KEY production
# Paste the new AZURE_COSMOS_KEY value when prompted

vercel env add REDIS_URL production
# Paste the new REDIS_URL value when prompted

vercel env add AZURE_STORAGE_CONNECTION_STRING production
# Paste the new value when prompted
```

### Option B: Vercel Dashboard (Manual)

1. Go to: https://vercel.com/dashboard
2. Select project: `benefitsaichatbot-383`
3. Settings → Environment Variables
4. Update these 3 variables (one at a time):
   - `AZURE_COSMOS_KEY`
   - `REDIS_URL`
   - `AZURE_STORAGE_CONNECTION_STRING`
5. Scope: **Production** only
6. Save changes

---

## 🔐 STEP 5: Update GitHub Secrets

### Option A: GitHub CLI (if installed)

```powershell
# Read .env.production
$envContent = Get-Content "$env:USERPROFILE\secrets\benefitsaichatbot-383\.env.production" -Raw

# Extract values (adjust if needed)
$cosmosKey = ($envContent | Select-String "AZURE_COSMOS_KEY=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
$redisUrl = ($envContent | Select-String "REDIS_URL=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
$storageConn = ($envContent | Select-String "AZURE_STORAGE_CONNECTION_STRING=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })

# Set GitHub Secrets
gh secret set AZURE_COSMOS_KEY --body "$cosmosKey"
gh secret set REDIS_URL --body "$redisUrl"
gh secret set AZURE_STORAGE_CONNECTION_STRING --body "$storageConn"
```

### Option B: GitHub Web UI (Manual)

1. Go to: https://github.com/sonalmogra28/benefitsaiAssisstantchatbot/settings/secrets/actions
2. Update these 3 secrets:
   - `AZURE_COSMOS_KEY`
   - `REDIS_URL`
   - `AZURE_STORAGE_CONNECTION_STRING`
3. Click "Update secret" for each

---

## 🧹 STEP 6: Cleanup & Verification

```powershell
# Verify no secrets in working directory
git status

# Should show ONLY:
# - scripts/verify-rotation-ready.ps1 (safe - no actual secrets)
# - scripts/test-new-keys.ps1 (safe - no actual secrets)
# - ROTATION_RUNBOOK.md (safe - this file)

# If you see .env* files, STOP and remove them:
Remove-Item .env.local -Force
Remove-Item .env.production -Force
```

**Final checklist:**
- [ ] No `.env*` files in git status
- [ ] Rotation scripts are untracked (`git check-ignore scripts/rotate-*.ps1` shows ignored)
- [ ] Vercel production updated
- [ ] GitHub Secrets updated
- [ ] Local test passed

---

## 🚨 ROLLBACK (If Something Breaks)

### If Production Fails After Rotation:

1. **Regenerate keys again** (Azure keeps old key temporarily):
   ```powershell
   # In Azure Portal, go to each resource
   # Click "Keys" or "Access Keys"
   # Click "Regenerate Secondary Key" (not Primary!)
   # Copy the SECONDARY key
   # Update Vercel/GitHub with secondary key
   ```

2. **Or restore from backup** (if you saved old keys):
   ```powershell
   # Use the .env.vercel.backup file from Step 4
   # Re-deploy old keys to Vercel temporarily
   ```

---

## 📅 NEXT ROTATION

**Quarterly rotation schedule:**
- **Q1 2026:** January 2026
- **Q2 2026:** April 2026
- **Q3 2026:** July 2026
- **Q4 2026:** October 2026

**GitHub Actions will remind you:**
- Monthly audit workflow creates issue on 1st of each month
- Quarterly reminder includes key rotation checklist

---

## 🆘 Troubleshooting

### "Type 'ROTATE' to proceed" not accepting input
- Ensure you type exactly: `ROTATE` (all caps, no quotes)

### "Access denied" errors during rotation
- Run: `az login` to re-authenticate
- Verify you have Owner/Contributor role on `benefits-chatbot-project` resource group

### Vercel deployment fails after rotation
- Check Vercel logs: `vercel logs --prod`
- Verify all 3 env vars updated (Cosmos, Redis, Storage)
- Try redeploying: `vercel --prod`

### GitHub Actions fail with 401/403 errors
- Verify GitHub Secrets updated correctly
- Check Actions → Secrets shows updated timestamp

---

## ✅ Success Criteria

You're done when:
1. ✅ All 6 pre-flight checks passed
2. ✅ Rotation completed without errors
3. ✅ Connectivity tests passed
4. ✅ Local `npm run dev` works
5. ✅ Vercel production updated
6. ✅ GitHub Secrets updated
7. ✅ No `.env*` files in `git status`
8. ✅ Production app working (test at your domain)

**Final verification URL:** https://your-domain.vercel.app
- Send a test message
- Verify chat works end-to-end
- Check Vercel logs for any Azure errors
