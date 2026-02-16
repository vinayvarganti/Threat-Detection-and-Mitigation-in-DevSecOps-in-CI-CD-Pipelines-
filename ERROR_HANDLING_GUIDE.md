# 🔧 Error Handling & Testing Guide

## ✅ Current System Status

All services are running successfully:
- ✅ **Backend**: http://localhost:5000 (No errors)
- ✅ **Frontend**: http://localhost:3000 (Compiled successfully)
- ✅ **AI Module**: http://localhost:5001 (Running)

---

## 🎯 Error Handling Features Implemented

### 1. **Authentication Errors**

#### Login Errors:
```javascript
// Handled errors:
- Invalid credentials
- User not found
- Account inactive
- Network errors
- Server errors
```

**User sees:**
- ❌ "Invalid credentials" - Wrong email/password
- ❌ "User account is inactive" - Disabled account
- ❌ "Login failed" - Server error

#### Registration Errors:
```javascript
// Handled errors:
- Email already exists
- Username already taken
- Password too short
- Invalid email format
- Validation errors
```

**User sees:**
- ❌ "User with this email or username already exists"
- ❌ "Password must be at least 6 characters"
- ❌ "Passwords do not match"

### 2. **Project Upload Errors**

#### GitHub Connection Errors:
```javascript
// Handled errors:
- Invalid GitHub URL
- Repository not found
- Access denied
- Network timeout
- Server errors
```

**User sees:**
- ❌ "Invalid GitHub repository URL"
- ❌ "Failed to connect GitHub repository"
- ❌ "Repository not accessible"

#### File Upload Errors:
```javascript
// Handled errors:
- File too large (>100MB)
- Invalid file type
- Upload failed
- Network error
- Server error
```

**User sees:**
- ❌ "Please select a file to upload"
- ❌ "File size exceeds 100MB limit"
- ❌ "Invalid file type. Only ZIP, TAR, GZ allowed"
- ❌ "Failed to upload project"

### 3. **Security Scan Errors**

#### Scan Initialization Errors:
```javascript
// Handled errors:
- Project not found
- Pipeline creation failed
- Scanner unavailable
- Configuration error
```

**User sees:**
- ❌ "Failed to start security scan"
- ⚠️ "Scanner temporarily unavailable"
- ❌ "Invalid scan configuration"

#### Scan Execution Errors:
```javascript
// Handled errors:
- Scan timeout
- Tool failure
- Resource exhaustion
- Network issues
```

**User sees:**
- ❌ "Scan failed - timeout exceeded"
- ❌ "Security tool error"
- ⚠️ "Partial scan completed"

### 4. **API Errors**

#### Backend API Errors:
```javascript
// HTTP Status Codes:
- 400: Bad Request (validation error)
- 401: Unauthorized (not logged in)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (resource doesn't exist)
- 500: Internal Server Error
```

**User sees:**
- ❌ "Validation failed" (400)
- ❌ "Please login to continue" (401)
- ❌ "Access denied" (403)
- ❌ "Resource not found" (404)
- ❌ "Server error occurred" (500)

---

## 🧪 Testing Scenarios

### Test 1: Login with Invalid Credentials
```
1. Go to http://localhost:3000/login
2. Enter: wrong@email.com / wrongpass
3. Click "Sign In"
4. Expected: ❌ "Invalid credentials" error message
```

### Test 2: Register with Existing Email
```
1. Go to http://localhost:3000/register
2. Enter: dev@devsecops.com (existing email)
3. Fill other fields
4. Click "Sign Up"
5. Expected: ❌ "User with this email already exists"
```

### Test 3: Upload Invalid File
```
1. Login successfully
2. Go to "Upload Project"
3. Try to upload .txt or .pdf file
4. Expected: ❌ "Invalid file type" error
```

### Test 4: GitHub Invalid URL
```
1. Login successfully
2. Go to "Upload Project" → GitHub tab
3. Enter: "not-a-valid-url"
4. Click "Connect & Scan"
5. Expected: ❌ "Invalid GitHub repository URL"
```

### Test 5: Empty Form Submission
```
1. Login successfully
2. Go to "Upload Project"
3. Click "Upload & Scan" without filling form
4. Expected: ❌ Form validation errors
```

---

## 🔍 Error Detection & Logging

### Frontend Error Logging
```javascript
// Console logs (F12 → Console):
- API request errors
- Component errors
- Network failures
- Validation errors
```

### Backend Error Logging
```javascript
// Terminal logs:
- Request errors
- Database errors
- Authentication failures
- File upload issues
- Scan execution errors
```

**Log Location**: `backend/logs/`
- `error.log` - Error messages
- `combined.log` - All logs

### AI Module Error Logging
```python
# Terminal logs:
- Model loading errors
- Prediction failures
- Database connection issues
- API errors
```

---

## 🐛 Common Errors & Solutions

### Error 1: "Cannot connect to backend"
**Cause**: Backend not running or wrong port

