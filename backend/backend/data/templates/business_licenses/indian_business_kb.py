"""
Indian Business Licenses & Registration Knowledge Base
Structured knowledge for the Business Setup Agent to guide creators
through formalising their creator business.

Each entry maps a business category / situation to the required licenses,
issuing authority, process, cost, and timeline.
"""

from __future__ import annotations

BUSINESS_LICENSES_KB: list[dict] = [

    # ─────────────────────────────────────────────────────────────
    # BUSINESS STRUCTURES
    # ─────────────────────────────────────────────────────────────
    {
        "id": "structure_sole_prop",
        "category": "business_structure",
        "text": (
            "BUSINESS STRUCTURE — SOLE PROPRIETORSHIP: "
            "Best for: Individual creators just starting out, single-person content businesses, "
            "freelancers. Revenue: under ₹20-40 lakh/year. "
            "Pros: Easiest to set up (no formal registration required beyond GST/Shops Act), "
            "no separate tax filing, lowest compliance burden. "
            "Cons: Unlimited personal liability — your personal assets can be used to "
            "settle business debts. Not ideal if working with large brands (low credibility). "
            "WHAT YOU NEED: Just GST registration (if revenue > ₹20L for services) "
            "and a current account in the business name. "
            "Some states require a Shops and Establishments Act registration "
            "if you have an office/studio space. "
            "TAX: Income taxed as personal income (slab rates apply). "
            "PORTAL: No separate registration needed; use udyamregistration.gov.in for MSME cert."
        ),
    },
    {
        "id": "structure_llp",
        "category": "business_structure",
        "text": (
            "BUSINESS STRUCTURE — LIMITED LIABILITY PARTNERSHIP (LLP): "
            "Best for: 2+ creators collaborating, creator agencies, production houses. "
            "Revenue: ₹10L–₹1Cr/year range. "
            "Pros: Limited personal liability (personal assets protected), "
            "separate legal identity, more credible for brand deals, "
            "lower compliance than Pvt Ltd. "
            "Cons: Requires minimum 2 designated partners, more paperwork than sole prop. "
            "HOW TO REGISTER: "
            "Step 1: Get Digital Signature Certificate (DSC) for each partner — ₹1,000-2,000 "
            "Step 2: Apply for Director Identification Number (DPIN) on MCA21 portal "
            "Step 3: Name approval via MCA21 "
            "Step 4: File Incorporation Form (FiLLiP) on mca.gov.in "
            "Total cost: ₹10,000-15,000 (government fees + professional fees) "
            "Timeline: 2-4 weeks "
            "PORTAL: mca.gov.in"
        ),
    },
    {
        "id": "structure_pvt_ltd",
        "category": "business_structure",
        "text": (
            "BUSINESS STRUCTURE — PRIVATE LIMITED COMPANY: "
            "Best for: Creators seeking investment, large agencies, e-commerce brands, "
            "multi-creator businesses. Revenue: ₹50L+ or investment-seeking. "
            "Pros: Maximum credibility, easy fundraising, employee stock options (ESOPs), "
            "limited liability, perpetual existence. "
            "Cons: Highest compliance burden (mandatory audit, annual ROC filing, board meetings), "
            "minimum 2 directors, complex to close. "
            "HOW TO REGISTER: Via MCA21 SPICE+ form. "
            "Cost: ₹15,000-25,000 (government + professional fees) "
            "Timeline: 3-7 working days (post DIN and DSC) "
            "MANDATORY COMPLIANCE: Annual audit, ITR filing, MCA annual return "
            "PORTAL: mca.gov.in"
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # GST REGISTRATION
    # ─────────────────────────────────────────────────────────────
    {
        "id": "gst_services_threshold",
        "category": "gst",
        "text": (
            "GST REGISTRATION — SERVICE PROVIDERS (CONTENT CREATORS): "
            "MANDATORY when annual revenue exceeds ₹20 lakh (₹10 lakh for special category states). "
            "Content creation, brand collaborations, and influencer marketing are classified "
            "as 'advertising services' or 'other services' under GST. "
            "IMPORTANT: If you sell your services to brands located in different states, "
            "GST registration is mandatory regardless of revenue (inter-state supply). "
            "If you work with any foreign brand (e.g. international brand paying in USD/EUR), "
            "GST registration is mandatory — you'll charge 0% GST (export of service) "
            "but still need to file returns. "
            "GST RATE FOR CREATORS: 18% on services "
            "HOW TO REGISTER: "
            "- Visit gst.gov.in "
            "- Click 'Register Now' under Taxpayers "
            "- Fill Form GST REG-01 "
            "- Upload: PAN card, Aadhaar, bank account proof, business address proof, photograph "
            "- Timeline: 3-7 working days "
            "- Cost: FREE (no government fee) "
            "PORTAL: gst.gov.in"
        ),
    },
    {
        "id": "gst_ecommerce_mandatory",
        "category": "gst",
        "text": (
            "GST REGISTRATION — E-COMMERCE SELLERS (MANDATORY REGARDLESS OF REVENUE): "
            "If you sell ANY physical products through an e-commerce platform "
            "(Amazon, Flipkart, Meesho, Myntra, your own website), "
            "GST registration is MANDATORY from the first rupee of sales. "
            "There is NO threshold exemption for e-commerce sellers. "
            "APPLIES TO: Creators selling merchandise, books, digital products via e-commerce. "
            "GST RATES vary by product: "
            "- Clothing under ₹1,000: 5% "
            "- Clothing above ₹1,000: 12% "
            "- Books: Exempt "
            "- Digital content/courses: 18% "
            "- Food products: 5% (FSSAI registration also required) "
            "PORTAL: gst.gov.in"
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # UDYAM / MSME REGISTRATION
    # ─────────────────────────────────────────────────────────────
    {
        "id": "udyam_registration",
        "category": "msme",
        "text": (
            "UDYAM / MSME REGISTRATION: "
            "Udyam registration is a free, one-time registration that classifies your "
            "business as a Micro, Small, or Medium Enterprise. "
            "WHO QUALIFIES: "
            "- Micro: Investment < ₹1 Cr AND Turnover < ₹5 Cr "
            "- Small: Investment < ₹10 Cr AND Turnover < ₹50 Cr "
            "- Medium: Investment < ₹50 Cr AND Turnover < ₹250 Cr "
            "Most creator businesses qualify as Micro or Small. "
            "BENEFITS OF UDYAM: "
            "1. Priority bank loans at lower interest rates "
            "2. Credit Guarantee Scheme — collateral-free loans up to ₹2 Cr "
            "3. Subsidised government schemes "
            "4. Protection against late payments from large companies "
            "   (under MSME Development Act, dues must be paid within 45 days) "
            "5. Tender preference in government contracts "
            "HOW TO REGISTER: "
            "- Fully online, Aadhaar-based "
            "- Visit udyamregistration.gov.in "
            "- Enter Aadhaar number → OTP verification "
            "- Fill business details → get Udyam Registration Number (URN) instantly "
            "- COST: FREE "
            "- Timeline: 10-15 minutes "
            "PORTAL: udyamregistration.gov.in"
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # FSSAI REGISTRATION (Food/Nutrition Creators)
    # ─────────────────────────────────────────────────────────────
    {
        "id": "fssai_basic_registration",
        "category": "fssai",
        "text": (
            "FSSAI REGISTRATION — FOOD CREATORS AND SELLERS: "
            "The Food Safety and Standards Authority of India (FSSAI) registration is "
            "MANDATORY for anyone involved in food business, including: "
            "- Selling food products (packaged snacks, home-made food, meal kits, supplements) "
            "- Running a cloud kitchen or home kitchen business "
            "- Selling nutraceuticals, protein powders, health supplements "
            "- Distributing or storing food products for sale "
            "TYPES OF REGISTRATION: "
            "1. FSSAI Basic Registration (annual revenue < ₹12 lakh): ₹100/year "
            "2. FSSAI State Licence (₹12L–₹20Cr revenue or interstate operations): ₹2,000-₹5,000/year "
            "3. FSSAI Central Licence (revenue > ₹20Cr or manufacturing): ₹7,500/year "
            "IMPORTANT FOR CONTENT CREATORS: Even if you are a food INFLUENCER who promotes "
            "food brands (not selling yourself), you should verify that brands you promote "
            "have valid FSSAI registration — promoting an unregistered food business "
            "can attract consumer protection complaints. "
            "HOW TO REGISTER: "
            "- Visit foscos.fssai.gov.in "
            "- Create account → Apply for Basic Registration or Licence "
            "- Upload: PAN, Aadhaar, business address proof, list of food products "
            "- Timeline: 7-30 days "
            "PORTAL: foscos.fssai.gov.in"
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # TRADEMARK REGISTRATION
    # ─────────────────────────────────────────────────────────────
    {
        "id": "trademark_registration",
        "category": "trademark",
        "text": (
            "TRADEMARK REGISTRATION — PROTECTING YOUR CREATOR BRAND: "
            "A trademark protects your brand name, logo, channel name, or tagline "
            "from being used by others. For creators, this is especially important as "
            "your personal brand IS your business. "
            "WHAT CAN BE TRADEMARKED: "
            "- Your channel/creator name (e.g. 'BeerBiceps', 'Technical Guruji') "
            "- Your logo or signature style "
            "- A catchphrase or tagline you use consistently "
            "- Your merchandise brand name "
            "KEY TRADEMARK CLASSES FOR CREATORS: "
            "- Class 41: Education and entertainment services (YouTube channels, podcasts, courses) "
            "- Class 35: Advertising and marketing services (influencer marketing) "
            "- Class 25: Clothing (merchandise) "
            "- Class 3: Cosmetics/beauty products "
            "- Class 5: Nutritional supplements "
            "HOW TO REGISTER: "
            "Step 1: Conduct trademark search at ipindia.gov.in to check availability "
            "Step 2: File application online at ipindia.gov.in/tmr.htm "
            "COST: ₹4,500 per class (for individuals/startups); ₹9,000 for others "
            "TIMELINE: Examination ~3-6 months; Full registration ~2-3 years "
            "TM symbol (™) can be used immediately after filing. "
            "® symbol only after registration is complete. "
            "PORTAL: ipindia.gov.in"
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # PROFESSIONAL TAX
    # ─────────────────────────────────────────────────────────────
    {
        "id": "professional_tax",
        "category": "professional_tax",
        "text": (
            "PROFESSIONAL TAX — STATE-SPECIFIC OBLIGATION: "
            "Professional Tax is a state-level tax levied on individuals earning income "
            "through employment, profession, trade, or calling. "
            "NOT ALL STATES LEVY PROFESSIONAL TAX. States that do: "
            "Maharashtra, Karnataka, West Bengal, Andhra Pradesh, Telangana, Tamil Nadu, "
            "Gujarat, Madhya Pradesh, Assam, Meghalaya, Orissa, Sikkim, Tripura. "
            "DELHI DOES NOT HAVE PROFESSIONAL TAX. "
            "FOR CREATORS IN KARNATAKA: "
            "- Monthly tax: ₹200 (if income > ₹15,000/month) "
            "- Register at pt.kar.nic.in "
            "FOR CREATORS IN MAHARASHTRA: "
            "- Varies by income slab, max ₹2,500/year "
            "- Register at ptrc.mahagov.in "
            "IMPORTANT: Self-employed individuals (sole proprietors) must register and pay "
            "professional tax if in a covered state. Failure to register can result in penalties. "
            "Action Required: Check if your state levies professional tax and register at "
            "your state's commercial taxes department website."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # INCOME TAX AND TDS FOR CREATORS
    # ─────────────────────────────────────────────────────────────
    {
        "id": "income_tax_creators",
        "category": "income_tax",
        "text": (
            "INCOME TAX FOR CONTENT CREATORS — KEY FACTS: "
            "Creator income is taxable under 'Income from Business/Profession' or "
            "'Income from Other Sources' depending on how regularly you earn. "
            "TDS (TAX DEDUCTED AT SOURCE): "
            "- When a brand pays you ₹30,000+ in a year, they are required to deduct TDS "
            "- TDS rate: 10% under Section 194J (Professional/Technical fees) "
            "- Some brands may deduct under Section 194H (10%) or 194C (1-2%) "
            "- Always check your Form 26AS on incometax.gov.in to see all TDS deducted "
            "IMPORTANT: TDS is deducted on GROSS payment. Even if TDS is deducted, "
            "you must file an ITR and your final tax liability may be higher or lower "
            "depending on your total income and deductions. "
            "GST VS INCOME TAX: These are separate: "
            "- GST: Collected from brands and paid to government (you are just a conduit) "
            "- Income Tax: Paid on your NET income (revenue minus business expenses) "
            "DEDUCTIBLE EXPENSES FOR CREATORS: "
            "Camera equipment, editing software, studio rent, props, travel for shoots, "
            "team salaries, content research, internet costs — all deductible as business expenses. "
            "PORTAL: incometax.gov.in"
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # IMPORT EXPORT CODE
    # ─────────────────────────────────────────────────────────────
    {
        "id": "iec_import_export",
        "category": "import_export",
        "text": (
            "IMPORT-EXPORT CODE (IEC) — FOR CREATORS WITH INTERNATIONAL DEALS: "
            "An Import-Export Code (IEC) is required when: "
            "- You receive payment from foreign brands for content/services "
            "- You sell merchandise internationally "
            "- You import equipment or products from abroad "
            "IEC is NOT required for personal use imports/exports. "
            "WHO ISSUES: Directorate General of Foreign Trade (DGFT) "
            "HOW TO REGISTER: "
            "- Visit dgft.gov.in "
            "- Apply via ECOM module "
            "- Upload: PAN, Aadhaar, bank certificate/cancelled cheque, business address proof "
            "- COST: ₹500 "
            "- Timeline: 1-3 working days "
            "IMPORTANT FOR CREATORS: If you receive USD/EUR payments via PayPal or "
            "bank wire from foreign brands, technically you are exporting services. "
            "GST: Treated as zero-rated export (0% GST) but you must file GST returns. "
            "FEMA: Large foreign remittances should be reported as per FEMA guidelines. "
            "PORTAL: dgft.gov.in"
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # ASCI DISCLOSURE — BUSINESS COMPLIANCE
    # ─────────────────────────────────────────────────────────────
    {
        "id": "asci_compliance_business",
        "category": "content_compliance",
        "text": (
            "ASCI COMPLIANCE — MUST-DO FOR EVERY CREATOR BUSINESS: "
            "Regardless of your business structure, the Advertising Standards Council of India "
            "guidelines apply to all sponsored content you post. "
            "NON-NEGOTIABLE COMPLIANCE CHECKLIST: "
            "1. Add #Ad, #Collab, or #Sponsored to EVERY sponsored post "
            "2. The disclosure must be UPFRONT — not buried in hashtags at the end "
            "3. For Instagram Stories: use 'Paid Partnership' label + #Ad in the story "
            "4. For YouTube: verbal disclosure at the start of the video + description disclosure "
            "5. Never endorse a product you haven't used "
            "6. Never make health/medical claims without scientific proof "
            "7. Financial content: must include 'Not financial advice' disclaimer "
            "8. Crypto/investment content: SEBI registration required to charge advisory fees "
            "ASCI COMPLAINTS PROCESS: "
            "Consumers and brands can file complaints at ascionline.in. "
            "First offence: Voluntary withdrawal of ad + apology "
            "CCPA referral: If ASCI findings are ignored, CCPA can impose fines up to ₹50 lakh. "
            "PORTAL: ascionline.in"
        ),
    },
]

# Question flow for the conversational Business Setup Agent
# Maps agent_state to the next question to ask
QUESTION_FLOW: list[dict] = [
    {
        "state": "initial",
        "question": (
            "Great! To guide you properly, I need to understand your business better. "
            "Are you primarily a content creator/influencer, or are you also selling "
            "physical products, digital products, or services? "
            "(e.g. 'I'm a fitness influencer', 'I sell home-made snacks', "
            "'I run a photography business')"
        ),
    },
    {
        "state": "ask_revenue",
        "question": (
            "Got it! What's your approximate annual revenue (or expected revenue) from your creator business? "
            "This helps me determine which registrations are mandatory for you. "
            "Options: Under ₹20 lakh / ₹20L-₹40L / ₹40L-₹1Cr / Above ₹1Cr"
        ),
    },
    {
        "state": "ask_location",
        "question": (
            "Which state is your business based in? This matters for Professional Tax "
            "and state-specific Shops & Establishments registration. "
            "(e.g. Karnataka, Maharashtra, Delhi, Tamil Nadu, etc.)"
        ),
    },
    {
        "state": "ask_food",
        "question": (
            "Do you create, sell, or plan to sell any food products, health supplements, "
            "protein powders, or nutrition products? This determines if FSSAI registration is needed."
        ),
    },
    {
        "state": "ask_international",
        "question": (
            "Do you work with international brands or receive payments from foreign companies? "
            "This affects GST treatment and whether you need an Import-Export Code."
        ),
    },
    {
        "state": "ask_team",
        "question": (
            "Do you work alone or do you have (or plan to have) a team — "
            "editors, managers, assistants? This helps determine whether an LLP or "
            "Private Limited structure might suit you better."
        ),
    },
]
