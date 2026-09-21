const { parseArgs } = require('node:util');
const bcrypt = require('bcryptjs');
const { passwordValue, accountData } = require('../lib/server/accounts.cjs');
const { areas } = require("../lib/workspaces.cjs");
const { database } = require('../lib/server/database.cjs');
async function main() {
  const { values } = parseArgs({ options: { email: { type: 'string' }, username: { type: 'string' }, 'display-name': { type: 'string' }, name: { type: 'string' }, organization: { type: 'string' }, 'work-area': { type: 'string' }, admin: { type: 'boolean', default: false } } });
  if (!values.email || (!values.name && !values.organization) || (values.name && values.organization)) throw new Error('Use --email USER and exactly one of --name NEW_COMPANY or --organization EXISTING_ID. Add --admin for an organization administrator.');
  if (values.organization && !/^[1-9]\d*$/.test(values.organization)) throw new Error('Invalid organization ID');
  if (!values.admin && !Object.hasOwn(areas, values["work-area"])) throw new Error("Choose --work-area SHIPPING, PRE_STORAGE or FINAL_STORAGE");
  await database.$transaction(async tx => {
    let user = await tx.userProfile.findUnique({ where: { email: values.email.toLowerCase() } });
    if (user?.organizationId) throw new Error('Account already belongs to an organization; reassignment requires a separate reviewed migration');
    const organization = values.name ? await tx.organization.create({ data: { name: values.name.trim() } }) : await tx.organization.findUniqueOrThrow({ where: { id: Number(values.organization) } });
    if (!user) {
      const data = accountData({ email: values.email, username: values.username, displayName: values['display-name'], workArea: values['work-area'], role: values.admin ? 'ADMINISTRATOR' : 'EMPLOYEE' }, { role: 'ADMINISTRATOR' });
      user = await tx.userProfile.create({ data: { ...data, password: await bcrypt.hash(passwordValue(process.env.NWTS_INITIAL_PASSWORD), 12), companyId: organization.id, companyName: organization.name, address: '', active: false } });
    }
    await tx.userProfile.update({ where: { id: user.id }, data: { organizationId: organization.id, administrator: values.admin, role: values.admin ? "ADMINISTRATOR" : "EMPLOYEE", workArea: values.admin ? null : values["work-area"], active: true } });
    console.log(`Organization access activated (organization ${organization.id}; administrator ${values.admin}).`);
  });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => database.$disconnect());
