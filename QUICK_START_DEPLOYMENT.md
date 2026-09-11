# Quick Start: Deploy Healthcare CRM to Production

**Status:** 85% Ready | **Time to Deploy:** 2-4 hours

## 🚀 Pre-Deployment Checklist (5 minutes)

```bash
# 1. Verify build status
npm run build
✓ Should show: "Route (app)" with all routes listed

# 2. Check no TypeScript errors
✓ Should show: "✓ Finished TypeScript"

# 3. Check dependencies
npm audit
✓ Review: 10 vulnerabilities (all transitive, non-blocking)
```

## 📋 Configuration (30 minutes)

### Step 1: Environment Variables
```bash
# Copy template
cp .env.example .env.production

# Edit with your actual credentials:
# - TWILIO_ACCOUNT_SID=AC... (from Twilio console)
# - TWILIO_AUTH_TOKEN=... 
# - STRIPE_SECRET_KEY=sk_... (from Stripe dashboard)
# - NEXTAUTH_SECRET=$(openssl rand -hex 32)
# - CRON_SECRET=$(openssl rand -hex 32)
# - EMAIL_USER & EMAIL_PASSWORD (Gmail/SendGrid)
```

### Step 2: Infrastructure Setup (1-2 hours)
- [ ] **Redis**: Set up instance (AWS ElastiCache, Redis Labs, etc.)
- [ ] **Database**: Verify Neon PostgreSQL connection
- [ ] **SMTP**: Configure email service (Gmail OAuth2 or SendGrid)
- [ ] **Stripe**: Configure webhook endpoint (`/api/webhooks/stripe`) listening to `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, and `checkout.session.completed` (patient online payments)

### Step 3: Security Patches (15 minutes)
```bash
# Apply recommended security fixes
npm audit fix

# Alternative (with breaking changes):
npm audit fix --force
```

## 🗄️ Database Setup (5 minutes)

```bash
# Apply pending migrations
npm run db:migrate:deploy

# Optional: Seed demo data if you want the sample logins to work
npm run db:seed

# Verify auth env + demo accounts
npm run auth:check
```

## 🧪 Testing (30 minutes)

```bash
# Test 5 critical endpoints
curl http://localhost:3000/api/appointments
curl http://localhost:3000/api/communications
curl http://localhost:3000/api/payments
curl http://localhost:3000/api/patients
curl http://localhost:3000/api/patients/auth/login

# Test communications (SMS/Email)
# - Send test SMS via dashboard
# - Send test Email via dashboard
# - Verify webhook delivery

# Test payments
# - Create test payment
# - Verify Stripe webhook received
```

## 🚀 Deployment (10 minutes)

### Option A: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy --prod

# Set environment variables in Vercel dashboard
# - All TWILIO_* variables
# - STRIPE_SECRET_KEY
# - NEXTAUTH_SECRET & NEXTAUTH_URL
# - SEED_DEMO_DATA=true only for demo/test deployments
# - CRON_SECRET
# - DATABASE_URL
```

### Cron jobs on the free plan (Hobby allows daily crons only)

`vercel.json` intentionally defines **no** cron jobs: our two schedules
(hourly reminders, every-minute dispatch) exceed the Hobby daily limit and
would fail deployment. They run instead on the free tier of an external
cron service (e.g. https://cron-job.org — free, 1-minute intervals allowed).
Exactly ONE trigger source must exist: the dispatch endpoint has no atomic
claim, so overlapping triggers would double-send messages.

Setup (5 minutes, free):

1. Vercel dashboard → project Settings → Environment Variables → set
   `CRON_SECRET` (generate: `openssl rand -hex 32`). Redeploy after adding.
2. In cron-job.org create two jobs pointing at your production domain:
   - `POST https://yourdomain.com/api/communications/scheduled` — every minute
   - `POST https://yourdomain.com/api/communications/appointment-reminders` — every hour
   - Both with header `Authorization: Bearer <CRON_SECRET>`
     (the API also accepts `x-cron-secret: <CRON_SECRET>`).
3. Verify: each endpoint returns `{ "success": true, ... }`; a wrong secret
   returns 401, a missing `CRON_SECRET` env returns 503.

### Option B: Docker (local development only)

The provided `docker-compose.yml` is a **local development** stack, not a hardened production config. It has no hardcoded secrets: you must supply `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, and `POSTGRES_PASSWORD` (docker compose reads the project `.env`; see README "Docker" and `.env.example`). Demo seeding defaults to off — set `SEED_DEMO_DATA=true` only if you want demo users/data.

```bash
# Local container stack: see README "Docker" for required variables.
docker compose up --build

# Or run the image directly; secrets come from your environment.
docker build -t healthcare-crm .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="$(openssl rand -hex 32)" \
  -e NEXTAUTH_URL="https://yourdomain.com" \
  -e ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  healthcare-crm
```

### Option C: Traditional Server (PM2)
```bash
# Build production bundle
npm run build

# Start with PM2
pm2 start "npm start" --name healthcare-crm

# Enable auto-restart
pm2 startup
pm2 save
```

## ✅ Post-Deployment Verification

### Immediate (Day 1)
```bash
# 1. Health checks
curl https://yourdomain.com/api/appointments
curl https://yourdomain.com/api/communications

# 2. Log verification
- Check error logs for issues
- Verify no critical errors

# 3. Send test communication
- Test SMS delivery
- Test Email delivery

# 4. Test authentication
- Log in to patient portal
- Verify token creation
```

### Week 1
- [ ] Monitor performance metrics
- [ ] Check database query times
- [ ] Verify scheduled tasks run
- [ ] Test scaling if needed

## 🔗 Important URLs

| Resource | URL |
|----------|-----|
| Dashboard | `/` |
| Patients | `/patients` |
| Communications | `/communications` |
| Campaigns | `/campaigns` |
| Payments | `/payments` |
| API Docs | `/api/*` (30 endpoints) |

## 🆘 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Database Connection Error
```bash
# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Twilio/Stripe Not Working
```bash
# Verify credentials in .env
grep TWILIO .env
grep STRIPE .env

# Test API credentials
# - Twilio: Try listing messages from console
# - Stripe: Verify key format (sk_live_...)
```

### Performance Issues
```bash
# Check build size
du -sh .next

# Optimize
npm audit fix
npm run build --analyze
```

## 📞 Support

**Documentation**: See `DEPLOYMENT_CHECKLIST.md` for comprehensive guide  
**Environment Template**: See `.env.example`  
**Type Issues**: All TypeScript errors resolved ✓

## 🎯 Success Criteria

✅ Production build completes without errors  
✅ All API endpoints respond  
✅ Database connection works  
✅ Authentication flows succeed  
✅ Communications send successfully  
✅ Stripe webhooks receive events  
✅ No critical errors in logs  

**Estimated total time: 2-4 hours from start to live production**
