# Brandon QA Test Script
**Use this to manually verify each fix before showing Brandon.**

For every test: type the question into the chat exactly as written, then check the bot's response against the "correct answer" column. The bot doesn't need to say the exact words — it just needs to hit the key facts marked with ✓.

Set your test profile before starting:
- **Name:** Test Employee
- **Age:** 35
- **State:** TX (Texas)
- **Coverage tier:** Employee + Spouse

---

## TEST 1 — Enhanced HSA deductible

**Ask:** `What is the deductible for the Enhanced HSA plan?`

| What to check | Correct answer |
|---|---|
| Individual deductible amount | ✓ $2,000 |
| Must NOT say | ✗ $2,500 |

---

## TEST 2 — Enhanced HSA coinsurance

**Ask:** `What percentage do I pay after my deductible on the Enhanced HSA?`

| What to check | Correct answer |
|---|---|
| Coinsurance rate | ✓ 20% |
| Must NOT say | ✗ 15% |

---

## TEST 3 — No "Centers of Excellence" on Enhanced HSA

**Ask:** `What are the key features of the Enhanced HSA plan?`

| What to check | Correct answer |
|---|---|
| Features mentioned | ✓ Enhanced HSA contribution, Nationwide provider access |
| Must NOT appear | ✗ Centers of Excellence |

---

## TEST 4 — Dental orthodontia coverage

**Ask:** `How does orthodontia work under the dental plan? What does it cover for braces?`

| What to check | Correct answer |
|---|---|
| Coverage structure | ✓ 50% covered |
| Lifetime maximum | ✓ $1,000 lifetime max |
| Must NOT say | ✗ $500 copay |
| Must NOT say | ✗ $500 co-pay |

---

## TEST 5 — Life insurance Guaranteed Issue amount

**Ask:** `What is the guaranteed issue amount for the voluntary term life insurance?`

| What to check | Correct answer |
|---|---|
| GI amount | ✓ $200,000 |
| Initial enrollment note | ✓ Some mention that this is for initial / first-time open enrollment only, not available every year |
| Must NOT say | ✗ $150,000 |

---

## TEST 6 — STD duration

**Ask:** `How long does short-term disability last?`

**Also ask:** `How many weeks of STD do I get?`

| What to check | Correct answer |
|---|---|
| Duration | ✓ 26 weeks |
| Must NOT say | ✗ 13 weeks |
| Must NOT say | ✗ 12-26 weeks |

---

## TEST 7 — STD and LTD coverage percentage

**Ask:** `What percentage of my salary does short-term disability pay? What about long-term disability?`

| What to check | Correct answer |
|---|---|
| STD benefit | ✓ 60% of salary |
| LTD benefit | ✓ 60% of salary |
| Must NOT say | ✗ Any other percentage for either |

---

## TEST 8 — Kaiser NOT available in Texas

**Ask:** `What medical plans are available to me?`
*(Make sure your state is set to TX before asking this)*

| What to check | Correct answer |
|---|---|
| Plans shown | ✓ Standard HSA and Enhanced HSA |
| Must NOT appear | ✗ Kaiser |
| Must NOT appear | ✗ Kaiser Standard HMO |
| Must NOT appear | ✗ HMO |

---

## TEST 9 — Life insurance recommendation (no "employer guidance")

**Ask:** `Should I do term life or whole life insurance? What do you recommend?`

| What to check | Correct answer |
|---|---|
| Opens with positioning | ✓ Starts with explanation of WHY both term and whole life have a role (not a ratio) |
| Key phrase | ✓ Mentions that term coverage "typically ends later in life" or similar |
| Key phrase | ✓ Mentions whole life "fills the gap" or provides "lifetime protection" |
| Must NOT say | ✗ "employer guidance" |
| Must NOT say | ✗ "80% Voluntary Term Life / 20% Whole Life" as the opening line |
| Brandon's exact language (optional) | ✓ Can reference "final expenses, legacy planning, estate needs" |

---

## TEST 10 — Life insurance recommendation is proactive

**Ask:** `Tell me about life insurance.`
*(This is a general opener — the bot should give you the whole-life positioning without you having to ask specifically)*

| What to check | Correct answer |
|---|---|
| Bot covers term vs. whole life proactively | ✓ Mentions both options and why they complement each other |
| Does not just list plan names | ✓ Gives context about the value of each |

---

## BONUS — Dental basic services (Brandon confirmed these were working)

**Ask:** `What does the dental plan cover for fillings and cleanings?`

| What to check | Correct answer |
|---|---|
| Preventive (cleanings) | ✓ 100% covered |
| Basic (fillings) | ✓ 80% covered (20% coinsurance) |
| Major services | ✓ 50% covered |

---

## Notes for when you get the 2026 plan docs

These items are still using placeholder/unverified values and will need a second pass:

| What to fix | Current value | Brandon says |
|---|---|---|
| Emp+spouse pricing (which plan?) | Standard: $210.52/mo, Enhanced: $295.42/mo | Should be $631.17 somewhere |
| Enhanced HSA out-of-pocket max | $5,500 | "not correct" — need doc |
| Standard HSA out-of-pocket max | $6,500 | "not correct" — need doc |
| Vision rates | Emp only: $12.40, +spouse: $22.60, etc. | "rates are wrong" — need doc |
| PPO plan | Does not exist | "PPO plan is missing" — need doc |
| HSA employer contributions | One set for both plans | Standard gets more than Enhanced — need doc |
| Kaiser plans | Brandon said "will send info later" | Pending |
