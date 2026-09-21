import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const MONDAY_API_URL = process.env.MONDAY_API_URL;
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in server/.env (see server/.env.example).");
}

export const USERS_BOARD_ID = "5098492656";

const USERS_COLUMNS = {
  FIRST_NAME: "text_mm491wvr",
  LAST_NAME: "text_mm49fhsq",
  EMAIL: "email_mm4914e9",
  PASSWORD_HASH: "text_mm4935hf",
  ROLE: "color_mm496vat",
  ACCOUNT_STATUS: "color_mm49rj18",
};

// This module talks to Monday directly with the server's own API token,
// deliberately bypassing the generic /api/monday proxy - auth has to work
// before a session token exists to authenticate that proxy call with.
async function mondayFetch(query, variables = {}) {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: MONDAY_API_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

function mapUserItem(item) {
  const columns = Object.fromEntries(item.column_values.map((column) => [column.id, column]));

  return {
    id: item.id,
    firstName: columns[USERS_COLUMNS.FIRST_NAME]?.text ?? "",
    lastName: columns[USERS_COLUMNS.LAST_NAME]?.text ?? "",
    email: columns[USERS_COLUMNS.EMAIL]?.text ?? "",
    passwordHash: columns[USERS_COLUMNS.PASSWORD_HASH]?.text ?? "",
    role: columns[USERS_COLUMNS.ROLE]?.text ?? "",
    accountStatus: columns[USERS_COLUMNS.ACCOUNT_STATUS]?.text ?? "",
  };
}

// The Users board is small enough that fetching everything and filtering
// in memory (same approach the rest of this app already uses for
// per-entity lookups) is simpler and more robust than relying on Monday's
// column-type-specific filter operators for an exact email match.
async function getAllAuthUsers() {
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 500) {
          items {
            id
            column_values {
              id
              text
            }
          }
        }
      }
    }
  `;

  const data = await mondayFetch(query, { boardId: USERS_BOARD_ID });

  return data.boards[0].items_page.items.map(mapUserItem);
}

export async function findUserByEmail(email) {
  const users = await getAllAuthUsers();
  const normalized = email.trim().toLowerCase();

  return users.find((user) => user.email.trim().toLowerCase() === normalized) ?? null;
}

export async function setUserPasswordHash(userId, passwordHash) {
  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value
      ) {
        id
      }
    }
  `;

  return mondayFetch(mutation, {
    boardId: USERS_BOARD_ID,
    itemId: userId,
    columnId: USERS_COLUMNS.PASSWORD_HASH,
    value: JSON.stringify(passwordHash),
  });
}

export async function createPendingUser({ firstName, lastName, email, passwordHash }) {
  const columnValues = {
    [USERS_COLUMNS.FIRST_NAME]: firstName,
    [USERS_COLUMNS.LAST_NAME]: lastName,
    [USERS_COLUMNS.EMAIL]: { email, text: email },
    [USERS_COLUMNS.PASSWORD_HASH]: passwordHash,
    [USERS_COLUMNS.ROLE]: { label: "Adopter" },
    [USERS_COLUMNS.ACCOUNT_STATUS]: { label: "Pending" },
  };

  const mutation = `
    mutation (
      $boardId: ID!,
      $itemName: String!,
      $columnValues: JSON,
      $createLabelsIfMissing: Boolean
    ) {
      create_item(
        board_id: $boardId,
        item_name: $itemName,
        column_values: $columnValues,
        create_labels_if_missing: $createLabelsIfMissing
      ) {
        id
      }
    }
  `;

  const data = await mondayFetch(mutation, {
    boardId: USERS_BOARD_ID,
    itemName: `${firstName} ${lastName}`,
    columnValues: JSON.stringify(columnValues),
    createLabelsIfMissing: true,
  });

  return data.create_item.id;
}

export function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "12h" },
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

// Must run after requireAuth, which populates req.user.
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Admin access required." });
  }

  next();
}
