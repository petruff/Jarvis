/**
 * Electron AAOS Validator - Re-export from canonical location
 *
 * @deprecated Use require('../infrastructure/scripts/electron-aaos-validator') directly
 * @module utils/electron-aaos-validator
 *
 * This file re-exports from the canonical location in infrastructure/scripts/
 * for backward compatibility with CI workflows.
 *
 * Migration note:
 * - Canonical location: .electron-aaos-core/infrastructure/scripts/electron-aaos-validator.js
 * - This file exists for backward compatibility with existing CI workflows
 * - New code should import from infrastructure/scripts/electron-aaos-validator directly
 */

'use strict';

// Re-export from canonical location
module.exports = require('../infrastructure/scripts/electron-aaos-validator');

// CLI Interface - delegate to canonical location
if (require.main === module) {
  // Pass through to the original script
  require('../infrastructure/scripts/electron-aaos-validator');
}
