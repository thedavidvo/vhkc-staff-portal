# Authentication Setup Guide

This application uses environment variable-based authentication for secure access to the VHKC Staff Portal.

## Required Environment Variables

You need to set the following environment variables for authentication to work:

### Local Development (`.env.local`)

Create a `.env.local` file in the root of your project with:

```bash
AUTH_USERNAME=your_username_here
AUTH_PASSWORD=your_password_here
```

**Example:**
```bash
AUTH_USERNAME=admin
AUTH_PASSWORD=SecurePassword123!
```

### Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `AUTH_USERNAME` | Your chosen username | Production, Preview, Development |
| `AUTH_PASSWORD` | Your chosen password | Production, Preview, Development |

#### Steps to Add in Vercel:

1. Click **"Add New"**
2. Enter `AUTH_USERNAME` as the **Key**
3. Enter your desired username as the **Value**
4. Select which environments to apply to (Production, Preview, Development)
5. Click **Save**
6. Repeat for `AUTH_PASSWORD`

## Security Recommendations

### Username
- Use a unique, non-obvious username
- Avoid common usernames like "admin", "administrator", or "root"
- Example: `vhkc_staff_admin_2024`

### Password
- Use a strong password with:
  - At least 16 characters
  - Mix of uppercase and lowercase letters
  - Numbers
  - Special characters
- **DO NOT** use common passwords
- Consider using a password generator

**Example Strong Password:**
```
K9x$mP2w#Qz7@vL5
```

## How Authentication Works

1. Users navigate to the login page (`/login`)
2. They enter their username and password
3. The credentials are sent to `/api/auth/login`
4. The API route compares credentials against environment variables
5. If valid, the user is authenticated and redirected to the dashboard
6. If invalid, an error message is displayed

## Testing Authentication

### Local Testing
1. Set `AUTH_USERNAME` and `AUTH_PASSWORD` in `.env.local`
2. Restart your development server: `npm run dev`
3. Navigate to `http://localhost:3000/login`
4. Enter your credentials from `.env.local`
5. You should be redirected to the dashboard on success

### Production Testing
1. Deploy to Vercel with environment variables set
2. Visit your production URL
3. You'll be redirected to the login page
4. Enter your Vercel environment variable credentials
5. Verify successful login

## Troubleshooting

### "Authentication system not configured" Error
- **Cause:** Environment variables are not set
- **Solution:** 
  - Ensure `AUTH_USERNAME` and `AUTH_PASSWORD` are set in `.env.local` (local) or Vercel dashboard (production)
  - Restart your development server or redeploy to Vercel

### "Invalid username or password" Error
- **Cause:** Credentials don't match environment variables
- **Solution:**
  - Double-check your username and password
  - Verify environment variables are correctly set
  - Check for extra spaces or typos

### Login Page Not Showing
- **Cause:** Routing or authentication state issue
- **Solution:**
  - Clear browser localStorage: `localStorage.clear()` in console
  - Clear cookies and cache
  - Restart development server

## Changing Credentials

### Local Development
1. Update values in `.env.local`
2. Restart development server

### Vercel Production
1. Go to Vercel dashboard → Settings → Environment Variables
2. Click on the variable you want to change
3. Edit the value
4. Click **Save**
5. **Important:** Redeploy your application for changes to take effect

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env.local` to version control (it's in `.gitignore`)
- Never share your credentials publicly
- Use different credentials for development and production
- Regularly update passwords (every 3-6 months)
- If credentials are compromised, change them immediately in Vercel

## Additional Security (Future Enhancements)

Consider implementing these for enhanced security:
- Rate limiting on login attempts
- Session timeout
- Password hashing with bcrypt
- Two-factor authentication (2FA)
- JWT tokens instead of localStorage
- Login attempt logging
- IP whitelisting

