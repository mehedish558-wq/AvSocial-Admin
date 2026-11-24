# Implementation Plan - Advanced Content & User Reports Moderation Hub

Implement advanced filtering, bulk actions, report assignment/claiming, moderator internal notes, target user warning strike count, and real-time multi-moderator synchronization.

## Proposed Changes

### [Admin Panel - Moderation Hub]

#### [MODIFY] [Moderation.tsx](file:///C:/Users/Feelings%20Of%20Hearts/Desktop/New%20folder%20%282%29/AvSocial/AvSocial-Admin/src/pages/Moderation.tsx)
- Add advanced filters (Status: Pending/Resolved/Dismissed, Assignment: All/Assigned to Me/Unassigned).
- Add bulk selection checkboxes and bulk action buttons (Bulk Resolve, Bulk Dismiss).
- Add report assignment ("Claim / In Review") and moderator notes modal/input.
- Fetch user warning count from `user_warnings` for target users.
- Set up Supabase Realtime subscription on `reported_content` for instant multi-moderator updates.

### [Database / SQL Schema]
- Add optional columns to `public.reported_content`: `resolved_by`, `assigned_to`, `moderator_notes`.

## Verification Plan
- Verify filter, bulk actions, and real-time updates.
