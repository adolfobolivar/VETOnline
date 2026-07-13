# Use Case: View Application Error

## Overview

**Use Case ID:** UC-010   
**Use Case Name:** View Application Error   
**Primary Actor:** Visitor (and Clinic User, via any failure flow)   
**Goal:** Present a friendly error view whenever an unhandled error occurs during navigation or an API request
fails, ensuring users are never shown a raw stack trace, an unstyled error payload, or a blank screen. Also
reachable on demand via the "Error" navigation link, which mirrors the VETOnline `/oups` demonstration page.   
**Status:** Approved

## Preconditions

- The VETOnline application is loaded in the user's browser.

## Main Success Scenario

1. An unhandled error occurs during application usage (e.g., an API request fails, or the application encounters an
   unexpected error), or the Visitor clicks the "Error" link in the navigation menu.
2. The system catches the failure and prevents the application from crashing.
3. The system renders the application error view within the standard page layout, showing:
    - a heading "Something happened...",
    - a paragraph with a user-friendly error message,
    - a "Back to Home" link that returns the user to the welcome page (UC-001).
4. Visitor optionally follows the "Back to Home" link to exit the error flow and reset the application state.

## Alternative Flows

### A1: Resource Not Found

**Trigger:** The requested page does not exist, or the backend returns an HTTP 404 Not Found response (for example
UC-005 A1 when an unknown owner id is supplied, or UC-006 / UC-007 when an owner or pet id cannot be resolved).
**Flow:**

1. The system resolves the failure to the "Not Found" variant of the error view.
2. The system renders the error view indicating a 404 status and the corresponding "resource not found" message.
3. Use case ends.

### A2: Unexpected Server or Client Error

**Trigger:** Any other uncaught error in the application, or an HTTP 500 Internal Server Error returned by the
backend, including the artificial error thrown by the `/oups` demonstration route.
**Flow:**

1. The system resolves the failure to the generic variant of the error view.
2. The system renders the error view indicating an unexpected error (equivalent to HTTP 500) and a safe, generic
   exception message.
3. Use case ends.

### A3: Unauthenticated or Unauthorized Request

**Trigger:** A Clinic User's request to a protected endpoint (UC-003 through UC-009) is rejected because the
session is missing, expired, or invalid (HTTP 401), consistent with UC-011 BR-003.
**Flow:**

1. The system recognizes the 401 response before it reaches the generic error handling.
2. For an expired-but-refreshable session, the system attempts the silent refresh described in UC-011 A2 and
   retries the original request rather than showing this error view.
3. If no valid session can be recovered, the system resolves the failure to the "Unauthorized" variant of the error
   view, indicating the user must sign in again.
4. The system offers a "Log In" link (in place of, or alongside, "Back to Home") that starts UC-011.
5. Use case ends.

## Postconditions

### Success Postconditions

- The application error view is rendered within the standard page layout.
- The navigation sidebar and top header remain available so the user can leave the error view via any valid
  navigation link without requiring a hard browser refresh.
- No data is modified.

### Failure Postconditions

- None — the error view is itself the terminal state for failed navigations and requests.

## Business Rules

### BR-001: Anonymous Access

The application error view is reachable without authentication. This matches UC-001 and UC-002, ensuring that
errors occurring before or during login are handled gracefully.

### BR-002: Navigation Shell Preserved

The error view must render within the standard page layout so the navigation shell remains functional. Users must
never be stranded on a blank screen with no way to navigate away.

### BR-003: Message Only, No Stack Trace

- The error view displays a user-friendly message but never a backend or frontend stack trace.
- The backend must be configured to catch exceptions and return sanitized error messages in production.
- Raw stack traces remain visible only in server-side logs and browser developer tools, never in the response
  shown to the user.

### BR-004: Unauthorized Requests Recoverable Without Data Loss

Resolving the "Unauthorized" variant (A3) never discards in-progress form input silently beyond what is already
lost by a hard navigation; where feasible, the frontend should preserve the user's intended destination so it can
resume immediately after re-authenticating via UC-011.

### BR-005: /oups Demonstration Route

A `/oups` route exists purely to demonstrate the error view. Navigating to it triggers an intentional failure
(either a hardcoded error or a dedicated mock endpoint that returns an HTTP 500). Its message must be "Expected:
controller used to showcase what happens when an exception is thrown", honoring the original VETOnline
specifications.
