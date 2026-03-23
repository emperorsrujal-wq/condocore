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
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const streetAddr = tenant.address || tenant.propertyAddress || '';
  const addr = streetAddr
    ? `Unit ${tenant.unit}, ${tenant.property || 'Property'}, ${streetAddr}`
    : `Unit ${tenant.unit}, ${tenant.property || 'Property'}`;
  const isUSA = ['NY','CA','FL','TX','IL','NJ','PA','OH','GA','WA'].includes(province);

  // Format currency properly
  const fmtCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const amountOwed = fmtCurrency(data.amountOwed);

  // Format dates to readable format
  const fmtDate = (val) => {
    if (!val) return null;
    const d = new Date(val + 'T00:00:00');
    if (isNaN(d)) return val;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const deadlineDate = fmtDate(data.deadlineDate);
  const dateDue = fmtDate(data.dateDue);

  doc.setFont("helvetica", "bold");

  let title = '';
  let body = '';

  // ═══════════════════════════════════════════
  // ONTARIO FORMS (Residential Tenancies Act)
  // ═══════════════════════════════════════════
  if (province === 'ON') {
    if (formType === 'N4') {
      title = "FORM N4: NOTICE TO END A TENANCY EARLY FOR NON-PAYMENT OF RENT";
      body = `
To Tenant(s): ${tenant.name}
Address of the Rental Unit: ${addr}
From Landlord: ${landlordName}

TAKE NOTICE that you owe $${amountOwed} in rent.

The termination date for this notice is: ${deadlineDate || '(14 days from service date)'}.
NOTE: The termination date must be at least 14 days after the notice is given to the tenant.

If you pay all the rent owing on or before the termination date, this notice is void and your tenancy will not be terminated.

If you do not pay or move out by the termination date, I may apply to the Landlord and Tenant Board (LTB) for an order to evict you under the Residential Tenancies Act, 2006 (RTA).

You may also contact the LTB at 1-888-332-3234 or visit tribunalsontario.ca for information about your rights.
      `;
    } else if (formType === 'N12') {
      title = "FORM N12: NOTICE TO END YOUR TENANCY — LANDLORD'S OWN USE";
      body = `
To Tenant(s): ${tenant.name}
Address of the Rental Unit: ${addr}
From Landlord: ${landlordName}

I am giving you this notice because I in good faith require possession of the rental unit for the purpose of residential occupation by myself, a member of my immediate family, or a person who provides or will provide care services to me or a family member.

The termination date is: ${deadlineDate || '(at least 60 days from date of notice, on last day of rental period)'}.
NOTE: The termination date must be at least 60 days after the notice is given and must fall on the last day of the rental period.

COMPENSATION: Under s.48.1 of the RTA, I am required to pay you compensation equal to one month's rent no later than the termination date. This can be paid by cheque or by waiving one month's rent.

You do not have to move out based on this notice. You may dispute this notice by attending an LTB hearing.
      `;
    } else if (formType === 'N5') {
       title = "FORM N5: NOTICE TO END YOUR TENANCY FOR INTERFERING WITH OTHERS, DAMAGE, OR OVERCROWDING";
       body = `
To Tenant(s): ${tenant.name}
Address of the Rental Unit: ${addr}
From Landlord: ${landlordName}

I am giving you this notice because of the following reason(s):
${data.reason || 'Interference with reasonable enjoyment, damage to the rental unit, or overcrowding.'}

FIRST N5: This is the first N5 notice. Under s.64(3) of the RTA, you have 7 days after receiving this notice to correct the problem or stop the activity. If you do, this notice is void.

If this is a SECOND N5 within 6 months of the first, the notice cannot be voided and you must vacate by the termination date: ${deadlineDate || '(at least 20 days from service)'}.

The termination date is: ${deadlineDate || '(at least 20 days after service)'}.
      `;
    } else if (formType === 'L1') {
       title = "FORM L1: APPLICATION TO EVICT A TENANT FOR NON-PAYMENT OF RENT AND TO COLLECT RENT THE TENANT OWES";
       body = `
To the Landlord and Tenant Board (LTB):

APPLICANT (Landlord): ${landlordName}
RESPONDENT (Tenant): ${tenant.name}
Rental Unit: ${addr}

This is an application under s.87(1) of the Residential Tenancies Act, 2006 to:
1. Evict the tenant for non-payment of rent; and
2. Collect the rent the tenant owes.

Amount of rent owing: $${amountOwed}
The tenant was served with an N4 Notice on: ${dateDue || '(the service date)'}.

NOTE: This application must be filed within 30 days of the termination date on the N4 notice.
A $186 filing fee applies (subject to change per LTB fee schedule).
      `;
    }
  }
  // ═══════════════════════════════════════════
  // BRITISH COLUMBIA (Residential Tenancy Act)
  // ═══════════════════════════════════════════
  else if (province === 'BC') {
    if (formType === 'RTB30') {
      title = "RTB-30: 10 DAY NOTICE TO END TENANCY FOR UNPAID RENT OR UTILITIES";
      body = `
To Tenant(s): ${tenant.name}
Rental Unit Address: ${addr}
Landlord: ${landlordName}

You have failed to pay rent in the amount of $${amountOwed} that was due on ${dateDue || 'the due date'}.

You must either:
(a) Pay the full amount of rent owing within 5 days of receiving this notice, OR
(b) Move out by ${deadlineDate || '(10 days after receiving this notice)'}.

If you disagree with this notice, you may apply for dispute resolution with the Residential Tenancy Branch (RTB) within 5 days of receiving it. Call 1-800-665-8779 or visit gov.bc.ca/landlordtenant.

If you do not pay, move out, or apply for dispute resolution, your landlord may apply for an Order of Possession.
      `;
    } else {
      title = "RTB-1: NOTICE OF TERMINATION OF TENANCY";
      body = `
To Tenant(s): ${tenant.name}
Rental Unit Address: ${addr}
Landlord: ${landlordName}

The tenancy is hereby terminated effective: ${deadlineDate || 'the termination date'}.

Reason for Termination:
${data.reason || 'As per Residential Tenancy Branch guidelines.'}

You have the right to dispute this notice by applying for dispute resolution with the RTB within the applicable time period. Failure to apply may result in a default Order of Possession.
      `;
    }
  }
  // ═══════════════════════════════════════════
  // ALBERTA (Residential Tenancies Act, SA 2004)
  // ═══════════════════════════════════════════
  else if (province === 'AB') {
    title = "RESIDENTIAL TENANCY DISPUTE RESOLUTION SERVICE (RTDRS) - NOTICE TO TERMINATE TENANCY";
    body = `
To Tenant(s): ${tenant.name}
Premises Address: ${addr}
Landlord: ${landlordName}

TAKE NOTICE that your tenancy of the above premises is terminated effective ${deadlineDate || '(14 days from notice for substantial breach)'}.

Reason for Notice:
${data.reason || 'Substantial breach of the Residential Tenancies Act (SA 2004, c. R-17.1).'}

You must vacate and return all keys by 12:00 PM on the termination date.

If you wish to dispute this notice, you may apply to the RTDRS or Provincial Court. Contact the RTDRS at 780-644-3000 or visit rtdrs.alberta.ca.
    `;
  }
  // ═══════════════════════════════════════════
  // QUEBEC (Civil Code of Québec, TAL)
  // ═══════════════════════════════════════════
  else if (province === 'QC') {
    if (formType === 'TAL_NP') {
      title = "AVIS / NOTICE: NON-PAYMENT OF RENT (TRIBUNAL ADMINISTRATIF DU LOGEMENT)";
      body = `
To Tenant(s) / Au locataire: ${tenant.name}
Address / Adresse: ${addr}

Amount Owed / Montant dû: $${amountOwed}

You are hereby notified that you are in default of payment of rent. Under the Civil Code of Québec (art. 1971), the landlord may apply to the Tribunal administratif du logement (TAL) for the resiliation of the lease if rent remains unpaid for more than 3 weeks.

${data.reason || ''}

Contact TAL: 1-800-683-2245 or visit tal.gouv.qc.ca
      `;
    } else {
      title = "AVIS DE REPRISE / NOTICE OF REPOSSESSION (TAL)";
      body = `
To Tenant(s) / Au locataire: ${tenant.name}
Address / Adresse: ${addr}

Under art. 1957-1970 of the Civil Code of Québec, the landlord hereby gives notice of repossession effective: ${deadlineDate || '(6 months before lease expiry)'}.

NOTE: This notice must be given at least 6 months before the end of a fixed-term lease. The tenant has one month after receiving this notice to respond. Failure to respond is deemed acceptance.

Reason: ${data.reason || 'Repossession for personal use or for a family member.'}
      `;
    }
  }
  // ═══════════════════════════════════════════
  // MANITOBA (Residential Tenancies Act, C.C.S.M. c. R119)
  // ═══════════════════════════════════════════
  else if (province === 'MB') {
    title = "RTB MANITOBA: NOTICE OF TERMINATION OF TENANCY";
    body = `
To Tenant(s): ${tenant.name}
Address: ${addr}
Landlord: ${landlordName}

Notice of termination effective: ${deadlineDate || 'the termination date'}.

${data.reason ? `Reason: ${data.reason}` : ''}

Under the Residential Tenancies Act (Manitoba), you have the right to contest this notice by applying to the Residential Tenancies Branch. Contact: 204-945-2476 or 1-800-782-8403.
    `;
  }
  // ═══════════════════════════════════════════
  // SASKATCHEWAN (Residential Tenancies Act, 2006)
  // ═══════════════════════════════════════════
  else if (province === 'SK') {
    if (formType === 'SK_NONPAY') {
      title = "NOTICE OF TERMINATION FOR NON-PAYMENT OF RENT (SASKATCHEWAN)";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}
Landlord: ${landlordName}

You are in arrears of rent in the amount of $${amountOwed}.

Under s.56 of The Residential Tenancies Act, 2006 (Saskatchewan), you are given 15 days' notice to pay the full amount owing or vacate the premises.

Termination date: ${deadlineDate || '(15 days from service)'}.

You may apply to the Office of Residential Tenancies (ORT) to dispute this notice. Contact: 1-888-215-2222 or visit saskatchewan.ca/residential-tenancies.
      `;
    } else {
      title = "NOTICE OF TERMINATION OF TENANCY (SASKATCHEWAN)";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}
Landlord: ${landlordName}

Your tenancy is terminated effective: ${deadlineDate || 'the termination date'}.

Reason: ${data.reason || 'As per The Residential Tenancies Act, 2006 (Saskatchewan).'}

You may dispute this notice through the Office of Residential Tenancies (ORT). Contact: 1-888-215-2222.
      `;
    }
  }
  // ═══════════════════════════════════════════
  // NOVA SCOTIA (Residential Tenancies Act)
  // ═══════════════════════════════════════════
  else if (province === 'NS') {
    title = "NOTICE TO QUIT (NOVA SCOTIA RESIDENTIAL TENANCIES ACT)";
    body = `
To Tenant(s): ${tenant.name}
Address: ${addr}
Landlord: ${landlordName}

Under the Residential Tenancies Act (Nova Scotia), you are hereby given notice to quit the premises by: ${deadlineDate || '(15 days for non-payment)'}.

Reason: ${data.reason || 'Non-payment of rent or breach of tenancy agreement.'}

NOTE: For non-payment of rent, the landlord must give at least 15 days' notice. For other breaches, notice periods vary.

You may apply to the Residential Tenancies Program to contest this notice. Contact: 1-800-670-4357 or visit novascotia.ca/sns/access/land/residential-tenancies.asp.
    `;
  }
  // ═══════════════════════════════════════════
  // NEW BRUNSWICK (Residential Tenancies Act)
  // ═══════════════════════════════════════════
  else if (province === 'NB') {
    title = "NOTICE TO VACATE (NEW BRUNSWICK RESIDENTIAL TENANCIES ACT)";
    body = `
To Tenant(s): ${tenant.name}
Address: ${addr}
Landlord: ${landlordName}

Under the Residential Tenancies Act (New Brunswick), your tenancy is terminated effective: ${deadlineDate || 'the termination date'}.

Reason: ${data.reason || 'As per the Residential Tenancies Act (New Brunswick).'}

You may apply to the Residential Tenancies Tribunal to dispute this notice. Contact the Office of the Rentalsman at 1-888-762-8600.
    `;
  }
  // ═══════════════════════════════════════════
  // NEW YORK (Real Property Actions & Proceedings Law)
  // ═══════════════════════════════════════════
  else if (province === 'NY') {
    if (formType === 'NY_14DAY') {
      title = "NEW YORK: 14-DAY DEMAND FOR RENT";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}
Landlord/Agent: ${landlordName}

PLEASE TAKE NOTICE that you are in default in payment of rent for the above-described premises in the amount of $${amountOwed}.

Pursuant to Real Property Law §235-e, you are hereby demanded to pay the full amount of rent due within fourteen (14) days of service of this notice, or surrender possession of the premises.

If you fail to pay or vacate within 14 days, the landlord may commence a summary proceeding under RPAPL Article 7 to recover possession and any rent owed.

Termination date: ${deadlineDate || '(14 days from service)'}.
      `;
    } else {
      title = "NEW YORK: NOTICE OF HOLDOVER PROCEEDING (RPAPL §713)";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}
Landlord/Agent: ${landlordName}

PLEASE TAKE NOTICE that your tenancy has expired or been terminated, and you are holding over without permission.

Pursuant to RPAPL §713, the landlord intends to commence a holdover proceeding to recover possession of the premises.

You must vacate the premises by: ${deadlineDate || 'the date specified'}.

Reason: ${data.reason || 'Expiration of lease term / holdover without consent.'}

You have the right to appear and answer in any proceeding brought against you. It is recommended that you seek legal counsel.
      `;
    }
  }
  // ═══════════════════════════════════════════
  // CALIFORNIA (Code of Civil Procedure)
  // ═══════════════════════════════════════════
  else if (province === 'CA') {
    if (formType === 'CA_3DAY') {
      title = "CALIFORNIA: 3-DAY NOTICE TO PAY RENT OR QUIT (CCP §1161(2))";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

NOTICE TO PAY RENT OR QUIT

WITHIN THREE (3) DAYS after the service of this notice, you are hereby required to pay the amount of $${amountOwed} which is the rent due and owing for the above-described premises, OR quit the premises and deliver up possession to the landlord.

If you fail to perform or otherwise comply within the period specified, the landlord will institute legal proceedings against you to recover rent, damages, and possession of said premises pursuant to California Code of Civil Procedure §1161 et seq.

NOTE: This notice does not include any amounts other than rent (per Civil Code §1946.2 and CCP §1161(2)). Late fees, utilities, and other charges are excluded.

Landlord/Agent: ${landlordName}
      `;
    } else {
      title = "CALIFORNIA: 30-DAY NOTICE TO TERMINATE MONTH-TO-MONTH TENANCY (CCP §1946.1)";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

THIRTY (30) DAY NOTICE OF TERMINATION OF TENANCY

You are hereby notified that your month-to-month tenancy of the above-described premises is terminated effective ${deadlineDate || '(30 days from service)'}.

You are required to quit and deliver up possession on or before that date.

${data.reason ? `Reason: ${data.reason}` : 'NOTE: For tenancies exceeding one year, a 60-day notice is required under CCP §1946.1(b). For properties subject to the Tenant Protection Act (AB 1482), just cause is required under Civil Code §1946.2.'}

This notice is given pursuant to California Civil Code §1946 and §1946.1.

Landlord/Agent: ${landlordName}
      `;
    }
  }
  // ═══════════════════════════════════════════
  // FLORIDA (FL Statutes §83.56)
  // ═══════════════════════════════════════════
  else if (province === 'FL') {
    title = "FLORIDA: 3-DAY NOTICE TO PAY RENT OR VACATE (FL STAT §83.56(3))";
    body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

You are hereby notified that you are indebted to the undersigned landlord in the amount of $${amountOwed} for the rent of the above premises, and that the landlord demands payment of said rent or possession of the premises within three (3) days (excluding weekends and legal holidays) from the date of delivery of this notice.

Pursuant to Florida Statutes §83.56(3), if you fail to pay or vacate, the landlord will institute legal proceedings to recover possession and rent.

Termination date: ${deadlineDate || '(3 business days from service)'}.
Landlord/Agent: ${landlordName}
    `;
  }
  // ═══════════════════════════════════════════
  // TEXAS (TX Property Code §24.005)
  // ═══════════════════════════════════════════
  else if (province === 'TX') {
    title = "TEXAS: NOTICE TO VACATE (TX PROPERTY CODE §24.005)";
    body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

You are hereby notified to vacate and surrender possession of the above-described premises within three (3) days from the date this notice is delivered to you.

Amount of rent currently due and unpaid: $${amountOwed}.

Pursuant to Texas Property Code §24.005, if you fail to vacate, the landlord may file a forcible detainer suit in Justice Court to recover possession.

NOTE: Unless the lease specifies otherwise, a 3-day notice is the minimum required under Texas law.

Termination date: ${deadlineDate || '(3 days from delivery)'}.
Landlord/Agent: ${landlordName}
    `;
  }
  // ═══════════════════════════════════════════
  // ILLINOIS (735 ILCS 5/9-209, 5/9-210)
  // ═══════════════════════════════════════════
  else if (province === 'IL') {
    if (formType === 'IL_5DAY') {
      title = "ILLINOIS: 5-DAY NOTICE TO PAY RENT OR QUIT (735 ILCS 5/9-209)";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

You are hereby notified that there is now due and unpaid rent in the amount of $${amountOwed} for the premises described above.

You are hereby further notified that the landlord elects to declare the lease terminated and demands that you pay the rent in full within FIVE (5) DAYS or vacate and surrender the premises.

If you fail to do so, legal proceedings will be instituted against you to recover possession, rent, court costs, and attorney fees as provided by law (735 ILCS 5/9-209).

Termination date: ${deadlineDate || '(5 days from service)'}.
Landlord/Agent: ${landlordName}
      `;
    } else {
      title = "ILLINOIS: 10-DAY NOTICE TO CURE OR QUIT (735 ILCS 5/9-210)";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

You are hereby notified that you are in violation of the lease agreement for the following reason(s):
${data.reason || 'Lease violation as described.'}

You have TEN (10) DAYS from service of this notice to cure the violation. If the violation is not cured within the 10-day period, the lease will be terminated.

Pursuant to 735 ILCS 5/9-210, failure to cure may result in eviction proceedings.

Termination date: ${deadlineDate || '(10 days from service)'}.
Landlord/Agent: ${landlordName}
      `;
    }
  }
  // ═══════════════════════════════════════════
  // NEW JERSEY (NJSA 2A:18-61.1 et seq.)
  // ═══════════════════════════════════════════
  else if (province === 'NJ') {
    if (formType === 'NJ_QUIT') {
      title = "NEW JERSEY: NOTICE TO QUIT AND DEMAND FOR RENT (NJSA 2A:18-61.2)";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

PLEASE TAKE NOTICE that you are in arrears of rent in the amount of $${amountOwed}.

You are hereby demanded to pay the full amount of rent due or quit and surrender possession of the premises.

Under NJSA 2A:18-61.2, the landlord may file for eviction if rent remains unpaid. In New Jersey, a landlord must obtain a court order before removing a tenant — self-help evictions are prohibited.

NOTE: For month-to-month tenancies, one full month's notice is required. For non-payment, the landlord must provide a written demand and wait for the applicable notice period before filing.

Termination date: ${deadlineDate || 'as required by statute'}.
Landlord/Agent: ${landlordName}
      `;
    } else {
      title = "NEW JERSEY: NOTICE TO CEASE (LEASE VIOLATION)";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

PLEASE TAKE NOTICE that you are in violation of your lease agreement and/or applicable statutes for the following reason(s):
${data.reason || 'Lease violation as described.'}

You are hereby directed to CEASE the above-described conduct immediately.

Under NJSA 2A:18-61.1(c), if the violation continues, the landlord may serve a Notice to Quit and seek possession through the Superior Court.

Landlord/Agent: ${landlordName}
      `;
    }
  }
  // ═══════════════════════════════════════════
  // PENNSYLVANIA (68 PS §250.501)
  // ═══════════════════════════════════════════
  else if (province === 'PA') {
    if (formType === 'PA_10DAY') {
      title = "PENNSYLVANIA: 10-DAY NOTICE FOR NON-PAYMENT OF RENT (68 PS §250.501(b))";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

You are hereby notified that you are in default in the payment of rent in the amount of $${amountOwed}.

Pursuant to 68 PS §250.501(b), you are hereby given TEN (10) DAYS' notice to vacate and surrender possession of the above-described premises.

If you fail to vacate within the notice period, the landlord may file a Landlord-Tenant Complaint with the local Magisterial District Judge.

NOTE: For leases of one year or more, 30 days' notice is required for non-payment.

Termination date: ${deadlineDate || '(10 days from service)'}.
Landlord/Agent: ${landlordName}
      `;
    } else {
      title = "PENNSYLVANIA: 15-DAY NOTICE TO QUIT (MONTH-TO-MONTH TENANCY)";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

Your month-to-month tenancy is hereby terminated. You are given FIFTEEN (15) DAYS' notice to quit and surrender possession of the premises.

Pursuant to 68 PS §250.501(b), this notice is served in compliance with Pennsylvania's Landlord and Tenant Act.

Termination date: ${deadlineDate || '(15 days from service)'}.
Landlord/Agent: ${landlordName}
      `;
    }
  }
  // ═══════════════════════════════════════════
  // OHIO (ORC §1923.04)
  // ═══════════════════════════════════════════
  else if (province === 'OH') {
    title = "OHIO: 3-DAY NOTICE TO LEAVE PREMISES (ORC §1923.04)";
    body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

You are hereby notified that you are in default of rent in the amount of $${amountOwed}.

Pursuant to Ohio Revised Code §1923.04, you are hereby given THREE (3) DAYS' notice to leave the premises.

If you fail to vacate within the notice period, the landlord may file a forcible entry and detainer action in the appropriate Municipal or County Court.

Termination date: ${deadlineDate || '(3 days from service)'}.
Landlord/Agent: ${landlordName}
    `;
  }
  // ═══════════════════════════════════════════
  // GEORGIA (OCGA §44-7-50)
  // ═══════════════════════════════════════════
  else if (province === 'GA') {
    title = "GEORGIA: DEMAND FOR POSSESSION (OCGA §44-7-50)";
    body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

DEMAND FOR POSSESSION

You are hereby demanded to deliver up possession of the above-described premises immediately.

Amount of rent due and unpaid: $${amountOwed}.

Pursuant to OCGA §44-7-50, the landlord demands that you vacate the premises. Georgia law does not require a specific number of days' notice for non-payment — only a demand for possession is required before filing a dispossessory proceeding.

If you fail to comply, the landlord will file a dispossessory affidavit in the Magistrate Court.

Landlord/Agent: ${landlordName}
    `;
  }
  // ═══════════════════════════════════════════
  // WASHINGTON (RCW 59.12.030)
  // ═══════════════════════════════════════════
  else if (province === 'WA') {
    if (formType === 'WA_14DAY') {
      title = "WASHINGTON: 14-DAY NOTICE TO PAY RENT OR VACATE (RCW 59.18.057)";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

FOURTEEN-DAY NOTICE TO PAY RENT OR VACATE

You are hereby notified that you owe $${amountOwed} in unpaid rent.

Pursuant to RCW 59.18.057 (as amended by SB 5600, effective 2019), you are required to pay the rent in full within FOURTEEN (14) DAYS of service of this notice, or vacate the premises.

If you fail to pay or vacate, the landlord may file an unlawful detainer action under RCW 59.12.030.

NOTE: Washington state law may provide additional protections. Contact Northwest Justice Project at 1-888-201-1014 for legal assistance.

Termination date: ${deadlineDate || '(14 days from service)'}.
Landlord/Agent: ${landlordName}
      `;
    } else {
      title = "WASHINGTON: 10-DAY NOTICE TO COMPLY OR VACATE (RCW 59.12.030(4))";
      body = `
To Tenant(s): ${tenant.name}
Address: ${addr}

TEN-DAY NOTICE TO COMPLY OR VACATE

You are in violation of your lease agreement for the following reason(s):
${data.reason || 'Lease violation as described.'}

Pursuant to RCW 59.12.030(4), you are given TEN (10) DAYS to comply with the terms of the lease or vacate the premises.

If you fail to comply or vacate, the landlord may file an unlawful detainer action.

Termination date: ${deadlineDate || '(10 days from service)'}.
Landlord/Agent: ${landlordName}
      `;
    }
  }

  // ─── FALLBACK ───
  if (!title) {
    title = `LEGAL NOTICE — ${province} / ${formType}`;
    body = `
To Tenant(s): ${tenant.name}
Address: ${addr}
Landlord/Agent: ${landlordName}

This is a formal notice regarding your tenancy. Please consult local laws for your jurisdiction.
    `;
  }

  // ─── PDF Layout & Rendering ───
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;

  // Generate reference number
  const refNum = `CC-${province}-${formType}-${Date.now().toString(36).toUpperCase()}`;

  // ── DRAFT Watermark (diagonal, light gray) ──
  doc.setTextColor(230, 230, 230);
  doc.setFontSize(72);
  doc.setFont("helvetica", "bold");
  doc.text("DRAFT", pageW / 2, pageH / 2, { angle: 45, align: 'center' });

  // ── Page border ──
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, pageW - 16, pageH - 16);

  // ── Header line ──
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Ref: ${refNum}`, margin, 14);
  doc.text(`Generated: ${dateStr}`, pageW - margin, 14, { align: 'right' });
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.8);
  doc.line(margin, 17, pageW - margin, 17);

  // ── Title ──
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const splitTitle = doc.splitTextToSize(title, contentW);
  doc.text(splitTitle, margin, 24);

  // ── Date of Issue ──
  let yPos = 26 + (splitTitle.length * 5.5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date of Issue: ${dateStr}`, margin, yPos);
  yPos += 4;

  // ── Body content ──
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  const splitBody = doc.splitTextToSize(body.trim(), contentW);
  doc.text(splitBody, margin, yPos);
  yPos += splitBody.length * 4.5 + 6;

  // ── Signature block ──
  if (yPos > pageH - 80) {
    doc.addPage();
    yPos = 20;
    // Watermark on page 2
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(72);
    doc.setFont("helvetica", "bold");
    doc.text("DRAFT", pageW / 2, pageH / 2, { angle: 45, align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, margin + 80, yPos);
  doc.line(margin + 110, yPos, margin + 155, yPos);
  doc.setFontSize(8);
  doc.text('Landlord / Agent Signature', margin, yPos + 4);
  doc.text('Date', margin + 110, yPos + 4);
  yPos += 12;

  // ── Tenant Acknowledgment ──
  doc.line(margin, yPos, margin + 80, yPos);
  doc.line(margin + 110, yPos, margin + 155, yPos);
  doc.text('Tenant Signature (if applicable)', margin, yPos + 4);
  doc.text('Date', margin + 110, yPos + 4);
  yPos += 16;

  // ── Footer ──
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Draft template — verify with legal counsel before service  |  Ref: ${refNum}`, pageW / 2, pageH - 10, { align: 'center' });
  doc.text('Page 1', pageW - margin, pageH - 10, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  return doc.output('blob');
}

