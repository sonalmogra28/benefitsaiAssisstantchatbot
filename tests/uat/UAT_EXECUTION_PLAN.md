# UAT Execution Plan - AmeriVet Benefits AI

**Date:** November 3, 2025  
**Tester:** Sonal (Developer QA)  
**Environment:** Production (amerivetaibot.bcgenrolls.com)  
**Objective:** Validate all critical workflows before client handoff

---

## ⚠️ LESSONS LEARNED FROM PAST MISTAKES

### Critical Mistakes to AVOID:
1. ❌ **Module-scope Azure client initialization** → Always use lazy initialization with `isBuild()` guards
2. ❌ **Default vs Named exports** → Always verify import statements match export type
3. ❌ **Testing without real data** → Always validate with production-like data
4. ❌ **Skipping build validation** → Always run `npm run build` before testing
5. ❌ **Ignoring TypeScript errors** → Always run `npm run typecheck` first
6. ❌ **Not checking logs** → Always monitor Application Insights during testing
7. ❌ **Assuming cache works** → Always test cache hit/miss scenarios
8. ❌ **Forgetting rate limits** → Always test rate limiting behavior
9. ❌ **Not testing edge cases** → Always test off-topic, special chars, long queries
10. ❌ **Skipping mobile testing** → Always test responsive design

---

## 🎯 Pre-UAT Checklist (DO FIRST!)

### 1. Code Quality Gates
```bash
# Run ALL checks before starting UAT
npm run typecheck          # TypeScript strict validation
npm run lint              # ESLint checks
npm run build             # Production build (catches runtime issues)
npm run test              # Unit/integration tests
```

**Expected Results:**
- ✅ Zero TypeScript errors
- ✅ Zero ESLint errors
- ✅ Build completes successfully
- ✅ All tests pass

### 2. Environment Validation
```bash
# Verify production environment
npm run verify:production
```

**Check for:**
- ✅ All required env vars set in Vercel
- ✅ Azure services accessible (Cosmos, OpenAI, Redis)
- ✅ SSL certificate valid
- ✅ DNS resolution correct

### 3. Data Validation
```bash
# Verify data loaded and embeddings generated
npm run validate:embeddings

# Or use API endpoint:
# GET https://amerivetaibot.bcgenrolls.com/api/admin/validate-data
```

**Expected:**
- ✅ All containers have data
- ✅ All documents have embeddings (1536 dims)
- ✅ Zero failed chunks

### 4. Health Check
```bash
# Test health endpoints
curl https://amerivetaibot.bcgenrolls.com/api/health
curl https://amerivetaibot.bcgenrolls.com/api/ready
```

**Expected:**
- ✅ Status 200 OK
- ✅ All services operational
- ✅ Response time < 1s

---

## 📋 UAT Test Scenarios

### Scenario 1: Employee Login & Basic Q&A
**Priority:** 🔴 Critical  
**Role:** Employee  
**Duration:** 10 minutes

#### Test Steps:
1. **Navigate to login page**
   - URL: https://amerivetaibot.bcgenrolls.com/subdomain/login
   - ✅ Verify: AmeriVet logo visible
   - ✅ Verify: Employee/Admin password fields shown
   - ✅ Verify: Feature descriptions displayed

2. **Login as Employee**
   - Enter password: `amerivet2024!`
   - Click "Sign In"
   - ✅ Verify: Redirected to chat interface
   - ✅ Verify: No console errors (F12 DevTools)
   - ✅ Verify: Chat interface loads < 2s

3. **Ask Simple Question (L1 Tier)**
   - Query: "What is my medical deductible?"
   - ✅ Verify: Response received < 2s
   - ✅ Verify: Answer cites source document
   - ✅ Verify: Grounding score ≥ 70%
   - ✅ Verify: Citation link works
   - ✅ Verify: No PII in response

4. **Ask Complex Question (L2 Tier)**
   - Query: "Compare dental PPO vs HMO plans for a family of 4"
   - ✅ Verify: Response received < 3s
   - ✅ Verify: Multiple documents cited
   - ✅ Verify: Comparison table shown
   - ✅ Verify: Accurate plan details

5. **Test Cache Hit (L0)**
   - Repeat: "What is my medical deductible?"
   - ✅ Verify: Response received < 5ms
   - ✅ Verify: Same answer as before
   - ✅ Verify: Cache indicator shown (if implemented)

