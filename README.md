# wellium

[![GitHub](https://img.shields.io/badge/github-by--The--Lindemans/wellium-8da0cb?style=for-the-badge&labelColor=007fff&logo=github)](https://github.com/by-The-Lindemans/wellium) [![License: MPL2](https://img.shields.io/badge/License-MPLv2-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MPL-2.0) [![GitHub contributors](https://img.shields.io/github/contributors/by-The-Lindemans/wellium.svg?style=for-the-badge)](https://github.com/by-The-Lindemans/wellium/graphs/contributors) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

**wellium** puts you squarely in charge of your own health story by keeping your medical records on devices you control and sharing them securely with clinicians.  Many cloud-based health platforms can raise concerns around privacy, and may even affect insurance or treatment without your knowledge.  By combining user-first ownership with seamless provider collaboration, wellium gives you a single source of truth for all your health information.

Built on Ionic (a cross-platform web framework) and Capacitor (a native-bridge layer), wellium runs natively on Android, iOS, the web, and desktop.  Records live locally in a lightweight SQLite database and are encrypted at rest under AES-256.  When you share or sync data, we employ a hybrid post-quantum scheme, using Kyber (via our ML-KEM wrapper) to negotiate session keys, and then AES-256 to encrypt the bulk data, so your information stays confidential even against future quantum attacks.  You can import CSV files or FHIR XML exports (Fast Healthcare Interoperability Resources) from sources like Apple Health, and export in the same standard formats for backup or sharing.  All telemetry and error logs go to a local JSON file or (optionally) to Sentry, so you can troubleshoot without leaking personal details.

Our next focus is on provider collaboration and uninterrupted ownership. We plan to support automated FHIR syncing with clinics and labs and to enable offline‑first workflows so you and your care team stay in sync even without a network. Future updates will add conflict resolution with CRDTs (conflict‑free replicated data types) and on‑device analytics that highlight trends without ever sending raw health data to a server.

---

## Quick Start

1. Install prerequisites: Node.js (version ≥16) and npm; Ionic CLI (run `npm install -g @ionic/cli`).
2. Clone the repository:

   ```bash
   git clone https://github.com/by-The-Lindemans/wellium.git
   cd wellium
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Run in browser for development:

   ```bash
   ionic serve
   ```

5. Build and run on device (Android example):

   ```bash
   ionic build
   npx cap add android
   npx cap open android
   ```

---

## Community & Support

Need help or want to share ideas? Open an issue on GitHub or join our discussion board:

- [Issue tracker](https://github.com/by-The-Lindemans/wellium/issues)
- [Discussion board](https://github.com/by-The-Lindemans/wellium/discussions)

---

## Contributing

We welcome work that strengthens patient ownership and provider collaboration. When you submit a pull request:

- Read [CONTRIBUTING.md](CONTRIBUTING.md) and follow the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- Run `npm test` and keep all tests passing.
- Explain how your change helps users keep an accurate health record in one place and work more smoothly with their care providers.

Your contributions help build a health platform that respects patient data and empowers care teams.

---

© 2025 by The Lindemans; licensed under MPL‑2.0 (Mozilla Public License 2.0). Governance documents use CC0‑1.0.
