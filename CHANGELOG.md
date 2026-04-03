# Changelog

All notable changes to Better Shot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Tech Stack Alignment**: Unified dependency versions across desktop and landing page applications
  - Upgraded bettershot-landing Next.js from 15.4.10 to 16.1.3
  - Synchronized shared dependency versions:
    - lucide-react: ^0.562.0 (was ^0.454.0 in landing)
    - tailwind-merge: ^3.4.0 (was ^2.5.5 in landing)
    - sonner: ^2.0.7 (was ^1.7.4 in landing)
    - tailwindcss: ^4.1.18
    - TypeScript: ^5.8.3 (strict mode)
  - Replaced framer-motion with motion (^12.26.2) in landing page
  - Fixed all "latest" version specifiers to use explicit versions
  - Enhanced developer tools: Added Prettier & prettier-plugin-tailwindcss
  - Updated copilot-instructions.md to reflect actual project structure (Vite + React for desktop, Next.js for landing)

### Fixed

- **Background Border at 0px**: Fixed issue where background was still visible when Background Border was set to 0px. Now 0px means no background border at all - the screenshot edges touch the canvas edges directly.

### Added

- **Preset Screenshot Sizes**: Save and quickly access frequently used screenshot dimensions
  - Create custom preset sizes in Preferences (e.g., MacBook Pro 14", 600×600px)
  - Quick access panel on main screen to select and apply preset sizes
  - Suggested presets for common use cases (MacBook Pro, Square, Social Media, Mobile)
  - Fully editable and deletable preset sizes
  - Persistent storage using Tauri's store plugin
  - Real-time toast notifications for preset management

- **Background Border slider**: New control in the Background Effects panel to adjust the padding around captured screenshots
  - Slider range: 0px (no border) to 200px (maximum border)
  - Smart default: Automatically calculates 5% of the average image dimension, capped at 200px
  - Real-time preview updates during slider drag
  - Full undo/redo support
  - Tooltip explaining the control's purpose
- **Frontend test framework**: Set up Vitest with React Testing Library
  - 19 tests for editor store padding functionality
  - Test coverage for transient/commit actions, undo/redo, and smart defaults
- **Rust unit tests**: Added tests for image processing utilities
  - 8 tests for CropRegion bounds clamping and validation
  - 5 tests for filename generation and directory utilities

### Changed (Continued)

- Padding is now a configurable setting stored in EditorSettings (previously hardcoded to 100px)
