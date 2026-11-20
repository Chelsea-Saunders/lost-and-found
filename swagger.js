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
      tag: "Posts", id: "listPosts", public: true, summary: "List lost and found posts",
      description: "Returns all posts, newest first. Available to everyone. Filtering and pagination are not supported.",
      responses: { 200: response("All posts.", arrayOf("Post"), [examples.post]) },
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
      description: "Owner only. **Current limitation:** a conflicting ownership check rejects requests from the post owner with 403, so deletion does not currently complete.",
      parameters: [pathId()],
      responses: {
        400: failure("Invalid post ID.", "invalid post ID"),
        403: failure("Ownership check rejected the request.", "Forbidden"),
        404: failure("Post not found.", "Post not found"),
      },
    }),
  },
  "/post/{id}/status": {
    patch: operation({
      tag: "Posts", id: "updatePostStatus", summary: "Update your post's status",
      description: "Owner only. **Current limitation:** the handler accepts open, pending, closed, or archived, which conflict with the Post model's lost, found, or returned values. Accepted values currently return 500. The request schema reflects the current handler; no successful status change is currently available.",
      parameters: [pathId()], request: "UpdatePostStatus",
      responses: {
        400: failure("Invalid post ID or status.", "Invalid status. Must be one of: open, pending, closed, archived"),
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
      description: "Post owner or administrator only. Returns private ownership claims, newest first. A malformed ID currently produces 500 rather than 400.",
      parameters: [pathId("id", "ID of the post whose claims are requested.")],
      responses: {
        200: response("Claims for the post.", arrayOf("Claim"), [examples.claim]),
        403: failure("Only the post owner or an administrator may view these claims.", "Forbidden"),
        404: failure("Post not found.", "Post not found"),
      },
    }),
    post: operation({
      tag: "Claims", id: "createClaim", summary: "Submit an ownership claim",
      description: "Signed-in users may claim another user's post once. Proof is private and must contain 10–1,000 characters after trimming. The current handler permits claims on posts of any status.",
      parameters: [pathId("id", "ID of the post being claimed.")], request: "WriteClaim",
      responses: {
        201: response("Claim submitted.", ref("CreateClaimResponse"), { message: "Claim submitted successfully", claim: examples.claim }),
        400: errorExamples("The post ID or ownership proof is invalid.", {
          invalidPostId: { message: "Invalid post ID" },
          invalidProof: { message: "Validation error", errors: ['"proof" length must be at least 10 characters long'] },
          missingProof: { message: "Validation error", errors: ['"proof" is required'] },
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
      description: "Claimant, post owner, or administrator only. A malformed ID currently produces 500 rather than 400.",
      parameters: [pathId("id", "ID of the ownership claim.", examples.claim._id)],
      responses: {
        200: response("Claim details.", ref("Claim"), examples.claim),
        403: failure("The caller cannot access this claim.", "Forbidden"),
        404: failure("Claim or associated post not found.", "Claim not found"),
      },
    }),
    put: operation({
      tag: "Claims", id: "updateClaim", summary: "Update proof on a pending claim",
      description: "Claimant or administrator only. Only pending claims can be edited. Proof must contain 10–1,000 characters after trimming. Unknown request fields are rejected. A malformed ID currently produces 500 rather than 400.",
      parameters: [pathId("id", "ID of the claim whose proof should change.", examples.claim._id)], request: "WriteClaim",
      responses: {
        200: response("Updated claim.", ref("Claim"), examples.claim),
        400: errorExamples("Invalid ownership proof or a claim that is no longer pending.", {
          invalidProof: { message: "Validation error", errors: ['"proof" length must be at least 10 characters long'] },
          claimNotPending: { message: "Only pending claims can be updated" },
        }),
        403: failure("The caller is neither the claimant nor an administrator.", "Forbidden"),
        404: failure("Claim not found.", "Claim not found"),
      },
    }),
    delete: operation({
      tag: "Claims", id: "deleteClaim", summary: "Delete a claim",
      description: "Claimant or administrator only. Permanently deletes the claim rather than marking it withdrawn. Any claim status may be deleted; associated messages are not automatically removed. A malformed ID currently produces 500 rather than 400.",
      parameters: [pathId("id", "ID of the claim to delete.", examples.claim._id)],
      responses: {
        200: messageResponse("Claim deleted.", "Claim deleted"),
        403: failure("The caller is neither the claimant nor an administrator.", "Forbidden"),
        404: failure("Claim not found.", "Claim not found"),
      },
    }),
  },
  "/claims/{id}/status": {
    patch: operation({
      tag: "Claims", id: "reviewClaim", summary: "Approve or reject a pending claim",
      description: "Post owner or administrator only. Only pending claims may be reviewed. Records the reviewer and review time. Approval does not change the post status. An optional review note must contain 1–1,000 characters after trimming; omit it for no note. Unknown fields are rejected. A malformed ID currently produces 500 rather than 400.",
      parameters: [pathId("id", "ID of the claim to approve or reject.", examples.claim._id)], request: "ReviewClaim",
      responses: {
        200: response("Reviewed claim.", ref("Claim"), { ...examples.claim, status: "approved", reviewNote: "Ownership confirmed.", reviewedAt: "2026-11-19T15:15:00.000Z", reviewedBy: examples.post.user, updatedAt: "2026-11-19T15:15:00.000Z" }),
        400: errorExamples("Invalid decision, invalid review note, or a claim that is no longer pending.", {
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
      description: "Intended for the claimant and post owner. Returns up to 100 messages, oldest first, without pagination. **Current limitation:** the participant check is not awaited and can cause an unhandled rejection. This endpoint cannot currently enforce private conversation access reliably.",
      parameters: [pathId("claimId", "ID of the claim associated with the conversation.", examples.claim._id)],
      responses: {
        200: response("Claim messages.", arrayOf("Message"), [examples.message]),
        400: failure("Invalid claim ID.", "Invalid claim Id"),
        404: failure("Claim not found.", "Claim not found"),
      },
    }),
    post: operation({
      tag: "Messages", id: "createMessage", summary: "Send a message about a claim",
      description: "Intended for the claimant and post owner. Content must contain non-whitespace text; its raw length cannot exceed 5,000 characters. The sender comes from the session. **Current limitation:** the participant check fails with 500 for existing claims, so messages cannot currently be created.",
      parameters: [pathId("claimId", "ID of the claim associated with the conversation.", examples.claim._id)], request: "CreateMessage",
      responses: {
        400: errorExamples("Invalid claim ID, missing claim, or invalid content. A missing claim currently returns 400 rather than 404.", {
          invalidClaimId: { message: "Invalid claim Id" },
          claimNotFound: { message: "Claim not found" },
          invalidContent: { message: "Message must contain 1-5000 characters" },
        }),
      },
    }),
  },
  "/messages/{messageId}/read": {
    patch: operation({
      tag: "Messages", id: "markMessageRead", summary: "Mark a received message as read",
      description: "Intended for a conversation participant other than the sender. No request body is needed. **Current limitation:** the participant check fails with 500 for existing claims, so read receipts cannot currently be updated. A missing associated claim returns 403.",
      parameters: [pathId("messageId", "ID of the message to mark as read.", examples.message._id)],
      responses: {
        400: failure("Invalid message ID.", "Invalid message ID"),
        403: failure("The message's associated claim was not found.", "Access denied"),
        404: failure("Message not found.", "Message not found"),
      },
    }),
  },
};

const document = {
  openapi: "3.0.3",
  info: {
    title: "Lost and Found API", version: "1.0.0",
    description: "API reference for 19 collection operations: Posts, Users, Claims, and Messages. Send JSON request bodies with Content-Type: application/json. IDs are 24-character MongoDB ObjectIds; timestamps are ISO 8601 UTC strings. Access requirements and current handler limitations are stated on each operation. Response examples illustrate the documented structure; replace example IDs with IDs from your database before sending requests.",
  },
  servers: [{ url: "/", description: "Current API origin" }],
  tags: [
    { name: "Posts", description: "Browse lost and found posts. Create and manage your own posts." },
    { name: "Users", description: "User profiles and administrator role changes." },
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
        ...object({ status: { type: "string", enum: ["open", "pending", "closed", "archived"] } }, ["status"]),
        description: "Current handler values conflict with the Post status enum; see the operation's implementation note.",
        example: { status: "closed" },
      },
      User: {
        ...object({ _id: ref("ObjectId"), name: { type: "string", description: "User's display name." }, email: { type: "string", format: "email", nullable: true, description: "Email address, when available." }, role, createdAt: dateTime }, ["_id", "name", "role"]),
        description: "Public profile fields selected by /users endpoints. createdAt may be absent because automatic timestamps are not enabled on the User model.",
        example: examples.user,
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
        description: "Must contain non-whitespace text. The length limit applies before trimming.",
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