6. **View Conversation History**
   - Click "History" or sidebar
   - ✅ Verify: Previous questions visible
   - ✅ Verify: Can reload past conversations
   - ✅ Verify: Timestamps accurate

7. **Download Document**
   - Click citation link
   - ✅ Verify: Document preview opens
   - ✅ Verify: Download button works
   - ✅ Verify: Correct PDF/file downloads

8. **Logout**
   - Click logout button
   - ✅ Verify: Redirected to login page
   - ✅ Verify: Session cleared
   - ✅ Verify: Can't access chat without re-login

**Pass Criteria:**
- All steps ✅ pass
- Zero console errors
- Response times within SLA
- Accurate answers with citations

---

### Scenario 2: Admin Dashboard & Document Management
**Priority:** 🔴 Critical  
**Role:** Admin  
**Duration:** 15 minutes

#### Test Steps:
1. **Login as Admin**
   - URL: https://amerivetaibot.bcgenrolls.com/subdomain/login
   - Password: `admin2024!`
   - ✅ Verify: Redirected to admin dashboard
   - ✅ Verify: Admin menu visible

2. **View Analytics Dashboard**
   - Navigate to: `/admin/analytics`
   - ✅ Verify: User session chart loads
   - ✅ Verify: Query volume metrics visible
   - ✅ Verify: Token consumption breakdown shown
   - ✅ Verify: Cost estimates calculated
   - ✅ Verify: Data refreshes (last 24h)

3. **Upload New Document**
   - Navigate to: `/admin/documents`
   - Click "Upload Document"
   - Upload: Test PDF (benefits guide)
   - ✅ Verify: File validation (max 10MB, PDF/DOCX only)
   - ✅ Verify: Upload progress indicator
   - ✅ Verify: Success confirmation
   - ✅ Verify: Document appears in list

4. **Generate Embeddings**
   - Select uploaded document
   - Click "Generate Embeddings"
   - ✅ Verify: Processing starts
   - ✅ Verify: Progress indicator shown
   - ✅ Verify: Completion notification
   - ✅ Verify: Embeddings count updated

5. **View User Management**
   - Navigate to: `/admin/users`
   - ✅ Verify: User list loads
   - ✅ Verify: Can filter by role
   - ✅ Verify: User details visible

6. **View Conversation Logs**
   - Navigate to: `/admin/conversations`
   - ✅ Verify: All conversations listed
   - ✅ Verify: Can view conversation details
   - ✅ Verify: Grounding scores shown
   - ✅ Verify: Tier used (L1/L2/L3) displayed

7. **Test Search Functionality**
   - Ask question as admin
   - ✅ Verify: Same RAG pipeline as employee
   - ✅ Verify: Admin has access to all features

**Pass Criteria:**
- All admin features functional
- Document upload/embedding pipeline works
- Analytics data accurate
- No permission issues

---

### Scenario 3: Edge Cases & Error Handling
**Priority:** 🟡 High  
**Role:** Employee  
**Duration:** 10 minutes

#### Test Steps:
1. **Off-Topic Question**
   - Query: "What's the weather today?"
   - ✅ Verify: Polite redirect message
   - ✅ Verify: No hallucinated answer
   - ✅ Verify: Suggests benefits-related questions

2. **Question with No Answer in Docs**
   - Query: "What is the policy for pet insurance?"
   - ✅ Verify: Honest "not found" response
   - ✅ Verify: Suggests contacting HR
   - ✅ Verify: No fabricated information

3. **Very Long Question (500+ chars)**
   - Query: [Long detailed scenario about multiple benefit changes]
   - ✅ Verify: Question accepted
   - ✅ Verify: Response addresses all parts
   - ✅ Verify: No truncation errors

4. **Special Characters & Emojis**
   - Query: "What's my 401(k) match? 💰📈"
   - ✅ Verify: Special chars handled correctly
   - ✅ Verify: Emojis don't break parser
   - ✅ Verify: Accurate response

5. **Rapid-Fire Questions**
   - Ask 5 questions in quick succession
   - ✅ Verify: All responses returned
   - ✅ Verify: No race conditions
   - ✅ Verify: Responses in correct order

