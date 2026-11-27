# CSE341-Final

## OVERVIEW
Our Lost and Found API lets community members browse lost and found posts, submit private ownership claims, and exchange messages about a claim. Visitors can search public posts. Google or GitHub login creates a browser session for protected operations. Signed-in users can manage their own profiles; post owners and administrators can review ownership claims. The mounted collection routes and current implementation limitations are documented at `/api-docs/`.

## KEY FEATURES
- Public post browsing, keyword search, and category, status, and date filters
- Google and GitHub OAuth with MongoDB-backed browser sessions
- Self-service profile reading, name/email updates, and guarded account deletion
- Private ownership claims and conversations between claimants and post owners
- Post status changes to lost, found, or returned
- Administrator user listing and claim review
- Interactive Swagger documentation grouped by collection

## BENEFITS
-Makes it easier for people to recover lost items
- Encourages community participation and communication
- Keeps the dashboard organized and up to date
- Provides moderation tools to help maintain safety and accuracy

## PROBLEM
- A person loses an item, looks but just can't find it
- A person wants to communicate with the finder about whether the item really is theirs

## SOLUTION
- Another person finds an item but wants to return it
- Two-way communication for users in a chat
- Any inappropriate communication can be removed

## DATABASE

The collection API uses these models:

| Collection | Fields and relationships |
| --- | --- |
| `posts` | `_id`, `user` (owner ID), `title`, `content`, `category`, `status`, `createdAt`, `updatedAt`. Categories: `jewelry`, `household`, `pet`, `clothing`, `other`. Statuses: `lost`, `found`, `returned`. |
| `users` | `_id`, `name`, optional `email`, provider identifiers `googleId`/`githubId`, and `role` (`user` or `admin`). Public profile responses exclude provider identifiers. `createdAt` is selected when present, but automatic user timestamps are not currently enabled. |
| `claims` | `_id`, `postId`, `userId` (claimant), private `proof` (10–1,000 characters), `status` (`pending`, `approved`, `rejected`), `reviewNote`, `reviewedAt`, `reviewedBy`, `createdAt`, `updatedAt`. |
| `messages` | `_id`, `claimId`, `senderId`, `content` (1–5,000 characters after trimming), optional `readAt`, `createdAt`, `updatedAt`. |

A legacy `Item` model and `items` collection also remain in the project. They do not expose `/items` API routes. Session records are stored in MongoDB separately.

Users own posts; claims reference a post and a claimant; messages reference a claim and sender. Deleting a post or claim does not automatically delete its related records. Self-service account deletion instead returns `409` while a post, legacy item, submitted/reviewed claim, or sent message references that user, preserving other users' records. The last administrator also cannot delete their account.

## SCHEDULE
Week 9: Create collections, connect MongoDB and refactor layout, API documentation, and complete proposal 
Week 10: GET endpoints, complete CRUD endpoints, data validation, error handling, and initial tests
Week 11: Implement Google OAuth, user sessions, and role-based authorization
Week 12: Complete authentication/authorization tests, image uploads, search, comments, reports, and Swagger
Week13: Final testing, Render deployment, and YouTube demo
Week14: Turn in


## API ENDPOINTS

The current API exposes **23 collection operations**, documented in Swagger. `/post` is the canonical post path. IDs in the tables below are MongoDB ObjectIds; `/users/me` obtains the account ID from the authenticated session.

### Posts

| Method | Path | Access and behavior |
| --- | --- | --- |
| GET | `/post` | Public. Lists/searches posts; optional `search`, `category`, `status`, `startDate`, and `endDate` filters. No pagination. |
| GET | `/post/:id` | Public. Retrieves one post. |
| POST | `/post` | Signed in. Creates a lost/found post owned by the current user. |
| PUT | `/post/:id` | Owner only. Current persistence limitation is described below and in Swagger. |
| DELETE | `/post/:id` | Owner only. Permanently deletes the post. |
| PATCH | `/post/:id/status` | Owner only. Saves `lost`, `found`, or `returned`. |

### Users

| Method | Path | Access and behavior |
| --- | --- | --- |
| GET | `/users` | Administrator only. Lists public profiles. |
| GET | `/users/me` | Signed in. Returns your public profile. |
| PUT | `/users/me` | Signed in. Updates your `name`, `email`, or both. |
| DELETE | `/users/me` | Signed in. Deletes your unreferenced account and ends the current session; returns `409` for related records or the last administrator. |
| GET | `/users/:id` | The same user or an administrator. Returns a public profile. |
| PATCH | `/users/:id/role` | Administrator only. Current handler limitation is described below and in Swagger. |

Profile updates require a nonempty JSON object. Only `name` and `email` are accepted; omitted fields stay unchanged. Names are trimmed and limited to 1–100 characters. Emails are trimmed, lowercased, validated, limited to 254 characters, and must be unique. Attempts to change roles, IDs, passwords, provider identifiers, or other unknown fields return `400`; an email conflict returns `409`.

