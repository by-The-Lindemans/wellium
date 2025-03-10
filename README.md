# wellium

[![GitHub](https://img.shields.io/badge/github-by--The--Lindemans/wellium-8da0cb?style=for-the-badge&labelColor=007fff&logo=github)](https://github.com/by-The-Lindemans/wellium)
[![License: MIT](https://img.shields.io/badge/License-MPLv2-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MPL-2-0)
[![GitHub contributors](https://img.shields.io/github/contributors/by-The-Lindemans/wellium.svg?style=for-the-badge)](https://github.com/by-The-Lindemans/wellium/graphs/contributors)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)


# Wellium Project Technical Documentation

## Overview

Wellium will be a privacy-first wellness platform designed to give users full control over their health data. It will operate entirely on-device, ensuring no cloud storage or third-party data processing. Users will be able to securely import, manage, and share their data while maintaining complete ownership over how and with whom it is used. Secure, encrypted local synchronization will enable seamless access across a user’s devices, while encrypted peer-to-peer sharing will allow trusted data exchange with healthcare providers or authorized individuals.

## Core Principles

- **User Empowerment:** Users will retain full ownership and control over their data.
- **Privacy-First Approach:** All data will be stored and processed locally, with no cloud storage.
- **Cross-Platform Accessibility:** A Flutter-based UI will ensure seamless experiences across mobile and desktop.
- **Decentralized Local Sync:** Users will be able to securely sync data across their devices without external servers.
- **User-Controlled Data Sharing:** Encrypted peer-to-peer connections will allow users to share specific data with trusted individuals, with granular access controls.
- **Interoperability Standards:** Data will follow FHIR (Fast Healthcare Interoperability Resources) standards for external system compatibility.
- **ML as a Future Goal:** While machine learning insights are a planned feature, the initial focus will be on user-driven data management and security.

## System Architecture

### **1. Client Applications**

- **Frontend Framework:** Wellium will be built with Flutter using Riverpod for state management.
- **Error Monitoring:** Sentry will be integrated for tracking application errors.
- **Cross-Platform Support:** A single codebase will ensure consistency across Android, iOS, desktop, and web.
- **Wearables Integration:** Support will be included for Fitbit, Garmin, and Apple Watch via Bluetooth Low Energy (BLE) and direct file imports.
- **Data Management:** Users will be able to manually import, categorize, and manage their health data for full control over storage and analysis.
- **Offline Mode:** The platform will be fully functional without an internet connection.
- **Background Sync:** Local device sync will operate efficiently in the background, minimizing resource consumption while keeping data up to date.

### **2. Data Storage & Privacy**

- **Local Storage Only:** No cloud services or remote data transfer will be used.
- **Database:** Hive will be used to ensure efficient, local storage across platforms.
- **Encrypted Local Sync:** Secure synchronization between a user's personal devices will be implemented without centralization.
- **User-Controlled Backups:** Users will be able to export their data for local backups or transfers.
- **End-to-End Encryption:** All stored and shared data will be encrypted using device-bound keys.
- **Secure Data Sharing:**
  - Users will be able to enable encrypted peer-to-peer sharing with providers or trusted individuals.
  - Granular permissions will allow selective dataset access, time limits, and instant revocation.
  - No external servers or cloud storage will be involved.
- **Threat Model:**
  - Strong encryption and device authentication will prevent unauthorized access.
  - The attack surface will be minimized by keeping data local and avoiding third-party dependencies.
  - End-to-end encryption will protect peer-to-peer connections from interception or tampering.

### **3. Contribution & Development Workflow**

- **Version Control:** A Git repository will be used with enforced code reviews.
- **CI/CD Pipeline:** Automated testing and deployment for mobile and desktop builds will be implemented.
- **Modular Development:** Independent Flutter packages will ensure reusability and flexibility.
- **Issue Tracking & Documentation:** Contribution guidelines and structured issue tracking will be maintained in an open repository.
- **Customization & Accessibility:**
  - Users will be able to personalize themes, font sizes, and other UI elements.
  - Features will be designed with accessibility in mind.
- **Localization:** Multi-language support will be planned, with community-driven translation contributions encouraged.

## Ensuring Compliance with Project Goals

Contributors should verify that their work aligns with Wellium’s core principles. When making changes or additions:

1. **User-Centric Focus:** Ensure features enhance usability and accessibility.
2. **Privacy & Security Compliance:** Adhere strictly to local data storage and processing standards.
3. **Performance & Efficiency:** Implement lightweight, optimized solutions for on-device execution.
4. **Open-Source Integrity:** Keep contributions modular and well-documented for community adoption.
5. **Testing & Validation:** Include unit tests, integration tests, and security reviews before deployment.

By following these guidelines, team members will help establish Wellium as a secure, user-friendly, privacy-first wellness platform that prioritizes user-driven data management, secure sharing, and on-device control, with ML insights as a potential future enhancement.


## Contributing

We welcome contributions from the community! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for instructions on how to contribute to the project.

- Fork the repository
- Create a new branch
- Make your changes and submit a pull request


## Support

If you have any questions or need help, feel free to [open an issue](https://github.com/by-The-Lindemans/wellium/issues).
