import { jsPDF } from 'jspdf';

export async function generateLeasePDF(tenant) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Residential Lease Agreement", 105, 20, null, null, "center");
  
  // Body formatting
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  
  const today = new Date().toLocaleDateString();
  const text = `
This Lease Agreement is made and entered into on this day, ${today},
between the Landlord (CondoCore Management) and the Tenant:

Tenant Name: ${tenant.name}
Property: ${tenant.property || 'N/A'}
Unit: ${tenant.unit} (${tenant.type || 'Condo'})
Lease Term: ${tenant.leaseStart || 'TBD'} to ${tenant.leaseEnd || 'TBD'}
Monthly Rent: $${(tenant.rent || 0).toLocaleString()}

1. RENT: The Tenant agrees to pay the Landlord the Monthly Rent stated above.
2. USE OF PREMISES: The Premises shall be used and occupied by Tenant(s) 
   exclusively as a private residential dwelling.
3. MAINTENANCE: Tenant shall keep the Premises in a clean and good condition.
4. UTILITIES: Tenant is responsible for electricity and internet unless otherwise specified.
5. DEFAULT: If Tenant fails to pay rent when due, Landlord may exercise any 
   remedies allowed under local state law.

By signing below, the Tenant acknowledges reading and understanding this Agreement.


___________________________________             _________________
Tenant Signature                                Date


___________________________________             _________________
Landlord Signature                              Date
  `;
  
  const splitText = doc.splitTextToSize(text, 180);
  doc.text(splitText, 15, 40);
  
  // Export as Blob
  return doc.output('blob');
}
