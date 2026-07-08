# Use Case: Clinic User Login

## Overview

**Use Case ID:** UC-011   
**Use Case Name:** Clinic User Login   
**Primary Actor:** Clinic User   
**Goal:** Authenticate via Amazon Cognito to obtain a session (JWT) authorizing access to the clinic-management
actions (UC-003 through UC-009).   
**Status:** Approved

## Preconditions

- The Clinic User has a valid Cognito account provisioned by clinic administration.
- The VETOnline React application is loaded in the browser.

## Main Success Scenario

1. Clinic User clicks "Login", or is redirected to the login form after attempting a protected action while
   unauthenticated.
2. System presents the Cognito-backed login form requesting username/email and password.
3. Clinic User submits valid credentials.
4. Cognito authenticates the credentials and returns an access token, ID token, and refresh token to the frontend.
5. System (React app via the Amplify SDK) stores the session tokens and attaches the access token as a Bearer JWT on
   every subsequent API request.
6. System redirects the Clinic User to the Find Owners view (UC-004) as the default landing screen for authenticated
   staff.

## Alternative Flows

### A1: Invalid Credentials

**Trigger:** Cognito rejects the submitted username/password in step 4.
**Flow:**

1. System re-renders the login form with the error "Incorrect username or password."
2. Clinic User re-enters credentials.
3. Use case continues at step 3.

### A2: Session Expired

**Trigger:** An access token has expired when the Clinic User attempts a protected action.
**Flow:**

1. API Gateway's Cognito Authorizer rejects the request with HTTP 401.
2. System attempts a silent refresh using the stored refresh token.
3. If the refresh succeeds, the system retries the original request transparently and the use case continues at the
   point of interruption.
4. If the refresh fails (e.g., the refresh token has also expired), the system clears the stored session and
   redirects the Clinic User to the login form (main scenario, step 2), preserving the originally intended
   destination so it can resume after re-authentication.

### A3: Logout

**Trigger:** Clinic User clicks "Logout" from any authenticated view.
**Flow:**

1. System clears the stored session tokens.
2. System redirects to the welcome page (UC-001).
3. Use case ends.

## Postconditions

### Success Postconditions

- The Clinic User holds a valid JWT session usable for all clinic-management use cases (UC-003 through UC-009).
- No clinic data is modified by the login action itself.

### Failure Postconditions

- No session is established; the Clinic User remains on the login form.

## Business Rules

### BR-001: Cognito is System of Record for Credentials

Clinic User accounts, passwords, and password resets are managed entirely by Amazon Cognito; the application never
stores or validates passwords itself.

### BR-002: Single Role

All Clinic Users share one role/permission level in this version of the system; there is no differentiation between
staff types (see `vision.md` — role-based permissions are out of scope).

### BR-003: JWT Required for Protected Actions

Every request to a clinic-management endpoint (UC-003 through UC-009) must carry a valid, unexpired Cognito-issued
JWT. Requests without one are rejected with HTTP 401 by the API Gateway Cognito Authorizer before reaching the
application code (see UC-010 A3).

### BR-004: Anonymous Endpoints Unaffected

The welcome page (UC-001) and veterinarian directory (UC-002) remain accessible without authentication; login is only
required for clinic-management actions.
