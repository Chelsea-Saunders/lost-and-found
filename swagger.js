// Collection API documentation. Run `npm run swagger` to regenerate swagger-output.json.
const fs = require("node:fs");
const path = require("node:path");
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (name) => ({ type: "array", items: ref(name) });
const json = (schema, example) => ({
  "application/json": { schema, ...(example === undefined ? {} : { example }) },
});
const response = (description, schema, example) => ({ description, content: json(schema, example) });
const failure = (description, message) => response(description, ref("Error"), { message });
const messageResponse = (description, message) => response(description, ref("MessageResponse"), { message });
const errorExamples = (description, examples) => ({
  description,
  content: {
    "application/json": {
      schema: ref("Error"),
      examples: Object.fromEntries(Object.entries(examples).map(([name, value]) => [name, { value }])),
    },
  },
});
const pathId = (name = "id", description = "ID of the post.", example = examples.post._id) => ({
  name, in: "path", required: true, description, schema: ref("ObjectId"), example,
});
const object = (properties, required = []) => ({
  type: "object", ...(required.length ? { required } : {}), properties,
});
const dateTime = { type: "string", format: "date-time", readOnly: true };
const timestamps = { createdAt: dateTime, updatedAt: dateTime };
const version = { type: "integer", readOnly: true, example: 0 };
const category = { type: "string", enum: ["jewelry", "household", "pet", "clothing", "other"] };
const role = { type: "string", enum: ["user", "admin"] };
const postFields = {
  title: { type: "string", minLength: 1, pattern: "\\S", description: "Post title. Whitespace-only values are rejected; saved values are trimmed.", example: "Found a silver ring" },
  content: { type: "string", minLength: 1, pattern: "\\S", description: "Item description and recovery details. Whitespace-only values are rejected; saved values are trimmed.", example: "Found near the library entrance. Contact me with identifying details." },
  category,
  status: { type: "string", enum: ["lost", "found", "returned"] },
};

const examples = {
  post: {
    _id: "507f1f77bcf86cd799439011", user: "507f1f77bcf86cd799439012",
    title: "Found a silver ring",
    content: "Found near the library entrance. Contact me with identifying details.",
    category: "jewelry", status: "found",
    createdAt: "2026-11-19T15:00:00.000Z", updatedAt: "2026-11-19T15:00:00.000Z", __v: 0,
  },
  user: { _id: "507f1f77bcf86cd799439012", name: "Alex Rivera", email: "alex@example.com", role: "user" },
  claim: {
    _id: "507f1f77bcf86cd799439013", postId: "507f1f77bcf86cd799439011", userId: "507f1f77bcf86cd799439014",
    proof: "The inside of the ring has my initials engraved next to a small star.",
    status: "pending", reviewNote: "", reviewedAt: null, reviewedBy: null,
    createdAt: "2026-11-19T15:05:00.000Z", updatedAt: "2026-11-19T15:05:00.000Z", __v: 0,
  },
  message: {
    _id: "507f1f77bcf86cd799439015", claimId: "507f1f77bcf86cd799439013", senderId: "507f1f77bcf86cd799439014",
    content: "I can provide a photo of the engraving to confirm ownership.", readAt: null,
    createdAt: "2026-11-19T15:10:00.000Z", updatedAt: "2026-11-19T15:10:00.000Z", __v: 0,
  },
};

function operation({ tag, id, summary, description, public: isPublic = false, parameters, request, responses }) {
  return {
    tags: [tag], operationId: id, summary, description,
    ...(parameters ? { parameters } : {}),
    ...(request ? { requestBody: { required: true, content: json(ref(request)) } } : {}),
    responses: {
      ...(!isPublic ? { 401: { $ref: "#/components/responses/Unauthorized" } } : {}),
      ...responses,
      500: { $ref: "#/components/responses/ServerError" },
    },
  };
}

