// File: common/utils/status-mapper.js

/**
 * Status Mapper - Bidirectional status mapping between Electron AAOS and ClickUp
 *
 * This module provides utilities for:
 * - Mapping Electron AAOS story statuses to ClickUp custom field values
 * - Mapping ClickUp story-status values back to Electron AAOS statuses
 * - Handling ClickUp-specific statuses (e.g., "Ready for Dev")
 *
 * CRITICAL: Stories use ClickUp custom field "story-status", NOT native status.
 * Epics use the native ClickUp status field (Planning, In Progress, Done).
 */

const STATUS_MAPPING = {
  Electron AAOS_TO_CLICKUP: {
    'Draft': 'Draft',
    'Ready for Review': 'Ready for Review',
    'Review': 'Review',
    'In Progress': 'In Progress',
    'Done': 'Done',
    'Blocked': 'Blocked',
  },
  CLICKUP_TO_Electron AAOS: {
    'Draft': 'Draft',
    'Ready for Dev': 'Ready for Review',  // ClickUp-specific status
    'Ready for Review': 'Ready for Review',
    'Review': 'Review',
    'In Progress': 'In Progress',
    'Done': 'Done',
    'Blocked': 'Blocked',
  },
};

/**
 * Maps an Electron AAOS story status to ClickUp story-status custom field value
 *
 * @param {string} electron-aaosStatus - Local .md file status
 * @returns {string} ClickUp story-status value
 */
function mapStatusToClickUp(electron-aaosStatus) {
  const mapped = STATUS_MAPPING.Electron AAOS_TO_CLICKUP[electron-aaosStatus];

  if (!mapped) {
    console.warn(`Unknown Electron AAOS status: ${electron-aaosStatus}, using as-is`);
    return electron-aaosStatus;
  }

  return mapped;
}

/**
 * Maps a ClickUp story-status custom field value to Electron AAOS story status
 *
 * @param {string} clickupStatus - ClickUp story-status value
 * @returns {string} Local .md file status
 */
function mapStatusFromClickUp(clickupStatus) {
  const mapped = STATUS_MAPPING.CLICKUP_TO_Electron AAOS[clickupStatus];

  if (!mapped) {
    console.warn(`Unknown ClickUp status: ${clickupStatus}, using as-is`);
    return clickupStatus;
  }

  return mapped;
}

/**
 * Validates if a status is a valid Electron AAOS story status
 *
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid
 */
function isValidElectron AAOSStatus(status) {
  return Object.keys(STATUS_MAPPING.Electron AAOS_TO_CLICKUP).includes(status);
}

/**
 * Validates if a status is a valid ClickUp story-status value
 *
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid
 */
function isValidClickUpStatus(status) {
  return Object.keys(STATUS_MAPPING.CLICKUP_TO_Electron AAOS).includes(status);
}

/**
 * Gets all valid Electron AAOS story statuses
 *
 * @returns {string[]} Array of valid statuses
 */
function getValidElectron AAOSStatuses() {
  return Object.keys(STATUS_MAPPING.Electron AAOS_TO_CLICKUP);
}

/**
 * Gets all valid ClickUp story-status values
 *
 * @returns {string[]} Array of valid statuses
 */
function getValidClickUpStatuses() {
  return Object.keys(STATUS_MAPPING.CLICKUP_TO_Electron AAOS);
}

module.exports = {
  mapStatusToClickUp,
  mapStatusFromClickUp,
  isValidElectron AAOSStatus,
  isValidClickUpStatus,
  getValidElectron AAOSStatuses,
  getValidClickUpStatuses,
  STATUS_MAPPING, // Export for testing
};