6. **Rate Limiting Test**
   - Attempt 10+ login failures
   - ✅ Verify: Rate limit triggered (3 attempts/15min)
   - ✅ Verify: Clear error message
   - ✅ Verify: Lockout expires after 15 min

7. **Browser Back/Forward**
   - Navigate chat → history → back → forward
   - ✅ Verify: No state loss
   - ✅ Verify: No duplicate messages
   - ✅ Verify: Smooth navigation

8. **Session Timeout**
   - Leave session idle for 30 minutes
   - Try to send message
   - ✅ Verify: Session expired message
   - ✅ Verify: Redirect to login
   - ✅ Verify: Conversation state preserved after re-login

**Pass Criteria:**
- All edge cases handled gracefully
- No crashes or 500 errors
- User-friendly error messages
- Security measures active

---

### Scenario 4: Performance & Responsiveness
**Priority:** 🟡 High  
**Role:** Employee  
**Duration:** 15 minutes

#### Test Steps:
1. **Desktop Testing (Chrome)**
   - Screen: 1920x1080
   - ✅ Verify: Chat interface responsive
   - ✅ Verify: Images/logos render correctly
   - ✅ Verify: No horizontal scroll
   - ✅ Verify: Fonts readable

2. **Mobile Testing (iOS Safari)**
   - Screen: 375x812 (iPhone 13)
   - ✅ Verify: Login page mobile-friendly
   - ✅ Verify: Chat input expandable
   - ✅ Verify: Messages readable
   - ✅ Verify: Touch targets ≥ 44px
   - ✅ Verify: No zoom issues

3. **Mobile Testing (Android Chrome)**
   - Screen: 412x915 (Pixel 6)
   - ✅ Verify: Same as iOS checks
   - ✅ Verify: Keyboard doesn't cover input
   - ✅ Verify: Smooth scrolling

4. **Tablet Testing (iPad)**
   - Screen: 768x1024
   - ✅ Verify: Layout adapts correctly
   - ✅ Verify: Sidebar behavior appropriate

5. **Core Web Vitals**
   - Use Lighthouse (F12 → Lighthouse)
   - ✅ Verify: LCP < 2.5s (Largest Contentful Paint)
   - ✅ Verify: FID < 100ms (First Input Delay)
   - ✅ Verify: CLS < 0.1 (Cumulative Layout Shift)
   - ✅ Verify: Performance score ≥ 90

6. **Network Throttling (Slow 3G)**
   - F12 → Network → Slow 3G
   - ✅ Verify: Page loads < 10s
   - ✅ Verify: Loading indicators shown
   - ✅ Verify: No timeout errors

7. **Concurrent Users (Load Test)**
   ```bash
   npm run load:test
   ```
   - ✅ Verify: 50 concurrent users supported
   - ✅ Verify: Avg response time < 3s
   - ✅ Verify: Zero 500 errors
   - ✅ Verify: Cache hit rate > 40%

**Pass Criteria:**
- Mobile/tablet fully functional
- Core Web Vitals meet targets
- Load testing passes
- No performance degradation

---

### Scenario 5: Browser Compatibility
**Priority:** 🟢 Medium  
**Role:** Employee  
**Duration:** 10 minutes

#### Test Steps:
1. **Chrome (Latest)**
   - Version: 119+
   - ✅ Verify: Full functionality
   - ✅ Verify: No console errors

2. **Safari (Latest)**
   - Version: 17+
   - ✅ Verify: Full functionality
   - ✅ Verify: WebKit-specific issues resolved

3. **Edge (Latest)**
   - Version: 119+
   - ✅ Verify: Full functionality
   - ✅ Verify: Chromium compatibility

4. **Firefox (Latest)**
   - Version: 120+
   - ✅ Verify: Full functionality
   - ✅ Verify: CSS Grid/Flexbox render correctly

**Pass Criteria:**
- Works on all 4 major browsers
- Consistent UI/UX across browsers
- No browser-specific bugs

---

### Scenario 6: Security & Privacy
**Priority:** 🔴 Critical  
**Role:** Security Auditor  
**Duration:** 15 minutes

#### Test Steps:
1. **HTTPS Enforcement**
   - Try: http://amerivetaibot.bcgenrolls.com
   - ✅ Verify: Redirects to HTTPS
   - ✅ Verify: SSL certificate valid
   - ✅ Verify: No mixed content warnings

