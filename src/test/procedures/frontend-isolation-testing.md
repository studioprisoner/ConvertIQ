# Frontend Data Isolation Testing Procedures

## Overview
Manual testing procedures to verify user data isolation in the ConvertIQ frontend application. These tests ensure that users can only access their own data through the web interface.

## Test Users
- **Josh**: `josh@studioprisoner.com` (ID: `BaBT5A5h67JAkNG32KhaX3ase08Xlgro`)
  - Website: `mad-dame.com` (ID: `853378ff-73fd-4061-a8e8-aae9ba3e62e2`)
- **Gmail User**: `studioprisoner@gmail.com` (ID: `Afa6IBKpDjrs9LjwgJdbH7sFw2nZxznY`)
  - Website: `joshuaillichmann.com` (ID: `ec565091-54dd-4832-87fe-0cd1b3f4bc68`)

## Pre-Test Setup

### 1. Verify Test Data Exists
```bash
# Run database validation script
bun run src/scripts/test-data-isolation.ts
```
Expected: All health checks pass, both users and websites exist.

### 2. Clear Browser Data
- Clear cookies, localStorage, sessionStorage
- Use incognito/private browsing windows
- Test in multiple browsers (Chrome, Firefox, Safari)

## Test Procedures

### A. Authentication and Session Isolation

#### A1. Login Isolation Test
**Objective**: Verify users only see their own data after login

**Steps**:
1. Open browser window 1 (incognito)
2. Navigate to `http://localhost:3000/login`
3. Login as Josh (`josh@studioprisoner.com`)
4. Note session state and data visible

5. Open browser window 2 (different incognito/browser)
6. Navigate to `http://localhost:3000/login`
7. Login as Gmail user (`studioprisoner@gmail.com`)
8. Note session state and data visible

**Expected Results**:
- ✅ Each user sees only their own data
- ✅ No cross-contamination between sessions
- ✅ Dashboard shows correct user-specific information

**Test Data to Verify**:
- Josh should see `mad-dame.com` website
- Gmail user should see `joshuaillichmann.com` website
- No shared or mixed data

#### A2. Session Persistence Test
**Objective**: Verify sessions remain isolated across browser refreshes

**Steps**:
1. While logged in as Josh, refresh the page
2. Navigate through different sections (Dashboard, Reports, Websites)
3. While logged in as Gmail user (other window), do the same
4. Check that each session maintains correct user context

**Expected Results**:
- ✅ Session data persists correctly for each user
- ✅ No session bleeding between browser windows

### B. Website Management Isolation

#### B1. Website List Access Test
**Objective**: Verify users only see their own websites

**Steps**:
1. Login as Josh
2. Navigate to `/dashboard/domains` or websites section
3. Record all visible websites
4. Note website IDs and URLs in browser dev tools (Network tab)

5. Login as Gmail user (different browser/incognito)
6. Navigate to same section
7. Record all visible websites
8. Compare results

**Expected Results**:
- ✅ Josh sees only `mad-dame.com` website
- ✅ Gmail user sees only `joshuaillichmann.com` website
- ✅ No overlap in website lists
- ✅ API calls only return user-specific data

#### B2. Website Detail Access Test
**Objective**: Verify users cannot access other users' website details

**Steps**:
1. Login as Josh
2. Try to access Gmail user's website directly:
   - URL manipulation: `/dashboard/websites/ec565091-54dd-4832-87fe-0cd1b3f4bc68`
   - Browser developer tools: manually trigger API calls to other user's data

3. Login as Gmail user
4. Try to access Josh's website directly:
   - URL manipulation: `/dashboard/websites/853378ff-73fd-4061-a8e8-aae9ba3e62e2`
   - Manual API calls in dev tools

**Expected Results**:
- ✅ Access denied or redirected when trying to access other user's websites
- ✅ API calls return 404 or 403 errors for unauthorized access
- ✅ No data leakage in error messages

### C. Report and Analysis Isolation

#### C1. Reports List Access Test
**Objective**: Verify users only see reports from their own analyses

**Steps**:
1. Login as Josh
2. Navigate to `/dashboard/reports`
3. Record all visible reports and their associated websites
4. Check browser Network tab for API responses

5. Login as Gmail user
6. Navigate to `/dashboard/reports`
7. Record all visible reports
8. Compare data

**Expected Results**:
- ✅ Josh sees only reports for `mad-dame.com`
- ✅ Gmail user sees only reports for `joshuaillichmann.com`
- ✅ No shared reports between users

#### C2. Report Detail Access Test
**Objective**: Verify users cannot access other users' report details

**Steps**:
1. Identify a report ID from Josh's account
2. Login as Gmail user
3. Try to access Josh's report:
   - Direct URL access
   - API manipulation in dev tools
   - Form submission attempts