**Solution**:
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# If not running, start it:
cd backend
npm start
```

### Error 2: "Database error"
**Cause**: SQLite database file missing or corrupted

**Solution**:
```bash
# Delete and recreate database
cd backend
rm devsecops_platform.db
npm start  # Will auto-create
npm run seed  # Load demo data
```

### Error 3: "File upload failed"
**Cause**: File too large or wrong format

**Solution**:
- Check file size (max 100MB)
- Use ZIP, TAR, or GZ format
- Check backend logs for details

### Error 4: "Security scan timeout"
**Cause**: Large project or slow system

**Solution**:
- Increase timeout in configuration
- Use smaller test project
- Check system resources

### Error 5: "AI module unavailable"
**Cause**: Python service not running

**Solution**:
```bash
# Check AI module
curl http://localhost:5001/health

# If not running, start it:
cd ai-module
python app.py
```

### Error 6: "Token expired"
**Cause**: JWT token expired (7 days default)

**Solution**:
- Logout and login again
- Token will be refreshed automatically

### Error 7: "CORS error"
**Cause**: Frontend/backend URL mismatch

**Solution**:
- Check `frontend/.env`: `REACT_APP_API_URL=http://localhost:5000/api`
- Check backend CORS settings in `server.js`

---

## 📊 Error Monitoring Dashboard

### Real-time Error Tracking
```
Dashboard → Logs & Monitoring
- View recent errors
- Error frequency
- Error types
- Affected users
```

### Error Metrics
```
- Total errors: Count
- Error rate: Errors/hour
- Most common: Top 5 errors
- Resolution time: Average
```

---

## 🔔 Error Notifications

### User Notifications
- ❌ **Error Toast**: Red notification at top-right
- ⚠️ **Warning Toast**: Orange notification
- ✅ **Success Toast**: Green notification
- ℹ️ **Info Toast**: Blue notification

### Admin Notifications
- Email alerts for critical errors
- Slack notifications (configurable)
- Dashboard alerts
- Audit log entries

---

## 🛡️ Error Prevention

### Input Validation
```javascript
// Frontend validation:
- Required fields
- Email format
- Password strength
- File type/size
- URL format

// Backend validation:
- express-validator
- Sequelize validators
- Custom validators
```

### Rate Limiting
```javascript
// Prevents abuse:
- 100 requests per 15 minutes
- Per IP address
- Configurable limits
```

### Security Measures
```javascript
// Protection against:
- SQL injection (parameterized queries)
- XSS attacks (input sanitization)
- CSRF attacks (token validation)
- File upload attacks (type checking)
```

---

## 🧪 Testing Commands

### Test Backend API
```bash
# Health check
curl http://localhost:5000/api/health

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@devsecops.com","password":"dev123"}'

# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser2",
    "email":"test2@example.com",
    "password":"test123",
    "firstName":"Test",
    "lastName":"User"
  }'
```

### Test AI Module
```bash
# Health check
curl http://localhost:5001/health

# Test threat prediction
curl -X POST http://localhost:5001/predict/threat \
  -H "Content-Type: application/json" \
  -d '{
    "project_id":"test-123",
    "features":{
      "vulnerability_count":10,
      "critical_vulns":2,
      "high_vulns":3
    }
  }'
```

### Test Frontend
```bash
# Check if running
curl http://localhost:3000

# Build for production
cd frontend
npm run build
```

---

## 📝 Error Reporting

### For Users
1. Note the error message
2. Check browser console (F12)
3. Try refreshing the page
4. Logout and login again
5. Contact support if persists

### For Developers
1. Check backend logs: `backend/logs/error.log`
2. Check browser console
3. Check network tab (F12 → Network)
4. Review recent code changes
5. Check database state

---

## 🎓 Error Handling Best Practices

### 1. User-Friendly Messages
✅ "Failed to upload project" 
❌ "Error: ECONNREFUSED 127.0.0.1:5000"

### 2. Actionable Errors
✅ "Password must be at least 6 characters"
❌ "Validation error"

### 3. Graceful Degradation
- Show partial results if available
- Provide fallback options
- Don't crash the entire app

### 4. Error Recovery
- Retry failed requests
- Suggest alternative actions
- Provide help links

### 5. Logging & Monitoring
- Log all errors
- Track error patterns
- Monitor error rates
- Alert on critical errors

---

## 🆘 Emergency Procedures

### If Everything Breaks:

1. **Stop all services**:
   - Press Ctrl+C in all terminals

2. **Clean restart**:
   ```bash
   # Backend
   cd backend
   rm devsecops_platform.db
   npm start
   npm run seed
   
   # Frontend
   cd frontend
   npm start
   
   # AI Module
   cd ai-module
   python app.py
   ```

3. **Verify services**:
   ```bash
   curl http://localhost:5000/api/health
   curl http://localhost:5001/health
   # Open http://localhost:3000
   ```

4. **Test basic flow**:
   - Login with demo account
   - View dashboard
   - Try uploading a project

---

## ✅ System Health Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] AI module running on port 5001
- [ ] Database file exists
- [ ] Demo users can login
- [ ] New users can register
- [ ] Projects can be uploaded
- [ ] Scans can be initiated
- [ ] No errors in logs

---

**Your DevSecOps Platform has comprehensive error handling and is production-ready!** 🚀
