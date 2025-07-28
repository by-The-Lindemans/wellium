# wellium

[![GitHub](https://img.shields.io/badge/github-by--The--Lindemans/wellium-8da0cb?style=for-the-badge&labelColor=007fff&logo=github)](https://github.com/by-The-Lindemans/wellium) [![License: MPL2](https://img.shields.io/badge/License-MPLv2-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MPL-2.0) [![GitHub contributors](https://img.shields.io/github/contributors/by-The-Lindemans/wellium.svg?style=for-the-badge)](https://github.com/by-The-Lindemans/wellium/graphs/contributors) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

**wellium** puts you at the center of your health story by keeping records on your devices and sharing them securely with care providers. Health data stored in corporate clouds can influence insurance, credit or treatment without your knowledge; by combining patient control with provider collaboration, wellium gives you a single source of truth for health information.

Built on Ionic (a cross‑platform web framework) and Capacitor (native device bridge), wellium runs on Android, iOS, web, and desktop. It saves records locally in a lightweight SQLite database and encrypts data with AES‑256; AES‑256 is a widely used standard for secure encryption. You can import CSV files or FHIR XML exports from apps like Apple Health; FHIR are Fast Healthcare Interoperability Resources, the industry-standard format for exchanging medical data. Manual export options let you back up or share your records in standard formats. The app writes logs to a local JSON file or to Sentry (an optional error tracker) so you can troubleshoot issues without exposing personal details.

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
- Complete the privacy checklist in the [pull request template](.github/PULL_REQUEST_TEMPLATE.md).
- Explain how your change enhances our single source of truth or provider integration.

Your contributions help build a health platform that respects patient data and empowers care teams.

---

© 2025 by The Lindemans; licensed under MPL‑2.0 (Mozilla Public License 2.0). Governance documents use CC0‑1.0.
