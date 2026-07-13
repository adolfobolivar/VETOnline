# Use Case: View Application Error

## Overview

**Use Case ID:** UC-010   
**Use Case Name:** View Application Error   
**Primary Actor:** Visitor (and Clinic User, via any failure flow)   
**Goal:** Present a friendly error page/component in the React frontend whenever an unhandled exception occurs
during client-side routing or an API request fails, ensuring users are never shown a raw stack trace, an unstyled
JSON payload, or a blank screen. Also reachable on demand via the "Error" navigation link, which mirrors the
VETOnline `/oups` demonstration page.   
**Status:** Approved

## Preconditions

- The VETOnline React application is loaded in the user's browser.
- The AWS CloudFront distribution is successfully serving the static assets.

## Main Success Scenario

1. An unhandled error occurs during application usage (e.g., an API call to API Gateway/Lambda fails, or a React
   component crashes), or the Visitor clicks the "Error" link in the navigation menu.
2. The system (React Error Boundary or global API interceptor) catches the failure and prevents the application
   from crashing.
3. The system renders the application error component inside the MainLayout showing:
    - a heading "Something happened...",
    - a paragraph with a user-friendly error message,
    - a "Back to Home" link that returns the user to the welcome page (UC-001).
4. Visitor optionally follows the "Back to Home" link to exit the error flow and reset the application state.

## Alternative Flows

### A1: Resource Not Found

**Trigger:** The frontend router (e.g., React Router) encounters a URL that does not match any registered route, or
the FastAPI backend returns an HTTP 404 Not Found response (for example UC-005 A1 when an unknown owner id is
supplied, or UC-006 / UC-007 when an owner or pet id cannot be resolved in the Aurora database).
**Flow:**

1. The system resolves the failure to the "Not Found" variant of the error view.
2. The system renders the error view indicating a 404 status and the corresponding "resource not found" message.
3. Use case ends.

### A2: Unexpected Server or Client Error

**Trigger:** Any other uncaught runtime exception in the React application, or an HTTP 500 Internal Server Error
returned by the AWS Lambda backend (FastAPI exception), including the artificial error thrown by the `/oups`
demonstration route.
**Flow:**

1. The system resolves the failure to the generic variant of the error view via a React Error Boundary or HTTP
   interceptor.
2. The system renders the error view indicating an unexpected error (equivalent to HTTP 500) and a safe, generic
   exception message.
3. Use case ends.

### A3: Unauthenticated or Unauthorized Request

**Trigger:** A Clinic User's request to a protected endpoint (UC-003 through UC-009) is rejected by the API Gateway
Cognito Authorizer because the JWT is missing, expired, or invalid (HTTP 401), consistent with UC-011 BR-003.
**Flow:**

1. The frontend's global API interceptor recognizes the 401 response before it reaches component-level error
   handling.
2. For an expired-but-refreshable session, the system attempts the silent refresh described in UC-011 A2 and
   retries the original request rather than showing this error view.
3. If no valid session can be recovered, the system resolves the failure to the "Unauthorized" variant of the error
   view, indicating the user must sign in again.
4. The system offers a "Log In" link (in place of, or alongside, "Back to Home") that starts UC-011.
5. Use case ends.

## Postconditions

### Success Postconditions

- The application error view is rendered inside the React MainLayout.
- The navigation sidebar and top header remain available so the user can leave the error view via any valid
  navigation link without requiring a hard browser refresh.
- No data is modified in the Aurora database.

### Failure Postconditions

- None — the error view is itself the terminal state for failed navigations and requests.

## Business Rules

### BR-001: Anonymous Access

The application error view is reachable without Cognito authentication. This matches UC-001 and UC-002, ensuring
that errors occurring before or during login are handled gracefully.

### BR-002: Navigation Shell Preserved

The error view must render inside the React MainLayout so the navigation shell remains functional. Users must never
be stranded on a blank "White Screen of Death" (a common issue in React if Error Boundaries are not used).

### BR-003: Message Only, No Stack Trace

- The error view displays a user-friendly message but never the backend Python/FastAPI stack trace, nor the
  frontend JavaScript stack trace.
- The backend FastAPI application must be configured to catch exceptions and return sanitized JSON error messages
  in production.
- Raw stack traces remain visible in AWS CloudWatch logs (backend) and browser developer tools (frontend) only.

### BR-004: Unauthorized Requests Recoverable Without Data Loss

Resolving the "Unauthorized" variant (A3) never discards in-progress form input silently beyond what is already
lost by a hard navigation; where feasible, the frontend should preserve the user's intended destination so it can
resume immediately after re-authenticating via UC-011.

### BR-005: /oups Demonstration Route

A `/oups` route exists purely to demonstrate the error view. Navigating to it triggers an intentional failure
(either by throwing a hardcoded React error or calling a dedicated mock endpoint in FastAPI that returns an HTTP
500). Its message must be "Expected: controller used to showcase what happens when an exception is thrown",
honoring the original VETOnline specifications.