Account deletion never cascades into other collections. On success it returns `{ "message": "Account deleted" }`, logs out the current browser session, destroys that session, and clears `connect.sid`. Subsequent protected requests need authentication. A later provider login can create a new account.

### Claims

| Method | Path | Access and behavior |
| --- | --- | --- |
| GET | `/claims` | Administrator only. Lists all claims. |
| GET | `/claims/:id` | Claimant, post owner, or administrator. |
| GET | `/post/:id/claims` | Post owner or administrator. Lists claims for a post. |
| POST | `/post/:id/claims` | Signed in. Claims another user's post; returned posts cannot be claimed. |
| PUT | `/claims/:id` | Claimant or administrator. Updates proof on a pending claim. |
| DELETE | `/claims/:id` | Claimant or administrator. Permanently deletes the claim; messages are not automatically deleted. |
| PATCH | `/claims/:id/status` | Post owner or administrator. Approves/rejects a pending claim; does not change the post status. |

### Messages

| Method | Path | Access and behavior |
| --- | --- | --- |
| GET | `/messages/claim/:claimId` | Claimant or post owner. Returns up to 100 messages, oldest first. |
| POST | `/messages/claim/:claimId` | Claimant or post owner. Sends a message as the current user. |
| PATCH | `/messages/:messageId/read` | Conversation participant other than the sender. Marks a received message as read. |
| DELETE | `/messages/:id` | Sender only. Permanently deletes a message. |

### Authentication flow

Authentication routes are explained here and in the Swagger introduction. The Swagger operation list stays limited to the 23 collection operations.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/auth/google` | Starts Google login. |
| GET | `/auth/google/callback` | Google callback; success redirects to `/auth/me`. |
| GET | `/auth/github` | Starts GitHub login. |
| GET | `/auth/github/callback` | GitHub callback; success redirects to `/auth/me`. |
| GET | `/auth/me` | Returns session status plus user ID/display name, or `401` when signed out. |
| GET | `/auth/failure` | Returns an OAuth failure with `401`. |
| POST | `/auth/logout` | Ends the current login and clears the browser cookie. |

1. Start the app and open `/` or `/login`. Select Google or GitHub; sign-in opens in a new tab. Each provider needs its client ID, client secret, and callback URL configured. The callback must match the API origin and the URI registered with that provider.
2. Complete provider login. The callback creates a server-side session, sets the HttpOnly `connect.sid` cookie, and redirects to `/auth/me`.
3. Return to `/api-docs/` on the **same origin in the same browser**. Swagger sends that session cookie automatically. No token needs to be pasted into Swagger. Call `GET /users/me` to retrieve your profile, then try the protected operations permitted for that account.
4. Log out with `POST /auth/logout`. For example, from the browser console while viewing this API:

   ```js
   fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
   ```

Protected routes return `401` without a session and `403` when the account lacks the required permission. The navigation and documentation pages remain public. The app also mounts the authentication router without `/auth` as legacy aliases; use the canonical `/auth/*` paths above.

### Other mounted administrator routes

`GET /admin/users`, `GET /admin/users/:id`, and `PATCH /admin/users/:id/role` are administrator-only routes. They remain outside the collection Swagger operation list.

### Current implementation limitations

- `PUT /post/:id` does not persist updates; its handler reads `req.item` while the ownership middleware sets `req.post`, and its save call is disabled. A category-only update is also incorrectly rejected. Use Swagger's operation notes when testing.
- `PATCH /users/:id/role` currently fails on otherwise valid requests because of existing handler typos. Its Swagger description records this limitation.
- `GET /post/:id` returns `500` for a malformed ID. Other validation and error responses are documented per operation.

These existing handlers are unchanged by the self-service profile implementation.

## Local environment

Use Node.js 26.13.0, as specified in `.node-version`. Keep credentials in your
local `.env`, which is ignored by Git:

```dotenv
MONGODB_URI=<existing_mongodb_connection_string_with_the_lost-and-found_database>
SESSION_SECRET=<a_long_random_string>
PORT=3000

# Configure all three values for each provider you want to enable.
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# GitHub is optional.
GITHUB_CLIENT_ID=<your_github_client_id>
GITHUB_CLIENT_SECRET=<your_github_client_secret>
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

The application reads `GOOGLE_CALLBACK_URL`, including the `_URL` suffix.
OAuth providers are registered only when all three of their settings are present.
MongoDB and `SESSION_SECRET` are required even when OAuth is not configured.

Run `npm ci`, `npm run swagger`, and `npm start`. Open `/` for navigation or
`/api-docs/` for the 23 collection operations. Swagger uses the current API origin.

## CREATING A GITHUB BRANCH, PULLING AND PUSHING REMINDER
git checkout -b feature /name-of-new-branch. // create the branch
git add -A
git commit -m "your_comment_here"
git push -u origin feature /name-of-new-branch   //furture pushes from new branch to 
                                                    remote repository
git push
git checkout main          // pushes you back to main repository branch
git pull origin main       // pull request
git merge feature/name-of-new-branch     // merge branches
git push origin main       // push to main github page

git branch -d feature /name-of-new-branch // if you decide to delete branch later
