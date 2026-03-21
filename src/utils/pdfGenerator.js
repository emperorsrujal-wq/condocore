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

export async function generateLegalNoticePDF(tenant, province, formType, data, landlordName = 'Management') {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString();
  
  doc.setFont("helvetica", "bold");
  
  let title = '';
  let body = '';
  
  // ONTARIO FORMS
  if (province === 'ON') {
    if (formType === 'N4') {
      title = "FORM N4: NOTICE TO END A TENANCY EARLY FOR NON-PAYMENT OF RENT";
      body = `
To Tenant(s): ${tenant.name}
Address of the Rental Unit: Unit ${tenant.unit}, ${tenant.property || 'Property'}

From Landlord: ${landlordName}

I am giving you this notice because I believe you owe me $${data.amountOwed || 0} in rent.

If you pay this amount by ${data.deadlineDate || 'the deadline'}, this notice will be void.
If you do not pay or move out, I may apply to the Landlord and Tenant Board (LTB) to evict you.
      `;
    } else if (formType === 'N12') {
      title = "FORM N12: NOTICE TO END TENANCY FOR LANDLORD'S OWN USE";
      body = `
To Tenant(s): ${tenant.name}
Address of the Rental Unit: Unit ${tenant.unit}, ${tenant.property || 'Property'}

From Landlord: ${landlordName}

I am giving you this notice because I, or a purchaser, require the rental unit for my own use.
You must move out of the rental unit by: ${data.deadlineDate || 'the termination date'}.

Compensation equivalent to one month's rent will be provided before the termination date.
      `;
    } else if (formType === 'N5') {
       title = "FORM N5: NOTICE TO END TENANCY FOR INTERFERENCE OR DAMAGE";
       body = `
To Tenant(s): ${tenant.name}
Address of the Rental Unit: Unit ${tenant.unit}, ${tenant.property || 'Property'}

From Landlord: ${landlordName}

I am giving you this notice because of the following issues:
${data.reason || 'Damage or interference caused by tenant.'}

If you correct this issue within 7 days, this notice will be void.
      `;
    } else if (formType === 'L1') {
       title = "FORM L1: APPLICATION TO EVICT FOR NON-PAYMENT OF RENT";
       body = `
To the Landlord and Tenant Board (LTB):

Landlord: ${landlordName}
Tenant: ${tenant.name}
Rental Unit: Unit ${tenant.unit}, ${tenant.property || 'Property'}

This is an application to evict the tenant and collect the rent owed: $${data.amountOwed || 0}.
The tenant was served with an N4 Notice on ${data.dateServed || 'the service date'}.
      `;
    }
  } 
  // BC FORMS
  else if (province === 'BC') {
    title = "RTB-30: 10 DAY NOTICE TO END TENANCY FOR UNPAID RENT";
    body = `
To Tenant(s): ${tenant.name}
Rental Unit Address: Unit ${tenant.unit}, ${tenant.property || 'Property'}

Landlord: ${landlordName}

You have failed to pay rent in the amount of $${data.amountOwed || 0} that was due on ${data.dateDue || 'the due date'}.
You must move out of the rental unit by ${data.deadlineDate || 'the deadline date'} (10 days after receiving this notice).

You have 5 days to pay the rent or file an Application for Dispute Resolution with the Residential Tenancy Branch (RTB).
    `;
  }
  // ALBERTA FORMS
  else if (province === 'AB') {
    title = "RESIDENTIAL TENANCY DISPUTE RESOLUTION SERVICE (RTDRS) - NOTICE TO VACATE";
    body = `
To Tenant(s): ${tenant.name}
Premises Address: Unit ${tenant.unit}, ${tenant.property || 'Property'}

Landlord: ${landlordName}

Take notice that your tenancy of the above premises is terminated effective ${data.deadlineDate || 'the deadline date'}.
Reason for Notice:
${data.reason || 'Substantial breach of the Residential Tenancies Act.'}

Ensure the premises are vacated and keys returned by 12:00 PM on the termination date.
    `;
  }

  // Draw Title
  doc.setFontSize(14);
  const splitTitle = doc.splitTextToSize(title, 180);
  doc.text(splitTitle, 15, 20);

  // Draw Body
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const textContent = `
Date of Issue: ${dateStr}

${body}

IMPORTANT LEGAL WARNING: 
This is a legally binding provincial notice. 

___________________________________             _________________
Landlord / Agent Signature                      Date
  `;
  const splitBody = doc.splitTextToSize(textContent, 180);
  doc.text(splitBody, 15, 40 + (splitTitle.length * 7));

  return doc.output('blob');
}
