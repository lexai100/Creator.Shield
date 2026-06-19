"""
Creator Economy Knowledge Base
Chunked summaries of Indian regulations relevant to influencer/brand contracts,
plus synthetic red-flag examples.  Each chunk is tagged with:
  - source:   the regulatory body / law (e.g. "ASCI", "CCPA", "DPDP")
  - category: the risk/topic area (e.g. "disclosure", "data_privacy")

These are loaded into ChromaDB at startup and retrieved by LoopholeHound
before flagging creator-specific issues.
"""

from __future__ import annotations

CREATOR_ECONOMY_CHUNKS: list[dict] = [

    # ─────────────────────────────────────────────────────────────
    # ASCI Guidelines for Influencer Advertising in Digital Media
    # ─────────────────────────────────────────────────────────────
    {
        "id": "asci_disclosure_001",
        "source": "ASCI",
        "category": "disclosure",
        "text": (
            "ASCI GUIDELINES — DISCLOSURE OBLIGATION: "
            "Every influencer who receives any material connection from a brand "
            "(cash, free products, discounts, gifts, travel, or any other benefit) "
            "MUST disclose this connection clearly and prominently in every post. "
            "Disclosure labels must be placed UPFRONT (not buried in hashtags) and "
            "must use: '#Ad', '#Collab', '#Sponsored', '#Partnership', or 'Paid Promotion'. "
            "The label must be visible without the viewer having to click 'more' or scroll. "
            "RISK FOR INFLUENCER: A brand contract that does not include a disclosure clause "
            "or that tells the influencer NOT to disclose is itself a violation of ASCI guidelines "
            "and exposes BOTH the brand and influencer to ASCI and CCPA penalties. "
            "RECOMMENDED FIX: Contract must include a mandatory disclosure clause requiring "
            "the influencer to add #Ad or equivalent to all sponsored posts."
        ),
    },
    {
        "id": "asci_disclosure_002",
        "source": "ASCI",
        "category": "disclosure",
        "text": (
            "ASCI GUIDELINES — VIRTUAL INFLUENCERS AND AI CONTENT: "
            "If content is created using AI or by a virtual/digital influencer, "
            "this must be disclosed with 'Virtual Influencer' or 'AI-generated content' labels. "
            "Brands cannot use an influencer's AI-generated likeness without their explicit consent "
            "and a clear contractual right to do so. "
            "RISK: Any contract granting the brand rights to create AI-generated content "
            "mimicking the influencer without a separate consent clause is a violation of "
            "ASCI's virtual influencer guidelines. "
            "RECOMMENDED FIX: Explicitly prohibit AI likeness use unless separately negotiated "
            "and compensated."
        ),
    },
    {
        "id": "asci_finfluencer_001",
        "source": "ASCI",
        "category": "finfluencer",
        "text": (
            "ASCI GUIDELINES — FINFLUENCER (FINANCIAL INFLUENCER) RULES: "
            "Any influencer who creates content related to financial products, investments, "
            "stocks, mutual funds, crypto, or trading MUST be registered with SEBI "
            "(Securities and Exchange Board of India) as a Research Analyst or Investment Adviser. "
            "Unregistered finfluencers cannot charge fees for financial advice. "
            "ASCI requires all financial content to include a clear disclaimer: "
            "'This is not financial advice. Consult a SEBI-registered advisor.' "
            "RISK: A brand deal where an influencer promotes financial products (trading apps, "
            "crypto platforms, insurance) without SEBI registration exposes the influencer "
            "to SEBI enforcement action, not just ASCI penalties. "
            "RECOMMENDED FIX: Any brand deal involving financial products must include "
            "a clause requiring the brand to confirm the content is compliant with SEBI regulations "
            "and indemnifying the influencer for any regulatory action arising from the brand's product."
        ),
    },
    {
        "id": "asci_health_001",
        "source": "ASCI",
        "category": "health_nutrition",
        "text": (
            "ASCI GUIDELINES — HEALTH AND NUTRITION SECTOR ANNEXE: "
            "Influencers promoting health products, supplements, nutraceuticals, weight-loss products, "
            "or medical devices face additional ASCI requirements: "
            "1. No claim of cure for any disease unless the product is CDSCO-approved for that claim. "
            "2. Must include disclaimer: 'Results may vary. Consult your doctor before use.' "
            "3. Must not use 'clinical studies show' unless peer-reviewed studies are verifiable. "
            "4. FSSAI registration proof must be shared by the brand before the influencer posts. "
            "RISK: If a brand's health product is unregistered with FSSAI or CDSCO, "
            "the influencer is liable for promoting an illegal product. "
            "RECOMMENDED FIX: Insert a brand representation clause requiring the brand to "
            "warrant that all products comply with FSSAI, CDSCO, and ASCI health sector guidelines, "
            "with indemnity for the creator if the brand's product is found non-compliant."
        ),
    },
    {
        "id": "asci_barter_trap_001",
        "source": "ASCI",
        "category": "disclosure",
        "text": (
            "ASCI RED FLAG — THE BARTER TRAP: "
            "Some brands send free products ('barter deals') and falsely claim that because "
            "no cash was paid, no disclosure is required. This is INCORRECT and ILLEGAL. "
            "ASCI guidelines explicitly state: ANY material benefit — including free products, "
            "complimentary services, discounts, or experiences — triggers the disclosure obligation. "
            "A contract clause stating 'since this is a product exchange, no #Ad disclosure is needed' "
            "is a legally false statement that violates ASCI guidelines. "
            "RISK: Influencer may be penalised for non-disclosure even though the brand misled them. "
            "RECOMMENDED FIX: Contract must include a disclosure clause, and explicitly state "
            "that the barter nature of the deal does NOT exempt the creator from disclosure obligations."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # CCPA 2022 — Consumer Protection Act & Misleading Advertisements
    # ─────────────────────────────────────────────────────────────
    {
        "id": "ccpa_section21_001",
        "source": "CCPA",
        "category": "misleading_endorsement",
        "text": (
            "CCPA 2022 — GUIDELINES FOR PREVENTION OF MISLEADING ADVERTISEMENTS: "
            "The Central Consumer Protection Authority issued guidelines under the "
            "Consumer Protection Act, 2019, making it illegal for endorsers (including influencers) "
            "to endorse products they have not used or verified. "
            "Section 21 Penalty Structure: "
            "- First offence: up to ₹10 lakh penalty "
            "- Subsequent offence: up to ₹50 lakh penalty "
            "- Prohibition on endorsing any product for up to 3 years "
            "ENDORSER DUE DILIGENCE REQUIREMENT: Influencers must do their due diligence — "
            "use the product before endorsing, verify the claims in the advertising material, "
            "and not make claims that are not substantiated. "
            "RISK: A contract that requires the influencer to make specific claims about a product "
            "without providing the product for testing, or that requires them to post pre-written "
            "scripts with unverified claims, creates personal liability for the influencer. "
            "RECOMMENDED FIX: Add a clause requiring the brand to provide the product for testing "
            "before content creation, warrant that all claims are substantiated, and indemnify "
            "the creator against any CCPA enforcement action."
        ),
    },
    {
        "id": "ccpa_section21_002",
        "source": "CCPA",
        "category": "misleading_endorsement",
        "text": (
            "CCPA 2022 — MISLEADING ADVERTISEMENT DEFINITION: "
            "An advertisement is 'misleading' under CCPA if it: "
            "1. Falsely describes a product or service "
            "2. Gives a false guarantee of satisfaction/reliability "
            "3. Makes unverified or false claims about benefits "
            "4. Omits material information likely to deceive consumers "
            "5. Deliberately conceals a material fact "
            "INFLUENCER LIABILITY: Section 21 makes both the manufacturer/brand AND the "
            "endorser (influencer) jointly liable for misleading advertisements. "
            "The influencer cannot use 'the brand made me say it' as a defence — "
            "they are personally responsible for claims they endorse. "
            "RISK: Contracts that do not include influencer approval rights over final ad copy "
            "can trap influencers in liability for content they didn't control. "
            "RECOMMENDED FIX: Contract must give the influencer the right to review and "
            "approve ALL brand-edited versions of their content before publishing."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # DPDP Act 2023 — Digital Personal Data Protection
    # ─────────────────────────────────────────────────────────────
    {
        "id": "dpdp_consent_001",
        "source": "DPDP",
        "category": "data_privacy",
        "text": (
            "DPDP ACT 2023 — CONSENT REQUIREMENTS FOR INFLUENCER-LED DATA COLLECTION: "
            "When a brand contract requires the influencer to run a giveaway, contest, "
            "lead-generation campaign, or collect audience data in any form (name, email, "
            "phone, etc.), the influencer becomes a 'Data Fiduciary' under the DPDP Act. "
            "DPDP Consent Rules: "
            "1. Consent must be free, specific, informed, and unambiguous "
            "2. Consent must be obtained through a clear affirmative action (not pre-ticked boxes) "
            "3. Purpose of data collection must be stated at the time of collection "
            "4. Data must not be used for any purpose other than the stated one "
            "5. Data subjects have the right to withdraw consent at any time "
            "RISK: A brand contract that says 'run a giveaway to collect email leads for our "
            "marketing list' without specifying DPDP-compliant consent mechanisms makes "
            "the influencer jointly liable for any data privacy violations. "
            "RECOMMENDED FIX: Contract must include a data handling clause stating that "
            "the brand will provide DPDP-compliant consent mechanisms, data will only be "
            "used for the stated purpose, and the brand indemnifies the creator for any "
            "DPDP violations arising from the brand's data handling practices."
        ),
    },
    {
        "id": "dpdp_third_party_001",
        "source": "DPDP",
        "category": "data_privacy",
        "text": (
            "DPDP ACT 2023 — THIRD-PARTY DATA PROCESSING: "
            "Under the DPDP Act, a 'Data Processor' (the influencer or an agency) processing "
            "data on behalf of a 'Data Fiduciary' (the brand) must have a written contract "
            "specifying the nature and purpose of data processing. "
            "The contract must ensure: "
            "1. Data is processed only as instructed by the Data Fiduciary "
            "2. Appropriate technical and organisational security measures are implemented "
            "3. Data is deleted or returned after the engagement ends "
            "4. No data is shared with unauthorised third parties "
            "RISK: Influencer contracts that require collecting audience data but do not "
            "include a data processing agreement (DPA) clause expose both parties to "
            "DPDP Act penalties of up to ₹250 crore. "
            "RECOMMENDED FIX: Require the brand to attach a DPDP-compliant Data Processing "
            "Agreement to any contract involving audience data collection."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # Indian Contract Act 1872 — Indemnity & Jurisdiction
    # ─────────────────────────────────────────────────────────────
    {
        "id": "ica_indemnity_001",
        "source": "Indian Contract Act",
        "category": "indemnity",
        "text": (
            "INDIAN CONTRACT ACT 1872 — INDEMNITY (SECTIONS 124-147): "
            "Section 124 defines a contract of indemnity as a contract where one party "
            "promises to save the other from loss caused by the promisor's conduct or "
            "a third party's conduct. "
            "CREATOR INDEMNITY RISK: Most brand contracts include one-sided indemnity where "
            "the creator indemnifies the brand for ALL losses, but the brand does NOT "
            "indemnify the creator. This means: "
            "- If the brand's product causes harm and a consumer sues the creator (as the face), "
            "  the creator has no contractual protection "
            "- If the brand's claims are false (CCPA violation), the creator bears legal costs alone "
            "- If the brand's product is unregistered (FSSAI, CDSCO), the creator is exposed "
            "RECOMMENDED FIX: Demand mutual indemnity — the brand must indemnify the creator "
            "against claims arising from the brand's product, brand's instructions, and "
            "brand's regulatory non-compliance."
        ),
    },
    {
        "id": "ica_jurisdiction_001",
        "source": "Indian Contract Act",
        "category": "jurisdiction",
        "text": (
            "INDIAN CONTRACT ACT — JURISDICTION AND GOVERNING LAW: "
            "A contract clause setting jurisdiction outside India (e.g. Singapore, UK, USA) "
            "means the Indian creator may be forced to litigate abroad at enormous personal cost. "
            "Even within India, a jurisdiction clause naming only the brand's city courts "
            "creates a significant power imbalance — a Mumbai-based brand can force a "
            "Bengaluru-based creator to litigate in Mumbai. "
            "RISK LEVEL: HIGH. Indian law generally allows parties to choose jurisdiction, "
            "but courts may not enforce jurisdiction clauses that are entirely unconscionable. "
            "RECOMMENDED FIX: Governing law must be 'Indian law' and jurisdiction must be "
            "either the creator's city courts or a neutral city with mutual agreement. "
            "Alternatively, require arbitration (Arbitration & Conciliation Act, 1996) "
            "at a mutually agreed neutral venue."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # Copyright Act 1957 — IP Assignment
    # ─────────────────────────────────────────────────────────────
    {
        "id": "copyright_section19_001",
        "source": "Copyright Act",
        "category": "ip_rights",
        "text": (
            "COPYRIGHT ACT 1957 — SECTION 19: IP ASSIGNMENT VALIDITY: "
            "Under Section 19 of the Indian Copyright Act, 1957: "
            "1. Assignment of copyright MUST be in writing and signed by the assignor "
            "   (the creator) or their authorised agent "
            "2. The assignment MUST specify the rights assigned (reproduction, distribution, "
            "   broadcast, digital, physical, etc.) "
            "3. The assignment SHOULD specify the duration and territorial extent "
            "4. If no duration is specified, Section 19(5) deems it to be 5 years "
            "5. If no territorial extent is specified, it is deemed to be restricted to India "
            "CREATOR PROTECTION: Under Section 19(8), if an assignment is not utilised "
            "within one year, the creator can terminate the assignment. "
            "PERPETUAL ASSIGNMENT RISK: A contract clause like 'Creator assigns all rights "
            "in perpetuity worldwide irrevocably' is legal under Indian law but extremely "
            "unfavourable — the brand can use the content forever, for any purpose, globally. "
            "RECOMMENDED FIX: Cap usage rights at 12 months (or campaign duration + 30 days), "
            "specify permitted platforms (e.g. Instagram, YouTube), specify permitted ad types "
            "(organic posts only, or include paid whitelisting), and require separate compensation "
            "for whitelisting rights."
        ),
    },
    {
        "id": "copyright_moral_rights_001",
        "source": "Copyright Act",
        "category": "ip_rights",
        "text": (
            "COPYRIGHT ACT 1957 — MORAL RIGHTS (SECTION 57): "
            "Section 57 of the Indian Copyright Act gives creators the 'moral right' to "
            "claim authorship of their work and to restrain or claim damages for any "
            "distortion, mutilation, or modification of their work that would be prejudicial "
            "to their honour or reputation. "
            "Moral rights CANNOT be waived by contract under Indian law. "
            "RISK: A contract clause like 'Creator waives all moral rights to the content' "
            "is unenforceable under Indian law — but a brand may still act on it and "
            "the creator may need to litigate to enforce their moral rights. "
            "MODIFICATION RISK: Brands frequently edit influencer content for ads without "
            "showing the creator. If the edit damages the creator's image or misrepresents "
            "their views, the creator has a right of action under Section 57. "
            "RECOMMENDED FIX: Include a clause requiring the brand to seek creator approval "
            "for any modification to the content beyond agreed edits, and prohibit edits "
            "that alter the creator's expressed views or brand associations."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # Synthetic Red Flags — Bad Clauses
    # ─────────────────────────────────────────────────────────────
    {
        "id": "redflag_perpetual_usage_001",
        "source": "synthetic",
        "category": "perpetual_usage",
        "text": (
            "RED FLAG PATTERN — PERPETUAL USAGE RIGHTS: "
            "Bad clause example: 'Creator grants Brand an irrevocable, perpetual, royalty-free, "
            "worldwide license to use, reproduce, distribute, and display all Content in any "
            "medium now known or hereafter invented, for any purpose.' "
            "FLAG REASON: This grants the brand the right to use the creator's content forever, "
            "for any purpose, on any platform that doesn't yet exist, without any additional payment. "
            "The brand can: sell the creator's content, use it in political advertising, "
            "use it to promote competing products if they later acquire competitors, "
            "or license it to third parties — all without the creator's consent or additional payment. "
            "RISK LEVEL: CRITICAL. "
            "COUNTER-CLAUSE: 'Brand is granted a limited, non-exclusive license to use the Content "
            "solely for the purposes described in this agreement, for a period of [60/90] days "
            "from the date of posting, on the platforms specified in Schedule A, "
            "subject to the payment of the Whitelisting Fee specified in Clause [X].'"
        ),
    },
    {
        "id": "redflag_whitelisting_uncompensated_001",
        "source": "synthetic",
        "category": "whitelisting",
        "text": (
            "RED FLAG PATTERN — UNCOMPENSATED WHITELISTING RIGHTS: "
            "Bad clause example: 'Creator grants Brand the right to boost, promote, and run "
            "paid advertisements using Creator's content and Creator's social media handle.' "
            "FLAG REASON: Whitelisting (running paid ads from the creator's handle) is significantly "
            "more valuable than a simple post because: "
            "1. The creator's audience data is being used for targeting "
            "2. The brand's ad appears to come from the creator (higher trust = higher conversion) "
            "3. The creator's handle/reputation is being used commercially "
            "Industry standard: whitelisting is typically compensated at 2x-4x the organic post rate. "
            "This clause grants whitelisting rights as part of the base deal with no separate fee. "
            "RISK LEVEL: HIGH. "
            "COUNTER-CLAUSE: 'Whitelisting rights, if required, shall be separately negotiated "
            "and compensated at a rate of [X] per 30-day period and are not included in the "
            "base collaboration fee.'"
        ),
    },
    {
        "id": "redflag_unbounded_exclusivity_001",
        "source": "synthetic",
        "category": "exclusivity",
        "text": (
            "RED FLAG PATTERN — UNBOUNDED EXCLUSIVITY: "
            "Bad clause example: 'During the term of this agreement, Creator shall not promote, "
            "mention, or be associated with any brand in the same category as Brand.' "
            "FLAG REASON: This clause has two critical missing elements: "
            "1. NO TIME WINDOW — if the 'term' of the agreement is vague or the contract "
            "   auto-renews, the exclusivity could run indefinitely "
            "2. NO CATEGORY DEFINITION — 'same category' is undefined. If the brand is "
            "   a skincare brand, does this exclude all beauty brands? All D2C brands? "
            "   An undefined exclusivity can effectively blacklist the creator from "
            "   their entire niche. "
            "RISK LEVEL: HIGH. A court may interpret 'same category' broadly. "
            "COUNTER-CLAUSE: 'Creator agrees to exclusivity in the [specifically defined category] "
            "for a period of [X days] from the date of last post under this agreement. "
            "Exclusivity is limited to brands offering [specific product type] and does not "
            "apply to existing brand relationships listed in Schedule B.'"
        ),
    },
    {
        "id": "redflag_no_payment_terms_001",
        "source": "synthetic",
        "category": "payment_terms",
        "text": (
            "RED FLAG PATTERN — MISSING/AMBIGUOUS PAYMENT TERMS: "
            "Bad clause example: 'Brand shall pay Creator the agreed fee upon completion of "
            "all deliverables to Brand's satisfaction.' "
            "FLAG REASON: This clause is dangerously vague: "
            "1. 'Agreed fee' — is it written elsewhere? What if there's a dispute about the amount? "
            "2. 'Upon completion' — no specific date or net-payment period (net-30, net-60) "
            "3. 'To Brand's satisfaction' — purely subjective, brand can withhold payment indefinitely "
            "   by claiming dissatisfaction "
            "4. No late payment interest clause — brand has zero incentive to pay on time "
            "5. No kill fee — if brand cancels after creator completes work, creator gets nothing "
            "RISK LEVEL: CRITICAL. "
            "COUNTER-CLAUSE: 'Brand shall pay Creator ₹[AMOUNT] within 30 days of content approval. "
            "Approval shall be deemed granted if Brand does not provide feedback within 5 business days "
            "of submission. A late payment charge of 2% per month shall apply to overdue amounts. "
            "If Brand cancels after Creator has completed 50% of deliverables, a kill fee of "
            "50% of the total agreed fee is payable within 15 days of cancellation.'"
        ),
    },
    {
        "id": "redflag_no_indemnity_creator_001",
        "source": "synthetic",
        "category": "missing_indemnity",
        "text": (
            "RED FLAG PATTERN — ONE-SIDED INDEMNITY (NO CREATOR PROTECTION): "
            "Bad clause example: 'Creator shall indemnify, defend, and hold harmless Brand "
            "and its affiliates from any claims, damages, losses arising from Creator's "
            "content or Creator's breach of this agreement.' "
            "FLAG REASON: This indemnity only runs ONE WAY — from creator to brand. "
            "There is NO corresponding obligation for the brand to indemnify the creator "
            "against claims arising from: "
            "- The brand's product causing harm to a consumer "
            "- The brand's product claims being false (CCPA liability) "
            "- The brand's product being unregistered/illegal (FSSAI, CDSCO) "
            "- Third-party IP infringement by the brand's provided materials "
            "RISK LEVEL: HIGH. "
            "COUNTER-CLAUSE: 'Each party shall indemnify the other against claims arising "
            "from their own acts or omissions. Brand specifically indemnifies Creator against "
            "claims arising from the brand's product, brand's product claims, brand's "
            "regulatory compliance, and any brand-provided materials that infringe third-party IP.'"
        ),
    },
    {
        "id": "redflag_data_no_consent_001",
        "source": "synthetic",
        "category": "data_privacy",
        "text": (
            "RED FLAG PATTERN — DATA COLLECTION WITHOUT DPDP CONSENT MECHANISM: "
            "Bad clause example: 'Creator shall run a giveaway requiring participants to "
            "share their name, email, and phone number, which shall be provided to Brand "
            "for marketing purposes.' "
            "FLAG REASON: This clause: "
            "1. Fails to mention DPDP consent requirements "
            "2. The purpose of data collection ('marketing purposes') is vague "
            "3. No data retention limit specified "
            "4. No right of withdrawal for participants "
            "5. Creator is made an agent of the brand for data collection "
            "   but is not protected if the brand misuses the data "
            "Under the DPDP Act 2023, this exposes the creator as a joint Data Fiduciary. "
            "RISK LEVEL: HIGH. "
            "COUNTER-CLAUSE: 'Any data collection campaign shall be conducted using Brand's "
            "DPDP-compliant consent forms. Creator shall not be responsible for data handling "
            "post-collection. Brand warrants DPDP compliance and indemnifies Creator for "
            "any DPDP enforcement action.'"
        ),
    },
    {
        "id": "redflag_non_indian_jurisdiction_001",
        "source": "synthetic",
        "category": "jurisdiction",
        "text": (
            "RED FLAG PATTERN — NON-INDIAN JURISDICTION: "
            "Bad clause example: 'This agreement shall be governed by the laws of Singapore. "
            "Any disputes shall be subject to the exclusive jurisdiction of the courts of Singapore.' "
            "FLAG REASON: Setting jurisdiction outside India is a significant power imbalance: "
            "1. Indian creator cannot afford Singapore litigation (costs, travel, foreign lawyers) "
            "2. Indian consumer protection laws (CCPA, Consumer Protection Act 2019) may not apply "
            "3. Enforcement of a Singapore court order in India requires separate proceedings "
            "4. Many Indian creators are not aware of their rights under Indian law "
            "   because the contract tells them foreign law applies "
            "Even within India, brand's city exclusive jurisdiction is unfair. "
            "RISK LEVEL: HIGH. "
            "COUNTER-CLAUSE: 'This agreement shall be governed by Indian law. Disputes shall "
            "first be attempted through good-faith negotiation for 30 days, followed by "
            "arbitration under the Arbitration and Conciliation Act, 1996, at a venue "
            "mutually agreed by both parties.'"
        ),
    },
]
