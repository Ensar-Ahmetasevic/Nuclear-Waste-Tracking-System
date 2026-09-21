export async function POST() {
  return Response.json({ message: "Accounts are created by your administrator or supervisor." }, { status: 403 });
}