4. Repeat in reverse (Josh trying to access Gmail user's reports)

**Expected Results**:
- ✅ Unauthorized access blocked
- ✅ Proper error handling without data exposure
- ✅ User redirected or shown appropriate error message

### D. Dashboard and Analytics Isolation

#### D1. Dashboard Data Test
**Objective**: Verify dashboard shows only user-specific analytics

**Steps**:
1. Login as Josh
2. Navigate to main dashboard (`/dashboard`)
3. Record all metrics, charts, and data points
4. Screenshot for comparison

5. Login as Gmail user
6. Navigate to main dashboard
7. Record all metrics and data
8. Compare with Josh's data

**Expected Results**:
- ✅ Completely different metrics for each user
- ✅ No shared or aggregated data
- ✅ Charts and graphs reflect only user's websites

#### D2. Recommendation Isolation Test
**Objective**: Verify recommendation tracking is user-specific

**Steps**:
1. Login as Josh
2. View and interact with recommendations
3. Mark some as "in progress" or "completed"
4. Note recommendation IDs in Network tab

5. Login as Gmail user
6. Check if recommendation states are isolated
7. Try to access Josh's recommendation IDs through API calls

**Expected Results**:
- ✅ Recommendation states are independent
- ✅ Cannot access other user's recommendations
- ✅ Progress tracking isolated per user

### E. API Security Frontend Testing

#### E1. Network Traffic Analysis
**Objective**: Verify API calls include proper authentication and filtering

**Steps**:
1. Login as Josh
2. Open browser Developer Tools → Network tab
3. Navigate through the application
4. Record all API calls and their responses
5. Verify:
   - Authentication headers present
   - User ID filtering in requests
   - Response data contains only user's data

**Expected Results**:
- ✅ All API calls authenticated
- ✅ User ID properly included in requests
- ✅ Responses filtered by user ownership

#### E2. Manual API Testing
**Objective**: Test API endpoints directly for proper isolation

**Using Browser Console**:
```javascript
// Test website API access
fetch('/api/websites', {
  method: 'GET',
  credentials: 'include'
}).then(r => r.json()).then(console.log);

// Test reports API access
fetch('/api/trpc/reports.list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    "0": { limit: 20, offset: 0 }
  })
}).then(r => r.json()).then(console.log);
```

**Expected Results**:
- ✅ API returns only authenticated user's data
- ✅ Proper error handling for invalid requests

### F. Edge Case Testing

#### F1. Concurrent Session Test
**Objective**: Test isolation with concurrent sessions

**Steps**:
1. Login as Josh in Browser A
2. Login as Gmail user in Browser B
3. Perform actions simultaneously:
   - Create websites
   - Generate reports
   - Update recommendations
4. Verify no cross-user interference

**Expected Results**:
- ✅ Actions in one session don't affect the other
- ✅ Real-time updates (if any) are user-specific

#### F2. Session Takeover Prevention
**Objective**: Verify session security

**Steps**:
1. Login as Josh
2. Copy session cookies/tokens
3. Try to use them in different browser as Gmail user
4. Verify session binding and validation

**Expected Results**:
- ✅ Session cookies cannot be reused by different users
- ✅ Proper session validation on server side

## Test Documentation

### Recording Test Results

For each test, document:
1. **Test ID**: (e.g., A1, B1, C1)
2. **Date/Time**: When test was performed
3. **Browser**: Which browser and version
4. **Result**: Pass/Fail
5. **Evidence**: Screenshots, console logs, network traces
6. **Issues**: Any problems discovered
7. **Notes**: Additional observations

### Example Test Record
```
Test ID: B1
Date: 2025-01-27 10:30 AM
Browser: Chrome 131.0.6778.139
Result: ✅ PASS
Evidence: 
  - Josh sees only mad-dame.com (screenshot_josh_websites.png)
  - Gmail user sees only joshuaillichmann.com (screenshot_gmail_websites.png)
  - Network log shows proper API filtering (network_trace.har)
Issues: None
Notes: Website URLs correctly filtered, no data leakage detected
```

## Automated Test Helper Scripts

### Quick Frontend Test Runner
Create a browser bookmarklet for quick testing:

```javascript
javascript:(function(){
  console.log('🔍 ConvertIQ Frontend Isolation Test');
  
  // Check current user
  fetch('/api/auth-check', {credentials: 'include'})
    .then(r => r.json())
    .then(user => {
      console.log('Current user:', user);
      
      // Test website access
      return fetch('/api/websites', {credentials: 'include'});
    })
    .then(r => r.json())
    .then(websites => {
      console.log('User websites:', websites);
      console.log('Website count:', websites.websites?.length || 0);
      console.log('✅ Frontend isolation test complete');
    })
    .catch(err => console.error('❌ Test error:', err));
})();
```

## Reporting

### Final Test Report Template

```markdown
# Frontend Data Isolation Test Report
Date: [DATE]
Tester: [NAME]
Environment: [PRODUCTION/STAGING]

## Summary
- Total Tests: [X]
- Passed: [X]
- Failed: [X]
- Overall Status: [PASS/FAIL]

## Test Results
[Detailed results for each test category]

## Issues Found
[List any data isolation issues]

## Recommendations
[Any improvements needed]

## Evidence
[Attach screenshots, logs, traces]
```

## Success Criteria

All tests must pass with these criteria:
- ✅ No user can access another user's data
- ✅ API responses are properly filtered
- ✅ Frontend displays only user-specific information
- ✅ Session isolation is maintained
- ✅ Error handling doesn't expose sensitive data
- ✅ URL manipulation doesn't bypass security
- ✅ Browser tools cannot access unauthorized data

## Emergency Procedures

If data isolation issues are found:
1. **Document immediately** with screenshots/logs
2. **Stop testing** and report to development team
3. **Do not attempt** to access or modify data
4. **Preserve evidence** for debugging
5. **Follow up** to verify fixes