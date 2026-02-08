# 📧 Email Configuration Guide

## Your Current SMTP Settings

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@rantechnology.in
SMTP_PASS=ucln gpce uzbq smqm
MAIL_FROM=noreply@rantechnology.in
```

✅ These settings are already configured in your `.env` file!

---

## 🧪 Test Email Configuration

### Option 1: Quick Test (Without Docker)

```bash
# Install dependencies
npm install

# Test email
npm run test-email
```

**Expected Output:**
```
📧 Testing Email Configuration...

Configuration:
  Host: smtp.gmail.com
  Port: 587
  User: info@rantechnology.in
  Pass: ***smqm
  From: noreply@rantechnology.in

🔄 Creating transporter...
🔄 Verifying SMTP connection...
✅ SMTP connection verified!

🔄 Sending test email...
✅ Test email sent successfully!
   Message ID: <xxxxx@gmail.com>
   Sent to: info@rantechnology.in

🎉 Email configuration is working! Check your inbox.
```

### Option 2: Test with Docker

```bash
# Start services
docker-compose up -d

# Test from inside container
docker-compose exec app npm run test-email
```

---

## ✅ If Email Works

You'll see:
```
✅ SMTP connection verified!
✅ Test email sent successfully!
🎉 Email configuration is working!
```

Check your inbox at `info@rantechnology.in` for a test email!

---

## ❌ Common Issues & Solutions

### Issue 1: Authentication Failed (EAUTH)

**Error:**
```
❌ Email test failed!
   Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solution:**
Your app password might have spaces. Gmail app passwords are 16 characters WITHOUT spaces.

Try:
```env
# Remove ALL spaces from password
SMTP_PASS=uclngpceuzbqsmqm
```

Or verify your app password at: https://myaccount.google.com/apppasswords

---

### Issue 2: Connection Timeout (ECONNECTION)

**Error:**
```
❌ Email test failed!
   Error: Connection timeout
```

**Solution:**
1. Check firewall allows port 587
2. Verify internet connection
3. Try port 465 instead:
```env
SMTP_PORT=465
SMTP_SECURE=true
```

---

### Issue 3: "Less Secure Apps" Error

**Solution:**
Gmail requires **App Password**, not your regular password.

**Steps to create App Password:**
1. Go to https://myaccount.google.com
2. Enable 2-Step Verification
3. Go to https://myaccount.google.com/apppasswords
4. Create new app password for "Mail"
5. Copy the 16-character password
6. Update `.env` with new password

---

## 🔧 Update Password (If Needed)

If you need to update the password:

1. **Edit `.env` file:**
```bash
nano .env
```

2. **Update SMTP_PASS line:**
```env
# Remove all spaces - should be 16 characters
SMTP_PASS=your16charpassword
```

3. **Restart services:**
```bash
docker-compose restart
```

4. **Test again:**
```bash
npm run test-email
```

---

## 📝 How Emails Work in the App

### 1. User Registration
```
User registers → OTP generated → Email queued → Worker sends email
```

**Email content:**
```
Subject: Verify your email
Body: Your verification code is: 123456
      This code expires in 10 minutes.
```

### 2. Password Reset
```
User requests reset → OTP generated → Email queued → Worker sends email
```

**Email content:**
```
Subject: Password reset code
Body: Your password reset code is: 654321
      This code expires in 10 minutes.
```

---

## 🎯 Testing in the App

### Test Registration Flow

1. **Start services:**
```bash
docker-compose up -d
docker-compose logs -f
```

2. **Register a user:**
- Go to http://localhost:3000/register
- Fill in details
- Submit

3. **Watch logs:**
```bash
✅ User registered: user@example.com
✅ Email queued for sending
✅ Email sent successfully
```

4. **Check email:**
- You'll receive OTP at registered email
- Use OTP to verify

---

## 🔍 Debugging Email Issues

### Check Worker Logs

```bash
# View worker logs
docker-compose logs -f worker
```

**What you should see:**
```
✅ RabbitMQ connected: email_queue
Worker listening for email jobs...
Processing email job...
✅ Email sent to: user@example.com
```

### Check App Logs

```bash
# View app logs
docker-compose logs -f app
```

**What you should see:**
```
✅ User registered: user@example.com
```

---

## 💡 Tips

### 1. **Use Real Email for Testing**
Register with a real email address you can access to receive OTPs.

### 2. **Check Spam Folder**
Sometimes test emails go to spam. Check there if you don't see it in inbox.

### 3. **OTP Expires in 10 Minutes**
Don't wait too long to use the OTP after registration.

### 4. **Test Different Scenarios**
- Registration with new email
- Email verification
- Password reset
- Login after verification

---

## 🚀 Production Recommendations

When moving to production:

### 1. **Use Professional Email**
```env
MAIL_FROM=noreply@rantechnology.in
MAIL_FROM_NAME=RanTechnology
```

### 2. **Consider Dedicated Email Service**
For better deliverability:
- SendGrid
- Mailgun
- Amazon SES
- Postmark

### 3. **Monitor Email Delivery**
Track:
- Delivery success rate
- Bounce rate
- Spam reports

### 4. **Add Email Templates**
Create branded HTML email templates for:
- Welcome emails
- Verification emails
- Password resets
- Account notifications

---

## ✅ Quick Checklist

- [ ] SMTP credentials configured in `.env`
- [ ] Run `npm run test-email` successfully
- [ ] Test email received in inbox
- [ ] Docker services running
- [ ] Worker processing email queue
- [ ] Register test user and receive OTP
- [ ] Verify email with OTP
- [ ] Test password reset flow

---

## 📞 Still Having Issues?

### Check Configuration

```bash
# Print current configuration (without showing password)
cat .env | grep SMTP
```

Should show:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@rantechnology.in
SMTP_PASS=ucln gpce uzbq smqm
```

### Manual Test

```bash
# Test SMTP connection with telnet
telnet smtp.gmail.com 587
```

Should connect. Type `QUIT` to exit.

---

**Your email is ready to go! 🎉**

Run `npm run test-email` to verify everything works!