const paths = {
  "/post": {
    get: operation({
      tag: "Posts",
      id: "listPosts",
      public: true,
      summary: "Search and filter lost and found posts",
      description: "Returns matching posts, newest first. Available to everyone. All search parameters are optional and can be combined. If no filters are provided, all posts are returned. Pagination is not supported.",
      parameters: [
        {
          name: "search",
          in: "query",
          required: false,
          description: "Case-insensitive keyword search in the post title or content. Maximum 100 characters after trimming.",
          schema: {
            type: "string",
            minLength: 1,
            maxLength: 100
          },
          example: "wallet"
        },
        {
          name: "category",
          in: "query",
          required: false,
          description: "Filter posts by category.",
          schema: category,
          example: "jewelry"
        },
        {
          name: "status",
          in: "query",
          required: false,
          description: "Filter posts by status.",
          schema: postFields.status,
          example: "lost"
        },
        {
          name: "startDate",
          in: "query",
          required: false,
          description: "Return posts created on or after this date (UTC). Use YYYY-MM-DD or leave empty.",
          schema: {
            type: "string"
          }
        },
        {
          name: "endDate",
          in: "query",
          required: false,
          description: "Return posts created through the end of this date (UTC). Use YYYY-MM-DD or leave empty. Must not be earlier than startDate.",
          schema: {
            type: "string"
          }
        }
      ],
      responses: {
        200: response(
          "Matching posts, newest first. Returns an empty array if no posts match.",
          arrayOf("Post"),
          [examples.post]
        ),
        400: errorExamples("Invalid search or filter parameters.", {
          invalidStatus: {
            message: "Validation error",
            errors: ['"status" must be one of [lost, found, returned]']
          },
          invalidCategory: {
            message: "Validation error",
            errors: ['"category" must be one of [jewelry, household, pet, clothing, other]']
          },
          invalidDateRange: {
            message: "Validation error",
            errors: ['"endDate" must be greater than or equal to "ref:startDate"']
          },
          invalidDateFormat: {
            message: "Validation error",
            errors: ['"startDate" must be in ISO 8601 date format']
          }
        })
      },
    }),
    post: operation({
      tag: "Posts", id: "createPost", summary: "Create a post",
      description: "Creates a post owned by the signed-in user. Title and content must contain non-whitespace text. Category defaults to other; status defaults to lost. New posts may be lost or found, never returned.",
      request: "CreatePost",
      responses: {
        201: response("Post created.", ref("Post"), examples.post),
        400: errorExamples("Invalid title, content, category, or status.", {
          missingFields: { message: "Title and content are required" },
          invalidCategory: { message: "Invalid category" },
          invalidStatus: { message: "Status must be lost or found" },
        }),
      },
    }),
  },
  "/post/{id}": {
    get: operation({
      tag: "Posts", id: "getPost", public: true, summary: "Get a post",
      description: "Returns a single post. Available to everyone. A malformed ID currently produces 500 rather than 400.",
      parameters: [pathId()],
      responses: {
        200: response("Post details.", ref("Post"), examples.post),
        404: failure("Post not found.", "Post not found"),
      },
    }),
    put: operation({
      tag: "Posts", id: "updatePost", summary: "Update your post",
      description: "Owner only; administrators do not bypass ownership checks. Submit only fields to change. **Current limitation:** changes are not persisted. Supplying a recognized update field currently returns 500; an empty JSON object returns 200 with an empty body. A category-only update is also incorrectly rejected with 400.",
      parameters: [pathId()], request: "UpdatePost",
      responses: {
        200: { description: "Empty response when an empty JSON object is submitted. No changes are saved by the current handler." },
        400: failure("Invalid post ID or update fields.", "Invalid status"),
        403: failure("The current user does not own the post.", "Forbidden: This is not your post."),
        404: failure("Post not found.", "Post not found"),
      },
    }),
    delete: operation({
      tag: "Posts", id: "deletePost", summary: "Delete your post",
      description: "Deletes a post owned by the signed-in user. Administrators do not bypass ownership checks. Associated claims and messages are not automatically deleted.",
      parameters: [pathId()],
      responses: {
        200: messageResponse("Post deleted.", "Post deleted"),
        400: failure("Invalid post ID.", "invalid post ID"),
        403: failure("The current user does not own the post.", "Forbidden: This is not your post."),
        404: failure("Post not found.", "Post not found"),
      },
    }),
  },
  "/post/{id}/status": {
    patch: operation({
      tag: "Posts", id: "updatePostStatus", summary: "Update your post's status",
      description: "Saves the status of a post owned by the signed-in user. Accepts lost, found, or returned. Administrators do not bypass ownership checks.",
      parameters: [pathId()], request: "UpdatePostStatus",
      responses: {
        200: response("Post status saved.", object({ message: { type: "string" }, item: ref("Post") }, ["message", "item"]), { message: "Status updated successfully", item: { ...examples.post, status: "returned" } }),
        400: failure("Invalid post ID or status.", "Invalid status. Must be one of: lost, found, returned"),
        403: failure("The current user does not own the post.", "Forbidden: This is not your post."),
        404: failure("Post not found.", "Post not found"),
      },
    }),
  },
  "/users": {
    get: operation({
      tag: "Users", id: "listUsers", summary: "List user profiles",
      description: "Administrator only. Returns public profile fields, sorted by createdAt descending. Provider identifiers are excluded. createdAt may be absent because the User model does not currently generate timestamps.",
      responses: {
        200: response("User profiles.", arrayOf("User"), [examples.user]),
        403: failure("Administrator role required.", "Forbidden: Admins only"),
      },
    }),
  },
  "/users/me": {
    get: operation({
      tag: "Users", id: "getMyProfile", summary: "Get your profile",
      description: "Returns the signed-in user's public profile, using the user ID from the browser session. No ID parameter is needed. OAuth provider identifiers are excluded.",
      responses: {
        200: response("Your profile.", ref("User"), examples.user),
        404: failure("The account no longer exists.", "User not found"),
      },
    }),
    put: operation({
      tag: "Users", id: "updateMyProfile", summary: "Update your profile",
      description: "Updates only the signed-in user's name and/or email. Submit at least one field. Names are trimmed and must contain 1–100 characters; emails are trimmed, lowercased, validated, and limited to 254 characters. Omitted fields keep their current values. Roles, provider identifiers, IDs, passwords, and other unknown fields are rejected.",
      request: "UpdateProfile",
      responses: {
        200: response("Your saved profile.", ref("User"), { ...examples.user, name: "Alex Morgan" }),
        400: errorExamples("Invalid profile fields or an empty request body.", {
          invalidName: { message: "Validation error", errors: ['"name" is not allowed to be empty'] },
          protectedField: { message: "Validation error", errors: ['"role" is not allowed'] },
        }),
        404: failure("The account no longer exists.", "User not found"),
        409: failure("Another account already uses that email address.", "Email address is already in use"),
      },
    }),
    delete: operation({
      tag: "Users", id: "deleteMyAccount", summary: "Delete your account",
      description: "Deletes only the signed-in account. No request body is needed. Deletion is blocked while posts, legacy items, claims submitted or reviewed by this user, or messages sent by this user reference the account. Related records are preserved. The last administrator cannot delete their account. On success the current login session is ended, its stored session is destroyed, and the session cookie is cleared. Signing in again with a provider can create a new account.",
      responses: {
        200: messageResponse("Account deleted and current session ended.", "Account deleted"),
        404: failure("The account no longer exists.", "User not found"),
        409: errorExamples("Related records exist or the account is the last administrator.", {
          relatedRecords: { message: "Cannot delete account while related records exist" },
          lastAdministrator: { message: "Cannot delete the last administrator" },
        }),
      },
    }),
  },
  "/users/{id}": {
    get: operation({
      tag: "Users", id: "getUser", summary: "Get a user profile",
      description: "Users may read their own profile; administrators may read any profile. Returns public profile fields without OAuth provider identifiers.",
      parameters: [pathId("id", "ID of the user profile to retrieve.", examples.user._id)],
      responses: {
        200: response("User profile.", ref("User"), examples.user),
        400: failure("Invalid user ID.", "Invalid user ID"),
        403: failure("The caller is neither this user nor an administrator.", "Forbidden"),
        404: failure("User not found.", "User not found"),
      },
    }),
  },
  "/users/{id}/role": {
    patch: operation({
      tag: "Users", id: "updateUserRole", summary: "Change a user's role",
      description: "Administrator only. Accepts user or admin. **Current limitation:** valid update requests currently fail with 500 before the target user is loaded. Role changes and the final-administrator safeguard are not currently operational.",
      parameters: [pathId("id", "ID of the user whose role should change.", examples.user._id)], request: "UpdateRole",
      responses: {
        400: failure("Invalid user ID or role.", "Role must be user or admin"),
        403: failure("Administrator role required.", "Forbidden: Admins only"),
      },
    }),
  },
  "/post/{id}/claims": {
    get: operation({
      tag: "Claims", id: "listPostClaims", summary: "List claims for a post",
      description: "Post owner or administrator only. Returns private ownership claims, newest first.",
      parameters: [pathId("id", "ID of the post whose claims are requested.")],
      responses: {
        200: response("Claims for the post.", arrayOf("Claim"), [examples.claim]),
        400: failure("Invalid post ID.", "Invalid post ID"),
        403: failure("Only the post owner or an administrator may view these claims.", "Forbidden"),
        404: failure("Post not found.", "Post not found"),
      },
    }),
    post: operation({
      tag: "Claims", id: "createClaim", summary: "Submit an ownership claim",
      description: "Signed-in users may claim another user's post once. Proof is private and must contain 10–1,000 characters after trimming. Returned items cannot be claimed.",
      parameters: [pathId("id", "ID of the post being claimed.")], request: "WriteClaim",
      responses: {
        201: response("Claim submitted.", ref("CreateClaimResponse"), { message: "Claim submitted successfully", claim: examples.claim }),
        400: errorExamples("Invalid post ID, invalid ownership proof, or returned item.", {
          invalidPostId: { message: "Invalid post ID" },
          invalidProof: { message: "Validation error", errors: ['"proof" length must be at least 10 characters long'] },
          missingProof: { message: "Validation error", errors: ['"proof" is required'] },
          returnedItem: { message: "Cannot claim a returned item" },
        }),
        403: failure("You cannot claim your own post.", "Cannot claim your own post"),
        404: failure("Post not found.", "Post not found"),
        409: failure("This user already claimed this post.", "You already claimed this post"),
      },
    }),
  },
  "/claims": {
    get: operation({
      tag: "Claims", id: "listClaims", summary: "List all claims",
      description: "Administrator only. Returns all ownership claims, newest first, including private proof and review details.",
      responses: {
        200: response("All claims.", arrayOf("Claim"), [examples.claim]),
        403: failure("Administrator role required.", "Forbidden: Admins only"),
      },
    }),
  },
  "/claims/{id}": {
    get: operation({
      tag: "Claims", id: "getClaim", summary: "Get a private claim",
      description: "Claimant, post owner, or administrator only.",
      parameters: [pathId("id", "ID of the ownership claim.", examples.claim._id)],
      responses: {
        200: response("Claim details.", ref("Claim"), examples.claim),
        400: failure("Invalid claim ID.", "Invalid claim ID"),
        403: failure("The caller cannot access this claim.", "Forbidden"),
        404: failure("Claim or associated post not found.", "Claim not found"),
      },
    }),
    put: operation({
      tag: "Claims", id: "updateClaim", summary: "Update proof on a pending claim",
      description: "Claimant or administrator only. Only pending claims can be edited. Proof must contain 10–1,000 characters after trimming. Unknown request fields are rejected.",
      parameters: [pathId("id", "ID of the claim whose proof should change.", examples.claim._id)], request: "WriteClaim",
      responses: {
        200: response("Updated claim.", ref("Claim"), examples.claim),
        400: errorExamples("Invalid claim ID, invalid ownership proof, or a claim that is no longer pending.", {
          invalidClaimId: { message: "Invalid claim ID" },
          invalidProof: { message: "Validation error", errors: ['"proof" length must be at least 10 characters long'] },
          claimNotPending: { message: "Only pending claims can be updated" },
        }),
        403: failure("The caller is neither the claimant nor an administrator.", "Forbidden"),
        404: failure("Claim not found.", "Claim not found"),
      },
    }),
    delete: operation({
      tag: "Claims", id: "deleteClaim", summary: "Delete a claim",
      description: "Claimant or administrator only. Permanently deletes the claim rather than marking it withdrawn. Any claim status may be deleted; associated messages are not automatically removed.",
      parameters: [pathId("id", "ID of the claim to delete.", examples.claim._id)],
      responses: {
        200: messageResponse("Claim deleted.", "Claim deleted"),
        400: failure("Invalid Claim Id.", "Invalid claim ID"),
        403: failure("The caller is neither the claimant nor an administrator.", "Forbidden"),
        404: failure("Claim not found.", "Claim not found"),
      },
    }),
  },
  "/claims/{id}/status": {
    patch: operation({
      tag: "Claims", id: "reviewClaim", summary: "Approve or reject a pending claim",
      description: "Post owner or administrator only. Only pending claims may be reviewed. Records the reviewer and review time. Approval does not change the post status. An optional review note must contain 1–1,000 characters after trimming; omit it for no note. Unknown fields are rejected.",
      parameters: [pathId("id", "ID of the claim to approve or reject.", examples.claim._id)], request: "ReviewClaim",
      responses: {
        200: response("Reviewed claim.", ref("Claim"), { ...examples.claim, status: "approved", reviewNote: "Ownership confirmed.", reviewedAt: "2026-11-19T15:15:00.000Z", reviewedBy: examples.post.user, updatedAt: "2026-11-19T15:15:00.000Z" }),
        400: errorExamples("Invalid claim ID, invalid decision, invalid review note, or a claim that is no longer pending.", {
          invalidClaimId: { message: "Invalid claim ID" },
          invalidDecision: { message: "Validation error", errors: ['"status" must be one of [approved, rejected]'] },
          invalidReviewNote: { message: "Validation error", errors: ['"reviewNote" is not allowed to be empty'] },
          claimNotPending: { message: "Only pending claims can be reviewed" },
        }),
        403: failure("Only the post owner or an administrator may review this claim.", "Forbidden"),
        404: failure("Claim or associated post not found.", "Claim not found"),
      },
    }),
  },
  "/messages/claim/{claimId}": {
    get: operation({
      tag: "Messages", id: "listClaimMessages", summary: "List a claim's messages",
      description: "Only the claimant and post owner may access the conversation. Returns up to 100 messages, oldest first, without pagination.",
      parameters: [pathId("claimId", "ID of the claim associated with the conversation.", examples.claim._id)],
      responses: {
        200: response("Claim messages.", arrayOf("Message"), [examples.message]),
        400: failure("Invalid claim ID.", "Invalid claim Id"),
        403: failure("The caller is not a conversation participant.", "Access denied"),
        404: failure("Claim not found.", "Claim not found"),
      },
    }),
    post: operation({
      tag: "Messages", id: "createMessage", summary: "Send a message about a claim",
      description: "Only the claimant and post owner may send messages. Content must contain 1–5,000 characters after trimming. The sender comes from the authenticated session. Unknown request fields are rejected.",
      parameters: [pathId("claimId", "ID of the claim associated with the conversation.", examples.claim._id)], request: "CreateMessage",
      responses: {
        201: response("Message created.", ref("Message"), examples.message),
        400: errorExamples("Invalid claim ID or message content.", {
          invalidClaimId: { message: "Invalid claim Id" },
          invalidContent: { message: "Message must contain 1-5000 characters" },
          missingContent: { message: "Validation error", errors: ['"content" is required'] },
          invalidMessageData: { message: "Invalid message data" },
        }),
        403: failure("The caller is not a conversation participant.", "Access Denied"),
        404: failure("Claim not found.", "Claim not found"),
      },
    }),
  },
  "/messages/{messageId}/read": {
    patch: operation({
      tag: "Messages", id: "markMessageRead", summary: "Mark a received message as read",
      description: "Only a conversation participant other than the sender may mark a message as read. Records the read timestamp and preserves it on subsequent requests. No request body is needed. A missing associated claim returns 403.",
      parameters: [pathId("messageId", "ID of the message to mark as read.", examples.message._id)],
      responses: {
        200: response("Message marked as read.", ref("Message"), {
          ...examples.message,
          readAt: "2026-11-19T15:20:00.000Z",
        }),
        400: failure("Invalid message ID.", "Invalid message ID"),
        403: errorExamples("The caller cannot mark this message as read.", {
          accessDenied: { message: "Access denied" },
          ownMessage: { message: "Cannot mark your own message as read" },
        }),
        404: failure("Message not found.", "Message not found"),
      },
    }),
  },

  "/messages/{id}": {
    delete: operation({
      tag: "Messages", id: "deleteMessage", summary: "Delete a message",
      description: "Only the original sender may permanently delete their message. Authentication is required. No request body is needed.",
      parameters: [pathId("id", "ID of the message to delete.", examples.message._id)],
      responses: {
        200: messageResponse("Message deleted.", "Message deleted"),
        400: failure("Invalid message ID.", "Invalid message ID"),
        403: failure("Only the sender may delete this message.", "Forbidden: this is not your message."),
        404: failure("Message not found.", "Message not found"),
      },
    }),
  },
};
const document = {
  openapi: "3.0.3",
  info: {
    title: "Lost and Found API", version: "1.0.0",
    description: [
      "API reference for 23 collection operations: Posts, Users, Claims, and Messages. The post API is mounted at `/post`. Send JSON request bodies with Content-Type: application/json. IDs are 24-character MongoDB ObjectIds; timestamps are ISO 8601 UTC strings. Response examples illustrate the documented structure; replace example IDs with IDs from your database before sending requests.",
      "### Authentication flow",
      "1. Open [login options](/login) and choose Google or GitHub. Login starts at `GET /auth/google` or `GET /auth/github` and opens in a new tab. The provider must be configured for this API origin.",
      "2. The provider returns to `/auth/google/callback` or `/auth/github/callback`. Successful login creates a browser session and redirects to `GET /auth/me`, which returns the account ID and display name. Authentication failure returns `401` at `/auth/failure`.",
      "3. Return to Swagger on the same origin in the same browser. Requests use the HttpOnly `connect.sid` session cookie automatically. Use `GET /users/me` to read your full public profile. Access requirements and role restrictions are described on each operation; missing authentication returns `401` and insufficient permissions return `403`.",
      "4. End the login with `POST /auth/logout`. Authentication routes are described here while the operation list stays grouped by collection. The API navigation page and Swagger documentation are public.",
      "Current handler limitations are stated on the affected operations. Profile deletion preserves related records and returns `409` until those references are removed.",
    ].join("\n\n"),
  },
  servers: [{ url: "/", description: "Current API origin" }],
  tags: [
    { name: "Posts", description: "Browse lost and found posts. Create and manage your own posts." },
    { name: "Users", description: "Read, update, or delete your own profile. Administrator user listing and role changes." },
    { name: "Claims", description: "Submit private ownership proof and review recovery requests." },
    { name: "Messages", description: "Private conversations associated with an ownership claim." },
  ],
  paths,
  components: {
    responses: {
      Unauthorized: failure("An authenticated session is required.", "Not logged in"),
      ServerError: response("Unexpected server or database error. Controller errors use message; the global handler uses error.", { oneOf: [ref("Error"), ref("GlobalError")] }, { message: "Server error" }),
    },
    schemas: {
      ObjectId: { type: "string", pattern: "^[a-fA-F0-9]{24}$", description: "A 24-character hexadecimal MongoDB ObjectId.", example: examples.post._id },
      MessageResponse: object({ message: { type: "string", description: "Result of the completed operation.", example: "Claim deleted" } }, ["message"]),
      Error: object({ message: { type: "string", description: "Explanation of the failure.", example: "Server error" }, errors: { type: "array", description: "Field validation details, when present.", items: { type: "string" } } }, ["message"]),
      GlobalError: object({ error: { type: "string", example: "Internal Server Error" } }, ["error"]),
      Post: {
        ...object({ _id: ref("ObjectId"), user: ref("ObjectId"), ...postFields, ...timestamps, __v: version }, ["_id", "user", "title", "content", "category", "status"]),
        example: examples.post,
      },
      CreatePost: {
        ...object({ ...postFields, category: { ...category, default: "other" }, status: { type: "string", enum: ["lost", "found"], default: "lost" } }, ["title", "content"]),
        description: "The server assigns the owner. Only title, content, category, and status are used; other input fields are ignored.",
        example: { title: examples.post.title, content: examples.post.content, category: "jewelry", status: "found" },
      },
      UpdatePost: { ...object(postFields), description: "All fields are optional. See the operation's current persistence and validation limitations before sending an update.", example: { title: "Silver ring returned to its owner", status: "returned" } },
      UpdatePostStatus: {
        ...object({ status: postFields.status }, ["status"]),
        description: "The status to save on the current user's post.",
        example: { status: "returned" },
      },
      User: {
        ...object({ _id: ref("ObjectId"), name: { type: "string", description: "User's display name." }, email: { type: "string", format: "email", nullable: true, description: "Email address, when available." }, role, createdAt: dateTime }, ["_id", "name", "role"]),
        description: "Public profile fields selected by /users endpoints. createdAt may be absent because automatic timestamps are not enabled on the User model.",
        example: examples.user,
      },
      UpdateProfile: {
        ...object({
          name: { type: "string", minLength: 1, maxLength: 100, pattern: "\\S", description: "Display name, trimmed before saving." },
          email: { type: "string", format: "email", maxLength: 254, description: "Contact email, trimmed and lowercased. Must be unique." },
        }),
        minProperties: 1,
        additionalProperties: false,
        description: "Supply name, email, or both. All other fields are rejected. Omitted fields are unchanged.",
        example: { name: "Alex Morgan", email: "alex.morgan@example.com" },
      },
      UpdateRole: { ...object({ role: { ...role, description: "Requested application role." } }, ["role"]), example: { role: "user" } },
      Claim: {
        ...object({
          _id: ref("ObjectId"), postId: ref("ObjectId"), userId: ref("ObjectId"),
          proof: { type: "string", minLength: 10, maxLength: 1000, description: "Private evidence of ownership." },
          status: { type: "string", enum: ["pending", "approved", "rejected"], default: "pending" },
          reviewNote: { type: "string", default: "" },
          reviewedAt: { ...dateTime, nullable: true },
          reviewedBy: { type: "string", pattern: "^[a-fA-F0-9]{24}$", nullable: true, readOnly: true },
          ...timestamps, __v: version,
        }, ["_id", "postId", "userId", "proof", "status"]),
        example: examples.claim,
      },
      WriteClaim: {
        ...object({ proof: { type: "string", minLength: 10, maxLength: 1000, description: "Private ownership evidence. Length is checked after trimming whitespace." } }, ["proof"]),
        additionalProperties: false,
        description: "Proof is validated after trimming whitespace. Unknown fields are rejected.",
        example: { proof: examples.claim.proof },
      },
      ReviewClaim: {
        ...object({ status: { type: "string", enum: ["approved", "rejected"], description: "Decision on a pending claim." }, reviewNote: { type: "string", minLength: 1, maxLength: 1000, description: "Optional private decision note. Omit rather than sending an empty string." } }, ["status"]),
        additionalProperties: false,
        example: { status: "approved", reviewNote: "Ownership confirmed by the engraving." },
      },
      CreateClaimResponse: object({ message: { type: "string" }, claim: ref("Claim") }, ["message", "claim"]),
      Message: {
        ...object({
          _id: ref("ObjectId"), claimId: ref("ObjectId"), senderId: ref("ObjectId"),
          content: { type: "string", minLength: 1, maxLength: 5000 },
          readAt: { ...dateTime, nullable: true }, ...timestamps, __v: version,
        }, ["_id", "claimId", "senderId", "content"]),
        example: examples.message,
      },
      CreateMessage: {
        ...object({ content: { type: "string", minLength: 1, maxLength: 5000, pattern: "\\S", description: "Message text. Whitespace-only values are rejected." } }, ["content"]),
        description: "Must contain non-whitespace text. The length limit applies after trimming.",
        example: { content: examples.message.content },
      },
    },
  },
};

if (require.main === module) {
  const outputFile = path.join(__dirname, "swagger-output.json");
  fs.writeFileSync(outputFile, `${JSON.stringify(document, null, 2)}\n`);
  const count = Object.values(document.paths).reduce((total, operations) => total + Object.keys(operations).length, 0);
  console.log(`Generated ${count} collection operations in ${outputFile}.`);
}

module.exports = document;
