"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_DOMAINS = void 0;
exports.isAllowedDomain = isAllowedDomain;
exports.getDomain = getDomain;
exports.ALLOWED_DOMAINS = new Set([
    'tcs.com',
    'infosys.com',
    'wipro.com',
    'hcltech.com',
    'hcl.com',
    'techmahindra.com',
    'ltimindtree.com',
    'mphasis.com',
    'hexaware.com',
    'niit.com',
    'niittech.com',
    'cyient.com',
    'accenture.com',
    'cognizant.com',
    'capgemini.com',
    'ibm.com',
    'oracle.com',
    'sap.com',
    'atos.net',
    'dxc.com',
    'unisys.com',
    'cgi.com',
    'nttdata.com',
    'microsoft.com',
    'amazon.com',
    'google.com',
    'meta.com',
    'apple.com',
    'salesforce.com',
    'adobe.com',
    'servicenow.com',
    'workday.com',
    'vmware.com',
    'dell.com',
    'hp.com',
    'hpe.com',
    'cisco.com',
    'qualcomm.com',
    'intel.com',
    'valuelabs.com',
    'infotech.com',
    'zensar.com',
    'persistent.com',
    'kpit.com',
    'sonata-software.com',
    'ramcoystems.com',
    'coforge.com',
    'mastech.com',
    'igate.com',
    'inforeliance.com',
    'sstech.us',
    'gspann.com',
    'tietoevry.com',
    'deloitte.com',
    'ey.com',
    'kpmg.com',
    'pwc.com',
    'genpact.com',
    'wns.com',
    'firstsource.com',
    'exlservice.com',
    'airtel.com',
    'jio.com',
    'bsnl.co.in',
    'tatacomm.com',
    'cdac.in',
    'ecil.co.in',
    'bhel.in',
    'drdo.gov.in',
    'isro.gov.in',
    'nic.in',
    'gmail.com',
]);
function isAllowedDomain(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain)
        return false;
    return exports.ALLOWED_DOMAINS.has(domain);
}
function getDomain(email) {
    return email.split('@')[1]?.toLowerCase() ?? '';
}
//# sourceMappingURL=allowed-domains.js.map