Phase 1 — Prerequisites (do once)
1. Confirm the stack is running


docker ps --format "table {{.Names}}\t{{.Status}}"
You need sevagan-api, sevagan-web, sevagan-postgres, sevagan-redis, sevagan-minio all Up.

2. Expose the API publicly with ngrok

The Meta webhook must reach a public HTTPS URL. Install ngrok if not already done, then:


ngrok http 3001
Copy the https://xxxxx.ngrok-free.app URL — you need it in the next step.

3. Configure the Meta webhook

In Meta for Developers → your WhatsApp app → Configuration:

Callback URL: https://xxxxx.ngrok-free.app/api/v1/whatsapp/webhook
Verify token: 37HNftPRbYx1MvxeEDiYmTebuZD_3bcWsFPxBpf3JDa4cdSyi ← matches WA_WEBHOOK_VERIFY_TOKEN in backend/.env
Subscribe to: messages
Verify it succeeds (Meta sends a GET with hub.challenge; your API must return it).

4. Confirm your WhatsApp Business phone is active

The number bound to WA_PHONE_NUMBER_ID=9442060644 in backend/.env is your bot's number. Both the customer and the technician test numbers must be added to your test recipients list in the Meta developer console (Sandbox restriction until you go to Production tier).

Phase 2 — Create a Test Technician
Log into the admin dashboard at http://localhost:3000 → admin@sevagan.ai / Admin@123!

Admin → Technicians → Add Technician:

Field	Value
Name	Test Tech
Phone	+91XXXXXXXXXX (a real WhatsApp number you can receive on)
Language	EN or TA
Status	AVAILABLE
Skills (categories)	Electrical (or whichever category you'll test)
The phone must be in international format with no spaces (e.g. +919876543210). This is what the technician bot uses to send notifications.

Phase 3 — Customer Flow (your WhatsApp → bot number)
Send messages from a customer WhatsApp number to the bot:

Step	You send	Bot replies
1	any message Hi	Language selection menu (1=English, 2=Tamil)
2	1	Welcome + numbered service menu (1–8)
3	1 (Electrical)	"Please share your location or type your address"
4	Virudhunagar, Tamil Nadu	"Preferred date & time? (e.g. Tomorrow 10am)"
5	Tomorrow 10am	Job summary + confirm buttons (Yes/No)
6	Yes	"✅ Job created! Your job number is JOB-XXXXX" + assignment begins
Alternative — free-text AI dispatch (Phase 10): instead of step 3, type I need an electrician — the AI dispatcher will map it to Electrical and skip directly to asking location.

Track command (any time after job creation):


TRACK JOB-XXXXX
Cancel command:


CANCEL JOB-XXXXX
Phase 4 — Technician Flow (technician's WhatsApp)
Once the customer confirms (step 6), the assignment engine picks the best available technician and immediately sends a notification to their WhatsApp:

Step	Technician receives / sends	Effect
1	📲 Receives: job details (category, location, customer address, time) + "Reply 1 to accept or 2 to reject"	—
2	Sends: 1	Job status → ACCEPTED; customer notified
3	Arrives at job, sends: START	Job status → IN_PROGRESS; customer notified
4	Finishes, sends: COMPLETE 850 CASH	Job status → COMPLETED; commission calculated; PDF invoice generated and sent to customer
The COMPLETE command format is: COMPLETE <amount> <CASH|UPI>

If the technician rejects (sends 2), the assignment engine re-tries with the next available technician automatically.

Phase 5 — Verify in the Dashboard
After completing the job:

Jobs → the job shows COMPLETED with amount, commission, technician name
Settlements → the technician's earned amount appears ready for settlement
Reports → daily revenue chart reflects the job
Audit Logs → all admin actions logged with actor + timestamp
Common Problems
Symptom	Cause	Fix
Webhook verify fails	ngrok URL not set in Meta console	Re-paste the current ngrok URL (it changes on restart)
Bot doesn't respond	Container not running or WA_ACCESS_TOKEN expired	docker logs sevagan-api --tail 50; refresh token in Meta console + update backend/.env + docker-compose restart api
Technician gets no notification	Phone not in +91XXXXXXXXXX format, or not on Meta test-recipient allowlist	Fix phone format in Admin → Technicians; add number to Meta sandbox recipients
"Cannot find module" crash	Stale Docker image after package.json change	docker-compose up -d --build api
Login fails	See above — same stale-image root cause	Rebuild image
The WA_ACCESS_TOKEN in backend/.env is a temporary token (valid ~24h for test numbers). If the bot stops responding, that's the first thing to check — generate a new one from the Meta developer console and restart the API container.