export async function generateLMRStatementPDF(tenant, deposit, interestData, landlordName = 'Management') {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ANNUAL LAST MONTH RENT (LMR) INTEREST STATEMENT", 105, 20, null, null, "center");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  const textContent = `
Date of Issue: ${dateStr}
Landlord / Management: ${landlordName}

Tenant(s): ${tenant.name}
Rental Unit: Unit ${tenant.unit}, ${tenant.property || 'Property'}

DEPOSIT DETAILS:
Original LMR Deposit Amount: $${(Number(deposit.amount) || 0).toFixed(2)}
Date Collected: ${deposit.dateCollected || 'Unknown'}

INTEREST CALCULATION SUMMARY:
Ontario law requires landlords to pay interest on the Last Month's Rent deposit annually.
The interest rate is equal to the provincial rent increase guideline for that specific year.

${interestData.breakdown.map(b => `Year: ${b.year} | Mandated Rate: ${(b.rate * 100).toFixed(1)}% | Accrued: $${b.earned.toFixed(2)}`).join('\n')}

------------------------------------------------------
TOTAL ACCRUED INTEREST OUTSTANDING: $${interestData.totalInterest.toFixed(2)}
------------------------------------------------------

This notice serves as the official financial statement of Trust Capital held on your behalf.
Interest payments not remitted directly to the tenant may be implicitly applied toward future rent increases or capital deductions per RTA legislation.

___________________________________             _________________
Landlord / Agent Signature                      Date
  `;

  const splitBody = doc.splitTextToSize(textContent, 180);
  doc.text(splitBody, 15, 35);

  return doc.output('blob');
}
