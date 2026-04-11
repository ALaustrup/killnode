# KillNode — Legal Notice, Ethical Usage Agreement, Privacy Policy, and Terms of Use

**Effective date:** April 11, 2026  
**Project:** KillNode  
**Repository:** `killnode`

---

## Read this first (plain language)

**Do not use KillNode for malicious, illegal, or unauthorized activities.** Even when the software could be misused, you must not. The maintainers are **not responsible or liable** for what you do with it, for any harm that results, or for any legal consequences—**period**. The formal sections below restate this in legal language; if anything seems unclear, the rule is still: lawful, authorized use only.

---

## Ethical Usage Agreement

KillNode is provided for **legitimate privacy research, network administration, personal security hardening, and lawful operational use** only.

**You must not use this software for malicious, illegal, or unauthorized activities.**

By downloading, building, installing, or using KillNode in any form, you agree that:

1. You will comply with all applicable local, national, and international laws and regulations.
2. You will not use KillNode to harm individuals, organizations, or infrastructure; to conduct unauthorized access; to evade law enforcement in furtherance of crime; or to violate the rights of others.
3. You will obtain **explicit authorization** before using network-disconnection, proxy, or anonymity features on systems or networks you do not own or are not expressly permitted to administer.
4. You understand that **anonymity and privacy tools are not a license to break the law** and do not guarantee immunity from investigation or prosecution where unlawful conduct occurs.
5. You are solely responsible for how you configure and operate Tor, proxies, and any bundled or external network components, including compliance with Tor Project policies and applicable export or sanctions rules.

Failure to abide by this agreement voids any goodwill license to use the software and may expose you to civil or criminal liability independent of this project.

---

## Disclaimer of Warranty

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE DEVELOPERS AND CONTRIBUTORS OF KILLNODE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OR INABILITY TO USE THE SOFTWARE.

**The developers and creators of KillNode are strictly not responsible nor liable for any actions taken by the user, nor any consequences, damages, or legal issues that arise from the use of this software, no matter what.**

---

## Privacy Policy (Project & Website)

### Data collected by the KillNode website (self-hosted)

When you deploy the included Next.js site yourself:

- **Blog content** is stored in **SQLite** via **Prisma** (see `website/prisma/schema.prisma`) at `website/data/killnode.db` (path fixed in the schema as `file:../data/killnode.db` relative to the `prisma/` directory).
- **Admin authentication** uses an HTTP-only session cookie; credentials must be set via environment variables in production. The default demo credentials are **not** safe for public deployment.
- No third-party analytics are included by default. If you add analytics, you must disclose that separately.

### Data collected by the KillNode desktop application

- The desktop client persists **settings and torrent job metadata** in a **SQLite** database under the Electron **userData** directory (`killnode.db`), accessed through **Prisma** (`desktop/prisma/schema.prisma`).
- **Downloaded torrent payload bytes** are written under `userData/torrents` when you use the swarm engine.
- **Tor and proxy traffic** is handled by Tor and your system network stack; this project does not operate a central telemetry server by default.
- Crash logs or diagnostics are **not** transmitted unless you explicitly integrate such tooling.

### Contact

For privacy inquiries related to a deployment you control, designate a contact in your own deployment documentation. The open-source maintainers do not operate a single global “KillNode service” on your behalf.

---

## Terms of Use

1. **License.** KillNode source code is licensed under the terms stated in the `LICENSE` file in the repository root (MIT unless otherwise noted). Third-party components (for example, Tor) remain under their respective licenses.
2. **No professional services.** Documentation does not constitute legal, security, or compliance advice. Engage qualified professionals for regulated environments.
3. **Security.** You are responsible for patching dependencies, rotating secrets, and hardening hosts. Network-disconnection features can cause outages; test in safe environments first.
4. **Trademarks.** “KillNode” and associated branding are project identifiers; do not imply endorsement where none exists.
5. **Changes.** These terms may be updated in the repository; the version in `main` at the time you clone or pull governs your copy unless you maintain a fork with different terms.

---

## Responsible disclosure

If you discover a security vulnerability in this repository’s code, report it to the repository maintainer via the contact method published on the GitHub project (for example, Security Advisories or maintainer email). Do not use vulnerabilities to access systems without authorization.

---

## Acknowledgment

BY USING KILLNODE, YOU ACKNOWLEDGE THAT YOU HAVE READ THIS DOCUMENT AND AGREE TO ITS TERMS AND THE ETHICAL USAGE AGREEMENT ABOVE.
