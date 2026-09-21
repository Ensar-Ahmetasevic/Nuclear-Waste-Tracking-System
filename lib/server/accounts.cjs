const { HttpError } = require("./errors.cjs");
const { areas } = require("../workspaces.cjs");
const roles = ["ADMINISTRATOR", "SUPERVISION", "EMPLOYEE"];
const publicUser = {
  id: true,
  username: true,
  email: true,
  displayName: true,
  role: true,
  workArea: true,
  active: true,
};
function passwordValue(value) {
  if (
    typeof value !== "string" ||
    value.length < 12 ||
    Buffer.byteLength(value) > 72
  )
    throw new HttpError(
      400,
      "Password must have at least 12 characters and at most 72 UTF-8 bytes",
    );
  return value;
}
function accountData(body, actor) {
  const { role = "EMPLOYEE" } = body;
  if (
    !roles.includes(role) ||
    (actor.role === "SUPERVISION" && role !== "EMPLOYEE")
  )
    throw new HttpError(403, "You cannot assign this role");
  if (role === "EMPLOYEE" && !Object.hasOwn(areas, body.workArea)) throw new HttpError(400, "Choose a work area for the employee");
  const username =
    typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username))
    throw new HttpError(
      400,
      "Username must contain 3–50 letters, digits, dots, underscores or hyphens",
    );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new HttpError(400, "A valid email is required");
  if (!displayName || displayName.length > 100)
    throw new HttpError(400, "Name is required (up to 100 characters)");
  return {
    username,
    email,
    displayName,
    role,
    workArea: role === "EMPLOYEE" ? body.workArea : null,
    administrator: role === "ADMINISTRATOR",
  };
}
module.exports = { publicUser, passwordValue, accountData };
