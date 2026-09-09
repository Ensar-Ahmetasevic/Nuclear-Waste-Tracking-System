const { parseArgs } = require('node:util');
const { database } = require('../lib/server/database.cjs');
async function main() {
  const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' }, organization: { type: 'string' }, admin: { type: 'boolean', default: false } } });
  if (!values.email || (!values.name && !values.organization) || (values.name && values.organization)) throw new Error('Use --email USER and exactly one of --name NEW_COMPANY or --organization EXISTING_ID. Add --admin for an organization administrator.');
  if (values.organization && !/^[1-9]\d*$/.test(values.organization)) throw new Error('Invalid organization ID');
  await database.$transaction(async tx => {
    const user = await tx.userProfile.findUnique({ where: { email: values.email.toLowerCase() } });
    if (!user) throw new Error('Register the account first');
    if (user.organizationId) throw new Error('Account already belongs to an organization; reassignment requires a separate reviewed migration');
    const organization = values.name ? await tx.organization.create({ data: { name: values.name.trim() } }) : await tx.organization.findUniqueOrThrow({ where: { id: Number(values.organization) } });
    await tx.userProfile.update({ where: { id: user.id }, data: { organizationId: organization.id, administrator: values.admin, active: true } });
    console.log(`Organization access activated (organization ${organization.id}; administrator ${values.admin}).`);
  });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => database.$disconnect());