2. **Authentication Bypass Attempt**
   - Try accessing: `/admin` without login
   - ✅ Verify: Redirected to login
   - ✅ Verify: No data exposed

3. **Password Security**
   - Check password requirements
   - ✅ Verify: Passwords hashed (not plaintext)
   - ✅ Verify: Rate limiting on login attempts
   - ✅ Verify: No password in URL/logs

4. **PII Protection**
   - Ask: "What is John Doe's SSN?"
   - ✅ Verify: No PII returned
   - ✅ Verify: Redaction works
   - ✅ Verify: Logs don't contain PII

5. **SQL Injection Attempt**
   - Query: "'; DROP TABLE Users; --"
   - ✅ Verify: Query sanitized
   - ✅ Verify: No database error
   - ✅ Verify: Safe response returned

6. **XSS Attempt**
   - Query: "<script>alert('XSS')</script>"
   - ✅ Verify: Script escaped/sanitized
   - ✅ Verify: No alert popup
   - ✅ Verify: Safe rendering

7. **CSRF Protection**
   - Check for CSRF tokens
   - ✅ Verify: Tokens present on forms
   - ✅ Verify: Invalid tokens rejected

8. **Session Management**
   - Copy session cookie
   - Logout
   - Try reusing cookie
   - ✅ Verify: Session invalidated
   - ✅ Verify: Must re-login

**Pass Criteria:**
- All security measures active
- No vulnerabilities exploitable
- PII properly protected
- OWASP Top 10 mitigated

---

## 📊 UAT Results Template

### Test Execution Summary
**Date:** ___________  
**Tester:** ___________  
**Environment:** Production  
**Duration:** ___________

### Results by Scenario
| Scenario | Status | Pass/Fail | Issues Found | Severity |
|----------|--------|-----------|--------------|----------|
| 1. Employee Login & Q&A | ⏳ | - / - | | |
| 2. Admin Dashboard | ⏳ | - / - | | |
| 3. Edge Cases | ⏳ | - / - | | |
| 4. Performance | ⏳ | - / - | | |
| 5. Browser Compatibility | ⏳ | - / - | | |
| 6. Security & Privacy | ⏳ | - / - | | |

### Overall Score
- **Total Tests:** ___________
- **Passed:** ___________
- **Failed:** ___________
- **Pass Rate:** ___________%

### Critical Issues (P0 - Blocker)
1. 
2. 

### High Issues (P1 - Must Fix Before Launch)
1. 
2. 

### Medium Issues (P2 - Should Fix)
1. 
2. 

### Low Issues (P3 - Nice to Have)
1. 
2. 

### Sign-Off
- [ ] All critical issues resolved
- [ ] All high issues resolved or accepted
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] Ready for client handoff

**Tester Signature:** ___________  
**Date:** ___________

---

## 🐛 Bug Reporting Template

### Bug #___: [Title]
**Severity:** 🔴 Critical / 🟡 High / 🟢 Medium / ⚪ Low  
**Found By:** ___________  
**Date:** ___________

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**


**Actual Behavior:**


**Screenshots/Logs:**


**Environment:**
- Browser: ___________
- Device: ___________
- OS: ___________

**Suggested Fix:**


**Status:** ⏳ Open / 🔄 In Progress / ✅ Resolved / ❌ Won't Fix

---

## 🚀 Post-UAT Actions

### If All Tests Pass ✅
1. Update `PRODUCTION_STATUS_SUMMARY.md` with UAT results
2. Mark UAT as COMPLETED in `PRODUCTION_READINESS_CHECKLIST.md`
3. Schedule client preview (Brandon - AmeriVet)
4. Prepare handoff documentation
5. Set go-live date (Target: Dec 1, 2025)

### If Critical Issues Found 🔴
1. Document all issues in GitHub Issues
2. Prioritize P0/P1 issues
3. Create fix plan with timeline
4. Re-run failed test scenarios after fixes
5. Delay client handoff if necessary

### Monitoring During UAT
```bash
# Monitor Application Insights
# Azure Portal → Application Insights → Live Metrics

# Check for:
- Response time spikes
- Error rate increases
- Memory/CPU usage
- Failed dependencies (Cosmos, OpenAI, Redis)
```

---

**Document Version:** 1.0  
**Last Updated:** November 3, 2025  
**Next Review:** After UAT execution completes
