# Feature Research — Clinic Management / Healthcare CRM SaaS

**Date:** 10 September 2026  
**Product:** OpenHealthCRM / عيادات CRM  
**Sources:** Competitor product pages & comparisons (SimplePractice, Cliniko, NexHealth, Zocdoc, Practo, Vezeeta, Altibbi, DrChrono/Tebra/Kareo), plus internal gap analysis.

---

## 1. Competitor landscape (what they optimize for)

| Product | Primary job | Region bias |
|---------|-------------|-------------|
| **Zocdoc** | Patient discovery + booking marketplace | US |
| **NexHealth** | Patient-access layer on top of existing EHR (booking, forms, messaging) | US |
| **SimplePractice** | All-in-one PM + notes + portal + telehealth for therapy/allied health | US |
| **Cliniko** | Multi-location allied-health ops: booking, waitlist, SMS, API, Xero | AU / global / India clinics |
| **DrChrono / Tebra (Kareo)** | Medical EHR + RCM + claims | US |
| **Practo** | Doctor discovery + booking; lighter clinical ops | India |
| **Vezeeta** | Marketplace + doctor app + clinic PM (booking, reminders, multi-clinic, teleconsult, insurance) | MENA (EG, KSA, JO, LB, …) |
| **Altibbi** | Arabic-first telehealth + content + virtual clinics | MENA |
| **DoctorUna** | Online doctor booking / discovery (MENA) | MENA |

**Your positioning today:** bilingual AR/EN RTL multi-tenant clinic OS with RBAC, EMR-lite, billing, queue, audit, and SaaS entitlements — closer to Cliniko + SimplePractice ops than to Zocdoc marketplace, with MENA language advantage vs US tools.

---

## 2. Feature matrix vs OpenHealthCRM

| Capability | You | Market expectation |
|------------|:---:|--------------------|
| Staff scheduling & conflicts | ★★★ | Baseline |
| Multi-branch / rooms | ★★★ | Expected for chains |
| EMR notes / vitals / Rx / labs | ★★★ | Expected for clinic OS |
| Billing + Stripe | ★★★ | Expected |
| Waitlist (staff) | ★★ | Cliniko: book-from-waitlist UX |
| Patient portal | ★★ | SimplePractice: deeper |
| SMS/Email reminders | ★★ | Cliniko/Vezeeta: configurable cadences |
| WhatsApp | ★ | MENA table-stakes |
| Online self-booking | — | Cliniko / Vezeeta / NexHealth / Zocdoc |
| Digital intake forms | — | NexHealth / SimplePractice |
| Telehealth video | — | SimplePractice / Vezeeta / Altibbi |
| Insurance eligibility + claims clearinghouse | ★ schema | Tebra / Vezeeta |
| E-prescribe network | — | DrChrono |
| Public doctor marketplace | — | Zocdoc / Practo / Vezeeta |
| AI scribe / copilot | — | Emerging (NexHealth+) |
| Arabic + RTL | ★★★ | Rare globally; expected in MENA |

---

## 3. Prioritized backlog for this product

### Must-have (P0) — required to compete as a MENA clinic OS

1. **Patient self-booking (public / portal)**  
   Availability engine from doctor hours + rooms + buffers; booking page per org/branch; anti-abuse limits (Cliniko-style daily caps); optional login-less match-by-phone.

2. **Reliable appointment reminders (SMS + WhatsApp + Email)**  
   Configurable 24h / 1h templates per appointment type; delivery status; WhatsApp Business for MENA; cron hardened with secrets.

3. **Real document / imaging storage**  
   Cloudinary (or equivalent) for patient photos, Rx scans, lab/imaging reports, staff/clinic branding — with MIME limits and org-scoped folders. *(In progress in Phase 4.)*

4. **Production security baseline**  
   Forced encryption key, suspended-org session lockout, tenant isolation tests, rate limit on Redis, health checks.

5. **Deeper patient portal**  
   Upcoming appointments, documents download, invoices/balances, message clinic, cancel/reschedule within policy.

6. **No-show / cancellation policy**  
   Track no-shows; optional fee or rebooking rules; reminder confirmation (Vezeeta/Zocdoc pattern).

### Should-have (P1) — high conversion & retention

1. **Digital intake / consent forms** before visit (mobile-friendly, Arabic).  
2. **Waitlist auto-offer** when a cancellation opens a slot (SMS/WhatsApp).  
3. **Telehealth** (Twilio/Daily/WebRTC) linked to appointment type.  
4. **Insurance workflow** — policy on patient → eligibility check → claim linked to invoice.  
5. **Analytics pack** — attendance rate, revenue by provider/branch, new vs returning patients, reminder effectiveness.  
6. **Online payment / deposit at booking** (Stripe Payment Links or Checkout).  
7. **Staff & clinic profile media** (avatars, logo) via Cloudinary.  
8. **Configurable reminder cadences** and quiet hours per org timezone.

### Nice-to-have (P2)

1. E-prescribe / pharmacy network integrations (region-specific).  
2. AI clinical note assist / coding suggestions.  
3. Public marketplace / SEO doctor pages (Vezeeta/Practo style) — only if GTM is B2C acquisition.  
4. Reputation / review request automation post-visit.  
5. Native mobile apps.  
6. FHIR write-back beyond current proxy.  
7. Extra locales (FR, UR) beyond AR/EN.  
8. Group appointments / classes (Cliniko pilates-style).

---

## 4. MENA-specific notes

- **WhatsApp > SMS** for patient reach in EG/KSA/JO; keep SMS as fallback.  
- **Arabic medical copy** and RTL in booking + portal is a moat vs SimplePractice/Cliniko.  
- **Vezeeta** wins on demand generation; you win if clinics already have patients and need operations depth (EMR, billing, multi-branch RBAC).  
- **Altibbi** owns telehealth brand — partner or differentiate with in-clinic ops + optional video, not pure virtual care.  
- Cash + card + insurance mix is common; keep invoice statuses flexible before heavy US-style RCM.

---

## 5. Suggested 90-day product sequence

| Sprint theme | Outcomes |
|--------------|----------|
| **Weeks 1–2** | Cloudinary uploads, security P0, indexes, health/cron |
| **Weeks 3–5** | Availability API + public booking page + portal appointments |
| **Weeks 6–7** | WhatsApp/SMS reminder reliability + templates |
| **Weeks 8–9** | Intake forms + waitlist offers |
| **Weeks 10–12** | Analytics pack + booking deposits + telehealth spike |

---

## 6. Explicit non-goals (near term)

- Becoming a full US claims clearinghouse competitor to Tebra.  
- Building a consumer marketplace before self-booking + reminders work for existing clinic patients.  
- HIPAA marketing claims without BAA, encryption enforcement, and audit evidence.

---

*Update this file when a Must-have ships or competitive positioning changes.*
